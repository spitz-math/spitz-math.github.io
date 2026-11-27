# Builds ../backs.js (window.SRBACK: {name:dataURI}) from the approved horizon sheets: each sheet holds four full-width strips that repeat sideways.
import numpy as np, json, os, sys
from PIL import Image
from cutlib import load, runs, near, uri, HERE
def strips(b64name,names):
    a=np.asarray(load(b64name)).astype(int); d=np.sqrt(((a-np.array([255,0,255]))**2).sum(2)); pure=d<45
    rows=runs((~pure).sum(1)>40,40,6); assert len(rows)==len(names),(b64name,rows); res={}
    for (y0,y1),nm in zip(rows,names):
        sub=a[y0:y1].astype(float); p=pure[y0:y1]; al=np.where(near(p,3),np.clip((d[y0:y1]-60)/90,0,1),1.0)*~p
        s=Image.fromarray(np.dstack([np.clip(sub,0,255),al*255]).astype('uint8'),'RGBA'); h=min(s.height,230); res[nm]=s.resize((round(s.width*h/s.height),h),Image.LANCZOS)
    return res
sp={}
sp.update(strips('backdrop_sheet_1.b64',['skyline','cityrow','coastline','beachrow']))
sp.update(strips('backdrop_sheet_2.b64',['mesas','canyonwall','foresthills','snowpeaks']))
res={k:uri(s,84) for k,s in sp.items()}
out=os.path.join(HERE,'..','backs.js'); open(out,'w').write('/* built by art/cutbacks.py from the approved horizon sheets. Do not edit by hand. */\nwindow.SRBACK='+json.dumps(res)+';\n'); print(len(res),'strips',os.path.getsize(out)//1024,'KB',{k:s.size for k,s in sp.items()})
if len(sys.argv)>1:
    pv=Image.new('RGBA',(1540,sum(s.height+10 for s in sp.values())),(40,36,72,255)); y=0
    for s in sp.values(): pv.alpha_composite(s,(0,y)); y+=s.height+10
    pv.convert('RGB').save(sys.argv[1])
