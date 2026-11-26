// Jump Man v12/v13 rules: 2 right with a spare 3rd question, card read lock, no pay after the buzzer, Play again double-click safety,
// right answers push the fog back. NODE_PATH=$(npm root -g) node v12.js <mult copy>
const {chromium}=require('playwright'); const F=process.argv[2]; let fails=0;
const ok=(c,m,v)=>{ if(!c) fails++; console.log(c?'  ok':'  FAIL',m,v===undefined?'':JSON.stringify(v)); };
(async()=>{ const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1366,height:620}}); const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
 await p.goto('file://'+F); await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.waitForTimeout(400); await p.fill('#jm-nameinput','Test K'); await p.click('#jm-go'); await p.waitForTimeout(300);
 const a=await p.evaluate(()=>{ const G=__G,S=G.state(),o={}, pick=ok=>S.q.choices.findIndex(c=>!!c.ok===ok);
  S.nextWay=0; G.step(1/60); o.open=!!S.way;
  G.ans(pick(false)); o.slots=document.querySelectorAll('#jm-wayn i').length; G.newQ(); G.ans(pick(true)); G.newQ(); o.openAfter3=!!S.way; G.ans(pick(true)); G.newQ();
  o.answered=S.answered; o.offer=S.offer&&S.offer.slice(0,2); return o; });
 ok(a.open,'Waystone opens'); ok(a.slots===3,'a miss adds the spare slot',a.slots); ok(a.openAfter3,'1 miss + 1 right: still open (spare question)'); ok(a.answered===3&&a.offer&&a.offer[1]===2,'the spare question gives 2 right and the move',a);
 ok(await p.evaluate(()=>{ document.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})); return !!__G.state().offer; }),'card ignores Enter in its first 0.8 s');
 await p.waitForTimeout(900); ok(await p.evaluate(()=>{ document.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})); const S=__G.state(); return !S.offer&&S.mv.wall===1; }),'card closes after 0.8 s, Wall Kick learned');
 const c=await p.evaluate(()=>{ const G=__G,S=G.state(), pick=ok=>S.q.choices.findIndex(c=>!!c.ok===ok); S.nextWay=0; G.step(1/60); G.ans(pick(false)); G.newQ(); G.ans(pick(false)); G.newQ(); const r={closed:!S.way, r:S.offer&&S.offer[1], head:document.getElementById('jmr-offerh').textContent}; G.pick(); return r; });
 ok(c.closed&&c.r===0&&c.head==='Not this time','two misses end the Waystone',c);
 const f=await p.evaluate(()=>{ const G=__G,S=G.state(); S.ways=Math.max(1,S.ways); S.climbT=30; S.fog=G.man().h-600; S.nextWay=0; G.step(1/60); const f0=S.fog; G.ans(S.q.choices.findIndex(c=>c.ok)); return {f0,f1:S.fog}; });
 ok(f.f0-f.f1>=170,'a right answer pushes the fog back',f);
 const z=await p.evaluate(()=>{ const G=__G,S=G.state(), pick=()=>S.q.choices.findIndex(c=>c.ok); G.newQ(); G.ans(pick()); const b0=S.bonus; G.end(); G.step(1/60); G.newQ(); return {over:S.over,b0,b1:S.bonus}; });
 ok(z.over&&z.b1===z.b0,'no Waystone pay after the buzzer',z);
 await p.waitForTimeout(2200); await p.dblclick('#jm-again'); await p.waitForTimeout(200);
 ok(await p.evaluate(()=>!document.getElementById('jm-end').hidden),'a double-click on Play again keeps the end screen');
 ok(!errs.length,'no page errors',errs); console.log(fails?fails+' FAILED':'ALL PASS'); await b.close(); process.exit(fails?1:0); })();
