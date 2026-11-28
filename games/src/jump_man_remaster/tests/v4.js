// Jump Man v4 rules: free movement, Waystones every 50, fog held by right answers, rockfall, Summit Rush. NODE_PATH=$(npm root -g) node v4.js <mult copy> [outdir]
const {chromium}=require('playwright');
const F=process.argv[2], OUT=(process.argv[3]||'/tmp')+'/'; let fails=0;
const ok=(c,m,v)=>{ if(!c) fails++; console.log(c?'  ok':'  FAIL',m,v===undefined?'':JSON.stringify(v)); };
(async()=>{ const b=await chromium.launch();
 for(const rm of ['no-preference','reduce']){ console.log('== reduced motion:',rm);
  const ctx=await b.newContext({viewport:{width:1920,height:1080},reducedMotion:rm}); const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
  await p.goto('file://'+F); await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.waitForTimeout(700);
  await p.fill('#jm-nameinput','Test K'); await p.click('#jm-go'); await p.waitForTimeout(300);
  const st=()=>p.evaluate(()=>{ const s=__G.state(), m=__G.man(); return {ver:s.ver,way:s.way,offer:s.offer,ways:s.ways,nextWay:s.nextWay,mv:s.mv,lv:s.lv,answered:s.answered,correct:s.correct,streak:s.streak,x:Math.round(m.x),pi:s.pi,q:!!s.q}; });
  let s=await st(); ok(s.ver===6&&!s.way&&!s.q,'starts climbing with no question up',s);
  await p.keyboard.press('1'); s=await st(); ok(s.answered===0,'number keys do nothing between Waystones',s);
  await p.keyboard.down('ArrowRight'); await p.waitForTimeout(500); await p.keyboard.up('ArrowRight'); await p.keyboard.press('ArrowUp'); await p.waitForTimeout(200);
  s=await st(); ok(s.x>560,'running is free from the start',s);
  const idle=await p.evaluate(()=>document.getElementById('jm-prompt').textContent); ok(/Next Waystone in \d+ ledge/.test(idle),'panel says how far the next Waystone is',idle);
  // land on the first full floor -> Waystone
  const land=(i)=>p.evaluate(i=>{ const G=__G, P=G.man(), S=G.state(); while(G.plats().length<=i+5){ P.on=null; P.h+=2500; P.vy=0; G.step(1/60); } const pl=G.plats(); S.fog=pl[i].h-1500; const q=pl[i]; P.on=null; P.x=q.floor?300:G.cxAt(q); P.h=q.h+30; P.vy=-10; P.vx=0; P.lastI=i-1; for(let k=0;k<20;k++) G.step(1/60); return {on:P.on&&P.on.i}; },i);
  await land(10); await p.waitForTimeout(200); s=await st(); ok(s.way&&s.way.got===0&&s.q,'landing on floor 10 opens the Waystone',s);
  const gt0=await p.evaluate(()=>__G.gt()); await p.keyboard.down('ArrowRight'); await p.waitForTimeout(400); await p.keyboard.up('ArrowRight');
  ok(await p.evaluate(()=>__G.gt())===gt0,'the tower is frozen at a Waystone');
  if(rm==='no-preference') await p.screenshot({path:OUT+'v2_waystone.png'});
  const idx=(okk)=>p.evaluate(o=>__G.state().q.choices.findIndex(c=>!!c.ok===o),okk);
  await p.keyboard.press(String(await idx(false)+1)); await p.waitForTimeout(100); s=await st(); ok(s.way.got===0&&s.way.n===1&&s.streak===0,'a wrong answer still uses up one of the 3 questions',s);
  await p.waitForTimeout(1300); ok(await p.evaluate(()=>__G.state().qDone),'after a miss the answer stays up (no auto-advance)');
  await p.keyboard.press('Enter'); await p.waitForTimeout(100); ok(await p.evaluate(()=>__G.state().qDone),'Enter is locked for 2 s after a miss');
  await p.waitForTimeout(800); await p.keyboard.press('Enter'); await p.waitForTimeout(150); s=await st(); ok(s.q&&!(await p.evaluate(()=>__G.state().qDone)),'after 2 s, Enter brings the next question',s);
  for(let k=0;k<1;k++){ await p.waitForTimeout(450); await p.keyboard.press(String(await idx(true)+1)); await p.waitForTimeout(1700); }
  s=await st(); ok(s.way&&s.way.n===2&&s.q,'v13: after a miss, 1 right brings the spare question',s);
  await p.waitForTimeout(450); await p.keyboard.press(String(await idx(false)+1)); await p.waitForTimeout(2100); await p.keyboard.press('Enter');   /* a second miss ends the Waystone */
  await p.waitForTimeout(500); s=await st(); ok(!s.way&&s.ways===1&&s.offer&&s.offer[0]==='wall'&&s.offer[1]===1&&s.nextWay===40,'1 right: the card shows Wall Kick (locked); next Waystone 30 ledges up',s);
  ok(await p.evaluate(()=>!document.getElementById('jmr-offer').hidden),'the pick card shows');
  if(rm==='no-preference') await p.screenshot({path:OUT+'v2_pick.png'});
  await p.waitForTimeout(800); await p.keyboard.press('Enter'); await p.waitForTimeout(150); s=await st(); ok(!s.mv.wall&&!s.offer,'v13: 1 right is not enough; Enter closes the card with no move learned',s);
  await p.evaluate(()=>{ __G.state().mv.wall=1; __G.state().mv.dbl=1; });
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
  await land(50); await p.waitForTimeout(150); s=await st(); const q1=await p.evaluate(()=>document.getElementById('jm-prompt').innerHTML);
  await p.reload(); await p.waitForTimeout(600); s=await st(); const q2=await p.evaluate(()=>document.getElementById('jm-prompt').innerHTML);
  ok(s.way&&q1===q2,'reload at a Waystone keeps it and the question',{way:s.way});
  for(let k=0;k<2;k++){ await p.waitForTimeout(450); await p.keyboard.press(String(await idx(true)+1)); await p.waitForTimeout(1700); } await p.waitForTimeout(400);
  s=await st(); ok(s.offer&&s.offer.length===3&&['jump','speed','combo','magnet'].includes(s.offer[0]),'with every move learned, the reward is a boost',s.offer);
  await p.waitForTimeout(800); await p.keyboard.press('Enter'); await p.waitForTimeout(150); s=await st(); ok(Object.values(s.lv).some(v=>v===1)&&!s.offer,'a boost goes up a level',s.lv);
  const miss=await p.evaluate(()=>{ const G=__G, S=G.state(), P=G.man(); while(G.plats().length<=S.nextWay+5){ P.on=null; P.h+=2500; P.vy=0; G.step(1/60); } const pl=G.plats(); const q=pl[S.nextWay]; S.fog=q.h-1500; P.on=null; P.x=q.floor?300:G.cxAt(q); P.h=q.h+30; P.vy=-10; P.lastI=q.i-1; for(let k=0;k<20;k++) G.step(1/60);
    const lv0=JSON.stringify(S.lv); [true,false,false].forEach(r=>{ const i=S.q.choices.findIndex(c=>!!c.ok===r); S.qDone=false; G.ans(i); G.newQ(); }); const off=S.offer.slice(); const h=document.getElementById('jmr-offerh').textContent; G.pick(); return {off,h,same:JSON.stringify(S.lv)===lv0,way:!!S.way}; });
  ok(miss.off[1]===1&&miss.h==='So close!'&&miss.same&&!miss.way,'v13: 1 right then 2 misses (So close!): no new move this time, climbing goes on',miss);
  // hearts and fog
  const fg=await p.evaluate(()=>{ const G=__G, S=G.state(), P=G.man(), out={}; while(G.plats().length<=S.nextWay+5){ P.on=null; P.h+=2500; P.vy=0; G.step(1/60); } const pl=G.plats(); const q=pl[S.nextWay-3]; S.fog=q.h-1500; S.calm=0; P.on=q; P.h=q.h; P.x=G.cxAt(q); P.vx=0; P.vy=0; P.lastI=q.i; S.pi=q.i;
    G.step(1/60); const f0=S.fog; for(let i=0;i<60;i++) G.step(1/60); out.rose=Math.round(S.fog-f0); out.gap=Math.round(P.h-S.fog);
    const h0=S.hearts; S.fog=P.h+100; G.step(1/60); out.lost=h0-S.hearts; out.safe=Math.round(P.h-S.fog); out.onLedge=!!P.on;
    return out; });
  ok(fg.rose>20&&fg.rose<120&&fg.gap<=1200+3*180,'after the first Waystone the fog rises below you',fg);
  ok(fg.lost===1&&fg.safe>=500&&fg.onLedge,'sinking into the fog costs a heart and lifts you to a safe ledge',fg);
  const hl=await p.evaluate(()=>{ const G=__G, S=G.state(), P=G.man(); while(G.plats().length<=S.nextWay+5){ P.on=null; P.h+=2500; P.vy=0; G.step(1/60); } const h0=S.hearts, pl=G.plats(), q=pl[S.nextWay]; S.fog=q.h-1500; P.on=null; P.x=q.floor?300:G.cxAt(q); P.h=q.h+30; P.vy=-10; P.lastI=q.i-1; for(let k=0;k<20;k++) G.step(1/60);
    const f0=S.fog; for(let k=0;k<60;k++) G.step(1/60); const frozen=S.fog===f0; for(let k=0;k<2;k++){ const i=S.q.choices.findIndex(c=>c.ok); S.qDone=false; G.ans(i); G.newQ(); } G.pick(); return {h0,h1:S.hearts,frozen}; });
  ok(hl.frozen&&hl.h1===hl.h0+1,'the fog stops at a Waystone, and passing it gives a heart back',hl);
  const go=await p.evaluate(()=>{ const G=__G, S=G.state(), P=G.man(); S.hearts=1; S.climbT+=14; S.fog=P.h+100; G.step(1/60); return {over:S.over,why:document.getElementById('jmr-endwhy').textContent}; });
  ok(go.over&&go.why.indexOf('The fog caught you!')===0,'0 hearts ends the run',go);
  if(rm==='no-preference') await p.screenshot({path:OUT+'v2_fogend.png'});

  // v4: 2 right heals, right answers hold the fog, rockfall, Summit Rush
  const v4=await p.evaluate(()=>{ const G=__G, S=G.state(), P=G.man(), out={}; S.over=false; S.fogOut=false; S.hearts=2; S.calm=0;
    while(G.plats().length<=S.nextWay+60){ P.on=null; P.h+=2500; P.vy=0; G.step(1/60); }
    let pl=G.plats(), q=pl[S.nextWay]; S.fog=q.h-1500; P.on=null; P.x=q.floor?300:G.cxAt(q); P.h=q.h+30; P.vy=-10; P.lastI=q.i-1; for(let k=0;k<20;k++) G.step(1/60);
    out.opened=!!S.way; [true,true].forEach(r=>{ const i=S.q.choices.findIndex(c=>!!c.ok===r); S.qDone=false; G.ans(i); G.newQ(); });
    out.calm=S.calm; out.hearts=S.hearts; out.offer=S.offer&&S.offer.slice(); G.pick();
    // the fog is held while calm > 0
    const f0=S.fog; P.on=null; P.h=S.fog+700; P.vy=0; G.step(1/60); out.heldGap=Math.round(P.h-S.fog); for(let k=0;k<30;k++){ P.h=S.fog+700; P.vy=0; G.step(1/60); } out.calmAfter=+S.calm.toFixed(2);
    // rockfall: stand in a rock stretch for 4 s; rocks fall and a hit never costs a heart
    pl=G.plats(); let ri=21; /* rocks fall on ledges 20-29 (then 50-59 ...): ROCK_FROM 20, every 30. Stay inside that stretch: skipping every moving or special ledge used to walk past 29 on about 1 tower in 4 */ while(ri<28&&(pl[ri].kind==='crumble'||pl[ri].kind==='spring'||pl[ri].floor)) ri++; const rq=pl[ri]; S.calm=99; P.on=rq; P.h=rq.h; P.x=G.cxAt(rq); P.vx=0; P.vy=0; P.lastI=ri; S.pi=ri;
    S.fog=rq.h-2000; const seenS=new Set(); for(let k=0;k<240;k++){ P.on=rq; P.h=rq.h; P.vy=0; P.vx=0; G.step(1/60); G.rocks().forEach(r=>seenS.add(r)); } const seen=seenS.size; out.rockOn=S.rockOn; out.seen=seen; 
    return out; });
  ok(v4.opened&&v4.hearts===3&&v4.offer[1]===2&&v4.offer[2]===1,'v13: 2 right gives a heart back',v4);
  ok(v4.calm===0,'v12: right answers push the fog back instead of holding it',v4);
  ok(v4.heldGap>=530,'the fog stays below you',v4);
  ok(v4.rockOn&&v4.seen>=2,'rockfall starts halfway between Waystones',v4);
  const bk=await p.evaluate(()=>{ const G=__G, S=G.state(), P=G.man(); for(let k=0;k<260;k++){ G.rocks().length=0; G.step(1/60); } /* 4 s rock safety since v28 */ S.climbT+=14; /* v37: one heart at most per 12 s */ G.rocks().length=0; const r={x:P.x,h:P.h+40,warn:0}; G.rocks().push(r); S.hearts=3; const h0=S.hearts, c0=S.combos; G.step(1/60); const one=S.hearts===h0; for(let k=0;k<260;k++){ G.rocks().length=0; G.step(1/60); } S.hearts=1; G.rocks().push({x:P.x,h:P.h+40,warn:0}); G.step(1/60); const last=S.hearts===1&&!S.over; S.hearts=3; return {bonked:G.rocks().indexOf(r)<0, hearts:one&&last, vx:Math.round(P.vx)}; });
  ok(bk.bonked&&!bk.hearts,'v13: a rock hit costs a heart (never the last one)',bk);
  // Summit Rush in the last minute
  const ru=await p.evaluate(()=>{ const G=__G, S=G.state(), P=G.man(), out={}; G.rocks().length=0; S.calm=99; S.endAt=Date.now()+59000; G.step(1/60); out.rush=!!S.rush; if(!S.rush) return {dbg:{over:S.over,way:!!S.way,offer:S.offer,left:S.endAt-Date.now(),hearts:S.hearts}}; out.ti=S.rush.i-S.pi;
    out.noWay=true; const pl0=G.plats(); const w=pl0[S.nextWay]; if(w){ P.on=null; P.x=w.floor?300:G.cxAt(w); P.h=w.h+30; P.vy=-10; P.lastI=w.i-1; for(let k=0;k<20;k++) G.step(1/60); out.noWay=!S.way; }
    const b0=S.bonus, pl=G.plats(), q=pl[S.rush.i]; P.on=null; P.x=G.cxAt(q); P.h=q.h+30; P.vy=-10; P.lastI=q.i-1; for(let k=0;k<20;k++) G.step(1/60);
    out.paid=S.bonus-b0; out.n=S.rush.n; out.next=S.rush.i-q.i; out.fast=G.fogSpeed(); S.rush=null; out.slow=G.fogSpeed(); return out; });
  ok(ru.rush&&ru.ti>=40,'the Summit Rush starts with a minute left, lantern 40 ledges up',ru);
  ok(ru.noWay,'no Waystone stops you during the Summit Rush',ru);
  ok(ru.paid>=400&&ru.n===1&&ru.next>=30,'reaching the lantern pays 400 and sets the next one 30 higher',ru);
  ok(Math.abs(ru.fast/ru.slow-1.25)<0.01,'the fog runs 25% faster in the rush',ru);
  // idle: the fog comes at 20 s even before a Waystone
  await p.evaluate(()=>{ __G.state().started=false; localStorage.clear(); }); await p.reload(); await p.waitForTimeout(500); await p.fill('#jm-nameinput','Idle K'); await p.click('#jm-go'); await p.waitForTimeout(200);
  const idl=await p.evaluate(()=>{ const G=__G, S=G.state(), P=G.man(); S.endAt=Date.now()+600000; const out={}; for(let k=0;k<60*19;k++) G.step(1/60); out.on19=G.fogOn(); for(let k=0;k<60*2;k++) G.step(1/60); out.on21=G.fogOn();
    let t=21; while(!S.over&&t<300){ S.endAt=Date.now()+600000; G.step(1/60); t+=1/60; } out.overAt=Math.round(t); out.score=S.score; out.why=S.fogOut; return out; });
  ok(!idl.on19&&idl.on21,'standing still: the fog starts at 20 s',idl);
  ok(idl.why&&idl.overAt<150&&idl.score<150,'standing still loses: the fog ends the run in under 2.5 min',idl);
  await p.evaluate(()=>{ __G.state().started=false; localStorage.clear(); }); await p.reload(); await p.waitForTimeout(500); await p.fill('#jm-nameinput','Test K'); await p.click('#jm-go'); await p.waitForTimeout(200);
  // bot: climbs for 4 minutes of game time, answering at every Waystone (all right) and picking the first card
  await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.waitForTimeout(500); await p.fill('#jm-nameinput','Bot'); await p.click('#jm-go'); await p.waitForTimeout(200);
  const bot=await p.evaluate(()=>{ const G=__G, S=G.state(), P=G.man(), c=G.consts; let stuck=0, lastTop=0, t=0, ways=0, miss=0, qs=0;
    for(let n=0;n<60*240;n++){ S.endAt=Date.now()+600000; if(S.over) break;
      if(S.offer){ G.pick(0); continue; }
      if(S.way){ const want=true; const k=S.q.choices.findIndex(x=>!!x.ok===want); S.qDone=false; G.ans(k); qs++; if(!want) miss++; G.newQ(); continue; }
      const pl=G.plats(), on=P.on; const tgt=pl[P.lastI+1], dx=G.cxAt(tgt)-P.x, vm=c.VMAX; let want;
      if(on){ if(Math.abs(dx)<tgt.w/2-20){ want=0; if(Math.abs(P.vx)<90) G.jump(); } else { want=Math.sign(dx)*vm; if(Math.abs(dx)<Math.abs(P.vx)*0.55+tgt.w/2-30&&P.vx*dx>0) G.jump(); } }
      else { want=P.vy>0?Math.sign(dx)*vm:Math.max(-vm,Math.min(vm,dx*4)); if(P.vy<0&&P.h<tgt.h&&S.mv.dbl&&(P.airJ||0)<G.airMax()) G.jump(); }
      G.key('r',want-P.vx>40); G.key('l',want-P.vx<-40); G.step(1/60); t+=1/60;
      if(S.top>lastTop){ lastTop=S.top; stuck=0; } else stuck+=1/60; if(stuck>25) break; }
    G.key('r',false); G.key('l',false); return {hearts:S.hearts,over:S.over,secs:Math.round(t),floors:S.pi,meters:Math.round(S.top/20),waysOpen:!!S.way,ways:S.ways,learned:S.learned,stuck:Math.round(stuck),answered:S.answered,correct:S.correct}; });
  ok(bot.floors>=40&&bot.learned.slice(0,5).join()==='wall,dbl,glide,dash,triple','bot climbs with Waystones on the way (no dead ends)',bot);
  await p.waitForTimeout(1500); const s3=await st(); if(rm==='no-preference') await p.screenshot({path:OUT+'v2_play.png'});
  await p.evaluate(()=>{ const S=__G.state(); S.offer=['dbl',2,0]; }); await p.evaluate(()=>__G.end()); await p.waitForTimeout(700);
  const en=await p.evaluate(()=>({offer:!document.getElementById('jmr-offer').hidden, again:document.getElementById('jm-again').disabled})); ok(!en.offer&&en.again,'end: the reward card closes and Play again waits',en);
  await p.waitForTimeout(2100); ok(!(await p.evaluate(()=>document.getElementById('jm-again').disabled)),'Play again works after 2 s');
  const ov=await p.evaluate(()=>{ const b=document.querySelector('#jm-end .jm-box').getBoundingClientRect(); return {bottom:b.bottom,h:innerHeight}; }); ok(ov.bottom<=ov.h,'end screen fits',ov);
  ok(errs.length===0,'no page errors',errs.slice(0,3)); await ctx.close(); }
 await b.close(); console.log(fails?fails+' FAILED':'ALL PASS'); process.exit(fails?1:0); })();
