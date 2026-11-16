/* chest rules: level-up questions come first; a chest under Rook's feet waits, then opens by itself (nobody gets stuck); stepping off and back opens it at once; chest asks 1 question */
const {chromium}=require('playwright'); const path=require('path'); const D=path.join(__dirname,'..','out');
(async()=>{ const b=await chromium.launch(); const pg=await (await b.newContext({viewport:{width:1366,height:620}})).newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(String(e)));
 await pg.goto('file://'+D+'/rook_and_ruin_mult.html'); await pg.evaluate('localStorage.clear()'); await pg.reload(); await pg.waitForTimeout(600);
 await pg.fill('#dn-nameinput','Test T'); await pg.click('#dn-go'); await pg.waitForTimeout(300); await pg.keyboard.press('Escape'); await pg.waitForTimeout(1200);
 const st=()=>pg.evaluate(()=>{ const S=__G.state(), w=S.w; return S.mode+'/'+(S.ask?S.ask.why:'')+(S.pickWhy||'')+' chest:'+(w.chest?(w.chest.open?'open':w.chest.arm?'armed':'wait'):'-'); });
 const run=n=>pg.evaluate(n=>{ for(let i=0;i<n;i++) __G.step(1/60); },n);
 const setup=(x,y)=>pg.evaluate(([x,y])=>{ __G.room('vault','e'); const S=__G.state(), w=S.w; w.picks=2; w.waves=[]; w.spawns=[]; w.en=[]; w.pend=1; w.batch=null; w.p.x=x; w.p.y=y; },[x,y]);
 const clearAsk=async()=>{ for(let i=0;i<8;i++){ const m=await pg.evaluate(()=>{ const S=__G.state(); if(S.mode==='ask'){ if(!S.qDone) __G.answer(S.q.choices.findIndex(c=>c.ok)); else __G.askNext(); } else if(S.mode==='pick') __G.pick(0); return S.mode; }); if(m==='play') break; await pg.waitForTimeout(700); } };
 const out={};
 // A. standing on the chest spot when the room clears
 await setup(480,270); await run(70); out.A1=await st();                    // level-up question first, chest waiting
 await clearAsk(); await run(30); out.A2=await st();                       // back in play, chest still waiting (0.5 s)
 await run(60); await pg.waitForTimeout(200); out.A3=await st();           // after the beat it opens by itself: chest question
 await clearAsk(); out.A4=await st();
 // B. standing away: nothing opens until Rook walks into it
 await setup(300,400); await run(70); await clearAsk(); await run(120); out.B1=await st();
 await pg.evaluate(()=>{ const w=__G.state().w; w.p.x=w.chest.x; w.p.y=w.chest.y; }); await run(3); await pg.waitForTimeout(200); out.B2=await st();
 const ok=/^ask\/level chest:wait/.test(out.A1)&&/^play\/ chest:wait/.test(out.A2)&&/^ask\/chest chest:open/.test(out.A3)&&/^play\/ chest:open/.test(out.A4)&&/^play\/ chest:armed/.test(out.B1)&&/^ask\/chest chest:open/.test(out.B2);
 console.log(JSON.stringify(out)); if(!ok) errs.push('chest flow wrong'); console.log('errors',JSON.stringify(errs)); await b.close(); })();
