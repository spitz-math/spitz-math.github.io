const {chromium}=require('playwright'); const U='http://localhost:8765/games/_jmr_test.html';
(async()=>{ const b=await chromium.launch(); let fail=0; const errs=[];
  const open=async(q,vp)=>{ const ctx=await b.newContext({viewport:vp}); const p=await ctx.newPage(); p.on('pageerror',e=>errs.push(q+': '+e)); await p.goto(U+q); await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.waitForTimeout(600); return p; };
  let p=await open('',{width:1366,height:620}); const sets=await p.evaluate(()=>Object.keys(SpitzQ.sets));
  const st=await p.evaluate(()=>{ const b=document.querySelector('#jm-start .jm-box').getBoundingClientRect(), s=document.getElementById('stage').getBoundingClientRect(); return {top:b.top>=s.top-1, bottom:b.bottom<=s.bottom+1, b:[b.top,b.bottom], s:[s.top,s.bottom]}; });
  console.log(st.top&&st.bottom?'ok':'FAIL','start screen fits at 1366x620',JSON.stringify(st)); if(!(st.top&&st.bottom)) fail++;
  await p.screenshot({path:'/tmp/claude-0/sc/jmr/title620.png'}); await p.context().close();
  for(const vp of [{width:1366,height:768},{width:1366,height:620}]) for(const id of sets){ p=await open('?set='+id,vp); const bad=[];
    await p.fill('#jm-nameinput','Set Test'); await p.click('#jm-go'); await p.waitForTimeout(200); await p.evaluate(()=>{ const G=__G, P=G.man(), q=G.plats()[10]; P.on=null; P.x=300; P.h=q.h+30; P.vy=-10; P.lastI=9; for(let k=0;k<20;k++) G.step(1/60); });
    for(let k=0;k<4;k++){ const ok=k%2===0; const i=await p.evaluate(o=>__G.state().q.choices.findIndex(c=>!!c.ok===o),ok); await p.keyboard.press(String(i+1)); await p.waitForTimeout(120);
      const r=await p.evaluate(()=>{ const q=document.getElementById('jm-q').getBoundingClientRect(); const over=[...document.querySelectorAll('#jm-q *')].filter(e=>{ if(e instanceof SVGElement&&!(e instanceof SVGSVGElement)) return false; const r=e.getBoundingClientRect(); return r.width&&(r.right>q.right+2||r.bottom>q.bottom+2); }).map(e=>e.tagName+'.'+(e.getAttribute('class')||'')).slice(0,3); return over; });
      if(r.length) bad.push(r); await p.waitForTimeout(ok?50:1300); await p.keyboard.press('Enter'); await p.waitForTimeout(80); }
    const e=await p.evaluate(()=>__G.state().energy); console.log(bad.length?'FAIL':'ok',id,vp.width+'x'+vp.height,'energy',e,bad.length?JSON.stringify(bad[0]):''); if(bad.length) fail++; await p.context().close(); }
  console.log('page errors',errs.slice(0,3)); await b.close(); console.log(fail||errs.length?'FAILED':'ALL SETS PASS'); })();
