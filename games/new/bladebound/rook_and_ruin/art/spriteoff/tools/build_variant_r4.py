"""Build a Rook & Ruin copy with one sprite-off art set. python3 build_variant.py <set dir with final/> <out dir>
Adds RRART imp/impw/impb/lancea/lancew and KROOMS kiln/barracks (guard-room layout) to a temp copy of src, then runs build.py."""
import sys, os, shutil, base64, subprocess
HERE=os.path.dirname(os.path.abspath(__file__)); SRC=os.path.abspath(os.path.join(HERE,'../../../src'))
setdir, out = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2])
tmp=SRC; keep={n:open(SRC+'/'+n).read() for n in ['rr_art.js','rooms_art.js','body_part.js','rr.js']}   # built in place; the two art files are restored after
def b64(n): return base64.b64encode(open(os.path.join(setdir,'final',n+'.png'),'rb').read()).decode()
SPEC={'imp':'fw:72,fh:63,px:36,py:62,cols:4,rows:2','impw':'fw:56,fh:62,px:28,py:60,cols:4,rows:3','impb':'fw:52,fh:62,px:26,py:60,cols:4,rows:1',
      'lancea':'fw:103,fh:107,px:27,py:87,cols:4,rows:3','lancew':'fw:53,fh:78,px:26,py:75,cols:4,rows:3'}
FILE={'imp':'imp','impw':'impw','impb':'impb','lancea':'lance_a','lancew':'lance_w'}
with open(tmp+'/rr_art.js','a') as f:
    for k,m in SPEC.items(): f.write('RRART.%s={%s,src:"data:image/png;base64,%s"};\n'%(k,m,b64(FILE[k])))
with open(tmp+'/rooms_art.js','a') as f:
    for k in ['kiln','barracks']:
        rects={'kiln':'[[204,130,276,169],[96,44,144,52],[74,46,92,56],[348,54,372,68]]'}.get(k,'[]')
        f.write('KROOMS.%s={floor:KROOMS.guard.floor,rects:%s,torches:[],arch:true,south:true,src:"data:image/png;base64,%s"};\n'%(k,rects,b64('room_'+k)))
    f.write('window.KANIM={kiln:{x:200,y:102,fw:80,fh:68,n:8,ms:125,im:new Image()}};KANIM.kiln.im.src="data:image/png;base64,%s";\n'%b64('kiln_pit'))
rj=open(tmp+'/rr.js').read()
for a,b in [('lancea:19,lancew:19','lancea:22,lancew:22'),('imp:50,lance:44}','imp:50,lance:56}')]:
    assert rj.count(a)==1, a; rj=rj.replace(a,b)
open(tmp+'/rr.js','w').write(rj)   # new Lancer is skeleton-knight size: taller health bar spot, wider shadow
bp=open(tmp+'/body_part.js').read(); OLD='c.drawImage(ROOMC,0,0); var R=ROOMS[w.rid], i, p=w.p;'
assert bp.count(OLD)==1
bp=bp.replace(OLD,OLD+' if(ROOMART&&window.KANIM&&KANIM[ROOMART.key]&&KANIM[ROOMART.key].im.complete){ var ka=KANIM[ROOMART.key], kf=(typeof RM!=="undefined"&&RM)?0:Math.floor(performance.now()/ka.ms)%ka.n; c.imageSmoothingEnabled=false; c.drawImage(ka.im,kf*ka.fw,0,ka.fw,ka.fh,ka.x*2,ka.y*2,ka.fw*2,ka.fh*2); }')
open(tmp+'/body_part.js','w').write(bp)
try:
    subprocess.run(['python3','build.py'],cwd=tmp,check=True,stdout=subprocess.DEVNULL); shutil.rmtree(out,ignore_errors=True); shutil.copytree(tmp+'/out',out)
finally:
    for n,v in keep.items(): open(SRC+'/'+n,'w').write(v)
print('built',out)
