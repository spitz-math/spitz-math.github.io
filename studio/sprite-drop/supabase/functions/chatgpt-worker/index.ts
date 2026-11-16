// chatgpt-worker (spitz.dev): does ChatGPT's turn on a Task Drop task by itself, through the OpenAI API.
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
import { OpenAIError, classify, candidates, imageCost, textCost, type Priority, type Rates } from './models.ts'

const OPENAI_KEY = Deno.env.get('OPENAI_API_KEY') || ''
const MODEL = Deno.env.get('OPENAI_MODEL') || 'gpt-5'
const IMAGE_MODEL_ENV = Deno.env.get('OPENAI_IMAGE_MODEL') || '' // optional override; normally the settings row picks
const MAX_IMAGE_ATTEMPTS = 3 // per run, all models together; a paid generation is never retried in a loop
const CACHE_HOURS = 24
const DAILY_CAP = Number(Deno.env.get('WORKER_DAILY_CAP') || 20)
const BUCKET = 'studio-assets'
const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })

const SYSTEM = `You are ChatGPT, the artist and reviewer in spitz.dev, a small studio where ChatGPT and Claude make HTML math games for Kody's middle-school students.
You are running as an automatic worker: nobody is chatting with you. Read the task brief and every message, then do ChatGPT's next turn.
Decide ONE action:
- "image": the task needs a new picture from you (a sprite, sheet, icon, background). Write a precise image_prompt for an image model. For pixel art give the exact sheet size in art pixels (art_width, art_height), the delivery scale from the brief (default 4), and max_colours (usually 6-12). The worker turns the picture into exact hard-edged pixel art at that size, so describe the art filling the canvas the same way the cells are laid out, on a fully transparent background, no labels or grid lines. If the brief lists exact hex colours, put ALL of them in palette (the worker snaps every pixel to them); if it asks for a 1 pixel outline, put that colour in outline (the worker closes the outline itself). Ask the image model for big chunky blocks, bold flat shading and a thick dark outline, so it survives shrinking. If it is NOT pixel art, set art_width/art_height to 0. Set priority to "default" unless the brief or Kody asks for quality, speed or cost.
- "reply": the turn needs words only (a review of screenshots, an answer, a decision). Be concrete and short.
Then choose next_turn: "claude" when Claude should act next (wire art in, build, fix), "kody" when Kody must decide or approve something, and done=true only when the brief's goal is fully met and nothing is left.
Never claim to have tested a game or approved a deploy: only Kody approves merges and deploys.`

const PLAN_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['action', 'body', 'priority', 'image_prompt', 'art_width', 'art_height', 'scale', 'max_colours', 'palette', 'outline', 'file_name', 'next_turn', 'done'],
  properties: {
    action: { type: 'string', enum: ['image', 'reply'] },
    body: { type: 'string', description: 'The message to post on the task (for image: what you drew and any notes for Claude).' },
    priority: { type: 'string', enum: ['quality', 'speed', 'cost', 'default'], description: 'quality for important game art, speed for experiments and quick revisions, cost for bulk or simple assets; default unless the brief or Kody asks.' },
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
  if (!r.ok) throw new OpenAIError(r.status, j?.error?.code || j?.error?.type || '', `OpenAI ${path} ${r.status}: ${j?.error?.message || 'no details'}`)
  return j
}

type Settings = { default_priority: Priority; preferred: Record<string, string | null>; quality_level: Record<string, string>; rates: Rates; monthly_limit_usd: number; monthly_image_cap: number; model_cache: string[] | null; model_cache_at: string | null }
type Track = { attempts: number; kinds: string[]; tried: string[] }

// The account's model list, cached in the settings row for a day so we only ask OpenAI when something fails.
async function available(st: Settings, fresh: boolean): Promise<string[] | null> {
  const age = st.model_cache_at ? Date.now() - Date.parse(st.model_cache_at) : Infinity
  if (!fresh && st.model_cache && age < CACHE_HOURS * 36e5) return st.model_cache
  const r = await fetch('https://api.openai.com/v1/models', { headers: { Authorization: 'Bearer ' + OPENAI_KEY } })
  if (!r.ok) return st.model_cache // can't list (key permission): keep what we had
  const ids: string[] = ((await r.json()).data || []).map((m: { id: string }) => m.id).filter((id: string) => /^(gpt-image|chatgpt-image)/.test(id))
  st.model_cache = ids; st.model_cache_at = new Date().toISOString()
  await db.from('studio_worker_settings').update({ model_cache: ids, model_cache_at: st.model_cache_at, updated_at: st.model_cache_at }).eq('id', 1)
  return ids
}

// Preferred model for the priority first; on a model/permission/compatibility error, the next compatible one.
// Rate limits and server errors get ONE more try on the same model. At most MAX_IMAGE_ATTEMPTS calls per run.
async function drawImage(body: Record<string, unknown>, priority: Priority, st: Settings, tr: Track) {
  const quality = st.quality_level?.[priority] || 'high'
  const preferred = st.preferred?.[priority] || IMAGE_MODEL_ENV || null
  let list_ = st.model_cache && st.model_cache_at && Date.now() - Date.parse(st.model_cache_at) < CACHE_HOURS * 36e5 ? st.model_cache : null
  let list = candidates(preferred && (!list_ || list_.includes(preferred)) ? preferred : null, list_, priority)
  if (!list.length) list = candidates(null, await available(st, true), priority)
  let last: unknown = new Error('No image model to try.'), retried = false, refreshed = false
  while (list.length && tr.attempts < MAX_IMAGE_ATTEMPTS) {
    const model = list[0]
    try { tr.attempts++; return { img: await openai('images/generations', { ...body, model, quality }), model, quality } }
    catch (e) {
      last = e; const c = classify(e); tr.kinds.push(c.kind)
      if (c.retrySame && !retried) { retried = true; await new Promise(r => setTimeout(r, c.kind === 'rate_limit' ? 20000 : 5000)); continue }
      if (!c.fallback) break
      tr.tried.push(model)
      list = candidates(null, (refreshed ? st.model_cache : (refreshed = true, await available(st, true))), priority, tr.tried)
    }
  }
  throw last
}

const sha256 = async (b: Uint8Array) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', b))).map(x => x.toString(16).padStart(2, '0')).join('')

async function run(taskId: string) {
  const { data: t } = await db.from('studio_tasks').select('*').eq('id', taskId).maybeSingle()
  if (!t || t.turn !== 'chatgpt' || t.status !== 'open') return 'not ChatGPT\'s turn'
  if (!OPENAI_KEY) return 'no OPENAI_API_KEY yet, so the worker stays off (chat ChatGPT can still take the turn)'
  // one run per task version (a failed run may be retried)
  const prev = await db.from('studio_worker_runs').select('id,status').eq('task_id', t.id).eq('task_version', t.version).maybeSingle()
  if (prev.data && prev.data.status !== 'error') return 'already ran on this version'
  // a run on an older version of this task is still drawing: let it finish (it re-posts on the newer version)
  const busy = await db.from('studio_worker_runs').select('id', { count: 'exact', head: true }).eq('task_id', t.id).eq('status', 'started').gte('created_at', new Date(Date.now() - 6e5).toISOString())
  if ((busy.count ?? 0) > 0) return 'another run on this task is still working'
  const since = new Date(Date.now() - 864e5).toISOString()
  const { count } = await db.from('studio_worker_runs').select('id', { count: 'exact', head: true }).gte('created_at', since).neq('status', 'skipped')
  const runRow = prev.data
    ? await db.from('studio_worker_runs').update({ status: 'started', detail: 'retry', model: MODEL, finished_at: null }).eq('id', prev.data.id).select('id').single()
    : await db.from('studio_worker_runs').insert({ task_id: t.id, user_id: t.user_id, task_version: t.version, model: MODEL }).select('id').single()
  if (runRow.error) return 'another run is already on it'
  const runId = runRow.data.id
  // what this run used and cost, saved with the run whatever happens
  const cost = { plan: null as number | null, image: null as number | null }
  const tr: Track = { attempts: 0, kinds: [], tried: [] }
  const rec: Record<string, unknown> = {}
  const finish = (status: string, detail: string) => db.from('studio_worker_runs').update({
    status, detail: detail.slice(0, 2000), finished_at: new Date().toISOString(), attempts: tr.attempts, ...rec,
    error_kind: status === 'error' ? (rec.error_kind || tr.kinds.at(-1) || 'other') : null,
    est_cost_usd: cost.plan === null && cost.image === null ? null : Number(((cost.plan || 0) + (cost.image || 0)).toFixed(4)),
  }).eq('id', runId)
  // post; if only a note was added meanwhile (still ChatGPT's open turn), post once more on the newer version
  const post = async (args: Record<string, unknown>) => {
    let r = await db.rpc('studio_worker_post', { p_task_id: t.id, p_request_key: `worker-${t.id}-v${t.version}`, p_expected_version: t.version, ...args })
    const nt = r.data?.conflict ? r.data.task : null
    if (nt && nt.turn === 'chatgpt' && nt.status === 'open') r = await db.rpc('studio_worker_post', { p_task_id: t.id, p_request_key: `worker-${t.id}-v${nt.version}`, p_expected_version: nt.version, ...args })
    return r
  }
  const conflicted = (r: { data?: { conflict?: boolean } }) => r.data?.conflict ? finish('skipped', 'Not posted: the task changed hands while the worker was working.').then(() => true) : Promise.resolve(false)

  try {
    const { data: st } = await db.from('studio_worker_settings').select('*').eq('id', 1).single() as { data: Settings }
    if ((count ?? 0) >= DAILY_CAP) { rec.error_kind = 'spend_cap'; throw new Error(`Daily cap reached (${DAILY_CAP} runs in 24 hours). Raise WORKER_DAILY_CAP or wait.`) }
    // monthly spending limit (estimated) and picture cap, so a retry loop can never drain the credits
    const month = new Date(); month.setUTCDate(1); month.setUTCHours(0, 0, 0, 0)
    const { data: spent } = await db.from('studio_worker_runs').select('est_cost_usd,attempts,image_model').gte('created_at', month.toISOString())
    const usd = (spent || []).reduce((a, r) => a + Number(r.est_cost_usd || 0), 0)
    const pics = (spent || []).reduce((a, r) => a + (r.image_model ? Number(r.attempts || 0) : 0), 0)
    if (usd >= Number(st.monthly_limit_usd) || pics >= st.monthly_image_cap) { rec.error_kind = 'spend_cap'; throw new Error(`Monthly limit reached: about $${usd.toFixed(2)} of $${st.monthly_limit_usd} and ${pics} of ${st.monthly_image_cap} pictures this month. Raise the limit in the worker settings or wait for next month.`) }
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
    cost.plan = textCost(MODEL, plan.usage, st.rates || {}); rec.usage = { plan: plan.usage || null }
    const raw = plan.output_text ?? (plan.output || []).flatMap((o: { content?: { text?: string }[] }) => o.content || []).map((c: { text?: string }) => c.text || '').join('')
    const p = JSON.parse(raw)
    const turnArgs = p.done ? { p_set_status: 'done' } : { p_set_turn: p.next_turn }

    if (p.action === 'reply') {
      const r = await post({ p_kind: 'review', p_body: p.body, p_refs: [], ...turnArgs })
      if (r.error) throw new Error(r.error.message)
      if (await conflicted(r)) return 'task changed, not posted'
      await finish('ok', 'reply')
      return 'replied'
    }

    // draw
    const Image = await loadImage()
    const pixel = p.art_width > 0 && p.art_height > 0
    const ratio = pixel ? p.art_width / p.art_height : 1
    const size = ratio > 1.25 ? '1536x1024' : ratio < 0.8 ? '1024x1536' : '1024x1024'
    const priority: Priority = ['quality', 'speed', 'cost'].includes(p.priority) ? p.priority : (st.default_priority || 'quality')
    Object.assign(rec, { priority, image_size: size })
    const { img, model: imageModel, quality } = await drawImage({ prompt: p.image_prompt, size, background: 'transparent', output_format: 'png', n: 1 }, priority, st, tr)
    cost.image = imageCost(img.usage, st.rates || {})
    Object.assign(rec, { image_model: imageModel, image_quality: quality, usage: { plan: plan.usage || null, image: img.usage || null } })
    const b64 = img?.data?.[0]?.b64_json
    if (!b64) throw new Error('The image model returned no picture.')
    let bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
    let note = `Made by the ChatGPT worker (${imageModel}, ${priority}).`
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
    if (await conflicted(r)) return 'task changed, image ' + ins.data.id + ' saved but not posted'
    await finish('ok', 'image ' + ins.data.id)
    return 'drew ' + ins.data.id
  } catch (e) {
    const raw = e instanceof Error ? e.message : String(e)
    const c = e instanceof OpenAIError ? classify(e) : null
    const tried = tr.tried.length ? ` Models tried: ${tr.tried.join(', ')}.` : ''
    const msg = c ? `${c.plain} (${c.kind}: ${raw})${tried}` : raw
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
