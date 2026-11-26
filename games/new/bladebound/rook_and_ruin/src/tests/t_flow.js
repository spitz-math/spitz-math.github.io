/* node tests/t_flow.js : question flow and reward order with REAL input (2026-11-14 flow pass)
   - explanations stay until Continue/Enter; the answering press can't skip them
   - the 0.5 s input gate out of combat: held Space, spammed number keys and spammed/held clicks never answer; the first accepted answer is a fresh press after the gate
   - combat frozen during questions, picks and the knockout count-in
   - answers keep their places; starter relic vs earned upgrades with progress; toasts clear of headings */
const {chromium}=require('playwright'); const D=process.argv[2]||require('path').join(__dirname,'..','out');
(async()=>{ const b=await chromium.launch(); const pg=await (await b.newContext({viewport:{width:1366,height:768}})).newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(String(e)));
 const ev=(f,a)=>pg.evaluate(f,a), wait=ms=>pg.waitForTimeout(ms), R={}, bad=[];
 const check=(name,ok,info)=>{ R[name]=ok?'ok':('FAIL '+JSON.stringify(info)); if(!ok) bad.push(name); };
 await pg.goto('file://'+D+'/rook_and_ruin_fonts.html?set=slope'); await ev('localStorage.clear()'); await pg.reload(); await wait(700);
 await pg.fill('#dn-nameinput','Levi S'); await pg.click('#dn-go'); await wait(400); await pg.keyboard.press('Escape'); await wait(1400);
 const st=()=>ev(()=>{ const S=__G.state(), w=S.w; return {mode:S.mode,why:S.ask&&S.ask.why,n:S.ask&&S.ask.n,qDone:S.qDone,answered:S.answered,picks:w.picks,pend:w.pend,hp:w.p.hp,t:w.t,
   title:document.getElementById('dn-picktitle').textContent,step:document.getElementById('dn-pickstep').textContent,note:document.getElementById('dn-picknote').textContent,cards:S.cards?S.cards.length:0}; });
 /* set up the end of a fight with level-ups waiting; the game itself opens the question after its short beat */
 const endFight=(pend,picks)=>ev(([pend,picks])=>{ const S=__G.state(), w=S.w; __G.room('guard','s'); w.en=[]; w.waves=[]; w.spawns=[]; w.wave=99; w.cleared=true; w.pend=pend; w.batch=null; w.resolve=0.4; if(picks!=null) w.picks=picks; S.mode='play'; },[pend,picks]);
 const okIdx=()=>ev(()=>__G.state().q.choices.findIndex(c=>c.ok));

 // 1. a level-up with 2 pending (playtest handoff 2026-11-15: the starter relic is dealt in the Entry Hall now): the promise says 2 choices in a row and the perfect-math gold card
 await endFight(2,0); await pg.waitForFunction(()=>__G.state().mode==='ask'); await wait(80);
 const promise=await ev(()=>document.querySelector('#dn-fb .h').textContent);
 check('promiseChoices',!/starter relic/i.test(promise)&&/Then 2 upgrade choices in a row/.test(promise)&&/guaranteed gold/.test(promise),promise);
 await wait(500); await pg.screenshot({path:D+'/tour/flow_01_question.png'});
 // measure where answer 1 sits (used for the click spam later)
 const tile=await ev(()=>{ const r=document.querySelector('.dn-ch').getBoundingClientRect(); return [r.left+r.width/2,r.top+r.height/2]; });
 // 2. a right answer: the explanation stays (no auto-advance), the answer key can't skip it, Enter right away is ignored
 let i=await okIdx(); await pg.keyboard.press(String(i+1)); const a1=await st();
 await pg.keyboard.press('Enter'); await pg.keyboard.press(String(i+1)); await wait(150); const early=await st();
 await wait(2600); const later=await st(); const vis=await ev(()=>({btns:[...document.querySelectorAll('.dn-ch')].filter(b=>!b.hidden&&b.offsetParent).length,dim:document.querySelectorAll('.dn-ch.dim').length,right:document.querySelectorAll('.dn-ch.right .mk').length,next:document.getElementById('dn-next').textContent,nextOff:document.getElementById('dn-next').disabled}));
 check('noAutoAdvance',a1.qDone&&early.qDone&&early.n===1&&later.mode==='ask'&&later.qDone&&later.n===1&&later.answered===a1.answered,{a1,early,later});
 check('positionsKept',vis.btns===4&&vis.dim===3&&vis.right===1&&/Next question/.test(vis.next)&&!vis.nextOff,vis);
 await pg.screenshot({path:D+'/tour/flow_02_right.png'});
 await pg.keyboard.press('Enter'); await wait(120); const q2=await st(); check('enterContinues',q2.mode==='ask'&&!q2.qDone&&q2.n===1,q2);
 // 3. wrong answer: Continue stays locked ~1.8 s, the picked answer and the right one are both marked, others dim
 await wait(600); i=await okIdx(); await pg.keyboard.press(String((i+1)%4+1)); await wait(300);
 const wr=await ev(()=>({lock:document.getElementById('dn-next').disabled,wrong:document.querySelectorAll('.dn-ch.wrong .mk').length,right:document.querySelectorAll('.dn-ch.right').length,dim:document.querySelectorAll('.dn-ch.dim').length,h:document.querySelector('#dn-fb .h').textContent}));
 await pg.screenshot({path:D+'/tour/flow_03_wrong.png'});
 await pg.keyboard.press('Enter'); await wait(100); const stillWrong=await st();
 check('wrongMarked',wr.lock&&wr.wrong===1&&wr.right===1&&wr.dim===2&&/Not quite/.test(wr.h)&&stillWrong.mode==='ask'&&stillWrong.qDone,{wr,stillWrong});
 // 4. combat is frozen while the question is up
 const t0=(await st()).t; await wait(800); check('frozenAsk',(await st()).t===t0,{});
 await wait(1200); await pg.keyboard.press('Enter'); await wait(200);
 // 5. reward 1 of 2 is a real choice of 3 (no assigned starter screen); a press during the gate is dropped; reward 2 opens straight from the pick, no arena in between
 let p1=await st(); await pg.keyboard.press('1'); await wait(60); const p1b=await st();
 await wait(150); await pg.screenshot({path:D+'/tour/flow_04_starter.png'}); await wait(400);
 check('firstIsChoice',p1.mode==='pick'&&p1.title==='Earned upgrade'&&p1.step==='Reward 1 of 2'&&p1.cards===3&&/Choose 1 of 3/.test(p1.note)&&p1b.mode==='pick'&&p1b.picks===0,{p1,p1b});
 await pg.keyboard.press('1'); const straight=await ev(()=>({mode:__G.state().mode,picks:__G.state().w.picks})); check('noArenaBetween',straight.mode==='pick'&&straight.picks===1,straight); await wait(200);
 const toastBox=await ev(()=>{ const t=document.getElementById('dn-toast'); return t.hidden?null:t.getBoundingClientRect().toJSON(); });
 await pg.waitForFunction(()=>__G.state().mode==='pick'); await wait(150);
 const solid=await ev(()=>({arming:!!document.querySelector('.arming'),op:[...document.querySelectorAll('.dn-card')].map(c=>getComputedStyle(c).opacity)})); await pg.screenshot({path:D+'/tour/flow_05b_gate.png'});
 check('cardsSolidInGate',solid.arming&&solid.op.every(o=>o==='1'),solid);
 const p2=await st(); const h2=await ev(()=>document.getElementById('dn-picktitle').getBoundingClientRect().toJSON()), cardsR=await ev(()=>document.getElementById('dn-cards').getBoundingClientRect().toJSON());
 check('earnedScreen',p2.title==='Earned upgrade'&&p2.step==='Reward 2 of 2'&&p2.cards===3&&/Choose 1 of 3/.test(p2.note)&&p2.picks===1,p2);
 const clear=(a,b)=>a.bottom<=b.top||a.top>=b.bottom||a.right<=b.left||a.left>=b.right;   /* v82: during a pick the toast sits under the cards; it must not cover the title or a card */
 check('toastClear',toastBox&&clear(toastBox,h2)&&clear(toastBox,cardsR),{toastBox,h2,cardsR});
 await wait(450); await pg.screenshot({path:D+'/tour/flow_05_earned.png'});
 const tp=(await st()).t; await wait(500); check('frozenPick',(await st()).t===tp,{});
 await pg.keyboard.press('2'); await wait(300); check('pickedEarned',(await st()).mode!=='pick'&&(await st()).picks===2,await st());
 await wait(800);

 // 6. HELD SPACE (attack) across the transition: never answers; spammed number keys during the gate never answer; first fresh press after the gate does
 await endFight(1); await pg.keyboard.down(' '); const n0=(await st()).answered;
 let opened=0; for(let k=0;k<40;k++){ await pg.keyboard.press(String(1+k%4)); await wait(25); const m=(await st()).mode; if(m==='ask'&&!opened) opened=Date.now(); if(opened&&Date.now()-opened>380) break; }
 const spam=await st(); await wait(250); await pg.keyboard.up(' ');
 check('heldSpaceAndSpam',spam.mode==='ask'&&spam.answered===n0&&!spam.qDone,{spam,n0});
 await pg.keyboard.press('3'); await wait(120); const fresh=await st(); check('freshAfterGate',fresh.answered===n0+1&&fresh.qDone,fresh);
 await ev(()=>{ __G.askNext(); __G.answer(0); __G.askNext(); }); await wait(200); if((await st()).mode==='pick'){ await wait(600); await pg.keyboard.press('1'); } await wait(800);

 // 7. RAPID CLICKS + a HELD click across the transition, right where answer 1 will appear
 await endFight(1); const n1=(await st()).answered; opened=0;
 for(let k=0;k<60;k++){ await pg.mouse.move(tile[0],tile[1]); await pg.mouse.down(); await wait(10); await pg.mouse.up(); await wait(15); const m=(await st()).mode; if(m==='ask'&&!opened) opened=Date.now(); if(opened&&Date.now()-opened>300) break; }
 await pg.mouse.down(); await wait(400); await pg.mouse.up(); await wait(50);   // pressed during the gate, released after it
 const clk=await st(); check('clickSpamAndHeld',clk.mode==='ask'&&clk.answered===n1,{clk,n1});
 const tile2=await ev(()=>{ const r=document.querySelector('.dn-ch').getBoundingClientRect(); return [r.left+r.width/2,r.top+r.height/2]; });
 await pg.mouse.click(tile2[0],tile2[1]); await wait(100); check('freshClick',(await st()).answered===n1+1,await st());
 await pg.mouse.click(tile2[0],tile2[1]); await wait(100); check('clickCantSkip',(await st()).qDone&&(await st()).mode==='ask',await st());
 await ev(()=>{ __G.askNext(); __G.answer(0); __G.askNext(); }); await wait(200); for(let g=0;g<6&&(await st()).mode!=='play';g++){ const m=(await st()).mode; if(m==='pick'){ await wait(600); await pg.keyboard.press('1'); } else if(m==='ask'){ await ev(()=>{ __G.answer(0); __G.askNext(); }); } await wait(800); }

 // 8. knockout: revive question, Continue, then a frozen count-in that says what came back
 await ev(()=>{ const S=__G.state(), w=S.w; __G.room('guard','s'); S.mode='play'; S.revUsed=0; w.waves=[]; w.spawns=[]; w.en=[]; const e=__G.spawn('gob',w.p.x+60,w.p.y,1); e.st=0; w.p.hp=1; w.p.inv=0; w.p.arm=0; w.p.sh=999; __G.hurt(1); });
 for(let g=0;g<30&&(await st()).mode!=='ask';g++) await wait(100); const ko=await st(); await wait(500); i=await okIdx(); await pg.keyboard.press(String(i+1)); await wait(1500); const ko2=await st();
 await pg.keyboard.press('Enter'); await wait(150); const re=await st(); const ep=await ev(()=>__G.state().w.en.map(e=>[Math.round(e.x),Math.round(e.y)]).join('|'));
 await pg.screenshot({path:D+'/tour/flow_06_reentry.png'}); await wait(700); const ep2=await ev(()=>__G.state().w.en.map(e=>[Math.round(e.x),Math.round(e.y)]).join('|')); const re2=await st();
 await wait(1300); const back=await st(); const inv=await ev(()=>__G.state().w.p.inv);
 check('knockout',ko.mode==='ask'&&ko.why==='revive'&&ko2.mode==='ask'&&ko2.qDone&&re.mode==='reentry'&&re.hp===3&&re2.mode==='reentry'&&ep===ep2&&back.mode==='play'&&inv>0,{ko,ko2,re,re2,back,inv,same:ep===ep2});

 // 9. the sparks: a burst on a right answer, none with reduced motion (checked separately below)
 console.log(JSON.stringify(R));
 const pr=await (await b.newContext({viewport:{width:1366,height:768},reducedMotion:'reduce'})).newPage(); pr.on('pageerror',e=>errs.push('rm: '+e));
 await pr.goto('file://'+D+'/rook_and_ruin_fonts.html?set=slope'); await pr.evaluate('localStorage.clear()'); await pr.reload(); await pr.waitForTimeout(600);
 const rm=await pr.evaluate(()=>{ return typeof __sparks==='function'?(__sparks()):-1; }); if(rm!==0) bad.push('rmSparks');
 console.log('errors',JSON.stringify(bad.length?['flow checks failed: '+bad.join(',')].concat(errs):errs)); await b.close(); })();
