#!/usr/bin/env python3
"""v25 world props -> props.js (window.SJMPROPS) from Kody-approved Task Drop sheet d27e32c2 (props_d27e32c2.b64):
Waystone resting / awake, golden summit lantern, checkpoint lantern post, gem. Cut by props_cut.py, shrunk to game size.
Run with: python3 -I make_props.py"""
import base64, io, os, sys, json
from PIL import Image
HERE = os.path.dirname(os.path.abspath(sys.argv[0])); sys.path.insert(0, HERE)
from props_cut import cut
H = {'stone': 104, 'stonelit': 104, 'lantern': 86, 'post': 112, 'gem': 52}
out = {}
for name, im in cut(HERE).items():
    k = H[name] / im.height; s = im.resize((max(1, round(im.width * k)), H[name]), Image.LANCZOS); px = s.load()
    for y in range(s.height):
        for x in range(s.width):
            r, g, b, a = px[x, y]; px[x, y] = (r, g, b, 255) if a >= 128 else (0, 0, 0, 0)
    bb = io.BytesIO(); s.save(bb, 'PNG', optimize=True); out[name] = 'data:image/png;base64,' + base64.b64encode(bb.getvalue()).decode()
    s.save(os.path.join(HERE, 'preview_prop_%s.png' % name)); print(name, s.size)
open(os.path.join(HERE, 'props.js'), 'w').write('window.SJMPROPS=' + json.dumps(out, separators=(',', ':')) + ';\n')
