/* every question set: 14 questions each through the real panel at 1366x620, checks nothing spills out of the tablet or off screen */
const {chromium}=require('playwright'); const path=require('path'); const D=path.join(__dirname,'..','out');
(async()=>{ const b=await chromium.launch(); const ctx=await b.newContext({viewport:{width:1366,height:620}}); const pg=await ctx.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(String(e)));
 await pg.goto('file://'+D+'/rook_and_ruin_fonts.html'); await pg.waitForTimeout(500);
 const sets=await pg.evaluate(()=>Object.keys(SpitzQ.sets)); console.log('sets',sets.length,sets.join(','));
 const bad=[];
 for(const id of sets){ await pg.goto('file://'+D+'/rook_and_ruin_fonts.html?set='+id); await pg.evaluate('localStorage.clear()'); await pg.reload(); await pg.waitForTimeout(450);
   await pg.fill('#dn-nameinput','Test T'); await pg.click('#dn-go'); await pg.waitForTimeout(150); await pg.keyboard.press('Escape'); await pg.waitForTimeout(100);
   let n=0, worst='';
   for(let round=0;round<7;round++){
     await pg.evaluate(()=>{ const S=__G.state(), w=S.w; w.en=[]; w.waves=[]; w.spawns=[]; w.wave=99; w.cleared=true; w.pend=1; w.resolve=0; S.mode='play'; for(let k=0;k<30&&S.mode==='play';k++) __G.step(1/60); });
     for(let q=0;q<2;q++){ const r=await pg.evaluate(()=>{ const S=__G.state(); if(S.mode!=='ask') return {mode:S.mode};
         const box=document.getElementById('dn-q').getBoundingClientRect(), out=[]; document.querySelectorAll('#dn-q *').forEach(el=>{ const r=el.getBoundingClientRect(); if(!r.width||!r.height) return; if(el.ownerSVGElement) return; if(r.right>box.right+1||r.bottom>box.bottom+1||r.left<box.left-1||r.top<box.top-1) out.push(el.className||el.tagName); });
         const off=box.bottom>innerHeight+1||box.right>innerWidth+1||box.top<-1; const i=S.q.choices.findIndex(c=>c.ok); const wrong=(i+1)%S.q.choices.length; return {mode:'ask',spill:out.slice(0,3),off,i,wrong,topic:S.q.topic}; });
       if(r.mode!=='ask'){ worst='mode '+r.mode; break; } n++; if(r.spill.length||r.off) worst=r.topic+' spill:'+r.spill.join('/')+(r.off?' OFFSCREEN':'');
       await pg.evaluate(k=>__G.answer(k),(round%3===2&&q===0)?r.wrong:r.i); await pg.waitForTimeout(60);
       const r2=await pg.evaluate(()=>{ const box=document.getElementById('dn-q').getBoundingClientRect(), fb=document.getElementById('dn-fb').getBoundingClientRect(); return {fbSpill:fb.bottom>box.bottom+1, off:box.bottom>innerHeight+1}; });
       if(r2.fbSpill||r2.off) worst=r.topic+' feedback spill'+(r2.off?' OFFSCREEN':'');
       await pg.evaluate(()=>__G.askNext()); await pg.waitForTimeout(30); }
     const m=await pg.evaluate(()=>{ const S=__G.state(); if(S.mode==='pick'){ const cards=[...document.querySelectorAll('.dn-card')], bx=document.getElementById('dn-pick').getBoundingClientRect(); const sp=cards.some(c=>{ const r=c.getBoundingClientRect(); return r.bottom>innerHeight||c.scrollHeight>c.clientHeight+1; }); __G.pick(0); return sp?'pick spill':'ok'; } return S.mode; });
     if(m!=='ok') worst=worst||('after questions: '+m); }
   if(id===sets[3]) await pg.screenshot({path:D+'/tour/sets_sample.png'});
   console.log(id.padEnd(10),n,'questions',worst?('PROBLEM '+worst):'ok'); if(worst) bad.push(id); }
 if(bad.length) errs.push('sets with problems: '+bad.join(',')); console.log('errors',JSON.stringify(errs.slice(0,3))); await b.close(); })();
