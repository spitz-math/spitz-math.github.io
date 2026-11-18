"""Self-test for proof.py, still_parts.py and to_1x.py (M3).   python3 tools/art_check/test_m3.py"""
import os, sys, tempfile
from PIL import Image, ImageDraw
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import proof, still_parts, to_1x

d = tempfile.mkdtemp(); P = lambda n: os.path.join(d, n); fails = 0
def check(ok, name):
    global fails; print(('ok   ' if ok else 'FAIL ') + name); fails += not ok

im = Image.new('RGBA', (24, 22), (0, 0, 0, 0)); g = ImageDraw.Draw(im)
g.rectangle([2, 10, 21, 21], fill=(90, 90, 100, 255)); g.rectangle([4, 2, 19, 9], fill=(60, 60, 70, 255)); g.rectangle([8, 12, 15, 17], fill=(255, 120, 0, 255))
im.save(P('s.png')); im.resize((96, 88), Image.NEAREST).save(P('s4.png'))
pad = Image.new('RGBA', (30, 30), (0, 0, 0, 0)); pad.paste(im, (3, 5)); pad.save(P('pad.png'))
sheet = Image.new('RGBA', (96, 22), (0, 0, 0, 0))
for i in range(4):
    f = im.copy()
    if i: ImageDraw.Draw(f).rectangle([9, 13, 14, 16], fill=(255, 180 + 20 * i, 40, 255))
    sheet.paste(f, (i * 24, 0))
sheet.save(P('anim.png'))
moved = sheet.copy(); ImageDraw.Draw(moved).point((54, 3), fill=(255, 0, 0, 255)); moved.save(P('moved.png'))
recol = im.copy(); ImageDraw.Draw(recol).rectangle([8, 12, 15, 17], fill=(0, 120, 255, 255)); recol.save(P('recol.png'))

check(proof.main([P('s4.png'), P('s.png')]) == 0, 'proof: 4x -> 1x of block art is pixel-preserving')
check(proof.main([P('s.png'), P('pad.png')]) == 0, 'proof: padding / shifting is pixel-preserving')
check(proof.main([P('anim.png'), P('s.png'), '--parent-frames', '24x22']) == 0, 'proof: a frame of a sheet is pixel-preserving')
check(proof.main([P('s.png'), P('anim.png'), '--child-frames', '24x22']) == 1, 'proof: a new animation needs Kody')
check(proof.main([P('s.png'), P('recol.png')]) == 1, 'proof: a recolour needs Kody')
check(still_parts.main([P('anim.png'), '--frame', '24x22', '--base', P('s.png'), '--still', '4,2,16,8']) == 0, 'still parts: hood unchanged, frame 1 = sprite')
check(still_parts.main([P('moved.png'), '--frame', '24x22', '--still', '4,2,16,8']) == 1, 'still parts: one hood pixel moved is caught')
check(still_parts.main([P('anim.png'), '--frame', '24x22', '--base', P('recol.png')]) == 1, 'still parts: frame 1 not the approved sprite is caught')
big = Image.new('RGBA', (480, 440), (0, 0, 0, 0)); ImageDraw.Draw(big).ellipse([40, 40, 440, 400], fill=(200, 90, 30, 255)); big.save(P('ill.png'))
to_1x.main([P('ill.png'), P('ill1.png'), '--size', '48x44', '--json', P('r.json')])
out = Image.open(P('ill1.png')); a = set(out.getchannel('A').getdata())
check(out.size == (48, 44) and a <= {0, 255}, 'to_1x: right size, alpha only 0/255')
to_1x.main([P('ill.png'), P('ill1b.png'), '--size', '48x44'])
check(open(P('ill1.png'), 'rb').read() == open(P('ill1b.png'), 'rb').read(), 'to_1x: deterministic (same bytes twice)')
check(proof.main([P('ill.png'), P('ill1.png')]) == 1, 'to_1x: a conversion is never pixel-preserving (Kody approves it)')
print(f'--- {fails} failing'); sys.exit(1 if fails else 0)
