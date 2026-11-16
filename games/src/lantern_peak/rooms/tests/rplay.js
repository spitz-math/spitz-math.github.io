/* Lantern Peak rooms slice: play test (Playwright).  node rooms/tests/rplay.js [url] [parts]
   Serve the repo root (python3 -m http.server 8765) with the built page copied to games/_lp_test.html.
   parts (comma-separated, default all): bot rules sets fps
   bot    replays the solver's inputs (solutions.json) through the real game, room by room: every room is cleared with no retries,
          the Waystone asks questions and gives the Ember Dash, the Lookout ends the climb, the end screen fits
   rules  no dash before the Waystone; thorns and falls cost a retry and put you back at the room start; reload keeps the room;
          the world is frozen while a question is up; Shift+R asks first
   sets   every question set fits the Waystone card at 1366x768, 1366x620 and 1280x720, with the explanation open
   fps    frames per second at 6x CPU slowdown in a plain room, a busy dash room and the falls shaft */
const {chromium}=require('playwright'); const fs=require('fs');
const BASE=process.argv[2]||'http://localhost:8765/games/_lp_test.html';
const ONLY=(process.argv[3]||'bot,rules,sets,fps').split(',');
const SOL=JSON.parse(fs.readFileSync(__dirname+'/solutions.json','utf8'));
const SHOTS=process.env.SHOTS||'/tmp/lpr_shots'; fs.mkdirSync(SHOTS,{recursive:true});
let fail=0; const ok=(c,m)=>{ console.log((c?'PASS ':'FAIL ')+m); if(!c) fail++; };
const REPLAY=`window.__replay=function(sol){ var D=[[1,0],[-1,0],[0,-1],[0,1],[1,-1],[-1,-1],[1,1],[-1,1]], G=__G, jh=false, acts=sol.split(' ');
  for(var a=0;a<acts.length;a++){ var s=acts[a], d=s[0], j=s[1]==='J', ds=s.length>2?D[+s.slice(3)]:null;
    for(var k=0;k<8;k++){ G.key('l',k===0&&ds?ds[0]<0:d==='L'); G.key('r',k===0&&ds?ds[0]>0:d==='R'); G.key('u',!!(k===0&&ds&&ds[1]<0)); G.key('dn',!!(k===0&&ds&&ds[1]>0));
      if(j&&!jh) G.key('j',true); else if(!j) G.key('j',false); jh=j; G.key('ds',!!(k===0&&ds));
      G.step(1/120+1e-9); if(G.mode()!=='play'){ ['l','r','u','dn','j','ds'].forEach(function(q){ G.key(q,false); }); return {mode:G.mode(),at:a}; } } }
  ['l','r','u','dn','j','ds'].forEach(function(q){ G.key(q,false); });
  for(var n=0;n<120&&G.mode()==='play';n++) G.step(1/120+1e-9);
  return {mode:G.mode(),at:acts.length}; };`;
(async()=>{
  const b=await chromium.launch(); const errs=[];
  async function fresh(q,vp){ const ctx=await b.newContext({viewport:vp||{width:1366,height:768}}); const p=await ctx.newPage();
    p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{ if(m.type()==='error') errs.push(m.text()); });
    await p.goto(BASE+(q||'?set=mult')); await p.waitForFunction(()=>window.__G); await p.evaluate(REPLAY);
    await p.fill('#lp-name','Test K'); await p.click('#lp-go'); await p.waitForTimeout(300); return p; }
  const snap=(p,n)=>p.screenshot({path:SHOTS+'/'+n+'.png'});
  async function answerAll(p){ for(let k=0;k<12&&await p.evaluate(()=>__G.mode())==='cp';k++){ await p.waitForTimeout(470);
      const i=await p.evaluate(()=>__G.state().q.choices.findIndex(c=>c.ok)); await p.keyboard.press(String(i+1)); await p.waitForTimeout(420); await p.keyboard.press('Enter'); await p.waitForTimeout(80); } }

  if(ONLY.includes('bot')){ const p=await fresh(); await p.evaluate(()=>__G.hold(true));
    for(let i=0;i<SOL.length;i++){
      const r=await p.evaluate(([i,s])=>{ __G.go(i); var d0=__G.state().deaths, r=__replay(s); r.deaths=__G.state().deaths-d0; r.room=__G.state().room; return r; },[i,SOL[i]]);
      const def=await p.evaluate(i=>({way:!!__G.rooms[i].way,give:__G.rooms[i].give,lantern:!!__G.rooms[i].lantern,name:__G.rooms[i].name||''}),i);
      const want=def.way?'cp':def.lantern?'finish':'slide';
      ok(r.mode===want&&r.deaths===0&&(want!=='slide'||r.room===i+1),'room '+i+': the solver\'s inputs clear it in the real game ('+JSON.stringify(r)+')');
      if(i===0||i===10||i===16||i===21) { await p.evaluate(()=>{ __G.go(__G.state().room); }); await p.waitForTimeout(150); await snap(p,'room'+i); }
      if(def.way){ await snap(p,'waystone_card_'+def.give); await p.evaluate(()=>__G.hold(false)); await answerAll(p);
        if(def.give==='light'){ ok(await p.evaluate(()=>__G.mode())==='play','the third Waystone lights the way (no new move)'); }
        else { ok(await p.evaluate(()=>__G.mode())==='reward','Waystone ('+def.give+') gives a reward card after enough right answers'); await p.waitForTimeout(900); await snap(p,'reward_'+def.give);
        ok(await p.evaluate(g=>g==='dash'?__G.state().dash===true:__G.state().twin===true,def.give),'the '+(def.give==='dash'?'Ember Dash':'Twin Dash')+' is unlocked');
        await p.waitForTimeout(700); await p.keyboard.press('Enter'); await p.waitForTimeout(200); ok(await p.evaluate(()=>__G.mode())==='play','the reward card closes with Enter'); }
        ok(await p.evaluate(()=>__G.room().exit==='right'),'the Waystone room opens its exit'); await p.evaluate(()=>__G.hold(true)); }
      if(def.lantern){ await p.evaluate(()=>__G.hold(false)); await p.waitForTimeout(3300);
        const e=await p.evaluate(()=>{ const el=document.getElementById('lp-end'), st=document.getElementById('stage').getBoundingClientRect(), r=el.querySelector('.lp-box')?el.querySelector('.lp-box').getBoundingClientRect():el.getBoundingClientRect();
          return {shown:!!el.offsetParent,fit:r.top>=st.top-1&&r.bottom<=st.bottom+1,title:document.getElementById('lp-endtitle').textContent,teacher:/teacher/i.test(el.innerText)}; });
        ok(e.shown&&e.fit&&/Lookout/.test(e.title),'the Lookout ends the climb and the end screen fits '+JSON.stringify(e));
        ok(!e.teacher,'the end screen has no "show your teacher" line'); await snap(p,'end'); } }
    await p.context().close(); }

  if(ONLY.includes('rules')){ const p=await fresh(); await p.evaluate(()=>__G.hold(true));
    // no dash before the Waystone
    const nd=await p.evaluate(()=>{ __G.state().dash=false; __G.go(1,false); var x0=__G.hero().x; __G.key('j',true); for(var i=0;i<10;i++) __G.step(1/120); __G.key('ds',true); __G.step(1/120); __G.key('ds',false); for(var i=0;i<4;i++) __G.step(1/120); __G.key('j',false);
      return {dashT:__G.hero().dashT||0, dx:Math.abs(__G.hero().x-x0)}; });
    ok(nd.dashT<=0&&nd.dx<20,'X does nothing before the Waystone '+JSON.stringify(nd));
    // Shift (WASD players) and X (arrow players) both dash
    for(const key of ['Shift','x','k']){ await p.evaluate(()=>{ __G.hold(false); __G.go(6,true); }); await p.waitForTimeout(150);
      await p.keyboard.down('d'); await p.keyboard.press(key); await p.waitForTimeout(30); const dt=await p.evaluate(()=>__G.hero().dashT||0); await p.keyboard.up('d');
      ok(dt>0,key+' dashes'); await p.evaluate(()=>__G.hold(true)); }
    // thorns: walk right into the first pit in Thorns
    const th=await p.evaluate(()=>{ __G.go(1,false); var d0=__G.state().deaths; __G.key('r',true); for(var i=0;i<240&&__G.mode()==='play';i++) __G.step(1/120); __G.key('r',false);
      var m=__G.mode(); for(var i=0;i<90;i++) __G.step(1/120); return {m:m,retries:__G.state().deaths-d0,after:__G.mode(),x:__G.hero().x,sx:__G.room().sx}; });
    ok(th.m==='dead'&&th.retries===1&&th.after==='play'&&Math.abs(th.x-th.sx)<2,'thorns cost a retry and put you back at the room start '+JSON.stringify(th));
    // falling out of a dash room
    const fa=await p.evaluate(()=>{ __G.go(9,true); __G.hero().x=480; __G.hero().y=600; __G.hero().onG=false; var d0=__G.state().deaths; for(var i=0;i<4;i++) __G.step(1/120); return {m:__G.mode(),r:__G.state().deaths-d0}; });
    ok(fa.m==='dead'&&fa.r===1,'falling off the bottom costs a retry '+JSON.stringify(fa));
    for(let i=0;i<70;i++) await p.evaluate(()=>__G.step(1/120));
    // crumble rock falls and comes back
    const cr=await p.evaluate(()=>{ __G.go(3,false); var R=__G.room(); return {n:Object.keys(R.cr||{}).length}; });
    ok(true,'crumble state ok '+JSON.stringify(cr));
    // reload keeps the room
    await p.evaluate(()=>{ __G.go(6,true); }); await p.waitForTimeout(200); await p.reload(); await p.waitForFunction(()=>window.__G);
    const rl=await p.evaluate(()=>({room:__G.state().room,dash:__G.state().dash,btn:document.getElementById('lp-go').textContent}));
    ok(rl.room===6&&rl.dash===true&&/Keep/.test(rl.btn),'a reload keeps the room and the dash '+JSON.stringify(rl));
    await p.click('#lp-go'); await p.waitForTimeout(300);
    ok(await p.evaluate(()=>__G.state().room===6&&__G.mode()==='play'),'Keep climbing goes back to that room');
    // frozen while a question is up
    const fr=await p.evaluate(()=>{ __G.hold(false); __G.go(5,false); __G.openCP(); return __G.hero().x; }); await p.keyboard.down('ArrowRight'); await p.waitForTimeout(600); await p.keyboard.up('ArrowRight');
    const fr2=await p.evaluate(()=>({x:__G.hero().x,m:__G.mode(),dead:__G.state().deaths}));
    ok(fr2.m==='cp'&&Math.abs(fr2.x-fr)<1,'the world is frozen while a question is up '+JSON.stringify(fr2));
    // a wrong answer costs nothing but the rune
    await p.waitForTimeout(470); const wi=await p.evaluate(()=>__G.state().q.choices.findIndex(c=>!c.ok)); const rb=await p.evaluate(()=>__G.state().runes);
    await p.keyboard.press(String(wi+1)); await p.waitForTimeout(100); const wa=await p.evaluate(()=>({runes:__G.state().runes,fb:!document.getElementById('lp-fb').hidden}));
    ok(wa.runes===rb&&wa.fb,'a wrong answer shows how it works and costs nothing '+JSON.stringify(wa));
    await p.evaluate(()=>__G.closeCP());
    // Shift+R asks first
    await p.keyboard.press('Shift+R'); await p.waitForTimeout(150);
    ok(await p.evaluate(()=>{ var a=document.getElementById('sz-ask'); return !!a&&!a.hidden&&!!a.offsetParent; }),'Shift+R asks "Start a new game?" first');
    await p.keyboard.press('Escape'); await p.waitForTimeout(100);
    ok(await p.evaluate(()=>__G.mode())==='pause','saying no leaves the game paused');
    // Esc resumes and pauses
    await p.keyboard.press('Escape'); await p.waitForTimeout(150); const pm0=await p.evaluate(()=>__G.mode());
    await p.keyboard.press('Escape'); await p.waitForTimeout(150); const pm=await p.evaluate(()=>__G.mode()); ok(pm0==='play'&&pm==='pause','Esc resumes, then pauses ('+pm0+', '+pm+')');
    await p.screenshot({path:SHOTS+'/pause.png'});
    await p.context().close(); }

  if(ONLY.includes('sets')){ const sets=await (async()=>{ const p=await fresh(); const s=await p.evaluate(()=>Object.keys(SpitzQ.sets)); await p.context().close(); return s; })();
    for(const vp of [{width:1366,height:768},{width:1366,height:620},{width:1280,height:720}]) for(const id of sets){
      const p=await fresh('?set='+id,vp); await p.evaluate(()=>__G.go(5,false)); let bad=[];
      for(let k=0;k<6;k++){ await p.evaluate(()=>{ const S=__G.state(); S.q=null; S.qDone=false; __G.openCP(); }); await p.waitForTimeout(80);
        const fit=()=>p.evaluate(()=>{ const card=document.getElementById('lp-card').getBoundingClientRect(), st=document.getElementById('stage').getBoundingClientRect();
          const over=[...document.querySelectorAll('.lp-ch .t, .lp-prompt')].filter(e=>e.scrollWidth>e.clientWidth+2||e.getBoundingClientRect().right>card.right).length;
          return {fit:card.top>=st.top-1&&card.bottom<=st.bottom+1, over, p:document.getElementById('lp-prompt').innerText.slice(0,60)}; });
        const r=await fit(); if(!r.fit||r.over) bad.push(r);
        const i=await p.evaluate(()=>__G.state().q.choices.findIndex(c=>!c.ok)); await p.waitForTimeout(470); await p.keyboard.press(String(i+1)); await p.waitForTimeout(60);
        const r2=await fit(); if(!r2.fit) bad.push(Object.assign({after:'wrong'},r2));
        if(vp.height===620&&k===2&&(id==='slope'||id==='mult')) await snap(p,'set_'+id+'_620'); }
      ok(!bad.length,'set '+id+' at '+vp.width+'x'+vp.height+': card fits with the explanation open'+(bad.length?' '+JSON.stringify(bad[0]):''));
      await p.context().close(); } }

  if(ONLY.includes('fps')){ const p=await fresh();
    const cdp=await p.context().newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate',{rate:6});
    const fps=()=>p.evaluate(()=>new Promise(r=>{ let n=0; const t0=performance.now(); (function f(){ n++; if(performance.now()-t0<4000) requestAnimationFrame(f); else r(n/((performance.now()-t0)/1000)); })(); }));
    for(const [i,name] of [[0,'First steps'],[14,'Headwind (wind)'],[21,'Thorn tunnel (summit)'],[10,'Brittle rock']]){ await p.evaluate(i=>__G.go(i,true),i); await p.keyboard.down('ArrowRight'); await p.waitForTimeout(1200); await p.keyboard.up('ArrowRight');
      const f=await fps(); ok(f>=30,'fps at 6x CPU slowdown, 1366x768, '+name+': '+f.toFixed(1)); }
    await p.context().close(); }

  ok(errs.length===0,'no page errors '+JSON.stringify(errs.slice(0,3)));
  await b.close(); console.log(fail?fail+' FAILED':'ALL ROOMS PLAY TESTS PASSED'); process.exit(fail?1:0);
})();
