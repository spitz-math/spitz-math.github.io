"""Give the Imp back frames the front's exact colours: every back pixel is matched to the approved front sheet's
palette by brightness rank inside its colour family (dark body / fire), then snapped to the nearest front colour.
python3 recolor.py imp_front.png impw_in.png impb_in.png outdir"""
import sys, numpy as np
from PIL import Image
front = np.array(Image.open(sys.argv[1]).convert('RGBA'))
fp = front[front[..., 3] > 0][:, :3].astype(float)
def fam(c): return (c[:, 0] - c[:, 2] > 60) & (c[:, 0] > 120)          # fire / glow family
def lum(c): return c @ np.array([0.299, 0.587, 0.114])
FAM = {f: fp[fam(fp) == f] for f in (False, True)}
def remap(px):
    out = px.copy().astype(float); f = fam(px)
    for v in (False, True):
        sel = f == v
        if not sel.any(): continue
        src = lum(px[sel]); ref = np.sort(lum(FAM[v]))
        rank = src.argsort().argsort() / max(1, sel.sum() - 1)        # brightness rank 0..1
        target = ref[np.clip((rank * (len(ref) - 1)).round().astype(int), 0, len(ref) - 1)]
        pal = np.unique(FAM[v], axis=0); pl = lum(pal)
        # nearest front colour of this family, weighting brightness match most
        d = (pl[None] - target[:, None]) ** 2 * 4 + ((pal[None] - px[sel][:, None]) ** 2).sum(2) * 0.05
        out[sel] = pal[d.argmin(1)]
    return out.astype(np.uint8)
def fix(path, rows, outp):
    a = np.array(Image.open(path).convert('RGBA'))
    reg = a[rows[0]:rows[1]]; al = reg[..., 3] > 0
    reg[al, :3] = remap(reg[al, :3].astype(float)); a[rows[0]:rows[1]] = reg
    Image.fromarray(a).save(outp, optimize=True)
fix(sys.argv[2], (124, 186), sys.argv[4] + '/impw.png')               # only the back row of the hover sheet
fix(sys.argv[3], (0, 62), sys.argv[4] + '/impb.png')
