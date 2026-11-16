/* frames per second at 6x CPU slowdown (a slow Chromebook), 1366x768: Siege Hall late, and the Last Stand at 1:50 with a full storm build */
const {chromium}=require('playwright'); const path=require('path'); const D=path.join(__dirname,'..','out');
(async()=>{ const b=await chromium.launch(); const ctx=await b.newContext({viewport:{width:1366,height:768}}); const pg=await ctx.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(String(e)));
 await pg.goto('file://'+D+'/rook_and_ruin_fonts.html?set=slope'); await pg.evaluate('localStorage.clear()'); await pg.reload(); await pg.waitForTimeout(600);
 await pg.fill('#dn-nameinput','Test T'); await pg.click('#dn-go'); await pg.waitForTimeout(200); await pg.keyboard.press('Escape'); await pg.waitForTimeout(1200);
 const cdp=await ctx.newCDPSession(pg);
 const fps=(secs)=>pg.evaluate(secs=>new Promise(res=>{ let n=0, worst=0, last=performance.now(); const t0=last, S=__G.state(); (function f(){ const t=performance.now(); worst=Math.max(worst,t-last); last=t; S.w.p.inv=99; S.w.p.hp=5; n++; if(t-t0<secs*1000) requestAnimationFrame(f); else res({fps:Math.round(n/secs),worstFrameMs:Math.round(worst),enemies:S.w.en.filter(e=>!e.dead).length,shots:S.w.shots.length,fx:S.w.fx.length}); })(); }),secs);
 const out={};
 await pg.evaluate(()=>{ const S=__G.state(); S.w.picks=6; ['spark','volatile','orbit','ricochet','wave'].forEach(k=>__G.give(k,3)); ['overcharge','shrapnel','tempest','stormcall','bladering'].forEach(k=>__G.give(k,1)); __G.room('siege','s'); const w=S.w; w.rally=1; for(let i=0;i<60*44;i++){ w.p.inv=99; w.p.hp=5; __G.hold(' ',true); __G.step(1/60); } });
 await cdp.send('Emulation.setCPUThrottlingRate',{rate:6}); out.siege=await fps(4); await cdp.send('Emulation.setCPUThrottlingRate',{rate:1});
 await pg.evaluate(()=>{ const S=__G.state(); __G.room('boss','s'); const w=S.w; w.bossIntro=0; w.en=[]; __G.last(); for(let i=0;i<60*110;i++){ w.p.inv=99; w.p.hp=5; __G.hold(' ',true); __G.step(1/60); } });
 await cdp.send('Emulation.setCPUThrottlingRate',{rate:6}); out.lastStand=await fps(4); await cdp.send('Emulation.setCPUThrottlingRate',{rate:1});
 out.heapMB=Math.round((await pg.evaluate(()=>performance.memory?performance.memory.usedJSHeapSize:0))/1e6);
 console.log(JSON.stringify(out)); if(out.siege.fps<30||out.lastStand.fps<20) errs.push('too slow at 6x');   /* worst-case build measures 24 to 30 in the Last Stand, 41 to 52 in the Siege */ console.log('errors',JSON.stringify(errs)); await b.close(); })();
