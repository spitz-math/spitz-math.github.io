const {chromium}=require('playwright'); const D=process.argv[2];
(async()=>{ const b=await chromium.launch(); const ctx=await b.newContext({viewport:{width:1920,height:1080}}); const pg=await ctx.newPage();
 const errs=[]; pg.on('pageerror',e=>errs.push(String(e)));
 await pg.goto('file://'+D+'/rook_and_ruin_fonts.html?set=slope'); await pg.waitForTimeout(300); await pg.evaluate('localStorage.clear()'); await pg.reload(); await pg.waitForTimeout(700);
 await pg.fill('#dn-nameinput','Test T'); await pg.click('#dn-go'); await pg.waitForTimeout(300); await pg.keyboard.press('Escape'); await pg.waitForTimeout(200);
 const R=[];
 // 1) knockout -> revive question, right answer -> back up with 3 hearts
 R.push(await pg.evaluate(()=>{ const S=__G.state(), p=S.w.p; p.hp=1; p.inv=0; __G.room('guard','s'); S.w.p.inv=0; for(let i=0;i<600&&S.mode==='play';i++){ __G.step(1/60); }
   const m1=S.mode, why=S.ask&&S.ask.why; const i=S.q.choices.findIndex(c=>c.ok); __G.answer(i); __G.askNext(); return {m1,why,after:S.mode,hp:S.w.p.hp,over:S.over}; }));
 // 2) second knockout -> run over, end screen
 R.push(await pg.evaluate(()=>{ const S=__G.state(); S.w.p.hp=1; S.w.p.inv=0; for(let i=0;i<1200&&!S.over;i++){ __G.step(1/60); if(S.mode==='ask'){ return 'asked again'; } } return {over:S.over,win:S.win,title:document.getElementById('dn-endtitle').textContent,endVisible:!document.getElementById('dn-end').hidden}; }));
 await pg.waitForTimeout(400); await pg.keyboard.press('Enter'); await pg.waitForTimeout(300);
 R.push(await pg.evaluate(()=>({earlyEnterIgnored:__G.state().over})));
 await pg.waitForTimeout(1200); await pg.keyboard.press('Enter'); await pg.waitForTimeout(400); const cutMode=await pg.evaluate(()=>__G.state().mode); await pg.keyboard.press('Escape'); await pg.waitForTimeout(200); console.log('after restart mode',cutMode);
 R.push(await pg.evaluate(()=>{ const S=__G.state(); return {restarted:!S.over, room:S.w.rid, hp:S.w.p.hp, score:S.score, revUsed:S.revUsed, build:Object.keys(S.w.b).length, name:S.name, endHidden:document.getElementById('dn-end').hidden}; }));
 // 3) revive wrong answer -> over
 R.push(await pg.evaluate(()=>{ const S=__G.state(); S.w.p.hp=1; S.w.p.inv=0; __G.room('guard','s'); S.w.p.inv=0; for(let i=0;i<900&&S.mode==='play';i++) __G.step(1/60); const i=S.q.choices.findIndex(c=>c.ok); __G.answer((i+1)%S.q.choices.length); __G.askNext(); return {mode:S.mode, over:S.over}; }));
 // 4) reload mid-run keeps the run
 await pg.waitForTimeout(300); await pg.keyboard.press('Escape'); await pg.waitForTimeout(100); R.push(await pg.evaluate(()=>({endingNotSkipped:__G.state().mode==='endcut'}))); await pg.waitForTimeout(6600); R.push(await pg.evaluate(()=>({endedAlone:__G.state().over}))); await pg.waitForTimeout(1300); await pg.keyboard.press('Enter'); await pg.waitForTimeout(300); await pg.keyboard.press('Escape'); await pg.waitForTimeout(200);
 await pg.evaluate(()=>{ __G.room('library','s'); const S=__G.state(); S.w.coins=33; });
 await pg.evaluate(()=>{ for(let i=0;i<120;i++) __G.step(1/60); }); await pg.waitForTimeout(1200); await pg.reload(); await pg.waitForTimeout(800);
 R.push(await pg.evaluate(()=>{ const S=__G.state(); return {room:S.w.rid, coins:S.w.coins, started:S.started, mode:S.mode, startHidden:document.getElementById('dn-start').hidden, enemies:S.w.en.length}; }));
 // 5) keys: Shift rolls, Space swings
 R.push(await pg.evaluate(()=>{ const S=__G.state(); return null; }));
 await pg.keyboard.down('ArrowRight'); await pg.keyboard.press('Shift'); await pg.waitForTimeout(50);
 const r1=await pg.evaluate(()=>({roll:__G.state().w.p.roll>0||__G.state().w.p.rollCd>0}));
 await pg.keyboard.up('ArrowRight'); const sid0=await pg.evaluate(()=>__G.state().w.p.sid); await pg.keyboard.press('Space'); await pg.waitForTimeout(400); const r2=await pg.evaluate(s0=>({tapDuringRollSwung:__G.state().w.p.sid>s0}),sid0);
 await pg.keyboard.press('k'); await pg.waitForTimeout(400); await pg.keyboard.press('j');
 R.push(r1,r2);
 console.log(JSON.stringify(R,null,0)); console.log('errors',errs); await b.close(); })();
