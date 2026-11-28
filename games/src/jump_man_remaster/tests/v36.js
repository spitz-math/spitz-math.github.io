// Super Jump Man v36: a reload right after a gem keeps the score to the point, and "Press F for full screen" sits in the right
// side panel, off the tower. node v36.js <mult copy>
const {chromium}=require('playwright'); const F=process.argv[2]; let fails=0;
const ok=(c,m,v)=>{ if(!c) fails++; console.log(c?'  ok':'  FAIL',m,v===undefined?'':JSON.stringify(v)); };
(async()=>{ const b=await chromium.launch(); const ctx=await b.newContext({viewport:{width:1366,height:620}}); const errs=[];
 const p=await ctx.newPage(); p.on('pageerror',e=>errs.push(String(e))); await p.goto('file://'+F); await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.waitForFunction(()=>window.__G36);
 await p.fill('#jm-nameinput','Test T'); await p.click('#jm-go'); await p.waitForFunction(()=>__G.state().started); await p.waitForTimeout(1300);
 // 1 the hint: inside the right side panel, clear of the tower canvas
 const h=await p.evaluate(()=>{ const r=e=>{ const q=document.getElementById(e)||document.querySelector(e); const x=q.getBoundingClientRect(); return {l:x.left,r:x.right,t:x.top,b:x.bottom}; }; return {fs:r('sz-fs'),tower:r('jm-canvas'),side:r('jmr-sr'),hidden:document.getElementById('sz-fs').hidden}; });
 ok(!h.hidden&&h.fs.l>=h.tower.r&&h.fs.l>=h.side.l&&h.fs.r<=h.side.r&&h.fs.b<=h.side.b,'the full screen hint sits in the right side panel, off the tower',h);
 // 2 take a gem (put the climber on it), reload within the same second: gems, bonus and ledge come back exactly
 for(let round=0;round<3;round++){
  const before=await p.evaluate(()=>{ const G=__G,S=G.state(),P=G.man(),pl=G.plats(); const g=pl.find(q=>q.gem!==undefined&&!S.got[q.i]&&q.i>S.pi); P.on=g; P.h=g.h; P.x=G.cxAt(g)+g.gem; P.vx=0; P.vy=0; P.lastI=g.i; S.pi=g.i; return {gems:S.gems,bonus:S.bonus}; });
  await p.waitForFunction(n=>__G.state().gems>n,before.gems,{timeout:4000}); await p.waitForTimeout(130);
  const a=await p.evaluate(()=>{ const S=__G.state(); return {gems:S.gems,bonus:S.bonus,pi:S.pi,top:S.top}; });
  await p.reload(); await p.waitForFunction(()=>window.__G36&&__G.state().started); await p.waitForTimeout(300);
  const c=await p.evaluate(()=>{ const S=__G.state(); return {gems:S.gems,bonus:S.bonus,pi:S.pi,top:S.top}; });
  ok(a.gems===before.gems+1&&JSON.stringify(a)===JSON.stringify(c),'reload '+(round+1)+' right after a gem keeps the score',{a,c});
  await p.keyboard.press('ArrowRight'); await p.waitForTimeout(300); }
 ok(errs.length===0,'no page errors',errs.slice(0,3)); console.log(fails?fails+' FAILED':'ALL PASS'); await b.close(); process.exit(fails?1:0); })();
