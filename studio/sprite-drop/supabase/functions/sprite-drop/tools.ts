// Sprite Drop tools (see index.ts for the sign-in wiring).
import { createMcpHandler, McpServer } from 'npm:@modelcontextprotocol/server@^2.4.0'
import { z } from 'npm:zod@^4.3.6'
import { assetPath, BUCKET, cleanTaskId, describeFile, dimensions, fromBase64, INLINE_LIMIT, MAX_BYTES, sniff, toBase64 } from './image.ts'

// deno-lint-ignore no-explicit-any
export type Db = { from: (t: string) => any; storage: { from: (b: string) => any } }

const text = (v: unknown) => ({ content: [{ type: 'text' as const, text: typeof v === 'string' ? v : JSON.stringify(v, null, 2) }] })
const fail = (e: unknown) => ({ isError: true, content: [{ type: 'text' as const, text: e instanceof Error ? e.message : String(e) }] })
const sha256Hex = async (b: Uint8Array) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', b as BufferSource))].map((x) => x.toString(16).padStart(2, '0')).join('')

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
    const server = new McpServer({ name: 'sprite-drop', version: '0.1.0' })

    server.registerTool('drop_asset', {
      title: 'Drop an image for Claude',
      description:
        'Save an image (PNG, JPEG, WebP or GIF, up to 10 MB) for a task so Claude can fetch the exact file later. ' +
        'In ChatGPT, pass the image as file: an image you just generated in this conversation, or one Kody uploaded. ' +
        'Otherwise pass url (an https link that downloads the image) or image_base64. ' +
        'Returns the stored file name, type, size, pixel dimensions and SHA-256 checksum.',
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
      }),
      _meta: { 'openai/fileParams': ['file'] },
    }, async ({ task_id, file, url, image_base64, file_name, note }) => {
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

        const { data: dup } = await supabase.from('studio_assets').select('id, file_name, created_at').eq('task_id', tid).eq('sha256', sha256).maybeSingle()
        if (dup) {
          await log({ task_id: tid, stage: 'duplicate', ok: true, detail: { received, sha256, assetId: dup.id } })
          return text({ saved: false, note: 'This exact file is already saved on this task.', asset: { id: dup.id, file_name: dup.file_name, sha256 } })
        }

        const up = await supabase.storage.from(BUCKET).upload(path, bytes, { contentType: kind.mime, upsert: false })
        if (up.error) throw new Stage('store', 'Saving to storage failed: ' + up.error.message)
        stored = path
        const row = {
          user_id: userId, task_id: tid, file_name: path.split('/').pop(), original_name: name,
          mime_type: kind.mime, declared_mime: file?.mime_type ?? null, size_bytes: bytes.length,
          width: dims?.width ?? null, height: dims?.height ?? null, sha256, path, source, note: note ?? null,
        }
        const ins = await supabase.from('studio_assets').insert(row).select('id, created_at').single()
        if (ins.error) throw new Stage('record', 'Saving the record failed: ' + ins.error.message)
        stored = null
        const asset = { id: ins.data.id, task_id: tid, file_name: row.file_name, mime_type: kind.mime, size_bytes: bytes.length, width: row.width, height: row.height, sha256, source, created_at: ins.data.created_at }
        await log({ task_id: tid, stage: 'saved', ok: true, detail: { received, ...http, asset } })
        return text({ saved: true, asset, tell_claude: `Asset ${asset.id} on task ${tid}: ${asset.width}x${asset.height} ${kind.mime}, ${bytes.length} bytes, sha256 ${sha256}` })
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
        let q = supabase.from('studio_assets').select('id, task_id, file_name, original_name, mime_type, declared_mime, size_bytes, width, height, sha256, source, note, created_at').order('created_at', { ascending: false }).limit(limit ?? 20)
        if (task_id) q = q.eq('task_id', task_id.trim())
        const { data, error } = await q
        if (error) throw new Error(error.message)
        let lq = supabase.from('studio_drop_log').select('created_at, task_id, stage, ok, detail').order('created_at', { ascending: false }).limit(10)
        if (task_id) lq = lq.eq('task_id', task_id.trim())
        const { data: attempts } = await lq
        return text({ assets: data ?? [], recentAttempts: attempts ?? [] })
      } catch (e) { return fail(e) }
    })

    server.registerTool('get_asset', {
      title: 'Get a dropped image',
      annotations: { readOnlyHint: true },
      description: 'Fetch one saved image by id. Re-checks the stored bytes against the saved checksum, shows the image, and gives a download link that expires in 10 minutes. include_base64 also returns the raw bytes as base64 (images up to 1 MB).',
      inputSchema: z.object({
        id: z.string().describe('Asset id from drop_asset or list_assets'),
        include_base64: z.boolean().optional(),
      }),
    }, async ({ id, include_base64 }) => {
      try {
        const { data: a, error } = await supabase.from('studio_assets').select('*').eq('id', id).maybeSingle()
        if (error) throw new Error(error.message)
        if (!a) throw new Error(`No asset with id ${id}. Use list_assets.`)
        const dl = await supabase.storage.from(BUCKET).download(a.path)
        if (dl.error || !dl.data) throw new Error('The stored file could not be opened: ' + (dl.error?.message ?? 'missing'))
        const bytes = new Uint8Array(await dl.data.arrayBuffer())
        const sha = await sha256Hex(bytes)
        const signed = await supabase.storage.from(BUCKET).createSignedUrl(a.path, 600)
        const info = {
          id: a.id, task_id: a.task_id, file_name: a.file_name, mime_type: a.mime_type, width: a.width, height: a.height,
          size_bytes: bytes.length, sha256: sha, checksum_matches: sha === a.sha256 && bytes.length === a.size_bytes,
          note: a.note, created_at: a.created_at, download_url_10min: signed.data?.signedUrl ?? null,
          base64: include_base64 && bytes.length <= INLINE_LIMIT ? toBase64(bytes) : undefined,
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

    return server
  })
}

