/* final-pass checks: Warden-fight levels are paid out before the Last Stand; long builds always fit the panel; held number key does not answer twice; captions readable */
const {chromium}=require('playwright'); const path=require('path'); const D=path.join(__dirname,'..','out');
(async()=>{ const b=await chromium.launch(); const pg=await (await b.newContext({viewport:{width:1366,height:768}})).newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(String(e)));
 const run=n=>pg.evaluate(n=>{ for(let i=0;i<n;i++) __G.step(1/60); },n); const out={};
 await pg.goto('file://'+D+'/rook_and_ruin_mult.html'); await pg.evaluate('localStorage.clear()'); await pg.reload(); await pg.waitForTimeout(600);
 await pg.fill('#dn-nameinput','Test T'); await pg.click('#dn-go'); await pg.waitForTimeout(300); await pg.keyboard.press('Escape'); await pg.waitForTimeout(1200);
 // 1. boss levels before the Last Stand
 await pg.evaluate(()=>{ const S=__G.state(); S.w.picks=3; __G.give('wave',1); __G.room('boss','s'); S.w.p.inv=999; }); await run(60*3);
 await pg.evaluate(()=>{ const w=__G.state().w; for(let i=0;i<12;i++) w.gems.push({x:200+i*10,y:300,v:2,m:0}); w.boss.hp=1; w.boss.x=w.p.x+40; w.boss.y=w.p.y; w.p.fx=1; w.p.fy=0; __G.swing(); }); await run(40);
 out.afterKill=await pg.evaluate(()=>{ const w=__G.state().w; return {victory:w.victory>0,pend:w.pend,gems:w.gems.length,last:w.last}; });
 await run(60*3); out.afterVictory=await pg.evaluate(()=>{ const S=__G.state(); return {mode:S.mode,why:S.ask&&S.ask.why,last:S.w.last,preLast:S.w.preLast}; });
 await pg.reload(); await pg.waitForTimeout(1200); out.reloadMid=await pg.evaluate(()=>{ const S=__G.state(); return {mode:S.mode,why:S.ask&&S.ask.why,preLast:S.w.preLast}; });
 let guard=0; while(guard++<30){ const m=await pg.evaluate(()=>{ const S=__G.state(); if(S.mode==='ask'){ if(!S.qDone) __G.answer(S.q.choices.findIndex(c=>c.ok)); else __G.askNext(); } else if(S.mode==='pick') __G.pick(0); else for(let i=0;i<30;i++) __G.step(1/60); return S.mode+(S.w.last>0?' LAST':''); }); if(/LAST/.test(m)) break; await pg.waitForTimeout(120); }
 out.thenLast=await pg.evaluate(()=>{ const S=__G.state(), w=S.w; return {mode:S.mode,last:w.last>0,pend:w.pend,preLast:w.preLast,powers:Object.keys(w.b).length,answered:S.answered}; });
 // 2. long build fits the panel
 const fits=()=>pg.evaluate(()=>{ const bp=document.getElementById('dn-build'), bl=document.getElementById('dn-buildlist'); const last=bl.lastElementChild.getBoundingClientRect(), box=bp.getBoundingClientRect(); return {cls:bl.className,fits:last.bottom<=box.bottom+1&&bp.scrollHeight<=bp.clientHeight+2,n:bl.querySelectorAll('.dn-bi').length}; });
 await pg.evaluate(()=>{ ['wave','spark','bash','heart'].forEach(k=>__G.give(k,2)); }); out.build4=await fits(); await pg.screenshot({path:D+'/tour/40_build_4.png'});
 await pg.evaluate(()=>{ ['whirl','volatile','orbit','thorns','boots','tcharge','stormcall'].forEach(k=>__G.give(k,k.length>6?1:2)); }); out.build11=await fits(); await pg.screenshot({path:D+'/tour/41_build_11.png'});
 await pg.evaluate(()=>{ ['riposte','edge','ricochet','aegis','ward','splitwave','bladestorm','overcharge','tempest','shrapnel','spite','thunder','executioner','battlespin','bladering'].forEach(k=>__G.give(k,k.length>6?1:3)); }); out.build26=await fits(); await pg.screenshot({path:D+'/tour/42_build_26.png'});
 // 3. a held number key answers only once (key repeat); pressed after the 0.5 s input gate
 await pg.evaluate(()=>{ const S=__G.state(); S.w.last=0; S.w.won=0; __G.room('guard','s'); const w=S.w; w.en=[]; w.waves=[]; w.spawns=[]; w.wave=99; w.pend=1; w.batch=null; }); await run(90); const a0=await pg.evaluate(()=>__G.state().answered);
 await pg.waitForTimeout(650); await pg.keyboard.down('1'); await pg.waitForTimeout(1500); await pg.keyboard.up('1'); out.heldKey={mode:await pg.evaluate(()=>__G.state().mode),answeredBy:await pg.evaluate(()=>__G.state().answered)-a0};
 const ok=out.afterKill.pend>0&&out.afterKill.gems===0&&out.afterVictory.mode==='ask'&&out.afterVictory.why==='level'&&!out.afterVictory.last&&out.reloadMid.mode==='ask'&&out.thenLast.last&&!out.thenLast.pend&&!out.thenLast.preLast&&out.build4.fits&&out.build11.fits&&out.build26.fits&&out.heldKey.answeredBy===1;
 console.log(JSON.stringify(out)); if(!ok) errs.push('final-pass check failed'); console.log('errors',JSON.stringify(errs)); await b.close(); })();
