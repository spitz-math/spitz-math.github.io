// v10: every gap can be made with no upgrades. Measures the real half-speed running jump, then checks the first 600 ledges
// of several towers (moving ledges: you can wait for them to swing close). NODE_PATH=$(npm root -g) node reach.js <mult copy>
const {chromium}=require('playwright'); const F=process.argv[2];
(async()=>{ const b=await chromium.launch(); const p=await (await b.newContext({viewport:{width:1366,height:620}})).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
 await p.goto('file://'+F); await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.waitForTimeout(400); await p.fill('#jm-nameinput','R K'); await p.click('#jm-go'); await p.waitForTimeout(200);
 const r=await p.evaluate(()=>{ const G=__G,S=G.state(),P=G.man(),c=G.consts; S.endAt=Date.now()+9e5; S.climbT=-1e9;
  // 1. measure: half-speed run, then jump (what a kid who taps the arrow manages)
  const fl=G.plats()[0]; P.on=fl; P.h=fl.h; P.x=120; P.vx=0; P.vy=0; for(let k=0;k<10;k++) G.step(1/60);
  G.key('r',true); let k=0; while(P.vx<0.5*c.VMAX&&k<200){ G.step(1/60); k++; }
  const x0=P.x,h0=P.h; G.jump(); const env=[]; for(let s=0;s<160;s++){ G.step(1/60); if(P.on&&s>2) break; env.push([P.x-x0,P.h-h0]); } G.key("r",false);
  const reachAt=d=>{ let best=-1e9; env.forEach(e=>{ if(e[0]>=d) best=Math.max(best,e[1]); }); return best; };   // highest point once you are d px across
  const apexStand=147;
  // 2. check towers
  const bad=[], seeds=[1,7,42,99,1234]; let checked=0, needRun=0, maxRise=0;
  for(const seed of seeds){ S.seed=seed; S.pi=0; G.reset(); G.gen(200000); const pl=G.plats();
    for(let i=1;i<600;i++){ const a=pl[i-1], q=pl[i]; const dy=q.h-a.h; maxRise=Math.max(maxRise,dy);
      const far=Math.max(0,Math.abs(q.cx-a.cx)-(a.amp||0)-(q.amp||0)), d=Math.max(0,far-(a.floor?9999:a.w/2)-q.w/2+c.PW);
      checked++; if(dy>apexStand) needRun++;
      if(reachAt(d)<dy+12) bad.push({seed,i,dy:Math.round(dy),d:Math.round(d)}); } }
  return {env:env.filter((e,i)=>i%6===0).map(e=>[Math.round(e[0]),Math.round(e[1])]),checked,needRun,maxRise:Math.round(maxRise),bad:bad.slice(0,10),nbad:bad.length}; });
 console.log(JSON.stringify(r)); console.log(r.nbad===0&&!errs.length?'ALL GAPS MAKEABLE':'FAIL', errs); await b.close(); })();
