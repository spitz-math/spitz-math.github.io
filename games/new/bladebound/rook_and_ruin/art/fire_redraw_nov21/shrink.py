# shrink approved ChatGPT fire paintings to game sprite strips
import sys, numpy as np
from PIL import Image
D=sys.argv[1]
def frames(path):
    a=np.array(Image.open(path).convert('RGB')).astype(int)
    mag=(a[:,:,2]>110)&(a[:,:,2]>a[:,:,1]+40)
    fg=~mag; cols=np.where(fg.any(0))[0]; segs=[];s=p=cols[0]
    for c in cols[1:]:
        if c-p>40: segs.append((s,p)); s=c
        p=c
    segs.append((s,p)); out=[]
    for s,e in segs:
        sub=fg[:,s:e+1]; r=np.where(sub.any(1))[0]
        out.append((a[:,s:e+1], fg[:,s:e+1]))
    return out
def palette(path,n):
    a=np.array(Image.open(path).convert('RGB')).astype(float).reshape(-1,3)
    mag=(a[:,2]>110)&(a[:,2]>a[:,1]+40); px=a[~mag][::7]
    rng=np.random.default_rng(1); C=px[rng.choice(len(px),n,replace=False)]
    for _ in range(25):
        lab=((px[:,None]-C[None])**2).sum(2).argmin(1)
        C=np.array([px[lab==k].mean(0) if (lab==k).any() else C[k] for k in range(n)])
    return C
def shrink(rgb,fg,W,H,C):
    # common bbox handled by caller; box-average fg pixels only
    h,w=fg.shape; out=np.zeros((H,W,4),np.uint8)
    for y in range(H):
        for x in range(W):
            y0,y1=int(y*h/H),int((y+1)*h/H); x0,x1=int(x*w/W),int((x+1)*w/W)
            m=fg[y0:y1,x0:x1]
            if m.mean()<0.5: continue
            # mode-ish: centre-weighted mean of fg pixels, snapped to palette
            col=rgb[y0:y1,x0:x1][m].mean(0)
            out[y,x,:3]=C[((C-col)**2).sum(1).argmin()]; out[y,x,3]=255
    return out
def strip(path,cw,ch,fw,fh,bottom,n,name):
    C=palette(path,n); F=frames(path)
    # shared vertical bbox so flicker stays aligned on the base
    r0=min(np.where(f.any(1))[0].min() for _,f in F); r1=max(np.where(f.any(1))[0].max() for _,f in F)
    sheet=np.zeros((fh,fw*len(F),4),np.uint8)
    for i,(rgb,fg) in enumerate(F):
        c=np.where(fg.any(0))[0]
        # pad width so all frames use the same scale (centre each)
        wmax=max(f.shape[1] for _,f in F); pad=(wmax-fg.shape[1])//2
        R=np.zeros((r1-r0+1,wmax,3),int); M=np.zeros((r1-r0+1,wmax),bool)
        R[:,pad:pad+fg.shape[1]]=rgb[r0:r1+1]; M[:,pad:pad+fg.shape[1]]=fg[r0:r1+1]
        s=shrink(R,M,cw,ch,C)
        ox=i*fw+(fw-cw)//2; oy=bottom-ch+1
        sheet[oy:oy+ch,ox:ox+cw]=s
    Image.fromarray(sheet,'RGBA').save(D+'/'+name); print(name,sheet.shape)
strip(D+'/patch_big.png',int(sys.argv[2]),int(sys.argv[3]),80,48,int(sys.argv[4]),12,'fire_patch_new.png')
strip(D+'/flame_big.png',11,17,12,20,17,10,'burn_flame_new.png')
