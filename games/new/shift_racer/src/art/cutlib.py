# Shared cutter for the approved ChatGPT sheets (magenta background): finds each object, pulls the magenta out of its edge, returns RGBA images by name.
from PIL import Image
import numpy as np, base64, io, os
HERE=os.path.dirname(os.path.abspath(__file__))
def load(b64name): return Image.open(io.BytesIO(base64.b64decode(open(os.path.join(HERE,b64name)).read()))).convert('RGB')
def runs(v,minlen=8,gap=6):
    r=[]; s=None; last=None
    for i,x in enumerate(v):
        if x:
            if s is None: s=i
            last=i
        elif s is not None and i-last>gap: r.append((s,last+1)); s=None
    if s is not None: r.append((s,last+1))
    return [x for x in r if x[1]-x[0]>=minlen]
def shapes(reg):   # flood fill: label every connected shape
    lab=np.zeros(reg.shape,int); n=0; out=[]
    for sy,sx in zip(*np.where(reg)):
        if lab[sy,sx]: continue
        n+=1; st=[(sy,sx)]; lab[sy,sx]=n; xa=xb=sx; cnt=0
        while st:
            y,x=st.pop(); cnt+=1; xa=min(xa,x); xb=max(xb,x)
            for dy,dx in((1,0),(-1,0),(0,1),(0,-1)):
                yy,xx=y+dy,x+dx
                if 0<=yy<reg.shape[0] and 0<=xx<reg.shape[1] and reg[yy,xx] and not lab[yy,xx]: lab[yy,xx]=n; st.append((yy,xx))
        out.append((cnt,n,xa,xb))
    return lab,out
def cut(b64name,names,keepspill=()):
    im=load(b64name); a=np.asarray(im).astype(int)
    bg=(a[:,:,0]>190)&(a[:,:,1]<110)&(a[:,:,2]>190)&(a[:,:,0]-a[:,:,1]>110); fg=~bg
    rows=runs(fg.sum(1)>4,40,10); assert len(rows)==len(names),(b64name,rows); res={}
    for ri,(y0,y1) in enumerate(rows):
        cols=runs(fg[y0:y1].sum(0)>0,24,0); items=[(x0,x1,None) for x0,x1 in cols]
        if len(items)!=len(names[ri]):   # two objects overlap sideways: take the biggest connected shapes instead
            lab,sh=shapes(fg[y0:y1]); sh=sorted(sorted(sh,reverse=True)[:len(names[ri])],key=lambda t:t[2]); items=[(xa,xb+1,lab==n) for c,n,xa,xb in sh]
        assert len(items)==len(names[ri]),(b64name,ri,len(items))
        for (x0,x1,mask),nm in zip(items,names[ri]):
            m0=(mask if mask is not None else fg[y0:y1])[:,x0:x1]; ys=np.where(m0.any(1))[0]; sub=a[y0+ys[0]:y0+ys[-1]+1,x0:x1]; m=m0[ys[0]:ys[-1]+1]
            d=np.sqrt(((sub-np.array([255,0,255]))**2).sum(2)); al=np.clip((d-60)/90,0,1)*m
            rgb=sub.astype(float); spill=np.clip(np.minimum(rgb[:,:,0],rgb[:,:,2])-rgb[:,:,1]-20,0,255)*(al<0.999)
            if nm not in keepspill: rgb[:,:,0]-=spill; rgb[:,:,2]-=spill
            res[nm]=Image.fromarray(np.dstack([np.clip(rgb,0,255),al*255]).astype('uint8'),'RGBA')
    return res
def uri(s,q=88):
    b=io.BytesIO(); s.save(b,'WEBP',quality=q,method=6); return 'data:image/webp;base64,'+base64.b64encode(b.getvalue()).decode()
def sheet(sprites,order,path,h=150,per=9):
    rows=(len(order)+per-1)//per; pv=Image.new('RGBA',(per*190,rows*(h+12)),(40,36,72,255))
    for i,k in enumerate(order):
        s=sprites[k]; t=s.resize((max(1,min(184,s.width*h//s.height)),h)); pv.alpha_composite(t,((i%per)*190+3,(i//per)*(h+12)+6))
    pv.convert('RGB').save(path)
