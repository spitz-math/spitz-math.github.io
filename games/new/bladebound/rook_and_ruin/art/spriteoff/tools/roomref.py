"""Room references: existing rooms the new ones sit beside, plus the guard layout with floor + pillar collision drawn on."""
import re,base64,io,sys
from PIL import Image,ImageDraw
js=open('src/rooms_art.js').read(); out=sys.argv[1]
def room(k):
    m=re.search(k+r':\{floor:(\[[^\]]*\]),rects:(\[\[.*?\]\]),.*?src:"data:image/\w+;base64,([^"]+)"',js)
    return Image.open(io.BytesIO(base64.b64decode(m.group(3)))).convert('RGBA'),eval(m.group(1)),eval(m.group(2))
ims=[]
for k in ['vault','arena','library','guard','siege']:
    im,_,_=room(k); ims.append((k,im))
W,H=ims[0][1].size; strip=Image.new('RGBA',(W*len(ims)+8*(len(ims)-1),H+16),(20,18,24,255)); d=ImageDraw.Draw(strip)
for i,(k,im) in enumerate(ims): strip.alpha_composite(im,(i*(W+8),16)); d.text((i*(W+8)+2,2),k,fill=(230,230,230,255))
strip.save(out+'/rooms_existing_strip.png')
im,fl,rects=room('guard'); im=im.copy(); d=ImageDraw.Draw(im)
d.rectangle(fl,outline=(80,255,120,255)); [d.rectangle(r,outline=(255,60,60,255),width=1) for r in rects]
im.resize((W*2,H*2),Image.NEAREST).save(out+'/room_layout_guide_2x.png'); im.save(out+'/room_layout_guide_1x.png')
print(fl,rects)
