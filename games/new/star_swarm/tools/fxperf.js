// fps at 6x CPU slowdown with effects: STRESS=1 for a pile-up (5 kills a second + a Nova every 2 s), else a busy real fight (3 kills every 0.7 s, one Nova): node tools/fxperf.js [file in out/]
const { chromium } = require('playwright');
(async()=>{ const b=await chromium.launch(); const pg=await b.newPage({viewport:{width:1366,height:768}});
  await pg.goto('file://'+__dirname+'/../out/'+(process.argv[2]||'star_swarm_candidate.html')); await pg.waitForTimeout(500);
  await pg.evaluate(()=>{ localStorage.clear(); window.__noBlurDock=1; }); await pg.reload(); await pg.waitForTimeout(500); await pg.evaluate(()=>{ window.__noBlurDock=1; });
  await pg.fill('#sw-nameinput','Test T'); await pg.click('#sw-go'); await pg.waitForTimeout(3000);
  const cdp=await pg.context().newCDPSession(pg); await cdp.send('Emulation.setCPUThrottlingRate',{rate:6});
  for(const mode of ['off','on']){
    await pg.keyboard.press('v'); // first press turns effects off, second back on
    const r=await pg.evaluate((ST)=>new Promise(res=>{ let n=0, t0=performance.now(), k=0; const iv=setInterval(()=>{ const s=__G.state(); s.fuel=19; __G.ship().safeUntil=1e9;
        const E=__G.enemies().filter(a=>!a.dead); E.slice(0,ST?5:3).forEach(a=>{ a.hp=1; __G.hitEnemy(a,1); }); if(ST?k%2===0:k===2) __G.nova(); k++; if(E.length<6) __G.startWave(); },ST?1000:700);
      (function f(){ n++; if(performance.now()-t0<8000) requestAnimationFrame(f); else { clearInterval(iv); res(n/((performance.now()-t0)/1000)); } })(); }),!!process.env.STRESS);
    console.log('effects', mode, 'fps', r.toFixed(1)); }
  await b.close(); })();
