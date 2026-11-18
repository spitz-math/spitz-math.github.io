"""Fire pit from Kody's own design (the picture he sent on 2026-11-18, refs/props_r4/kody_fire_pit_source.png),
turned into true-1x pixel art and animated in code. No image generation.
  1. crop the pit (x300-1205, y60-845) and take the median colour of the middle of each 11x11 source block -> 82x71
  2. background and the soft glow become transparent: the pit = convex hull of the rim stones, plus bright flame pixels
     outside it; haze inside the hull above the back rim is dropped; a 1 px 181824 outline round the stone/coal body
  3. every pixel snapped to the 14-colour palette of the round 3 pit (same outline, stones and flame ramp as the room)
  4. 8 frames: flame tongues sway (up to 1.8 px at the tips) and stretch up to 7 percent, tips dim on the low half of
     the cycle, coal embers twinkle, 6 sparks rise. Rim and coal bed never move. Frame 0 is the still.
    python3 make_fire_pit_kody.py -> out/props_r4/fire_pit_kody.png (still) + fire_pit_kody_8frame_strip.png
"""
import hashlib, os, numpy as np
from PIL import Image, ImageDraw
import scipy.ndimage as nd
from scipy.spatial import ConvexHull
from collections import deque
H_=os.path.dirname(os.path.abspath(__file__))
SRC=os.path.join(H_,'refs','props_r4','kody_fire_pit_source.png')
assert hashlib.sha256(open(SRC,'rb').read()).hexdigest()=='b8e08fd49a11d49c096057f48adf224dd53637d458f5fda5cc6de5277defd82d'
a=np.array(Image.open(SRC).convert('RGB')).astype(int)
f=11.0
X0,Y0,X1,Y1=300,60,1205,845
W=int(round((X1-X0)/f)); H=int(round((Y1-Y0)/f))
out=np.zeros((H,W,3),int)
for j in range(H):
    for i in range(W):
        x0=X0+i*f; y0=Y0+j*f
        blk=a[int(y0+f*.3):int(y0+f*.7)+1, int(x0+f*.3):int(x0+f*.7)+1].reshape(-1,3)
        out[j,i]=np.median(blk,0)
H,W=out.shape[:2]
H,W=out.shape[:2]
R,G,B=out[...,0],out[...,1],out[...,2]; L=out.max(-1); mn=out.min(-1)
stone=(B>=R)&(L>=70)&(L<=175)&((L-mn)<70)
lab,n=nd.label(stone); sz=nd.sum(stone,lab,range(1,n+1))
stone=np.isin(lab,1+np.where(sz>=6)[0])
ys,xs=np.nonzero(stone); pts=np.c_[xs,ys]
hull=ConvexHull(pts); poly=[tuple(map(float,pts[v])) for v in hull.vertices]
m=Image.new('L',(W,H),0); ImageDraw.Draw(m).polygon(poly,fill=255,outline=255)
inside=np.array(m)>0
glow=(R>G*3)&(G<40)&(B<60)
flame=(R>=150)&(G>=40)&~glow
obj=inside|flame
# inside hull but above the back rim: drop haze cells (glow or very dark) connected to outside
haze=glow|(L<35)
cand=haze&inside
# rows above the topmost stone row at that column region: treat as removable
topstone=np.full(W,-5)
for x in range(W):
    c=np.nonzero(inside[:,x])[0]
    if len(c): topstone[x]=c.min()+1
rm=np.zeros_like(cand)
for x in range(W): rm[:topstone[x]+2,x]=cand[:topstone[x]+2,x]
obj&=~rm
lab,n=nd.label(obj); sz=nd.sum(obj,lab,range(1,n+1)); main=lab==(np.argmax(sz)+1)
spark=obj&~main&(G>=60)&(R>=180)
obj=main|spark
ring=nd.binary_dilation(main,structure=np.array([[0,1,0],[1,1,1],[0,1,0]]))&~obj
# no outline on flame tops (fire has no outline in this style): only outline next to stone/coal
near_body=nd.binary_dilation(main&~flame,iterations=1)
outline=ring&near_body
PAL=['181824','1f1929','201d2b','403951','554b6d','6a5c85','7c6992','772c27','b9331f','e5421b','f8701a','ff9720','ffc431','ffeb75']
P=np.array([[int(c[k:k+2],16) for k in (0,2,4)] for c in PAL])
d=((out[:,:,None,:]-P[None,None])**2*np.array([3,4,2])).sum(-1); idx=d.argmin(-1)
rgba=np.zeros((H,W,4),np.uint8); rgba[...,:3]=P[idx]; rgba[...,3]=np.where(obj|outline,255,0); rgba[outline,:3]=(0x18,0x18,0x24)
ys,xs=np.nonzero(rgba[...,3]); rgba=rgba[ys.min():ys.max()+1, xs.min():xs.max()+1]
S=rgba
H,W=S.shape[:2]
H,W=S.shape[:2]
hexs=lambda c:tuple(int(c[k:k+2],16) for k in (0,2,4))
RAMP=[hexs(c) for c in ['772c27','b9331f','e5421b','f8701a','ff9720','ffc431','ffeb75']]
STONE=[hexs(c) for c in ['403951','554b6d','6a5c85','7c6992']]
COAL=hexs('201d2b'); COAL2=hexs('1f1929')
op=S[...,3]>0
def isin(cols):
    m=np.zeros((H,W),bool)
    for c in cols: m|=np.all(S[...,:3]==c,-1)
    return m&op
fire=isin(RAMP)
lab,n=nd.label(fire,structure=np.ones((3,3)))
sz=nd.sum(fire,lab,range(1,n+1))
big=np.isin(lab,1+np.where(sz>=12)[0])
# main body hull (non-fire opaque) to know what's "inside the pit"
body=op&~fire
ins=nd.binary_fill_holes(nd.binary_closing(op,iterations=2))
coalbed_top=np.array([np.nonzero(body[:,x])[0].min() if body[:,x].any() else H for x in range(W)])
tongue=big
ember=fire&~big
# loose sparks = small fire comps that are outside the pit body region (above it)
spark=ember&(np.arange(H)[:,None]<coalbed_top[None,:])
ember&=~spark
stone=isin(STONE)
rimfront=stone&(np.arange(H)[:,None]>=22)
# base without tongues/sparks: inside pit -> coal, outside -> transparent
base=S.copy()
hole=tongue|spark
for y,x in zip(*np.nonzero(hole)):
    if y>=coalbed_top[x] and ins[y,x]:
        base[y,x,:3]=COAL if (x+y)%3 else COAL2; base[y,x,3]=255
    else:
        base[y,x]=0
ys=np.nonzero(tongue)[0]; top,bot=ys.min(),ys.max()
level=np.full((H,W),-1)
for i,c in enumerate(RAMP): level[np.all(S[...,:3]==c,-1)&tongue]=i
rng=np.random.RandomState(7); noise=rng.rand(H,W)
F=8; frames=[]
SPARKS=[(18,0),(30,3),(44,5),(55,2),(64,6),(37,1)]
for t in range(F):
    ph=2*np.pi*t/F
    img=base.copy()
    s=1.0+0.07*np.sin(ph)   # height breathing
    for y in range(H):
        for x in range(W):
            h=(bot-y)              # height above flame base
            if h<0: continue
            # inverse map: source row stretched about base, source col swayed
            sy=bot-h/s
            A=1.8*min(1,max(0,h)/(bot-top+1))**1.2
            phi=y*0.45+(x//9)*1.3
            sx=x-A*(np.sin(ph+phi)-np.sin(phi))
            iy,ix=int(round(sy)),int(round(sx))
            if not(0<=iy<H and 0<=ix<W) or level[iy,ix]<0: continue
            if rimfront[y,x] and not tongue[y,x]: continue
            lv=level[iy,ix]
            # flicker: shift brightness one step by noise, top of flame darker on some frames
            # gentle flicker: the tips (top third) dim one step on the 'shrinking' half of the cycle
            if h>(bot-top)*0.66 and np.sin(ph)<-0.5 and lv>0: lv-=1
            img[y,x,:3]=RAMP[lv]; img[y,x,3]=255
    # embers twinkle
    for y,x in zip(*np.nonzero(ember)):
        lv=[i for i,c in enumerate(RAMP) if tuple(S[y,x,:3])==c][0]
        k=np.sin(ph+noise[y,x]*6.28)
        img[y,x,:3]=RAMP[max(0,min(6,lv+(1 if k>0.6 else -1 if k<-0.6 else 0)))]
    # rising sparks
    for sx0,p in SPARKS:
        u=((t+p)%F)/F
        y=int(round(top+6-u*14)); x=int(round(sx0+1.5*np.sin(ph+p)))
        if 0<=y<H and 0<=x<W and img[y,x,3]==0:
            img[y,x,:3]=RAMP[5] if u<0.35 else RAMP[3] if u<0.7 else RAMP[1]; img[y,x,3]=255
    frames.append(img)
OUT=os.path.join(H_,'out','props_r4'); os.makedirs(OUT,exist_ok=True)
assert all(set(np.unique(f[...,3]))<={0,255} for f in frames)
Image.fromarray(S).save(os.path.join(OUT,'fire_pit_kody.png'),optimize=True)
Image.fromarray(np.concatenate(frames,1)).save(os.path.join(OUT,'fire_pit_kody_8frame_strip.png'),optimize=True)
for n in ('fire_pit_kody.png','fire_pit_kody_8frame_strip.png'):
    print(n, Image.open(os.path.join(OUT,n)).size, hashlib.sha256(open(os.path.join(OUT,n),'rb').read()).hexdigest())
