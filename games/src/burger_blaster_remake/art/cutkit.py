"""Cut the slingshot kit pieces (Sprite Drop 51ce9bca) off its dark glow background: grow from bright paint over non-ink pixels, then add the ink ring."""
import sys, numpy as np
from PIL import Image, ImageFilter
K=None  # set by the caller (make_sprites.py) or __main__
def cut(box, ink_r=42, grow_px=11, fill=False, seedv=175):
    x0,y0,x1,y1=box; a=K[y0:y1,x0:x1].copy(); R,G,B=a[:,:,0],a[:,:,1],a[:,:,2]
    ink=(R<ink_r)&(G<ink_r)&(B<ink_r); ok=~ink
    V=a[:,:,:3].max(2); r=(V>seedv)&ok
    # flood fill (geodesic dilation) in steps
    while True:
        g=r.copy(); g[1:]|=r[:-1]; g[:-1]|=r[1:]; g[:,1:]|=r[:,:-1]; g[:,:-1]|=r[:,1:]; g&=ok
        if (g==r).all(): break
        r=g
    touch=r[0].any() or r[-1].any() or r[:,0].any() or r[:,-1].any()
    inner=Image.fromarray((r*255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(5))
    near=np.array(inner.filter(ImageFilter.MaxFilter(2*grow_px+1)))>0
    m=(np.array(inner)>0)|(near&ink)
    # smooth edge
    m=np.array(Image.fromarray((m*255).astype(np.uint8)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3)))>0
    if fill:
        o=~m; r2=np.zeros_like(o); r2[0]|=o[0]; r2[-1]|=o[-1]; r2[:,0]|=o[:,0]; r2[:,-1]|=o[:,-1]
        while True:
            g=r2.copy(); g[1:]|=r2[:-1]; g[:-1]|=r2[1:]; g[:,1:]|=r2[:,:-1]; g[:,:-1]|=r2[:,1:]; g&=o
            if (g==r2).all(): break
            r2=g
        m=~r2
    out=a.astype(np.uint8); out[:,:,3]=np.where(m,255,0); out[~m,:3]=0
    im=Image.fromarray(out); return im.crop(im.getbbox()), touch, r.mean()
if __name__=='__main__':
    K=np.array(Image.open(sys.argv[1]).convert('RGBA')).astype(int)
    boxes={'sling':(110,100,560,900),'pback':(780,100,1320,455),'pfront':(780,455,1320,780),'band':(590,810,1520,950)}
    for n,b in boxes.items():
        im,t,f=cut(b, seedv=(100 if n=='pback' else 175)); im.save(n+'.png'); print(n,im.size,'LEAK' if t else 'ok',round(f,3))
        v=Image.new('RGBA',im.size,(120,200,190,255)); v.alpha_composite(im); v.convert('RGB').save(n+'_v.jpg')

INK = (26, 16, 12)
WOOD = [(150, 74, 18), (204, 104, 22), (242, 150, 40), (255, 200, 110)]   # grain, shade, base, shine: matched to the painted wood crates
RED = [(168, 30, 24), (226, 56, 44), (255, 150, 130)]
WRAP = [(46, 26, 16), (78, 46, 28), (122, 80, 50)]   # v12b: dark leather wraps like Kody's reference picture
LEATHER = [(92, 46, 22), (132, 70, 34), (170, 98, 52), (214, 150, 100)]
def flatten(im, kind):
    """v11b: take the glossy rendered shading down to the flat 3-4 tone cartoon look of the rest of the game.
    kind: 'sling' (wood + red wraps), 'leather' (pouch halves), 'band' (red strip)"""
    from PIL import ImageFilter
    a = np.array(im).astype(int); al = a[:, :, 3] > 0; R, G, B = a[:, :, 0], a[:, :, 1], a[:, :, 2]
    mx = a[:, :, :3].max(2)
    Ys = np.array(im.convert('L').filter(ImageFilter.MedianFilter(7)).filter(ImageFilter.GaussianBlur(2))).astype(float)
    ink = al & (mx < 70); H = a.shape[0]; rows = np.arange(H)[:, None]
    cream = al & ~ink & (B > 110) & (R > 200) & (G > 160) & (kind == 'leather')
    if kind == 'sling': red = al & ~ink & (rows < 0.36 * H) & (R > 150) & (G < 0.42 * R)
    elif kind == 'band': red = al & ~ink
    else: red = np.zeros_like(al)
    red = np.array(Image.fromarray((red * 255).astype(np.uint8)).filter(ImageFilter.ModeFilter(7))) > 0
    rest = al & ~ink & ~red & ~cream
    idx = np.zeros(a.shape[:2], int); out = a.copy()
    def tone(mask, pal, cuts):
        if not mask.any(): return
        qs = np.quantile(Ys[mask], cuts); ii = np.zeros(a.shape[:2], np.uint8); ii[mask] = np.searchsorted(qs, Ys[mask]) + 1
        ii = np.array(Image.fromarray(ii).filter(ImageFilter.ModeFilter(5))); ok = mask & (ii > 0)
        col = np.array(pal)[np.clip(ii[ok].astype(int) - 1, 0, len(pal) - 1)]; o = out[ok]; o[:, :3] = col; out[ok] = o
    tone(rest, LEATHER if kind == 'leather' else WOOD, (0.04, 0.22, 0.97) if kind == 'sling' else (0.06, 0.35, 0.92)); tone(red, WRAP if kind == 'sling' else RED, (0.3, 0.93))
    if kind == 'sling':  # keep the painted grain lines and knots as thin dark strokes
        Y0 = np.array(im.convert('L').filter(ImageFilter.GaussianBlur(0.8))).astype(float)
        gr = rest & (Y0 < Ys - 20); gr = np.array(Image.fromarray((gr * 255).astype(np.uint8)).filter(ImageFilter.MedianFilter(3))) > 0
        o = out[gr]; o[:, :3] = WOOD[0]; out[gr] = o
    o = out[ink]; o[:, :3] = INK; out[ink] = o
    return Image.fromarray(out.astype(np.uint8))
