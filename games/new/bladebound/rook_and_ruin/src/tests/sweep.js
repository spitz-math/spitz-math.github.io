/* node tests/sweep.js : release sweep. Screenshots of every room and screen at two Chromebook sizes into out/sweep/, plus overflow checks. */
const {chromium}=require('playwright'); const fs=require('fs'); const D=require('path').join(__dirname,'..','out'); const O=D+'/sweep/'; fs.mkdirSync(O,{recursive:true});
(async()=>{ const b=await chromium.launch(); const errs=[], notes=[];
 for(const [nm,vp] of [['768',{width:1366,height:768}],['620',{width:1366,height:620}]]){
  const pg=await (await b.newContext({viewport:vp})).newPage(); pg.on('pageerror',e=>errs.push(nm+': '+e)); pg.on('console',m=>{ if(m.type()==='error') errs.push(nm+' console: '+m.text().slice(0,200)); });
  const shot=async n=>{ await pg.screenshot({path:O+nm+'_'+n+'.png'}); const ov=await pg.evaluate(()=>[document.documentElement.scrollWidth-innerWidth,document.documentElement.scrollHeight-innerHeight]); if(ov[0]>1||ov[1]>1) notes.push(nm+' '+n+' page scrolls '+ov); };
  const run=n=>pg.evaluate(n=>{ for(let i=0;i<n;i++) __G.step(1/60); },n);
  await pg.goto('file://'+D+'/rook_and_ruin_mult.html'); await pg.evaluate('localStorage.clear()'); await pg.reload(); await pg.waitForTimeout(900); await shot('01_title');
  await pg.fill('#dn-nameinput','Levi S'); await pg.click('#dn-go'); await pg.waitForTimeout(2500); await shot('02_intro'); await pg.click('#dn-skip'); await pg.waitForTimeout(1200); await shot('03_entry');
  const god=()=>pg.evaluate(()=>{ const p=__G.state().w.p; p.max=10; p.hp=10; p.inv=1e6; });
  for(const r of ['guard','cross','vault','arena','library','siege']){ await pg.evaluate(r=>{ const S=__G.state(); __G.room(r,'s'); S.mode='play'; },r); await god(); await run(240); await pg.waitForTimeout(250); await shot('room_'+r); }
  await pg.evaluate(()=>{ __G.room('shop','s'); }); await pg.waitForTimeout(400); await shot('room_shop_deal');
  await pg.evaluate(()=>{ const S=__G.state(); __G.room('boss','s'); S.mode='play'; }); await god(); await run(60*14); await pg.waitForTimeout(200); await shot('boss_14s');
  await pg.evaluate(()=>{ ['wave','spark','bash','heart','whirl','volatile','orbit','thorns','boots'].forEach(k=>__G.give(k,2)); const S=__G.state(); S.mode='play'; S.w.p.max=10; S.w.p.hp=10; S.w.p.inv=1e6; __G.last(); }); await run(60*40); await pg.waitForTimeout(200); await shot('laststand_40s');
  await run(60*50); await pg.waitForTimeout(200); await shot('laststand_90s');
  await pg.keyboard.press('p'); await pg.waitForTimeout(400); await shot('pause'); await pg.keyboard.press('p'); await pg.waitForTimeout(200);
  await pg.evaluate(()=>{ __G.open('level',3,0.5); }); await pg.waitForTimeout(500); await shot('cards'); await pg.evaluate(()=>{ document.querySelector('#dn-cards button').click(); }); await pg.waitForTimeout(400);
  await pg.evaluate(()=>{ const S=__G.state(); S.w.p.inv=0; S.w.p.hp=1; __G.hurt(5); }); await run(30); await pg.waitForTimeout(500); await shot('revive_question');
  await pg.evaluate(()=>{ const S=__G.state(); if(S.q) __G.answer(S.q.choices.findIndex(c=>c.ok)); }); await pg.waitForTimeout(1500); await shot('revive_right'); await pg.evaluate(()=>__G.askNext&&__G.askNext()); await pg.waitForTimeout(300);
  await pg.evaluate(()=>{ const S=__G.state(); S.mode='play'; S.w.last=0.5; S.w.p.inv=1e6; }); await run(60*9); await pg.waitForTimeout(9000); await shot('end_win');
  await pg.close(); }
 console.log('notes',notes); console.log('errors',errs); await b.close(); })();
