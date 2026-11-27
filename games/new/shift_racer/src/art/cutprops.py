# Builds ../props.js (window.SRPROPS: {name:{u:dataURI,w,h}}; w,h = size in game units) from the approved roadside sheets.
import json, os, sys
from PIL import Image
from cutlib import cut, uri, sheet, HERE
sp={}
sp.update(cut('roadside_sheet_1.b64',[['tree','pine','cactus','palm','rock','bush'],['tower','flats','pole','barrier','cone']],keepspill=('tower',)))
sp.update(cut('roadside_sheet_2.b64',[['skyscraper','hotel','diner','gas','billboard','watertower'],['autumn','deadtree','boulder','mesa','cabin','lighthouse','lamp']],keepspill=('hotel','skyscraper')))
H={'tree':210,'pine':230,'cactus':150,'palm':230,'rock':230,'bush':62,'tower':430,'flats':300,'pole':210,'barrier':40,'cone':22,
   'skyscraper':470,'hotel':330,'diner':150,'gas':170,'billboard':200,'watertower':250,'autumn':210,'deadtree':200,'boulder':70,'mesa':150,'cabin':150,'lighthouse':270,'lamp':190}   # height in game units
res={}
for nm,s in sp.items():
    ph=min(s.height,max(64,round(H[nm]*1.5))); s2=s.resize((round(s.width*ph/s.height),ph),Image.LANCZOS)
    res[nm]={'u':uri(s2),'w':round(H[nm]*s.width/s.height,1),'h':H[nm]}
out=os.path.join(HERE,'..','props.js'); open(out,'w').write('/* built by art/cutprops.py from the approved roadside sheets. Do not edit by hand. */\nwindow.SRPROPS='+json.dumps(res)+';\n'); print(len(res),'sprites',os.path.getsize(out)//1024,'KB')
if len(sys.argv)>1: sheet(sp,[k for k in sp],sys.argv[1])
