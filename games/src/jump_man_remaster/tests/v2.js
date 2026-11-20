// Jump Man v2 rules: free movement, Waystones, new moves. NODE_PATH=$(npm root -g) node v2.js <mult copy> [outdir]
const {chromium}=require('playwright');
const F=process.argv[2], OUT=(process.argv[3]||'/tmp')+'/'; let fails=0;
const ok=(c,m,v)=>{ if(!c) fails++; console.log(c?'  ok':'  FAIL',m,v===undefined?'':JSON.stringify(v)); };
(async()=>{ const b=await chromium.launch();
 for(const rm of ['no-preference','reduce']){ console.log('== reduced motion:',rm);
  const ctx=await b.newContext({viewport:{width:1920,height:1080},reducedMotion:rm}); const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
  await p.goto('file://'+F); await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.waitForTimeout(700);
  await p.fill('#jm-nameinput','Test K'); await p.click('#jm-go'); await p.waitForTimeout(300);
  const st=()=>p.evaluate(()=>{ const s=__G.state(), m=__G.man(); return {ver:s.ver,way:s.way,offer:s.offer,ways:s.ways,nextWay:s.nextWay,mv:s.mv,lv:s.lv,answered:s.answered,correct:s.correct,streak:s.streak,x:Math.round(m.x),pi:s.pi,q:!!s.q}; });
  let s=await st(); ok(s.ver===3&&!s.way&&!s.q,'starts climbing with no question up',s);
  await p.keyboard.press('1'); s=await st(); ok(s.answered===0,'number keys do nothing between Waystones',s);
  await p.keyboard.down('ArrowRight'); await p.waitForTimeout(500); await p.keyboard.up('ArrowRight'); await p.keyboard.press('ArrowUp'); await p.waitForTimeout(200);
  s=await st(); ok(s.x>560,'running is free from the start',s);
  const idle=await p.evaluate(()=>document.getElementById('jm-prompt').innerText); ok(/Next Waystone in \d+ ledge/.test(idle),'panel says how far the next Waystone is',idle);
  // land on the first full floor -> Waystone
  const land=(i)=>p.evaluate(i=>{ const G=__G, P=G.man(), S=G.state(); while(G.plats().length<=i+5){ P.on=null; P.h+=2500; P.vy=0; G.step(1/60); } const pl=G.plats(); S.fog=pl[i].h-1500; const q=pl[i]; P.on=null; P.x=q.floor?300:G.cxAt(q); P.h=q.h+30; P.vy=-10; P.vx=0; P.lastI=i-1; for(let k=0;k<20;k++) G.step(1/60); return {on:P.on&&P.on.i}; },i);
  await land(10); await p.waitForTimeout(200); s=await st(); ok(s.way&&s.way.got===0&&s.q,'landing on floor 10 opens the Waystone',s);
  const gt0=await p.evaluate(()=>__G.gt()); await p.keyboard.down('ArrowRight'); await p.waitForTimeout(400); await p.keyboard.up('ArrowRight');
  ok(await p.evaluate(()=>__G.gt())===gt0,'the tower is frozen at a Waystone');
  if(rm==='no-preference') await p.screenshot({path:OUT+'v2_waystone.png'});
  const idx=(okk)=>p.evaluate(o=>__G.state().q.choices.findIndex(c=>!!c.ok===o),okk);
  await p.keyboard.press(String(await idx(false)+1)); await p.waitForTimeout(100); s=await st(); ok(s.way.got===0&&s.way.n===1&&s.streak===0,'a wrong answer still uses up one of the 3 questions',s);
  await p.waitForTimeout(1400); s=await st(); ok(s.q,'a new question comes after a miss',s);
  for(let k=0;k<2;k++){ await p.waitForTimeout(150); await p.keyboard.press(String(await idx(true)+1)); await p.waitForTimeout(600); }
  await p.waitForTimeout(500); s=await st(); ok(!s.way&&s.ways===1&&s.offer&&s.offer.join()==='wall,2'&&s.nextWay===40,'2 of 3 right: Wall Kick is learned; next Waystone 30 ledges up',s);
  ok(await p.evaluate(()=>!document.getElementById('jmr-offer').hidden),'the pick card shows');
  if(rm==='no-preference') await p.screenshot({path:OUT+'v2_pick.png'});
  await p.keyboard.press('Enter'); await p.waitForTimeout(150); s=await st(); ok(s.mv.wall&&!s.offer,'Enter takes Wall Kick and climbing goes on',s);
  await p.evaluate(()=>{ __G.state().mv.dbl=1; });
  // physics of each move, stepped by hand
  const ph=await p.evaluate(()=>{ const G=__G, S=G.state(), P=G.man(), out={dbg:{way:S.way,offer:S.offer,started:S.started,over:S.over,end:S.endAt-Date.now()}};
    const settle=()=>{ for(let i=0;i<90;i++) G.step(1/60); }; const pl=G.plats(); const fl=pl[10]; P.on=fl; P.h=fl.h; P.x=500; P.vx=0; P.vy=0; P.lastI=10; settle();
    G.jump(); for(let i=0;i<14;i++) G.step(1/60); const v1=P.vy; G.jump(); G.step(1/60); out.dbl=P.vy>v1+300; out.airJ=P.airJ; for(let i=0;i<4;i++) G.step(1/60); const v2=P.vy; G.jump(); G.step(1/60); out.noTriple=P.vy<=v2; settle();
    S.mv.triple=1; G.jump(); for(let i=0;i<10;i++) G.step(1/60); G.jump(); for(let i=0;i<6;i++) G.step(1/60); const v3=P.vy; G.jump(); G.step(1/60); out.triple=P.vy>v3+150; settle();
    S.mv.glide=1; G.jump(); G.key('j',true); out.glide=false; for(let i=0;i<70;i++){ G.step(1/60); if(P.glide&&!out.glide){ out.glide=true; out.glideVy=Math.round(P.vy); } } G.key('j',false); settle();
    S.mv.dash=1; G.jump(); for(let i=0;i<8;i++) G.step(1/60); P.face=1; G.dash(); G.step(1/60); out.dashVx=Math.round(P.vx); out.vmax=G.consts.VMAX; G.dash(); G.step(1/60); out.oneDash=P.dashed; settle();
    S.mv.wall=1; P.wallT=undefined; P.x=900; P.vx=G.consts.VMAX; G.jump(); let kicked=false; for(let i=0;i<40;i++){ G.step(1/60); if(P.wallT!==undefined&&P.wallT>0&&!kicked){ G.jump(); G.step(1/60); kicked=true; out.kickVy=Math.round(P.vy); out.kickVx=Math.round(P.vx); } } settle();
    return out; });
  ok(ph.dbl&&ph.airJ===1&&ph.noTriple,'double jump: one extra jump in the air',ph);
  ok(ph.triple,'triple jump: a second extra jump',ph);
  ok(ph.glide&&ph.glideVy===-200,'glide: holding Jump falls slowly',ph);
  ok(ph.dashVx>ph.vmax*1.3&&ph.oneDash,'air dash: a fast burst, once per jump',ph);
  ok(ph.kickVy>700&&ph.kickVx<-300,'wall kick: jumping at a wall kicks up and away',ph);
  // boosts after the moves run out
  await p.evaluate(()=>{ const S=__G.state(); ['dbl','wall','glide','dash','triple'].forEach(k=>S.mv[k]=1); });
  // reload mid-Waystone keeps the question
  await land(40); await p.waitForTimeout(150); s=await st(); const q1=await p.evaluate(()=>document.getElementById('jm-prompt').innerHTML);
  await p.reload(); await p.waitForTimeout(600); s=await st(); const q2=await p.evaluate(()=>document.getElementById('jm-prompt').innerHTML);
  ok(s.way&&q1===q2,'reload at a Waystone keeps it and the question',{way:s.way});
  for(let k=0;k<3;k++){ await p.keyboard.press(String(await idx(true)+1)); await p.waitForTimeout(800); } await p.waitForTimeout(400);
  s=await st(); ok(s.offer&&s.offer.length===2&&['jump','speed','combo','magnet'].includes(s.offer[0]),'with every move learned, the reward is a boost',s.offer);
  await p.keyboard.press('Enter'); await p.waitForTimeout(150); s=await st(); ok(Object.values(s.lv).some(v=>v===1)&&!s.offer,'a boost goes up a level',s.lv);
  const miss=await p.evaluate(()=>{ const G=__G, S=G.state(), P=G.man(); while(G.plats().length<=S.nextWay+5){ P.on=null; P.h+=2500; P.vy=0; G.step(1/60); } const pl=G.plats(); const q=pl[S.nextWay]; S.fog=q.h-1500; P.on=null; P.x=q.floor?300:G.cxAt(q); P.h=q.h+30; P.vy=-10; P.lastI=q.i-1; for(let k=0;k<20;k++) G.step(1/60);
    const lv0=JSON.stringify(S.lv); [true,false,false].forEach(r=>{ const i=S.q.choices.findIndex(c=>!!c.ok===r); S.qDone=false; G.ans(i); G.newQ(); }); const off=S.offer.slice(); const h=document.getElementById('jmr-offerh').textContent; G.pick(); return {off,h,same:JSON.stringify(S.lv)===lv0,way:!!S.way}; });
  ok(miss.off[1]===1&&miss.h==='Almost!'&&miss.same&&!miss.way,'1 of 3 right: no new move this time, climbing goes on',miss);
  // hearts and fog
  const fg=await p.evaluate(()=>{ const G=__G, S=G.state(), P=G.man(), out={}; while(G.plats().length<=S.nextWay+5){ P.on=null; P.h+=2500; P.vy=0; G.step(1/60); } const pl=G.plats(); const q=pl[S.nextWay-3]; S.fog=q.h-1500; P.on=q; P.h=q.h; P.x=G.cxAt(q); P.vx=0; P.vy=0; P.lastI=q.i; S.pi=q.i;
    G.step(1/60); const f0=S.fog; for(let i=0;i<60;i++) G.step(1/60); out.rose=Math.round(S.fog-f0); out.gap=Math.round(P.h-S.fog);
    const h0=S.hearts; S.fog=P.h+100; G.step(1/60); out.lost=h0-S.hearts; out.safe=Math.round(P.h-S.fog); out.onLedge=!!P.on;
    return out; });
  ok(fg.rose>30&&fg.rose<150&&fg.gap<=560,'after the first Waystone the fog rises below you',fg);
  ok(fg.lost===1&&fg.safe>=500&&fg.onLedge,'sinking into the fog costs a heart and lifts you to a safe ledge',fg);
  const hl=await p.evaluate(()=>{ const G=__G, S=G.state(), P=G.man(); while(G.plats().length<=S.nextWay+5){ P.on=null; P.h+=2500; P.vy=0; G.step(1/60); } const h0=S.hearts, pl=G.plats(), q=pl[S.nextWay]; S.fog=q.h-1500; P.on=null; P.x=q.floor?300:G.cxAt(q); P.h=q.h+30; P.vy=-10; P.lastI=q.i-1; for(let k=0;k<20;k++) G.step(1/60);
    const f0=S.fog; for(let k=0;k<60;k++) G.step(1/60); const frozen=S.fog===f0; for(let k=0;k<3;k++){ const i=S.q.choices.findIndex(c=>c.ok); S.qDone=false; G.ans(i); G.newQ(); } G.pick(); return {h0,h1:S.hearts,frozen}; });
  ok(hl.frozen&&hl.h1===hl.h0+1,'the fog stops at a Waystone, and passing it gives a heart back',hl);
  const go=await p.evaluate(()=>{ const G=__G, S=G.state(), P=G.man(); S.hearts=1; S.fog=P.h+100; G.step(1/60); return {over:S.over,why:document.getElementById('jmr-endwhy').textContent}; });
  ok(go.over&&go.why==='The fog caught you!','0 hearts ends the run',go);
  if(rm==='no-preference') await p.screenshot({path:OUT+'v2_fogend.png'});
  // bot: climbs for 4 minutes of game time, answering at every Waystone (2 right, 1 wrong) and picking the first card
  await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.waitForTimeout(500); await p.fill('#jm-nameinput','Bot'); await p.click('#jm-go'); await p.waitForTimeout(200);
  const bot=await p.evaluate(()=>{ const G=__G, S=G.state(), P=G.man(), c=G.consts; let stuck=0, lastTop=0, t=0, ways=0, miss=0, qs=0;
    for(let n=0;n<60*240;n++){ S.endAt=Date.now()+60000; if(S.over) break;
      if(S.offer){ G.pick(0); continue; }
      if(S.way){ const want=(qs%3!==2); const k=S.q.choices.findIndex(x=>!!x.ok===want); S.qDone=false; G.ans(k); qs++; if(!want) miss++; G.newQ(); continue; }
      const pl=G.plats(), on=P.on; const tgt=pl[P.lastI+1], dx=G.cxAt(tgt)-P.x, vm=c.VMAX; let want;
      if(on){ if(Math.abs(dx)<tgt.w/2-20){ want=0; if(Math.abs(P.vx)<90) G.jump(); } else { want=Math.sign(dx)*vm; if(Math.abs(dx)<Math.abs(P.vx)*0.55+tgt.w/2-30&&P.vx*dx>0) G.jump(); } }
      else { want=P.vy>0?Math.sign(dx)*vm:Math.max(-vm,Math.min(vm,dx*4)); if(P.vy<0&&P.h<tgt.h&&S.mv.dbl&&(P.airJ||0)<G.airMax()) G.jump(); }
      G.key('r',want-P.vx>40); G.key('l',want-P.vx<-40); G.step(1/60); t+=1/60;
      if(S.top>lastTop){ lastTop=S.top; stuck=0; } else stuck+=1/60; if(stuck>25) break; }
    G.key('r',false); G.key('l',false); return {hearts:S.hearts,over:S.over,secs:Math.round(t),floors:S.pi,meters:Math.round(S.top/20),waysOpen:!!S.way,ways:S.ways,learned:S.learned,stuck:Math.round(stuck),answered:S.answered,correct:S.correct}; });
  ok(bot.floors>=40&&bot.learned.slice(0,5).join()==='wall,dbl,glide,dash,triple','bot climbs with Waystones on the way (no dead ends)',bot);
  await p.waitForTimeout(1500); const s3=await st(); if(rm==='no-preference') await p.screenshot({path:OUT+'v2_play.png'});
  await p.evaluate(()=>__G.end()); await p.waitForTimeout(700);
  const ov=await p.evaluate(()=>{ const b=document.querySelector('#jm-end .jm-box').getBoundingClientRect(); return {bottom:b.bottom,h:innerHeight}; }); ok(ov.bottom<=ov.h,'end screen fits',ov);
  ok(errs.length===0,'no page errors',errs.slice(0,3)); await ctx.close(); }
 await b.close(); console.log(fails?fails+' FAILED':'ALL PASS'); process.exit(fails?1:0); })();
