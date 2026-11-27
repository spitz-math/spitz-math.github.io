# Cuts the approved ChatGPT roadside sheet into sprites and writes props.js (window.SRPROPS: {name:{u:dataURI,w,h}} with w,h = size in game units).
from PIL import Image
import numpy as np, base64, io, json, sys
src=sys.argv[1]; out=sys.argv[2]
im=Image.open(src).convert('RGB'); a=np.asarray(im).astype(int)
bg=(a[:,:,0]>190)&(a[:,:,1]<110)&(a[:,:,2]>190)&(a[:,:,0]-a[:,:,1]>110); fg=~bg
def runs(v,minlen=8,gap=6):
    r=[]; s=None; last=None
    for i,x in enumerate(v):
        if x:
            if s is None: s=i
            last=i
        elif s is not None and i-last>gap: r.append((s,last+1)); s=None
    if s is not None: r.append((s,last+1))
    return [x for x in r if x[1]-x[0]>=minlen]
rows=runs(fg.sum(1)>4,40,10); print('rows',rows)
names=[['tree','pine','cactus','palm','rock','bush'],['tower','flats','pole','barrier','cone']]
H={'bush':62,'tree':210,'pine':230,'cactus':150,'palm':230,'rock':230,'tower':430,'flats':300,'pole':210,'barrier':40,'cone':22}   # height in game units
SPLIT={}
res={}; pv=Image.new('RGBA',(1500,520),(40,36,72,255)); px=6
for ri,(y0,y1) in enumerate(rows):
    cols=runs(fg[y0:y1].sum(0)>0,30,0); 
    fixed=[]
    for (x0,x1) in cols:
        if x1-x0>450:   # two objects whose edges overlap sideways: split at the thinnest column near the middle
            # flood-fill the two shapes apart, so neither keeps a piece of the other
            reg=fg[y0:y1,x0:x1].copy(); lab=np.zeros(reg.shape,int); n=0; boxes=[]
            for sy,sx in zip(*np.where(reg)):
                if lab[sy,sx]: continue
                n+=1; st=[(sy,sx)]; lab[sy,sx]=n; xs0=xs1=sx; cnt=0
                while st:
                    y,x=st.pop(); cnt+=1; xs0=min(xs0,x); xs1=max(xs1,x)
                    for dy,dx in((1,0),(-1,0),(0,1),(0,-1)):
                        yy,xx=y+dy,x+dx
                        if 0<=yy<reg.shape[0] and 0<=xx<reg.shape[1] and reg[yy,xx] and not lab[yy,xx]: lab[yy,xx]=n; st.append((yy,xx))
                boxes.append((cnt,n,xs0,xs1))
            boxes.sort(reverse=True); big=sorted(boxes[:2],key=lambda t:t[2]); print('shapes',[(c,a_,b_) for c,_,a_,b_ in big]); assert len(big)==2 and big[1][0]>3000
            for c,nn,xa,xb in big: SPLIT[(x0+xa,x0+xb+1)]=(lab==nn,x0); fixed.append((x0+xa,x0+xb+1))
        else: fixed.append((x0,x1))
    cols=fixed; print(ri,cols); assert len(cols)==len(names[ri]),len(cols)
    for (x0,x1),nm in zip(cols,names[ri]):
        m0=fg[y0:y1,x0:x1]
        if (x0,x1) in SPLIT: full,ox=SPLIT[(x0,x1)]; m0=full[:,x0-ox:x1-ox]
        m0=m0; ys=np.where(m0.any(1))[0]; sub=a[y0+ys[0]:y0+ys[-1]+1,x0:x1]; m=m0[ys[0]:ys[-1]+1]
        d=np.sqrt(((sub-np.array([255,0,255]))**2).sum(2)); al=np.clip((d-60)/90,0,1)*m
        rgb=sub.astype(float); spill=np.clip(np.minimum(rgb[:,:,0],rgb[:,:,2])-rgb[:,:,1]-20,0,255)*(al<0.999)
        if nm in('tower',): spill=spill*0   # the pink neon is real colour, keep it
        rgb[:,:,0]-=spill; rgb[:,:,2]-=spill
        s=Image.fromarray(np.dstack([np.clip(rgb,0,255),al*255]).astype('uint8'),'RGBA')
        ph=min(s.height,max(64,round(H[nm]*1.5))); s2=s.resize((round(s.width*ph/s.height),ph),Image.LANCZOS)
        b=io.BytesIO(); s2.save(b,'WEBP',quality=88,method=6)
        res[nm]={'u':'data:image/webp;base64,'+base64.b64encode(b.getvalue()).decode(),'w':round(H[nm]*s.width/s.height,1),'h':H[nm]}
        t=s2.resize((max(1,s2.width*200//s2.height),200)); pv.alpha_composite(t,(px,10+ri*250)); px=px+t.width+8 if px<1200 else 6
    px=6
open(out,'w').write('/* built by art/cutprops.py from the approved roadside sheet. Do not edit by hand. */\nwindow.SRPROPS='+json.dumps(res)+';\n'); print(len(open(out).read())//1024,'KB'); pv.save('props_preview.png')
