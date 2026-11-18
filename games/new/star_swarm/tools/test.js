// every question set, both motion settings: the card never spills, a reload keeps the run, the end screen shows. Then speed at 6x CPU.
const { chromium } = require('playwright');
const FILE=process.argv[2]||'star_swarm.html';
(async()=>{ const b=await chromium.launch(); let bad=0;
  const p0=await b.newPage(); await p0.goto('file://'+__dirname+'/../out/'+FILE); await p0.waitForTimeout(300); const sets=await p0.evaluate(()=>Object.keys(SpitzQ.sets)); await p0.close();
  for(const st of sets) for(const rm of ['no-preference','reduce']){
    const ctx=await b.newContext({viewport:{width:1366,height:768},reducedMotion:rm}); const pg=await ctx.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(e.message.slice(0,120)));
    await pg.goto('file://'+__dirname+'/../out/'+FILE+'?set='+st); await pg.waitForTimeout(250); await pg.evaluate(()=>localStorage.clear()); await pg.reload(); await pg.waitForTimeout(300);
    await pg.fill('#sw-nameinput','Test T'); await pg.click('#sw-go'); await pg.waitForTimeout(150);
    await pg.evaluate(()=>{ window.__noBlurDock=1; __G.pause(true); __G.dock(); });
    let spill=[], maxH=0, asked=0, vis=0;
    for(let i=0;i<14;i++){ // answer 14 questions: mostly right, some wrong; measure the card after each
      const r=await pg.evaluate((i)=>{ const S=__G.state(); if(__G.draftOpen()){ __G.noWait(); __G.pick(0); } if(!__G.cardOpen()){ S.fuel=0.01; __G.dock(); }
        __G.noWait(); const q=S.q, want=i%4!==3, k=q.choices.findIndex(c=>!!c.ok===want); __G.answer(k);
        const box=document.getElementById('sw-q').getBoundingClientRect(), st=document.getElementById('stage').getBoundingClientRect();
        const out=[...document.querySelectorAll('#sw-q *')].filter(e=>e.offsetParent).filter(e=>{ const r=e.getBoundingClientRect(); return r.height&&(r.bottom>box.bottom+1||r.right>box.right+1||r.left<box.left-1); }).map(e=>e.id||e.className).slice(0,3);
        const clip=[...document.querySelectorAll('#sw-q .sw-ch .t')].filter(e=>e.scrollWidth>e.clientWidth+2).length;
        return {out, clip, h:box.height/st.height, bottom:(box.bottom-st.top)/st.height, vis:!!q.visual}; },i);
      spill=spill.concat(r.out); if(r.clip) spill.push('choice text clipped'); maxH=Math.max(maxH,r.bottom); asked++; vis+=r.vis?1:0;
      await pg.evaluate(()=>{ document.getElementById('sw-next').disabled=false; const S=__G.state(); S.fuel=Math.min(S.fuel,1); __G.next(); }); }
    const mid=await pg.evaluate(()=>{ const s=__G.state(); return JSON.stringify([s.score,s.answered,s.correct,Math.round(s.fuel*10),s.picks,s.streak]); });
    await pg.reload(); await pg.waitForTimeout(350); const kept=await pg.evaluate(()=>{ const s=__G.state(); return JSON.stringify([s.score,s.answered,s.correct,Math.round(s.fuel*10),s.picks,s.streak]); });
    const reopened=await pg.evaluate(()=>__G.cardOpen()&&__G.frozen());
    await pg.evaluate(()=>__G.end()); await pg.waitForTimeout(300); const endOk=await pg.isVisible('#sw-end'), code=await pg.textContent('#sw-endcode');
    const flag=errs.length||spill.length||!endOk||kept!==mid||!reopened||maxH>0.93||!code;
    if(flag){ bad++; console.log('FAIL',st,rm,JSON.stringify({errs,spill:[...new Set(spill)],endOk,kept:kept===mid,reopened,maxH:maxH.toFixed(2),code})); }
    else if(rm==='no-preference') console.log('ok  ',st,'card bottom at',maxH.toFixed(2),'of the screen, pictures',vis+'/'+asked);
    await ctx.close(); }
  // speed: a busy wave with every upgrade, 6x CPU slowdown, 1366x768
  const ctx=await b.newContext({viewport:{width:1366,height:768}}); const pg=await ctx.newPage(); const cdp=await ctx.newCDPSession(pg);
  await pg.goto('file://'+__dirname+'/../out/'+FILE+'?set=slope'); await pg.waitForTimeout(400); await pg.evaluate(()=>localStorage.clear()); await pg.reload(); await pg.waitForTimeout(500);
  await pg.fill('#sw-nameinput','Test T'); await pg.click('#sw-go'); await pg.waitForTimeout(300);
  await cdp.send('Emulation.setCPUThrottlingRate',{rate:6});
  for(const [name,setup] of [['wave 1, no upgrades','(()=>{ window.__noBlurDock=1; __G.state().fuel=19; })()'],['bombers wave, every upgrade maxed','(()=>{ const s=__G.state(); s.fuel=19; Object.keys(s.lv).forEach(k=>s.lv[k]=3); __G.setWave(4); })()'],['Mothership, every upgrade maxed','(()=>{ const s=__G.state(); s.fuel=19; __G.setWave(5); })()']]){
    await pg.evaluate(setup); await pg.waitForTimeout(3500); await pg.keyboard.down(' '); await pg.keyboard.down('ArrowRight');
    const fps=await pg.evaluate('new Promise(r=>{let n=0;const t0=performance.now();(function f(){n++; __G.state().fuel=19; performance.now()-t0<4000?requestAnimationFrame(f):r(Math.round(n/4))})()})');
    await pg.keyboard.up(' '); await pg.keyboard.up('ArrowRight'); console.log('fps at 6x CPU slowdown,',name+':',fps); if(fps<30) bad++; }
  await ctx.close(); console.log('sets',sets.length,'| problem runs',bad); await b.close(); })();
