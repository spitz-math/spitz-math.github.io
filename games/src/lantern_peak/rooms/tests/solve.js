/* Room solver: proves every room can be beaten with the real movement (rphys.js), by a best-first search over short input
   chunks (1/15 s each): run left / right / not at all, jump held or not (a new press when it goes from off to on), a dash in
   any of 8 ways. It prints the inputs it found, so the bot (tests/play) can replay them.
   node tests/solve.js            -> every room
   node tests/solve.js 3          -> room 3 only, with a trace */
const PATH=require('path'); require(PATH.join(__dirname,'../rphys.js')); require(PATH.join(__dirname,'../rlevel.js'));
const {step,fresh,room,T,PH}=globalThis.LPR, RL=globalThis.LPROOMS;
const DT=1/120, K=8;
const DIRS8=[[1,0],[-1,0],[0,-1],[0,1],[1,-1],[-1,-1],[1,1],[-1,1]];
function goalOf(R){ if(R.way) return {x:R.way.x,y:R.way.y,kind:'pt'}; if(R.lantern) return {x:R.lantern.x,y:R.lantern.y,kind:'pt'};
  if(R.exit==='up'){ let xs=[]; for(let x=1;x<31;x++) if(R.map[0][x]==='.') xs.push(x*T+T/2); return {x:xs.reduce((a,b)=>a+b,0)/xs.length,y:-20,kind:'up'}; }
  let ys=[]; for(let y=0;y<18;y++) if(R.map[y][31]==='.') ys.push(y*T+T); return {x:980,y:Math.max(...ys),kind:'right'}; }
function done(P,R,g){ if(P.exit) return true; if(g.kind==='pt') return P.onG&&Math.abs(P.x-g.x)<30&&Math.abs(P.y-g.y)<4; return false; }
function snap(R){ return { cr:JSON.stringify(R.cr), br:JSON.stringify(R.br||{}), orbs:R.orbs.map(o=>o.gone) }; }
function load(R,s){ R.cr=JSON.parse(s.cr); R.br=JSON.parse(s.br); R.orbs.forEach((o,i)=>{ if(s.orbs[i]===undefined) delete o.gone; else o.gone=s.orbs[i]; }); }
/* what the climber has in each chapter: no dash in chapter 1, one dash in chapter 2, two after the second Waystone */
function kit(def){ return { dash:def.ch>=1, maxDash:def.ch>=2?2:1 }; }
class Heap{ constructor(){ this.a=[]; } push(x){ const a=this.a; a.push(x); let i=a.length-1; while(i>0){ const p=(i-1)>>1; if(a[p].f<=a[i].f) break; [a[p],a[i]]=[a[i],a[p]]; i=p; } }
  pop(){ const a=this.a, top=a[0], last=a.pop(); if(a.length){ a[0]=last; let i=0; for(;;){ let l=2*i+1, r=l+1, m=i; if(l<a.length&&a[l].f<a[m].f) m=l; if(r<a.length&&a[r].f<a[m].f) m=r; if(m===i) break; [a[m],a[i]]=[a[i],a[m]]; i=m; } } return top; } get size(){ return this.a.length; } }
function solve(def,dash,limit,o){ o=o||{}; const K=o.K||8, maxDash=o.maxDash||1;
  const R=room(def); R.noDash=!dash; R.maxDash=maxDash; if(R.way||R.lantern) R.exit='none'; const g=goalOf(R);
  let P0=fresh(R.sx,R.sy); P0.onG=true; P0.dashN=maxDash;
  if(o.entry) P0=o.entry(R);
  const h=P=>{ const dx=Math.abs(P.x-g.x), dy=Math.max(0,P.y-g.y); return (dx*(g.kind==='up'?0.6:1)+dy*1.2)/300; };
  const H=new Heap(), seen=new Set(); H.push({P:P0,R:snap(R),t:0,jh:!!o.jh,path:[],f:h(P0)});
  let n=0;
  while(H.size&&n<limit){ const nd=H.pop(); n++;
    const acts=[]; for(const d of [-1,0,1]) for(const j of [false,true]){ acts.push({d,j,ds:null}); if(nd.P.dashOk&&dash&&nd.P.dashT<=0) for(const v of DIRS8) acts.push({d,j,ds:v}); }
    for(const a of acts){ load(R,nd.R); const P=JSON.parse(JSON.stringify(nd.P)); let t=nd.t, ok=true;
      for(let k=0;k<K;k++){ t+=DT; const u=a.ds?a.ds[1]<0:false, dn=a.ds?a.ds[1]>0:false, l=a.ds?(a.ds[0]<0):(a.d<0), r=a.ds?(a.ds[0]>0):(a.d>0);
        const inp={ l:k===0&&a.ds?l:a.d<0, r:k===0&&a.ds?r:a.d>0, u:k===0&&u, d:k===0&&dn, jumpHeld:a.j, jumpPressed:k===0&&a.j&&!nd.jh, dashPressed:k===0&&!!a.ds };
        step(P,inp,DT,R,t); if(P.dead){ ok=false; break; } if(done(P,R,g)) break; }
      if(!ok) continue; const path=nd.path.concat([a]);
      if(done(P,R,g)) return {n,path,t};
      const key=[Math.round(P.x/5),Math.round(P.y/5),Math.round(P.vx/45),Math.round(P.vy/60),P.onG?1:0,P.dashN,a.j?1:0,P.dashT>0?1:0,P.lock>0?1:0,Object.keys(JSON.parse(snap(R).cr)).length,Object.keys(R.br||{}).length,R.orbs.map(o=>o.gone===undefined?0:1).join('')].join(',');
      if(seen.has(key)) continue; seen.add(key);
      H.push({P,R:snap(R),t,jh:a.j,path,f:h(P)+path.length*0.012}); } }
  return {n,path:null}; }
/* the way you come in from the last room: running in from the left, or popping up through the floor ledge */
function entryOf(def){ const L=globalThis.LPR; if(!def.inFrom) return null;
  return R=>{ let P=fresh(0,0); P.dashN=R.maxDash; P.dashOk=!R.noDash;
    if(def.inFrom==='left'){ P.x=PH.HW+2; P.y=(def.inSpan[1]+1)*T; P.vx=PH.RUN; P.onG=true; }
    else { P.x=(def.inSpan[0]+def.inSpan[1]+1)/2*T; P.y=ROWS_PX+4; P.vy=-PH.UPBOOST; }
    return P; }; }
const ROWS_PX=18*30;
if(require.main===module){
  const only=process.argv[2]!==undefined&&process.argv[2]!=='all'?+process.argv[2]:null; let bad=0; const out=fsOld();
  /* the rooms join up: what leaves one room comes into the next */
  RL.rooms.forEach((d,i)=>{ if(!i) return; const p=RL.rooms[i-1], a=room(p), b=room(d);
    if(p.exit==='right'){ for(let y=p.exitSpan[0];y<=p.exitSpan[1];y++) if(b.map[y][0]!=='.'&&b.map[y][0]!=='S') { console.log('FAIL room '+i+' entry blocked at row '+y); bad++; }
      const fl=p.exitSpan[1]+1; if(a.map[fl][30]!=='#'||!'#=c'.includes(b.map[fl][1])) { console.log('FAIL room '+i+': no floor under the way in (row '+fl+')'); bad++; } }
    if(p.exit==='up'){ for(let x=p.exitSpan[0];x<=p.exitSpan[1];x++) if(b.map[15][x]!=='='||b.map[16][x]!=='.'||b.map[17][x]!=='.'){ console.log('FAIL room '+i+' floor gap wrong at col '+x); bad++; } } });
  RL.rooms.forEach((def,i)=>{ if(only!==null&&i!==only) return; const t0=Date.now(); const k=kit(def); const r=solve(def,k.dash,400000,{maxDash:k.maxDash});
    const ok=!!r.path; if(!ok) bad++;
    let extra='';
    const en=entryOf(def); if(en){ const re=solve(def,k.dash,400000,{maxDash:k.maxDash,entry:en,jh:def.inFrom==='down'}); if(!re.path){ bad++; extra+=' | FAIL from the way in'; } else extra+=' | from the way in ok'; }
    const easy=solve(def,k.dash,150000,{maxDash:k.maxDash,K:16}); extra+=easy.path?' | loose timing ok':' | needs tight timing';
    if(k.dash&&!def.way&&!def.lantern){ const nd=solve(def,false,60000,{maxDash:1}); if(nd.path) extra+=' | (beatable without dashing)'; }
    if(k.maxDash===2&&!def.way&&!def.lantern){ const one=solve(def,true,60000,{maxDash:1}); extra+=one.path?' | (one dash is enough)':' | needs two dashes'; }
    console.log((ok?'PASS ':'FAIL ')+'room '+i+' "'+def.name+'"'+': '+(ok?'beaten in '+(r.path.length*8/120).toFixed(1)+' s of inputs':'no way found')+' ('+r.n+' nodes, '+((Date.now()-t0)/1000).toFixed(1)+' s)'+extra);
    out[i]=r.path?r.path.map(a=>(a.d<0?'L':a.d>0?'R':'-')+(a.j?'J':'.')+(a.ds?'D'+DIRS8.findIndex(v=>v===a.ds):'')).join(' '):null; });
  out.length=RL.rooms.length;
  if(process.env.SOLVE_OUT){ require('fs').writeFileSync(process.env.SOLVE_OUT,JSON.stringify({i:only,s:out[only]})); process.exit(bad?1:0); }
  require('fs').writeFileSync(PATH.join(__dirname,'solutions.json'),JSON.stringify(out));
  console.log(bad?bad+' PROBLEMS':'ALL ROOMS BEATABLE'); process.exit(bad?1:0); }
function fsOld(){ try{ return JSON.parse(require('fs').readFileSync(PATH.join(__dirname,'solutions.json'),'utf8')); }catch(e){ return []; } }
module.exports={solve,goalOf,kit,entryOf};
