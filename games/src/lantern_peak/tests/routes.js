/* Route checker: which ledges can the hero reach from which, with the real physics (physics.js)?
   Tries many honest inputs from each ledge: run-ups, short and full jumps, steering, Cloud Hop at different moments, Scarf Glide for
   different lengths (with a turn part-way), Ember Dash in the air and along the ground.
   The game has six stages. Stage k starts at the station before it (the village floor for stage 0) and ends at station k:
     0 Pinewood Steps -> Waystone 1 (plain jumps)        3 Beacon Summit -> the tower's first fire (+ Ember Dash)
     1 Falls Cliffs   -> Waystone 2 (+ Cloud Hop)        4 tower -> second fire
     2 Windy Ruins    -> Waystone 3 (+ Scarf Glide)      5 tower -> the beacon
   node tests/routes.js  -> prints PASS/FAIL lines; exits 1 on a failure. */
const PATH=require('path'); require(PATH.join(__dirname,'../physics.js')); require(PATH.join(__dirname,'../level.js'));
const {PH,step,fresh,platAt}=globalThis.LPPH, LV=globalThis.LPLEVEL;
const plats=LV.plats, DT=1/120, ST=LV.st;
const mv=k=>({dj:k>=1,gl:k>=2,ds:true,melt:k>=3});   /* Ember Dash from the start; it melts ice from Waystone 3 on */
function sim(from,o){
  const lo=from.y-750, hi=from.y+900;
  const W={ plats:plats.filter(p=>p.y+(p.my||0)>=lo&&p.y<=hi), solids:LV.solids.filter(s=>!(s.gate!==undefined&&s.gate<o.st)&&s.y+s.h>=lo&&s.y<=hi),
    hazards:LV.hazards.filter(h=>h.y>=lo&&h.y<=hi), winds:LV.winds, t:o.tOff, dj:o.mv.dj, gl:o.mv.gl, ds:o.mv.ds, melt:!!o.mv.melt };
  W.plats.forEach(p=>{ delete p.goneAt; delete p.tT; }); W.solids.forEach(s=>{ if(s.ice){ s.off=false; delete s.broken; } });
  const P=fresh(o.x0,platAt(from,o.tOff).y); P.on=from; P.vx=o.vx0||0;
  let t=0;
  for(let n=0;n<Math.round((o.gl?7:2.8)/DT);n++){ t+=DT; W.t+=DT;
    const dir=t<o.stop?o.d:(o.t2&&t>=o.t2?o.d3:(o.d2||0));
    const inp={ l:dir<0, r:dir>0, downPressed:false,
      jumpHeld:!o.walk&&(o.gl&&o.djT>0?t<o.djT+o.gl:(t<o.hold||(o.djT>0&&t>=o.djT&&t<o.djT+0.5))),
      jumpPressed:!o.walk&&(n===0||(o.djT>0&&Math.abs(t-o.djT)<DT/2)),
      dashPressed:o.dsT>=0&&Math.abs(t-Math.max(DT,o.dsT))<DT/2 };
    step(P,inp,DT,W);
    if(P.ev.includes('hurt')) return null;
    if(P.y<lo+40) return null;
    if(o.walk){ if(P.on&&P.on!==from) return {to:P.on}; if(t>1.2) return null; }
    else if(n>3&&P.on&&P.vy===0) return {to:P.on}; }
  return null; }
function reach(from,k,m){
  const out=new Map(), ts=from.per?[0,0.25,0.5,0.75].map(q=>q*from.per):[0];
  const add=(o)=>{ const r=sim(from,o); if(r&&r.to!==from&&!r.to.solid&&!out.has(r.to)) out.set(r.to,o); };
  for(const tOff of ts){ const fp=platAt(from,tOff), X=q=>fp.x+PH.HW+2+(from.w-2*PH.HW-4)*q/6, B={tOff,mv:m,st:k,dsT:-1};
    for(let q=0;q<=6;q++){ const x0=X(q);
      /* plain jumps and Cloud Hops */
      for(const hold of [0.1,9]) add({...B,x0,d:0,stop:9,hold,djT:0});
      if(m.dj) for(const djT of [0.18,0.3,0.42,0.55]) add({...B,x0,d:0,stop:9,hold:9,djT});
      for(const d of [-1,1]) for(const run of [0,1]) for(const stop of [9,0.25,0.45]){
        for(const hold of [0.1,9]) add({...B,x0,vx0:run*d*PH.RUN,d,stop,hold,djT:0});
        if(m.dj) for(const djT of [0.18,0.3,0.42,0.55]) add({...B,x0,vx0:run*d*PH.RUN,d,stop,hold:9,djT}); }
      /* along the ground: a walk, or a dash (through ice) */
      for(const d of [-1,1]){ add({...B,x0,d,stop:9,walk:true}); if(m.ds) add({...B,x0,d,stop:9,walk:true,dsT:0}); } }
    /* Scarf Glide: hop, then hold for a while; steer one way, then let go or turn back */
    if(m.gl) for(const q of [0,3,6]){ const x0=X(q);
      for(const djT of [0.18,0.36,0.55]) for(const gl of [1.4,2.6,9]){
        add({...B,x0,d:0,stop:9,hold:9,djT,gl});
        for(const d of [-1,1]) for(const run of [0,1]) for(const stop of [9,0.45,1.0,1.8]) for(const d2 of (stop<9?[0,-d]:[0]))
          add({...B,x0,vx0:run*d*PH.RUN,d,stop,d2,hold:9,djT,gl}); }
      /* riding a rising wind: steer in, float up, then steer out near the top */
      for(const djT of [0.18,0.36,0.55]) for(const t2 of [1.5,2.2,3.0]) for(const d3 of [-1,1]){
        add({...B,x0,d:0,stop:0,hold:9,djT,gl:9,t2,d3});
        for(const d of [-1,1]) for(const run of [0,1]) for(const stop of [0.25,0.45,0.7]) add({...B,x0,vx0:run*d*PH.RUN,d,stop,hold:9,djT,gl:9,t2,d3}); } }
    /* Ember Dash in the air */
    if(m.ds) for(const q of [0,3,6]){ const x0=X(q);
      for(const d of [-1,1]) for(const run of [0,1]) for(const djT of [0,0.3,0.5]) for(const dsT of [0.25,0.5,0.8]) for(const gl of (djT?[0.5,9]:[0.5]))
        add({...B,x0,vx0:run*d*PH.RUN,d,stop:9,hold:9,djT,gl:m.gl?gl:0.5,dsT}); } }
  return out; }
const MEMO=new Map(); function edges(a,k,m){ const key=plats.indexOf(a)+'|'+k+'|'+(m.dj?1:0)+(m.gl?1:0)+(m.ds?1:0)+(m.melt?1:0); if(!MEMO.has(key)) MEMO.set(key,reach(a,k,m)); return MEMO.get(key); }
/* everything reachable from `start` in stage k with moves m (ledges far below the start are left out: a fall that deep goes back to the lantern) */
function closure(start,k,m,floor){ const seen=new Set([start]), q=[start]; if(floor===undefined) floor=start.y-60;
  while(q.length){ const a=q.shift(); for(const [b] of edges(a,k,m)){ if(b.y<floor) continue; if(!seen.has(b)){ seen.add(b); q.push(b); } } }
  return seen; }
function path(a,b,k,m){ m=m||mv(k); const prev=new Map([[a,null]]), q=[a], floor=a.y-60; while(q.length){ const x=q.shift(); if(x===b) break; for(const [y] of edges(x,k,m)){ if(y.y<floor) continue; if(!prev.has(y)){ prev.set(y,x); q.push(y); } } }
  if(!prev.has(b)) return null; const out=[]; for(let x=b;x;x=prev.get(x)) out.unshift(plats.indexOf(x)); return out; }
const startOf=k=>k?LV.get(ST[k-1].id):plats[0], goalOf=k=>LV.get(ST[k].id);
/* the signposted way up, ledge by ledge ([x,y] of each ledge), for the stages where gliding opens many shortcuts. The checker proves
   every step of it, and the play test's bot climbs exactly this. Stages 0 and 1 use the shortest route. */
const at=(x,y)=>{ const p=plats.find(q=>q.x===x&&q.y===y); if(!p) throw new Error('no ledge at '+x+','+y); return p; };
const MAIN={
  2:[[390,4790],[60,4885],[770,4870],[230,5290],[760,5480],[20,5600],[250,5710],[420,5820],[790,5930],[620,6460],[430,6580],[230,6680],[50,6780],[240,6900]],
  3:[[400,7130],[130,7240],[0,7350],[680,7350],[460,7560],[0,7560],[200,7690],[20,7800],[460,7910],[720,8020],[500,8140],[760,8170],[470,8450],[200,8570],[120,8690],[400,8800],[690,8900],[280,9020]],
  4:[[390,9250],[120,9360],[520,9460],[280,9590]],
  5:[[390,9820],[650,9930],[420,10030],[160,10120],[240,10250]] };
/* side trips worth proving too: [stage, from, to] */
const SIDE=[ [2,[760,5480],[790,5930],'the brave rising wind at the fork'], [3,[20,7800],[190,8000],'up to the ice alcove'], [3,[190,8000],[0,8000],'into the alcove through the ice'], [3,[0,8000],[190,8000],'back out of the alcove'], [3,[190,8000],[500,8140],'from the alcove ledge back to the main way'] ];
function route(k){ if(!MAIN[k]) return path(startOf(k),goalOf(k),k); return [startOf(k)].concat(MAIN[k].map(c=>at(c[0],c[1]))).map(p=>plats.indexOf(p)); }
module.exports={path,plats,LV,startOf,goalOf,mv,edges,route};
if(require.main!==module) return;
if(process.argv[2]==='edges'){ const k=+process.argv[3]; for(const a of process.argv.slice(4)){ const p=plats[+a]; console.log('from #'+a+' x'+p.x+' y'+p.y+' ->',[...edges(p,k,mv(k))].map(([b,o])=>'#'+plats.indexOf(b)+'(x'+b.x+' y'+b.y+')').join(' ')); } return; }
let fail=0; const ok=(c,m)=>{ console.log((c?'PASS ':'FAIL ')+m); if(!c) fail++; };
const NAME=['Pinewood Steps','Falls Cliffs','Windy Ruins','Beacon Summit','tower, part 2','tower, part 3'], MOVE=['','Cloud Hop','Scarf Glide','the hot dash'];
const all=new Set(), T0=Date.now();
for(let k=0;k<ST.length;k++){ const s=startOf(k), g=goalOf(k), C=closure(s,k,mv(k));
  ok(C.has(g),NAME[k]+': '+ST[k].id+' (y '+g.y+') is reachable'+(k&&k<4?' with '+MOVE[k]:''));
  const top=Math.max(...[...C].map(p=>p.y+(p.my||0))); ok(top<=g.y,NAME[k]+': nothing above the station is reachable before its gate opens (highest '+top+')');
  if(k>=1&&k<=3){ const without=closure(s,k,mv(k-1)); ok(!without.has(g),NAME[k]+' can NOT be climbed without '+MOVE[k]+' (reached up to y '+Math.max(...[...without].map(p=>p.y))+')'); }
  let soft=0; [...C].forEach(p=>{ if(!closure(p,k,mv(k),s.y-60).has(g)){ soft++; ok(false,NAME[k]+': softlock from the ledge at x'+p.x+' y'+p.y); } });
  if(!soft) ok(true,NAME[k]+': no softlocks ('+C.size+' ledges, '+(path(s,g,k).length-1)+' jumps on the shortest route)');
  C.forEach(p=>all.add(p)); }
plats.forEach(p=>{ if(!all.has(p)&&!(p.thorn&&p.thorn[1]>=p.w)) ok(false,'unreachable ledge at x'+p.x+' y'+p.y); });
/* the signposted way: every single step works */
for(const k of Object.keys(MAIN).map(Number)){ const r=route(k); let bad=[]; for(let i=1;i<r.length;i++){ const a=plats[r[i-1]], b=plats[r[i]]; if(!edges(a,k,mv(k)).has(b)) bad.push('x'+a.x+' y'+a.y+' -> x'+b.x+' y'+b.y); }
  ok(!bad.length&&plats[r[r.length-1]]===goalOf(k),NAME[k]+': the signposted way works step by step ('+(r.length-1)+' jumps)'+(bad.length?': NO '+bad.join('; '):'')); }
for(const [k,a,b,what] of SIDE) ok(edges(at(a[0],a[1]),k,mv(k)).has(at(b[0],b[1])),'side trip: '+what);
/* the fully thorny ledges are obstacles, not places to stand */
for(const f of LV.feathers){ const near=[...all].some(p=>{ const q=platAt(p,0); return f.x>q.x-60&&f.x<q.x+p.w+60&&f.y>q.y&&f.y-q.y<230; })||LV.winds.some(w=>w.up&&f.x>w.x&&f.x<w.x+w.w&&f.y>w.y&&f.y<w.y+w.h);
  ok(near,'feather '+f.id+' sits within a jump of a reachable ledge (or in a rising wind)'); }
/* the Star Feather in the ice alcove needs the dash */
{ const alc=plats.find(p=>p.x===0&&p.y===8000), s=startOf(3); ok(closure(s,3,mv(3)).has(alc)&&!closure(s,3,mv(2)).has(alc),'the ice alcove opens only with the hot dash (Waystone 3)'); }
/* jump numbers */
{ const P=fresh(100,0); P.on=plats[0]; const W={plats:[plats[0]],solids:[],t:0,dj:false}; let mx=0; for(let n=0;n<200;n++){ W.t+=DT; step(P,{jumpHeld:true,jumpPressed:n===0},DT,W); mx=Math.max(mx,P.y); } console.log('full jump apex',mx.toFixed(1));
  const Q=fresh(100,0); Q.on=plats[0]; let my=0; W.t=0; for(let n=0;n<200;n++){ W.t+=DT; step(Q,{jumpHeld:n<10,jumpPressed:n===0},DT,W); my=Math.max(my,Q.y); } console.log('tap jump apex',my.toFixed(1));
  const R=fresh(100,0); R.on=plats[0]; W.t=0; W.dj=true; let mh=0; for(let n=0;n<300;n++){ W.t+=DT; step(R,{jumpHeld:true,jumpPressed:n===0||n===50},DT,W); mh=Math.max(mh,R.y); } console.log('jump + Cloud Hop apex',mh.toFixed(1));
  const D=fresh(100,0); D.on=plats[0]; W.t=0; W.ds=true; for(let n=0;n<40;n++){ W.t+=DT; step(D,{dashPressed:n===0},DT,W); } console.log('ground dash distance',(D.x-100).toFixed(1)); }
console.log('checked in '+((Date.now()-T0)/1000).toFixed(0)+' s'); console.log(fail?fail+' FAILED':'ALL ROUTES OK'); process.exit(fail?1:0);
