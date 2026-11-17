import sys
from PIL import Image
import numpy as np
S=sys.argv[1]
base=np.array(Image.open(f'{S}/base.png').convert('RGB')).astype(int)
H,W=base.shape[:2]
floor=np.zeros((H,W),bool); floor[46:256,17:465]=True
def prop(n,swap=None):
    a=np.array(Image.open(f'{S}/in/{n}.png').convert('RGBA')).astype(int)
    if swap:
        for k,v in swap.items():
            m=(a[...,0]==k[0])&(a[...,1]==k[1])&(a[...,2]==k[2]); a[m,:3]=v
    return a
def erase(img,x0,x1,y0=8,y1=45):
    # copy wall band columns from best-matching horizontal shift (flank match)
    best=None
    for dx in range(-200,201):
        if dx==0 or x0+dx-6<18 or x1+dx+6>460: continue
        if abs(dx)<(x1-x0+8): continue
        lo,hi=x0+dx-1,x1+dx+1
        if any(lo<=b and hi>=a for a,b in [(56,92),(146,181),(296,331),(386,421),(105,128),(352,375),(190,290)]): continue
        L=np.abs(img[y0:y1+1,x0-6:x0]-img[y0:y1+1,x0+dx-6:x0+dx]).sum()
        R=np.abs(img[y0:y1+1,x1+1:x1+7]-img[y0:y1+1,x1+dx+1:x1+dx+7]).sum()
        if best is None or L+R<best[0]: best=(L+R,dx)
    dx=best[1]; img[y0:y1+1,x0:x1+1]=img[y0:y1+1,x0+dx:x1+dx+1].copy(); return dx
def place(img,p,x,y):
    h,w=p.shape[:2]; m=p[...,3]==255
    assert not floor[y:y+h,x:x+w][m].any(), ('prop on floor',x,y)
    img[y:y+h,x:x+w][m]=p[...,:3][m]
def tint(img,mul):
    w=~floor; img[w]=np.clip(img[w]*np.array(mul),0,255).astype(int)
def soot(img,x0,x1,y0,y1):
    for y in range(y0,y1+1):
        for x in range(x0,x1+1):
            dens=(y1-y)/(y1-y0+1)  # heavier near top? soot rises: heavier near kiln top
            dens=1-dens
            if (x+y)%2==0 or dens>0.6: img[y,x]=(img[y,x]*0.72).astype(int)
BANNERS=[(60,87),(150,177),(300,327),(390,417)]
GREEN={(24,77,64):(19,66,40),(40,117,90):(36,100,51),(58,154,112):(53,134,59),(120,199,158):(53,134,59)}
# --- KILN ---
k=base.copy()
for x0,x1 in [BANNERS[0],BANNERS[3]]:
    erase(k,x0,x1)
km=prop('kiln_mouth')
for x0,x1 in [BANNERS[0],BANNERS[3]]:
    cx=(x0+x1+1)//2; place(k,km,cx-16,12)
    soot(k,cx-12,cx+11,8,11)
br=prop('wall_brazier')
for y in (70,214):
    place(k,br,1,y); place(k,br[:,::-1],465,y)
tint(k,(1.08,0.97,0.88))
Image.fromarray(k.astype(np.uint8)).save(f'{S}/room_kiln.png')
# --- BARRACKS ---
b=base.copy()
for x0,x1 in [BANNERS[0],BANNERS[3]]:
    erase(b,x0,x1)
r=b[...,0];g=b[...,1];bl=b[...,2]
for (x0,x1) in [BANNERS[1],BANNERS[2]]:
    sub=b[8:46,x0-2:x1+3]
    for k_,v in {(119,43,71):(36,100,51),(74,40,53):(19,66,40)}.items():
        m=(sub[...,0]==k_[0])&(sub[...,1]==k_[1])&(sub[...,2]==k_[2]); sub[m]=v
rk=prop('lance_rack',GREEN)
for x0,x1 in [BANNERS[0],BANNERS[3]]:
    cx=(x0+x1+1)//2; place(b,rk,cx-14,12)
ar=prop('armor_stand',GREEN)
for y in (66,210):
    place(b,ar,2,y); place(b,ar[:,::-1],465,y)
tint(b,(0.93,0.98,1.08))
Image.fromarray(b.astype(np.uint8)).save(f'{S}/room_barracks.png')
# checks
for n in ['room_kiln','room_barracks']:
    a=np.array(Image.open(f'{S}/{n}.png').convert('RGB')).astype(int)
    print(n,a.shape,'floor identical:',(a[floor]==base[floor]).all())
