#!/usr/bin/env python3
"""v31 hero everyday frames -> frames.js (window.SJMFRAMES), from Kody-approved Task Drop sheet 0144bbb4 (frames_0144bbb4.b64):
idle, run A/B/C, jump, fall, land. Same clean-up and clean-up as the move poses (make_play_art.py) at 0.30 so a standing hero is ~84 px like the old frames, feet at the bottom edge.
Run with: python3 -I make_frames.py"""
import base64, io, os, sys, json, colorsys
from PIL import Image
HERE = os.path.dirname(os.path.abspath(sys.argv[0]))
def load(n):
    im = Image.open(io.BytesIO(base64.b64decode(open(os.path.join(HERE, n)).read()))).convert('RGBA'); px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            if px[x, y][3] < 240: px[x, y] = (0, 0, 0, 0)
            else: px[x, y] = px[x, y][:3] + (255,)
    return im
def shrink(im, k):
    im = im.crop(im.getbbox()); w, h = max(1, round(im.width * k)), max(1, round(im.height * k))
    s = im.resize((w, h), Image.LANCZOS); px = s.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]; px[x, y] = (r, g, b, 255) if a >= 128 else (0, 0, 0, 0)
    return s
def url(im):
    b = io.BytesIO(); im.save(b, 'PNG', optimize=True); return 'data:image/png;base64,' + base64.b64encode(b.getvalue()).decode(), len(b.getvalue())
F = load('frames_0144bbb4.b64')
WIN = [('idle', 20, 215), ('runA', 220, 440), ('runB', 440, 645), ('runC', 650, 865), ('jump', 870, 1080), ('fall', 1080, 1300), ('land', 1300, 1530)]
out = {}
for name, x0, x1 in WIN:
    p = shrink(F.crop((x0, 0, x1, F.height)), 0.30); out[name] = url(p)[0]; p.save(os.path.join(HERE, 'preview_frame_%s.png' % name)); print(name, p.size)
open(os.path.join(HERE, 'frames.js'), 'w').write('window.SJMFRAMES=' + json.dumps(out) + ';\n')
