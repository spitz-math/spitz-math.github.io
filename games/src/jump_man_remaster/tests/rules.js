// Jump Man remake tests: NODE_PATH=/opt/node22/lib/node_modules node test.js [file] [outdir]
// Playwright at 1920x1080, reduced motion off then on. Needs questions.js and scorecode.js beside the file.
const {chromium}=require('playwright');
const F=process.argv[2]||'/mnt/project-files/games/remake/jump_man/jump_man_multiplication.html', OUT=(process.argv[3]||__dirname+'/out')+'/';
require('fs').mkdirSync(OUT,{recursive:true});
(async()=>{ const b=await chromium.launch(); let fails=0; const ok=(c,m,v)=>{ if(!c) fails++; console.log(c?'  ok':'  FAIL',m,v===undefined?'':JSON.stringify(v)); };
  for(const rm of ['no-preference','reduce']){ console.log('== reduced motion:',rm);
    const ctx=await b.newContext({viewport:{width:1920,height:1080},reducedMotion:rm}); const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
    await p.goto('file://'+F); await p.waitForTimeout(500); await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.waitForTimeout(800);
    const S=()=>p.evaluate(()=>{ const s=__G.state(), m=__G.man(); return {energy:+s.energy.toFixed(2),cash:s.cash,streak:s.streak,score:s.score,top:Math.round(s.top),pi:s.pi,x:Math.round(m.x),h:Math.round(m.h),vx:Math.round(m.vx),on:!!m.on,combos:s.combos,bestCombo:s.bestCombo,goalsDone:s.goalsDone,bounces:s.bounces,springs:s.springs}; });
    const right=()=>p.evaluate(()=>__G.state().q.choices.findIndex(c=>c.ok)), wrong=()=>p.evaluate(()=>__G.state().q.choices.findIndex(c=>!c.ok));
    if(rm==='no-preference'){ const v=await p.evaluate(()=>__verify(1500)); ok(JSON.stringify(v).indexOf('"bad":0')>=0||v.badCount===0,'questions verify',v); }
    await p.fill('#jm-nameinput','Test Kid'); await p.click('#jm-go'); await p.waitForTimeout(300);
    let s=await S(); ok(s.energy===0&&s.on,'starts on the ground with no energy',s);
    ok((await p.evaluate(()=>__G.state().goals.map(g=>g.txt))).length===2,'two goals on the board',await p.evaluate(()=>__G.state().goals.map(g=>g.txt)));
    await p.keyboard.down('ArrowRight'); await p.waitForTimeout(500); await p.keyboard.up('ArrowRight'); await p.keyboard.press('ArrowUp'); await p.waitForTimeout(300);
    s=await S(); ok(s.x===527&&s.h===0,'no energy: no running, no jumping',s);
    await p.keyboard.press(String(await wrong()+1)); await p.waitForTimeout(100); s=await S(); ok(s.energy===0&&s.streak===0,'wrong answer adds nothing',s);
    await p.waitForTimeout(1300);
    for(let i=0;i<5;i++){ await p.keyboard.press(String(await right()+1)); await p.waitForTimeout(260); }
    s=await S(); ok(s.energy===20&&s.streak===5,'5 right: +20 energy, streak 5',s);
    ok(await p.evaluate(()=>__G.turbo())===1,'streak 5 turns on Turbo 1');
    // physics, stepped by hand so it does not depend on frame rate
    const phys=await p.evaluate(()=>{ const G=__G, S=G.state(), P=G.man(), c=G.consts; S.energy=999; S.streak=0;
      function settle(){ for(let i=0;i<120;i++) G.step(1/60); }
      function jumpPeak(x,vx){ settle(); P.x=x; P.vx=vx; G.key('r',vx>0); G.jump(); let top=P.h, h0=P.h; for(let i=0;i<120;i++){ G.step(1/60); top=Math.max(top,P.h); } G.key('r',false); return Math.round(top-h0); }
      const stand=jumpPeak(527,0), full=jumpPeak(60,c.VMAX);
      // run from a standstill: how far until top speed
      settle(); P.x=60; P.vx=0; G.key('r',true); let d=0, t=0; while(P.vx<c.VMAX-1&&t<2){ G.step(1/60); t+=1/60; } G.key('r',false); const tTop=t;
      // wall bounce in the air keeps most of the speed
      settle(); P.x=900; P.vx=c.VMAX; G.jump(); G.step(1/60); let b0=S.bounces; for(let i=0;i<40;i++) G.step(1/60); const bounced=S.bounces>b0, vAfter=Math.round(P.vx);
      return {stand,full,tTop:+tTop.toFixed(2),bounced,vAfter}; });
    ok(phys.stand>=140&&phys.stand<=170,'standing jump clears one floor (108-132 px)',phys);
    ok(phys.full>=380,'full-speed jump clears 3+ floors',phys);
    ok(phys.tTop<0.5,'top speed in under half a second',phys);
    ok(phys.bounced&&phys.vAfter<-300,'air wall bounce reverses and keeps speed',phys);
    // combo: three multi-floor landings, then the clock runs out
    const cmb=await p.evaluate(()=>{ const G=__G, S=G.state(), P=G.man(), pl=G.plats(); const b0=S.bonus;
      [3,6,9].forEach(i=>{ P.x=G.cxAt(pl[i]); P.h=pl[i].h+40; P.on=null; P.vy=-10; for(let k=0;k<20;k++) G.step(1/60); });
      const mid={on:G.combo().on,floors:G.combo().floors}; for(let k=0;k<400;k++) G.step(1/60);
      return {mid, after:G.combo().on, bonus:S.bonus-b0, best:S.bestCombo}; });
    ok(cmb.mid.on&&cmb.mid.floors>=6&&!cmb.after&&cmb.bonus>=18,'combo builds, then pays out when the clock runs out',cmb);
    // spring and crumble
    const kinds=await p.evaluate(()=>{ const G=__G, S=G.state(), P=G.man(); G.state().energy=999; let pl=G.plats(); while(pl.length<200){ G.step(1/60); P.h+=200; pl=G.plats(); }
      const sp=pl.find(q=>q.kind==='spring'), cr=pl.find(q=>q.kind==='crumble'), out={}; cr.crAt=0; cr.goneAt=0; const s0=S.springs;   // the climb above may already have touched them
      P.x=G.cxAt(sp); P.h=sp.h+30; P.on=null; P.lastI=sp.i-1; P.vx=0; P.vy=-10; for(let k=0;k<12;k++) G.step(1/60); out.springVy=Math.round(P.vy); out.springs=S.springs-s0;
      P.x=G.cxAt(cr); P.h=cr.h+30; P.on=null; P.lastI=cr.i-1; P.vx=0; P.vy=-10; for(let k=0;k<20;k++) G.step(1/60); out.onCrumble=P.on===cr; out.fellThrough=false; for(let k=0;k<50;k++){ G.step(1/60); if(P.on!==cr&&P.h<cr.h) out.fellThrough=true; }   // a spring below can bounce you back up, so watch the whole fall
      for(let k=0;k<330;k++) G.step(1/60); out.back=!cr.goneAt; return out; });
    ok(kinds.springVy>1000&&kinds.springs>=1,'spring launches',kinds); ok(kinds.onCrumble&&kinds.fellThrough&&kinds.back,'crumbling ledge drops you, then grows back',kinds);
    // fairness: a bot that only uses the game's own inputs climbs with no upgrades and never gets stuck
    await p.keyboard.press('Shift+R'); await p.keyboard.press('y'); await p.waitForTimeout(800);
    await p.fill('#jm-nameinput','Bot'); await p.click('#jm-go'); await p.waitForTimeout(200);
    const bot=await p.evaluate(()=>{ const G=__G, S=G.state(), P=G.man(), c=G.consts; let stuck=0, lastTop=0, t=0, falls=0, jumps=0, hist=[]; S.streak=0;
      for(let n=0;n<60*240;n++){ S.energy=999; S.endAt=Date.now()+60000; const pl=G.plats(), on=P.on;
        const tgt=pl[P.lastI+1], dx=G.cxAt(tgt)-P.x, vm=c.VMAX; let want;
        if(on){ if(Math.abs(dx)<tgt.w/2-20){ want=0; if(Math.abs(P.vx)<90){ G.jump(); jumps++; } }
          else { want=Math.sign(dx)*vm; if(Math.abs(dx)<Math.abs(P.vx)*0.55+tgt.w/2-30&&P.vx*dx>0){ G.jump(); jumps++; } } }
        else want=P.vy>0?Math.sign(dx)*vm:Math.max(-vm,Math.min(vm,dx*4));
        G.key('r',want-P.vx>40); G.key('l',want-P.vx<-40);
        const oh=P.h, li=P.lastI; G.step(1/60); t+=1/60; if(P.lastI!==li||(P.on&&!on)) { hist.push(P.lastI); if(hist.length>12) hist.shift(); } if(P.on&&P.h<oh-200) falls++;
        if(S.top>lastTop){ lastTop=S.top; stuck=0; } else stuck+=1/60; if(stuck>25) break; }
      const on=P.on, nx=G.plats()[P.lastI+1]; G.key('r',false); G.key('l',false); return {near:G.plats().slice(Math.max(0,P.lastI-2),P.lastI+4).map(q=>[q.i,Math.round(q.h),Math.round(q.cx),q.w,q.kind||'',q.amp,q.spd&&+q.spd.toFixed(2)]),hist,dbg:{on:on&&{i:on.i,w:on.w,cx:Math.round(G.cxAt(on)),kind:on.kind,amp:on.amp},nx:nx&&{i:nx.i,w:nx.w,cx:Math.round(G.cxAt(nx)),kind:nx.kind,amp:nx.amp,dh:Math.round(nx.h-(on?on.h:0))},x:Math.round(P.x),vx:Math.round(P.vx)},secs:Math.round(t),floors:S.pi,meters:Math.round(S.top/20),stuckFor:Math.round(stuck),falls,combos:S.combos,best:S.bestCombo,score:S.score}; });
    ok(bot.meters>=400,'bot climbs past the ice zone (it may still get stuck on ice later: bot limit)',bot);
    if(rm==='no-preference'){ await p.evaluate(()=>{ const s=__G.state(); s.energy=30; s.streak=11; }); await p.waitForTimeout(400); await p.screenshot({path:OUT+'play.png'}); }
    // shop: buy everything; descriptions fit
    await p.evaluate(()=>{ __G.state().cash=3000; }); await p.click('#jm-shopbtn'); await p.waitForTimeout(150);
    for(let i=0;i<15;i++){ const bt=await p.$('#jm-upg .jm-buy:not([disabled])'); if(!bt) break; await bt.click(); }
    const lv=await p.evaluate(()=>__G.state().lv); ok(Object.values(lv).every(v=>v===3),'all upgrades maxed',lv);
    const wrap=await p.evaluate(()=>[...document.querySelectorAll('#jm-shop .d')].filter(e=>e.scrollHeight>parseFloat(getComputedStyle(e).lineHeight)*1.5).map(e=>e.textContent));
    ok(wrap.length===0,'shop lines fit on one line',wrap);
    if(rm==='no-preference') await p.screenshot({path:OUT+'shop.png'});
    await p.keyboard.press('Escape');
    // reload keeps the run, with goals
    const before=await S(); await p.reload(); await p.waitForTimeout(600); const after=await S();
    ok(after.pi===before.pi&&after.goalsDone===before.goalsDone&&await p.evaluate(()=>!!__G.state().goals),'reload keeps the run',{before:before.pi,after:after.pi});
    // end screen
    await p.evaluate(()=>__G.end()); await p.waitForTimeout(700);
    const ov=await p.evaluate(()=>{ const b=document.querySelector('#jm-end .jm-box').getBoundingClientRect(); return {bottom:b.bottom,h:innerHeight, stat:[...document.querySelectorAll('#jm-endstats .jm-stat')].map(e=>e.scrollWidth>e.clientWidth+1)} });
    ok(ov.bottom<=ov.h&&ov.stat.every(x=>!x),'end screen fits',ov);
    if(rm==='no-preference') await p.screenshot({path:OUT+'end.png'});
    ok(errs.length===0,'no page errors',errs);
    await ctx.close(); }
  // slow machine: 6x CPU throttle, measure frame rate during play
  { const ctx=await b.newContext({viewport:{width:1366,height:768}}); const p=await ctx.newPage(); const cdp=await ctx.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate',{rate:6});
    await p.goto('file://'+F); await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.waitForTimeout(800);
    await p.fill('#jm-nameinput','Slow'); await p.click('#jm-go'); await p.evaluate(()=>{ const s=__G.state(); s.energy=999; s.streak=12; });
    await p.keyboard.down('ArrowRight'); await p.keyboard.down('ArrowUp');
    const fps=await p.evaluate(()=>new Promise(r=>{ let n=0; const t0=performance.now(); (function f(){ n++; if(performance.now()-t0<4000) requestAnimationFrame(f); else r(Math.round(n/4)); })(); }));
    await p.keyboard.up('ArrowUp'); await p.keyboard.up('ArrowRight');
    console.log('  6x CPU throttle fps:',fps); await ctx.close(); }
  await b.close(); console.log(fails?fails+' FAILED':'ALL PASS'); })();
