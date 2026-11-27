# Builds ../props.js (window.SRPROPS: {name:{u:dataURI,w,h}}; w,h = size in game units) from the approved roadside sheets.
import json, os, sys
from PIL import Image
from cutlib import cut, uri, sheet, HERE
sp={}
sp.update(cut('roadside_sheet_1.b64',[['tree','pine','cactus','palm','rock','bush'],['tower','flats','pole','barrier','cone']],keepspill=('tower',)))
sp.update(cut('roadside_sheet_2.b64',[['skyscraper','hotel','diner','gas','billboard','watertower'],['autumn','deadtree','boulder','mesa','cabin','lighthouse','lamp']],keepspill=('hotel','skyscraper')))
sp.update(cut('roadside_sheet_3.b64',[['ramp','ramp_fire','boostpad','tires','barrels','toll'],['arch','signstack','donut','light','busstop','hydrant']],keepspill=('donut','signstack'),solid=('donut','signstack')))
sp.update(cut('roadside_sheet_4.b64',[['neon','carwash','garage','burger','court','graffiti'],['ferris','beachhut','lightpalm','blossom','gate','windmill']],keepspill=('neon','graffiti','blossom','ferris','court'),solid=('neon','graffiti','blossom','ferris')))
H={'ramp':80,'ramp_fire':80,'boostpad':30,'tires':70,'barrels':46,'toll':170,'arch':200,'signstack':210,'donut':190,'light':200,'busstop':120,'hydrant':46,'neon':400,'carwash':190,'garage':260,'burger':210,'court':190,'graffiti':180,'ferris':330,'beachhut':170,'lightpalm':240,'blossom':200,'gate':190,'windmill':240,'tree':210,'pine':230,'cactus':150,'palm':230,'rock':230,'bush':62,'tower':430,'flats':300,'pole':210,'barrier':40,'cone':22,
   'skyscraper':470,'hotel':330,'diner':150,'gas':170,'billboard':200,'watertower':250,'autumn':210,'deadtree':200,'boulder':70,'mesa':150,'cabin':150,'lighthouse':270,'lamp':190}   # height in game units
res={}
for nm,s in sp.items():
    ph=min(s.height,max(64,round(H[nm]*1.5))); s2=s.resize((round(s.width*ph/s.height),ph),Image.LANCZOS)
    res[nm]={'u':uri(s2),'w':round(H[nm]*s.width/s.height,1),'h':H[nm]}
out=os.path.join(HERE,'..','props.js'); open(out,'w').write('/* built by art/cutprops.py from the approved roadside sheets. Do not edit by hand. */\nwindow.SRPROPS='+json.dumps(res)+';\n'); print(len(res),'sprites',os.path.getsize(out)//1024,'KB')
if len(sys.argv)>1: sheet(sp,[k for k in sp],sys.argv[1])
