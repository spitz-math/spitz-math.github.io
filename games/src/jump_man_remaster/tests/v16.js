// Super Jump Man v16: one pop at a time (none over cards), fresh feedback on each question, pause + game-time clock,
// no SPITZ ARCADE header, touch buttons only on touch screens. node v16.js <mult copy>
const {chromium}=require('playwright'); const F=process.argv[2]; let fails=0;
const ok=(c,m,v)=>{ if(!c) fails++; console.log(c?'  ok':'  FAIL',m,v===undefined?'':JSON.stringify(v)); };
(async()=>{ const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1366,height:620}}); const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
 await p.goto('file://'+F); await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.waitForTimeout(500);
 ok(await p.evaluate(()=>{ const e=document.querySelector('#jm-start .sz-eyebrow'); return !e||getComputedStyle(e).display==='none'; }),'no SPITZ ARCADE header on the title');
 ok(await p.evaluate(()=>{ const r=document.getElementById('jm-go').getBoundingClientRect(); return r.bottom<=innerHeight; }),'Start button fits at 1366x620');
 await p.fill('#jm-nameinput','Test K'); await p.click('#jm-go'); await p.waitForTimeout(400);
 ok(await p.evaluate(()=>!__G16.touchUI()),'no touch buttons on a mouse/trackpad machine');
 const a=await p.evaluate(()=>{ const G=__G,S=G.state(), pick=ok=>S.q.choices.findIndex(c=>!!c.ok===ok); S.nextWay=0; G.step(1/60);
   G.ans(pick(true)); G.newQ(); const fb=document.getElementById('jm-fb').textContent; G.ans(pick(true)); G.newQ();
   __G16.pop(0,0,'TEST A'); __G16.pop(0,0,'TEST B'); return {fb, offer:!!S.offer, held:__G16.popQ().length, shown:__G16.pops().length}; });
 ok(!/Correct/.test(a.fb),'the next question does not show the old Correct! line',a.fb);
 ok(a.offer&&a.shown===0&&a.held>=2,'pops wait while the New move! card is open',a);
 await p.waitForTimeout(900); await p.keyboard.press('Enter'); let most=0, seen=new Set();
 for(let i=0;i<40;i++){ await p.waitForTimeout(100); const r=await p.evaluate(()=>{ const t=Date.now(); return __G16.pops().filter(o=>(t-o.t0)/1000/(o.big?1.5:1)<0.85).map(o=>o.txt); }); most=Math.max(most,r.length); r.forEach(x=>seen.add(x)); }
 ok(most<=1&&seen.size>=2,'after the card, pops come one at a time',{most,seen:[...seen]});
 const c=await p.evaluate(async()=>{ const S=__G.state(); const l0=S.endAt-Date.now(); document.dispatchEvent(new KeyboardEvent('keydown',{key:'p',bubbles:true})); await new Promise(r=>setTimeout(r,1500)); const l1=S.endAt-Date.now(); const pz=__G16.paused(); document.dispatchEvent(new KeyboardEvent('keydown',{key:'p',bubbles:true})); return {pz,lost:l0-l1,after:__G16.paused()}; });
 ok(c.pz&&!c.after&&c.lost<200,'P pauses the game and the clock, P again resumes',c);
 const cdp=await p.context().newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate',{rate:6});
 const d=await p.evaluate(async()=>{ const S=__G.state(); const l0=S.endAt-Date.now(), g0=__G16.gt(); await new Promise(r=>setTimeout(r,3000)); return {clock:(l0-(S.endAt-Date.now()))/1000, game:__G16.gt()-g0}; });
 await cdp.send('Emulation.setCPUThrottlingRate',{rate:1});
 ok(Math.abs(d.clock-d.game)<0.35,'at 6x slowdown the clock runs with the game',d);
 ok(!errs.length,'no page errors',errs); console.log(fails?fails+' FAILED':'ALL PASS'); await b.close(); process.exit(fails?1:0); })();
