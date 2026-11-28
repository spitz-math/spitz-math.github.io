// Super Jump Man v28: the 6 balance fixes. node v28.js <mult copy> (needs http://localhost:8765/ serving the same file as sjm.html for the two-tab check)
const {chromium}=require('playwright'); const F=process.argv[2]; let fails=0;
const ok=(c,m,v)=>{ if(!c) fails++; console.log(c?'  ok':'  FAIL',m,v===undefined?'':JSON.stringify(v)); };
(async()=>{ const b=await chromium.launch(); const ctx=await b.newContext({viewport:{width:1366,height:620}}); const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
 const start=async(pg,url)=>{ await pg.goto(url); await pg.evaluate(()=>localStorage.clear()); await pg.reload(); await pg.waitForFunction(()=>window.__G); await pg.waitForTimeout(400); await pg.fill('#jm-nameinput','Test V'); await pg.click('#jm-go'); await pg.waitForTimeout(400); };
 await start(p,'file://'+F);
 // 1 wall kick: same wall twice is refused, other wall is fine
 const wk=await p.evaluate(()=>{ const G=__G,S=G.state(),P=G.man(); S.mv.wall=1; S.nextWay=1e9; const k=()=>{ P.on=null; P.h=3000; P.vy=-200; P.x=40; P.wallT=G.gt(); P.wallSide=1; const k0=S.kicks||0; G.jump(); G.step(1/60); return (S.kicks||0)>k0; };
   const a=k(), b2=k(); P.on=null; P.h=3000; P.vy=-200; P.x=1054-40; P.wallT=G.gt(); P.wallSide=-1; const k0=S.kicks||0; G.jump(); G.step(1/60); const c=(S.kicks||0)>k0; P.kickSide=0; return {first:a,sameAgain:b2,otherWall:c}; });
 ok(wk.first&&!wk.sameAgain&&wk.otherWall,'wall kick: once per wall until you land or switch walls',wk);
 // 2 Shift+R box pauses and eats keys for 1 s
 await p.evaluate(()=>{ __G.state().nextWay=1e9; }); await p.waitForTimeout(200);
 const e0=await p.evaluate(()=>__G.state().endAt); await p.keyboard.down('Shift'); await p.keyboard.press('R'); await p.keyboard.up('Shift'); await p.waitForTimeout(150);
 await p.keyboard.press('y'); await p.waitForTimeout(150); const s1=await p.evaluate(()=>({open:!document.getElementById('sz-ask').hidden,started:__G.state().started,gt:__G.gt()}));
 await p.waitForTimeout(1500); const s2=await p.evaluate(()=>({gt:__G.gt(),add:__G.state().endAt}));
 ok(s1.open&&s1.started,'Y in the first second does not wipe the run',s1); ok(Math.abs(s2.gt-s1.gt)<0.01&&s2.add-e0>1400,'the box pauses game time and the clock',{dgt:s2.gt-s1.gt,clockAdded:s2.add-e0});
 await p.keyboard.press('n'); await p.waitForTimeout(200); ok(await p.evaluate(()=>document.getElementById('sz-ask').hidden),'N after the lock closes the box');
 // 3 New move card closes itself after 5 s
 await p.evaluate(()=>{ const G=__G,S=G.state(),P=G.man(),pl=G.plats(); S.nextWay=10; const q=pl[10]; P.on=q; P.h=q.h; P.x=300; P.vx=0; P.vy=0; P.lastI=9; S.pi=9; });
 await p.waitForFunction(()=>!!__G.state().way,null,{timeout:5000}); for(let i=0;i<3&&await p.evaluate(()=>!!__G.state().way);i++){ await p.evaluate(()=>{ const S=__G.state(); if(!S.qDone) __G.ans(S.q.choices.findIndex(c=>c.ok)); }); await p.waitForTimeout(300); await p.keyboard.press('Enter'); await p.waitForTimeout(300); }
 const o1=await p.evaluate(()=>!!__G.state().offer); await p.waitForTimeout(5600); const o2=await p.evaluate(()=>({offer:!!__G.state().offer,mv:__G.state().mv.wall}));
 ok(o1&&!o2.offer&&o2.mv,'New move! card closes after 5 s and the move is learned',{o1,o2});
 // 4 4 s rock safety
 const rk=await p.evaluate(()=>{ const G=__G,S=G.state(),P=G.man(); S.hearts=3; const hit=()=>{ G.rocks().push({x:P.x,h:P.h+40,warn:0}); G.step(1/60); }; hit(); const h1=S.hearts; for(let i=0;i<180;i++){ G.rocks().length=0; G.step(1/60); } hit(); const h2=S.hearts; for(let i=0;i<70;i++){ G.rocks().length=0; G.step(1/60); } hit(); const h3=S.hearts; for(let i=0;i<540;i++){ G.rocks().length=0; G.step(1/60); } hit(); return {h1,after3s:h2,after4s:h3,after9s:S.hearts}; });
 ok(rk.h1===2&&rk.after3s===2&&rk.after4s===2&&rk.after9s===1,'a second rock within 4 s does nothing; v37: no second heart for 12 s, then it hits',rk);
 // 6 long answers get the small font (?set=hoy has the two-line answers)
 const h=await ctx.newPage(); await start(h,'file://'+F+'?set=hoy'); await h.evaluate(()=>{ const G=__G,S=G.state(),P=G.man(),pl=G.plats(); const q=pl[10]; P.on=q; P.h=q.h; P.x=300; P.lastI=9; S.pi=9; }); await h.waitForFunction(()=>!!__G.state().way,null,{timeout:5000}); await h.waitForTimeout(300);
 await h.evaluate(()=>{ for(let i=0;i<30;i++){ if([...document.querySelectorAll('#jm-choices .jm-ch')].some(x=>x.textContent.length>18)) break; __G.newQ(); } }); await h.waitForTimeout(200);
 const lg=await h.evaluate(()=>[...document.querySelectorAll('#jm-choices .jm-ch')].map(x=>({t:x.textContent.trim().slice(0,30),long:x.classList.contains('jmr-long'),fit:x.scrollHeight<=x.clientHeight+2})));
 await h.screenshot({path:'/tmp/claude-0/sjm27/v28_hoy.png'}); await h.close();
 ok(lg.some(x=>x.long)&&lg.every(x=>x.fit),'two-line answers get the smaller font and fit',lg);
 // 5 two tabs: answering in tab 1 freezes tab 2
 const ctx2=await b.newContext({viewport:{width:1366,height:620}}); const a=await ctx2.newPage(); await start(a,'http://localhost:8765/sjm.html');
 await a.evaluate(()=>{ const G=__G,S=G.state(),P=G.man(),pl=G.plats(); const q=pl[10]; P.on=q; P.h=q.h; P.x=300; P.lastI=9; S.pi=9; }); await a.waitForFunction(()=>!!__G.state().way,null,{timeout:5000}); await a.waitForTimeout(300);
 const t2=await ctx2.newPage(); await t2.goto('http://localhost:8765/sjm.html'); await t2.waitForFunction(()=>window.__G); await t2.waitForTimeout(600);
 await a.bringToFront(); await a.evaluate(()=>__G.ans(__G.state().q.choices.findIndex(c=>!c.ok))); await a.waitForTimeout(300); const aRes=await a.evaluate(()=>({ans:__G.state().answered,stale:__G28.stale()}));
 await t2.bringToFront(); const right=await t2.evaluate(()=>__G.state().q.choices.findIndex(c=>c.ok)); await t2.keyboard.press(String(right+1)); await t2.waitForTimeout(300);
 const st=await t2.evaluate(()=>({stale:__G28.stale(),ans:__G.state().answered,cor:__G.state().correct})); const t3=await ctx2.newPage(); await t3.goto('http://localhost:8765/sjm.html'); await t3.waitForFunction(()=>window.__G); await t3.waitForTimeout(600); const saved=await t3.evaluate(()=>({ans:__G.state().answered,cor:__G.state().correct}));
 ok(aRes.ans+st.ans<=1&&saved.ans<=1&&(aRes.stale||st.stale),'two tabs: one goes stale, so only one answer ever counts (no peek)',{aRes,st,saved});
 ok(!errs.length,'no page errors',errs); console.log(fails?fails+' FAILED':'ALL PASS'); await b.close(); process.exit(fails?1:0); })();
