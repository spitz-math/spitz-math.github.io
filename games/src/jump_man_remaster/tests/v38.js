// Super Jump Man v38: "Welcome back!" after a reload, the miss card says when the next Waystone comes, a kinder board line under 30%.
// node v38.js <mult copy>
const {chromium}=require('playwright'); const F=process.argv[2]; let fails=0;
const ok=(c,m,v)=>{ if(!c) fails++; console.log(c?'  ok':'  FAIL',m,v===undefined?'':JSON.stringify(v)); };
(async()=>{ const b=await chromium.launch(); const ctx=await b.newContext({viewport:{width:1366,height:620}}); const errs=[];
 const p=await ctx.newPage(); p.on('pageerror',e=>errs.push(String(e))); await p.goto('file://'+F); await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.waitForFunction(()=>window.__G38);
 await p.fill('#jm-nameinput','Test T'); await p.click('#jm-go'); await p.waitForFunction(()=>__G.state().started); await p.waitForTimeout(400);
 ok(await p.evaluate(()=>!__G38.back()),'a fresh run is not "welcome back"');
 await p.keyboard.press('p'); await p.waitForTimeout(200); ok(await p.evaluate(()=>__G16.paused()&&!__G38.back()),'P still shows the plain pause card'); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(300);
 await p.reload(); await p.waitForFunction(()=>window.__G38); await p.waitForTimeout(500);
 ok(await p.evaluate(()=>__G16.paused()&&__G38.back()),'a reload mid-climb comes back paused with "Welcome back!"');
 await p.keyboard.press('ArrowRight'); await p.waitForTimeout(300); ok(await p.evaluate(()=>!__G16.paused()&&!__G38.back()),'a key resumes and clears it');
 // miss card text: miss both questions at the first Waystone
 await p.evaluate(()=>{ const G=__G,S=G.state(),P=G.man(),q=G.plats()[S.nextWay]; P.on=q; P.h=q.h; P.x=300; P.vx=0; P.vy=0; P.lastI=q.i-1; S.pi=q.i-1; });
 await p.waitForFunction(()=>{ const S=__G.state(); return S.way&&S.q&&!S.qDone; },null,{timeout:6000});
 for(let i=0;i<2;i++){ await p.waitForFunction(()=>{ const S=__G.state(); return S.way&&S.q&&!S.qDone; },null,{timeout:6000}); await p.waitForTimeout(450); const w=await p.evaluate(()=>__G.state().q.choices.findIndex(c=>!c.ok)); await p.keyboard.press(String(w+1)); await p.waitForTimeout(2300); await p.keyboard.press('Enter'); await p.waitForTimeout(400); }
 await p.waitForFunction(()=>!!__G.state().offer,null,{timeout:8000}); const txt=await p.$eval('#jmr-offer',e=>e.innerText.replace(/\s+/g,' '));
 ok(/next Waystone in 30 ledges or less/.test(txt),'the "Not this time" card says when the next Waystone comes',txt);
 await p.screenshot({path:require('os').tmpdir()+'/v38_miss.png'});
 // end screen at 0 of 2: no "Get 70% right" line
 await p.waitForTimeout(1000); await p.keyboard.press('1'); await p.waitForTimeout(500); await p.evaluate(()=>{ const S=__G.state(); S.answered=6; S.correct=0; __G.end(); }); await p.waitForFunction(()=>__G.state().over); await p.waitForTimeout(2500);
 /* the test copy has no leaderboard data, so put the shared board line in by hand, exactly as scorecode.js would */
 await p.evaluate(()=>{ const box=document.querySelector('#jm-end .spz-code')||document.getElementById('jm-endcode').parentNode; box.insertAdjacentHTML('afterbegin','<span class="b spz-board"></span>'); box.querySelector('.spz-board').textContent='🎯 Get 70% right to make the Super Jump Man board. You got 0%.'; }); await p.waitForTimeout(300);
 const end=await p.evaluate(()=>{ const e=document.querySelector('#jm-end .spz-board'); return e?e.textContent:'(no board line)'; });
 ok(!/Get 70%/.test(end)&&/Waystone/.test(end),'a 0% run is not told "Get 70% right to make the board"',end);
 await p.screenshot({path:require('os').tmpdir()+'/v38_end.png'});
 ok(errs.length===0,'no page errors',errs.slice(0,3)); console.log(fails?fails+' FAILED':'ALL PASS'); await b.close(); process.exit(fails?1:0); })();
