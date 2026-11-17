"""Barracks room for Rook & Ruin, built in code from existing approved pixels (spitz.dev Phase 4 test).
Inputs (refs/, fetched from Sprite Drop for task 28e60182 and checked by sha256):
  guard_room_1x.png  f397fa63  8ca7cff6...   base room
  siege_room_1x.png  33b43b24  0afb75dc...   bare floor that replaces the guard room's carpet strip
  lance_rack.png     f0e12503  cf358438...   prop, 28x34
  armor_stand.png    49efabe4  111fcc16...   prop, 14x28
No image generation. Round 2 also re-lays the open floor from this room's own clean tiles (no pillars).
    python3 make_barracks.py   -> out/barracks_1x.png (+ 2x preview)
"""
import hashlib, os
import numpy as np
from PIL import Image
H = os.path.dirname(os.path.abspath(__file__))
SHA = {'guard_room_1x.png': '8ca7cff6aaff0d5d9d2e14403bf828f9c6c446f8ca20262a36541495854711dc',
       'siege_room_1x.png': '0afb75dc82335afac8127a750da4d3195c42bf2d691da7f68d8a6360099c74b8',
       'lance_rack.png': 'cf358438a843ba356ed7857ea7885e52c299b133add1919f48075d7182b15dea',
       'armor_stand.png': '111fcc1652b81856d69c6e57807c273de6ad0604d1868dc013c3d75a4f3049ba'}
def ref(n, mode):
    p = os.path.join(H, 'refs', n); b = open(p, 'rb').read()
    assert hashlib.sha256(b).hexdigest() == SHA[n], f'{n} is not the fetched reference'
    return np.array(Image.open(p).convert(mode))
guard, siege = ref('guard_room_1x.png', 'RGB'), ref('siege_room_1x.png', 'RGB')
rack, stand = ref('lance_rack.png', 'RGBA'), ref('armor_stand.png', 'RGBA')
img = guard.copy()
# 1. carpet strip -> the siege room's bare floor, pixel for pixel
img[46:215, 225:258] = siege[46:215, 225:258]
# 1b. (Kody 2026-11-17, round 2: "don't want pillars in here", "the floor looks a little odd")
#     Re-lay the open floor x38-442, y49-229 on one even grid from clean floor tiles of this same room:
#     no pillars, no rust stains, no half-shifted tiles. Edges, torch glow and wall shadow keep their pixels.
src = img.copy()
POOL_X = [51, 64, 77, 90, 155, 168, 274, 287, 300, 313, 365, 378, 391, 404]   # clean 13 px columns (no pillar, no glow)
POOL_Y = [100, 113, 126, 139, 152, 165, 178]
warm = lambda c: float((c[..., 0].astype(int) - c[..., 2].astype(int)).mean())
pool = [src[y:y + 13, x:x + 13].copy() for x in POOL_X for y in POOL_Y]
w = np.array([warm(c) for c in pool]); pool = [c for c, v in zip(pool, w) if v <= np.median(w) + 4]
def fit(c, h, wd):          # 13x13 tile -> 12 high or 14 wide by dropping or repeating its middle row/column
    if h < 13: c = np.delete(c, 6, 0)
    if wd > 13: c = np.insert(c, 6, c[:, 6], 1)
    return c
XS = list(range(38, 234, 13)) + list(range(247, 443, 13))      # 38..233 | 233..247 centre | 247..442
if XS[-1] != 442: XS.append(442)
XS = sorted(set(XS))
YS = [49, 62, 75, 88, 100, 113, 126, 139, 152, 165, 178, 191, 203, 216, 229]
rng = np.random.default_rng(7); last = {}
glow = (src[..., 0].astype(int) - src[..., 2].astype(int)) > 0
glow[:200] = False; glow[:, :180] = False; glow[:, 300:] = False     # only the two south-door torches light this area
for j in range(len(YS) - 1):
    for i in range(len(XS) - 1):
        x0, x1, y0, y1 = XS[i], XS[i + 1], YS[j], YS[j + 1]
        if glow[y0:y1, x0:x1].any(): continue                          # torch-lit tiles stay as drawn
        k = rng.integers(len(pool))
        while k in (last.get((i - 1, j)), last.get((i, j - 1))): k = rng.integers(len(pool))
        last[(i, j)] = k; img[y0:y1, x0:x1] = fit(pool[k], y1 - y0, x1 - x0)
# 2. banners: red fabric -> Lancer green (the pennant greens of the approved lance rack); gold trim and pole unchanged
BANNERS = [60, 150, 300, 390]            # x of each 30 px banner, y 4-45 (rooms/make_rooms.py)
RECOLOR = {(0x77, 0x2b, 0x47): (0x28, 0x75, 0x5a), (0x4a, 0x28, 0x35): (0x18, 0x4d, 0x40)}
for x in BANNERS:
    band = img[4:46, x:x + 30]
    for src, dst in RECOLOR.items():
        band[np.all(band == src, axis=2)] = dst
# 3. cool tint on the north wall bricks only (not banners, torches or the door arch)
WALL = np.zeros(img.shape[:2], bool); WALL[0:46, 17:208] = True; WALL[0:46, 275:465] = True
for x in BANNERS: WALL[4:46, x:x + 30] = False
for x in (110, 357): WALL[10:40, x - 2:x + 15] = False          # wall torches
f = img[WALL].astype(float); f *= (0.90, 0.95, 1.06); img[WALL] = np.clip(f, 0, 255).astype(np.uint8)
# 4. props on the wall band only, standing on the wall base (bottom row y=45), mirrored left/right
def paste(spr, x, y_bottom=45):
    h, w = spr.shape[:2]; y = y_bottom - h + 1; a = spr[..., 3] > 0
    img[y:y + h, x:x + w][a] = spr[..., :3][a]
for x, spr in ((24, rack), (480 - 24 - 28, rack[:, ::-1]), (129, stand), (480 - 129 - 14, stand[:, ::-1])):
    paste(spr, x)
os.makedirs(os.path.join(H, 'out'), exist_ok=True)
out = os.path.join(H, 'out', 'barracks_1x.png')
Image.fromarray(img).save(out, optimize=True)
Image.fromarray(img).resize((960, 540), Image.NEAREST).save(os.path.join(H, 'out', 'barracks_2x_preview.png'))
print(out, hashlib.sha256(open(out, 'rb').read()).hexdigest())
