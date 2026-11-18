// Pixel proofs for spitz.dev (M3). Given an APPROVED parent picture and a new child made from it, decide from the
// stored bytes alone whether the child keeps every pixel of the parent exactly. Only such "pixel-preserving" changes
// may be approved without Kody: re-save, trim, pad or shift, whole-number scale, and cutting one frame out of a sheet.
// Anything else (1x conversion of an illustration, recolour, redraw, new animation frames) is held for Kody.
// Pure functions on decoded pixels; decoding is the only part that touches a library.

export type Img = { w: number; h: number; px: Uint32Array } // one RGBA value per pixel; fully transparent pixels are 0
export type Frames = { frame_w: number; frame_h: number } | null | undefined
export type Proof = {
  kind: 'identical' | 'same_content' | 'scale' | 'frame_of' | 'sheet_of' | 'none'
  pixel_preserving: boolean
  summary: string
  details: Record<string, unknown>
}

/** RGBA bytes (w*h*4) to an Img. Every fully transparent pixel becomes 0 whatever colour it carries. */
export function fromRgba(w: number, h: number, rgba: Uint8Array): Img {
  const px = new Uint32Array(w * h)
  for (let i = 0; i < w * h; i++) {
    const a = rgba[i * 4 + 3]
    px[i] = a === 0 ? 0 : ((rgba[i * 4] << 24) | (rgba[i * 4 + 1] << 16) | (rgba[i * 4 + 2] << 8) | a) >>> 0
  }
  return { w, h, px }
}

type Box = { x: number; y: number; w: number; h: number }

/** Smallest rectangle holding every visible pixel inside `r` (null when nothing is visible). */
export function bbox(img: Img, r: Box = { x: 0, y: 0, w: img.w, h: img.h }): Box | null {
  let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1
  for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) {
    if (img.px[y * img.w + x] !== 0) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y }
  }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 }
}

/** a's box equals b's box scaled up by k (k = 1: equal). */
function eqScaled(a: Img, ab: Box, b: Img, bb: Box, k: number): boolean {
  if (ab.w !== bb.w * k || ab.h !== bb.h * k) return false
  for (let y = 0; y < ab.h; y++) {
    const ra = (ab.y + y) * a.w + ab.x, rb = (bb.y + Math.floor(y / k)) * b.w + bb.x
    for (let x = 0; x < ab.w; x++) if (a.px[ra + x] !== b.px[rb + Math.floor(x / k)]) return false
  }
  return true
}

/** How content `c` (box cb) relates to content `p` (box pb): same, or one is the other scaled by a whole number. */
function relate(p: Img, pb: Box, c: Img, cb: Box): { scale: number; dir: 'same' | 'down' | 'up' } | null {
  if (pb.w === cb.w && pb.h === cb.h) return eqScaled(c, cb, p, pb, 1) ? { scale: 1, dir: 'same' } : null
  if (pb.w > cb.w && pb.w % cb.w === 0 && pb.h % cb.h === 0 && pb.w / cb.w === pb.h / cb.h) {
    const k = pb.w / cb.w
    return eqScaled(p, pb, c, cb, k) ? { scale: k, dir: 'down' } : null
  }
  if (cb.w > pb.w && cb.w % pb.w === 0 && cb.h % pb.h === 0 && cb.w / pb.w === cb.h / pb.h) {
    const k = cb.w / pb.w
    return eqScaled(c, cb, p, pb, k) ? { scale: k, dir: 'up' } : null
  }
  return null
}

function cells(img: Img, f: Frames): Box[] {
  if (!f || f.frame_w <= 0 || f.frame_h <= 0 || img.w % f.frame_w || img.h % f.frame_h) return []
  const out: Box[] = []
  for (let y = 0; y < img.h; y += f.frame_h) for (let x = 0; x < img.w; x += f.frame_w) out.push({ x, y, w: f.frame_w, h: f.frame_h })
  return out
}

const none = (summary: string, details: Record<string, unknown> = {}): Proof => ({ kind: 'none', pixel_preserving: false, summary, details })
const how = (r: { scale: number; dir: string }) => r.dir === 'same' ? 'same pixels' : `same pixels scaled ${r.dir === 'down' ? 'down' : 'up'} exactly ${r.scale}x`

/** The proof. `parentFrames`/`childFrames` are the sheets' frame sizes when they are animations. */
export function prove(parent: Img, child: Img, parentFrames?: Frames, childFrames?: Frames): Proof {
  if (parent.w === child.w && parent.h === child.h && parent.px.every((v, i) => v === child.px[i]))
    return { kind: 'identical', pixel_preserving: true, summary: 'Every pixel is identical to the approved parent (only the file bytes differ).', details: {} }
  const pb = bbox(parent), cb = bbox(child)
  if (!pb || !cb) return none('One of the pictures is fully transparent.')

  const r = relate(parent, pb, child, cb)
  if (r) {
    const moved = { parent_box: pb, child_box: cb, canvas: { parent: [parent.w, parent.h], child: [child.w, child.h] } }
    if (r.dir === 'same') return { kind: 'same_content', pixel_preserving: true, summary: 'Same visible pixels as the approved parent; only the empty border changed (trim, pad or shift).', details: moved }
    return { kind: 'scale', pixel_preserving: true, summary: `The approved parent's ${how(r)} (nearest neighbour, nothing invented or lost).`, details: { ...moved, scale: r.scale, direction: r.dir } }
  }

  // one frame cut out of an approved sheet
  for (const [i, cell] of cells(parent, parentFrames).entries()) {
    const fb = bbox(parent, cell); if (!fb) continue
    const rf = relate(parent, fb, child, cb)
    if (rf) return { kind: 'frame_of', pixel_preserving: true, summary: `Frame ${i + 1} of the approved sheet: ${how(rf)}.`, details: { frame: i, scale: rf.scale, direction: rf.dir } }
  }

  // a new sheet: which of its frames are the approved parent exactly (evidence only, unless every frame is)
  const cc = cells(child, childFrames)
  if (cc.length) {
    const match: number[] = []
    cc.forEach((cell, i) => { const fb = bbox(child, cell); if (fb && relate(parent, pb, child, fb)?.dir === 'same') match.push(i) })
    const all = match.length === cc.length
    return {
      kind: all ? 'sheet_of' : 'none', pixel_preserving: all,
      summary: all ? 'Every frame is the approved parent, pixel for pixel.'
        : match.length ? `Frame${match.length > 1 ? 's' : ''} ${match.map((i) => i + 1).join(', ')} of ${cc.length} ${match.length > 1 ? 'are' : 'is'} the approved parent pixel for pixel. The other frames are new, so Kody approves this sheet.`
        : `None of the ${cc.length} frames is the approved parent pixel for pixel. Kody approves this sheet.`,
      details: { frames: cc.length, frames_equal_to_parent: match },
    }
  }
  return none('Not a pixel-for-pixel copy, trim, shift, whole-number scale or frame of the approved parent, so Kody approves it.')
}

/** Decode PNG bytes to an Img with the given decoder (fast-png's decode). Returns a reason string when it can't. */
// deno-lint-ignore no-explicit-any
export function decodePng(bytes: Uint8Array, decode: (b: Uint8Array) => any): Img | string {
  let p
  try { p = decode(bytes) } catch (e) { return 'could not decode PNG: ' + (e instanceof Error ? e.message : String(e)) }
  const { width: w, height: h, channels: ch, depth } = p
  if (depth !== 8) return `PNG bit depth ${depth} is not supported for proofs`
  const src = p.data as Uint8Array, out = new Uint8Array(w * h * 4)
  for (let i = 0; i < w * h; i++) {
    if (p.palette) {
      const e = p.palette[src[i]] ?? [0, 0, 0, 0]
      out.set([e[0], e[1], e[2], e.length > 3 ? e[3] : 255], i * 4)
    } else if (ch === 4) out.set(src.subarray(i * 4, i * 4 + 4), i * 4)
    else if (ch === 3) out.set([src[i * 3], src[i * 3 + 1], src[i * 3 + 2], 255], i * 4)
    else if (ch === 2) out.set([src[i * 2], src[i * 2], src[i * 2], src[i * 2 + 1]], i * 4)
    else if (ch === 1) out.set([src[i], src[i], src[i], 255], i * 4)
    else return `PNG with ${ch} channels is not supported for proofs`
  }
  return fromRgba(w, h, out)
}
