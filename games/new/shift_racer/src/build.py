#!/usr/bin/env python3
"""Shift Racer remake build: head.html + game.js -> game.html (the page the Gameplay checks open).
    python3 build.py            writes game.html
    python3 build.py 3          also writes ../out/shift_racer_v3_mult.html (Kody's self-contained test copy, never on the site)"""
import os, subprocess, sys
here = os.path.dirname(os.path.abspath(__file__))
head = open(os.path.join(here, 'head.html'), encoding='utf8').read()
js = open(os.path.join(here, 'game.js'), encoding='utf8').read()
assert '</script>' not in js
open(os.path.join(here, 'game.html'), 'w', encoding='utf8').write(head + '<script>\n' + js + '</script>\n</body>\n</html>\n')
print('built game.html')
if len(sys.argv) > 1:
    out = os.path.join(here, '..', 'out', 'shift_racer_v%s_mult.html' % sys.argv[1])
    subprocess.check_call([sys.executable, os.path.join(here, '..', '..', 'remake_kit', 'build_mult.py'), os.path.join(here, 'game.html'), out])
