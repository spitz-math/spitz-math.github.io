/* Robust playtest ("could a kid do it?"). Five slightly different climbers play the SAME inputs at once: a bit weaker or
   stronger (jump, run, dash, wall jump, spring +-3%) and starting a little left or right (+-9 px). The search only keeps
   inputs that all five survive, so a plan it finds leaves room for a kid's mistakes. A room it can't solve this way needs
   pixel- or frame-perfect play. node tests/robust.js <room> [spread=1]  -> one JSON line (tests/robust.sh: all rooms) */
const PATH=require('path'); require(PATH.join(__dirname,'../rphys.js')); if(!globalThis.LPROOMS) require(PATH.join(__dirname,'../rlevel.js'));
const L=globalThis.LPR, RL=globalThis.LPROOMS, {goalOf,kit,Heap,done,snap,load,DIRS8}=require('./solve.js');
const base=Object.assign({},L.PH), DT=1/120;
function robust(def,spread,limit,K){ K=K||8; const k=kit(def), g0=L.room(def); const s=spread;
  const lg=q=>Math.round(q*s); const V=[[1,0,0],[1-0.03*s,-9*s,lg(3)],[1+0.03*s,9*s,lg(6)],[1-0.03*s,9*s,lg(6)],[1+0.03*s,-9*s,lg(3)]];   // [power, takeoff offset px, reaction lag frames]
  const Rs=V.map(()=>{ const R=L.room(def); R.noDash=!k.dash; R.maxDash=k.maxDash; if(R.way||R.lantern) R.exit='none'; return R; }), g=goalOf(Rs[0]);
  const setPH=v=>{ ['JV','WJV','DASHV','RUN','SPRINGV'].forEach(f=>L.PH[f]=base[f]*v[0]); };
  const P0=V.map((v,c)=>{ const P=L.fresh(Rs[c].sx+v[1],Rs[c].sy); P.onG=true; P.dashN=k.maxDash; P.fin=false; return P; });
  const h=Ps=>{ let w=0; Ps.forEach(P=>{ if(P.fin) return; const dx=Math.abs(P.x-g.x), dy=Math.max(0,P.y-g.y); w=Math.max(w,(dx*(g.kind==='up'?0.6:1)+dy*1.2)/300); }); return w; };
  const H=new Heap(), seen=new Set(); H.push({Ps:P0,Rsn:Rs.map(snap),t:0,jh:false,len:0,f:h(P0),pa:{d:0,j:false,ds:null},pjh:V.map(()=>false)}); let n=0;
  let best=null; while(H.size&&n<limit){ const nd=H.pop(); n++; const lead=nd.Ps[0]; if(!best||nd.f-nd.len*0.012<best.f-best.len*0.012) best=nd;
    const acts=[]; for(const d of [-1,0,1]) for(const j of [false,true]){ acts.push({d,j,ds:null}); if(k.dash&&nd.Ps.every(P=>P.fin||(P.dashOk&&P.dashT<=0))) for(const v of DIRS8) acts.push({d,j,ds:v}); }
    for(const a of acts){ let ok=true; const Ps=[], Rsn=[];
      for(let c=0;c<V.length&&ok;c++){ const R=Rs[c]; load(R,nd.Rsn[c]); const P=JSON.parse(JSON.stringify(nd.Ps[c])); setPH(V[c]); let t=nd.t;
        let jh=nd.jh; if(!P.fin) for(let q=0;q<K;q++){ t+=DT; const lag=V[c][2], A=q<lag?{d:nd.pa.d,j:nd.pa.j,ds:null}:a, first=q===lag;   // a late reaction keeps the old input for a few frames
          const inp={ l:first&&A.ds?A.ds[0]<0:A.d<0, r:first&&A.ds?A.ds[0]>0:A.d>0, u:!!(first&&A.ds&&A.ds[1]<0), d:!!(first&&A.ds&&A.ds[1]>0), jumpHeld:A.j, jumpPressed:A.j&&!jh, dashPressed:first&&!!A.ds }; jh=A.j;
          L.step(P,inp,DT,R,t); if(P.dead){ ok=false; break; } if(done(P,R,g)){ P.fin=true; break; } }
        Ps.push(P); Rsn.push(snap(R)); }
      if(!ok) continue;
      /* a kid looks and corrects while standing: when the main climber is on the ground, the others start again from there
         (at their own offset), so only the moves in the air have to be forgiving */
      if(Ps[0].onG&&!Ps[0].fin){ for(let c=1;c<V.length;c++){ const Q=JSON.parse(JSON.stringify(Ps[0])), x=Q.x+V[c][1];
          if(!L.solidAt(Rs[0],Math.floor((x-L.PH.HW)/30),Math.floor((Q.y-1)/30),nd.t)&&!L.solidAt(Rs[0],Math.floor((x+L.PH.HW)/30),Math.floor((Q.y-1)/30),nd.t)) Q.x=x; Ps[c]=Q; Rsn[c]=Rsn[0]; } }
      if(Ps.every(P=>P.fin)){ Object.assign(L.PH,base); return {ok:true,n,len:nd.len+1}; }
      const key=Ps.map(P=>P.fin?'F':[Math.round(P.x/6),Math.round(P.y/6),Math.round(P.vx/50),Math.round(P.vy/70),P.onG?1:0,P.dashN,P.dashT>0?1:0,P.lock>0?1:0].join(',')).join('|')+(a.j?'J':'');
      if(seen.has(key)) continue; seen.add(key);
      H.push({Ps,Rsn,t:nd.t+K*DT,jh:a.j,len:nd.len+1,f:h(Ps)+(nd.len+1)*0.012,pa:a}); } }
  Object.assign(L.PH,base); if(process.env.DEBUG) console.log(best.Ps.map(P=>[P.x|0,P.y|0,P.vx|0,P.vy|0,P.onG,P.fin,P.wall].join(',')).join(' | '),'len',best.len);
  return {ok:false,n}; }
module.exports={robust};
if(require.main===module){ const i=+process.argv[2], sp=+(process.argv[3]||1), def=RL.rooms[i]; const t0=Date.now(); const r=robust(def,sp,+(process.env.LIMIT||120000));
  console.log(JSON.stringify({i,name:def.name,ch:def.ch+1,spread:sp,ok:r.ok,n:r.n,s:((Date.now()-t0)/1000).toFixed(0)})); }
