"""Pixel proof: does CHILD keep every pixel of PARENT exactly? (Same rules as Sprite Drop's proof.ts.)

    python3 tools/art_check/proof.py parent.png child.png [--parent-frames WxH] [--child-frames WxH] [--json out.json]

Pixel-preserving (exit 0): identical pixels; same visible pixels with only the empty border changed (trim, pad,
shift); a whole-number nearest-neighbour scale up or down; one frame cut out of a parent sheet; a sheet whose every
frame is the parent. Anything else (1x conversion of an illustration, recolour, redraw, new frames) exits 1:
it needs Kody's eye. Similarity is never measured here, on purpose.
"""
import argparse, json, sys
import numpy as np
from PIL import Image


def load(path):
    a = np.asarray(Image.open(path).convert('RGBA')).astype(np.uint8).copy()
    a[a[..., 3] == 0] = 0  # fully transparent pixels are the same whatever colour they carry
    return a


def bbox(a, box=None):
    x, y, w, h = box or (0, 0, a.shape[1], a.shape[0])
    vis = a[y:y + h, x:x + w, 3] > 0
    if not vis.any(): return None
    ys, xs = np.where(vis)
    return (x + int(xs.min()), y + int(ys.min()), int(xs.max() - xs.min() + 1), int(ys.max() - ys.min() + 1))


def crop(a, b): return a[b[1]:b[1] + b[3], b[0]:b[0] + b[2]]
def up(a, k): return a.repeat(k, axis=0).repeat(k, axis=1)


def relate(p, pb, c, cb):
    P, C = crop(p, pb), crop(c, cb)
    if P.shape == C.shape: return (1, 'same') if np.array_equal(P, C) else None
    (ph, pw), (ch, cw) = P.shape[:2], C.shape[:2]
    if pw > cw and pw % cw == 0 and ph % ch == 0 and pw // cw == ph // ch and np.array_equal(P, up(C, pw // cw)): return (pw // cw, 'down')
    if cw > pw and cw % pw == 0 and ch % ph == 0 and cw // pw == ch // ph and np.array_equal(C, up(P, cw // pw)): return (cw // pw, 'up')
    return None


def cells(a, f):
    if not f: return []
    fw, fh = f; h, w = a.shape[:2]
    if w % fw or h % fh: return []
    return [(x, y, fw, fh) for y in range(0, h, fh) for x in range(0, w, fw)]


def prove(p, c, pf=None, cf=None):
    if p.shape == c.shape and np.array_equal(p, c): return {'kind': 'identical', 'pixel_preserving': True}
    pb, cb = bbox(p), bbox(c)
    if not pb or not cb: return {'kind': 'none', 'pixel_preserving': False, 'why': 'a picture is fully transparent'}
    r = relate(p, pb, c, cb)
    if r: return {'kind': 'same_content' if r[1] == 'same' else 'scale', 'pixel_preserving': True, 'scale': r[0], 'direction': r[1]}
    for i, cell in enumerate(cells(p, pf)):
        fb = bbox(p, cell)
        if fb and relate(p, fb, c, cb): return {'kind': 'frame_of', 'pixel_preserving': True, 'frame': i}
    cc = cells(c, cf)
    if cc:
        match = [i for i, cell in enumerate(cc) if (fb := bbox(c, cell)) and (rr := relate(p, pb, c, fb)) and rr[1] == 'same']
        allm = len(match) == len(cc)
        return {'kind': 'sheet_of' if allm else 'none', 'pixel_preserving': allm, 'frames': len(cc), 'frames_equal_to_parent': match}
    return {'kind': 'none', 'pixel_preserving': False}


def wh(s): return tuple(int(v) for v in s.lower().split('x')) if s else None


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('parent'); ap.add_argument('child')
    ap.add_argument('--parent-frames'); ap.add_argument('--child-frames'); ap.add_argument('--json')
    a = ap.parse_args(argv)
    res = prove(load(a.parent), load(a.child), wh(a.parent_frames), wh(a.child_frames))
    print(json.dumps(res))
    if a.json: open(a.json, 'w').write(json.dumps(res, indent=2))
    return 0 if res['pixel_preserving'] else 1


if __name__ == '__main__':
    sys.exit(main())
