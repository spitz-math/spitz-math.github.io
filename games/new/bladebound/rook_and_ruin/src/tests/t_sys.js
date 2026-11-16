/* final UI pass (2026-11-15): title (name label, Start hint, All controls), shop (balance, prices, one buy per visit),
   boss plate + phases, Last Stand objective to the end screen, pause (P, Esc, focus loss), results (run vs math, Not attempted,
   build names), Chromebook sizes. Real keys where it matters. Screenshots out/tour/sys_*.png */
const {chromium}=require('playwright'); const D=process.argv[2]||'out', O=D+'/tour/';
(async()=>{ const b=await chromium.launch(); const errs=[], R={}, bad=[];
 const check=(n,ok,info)=>{ R[n]=ok?'ok':('FAIL '+JSON.stringify(info)); if(!ok) bad.push(n); };
 async function page(vw,vh,start=true){ const pg=await (await b.newContext({viewport:{width:vw,height:vh}})).newPage(); pg.on('pageerror',e=>errs.push(String(e)));
   await pg.goto('file://'+D+'/rook_and_ruin_fonts.html?set=slope'); await pg.evaluate('localStorage.clear()'); await pg.reload(); await pg.waitForTimeout(700);
   if(start){ await pg.fill('#dn-nameinput','Levi S'); await pg.click('#dn-go'); await pg.waitForTimeout(400); await pg.keyboard.press('Escape'); await pg.waitForTimeout(1400); } return pg; }
 const run=(pg,n)=>pg.evaluate(n=>{ for(let i=0;i<n;i++){ const S=__G.state(); if(S.mode!=='play'&&S.mode!=='reentry'&&S.mode!=='trans') break; __G.step(1/60); } return __G.state().mode; },n);

 // 1. title
 const t=await page(1366,768,false);
 const t1=await t.evaluate(()=>({hint:!document.getElementById('dn-gohint').hidden, dis:document.getElementById('dn-go').disabled, lbl:document.querySelector('label[for=dn-nameinput]').textContent}));
 await t.screenshot({path:O+'sys_00_title.png'});
 await t.click('.dn-allkeys summary'); await t.waitForTimeout(200); await t.screenshot({path:O+'sys_00b_title_controls.png'});
 const kg=await t.evaluate(()=>{ const g=document.querySelector('.dn-keygrid').getBoundingClientRect(), bx=document.querySelector('#dn-start .dn-box').getBoundingClientRect(); return {inside:g.top>=bx.top&&g.bottom<=bx.bottom, txt:document.querySelector('.dn-keygrid').textContent}; });
 await t.click('.dn-allkeys summary'); await t.fill('#dn-nameinput','Ana R'); await t.waitForTimeout(100);
 const t2=await t.evaluate(()=>({hint:!document.getElementById('dn-gohint').hidden, dis:document.getElementById('dn-go').disabled}));
 await t.screenshot({path:O+'sys_00c_title_ready.png'});
 check('titleName',t1.hint&&t1.dis&&/Your name/.test(t1.lbl)&&!t2.hint&&!t2.dis,{t1,t2});
 check('allControls',kg.inside&&/Pause/.test(kg.txt)&&/Dodge/.test(kg.txt),kg);
 const tb=await t.evaluate(()=>{ const r=document.querySelector('#dn-start .dn-box').getBoundingClientRect(); return r.bottom<=innerHeight; }); check('titleFits768',tb,'');

 // 2. shop (E to buy since the playtest handoff): holding Space on an item never buys; hold E and mash E on one item -> exactly one purchase; step off/on -> second purchase
 const s=await page(1366,768);
 await s.evaluate(()=>{ const S=__G.state(), w=S.w; __G.room('shop','s'); S.mode='play'; w.dealt=1; w.coins=100; w.banner=null; const it=w.shop[1]; w.p.x=it.x; w.p.y=it.y+10; });
 await run(s,20); await s.screenshot({path:O+'sys_01_shop.png'});
 const c0=await s.evaluate(()=>__G.state().w.coins);
 await s.keyboard.down(' '); await s.waitForTimeout(900); await s.keyboard.up(' '); for(let k=0;k<6;k++){ await s.keyboard.press(' '); await s.waitForTimeout(90); }
 check('spaceNeverBuys',await s.evaluate(c=>__G.state().w.coins===c,c0),'');
 await s.keyboard.down('e'); await s.waitForTimeout(900); await s.keyboard.up('e');
 for(let k=0;k<10;k++){ await s.keyboard.press('e'); await s.waitForTimeout(90); }
 const c1=await s.evaluate(()=>({coins:__G.state().w.coins, max:__G.state().w.p.max, cost:__G.state().w.shop[1].cost}));
 await s.screenshot({path:O+'sys_02_shop_bought.png'});
 check('oneBuyPerVisit',c0-c1.coins===18,{c0,c1});
 await s.evaluate(()=>{ const w=__G.state().w; w.p.y+=80; }); await run(s,10); await s.evaluate(()=>{ const w=__G.state().w, it=w.shop[1]; w.p.x=it.x; w.p.y=it.y+10; }); await run(s,10);
 await s.keyboard.press('e'); await s.waitForTimeout(150); const c2=await s.evaluate(()=>__G.state().w.coins);
 check('buyAgainAfterStepOff',c1.coins-c2===32,{c1,c2});
 await s.evaluate(()=>{ const w=__G.state().w, it=w.shop[3]; w.coins=20; w.p.x=it.x; w.p.y=it.y+10; }); await run(s,10); await s.screenshot({path:O+'sys_03_shop_cant.png'});
 await s.keyboard.press('e'); await s.waitForTimeout(150); check('cantAfford',await s.evaluate(()=>__G.state().w.coins===20&&!__G.state().w.shop[3].sold),'');

 // 2b. Second Wind (Kody 2026-11-15): a second revive, bought in the shop for 30 coins. KO 1 = the free revive, KO 2 = Second Wind, KO 3 = the run ends
 await s.evaluate(()=>{ const S=__G.state(), w=S.w; S.revUsed=0; w.coins=40; const it=w.shop[5]; w.p.x=it.x; w.p.y=it.y+10; }); await run(s,10); await s.screenshot({path:O+'sys_04_second_wind.png'});
 await s.keyboard.press('e'); await s.waitForTimeout(200);
 const sw=await s.evaluate(()=>{ const S=__G.state(), w=S.w; return {id:w.shop[5].id,coins:w.coins,ex:S.revExtra,sold:!!w.shop[5].sold,n:w.shop.length,xs:w.shop.map(i=>i.x)}; });
 check('secondWindBuy',sw.id==='rev'&&sw.coins===10&&sw.ex===1&&sw.sold&&sw.n===6&&sw.xs[0]>100&&sw.xs[5]<860,sw);
 await s.evaluate(()=>{ __G.room('shop','s'); __G.state().mode='play'; __G.state().w.dealt=1; }); check('secondWindOncePerRun',await s.evaluate(()=>!!__G.state().w.shop[5].sold),'');
 const ko=async()=>{ await s.evaluate(()=>{ const S=__G.state(); S.mode='play'; S.w.p.inv=0; S.w.p.hp=1; __G.hurt(5); }); await s.waitForFunction(()=>{ const S=__G.state(); return S.mode!=='play'||S.over; },null,{timeout:3000}).catch(()=>{}); await s.waitForTimeout(50); const r=await s.evaluate(()=>{ const S=__G.state(); return {mode:S.mode,why:S.ask&&S.ask.why,over:S.over,rev:S.revUsed,ex:S.revExtra}; });
   if(r.why==='revive'){ await s.evaluate(()=>{ const S=__G.state(); __G.askNext(); __G.answer(S.q.choices.findIndex(c=>c.ok)); __G.askNext(); }); await s.waitForTimeout(200); await s.evaluate(()=>{ const S=__G.state(); for(let i=0;i<400&&S.mode==='reentry';i++) __G.step(1/60); }); } return r; };
 const k1=await ko(), k2=await ko(), k3=await ko();
 check('secondWindRevives',k1.why==='revive'&&k1.ex===1&&k2.why==='revive'&&k2.ex===2&&k3.why!=='revive'&&(k3.mode==='endcut'||k3.over),{k1,k2,k3});

 // 3. boss: plate, enraged, stunned
 const bo=await page(1366,768);
 await bo.evaluate(()=>{ const S=__G.state(), w=S.w; ['wave','spark','orbit'].forEach(k=>__G.give(k,2)); __G.room('boss','s'); S.mode='play'; w.p.inv=999; w.banner=null; });
 for(let k=0;k<20&&!(await bo.evaluate(()=>!!__G.state().w.boss));k++) await run(bo,30);
 await bo.evaluate(()=>{ __G.state().w.banner=null; }); await run(bo,40); await bo.screenshot({path:O+'sys_04_boss.png'});
 await bo.evaluate(()=>{ const w=__G.state().w; w.boss.hp=w.boss.max*0.45; w.p.inv=999; }); await run(bo,150); await bo.evaluate(()=>{ __G.state().w.banner=null; });
 for(let k=0;k<40;k++){ await run(bo,10); const st=await bo.evaluate(()=>__G.state().w.boss.st); if(st===1||st===3||st===4) break; }
 await bo.screenshot({path:O+'sys_05_boss_enraged_tele.png'});
 const bp=await bo.evaluate(()=>{ const w=__G.state().w; return {raged:w.boss.raged, mode:__G.state().mode}; });
 check('bossPhase',bp.raged===1,bp);

 // 4. Last Stand: objective plate, then survive to the end screen
 await bo.evaluate(()=>{ __G.last(); const w=__G.state().w; w.p.inv=999; w.banner=null; }); await run(bo,240); await bo.evaluate(()=>{ __G.state().w.banner=null; }); await run(bo,2); await bo.screenshot({path:O+'sys_06_laststand.png'});
 await bo.evaluate(()=>{ const w=__G.state().w; w.last=0.3; w.p.inv=999; }); await run(bo,40);
 for(let k=0;k<30;k++){ const m=await bo.evaluate(()=>__G.state().mode); if(await bo.evaluate(()=>!document.getElementById('dn-end').hidden)) break; await bo.keyboard.press('Enter'); await bo.waitForTimeout(700); }
 await bo.waitForTimeout(3500); await bo.screenshot({path:O+'sys_07_end_win.png'});
 const ew=await bo.evaluate(()=>({shown:!document.getElementById('dn-end').hidden, title:document.getElementById('dn-endtitle').textContent, ls:document.getElementById('dn-endstats').textContent, again:document.getElementById('dn-again').className, back:!!document.querySelector('#dn-end .spz-hub,.spz-hub')}));
 check('lastStandToEnd',ew.shown&&/escaped the Last Stand/.test(ew.title)&&/Escaped/.test(ew.ls)&&/dn-next/.test(ew.again)&&ew.back,ew);

 // 5. pause: P, Esc and focus loss freeze the fight; resume restores play
 const pz=await page(1366,768);
 await pz.evaluate(()=>{ const S=__G.state(), w=S.w; __G.room('guard','s'); S.mode='play'; w.banner=null; for(let k=0;k<4;k++){ const e=__G.spawn('gob',w.p.x+150+k*30,w.p.y,1); e.st=0; e.cd=0.2; } });
 const res={};
 for(const key of ['p','Escape']){ await pz.keyboard.press(key); await pz.waitForTimeout(80); const a=await pz.evaluate(()=>({m:__G.state().mode,t:__G.state().w.t})); await pz.waitForTimeout(600); const b2=await pz.evaluate(()=>({m:__G.state().mode,t:__G.state().w.t})); await pz.keyboard.press(key); await pz.waitForTimeout(80); res[key]={a:a.m,frozen:a.t===b2.t,after:await pz.evaluate(()=>__G.state().mode)}; }
 await pz.keyboard.down('ArrowLeft'); await pz.evaluate(()=>window.dispatchEvent(new Event('blur'))); await pz.waitForTimeout(80); res.blur=await pz.evaluate(()=>({m:__G.state().mode, held:Object.values(__G.held).some(Boolean)})); await pz.screenshot({path:O+'sys_08_paused.png'}); await pz.keyboard.up('ArrowLeft');
 await pz.click('#dn-bdclose'); await pz.waitForTimeout(80); res.resume=await pz.evaluate(()=>__G.state().mode);
 check('pause',res.p.a==='build'&&res.p.frozen&&res.p.after==='play'&&res.Escape.a==='build'&&res.Escape.frozen&&res.Escape.after==='play'&&res.blur.m==='build'&&!res.blur.held&&res.resume==='play',res);

 // 6. defeat results: run vs math, Not attempted, build names; Chromebook 1366x620
 const ed=await page(1366,620);
 await ed.evaluate(()=>{ const S=__G.state(), w=S.w; ['wave','whirl','spark','orbit','bash','heart','boots','edge','volatile','ricochet','aegis','ward','thorns'].forEach((k,i)=>__G.give(k,1+(i%3))); __G.give('stormcall',1); __G.give('tempest',1); w.kills=143; w.bestCombo=22; w.flawless=3; w.runT=301; S.answered=14; S.correct=11; S.score=18450;
   const ks=Object.keys(S.topics); ks.forEach((k,i)=>{ S.topics[k]=i<2?[i+3,i+5]:[0,0]; }); __G.finish(false,'fall'); });
 for(let k=0;k<20&&await ed.evaluate(()=>document.getElementById('dn-end').hidden);k++) await ed.waitForTimeout(500);
 await ed.waitForTimeout(2500); await ed.screenshot({path:O+'sys_09_end_defeat_cb.png'});
 const er=await ed.evaluate(()=>{ const box=document.querySelector('.dn-endbox').getBoundingClientRect(); return {txt:document.getElementById('dn-endtopics').textContent, run:document.getElementById('dn-endstats').textContent, math:document.getElementById('dn-mathbig').textContent, build:document.getElementById('dn-endbuild').textContent, fits:box.bottom<=innerHeight+1&&box.top>=-1, teacher:/Show this screen to your teacher/.test(document.getElementById('dn-end').textContent), name:document.getElementById('dn-endname').textContent}; });
 check('resultsSplit',/Not attempted/.test(er.txt)&&/Enemies defeated/.test(er.run)&&!/right/.test(er.run)&&/11 of 14 right/.test(er.math)&&/Sword Wave/.test(er.build)&&/Lv 2|MAX/.test(er.build)&&!er.teacher&&er.name==='Levi S',er);
 check('resultsFitCB',er.fits,er);
 const tt=await page(1366,620,false); await tt.screenshot({path:O+'sys_10_title_cb.png'}); check('titleFitsCB',await tt.evaluate(()=>{ const r=document.querySelector('#dn-start .dn-box').getBoundingClientRect(); return r.bottom<=innerHeight+1; }),'');

 console.log(JSON.stringify(R,null,1)); console.log('errors',JSON.stringify(bad.concat(errs))); await b.close(); })();
