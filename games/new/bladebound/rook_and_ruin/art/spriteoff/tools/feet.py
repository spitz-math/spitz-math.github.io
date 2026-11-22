"""Mechanical fix F2: move each cell's art up/down so its lowest pixel sits on the feet line. Logs every move.
python3 feet.py in out kind"""
import sys
from PIL import Image
sys.path.insert(0,__file__.rsplit('/',1)[0]); from check import SPEC
im=Image.open(sys.argv[1]).convert('RGBA'); fw,fh,px,py,cols,rows=SPEC[sys.argv[3]]; o=Image.new('RGBA',im.size); moves=[]
for r in range(rows):
    for c in range(cols):
        cell=im.crop((c*fw,r*fh,(c+1)*fw,(r+1)*fh)); bb=cell.getbbox()
        if not bb: continue
        dy=py-(bb[3]-1)
        if abs(dy)<=1: dy=0
        if bb[1]+dy<0: dy=-bb[1]; moves.append('r%dc%d clamp'%(r,c))
        if dy: moves.append('r%dc%d %+d'%(r,c,dy))
        o.alpha_composite(cell,(c*fw,r*fh+dy)) if dy>=0 else o.paste(cell.crop((0,-dy,fw,fh)),(c*fw,r*fh),cell.crop((0,-dy,fw,fh)))
print(sys.argv[2],'moves:',len([m for m in moves if 'clamp' not in m]),' '.join(moves) or 'none'); o.save(sys.argv[2])
