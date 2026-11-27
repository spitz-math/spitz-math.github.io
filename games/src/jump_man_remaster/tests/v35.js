// Super Jump Man v35: stale-tab overlay above the card, reload mid-climb comes back paused, Enter on the restart box buttons,
// pops cleared when the New move card opens, read-only hooks off test hosts. node v35.js <mult copy>   (needs the copy served
// at http://localhost:8765/sjm.html for the two-tab check, like v28; run_tests.sh does that)
const {chromium}=require('playwright'); const fs=require('fs'), os=require('os'), path=require('path'); const F=process.argv[2]; let fails=0;
const ok=(c,m,v)=>{ if(!c) fails++; console.log(c?'  ok':'  FAIL',m,v===undefined?'':JSON.stringify(v)); };
(async()=>{ const b=await chromium.launch(); const ctx=await b.newContext({viewport:{width:1366,height:620}}); const errs=[];
 const open=async(url)=>{ const p=await ctx.newPage(); p.on('pageerror',e=>errs.push(String(e))); await p.goto(url); await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.waitForFunction(()=>window.__G); await p.waitForTimeout(300); return p; };
 const go=async(p)=>{ await p.fill('#jm-nameinput','Test T'); await p.click('#jm-go'); await p.waitForFunction(()=>__G.state().started); await p.waitForTimeout(400); };
 // 2 reload mid-climb comes back paused; a key resumes
 let p=await open('file://'+F); await go(p); await p.waitForTimeout(800); await p.reload(); await p.waitForFunction(()=>window.__G16); await p.waitForTimeout(500);
 const g0=await p.evaluate(()=>({paused:__G16.paused(),gt:__G.gt(),left:__G.state().endAt-Date.now()})); await p.waitForTimeout(1200);
 const g1=await p.evaluate(()=>({paused:__G16.paused(),gt:__G.gt(),left:__G.state().endAt-Date.now()}));
 ok(g0.paused&&g1.paused&&g1.gt===g0.gt&&Math.abs(g1.left-g0.left)<150,'a reload mid-climb comes back paused with the clock held',{g0,g1});
 await p.keyboard.press('ArrowRight'); await p.waitForTimeout(400); ok(await p.evaluate(()=>!__G16.paused()),'a key resumes');
 // 3 restart box: No is focused; Enter is ignored in the first second, then presses the focused button
 await p.keyboard.press('Shift+R'); await p.waitForTimeout(250); ok(await p.evaluate(()=>document.activeElement&&document.activeElement.id==='sz-askno'),'the box opens with No focused');
 await p.keyboard.press('Enter'); await p.waitForTimeout(200); ok(await p.$eval('#sz-ask',e=>!e.hidden),'Enter in the first second does nothing');
 await p.waitForTimeout(1000); await p.keyboard.press('Enter'); await p.waitForTimeout(300); ok(await p.$eval('#sz-ask',e=>e.hidden)&&await p.evaluate(()=>__G.state().started),'Enter on No closes the box, run kept');
 // 4 pops are cleared when the New move card opens
 await p.evaluate(()=>{ const G=__G,S=G.state(),P=G.man(),pl=G.plats(); const q=pl[S.nextWay]; P.on=q; P.h=q.h; P.x=G.cxAt(q); P.vx=0; P.vy=0; P.lastI=q.i-1; S.pi=q.i-1; }); await p.waitForFunction(()=>{ const S=__G.state(); return S.way&&S.q&&!S.qDone; },null,{timeout:6000}); await p.waitForTimeout(450);
 for(let i=0;i<2;i++){ const r=await p.evaluate(()=>__G.state().q.choices.findIndex(c=>c.ok)); await p.keyboard.press(String(r+1)); await p.waitForTimeout(1900); }
 await p.waitForFunction(()=>!!__G.state().offer,null,{timeout:6000}); const pc=await p.evaluate(()=>({offer:!!__G.state().offer,pops:__G16.pops().length}));
 ok(pc.offer&&pc.pops===0,'no pop-up words left under the New move card',pc); await p.close();
 // 1 two tabs: the stale tab shows the message ABOVE the card
 const a=await open('http://localhost:8765/sjm.html'); await go(a);
 await a.evaluate(()=>{ const G=__G,S=G.state(),P=G.man(),pl=G.plats(); const q=pl[10]; P.on=q; P.h=q.h; P.x=300; P.lastI=9; S.pi=9; }); await a.waitForFunction(()=>!!__G.state().way,null,{timeout:5000}); await a.waitForTimeout(300);
 const t2=await ctx.newPage(); await t2.goto('http://localhost:8765/sjm.html'); await t2.waitForFunction(()=>window.__G); await t2.waitForTimeout(600);
 await a.bringToFront(); await a.evaluate(()=>__G.ans(__G.state().q.choices.findIndex(c=>!c.ok))); await a.waitForTimeout(300); await t2.bringToFront(); await t2.waitForTimeout(700);
 const st=await t2.evaluate(()=>{ const e=document.getElementById('jmr-stale'); if(!e) return {el:false,stale:__G28.stale()}; const r=e.getBoundingClientRect(), top=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2); return {el:true,stale:__G28.stale(),onTop:!!top&&(top===e||e.contains(top)),w:Math.round(r.width),text:e.innerText.replace(/\s+/g,' ')}; });
 ok(st.el&&st.stale&&st.onTop&&/another tab/.test(st.text),'the stale tab shows "open in another tab" on top of the question card',st);
 await t2.screenshot({path:path.join(os.tmpdir(),'v35_stale.png')}); await a.close(); await t2.close();
 // 5 hooks: full on a test copy, read-only on any other page name
 const site=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'sjm35-')),'jump_man_page.html'); fs.copyFileSync(F,site);
 const s=await ctx.newPage(); s.on('pageerror',e=>errs.push(String(e))); await s.goto('file://'+site); await s.evaluate(()=>localStorage.clear()); await s.reload(); await s.waitForFunction(()=>window.__G); await s.fill('#jm-nameinput','Test T'); await s.click('#jm-go'); await s.waitForTimeout(600);
 const hk=await s.evaluate(()=>{ const a=__G.state(); a.score=999999; a.hearts=99; const b2=__G.state(); return {keys:Object.keys(__G),extra:Object.keys(window).filter(k=>/^__G\d+$/.test(k)&&window[k]),started:b2.started,score:b2.score,hearts:b2.hearts}; });
 ok(hk.keys.join()==='state'&&hk.extra.length===0&&hk.started&&hk.score<1000&&hk.hearts===3,'off test hosts the hooks are a read-only state copy; the game still runs',hk);
 await s.keyboard.down('ArrowRight'); await s.waitForTimeout(500); await s.keyboard.up('ArrowRight'); ok(await s.evaluate(()=>__G.state().started&&!__G.state().over),'and it plays'); await s.close();
 ok(errs.length===0,'no page errors',errs.slice(0,3)); console.log(fails?fails+' FAILED':'ALL PASS'); await b.close(); process.exit(fails?1:0); })();
