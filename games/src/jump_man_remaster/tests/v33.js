// Super Jump Man v33: clock stops behind cards, click lock on the restart box, no doubled miss sentence, same-wall kick hint,
// New move card waits behind the restart box, Up arrow on the Jump keycaps; plus smoke checks for v29-v32 art. node v33.js <mult copy>
const {chromium}=require('playwright'); const F=process.argv[2]; let fails=0;
const ok=(c,m,v)=>{ if(!c) fails++; console.log(c?'  ok':'  FAIL',m,v===undefined?'':JSON.stringify(v)); };
(async()=>{ const b=await chromium.launch(); const ctx=await b.newContext({viewport:{width:1366,height:620}}); const errs=[];
 const start=async(q)=>{ const p=await ctx.newPage(); p.on('pageerror',e=>errs.push(String(e))); await p.goto('file://'+F+(q||'')); await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.waitForFunction(()=>window.__G); await p.waitForTimeout(300); return p; };
 const go=async(p)=>{ await p.fill('#jm-nameinput','Test T'); await p.click('#jm-go'); await p.waitForFunction(()=>__G.state().started); await p.waitForTimeout(300); };
 const toWay=async(p)=>{ await p.evaluate(()=>{ const G=__G,S=G.state(),P=G.man(),pl=G.plats(); const q=pl[S.nextWay]; P.on=q; P.h=q.h; P.x=G.cxAt(q); P.vx=0; P.vy=0; P.lastI=q.i-1; S.pi=q.i-1; }); await p.waitForFunction(()=>!!__G.state().way,null,{timeout:6000}); await p.waitForTimeout(300); };
 const left=p=>p.evaluate(()=>__G.state().endAt-Date.now());
 // 0 start screen keycaps
 let p=await start(); const caps=await p.$eval('.sz-ctl',e=>e.innerText.replace(/\s+/g,' ')); ok(/Space/.test(caps)&&await p.$$eval('.sz-ctl .g',gs=>gs.some(g=>/Jump/.test(g.innerText)&&g.querySelectorAll('kbd').length>=2)),'Jump shows two keycaps (Up arrow or Space)',caps.slice(0,80));
 // smoke: v29-v32 art is loaded
 await go(p); await p.waitForTimeout(500);
 const art=await p.evaluate(()=>({frames:Object.keys(window.SJMFRAMES||{}).length,wing:!!(window.__G32&&__G32.GLW&&__G32.GLW.complete&&__G32.GLW.naturalWidth>100),patched:!/native code/.test(String(CanvasRenderingContext2D.prototype.fillText)),props:!!window.SJMPROPS,art:!!(window.__G22&&__G22.AL)}));
 ok(art.frames===7&&art.wing&&art.patched&&art.props&&art.art,'v22-v32 art and the arrow patch are loaded',art);
 // 1 the clock runs in play, stops behind the question card and the New move card
 const a0=await left(p); await p.waitForTimeout(1500); const a1=await left(p); ok(a0-a1>1200,'clock runs during play',Math.round(a0-a1));
 await toWay(p); const c0=await left(p); await p.waitForTimeout(3000); const c1=await left(p); ok(Math.abs(c0-c1)<120,'clock stops behind the question card',Math.round(c0-c1));
 for(let i=0;i<2;i++){ const r=await p.evaluate(()=>__G.state().q.choices.findIndex(c=>c.ok)); await p.keyboard.press(String(r+1)); await p.waitForTimeout(1900); }
 await p.waitForFunction(()=>!!__G.state().offer,null,{timeout:6000}); const o0=await left(p); await p.waitForTimeout(2000); const o1=await left(p); ok(Math.abs(o0-o1)<120,'clock stops behind the New move card',Math.round(o0-o1));
 // 5 the card's 5 s do not run behind the restart box
 await p.keyboard.press('Shift+R'); await p.waitForTimeout(6500); ok(await p.evaluate(()=>!!__G.state().offer),'New move card still open after 6.5 s behind the restart box');
 await p.click('#sz-askno'); await p.waitForTimeout(600); ok(await p.evaluate(()=>!!__G.state().offer),'and it is not picked the moment the box closes');
 await p.waitForFunction(()=>!__G.state().offer,null,{timeout:7000}).then(()=>ok(true,'then picks itself within 5 s'),()=>ok(false,'then picks itself within 5 s'));
 // 2 restart box: clicks and keys ignored for 1 s, then work
 await p.waitForTimeout(500); const g0=await p.evaluate(()=>__G.gt()); await p.keyboard.press('Shift+R'); await p.waitForTimeout(120);
 ok(await p.$eval('#sz-ask',e=>!e.hidden&&e.classList.contains('jmr-wait')),'box open and dim at 0.1 s'); await p.click('#sz-askyes',{force:true}); await p.keyboard.press('y'); await p.waitForTimeout(300);
 ok(await p.evaluate(()=>__G.state().started&&__G.gt()>0)&&await p.$eval('#sz-ask',e=>!e.hidden),'click and Y at 0.1 s do not wipe the run');
 await p.waitForTimeout(1000); ok(await p.$eval('#sz-ask',e=>!e.classList.contains('jmr-wait')),'box is bright after 1 s'); await p.click('#sz-askno'); await p.waitForTimeout(300);
 ok(await p.$eval('#sz-ask',e=>e.hidden)&&await p.evaluate(()=>__G.state().started),'No closes the box after 1 s, run kept');
 await p.keyboard.press('Shift+R'); await p.waitForTimeout(1300); await p.click('#sz-askyes'); await p.waitForTimeout(1200); await p.waitForFunction(()=>window.__G);
 ok(await p.evaluate(()=>!__G.state().started),'Yes after 1 s starts a new game'); await p.close();
 // 3 no sentence twice after a miss (unit + HOY & VUX, the worst set)
 p=await start('?set=hoy'); const d=await p.evaluate(()=>__G33.dedupe('Right slope, wrong direction. VUX: x = a number is Vertical with Undefined slope.','VUX: x = a number is Vertical with Undefined slope.'));
 ok(d[0]==='Right slope, wrong direction.'&&/^VUX/.test(d[1]),'shared sentence is dropped from the reason',d);
 const d2=await p.evaluate(()=>__G33.dedupe('The slope is <span class="f"><b>1</b><i>2</i></span>. Flip it.','Flip it. Then change the sign.')); ok(/class="f"/.test(d2[0])&&!/Flip it/.test(d2[0]),'fractions in the text survive',d2);
 await go(p); await toWay(p); let dup=0,n=0,empty=0;
 for(let i=0;i<40;i++){ await p.evaluate(()=>{ const S=__G.state(),w=S.way; w.n=0; w.got=0; w.res.length=0; S.qDone=true; __G.newQ(); }); await p.waitForTimeout(380);
   const w=await p.evaluate(()=>__G.state().q.choices.findIndex(c=>!c.ok)); await p.keyboard.press(String(w+1)); await p.waitForTimeout(60);
   const t=await p.$eval('#jm-fb',e=>e.innerText.replace(/\s+/g,' ').trim()); n++; if(t.length<25) empty++; const s=t.split(/(?<=[.!?])\s+/).filter(x=>x.length>18); if(new Set(s).size!==s.length) dup++; }
 ok(dup===0&&empty===0,'40 HOY & VUX misses: no sentence printed twice, none left empty',{n,dup,empty}); await p.close();
 // 4 a refused same-wall kick says so
 p=await start(); await go(p); const hint=await p.evaluate(()=>{ const G=__G,S=G.state(),P=G.man(); S.mv.wall=1; S.nextWay=1e9; P.on=null; P.h+=300; P.vy=-50; P.x=30; P.kickSide=1; P.wallSide=1; P.airJ=9; G.jump(); for(let i=0;i<6;i++) G.step(1/60); return {q:__G16.popQ().map(o=>o.txt),pops:__G16.pops().map(o=>o.txt)}; });
 ok(hint.q.concat(hint.pops).includes('LAND FIRST'),'"LAND FIRST" shows when a same-wall kick is refused',hint); await p.close();
 // 7 a held key never answers; 8 a new question ignores number keys for 0.3 s
 p=await start(); await go(p); await toWay(p); await p.waitForTimeout(500);
 const r7=await p.evaluate(()=>__G.state().q.choices.findIndex(c=>c.ok)); await p.keyboard.down(String(r7+1)); const t7=Date.now();
 while(Date.now()-t7<4500){ await p.keyboard.down(String(r7+1)); await p.waitForTimeout(40); } await p.keyboard.up(String(r7+1));
 const h7=await p.evaluate(()=>{ const S=__G.state(); return {answered:S.answered,qDone:!!S.qDone,way:!!S.way}; }); ok(h7.answered===1&&h7.way&&!h7.qDone,'holding the right key answers one question only, the next waits',h7);
 await p.waitForTimeout(400); await p.evaluate(()=>{ const S=__G.state(),w=S.way; w.n=0; w.got=0; w.res.length=0; S.qDone=true; __G.newQ(); }); await p.waitForTimeout(60);
 await p.keyboard.press('1'); await p.waitForTimeout(60); const e8=await p.evaluate(()=>__G.state().answered); await p.waitForTimeout(350); await p.keyboard.press('1'); await p.waitForTimeout(80);
 const l8=await p.evaluate(()=>__G.state().answered); ok(e8===1&&l8===2,'a number key in the first 0.3 s of a new question is ignored, then works',{e8,l8});
 await p.keyboard.press('Shift+R'); const t9=Date.now(); await p.keyboard.down('y'); while(Date.now()-t9<1800){ await p.keyboard.down('y'); await p.waitForTimeout(40); } await p.keyboard.up('y');
 ok(await p.evaluate(()=>__G.state().started&&__G.state().answered===2)&&await p.$eval('#sz-ask',e=>!e.hidden),'a held Y does not wipe the run when the lock ends'); await p.close();
 ok(errs.length===0,'no page errors',errs.slice(0,3));
 console.log(fails?fails+' FAILED':'ALL PASS'); await b.close(); process.exit(fails?1:0); })();
