"""Draft a body-only mask for an armed sprite sheet, for a PERSON to review.

    python3 body_mask.py <sheet.png> <fw> <fh> <out_mask.png> --weapon "#rrggbb,..."
                         [--head-width 10] [--cap 2] [--top c,r,y ...] [--preview out.png]

Rule, per cell: drop the weapon colours; the body top is the first row with an
unbroken run of at least --head-width non-weapon pixels (a helmet is wide, a
spear tip is not), then up to --cap rows above it that sit over the head's
inner span (the rounded top of a helmet); everything above that row is left out. --top c,r,y sets
the top by hand for one cell. The preview paints everything left out in
magenta and prints each cell's top so a person can check it.

This is an annotation helper, not a check. The validator trusts the mask only
because a person looked at the preview and accepted it; record that in the spec
"note".
"""
import sys
import numpy as np
from PIL import Image


def hexc(s):
    return tuple(int(s[i:i + 2], 16) for i in (1, 3, 5))


def longest_run(row):
    best = cur = 0
    for v in row:
        cur = cur + 1 if v else 0
        best = max(best, cur)
    return best


def main():
    src, fw, fh, out = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4]
    arg = lambda k, d=None: sys.argv[sys.argv.index(k) + 1] if k in sys.argv else d
    weapon = [hexc(c) for c in arg('--weapon').split(',')]
    hw = int(arg('--head-width', 10))
    cap = int(arg('--cap', 2))
    tops = {}
    for i, v in enumerate(sys.argv):
        if v == '--top':
            c, r, y = map(int, sys.argv[i + 1].split(','))
            tops[(c, r)] = y
    a = np.array(Image.open(src).convert('RGBA'))
    op = a[..., 3] > 0
    wpn = np.zeros_like(op)
    for c in weapon:
        wpn |= (a[..., :3] == c).all(2)
    body = op & ~wpn
    mask = np.zeros_like(op)
    H, W = op.shape
    for r in range(H // fh):
        for c in range(W // fw):
            cell = body[r * fh:(r + 1) * fh, c * fw:(c + 1) * fw]
            if not cell.any():
                continue
            top = tops.get((c, r))
            if top is None:
                top = next((y for y in range(fh) if longest_run(cell[y]) >= hw), 0)
                xs = np.nonzero(cell[top])[0]
                x0, x1 = xs.min() + 1, xs.max() - 1           # inner span of the head row
                for _ in range(cap):                           # add the helmet's rounded cap
                    if top and cell[top - 1, x0:x1 + 1].any():
                        top -= 1
                    else:
                        break
            keep = cell.copy()
            keep[:top] = False
            mask[r * fh:(r + 1) * fh, c * fw:(c + 1) * fw] = keep
            print(f'c{c}r{r}: top y{top}' + (' (by hand)' if (c, r) in tops else ''))
    m = np.zeros((H, W, 4), np.uint8)
    m[mask] = [255, 255, 255, 255]
    Image.fromarray(m).save(out)
    if arg('--preview'):
        p = a.copy()
        p[op & ~mask] = [255, 0, 255, 255]
        Image.fromarray(p).resize((W * 5, H * 5), Image.NEAREST).save(arg('--preview'))


if __name__ == '__main__':
    main()
