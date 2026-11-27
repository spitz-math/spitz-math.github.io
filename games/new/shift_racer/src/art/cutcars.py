# Builds ../cars.js (window.SRCARS: {name:dataURI}) from the approved car sheets. The player's grey car is repainted for the six garage colours.
import numpy as np, json, os, sys
from PIL import Image
from cutlib import cut, uri, sheet, HERE
sp={}
sp.update(cut('car_sheet_1.b64',[['me','sedan','hatch','pickup','suv','cop'],['sedan_f','hatch_f','pickup_f','suv_f','cop_side']]))
sp.update(cut('car_sheet_2.b64',[['truck','minivan','taxi','muscle','city','camper'],['bus','tanker','haypickup','tow','van','moto']]))
sp.update(cut('car_sheet_3.b64',[['super','lowrider','tuner','hotrod','caddy','limo'],['monster','buggy','sportbike','rally','charger','wsuv']],keepspill=('lowrider','caddy'),solid=('lowrider','caddy')))
sp.update(cut('car_sheet_4.b64',[['fire','ambulance','copsuv','garbage','schoolbus','icecream'],['taco','armored','news','mixer','rv','pizza']],keepspill=('icecream',),solid=('icecream',)))
W={'sportbike':110,'pizza':110,'monster':200,'fire':200,'garbage':200,'schoolbus':200,'mixer':200,'rv':200,'me':200,'cop':200,'cop_side':300,'truck':200,'bus':210,'tanker':200,'tow':200,'van':190,'moto':110,'city':160}   # stored width in px (others 180)
def shrink(s,w): return s.resize((w,round(s.height*w/s.width)),Image.LANCZOS)
def tint(s,hexc):
    c=np.array([int(hexc[i:i+2],16) for i in (1,3,5)],float); p=np.asarray(s).astype(float); r,g,b=p[:,:,0],p[:,:,1],p[:,:,2]
    mx=p[:,:,:3].max(2); mn=p[:,:,:3].min(2); lum=(r+g+b)/3
    body=(mx-mn<70)&(lum>58)&(lum<226)&(b-r>4)       # the blue-grey paint (white stripes, chrome, glass and the dark outline stay)
    k=np.clip(lum/172,0,1.15)[:,:,None]; o=p.copy(); o[:,:,:3]=np.where(body[:,:,None],np.clip(c*k,0,255),p[:,:,:3]); return Image.fromarray(o.astype('uint8'),'RGBA')
res={k:uri(shrink(s,W.get(k,180))) for k,s in sp.items() if k!='me'}
CARS={'sun':'#FFD21F','red':'#FF4B4B','blue':'#3D8BFF','mint':'#3DFFB0','pink':'#FF3DB4','ghost':'#E6EAF4'}
me=shrink(sp['me'],W['me'])
for k,c in CARS.items(): res['me_'+k]=uri(tint(me,c))
out=os.path.join(HERE,'..','cars.js'); open(out,'w').write('/* built by art/cutcars.py from the approved car sheets. Do not edit by hand. */\nwindow.SRCARS='+json.dumps(res)+';\n'); print(len(res),'sprites',os.path.getsize(out)//1024,'KB')
if len(sys.argv)>1: sheet(sp,[k for k in sp],sys.argv[1])
