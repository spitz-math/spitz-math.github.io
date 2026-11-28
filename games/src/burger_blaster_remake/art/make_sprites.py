"""Cut the two approved ChatGPT sheets into one sprite atlas for Burger Blaster v7.
Munchers: Sprite Drop 7b334bd1 (cleaned from 7df87204). Burgers + slingshot: 5dacb39e.
usage: python3 make_sprites.py munchers_clean.png burgers.png OUTDIR [frames2.png]
writes OUTDIR/sprites.webp.b64 and OUTDIR/sprites.json  {name:[x,y,w,h]} in atlas pixels"""
import sys, json, base64, io
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

mun, bur, out = sys.argv[1], sys.argv[2], sys.argv[3]
fr2 = sys.argv[4] if len(sys.argv) > 4 else None  # more frames sheet, Sprite Drop 5855df0e
hel = sys.argv[5] if len(sys.argv) > 5 else None  # helmet frames sheet, Sprite Drop 5684b3ac
kit = sys.argv[6] if len(sys.argv) > 6 else None  # v11 slingshot kit, Sprite Drop 51ce9bca (task 0c3221aa)

def hard(im):  # alpha only 0/255, colour zeroed under clear pixels
    a = np.array(im.convert('RGBA')); m = a[:, :, 3] >= 128
    a[:, :, 3] = np.where(m, 255, 0); a[~m, :3] = 0
    return Image.fromarray(a)

def tight(im, box, edge_clean=False):
    c = im.crop(box)
    if edge_clean: c = drop_edge_bits(c)
    bb = c.getbbox(); return c.crop(bb)

def drop_edge_bits(c):  # remove small pieces of a neighbour that spill over the left/right cut
    a = np.array(c); m = a[:, :, 3] > 0; H, W = m.shape
    lab = np.zeros(m.shape, np.int32); sizes = [0]; edge = [False]
    for y0 in range(H):
        for x0 in range(W):
            if m[y0, x0] and not lab[y0, x0]:
                n = len(sizes); lab[y0, x0] = n; st = [(y0, x0)]; cnt = 0; e = False
                while st:
                    y, x = st.pop(); cnt += 1
                    if x == 0 or x == W - 1: e = True
                    for yy, xx in ((y+1, x), (y-1, x), (y, x+1), (y, x-1)):
                        if 0 <= yy < H and 0 <= xx < W and m[yy, xx] and not lab[yy, xx]:
                            lab[yy, xx] = n; st.append((yy, xx))
                sizes.append(cnt); edge.append(e)
    big = max(sizes)
    for n in range(1, len(sizes)):
        if edge[n] and sizes[n] < big * 0.15: a[lab == n] = 0
    return Image.fromarray(a)

def purple(im, tH=316, tS=0.67, tV=0.64):  # v10: every Muncher/King frame in the title painting's purple
    a = np.array(im); hsv = np.array(im.convert('RGB').convert('HSV')).astype(float)
    H = hsv[:, :, 0] * 360 / 255; S = hsv[:, :, 1] / 255; V = hsv[:, :, 2] / 255
    p = (a[:, :, 3] > 0) & (H > 280) & (H < 340) & (S > 0.3) & (V > 0.2)
    if p.sum() < 50: return im
    H[p] = (H[p] + tH - H[p].mean()) % 360; S[p] = np.clip(S[p] * tS / S[p].mean(), 0, 1); V[p] = np.clip(V[p] * tV / V[p].mean(), 0, 1)
    o = np.stack([H * 255 / 360, S * 255, V * 255], -1).round().astype(np.uint8)
    rgb = np.array(Image.fromarray(o, 'HSV').convert('RGB')); a[p, :3] = rgb[p]; return Image.fromarray(a)

def cut_pouch(B):  # v10: the painted leather pouch, cut along its own ink outline
    c = B.crop((1270, 590, 1475, 730)); a = np.array(c)
    V = np.array(c.convert('RGB').convert('HSV'))[:, :, 2] / 255; ok = (a[:, :, 3] > 128) & (V > 0.22)
    ys, xs = np.nonzero(ok); k = np.argmin((ys - a.shape[0] * 0.55) ** 2 + (xs - a.shape[1] / 2) ** 2)
    r = np.zeros_like(ok); r[ys[k], xs[k]] = True
    while True:
        g = r.copy(); g[1:] |= r[:-1]; g[:-1] |= r[1:]; g[:, 1:] |= r[:, :-1]; g[:, :-1] |= r[:, 1:]; g &= ok
        if g.sum() == r.sum(): break
        r = g
    inner = Image.fromarray((r * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.MinFilter(7))
    m = np.array(inner.filter(ImageFilter.MaxFilter(15))) > 0
    a[~(m & (a[:, :, 3] > 128))] = 0; F = Image.fromarray(a); return F.crop(F.getbbox())

M = hard(Image.open(mun)); B = hard(Image.open(bur))
pieces = {}
for i, (x0, x1) in enumerate([(19, 372), (425, 721), (773, 1124), (1164, 1514)]):
    pieces['m%d' % i] = tight(M, (x0 - 4, 40, x1 + 4, 416))
for i, (x0, x1) in enumerate([(6, 380), (380, 760), (752, 1172)]):
    pieces['k%d' % i] = tight(M, (x0, 512, x1, 980), True)
for i, (x0, x1) in enumerate([(16, 324), (330, 620), (624, 916), (931, 1215)]):
    pieces['b%d' % i] = tight(B, (x0, 318, x1, 722))
if fr2:
    X = hard(Image.open(fr2))
    for i, (x0, x1) in enumerate([(10, 385), (385, 770), (790, 1120), (1165, 1520)]):
        pieces['m%d' % (i + 4)] = tight(X, (x0, 85, x1, 396))
    for i, (x0, x1) in enumerate([(4, 386), (386, 762), (764, 1152)]):
        pieces['k%d' % (i + 3)] = tight(X, (x0, 505, x1, 962), True)
if hel:
    Hs = hard(Image.open(hel))
    for i, (x0, x1) in enumerate([(14, 390), (390, 777), (777, 1117), (1117, 1520)]):
        pieces['h%d' % i] = tight(Hs, (x0, 230, x1, 730))
# slingshot: wooden Y only (pouch and loose hanging bands removed; the game draws its own bands)
S = B.crop((1236, 315, 1517, 726)); mk = Image.new('L', S.size, 0); d = ImageDraw.Draw(mk)
d.rectangle((0, 0, 281, 140), fill=255); d.polygon([(0, 140), (281, 140), (236, 172), (178, 302), (103, 302), (46, 172)], fill=255)
F = Image.new('RGBA', S.size, (0, 0, 0, 0)); F.paste(S, (0, 0), mk); pieces['fork'] = F.crop(F.getbbox())
# whole slingshot standing on the roof: the painted Y, its own stem stretched down (rows 255-285 repeated), dark foot line
top = F.crop((0, 69, 281, 286)); band = F.crop((0, 255, 281, 286)); TOTAL = 470
SL_ = Image.new('RGBA', (281, TOTAL), (0, 0, 0, 0)); SL_.paste(top, (0, 0)); y = top.height
while y < TOTAL - 8: SL_.paste(band, (0, y)); y += band.height
SL_ = SL_.crop((0, 0, 281, TOTAL - 8)); a = np.array(SL_); m = a[:, :, 3] > 0
last = np.where(m[-1])[0]; foot = np.zeros((8, 281, 4), np.uint8); foot[:, last.min():last.max() + 1] = [36, 22, 16, 255]
SL_ = Image.fromarray(np.vstack([a, foot])); pieces['sling'] = SL_; del pieces['fork']

pieces['pouch'] = cut_pouch(B)
if kit:  # v11: chunky turned slingshot, pouch back + front lip, band strip (sheet has a dark glow background: cut along the ink, cutkit.py)
    import os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import cutkit
    cutkit.K = np.array(Image.open(kit).convert('RGBA')).astype(int)
    pieces['sling'] = cutkit.flatten(cutkit.cut((110, 100, 560, 900))[0], 'sling'); del pieces['pouch']
    pieces['pback'] = cutkit.flatten(cutkit.cut((780, 100, 1320, 455), seedv=100)[0], 'leather'); pieces['pfront'] = cutkit.flatten(cutkit.cut((780, 455, 1320, 780))[0], 'leather')
    pieces['band'] = cutkit.flatten(cutkit.cut((590, 810, 1520, 950))[0], 'band')  # v11b: flattened to the game's flat cartoon tones
for n in list(pieces):
    if n[0] in 'mkh': pieces[n] = purple(pieces[n])
# stored sizes = 1.5x the in-game size (canvas units)
scale = {'m': 110 / pieces['m0'].height, 'k': 180 / pieces['k0'].height, 'b': 110 / pieces['b0'].width, 'f': 0.62}
small = {}
for n, im in pieces.items():
    s = scale['f' if n in ('fork', 'sling', 'pouch', 'pback', 'pfront', 'band') else 'm' if n[0] == 'h' else n[0]]
    small[n] = hard(im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS))
# simple shelf packing
W = 1024; x = y = rowh = 0; lay = {}
for n in sorted(small, key=lambda n: -small[n].height):
    im = small[n]
    if x + im.width > W: x = 0; y += rowh + 2; rowh = 0
    lay[n] = [x, y, im.width, im.height]; x += im.width + 2; rowh = max(rowh, im.height)
atlas = Image.new('RGBA', (W, y + rowh), (0, 0, 0, 0))
for n, (ax, ay, w, h) in lay.items(): atlas.paste(small[n], (ax, ay))
buf = io.BytesIO(); atlas.save(buf, 'WEBP', lossless=True); data = buf.getvalue()
open(out + '/sprites.webp.b64', 'w').write(base64.b64encode(data).decode())
json.dump(lay, open(out + '/sprites.json', 'w'))
atlas.save(out + '/sprites_preview.png')
print('atlas', atlas.size, len(data), 'bytes'); print(json.dumps(lay))
