"""Ember Kiln room for Rook & Ruin, built in code from existing pixels (spitz.dev, same recipe as the Barracks).
Inputs (refs/, fetched from Sprite Drop for task b9e162a9 and checked by sha256):
  barracks_1x.png   6897a748  dae09c67...  the Barracks Kody approved (round 2): floor, walls, arch kept as is
  guard_room_1x.png f397fa63  8ca7cff6...  plain brick and the banner for the north wall band
  kiln_mouth.png    9c242603  d4e678d8...  prop, 32x34
  wall_brazier.png  bbcab573  9af89599...  prop, 14x22
No image generation. Only the north wall band (x17-207, x275-464, y0-45) changes.
    python3 make_kiln.py   -> out/kiln_1x.png (+ 2x preview)
"""
import hashlib, os
import numpy as np
from PIL import Image
H = os.path.dirname(os.path.abspath(__file__))
SHA = {'barracks_1x.png': 'dae09c670a9be2e8ff060a379c61fdbec7e079c8ed4e2a894ddafb3b4ed905fe',
       'guard_room_1x.png': '8ca7cff6aaff0d5d9d2e14403bf828f9c6c446f8ca20262a36541495854711dc',
       'kiln_mouth.png': 'd4e678d89e89b8f60e11a3a22553b93cda6844d07ea47c8507040e4842d77ee2',
       'wall_brazier.png': '9af89599dc5d4a43748a3b372d6ced5c57c79bf6ab04b20d13b346d3d74d0bfc'}
def ref(n, mode):
    p = os.path.join(H, 'refs', n); b = open(p, 'rb').read()
    assert hashlib.sha256(b).hexdigest() == SHA[n], f'{n} is not the fetched reference'
    return np.array(Image.open(p).convert(mode))
barracks, guard = ref('barracks_1x.png', 'RGB'), ref('guard_room_1x.png', 'RGB')
kiln, brazier = ref('kiln_mouth.png', 'RGBA'), ref('wall_brazier.png', 'RGBA')
img = barracks.copy()
# 1. plain brick over the whole wall band: the guard wall repeats every 52 px; take each column from an unlit,
#    empty stretch of the guard wall (x17-59 or x424-432) with the same position in the 52 px rhythm
PLAIN = {x % 52: x for x in list(range(17, 60)) + list(range(424, 433))}
assert len(PLAIN) == 52
for x in list(range(17, 198)) + list(range(282, 465)):           # x198-207 / 275-281: the arch torches stay
    img[0:46, x] = guard[0:46, PLAIN[x % 52]]
# 2. banners back in their guard-room places, red fabric -> ember orange; gold trim and pole unchanged
BANNERS = [60, 150, 300, 390]
RECOLOR = {(0x77, 0x2b, 0x47): (0xa8, 0x48, 0x1e), (0x4a, 0x28, 0x35): (0x6e, 0x2b, 0x16)}
for x in BANNERS:
    band = guard[4:46, x:x + 30].copy()
    for src, dst in RECOLOR.items():
        band[np.all(band == src, axis=2)] = dst
    img[4:46, x:x + 30] = band
# 3. warm tint on the bricks only (not banners)
WALL = np.zeros(img.shape[:2], bool); WALL[0:46, 17:208] = True; WALL[0:46, 275:465] = True
for x in BANNERS: WALL[4:46, x:x + 30] = False
WALL[:, 198:208] = False; WALL[:, 275:282] = False                # arch torches keep their colour
f = img[WALL].astype(float); f *= (1.07, 0.97, 0.88); img[WALL] = np.clip(f, 0, 255).astype(np.uint8)
# 4. props, mirrored left/right: kiln mouths where the wall torches were (standing on the wall base, y=45),
#    braziers near the corners at torch height
def paste(spr, x, y):
    h, w = spr.shape[:2]; a = spr[..., 3] > 0
    img[y:y + h, x:x + w][a] = spr[..., :3][a]
for x, spr in ((104, kiln), (480 - 104 - 32, kiln[:, ::-1])):
    paste(spr, x, 45 - 34 + 1)
for x, spr in ((30, brazier), (480 - 30 - 14, brazier[:, ::-1])):
    paste(spr, x, 13)
os.makedirs(os.path.join(H, 'out'), exist_ok=True)
out = os.path.join(H, 'out', 'kiln_1x.png')
Image.fromarray(img).save(out, optimize=True)
Image.fromarray(img).resize((960, 540), Image.NEAREST).save(os.path.join(H, 'out', 'kiln_2x_preview.png'))
print(out, hashlib.sha256(open(out, 'rb').read()).hexdigest())
