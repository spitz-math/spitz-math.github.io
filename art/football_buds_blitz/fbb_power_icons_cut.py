from PIL import Image
import numpy as np
from collections import deque
im=Image.open('big.png').convert('RGB'); a=np.array(im).astype(int)
H,W=a.shape[:2]; cw,ch=W/4,H/3
C=128; F=118
out=Image.new('RGBA',(C*4,C*3),(0,0,0,0))
for r in range(3):
  for c in range(4):
    x0,y0,x1,y1=int(c*cw),int(r*ch),int((c+1)*cw),int((r+1)*ch)
    t=a[y0:y1,x0:x1]; h,w=t.shape[:2]
    wh=(t.min(axis=2)>=232)
    bg=np.zeros((h,w),bool); q=deque()
    for i in range(h):
      for j in (0,w-1):
        if wh[i,j] and not bg[i,j]: bg[i,j]=1; q.append((i,j))
    for j in range(w):
      for i in (0,h-1):
        if wh[i,j] and not bg[i,j]: bg[i,j]=1; q.append((i,j))
    while q:
      i,j=q.popleft()
      for di,dj in ((1,0),(-1,0),(0,1),(0,-1)):
        ii,jj=i+di,j+dj
        if 0<=ii<h and 0<=jj<w and wh[ii,jj] and not bg[ii,jj]: bg[ii,jj]=1; q.append((ii,jj))
    import scipy.ndimage as nd
    fg=~bg; lab,n=nd.label(fg); sz=nd.sum(fg,lab,range(1,n+1))
    for k,v in enumerate(sz):
      m=lab==k+1
      if v<150 or m[:,0].any() or m[:,-1].any(): fg[m]=False
    bg=~fg
    al=np.where(bg,0,255).astype(np.uint8)
    rgba=np.dstack([t.astype(np.uint8),al]); tile=Image.fromarray(rgba,'RGBA')
    bb=tile.getbbox(); tile=tile.crop(bb)
    s=F/max(tile.size); tile=tile.resize((max(1,round(tile.size[0]*s)),max(1,round(tile.size[1]*s))),Image.LANCZOS)
    out.alpha_composite(tile,(c*C+(C-tile.size[0])//2, r*C+(C-tile.size[1])//2))
out.save('icons_1x.png')
# preview on dark + light
pv=Image.new('RGBA',out.size,(20,28,56,255)); pv.alpha_composite(out); pv.resize((out.size[0]*2,out.size[1]*2),Image.NEAREST).save('preview.png')
