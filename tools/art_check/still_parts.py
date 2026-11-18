"""Animation check: the parts that must not move are identical in every frame, and frame 1 is the approved sprite.

    python3 tools/art_check/still_parts.py sheet.png --frame 48x44 [--base approved_sprite.png] [--still x,y,w,h ...]

--still regions are in frame coordinates (for a forge: the stone and the iron hood). Every pixel inside them must be
the same in every frame as in frame 1. --base: frame 1 must equal the approved sprite pixel for pixel.
Prints PASS (exit 0) or FAIL with how many pixels differ, frame by frame (exit 1). Never judges looks.
"""
import argparse, sys
import numpy as np
from PIL import Image


def load(path):
    a = np.asarray(Image.open(path).convert('RGBA')).astype(np.uint8).copy()
    a[a[..., 3] == 0] = 0
    return a


def frames(sheet, fw, fh):
    h, w = sheet.shape[:2]
    if w % fw or h % fh: raise SystemExit(f'FAIL: frame {fw}x{fh} does not divide the {w}x{h} sheet evenly')
    return [sheet[y:y + fh, x:x + fw] for y in range(0, h, fh) for x in range(0, w, fw)]


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('sheet'); ap.add_argument('--frame', required=True); ap.add_argument('--base')
    ap.add_argument('--still', action='append', default=[], help='x,y,w,h in frame coordinates')
    a = ap.parse_args(argv)
    fw, fh = (int(v) for v in a.frame.lower().split('x'))
    fr = frames(load(a.sheet), fw, fh); ok = True
    if a.base:
        b = load(a.base)
        if b.shape != fr[0].shape: print(f'FAIL base: frame 1 is {fw}x{fh}, the approved sprite is {b.shape[1]}x{b.shape[0]}'); ok = False
        else:
            d = int((fr[0] != b).any(axis=2).sum())
            print(('ok  ' if d == 0 else 'FAIL') + f' base: frame 1 vs approved sprite, {d} pixels differ'); ok &= d == 0
    for s in a.still:
        x, y, w, h = (int(v) for v in s.split(','))
        ref = fr[0][y:y + h, x:x + w]; this_ok = True
        for i, f in enumerate(fr[1:], start=2):
            d = int((f[y:y + h, x:x + w] != ref).any(axis=2).sum())
            if d: print(f'FAIL still {s}: frame {i} differs from frame 1 in {d} pixels'); this_ok = False
        if this_ok: print(f'ok   still {s}: identical in all {len(fr)} frames')
        ok &= this_ok
    print('PASS' if ok else 'FAIL')
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())
