"""Shrink the approved Lancer design (0710a9e9, sha 42e18211...) to game scale.
Mode-of-block downsampling on a quantized palette keeps colours flat and outlines crisp.
Out: lancer_design_1x.png 192x80 (3 cells 64x80, feet on row 77), transparent bg, alpha 0/255."""
import sys, hashlib, numpy as np
from PIL import Image
src = sys.argv[1]; S = float(sys.argv[2]) if len(sys.argv) > 2 else 8.8
assert hashlib.sha256(open(src,'rb').read()).hexdigest().startswith('42e18211237a')
im = Image.open(src).convert('RGB'); a = np.array(im).astype(int)
bg = np.array([62, 42, 60]); fg = np.abs(a - bg).sum(2) > 40
# palette from the figure pixels only (k-means), so the background never mixes into the art colours
rng = np.random.default_rng(1); P = a[fg]; smp = P[rng.choice(len(P), 40000, replace=False)].astype(float)
K = 32; cen = smp[rng.choice(len(smp), K, replace=False)]
for _ in range(25):
    lab = ((smp[:, None] - cen[None]) ** 2).sum(2).argmin(1)
    cen = np.array([smp[lab == k].mean(0) if (lab == k).any() else cen[k] for k in range(K)])
pal = np.round(cen).astype(int)
idx = np.full(fg.shape, 255, int)
for y0 in range(0, a.shape[0], 64):
    blk = a[y0:y0+64].astype(float); d = ((blk[..., None, :] - cen[None, None]) ** 2).sum(3)
    idx[y0:y0+64] = np.where(fg[y0:y0+64], d.argmin(2), 255)
CW, CH, FEET = 64, 80, 77
out = np.zeros((CH, CW*3, 4), np.uint8)
FIG = [(225, 611), (940, 1252), (1558, 1944)]; FOOT = 683
for c, (x0, x1) in enumerate(FIG):
    cx = (x0 + x1) / 2
    for oy in range(CH):
        for ox in range(CW):
            # big-image block for this output pixel; feet row FEET maps to source bottom FOOT
            sy0 = FOOT + 1 - (FEET + 1 - oy) * S; sx0 = cx + (ox - CW/2) * S
            m = S * 0.2                                   # inset: ignore the anti-aliased block edges
            ys = slice(max(0, int(round(sy0 + m))), max(0, int(round(sy0 + S - m))))
            xs = slice(max(0, int(round(sx0 + m))), max(0, int(round(sx0 + S - m))))
            blk = idx[ys, xs].ravel()
            if blk.size == 0: continue
            v, n = np.unique(blk, return_counts=True)
            k = v[n.argmax()]
            # keep a thin dark outline when it is a large minority of the block
            if k != 255:
                out[oy, c*CW + ox, :3] = pal[k]; out[oy, c*CW + ox, 3] = 255
            else:
                nb = n[v != 255].sum()
                if nb >= 0.45 * blk.size:
                    vv, nn = v[v != 255], n[v != 255]; k = vv[nn.argmax()]
                    out[oy, c*CW + ox, :3] = pal[k]; out[oy, c*CW + ox, 3] = 255
Image.fromarray(out).save(sys.argv[3])
print('colours', len(np.unique(out[out[..., 3] > 0][:, :3], axis=0)))
