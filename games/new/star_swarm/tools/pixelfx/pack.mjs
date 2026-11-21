// Pack chosen PixelFX effects into crisp colour strips + soft light strips for Star Swarm. Writes pxf_data.js.
import { loadEffect, renderFrames } from "../pixelfx/tools/lib/fxlib.mjs";
import { encodePNG } from "../pixelfx/tools/lib/png.mjs";
import { writeFileSync } from "node:fs";
const P = {
  amber: ["#2a1300","#5c2a00","#a35200","#e08a10","#ffc23d","#ffe58a","#ffffff"],
  red:   ["#2a0510","#5c0a22","#a3143a","#e0305a","#ff6d8a","#ffb8c8","#ffffff"],
  gold:  ["#2a1a00","#5c3a00","#a36a00","#e0a010","#ffc82e","#fff09a","#ffffff"],
  green: ["#03200f","#07441f","#0f7a38","#22b85a","#4ade80","#b8ffd0","#ffffff"],
  violet:["#1a0730","#3a0f66","#6a1fb0","#9d4ee0","#c77dff","#e8c8ff","#ffffff"],
  orange:["#2a0a00","#5c1a00","#a33a00","#e06a10","#ff9a2e","#ffd27a","#ffffff"],
  white: ["#1a2033","#3a4a70","#7a90c0","#b8d0ff","#e0ecff","#ffffff","#ffffff"],
  cyan:  ["#04161e","#0a3344","#106a80","#1aa8c0","#3ee0f0","#b0f8ff","#ffffff"],
};
const PLASMA = "explosions/plasma-explosion";
const JOBS = [
  ["k_bee", PLASMA, { palette: P.amber, accent: P.amber.slice(2) }, 3, [0, 40]],
  ["k_fly", PLASMA, { palette: P.red, accent: P.red.slice(2) }, 3, [0, 40]],
  ["k_gold", PLASMA, { palette: P.gold, accent: P.gold.slice(2) }, 2, [0, 42]],
  ["k_cmd", PLASMA, { palette: P.green, accent: P.green.slice(2) }, 2, [0, 42]],
  ["k_bomb", PLASMA, { palette: P.violet, accent: P.violet.slice(2) }, 2, [0, 42]],
  ["nova", PLASMA, { palette: P.orange, accent: P.gold.slice(2), seed: 9 }, 2, [0, 42]],
  ["spark", "impacts/hit-spark", { palette: P.white, aim: -1.2 }, 2, [0, 15]],
  ["hurt", "impacts/crit-hit", { palette: P.red, aim: -1.4 }, 2, [0, 22]],
  ["cap_N", "pickups/collect-burst", { palette: P.orange }, 1, [0, 33]],
  ["cap_O", "pickups/collect-burst", { palette: P.amber }, 1, [0, 33]],
  ["cap_S", "pickups/collect-burst", { palette: P.green }, 1, [0, 33]],
  ["warp", "scifi/warp-in", { palette: P.cyan }, 2, [3, 40]],
  ["fw_gold", "explosions/firework-burst", { palette: P.gold }, 2, [0, 90], 2],
  ["fw_cyan", "explosions/firework-burst", { palette: P.cyan }, 2, [0, 90], 2],
];
const lum = (r, g, b) => r * 0.3 + g * 0.59 + b * 0.11;
const out = {}; let bytes = 0;
for (const [key, id, options, down, [f0, f1], step = 1] of JOBS) {
  const fx = await loadEffect(id);
  const r = renderFrames(fx, { bg: "none", fps: 30, options });
  const fr = r.frames.slice(f0, f1).filter((_, i) => i % step === 0);
  // shared bbox over colour + light
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (const f of fr) for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) { const j = y * r.w + x;
    if ((f.raw[j] >>> 24) > 8 || (f.light[j] & 0xffffff)) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
  x0 -= down * 2; y0 -= down * 2; x1 += down * 2; y1 += down * 2;   // room for bloom
  const w = Math.ceil((x1 - x0 + 1) / down), h = Math.ceil((y1 - y0 + 1) / down), n = fr.length, cols = Math.min(n, Math.max(1, Math.floor(4096 / w)));
  const rows = Math.ceil(n / cols), SW = cols * w, SH = rows * h;
  const lw = Math.ceil(w / 2), lh = Math.ceil(h / 2), LW = cols * lw, LH = rows * lh;
  const C = new Uint8ClampedArray(SW * SH * 4), L = new Uint8ClampedArray(LW * LH * 4);
  fr.forEach((f, k) => { const ox = (k % cols) * w, oy = Math.floor(k / cols) * h;
    const lt = new Float32Array(w * h * 3);
    for (let by = 0; by < h; by++) for (let bx = 0; bx < w; bx++) {
      let best = -1, bc = 0, lr = 0, lg = 0, lb = 0, cnt = 0;
      for (let dy = 0; dy < down; dy++) for (let dx = 0; dx < down; dx++) {
        const X = x0 + bx * down + dx, Y = y0 + by * down + dy; if (X < 0 || Y < 0 || X >= r.w || Y >= r.h) continue;
        const j = Y * r.w + X, c = f.raw[j], a = c >>> 24; cnt++;
        const s = a * (1 + lum(c & 255, (c >>> 8) & 255, (c >>> 16) & 255) / 255);
        if (a > 8 && s > best) { best = s; bc = c; }
        const l = f.light[j]; lr += l & 255; lg += (l >>> 8) & 255; lb += (l >>> 16) & 255;
      }
      const d = ((oy + by) * SW + ox + bx) * 4;
      if (best >= 0) { C[d] = bc & 255; C[d + 1] = (bc >>> 8) & 255; C[d + 2] = (bc >>> 16) & 255; C[d + 3] = bc >>> 24; }
      if (cnt) { const q = (by * w + bx) * 3; lt[q] = lr / cnt; lt[q + 1] = lg / cnt; lt[q + 2] = lb / cnt; }
    }
    // soft bloom: two box-blur passes (radius 1) on the light, then add back a bit of the sharp core
    let a = lt; for (let p = 0; p < 2; p++) { const b = new Float32Array(a.length);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let ch = 0; ch < 3; ch++) { let s = 0, c2 = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= w || Y >= h) continue; s += a[(Y * w + X) * 3 + ch]; c2++; }
        b[(y * w + x) * 3 + ch] = s / c2; }
      a = b; }
    const lox = (k % cols) * lw, loy = Math.floor(k / cols) * lh;
    for (let y = 0; y < lh; y++) for (let x = 0; x < lw; x++) { const v = [0, 0, 0]; let c3 = 0;
      for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) { const X = x * 2 + dx, Y = y * 2 + dy; if (X >= w || Y >= h) continue; const q = (Y * w + X) * 3; c3++;
        for (let ch = 0; ch < 3; ch++) v[ch] += a[q + ch] * 1.3 + lt[q + ch] * 0.4; }
      const d = ((loy + y) * LW + lox + x) * 4; for (let ch = 0; ch < 3; ch++) L[d + ch] = Math.min(255, v[ch] / c3); L[d + 3] = 255; }
  });
  const pc = encodePNG(SW, SH, C), pl = encodePNG(LW, LH, L); bytes += pc.length + pl.length;
  writeFileSync(`strips/${key}.png`, pc); writeFileSync(`strips/${key}_L.png`, pl);
  const [OX, OY] = fx.meta.origin;
  out[key] = { w, h, lw, lh, cols, n, ms: Math.round(1000 * step / 30), ax: (OX - x0) / down / w, ay: (OY - y0) / down / h,
    c: "data:image/png;base64," + Buffer.from(pc).toString("base64"), l: "data:image/png;base64," + Buffer.from(pl).toString("base64") };
  console.log(key, w + "x" + h, n, "frames", ((pc.length + pl.length) / 1024).toFixed(0) + "KB");
}
writeFileSync("pxf_data.js", "/* PixelFX (patch-gg/pixelfx, MIT) effect strips, recoloured for Star Swarm. Built by pack.mjs. */\nvar PXF_DATA=" + JSON.stringify(out) + ";\n");
console.log("total", (bytes / 1024).toFixed(0), "KB");
