/* ================= GAME STATE =================
   Star Swarm, rebuilt 2026-11-18. The play field fills the screen. Right answers are FUEL: the ship flies while it has fuel, and when the
   tank runs dry the whole game freezes and a question card pops up. The run is 5:00 on the wall clock (v2, 2026-11-18, like the old game; the clock keeps running under the card),
   so every student sees the same arc: four swarms, a Swarm Rush, then the Mothership.
   Every tuning number lives in CFG. */
var FAST=!!(QS&&QS.set==='mult');                         // facts take 2-3 s, not 10-15: less fuel per answer, a longer flight
var CFG={
  flight:300,                   // v2: can't run out before the wall clock (kept so the timeline and boss sizing still read S.flown)
  runWall:300,                  // v2: a run is 5:00 on the wall clock, like the old game. The clock runs under the card, but nothing can hit the ship there
  fuel:FAST?5:7,                // seconds of flight per right answer (v1 was 4 / 6.5)
  tank:4,                       // the tank holds this many answers (v1: 3). Picked with tools/compare.js: fewer, longer flights, more answers per minute
  startFuel:FAST?9:11,          // the first flight, before the first question
  draftEvery:FAST?7:4,          // right answers per upgrade pick
  shipSpeed:640, dashDist:250, dashTime:0.18, dashSafe:0.38, dashCool:1.4,
  fireGap:0.17, beamSpeed:1500, hitFuel:2, hitSafe:1.6, chainSecs:2.5,
  // heat 1..5: how hard the swarm pushes. It follows how the student is doing; it never moves the timeline
  shotMax:[6,6,8,8,10], shotSpeed:[250,280,320,370,420], divers:[1,1,2,2,3], diveSecs:[2.3,2.1,1.9,1.7,1.5], volley:[3.6,3.0,2.5,2.0,1.5],
  bossAt:0.70                   // the Mothership arrives at this share of the flight at the latest
};
/* tuning test: ?tune=fuel:5,tank:4 overrides CFG numbers (used by tools/compare.js to try settings; students never see it) */
try{ (new URLSearchParams(location.search).get('tune')||'').split(/[,;]/).forEach(function(kv){ var a=kv.split(':'); if(a[0] in CFG&&!isNaN(+a[1])) CFG[a[0]]=+a[1]; }); }catch(e){}
var CARDS=[
  {id:'gun',    name:'More Blasters',   col:'#3DE0FF', d:['Fire 2 beams at once','Fire 3 beams at once','Fire 4 beams at once']},
  {id:'pierce', name:'Pierce',          col:'#E9FCFF', d:['Beams go through 1 bug','Beams go through 2 bugs','Beams go through 3 bugs']},
  {id:'rapid',  name:'Rapid Fire',      col:'#FF9A2E', d:['Fire 20% faster','Fire 40% faster','Fire 60% faster']},
  {id:'drone',  name:'Wing Drones',     col:'#A6FF4D', d:['1 drone fires with you','2 drones fire with you','3 drones fire with you']},
  {id:'missile',name:'Homing Missiles', col:'#FF4F6D', d:['A seeking missile every 1.4 s','A seeking missile every 1 s','A seeking missile every 0.7 s']},
  {id:'nova',   name:'Dash Nova',       col:'#C77DFF', d:['Your dash ends in a blast','Your dash ends in a bigger blast','Your dash ends in a huge blast']},
  {id:'shield', name:'Shield Plate',    col:'#4ADE80', d:['A shield that grows back in 16 s','A shield that grows back in 11 s','A shield that grows back in 7 s']},
  {id:'magnet', name:'Magnet',          col:'#FFF04D', d:['More power-ups, pulled to you','Even more power-ups','Power-ups everywhere']},
  {id:'gold',   name:'Gold Rush',       col:'#FFC82E', d:['2× the gold bugs','3× the gold bugs','4× the gold bugs']},
  {id:'chain',  name:'Long Chain',      col:'#FF7AD9', d:['Chains last 3.5 s','Chains last 4.5 s','Chains last 6 s']}
];
var S;
function fresh(){ var lv={}; CARDS.forEach(function(c){ lv[c.id]=0; });
  return { ver:3, name:'', started:false, over:false, score:0, fuel:0, flown:0, wall:0, streak:0, best:0, answered:0, correct:0,
    topics:QS?QS.topicTable():{'Slope-intercept form':[0,0],'Point-slope form':[0,0],'Graphs':[0,0],'HOY & VUX':[0,0]}, q:null, qDone:false, picked:-1,
    lv:lv, picks:0, sinceDraft:0, wave:0, heat:1, kills:0, shots:0, dmg:0, hurts:0, chain:0, bestChain:0, phases:0, bossDown:0, bossHp:null, tut:0, code:'' }; }
function save(){ try{ localStorage.setItem(KEY,JSON.stringify(S)); localStorage.setItem(KEY+'_mute',muted?'1':'0'); }catch(e){} }
/* saved runs from the older Star Swarm do not fit this one: those start fresh (same save key, so the 20-minute expiry list still works) */
function load(){ try{ var v=JSON.parse(localStorage.getItem(KEY)||'null'); muted=localStorage.getItem(KEY+'_mute')==='1'; if(v&&v.ver===3&&v.topics&&v.lv) return v; }catch(e){} return null; }
function L(id){ return S.lv[id]||0; }
function now(){ return Date.now(); }
function tankMax(){ return CFG.fuel*CFG.tank; }
function streakMult(){ return S.streak>=10?3:S.streak>=6?2:S.streak>=3?1.5:1; }
function chainMult(){ return S.chain>=12?2:S.chain>=5?1.5:1; }
function mult(){ return streakMult()*chainMult()*(bossTime()?2:1); }
function pts(base){ return Math.round(base*mult()); }
/* v2 replay hook (Game Studios game designer, 2026-11-18): today's best on this set, to chase. Kept for today only, never across days */
function today(){ var d=new Date(); return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate(); }
var BEST_KEY='spitz_best_star_swarm_'+((QS&&QS.set)||'x');
function bestToday(){ try{ var b=JSON.parse(localStorage.getItem(BEST_KEY)||'null'); if(b&&b.day===today()) return b.score||0; }catch(e){} return 0; }
function keepBest(){ try{ if(S.score>bestToday()) localStorage.setItem(BEST_KEY,JSON.stringify({day:today(),score:S.score})); }catch(e){} }
var bestAtStart=0;
function addScore(p){ S.score=Math.min(10485750,S.score+p);
  if(bestAtStart>0&&!S.newBest&&S.score>bestAtStart){ S.newBest=true; toast('New best today!'); if(SND.goal) SND.goal(); } }
function frenzy(){ return bossTime(); }                       // the music speeds up for the Mothership
function bossTime(){ return !!S&&S.started&&!S.over&&!!boss&&!boss.dead; }

/* ================= HUD ================= */
var hudKey='';
function prog(){ return Math.max(S.flown/CFG.flight,S.wall/CFG.runWall); }                       // how far through the run: flight or wall clock, whichever is further
function left(){ return CFG.runWall-S.wall; }
function clockText(){ var s=Math.max(0,Math.ceil(left())); return Math.floor(s/60)+':'+('0'+(s%60)).slice(-2); }
function hud(){ var m=S.started?mult():1, key=S.score+'|'+clockText()+'|'+m+'|'+S.streak+'|'+bestAtStart; if(key===hudKey) return; hudKey=key;
  $('sw-score').textContent=S.score.toLocaleString(); var bt=Math.max(bestAtStart,S.newBest?S.score:0); $('sw-best').textContent=bt?bt.toLocaleString():'—'; $('sw-time').textContent=clockText(); $('sw-streak').textContent=S.streak;
  $('sw-mult').textContent='×'+m; $('sw-multchip').classList.toggle('hot',m>1); $('sw-timerchip').classList.toggle('low',S.started&&left()<=15); }

/* ================= THE QUESTION CARD =================
   Open = the game is frozen: nothing moves, nothing can hurt the ship. The wall clock keeps running.
   Right answer = fuel. The tank holds 3 answers, so a student can bank up before launching (Space). A full tank launches by itself. */
var wrongRun=0, frozen=false, cardAt=0, nextT=0, lockT=0, banked=0, cardGood=false, resumeAt=0;
function cardOpen(){ return !$('sw-q').hidden; }
function draftOpen(){ return !$('sw-draft').hidden; }
function tankDraw(){ var n=Math.min(CFG.tank,Math.floor(S.fuel/CFG.fuel+0.02)), h='FUEL '; for(var i=0;i<CFG.tank;i++) h+='<i class="'+(i<n?'on':'')+'"></i>'; $('sw-tank').innerHTML=h;
  $('sw-launch').disabled=S.fuel<=0.05; }
function showQ(){ var q=S.q, el=$('sw-q'); el.classList.toggle('fast',FAST&&!q.visual); $('sw-tag').textContent=q.topic; $('sw-prompt').innerHTML=q.prompt; $('sw-visual').innerHTML=q.visual||''; el.classList.toggle('vis',!!q.visual);
  var long=q.choices.some(function(c){ return c.html.replace(/<[^>]+>/g,'').length>14; });
  var ch=$('sw-choices'); ch.classList.toggle('one',long||!!q.visual);
  ch.innerHTML=q.choices.map(function(c,i){ return '<button class="sw-ch" data-i="'+i+'"><span class="k">'+(i+1)+'</span><span class="t">'+c.html+'</span><span class="m"></span></button>'; }).join('');
  var fb=$('sw-fb'); fb.className='sw-fb'; fb.innerHTML=S.fuel<=0.05?'Out of fuel. A right answer fills the tank.':'Answer for more fuel, or launch.'; $('sw-next').disabled=true;
  if(S.qDone) markAnswered(S.picked,false); tankDraw(); }
function newQ(){ clearTimeout(nextT); cardAt=Math.max(cardAt,now()-100); S.q=nextQuestion(); S.qDone=false; S.picked=-1; save(); showQ(); }
function openCard(){ if(!S.started||S.over||cardOpen()||draftOpen()) return; frozen=true; letGo(); cardAt=now(); cardGood=false;
  var el=$('sw-q'); $('sw-dim').hidden=false; el.hidden=false; el.classList.remove('pop'); if(!REDUCE){ void el.offsetWidth; el.classList.add('pop'); }
  if(!S.q||S.qDone) newQ(); else showQ(); SND.dock(); }
function closeCard(){ clearTimeout(nextT); clearTimeout(lockT); $('sw-q').hidden=true; $('sw-dim').hidden=true; }
function markAnswered(i,live){ var q=S.q, btns=$('sw-choices').querySelectorAll('.sw-ch'), c=q.choices[i], fb=$('sw-fb');
  btns.forEach(function(b,j){ b.disabled=true; if(q.choices[j].ok){ b.classList.add('right'); b.querySelector('.m').textContent='✓'; } });
  if(!c.ok){ btns[i].classList.add('wrong'); btns[i].querySelector('.m').textContent='✗'; }
  if(c.ok){ fb.className='sw-fb ok'; fb.innerHTML='<span class="h">✓ Correct!</span>+'+CFG.fuel+' s of fuel'+(S.streak>=3?' · streak '+S.streak+' = ×'+streakMult()+' points':''); $('sw-next').disabled=false; }
  else { fb.className='sw-fb bad'; fb.innerHTML='<span class="h">✗ Not quite.</span>'+(c.why||'')+' '+q.explain;
    $('sw-next').disabled=!!live; if(live){ clearTimeout(lockT); lockT=setTimeout(function(){ $('sw-next').disabled=false; },wrongRun>=2?2500:1200); } } }
function answer(i){ if(!S.started||S.over||!cardOpen()||S.qDone||!S.q||now()-cardAt<250) return; var c=S.q.choices[i]; if(!c) return;
  S.qDone=true; S.picked=i; S.answered++; if(S.topics[S.q.topic]) S.topics[S.q.topic][1]++;
  if(c.ok){ S.correct++; if(S.topics[S.q.topic]) S.topics[S.q.topic][0]++; S.streak++; S.best=Math.max(S.best,S.streak); S.fuel=Math.min(tankMax(),S.fuel+CFG.fuel); S.sinceDraft++; banked++; cardGood=true; wrongRun=0;
    SND.correct(); var btn=$('sw-choices').querySelectorAll('.sw-ch')[i], p=stagePoint(btn,60,40); confetti(p[0],p[1],36,2.2);
    markAnswered(i,true); nextT=setTimeout(afterRight,FAST?450:650); }
  else { S.streak=0; wrongRun++; SND.miss(); markAnswered(i,true); var el=$('sw-q'); el.classList.remove('shake','pop'); if(!REDUCE){ void el.offsetWidth; el.classList.add('shake'); } }
  save(); hud(); tankDraw(); }
function afterRight(){ if(S.over||!cardOpen()||!$('sw-confirm').hidden) return;
  if(S.sinceDraft>=CFG.draftEvery&&draftPool().length){ openDraft(); return; }
  if(S.fuel>=tankMax()-0.05){ launch(); return; }
  newQ(); }
function nextOrLaunch(){ if(!cardOpen()||!S.qDone||$('sw-next').disabled) return; clearTimeout(nextT);
  if(S.q.choices[S.picked].ok) afterRight(); else newQ(); }
/* back to the fight. A launch that follows a right answer clears the enemy shots around the ship and gives a second of cover;
   during the Mothership fight each banked right answer also fires an Overcharge bolt, so the math lands the big hits */
function launch(){ if(!S.started||S.over||draftOpen()||S.fuel<=0.05||!$('sw-confirm').hidden) return; if(cardOpen()&&S.qDone&&S.q.choices[S.picked].ok&&S.sinceDraft>=CFG.draftEvery&&draftPool().length){ openDraft(); return; }
  closeCard(); frozen=false; resumeAt=cardGood?gt+0.45:gt; letGo();
  if(cardGood){ shots=[]; ship.safeUntil=Math.max(ship.safeUntil,gt+1.45); ring(ship.x,SHIP_Y,'#3DE0FF',320,0.45); SND.launch();
    if(boss&&!boss.dead&&boss.enter>=1){ overcharge(Math.min(4,banked)); } }
  banked=0; cardGood=false; save(); hud(); }
$('sw-choices').addEventListener('click',function(e){ var b=e.target.closest('.sw-ch'); if(b) answer(+b.dataset.i); });
$('sw-next').addEventListener('click',nextOrLaunch);
$('sw-launch').addEventListener('click',launch);

/* ================= UPGRADE PICK: three cards, keys 1-3 ================= */
var draftSet=[], draftAt=0;
function draftPool(){ return CARDS.filter(function(c){ return L(c.id)<3; }); }
function openDraft(){ var pool=draftPool().sort(function(){ return Math.random()-0.5; }); draftSet=pool.slice(0,3); draftAt=now();
  closeCard(); frozen=true; $('sw-dim').hidden=false; $('sw-draft').hidden=false;
  $('sw-cards').innerHTML=draftSet.map(function(c,i){ var l=L(c.id);
    return '<button class="sw-card" data-i="'+i+'"><span class="k">'+(i+1)+'</span><canvas width="120" height="120" data-icon="'+c.id+'"></canvas><span class="n">'+c.name+'</span><span class="d">'+c.d[l]+'</span>'+
      '<span class="sw-pips">'+[0,1,2].map(function(k){ return '<span class="'+(k<=l?'on':'')+'"></span>'; }).join('')+'</span></button>'; }).join('');
  $('sw-cards').querySelectorAll('canvas').forEach(function(cn){ drawIcon(cn.getContext('2d'),cn.dataset.icon); });
  SND.goal(); save(); }
function pickCard(i){ if(!draftOpen()||now()-draftAt<350) return; var c=draftSet[i]; if(!c) return; S.lv[c.id]=Math.min(3,L(c.id)+1); S.picks++; S.sinceDraft=0;
  if(c.id==='shield') ship.shield=1;
  $('sw-draft').hidden=true; SND.power(); toast(c.name+(S.lv[c.id]>1?' level '+S.lv[c.id]:'')+'!'); confetti(960,560,70,2.6);
  if(S.fuel>=tankMax()-0.05){ $('sw-dim').hidden=true; cardGood=true; launch(); } else { frozen=false; openCard(); cardGood=true; } save(); }
$('sw-cards').addEventListener('click',function(e){ var b=e.target.closest('.sw-card'); if(b) pickCard(+b.dataset.i); });
