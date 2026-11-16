// chatgpt-worker (spitz.dev): does ChatGPT's turn on a Task Drop task by itself, through the OpenAI API.
// Woken by the database (trigger on studio_tasks, or the dashboard's "run ChatGPT now") with a Vault secret.
//
// Supabase stops a function 150 s after it starts, so a turn is split into steps, one OpenAI call per function call:
//   POST {task_id}  -> read the task, plan (reply in words, or list up to 3 pictures), save the plan
//   POST {run_id}   -> draw ONE picture, check it, save it; then the next picture, then post and hand off
// Each step chains to the next through studio_continue_run. While a step works it beats a heartbeat every 10 s and
// every step writes a row in studio_run_events, so the dashboard shows what is really happening. The watchdog
// (studio_watch_runs) notices a run whose heartbeat stopped. A paid call is never repeated on its own.
// Guards: each task version runs once; a daily cap; stops if ChatGPT already posted 3 times in a row.
// Errors are recorded on the run and in the task's activity; problems Kody must fix are posted with the turn set to Kody.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.119.0'
// loaded only when drawing, so a problem in the image library can never stop the worker from starting
const loadImage = async () => (await import('https://deno.land/x/imagescript@1.3.0/mod.ts')).Image
import { pixelize, verifyGrid } from './pixel.ts'
import { OpenAIError, classify, candidates, imageCost, textCost, type Priority, type Rates } from './models.ts'

const OPENAI_KEY = Deno.env.get('OPENAI_API_KEY') || ''
const MODEL = Deno.env.get('OPENAI_MODEL') || 'gpt-5'
const IMAGE_MODEL_ENV = Deno.env.get('OPENAI_IMAGE_MODEL') || '' // optional override; normally the settings row picks
const MAX_IMAGE_ATTEMPTS = 3 // per picture, all models together; a paid generation is never retried in a loop
const MAX_IMAGES = 3 // pictures per turn
const CACHE_HOURS = 24
const DAILY_CAP = Number(Deno.env.get('WORKER_DAILY_CAP') || 20)
const BUCKET = 'studio-assets'
const HEARTBEAT_MS = 10_000
const STEP_BUDGET_MS = Number(Deno.env.get('WORKER_STEP_BUDGET_MS') || 125_000) // stop an OpenAI call before Supabase's 150 s limit
const LIVE_MS = 50_000 // a heartbeat newer than this means a step is really running
const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })

const SYSTEM = `You are ChatGPT, the artist and reviewer in spitz.dev, a small studio where ChatGPT and Claude make HTML math games for Kody's middle-school students.
You are running as an automatic worker: nobody is chatting with you. Read the task brief and every message, then do ChatGPT's next turn.
Decide ONE action:
- "image": the task needs new pictures from you (a sprite, sheet, icon, background). Put one entry in images for each picture the brief asks for this turn (at most 3). For each, write a precise image_prompt for an image model. For pixel art give the exact sheet size in art pixels (art_width, art_height), the delivery scale from the brief (default 4), and max_colours (usually 6-12). The worker turns the picture into exact hard-edged pixel art at that size, so describe the art filling the canvas the same way the cells are laid out, on a fully transparent background, no labels or grid lines. If the brief lists exact hex colours, put ALL of them in palette (the worker snaps every pixel to them); if it asks for a 1 pixel outline, put that colour in outline (the worker closes the outline itself). Ask the image model for big chunky blocks, bold flat shading and a thick dark outline, so it survives shrinking. If it is NOT pixel art, set art_width/art_height to 0 and set size to the brief's shape (1536x1024 wide, 1024x1536 tall, 1024x1024 square). Set background to "opaque" when the brief wants a background colour or scene (say the colour in image_prompt), "transparent" for sprites and cut-outs. Set priority to "default" unless the brief or Kody asks for quality, speed or cost. Give each picture a quality: "high" for final assets, environments, backgrounds, scenes, concept sheets and sheets with many frames, or when Kody asks for final or high quality; "low" for throwaway tests, quick experiments and rough ideas; "medium" for everyday work and whenever you are unsure.
- Mechanical changes to an existing picture are NOT new drawings: resizing, nearest-neighbour scaling, palette or colour swaps, splitting, merging or arranging frames, moving things, transparency cleanup, format conversion. For those choose "reply", say exactly what to change (sizes, colours, frame order), and hand the turn to Claude, who does it in code and runs the same pixel checks.
- "reply": the turn needs words only (a review of screenshots, an answer, a decision). Be concrete and short.
Then choose next_turn: "claude" when Claude should act next (wire art in, build, fix), "kody" when Kody must decide or approve something, and done=true only when the brief's goal is fully met and nothing is left.
Never claim to have tested a game or approved a deploy: only Kody approves merges and deploys.`

const PLAN_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['action', 'body', 'priority', 'images', 'next_turn', 'done'],
  properties: {
    action: { type: 'string', enum: ['image', 'reply'] },
    body: { type: 'string', description: 'The message to post on the task (for image: what you drew and any notes for Claude).' },
    priority: { type: 'string', enum: ['quality', 'speed', 'cost', 'default'], description: 'quality for important game art, speed for experiments and quick revisions, cost for bulk or simple assets; default unless the brief or Kody asks.' },
    images: {
      type: 'array', description: 'One entry per picture to make this turn (1 to 3); [] for a reply.',
      items: {
        type: 'object', additionalProperties: false,
        required: ['image_prompt', 'quality', 'size', 'background', 'art_width', 'art_height', 'scale', 'max_colours', 'palette', 'outline', 'file_name'],
        properties: {
          image_prompt: { type: 'string' },
          quality: { type: 'string', enum: ['high', 'medium', 'low'], description: 'high: final assets, environments, scenes, concept or many-frame sheets, or Kody asked; low: throwaway tests; medium: everyday and unsure.' },
          size: { type: 'string', enum: ['1024x1024', '1536x1024', '1024x1536'], description: 'Canvas shape. Pixel art: the worker picks it from art_width/art_height.' },
          background: { type: 'string', enum: ['transparent', 'opaque'], description: 'opaque when the brief wants a background colour or scene; pixel art is always transparent.' },
          art_width: { type: 'integer' }, art_height: { type: 'integer' },
          scale: { type: 'integer' }, max_colours: { type: 'integer' },
          palette: { type: 'array', items: { type: 'string' }, description: 'Exact #RRGGBB colours the brief requires (outline included), or [] to let the worker pick.' },
          outline: { type: 'string', description: 'The #RRGGBB outline colour if the brief wants a 1 art pixel outline around the shapes, else "".' },
          file_name: { type: 'string' },
        },
      },
    },
    next_turn: { type: 'string', enum: ['claude', 'kody'] },
    done: { type: 'boolean' },
  },
}

class TimeoutError extends Error {}

// ---------- cost rules (approved 2026-11-16) ----------
type Quality = 'high' | 'medium' | 'low'
const DEFAULT_QUALITY: Quality = 'medium' // everyday default; the plan picks high for finals/scenes, low for throwaway tests
const isQ = (q: unknown): q is Quality => q === 'high' || q === 'medium' || q === 'low'
// Kody's (or the brief's) explicit wish wins: "high quality", "quality: low", ... The newest one counts.
export function explicitQuality(texts: string[]): Quality | null {
  for (let i = texts.length - 1; i >= 0; i--) {
    const m = /\b(high|medium|low)[- ]quality\b|\bquality\s*[:=]?\s*(high|medium|low)\b/i.exec(texts[i] || '')
    if (m) return (m[1] || m[2]).toLowerCase() as Quality
  }
  return null
}
// How hard the planner thinks. Low for one simple asset; normal for anything bigger or unclear.
// Signals, not brief length: what is asked for, how many pictures are in play, how long the task has gone on.
const SIMPLE = /\b(sprite|icon|pickup|coin|gem|key|heart|badge|button|particle|effect|spark|recolou?r|single)\b/i
const COMPLEX = /\b(sheet|frames?|animat\w*|tileset|tiles|environment|background|backdrop|scene|concept|level|map|ui|screen|hud|menu|several|multiple|set of|variants|options|compare|review|critique|feedback|redesign|style|direction)\b/i
export function planEffort(brief: string, kodyText: string, messages: number, pictures: number): { effort: 'low' | 'medium'; why: string } {
  const ask = brief + '\n' + kodyText
  if (/\breasoning\s*[:=]?\s*(normal|medium|high)\b/i.test(ask)) return { effort: 'medium', why: 'asked for normal reasoning' }
  if (/\breasoning\s*[:=]?\s*low\b/i.test(ask)) return { effort: 'low', why: 'asked for low reasoning' }
  if (COMPLEX.test(ask)) return { effort: 'medium', why: 'bigger or open-ended request' }
  if (pictures > 1) return { effort: 'medium', why: `${pictures} pictures to look at` }
  if (messages > 4) return { effort: 'medium', why: `${messages} messages of history` }
  if (SIMPLE.test(ask)) return { effort: 'low', why: 'one simple asset' }
  return { effort: 'medium', why: 'not clearly simple' }
}

// One OpenAI call, stopped after ms so it can never run into the platform's hard limit unnoticed.
async function openai(path: string, body: unknown, ms: number) {
  const ac = new AbortController(); const tm = setTimeout(() => ac.abort(), ms)
  try {
    const r = await fetch('https://api.openai.com/v1/' + path, { method: 'POST', signal: ac.signal, headers: { Authorization: 'Bearer ' + OPENAI_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) throw new OpenAIError(r.status, j?.error?.code || j?.error?.type || '', `OpenAI ${path} ${r.status}: ${j?.error?.message || 'no details'}`)
    return j
  } catch (e) {
    if (ac.signal.aborted) throw new TimeoutError(`OpenAI did not answer within ${Math.round(ms / 1000)} s, so the worker stopped waiting.`)
    throw e
  } finally { clearTimeout(tm) }
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
async function drawImage(body: Record<string, unknown>, priority: Priority, quality: Quality, st: Settings, tr: Track, deadline: number) {
  const preferred = st.preferred?.[priority] || IMAGE_MODEL_ENV || null
  let list_ = st.model_cache && st.model_cache_at && Date.now() - Date.parse(st.model_cache_at) < CACHE_HOURS * 36e5 ? st.model_cache : null
  let list = candidates(preferred && (!list_ || list_.includes(preferred)) ? preferred : null, list_, priority)
  if (!list.length) list = candidates(null, await available(st, true), priority)
  let last: unknown = new Error('No image model to try.'), retried = false, refreshed = false
  const cap = tr.attempts + MAX_IMAGE_ATTEMPTS
  while (list.length && tr.attempts < cap) {
    const model = list[0]
    const left = deadline - Date.now()
    if (left < 30_000) break // not enough time left in this step for another picture call
    try { tr.attempts++; return { img: await openai('images/generations', { ...body, model, quality }, left), model, quality } }
    catch (e) {
      last = e; const c = classify(e); tr.kinds.push(c.kind)
      if (e instanceof TimeoutError) break
      const wait = c.kind === 'rate_limit' ? 20000 : 5000
      if (c.retrySame && !retried && deadline - Date.now() > wait + 60_000) { retried = true; await new Promise(r => setTimeout(r, wait)); continue }
      if (!c.fallback) break
      tr.tried.push(model)
      list = candidates(null, (refreshed ? st.model_cache : (refreshed = true, await available(st, true))), priority, tr.tried)
    }
  }
  throw last
}

const sha256 = async (b: Uint8Array) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', b))).map(x => x.toString(16).padStart(2, '0')).join('')
const nowIso = () => new Date().toISOString()

type Task = { id: string; user_id: string; turn: string; status: string; version: number; refs: { type: string; id: string }[] | null; project: string; title: string; brief: string }
type Saved = { id: string; note: string }
type Run = {
  id: number; task_id: string; user_id: string; task_version: number; status: string; plan: any; done_assets: Saved[]; next_part: number
  part_started_at: string | null; heartbeat_at: string | null; attempts: number; est_cost_usd: number | null; usage: any; step: string | null
}

const loadTask = async (id: string) => (await db.from('studio_tasks').select('*').eq('id', id).maybeSingle()).data as Task | null
const loadRun = async (id: number) => (await db.from('studio_worker_runs').select('*').eq('id', id).maybeSingle()).data as Run | null

// one line in the task's activity feed (real execution events only)
async function ev(t: Task, runId: number | null, kind: string, detail: string, actor = 'chatgpt') {
  const r = await db.from('studio_run_events').insert({ task_id: t.id, user_id: t.user_id, run_id: runId, task_version: t.version, actor, kind, detail: detail.slice(0, 600) })
  if (r.error) console.error('event', kind, r.error.message)
}
// the step a run is on: saved on the run (dashboard) and as an event (feed)
async function step(t: Task, runId: number, text: string, extra: Record<string, unknown> = {}) {
  await db.from('studio_worker_runs').update({ step: text, heartbeat_at: nowIso(), ...extra }).eq('id', runId)
  await ev(t, runId, 'step', text[0].toUpperCase() + text.slice(1))
}
// "I'm alive" every 10 s while this call works, separate from whether OpenAI has answered yet
function heartbeat(runId: number) {
  const beat = () => db.from('studio_worker_runs').update({ heartbeat_at: nowIso() }).eq('id', runId).eq('status', 'started').then(() => {}, () => {})
  const h = setInterval(beat, HEARTBEAT_MS)
  return () => clearInterval(h)
}
// post as ChatGPT; if only a note was added meanwhile (still ChatGPT's open turn), post once more on the newer version
async function post(t: Task, args: Record<string, unknown>) {
  let r = await db.rpc('studio_worker_post', { p_task_id: t.id, p_request_key: `worker-${t.id}-v${t.version}`, p_expected_version: t.version, ...args })
  const nt = r.data?.conflict ? r.data.task : null
  if (nt && nt.turn === 'chatgpt' && nt.status === 'open') r = await db.rpc('studio_worker_post', { p_task_id: t.id, p_request_key: `worker-${t.id}-v${nt.version}`, p_expected_version: nt.version, ...args })
  return r as { data?: { conflict?: boolean }; error?: { message: string } | null }
}
const finish = (runId: number, status: string, detail: string, extra: Record<string, unknown> = {}) =>
  db.from('studio_worker_runs').update({ status, detail: detail.slice(0, 2000), finished_at: nowIso(), part_started_at: null, ...extra }).eq('id', runId)

// What a failure means for Kody, and whether Retry can fix it (a passing problem) or someone has to change something.
function explain(e: unknown, tr: Track) {
  const raw = e instanceof Error ? e.message : String(e)
  const tried = tr.tried.length ? ` Models tried: ${tr.tried.join(', ')}.` : ''
  if (e instanceof TimeoutError) return { kind: 'timeout', passing: true, msg: raw + ' (OpenAI may still bill for the stopped request.)' }
  if (e instanceof OpenAIError) { const c = classify(e); return { kind: c.kind, passing: c.retrySame, msg: `${c.plain} (${c.kind}: ${raw})${tried}` } }
  if (e instanceof TypeError && /fetch|network|connect|dns|tls|reset/i.test(raw)) return { kind: 'network', passing: true, msg: `Couldn't reach OpenAI (${raw}).` }
  return { kind: (e as { kind?: string })?.kind || 'other', passing: false, msg: raw }
}
class Stop extends Error { constructor(msg: string, public kind = 'other') { super(msg) } }

// A passing problem (timeout, rate limit, OpenAI server error): the task stays on ChatGPT's turn, the run is marked
// failed with the reason, Kody gets one phone alert, and Retry carries on from the unfinished step.
async function failPassing(t: Task, run: Run, kind: string, msg: string, where: string) {
  const saved = run.done_assets?.length || 0
  const what = `${where}: ${msg}${saved ? ` ${saved} picture${saved > 1 ? 's' : ''} already saved.` : ''} Press Retry on the task to carry on${run.plan ? ' from here' : ''}; nothing saved is redrawn.`
  await finish(run.id, 'error', what, { error_kind: kind })
  await ev(t, run.id, 'error', what)
  await db.rpc('studio_alert_run', { p_run_id: run.id, p_title: 'ChatGPT stopped', p_body: `${t.title}. ${where}. Open the task to retry.` })
}
// A problem someone has to fix (credits, key, content, the plan itself): posted to the task and handed to Kody.
async function failToKody(t: Task, run: Run, kind: string, msg: string, where: string) {
  const saved = run.done_assets || []
  const text = `The ChatGPT worker couldn't finish this turn (${where}): ${msg}`
  await finish(run.id, 'error', text, { error_kind: kind })
  await ev(t, run.id, 'error', text)
  const cur = await loadTask(t.id)
  if (!cur || cur.status !== 'open' || cur.turn !== 'chatgpt') return
  await post(cur, {
    p_kind: 'question', p_set_turn: 'kody',
    p_refs: saved.map(s => ({ type: 'asset', id: s.id })),
    p_body: `${text}${saved.length ? '\n\nSaved before it stopped:\n' + saved.map(s => s.note).join('\n') : ''}\n\nFix the cause, then hand the task back to ChatGPT (or press "Run ChatGPT now") to try again.`,
  })
}

// ---------- step 1: read the task and plan ----------
async function startTurn(taskId: string): Promise<string> {
  const t = await loadTask(taskId)
  if (!t || t.turn !== 'chatgpt' || t.status !== 'open') return 'not ChatGPT\'s turn'
  if (!OPENAI_KEY) { await ev(t, null, 'error', 'The worker has no OpenAI key yet, so it did not start.', 'system'); return 'no OPENAI_API_KEY' }
  // a step of a run on this task is alive right now: let it finish (it re-posts on the newer version)
  const live = await db.from('studio_worker_runs').select('id').eq('task_id', t.id).eq('status', 'started').gte('heartbeat_at', new Date(Date.now() - LIVE_MS).toISOString()).limit(1)
  if (live.data?.length) { await ev(t, live.data[0].id, 'skip', 'Wake received, but ChatGPT is already working on this task.', 'system'); return 'busy' }
  // one run per task version; a stopped run picks up where it stopped (no picture is drawn twice)
  const prev = (await db.from('studio_worker_runs').select('*').eq('task_id', t.id).eq('task_version', t.version).maybeSingle()).data as Run | null
  if (prev && !['error', 'stalled', 'started'].includes(prev.status)) { await ev(t, prev.id, 'skip', 'Wake received, but ChatGPT already took this turn.', 'system'); return 'already ran on this version' }
  if (prev?.plan) {
    const r = await db.from('studio_worker_runs').update({ status: 'started', error_kind: null, finished_at: null, part_started_at: null, heartbeat_at: nowIso(), detail: null }).eq('id', prev.id).eq('status', prev.status).select('id')
    if (!r.data?.length) return 'another wake took it'
    const at = prev.next_part < prev.plan.images.length ? `picture ${prev.next_part + 1} of ${prev.plan.images.length}` : 'the hand-off'
    await ev(t, prev.id, 'retry', `Picking up the stopped run at ${at} (${prev.done_assets.length} picture${prev.done_assets.length === 1 ? '' : 's'} already saved).`, 'system')
    await db.rpc('studio_continue_run', { p_run_id: prev.id })
    return 'resumed run ' + prev.id
  }
  const since = new Date(Date.now() - 864e5).toISOString()
  const { count } = await db.from('studio_worker_runs').select('id', { count: 'exact', head: true }).gte('created_at', since).neq('status', 'skipped')
  const fresh = { status: 'started', step: 'reading the task', heartbeat_at: nowIso(), model: MODEL, finished_at: null, detail: null, error_kind: null, plan: null, done_assets: [], next_part: 0, part_started_at: null, alerted: false }
  const runRow = prev
    ? await db.from('studio_worker_runs').update(fresh).eq('id', prev.id).eq('status', prev.status).select('*').maybeSingle()
    : await db.from('studio_worker_runs').insert({ ...fresh, task_id: t.id, user_id: t.user_id, task_version: t.version }).select('*').single()
  if (runRow.error || !runRow.data) return 'another run is already on it'
  const run = runRow.data as Run
  const stopBeat = heartbeat(run.id)
  await ev(t, run.id, 'start', prev ? `Started again (run ${run.id}): reading the task.` : `Started (run ${run.id}): reading the task.`)
  const tr: Track = { attempts: 0, kinds: [], tried: [] }
  try {
    const { data: st } = await db.from('studio_worker_settings').select('*').eq('id', 1).single() as { data: Settings }
    if ((count ?? 0) >= DAILY_CAP) throw new Stop(`Daily cap reached (${DAILY_CAP} runs in 24 hours). Raise WORKER_DAILY_CAP or wait.`, 'spend_cap')
    // monthly spending limit (estimated) and picture cap, so a retry loop can never drain the credits
    const month = new Date(); month.setUTCDate(1); month.setUTCHours(0, 0, 0, 0)
    const { data: spent } = await db.from('studio_worker_runs').select('est_cost_usd,attempts,image_model').gte('created_at', month.toISOString())
    const usd = (spent || []).reduce((a, r) => a + Number(r.est_cost_usd || 0), 0)
    const pics = (spent || []).reduce((a, r) => a + (r.image_model ? Number(r.attempts || 0) : 0), 0)
    if (usd >= Number(st.monthly_limit_usd) || pics >= st.monthly_image_cap) throw new Stop(`Monthly limit reached: about $${usd.toFixed(2)} of $${st.monthly_limit_usd} and ${pics} of ${st.monthly_image_cap} pictures this month. Raise the limit in the worker settings or wait for next month.`, 'spend_cap')
    const { data: msgs } = await db.from('studio_messages').select('seq,author,kind,body,refs,set_turn,set_status,created_at').eq('task_id', t.id).order('seq')
    const tail = (msgs || []).slice(-3)
    if (tail.length === 3 && tail.every(m => m.author === 'chatgpt')) throw new Stop('ChatGPT already posted 3 times in a row on this task, so the worker stopped to avoid a loop.', 'loop')

    // newest images on the task (dropped there or referenced), up to 4, shown to the model
    const refIds = [...(t.refs || []), ...(msgs || []).flatMap(m => m.refs || [])].filter((r: { type: string }) => r.type === 'asset').map((r: { id: string }) => r.id)
    const { data: own } = await db.from('studio_assets').select('id,path,file_name,width,height,note,created_at,mime_type').or(`task_id.eq.${t.id}${refIds.length ? ',id.in.(' + refIds.join(',') + ')' : ''}`).order('created_at', { ascending: false }).limit(4)
    const images: unknown[] = []
    for (const a of own || []) {
      const s = await db.storage.from(BUCKET).createSignedUrl(a.path, 900)
      if (s.data?.signedUrl) images.push({ type: 'input_text', text: `Image ${a.id} (${a.file_name}, ${a.width}x${a.height}): ${a.note || ''}` }, { type: 'input_image', image_url: s.data.signedUrl })
    }
    const history = (msgs || []).map(m => `#${m.seq} ${m.author} [${m.kind}]${m.set_turn ? ' -> ' + m.set_turn : ''}${m.set_status ? ' (' + m.set_status + ')' : ''}:\n${m.body}`).join('\n\n')
    const kodyText = (msgs || []).filter(m => m.author === 'kody').map(m => m.body).join('\n')
    const eff = planEffort(t.brief || '', kodyText, msgs?.length || 0, own?.length || 0)
    await step(t, run.id, `planning (read ${msgs?.length || 0} messages and ${own?.length || 0} pictures; asking ${MODEL}, ${eff.effort} reasoning: ${eff.why})`)
    const planned = await openai('responses', {
      model: MODEL,
      reasoning: { effort: eff.effort },
      instructions: SYSTEM,
      input: [{ role: 'user', content: [{ type: 'input_text', text: `PROJECT: ${t.project}\nTITLE: ${t.title}\n\nBRIEF:\n${t.brief}\n\nMESSAGES SO FAR:\n${history || '(none)'}` }, ...images] }],
      text: { format: { type: 'json_schema', name: 'turn', strict: true, schema: PLAN_SCHEMA } },
    }, STEP_BUDGET_MS - 10_000)
    const planCost = textCost(MODEL, planned.usage, st.rates || {})
    const raw = planned.output_text ?? (planned.output || []).flatMap((o: { content?: { text?: string }[] }) => o.content || []).map((c: { text?: string }) => c.text || '').join('')
    const p = JSON.parse(raw)
    p.images = (p.images || []).slice(0, MAX_IMAGES)
    // quality per picture: explicit wish > the earlier picture's quality on this task (a revision) > the plan's pick > medium
    const wish = explicitQuality([t.brief || '', ...(msgs || []).filter(m => m.author === 'kody').map(m => m.body)])
    const parent = wish ? null : (await db.from('studio_worker_runs').select('image_quality').eq('task_id', t.id).eq('status', 'ok').not('image_quality', 'is', null).order('id', { ascending: false }).limit(1)).data?.[0]?.image_quality
    for (const q of p.images) {
      const [lvl, src] = wish ? [wish, 'asked'] : isQ(parent) ? [parent, 'same as the earlier picture'] : isQ(q.quality) ? [q.quality, 'planner'] : [DEFAULT_QUALITY, 'default']
      q.quality = lvl; q.quality_source = src
    }
    const costCols = { usage: { plan: planned.usage || null, plan_effort: eff.effort, images: [] }, est_cost_usd: planCost === null ? null : Number(planCost.toFixed(4)) }

    if (p.action === 'reply') {
      await step(t, run.id, 'posting the reply', costCols)
      const cur = await loadTask(t.id)
      if (!cur || cur.turn !== 'chatgpt' || cur.status !== 'open') { await finish(run.id, 'skipped', 'Not posted: the task changed hands while the worker was working.'); await ev(t, run.id, 'skip', 'Not posted: the task changed hands while ChatGPT was working.'); return 'task changed' }
      const r = await post(cur, { p_kind: 'review', p_body: p.body, p_refs: [], ...(p.done ? { p_set_status: 'done' } : { p_set_turn: p.next_turn }) })
      if (r.error) throw new Error('Posting the reply failed: ' + r.error.message)
      if (r.data?.conflict) { await finish(run.id, 'skipped', 'Not posted: the task changed hands while the worker was working.'); await ev(t, run.id, 'skip', 'Not posted: the task changed hands while ChatGPT was working.'); return 'task changed' }
      await finish(run.id, 'ok', 'reply', { step: 'done' })
      await ev(t, run.id, p.done ? 'done' : 'handoff', p.done ? 'Replied and marked the task done.' : `Replied and handed the task to ${p.next_turn === 'kody' ? 'Kody' : 'Claude'}.`)
      return 'replied'
    }
    if (!p.images.length) throw new Stop('The plan said "image" but listed no pictures.', 'plan')
    const n = p.images.length
    const names = p.images.map((q: { file_name: string }) => q.file_name).join(', ')
    await db.from('studio_worker_runs').update({ plan: p, next_part: 0, ...costCols }).eq('id', run.id)
    await ev(t, run.id, 'step', `Plan ready: ${n} picture${n > 1 ? 's' : ''} (${names}).`)
    await step(t, run.id, `waiting to draw picture 1 of ${n}`)
    stopBeat()
    const c = await db.rpc('studio_continue_run', { p_run_id: run.id })
    if (c.error) throw new Error('Could not start the drawing step: ' + c.error.message)
    return 'planned ' + n
  } catch (e) {
    const x = explain(e, tr)
    const cur = (await loadRun(run.id)) || run
    if (x.passing) await failPassing(t, cur, x.kind, x.msg, 'Stopped while planning')
    else await failToKody(t, cur, x.kind, x.msg, 'while planning')
    return 'error: ' + x.msg
  } finally { stopBeat() }
}

// ---------- step 2..n: one picture per call, then hand off ----------
async function continueRun(runId: number): Promise<string> {
  let run = await loadRun(runId)
  if (!run || run.status !== 'started' || !run.plan) return 'run is not waiting for a step'
  const t = await loadTask(run.task_id)
  if (!t) return 'task gone'
  if (t.turn !== 'chatgpt' || t.status !== 'open') {
    await finish(run.id, 'skipped', 'Stopped: the task changed hands while the worker was working.' + (run.done_assets.length ? ` Saved pictures: ${run.done_assets.map(s => s.id).join(', ')}.` : ''))
    await ev(t, run.id, 'skip', 'Stopped: the task changed hands while ChatGPT was working.')
    return 'task changed hands'
  }
  const p = run.plan, n = p.images.length, k = run.next_part
  // claim this step, so two wakes can never draw the same picture
  const label = k < n ? `drawing picture ${k + 1} of ${n} (${p.images[k].file_name})` : 'handing off'
  const claim = await db.from('studio_worker_runs').update({ part_started_at: nowIso(), heartbeat_at: nowIso(), step: label })
    .eq('id', run.id).eq('status', 'started').eq('next_part', k).is('part_started_at', null).select('*')
  if (!claim.data?.length) return 'step already claimed'
  run = claim.data[0] as Run
  const stopBeat = heartbeat(run.id)
  const tr: Track = { attempts: run.attempts || 0, kinds: [], tried: [] }
  try {
    if (k >= n) return await handOff(t, run)
    await ev(t, run.id, 'step', label[0].toUpperCase() + label.slice(1))
    const deadline = Date.now() + STEP_BUDGET_MS
    const { data: st } = await db.from('studio_worker_settings').select('*').eq('id', 1).single() as { data: Settings }
    const q = p.images[k]
    const priority: Priority = ['quality', 'speed', 'cost'].includes(p.priority) ? p.priority : (st.default_priority || 'quality')
    const pixel = q.art_width > 0 && q.art_height > 0
    const ratio = pixel ? q.art_width / q.art_height : 1
    const size = pixel ? (ratio > 1.25 ? '1536x1024' : ratio < 0.8 ? '1024x1536' : '1024x1024') : (['1024x1024', '1536x1024', '1024x1536'].includes(q.size) ? q.size : '1024x1024')
    const background = pixel || q.background !== 'opaque' ? 'transparent' : 'opaque'
    let drawn
    const level: Quality = isQ(q.quality) ? q.quality : DEFAULT_QUALITY
    try { drawn = await drawImage({ prompt: q.image_prompt, size, background, output_format: 'png', n: 1 }, priority, level, st, tr, deadline) }
    finally { await db.from('studio_worker_runs').update({ attempts: tr.attempts }).eq('id', run.id) }
    const { img, model: imageModel, quality } = drawn
    const c = imageCost(img.usage, st.rates || {})
    const usage = { ...(run.usage || {}), images: [...(run.usage?.images || []), img.usage || null] }
    const cost = c === null ? run.est_cost_usd : Number((Number(run.est_cost_usd || 0) + c).toFixed(4))
    await db.from('studio_worker_runs').update({ priority, image_size: size, image_model: imageModel, image_quality: quality, usage, est_cost_usd: cost }).eq('id', run.id)
    const b64 = img?.data?.[0]?.b64_json
    if (!b64) throw new Stop('The image model returned no picture.', 'other')
    let bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
    let note = `Made by the ChatGPT worker (${imageModel}, ${quality} quality${q.quality_source ? ' [' + q.quality_source + ']' : ''}, ${priority}, ${size}, ${background}).`
    await step(t, run.id, `checking picture ${k + 1} of ${n}`)
    const Image = await loadImage()
    if (pixel) {
      const scale = Math.min(16, Math.max(1, q.scale || 4))
      const dec = await Image.decode(bytes)
      const out = pixelize({ w: dec.width, h: dec.height, data: new Uint8Array(dec.bitmap) }, q.art_width, q.art_height, scale, Math.min(32, Math.max(2, q.max_colours || 10)), (q.palette || []).slice(0, 32), q.outline || '')
      const check = verifyGrid(out, scale)
      if (!check.ok) throw new Stop('Pixel check failed: ' + check.reason, 'pixel_check')
      const im = new Image(out.w, out.h); im.bitmap.set(out.data)
      bytes = await im.encode()
      note += ` ${q.art_width}x${q.art_height} art px at ${scale}x (${out.w}x${out.h}), ${check.colours} colours, every block solid, alpha 0/255.`
    }
    await step(t, run.id, `saving picture ${k + 1} of ${n}`)
    const sha = await sha256(bytes)
    const base = (q.file_name || 'chatgpt_art').replace(/\.[a-z0-9]{1,5}$/i, '').replace(/[^A-Za-z0-9._-]+/g, '-').slice(0, 60) || 'chatgpt_art'
    const path = `${t.user_id}/${t.id}/${sha.slice(0, 8)}-${base}.png`
    const up = await db.storage.from(BUCKET).upload(path, bytes, { contentType: 'image/png', upsert: false })
    if (up.error && !/exists/i.test(up.error.message)) throw new Error('Saving the image failed: ' + up.error.message)
    const dims = await Image.decode(bytes)
    const ins = await db.from('studio_assets').upsert({ user_id: t.user_id, task_id: t.id, file_name: path.split('/').pop(), original_name: base + '.png', mime_type: 'image/png', size_bytes: bytes.length, width: dims.width, height: dims.height, sha256: sha, path, source: 'base64', note }, { onConflict: 'user_id,task_id,sha256' }).select('id').single()
    if (ins.error) throw new Error('Recording the image failed: ' + ins.error.message)
    const done = [...run.done_assets, { id: ins.data.id, note: `Asset ${ins.data.id} (${base}) · sha256 ${sha} · ${note}` }]
    const nextLabel = k + 1 < n ? `waiting to draw picture ${k + 2} of ${n}` : 'handing off'
    await db.from('studio_worker_runs').update({ done_assets: done, next_part: k + 1, part_started_at: null, heartbeat_at: nowIso(), step: nextLabel }).eq('id', run.id)
    await ev(t, run.id, 'saved', `Saved picture ${k + 1} of ${n}: ${base}.png, ${dims.width}x${dims.height} (asset ${ins.data.id}).`)
    stopBeat()
    const cr = await db.rpc('studio_continue_run', { p_run_id: run.id })
    if (cr.error) throw new Error('Could not start the next step: ' + cr.error.message)
    return `saved picture ${k + 1} of ${n}`
  } catch (e) {
    const x = explain(e, tr)
    const cur = (await loadRun(run.id)) || run
    const where = k < n ? `Stopped while drawing picture ${k + 1} of ${n}` : 'Stopped while handing off'
    if (x.passing) await failPassing(t, cur, x.kind, x.msg, where)
    else await failToKody(t, cur, x.kind, x.msg, where.replace('Stopped ', ''))
    return 'error: ' + x.msg
  } finally { stopBeat() }
}

async function handOff(t: Task, run: Run): Promise<string> {
  const p = run.plan
  const to = p.next_turn === 'kody' ? 'kody' : 'claude'
  await ev(t, run.id, 'step', `Handing off to ${to === 'kody' ? 'Kody' : 'Claude'}`)
  // new art is never self-approved: it always goes to Claude (or Kody) for a check, even if the plan said done.
  const r = await post(t, { p_kind: 'report', p_body: `${p.body}\n\n${run.done_assets.map(s => s.note).join('\n')}`, p_refs: run.done_assets.map(s => ({ type: 'asset', id: s.id })), p_set_turn: to })
  if (r.error) throw new Error('Posting the pictures failed: ' + r.error.message)
  if (r.data?.conflict) {
    await finish(run.id, 'skipped', 'Not posted: the task changed hands. Pictures saved: ' + run.done_assets.map(s => s.id).join(', '))
    await ev(t, run.id, 'skip', 'Not posted: the task changed hands while ChatGPT was working. The pictures are saved on the task.')
    return 'task changed, not posted'
  }
  await finish(run.id, 'ok', 'images ' + run.done_assets.map(s => s.id).join(', '), { step: 'done' })
  await ev(t, run.id, 'handoff', `Posted ${run.done_assets.length} picture${run.done_assets.length > 1 ? 's' : ''} and handed the task to ${to === 'kody' ? 'Kody' : 'Claude'}.`)
  return 'handed off'
}

Deno.serve(async req => {
  if (req.method !== 'POST') return new Response('POST only', { status: 405 })
  const ok = await db.rpc('studio_worker_secret_ok', { p_secret: req.headers.get('x-worker-secret') || '' })
  if (ok.error || ok.data !== true) return new Response('Forbidden', { status: 403 })
  const { task_id, run_id } = await req.json().catch(() => ({}))
  const job = typeof run_id === 'number' ? continueRun(run_id) : typeof task_id === 'string' ? startTurn(task_id) : null
  if (!job) return new Response('task_id or run_id required', { status: 400 })
  // answer the database right away; the step keeps running in the background
  EdgeRuntime.waitUntil(job.then(r => console.log('worker', task_id || 'run ' + run_id, r)).catch(e => console.error('worker', task_id || 'run ' + run_id, e)))
  return new Response(JSON.stringify({ accepted: true }), { status: 202, headers: { 'Content-Type': 'application/json' } })
})
