// Gates for a Burger Blaster v2 build: smoke with real input, reload mid-tray, lose + win ends, every set fits the tray, 6x slowdown fps.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const http=require('http'),fs=require('fs'),path=require('path');
const FILE=path.resolve(process.argv[2]); const DIR=path.dirname(FILE);
const srv=http.createServer((q,r)=>{ const f=path.join(DIR,decodeURIComponent(q.url.split('?')[0])); fs.readFile(f,(e,b)=>{ if(e){r.writeHead(404);return r.end();} r.writeHead(200,{'Content-Type':{'.html':'text/html','.js':'text/javascript'}[path.extname(f)]||'application/octet-stream'}); r.end(b); }); }).listen(0);
const sleep=ms=>new Promise(r=>setTimeout(r,ms)); const R=[]; const ok=(n,c,d)=>{ R.push((c?'PASS ':'FAIL ')+n+(d?' · '+d:'')); };
(async()=>{ await new Promise(r=>srv.on('listening',r)); const U=`http://localhost:${srv.address().port}/${path.basename(FILE)}`; const b=await chromium.launch();
 let pg=await b.newPage({viewport:{width:1366,height:620}}); const errs=[]; pg.on('pageerror',e=>errs.push(String(e)));
 await pg.goto(U+'?set=slope'); await pg.evaluate(()=>localStorage.clear()); await pg.reload(); await sleep(800); await sleep(3000);
 ok('idle on title 3 s: no errors',errs.length===0);
 await pg.fill('#bl-nameinput','Test S'); await pg.click('#bl-go'); await sleep(600);
 let s=await pg.evaluate(()=>{ const S=__G.state(); return {tray:!!S.tray,b:S.burgers,vis:!document.getElementById('bb-tray').hidden}; });
 ok('Start opens the tray',s.tray&&s.vis,JSON.stringify(s));
 // answer right with a real key
 let right=await pg.evaluate(()=>__G.state().tray.q.choices.findIndex(c=>c.ok)); await pg.keyboard.press(String(right+1)); await sleep(300);
 s=await pg.evaluate(()=>({spec:__G.state().spec.length,c:__G.state().correct})); ok('right answer by key loads a special',s.spec===1&&s.c===1,JSON.stringify(s));
 await sleep(1100);
 // answer wrong by click
 const wrong=await pg.evaluate(()=>__G.state().tray.q.choices.findIndex(c=>!c.ok)); await pg.click(`#bb-tray .c[data-i="${wrong}"]`); await sleep(300);
 s=await pg.evaluate(()=>({b:__G.state().burgers,res:__G.state().tray.res.join(),st:__G.state().streak})); ok('wrong answer keeps every burger, resets streak',s.b===11&&s.st===0,JSON.stringify(s));
 // reload during the miss card: tray survives
 await pg.reload(); await sleep(900); s=await pg.evaluate(()=>({tray:!!__G.state().tray,vis:!document.getElementById('bb-tray').hidden,res:__G.state().tray&&__G.state().tray.res.join()}));
 ok('reload mid-tray keeps the tray and answers',s.tray&&s.vis&&s.res==='ok,no',JSON.stringify(s));
 await sleep(1400); await pg.keyboard.press('Enter'); await sleep(300);
 s=await pg.evaluate(()=>({tray:!!__G.state().tray,spec:__G.state().spec.length,b:__G.state().burgers,vis:!document.getElementById('bb-tray').hidden}));
 ok('a miss brings no spare: the card closes after two questions',!s.tray&&!s.vis,JSON.stringify(s));
 ok('one right, one miss = 1 special and every burger',s.spec===1&&s.b===11,JSON.stringify(s));
 // keyboard aim + Space fires; WASD changes aim
 const a0=await pg.evaluate(()=>__G.state().aim.slice()); await pg.keyboard.press('w'); await pg.keyboard.press('d'); const a1=await pg.evaluate(()=>__G.state().aim.slice());
 ok('W/D change aim like arrows',a1[0]>a0[0]&&a1[1]>a0[1],JSON.stringify([a0,a1]));
 await pg.keyboard.press('Space'); await sleep(300); s=await pg.evaluate(()=>({shots:__G.state().shots,b:__G.state().burgers})); ok('Space fires and costs a burger',s.shots===1&&s.b===10,JSON.stringify(s));
 // click while a special flies pops it (does not start a drag)
 await sleep(250); s=await pg.evaluate(()=>({f:__G.world().flying}));
 { const bx=await pg.locator('#bl-canvas').boundingBox(); await pg.mouse.click(bx.x+bx.width*0.5,bx.y+bx.height*0.4); await sleep(200); }
 s=await pg.evaluate(()=>({shots:__G.state().shots})); ok('click mid-flight pops the special, no extra shot',s.shots===1,JSON.stringify(s));
 for(let i=0;i<60;i++){ const f=await pg.evaluate(()=>__G.world().flying); if(!f&&await pg.evaluate(()=>__G.canFire())) break; await sleep(250); }
 // a lucky first shot can clear the fort (forts are random now): finish the clear and close the next tray so the drag test has a fort to shoot at
 for(let k=0;k<12;k++){ const st=await pg.evaluate(()=>({cl:__G.state().clearing,tray:!!__G.state().tray})); if(!st.cl&&!st.tray) break;
   await pg.evaluate(()=>{ __G2.finish(); const T=__G.state().tray; if(T){ if(!T.done){ __G2.trayAnswer(T.q.choices.findIndex(c=>c.ok)); } __G2.trayNext(); } }); await sleep(300); }
 await pg.waitForFunction(()=>__G.canFire()&&!__G.world().flying,null,{timeout:8000}).catch(()=>{});
 // mouse drag fire
 const box=await pg.locator('#bl-canvas').boundingBox(); const sx=box.x+box.width*0.15, sy=box.y+box.height*0.7;
 await pg.mouse.move(sx,sy); await pg.mouse.down(); for(let i=1;i<=8;i++){ await pg.mouse.move(sx-i*12,sy+i*7); await sleep(20); } await pg.mouse.up(); await sleep(300);
 s=await pg.evaluate(()=>__G.state().shots); ok('mouse drag fires',s===2,'shots '+s);
 // idle nudge after 8 s
 await sleep(9000); const nud=await pg.evaluate(()=>__G.canFire()); ok('idle nudge condition reached (canFire after 8 s)',nud);
 await pg.screenshot({path:'/tmp/claude-0/g_idle.png'});
 // lose: burgers to 0 -> end screen
 await pg.evaluate(()=>{ const S=__G.state(); S.burgers=0; S.spec=[]; }); await sleep(7000);
 s=await pg.evaluate(()=>({over:__G.state().over,end:!document.getElementById('bl-end').hidden,why:document.getElementById('bl-endwhy').textContent}));
 ok('out of burgers ends the run with the end screen',s.over&&s.end,s.why); await pg.screenshot({path:'/tmp/claude-0/g_end.png'});
 ok('no page errors in smoke',errs.length===0,errs.slice(0,2).join(' | '));
 // win path: jump to the King and feed him
 await pg.evaluate(()=>localStorage.clear()); await pg.reload(); await sleep(600); await pg.fill('#bl-nameinput','Test S'); await pg.click('#bl-go'); await sleep(300);
 s=await pg.evaluate(()=>{ const S=__G.state(); S.tray=null; document.getElementById('bb-tray').hidden=true; __G.goLevel(10); S.tray=null; __G2.fast(true); let n=0; while(!S.won&&n++<40&&S.burgers>0){ const m=__G.munchList().find(x=>x.king)||__G.munchList()[0]; if(!m){ __G2.finish(); continue; }
   let best=null; for(let aa=-5;aa<=75&&!best;aa+=1) for(let pp=0.4;pp<=1.001;pp+=0.01){ const pts=__G.path(aa,pp,500); if(pts.some(q=>Math.hypot(q[0]-m.x,q[1]-m.y)<16)){ best=[aa,pp]; break; } } if(best) __G.fire(best[0],best[1]); __G.settle(1500); if(S.clearing) __G2.finish(); }
   return {won:S.won,score:S.score}; });
 await sleep(4500); const w=await pg.evaluate(()=>({over:__G.state().over,why:document.getElementById('bl-endwhy').textContent}));
 ok('feeding the King wins the run',s.won&&w.over,w.why); await pg.screenshot({path:'/tmp/claude-0/g_win.png'});
 await pg.close();
 // every question set fits the tray
 pg=await b.newPage({viewport:{width:1366,height:620}}); await pg.goto(U+'?set=slope'); await sleep(500);
 const sets=await pg.evaluate(()=>Object.keys(SpitzQ.sets)); const bad=[];
 for(const set of sets){ await pg.goto(U+'?set='+set); await pg.evaluate(()=>localStorage.clear()); await pg.reload(); await sleep(300);
   await pg.fill('#bl-nameinput','Test S'); await pg.click('#bl-go'); await sleep(200);
   for(let k=0;k<6;k++){ const fit=await pg.evaluate(()=>{ const S=__G.state(); S.tray.q=SpitzQ&&__G2? S.tray.q:null; const el=document.getElementById('bb-tray'); const st=document.getElementById('stage').getBoundingClientRect(), r=el.getBoundingClientRect(); const over=[...el.querySelectorAll('.c, .pr')].some(x=>x.scrollWidth>x.clientWidth+2); return {inside:r.top>=st.top-1&&r.bottom<=st.bottom+1&&r.left>=st.left-1&&r.right<=st.right+1, over}; });
     if(!fit.inside||fit.over){ bad.push(set+':'+JSON.stringify(fit)); await pg.screenshot({path:'/tmp/claude-0/fit_'+set+'.png'}); break; }
     const ri=await pg.evaluate(()=>__G.state().tray.q.choices.findIndex(c=>!c.ok)); await pg.evaluate(i=>__G2.trayAnswer(i),ri); await pg.evaluate(()=>__G2.trayNext()); if(!(await pg.evaluate(()=>!!__G.state().tray))) await pg.evaluate(()=>{ __G.goLevel(__G.state().level+1); }); } }
 ok('every question set fits the tray ('+sets.length+' sets x 6 questions)',bad.length===0,bad.join(' ; '));
 await pg.close();
 // 6x slowdown fps during a TNT collapse
 const ctx=await b.newContext({viewport:{width:1366,height:620}}); pg=await ctx.newPage(); await pg.goto(U+'?set=slope'); await pg.evaluate(()=>localStorage.clear()); await pg.reload(); await sleep(400);
 await pg.fill('#bl-nameinput','Test S'); await pg.click('#bl-go'); await sleep(200);
 await pg.evaluate(()=>{ const S=__G.state(); S.order[1]={d:2}; S.tray=null; __G.goLevel(1); S.tray=null; document.getElementById('bb-tray').hidden=true; }); await sleep(2500);
 const cdp=await ctx.newCDPSession(pg); await cdp.send('Emulation.setCPUThrottlingRate',{rate:6});
 const fps=await pg.evaluate(()=>new Promise(r=>{ const bl=__G.world().blockList.find(x=>x[0]==='tnt'); let best=null; for(let a=-5;a<=75&&!best;a+=1) for(let p=0.4;p<=1.001;p+=0.01){ if(__G.path(a,p,500).some(q=>Math.hypot(q[0]-bl[1],q[1]-bl[2])<20)){ best=[a,p]; break; } }
   __G.fire(best[0],best[1]); let n=0,t0=performance.now(); (function k(){ n++; if(performance.now()-t0<4000) requestAnimationFrame(k); else r(n/4); })(); }));
 ok('6x CPU slowdown during a TNT collapse',fps>=14,Math.round(fps)+' fps (live game dips to about 15-25)');
 console.log(R.join('\n')); await b.close(); srv.close(); })();
