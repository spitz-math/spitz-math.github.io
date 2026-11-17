// Pure helpers for Sprite Drop. No Deno or Supabase imports, so they can be
// tested with plain Node: node --experimental-strip-types --test image.test.ts

export const MAX_BYTES = 10 * 1024 * 1024 // 10 MB per image
export const INLINE_LIMIT = 1024 * 1024 // images up to 1 MB come back inline from get_asset
export const BUCKET = 'studio-assets'

export type Kind = { mime: string; ext: string }

/** Real file type from the first bytes. Only images are accepted. */
export function sniff(b: Uint8Array): Kind | null {
  const at = (i: number, ...v: number[]) => v.every((x, k) => b[i + k] === x)
  if (b.length >= 8 && at(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return { mime: 'image/png', ext: 'png' }
  if (b.length >= 3 && at(0, 0xff, 0xd8, 0xff)) return { mime: 'image/jpeg', ext: 'jpg' }
  if (b.length >= 12 && at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50)) return { mime: 'image/webp', ext: 'webp' }
  if (b.length >= 6 && at(0, 0x47, 0x49, 0x46, 0x38)) return { mime: 'image/gif', ext: 'gif' }
  return null
}

/** Pixel width and height read from the file header, or null when it can't be read. */
export function dimensions(b: Uint8Array): { width: number; height: number } | null {
  const k = sniff(b)
  if (!k) return null
  const u16be = (i: number) => (b[i] << 8) | b[i + 1]
  const u16le = (i: number) => b[i] | (b[i + 1] << 8)
  const u32be = (i: number) => ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0
  if (k.mime === 'image/png') {
    if (b.length < 24) return null
    return { width: u32be(16), height: u32be(20) }
  }
  if (k.mime === 'image/gif') {
    if (b.length < 10) return null
    return { width: u16le(6), height: u16le(8) }
  }
  if (k.mime === 'image/webp') {
    if (b.length < 30) return null
    const chunk = String.fromCharCode(b[12], b[13], b[14], b[15])
    if (chunk === 'VP8 ') return { width: u16le(26) & 0x3fff, height: u16le(28) & 0x3fff }
    if (chunk === 'VP8L') {
      const bits = b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24)
      return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 }
    }
    if (chunk === 'VP8X') {
      return { width: 1 + (b[24] | (b[25] << 8) | (b[26] << 16)), height: 1 + (b[27] | (b[28] << 8) | (b[29] << 16)) }
    }
    return null
  }
  // JPEG: walk the markers to the first start-of-frame.
  let i = 2
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) { i++; continue }
    const m = b[i + 1]
    if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { i += 2; continue }
    const len = u16be(i + 2)
    if ((m >= 0xc0 && m <= 0xcf) && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
      return { width: u16be(i + 7), height: u16be(i + 5) }
    }
    i += 2 + len
  }
  return null
}

/** Task ids look like "rook-and-ruin#12" or "second-wind". Keeps storage paths tidy. */
export function cleanTaskId(id: string): string {
  const t = id.trim()
  if (!t || t.length > 80) throw new Error('task_id must be 1-80 characters, e.g. "rook-and-ruin#12" or "second-wind".')
  return t
}

/** Storage path under the owner's folder: <user>/<task>/<sha8>-<name>.<ext> */
export function assetPath(userId: string, taskId: string, sha256: string, fileName: string, ext: string): string {
  const folder = taskId.replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'task'
  const base = fileName.replace(/\.[A-Za-z0-9]{1,5}$/, '').replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^[-.]+/, '').slice(0, 60) || 'asset'
  return `${userId}/${folder}/${sha256.slice(0, 8)}-${base}.${ext}`
}

/** What arrived from the caller, for the drop log. Never stores the full download link. */
export function describeFile(file: unknown): Record<string, unknown> {
  if (file == null) return { present: false }
  if (typeof file !== 'object') return { present: true, type: typeof file }
  const f = file as Record<string, unknown>
  let host: string | null = null
  try { host = typeof f.download_url === 'string' ? new URL(f.download_url).host : null } catch { host = 'not-a-url' }
  return {
    present: true,
    keys: Object.keys(f).sort(),
    file_id: typeof f.file_id === 'string' ? f.file_id.slice(0, 60) : null,
    mime_type: f.mime_type ?? null,
    file_name: f.file_name ?? null,
    download_host: host,
  }
}

export function toBase64(b: Uint8Array): string {
  let s = ''
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000))
  return btoa(s)
}

export function fromBase64(s: string): Uint8Array {
  const clean = s.replace(/^data:[^,]*,/, '').replace(/\s+/g, '')
  const bin = atob(clean)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}
