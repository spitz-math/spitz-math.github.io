import sys,numpy as np
from PIL import Image
src,W,H,out=sys.argv[1],int(sys.argv[2]),int(sys.argv[3]),sys.argv[4]
a=np.array(Image.open(src).convert('RGB')).astype(float)
mag=(a[:,:,2]>110)&(a[:,:,2]>a[:,:,1]+40)&(a[:,:,0]>150)
fg=~mag;r=np.where(fg.any(1))[0];c=np.where(fg.any(0))[0]
a=a[r.min():r.max()+1,c.min():c.max()+1];fg=fg[r.min():r.max()+1,c.min():c.max()+1]
px=a[fg][::13];rng=np.random.default_rng(1);n=int(sys.argv[5]) if len(sys.argv)>5 else 8;C=px[rng.choice(len(px),n,replace=False)]
for _ in range(30):
    lab=((px[:,None]-C[None])**2).sum(2).argmin(1)
    C=np.array([px[lab==k].mean(0) if (lab==k).any() else C[k] for k in range(n)])
h,w=fg.shape;o=np.zeros((H,W,4),np.uint8)
for y in range(H):
  for x in range(W):
    y0,y1=int(y*h/H),int((y+1)*h/H);x0,x1=int(x*w/W),int((x+1)*w/W)
    m=fg[y0:y1,x0:x1]
    if m.mean()<0.45: continue
    lab=((a[y0:y1,x0:x1][m][:,None]-C[None])**2).sum(2).argmin(1)
    k=np.bincount(lab,minlength=n).argmax();o[y,x,:3]=C[k].round();o[y,x,3]=255
Image.fromarray(o).save(out)
Image.fromarray(o).resize((W*12,H*12),Image.NEAREST).save(out.replace('.png','_zoom.png'))
