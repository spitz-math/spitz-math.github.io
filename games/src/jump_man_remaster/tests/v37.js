// Super Jump Man v37 (balance check fixes): stuck help, full heart refill, Wall Kick goal, height pays 2 a metre, Waystone pace,
// restart box closes on any other key. node v37.js <mult copy>
const {chromium}=require('playwright'); const F=process.argv[2]; let fails=0;
const ok=(c,m,v)=>{ if(!c) fails++; console.log(c?'  ok':'  FAIL',m,v===undefined?'':JSON.stringify(v)); };
(async()=>{ const b=await chromium.launch(); const ctx=await b.newContext({viewport:{width:1366,height:620}}); const errs=[];
 await ctx.addInitScript(()=>{ window.requestAnimationFrame=()=>0; });   // the test steps the game itself
 const p=await ctx.newPage(); p.on('pageerror',e=>errs.push(String(e))); await p.goto('file://'+F); await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.waitForFunction(()=>window.__G37);
 await p.fill('#jm-nameinput','Test T'); await p.click('#jm-go'); await p.waitForFunction(()=>__G.state().started); await p.waitForTimeout(200);
 // 1 stuck help: keys in use, no new height. Hint state at 6 s, boost at 10 s, fog slowed; hands-off gets nothing
 const st=await p.evaluate(()=>{ const G=__G,S=G.state(),P=G.man(),pl=G.plats(),c=G.consts; const q=pl[3]; const stand=()=>{ P.on=q; P.h=q.h; P.x=G.cxAt(q); P.vx=0; P.vy=0; P.lastI=3; };
   stand(); G.step(1/60); const out={}; for(let k=0;k<60*5;k++){ stand(); G.step(1/60); } out.idle5=G37().t; function G37(){ return __G37.stuck(); }
   for(let k=0;k<60*12;k++){ stand(); G.step(1/60); } out.idle17=+G37().t.toFixed(1); out.idleBoost=G37().boost;
   G.key('l',true); for(let k=0;k<60*7;k++){ stand(); G.step(1/60); } out.said7=G37().said; out.t7=+G37().t.toFixed(1);
   for(let k=0;k<60*4;k++){ stand(); G.step(1/60); } out.boost11=G37().boost; G.key('l',false);
   stand(); G.jump(); G.step(1/60); G.step(1/60); out.vy=Math.round(P.vy); out.full=Math.round(c.JV+c.JK*c.VMAX); return out; });
 ok(st.idleBoost===false&&st.idle17<1,'hands-off idling builds no stuck help',st);
 ok(st.said7>=1&&st.boost11===true,'6 s stuck with keys in use shows the hint, 10 s turns on Boost Jump',st);
 ok(st.vy>st.full*1.0,'a Boost Jump from standing is higher than a full running jump',st);
 // 2 height pays 2 points a metre; a wall bump is not a bounce
 const sc=await p.evaluate(()=>{ const G=__G,S=G.state(),P=G.man(); const b0=S.bounces; P.on=null; P.h+=300; P.x=30; P.vx=-500; P.vy=200; G.key('l',true); for(let k=0;k<20;k++) G.step(1/60); G.key('l',false);
   const bumps=S.bounces-b0; S.top=2000; S.bonus=0; G.step(1/60); G.checkGoals(); const bonus=S.bonus; return {bumps,score:+document.getElementById('jm-score').textContent.replace(/\D/g,'')||S.score,m:Math.floor(S.top/20),bonus,S:S.score}; });
 ok(sc.bumps===0,'bumping a wall without a Wall Kick does not count as a bounce',sc);
 ok(sc.S-sc.bonus===sc.m*2||sc.S===sc.m*2+sc.bonus,'height pays 2 points a metre',sc);
 // 3 Waystone: 2 right from 1 heart fills all 3 hearts; the next Waystone is 30 ledges on; after 18 s of climbing it moves to the next floor
 const wy=await p.evaluate(()=>{ const G=__G,S=G.state(),P=G.man(),pl=G.plats(); const land=i=>{ while(pl.length<=i+5){ P.on=null; P.h+=2500; P.vy=0; G.step(1/60); } const q=G.plats()[i]; P.on=q; P.h=q.h; P.x=q.floor?300:G.cxAt(q); P.vx=0; P.vy=0; P.lastI=i; S.pi=i; S.top=Math.max(S.top,q.h); S.fog=q.h-900; };
   land(S.nextWay); G.step(1/60); G.step(1/60); const opened=!!S.way, at=S.way&&S.way.i; S.hearts=1; for(let k=0;k<2;k++){ const i=S.q.choices.findIndex(c=>c.ok); S.qDone=false; G.ans(i); if(S.way) G.newQ(); } G.pick();
   const out={opened,at,hearts:S.hearts,next:S.nextWay}; land(at+3); for(let k=0;k<60*17;k++){ land(at+3); G.step(1/60); } out.at17=S.nextWay; for(let k=0;k<60*3;k++){ land(at+3); G.step(1/60); } out.at20=S.nextWay; out.floor=(Math.floor((at+3)/10)+1)*10; return out; });
 ok(wy.opened&&wy.hearts===3,'2 right at a Waystone refills all hearts',wy);
 ok(wy.next===wy.at+30&&wy.at17===wy.at+30&&wy.at20===wy.floor,'the next Waystone is 30 ledges on, and after 18 s of climbing it moves to the next floor',wy);
 await p.close();
 // 4 restart box: after its lock a random key (not Y) closes it and keeps the run
 const q=await (await b.newContext({viewport:{width:1366,height:620}})).newPage(); q.on('pageerror',e=>errs.push(String(e))); await q.goto('file://'+F); await q.evaluate(()=>localStorage.clear()); await q.reload(); await q.waitForFunction(()=>window.__G37);
 await q.fill('#jm-nameinput','Test T'); await q.click('#jm-go'); await q.waitForFunction(()=>__G.state().started); await q.waitForTimeout(500);
 await q.keyboard.press('Shift+R'); await q.waitForTimeout(300); await q.keyboard.press('m'); await q.waitForTimeout(150); const locked=await q.$eval('#sz-ask',e=>!e.hidden);
 await q.waitForTimeout(1000); await q.keyboard.press('4'); await q.waitForTimeout(300);
 ok(locked&&await q.$eval('#sz-ask',e=>e.hidden)&&await q.evaluate(()=>__G.state().started),'the restart box ignores keys for 1 s, then any key but Y closes it and keeps the run');
 ok(errs.length===0,'no page errors',errs.slice(0,3)); console.log(fails?fails+' FAILED':'ALL PASS'); await b.close(); process.exit(fails?1:0); })();
