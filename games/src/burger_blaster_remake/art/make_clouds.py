"""v23: lift the five painted clouds off the backdrop so they can drift in code.
Writes backdrop_sky.webp.b64 (same picture, clouds painted out with sky from the same rows), clouds.webp.b64 (sprite sheet) and clouds.json (rects + home spots).
python3 make_clouds.py"""
import base64, io, json, os
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage
here = os.path.dirname(os.path.abspath(__file__))
im = Image.open(io.BytesIO(base64.b64decode(open(os.path.join(here, 'backdrop.webp.b64')).read()))).convert('RGB')
a = np.asarray(im).astype(int); H, W = a.shape[:2]
sky = (a[:, :, 1] > a[:, :, 0] + 25)
m = ~sky; m[470:] = False
m = ndimage.binary_opening(m, iterations=2)
lab, n = ndimage.label(m)
out = a.copy(); sprites = []; PAD = 10
solid = ndimage.binary_dilation(m, iterations=PAD + 6)
for i in range(1, n + 1):
    ys, xs = np.where(lab == i)
    if len(ys) < 4000: continue
    x0, x1, y0, y1 = max(0, xs.min() - PAD), min(W, xs.max() + PAD + 1), max(0, ys.min() - PAD), min(H, ys.max() + PAD + 1)
    one = ndimage.binary_fill_holes(lab[y0:y1, x0:x1] == i)
    alpha = Image.fromarray((ndimage.binary_dilation(one, iterations=1) * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(0.8))
    spr = Image.fromarray(a[y0:y1, x0:x1].astype('uint8')).convert('RGBA'); spr.putalpha(alpha); sprites.append((spr, int(x0), int(y0)))
    # paint the hole with clean sky from the same rows
    w = x1 - x0; best = None; free = ~solid[y0:y1].any(axis=0); run = 0
    for sx in range(W):                       # the widest stretch of clean sky on these rows, mirrored side to side until it covers the hole
        run = run + 1 if free[sx] else 0
        if run and (best is None or run > best[1]): best = (sx - run + 1, run)
    assert best is not None and best[1] >= 120, 'no clean sky for a cloud'
    strip = a[y0:y1, best[0]:best[0] + best[1]]; tiles = []
    while sum(t.shape[1] for t in tiles) < w: tiles.append(strip if len(tiles) % 2 == 0 else strip[:, ::-1])
    patch = np.concatenate(tiles, axis=1)[:, :w]
    hole = Image.fromarray((ndimage.binary_dilation(one, iterations=PAD - 2) * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(3))
    k = (np.asarray(hole).astype(float) / 255)[:, :, None]
    out[y0:y1, x0:x1] = (out[y0:y1, x0:x1] * (1 - k) + patch * k).round()
def b64(img, **kw):
    b = io.BytesIO(); img.save(b, 'WEBP', **kw); return base64.b64encode(b.getvalue()).decode()
skyim = Image.fromarray(out.astype('uint8'))
open(os.path.join(here, 'backdrop_sky.webp.b64'), 'w').write(b64(skyim, quality=90))
sw = sum(s.size[0] for s, _, _ in sprites) + 4 * len(sprites); sh = max(s.size[1] for s, _, _ in sprites)
sheet = Image.new('RGBA', (sw, sh), (0, 0, 0, 0)); x = 0; rects = []
for s, hx, hy in sprites:
    sheet.paste(s, (x, 0)); rects.append([x, 0, s.size[0], s.size[1], hx, hy]); x += s.size[0] + 4
open(os.path.join(here, 'clouds.webp.b64'), 'w').write(b64(sheet, quality=92, alpha_quality=100))
json.dump(rects, open(os.path.join(here, 'clouds.json'), 'w'))
skyim.save('/tmp/claude-0/v22/sky_only.jpg'); bg = Image.new('RGB', sheet.size, (255, 0, 255)); bg.paste(sheet, (0, 0), sheet); bg.save('/tmp/claude-0/v22/clouds_sheet.png')
print(len(sprites), rects, sheet.size)
