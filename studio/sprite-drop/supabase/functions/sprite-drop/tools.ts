// Sprite Drop tools (see index.ts for the sign-in wiring).
import { createMcpHandler, McpServer } from 'npm:@modelcontextprotocol/server@^2.4.0'
import { z } from 'npm:zod@^4.3.6'
import { registerTaskTools } from './tasks.ts'
import { assetPath, BUCKET, cleanTaskId, describeFile, dimensions, fromBase64, INLINE_LIMIT, MAX_BYTES, sniff, toBase64 } from './image.ts'

// deno-lint-ignore no-explicit-any
export type Db = { from: (t: string) => any; storage: { from: (b: string) => any }; rpc: (fn: string, args?: Record<string, unknown>) => any }

const text = (v: unknown) => ({ content: [{ type: 'text' as const, text: typeof v === 'string' ? v : JSON.stringify(v, null, 2) }] })
const fail = (e: unknown) => ({ isError: true, content: [{ type: 'text' as const, text: e instanceof Error ? e.message : String(e) }] })
const sha256Hex = async (b: Uint8Array) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', b as BufferSource))].map((x) => x.toString(16).padStart(2, '0')).join('')

const APPROVE = (id: string) => `https://dev.spitzmath.com/approve/?id=${id}`
const HELD_RULE = 'Every new picture is HELD: nobody can use it (task references, message refs, fetches for a task, ready) until Kody approves that exact file himself on spitz.dev. ' +
  'Nobody else can approve: not ChatGPT, not Claude, not the workers. Show Kody the stored file with get_asset, then give him the approve_url. If he asks for changes, make a NEW file.'

class Stage extends Error { constructor(public stage: string, msg: string, public detail: Record<string, unknown> = {}) { super(msg) } }

async function download(url: string): Promise<{ bytes: Uint8Array; status: number; contentType: string | null }> {
  let u: URL
  try { u = new URL(url) } catch { throw new Stage('download', 'The file link is not a valid URL.') }
  if (u.protocol !== 'https:') throw new Stage('download', 'Only https file links are accepted.')
  const res = await fetch(u, { redirect: 'follow' })
  const contentType = res.headers.get('content-type')
  if (!res.ok || !res.body) throw new Stage('download', `Downloading the file failed (HTTP ${res.status}). ChatGPT file links expire quickly.`, { status: res.status, contentType })
  if (Number(res.headers.get('content-length') || 0) > MAX_BYTES) throw new Stage('download', 'The file is over 10 MB.', { status: res.status })
  const reader = res.body.getReader()
  const parts: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.length
    if (total > MAX_BYTES) { await reader.cancel(); throw new Stage('download', 'The file is over 10 MB.') }
    parts.push(value)
  }
  const bytes = new Uint8Array(total)
  let at = 0
  for (const p of parts) { bytes.set(p, at); at += p.length }
  return { bytes, status: res.status, contentType }
}

// What the server verified about the caller, from the signed token (never from tool arguments).
export type Who = { user_id: string; email: string | null; client_id: string | null; session_id: string | null; owner_lock: 'off' | 'match' }

export function handlerFor(supabase: Db, userId: string, who?: Who) {
  // Every drop attempt is logged, success or not, so we can see exactly where a transfer broke.
  const log = (row: { task_id: string | null; stage: string; ok: boolean; detail: Record<string, unknown> }) =>
    Promise.resolve(supabase.from('studio_drop_log').insert({ user_id: userId, ...row })).catch(() => {})

  return createMcpHandler(() => {
    const server = new McpServer({ name: 'sprite-drop', version: '0.2.0' })

    server.registerTool('drop_asset', {
      title: 'Drop an image for Claude',
      description:
        'Save an image (PNG, JPEG, WebP or GIF, up to 10 MB) for a task so Claude can fetch the exact file later. ' +
        'In ChatGPT, pass the image as file: an image you just generated in this conversation, or one Kody uploaded. ' +
        'Otherwise pass url (an https link that downloads the image) or image_base64. ' +
        'Returns the stored file name, type, size, pixel dimensions, SHA-256 checksum and the approval link. ' + HELD_RULE,
      inputSchema: z.object({
        task_id: z.string().describe('Task this image belongs to, e.g. "rook-and-ruin/second-wind" or a GitHub issue like "spitz-arcade#150"'),
        file: z.object({
          download_url: z.string(),
          file_id: z.string(),
          mime_type: z.string().optional(),
          file_name: z.string().optional(),
        }).optional().describe('The image from this conversation'),
        url: z.string().optional().describe('https link that downloads the image, when there is no file'),
        image_base64: z.string().max(2_000_000).optional().describe('The image as base64 (small images only), when there is no file or url'),
        file_name: z.string().max(100).optional().describe('Name to save it as, e.g. "second_wind_64x32.png"'),
        note: z.string().max(1000).optional().describe('Anything Claude should know: what it is, intended size, what to fix'),
        made_from: z.string().optional().describe('Asset id of the APPROVED picture this one was made from (a 1x conversion, an animation, an edit). Kody sees them side by side.'),
        frames: z.object({ frame_w: z.number().int().min(1), frame_h: z.number().int().min(1), frame_ms: z.number().int().min(16).max(5000) }).optional()
          .describe('For a sprite sheet: one frame\'s width and height in pixels and how long each frame shows. Kody\'s preview plays it at that speed.'),
      }),
      _meta: { 'openai/fileParams': ['file'] },
    }, async ({ task_id, file, url, image_base64, file_name, note, made_from, frames }) => {
      const received = { file: describeFile(file), url: url ? 'given' : null, image_base64: image_base64 ? image_base64.length + ' chars' : null }
      let tid: string | null = null
      let stored: string | null = null
      try {
        tid = cleanTaskId(task_id)
        let bytes: Uint8Array
        let source: string
        let http: Record<string, unknown> = {}
        if (file?.download_url) {
          const d = await download(file.download_url); bytes = d.bytes; source = 'file'; http = { status: d.status, contentType: d.contentType }
        } else if (url) {
          const d = await download(url); bytes = d.bytes; source = 'url'; http = { status: d.status, contentType: d.contentType }
        } else if (image_base64) {
          try { bytes = fromBase64(image_base64) } catch { throw new Stage('decode', 'image_base64 is not valid base64.') }
          if (bytes.length > MAX_BYTES) throw new Stage('decode', 'The image is over 10 MB.')
          source = 'base64'
        } else {
          throw new Stage('input', 'No image arrived. Pass the image as file (ChatGPT), or a url, or image_base64.', { hint: file ? 'file was present but had no download_url' : 'file was empty' })
        }
        if (!bytes.length) throw new Stage('check', 'The file arrived empty (0 bytes).', http)
        const kind = sniff(bytes)
        if (!kind) throw new Stage('check', 'The bytes are not a PNG, JPEG, WebP or GIF image.', { ...http, firstBytes: [...bytes.subarray(0, 8)].map((x) => x.toString(16).padStart(2, '0')).join(' '), size: bytes.length })
        const dims = dimensions(bytes)
        const sha256 = await sha256Hex(bytes)
        const name = (file_name || file?.file_name || 'asset').trim()
        const path = assetPath(userId, tid, sha256, name, kind.ext)

        if (frames && dims && (dims.width % frames.frame_w || dims.height % frames.frame_h))
          throw new Stage('check', `frames: ${frames.frame_w}x${frames.frame_h} does not divide the ${dims.width}x${dims.height} image evenly.`)
        const { data: dup } = await supabase.from('studio_assets').select('id, file_name, created_at, status').eq('task_id', tid).eq('sha256', sha256).maybeSingle()
        if (dup) {
          await log({ task_id: tid, stage: 'duplicate', ok: true, detail: { received, sha256, assetId: dup.id } })
          return text({ saved: false, note: 'This exact file is already saved on this task.', asset: { id: dup.id, file_name: dup.file_name, sha256, status: dup.status }, approve_url: APPROVE(dup.id) })
        }

        const up = await supabase.storage.from(BUCKET).upload(path, bytes, { contentType: kind.mime, upsert: false })
        if (up.error) throw new Stage('store', 'Saving to storage failed: ' + up.error.message)
        stored = path
        const row = {
          user_id: userId, task_id: tid, file_name: path.split('/').pop(), original_name: name,
          mime_type: kind.mime, declared_mime: file?.mime_type ?? null, size_bytes: bytes.length,
          width: dims?.width ?? null, height: dims?.height ?? null, sha256, path, source, note: note ?? null,
          parent_id: made_from ?? null, anim: frames ?? null,
        }
        const ins = await supabase.from('studio_assets').insert(row).select('id, created_at, status').single()
        if (ins.error) throw new Stage('record', 'Saving the record failed: ' + ins.error.message)
        stored = null
        const asset = { id: ins.data.id, task_id: tid, file_name: row.file_name, mime_type: kind.mime, size_bytes: bytes.length, width: row.width, height: row.height, sha256, source, created_at: ins.data.created_at, status: ins.data.status, made_from: made_from ?? null }
        await log({ task_id: tid, stage: 'saved', ok: true, detail: { received, ...http, asset } })
        return text({ saved: true, asset, approve_url: APPROVE(asset.id),
          next: 'HELD until Kody approves it. Now call get_asset on this id and show Kody the stored file, then give him approve_url. You cannot approve it, and nobody can use it before he does.',
          tell_claude: `Asset ${asset.id} on task ${tid}: ${asset.width}x${asset.height} ${kind.mime}, ${bytes.length} bytes, sha256 ${sha256}, held for Kody's approval` })
      } catch (e) {
        if (stored) await Promise.resolve(supabase.storage.from(BUCKET).remove([stored])).catch(() => {})
        const s = e instanceof Stage ? e : new Stage('unexpected', e instanceof Error ? e.message : String(e))
        await log({ task_id: tid, stage: s.stage, ok: false, detail: { received, error: s.message, ...s.detail } })
        return fail(`[${s.stage}] ${s.message}`)
      }
    })

    server.registerTool('list_assets', {
      title: 'List dropped images',
      annotations: { readOnlyHint: true },
      description: 'Images saved with drop_asset, newest first, with size, dimensions and checksum. Also shows the latest drop attempts, including failed ones and the step where they failed.',
      inputSchema: z.object({
        task_id: z.string().optional().describe('Only this task'),
        limit: z.number().int().min(1).max(50).optional(),
      }),
    }, async ({ task_id, limit }) => {
      try {
        let q = supabase.from('studio_assets').select('id, task_id, file_name, original_name, mime_type, declared_mime, size_bytes, width, height, sha256, source, note, created_at, status, made_by, parent_id, anim').order('created_at', { ascending: false }).limit(limit ?? 20)
        if (task_id) q = q.eq('task_id', task_id.trim())
        const { data, error } = await q
        if (error) throw new Error(error.message)
        let lq = supabase.from('studio_drop_log').select('created_at, task_id, stage, ok, detail').order('created_at', { ascending: false }).limit(10)
        if (task_id) lq = lq.eq('task_id', task_id.trim())
        const { data: attempts } = await lq
        const assets = (data ?? []).map((a: { id: string; status: string }) => a.status === 'held' ? { ...a, approve_url: APPROVE(a.id) } : a)
        return text({ assets, rule: HELD_RULE, recentAttempts: attempts ?? [] })
      } catch (e) { return fail(e) }
    })

    server.registerTool('get_asset', {
      title: 'Get a dropped image',
      annotations: { readOnlyHint: true },
      description: 'Fetch one saved image by id. Re-checks the stored bytes against the saved checksum and shows the image. For an approved (or older) picture it also gives a download link that expires in 10 minutes, and include_base64 returns the raw bytes (up to 1 MB). ' +
        'A HELD picture (waiting for Kody) or a REJECTED one comes back as a PREVIEW ONLY: you see the stored file, but get no download link, no bytes, and no fetch is recorded for any task. Show the preview and its approve_url to Kody.',
      inputSchema: z.object({
        id: z.string().describe('Asset id from drop_asset or list_assets'),
        include_base64: z.boolean().optional(),
        task_id: z.string().optional().describe('The Task Drop task you are fetching this for. Required for required references: deliveries on that task are refused until each one was fetched this way.'),
        as: z.enum(['claude', 'claude_thread']).optional().describe('Claude only: "claude" (worker) or "claude_thread". Recorded as declared.'),
      }),
    }, async ({ id, include_base64, task_id, as }) => {
      try {
        const { data: a, error } = await supabase.from('studio_assets').select('*').eq('id', id).maybeSingle()
        if (error) throw new Error(error.message)
        if (!a) throw new Error(`No asset with id ${id}. Use list_assets.`)
        const preview = a.status === 'held' || a.status === 'rejected'
        let fetchNote: string | undefined
        if (task_id && preview) {
          fetchNote = a.status === 'held'
            ? `NOT recorded for task ${task_id}: this picture is waiting for Kody's approval, so it cannot be used for any task yet.`
            : `NOT recorded for task ${task_id}: Kody rejected this picture, so it can never be used.`
        } else if (task_id) {
          const lg = await supabase.rpc('studio_log_fetch', { p_asset_id: id, p_task_id: task_id, p_as: as ?? null })
          if (lg.error) throw new Error('Could not record this fetch for the task: ' + lg.error.message)
          fetchNote = `Fetch recorded for task ${task_id}. This shows the image reached you, not that it reached an image model; say which references you used before generating.`
        }
        const dl = await supabase.storage.from(BUCKET).download(a.path)
        if (dl.error || !dl.data) throw new Error('The stored file could not be opened: ' + (dl.error?.message ?? 'missing'))
        const bytes = new Uint8Array(await dl.data.arrayBuffer())
        const sha = await sha256Hex(bytes)
        const signed = preview ? null : await supabase.storage.from(BUCKET).createSignedUrl(a.path, 600)
        const info = {
          id: a.id, task_id: a.task_id, file_name: a.file_name, mime_type: a.mime_type, width: a.width, height: a.height,
          size_bytes: bytes.length, sha256: sha, checksum_matches: sha === a.sha256 && bytes.length === a.size_bytes,
          status: a.status, made_by: a.made_by, made_from: a.parent_id, frames: a.anim,
          approval: a.status === 'held' ? `PREVIEW ONLY. Waiting for Kody's approval. Show him this picture and this link to approve it, ask for changes or reject it: ${APPROVE(a.id)} . You cannot approve it yourself, and nobody can use it before he does.`
            : a.status === 'rejected' ? 'PREVIEW ONLY. Kody rejected this exact file. It can never be used; a fix is a new file.' : undefined,
          note: a.note, created_at: a.created_at, download_url_10min: signed?.data?.signedUrl ?? null,
          base64: !preview && include_base64 && bytes.length <= INLINE_LIMIT ? toBase64(bytes) : undefined,
          fetch: fetchNote,
        }
        const content: ({ type: 'text'; text: string } | { type: 'image'; data: string; mimeType: string })[] = [{ type: 'text', text: JSON.stringify(info, null, 2) }]
        if (bytes.length <= INLINE_LIMIT) content.push({ type: 'image', data: info.base64 ?? toBase64(bytes), mimeType: a.mime_type })
        return { content }
      } catch (e) { return fail(e) }
    })

    // Read-only identity check for Spitz.dev (Task Drop milestone 1): which app is calling, as the token proves it.
    if (who) server.registerTool('whoami', {
      title: 'Who am I connected as',
      annotations: { readOnlyHint: true },
      description: 'Shows what the server verified from your sign-in token: the account, and the OAuth client_id of the app you are calling from. Changes nothing; the check is noted in the drop log so Claude can compare apps.',
      inputSchema: z.object({}),
    }, async () => { await log({ task_id: null, stage: 'whoami', ok: true, detail: { ...who } }); return text(who) })

    // Task Drop: create_task, list_tasks, get_task, post_message (tasks.ts).
    registerTaskTools(server, supabase)

    return server
  })
}

