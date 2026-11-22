"""Build a Rook & Ruin copy with one sprite-off art set. python3 build_variant.py <set dir with final/> <out dir>
Adds RRART imp/impw/impb/lancea/lancew and KROOMS kiln/barracks (guard-room layout) to a temp copy of src, then runs build.py."""
import sys, os, shutil, base64, subprocess
HERE=os.path.dirname(os.path.abspath(__file__)); SRC=os.path.abspath(os.path.join(HERE,'../../../src'))
setdir, out = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2])
tmp=SRC; keep={n:open(SRC+'/'+n).read() for n in ['rr_art.js','rooms_art.js']}   # built in place; the two art files are restored after
def b64(n): return base64.b64encode(open(os.path.join(setdir,'final',n+'.png'),'rb').read()).decode()
SPEC={'imp':'fw:72,fh:63,px:36,py:62,cols:4,rows:2','impw':'fw:56,fh:62,px:28,py:60,cols:4,rows:3','impb':'fw:52,fh:62,px:26,py:60,cols:4,rows:1',
      'lancea':'fw:54,fh:47,px:27,py:44,cols:4,rows:3','lancew':'fw:46,fh:48,px:23,py:45,cols:4,rows:3'}
FILE={'imp':'imp','impw':'impw','impb':'impb','lancea':'lance_a','lancew':'lance_w'}
with open(tmp+'/rr_art.js','a') as f:
    for k,m in SPEC.items(): f.write('RRART.%s={%s,src:"data:image/png;base64,%s"};\n'%(k,m,b64(FILE[k])))
with open(tmp+'/rooms_art.js','a') as f:
    for k in ['kiln','barracks']:
        f.write('KROOMS.%s={floor:KROOMS.guard.floor,rects:KROOMS.guard.rects,torches:[],arch:true,south:true,src:"data:image/png;base64,%s"};\n'%(k,b64('room_'+k)))
try:
    subprocess.run(['python3','build.py'],cwd=tmp,check=True,stdout=subprocess.DEVNULL); shutil.rmtree(out,ignore_errors=True); shutil.copytree(tmp+'/out',out)
finally:
    for n,v in keep.items(): open(SRC+'/'+n,'w').write(v)
print('built',out)
