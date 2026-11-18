// npx deno test proof.test.ts   (pure: no network, no database)
import { assert, assertEquals } from 'jsr:@std/assert@1'
import { bbox, fromRgba, type Img, prove } from './proof.ts'

// small pictures from strings: '.' transparent, letters are colours
const C: Record<string, number[]> = { r: [220, 40, 40, 255], g: [40, 200, 60, 255], b: [40, 60, 220, 255], y: [240, 200, 40, 255], h: [220, 40, 40, 128] }
function pic(rows: string[]): Img {
  const w = rows[0].length, h = rows.length, d = new Uint8Array(w * h * 4)
  rows.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== '.') d.set(C[ch], (y * w + x) * 4) }))
  return fromRgba(w, h, d)
}
const up = (rows: string[], k: number) => rows.flatMap((r) => Array(k).fill([...r].map((c) => c.repeat(k)).join('')))
const sprite = ['.rr.', 'rggr', 'rbbr', '.yy.']

Deno.test('identical pixels, even when transparent pixels carry different colours', () => {
  const d = new Uint8Array(4 * 4 * 4); const p = pic(sprite)
  for (let i = 0; i < 16; i++) { const v = p.px[i]; d.set(v ? [v >>> 24, (v >>> 16) & 255, (v >>> 8) & 255, v & 255] : [9, 9, 9, 0], i * 4) }
  const r = prove(p, fromRgba(4, 4, d))
  assertEquals([r.kind, r.pixel_preserving], ['identical', true])
})

Deno.test('trim, pad and shift keep the visible pixels: same_content', () => {
  const padded = pic(['......', '..' + '.rr.', '..rggr', '..rbbr', '...yy.', '......'].map((r) => r.padEnd(6, '.')))
  const r = prove(pic(sprite), padded)
  assertEquals([r.kind, r.pixel_preserving], ['same_content', true])
})

Deno.test('whole-number scale down from a 4x block picture, and up', () => {
  const big = pic(up(sprite, 4))
  const down = prove(big, pic(sprite))
  assertEquals([down.kind, down.pixel_preserving, down.details.scale, down.details.direction], ['scale', true, 4, 'down'])
  const upr = prove(pic(sprite), pic(up(sprite, 2)))
  assertEquals([upr.kind, upr.details.scale, upr.details.direction], ['scale', 2, 'up'])
})

Deno.test('a scale down that would invent or lose pixels is NOT a proof', () => {
  const big = up(sprite, 4); big[5] = big[5].slice(0, 6) + 'y' + big[5].slice(7) // one stray pixel inside a block
  const r = prove(pic(big), pic(sprite))
  assertEquals([r.kind, r.pixel_preserving], ['none', false])
})

Deno.test('one changed pixel, a recolour, or a redraw is held for Kody', () => {
  assertEquals(prove(pic(sprite), pic(['.rr.', 'rggr', 'rbbr', '.yr.'])).pixel_preserving, false)
  assertEquals(prove(pic(sprite), pic(['.bb.', 'bggb', 'bbbb', '.yy.'])).pixel_preserving, false)
  assertEquals(prove(pic(sprite), pic(['.rr.', 'rggr', 'rbhr', '.yy.'])).pixel_preserving, false) // half-transparent pixel is a change
})

Deno.test('cropping that cuts visible pixels is not a trim', () => {
  assertEquals(prove(pic(sprite), pic(['.rr.', 'rggr', 'rbbr'])).pixel_preserving, false)
})

Deno.test('a frame cut out of an approved sheet is frame_of', () => {
  const sheet = pic(['.rr..gg.', 'rggrgbbg', 'rbbrgbbg', '.yy..yy.'])
  const r = prove(sheet, pic(['.gg.', 'gbbg', 'gbbg', '.yy.']), { frame_w: 4, frame_h: 4 })
  assertEquals([r.kind, r.pixel_preserving, r.details.frame], ['frame_of', true, 1])
})

Deno.test('a new animation whose first frame is the approved sprite: evidence, still held', () => {
  const anim = pic(['.rr..rr.', 'rggrryyr', 'rbbrrbbr', '.yy..yy.'])
  const r = prove(pic(sprite), anim, null, { frame_w: 4, frame_h: 4 })
  assertEquals([r.kind, r.pixel_preserving], ['none', false])
  assertEquals(r.details.frames_equal_to_parent, [0])
  assert(r.summary.includes('Frame 1 of 2 is the approved parent'))
})

Deno.test('the Ember Kiln case: a different but valid pit is not a proof of the approved one', () => {
  const approvedPit = pic(['..yy..', '.yrry.', 'rrrrrr', 'bbbbbb'])
  const round3Pit = pic(['..rr..', '.ryyr.', 'yyyyyy', 'bbbbbb'])
  assertEquals(prove(approvedPit, round3Pit).pixel_preserving, false)
})

Deno.test('bbox ignores transparent border', () => {
  assertEquals(bbox(pic(['....', '.r..', '..g.', '....'])), { x: 1, y: 1, w: 2, h: 2 })
  assertEquals(bbox(pic(['..', '..'])), null)
})
