/* go-live readiness: with the game's save key registered in scorecode.js (done at go-live), check that
   answers reach the Class Stats queue, a missed question comes back, and a run older than 20 minutes is cleared. */
const {chromium}=require('playwright'); const path=require('path'); const fs=require('fs'); const D=path.join(__dirname,'..','out'); const G=D+'/golive';
(async()=>{ fs.mkdirSync(G,{recursive:true}); for(const f of ['rook_and_ruin.html','kit.js','questions.js']) fs.copyFileSync(D+'/'+f,G+'/'+f);
 let sc=fs.readFileSync(D+'/scorecode.js','utf8'); const mark="fit_check:'fit_check_v1' };"; if(sc.indexOf(mark)<0&&sc.indexOf("rook_and_ruin:'bladebound_v3'")<0) throw new Error('scorecode.js layout changed');
 if(sc.indexOf("rook_and_ruin:'bladebound_v3'")<0) sc=sc.replace(mark,"fit_check:'fit_check_v1', rook_and_ruin:'bladebound_v3' };"); fs.writeFileSync(G+'/scorecode.js',sc);
 const b=await chromium.launch(); const ctx=await b.newContext({viewport:{width:1366,height:768}}); await ctx.route(/script\.google|googleusercontent/,r=>r.abort()); const pg=await ctx.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(String(e)));
 const U='file://'+G+'/rook_and_ruin.html?set=slope'; await pg.goto(U); await pg.evaluate('localStorage.clear()'); await pg.reload(); await pg.waitForTimeout(700);
 await pg.fill('#dn-nameinput','Test T'); await pg.click('#dn-go'); await pg.waitForTimeout(300); await pg.keyboard.press('Escape'); await pg.waitForTimeout(1200); const out={};
 await pg.evaluate(()=>{ const S=__G.state(), w=S.w; w.en=[]; w.waves=[]; w.spawns=[]; w.wave=99; w.pend=1; for(let i=0;i<90;i++) __G.step(1/60); });
 const missedPrompt=await pg.evaluate(()=>{ const S=__G.state(); const p=S.q.prompt; __G.answer((S.q.choices.findIndex(c=>c.ok)+1)%S.q.choices.length); return p; });
 await pg.waitForTimeout(300); const seen=[];
 for(let i=0;i<40&&seen.length<9;i++){ const r=await pg.evaluate(()=>{ const S=__G.state(); if(S.mode==='ask'){ if(S.qDone){ __G.askNext(); return null; } const p=S.q.prompt; __G.answer(S.q.choices.findIndex(c=>c.ok)); return p; } if(S.mode==='pick'){ __G.pick(0); return null; } const w=S.w; w.pend=1; w.batch=null; for(let i=0;i<40;i++) __G.step(1/60); return null; }); if(r) seen.push(r); await pg.waitForTimeout(150); }
 out.missedCameBack=seen.indexOf(missedPrompt)>=0; out.askedAfter=seen.length;
 const q=await pg.evaluate(()=>JSON.parse(localStorage.getItem('spitz_log_q')||'[]')); out.logRows=q.length; out.logSample=q[0]?{g:q[0].g,s:q[0].s,ok:q[0].ok,tp:q[0].tp,hasPrompt:!!q[0].q,name:q[0].n}:null;
 // score code on the end screen: it reads back as Rook & Ruin with this run's score and answers, and fits the end box at 1366x620
 await pg.setViewportSize({width:1366,height:620}); await pg.evaluate(()=>{ const S=__G.state(); if(S.mode==='ask'&&S.qDone) __G.askNext(); if(__G.state().mode==='pick') __G.pick(0); __G.state().mode='play'; __G.finish(false,'fall'); for(let i=0;i<60*7;i++) __G.step(1/60); });
 await pg.waitForTimeout(600);
 out.code=await pg.evaluate(()=>{ const S=__G.state(), el=document.querySelector('#dn-end .spz-code .v'), c=el?el.textContent:''; const r=c?SpitzCode.read(c,S.name):null; const box=document.querySelector('#dn-end .dn-box').getBoundingClientRect(), cb=document.querySelector('#dn-end .spz-code'), again=document.getElementById('dn-again').getBoundingClientRect();
   const cr=cb?cb.getBoundingClientRect():null; return {code:c, game:r&&r.game, name:r&&r.gameName, score:r&&r.score, S:S.score, correct:r&&r.correct, answered:r&&r.answered, SA:[S.correct,S.answered], fits:!!cr&&cr.top>=box.top&&cr.bottom<=again.top+1&&again.bottom<=box.bottom+1&&box.bottom<=innerHeight+1&&box.top>=-1}; });
 await pg.screenshot({path:G+'/end_code.png'}); await pg.setViewportSize({width:1366,height:768});
 const codeOk=out.code.game==='rook_and_ruin'&&out.code.correct===out.code.SA[0]&&out.code.answered===out.code.SA[1]&&out.code.fits;
 // 20-minute expiry
 out.keys=await pg.evaluate(()=>Object.keys(localStorage).filter(k=>k.indexOf('bladebound_v3')===0)); await pg.evaluate(()=>{ Object.keys(localStorage).filter(k=>/_t$/.test(k)).forEach(k=>localStorage.setItem(k,String(Date.now()-21*60e3))); });
 await pg.goto('about:blank'); await pg.goto(U); await pg.waitForTimeout(800); out.afterExpiry=await pg.evaluate(()=>({startShown:!document.getElementById('dn-start').hidden,started:__G.state().started}));
 const ok=codeOk&&out.missedCameBack&&out.logRows>=3&&out.logSample&&out.logSample.g==='rook_and_ruin'&&out.logSample.hasPrompt&&out.afterExpiry.startShown&&!out.afterExpiry.started;
 console.log(JSON.stringify(out)); if(!ok) errs.push('go-live wiring check failed'); console.log('errors',JSON.stringify(errs)); await b.close(); })().catch(e=>{ console.log('errors',JSON.stringify([String(e)])); });
