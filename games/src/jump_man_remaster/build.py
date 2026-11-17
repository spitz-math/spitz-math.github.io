#!/usr/bin/env python3
"""Jump Man, remastered: the live tower game with the Lantern Peak climber and pixel art.

Starts from the live games/jump_man_multiplication.html and swaps only the drawing (remaster.js), so the gameplay,
score key, save key, controls and shop stay exactly as students know them. Writes to out/:
  jump_man_multiplication.html   site candidate (replaces the live file only on Kody's "push it")
  jump_man_remaster_mult.html    self-contained test copy (fonts, kit, questions, scorecode, art inside); opens
                                 straight into multiplication facts. Never goes on the site.
Run: python3 games/src/jump_man_remaster/build.py
"""
import base64, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
G = os.path.normpath(os.path.join(HERE, '..', '..'))           # games/
ROOT = os.path.dirname(G)
O = os.path.join(HERE, 'out'); os.makedirs(O, exist_ok=True)
read = lambda p: open(p, encoding='utf-8').read()

src = read(os.path.join(G, 'jump_man_multiplication.html'))
parts = dict(re.findall(r'//@@ (\w+)\n(.*?)(?=//@@ |\Z)', read(os.path.join(HERE, 'remaster.js')), re.S))
art = read(os.path.join(G, 'src', 'lantern_peak', 'art_data.js'))

def cut(t, start, end, new):
    """replace t[start:end) (end not included) with new; both markers must be found exactly once"""
    assert t.count(start) == 1, start; i = t.index(start); j = t.index(end, i); assert t.count(end) >= 1, end
    return t[:i] + new + t[j:]
def swap(t, old, new):
    assert t.count(old) == 1, old[:80]; return t.replace(old, new)

t = src
# 1. the climber, the ledges and the new art helpers (drawMan .. panel)
t = cut(t, 'function drawMan(x,y,ghost){', 'function panel(', parts['ART'] + parts['MAN'] + parts['BACK'] + parts['FLOOR'] + parts['GEM'])
# 2. the sky: stepped pixel bands instead of a smooth gradient
t = swap(t, "var c=SKYS.c.getContext('2d'), g=c.createLinearGradient(0,0,0,H); g.addColorStop(0,sk[0]); g.addColorStop(1,sk[1]); c.fillStyle=g; c.fillRect(0,0,1,H);",
         "bandStrip(SKYS.c.getContext('2d'),sk);")
# 3. stars, clouds and ground -> drawBack
t = cut(t, "  cx.fillStyle='#fff'; for(i=0;i<70;i++){", "  for(i=0;i<plats.length;i++){", "  drawBack(m);\n")
# 4. full floors -> drawFloor
t = cut(t, "    if(p.floor){ cx.fillStyle=z.body;", "    else drawPlat(p,py,z);", "    if(p.floor) drawFloor(p,py,z);\n")
# 5. gems -> pixel gems
t = cut(t, "    if(p.gem!==undefined&&!S.got[p.i]&&solid(p)){ var gx=", "  dust.forEach(",
        "    if(p.gem!==undefined&&!S.got[p.i]&&solid(p)) drawGem(cxAt(p,gt)+p.gem,py-74+Math.round(Math.sin(gt*3+p.i)*6),p.gold); }\n")
t = swap(t, "cx.fillStyle=d.col; cx.fillRect(d.x-4,sy(d.h)-4,8,8);", "cx.fillStyle=d.col; cx.fillRect(Math.round(d.x/4)*4-4,Math.round(sy(d.h)/4)*4-4,8,8);")
# 6. zone skies in the Lantern Peak palette (the names and heights stay)
for old, new in [("a:[70,150,245],b:[175,222,255]", "a:[120,182,200],b:[191,227,232]"), ("a:[60,70,170],b:[250,150,110]", "a:[111,140,184],b:[244,184,128]"),
                 ("a:[14,16,40],b:[40,30,90]", "a:[30,42,79],b:[108,120,168]"), ("a:[6,7,16],b:[20,14,44]", "a:[14,10,32],b:[52,32,92]"), ("a:[2,2,6],b:[34,12,30]", "a:[4,4,12],b:[34,20,44]")]:
    t = swap(t, old, new)
# 7. the art itself (hero sprite sheet + Pinewood backdrop) loads before the game
t = swap(t, '<script src="scorecode.js"></script>', '<script>\n' + art + '\n</script>\n<script src="scorecode.js"></script>')
# 8. the climber waves hello on the start screen
fr = re.search(r'idle:\[(\d+),(\d+),(\d+),(\d+)\]', art).groups(); fx, fy, fw, fh = map(int, fr); S3 = 2
heroimg = re.search(r'hero:"(data:image/png;base64,[^"]+)"', art).group(1)
css = ('.jmr-hero{ width:%dpx; height:%dpx; margin:0 auto 6px; background:url(%s) -%dpx -%dpx / %dpx %dpx no-repeat; image-rendering:pixelated; }\n'
       % (fw * S3, fh * S3, heroimg, fx * S3, fy * S3, 165 * S3, 42 * S3))
t = swap(t, '</style>\n</head>', css + '</style>\n</head>') if t.count('</style>\n</head>') == 1 else swap(t, '<script src="kit.js"></script>', '<style>' + css + '</style>\n<script src="kit.js"></script>')
t = swap(t, '<div class="sz-eyebrow">Spitz <b>Arcade</b></div><h2 class="jm-big">', '<div class="sz-eyebrow">Spitz <b>Arcade</b></div><div class="jmr-hero" aria-hidden="true"></div><h2 class="jm-big">')
assert 'createLinearGradient(0,0,0,H)' not in t
open(os.path.join(O, 'jump_man_multiplication.html'), 'w', encoding='utf-8').write(t)

# ---- the self-contained test copy ----
def inline(html, q):
    for name, body in [('kit.js', read(os.path.join(G, 'kit.js'))), ('questions.js', q), ('scorecode.js', read(os.path.join(G, 'scorecode.js')))]:
        tag = '<script src="%s"></script>' % name; assert html.count(tag) == 1, name
        html = html.replace(tag, '<script>\n' + body.replace('</script', '<\\/script') + '\n</script>')
    return html
q = read(os.path.join(G, 'questions.js'))
line = [l for l in q.split('\n') if l.startswith('var FALLBACK=ASSIGN.length?')][0]
qm = q.replace(line, "var FALLBACK='mult';   /* test copy: opens straight into multiplication facts */").replace('ASSIGN=TOPICS.assign.filter(', 'ASSIGN=[].filter(').replace('var HIDDEN=TOPICS.hidden,', 'var HIDDEN=[],')
assert qm.count("FALLBACK='mult'") == 1 and 'ASSIGN=[].filter(' in qm and 'var HIDDEN=[],' in qm
m = inline(t, qm)
link = re.search(r'<link href="\.\./fonts/([^"]+\.css)"[^>]*>', m)
fcss = read(os.path.join(ROOT, 'fonts', link.group(1)))
fcss = re.sub(r'url\((files/[^)]+)\)', lambda u: 'url(data:font/woff2;base64,' + base64.b64encode(open(os.path.join(ROOT, 'fonts', u.group(1)), 'rb').read()).decode() + ')', fcss)
m = m.replace(link.group(0), '<style>\n' + fcss + '\n</style>')
open(os.path.join(O, 'jump_man_remaster_mult.html'), 'w', encoding='utf-8').write(m)
print('built', len(t), 'site bytes;', len(m), 'test-copy bytes')
