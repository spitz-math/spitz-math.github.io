// chatgpt-worker (Spitz.dev): does ChatGPT's turn on a Task Drop task by itself, through the OpenAI API.
// Woken by the database (trigger on studio_tasks, or the dashboard's "run ChatGPT now") with a Vault secret.
//
// One run = read the task, its messages and its newest images -> ask the model what to do ->
//   either reply in words, or draw an image, turn it into clean pixel art, check the grid, save it as a
//   Sprite Drop asset -> post as 'chatgpt' and hand the turn back.
// Guards: each task version runs once; a daily cap; stops if ChatGPT already posted 3 times in a row.
// Errors are posted to the task with the turn set to Kody, so nothing fails silently.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.119.0'
// loaded only when drawing, so a problem in the image library can never stop the worker from starting
const loadImage = async () => (await import('https://deno.land/x/imagescript@1.3.0/mod.ts')).Image
import { pixelize, verifyGrid } from './pixel.ts'

const OPENAI_KEY = Deno.env.get('OPENAI_API_KEY') || ''
const MODEL = Deno.env.get('OPENAI_MODEL') || 'gpt-5'
const IMAGE_MODEL = Deno.env.get('OPENAI_IMAGE_MODEL') || 'gpt-image-1'
const DAILY_CAP = Number(Deno.env.get('WORKER_DAILY_CAP') || 20)
const BUCKET = 'studio-assets'
const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })

const SYSTEM = `You are ChatGPT, the artist and reviewer in Spitz.dev, a small studio where ChatGPT and Claude make HTML math games for Kody's middle-school students.
You are running as an automatic worker: nobody is chatting with you. Read the task brief and every message, then do ChatGPT's next turn.
Decide ONE action:
- "image": the task needs a new picture from you (a sprite, sheet, icon, background). Write a precise image_prompt for an image model. For pixel art give the exact sheet size in art pixels (art_width, art_height), the delivery scale from the brief (default 4), and max_colours (usually 6-12). The worker turns the picture into exact hard-edged pixel art at that size, so describe the art filling the canvas the same way the cells are laid out, on a fully transparent background, no labels or grid lines. If the brief lists exact hex colours, put ALL of them in palette (the worker snaps every pixel to them); if it asks for a 1 pixel outline, put that colour in outline (the worker closes the outline itself). Ask the image model for big chunky blocks, bold flat shading and a thick dark outline, so it survives shrinking. If it is NOT pixel art, set art_width/art_height to 0.
- "reply": the turn needs words only (a review of screenshots, an answer, a decision). Be concrete and short.
Then choose next_turn: "claude" when Claude should act next (wire art in, build, fix), "kody" when Kody must decide or approve something, and done=true only when the brief's goal is fully met and nothing is left.
Never claim to have tested a game or approved a deploy: only Kody approves merges and deploys.`

const PLAN_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['action', 'body', 'image_prompt', 'art_width', 'art_height', 'scale', 'max_colours', 'palette', 'outline', 'file_name', 'next_turn', 'done'],
  properties: {
    action: { type: 'string', enum: ['image', 'reply'] },
    body: { type: 'string', description: 'The message to post on the task (for image: what you drew and any notes for Claude).' },
    image_prompt: { type: 'string' },
    art_width: { type: 'integer' }, art_height: { type: 'integer' },
    scale: { type: 'integer' }, max_colours: { type: 'integer' },
    palette: { type: 'array', items: { type: 'string' }, description: 'Exact #RRGGBB colours the brief requires (outline included), or [] to let the worker pick.' },
    outline: { type: 'string', description: 'The #RRGGBB outline colour if the brief wants a 1 art pixel outline around the shapes, else "".' },
    file_name: { type: 'string' },
    next_turn: { type: 'string', enum: ['claude', 'kody'] },
    done: { type: 'boolean' },
  },
}

async function openai(path: string, body: unknown) {
  const r = await fetch('https://api.openai.com/v1/' + path, { method: 'POST', headers: { Authorization: 'Bearer ' + OPENAI_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(`OpenAI ${path} ${r.status}: ${j?.error?.message || 'no details'}`)
  return j
}

// Draw with the configured image model; if this account doesn't have it, ask OpenAI which gpt-image models it does have and use the newest.
async function drawImage(body: Record<string, unknown>): Promise<{ img: any; model: string }> {
  try { return { img: await openai('images/generations', { ...body, model: IMAGE_MODEL }), model: IMAGE_MODEL } }
  catch (e) {
    if (!/does not exist|not found|do not have access|must be verified/i.test(String(e))) throw e
    const r = await fetch('https://api.openai.com/v1/models', { headers: { Authorization: 'Bearer ' + OPENAI_KEY } })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(`${String(e).replace(/^Error: /, '')} (and listing models failed: ${r.status} ${j?.error?.message || ''})`)
    const ids: string[] = (j.data || []).map((m: any) => m.id).filter((id: string) => /^(gpt-image|chatgpt-image)/.test(id) && id !== IMAGE_MODEL)
    ids.sort((a, b) => Number(/mini/.test(a)) - Number(/mini/.test(b)) || b.localeCompare(a, undefined, { numeric: true }))
    if (!ids.length) throw new Error(`${String(e).replace(/^Error: /, '')} No gpt-image model is available on this OpenAI account (it may need organization verification).`)
    let last: unknown = e
    for (const m of ids.slice(0, 3)) {
      try { return { img: await openai('images/generations', { ...body, model: m }), model: m } } catch (e2) { last = e2 }
    }
    throw last
  }
}

const sha256 = async (b: Uint8Array) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', b))).map(x => x.toString(16).padStart(2, '0')).join('')

async function run(taskId: string) {
  const { data: t } = await db.from('studio_tasks').select('*').eq('id', taskId).maybeSingle()
  if (!t || t.turn !== 'chatgpt' || t.status !== 'open') return 'not ChatGPT\'s turn'
  if (!OPENAI_KEY) return 'no OPENAI_API_KEY yet, so the worker stays off (chat ChatGPT can still take the turn)'
  // one run per task version (a failed run may be retried)
  const prev = await db.from('studio_worker_runs').select('id,status').eq('task_id', t.id).eq('task_version', t.version).maybeSingle()
  if (prev.data && prev.data.status !== 'error') return 'already ran on this version'
  const since = new Date(Date.now() - 864e5).toISOString()
  const { count } = await db.from('studio_worker_runs').select('id', { count: 'exact', head: true }).gte('created_at', since).neq('status', 'skipped')
  const runRow = prev.data
    ? await db.from('studio_worker_runs').update({ status: 'started', detail: 'retry', model: MODEL, finished_at: null }).eq('id', prev.data.id).select('id').single()
    : await db.from('studio_worker_runs').insert({ task_id: t.id, user_id: t.user_id, task_version: t.version, model: MODEL }).select('id').single()
  if (runRow.error) return 'another run is already on it'
  const runId = runRow.data.id
  const finish = (status: string, detail: string) => db.from('studio_worker_runs').update({ status, detail: detail.slice(0, 2000), finished_at: new Date().toISOString() }).eq('id', runId)
  const post = (args: Record<string, unknown>) => db.rpc('studio_worker_post', { p_task_id: t.id, p_request_key: `worker-${t.id}-v${t.version}`, p_expected_version: t.version, ...args })

  try {
    if ((count ?? 0) >= DAILY_CAP) throw new Error(`Daily cap reached (${DAILY_CAP} runs in 24 hours). Raise WORKER_DAILY_CAP or wait.`)
    const { data: msgs } = await db.from('studio_messages').select('seq,author,kind,body,refs,set_turn,set_status,created_at').eq('task_id', t.id).order('seq')
    const tail = (msgs || []).slice(-3)
    if (tail.length === 3 && tail.every(m => m.author === 'chatgpt')) throw new Error('ChatGPT already posted 3 times in a row on this task, so the worker stopped to avoid a loop.')

    // newest images on the task (dropped there or referenced), up to 4, shown to the model
    const refIds = [...(t.refs || []), ...(msgs || []).flatMap(m => m.refs || [])].filter((r: { type: string }) => r.type === 'asset').map((r: { id: string }) => r.id)
    const { data: own } = await db.from('studio_assets').select('id,path,file_name,width,height,note,created_at,mime_type').or(`task_id.eq.${t.id}${refIds.length ? ',id.in.(' + refIds.join(',') + ')' : ''}`).order('created_at', { ascending: false }).limit(4)
    const images: unknown[] = []
    for (const a of own || []) {
      const s = await db.storage.from(BUCKET).createSignedUrl(a.path, 900)
      if (s.data?.signedUrl) images.push({ type: 'input_text', text: `Image ${a.id} (${a.file_name}, ${a.width}x${a.height}): ${a.note || ''}` }, { type: 'input_image', image_url: s.data.signedUrl })
    }
    const history = (msgs || []).map(m => `#${m.seq} ${m.author} [${m.kind}]${m.set_turn ? ' -> ' + m.set_turn : ''}${m.set_status ? ' (' + m.set_status + ')' : ''}:\n${m.body}`).join('\n\n')
    const plan = await openai('responses', {
      model: MODEL,
      instructions: SYSTEM,
      input: [{ role: 'user', content: [{ type: 'input_text', text: `PROJECT: ${t.project}\nTITLE: ${t.title}\n\nBRIEF:\n${t.brief}\n\nMESSAGES SO FAR:\n${history || '(none)'}` }, ...images] }],
      text: { format: { type: 'json_schema', name: 'turn', strict: true, schema: PLAN_SCHEMA } },
    })
    const raw = plan.output_text ?? (plan.output || []).flatMap((o: { content?: { text?: string }[] }) => o.content || []).map((c: { text?: string }) => c.text || '').join('')
    const p = JSON.parse(raw)
    const turnArgs = p.done ? { p_set_status: 'done' } : { p_set_turn: p.next_turn }

    if (p.action === 'reply') {
      const r = await post({ p_kind: 'review', p_body: p.body, p_refs: [], ...turnArgs })
      if (r.error) throw new Error(r.error.message)
      await finish('ok', 'reply')
      return 'replied'
    }

    // draw
    const Image = await loadImage()
    const pixel = p.art_width > 0 && p.art_height > 0
    const ratio = pixel ? p.art_width / p.art_height : 1
    const size = ratio > 1.25 ? '1536x1024' : ratio < 0.8 ? '1024x1536' : '1024x1024'
    const { img, model: imageModel } = await drawImage({ prompt: p.image_prompt, size, background: 'transparent', output_format: 'png', quality: 'high', n: 1 })
    const b64 = img?.data?.[0]?.b64_json
    if (!b64) throw new Error('The image model returned no picture.')
    let bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
    let note = `Made by the ChatGPT worker (${imageModel}).`
    if (pixel) {
      const scale = Math.min(16, Math.max(1, p.scale || 4))
      const dec = await Image.decode(bytes)
      const out = pixelize({ w: dec.width, h: dec.height, data: new Uint8Array(dec.bitmap) }, p.art_width, p.art_height, scale, Math.min(32, Math.max(2, p.max_colours || 10)), (p.palette || []).slice(0, 32), p.outline || '')
      const check = verifyGrid(out, scale)
      if (!check.ok) throw new Error('Pixel check failed: ' + check.reason)
      const im = new Image(out.w, out.h); im.bitmap.set(out.data)
      bytes = await im.encode()
      note += ` ${p.art_width}x${p.art_height} art px at ${scale}x (${out.w}x${out.h}), ${check.colours} colours, every block solid, alpha 0/255.`
    }
    const sha = await sha256(bytes)
    const base = (p.file_name || 'chatgpt_art').replace(/\.[a-z0-9]{1,5}$/i, '').replace(/[^A-Za-z0-9._-]+/g, '-').slice(0, 60) || 'chatgpt_art'
    const path = `${t.user_id}/${t.id}/${sha.slice(0, 8)}-${base}.png`
    const up = await db.storage.from(BUCKET).upload(path, bytes, { contentType: 'image/png', upsert: false })
    if (up.error && !/exists/i.test(up.error.message)) throw new Error('Saving the image failed: ' + up.error.message)
    const dims = await Image.decode(bytes)
    const ins = await db.from('studio_assets').upsert({ user_id: t.user_id, task_id: t.id, file_name: path.split('/').pop(), original_name: base + '.png', mime_type: 'image/png', size_bytes: bytes.length, width: dims.width, height: dims.height, sha256: sha, path, source: 'base64', note }, { onConflict: 'user_id,task_id,sha256' }).select('id').single()
    if (ins.error) throw new Error('Recording the image failed: ' + ins.error.message)
    const r = await post({ p_kind: 'report', p_body: `${p.body}\n\nAsset ${ins.data.id} · sha256 ${sha} · ${note}`, p_refs: [{ type: 'asset', id: ins.data.id }], ...turnArgs })
    if (r.error) throw new Error(r.error.message)
    await finish('ok', 'image ' + ins.data.id)
    return 'drew ' + ins.data.id
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    await finish('error', msg)
    await post({ p_kind: 'question', p_body: `The ChatGPT worker couldn't finish this turn: ${msg}\n\nFix the cause, then hand the task back to ChatGPT (or press "run ChatGPT now" on the dashboard) to try again.`, p_set_turn: 'kody' })
    return 'error: ' + msg
  }
}

Deno.serve(async req => {
  if (req.method !== 'POST') return new Response('POST only', { status: 405 })
  const ok = await db.rpc('studio_worker_secret_ok', { p_secret: req.headers.get('x-worker-secret') || '' })
  if (ok.error || ok.data !== true) return new Response('Forbidden', { status: 403 })
  const { task_id } = await req.json().catch(() => ({}))
  if (typeof task_id !== 'string') return new Response('task_id required', { status: 400 })
  // answer the database right away; the turn keeps running in the background
  EdgeRuntime.waitUntil(run(task_id).then(r => console.log('worker', task_id, r)).catch(e => console.error('worker', task_id, e)))
  return new Response(JSON.stringify({ accepted: true }), { status: 202, headers: { 'Content-Type': 'application/json' } })
})
