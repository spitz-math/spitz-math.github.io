"""Nearest-neighbour 4x -> 1x (sample block centre). python3 down4.py in out"""
import sys
from PIL import Image
im=Image.open(sys.argv[1]).convert('RGBA'); W,H=im.size; assert W%4==0 and H%4==0
o=Image.new('RGBA',(W//4,H//4)); a=im.load(); b=o.load()
bad=0
for y in range(H//4):
    for x in range(W//4):
        p=a[x*4+1,y*4+1]; b[x,y]=p
        if any(a[x*4+i,y*4+j]!=p for i in range(4) for j in range(4)): bad+=1
o.save(sys.argv[2]); print(sys.argv[2],'mixed blocks',bad)
