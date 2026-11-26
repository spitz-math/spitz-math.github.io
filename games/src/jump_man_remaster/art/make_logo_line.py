#!/usr/bin/env python3
"""v20: one-line SUPER JUMP MAN logo for the start screen, cut from the approved stacked logo 18043edd.
The three words are cut apart at the gaps between lines (y 404 and 668), the soft dark glow is dropped
(alpha < 110 -> clear), and the words are set side by side on one baseline. Writes title_logo_line.png.b64.
Run with: python3 -I make_logo_line.py"""
import base64, io, os, sys
from PIL import Image
HERE = os.path.dirname(os.path.abspath(sys.argv[0]))
im = Image.open(io.BytesIO(base64.b64decode(open(os.path.join(HERE, 'logo_18043edd.b64')).read()))).convert('RGBA')
px = im.load()
for y in range(im.height):
    for x in range(im.width):
        if px[x, y][3] < 110: px[x, y] = (0, 0, 0, 0)
# the top rows of JUMP also hold the bottom of SUPER's shadow: keep a pixel there only if JUMP's outline continues below it
for y in range(412, 424):
    for x in range(im.width):
        if px[x, 426][3] == 0: px[x, y] = (0, 0, 0, 0)
words = []
for a, b, xmax in [(120, 412, 1536), (412, 668, 1172), (668, 960, 1536)]:   # x > 1172 in the JUMP band is SUPER's shadow
    band = im.crop((0, a, xmax, b)); words.append(band.crop(band.getbbox()))
gap = 54
W = sum(w.width for w in words) + gap * 2; H = max(w.height for w in words)
out = Image.new('RGBA', (W, H)); x = 0
for w in words: out.paste(w, (x, H - w.height), w); x += w.width + gap
out = out.resize((W // 2, H // 2), Image.LANCZOS)
b = io.BytesIO(); out.save(b, 'PNG', optimize=True)
open(os.path.join(HERE, 'title_logo_line.png.b64'), 'w').write(base64.b64encode(b.getvalue()).decode())
out.save(os.path.join(HERE, 'preview_logo_line.png'))
print(out.size, len(b.getvalue()))
