const {chromium}=require('playwright'); const D=require('path').join(__dirname,'..','out');
(async()=>{ const b=await chromium.launch(); const pg=await (await b.newContext({viewport:{width:1366,height:620}})).newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(String(e)));
 await pg.goto('file://'+D+'/rook_and_ruin_mult.html'); await pg.evaluate('localStorage.clear()'); await pg.reload(); await pg.waitForTimeout(600);
 await pg.fill('#dn-nameinput','Test T'); await pg.click('#dn-go'); await pg.waitForTimeout(300); await pg.keyboard.press('Escape'); await pg.waitForTimeout(1200);
 const st=()=>pg.evaluate(()=>{ const S=__G.state(), w=S.w; return {mode:S.mode, why:S.ask?S.ask.why:null, n:S.ask?S.ask.n:null, coins:w.coins, hp:w.p.hp, arm:w.p.arm, pick:S.pickWhy, title:document.getElementById('dn-qtitle').textContent, reward:document.getElementById('dn-reward').textContent}; });
 const ans=(ok)=>pg.evaluate(ok=>{ const S=__G.state(); const i=S.q.choices.findIndex(c=>c.ok); __G.answer(ok?i:(i+1)%S.q.choices.length); __G.askNext(); },ok);   // 2026-11-14: explanations wait for Continue now, so the test presses it
 const out={};
 // shop deal
 await pg.evaluate(()=>{ __G.state().w.picks=2; __G.room('shop','s'); }); await pg.waitForTimeout(900); out.dealOpen=await st();
 await pg.screenshot({path:D+'/gal/v21_deal.png'});
 await ans(true); await pg.waitForTimeout(1600); out.deal1=await st();
 await pg.reload(); await pg.waitForTimeout(1500); out.dealReload=await st();
 await ans(false); await pg.waitForTimeout(400); await pg.evaluate(()=>__G.askNext()); await pg.waitForTimeout(400); out.dealDone=await st();
 await pg.waitForTimeout(1500); out.dealNoRepeat=(await st()).mode;
 // vault chest right
 await pg.evaluate(()=>{ __G.room('vault','e'); const w=__G.state().w; w.waves=[]; w.spawns=[]; w.en=[]; w.p.x=480; w.p.y=380; }); await pg.waitForTimeout(1500);
 await pg.evaluate(()=>{ const w=__G.state().w; w.p.x=w.chest.x; w.p.y=w.chest.y; }); await pg.waitForTimeout(400); out.chestOpen=await st();
 await pg.screenshot({path:D+'/gal/v21_chest.png'});
 const c0=out.chestOpen.coins; await ans(true); await pg.waitForTimeout(1600); out.chestDone=await st(); out.chestBonus=out.chestDone.coins-c0;
 await pg.evaluate(()=>__G.pick(0)); await pg.waitForTimeout(300);
 // siege rally
 await pg.evaluate(()=>{ __G.room('siege','s'); const w=__G.state().w; w.siegeT=26; w.p.hp=3; }); await pg.waitForTimeout(2500); out.rally=await st();
 await ans(true); await pg.waitForTimeout(1600); out.rallyDone=await st();
 await pg.waitForTimeout(1500); out.rallyNoRepeat=(await st()).mode;
 console.log(JSON.stringify(out,null,0)); console.log('errors',JSON.stringify(errs)); await b.close(); })();
