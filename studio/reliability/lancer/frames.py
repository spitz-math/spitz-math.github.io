"""Shrink Kody's approved big Lancer sheets (walk 525aea6d, attack ed00c75e) to game size.
Each 362x362 cell -> one frame. Scale per sheet so the body (helm top to feet) is 55 px like the skeleton knight.
Each frame is anchored at its own feet (bottom of the body, centre of the feet), so frames never jump.
Colours: one k-means palette for both sheets, mode of the inset block per output pixel (flat colours, crisp outline).
python3 frames.py walk.png attack.png outdir"""
import sys, json, hashlib, numpy as np
from PIL import Image
SHA = {'walk': 'f204582ddfe6', 'attack': 'e1b3e0e6a013'}
BODY = 55; CELL = 362
def load(p, k):
    b = open(p, 'rb').read(); assert hashlib.sha256(b).hexdigest().startswith(SHA[k]), p
    a = np.array(Image.open(p).convert('RGB')).astype(int)
    bg = np.median(np.concatenate([a[:6].reshape(-1, 3), a[-6:].reshape(-1, 3)]), 0)
    return a, np.abs(a - bg).sum(2) > 40
def runs(row):
    r = []; s = None
    for i, v in enumerate(row):
        if v and s is None: s = i
        if not v and s is not None: r.append((s, i - 1)); s = None
    if s is not None: r.append((s, len(row) - 1))
    return r
def measure(m):
    """helm top, feet bottom of one cell mask. Helm = first row with a run wider than the lance tip."""
    w = [max([e - s + 1 for s, e in runs(r)] or [0]) for r in m]
    any_ = [y for y, v in enumerate(w) if v >= 22]
    T = max(any_) - min(any_) + 1
    top = min(y for y, v in enumerate(w) if v >= 0.3 * T)
    return top, max(any_)
def centre(m, bot, H):
    band = m[max(0, bot - int(H * 0.08)):bot + 1].any(0)
    rr = [(s, e) for s, e in runs(band) if e - s + 1 >= 22]
    return (rr[0][0] + rr[-1][1]) / 2 if rr else float(np.where(band)[0].mean())
sheets = {k: load(p, k) for k, p in (('walk', sys.argv[1]), ('attack', sys.argv[2]))}
out = sys.argv[3]
# palette from both sheets' figure pixels
rng = np.random.default_rng(1)
P = np.concatenate([a[m] for a, m in sheets.values()]); smp = P[rng.choice(len(P), 60000, replace=False)].astype(float)
K = 32; cen = smp[rng.choice(len(smp), K, replace=False)]
for _ in range(25):
    lab = ((smp[:, None] - cen[None]) ** 2).sum(2).argmin(1)
    cen = np.array([smp[lab == k].mean(0) if (lab == k).any() else cen[k] for k in range(K)])
pal = np.round(cen).astype(np.uint8)
meta = {}
for k, (a, m) in sheets.items():
    idx = np.full(m.shape, 255, int)
    for y0 in range(0, a.shape[0], 48):
        d = ((a[y0:y0+48, :, None, :].astype(float) - cen[None, None]) ** 2).sum(3)
        idx[y0:y0+48] = np.where(m[y0:y0+48], d.argmin(2), 255)
    raw = [[measure(m[r*CELL:(r+1)*CELL, c*CELL:(c+1)*CELL]) for c in range(4)] for r in range(3)]
    info = []
    for r in range(3):
        mb = float(np.median([raw[r][c][1] for c in range(4)])); row = []
        for c in range(4):
            top, bot = raw[r][c]
            if abs(bot - mb) > 0.04 * CELL: bot = int(mb)          # lance tip below the feet (down thrust): use the row's feet line
            row.append((top, bot, centre(m[r*CELL:(r+1)*CELL, c*CELL:(c+1)*CELL], bot, bot - top + 1)))
        info.append(row)
    # scale from the standing frames (col 0 of every row)
    S = float(np.median([info[r][0][1] - info[r][0][0] + 1 for r in range(3)])) / BODY
    GW, GH, AX, AY = 220, 150, 110, 110                       # generous working cell, feet bottom row AY
    frames = np.zeros((3, 4, GH, GW, 4), np.uint8)
    for r in range(3):
        for c in range(4):
            top, bot, cx = info[r][c]; X0, Y0 = c*CELL, r*CELL
            for oy in range(GH):
                sy0 = Y0 + bot + 1 - (AY + 1 - oy) * S
                for ox in range(GW):
                    sx0 = X0 + cx + (ox - AX - 0.5) * S
                    mg = S * 0.2
                    y0, y1 = int(round(sy0 + mg)), int(round(sy0 + S - mg)); x0, x1 = int(round(sx0 + mg)), int(round(sx0 + S - mg))
                    y0, x0 = max(y0, Y0), max(x0, X0); y1, x1 = min(y1, Y0 + CELL), min(x1, X0 + CELL)
                    if y1 <= y0 or x1 <= x0: continue
                    blk = idx[y0:y1, x0:x1].ravel(); v, n = np.unique(blk, return_counts=True)
                    fgv, fgn = v[v != 255], n[v != 255]
                    if fgn.sum() >= 0.45 * blk.size:
                        frames[r, c, oy, ox, :3] = pal[fgv[fgn.argmax()]]; frames[r, c, oy, ox, 3] = 255
    al = frames[..., 3].max((0, 1)) > 0
    ys, xs = np.where(al)
    l, rgt, t, b = xs.min() - 1, xs.max() + 1, ys.min() - 1, max(AY + 2, ys.max() + 1)   # the game mirrors around px, so no need to be symmetric
    fw, fh = rgt - l + 1, b - t + 1
    sheet = np.zeros((3 * fh, 4 * fw, 4), np.uint8)
    for r in range(3):
        for c in range(4): sheet[r*fh:(r+1)*fh, c*fw:(c+1)*fw] = frames[r, c, t:b+1, l:rgt+1]
    name = {'walk': 'lance_w', 'attack': 'lance_a'}[k]
    Image.fromarray(sheet).save(f'{out}/{name}.png', optimize=True)
    meta[name] = dict(fw=int(fw), fh=int(fh), px=int(AX - l), py=int(AY - t), cols=4, rows=3, scale=round(S, 3),
                      body=[[int(info[r][c][1] - info[r][c][0] + 1) for c in range(4)] for r in range(3)])
    print(name, sheet.shape[1], 'x', sheet.shape[0], meta[name])
json.dump(meta, open(f'{out}/lance_meta.json', 'w'), indent=1)
