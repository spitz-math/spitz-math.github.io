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
function snap(R){ return { cr:JSON.stringify(R.cr), orbs:R.orbs.map(o=>o.gone) }; }
function load(R,s){ R.cr=JSON.parse(s.cr); R.orbs.forEach((o,i)=>{ if(s.orbs[i]===undefined) delete o.gone; else o.gone=s.orbs[i]; }); }
class Heap{ constructor(){ this.a=[]; } push(x){ const a=this.a; a.push(x); let i=a.length-1; while(i>0){ const p=(i-1)>>1; if(a[p].f<=a[i].f) break; [a[p],a[i]]=[a[i],a[p]]; i=p; } }
  pop(){ const a=this.a, top=a[0], last=a.pop(); if(a.length){ a[0]=last; let i=0; for(;;){ let l=2*i+1, r=l+1, m=i; if(l<a.length&&a[l].f<a[m].f) m=l; if(r<a.length&&a[r].f<a[m].f) m=r; if(m===i) break; [a[m],a[i]]=[a[i],a[m]]; i=m; } } return top; } get size(){ return this.a.length; } }
function solve(def,dash,limit){
  const R=room(def); R.noDash=!dash; if(R.way||R.lantern) R.exit='none'; const g=goalOf(R);
  const P0=fresh(R.sx,R.sy); P0.onG=true;
  const h=P=>{ const dx=Math.abs(P.x-g.x), dy=g.kind==='right'?0:Math.max(0,P.y-g.y); return (dx*(g.kind==='up'?0.6:1)+dy*1.2)/300; };
  const H=new Heap(), seen=new Set(); H.push({P:P0,R:snap(R),t:0,jh:false,path:[],f:h(P0)});
  let n=0;
  while(H.size&&n<limit){ const nd=H.pop(); n++;
    const acts=[]; for(const d of [-1,0,1]) for(const j of [false,true]){ acts.push({d,j,ds:null}); if(nd.P.dashOk&&dash&&nd.P.dashT<=0) for(const v of DIRS8) acts.push({d,j,ds:v}); }
    for(const a of acts){ load(R,nd.R); const P=JSON.parse(JSON.stringify(nd.P)); let t=nd.t, ok=true;
      for(let k=0;k<K;k++){ t+=DT; const u=a.ds?a.ds[1]<0:false, dn=a.ds?a.ds[1]>0:false, l=a.ds?(a.ds[0]<0):(a.d<0), r=a.ds?(a.ds[0]>0):(a.d>0);
        const inp={ l:k===0&&a.ds?l:a.d<0, r:k===0&&a.ds?r:a.d>0, u:k===0&&u, d:k===0&&dn, jumpHeld:a.j, jumpPressed:k===0&&a.j&&!nd.jh, dashPressed:k===0&&!!a.ds };
        step(P,inp,DT,R,t); if(P.dead){ ok=false; break; } if(done(P,R,g)) break; }
      if(!ok) continue; const path=nd.path.concat([a]);
      if(done(P,R,g)) return {n,path,t};
      const key=[Math.round(P.x/5),Math.round(P.y/5),Math.round(P.vx/45),Math.round(P.vy/60),P.onG?1:0,P.dashOk?1:0,a.j?1:0,P.dashT>0?1:0,P.lock>0?1:0,Object.keys(JSON.parse(snap(R).cr)).length,R.orbs.map(o=>o.gone===undefined?0:1).join('')].join(',');
      if(seen.has(key)) continue; seen.add(key);
      H.push({P,R:snap(R),t,jh:a.j,path,f:h(P)+path.length*0.012}); } }
  return {n,path:null}; }
if(require.main===module){
  const only=process.argv[2]!==undefined?+process.argv[2]:null; let bad=0; const out=[];
  RL.rooms.forEach((def,i)=>{ if(only!==null&&i!==only) return; const t0=Date.now(); const dash=def.ch>=1; const r=solve(def,dash,250000);
    const ok=!!r.path; if(!ok) bad++;
    console.log((ok?'PASS ':'FAIL ')+'room '+i+' "'+def.name+'"'+(dash?' (with dash)':' (no dash)')+': '+(ok?'beaten in '+(r.path.length*K/120).toFixed(1)+' s of inputs':'no way found')+' ('+r.n+' nodes, '+((Date.now()-t0)/1000).toFixed(1)+' s)');
    if(ok&&!dash){ const r2=solve(def,true,1); }
    out.push(r.path?r.path.map(a=>(a.d<0?'L':a.d>0?'R':'-')+(a.j?'J':'.')+(a.ds?'D'+DIRS8.findIndex(v=>v===a.ds):'')).join(' '):null); });
  if(only!==null&&out[0]) console.log(out[0]);
  require('fs').writeFileSync(PATH.join(__dirname,'solutions.json'),JSON.stringify(out));
  console.log(bad?bad+' ROOMS FAILED':'ALL ROOMS BEATABLE'); process.exit(bad?1:0); }
module.exports={solve,goalOf};
