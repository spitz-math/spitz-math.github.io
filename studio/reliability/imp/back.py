"""Ember Imp back view: shrink Kody's approved big back sheet (257441f1) to the game sheets.
Scale: the back idle is made the same height as the approved front idle (48 px). Each frame is anchored on the
row's bottom line and on the centre of its head (flame + horns), which is symmetric, so frames do not slide.
Out: impb.png (1 row x 4: idle, cast, vanish, hurt; 52x62, feet 26,60) and impw.png with row 3 (back hover)
replaced; rows 1-2 of impw are the earlier front/side pixels Kody said were fine.
python3 back.py back.png impw_old.png outdir"""
import sys, hashlib, numpy as np
from PIL import Image
src, impw_old, out = sys.argv[1:4]
assert hashlib.sha256(open(src, 'rb').read()).hexdigest().startswith('d4a3d1f2c4cf')
a = np.array(Image.open(src).convert('RGB')).astype(int); m = a.max(2) > 22
CW, CH = a.shape[1] / 4, a.shape[0] / 2
FRONT_H = 48
def cell(r, c): return int(r * CH), int((r + 1) * CH), int(c * CW), int((c + 1) * CW)
box = {}
for r in range(2):
    for c in range(4):
        y0, y1, x0, x1 = cell(r, c); ys, xs = np.where(m[y0:y1, x0:x1]); box[r, c] = (ys.min() + y0, ys.max() + y0, xs, ys, x0, y0)
S = (box[1, 0][1] - box[1, 0][0] + 1) / FRONT_H
rng = np.random.default_rng(1); P = a[m]; smp = P[rng.choice(len(P), 50000, replace=False)].astype(float)
K = 24; cen = smp[rng.choice(len(smp), K, replace=False)]
for _ in range(25):
    lab = ((smp[:, None] - cen[None]) ** 2).sum(2).argmin(1)
    cen = np.array([smp[lab == k].mean(0) if (lab == k).any() else cen[k] for k in range(K)])
pal = np.round(cen).astype(np.uint8)
idx = np.full(m.shape, 255, int)
for y0 in range(0, a.shape[0], 64):
    d = ((a[y0:y0+64, :, None, :].astype(float) - cen[None, None]) ** 2).sum(3); idx[y0:y0+64] = np.where(m[y0:y0+64], d.argmin(2), 255)
def frame(r, c, fw, fh, px, py, bot, cx):
    o = np.zeros((fh, fw, 4), np.uint8); y0c, y1c, x0c, x1c = cell(r, c)
    for oy in range(fh):
        sy = bot + 1 - (py + 1 - oy) * S
        for ox in range(fw):
            sx = cx + (ox - px - 0.5) * S; g = S * 0.2
            ya, yb = max(int(round(sy + g)), y0c), min(int(round(sy + S - g)), y1c); xa, xb = max(int(round(sx + g)), x0c), min(int(round(sx + S - g)), x1c)
            if yb <= ya or xb <= xa: continue
            blk = idx[ya:yb, xa:xb].ravel(); v, n = np.unique(blk, return_counts=True); fv, fn = v[v != 255], n[v != 255]
            if fn.sum() >= 0.45 * blk.size: o[oy, ox, :3] = pal[fv[fn.argmax()]]; o[oy, ox, 3] = 255
    return o
def head_cx(r, c):
    top, bot, xs, ys, x0, y0 = box[r, c]; sel = ys < (bot - top) * 0.45 + (top - y0); return x0 + xs[sel].mean()
rows = {}
for r in range(2):
    bot = int(np.median([box[r, c][1] for c in range(4)]))
    rel = [head_cx(r, c) - cell(r, c)[2] for c in range(4)]; med = float(np.median(rel))   # head centre inside its cell
    rows[r] = (bot, [cell(r, c)[2] + (v if abs(v - med) < 0.06 * CW else med) for c, v in enumerate(rel)])
# impb: 4 x (52x62), feet 26,60
impb = np.concatenate([frame(1, c, 52, 62, 26, 60, rows[1][0], rows[1][1][c]) for c in range(4)], 1)
Image.fromarray(impb).save(out + '/impb.png', optimize=True)
# impw: keep rows 1-2, new back hover row 3 (56x62, feet 28,60)
w = np.array(Image.open(impw_old).convert('RGBA')); assert w.shape[:2] == (186, 224)
w[124:186] = np.concatenate([frame(0, c, 56, 62, 28, 60, rows[0][0], rows[0][1][c]) for c in range(4)], 1)
Image.fromarray(w).save(out + '/impw.png', optimize=True)
print('scale', round(S, 3))
