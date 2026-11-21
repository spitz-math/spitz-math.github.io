
/* touch or mouse: hold on the field to fly toward that spot and fire */
function ptrX(e){ var r=cv.getBoundingClientRect(); return (e.clientX-r.left)/r.width*W; }
cv.addEventListener('pointerdown',function(e){ if(!flying()) return; ptr.on=true; ptr.x=ptrX(e); try{ cv.setPointerCapture(e.pointerId); }catch(er){} e.preventDefault(); });
cv.addEventListener('pointermove',function(e){ if(ptr.on) ptr.x=ptrX(e); });
['pointerup','pointercancel','lostpointercapture'].forEach(function(n){ cv.addEventListener(n,function(){ ptr.on=false; }); });
/* looking away is safe: leaving the tab or the window docks the ship */
addEventListener('blur',function(){ letGo(); if(flying()&&!window.__noBlurDock) openCard(); });
document.addEventListener('visibilitychange',function(){ if(document.hidden&&flying()) openCard(); });

var lastF=now(); function loop(){ var t=now(), dt=Math.min(0.05,(t-lastF)/1000); lastF=t; if(!paused) update(dt); render(); requestAnimationFrame(loop); }
/* the wall clock: a run is CFG.runWall seconds (5:00), however the time splits between flying and questions */
function tick(){ if(S.started&&!S.over){ S.wall+=0.25; if(prog()>=1){ endRun(); return; } if(Math.round(S.wall*4)%8===0) save(); } hud(); }
function esc(t){ return String(t).replace(/[&<>"]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }

/* ================= START / END ================= */
function playUI(on){ $('sw-top').hidden=!on; $('sw-keysbar').hidden=!on; }
function resetField(){ PXF.list.length=0; enemies=[]; shots=[]; beams=[]; missiles=[]; caps=[]; rings=[]; pops=[]; bolts=[]; laters=[]; flashes=[]; boss=null; rush=null; wv=null; SPK.forEach(function(p){ p.on=false; });
  gt=0; formT=0; hitStop=0; trauma=0; lastShot=-9; lastMissile=0; lastDrone=0; calmUntil=0; lastHurt=lastHurtPrev=-99; resumeAt=0; chainUntil=0; tipDash=-99; novaAt=-9; stopAt=-9; bannerT={t0:-9}; banked=0; cardGood=false; tutMove=0; tutKills=0;
  ship.x=W/2; ship.safeUntil=0; ship.shield=S&&L('shield')?1:0; ship.shieldAt=0; ship.dashAt=-9; ship.dashSafe=0; ship.over=0; ship.wasDash=false; letGo(); frozen=false; closeCard(); $('sw-draft').hidden=true; $('sw-dim').hidden=true; }
$('sw-nameinput').addEventListener('input',function(){ $('sw-go').disabled=!this.value.trim(); });
$('sw-nameinput').addEventListener('keydown',function(e){ if(e.key==='Enter'&&this.value.trim()) $('sw-go').click(); });
$('sw-go').addEventListener('click',function(){ var n=$('sw-nameinput').value.trim(); if(!n||S.started) return; ac(); S.name=n; S.started=true; bestAtStart=bestToday(); S.fuel=CFG.startFuel; $('sw-start').hidden=true;
  $('sw-nameinput').blur(); resetField(); playUI(true); save(); hud(); jingle(); });
var endAt=0; function endRun(){ if(S.over) return; S.over=true; endAt=now(); closeCard(); $('sw-draft').hidden=true; $('sw-dim').hidden=true; frozen=false;
  if(boss&&!boss.dead&&S.bossHp){ var B=S.bossHp, k=1-(B.l+B.r+B.c)/(B.mt*2+B.mc), p=Math.round(3000*k*streakMult()); addScore(p); S.escaped=Math.round(k*100); }
  save(); showEnd(true); }
function showEnd(celebrate){ playUI(false); if(window.SpitzCode) setTimeout(function(){ window.SpitzCode.show('sw','star_swarm',S); },0); $('sw-endname').textContent=S.name;
  var acc=S.answered?Math.round(100*S.correct/S.answered):0, el=$('sw-endscore'), again=$('sw-again');
  var was=bestAtStart; keepBest();
  /* one goal to chase next run (accuracy-based: a streak only grows on right answers) */
  var goal=S.score>was&&was>0?'NEW BEST TODAY!':was>S.score?(was-S.score).toLocaleString()+' short of your best today':'';
  if(!goal) goal=S.best<10?'Best streak '+S.best+': get 10 in a row for ×3 points':S.bossDown?'Beat this score next run':'';
  $('sw-endmedal').textContent=(S.bossDown?'MOTHERSHIP DESTROYED! ':S.escaped!=null?'The Mothership got away with '+(100-S.escaped)+'% of its armor. ':'')+goal;
  $('sw-endstats').innerHTML=[['Correct',S.correct+' / '+S.answered],['Accuracy',acc+'%'],['Best streak',S.best],['Best chain',S.bestChain],['Bugs zapped',S.kills]].map(function(a){ return '<div class="sw-stat"><div class="l">'+a[0]+'</div><div class="v">'+a[1]+'</div></div>'; }).join('');
  $('sw-endtopics').innerHTML=Object.keys(S.topics).map(function(k){ var t=S.topics[k]; return '<div class="sw-stat"><div class="l">'+esc(k)+'</div><div class="v">'+t[0]+' / '+t[1]+'</div></div>'; }).join('');
  $('sw-end').hidden=false;
  if(celebrate&&!REDUCE){ var t0=now(); again.disabled=true; (function count(){ var u=Math.min(1,(now()-t0)/1500); el.textContent=Math.round(S.score*(1-Math.pow(1-u,3))).toLocaleString(); if(u<1) requestAnimationFrame(count); else again.disabled=false; })(); }
  else el.textContent=S.score.toLocaleString();
  if(celebrate){ SND.win(); [0,350,700,1100].forEach(function(ms,i){ setTimeout(function(){ confetti(200+i*500,1070,90,1.3); confetti(1720-i*500,1070,90,1.3); },ms); }); } }
function newGame(){ clearTimeout(nextT); clearTimeout(lockT); var keepName=S.name; S=fresh(); S.name=keepName; resetField(); playUI(false);
  $('sw-end').hidden=true; $('sw-start').hidden=false; $('sw-nameinput').value=keepName; $('sw-go').disabled=!keepName; hudKey=''; save(); hud(); }
/* v2: one tap (or Enter) on Play again starts the next run straight away with the same name (replay hook). The button waits 2 s after the end so a stray key can't skip the score */
function playAgain(){ var b=$('sw-again'); if(b.disabled||!S.over||now()-endAt<2000) return; var n=S.name; newGame(); if(n){ $('sw-nameinput').value=n; $('sw-go').disabled=false; $('sw-go').click(); } }
$('sw-again').addEventListener('click',playAgain);

/* ================= KEYS ================= */
function fullscreen(){ var d=document, e=d.documentElement; if(d.fullscreenElement||d.webkitFullscreenElement) (d.exitFullscreen||d.webkitExitFullscreen).call(d);
  else { var r=e.requestFullscreen||e.webkitRequestFullscreen; if(r){ var p=r.call(e); if(p&&p.catch) p.catch(function(){}); } } }
function keyDir(e){ var k=e.key.toLowerCase(); return (k==='arrowleft'||k==='a')?'l':(k==='arrowright'||k==='d')?'r':(k===' '||k==='arrowup'||k==='w')?'f':''; }
/* Shift+R: new game, but only after a yes. The game is frozen while the box is up. */
var askWas=false;
function askNew(o){ $('sw-confirm').hidden=!o; if(o){ letGo(); askWas=frozen; frozen=true; clearTimeout(nextT); }
  else if(!cardOpen()&&!draftOpen()){ frozen=false; resumeAt=gt+0.45; }
  else if(cardOpen()&&S.qDone&&S.q.choices[S.picked].ok) nextT=setTimeout(afterRight,300); }
$('sw-askyes').addEventListener('click',function(){ askNew(false); newGame(); });
$('sw-askno').addEventListener('click',function(){ askNew(false); });
document.addEventListener('keydown',function(e){ if(e.metaKey||e.ctrlKey||e.altKey) return; if(e.target&&/^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return; var k=e.key.toLowerCase(), d=keyDir(e), dg=/^(?:Digit|Numpad)([1-4])$/.exec(e.code||''), num=dg?+dg[1]:/^[1-4]$/.test(e.key)?+e.key:0;
  if(!$('sw-confirm').hidden){ e.preventDefault(); if(k==='y'){ askNew(false); newGame(); } else if(k==='n'||e.key==='Escape') askNew(false); return; }   // only Y says yes
  if(k==='r'&&e.shiftKey){ e.preventDefault(); if(S.started) askNew(true); return; }
  if(k==='f'){ e.preventDefault(); fullscreen(); return; }
  if(k==='n'){ e.preventDefault(); musicToggle(); return; }
  if(k==='m'){ e.preventDefault(); muted=!muted; save(); toast(muted?'Sound off':'Sound on'); if(!muted) SND.tick(); return; }
  if(S.over&&e.key==='Enter'&&!$('sw-end').hidden){ e.preventDefault(); if(!e.repeat) playAgain(); return; }
  if(!S.started||S.over) return;
  if(draftOpen()){ if(num&&num<4){ e.preventDefault(); if(!e.repeat) pickCard(num-1); } else if(d||e.key==='Enter') e.preventDefault(); return; }
  if(cardOpen()){
    if(num){ e.preventDefault(); if(!e.repeat) answer(num-1); return; }
    if(e.key==='Enter'){ e.preventDefault(); if(!e.repeat) nextOrLaunch(); return; }
    if(e.key===' '){ e.preventDefault(); if(!e.repeat&&now()-cardAt>350) launch(); return; }
    if(d) e.preventDefault(); return; }
  if(e.key==='Shift'){ if(!e.repeat) dash(); return; }
  if(e.key==='Enter'){ e.preventDefault(); if(e.repeat) return; if(S.fuel>=tankMax()-0.5) toast('The tank is full'); else openCard(); return; }
  if(d){ e.preventDefault(); keys[d]=true; if(d!=='f') ship.dir=d==='l'?-1:1; } });
document.addEventListener('keyup',function(e){ var d=keyDir(e); if(d) keys[d]=false; if(e.key===' ') e.preventDefault(); });
function fit(){ var s=Math.min(innerWidth/1920,innerHeight/1080), y=$('stage').style; y.transform='scale('+s+')'; y.left=((innerWidth-1920*s)/2)+'px'; y.top=((innerHeight-1080*s)/2)+'px'; }
addEventListener('resize',fit);

var SZ_VOICE=function(f,t0,dur){ tone(f,f,t0,dur,'square',0.04); tone(f*2,f*2,t0,dur*0.6,'sine',0.06); tone(f,f,t0,dur,'triangle',0.1); };
$('sz-mus').addEventListener('click',function(e){ e.stopPropagation(); ac(); musicToggle(); }); musBtn();

/* ================= BOOT ================= */
S=load()||fresh(); fit(); makeArt(); resetField();
if(S.started){ $('sw-start').hidden=true; bestAtStart=bestToday(); if(S.over){ showEnd(false); } else { playUI(true); S.chain=0; if(S.fuel<=0.05||S.q) openCard(); else { openCard(); } } }
else { $('sw-nameinput').value=S.name||''; $('sw-go').disabled=!S.name; }
hud(); setInterval(tick,250); requestAnimationFrame(loop);

/* test hooks */
window.__G={ state:function(){ return S; }, cfg:CFG, cards:CARDS, waves:WAVES, enemies:function(){ return enemies; }, ship:function(){ return ship; }, beams:function(){ return beams; }, shots:function(){ return shots; }, caps:function(){ return caps; },
  boss:function(){ return boss; }, rush:function(){ return rush; }, wave:function(){ return wv; }, frozen:function(){ return frozen; }, clock:function(){ return gt; }, calm:function(){ return gt<calmUntil||gt<resumeAt; },
  key:function(k,b){ keys[k]=!!b; }, step:function(dt){ update(dt); }, render:render, pause:function(b){ paused=!!b; }, fire:fire, dash:dash, hurt:hurt, safe:shipSafe,
  dock:openCard, launch:launch, answer:answer, next:nextOrLaunch, draft:openDraft, pick:pickCard, cardOpen:cardOpen, draftOpen:draftOpen, noWait:function(){ cardAt=0; draftAt=0; },
  hitEnemy:hitEnemy, hitPart:hitPart, momOpen:momOpen, startWave:startWave, setWave:function(n){ S.wave=n; enemies=[]; boss=null; S.bossHp=null; rush=null; laters=[]; startWave(); }, dropCap:dropCap, grab:grab, nova:nova,
  music:function(){ return {on:MUS.on,i:MUS.i,level:MUS.LEVEL,ac:AC?AC.state:'none'}; }, mult:mult, end:function(){ S.flown=CFG.flight; S.wall=CFG.runWall; if(frozen){ endRun(); } else update(0.016); },
  build:build, types:Object.keys(GEN), consts:{W:W,H:H,SHIP_Y:SHIP_Y} };
})();
</script>
