// Super Jump Man v34: Waystones every 30 ledges, one heart at most per 8 s (rock or fog), fog waits 5 s after a hit and trails
// farther back for a hurt player, small quiet Yes on the restart box. node v34.js <mult copy>
const {chromium}=require('playwright'); const F=process.argv[2]; let fails=0;
const ok=(c,m,v)=>{ if(!c) fails++; console.log(c?'  ok':'  FAIL',m,v===undefined?'':JSON.stringify(v)); };
(async()=>{ const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1366,height:620}}); const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
 await p.addInitScript(()=>{ window.requestAnimationFrame=()=>0; });
 await p.goto('file://'+F); await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.waitForFunction(()=>window.__G);
 await p.fill('#jm-nameinput','Test T'); await p.click('#jm-go'); await p.waitForTimeout(200);
 const r=await p.evaluate(()=>{ const G=__G,S=G.state(),P=G.man(),out={}; const step=n=>{ for(let i=0;i<n;i++) G.step(1/60); };
   out.way0=S.nextWay; S.nextWay=1e9; S.climbT=30; step(30);
   const rock=()=>{ G.rocks().length=0; G.rocks().push({x:P.x,h:P.h+40,warn:0}); G.step(1/60); G.rocks().length=0; };
   const land=()=>{ const q=G.plats()[5]; P.on=q; P.h=q.h; P.x=G.cxAt(q); P.vx=0; P.vy=0; P.lastI=5; S.pi=5; S.fog=P.h-900; };
   land(); S.hearts=3; rock(); out.afterRock=S.hearts;
   land(); step(300); land(); rock(); out.rockAt5s=S.hearts;                       // 5 s later: old 4 s guard would take a heart
   land(); const gap0=P.h-S.fog; S.fog=P.h+400; G.step(1/60); out.fogAt5s=S.hearts; out.calm=Math.round(S.calm);   // a fog dip inside the 8 s only lifts
   land(); step(60*9); land(); S.fog=P.h+400; G.step(1/60); out.fogAt14s=S.hearts;   // after the 8 s it costs a heart again
   return out; });
 ok(r.way0===10,'first Waystone at ledge 10',r.way0);
 ok(r.afterRock===2,'a rock costs a heart',r);
 ok(r.rockAt5s===2,'a second rock 5 s later costs nothing (8 s guard)',r);
 ok(r.fogAt5s===2&&r.calm>=4,'a fog dip inside the 8 s only lifts you, and the fog then waits 5 s',r);
 ok(r.fogAt14s===1,'after the 8 s a fog hit costs a heart again',r);
 const w=await p.evaluate(()=>{ const G=__G,S=G.state(),P=G.man(); S.nextWay=10; const q=G.plats()[10]; P.on=null; P.x=q.floor?300:G.cxAt(q); P.h=q.h+30; P.vy=-10; P.vx=0; P.lastI=9; for(let k=0;k<20;k++) G.step(1/60);
   if(!S.way) return {way:false}; for(let n=0;n<3&&S.way;n++){ if(S.qDone){ G.newQ(); } G.ans(S.q.choices.findIndex(c=>c.ok)); for(let k=0;k<200&&S.way&&!S.qDone;k++) G.step(1/60); if(S.way&&S.qDone) G.newQ(); } return {way:!!S.way,next:S.nextWay,ways:S.ways}; });
 ok(w.next===40,'the next Waystone is 30 ledges up (ledge 40)',w);
 await p.keyboard.press('Shift+R'); await p.waitForTimeout(300);
 const bx=await p.evaluate(()=>['sz-askyes','sz-askno'].map(i=>{ const e=document.getElementById(i).getBoundingClientRect(); return Math.round(e.width*e.height); }));
 ok(bx[0]>0&&bx[0]*3<bx[1],'restart box: Yes is under a third the size of No',bx);
 ok(errs.length===0,'no page errors',errs.slice(0,3)); console.log(fails?fails+' FAILED':'ALL PASS'); await b.close(); process.exit(fails?1:0); })();
