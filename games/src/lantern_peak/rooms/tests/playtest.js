/* Sloppy-player playtest: replays the solver's inputs for each room many times with human-like timing slop
   (every input starts up to J frames early or late, at 120 frames a second; no drift builds up), and counts
   how often the run still clears the room. Low = the room needs tight timing; a kid will die a lot there.
   node tests/playtest.js [trials=300]   (reads tests/solutions.json; rooms are solved from their start) */
const PATH=require('path'); require(PATH.join(__dirname,'../rphys.js')); require(PATH.join(__dirname,'../rlevel.js'));
const {step,fresh,room}=globalThis.LPR, RL=globalThis.LPROOMS, {goalOf,kit}=require('./solve.js');
const SOL=JSON.parse(require('fs').readFileSync(PATH.join(__dirname,'solutions.json'),'utf8'));
const DIRS8=[[1,0],[-1,0],[0,-1],[0,1],[1,-1],[-1,-1],[1,1],[-1,1]], DT=1/120, K=8;
const N=+(process.argv[2]||300);
let seed=1; const rnd=()=>{ seed=(seed*1103515245+12345)&0x7fffffff; return seed/0x7fffffff; };
function run(i,J){ const def=RL.rooms[i], k=kit(def), R=room(def); R.noDash=!k.dash; R.maxDash=k.maxDash; if(R.way||R.lantern) R.exit='none'; const g=goalOf(R);
  const acts=SOL[i].split(' ').map(s=>({d:s[0]==='L'?-1:s[0]==='R'?1:0,j:s[1]==='J',ds:s.length>2?DIRS8[+s.slice(3)]:null}));
  /* each input change lands up to J frames off; build a per-frame input list */
  const starts=acts.map((a,n)=>n===0?0:Math.max(0,n*K+Math.round((rnd()*2-1)*J)));
  for(let n=1;n<starts.length;n++) if(starts[n]<=starts[n-1]) starts[n]=starts[n-1]+1;
  const total=acts.length*K+240; let P=fresh(R.sx,R.sy); P.onG=true; P.dashN=R.maxDash; let t=0, a=0, jh=false;
  for(let f=0;f<total;f++){ while(a+1<acts.length&&f>=starts[a+1]) a++; const A=f<acts.length*K+40?acts[a]:{d:0,j:false,ds:null}; const first=f===starts[a];
    const inp={ l:first&&A.ds?A.ds[0]<0:A.d<0, r:first&&A.ds?A.ds[0]>0:A.d>0, u:!!(first&&A.ds&&A.ds[1]<0), d:!!(first&&A.ds&&A.ds[1]>0), jumpHeld:A.j, jumpPressed:A.j&&!jh, dashPressed:first&&!!A.ds };
    jh=A.j; t+=DT; step(P,inp,DT,R,t); if(P.dead) return false; if(P.exit) return true;
    if(g.kind==='pt'&&P.onG&&Math.abs(P.x-g.x)<30) return true; }
  return false; }
const out=[];
RL.rooms.forEach((def,i)=>{ if(!SOL[i]) return; const r={i,name:def.name,ch:def.ch+1};
  for(const J of [2,4,6]){ let ok=0; for(let n=0;n<N;n++) if(run(i,J)) ok++; r['j'+J]=Math.round(ok/N*100); }
  r.len=(SOL[i].split(' ').length*K/120).toFixed(1); out.push(r);
  console.log(String(i).padStart(2)+' ch'+r.ch+' '+def.name.padEnd(22)+' 17ms:'+String(r.j2).padStart(3)+'%  33ms:'+String(r.j4).padStart(3)+'%  50ms:'+String(r.j6).padStart(3)+'%  ('+r.len+' s)'); });
require('fs').writeFileSync(PATH.join(__dirname,'playtest.json'),JSON.stringify(out,null,1));
