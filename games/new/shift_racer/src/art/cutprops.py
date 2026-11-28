# Builds ../props.js (window.SRPROPS: {name:{u:dataURI,w,h}}; w,h = size in game units) from the approved roadside sheets.
import json, os, sys
from PIL import Image
from cutlib import cut, uri, sheet, HERE
sp={}
sp.update(cut('roadside_sheet_1.b64',[['tree','pine','cactus','palm','rock','bush'],['tower','flats','pole','barrier','cone']],keepspill=('tower',)))
sp.update(cut('roadside_sheet_2.b64',[['skyscraper','hotel','diner','gas','billboard','watertower'],['autumn','deadtree','boulder','mesa','cabin','lighthouse','lamp']],keepspill=('hotel','skyscraper')))
sp.update(cut('roadside_sheet_3.b64',[['ramp','ramp_fire','boostpad','tires','barrels','toll'],['arch','signstack','donut','light','busstop','hydrant']],keepspill=('donut','signstack'),solid=('donut','signstack')))
sp.update(cut('roadside_sheet_4.b64',[['neon','carwash','garage','burger','court','graffiti'],['ferris','beachhut','lightpalm','blossom','gate','windmill']],keepspill=('neon','graffiti','blossom','ferris','court'),solid=('neon','graffiti','blossom','ferris')))
SPANS=['overpass','tunnel','gantry','bridge','neongate','railbridge','footbridge','covered']; FLY=['copter','newscopter','blimp','bannerplane','balloon','gulls','jet','fireworks']   # gulls: the cutter keeps one bird; the flock stays code-drawn
sp.update(cut('roadside_sheet_5.b64',[SPANS[:4],SPANS[4:]],keepspill=('neongate','overpass'),solid=('neongate',)))   # things the road runs under: the middle opening is keyed out
sp.update(cut('sky_sheet_1.b64',[FLY[:4],FLY[4:]],keepspill=('fireworks','copter'),solid=('fireworks',)))   # things in the sky
H={'ramp':80,'ramp_fire':80,'boostpad':30,'tires':70,'barrels':46,'toll':170,'arch':200,'signstack':170,'donut':190,'light':140,'busstop':105,'hydrant':30,'neon':400,'carwash':215,'garage':260,'burger':240,'court':190,'graffiti':180,'ferris':330,'beachhut':170,'lightpalm':240,'blossom':200,'gate':190,'windmill':240,'tree':210,'pine':230,'cactus':150,'palm':230,'rock':230,'bush':62,'tower':430,'flats':300,'pole':210,'barrier':40,'cone':22,
   'skyscraper':470,'hotel':330,'diner':190,'gas':190,'billboard':200,'watertower':250,'autumn':210,'deadtree':200,'boulder':70,'mesa':150,'cabin':150,'lighthouse':270,'lamp':150}   # height in game units
import numpy as np
for nm in SPANS: H[nm]=400
for nm in FLY: H[nm]=100
def opening(s):   # the share of a gateway's width that is open road, measured across its lower third
    al=np.asarray(s)[:,:,3]; band=al[int(s.height*0.62):int(s.height*0.94)]; solid=(band>40).mean(0)>0.12; best=(0,0); st=None
    for i,v in enumerate(list(solid)+[True]):
        if not v and st is None: st=i
        elif v and st is not None:
            if st>s.width*0.08 and i<s.width*0.92 and i-st>best[1]-best[0]: best=(st,i)
            st=None
    return round((best[1]-best[0])/s.width,3), round((best[0]+best[1])/2/s.width,3)
res={}
for nm,s in sp.items():
    ph=min(s.height,max(64,round(H[nm]*1.5))); s2=s.resize((round(s.width*ph/s.height),ph),Image.LANCZOS)
    res[nm]={'u':uri(s2),'w':round(H[nm]*s.width/s.height,1),'h':H[nm]}
    if nm in SPANS: res[nm]['o'],res[nm]['oc']=opening(s); print(nm,res[nm]['o'],res[nm]['oc'],s.size)
out=os.path.join(HERE,'..','props.js'); open(out,'w').write('/* built by art/cutprops.py from the approved roadside sheets. Do not edit by hand. */\nwindow.SRPROPS='+json.dumps(res)+';\n'); print(len(res),'sprites',os.path.getsize(out)//1024,'KB')
if len(sys.argv)>1: sheet(sp,[k for k in sp],sys.argv[1])
