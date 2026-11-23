import sys, numpy as np
from PIL import Image, ImageFilter, ImageDraw, ImageChops
d=sys.argv[1]
paint=Image.open(d+'/paint.png').convert('RGBA')
logo=Image.open(d+'/logo.png').convert('RGBA')
a=np.array(logo)[:,:,3]; ys,xs=np.where(a>20)
logo=logo.crop((xs.min(),ys.min(),xs.max()+1,ys.max()+1))
W=1536; tw=int(W*0.55)
s=tw/logo.width
logo=logo.resize((tw,round(logo.height*s)),Image.LANCZOS)
pad=60
L=Image.new('RGBA',(logo.width+2*pad,logo.height+2*pad),(0,0,0,0)); L.paste(logo,(pad,pad))
L=L.rotate(4,resample=Image.BICUBIC,expand=True)
ox,oy=30,120
la=L.split()[3]
def layer(color,alpha_img,offset=(0,0)):
    im=Image.new('RGBA',paint.size,color+(0,))
    m=Image.new('L',paint.size,0); m.paste(alpha_img,(ox+offset[0],oy+offset[1]))
    im.putalpha(m); return im
core=la.point(lambda v:255 if v>150 else 0)
# cyan rim glow
glow=core.filter(ImageFilter.MaxFilter(15)).filter(ImageFilter.GaussianBlur(22)).point(lambda v:int(v*0.55))
out=Image.alpha_composite(paint,layer((40,220,255),glow,(0,0)))
# strong dark shadow
sh=core.filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.GaussianBlur(14)).point(lambda v:int(v*0.85))
out=Image.alpha_composite(out,layer((5,3,20),sh,(10,16)))
full=Image.new('RGBA',paint.size,(0,0,0,0)); full.paste(L,(ox,oy),L)
out=Image.alpha_composite(out,full)
# streaks + sparks in front, masked off the letters
letters=Image.new('L',paint.size,0); letters.paste(la.point(lambda v:255 if v>200 else 0),(ox,oy))
keep=ImageChops.invert(letters.filter(ImageFilter.MaxFilter(7)))
fx=Image.new('RGBA',paint.size,(0,0,0,0)); dr=ImageDraw.Draw(fx)
lb=letters.getbbox(); bx0,by0,bx1,by1=lb
streaks=[((bx0-110,by1+30),(bx0+300,by1-55),3),((bx1-260,by0+20),(bx1+170,by0-70),3),((bx0-60,by1+55),(bx0+170,by1+8),2)]
for p0,p1,w in streaks:
    dr.line([p0,p1],fill=(120,240,255,255),width=w+4)
fxg=fx.filter(ImageFilter.GaussianBlur(5))
for p0,p1,w in streaks:
    ImageDraw.Draw(fxg).line([p0,p1],fill=(225,255,255,255),width=w)
dr2=ImageDraw.Draw(fxg)
rng=np.random.default_rng(7)
for cx,cy in [(bx0+300,by1-55),(bx1+170,by0-70),(bx0+10,by1-10),(bx1-30,by0+10)]:
    for _ in range(7):
        x=cx+rng.integers(-28,28); y=cy+rng.integers(-20,20); r=int(rng.integers(1,4))
        dr2.ellipse([x-r,y-r,x+r,y+r],fill=(255,200+int(rng.integers(0,55)),120,255))
fa=ImageChops.multiply(fxg.split()[3],keep); fxg.putalpha(fa)
out=Image.alpha_composite(out,fxg).convert('RGB')
out.save(d+'/star_swarm_hd_cover_1536x1024.png')
card=out.crop((0,90,1536,935)).resize((400,220),Image.LANCZOS)
card.save(d+'/star_swarm_hd_cover_400x220.png')
print(L.size,(ox,oy),'letters bbox',letters.getbbox())
