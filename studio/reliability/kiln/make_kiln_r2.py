"""Ember Kiln round 2 (smithy) for Rook & Ruin, built in code from existing pixels. No image generation.
Kody rejected round 1 (out/kiln_1x.png, 18cc975d...) because it needed more to read as a blacksmith's room.
Round 2 = round 1's wall band (same steps 1-3 and braziers, see make_kiln.py) with the two kiln mouths replaced by
five smithy props from Sprite Drop task d4cb944f (checked by sha256, pasted pixel for pixel, never scaled):
  forge.png          42e24189  09e1d503...  48x44  back wall, left gap between banners, quench barrel beside it
  quench_barrel.png  ac71255d  2e3eeb26...  18x22  floor, left of the forge
  tool_rack.png      8adf4148  df2bc9f7...  28x34  back wall, right gap between banners (mirror of the forge spot)
  anvil.png          c8de30ae  18bc0126...  26x18  floor, in front of the tool rack
  fire_pit.png       43150676  47697cd8...  64x44  floor, centred under the north arch, middle of the room
    python3 make_kiln_r2.py   -> out/kiln_r2_1x.png (+ 2x preview)
"""
import hashlib, os
import numpy as np
from PIL import Image
H = os.path.dirname(os.path.abspath(__file__))
SHA = {'barracks_1x.png': 'dae09c670a9be2e8ff060a379c61fdbec7e079c8ed4e2a894ddafb3b4ed905fe',
       'guard_room_1x.png': '8ca7cff6aaff0d5d9d2e14403bf828f9c6c446f8ca20262a36541495854711dc',
       'wall_brazier.png': '9af89599dc5d4a43748a3b372d6ced5c57c79bf6ab04b20d13b346d3d74d0bfc',
       'props/forge.png': '09e1d50396da4cd485d3058a6a56248e35bbe984fbc7ac985223296cebc622e7',
       'props/quench_barrel.png': '2e3eeb263d3aa8d67bb8e82e13cb73ffda8743b164f11efe9e98d24440234724',
       'props/tool_rack.png': 'df2bc9f703b86ad15dc34b064853a667e7f493fd28ecc381a60cd18904b13215',
       'props/anvil.png': '18bc0126445e09f70ddc20bacf8ef7e6d07e5f696aa40b7166ce239bfbbc8d85',
       'props/fire_pit.png': '47697cd8c136343080cc9bf814d03e42d5ea88b3ade4623b3fa07d271d650439'}
def ref(n, mode):
    p = os.path.join(H, 'refs', n); b = open(p, 'rb').read()
    assert hashlib.sha256(b).hexdigest() == SHA[n], f'{n} is not the fetched reference'
    a = np.array(Image.open(p).convert(mode))
    if mode == 'RGBA':
        assert set(np.unique(a[..., 3])) <= {0, 255}, f'{n} has soft alpha'
    return a
barracks, guard = ref('barracks_1x.png', 'RGB'), ref('guard_room_1x.png', 'RGB')
brazier = ref('wall_brazier.png', 'RGBA')
P = {k: ref(f'props/{k}.png', 'RGBA') for k in ('forge', 'quench_barrel', 'tool_rack', 'anvil', 'fire_pit')}
img = barracks.copy()
# --- wall band exactly as round 1 (make_kiln.py steps 1-3), without the kiln mouths ---
PLAIN = {x % 52: x for x in list(range(17, 60)) + list(range(424, 433))}
for x in list(range(17, 198)) + list(range(282, 465)):
    img[0:46, x] = guard[0:46, PLAIN[x % 52]]
BANNERS = [60, 150, 300, 390]
RECOLOR = {(0x77, 0x2b, 0x47): (0xa8, 0x48, 0x1e), (0x4a, 0x28, 0x35): (0x6e, 0x2b, 0x16)}
for x in BANNERS:
    band = guard[4:46, x:x + 30].copy()
    for src, dst in RECOLOR.items():
        band[np.all(band == src, axis=2)] = dst
    img[4:46, x:x + 30] = band
WALL = np.zeros(img.shape[:2], bool); WALL[0:46, 17:208] = True; WALL[0:46, 275:465] = True
for x in BANNERS: WALL[4:46, x:x + 30] = False
WALL[:, 198:208] = False; WALL[:, 275:282] = False
f = img[WALL].astype(float); f *= (1.07, 0.97, 0.88); img[WALL] = np.clip(f, 0, 255).astype(np.uint8)
def paste(spr, x, y):
    h, w = spr.shape[:2]; a = spr[..., 3] > 0
    assert 0 <= x and x + w <= 480 and 0 <= y and y + h <= 270
    img[y:y + h, x:x + w][a] = spr[..., :3][a]
for x, spr in ((30, brazier), (480 - 30 - 14, brazier[:, ::-1])):
    paste(spr, x, 13)
# --- round 2 props (drawn back to front so nearer props overlap farther ones) ---
# wall gaps between banners: x90-149 (left) and x330-389 (right); wall base is y45, floor starts y46
PLACE = [('forge', 96, 52 - 44),            # 48 wide, centred in the left gap; bottom row on the floor at y51
         ('tool_rack', 346, 11),            # 28 wide, centred in the right gap; hangs on the wall, bottom y44
         ('quench_barrel', 74, 56 - 22),    # floor, left of the forge, bottom y55
         ('anvil', 347, 68 - 18),           # floor, in front of the tool rack (clear of it), bottom y67
         ('fire_pit', 240 - 32, 118)]       # floor, centred on the arch (x208-271), y118-161, clear of the doorways
for name, x, y in PLACE:
    paste(P[name], x, y)
os.makedirs(os.path.join(H, 'out'), exist_ok=True)
out = os.path.join(H, 'out', 'kiln_r2_1x.png')
Image.fromarray(img).save(out, optimize=True)
Image.fromarray(img).resize((960, 540), Image.NEAREST).save(os.path.join(H, 'out', 'kiln_r2_2x_preview.png'))
print(out, hashlib.sha256(open(out, 'rb').read()).hexdigest())
