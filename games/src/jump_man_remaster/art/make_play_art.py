#!/usr/bin/env python3
"""v22 play art -> play_art.js (window.SJMART), from Kody-approved Task Drop sheets kept as base64 text:
  ledges_1e63b628.b64  floating ledge sheet (5 zone looks x long/short/cracked, spring ledge, 3 boulders)
  poses_5e95af29.b64   hero move poses (wall kick, flip, glide, air dash, hurt)
The soft drop shadows are cleared (alpha < 240), then each piece is shrunk to game size.
Ice Peaks' normal ledge = the grassy ledge with its moss recoloured to snow (so the slippery ice ledge stays different).
Run with: python3 -I make_play_art.py"""
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
def snow(im):
    im = im.copy(); px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            hh, ss, vv = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            if a and 0.13 < hh < 0.45 and ss > 0.3:                       # moss green -> snow white / pale blue
                l = (r + g + b) / 765; px[x, y] = (int(200 + 55 * l), int(215 + 40 * l), 255, 255)
    return im
L = load('ledges_1e63b628.b64'); P = load('poses_5e95af29.b64')
ROWS = [(50, 150), (212, 310), (374, 492), (528, 620), (682, 774)]        # body rows (y) of the 5 looks; chips below the cracked ones are left out
KL = 0.5                                                                   # ledges: ~48 px thick in game
out = {'z': [], 'crack': [], 'short': []}; size = 0
for i, (y0, y1) in enumerate(ROWS):
    lg = shrink(L.crop((84, y0 - 4, 660, y1 + 4)), KL); cr = shrink(L.crop((1026, y0 - 4, 1456, y1 + 2)), KL)
    if i == 2: out['ice'] = url(lg)[0]
    if i == 2: lg = shrink(snow(L.crop((84, ROWS[0][0] - 4, 660, ROWS[0][1] + 2))), KL); cr = shrink(snow(L.crop((1026, ROWS[0][0] - 4, 1456, ROWS[0][1] + 2))), KL)
    for k, im in (('z', lg), ('crack', cr)):
        u, n = url(im); out[k].append(u); size += n; im.save(os.path.join(HERE, 'preview_%s%d.png' % (k, i)))
icecr = shrink(L.crop((1026, ROWS[2][0] - 4, 1456, ROWS[2][1] + 4)), KL); out['icecrack'] = url(icecr)[0]
# just the pad, coil and base plate: it stands on the zone's own ledge in game
sp = shrink(L.crop((186, 830, 408, 923)), KL); out['spring'] = url(sp)[0]; sp.save(os.path.join(HERE, 'preview_spring.png'))
out['rocks'] = []
for box in [(590, 888, 672, 966), (812, 862, 946, 990), (1084, 832, 1270, 1010)]:
    r = shrink(L.crop(box), 0.48); out['rocks'].append(url(r)[0])
KP = 0.28                                                                  # poses: a standing hero ~84 px tall, like the run frames
out['pose'] = {}
for name, box in zip(['wall', 'flip', 'glide', 'dash', 'hurt'], [(50, 378, 290, 690), (330, 380, 532, 630), (576, 376, 840, 682), (896, 404, 1184, 632), (1248, 374, 1502, 682)]):
    p = shrink(P.crop(box), KP); out['pose'][name] = url(p)[0]; p.save(os.path.join(HERE, 'preview_pose_%s.png' % name))
js = 'window.SJMART=' + json.dumps(out, separators=(',', ':')) + ';'
open(os.path.join(HERE, 'play_art.js'), 'w').write(js + '\n'); print('play_art.js', len(js))
