// v6 checks: miss card waits, no doubled text, double-press guard, card nudge at 15 s, King skip, short last-burger wait, kind end line, juice settles
const { chromium } = require('/opt/node22/lib/node_modules/playwright'); const path=require('path');
const sleep=ms=>new Promise(r=>setTimeout(r,ms)); let bad=0; const ok=(n,c,d)=>{ console.log((c?'PASS ':'FAIL ')+n+(d?' · '+d:'')); if(!c) bad++; };
(async()=>{ const b=await chromium.launch(); const pg=await b.newPage({viewport:{width:1366,height:620}}); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
 const F='file://'+path.resolve(process.argv[2]);
 await pg.goto(F+'?set=slope'); await pg.evaluate(()=>localStorage.clear()); await pg.reload(); await sleep(400);
 await pg.fill('#bl-nameinput','T S'); await pg.click('#bl-go'); await sleep(500);
 // miss: wrong answer, wait 7 s: card still showing the miss
 let r=await pg.evaluate(()=>__G.state().tray.q.choices.findIndex(c=>c.ok)); await pg.keyboard.press(String(((r+1)%4)+1)); await sleep(7000);
 let s=await pg.evaluate(()=>({done:__G.state().tray&&__G.state().tray.done,foot:document.querySelector('#bb-tray .foot').textContent}));
 ok('a miss stays on screen until Space/Enter (7 s)',s.done===true,s.foot.slice(0,90));
 const dup=await pg.evaluate(()=>{ const t=document.querySelector('#bb-tray .foot').textContent.replace('Not quite.','').replace('Space or Enter ›',''); const ss=t.split(/(?<=\.)\s+/).map(x=>x.trim()).filter(x=>x.length>12); return ss.length!==new Set(ss).size; });
 ok('miss text has no repeated sentence',!dup);
 await pg.screenshot({path:'/tmp/claude-0/v6_miss.png'});
 await pg.keyboard.press('Enter'); await sleep(200);
 // nudge after 15 s on an open card
 await sleep(15800); s=await pg.evaluate(()=>document.getElementById('bb-tray').classList.contains('nudge'));
 ok('an open card nudges after 15 s',s); await pg.screenshot({path:'/tmp/claude-0/v6_nudge.png'});
 // double-press guard: right answer, then the same key just after the auto flip
 r=await pg.evaluate(()=>__G.state().tray.q.choices.findIndex(c=>c.ok)); await pg.keyboard.press(String(r+1));
 await pg.waitForFunction(()=>{ const T=__G.state().tray; return !T||!T.done; },null,{timeout:3000}).catch(()=>{});
 const before=await pg.evaluate(()=>__G.state().answered); await pg.keyboard.press(String(r+1)); await sleep(100);
 s=await pg.evaluate(()=>__G.state().answered); ok('a key right after the card flips does not answer the next question',s===before,before+' -> '+s);
 // King: win, then Space skips to the end screen after 1 s
 await pg.evaluate(()=>{ const S=__G.state(); S.tray=null; document.getElementById('bb-tray').hidden=true; __G.goLevel(10); S.tray=null; document.getElementById('bb-tray').hidden=true; S.clearing=true; S.lvStars=3; __G2.finish(); });
 await sleep(1200); await pg.keyboard.press('Space'); await sleep(400);
 s=await pg.evaluate(()=>({over:__G.state().over,won:__G.state().won,end:!document.getElementById('bl-end').hidden}));
 ok('Space skips the King win to the end screen after 1 s',s.over&&s.won&&s.end,JSON.stringify(s));
 // out of burgers: ends within ~3.5 s of the world going quiet; kind line on a rough run
 await pg.goto(F+'?set=mult'); await pg.evaluate(()=>localStorage.clear()); await pg.reload(); await sleep(400); await pg.fill('#bl-nameinput','T S'); await pg.click('#bl-go'); await sleep(400);
 await pg.evaluate(()=>{ const S=__G.state(); S.tray=null; document.getElementById('bb-tray').hidden=true; S.burgers=0; }); const t0=Date.now();
 await pg.waitForFunction(()=>__G.state().over,null,{timeout:10000}).catch(()=>{}); const dt=Date.now()-t0;
 s=await pg.evaluate(()=>document.getElementById('bl-endwhy').textContent); ok('out of burgers ends quickly',dt<4000,dt+' ms'); ok('kind line after a rough run',/Try again/.test(s),s);
 ok('no page errors',errs.length===0,errs.join(' | '));
 console.log(bad?'FAILED '+bad:'ALL PASS'); await b.close(); })();
