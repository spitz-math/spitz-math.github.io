#!/usr/bin/env python3
"""Super Jump Man zone skies -> skies.js (window.SJMSKY = [5 data URLs]).

Sources are the exact approved Task Drop PNGs kept as base64 text (project files change PNG bytes):
  1 Grass Steps   b68d3d26  (Claude opaque fix)
  2 Sunset Cliffs 25003389  (Claude filled copy)
  3 Ice Peaks     6c2207d6  (see-through top filled with its top band #264C87 here)
  4 Star Tower    0ade1fcb  (not on an exact grid: palette-snapped here)
  5 Moon Base     sky5_moon_*.b64
Game copies are 512x768 (the paintings are 4x pixel grids, so halving keeps every art pixel).
Run with: python3 -I make_skies.py
"""
import base64, glob, io, os, sys
from PIL import Image

HERE = os.path.dirname(os.path.abspath(sys.argv[0]))
SRC = ['sky1_grass_b68d3d26', 'sky2_sunset_25003389', 'sky3_ice_6c2207d6', 'sky4_star_0ade1fcb', 'sky5_moon_*']

def load(stem):
    hits = sorted(glob.glob(os.path.join(HERE, stem + '.b64')))
    if not hits: return None
    return Image.open(io.BytesIO(base64.b64decode(open(hits[0]).read()))).convert('RGBA')

out = []
for i, stem in enumerate(SRC):
    im = load(stem)
    if im is None: out.append(None); print('missing', stem); continue
    assert im.size == (1024, 1536), (stem, im.size)
    px = im.load()
    fill = px[im.width // 2, 2][:3] if px[im.width // 2, 2][3] == 255 else (0x26, 0x4C, 0x87)
    if i == 2: fill = (0x26, 0x4C, 0x87)
    n = 0
    for y in range(im.height):
        for x in range(im.width):
            if px[x, y][3] < 255: px[x, y] = fill + (255,); n += 1
    small = im.convert('RGB').resize((512, 768), Image.NEAREST)
    if len(small.getcolors(1 << 20) or []) > 64 or small.getcolors(1 << 20) is None:
        small = small.quantize(48, method=Image.MEDIANCUT, dither=Image.NONE).convert('RGB')
    b = io.BytesIO(); small.save(b, 'PNG', optimize=True)
    out.append('data:image/png;base64,' + base64.b64encode(b.getvalue()).decode())
    print(stem, 'filled', n, 'colours', len(small.getcolors(1 << 20)), 'bytes', len(b.getvalue()))
    small.save(os.path.join(HERE, 'preview_%d.png' % (i + 1)))

js = 'window.SJMSKY=[' + ','.join('"%s"' % u if u else 'null' for u in out) + '];'
open(os.path.join(HERE, 'skies.js'), 'w').write(js + '\n')
print('skies.js', len(js))
