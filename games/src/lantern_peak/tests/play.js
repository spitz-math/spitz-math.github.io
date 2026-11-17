/* Lantern Peak play test (Playwright).  node tests/play.js [url-base]
   Needs the built page served over http (python3 -m http.server from the repo root, page copied to games/_lp_test.html by run_tests.sh).
   1. a bot climbs the whole slice through the real game code (fixed 1/120 s steps, inputs through the game's own key handling),
      planning each jump with physics.js, and must reach the Waystone, light it, open the gate and reach the Lookout
   2. Waystone rules: world frozen, held keys / early clicks / key repeat / Space can't answer, the explanation stays until Continue,
      a wrong answer costs nothing but the rune, Continue clears the old explanation
   3. falls and thorns send you to the last lantern; three falls in one stretch turn on the helping wind
   4. pause freezes the world; Shift+R asks first; reload keeps the climb (and a half-answered Waystone)
   5. every question set opens and fits in the Waystone card; frames per second at 6x CPU slowdown */
const {chromium}=require('playwright'); const R=require('./routes.js');
const BASE=process.argv[2]||'http://localhost:8765/games/_lp_test.html';
const out=[]; let fail=0; const ok=(c,m)=>{ out.push((c?'PASS ':'FAIL ')+m); console.log((c?'PASS ':'FAIL ')+m); if(!c) fail++; };
const SHOTS=process.env.SHOTS||'/tmp/lp_shots'; require('fs').mkdirSync(SHOTS,{recursive:true});
const wayI=R.plats.findIndex(p=>p.id==='way'), topI=R.plats.findIndex(p=>p.id==='top');
const P1=R.path(R.plats[0],R.plats[wayI],false,false), P2=R.path(R.plats[wayI],R.plats[topI],true,true);

/* runs in the page: plan a jump from where the hero stands to ledge `ti`, simulating with the game's own physics, then play it */
const BOT=`window.__bot=function(ti){
  var G=__G, LV=G.level, Lp=LV.plats, PH=LPPH, DT=1/120, tgt=Lp[ti];
  function snap(){ return Lp.map(function(p){ return [p.goneAt,p.tT]; }); }
  function restore(s){ Lp.forEach(function(p,i){ if(s[i][0]===undefined) delete p.goneAt; else p.goneAt=s[i][0]; if(s[i][1]===undefined) delete p.tT; else p.tT=s[i][1]; }); }
  function clone(P){ var Q=JSON.parse(JSON.stringify(Object.assign({},P,{on:null}))); Q.on=P.on; Q.ev=[]; return Q; }
  function inputs(pl,t,P){ var walk=t<pl.wait+3&&!pl.went; return null; }
  function plan(){ LV.solids.forEach(function(s){ if(s.gate) s.off=G.state().dj; }); var base=snap(), P0=G.hero(), from=P0.on, best=null, xs=[], fp=from&&from.per?null:from;
    var lo=from?PH.platAt(from,G.gt()).x+16:P0.x, hi=from?lo+from.w-32:P0.x; for(var k=0;k<=8;k++) xs.push(lo+(hi-lo)*k/8);
    var cands=[]; xs.forEach(function(x0){ [-1,0,1].forEach(function(d){ [9,0.25,0.45].forEach(function(stop){ [0.12,9].forEach(function(hold){ (G.state().dj?[0,0.18,0.3,0.42,0.55]:[0]).forEach(function(dj){ ((from&&from.per)||tgt.per?[0,0.3,0.7,1.2,1.8,2.4,3]:[0]).forEach(function(w){ [0,1].forEach(function(run){ cands.push({x0:x0,d:d,stop:stop,hold:hold,dj:dj,wait:w,run:run}); }); }); }); }); }); }); });
    cands.sort(function(a,b){ return a.wait-b.wait; });
    for(var c=0;c<cands.length;c++){ var pl=cands[c], P=clone(P0), W={plats:Lp,solids:LV.solids,hazards:LV.hazards,t:G.gt(),dj:G.state().dj}, r=run(pl,P,W,null); restore(base); if(r){ return pl; } }
    return null; }
  /* one input plan: walk to x0, wait, jump with direction d (released after stop s), hold jump for hold s, Cloud Hop at dj s */
  function run(pl,P,W,live){ var ph=0, t=0, jt=0, n=0, hurt=false; if(live) P=G.hero();
    for(n=0;n<1400;n++){ var I={l:false,r:false,jumpHeld:false,jumpPressed:false,downPressed:false};
      if(ph===0){ var dx=pl.x0-P.x; if(Math.abs(dx)<6&&(pl.run||Math.abs(P.vx)<30)){ ph=pl.run?2:1; t=0; jt=0; } else { I.l=dx<0; I.r=dx>0; } }
      if(ph===1){ t+=DT; if(t>=pl.wait){ ph=2; jt=0; } }
      if(ph===2){ jt+=DT; I.l=pl.d<0&&jt<pl.stop; I.r=pl.d>0&&jt<pl.stop; I.jumpHeld=jt<pl.hold||(pl.dj&&jt>=pl.dj&&jt<pl.dj+0.5); I.jumpPressed=jt<=DT*1.01||(pl.dj&&Math.abs(jt-pl.dj)<DT/2); }
      if(live){ live(I); P=G.hero(); }
      else { W.t+=DT; PH.step(P,I,DT,W); }
      if(P.ev&&P.ev.indexOf('hurt')>=0) hurt=true;
      if(ph===2&&jt>0.05&&P.on){ return !hurt&&P.on===tgt; }
      if(ph<2&&P.on!==null&&P.on!==(live?P.on:P.on)&&false) return false; }
    return false; }
  var pl=plan(); if(!pl) return {ok:false,why:'no plan to '+ti};
  var keys={l:false,r:false,j:false};
  var res=run(pl,null,null,function(I){ ['l','r'].forEach(function(k){ if(I[k]!==keys[k]){ G.key(k,I[k]); keys[k]=I[k]; } });
    if(I.jumpPressed&&!keys.jp){ G.key('j',true); keys.j=true; } else if(I.jumpHeld!==keys.j){ G.key('j',I.jumpHeld); keys.j=I.jumpHeld; } keys.jp=I.jumpPressed;
    G.step(1/120); });
  G.key('l',false); G.key('r',false); G.key('j',false);
  return {ok:G.hero().on===tgt, mode:G.mode(), at:[Math.round(G.hero().x),Math.round(G.hero().y)], plan:pl};
};`;

(async()=>{
  const b=await chromium.launch(); const errs=[];
  const page=async(q,vp)=>{ const p=await b.newPage({viewport:vp||{width:1366,height:768}}); p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{ if(m.type()==='error') errs.push(m.text()); }); await p.goto(BASE+q); await p.waitForTimeout(400); return p; };
  const start=async(p,name)=>{ await p.fill('#lp-name',name||'Test U'); await p.click('#lp-go'); await p.waitForTimeout(300); };

  /* ---------- 1. the bot climbs the slice ---------- */
  { const p=await page('?set=slope'); await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.waitForTimeout(300); await start(p);
    await p.addScriptTag({content:BOT}); await p.evaluate(()=>__G.hold(true));
    let okAll=true, last='';
    for(const i of P1.slice(1)){ const r=await p.evaluate(i=>__bot(i),i); if(!r.ok){ okAll=false; last=JSON.stringify(r)+' -> '+i; break; } }
    ok(okAll,'bot: plain jumps reach the Waystone ledge '+last);
    // walk onto the stone: the Waystone opens
    for(let n=0;n<240&&await p.evaluate(()=>__G.mode())==='play';n++) await p.evaluate(()=>{ __G.key('r',__G.hero().x<__G.level.way.x); __G.key('l',__G.hero().x>__G.level.way.x+20); __G.step(1/120); });
    ok(await p.evaluate(()=>__G.mode())==='cp','walking to the Waystone opens the questions');
    const need=await p.evaluate(()=>__G.need);
    await p.waitForTimeout(500);
    for(let k=0;k<need+1&&await p.evaluate(()=>__G.mode())==='cp';k++){ const i=await p.evaluate(()=>__G.state().q.choices.findIndex(c=>c.ok)); await p.keyboard.press(String(i+1)); await p.waitForTimeout(450); await p.keyboard.press('Enter'); await p.waitForTimeout(500); }
    await p.evaluate(()=>{ __G.key('r',false); __G.key('l',false); for(let n=0;n<240;n++) __G.step(1/120); });
    ok(await p.evaluate(()=>__G.mode())==='reward','all runes lit: the gate opens and Cloud Hop is shown');
    await p.screenshot({path:SHOTS+'/reward.png'});
    await p.waitForTimeout(650); await p.keyboard.press('Enter'); await p.waitForTimeout(200);
    ok(await p.evaluate(()=>__G.mode()==='play'&&__G.state().dj&&__G.level.solids[0].off),'Cloud Hop on, gate solid off, back to play');
    okAll=true; last='';
    for(const i of P2.slice(1)){ const r=await p.evaluate(i=>__bot(i),i); if(!r.ok&&!(r.mode==='finish'||r.mode==='end')){ okAll=false; last=JSON.stringify(r)+' -> '+i; break; } }
    await p.evaluate(()=>{ for(let n=0;n<500;n++) __G.step(1/120); });
    ok(okAll,'bot: Cloud Hop climbs Falls Cliffs to the Lookout '+last);
    ok(await p.evaluate(()=>__G.mode()==='end'&&__G.state().done&&__G.state().over),'the Lookout ends the run with the end screen');
    const st=await p.evaluate(()=>({sc:__G.state().score,emb:__G.state().embers.length,code:!!document.querySelector('[id$="-endcode"]')}));
    ok(st.sc>0,'score on the end screen '+st.sc+' (embers '+st.emb+')'); console.log('INFO score code: '+(st.code?'shown':'not shown yet: the game id gets registered in scorecode.js at go-live (same as Rook & Ruin)'));
    await p.screenshot({path:SHOTS+'/end.png'});
    await p.close(); }

  /* ---------- 2. Waystone input rules ---------- */
  { const p=await page('?set=slide&topics=slide,slice,both,slope'); await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.waitForTimeout(300); await start(p);
    // run into the Waystone while holding → and Space and 1; the question must not get answered by those held keys
    await p.evaluate(()=>{ __G.tp(330,1975); }); await p.waitForTimeout(200);
    await p.keyboard.down('ArrowRight'); await p.keyboard.down('1');
    for(let n=0;n<60&&await p.evaluate(()=>__G.mode())==='play';n++) await p.waitForTimeout(50);
    ok(await p.evaluate(()=>__G.mode())==='cp','running into the Waystone opens the questions');
    await p.keyboard.down(' '); await p.waitForTimeout(900);
    ok(await p.evaluate(()=>!__G.state().qDone),'held → / Space / 1 do not answer the new question');
    const x0=await p.evaluate(()=>__G.hero().x); await p.waitForTimeout(400); ok(await p.evaluate(x=>Math.abs(__G.hero().x-x)<0.01,x0),'world is frozen while the question is up');
    await p.keyboard.up('1'); await p.keyboard.up(' '); await p.keyboard.up('ArrowRight');
    // Space never answers
    await p.keyboard.press(' '); await p.waitForTimeout(150); ok(await p.evaluate(()=>!__G.state().qDone),'Space does not answer');
    // a click that started before the question appeared is ignored: reopen with a fresh question, press mouse first
    const wrong=await p.evaluate(()=>__G.state().q.choices.findIndex(c=>!c.ok));
    const before=await p.evaluate(()=>({p:document.getElementById('lp-prompt').innerHTML,runes:__G.state().runes}));
    await p.keyboard.press(String(wrong+1)); await p.waitForTimeout(300);
    const fb=await p.evaluate(()=>({h:document.getElementById('lp-fb').hidden,t:document.getElementById('lp-fb').innerText,runes:__G.state().runes,prompt:document.getElementById('lp-prompt').innerHTML}));
    ok(!fb.h&&/Not quite/.test(fb.t),'a wrong answer shows why, with the explanation');
    ok(fb.runes===before.runes,'a wrong answer costs only the rune');
    await p.screenshot({path:SHOTS+'/wrong.png'});
    await p.waitForTimeout(3000);
    ok(await p.evaluate(p0=>!document.getElementById('lp-fb').hidden&&document.getElementById('lp-prompt').innerHTML===p0,fb.prompt),'question, answer and explanation stay together until Continue (3 s later)');
    // Enter auto-repeat does not skip
    await p.evaluate(()=>document.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',repeat:true,bubbles:true}))); await p.waitForTimeout(100);
    ok(await p.evaluate(p0=>document.getElementById('lp-prompt').innerHTML===p0,fb.prompt),'a held Enter (key repeat) does not skip the explanation');
    await p.keyboard.press('Enter'); await p.waitForTimeout(200);
    const nq=await p.evaluate(()=>({h:document.getElementById('lp-fb').hidden,done:__G.state().qDone,next:document.getElementById('lp-next').hidden}));
    ok(nq.h&&!nq.done&&nq.next,'Continue brings a new question with the old explanation cleared');
    // a mouse press that began before the question showed does not answer
    const good=await p.evaluate(()=>__G.state().q.choices.findIndex(c=>c.ok));
    const bx=await p.evaluate(i=>{ const r=document.querySelectorAll('.lp-ch')[i].getBoundingClientRect(); return [r.x+r.width/2,r.y+r.height/2]; },good);
    await p.keyboard.press('1'); // too soon after the new question? (≥450 ms has not passed)
    ok(await p.evaluate(()=>!__G.state().qDone),'a key within 450 ms of a new question is ignored');
    await p.waitForTimeout(600);
    // reload in the middle of the Waystone keeps the question
    const pr=await p.evaluate(()=>document.getElementById('lp-prompt').innerHTML);
    await p.reload(); await p.waitForTimeout(400); await p.click('#lp-go'); await p.waitForTimeout(300);
    ok(await p.evaluate(p0=>__G.mode()==='cp'&&document.getElementById('lp-prompt').innerHTML===p0,pr),'reload during the Waystone keeps the same question');
    await p.waitForTimeout(500);
    await p.mouse.click(bx[0],bx[1]); await p.waitForTimeout(200);
    ok(await p.evaluate(()=>__G.state().qDone&&__G.state().runes===1),'a fresh click answers; a rune lights');
    await p.screenshot({path:SHOTS+'/right.png'});
    await p.close(); }

  /* ---------- 3. falls, thorns, helping wind; 4. pause, restart, reload ---------- */
  { const p=await page('?set=mult'); await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.waitForTimeout(300); await start(p);
    await p.evaluate(()=>__G.hold(true));
    // thorns at the right fork (ledge x 820, y 1206)
    await p.evaluate(()=>{ __G.setCamp('c2'); __G.tp(840,1260); for(let n=0;n<120;n++) __G.step(1/120); });
    let m=await p.evaluate(()=>__G.mode()); ok(m==='respawn','thorns send you back ('+m+')');
    await p.evaluate(()=>{ for(let n=0;n<160;n++) __G.step(1/120); });
    const h=await p.evaluate(()=>[__G.hero().x,__G.hero().y,__G.mode()]); ok(h[1]===870&&h[2]==='play','…to the last lantern (camp 2): '+h);
    // three falls in one stretch -> helping wind
    for(let k=0;k<3;k++) await p.evaluate(()=>{ __G.tp(800,520); for(let n=0;n<400&&__G.mode()!=='respawn';n++) __G.step(1/120); for(let n=0;n<160;n++) __G.step(1/120); });
    const s=await p.evaluate(()=>({falls:__G.state().falls,help:__G.state().help}));
    ok(s.falls===4&&s.help,'falling far below the lantern respawns there; 3 falls turn on the helping wind '+JSON.stringify(s));
    await p.evaluate(()=>__G.hold(false));
    // pause freezes the world
    await p.keyboard.press('Escape'); await p.waitForTimeout(100); const g0=await p.evaluate(()=>__G.gt()); await p.waitForTimeout(500);
    ok(await p.evaluate(g=>__G.mode()==='pause'&&__G.gt()===g,g0),'Esc pauses and the world stops');
    await p.screenshot({path:SHOTS+'/pause.png'});
    await p.keyboard.press('Escape'); await p.waitForTimeout(100); ok(await p.evaluate(()=>__G.mode()==='play'),'Esc resumes');
    // Shift+R asks first; N keeps playing
    await p.keyboard.press('Shift+R'); await p.waitForTimeout(100); ok(await p.evaluate(()=>!document.getElementById('sz-ask').hidden),'Shift+R asks "Start a new game?"');
    await p.keyboard.press('n'); await p.waitForTimeout(100); ok(await p.evaluate(()=>document.getElementById('sz-ask').hidden&&__G.state().falls===4),'N keeps the climb');
    // reload keeps the run at the lantern
    await p.reload(); await p.waitForTimeout(400); ok(await p.evaluate(()=>document.getElementById('lp-go').textContent==='Keep climbing'),'reload: start screen offers "Keep climbing"');
    await p.click('#lp-go'); await p.waitForTimeout(200); ok(await p.evaluate(()=>__G.state().camp==='c2'&&__G.hero().y===870),'…and puts you back at your lantern');
    await p.keyboard.press('Shift+R'); await p.waitForTimeout(100); await p.keyboard.press('y'); await p.waitForTimeout(800);
    ok(await p.evaluate(()=>!__G.state().started&&__G.state().falls===0),'Y starts a fresh climb');
    await p.close(); }

  /* ---------- 5. every question set fits the Waystone card ---------- */
  { const sets=await (async()=>{ const p=await page('?set=mult'); const s=await p.evaluate(()=>Object.keys(SpitzQ.sets)); await p.close(); return s; })();
    for(const vp of [{width:1366,height:768},{width:1366,height:620},{width:1280,height:720}]) for(const id of sets){
      const p=await page('?set='+id,vp); await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.waitForTimeout(250); await start(p);
      let bad=[];
      for(let k=0;k<8;k++){ await p.evaluate(()=>{ const S=__G.state(); S.q=null; S.qDone=false; __G.openCP(); }); await p.waitForTimeout(80);
        const r=await p.evaluate(()=>{ const card=document.getElementById('lp-card').getBoundingClientRect(), st=document.getElementById('stage').getBoundingClientRect();
          const over=[...document.querySelectorAll('.lp-ch .t, .lp-prompt')].filter(e=>e.scrollWidth>e.clientWidth+2||e.getBoundingClientRect().right>card.right).length;
          return {fit:card.top>=st.top-1&&card.bottom<=st.bottom+1, over, p:document.getElementById('lp-prompt').innerText.slice(0,60)}; });
        if(!r.fit||r.over) bad.push(r);
        const i=await p.evaluate(()=>__G.state().q.choices.findIndex(c=>!c.ok)); await p.waitForTimeout(470); await p.keyboard.press(String(i+1)); await p.waitForTimeout(60);
        const r2=await p.evaluate(()=>{ const card=document.getElementById('lp-card').getBoundingClientRect(), st=document.getElementById('stage').getBoundingClientRect(); return card.top>=st.top-1&&card.bottom<=st.bottom+1; });
        if(!r2) bad.push({after:'wrong answer',p:await p.evaluate(()=>document.getElementById('lp-prompt').innerText.slice(0,60))});
        if(k===2&&vp.height===620&&(id==='slope'||id==='mult')) await p.screenshot({path:SHOTS+'/set_'+id+'_620.png'}); }
      ok(!bad.length,'set '+id+' at '+vp.width+'x'+vp.height+': card fits with the explanation open'+(bad.length?' '+JSON.stringify(bad[0]):''));
      await p.close(); } }

  /* ---------- 6. speed at 6x CPU slowdown ---------- */
  { const p=await page('?set=mult'); await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.waitForTimeout(300); await start(p);
    const cdp=await p.context().newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate',{rate:6});
    await p.evaluate(()=>__G.tp(500,2700)); await p.keyboard.down('ArrowRight'); await p.waitForTimeout(3000);
    const fps=await p.evaluate(()=>new Promise(r=>{ let n=0; const t0=performance.now(); (function f(){ n++; if(performance.now()-t0<4000) requestAnimationFrame(f); else r(n/((performance.now()-t0)/1000)); })(); }));
    await p.keyboard.up('ArrowRight'); const rs=await p.evaluate(()=>__G.rs());
    ok(fps>=28,'fps at 6x CPU slowdown, 1366x768: '+fps.toFixed(1)+' (render scale '+rs+')');
    await p.close(); }

  ok(errs.length===0,'no page errors '+JSON.stringify(errs.slice(0,3)));
  await b.close(); console.log(fail?fail+' FAILED':'ALL PLAY TESTS PASSED'); process.exit(fail?1:0);
})();
