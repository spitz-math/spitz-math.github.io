# Cuts the approved ChatGPT car sheet into sprites and writes cars.js (window.SRCARS: data URIs). Player car is recoloured for the six garage colours.
from PIL import Image
import numpy as np, base64, io, json, sys
src=sys.argv[1]; out=sys.argv[2]
im=Image.open(src).convert('RGB'); a=np.asarray(im).astype(int)
bg=(a[:,:,0]>190)&(a[:,:,1]<110)&(a[:,:,2]>190)&(a[:,:,0]-a[:,:,1]>110)
fg=~bg
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
names=[['me','sedan','hatch','pickup','suv','cop'],['sedan_f','hatch_f','pickup_f','suv_f','cop_side']]
W={'suv':180,'suv_f':180,'me':200,'sedan':180,'hatch':180,'pickup':180,'truck':190,'cop':200,'sedan_f':180,'hatch_f':180,'pickup_f':180,'cop_side':300}
sprites={}
for ri,(y0,y1) in enumerate(rows):
    cols=runs(fg[y0:y1].sum(0)>2,40,10); print(ri,cols)
    assert len(cols)==len(names[ri]),len(cols)
    for (x0,x1),nm in zip(cols,names[ri]):
        sub=a[y0:y1,x0:x1]; ys=np.where(fg[y0:y1,x0:x1].any(1))[0]; sub=sub[ys[0]:ys[-1]+1]; m=fg[y0+ys[0]:y0+ys[-1]+1,x0:x1]
        # soft alpha from distance to magenta, and pull magenta spill out of edge pixels
        d=np.sqrt(((sub-np.array([255,0,255]))**2).sum(2)); al=np.clip((d-60)/90,0,1)*m
        rgb=sub.copy().astype(float); spill=np.clip(np.minimum(rgb[:,:,0],rgb[:,:,2])-rgb[:,:,1]-20,0,255)*(al<0.999)
        rgb[:,:,0]-=spill; rgb[:,:,2]-=spill
        rgba=np.dstack([np.clip(rgb,0,255),al*255]).astype('uint8'); sprites[nm]=Image.fromarray(rgba,'RGBA')
def shrink(s,w): return s.resize((w,round(s.height*w/s.width)),Image.LANCZOS)
def tint(s,hexc):
    c=np.array([int(hexc[i:i+2],16) for i in (1,3,5)],float); p=np.asarray(s).astype(float); r,g,b=p[:,:,0],p[:,:,1],p[:,:,2]
    mx=p[:,:,:3].max(2); mn=p[:,:,:3].min(2); lum=(r+g+b)/3
    body=(mx-mn<70)&(lum>58)&(lum<226)&(b-r>4)       # the blue-grey paint (white stripes, chrome, glass and the dark outline stay)
    k=np.clip(lum/172,0,1.15)[:,:,None]; o=p.copy(); o[:,:,:3]=np.where(body[:,:,None],np.clip(c*k,0,255),p[:,:,:3])
    if hexc=='#F4F4FA': o[:,:,:3]=np.where(((lum>=228)&(mx-mn<24))[:,:,None],np.array([255,61,180.]),o[:,:,:3])   # white car: pink stripes
    return Image.fromarray(o.astype('uint8'),'RGBA')
def uri(s):
    b=io.BytesIO(); s.save(b,'WEBP',quality=90,method=6); return 'data:image/webp;base64,'+base64.b64encode(b.getvalue()).decode()
res={}
import os,re as _re
if os.path.exists(out):   # the box truck still comes from the first sheet until the new truck sheet arrives
    old=json.loads(_re.search(r'window.SRCARS=(\{.*\});',open(out).read(),_re.S).group(1))
    if 'truck' in old: res['truck']=old['truck']
for nm,s in sprites.items():
    if nm=='me': continue
    res[nm]=uri(shrink(s,W[nm]))
CARS={'sun':'#FFD21F','red':'#FF4B4B','blue':'#3D8BFF','mint':'#3DFFB0','pink':'#FF3DB4','ghost':'#E6EAF4'}
me=shrink(sprites['me'],W['me'])
for k,c in CARS.items(): res['me_'+k]=uri(tint(me,c))
open(out,'w').write('/* built by art/cutcars.py from the approved car sheet. Do not edit by hand. */\nwindow.SRCARS='+json.dumps(res)+';\n'); print(len(open(out).read())//1024,'KB')
# preview
pv=Image.new('RGBA',(1300,520),(40,36,72,255)); x=10
for k in ['sedan','hatch','pickup','suv','cop','sedan_f','suv_f']:
    t=shrink(sprites[k],W[k]); pv.alpha_composite(t,(x,10)); x+=t.width+4
x=10
for k,c in CARS.items(): t=tint(me,c); pv.alpha_composite(t,(x,280)); x+=t.width+8
pv.save('cars_preview.png')
