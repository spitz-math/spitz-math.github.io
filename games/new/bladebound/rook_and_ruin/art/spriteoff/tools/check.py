"""Same checks for every sprite-off sheet. python3 check.py <png> <kind>
kinds: imp impw impb lance_a lance_w (and refs wiz wizw wizb goba gobw)"""
import sys
from PIL import Image
SPEC={'imp':(72,63,36,62,4,2),'wiz':(72,63,36,62,4,2),'impw':(56,62,28,60,4,3),'wizw':(56,62,28,60,4,3),
      'impb':(52,62,26,60,4,1),'wizb':(52,62,26,60,4,1),'lance_a':(54,47,27,44,4,3),'goba':(54,47,27,44,4,3),
      'lance_w':(46,48,23,45,4,3),'gobw':(46,48,23,45,4,3)}
def check(path,kind):
    fw,fh,px,py,cols,rows=SPEC[kind]; im=Image.open(path).convert('RGBA'); W,H=im.size; out=[]
    ok=(W,H)==(fw*cols,fh*rows); out.append('size %dx%d %s'%(W,H,'OK' if ok else 'WANT %dx%d'%(fw*cols,fh*rows)))
    if not ok: return out
    px_=im.load(); al=set(); cols_=set()
    for y in range(H):
        for x in range(W):
            r,g,b,a=px_[x,y]; al.add(a)
            if a: cols_.add((r,g,b))
    out.append('alpha %s, colours %d'%('0/255 OK' if al<= {0,255} else 'PARTIAL %d values'%len(al),len(cols_)))
    for r in range(rows):
        cells=[]
        for c in range(cols):
            bb=im.crop((c*fw,r*fh,(c+1)*fw,(r+1)*fh)).getbbox()
            if not bb: cells.append('empty'); continue
            x0,y0,x1,y1=bb; h=y1-y0; bot=y1-1; cx=(x0+x1)/2
            flags=[]
            if abs(bot-py)>1: flags.append('feet y%d'%bot)
            if abs(cx-px)>4: flags.append('cx%+d'%round(cx-px))
            if x0==0 or y0==0 or x1==fw: flags.append('TOUCHES EDGE')
            cells.append('h%d%s'%(h,(' '+','.join(flags)) if flags else ''))
        out.append('row%d: %s'%(r,' | '.join(cells)))
    return out
if __name__=='__main__':
    for l in check(sys.argv[1],sys.argv[2]): print('  '+l)
