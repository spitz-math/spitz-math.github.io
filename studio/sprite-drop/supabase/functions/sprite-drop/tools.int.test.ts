// End-to-end check of the three tools over MCP, with an in-memory stand-in for Supabase.
// npx deno test --allow-net --allow-env tools.int.test.ts
import { assert, assertEquals } from 'jsr:@std/assert@1'
import { handlerFor } from './tools.ts'
import { fromBase64 } from './image.ts'

const PNG = fromBase64(Deno.readTextFileSync(new URL('./image.test.ts', import.meta.url)).match(/png: '([^']+)'/)![1])

// ---- tiny fake of the supabase-js calls tools.ts makes ----
function fakeDb() {
  const tables: Record<string, Record<string, unknown>[]> = { studio_assets: [], studio_drop_log: [] }
  const files = new Map<string, { bytes: Uint8Array; type: string }>()
  let n = 0
  const query = (t: string) => {
    let rows = tables[t]
    const filters: [string, unknown][] = []
    let lim = 1e9, desc = false, inserted: Record<string, unknown> | null = null
    const run = () => {
      if (inserted) return [inserted]
      let r = rows.filter((x) => filters.every(([k, v]) => x[k] === v))
      if (desc) r = [...r].reverse()
      return r.slice(0, lim)
    }
    const q: Record<string, unknown> = {
      select: () => q, eq: (k: string, v: unknown) => (filters.push([k, v]), q), order: (_: string, o: { ascending: boolean }) => (desc = !o.ascending, q),
      limit: (l: number) => (lim = l, q),
      insert: (row: Record<string, unknown>) => { inserted = { id: crypto.randomUUID(), created_at: new Date(++n * 1000).toISOString(), ...row, ...(t === 'studio_assets' ? { status: 'held' } : {}) }; rows.push(inserted); return q },
      maybeSingle: () => Promise.resolve({ data: run()[0] ?? null, error: null }),
      single: () => Promise.resolve({ data: run()[0], error: null }),
      then: (res: (v: unknown) => unknown) => res({ data: run(), error: null }),
    }
    return q
  }
  const storage = () => ({
    upload: (p: string, b: Uint8Array, o: { contentType: string }) => { if (files.has(p)) return Promise.resolve({ error: { message: 'exists' } }); files.set(p, { bytes: b, type: o.contentType }); return Promise.resolve({ error: null }) },
    download: (p: string) => Promise.resolve(files.has(p) ? { data: new Blob([files.get(p)!.bytes as BlobPart]), error: null } : { data: null, error: { message: 'missing' } }),
    createSignedUrl: (p: string, s: number) => Promise.resolve({ data: { signedUrl: `https://signed.example/${p}?t=${s}` }, error: null }),
    remove: (ps: string[]) => (ps.forEach((p) => files.delete(p)), Promise.resolve({ error: null })),
  })
  return { db: { from: query, storage: { from: storage }, rpc: () => Promise.resolve({ data: null, error: { message: 'no rpc in this test' } }) }, tables, files }
}

// ChatGPT's file links, served by a fake fetch.
const realFetch = globalThis.fetch
globalThis.fetch = ((input: Request | URL | string, init?: RequestInit) => {
  const u = String(input instanceof Request ? input.url : input)
  if (u.startsWith('https://files.oaiusercontent.test/ok')) return Promise.resolve(new Response(PNG as BodyInit, { headers: { 'content-type': 'image/png' } }))
  if (u.startsWith('https://files.oaiusercontent.test/gone')) return Promise.resolve(new Response('expired', { status: 403 }))
  if (u.startsWith('https://files.oaiusercontent.test/html')) return Promise.resolve(new Response('<html>login</html>', { headers: { 'content-type': 'text/html' } }))
  return realFetch(input, init)
}) as typeof fetch

async function call(h: { fetch: (r: Request) => Promise<Response> }, name: string, args: Record<string, unknown>) {
  const headers = { 'content-type': 'application/json', accept: 'application/json, text/event-stream', 'mcp-protocol-version': '2025-06-18' }
  const res = await h.fetch(new Request('http://x/sprite-drop', { method: 'POST', headers, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } }) }))
  const body = await res.text()
  const json = body.startsWith('{') ? JSON.parse(body) : JSON.parse(body.split('\n').find((l) => l.startsWith('data:'))!.slice(5))
  if (json.error) throw new Error(JSON.stringify(json.error))
  return json.result as { isError?: boolean; content: { type: string; text?: string; data?: string; mimeType?: string }[] }
}

Deno.test('ChatGPT file -> stored bytes -> Claude gets the same bytes back', async () => {
  const { db, tables, files } = fakeDb()
  const h = handlerFor(db, 'user-1')
  const file = { download_url: 'https://files.oaiusercontent.test/ok?sig=abc', file_id: 'file_123', mime_type: 'image/png', file_name: 'image.png' }
  const r = await call(h, 'drop_asset', { task_id: 'rook-and-ruin/second-wind', file, file_name: 'second_wind_64x32.png', note: 'test' })
  assert(!r.isError, r.content[0].text)
  const out = JSON.parse(r.content[0].text!)
  assertEquals(out.saved, true)
  assertEquals([out.asset.width, out.asset.height, out.asset.mime_type, out.asset.size_bytes], [64, 32, 'image/png', PNG.length])
  assertEquals(files.size, 1)
  assert([...files.keys()][0].startsWith('user-1/rook-and-ruin-second-wind/'))
  assertEquals(tables.studio_drop_log.at(-1)!.stage, 'saved')
  assert(!JSON.stringify(tables.studio_drop_log).includes('sig=abc'), 'log must not keep the link')

  // same file again is not stored twice
  const again = JSON.parse((await call(h, 'drop_asset', { task_id: 'rook-and-ruin/second-wind', file })).content[0].text!)
  assertEquals(again.saved, false)
  assertEquals(files.size, 1)

  const list = JSON.parse((await call(h, 'list_assets', {})).content[0].text!)
  assertEquals(list.assets.length, 1)

  // held until Kody approves: the stored file is shown as a preview, but no bytes, no link, no fetch for a task
  assertEquals(out.asset.status, 'held')
  assertEquals(out.approve_url, `https://dev.spitzmath.com/approve/?id=${out.asset.id}`)
  const p = await call(h, 'get_asset', { id: out.asset.id, include_base64: true, task_id: 'task-9' })
  const pinfo = JSON.parse(p.content[0].text!)
  assertEquals(pinfo.status, 'held')
  assertEquals(pinfo.base64, undefined)
  assertEquals(pinfo.download_url_10min, null)
  assert(pinfo.approval.startsWith('PREVIEW ONLY'), pinfo.approval)
  assert(pinfo.fetch.startsWith('NOT recorded'), pinfo.fetch)
  assertEquals(pinfo.sha256, out.asset.sha256)
  assertEquals(p.content[1].type, 'image', 'the preview is the stored file itself')
  assertEquals(fromBase64(p.content[1].data!), PNG)

  // after Kody approves (the database does that, from his own sign-in) the bytes are available
  tables.studio_assets[0].status = 'approved'
  const g = await call(h, 'get_asset', { id: out.asset.id, include_base64: true })
  const info = JSON.parse(g.content[0].text!)
  assertEquals(info.checksum_matches, true)
  assertEquals(info.sha256, out.asset.sha256)
  assertEquals(fromBase64(info.base64), PNG)
  assertEquals(g.content[1].type, 'image')
  assertEquals(g.content[1].mimeType, 'image/png')
})

Deno.test('failures are logged with the step that broke', async () => {
  const { db, tables, files } = fakeDb()
  const h = handlerFor(db, 'user-1')
  const cases: [Record<string, unknown>, string][] = [
    [{}, 'input'],
    [{ file: { download_url: 'https://files.oaiusercontent.test/gone', file_id: 'f' } }, 'download'],
    [{ file: { download_url: 'https://files.oaiusercontent.test/html', file_id: 'f' } }, 'check'],
    [{ image_base64: '!!!' }, 'decode'],
  ]
  for (const [args, stage] of cases) {
    const r = await call(h, 'drop_asset', { task_id: 't1', ...args })
    assert(r.isError)
    assert(r.content[0].text!.startsWith(`[${stage}]`), r.content[0].text)
    assertEquals(tables.studio_drop_log.at(-1)!.stage, stage)
  }
  assertEquals(files.size, 0)
  // base64 path works too
  const b64 = btoa(String.fromCharCode(...PNG))
  const ok = JSON.parse((await call(h, 'drop_asset', { task_id: 't1', image_base64: b64 })).content[0].text!)
  assertEquals(ok.asset.source, 'base64')
})

Deno.test('M3: a child made from an approved parent gets a pixel proof; only a pixel-preserving one is approved', async () => {
  const { encode } = await import('npm:fast-png@6.3.0')
  const png = (w: number, h: number, f: (x: number, y: number) => number[]) => {
    const d = new Uint8Array(w * h * 4); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) d.set(f(x, y), (y * w + x) * 4)
    return encode({ width: w, height: h, data: d, channels: 4, depth: 8 })
  }
  const art = (x: number, y: number) => (x + y) % 3 === 0 ? [200, 40, 40, 255] : x > 1 ? [40, 200, 60, 255] : [0, 0, 0, 0]
  const parent = png(4, 4, art), twice = png(8, 8, (x, y) => art(x >> 1, y >> 1)), redrawn = png(4, 4, (x, y) => art(y, x))
  const f = fakeDb(), calls: Record<string, unknown>[] = []
  const recordProof = (a: Record<string, unknown>) => { calls.push(a); return Promise.resolve({ data: { status: a.p_pixel_preserving ? 'approved' : 'held', auto_approved: a.p_pixel_preserving }, error: null }) }
  const h = handlerFor(f.db as never, 'u', undefined, { recordProof })
  const b64 = (b: Uint8Array) => btoa(String.fromCharCode(...b))
  const p = JSON.parse((await call(h, 'drop_asset', { task_id: 't', image_base64: b64(parent), file_name: 'p.png' })).content[0].text!)
  f.tables.studio_assets.find((x) => x.id === p.asset.id)!.status = 'approved'   // Kody approved it (the database's job)

  const up = JSON.parse((await call(h, 'drop_asset', { task_id: 't', image_base64: b64(twice), file_name: 'p2x.png', made_from: p.asset.id })).content[0].text!)
  assertEquals([up.proof.kind, up.proof.pixel_preserving, up.asset.status], ['scale', true, 'approved'])
  assert(up.next.startsWith('APPROVED by pixel proof'))
  assertEquals([calls[0].p_kind, calls[0].p_pixel_preserving, calls[0].p_parent_sha256], ['scale', true, p.asset.sha256])

  const re = JSON.parse((await call(h, 'drop_asset', { task_id: 't', image_base64: b64(redrawn), file_name: 'redraw.png', made_from: p.asset.id, frames: '{"frame_w":4,"frame_h":4,"frame_ms":120}' })).content[0].text!)
  assertEquals([re.proof.kind, re.proof.pixel_preserving, re.asset.status], ['none', false, 'held'])
  assert(re.approve_url.includes(re.asset.id), 'a held child gets the approve link')
  assertEquals(f.tables.studio_assets.find((x) => x.id === re.asset.id)!.anim, { frame_w: 4, frame_h: 4, frame_ms: 120 }, 'frames sent as a JSON string are accepted')
})
