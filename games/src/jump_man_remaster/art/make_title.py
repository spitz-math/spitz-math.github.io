#!/usr/bin/env python3
"""Super Jump Man start screen art -> title_bg.webp.b64 + title_logo.png.b64 (used by build.py).
Sources (exact approved Task Drop bytes as base64): start_e5f2b258.b64 (start screen painting), logo_18043edd.b64 (hub-matched logo).
Run with: python3 -I make_title.py"""
import base64, io, os, sys
from PIL import Image
HERE = os.path.dirname(os.path.abspath(sys.argv[0]))
load = lambda n: Image.open(io.BytesIO(base64.b64decode(open(os.path.join(HERE, n)).read())))
bg = load('start_e5f2b258.b64').convert('RGB').crop((0, 80, 1536, 944)).resize((1366, 768), Image.LANCZOS)
b = io.BytesIO(); bg.save(b, 'WEBP', quality=88, method=6); open(os.path.join(HERE, 'title_bg.webp.b64'), 'w').write(base64.b64encode(b.getvalue()).decode())
lg = load('logo_18043edd.b64').convert('RGBA'); lg = lg.crop(lg.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox())
h = 330; lg = lg.resize((round(lg.width * h / lg.height), h), Image.LANCZOS)
c = io.BytesIO(); lg.save(c, 'PNG', optimize=True); open(os.path.join(HERE, 'title_logo.png.b64'), 'w').write(base64.b64encode(c.getvalue()).decode())
print('bg', len(b.getvalue()), 'logo', lg.size, len(c.getvalue()))
