# Merchant speech bubble v1 (ChatGPT via Task Drop task ec41f295, Sprite Drop asset 22a89043, sha256 9b46014a...)
# Sheet: 32x24 art px at 4x (128x96). 8x8 cells: columns 1-3 = 9-slice frame, column 4 row 1 = tail pointing down.
# usage: python3 make_js.py <png>  -> prints the JS for head_part.js
# (The project-files mount re-encodes PNGs, so the pixel check is what matters; the file sha is only reported.)
import sys, hashlib
from PIL import Image
b=open(sys.argv[1],'rb').read(); sha=hashlib.sha256(b).hexdigest()
sys.stderr.write('sha256 %s %s\n'%(sha,'(exact Sprite Drop bytes)' if sha.startswith('9b46014a') else '(re-encoded copy; pixels checked below)'))
im=Image.open(sys.argv[1]).convert('RGBA'); assert im.size==(128,96); px=im.load()
for by in range(0,96,4):
  for bx in range(0,128,4):
    c=px[bx,by]; assert all(px[x,y]==c for y in range(by,by+4) for x in range(bx,bx+4)), 'not a clean 4x grid'
sm=im.resize((32,24),Image.NEAREST)
keys='ABCDEFGHIJ'; pal={}
def cell(cx,cy):
  out=[]
  for y in range(cy*8,cy*8+8):
    r=''
    for x in range(cx*8,cx*8+8):
      p=sm.getpixel((x,y))
      if p[3]==0: r+='.'; continue
      assert p[3]==255
      k='#%02X%02X%02X'%p[:3]
      if k not in pal: pal[k]=keys[len(pal)]
      r+=pal[k]
    out.append(r)
  return out
cells=[cell(cx,cy) for cy in range(3) for cx in range(3)]+[cell(3,0)]
assert len(pal)<=6, pal
h=hashlib.sha256(''.join(''.join(c) for c in cells).encode()).hexdigest()[:12]
sys.stderr.write('palette %s pixel-hash %s\n'%(pal,h))
q=lambda m:'['+','.join("'%s'"%r for r in m)+']'
sys.stdout.write("  /* Merchant speech bubble v1 (ChatGPT via Task Drop task ec41f295 / Sprite Drop asset 22a89043, 2026-11-16, sha256 9b46014a...; art/merchant_bubble_v1/): exact pixels, 8x8 cells: 0-8 = 9-slice frame (TL,T,TR,L,C,R,BL,B,BR), 9 = tail pointing down. Made by art/merchant_bubble_v1/make_js.py */\n"
  "  var BBP={"+','.join("%s:'%s'"%(v,k) for k,v in pal.items())+"}, bbDraw=function(x,m){ m.forEach(function(r,j){ for(var i=0;i<r.length;i++){ var ch=r[i]; if(ch==='.') continue; x.fillStyle=BBP[ch]; x.fillRect(i,j,1,1); } }); };\n"
  "  SPR.bubble=["+','.join("mk(8,8,function(x){ bbDraw(x,"+q(m)+"); })" for m in cells)+"];\n")
