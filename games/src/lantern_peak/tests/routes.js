/* Route checker: which ledges can the hero reach from which, with the real physics (physics.js)?
   Tries many honest inputs (run-ups, short and full jumps, steering, Cloud Hop at different moments) from each ledge.
   node tests/routes.js  -> prints PASS/FAIL lines; exits 1 on a failure. */
const PATH=require('path'); require(PATH.join(__dirname,'../physics.js')); require(PATH.join(__dirname,'../level.js'));
const {PH,step,fresh,platAt}=globalThis.LPPH, LV=globalThis.LPLEVEL;
const plats=LV.plats, DT=1/120;
function sim(from,x0,vx0,dirFn,holdT,djT,dj,gateOpen,tOff){
  const W={plats,solids:LV.solids.filter(s=>!(s.gate&&gateOpen)),hazards:[],t:tOff,dj};
  plats.forEach(p=>{ delete p.goneAt; delete p.tT; });
  const P=fresh(x0,platAt(from,tOff).y); P.on=from; P.vx=vx0;
  let t=0, hurt=false;
  for(let n=0;n<Math.round(2.6/DT);n++){ t+=DT; W.t+=DT;
    const inp={l:dirFn(t)<0,r:dirFn(t)>0,jumpHeld:t<holdT||(djT&&t>=djT&&t<djT+0.5),jumpPressed:n===0||(djT&&Math.abs(t-djT)<DT/2),downPressed:false};
    step(P,inp,DT,W); if(P.ev.includes('hurt')) hurt=true;
    if(n>3&&P.on&&P.vy===0){ return {to:P.on,x:P.x,hurt}; } }
  return null; }
function reach(from,dj,gateOpen){
  const out=new Map(); const ts=from.per?[0,0.25,0.5,0.75].map(k=>k*from.per):[0];
  for(const tOff of ts){ const fp=platAt(from,tOff);
  for(let k=0;k<=6;k++){ const x0=fp.x+PH.HW+2+(from.w-2*PH.HW-4)*k/6;
    for(const d of [-1,0,1]) for(const run of [0,1]) for(const stop of [9,0.25,0.45]) for(const hold of [0.1,9]) for(const djT of dj?[0,0.18,0.3,0.42,0.55]:[0]){
      const vx0=run?d*PH.RUN:0; const r=sim(from,x0,vx0,t=>t<stop?d:0,hold,djT,dj,gateOpen,tOff);
      if(r&&r.to!==from&&!r.hurt&&!r.to.solid){ if(!out.has(r.to)) out.set(r.to,{x0,d,run,stop,hold,djT}); } } } }
  return out; }
const MEMO=new Map(); function edges(a,dj,g){ const k=plats.indexOf(a)+'|'+dj+'|'+g; if(!MEMO.has(k)) MEMO.set(k,reach(a,dj,g)); return MEMO.get(k); }
function closure(start,dj,gateOpen,avoid){ const seen=new Set([start]), q=[start];
  while(q.length){ const a=q.shift(); for(const [b] of edges(a,dj,gateOpen)){ if(avoid&&avoid(b)) continue; if(!seen.has(b)){ seen.add(b); q.push(b); } } }
  return seen; }
function path(a,b,dj,g){ const prev=new Map([[a,null]]), q=[a]; while(q.length){ const x=q.shift(); if(x===b) break; for(const [y] of edges(x,dj,g)){ if(!prev.has(y)){ prev.set(y,x); q.push(y); } } }
  if(!prev.has(b)) return null; const out=[]; for(let x=b;x;x=prev.get(x)) out.unshift(plats.indexOf(x)); return out; }
module.exports={path,plats,LV};
if(require.main!==module) return;
let fail=0; const ok=(c,m)=>{ console.log((c?'PASS ':'FAIL ')+m); if(!c) fail++; };
const way=LV.get('way'), top=LV.get('top'), floor=plats[0];
const z1=closure(floor,false,false);
ok(z1.has(way),'zone 1: the Waystone ledge is reachable with plain jumps');
const z1max=Math.max(...[...z1].map(p=>p.y)); ok(z1max<=way.y,'zone 1: nothing above the Waystone ledge is reachable before the gate opens (highest '+z1max+')');
const noDJ=closure(way,false,true); ok(!noDJ.has(LV.get('c4'))&&!noDJ.has(top),'zone 2 can NOT be climbed without Cloud Hop (reached up to y '+Math.max(...[...noDJ].map(p=>p.y))+')');
const z2=closure(way,true,true); ok(z2.has(top),'zone 2: the Lookout is reachable with Cloud Hop');
// feathers: some ledge reachable from which a feather point lies on a jump arc -> approximate: feather within 120px above a reachable ledge
for(const f of LV.feathers){ const near=[...z1,...z2].some(p=>{ const q=platAt(p,0); return f.x>q.x-60&&f.x<q.x+p.w+60&&f.y>q.y&&f.y-q.y<230; }); ok(near,'feather '+f.id+' sits within a jump of a reachable ledge'); }
// every ledge in the slice reachable (no orphan ledges)
const all=new Set([...z1,...z2]); plats.forEach(p=>{ if(!all.has(p)) ok(false,'unreachable ledge at x'+p.x+' y'+p.y); });
// from every reachable ledge you can get back on track (no softlocks): the Waystone (zone 1) or the Lookout (zone 2) is reachable from it
[...z1].forEach(p=>{ if(!closure(p,false,false).has(way)) ok(false,'softlock in zone 1 from y'+p.y); });
[...z2].filter(p=>p.y>=way.y).forEach(p=>{ if(!closure(p,true,true).has(top)) ok(false,'softlock in zone 2 from y'+p.y); });
// jump numbers
{ const P=fresh(100,0); P.on=plats[0]; const W={plats:[plats[0]],solids:[],t:0,dj:false}; let mx=0; for(let n=0;n<200;n++){ W.t+=DT; step(P,{jumpHeld:true,jumpPressed:n===0},DT,W); mx=Math.max(mx,P.y); } console.log('full jump apex',mx.toFixed(1));
  const Q=fresh(100,0); Q.on=plats[0]; let my=0; W.t=0; for(let n=0;n<200;n++){ W.t+=DT; step(Q,{jumpHeld:n<10,jumpPressed:n===0},DT,W); my=Math.max(my,Q.y); } console.log('tap jump apex',my.toFixed(1)); }
console.log(fail?fail+' FAILED':'ALL ROUTES OK'); process.exit(fail?1:0);
