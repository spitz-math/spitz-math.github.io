"""Add the front sheet's dark 1 px outline around the Imp back frames (Kody: back missing the darker outline).
Outline colour = the most common dark colour on the approved front sprite's outer edge. Done per frame cell.
python3 outline.py imp_front.png impw_in.png impb_in.png outdir"""
import sys, numpy as np
from PIL import Image
from scipy import ndimage
f = np.array(Image.open(sys.argv[1]).convert('RGBA')); al = f[..., 3] > 0
edge = al & ~ndimage.binary_erosion(al)
c = f[edge][:, :3]; dark = c[c.max(1) < 60]
v, n = np.unique(dark, axis=0, return_counts=True); OUT = v[n.argmax()]
print('outline colour', OUT, 'share of front edge that is this dark', round(len(dark) / len(c), 2))
def add(path, rows, fw, fh, outp, skip=()):
    a = np.array(Image.open(path).convert('RGBA'))
    for y0 in range(rows[0], rows[1], fh):
        for x0 in range(0, a.shape[1], fw):
            if x0 // fw in skip: continue                         # the front's smoke puff has no outline either
            cell = a[y0:y0 + fh, x0:x0 + fw]; m = cell[..., 3] > 0
            ring = ndimage.binary_dilation(m, structure=[[0, 1, 0], [1, 1, 1], [0, 1, 0]]) & ~m
            cell[ring, :3] = OUT; cell[ring, 3] = 255
    Image.fromarray(a).save(outp, optimize=True)
add(sys.argv[2], (124, 186), 56, 62, sys.argv[4] + '/impw.png')
add(sys.argv[3], (0, 62), 52, 62, sys.argv[4] + '/impb.png', skip=(2,))
