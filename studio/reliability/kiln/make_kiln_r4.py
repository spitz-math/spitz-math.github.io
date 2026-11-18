"""Ember Kiln round 4 for Rook & Ruin, built in code. No image generation.
Kody on 2026-11-18: use his own fire pit design (refs/props_r4/kody_fire_pit_source.png) for the centre fire, animated.
Round 4 = round 3's pit-free background (out/kiln_r3_bg_1x.png: walls, props, soot and coal) + the 80x68 pit from
make_fire_pit_kody.py, 8 frames, centred on x240 with its bottom row on y169 (same as round 3's pit).
    python3 make_fire_pit_kody.py && python3 make_kiln_r4.py
      -> out/kiln_r4_1x.png (frame 0), out/kiln_r4_frames/ (8 full-room frames), 2x png + gif previews
"""
import hashlib, os
import numpy as np
from PIL import Image
H = os.path.dirname(os.path.abspath(__file__))
def load(p, sha):
    p = os.path.join(H, p); assert hashlib.sha256(open(p, 'rb').read()).hexdigest() == sha, p
    return np.array(Image.open(p).convert('RGBA'))
bg = load('out/kiln_r3_bg_1x.png', '1b300e9e264fd4fafad21700020f04aa77771e43886265f5184a62ed52abded7')[..., :3]
strip = load('out/props_r4/fire_pit_kody_8frame_strip.png', '0e4dabf455d89265b65d25517cef5be2b2ce7f7aa67ed7cd0f35435b9c57c89f')
fw, fh = 80, 68
FRAMES = [strip[:, i * fw:(i + 1) * fw] for i in range(8)]
PIT_XY = (240 - fw // 2, 170 - fh)   # x200-279, y102-169
O = os.path.join(H, 'out'); os.makedirs(os.path.join(O, 'kiln_r4_frames'), exist_ok=True)
shots = []
for i, fr in enumerate(FRAMES):
    img = bg.copy(); x, y = PIT_XY; a = fr[..., 3] > 0
    img[y:y + fh, x:x + fw][a] = fr[..., :3][a]; shots.append(img)
    p = os.path.join(O, 'kiln_r4_frames', f'kiln_r4_f{i}_1x.png'); Image.fromarray(img).save(p, optimize=True)
p = os.path.join(O, 'kiln_r4_1x.png'); Image.fromarray(shots[0]).save(p, optimize=True)
print('kiln_r4_1x.png', hashlib.sha256(open(p, 'rb').read()).hexdigest())
Image.fromarray(shots[0]).resize((960, 540), Image.NEAREST).save(os.path.join(O, 'kiln_r4_2x_preview.png'))
g = [Image.fromarray(s).resize((960, 540), Image.NEAREST) for s in shots]
g[0].save(os.path.join(O, 'kiln_r4_2x_preview.gif'), save_all=True, append_images=g[1:], duration=125, loop=0)
