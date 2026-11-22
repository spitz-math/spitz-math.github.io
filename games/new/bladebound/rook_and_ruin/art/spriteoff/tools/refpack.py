"""Reference pack for redraws: lineup at true game scale (feet on one line) + 4x view, with height guides."""
import re,base64,io,sys
from PIL import Image,ImageDraw
js=open('src/rr_art.js').read()
def sheet(k):
    m=re.search(r'RRART\.'+k+r'=\{fw:(\d+),fh:(\d+),px:(\d+),py:(\d+),cols:\d+,rows:\d+,src:"data:image/png;base64,([^"]+)"',js)
    fw,fh,px,py=map(int,m.groups()[:4]); im=Image.open(io.BytesIO(base64.b64decode(m.group(5)))).convert('RGBA'); return im,fw,fh,px,py
def frame(im,fw,fh,px,py,c=0,r=0): return im.crop((c*fw,r*fh,c*fw+fw,r*fh+fh)),px,py
items=[('Rook',frame(*sheet('rook_idle'))),('Goblin',frame(*sheet('gobw'))),('Skeleton knight',frame(*sheet('skelw')))]
wiz=Image.open('art/fork_refs/sheet_wizw.png').convert('RGBA'); items.append(('Wizard',(wiz.crop((0,0,56,62)),28,60)))
imp=Image.open('art/spriteoff/chat/final/impw.png').convert('RGBA'); items.append(('Ember Imp (picked)',(imp.crop((0,0,56,62)),28,60)))
lb=Image.open('art/spriteoff/worker/final/lance_w.png').convert('RGBA'); items.append(('Lancer B (too small)',(lb.crop((0,0,46,48)),23,45)))
GAP=14; W=sum(f[0].width for _,f in items)+GAP*(len(items)+1); H=110; base=90
can=Image.new('RGBA',(W,H),(30,26,34,255)); d=ImageDraw.Draw(can); x=GAP
for name,(im,px,py) in items:
    can.alpha_composite(im,(x,base-py)); x+=im.width+GAP
d.line((0,base,W,base),fill=(120,200,120,255))          # feet line
def top(i): im,px,py=items[i][1]; return base-py+im.getbbox()[1]
SK,GB=top(2),top(1); d.line((0,SK,W,SK),fill=(255,90,90,255)); d.line((0,GB,W,GB),fill=(90,140,255,255))
big=can.resize((W*4,H*4),Image.NEAREST); bd=ImageDraw.Draw(big); x=GAP
for name,(im,px,py) in items:
    bd.text((x*4,base*4+22),name,fill=(240,240,240,255)); x+=im.width+GAP
bd.text((4,SK*4-14),'red = Lancer target: as tall as the skeleton knight (%d px)'%(base-SK),fill=(255,120,120,255))
bd.text((4,GB*4-14),'blue = goblin height (%d px)'%(base-GB),fill=(140,170,255,255))
bd.text((4,base*4+6),'green = feet line',fill=(140,230,140,255))
out=sys.argv[1]; can.save(out+'/lineup_1x.png'); big.save(out+'/lineup_4x.png'); print(W,H)
