"""Ember Kiln round 3 for Rook & Ruin, built in code from existing pixels. No image generation.
Kody on round 2 (kiln_r2_1x.png, 1968a87e...): make the centre fire larger, animate it, add soot and coal on the floor.
Round 3 = round 2 (see make_kiln_r2.py) with:
  - the old 64x44 fire pit removed (its box is plain Barracks floor again)
  - floor_soot_coal_overlay.png (f7b8b750, 480x270) pasted 1:1 over the floor, under every prop
  - 6 decals from floor_coal_decal_variants.png (8bb07de7, 4 x 16x16) where the overlay is thin
  - fire_pit_large_8frame_strip.png (232deb03, 8 x 88x60) as the animated pit at PIT_XY, frame 0 = fire_pit_large.png (598373ce)
All Sprite Drop task d4cb944f, checked by sha256, pasted pixel for pixel, never scaled or recoloured.
    python3 make_kiln_r3.py -> out/kiln_r3_bg_1x.png (pit-free runtime background), out/kiln_r3_1x.png (frame 0),
                               out/kiln_r3_frames/ (8 full-room frames), 2x png + gif previews
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
       'props_r3/fire_pit_large_8frame_strip.png': '8132d77e41cfe3e3596ebdd1f03ee7499def920d18f04b47aab8ffe7ceee6b7e',
       'props_r3/fire_pit_large.png': 'e4dd892a7b9c99f887f50e59b1d04c3377b0c64b0922d340ee9af962ef2ad7af',
       'props_r3/floor_soot_coal_overlay.png': '3b997164320581551a8bc7613487a7f6de074b1c1c589d060b83d0bed0731cee',
       'props_r3/floor_coal_decal_variants.png': '2f44a3621aaac3095c3d104a09077eb945bd6a7e79cfff9abd8605e6d665cf8e'}
def ref(n, mode):
    p = os.path.join(H, 'refs', n); b = open(p, 'rb').read()
    assert hashlib.sha256(b).hexdigest() == SHA[n], f'{n} is not the fetched reference'
    a = np.array(Image.open(p).convert(mode))
    if mode == 'RGBA':
        assert set(np.unique(a[..., 3])) <= {0, 255}, f'{n} has soft alpha'
    return a
barracks, guard = ref('barracks_1x.png', 'RGB'), ref('guard_room_1x.png', 'RGB')
brazier = ref('wall_brazier.png', 'RGBA')
P = {k: ref(f'props/{k}.png', 'RGBA') for k in ('forge', 'quench_barrel', 'tool_rack', 'anvil')}
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
# --- round 3: soot and coal on the floor first (under every prop), then the round 2 props without the old pit ---
STRIP = ref('props_r3/fire_pit_large_8frame_strip.png', 'RGBA')
STILL = ref('props_r3/fire_pit_large.png', 'RGBA')
OVERLAY = ref('props_r3/floor_soot_coal_overlay.png', 'RGBA')
DECALS = ref('props_r3/floor_coal_decal_variants.png', 'RGBA')
FRAMES = [STRIP[:, i * 88:(i + 1) * 88] for i in range(8)]
assert (FRAMES[0] == STILL).all(), 'frame 0 of the strip must be the still'
paste(OVERLAY, 0, 0)
# extra 16x16 coal/ash decals where the overlay is thin: in front of the forge and barrel, round the anvil, right half
DECAL_SPOTS = [(0, 100, 54), (2, 128, 58), (1, 320, 70), (3, 380, 74), (0, 405, 150), (2, 60, 215)]
for v, x, y in DECAL_SPOTS:
    paste(DECALS[:, v * 16:(v + 1) * 16], x, y)
# --- round 2 props (drawn back to front so nearer props overlap farther ones) ---
# wall gaps between banners: x90-149 (left) and x330-389 (right); wall base is y45, floor starts y46
PLACE = [('forge', 96, 52 - 44),            # 48 wide, centred in the left gap; bottom row on the floor at y51
         ('tool_rack', 346, 11),            # 28 wide, centred in the right gap; hangs on the wall, bottom y44
         ('quench_barrel', 74, 56 - 22),    # floor, left of the forge, bottom y55
         ('anvil', 347, 68 - 18)]           # floor, in front of the tool rack (clear of it), bottom y67
for name, x, y in PLACE:
    paste(P[name], x, y)
# runtime background has NO pit; the game draws the 88x60 pit sprite on top at PIT_XY, 125 ms per frame, 8 frames
PIT_XY = (240 - 44, 140 - 30)                # centred where the round 2 pit was (centre 240,140); x196-283, y110-169
O = os.path.join(H, 'out'); os.makedirs(os.path.join(O, 'kiln_r3_frames'), exist_ok=True)
bg = img.copy()
def save(a, n):
    p = os.path.join(O, n); Image.fromarray(a).save(p, optimize=True)
    print(n, hashlib.sha256(open(p, 'rb').read()).hexdigest())
save(bg, 'kiln_r3_bg_1x.png')
shots = []
for i, fr in enumerate(FRAMES):
    img = bg.copy(); paste(fr, *PIT_XY); shots.append(img)
    save(img, f'kiln_r3_frames/kiln_r3_f{i}_1x.png')
save(shots[0], 'kiln_r3_1x.png')
Image.fromarray(shots[0]).resize((960, 540), Image.NEAREST).save(os.path.join(O, 'kiln_r3_2x_preview.png'))
g = [Image.fromarray(s).resize((960, 540), Image.NEAREST) for s in shots]
g[0].save(os.path.join(O, 'kiln_r3_2x_preview.gif'), save_all=True, append_images=g[1:], duration=125, loop=0)
