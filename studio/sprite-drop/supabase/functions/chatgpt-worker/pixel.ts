// Turns a big AI-generated picture into clean pixel art:
// every art pixel becomes one solid square, alpha is only 0 or 255, and the palette is small.
// Pure functions on RGBA arrays, so they can be tested without any image library.

export type Rgba = { w: number; h: number; data: Uint8Array } // data.length = w * h * 4

/** Box-sample `src` down to artW x artH. A cell is transparent when under half of it is opaque. */
export function toGrid(src: Rgba, artW: number, artH: number): Rgba {
  const out = new Uint8Array(artW * artH * 4)
  for (let y = 0; y < artH; y++) {
    const y0 = Math.floor((y * src.h) / artH), y1 = Math.max(y0 + 1, Math.floor(((y + 1) * src.h) / artH))
    for (let x = 0; x < artW; x++) {
      const x0 = Math.floor((x * src.w) / artW), x1 = Math.max(x0 + 1, Math.floor(((x + 1) * src.w) / artW))
      let n = 0, opaque = 0, r = 0, g = 0, b = 0
      // sample the inner part of the block so soft edges between blocks don't smear colours
      const ix0 = x0 + Math.floor((x1 - x0) / 4), ix1 = x1 - Math.floor((x1 - x0) / 4)
      const iy0 = y0 + Math.floor((y1 - y0) / 4), iy1 = y1 - Math.floor((y1 - y0) / 4)
      for (let yy = iy0; yy < Math.max(iy1, iy0 + 1); yy++) for (let xx = ix0; xx < Math.max(ix1, ix0 + 1); xx++) {
        const i = (yy * src.w + xx) * 4; n++
        if (src.data[i + 3] >= 128) { opaque++; r += src.data[i]; g += src.data[i + 1]; b += src.data[i + 2] }
      }
      const o = (y * artW + x) * 4
      if (opaque * 2 >= n && opaque > 0) { out[o] = r / opaque; out[o + 1] = g / opaque; out[o + 2] = b / opaque; out[o + 3] = 255 }
    }
  }
  return { w: artW, h: artH, data: out }
}

/** Reduce the opaque colours to at most k (simple k-means, deterministic start). */
export function limitPalette(img: Rgba, k: number): Rgba {
  const px: number[][] = []
  for (let i = 0; i < img.data.length; i += 4) if (img.data[i + 3] === 255) px.push([img.data[i], img.data[i + 1], img.data[i + 2]])
  if (px.length === 0) return img
  const uniq = [...new Map(px.map(p => [p.join(','), p])).values()]
  if (uniq.length <= k) return img
  // start from colours spread across brightness
  const sorted = [...uniq].sort((a, b) => (a[0] * 3 + a[1] * 6 + a[2]) - (b[0] * 3 + b[1] * 6 + b[2]))
  let cent = Array.from({ length: k }, (_, i) => sorted[Math.floor(((i + 0.5) * sorted.length) / k)].slice())
  const near = (p: number[]) => { let best = 0, bd = Infinity; cent.forEach((c, j) => { const d = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2; if (d < bd) { bd = d; best = j } }); return best }
  for (let it = 0; it < 10; it++) {
    const sum = cent.map(() => [0, 0, 0, 0])
    for (const p of px) { const j = near(p); sum[j][0] += p[0]; sum[j][1] += p[1]; sum[j][2] += p[2]; sum[j][3]++ }
    cent = cent.map((c, j) => sum[j][3] ? [sum[j][0] / sum[j][3], sum[j][1] / sum[j][3], sum[j][2] / sum[j][3]] : c)
  }
  cent = cent.map(c => c.map(Math.round))
  const out = new Uint8Array(img.data)
  for (let i = 0; i < out.length; i += 4) if (out[i + 3] === 255) { const c = cent[near([out[i], out[i + 1], out[i + 2]])]; out[i] = c[0]; out[i + 1] = c[1]; out[i + 2] = c[2] }
  return { w: img.w, h: img.h, data: out }
}

/** Nearest-neighbour enlarge: each art pixel becomes an s x s block. */
export function enlarge(img: Rgba, s: number): Rgba {
  const W = img.w * s, H = img.h * s, out = new Uint8Array(W * H * 4)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (Math.floor(y / s) * img.w + Math.floor(x / s)) * 4, o = (y * W + x) * 4
    out[o] = img.data[i]; out[o + 1] = img.data[i + 1]; out[o + 2] = img.data[i + 2]; out[o + 3] = img.data[i + 3]
  }
  return { w: W, h: H, data: out }
}

/** Checks the result the same way Claude does before wiring art in. */
export function verifyGrid(img: Rgba, s: number): { ok: boolean; colours: number; reason?: string } {
  const cols = new Set<string>()
  for (let y = 0; y < img.h; y += s) for (let x = 0; x < img.w; x += s) {
    const i0 = (y * img.w + x) * 4
    for (let yy = y; yy < y + s; yy++) for (let xx = x; xx < x + s; xx++) {
      const i = (yy * img.w + xx) * 4
      for (let c = 0; c < 4; c++) if (img.data[i + c] !== img.data[i0 + c]) return { ok: false, colours: 0, reason: `block at ${x},${y} is not solid` }
    }
    const a = img.data[i0 + 3]
    if (a !== 0 && a !== 255) return { ok: false, colours: 0, reason: 'semi-transparent pixel' }
    if (a === 255) cols.add(`${img.data[i0]},${img.data[i0 + 1]},${img.data[i0 + 2]}`)
  }
  return { ok: true, colours: cols.size }
}

export function pixelize(src: Rgba, artW: number, artH: number, scale: number, maxColours: number): Rgba {
  return enlarge(limitPalette(toGrid(src, artW, artH), maxColours), scale)
}
