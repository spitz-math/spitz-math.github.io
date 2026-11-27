/* Lantern Peak play test (Playwright).  node tests/play.js [url] [only]
   Needs the built page served over http (python3 -m http.server from the repo root, page copied to games/_lp_test.html by run_tests.sh).
   `only` runs some parts: any of  bot rules falls moves boss end sets fps  (comma-separated; default all).
   bot    a bot climbs the whole game through the real game code (fixed 1/120 s steps, inputs through the game's own key handling),
          planning each jump with physics.js: three Waystones, three moves, the tower's three fires, the beacon, the end screen
   rules  Waystone rules: world frozen, held keys / early clicks / key repeat / Space can't answer, the explanation stays until Continue,
          a wrong answer costs nothing but the rune, Continue clears the old explanation
   falls  the rising fog catches you (a heart), thorns knock you back (a heart), out of hearts goes back to the start of the stretch; pause, Shift+R, reload
   moves  Scarf Glide, rising wind, Ember Dash and ice walls; the reward cards; melted ice and moves survive a reload
   boss   the Gloom: warnings before ice, ice breaks on ledges, a hit costs a heart, gusts from the start, frozen while a question is up
   end    stopping early from the pause menu; the end screen fits
   sets   every question set fits in the Waystone card (and the tower's fire card)
   fps    frames per second at 6x CPU slowdown in each zone and in the boss fight */
const {chromium}=require('playwright'); const R=require('./routes.js');
const BASE=process.argv[2]||'http://localhost:8765/games/_lp_test.html';
const ONLY=(process.argv[3]||'bot,rules,falls,moves,boss,end,sets,fps').split(',');
let fail=0; const ok=(c,m)=>{ console.log((c?'PASS ':'FAIL ')+m); if(!c) fail++; };
const SHOTS=process.env.SHOTS||'/tmp/lp_shots'; require('fs').mkdirSync(SHOTS,{recursive:true});
const LV=R.LV, ST=LV.st;
/* the route for each stage, with the inputs the route checker found for each jump (the bot tries those first) */
const ROUTE=ST.map((s,k)=>{ const p=R.route(k); return p.slice(1).map((b,i)=>{ const o=R.edges(R.plats[p[i]],k,R.mv(k)).get(R.plats[b]), fp=globalThis.LPPH.platAt(R.plats[p[i]],o.tOff);
  return {to:b,hint:{rel:o.x0-fp.x,run:o.vx0?1:0,d:o.d,stop:o.stop,d2:o.d2||0,t2:o.t2||0,d3:o.d3||0,hold:o.hold||0,djT:o.djT||0,gl:o.gl||0,dsT:o.dsT===undefined?-1:o.dsT,walk:!!o.walk}}; }); });

/* runs in the page: plan a jump from where the hero stands to ledge `ti`, simulating with the game's own physics, then play it */
const BOT=`window.__bot=function(ti,hint){
  var G=__G, LV=G.level, Lp=LV.plats, PH=LPPH, DT=1/120, tgt=Lp[ti], Sx=LV.solids;
  function snap(){ return [Lp.map(function(p){ return [p.goneAt,p.tT]; }),Sx.map(function(s){ return [s.off,s.broken]; })]; }
  function restore(s){ Lp.forEach(function(p,i){ if(s[0][i][0]===undefined) delete p.goneAt; else p.goneAt=s[0][i][0]; if(s[0][i][1]===undefined) delete p.tT; else p.tT=s[0][i][1]; });
    Sx.forEach(function(q,i){ q.off=s[1][i][0]; if(s[1][i][1]===undefined) delete q.broken; else q.broken=s[1][i][1]; }); }
  function clone(P){ var Q=JSON.parse(JSON.stringify(Object.assign({},P,{on:null,shat:null}))); Q.on=P.on; Q.ev=[]; return Q; }
  /* one input plan: walk to the spot (rel = px from the ledge's left edge), wait, then jump with direction d (released after stop s;
     then d2, or d3 from t2 on), hold jump for hold s, Cloud Hop at djT s and keep holding for gl s (a glide), dash at dsT s.
     walk = no jump: just walk (or dash) off this ledge onto the next */
  function run(pl,P,W,live){ var ph=0, t=0, jt=0, n=0, hurt=false, from=(live?G.hero():P).on; if(live) P=G.hero();
    for(n=0;n<1700;n++){ var I={l:false,r:false,jumpHeld:false,jumpPressed:false,downPressed:false,dashPressed:false}, now=live?G.gt():W.t;
      if(ph===0){ var tx=from?PH.platAt(from,now).x+pl.rel:P.x, dx=tx-P.x; if(Math.abs(dx)<6&&(pl.run||Math.abs(P.vx)<30)){ ph=pl.run?2:1; t=0; jt=0; } else { I.l=dx<0; I.r=dx>0; } }
      if(ph===1){ t+=DT; if(t>=pl.wait){ ph=2; jt=0; } }
      if(ph===2){ jt+=DT; var dir=jt<pl.stop?pl.d:(pl.t2&&jt>=pl.t2?pl.d3:pl.d2); I.l=dir<0; I.r=dir>0;
        I.jumpHeld=!pl.walk&&(jt<pl.hold||(pl.djT>0&&jt>=pl.djT&&jt<pl.djT+(pl.gl||0.5))); I.jumpPressed=!pl.walk&&(jt<=DT*1.01||(pl.djT>0&&Math.abs(jt-pl.djT)<DT/2));
        I.dashPressed=pl.dsT>=0&&Math.abs(jt-Math.max(DT,pl.dsT))<DT/2; }
      if(live){ live(I); P=G.hero(); if(G.mode()!=='play') return false; }
      else { W.t+=DT; PH.step(P,I,DT,W); }
      if(P.ev&&P.ev.indexOf('hurt')>=0) hurt=true;
      if(ph===2){ if(pl.walk){ if(P.on&&P.on!==from) return !hurt&&P.on===tgt; if(jt>1.2) return false; } else if(jt>0.05&&P.on) return !hurt&&P.on===tgt; }
      if(P.y<(from?from.y:0)-700) return false; }
    return false; }
  function plan(){ var st=G.state(); LV.solids.forEach(function(s){ if(s.gate!==undefined) s.off=st.st>s.gate; else if(s.ice) s.off=st.ice.indexOf(s.id)>=0; });
    var base=snap(), P0=G.hero(), from=P0.on, cands=[], w=from?from.w:0, rels=[]; for(var k=0;k<=6;k++) rels.push(15+(w-30)*k/6);
    var waits=((from&&from.per)||tgt.per)?[0,0.3,0.7,1.2,1.8,2.4,3,3.6]:[0], B={rel:0,run:0,d:0,stop:9,d2:0,t2:0,d3:0,hold:9,djT:0,gl:0,dsT:-1,walk:false,wait:0};
    function add(o){ waits.forEach(function(wt){ cands.push(Object.assign({},B,o,{wait:wt})); }); }
    if(hint){ add(hint); [-20,20,-40,40].forEach(function(dx){ add(Object.assign({},hint,{rel:hint.rel+dx})); }); }
    rels.forEach(function(rel){ [-1,0,1].forEach(function(d){ [0,1].forEach(function(rn){ if(!d&&rn) return; [9,0.25,0.45].forEach(function(stop){ if(!d&&stop<9) return;
      [0.12,9].forEach(function(hold){ add({rel:rel,d:d,run:rn,stop:stop,hold:hold}); });
      if(st.dj) [0.18,0.3,0.42,0.55].forEach(function(dj){ add({rel:rel,d:d,run:rn,stop:stop,djT:dj}); }); }); }); });
      [-1,1].forEach(function(d){ add({rel:rel,d:d,walk:true}); if(st.ds) add({rel:rel,d:d,walk:true,dsT:0}); }); });
    if(st.gl) [rels[0],rels[3],rels[6]].forEach(function(rel){ [0.18,0.36,0.55].forEach(function(dj){
      [1.4,2.6,9].forEach(function(gl){ add({rel:rel,djT:dj,gl:gl}); [-1,1].forEach(function(d){ [0,1].forEach(function(rn){ [9,0.45,1.0,1.8].forEach(function(stop){ (stop<9?[0,-d]:[0]).forEach(function(d2){ add({rel:rel,d:d,run:rn,stop:stop,d2:d2,djT:dj,gl:gl}); }); }); }); }); });
      [1.5,2.2,3.0].forEach(function(t2){ [-1,1].forEach(function(d3){ add({rel:rel,stop:0,djT:dj,gl:9,t2:t2,d3:d3}); [-1,1].forEach(function(d){ [0,1].forEach(function(rn){ [0.25,0.45,0.7].forEach(function(stop){ add({rel:rel,d:d,run:rn,stop:stop,djT:dj,gl:9,t2:t2,d3:d3}); }); }); }); }); }); }); });
    if(st.ds) [rels[0],rels[3],rels[6]].forEach(function(rel){ [-1,1].forEach(function(d){ [0,1].forEach(function(rn){ [0,0.3,0.5].forEach(function(dj){ [0.25,0.5,0.8].forEach(function(ds){ (dj?[0.5,9]:[0.5]).forEach(function(gl){ add({rel:rel,d:d,run:rn,djT:dj,gl:st.gl?gl:0.5,dsT:ds}); }); }); }); }); }); });
    for(var c=0;c<cands.length;c++){ var pl=cands[c], P=clone(P0), W={plats:Lp,solids:LV.solids,hazards:LV.hazards,winds:LV.winds,t:G.gt(),dj:st.dj,gl:st.gl,ds:st.ds}, r=run(pl,P,W,null); restore(base); if(r){ pl.tried=c; return pl; } }
    return null; }
  var pl=plan(); if(!pl) return {ok:false,why:'no plan to '+ti};
  var keys={l:false,r:false,j:false};
  run(pl,null,null,function(I){ ['l','r'].forEach(function(k){ if(I[k]!==keys[k]){ G.key(k,I[k]); keys[k]=I[k]; } });
    if(I.jumpPressed&&!keys.jp){ G.key('j',true); keys.j=true; } else if(I.jumpHeld!==keys.j){ G.key('j',I.jumpHeld); keys.j=I.jumpHeld; } keys.jp=I.jumpPressed;
    if(I.dashPressed){ G.key('ds',true); G.key('ds',false); }
    G.step(1/120); });
  G.key('l',false); G.key('r',false); G.key('j',false);
  return {ok:G.hero().on===tgt, mode:G.mode(), at:[Math.round(G.hero().x),Math.round(G.hero().y)], plan:pl};
};`;

(async()=>{
  const b=await chromium.launch(); const errs=[];
  const page=async(q,vp)=>{ const p=await b.newPage({viewport:vp||{width:1366,height:768}}); p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{ if(m.type()==='error') errs.push(m.text()); }); await p.goto(BASE+q); await p.waitForTimeout(400); return p; };
  const start=async(p,name)=>{ await p.fill('#lp-name',name||'Test U'); await p.click('#lp-go'); await p.waitForTimeout(300); };
  const fresh=async(q,vp)=>{ const p=await page(q,vp); await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.waitForTimeout(300); await start(p); await p.evaluate(()=>__G.nofog(true)); return p; };
  const steps=(p,n)=>p.evaluate(n=>{ for(let i=0;i<n;i++) __G.step(1/120); },n);
  const mode=p=>p.evaluate(()=>__G.mode());
  /* answer the open station's questions correctly with real key presses */
  const answerAll=async p=>{ await p.waitForTimeout(500);
    for(let k=0;k<8&&await mode(p)==='cp';k++){ const i=await p.evaluate(()=>__G.state().q.choices.findIndex(c=>c.ok)); await p.keyboard.press(String(i+1)); await p.waitForTimeout(450); await p.keyboard.press('Enter'); await p.waitForTimeout(500); } };

  /* ---------- bot: the whole game ---------- */
  if(ONLY.includes('bot')){ const p=await fresh('?set=slope'); await p.evaluate(()=>__G.nofog(false));
    await p.addScriptTag({content:BOT}); await p.evaluate(()=>{ __G.hold(true); __G.calm(true); });
    const NAME=['Pinewood Steps','Falls Cliffs','Windy Ruins','Beacon Summit','the tower, part 2','the tower, part 3'], MOVE=['dj','gl','ds'];
    for(let k=0;k<ST.length;k++){ let okAll=true, last='';
      for(const e of ROUTE[k]){ let r=await p.evaluate(([i,h])=>__bot(i,h),[e.to,e.hint]);
        if(!r.ok&&r.mode==='play') r=await p.evaluate(([i,h])=>__bot(i,h),[e.to,null]);   // a missed landing: plan again from wherever it stands
        if(!r.ok){ okAll=false; last=JSON.stringify(r)+' -> '+e.to; break; } }
      ok(okAll,'bot: '+NAME[k]+' climbed to '+ST[k].id+' '+last);
      if(!okAll) break;
      for(let n=0;n<400&&await mode(p)==='play';n++) await p.evaluate(()=>{ const s=__G.level.st[__G.state().st]; __G.key('r',__G.hero().x<s.x-10); __G.key('l',__G.hero().x>s.x+10); __G.step(1/120); });
      await p.evaluate(()=>{ __G.key('r',false); __G.key('l',false); });
      ok(await mode(p)==='cp','walking up to '+ST[k].id+' opens the questions');
      const need=await p.evaluate(()=>__G.need()); ok(need===(ST[k].kind==='braz'?1:3),ST[k].id+' asks for '+need+' right answer'+(need>1?'s':'')+' on an algebra set');
      await answerAll(p);
      if(ST[k].last) break;
      await steps(p,260);
      if(k<3){ ok(await mode(p)==='reward','runes lit: the gate opens and the new move is shown ('+await p.evaluate(()=>document.getElementById('lp-rwname').textContent)+')');
        await p.waitForTimeout(700); await p.screenshot({path:SHOTS+'/reward_'+MOVE[k]+'.png'}); await p.keyboard.press('Enter'); await p.waitForTimeout(200);
        ok(await p.evaluate(([k,m])=>__G.mode()==='play'&&__G.state()[m]&&__G.state().st===k+1&&__G.level.solids[k].off,[k,MOVE[k]]),'move on, gate '+(k+1)+' open, back to play'); }
      else ok(await p.evaluate(k=>__G.mode()==='play'&&__G.state().st===k+1&&__G.level.solids[k].off,k),'fire '+(k-2)+' lit: its gate opens and play goes on'); }
    await steps(p,700);
    ok(await p.evaluate(()=>__G.mode()==='end'&&__G.state().done&&__G.state().over),'lighting the beacon ends the run with the end screen');
    const st=await p.evaluate(()=>({sc:__G.state().score,caught:__G.state().caught,t:Math.round(__G.state().playT),ans:__G.state().answered,title:document.getElementById('lp-endtitle').textContent,code:!!document.querySelector('[id$="-endcode"]')}));
    ok(st.sc>0&&/beacon/.test(st.title),'end screen: "'+st.title+'", score '+st.sc+' (caught '+st.caught+', '+st.ans+' questions, bot climbing time '+st.t+' s)');
    console.log('INFO score code: '+(st.code?'shown':'not shown yet: the game id gets registered in scorecode.js at go-live (same as Rook & Ruin)'));
    await p.waitForTimeout(300); await p.screenshot({path:SHOTS+'/end.png'});
    await p.close(); }

  /* ---------- rules: Waystone input rules ---------- */
  if(ONLY.includes('rules')){ const p=await fresh('?set=slide&topics=slide,slice,both,slope');
    // run into the Waystone while holding → and Space and 1; the question must not get answered by those held keys
    await p.evaluate(()=>{ __G.tp(330,1975); }); await p.waitForTimeout(200);
    await p.keyboard.down('ArrowRight'); await p.keyboard.down('1');
    for(let n=0;n<60&&await mode(p)==='play';n++) await p.waitForTimeout(50);
    ok(await mode(p)==='cp','running into the Waystone opens the questions');
    await p.keyboard.down(' '); await p.waitForTimeout(900);
    ok(await p.evaluate(()=>!__G.state().qDone),'held → / Space / 1 do not answer the new question');
    const x0=await p.evaluate(()=>__G.hero().x); await p.waitForTimeout(400); ok(await p.evaluate(x=>Math.abs(__G.hero().x-x)<0.01,x0),'world is frozen while the question is up');
    await p.keyboard.up('1'); await p.keyboard.up(' '); await p.keyboard.up('ArrowRight');
    await p.keyboard.press(' '); await p.waitForTimeout(150); ok(await p.evaluate(()=>!__G.state().qDone),'Space does not answer');
    await p.keyboard.press('x'); await p.waitForTimeout(150); ok(await p.evaluate(()=>!__G.state().qDone),'X (the dash key) does not answer');
    const wrong=await p.evaluate(()=>__G.state().q.choices.findIndex(c=>!c.ok));
    const before=await p.evaluate(()=>({p:document.getElementById('lp-prompt').innerHTML,runes:__G.state().runes}));
    await p.keyboard.press(String(wrong+1)); await p.waitForTimeout(300);
    const fb=await p.evaluate(()=>({h:document.getElementById('lp-fb').hidden,t:document.getElementById('lp-fb').innerText,runes:__G.state().runes,prompt:document.getElementById('lp-prompt').innerHTML}));
    ok(!fb.h&&/Not quite/.test(fb.t),'a wrong answer shows why, with the explanation');
    ok(fb.runes===before.runes,'a wrong answer costs only the rune');
    await p.screenshot({path:SHOTS+'/wrong.png'});
    await p.waitForTimeout(3000);
    ok(await p.evaluate(p0=>!document.getElementById('lp-fb').hidden&&document.getElementById('lp-prompt').innerHTML===p0,fb.prompt),'question, answer and explanation stay together until Continue (3 s later)');
    await p.evaluate(()=>document.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',repeat:true,bubbles:true}))); await p.waitForTimeout(100);
    ok(await p.evaluate(p0=>document.getElementById('lp-prompt').innerHTML===p0,fb.prompt),'a held Enter (key repeat) does not skip the explanation');
    await p.keyboard.press('Enter'); await p.waitForTimeout(200);
    const nq=await p.evaluate(()=>({h:document.getElementById('lp-fb').hidden,done:__G.state().qDone,next:document.getElementById('lp-next').hidden}));
    ok(nq.h&&!nq.done&&nq.next,'Continue brings a new question with the old explanation cleared');
    const good=await p.evaluate(()=>__G.state().q.choices.findIndex(c=>c.ok));
    const bx=await p.evaluate(i=>{ const r=document.querySelectorAll('.lp-ch')[i].getBoundingClientRect(); return [r.x+r.width/2,r.y+r.height/2]; },good);
    await p.keyboard.press('1');
    ok(await p.evaluate(()=>!__G.state().qDone),'a key within 450 ms of a new question is ignored');
    await p.waitForTimeout(600);
    const pr=await p.evaluate(()=>document.getElementById('lp-prompt').innerHTML);
    await p.reload(); await p.waitForTimeout(400); await p.click('#lp-go'); await p.waitForTimeout(300);
    ok(await p.evaluate(p0=>__G.mode()==='cp'&&document.getElementById('lp-prompt').innerHTML===p0,pr),'reload during the Waystone keeps the same question');
    await p.waitForTimeout(500);
    await p.mouse.click(bx[0],bx[1]); await p.waitForTimeout(200);
    ok(await p.evaluate(()=>__G.state().qDone&&__G.state().runes===1),'a fresh click answers; a rune lights');
    await p.screenshot({path:SHOTS+'/right.png'});
    await p.close(); }

  /* ---------- falls, thorns, hearts; pause, restart, reload ---------- */
  if(ONLY.includes('falls')){ const p=await fresh('?set=mult');
    await p.evaluate(()=>__G.hold(true));
    await p.evaluate(()=>__G.nofog(false));
    let r0=await p.evaluate(()=>{ __G.setCamp('c0'); __G.tp(840,1260); for(let n=0;n<120;n++) __G.step(1/120); return {m:__G.mode(),hearts:__G.state().hearts,inv:__G.inv()}; });
    ok(r0.m==='play'&&r0.hearts===2&&r0.inv>0,'thorns cost a heart and knock you back, with a moment of safety (no teleport) '+JSON.stringify(r0));
    await p.evaluate(()=>{ __G.tp(60,2); for(let n=0;n<240;n++) __G.step(1/120); });
    // stand still in the village: the fog rises and catches you
    const c1=await p.evaluate(()=>{ const S=__G.state(); S.fog=-200; let t=0; for(;t<3000&&S.hearts===2;t++) __G.step(1/120); return {t:t/120,hearts:S.hearts,caught:S.caught,fog:Math.round(S.fog),y:__G.hero().y,m:__G.mode()}; });
    ok(c1.hearts===1&&c1.caught===1&&c1.fog<=c1.y-250&&c1.m==='play','the rising fog catches a hero who stays put, costs a heart and sinks back '+JSON.stringify(c1));
    const c2=await p.evaluate(()=>{ __G.tp(840,1500); const S=__G.state(); S.fog=1530; let m=''; for(let n=0;n<10;n++){ __G.step(1/120); if(__G.mode()!=='play'){ m=__G.mode(); break; } } for(let n=0;n<160;n++) __G.step(1/120); return {m,hearts:S.hearts,camp:S.camp,y:__G.hero().y,falls:S.falls}; });
    ok(c2.m==='respawn'&&c2.hearts===3&&c2.camp==='c0'&&c2.y===0,'out of hearts: back to the start of the stretch with full hearts '+JSON.stringify(c2));
    const c3=await p.evaluate(()=>{ __G.tp(400,600); return {fog:__G.state().fog,y:600}; });
    const c4=await p.evaluate(()=>{ const S=__G.state(); __G.tp(300,3000); for(let n=0;n<5;n++) __G.step(1/120); return {gap:Math.round(__G.hero().y-S.fog)}; });
    ok(c4.gap<=432,'the fog is never more than 430 px below you (gap '+c4.gap+')');
    await p.evaluate(()=>{ __G.nofog(true); __G.tp(60,2); for(let n=0;n<200;n++) __G.step(1/120); });
    await p.evaluate(()=>__G.hold(false));
    await p.keyboard.press('Escape'); await p.waitForTimeout(100); const g0=await p.evaluate(()=>__G.gt()); await p.waitForTimeout(500);
    ok(await p.evaluate(g=>__G.mode()==='pause'&&__G.gt()===g,g0),'Esc pauses and the world stops');
    await p.screenshot({path:SHOTS+'/pause.png'});
    await p.keyboard.press('Escape'); await p.waitForTimeout(100); ok(await mode(p)==='play','Esc resumes');
    await p.keyboard.press('Shift+R'); await p.waitForTimeout(100); ok(await p.evaluate(()=>!document.getElementById('sz-ask').hidden&&/new game/.test(document.getElementById('sz-asktitle').textContent)),'Shift+R asks "Start a new game?"');
    await p.keyboard.press('n'); await p.waitForTimeout(100); ok(await p.evaluate(()=>document.getElementById('sz-ask').hidden&&__G.state().falls===3),'N keeps the climb');
    await p.reload(); await p.waitForTimeout(400); ok(await p.evaluate(()=>document.getElementById('lp-go').textContent==='Keep climbing'),'reload: start screen offers "Keep climbing"');
    await p.click('#lp-go'); await p.waitForTimeout(200); ok(await p.evaluate(()=>__G.state().camp==='c0'&&__G.hero().y===0&&__G.state().hearts===3),'…and puts you back where you were, hearts kept');
    await p.keyboard.press('Shift+R'); await p.waitForTimeout(100); await p.keyboard.press('y'); await p.waitForTimeout(800);
    ok(await p.evaluate(()=>!__G.state().started&&__G.state().falls===0),'Y starts a fresh climb');
    await p.close(); }

  /* ---------- moves: Scarf Glide, rising wind, Ember Dash, ice ---------- */
  if(ONLY.includes('moves')){ const p=await fresh('?set=mult'); await p.evaluate(()=>__G.hold(true));
    const air=(st,x,y,press,n)=>p.evaluate(([st,x,y,press,n])=>{ __G.setSt(st,'top'); __G.tp(x,y); const P=__G.hero(); P.on=null; P.airT=0.2; let out=[];
      for(let i=0;i<n;i++){ if(press[i]!==undefined){ if(press[i]==='x'){ __G.key('ds',true); __G.key('ds',false); } else __G.key('j',press[i]); } __G.step(1/120); if(__G.mode()!=='play') break; }
      __G.key('j',false); const Q=__G.hero(); return {x:Q.x,y:Q.y,vy:Q.vy,glide:Q.glide,mode:__G.mode()}; },[st,x,y,press,n]);
    // falling in open air above the Lookout: hop, keep holding -> drifts down at the glide speed
    let r=await air(2,120,5000,{0:true},70); ok(r.glide&&Math.abs(r.vy+140)<8,'Scarf Glide: holding jump after the hop slows the fall to the glide speed (vy '+r.vy.toFixed(0)+')');
    r=await air(1,120,5000,{0:true},70); ok(!r.glide&&r.vy<-400,'no glide before the second Waystone (vy '+r.vy.toFixed(0)+')');
    r=await air(2,120,5000,{0:true,40:false},70); ok(!r.glide&&r.vy<-300,'letting go drops again (vy '+r.vy.toFixed(0)+')');
    // rising wind: gliding inside the first column lifts you
    r=await air(2,655,4950,{0:true},150); ok(r.y>5150,'rising wind lifts a glider (from 4950 up to '+r.y.toFixed(0)+')');
    r=await air(2,655,4950,{},60); ok(r.y<4950,'…and does nothing if you are not gliding');
    await p.evaluate(()=>{ __G.setSt(2,'top'); __G.tp(655,4950); __G.hero().on=null; __G.hero().airT=0.2; __G.key('j',true); for(let i=0;i<60;i++) __G.step(1/120); __G.hold(false); }); await p.waitForTimeout(250); await p.screenshot({path:SHOTS+'/glide.png'}); await p.evaluate(()=>{ __G.key('j',false); __G.hold(true); });
    // ice wall 1: blocked without the dash, melted with it
    const wall=(st)=>p.evaluate((st)=>{ __G.setSt(st,'way3'); __G.state().ice.length=0; __G.level.solids.forEach(s=>{ if(s.ice){ s.off=false; delete s.broken; } }); __G.tp(560,7352); for(let i=0;i<30;i++) __G.step(1/120);
      __G.key('r',true); for(let i=0;i<50;i++){ if(i===20){ __G.key('ds',true); __G.key('ds',false); } __G.step(1/120); } __G.key('r',false); return {x:__G.hero().x,ice:__G.state().ice.slice(),off:__G.level.solids.find(s=>s.id==='i1').off}; },st);
    let w=await wall(2); ok(w.x<630&&!w.ice.length,'before Waystone 3 the dash cannot melt ice (stopped at x '+w.x.toFixed(0)+')');
    w=await wall(3); ok(w.x>690&&w.ice[0]==='i1'&&w.off,'the hot dash melts the ice wall and carries you through (x '+w.x.toFixed(0)+')');
    await p.evaluate(()=>__G.hold(false)); await p.waitForTimeout(200); await p.screenshot({path:SHOTS+'/ice_melted.png'});
    // one dash per jump in the air
    await p.evaluate(()=>__G.hold(true));
    r=await p.evaluate(()=>{ __G.setSt(3,'way3'); __G.tp(300,7700); const P=__G.hero(); P.on=null; P.airT=0.2; P.face=1; let n=0; for(let i=0;i<60;i++){ if(i===2||i===40){ __G.key('ds',true); __G.key('ds',false); } __G.step(1/120); if(__G.hero().dashT>0&&(i===3||i===41)) n++; } return n; });
    ok(r===1,'one Ember Dash per jump in the air ('+r+')');
    // reload keeps the moves and the melted ice
    await p.evaluate(()=>{ __G.setSt(3,'way3'); __G.state().ice=['i1']; __G.hold(false); __G.tp(300,7352); }); await p.waitForTimeout(300); await p.keyboard.press('Escape'); await p.waitForTimeout(100); await p.keyboard.press('Escape');
    await p.evaluate(()=>{ const P=__G.hero(); __G.key('r',true); }); await p.waitForTimeout(150); await p.evaluate(()=>__G.key('r',false)); await p.waitForTimeout(200);
    await p.evaluate(()=>{ localStorage.setItem(Object.keys(localStorage).find(k=>/^lantern_peak_v1/.test(k)&&!/_mute$/.test(k)),JSON.stringify(__G.state())); });
    await p.reload(); await p.waitForTimeout(400); await p.click('#lp-go'); await p.waitForTimeout(300);
    ok(await p.evaluate(()=>{ const s=__G.state(); return s.st===3&&s.dj&&s.gl&&s.ds&&s.ice[0]==='i1'&&__G.level.solids.find(q=>q.id==='i1').off&&!document.getElementById('lp-ab-ds').hidden; }),'reload keeps the three moves and the melted ice');
    await p.keyboard.press('Escape'); await p.waitForTimeout(150); ok(await p.evaluate(()=>/Dash/.test(document.getElementById('lp-moves').textContent)&&/Glide/.test(document.getElementById('lp-moves').textContent)),'the pause menu lists the moves learned');
    await p.screenshot({path:SHOTS+'/pause_moves.png'});
    await p.close(); }

  /* ---------- boss: the Gloom ---------- */
  if(ONLY.includes('boss')){ const p=await fresh('?set=mult'); await p.evaluate(()=>__G.hold(true));
    const B=LV.base.y;
    let r=await p.evaluate(B=>{ __G.setSt(3,'base'); __G.tp(480,B+2); const log={warnAt:-1,dropAt:-1,minTele:9,n:0,on:false};
      for(let i=0;i<720;i++){ __G.step(1/120); const b=__G.boss; if(b.on) log.on=true; if(b.warn.length&&log.warnAt<0){ log.warnAt=b.bt; log.n=b.warn.length; b.warn.forEach(w=>log.minTele=Math.min(log.minTele,w.tele)); } if(b.ice.length&&log.dropAt<0){ log.dropAt=b.bt; break; } }
      return log; },B);
    ok(r.on&&r.warnAt>0&&r.n===2,'the Gloom wakes at the foot of the tower and marks '+r.n+' lanes ('+r.warnAt.toFixed(1)+' s in)');
    ok(r.minTele>=0.65&&r.dropAt-r.warnAt>=0.64,'ice falls only after a '+(r.dropAt-r.warnAt).toFixed(2)+' s warning');
    // stand still: the aimed icicle hits; it costs a heart and sends you back to the last lantern
    r=await p.evaluate(()=>{ const f0=__G.state().falls, e0=__G.state().embers.length, h0=__G.state().hearts; for(let i=0;i<400&&__G.mode()==='play'&&__G.state().hearts===h0;i++) __G.step(1/120); const m=__G.mode(); for(let i=0;i<200;i++) __G.step(1/120);
      return {m,hearts:h0-__G.state().hearts,falls:__G.state().falls-f0,emb:__G.state().embers.length-e0,y:__G.hero().y,camp:__G.state().camp,ice:__G.boss.ice.length+__G.boss.warn.length,mode:__G.mode()}; });
    ok(r.falls===1&&r.hearts===1&&r.mode==='play','a hit from the ice costs a heart and knocks you back ('+JSON.stringify(r)+')');
    // step aside after the warning: no hit
    r=await p.evaluate(B=>{ __G.tp(480,B+2); const b=__G.boss; b.nextV=b.bt+0.2; b.nextG=1e9; const f0=__G.state().falls; let moved=false;
      for(let i=0;i<420;i++){ if(b.warn.length&&!moved){ moved=true; __G.key('r',true); } if(moved&&__G.hero().x>560) __G.key('r',false); __G.step(1/120); if(b.nextV>b.bt+1&&!b.warn.length&&!b.ice.length&&moved) break; }
      __G.key('r',false); return {falls:__G.state().falls-f0,x:__G.hero().x}; },B);
    ok(r.falls===0,'stepping aside after the warning dodges it (moved to x '+r.x.toFixed(0)+')');
    // a ledge overhead is shelter
    r=await p.evaluate(B=>{ const b=__G.boss, L=__G.level.plats.find(q=>q.y===B+230&&q.kind==='wood'); __G.tp(L.x+L.w/2,B+2); b.nextV=1e9; b.nextG=1e9; b.warn.length=0; b.ice.length=0; b.ice.push({x:L.x+L.w/2,y:L.y+200,vy:-420}); const f0=__G.state().falls;
      for(let i=0;i<200;i++) __G.step(1/120); return {falls:__G.state().falls-f0,left:b.ice.length}; },B);
    ok(r.falls===0&&r.left===0,'ice breaks on the first ledge it meets: a ledge overhead is shelter');
    // gusts from the foot of the tower on; they push, then stop
    r=await p.evaluate(B=>{ const b=__G.boss; b.nextV=1e9; b.nextG=b.bt+0.1; __G.tp(480,B+2); let g=false; for(let i=0;i<300&&!g;i++){ __G.step(1/120); if(b.gust) g=true; } b.gust=null; __G.wind.off=true; b.nextG=1e9; for(let i=0;i<10;i++) __G.step(1/120); return {gust:g}; },B);
    ok(r.gust,'gusts start at the foot of the tower');
    r=await p.evaluate(()=>{ const b=__G.boss, T=__G.level.st[3]; __G.setSt(4,'b1'); __G.tp(T.x,T.y+2); b.nextV=1e9; b.nextG=b.bt+0.5; const x0=__G.hero().x; let tele=0, blow=0, maxV=0;
      for(let i=0;i<420;i++){ __G.step(1/120); if(b.gust&&!b.gust.blow) tele++; if(!__G.wind.off){ blow++; maxV=Math.max(maxV,Math.abs(__G.wind.vx)); } }
      return {mode:__G.mode(),hearts:__G.state().hearts,calm:b.calm,hurt:b.hurtT,on:b.on,tele:tele/120,blow:blow/120,maxV,dx:Math.abs(__G.hero().x-x0),on:__G.hero().on&&__G.hero().on.id,gust:!!b.gust}; });
    ok(Math.abs(r.tele-1)<0.05&&r.blow>1.2&&r.blow<1.5&&!r.gust,'a gust is announced for '+r.tele.toFixed(2)+' s, blows for '+r.blow.toFixed(2)+' s, then stops '+JSON.stringify(r));
    ok(r.dx>60&&r.dx<220&&r.on==='b1','a gust pushes a standing hero '+r.dx.toFixed(0)+' px, not off a wide ledge');
    // frozen while a question is up; the air is cleared
    r=await p.evaluate(()=>{ const b=__G.boss; b.warn.push({x:300,t:0,tele:0.9}); b.ice.push({x:320,y:__G.hero().y+300,vy:-400}); __G.openCP(); const t0=b.bt; for(let i=0;i<240;i++) __G.step(1/120); return {dt:b.bt-t0,n:b.ice.length+b.warn.length,mode:__G.mode()}; });
    ok(r.mode==='cp'&&r.dt===0&&r.n===0,'the Gloom is frozen (and the air cleared) while a question is up');
    // third stretch: four lanes, a short warning, and it never tires (help is ignored)
    r=await p.evaluate(()=>{ const b=__G.boss, T=__G.level.st[4]; __G.closeCP(); __G.setSt(5,'b2'); __G.tp(T.x-150,T.y+2); __G.hold(true);
      const one=help=>{ __G.state().help=help; b.warn.length=0; b.ice.length=0; b.gust=null; b.nextG=1e9; b.nextV=b.bt+0.05; for(let i=0;i<40&&!b.warn.length;i++) __G.step(1/120); const o={n:b.warn.length,tele:b.warn.length?b.warn[0].tele:0}; b.warn.length=0; return o; };
      for(let i=0;i<10;i++) __G.step(1/120); const a=one(false), h=one(true); __G.state().help=false; return {a,h,mode:__G.mode()}; });
    ok(r.a.n===4&&r.a.tele===0.65&&r.h.n===4&&r.h.tele===0.65,'last stretch: 4 lanes, 0.65 s warning, and the Gloom never tires '+JSON.stringify(r));
    await p.evaluate(()=>{ __G.hold(false); const b=__G.boss; b.nextV=b.bt+0.3; b.nextG=b.bt+2.2; }); await p.waitForTimeout(900); await p.screenshot({path:SHOTS+'/boss_warn.png'}); await p.waitForTimeout(2600); await p.screenshot({path:SHOTS+'/boss_gust.png'});
    await p.close(); }

  /* ---------- end: stop early from the pause menu; the end screen fits ---------- */
  if(ONLY.includes('end')){ for(const vp of [{width:1366,height:768},{width:1366,height:620}]){ const p=await fresh('?set=mult',vp);
    await p.evaluate(()=>{ __G.setSt(2,'top'); __G.tp(300,5295); const s=__G.state(); s.best=5295; s.answered=10; s.correct=9; }); await p.waitForTimeout(300);
    await p.keyboard.press('Escape'); await p.waitForTimeout(150); await p.click('#lp-pend'); await p.waitForTimeout(150);
    ok(await p.evaluate(()=>!document.getElementById('sz-ask').hidden&&/Stop here/.test(document.getElementById('sz-asktitle').textContent)),'"Stop here and show my score" asks first');
    await p.keyboard.press('n'); await p.waitForTimeout(100); ok(await p.evaluate(()=>document.getElementById('sz-ask').hidden&&!__G.state().over),'N goes back to the climb');
    await p.click('#lp-pend'); await p.waitForTimeout(100); await p.keyboard.press('y'); await p.waitForTimeout(400);
    const e=await p.evaluate(()=>{ const box=document.querySelector('#lp-end .lp-box').getBoundingClientRect(), st=document.getElementById('stage').getBoundingClientRect(), cl=document.getElementById('lp-endclimb');
      return {mode:__G.mode(),over:__G.state().over,done:__G.state().done,title:document.getElementById('lp-endtitle').textContent,sc:__G.state().score,fit:box.top>=st.top-1&&box.bottom<=st.bottom+1,wide:cl.scrollWidth<=cl.clientWidth+1&&[...document.querySelectorAll('.lp-stat b,#lp-endtitle,#lp-stars')].every(x=>x.scrollWidth<=x.clientWidth+1)}; });
    ok(e.mode==='end'&&e.over&&!e.done&&/Windy Ruins/.test(e.title)&&e.sc>0,'Y ends the climb there with a score: "'+e.title+'", '+e.sc);
    ok(e.fit&&e.wide,'the early end screen fits at '+vp.width+'x'+vp.height);
    await p.waitForTimeout(2500); await p.screenshot({path:SHOTS+'/end_early_'+vp.height+'.png'});
    await p.reload(); await p.waitForTimeout(400); ok(await p.evaluate(()=>!__G.state().started&&document.getElementById('lp-go').textContent==='Climb'),'after an ended climb, a reload starts fresh');
    await start(p); await p.evaluate(()=>{ const s=__G.state(); s.caught=1; s.hearts=3; s.answered=24; s.correct=23; s.best=__G.level.summitY; s.falls=12; s.playT=754; __G.setSt(6,'b2'); __G.end(); }); await p.waitForTimeout(400);
    const f=await p.evaluate(()=>{ const box=document.querySelector('#lp-end .lp-box').getBoundingClientRect(), st=document.getElementById('stage').getBoundingClientRect(), cl=document.getElementById('lp-endclimb');
      return {fit:box.top>=st.top-1&&box.bottom<=st.bottom+1,wide:cl.scrollWidth<=cl.clientWidth+1&&[...document.querySelectorAll('.lp-stat b,#lp-endtitle,#lp-stars')].every(x=>x.scrollWidth<=x.clientWidth+1),stars:document.getElementById('lp-stars').textContent}; });
    ok(f.fit&&f.wide&&/★★★★/.test(f.stars),'the full end screen (4 stars) fits at '+vp.width+'x'+vp.height);
    await p.waitForTimeout(2500); await p.screenshot({path:SHOTS+'/end_full_'+vp.height+'.png'});
    await p.close(); } }

  /* ---------- sets: every question set fits the card (Waystone wording, then the fire wording) ---------- */
  if(ONLY.includes('sets')){ const sets=await (async()=>{ const p=await page('?set=mult'); const s=await p.evaluate(()=>Object.keys(SpitzQ.sets)); await p.close(); return s; })();
    for(const vp of [{width:1366,height:768},{width:1366,height:620},{width:1280,height:720}]) for(const id of sets){
      const p=await fresh('?set='+id,vp);
      let bad=[];
      for(let k=0;k<8;k++){ await p.evaluate(k=>{ const S=__G.state(); if(k===5) __G.setSt(3); if(k===7) __G.setSt(5); S.q=null; S.qDone=false; __G.openCP(); },k); await p.waitForTimeout(80);
        const r=await p.evaluate(()=>{ const card=document.getElementById('lp-card').getBoundingClientRect(), st=document.getElementById('stage').getBoundingClientRect();
          const over=[...document.querySelectorAll('.lp-ch .t, .lp-prompt')].filter(e=>e.scrollWidth>e.clientWidth+2||e.getBoundingClientRect().right>card.right).length;
          return {fit:card.top>=st.top-1&&card.bottom<=st.bottom+1, over, p:document.getElementById('lp-prompt').innerText.slice(0,60)}; });
        if(!r.fit||r.over) bad.push(r);
        const i=await p.evaluate(()=>__G.state().q.choices.findIndex(c=>!c.ok)); await p.waitForTimeout(470); await p.keyboard.press(String(i+1)); await p.waitForTimeout(60);
        const r2=await p.evaluate(()=>{ const card=document.getElementById('lp-card').getBoundingClientRect(), st=document.getElementById('stage').getBoundingClientRect(); return card.top>=st.top-1&&card.bottom<=st.bottom+1; });
        if(!r2) bad.push({after:'wrong answer',p:await p.evaluate(()=>document.getElementById('lp-prompt').innerText.slice(0,60))});
        if(vp.height===620&&((k===2&&(id==='slope'||id==='mult'))||(k===7&&id==='slope'))) await p.screenshot({path:SHOTS+'/set_'+id+'_620'+(k===7?'_fire':'')+'.png'}); }
      ok(!bad.length,'set '+id+' at '+vp.width+'x'+vp.height+': card fits with the explanation open'+(bad.length?' '+JSON.stringify(bad[0]):''));
      await p.close(); } }

  /* ---------- fps: speed at 6x CPU slowdown, in each zone and in the boss fight ---------- */
  if(ONLY.includes('fps')){ const p=await fresh('?set=mult');
    const cdp=await p.context().newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate',{rate:6});
    const fps=()=>p.evaluate(()=>new Promise(r=>{ let n=0; const t0=performance.now(); (function f(){ n++; if(performance.now()-t0<4000) requestAnimationFrame(f); else r(n/((performance.now()-t0)/1000)); })(); }));
    for(const [name,st,camp,x,y] of [['Pinewood Steps',0,'c0',340,505],['Falls Cliffs',1,'way',600,2700],['Windy Ruins (wind on screen)',2,'top',850,5485],['Beacon Summit (snow, ice)',3,'way3',300,7355],['the tower (the Gloom, ice, gusts)',5,'b2',330,9595]]){
      await p.evaluate(([st,camp,x,y])=>{ __G.setSt(st,camp); __G.tp(x,y); },[st,camp,x,y]); await p.keyboard.down('ArrowRight'); await p.waitForTimeout(1500); await p.keyboard.up('ArrowRight');
      const f=await fps(); ok(f>=30,'fps at 6x CPU slowdown, 1366x768, '+name+': '+f.toFixed(1)); }
    await p.close(); }

  ok(errs.length===0,'no page errors '+JSON.stringify(errs.slice(0,3)));
  await b.close(); console.log(fail?fail+' FAILED':'ALL PLAY TESTS PASSED'); process.exit(fail?1:0);
})();
