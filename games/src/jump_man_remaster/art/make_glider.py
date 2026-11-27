#!/usr/bin/env python3
"""v32 glider wing -> glider.js (window.SJMGLIDER), from Kody-approved Task Drop asset 35579846 (glider_35579846.b64).
Alpha cleaned to 0/255, cropped, shrunk to ~128 px wide (the hero is ~84 px tall). Run with: python3 -I make_glider.py"""
import base64, io, os, sys, json
from PIL import Image
HERE = os.path.dirname(os.path.abspath(sys.argv[0]))
im = Image.open(io.BytesIO(base64.b64decode(open(os.path.join(HERE, 'glider_35579846.b64')).read()))).convert('RGBA'); px = im.load()
for y in range(im.height):
    for x in range(im.width):
        px[x, y] = px[x, y][:3] + (255,) if px[x, y][3] >= 240 else (0, 0, 0, 0)
im = im.crop(im.getbbox()); W = 128; k = W / im.width
s = im.resize((W, max(1, round(im.height * k))), Image.LANCZOS); px = s.load()
for y in range(s.height):
    for x in range(s.width):
        r, g, b, a = px[x, y]; px[x, y] = (r, g, b, 255) if a >= 128 else (0, 0, 0, 0)
s.save(os.path.join(HERE, 'preview_glider.png'))
b = io.BytesIO(); s.save(b, 'PNG', optimize=True)
open(os.path.join(HERE, 'glider.js'), 'w').write('window.SJMGLIDER=' + json.dumps('data:image/png;base64,' + base64.b64encode(b.getvalue()).decode()) + ';\n')
print(s.size, len(b.getvalue()))
