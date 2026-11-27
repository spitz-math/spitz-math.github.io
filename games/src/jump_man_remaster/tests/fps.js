const {chromium}=require('playwright');
(async()=>{ const b=await chromium.launch(); for(const F of process.argv.slice(2)){ const r=[];
  for(let k=0;k<3;k++){ const ctx=await b.newContext({viewport:{width:1366,height:768}}); const p=await ctx.newPage(); const cdp=await ctx.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate',{rate:6});
    await p.goto('file://'+F); await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.waitForTimeout(1500);
    await p.fill('#jm-nameinput','Slow'); await p.click('#jm-go'); await p.evaluate(()=>{ const s=__G.state(); s.energy=999; s.streak=12; });
    await p.keyboard.down('ArrowRight'); await p.keyboard.down('ArrowUp'); await p.waitForTimeout(1500);
    r.push(await p.evaluate(()=>new Promise(r=>{ let n=0; const t0=performance.now(); (function f(){ n++; if(performance.now()-t0<4000) requestAnimationFrame(f); else r(Math.round(n/4)); })(); })));
    await ctx.close(); }
  console.log(F.split('/').pop(), r); } await b.close(); })();
