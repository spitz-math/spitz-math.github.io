/* ================= LANTERN PEAK (rooms slice) =================
   Kody picked Celeste as the model (2026-11-16): the climb is a chain of one-screen rooms, each a short hard-but-fair puzzle.
   A thorn or a fall out of the room is an instant retry of that room (no lives, no lost progress beyond the room).
   Chapter 1 teaches jumps, thorns, wall jumps and crumbling rock; its Waystone (questions, world frozen, no clock) gives the
   Ember Dash; chapter 2 is built around the dash and the embers that refill it in the air.
   Kept from the full game: SpitzQ.forGame (hub set + topics), the run save under KEY that scorecode.js watches, the Waystone card
   with its input guard, the kit (music, jingle, confetti, toast, F, Shift+R), SpitzCode.show at the end. */
(function(){
'use strict';
var RP=LPR, PH=RP.PH, T=RP.T, RL=LPROOMS, A=LPART, $=function(id){ return document.getElementById(id); };
var W=960, H=540, F="Fredoka, Lexend, system-ui, sans-serif";
var KEY='lantern_peak_rooms_v1';
var QS=window.SpitzQ?window.SpitzQ.forGame('lp'):null; if(QS) KEY+=QS.suffix;
var SETID=QS?QS.set:'mult', SETINFO=window.SpitzQ&&SpitzQ.sets?SpitzQ.sets[SETID]:null, FAST=!QS||!!(SETINFO&&SETINFO.big);
if(!FAST) document.documentElement.classList.add('sz-alg');
function need(){ return FAST?5:3; }
var RM=matchMedia('(prefers-reduced-motion: reduce)');
var ROOMS=RL.rooms.map(function(d){ return RP.room(d); }), NR=ROOMS.length;

/* ---------------- questions ---------------- */
function ri(a,b){ return a+Math.floor(Math.random()*(b-a+1)); }
function multQ(){ var a=ri(2,12), b=ri(2,12), ans=a*b, seen={}, ch=[{html:''+ans,ok:true,why:''}]; seen[ans]=1;
  [a,-a,b,-b,10,-10,1,-1,2*a].forEach(function(d){ var v=ans+d; if(ch.length<4&&v>0&&!seen[v]){ seen[v]=1; ch.push({html:''+v,ok:false,why:a+' × '+b+' means '+b+' groups of '+a+'.'}); } });
  ch.sort(function(){ return Math.random()-0.5; });
  return { topic:'Multiplication', type:'mult', prompt:'<span class="lp-eq">'+a+' × '+b+' = ?</span>', visual:'', choices:ch, explain:'<span class="lp-eq">'+a+' × '+b+' = <span class="c-ans">'+ans+'</span></span>' }; }
function nextQuestion(){ return QS?QS.next():multQ(); }

/* ---------------- run state ---------------- */
function fresh(){ return { ver:1, name:'', started:false, over:false, score:0, answered:0, correct:0, topics:QS?QS.topicTable():{'Multiplication':[0,0]},
  q:null, qDone:false, picked:-1, room:0, best:0, runes:0, cp:false, reward:false, dash:false, lit:[], deaths:0, playT:0, done:false, early:false, hints:{} }; }
var S=load()||fresh();
function save(){ try{ localStorage.setItem(KEY,JSON.stringify(S)); localStorage.setItem(KEY+'_mute',muted?'1':'0'); }catch(e){} }
function load(){ try{ muted=localStorage.getItem(KEY+'_mute')==='1'; var v=JSON.parse(localStorage.getItem(KEY)||'null'); if(v&&v.ver===1&&v.topics&&Array.isArray(v.lit)) return v; }catch(e){} return null; }
function score(){ return Math.max(0,S.correct*100+S.best*150+(S.done?1000:0)-S.deaths*5); }

/* ---------------- sound ---------------- */
var AC=null, muted=false;
function ac(){ if(!AC){ var C=window.AudioContext||window.webkitAudioContext; if(!C) return null; AC=new C(); } if(AC.state==='suspended') AC.resume(); return AC; }
function tone(f1,f2,t0,dur,type,vol,att){ var a=ac(); if(!a||muted) return; var o=a.createOscillator(), g=a.createGain(), t=a.currentTime+(t0||0); window.__snd=(window.__snd||0)+1;
  o.type=type||'triangle'; o.frequency.setValueAtTime(f1,t); if(f2!==f1) o.frequency.exponentialRampToValueAtTime(f2,t+dur);
  g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(vol,t+(att||0.012)); g.gain.exponentialRampToValueAtTime(0.0001,t+dur); o.connect(g); g.connect(a.destination); o.start(t); o.stop(t+dur+0.05); }
function noise(t0,dur,vol,lp,hp){ var a=ac(); if(!a||muted) return; var n=Math.floor(a.sampleRate*dur), b=a.createBuffer(1,n,a.sampleRate), d=b.getChannelData(0); for(var i=0;i<n;i++) d[i]=(Math.random()*2-1)*(1-i/n);
  var s=a.createBufferSource(), f=a.createBiquadFilter(), g=a.createGain(), t=a.currentTime+(t0||0); s.buffer=b; f.type=hp?'highpass':'lowpass'; f.frequency.value=hp||lp||800; g.gain.value=vol; s.connect(f); f.connect(g); g.connect(a.destination); s.start(t); }
var SND={
  jump:function(){ tone(300,470,0,0.11,'triangle',0.045); },
  wall:function(){ tone(360,560,0,0.1,'triangle',0.045); noise(0,0.06,0.02,0,1600); },
  land:function(){ tone(150,80,0,0.07,'sine',0.06); },
  dash:function(){ tone(260,620,0,0.14,'triangle',0.05); noise(0,0.14,0.03,0,1500); },
  ember:function(){ tone(784,1175,0,0.18,'triangle',0.05); tone(1568,1568,0.03,0.12,'sine',0.02); },
  crack:function(){ noise(0,0.09,0.05,1200); },
  crumble:function(){ noise(0,0.25,0.06,450); tone(160,90,0,0.2,'sine',0.04); },
  die:function(){ tone(392,196,0,0.22,'triangle',0.06); noise(0,0.12,0.03,900); },
  respawn:function(){ tone(392,784,0,0.2,'sine',0.04); },
  room:function(){ tone(523.25,523.25,0,0.25,'triangle',0.035); tone(659.25,659.25,0.07,0.3,'triangle',0.03); },
  correct:function(){ tone(523.25,523.25,0,0.22,'triangle',0.12); tone(659.25,659.25,0.09,0.22,'triangle',0.11); tone(783.99,783.99,0.18,0.36,'triangle',0.11); },
  miss:function(){ tone(311.13,311.13,0,0.22,'triangle',0.09); tone(261.63,261.63,0.13,0.32,'triangle',0.08); },
  rune:function(i){ var f=[659.25,783.99,880,1046.5,1174.66][Math.min(4,i)]; tone(f,f,0.32,0.6,'sine',0.05); },
  open:function(){ [196,293.66,392,587.33].forEach(function(f,i){ tone(f,f,i*0.12,1.2,'triangle',0.07); }); noise(0,0.9,0.03,300); },
  unlock:function(){ [523.25,659.25,783.99,1046.5].forEach(function(f,i){ tone(f,f,i*0.11,0.5,'triangle',0.1); tone(f/2,f/2,i*0.11,0.5,'sine',0.04); }); },
  finish:function(){ [392,523.25,659.25,783.99,1046.5].forEach(function(f,i){ tone(f,f,i*0.13,0.7,'triangle',0.11); }); tone(261.63,261.63,0.6,1.4,'sine',0.06); },
  pause:function(){ tone(440,330,0,0.12,'sine',0.04); }
};
var CH=[[146.83,[293.66,369.99,440,587.33]],[123.47,[246.94,293.66,369.99,493.88]],[98,[196,246.94,293.66,392]],[110,[220,277.18,329.63,440]]], ROLL=[0,1,2,3,2,1,2,1];
var SONG={ level:0.085, echo:0.27, want:function(){ return !!S&&S.started&&!S.over; }, busy:function(){ return mode==='play'; }, sd:function(){ return 60/104/2; },
  voice:function(f,t0,dur){ tone(f,f,t0,dur,'triangle',0.12); },
  step:function(ctx,g,i,t,sd){ var bar=Math.floor(i/8), c=CH[bar%4], k=i%8;
    if(k===0) KIT.mNote(ctx,g.out,'sine',c[0],t,sd*5,0.16,600,null);
    if(k===4) KIT.mNote(ctx,g.out,'sine',c[0]*1.5,t,sd*3,0.1,600,null);
    KIT.mNote(ctx,g.act,'triangle',c[1][ROLL[k]],t,sd*1.6,0.035,2600,(k===3||k===7)?g.echo:null); } };
var KIT=SpitzKit.game({ ac:function(){ return AC; }, muted:function(){ return muted; }, song:function(){ return SONG; }, confetti:'lp-confetti', toast:'lp-toast', toastMs:2000,
  colors:['#FFC23D','#2EC4B6','#E8553D','#FF9A3C','#F3E9D8','#86B86A','#FFFFFF'] });
KIT.musBtn();

/* ---------------- canvas ---------------- */
var cv=$('lp-cv'), cx=cv.getContext('2d');
var PIX=window.LPPIX||null, HERO=null, BG1=null;
if(PIX){ HERO=new Image(); HERO.src=PIX.hero; BG1=new Image(); BG1.src=PIX.bg1; }
function ready(im){ return im&&im.complete&&im.naturalWidth>0; }
function fit(){ var s=Math.min(innerWidth/1920,innerHeight/1080), st=$('stage').style; st.transform='scale('+s+')'; st.left=((innerWidth-1920*s)/2)+'px'; st.top=((innerHeight-1080*s)/2)+'px'; }
addEventListener('resize',fit);

/* ---------------- world ---------------- */
var R=ROOMS[0], P=RP.fresh(R.sx,R.sy), rt=0, gt=0, mode='title', modeT=0;   // modes: title, play, dead, slide, cp, reward, pause, finish, end
var dust=[], sparks=[], ghosts=[], shake=0, sq=0, lastLandT=0, slideFrom=null, slideDir='up';
function enter(i,keepP){ S.room=i; R=ROOMS[i]; RP.reset(R); rt=0; R.exit=(R.way&&S.lit.indexOf(i)<0)?'none':(R.lantern?'none':RL.rooms[i].exit);
  R.noDash=!S.dash; if(!keepP){ P=RP.fresh(R.sx,R.sy); P.onG=true; } ghosts.length=0; showRoom(); save(); }

/* ---------------- input ---------------- */
var held={}, blocked={}, downKeys={}, jumpEdge=false, dashEdge=false, ptrDownAt=0, qShownAt=0, answeredAt=0, panelAt=0;
function act(k){ return ({arrowleft:'l',a:'l',arrowright:'r',d:'r',arrowup:'u',w:'u',arrowdown:'dn',s:'dn',' ':'j',z:'j',j:'j',x:'ds',c:'ds',k:'ds',shift:'ds'})[k]; }
function blockHeld(){ Object.keys(downKeys).forEach(function(k){ blocked[k]=true; }); held={}; jumpEdge=dashEdge=false; P.buf=0; }
function inp(){ return { l:!!held.l, r:!!held.r, u:!!held.u, d:!!held.dn, jumpHeld:!!held.j, jumpPressed:jumpEdge, dashPressed:dashEdge }; }
addEventListener('pointerdown',function(){ ptrDownAt=performance.now(); ac(); },true);
addEventListener('blur',function(){ held={}; downKeys={}; if(mode==='play') pause(true); });
document.addEventListener('visibilitychange',function(){ if(document.hidden&&mode==='play') pause(true); });
document.addEventListener('keydown',function(e){
  var k=(e.key||'').toLowerCase(); downKeys[k]=1; var typing=document.activeElement===$('lp-name');
  if(typing){ if(k==='enter'&&!$('lp-go').disabled){ e.preventDefault(); start(); } return; }
  if(!$('sz-ask').hidden){ e.preventDefault(); if(k==='y') askYes(); else if(k==='n'||k==='escape') askNew(false); return; }
  if(k==='r'&&e.shiftKey){ e.preventDefault(); if(S.started&&!S.over) askNew(true); return; }
  if(e.ctrlKey||e.metaKey||e.altKey) return;
  if(k==='f'){ e.preventDefault(); fullscreen(); return; }
  if(k==='n'){ e.preventDefault(); KIT.musicToggle(); pauseLabels(); return; }
  if(k==='m'){ e.preventDefault(); muted=!muted; save(); KIT.toast(muted?'Sound off':'Sound on'); pauseLabels(); return; }
  if(k==='escape'||k==='p'){ e.preventDefault(); if(mode==='pause') pause(false); else if(mode==='play'||mode==='cp'||mode==='reward') pause(true); return; }
  if(mode==='cp'){ e.preventDefault(); if(e.repeat||blocked[k]) return; if(/^[1-4]$/.test(k)) answer(+k-1,'key'); else if(k==='enter') cont('key'); return; }
  if(mode==='reward'){ e.preventDefault(); if(!e.repeat&&!blocked[k]&&k==='enter'&&performance.now()-panelAt>600) closeReward(); return; }
  if(mode==='end'){ if(k==='enter'&&!e.repeat&&performance.now()-panelAt>1200){ e.preventDefault(); newRun(); } return; }
  var a=act(k); if(!a) return; e.preventDefault(); if(blocked[k]) return;
  if(!held[a]&&!e.repeat){ if(a==='j') jumpEdge=true; if(a==='ds') dashEdge=true; }
  held[a]=true; });
document.addEventListener('keyup',function(e){ var k=(e.key||'').toLowerCase(); delete blocked[k]; delete downKeys[k]; var a=act(k); if(a) held[a]=false; });

/* ---------------- flow ---------------- */
function setMode(m){ mode=m; modeT=0; $('lp-hud').hidden=!(m==='play'||m==='dead'||m==='slide'||m==='finish'||m==='cp'||m==='reward'||m==='pause'); }
function start(){ var n=$('lp-name').value.trim().replace(/\s+/g,' '); if(!n) return; ac();
  if(!S.started){ S=fresh(); S.name=n; S.started=true; }
  save(); $('lp-start').hidden=true; KIT.jingle(); enter(S.room); hud(); setMode('play'); showChapter(true);
  if(S.cp) setTimeout(openCP,50); else if(S.reward) setTimeout(function(){ S.reward=false; openReward(); },50); }
function pause(o){ if(o){ if(mode==='pause') return; pauseFrom=mode; setMode('pause'); $('lp-pause').hidden=false; $('lp-pausewhere').textContent=RL.chapters[R.ch].name+' · room '+(S.room+1)+' of '+NR+' · '+S.deaths+' retr'+(S.deaths===1?'y':'ies'); pauseLabels(); moveList(); SND.pause(); blockHeld(); }
  else { if(mode!=='pause') return; $('lp-pause').hidden=true; setMode(pauseFrom||'play'); blockHeld(); if(mode==='cp') qShownAt=performance.now(); } }
var pauseFrom='play';
function pauseLabels(){ $('lp-pmute').textContent='Sound: '+(muted?'off':'on')+'  (M)'; $('lp-pmusic').textContent='Music: '+(KIT.musicOff()?'off':'on')+'  (N)'; }
$('lp-pausebtn').addEventListener('click',function(){ if(mode==='play') pause(true); });
$('lp-resume').addEventListener('click',function(){ pause(false); });
$('lp-pmute').addEventListener('click',function(){ muted=!muted; save(); pauseLabels(); });
$('lp-pmusic').addEventListener('click',function(){ KIT.musicToggle(); pauseLabels(); });
$('lp-prestart').addEventListener('click',function(){ askNew(true); });
$('lp-pend').addEventListener('click',function(){ askNew(true,'end'); });
function moveList(){ var h='<span><kbd>←</kbd><kbd>→</kbd> Run</span><span><kbd>Space</kbd>, <kbd>Z</kbd> or <kbd>J</kbd> Jump</span><span>Jump at a wall: wall jump</span>'; if(S.dash) h+='<span><kbd>Shift</kbd>, <kbd>X</kbd> or <kbd>K</kbd> Dash (aim with your move keys)</span>'; $('lp-moves').innerHTML=h; }
var askKind='new';
function askNew(o,kind){ if(o){ askKind=kind||'new'; var e=askKind==='end';
    $('sz-asktitle').textContent=e?'Stop here?':'Start a new game?'; $('lp-asksub').textContent=e?'Your climb ends here and you get your score.':'Your climb so far will be lost.';
    $('sz-askyes').textContent=e?'Yes, show my score (Y)':'Yes, new game (Y)'; }
  $('sz-ask').hidden=!o; if(o&&mode==='play') pause(true); }
function askYes(){ if(askKind==='end') endEarly(); else newRun(); }
function endEarly(){ $('sz-ask').hidden=true; $('lp-pause').hidden=true; $('lp-cp').hidden=true; S.over=true; S.early=true; S.cp=false; showEnd(); }
$('sz-askyes').addEventListener('click',askYes); $('sz-askno').addEventListener('click',function(){ askNew(false); });
function newRun(){ var n=S.name; S=fresh(); S.name=n; try{ localStorage.setItem(KEY,JSON.stringify(S)); }catch(e){} location.reload(); }
$('lp-again').addEventListener('click',newRun);
function fullscreen(){ var d=document, e=d.documentElement; if(d.fullscreenElement||d.webkitFullscreenElement) (d.exitFullscreen||d.webkitExitFullscreen).call(d); else (e.requestFullscreen||e.webkitRequestFullscreen||function(){}).call(e); }
$('lp-name').addEventListener('input',function(){ $('lp-go').disabled=!this.value.trim(); });
$('lp-go').addEventListener('click',start);

/* ---------------- HUD ---------------- */
var lastCh=-1, zoneT=0;
function showChapter(force){ if(!force&&R.ch===lastCh) return; lastCh=R.ch; var el=$('lp-zone'); el.innerHTML='<small>Chapter '+(R.ch+1)+'</small>'+RL.chapters[R.ch].name; el.classList.add('on'); clearTimeout(zoneT); zoneT=setTimeout(function(){ el.classList.remove('on'); },2400); }
function showRoom(){ hud(); showChapter(false); var h=RL.rooms[S.room].hint; if(h&&!(S.hints['r'+S.room])) hint(h,'r'+S.room); else hint(null); }
function hud(){ var c=$('lp-hpchip'); c.innerHTML='<span style="font:600 26px/1 var(--body);color:var(--muted)">Room</span> '+(S.room+1)+'<span style="color:var(--muted)">/'+NR+'</span>'; c.style.gap='10px'; c.style.padding='0 20px';
  var e=$('lp-embchip'); e.hidden=false; e.title='Retries'; e.innerHTML='<span style="font:600 26px/1 var(--body);color:var(--muted)">Retries</span> '+S.deaths;
  $('lp-fchip').hidden=true; $('lp-ab-dj').hidden=true; $('lp-ab-gl').hidden=true; $('lp-ab-ds').hidden=!S.dash; $('lp-ab-ds').classList.toggle('empty',S.dash&&!P.dashOk); }
function pop(id){ var e=$(id); e.classList.remove('pop'); void e.offsetWidth; e.classList.add('pop'); }
var hintKey='';
function hint(html,key){ var el=$('lp-hint'); if(!html){ el.classList.remove('on'); hintKey=''; return; } if(hintKey===key) return; hintKey=key; el.innerHTML=html; el.classList.add('on'); }

/* ---------------- the Waystone ---------------- */
var words={ title:'The Waystone', unit:'rune', goal:'to learn the Ember Dash', ok:'Correct! A rune lights up.', bad:'Not quite. No rune this time.', go:'Learn the dash ', note:'The Waystone is ready!', all:'Every rune is lit!' };
function runes(){ var h='', NEED=need(); $('lp-cptitle').textContent=words.title; for(var i=0;i<NEED;i++){ var on=i<S.runes; h+='<svg class="lp-rune" viewBox="0 0 58 58"><circle cx="29" cy="29" r="24" fill="'+(on?'#FFC23D':'#3A2D50')+'" stroke="#2A1B2E" stroke-width="4"/>'+(on?'<path d="M29 15l4 10 10 4-10 4-4 10-4-10-10-4 10-4z" fill="#FFF1C2"/>':'<circle cx="29" cy="29" r="6" fill="#5D6178"/>')+'</svg>'; }
  $('lp-runes').innerHTML=h; var left=NEED-S.runes; $('lp-cpsub').textContent=left>0?'Light '+left+' more rune'+(left>1?'s':'')+' '+words.goal:words.all; }
function openCP(){ S.cp=true; setMode('cp'); blockHeld(); P.vx=0; $('lp-cp').hidden=false; $('lp-card').hidden=false; $('lp-reward').hidden=true; hint(null);
  if(!S.q||(S.qDone&&S.runes<need()&&!keepAnswered)){ newQ(); } else showQ(); keepAnswered=false; save(); }
var keepAnswered=true;
function newQ(){ S.q=nextQuestion(); S.qDone=false; S.picked=-1; save(); showQ(); }
function showQ(){ var q=S.q; runes(); $('lp-tag').textContent=q.topic;
  $('lp-prompt').innerHTML=q.prompt; $('lp-visual').innerHTML=q.visual||''; $('lp-q').classList.toggle('vis',!!q.visual);
  $('lp-choices').innerHTML=q.choices.map(function(c,i){ return '<button class="lp-ch" data-i="'+i+'"><span class="k">'+(i+1)+'</span><span class="t">'+c.html+'</span></button>'; }).join('');
  var fb=$('lp-fb'); fb.hidden=true; fb.className='lp-fb'; fb.innerHTML=''; $('lp-next').hidden=true;
  $('lp-cpnote').textContent='Press 1, 2, 3 or 4, or click an answer. Take your time: the mountain waits.';
  qShownAt=performance.now(); if(S.qDone) mark(S.picked,false); }
function mark(i){ var q=S.q, c=q.choices[i], btns=$('lp-choices').querySelectorAll('.lp-ch'), fb=$('lp-fb'), NEED=need();
  btns.forEach(function(b,j){ b.disabled=true; if(q.choices[j].ok) b.classList.add('right'); });
  if(btns[i]){ if(!c.ok) btns[i].classList.add('wrong'); btns[i].insertAdjacentHTML('beforeend','<span class="mine">Your answer</span>'); }
  fb.hidden=false;
  if(c.ok){ fb.className='lp-fb ok'; fb.innerHTML='<span class="h">'+words.ok+'</span>'+q.explain; }
  else { fb.className='lp-fb bad'; fb.innerHTML='<span class="h">'+words.bad+'</span>'+(c.why?c.why+'<br>':'')+q.explain; }
  var left=NEED-S.runes;
  $('lp-cpnote').textContent=c.ok?(left>0?left+' more to go.':words.note):'Read how it works, then try a new question. Nothing is lost.';
  var nx=$('lp-next'); nx.hidden=false; nx.firstChild.textContent=(c.ok&&left<=0)?words.go:(c.ok?'Next question ':'Try a new question '); }
function answer(i,how){ if(mode!=='cp'||S.qDone||!S.q) return; var now=performance.now();
  if(now-qShownAt<450) return; if(how==='click'&&ptrDownAt<qShownAt) return;
  var c=S.q.choices[i]; if(!c) return;
  S.qDone=true; S.picked=i; S.answered++; var tp=S.topics[S.q.topic]||(S.topics[S.q.topic]=[0,0]); tp[1]++;
  if(c.ok){ S.correct++; tp[0]++; S.runes++; SND.correct(); SND.rune(S.runes-1); var b=$('lp-choices').querySelectorAll('.lp-ch')[i]; if(b){ var p=KIT.stagePoint(b,80,40); KIT.confetti(p[0],p[1],RM.matches?14:26,1.6); } }
  else SND.miss();
  answeredAt=now; save(); mark(i); runes(); }
function cont(){ if(mode!=='cp'||!S.qDone) return; if(performance.now()-answeredAt<400) return;
  if(S.runes>=need()){ S.cp=false; S.q=null; S.qDone=false; S.picked=-1; S.runes=0; S.lit.push(S.room); S.dash=true; R.noDash=false; R.exit=RL.rooms[S.room].exit; P.dashOk=true;
    $('lp-cp').hidden=true; blockHeld(); SND.open(); save(); openReward(); return; }
  newQ(); }
$('lp-choices').addEventListener('click',function(e){ var b=e.target.closest('.lp-ch'); if(b) answer(+b.dataset.i,'click'); });
$('lp-next').addEventListener('click',function(){ if(ptrDownAt<answeredAt+1) return; cont('click'); });
function openReward(){ $('lp-rwname').textContent='Ember Dash'; $('lp-rwtext').innerHTML='Press <b>Shift</b>, <b>X</b> or <b>K</b> to dash. Hold a direction to aim it: sideways, up, down or diagonal.<br>One dash per jump. Landing, or touching an ember, gives it back.';
  document.querySelector('#lp-reward .eyebrow').textContent='The Waystone is lit · new move';
  setMode('reward'); $('lp-cp').hidden=false; $('lp-card').hidden=true; $('lp-reward').hidden=false; panelAt=performance.now(); SND.unlock(); KIT.confetti(960,420,RM.matches?40:90,2.4); hud(); pop('lp-ab-ds'); demoT=0; }
function closeReward(){ S.reward=false; save(); $('lp-cp').hidden=true; setMode('play'); blockHeld(); hint('<kbd>Shift</kbd>, <kbd>X</kbd> or <kbd>K</kbd> Dash · hold a direction to aim it','dashhint'); }
$('lp-try').addEventListener('click',function(){ if(performance.now()-panelAt>600&&ptrDownAt>panelAt) closeReward(); });

/* ---------------- play ---------------- */
var FIX=1/120, acc=0;
function update(dt){
  modeT+=dt; gt+=dt;
  stepFx(dt);
  if(mode==='dead'){ if(modeT>0.5){ RP.reset(R); P=RP.fresh(R.sx,R.sy); P.onG=true; rt=0; SND.respawn(); setMode('play'); } return; }
  if(mode==='slide'){ if(modeT>0.42){ slideFrom=null; setMode('play'); } return; }
  if(mode==='finish'){ if(modeT>2.6&&!$('lp-end').offsetParent) showEnd(); return; }
  if(mode!=='play') return;
  S.playT+=dt; acc+=dt; var n=0;
  while(acc>=FIX&&n<10){ acc-=FIX; n++; rt+=FIX; RP.step(P,inp(),FIX,R,rt); jumpEdge=false; dashEdge=false; events(); if(mode!=='play') break;
    if(P.dashT>0&&(n%2)) ghosts.push({x:P.x,y:P.y,face:P.face,t:0.22}); }
  if(acc>FIX) acc=FIX;
  if(mode!=='play') return;
  if(R.way&&S.lit.indexOf(S.room)<0&&P.onG&&Math.abs(P.x-R.way.x)<40){ openCP(); return; }
  if(R.lantern&&P.onG&&Math.abs(P.x-R.lantern.x)<40){ finish(); return; }
  hud();
}
function events(){ P.ev.forEach(function(e){
  if(e==='jump'){ SND.jump(); sq=-0.3; puff(P.x,P.y,4,'#F3E9D8'); S.hints['r'+S.room]=1; }
  else if(e==='walljump'){ SND.wall(); puff(P.x-P.face*12,P.y-20,5,'#F3E9D8'); S.hints['r'+S.room]=1; }
  else if(e==='dash'){ SND.dash(); puff(P.x,P.y-20,5,'#FF9A3C'); if(!RM.matches) shake=0.06; S.hints['r'+S.room]=1; }
  else if(e==='land'){ if(gt-lastLandT>0.08) SND.land(); lastLandT=gt; sq=0.3; puff(P.x,P.y,4,'#F3E9D8'); }
  else if(e==='ember'){ SND.ember(); sparkle(P.x,P.y-20,10,'#FFC23D'); }
  else if(e==='crack') SND.crack();
  else if(e==='crumble') SND.crumble();
  else if(e==='die') die();
  else if(e==='exit') nextRoom();
}); }
function die(){ S.deaths++; SND.die(); for(var i=0;i<14;i++){ var a=i/14*Math.PI*2; sparks.push({x:P.x,y:P.y-20,vx:Math.cos(a)*260,vy:Math.sin(a)*260,t:0,max:0.5,col:i%2?'#FFC23D':'#2EC4B6'}); }
  if(!RM.matches) shake=0.15; setMode('dead'); save(); }
function nextRoom(){ var from=S.room, dir=RL.rooms[from].exit; slideFrom={ room:R, p:{x:P.x,y:P.y,face:P.face}, dir:dir };
  enter(from+1); if(S.room>S.best) S.best=S.room; SND.room(); setMode('slide'); save(); }
function finish(){ S.done=true; S.over=true; S.cp=false; S.best=NR; S.score=score(); save(); SND.finish(); KIT.confetti(960,300,RM.matches?60:140,2.6); setMode('finish'); hint(null); }
function stars(){ return [ [S.done,'reached the Lookout'], [S.answered>0&&S.correct/S.answered>=0.9,'90% right'], [S.done&&S.deaths<=25,'25 retries or fewer'], [S.done&&S.playT<=300,'under 5 minutes'] ]; }
function showEnd(){ setMode('end'); panelAt=performance.now(); $('lp-hud').hidden=true; S.score=score(); save();
  var t=Math.round(S.playT), mm=Math.floor(t/60), ss=('0'+t%60).slice(-2);
  $('lp-endtitle').textContent=S.done?'You reached the Lookout!':'Climb ended in room '+(S.room+1); $('lp-endtitle').style.fontSize=S.done?'88px':'68px';
  $('lp-endclimb').innerHTML=RL.chapters.map(function(c,i){ var last=-1; ROOMS.forEach(function(r,j){ if(r.ch===i) last=j; }); var ok=S.done||S.best>last; return '<span style="'+(ok?'':'color:var(--muted)')+'">'+c.name+(ok?' ✓':'')+'</span>'; }).join('<span style="color:var(--muted)">›</span>');
  $('lp-endname').textContent=S.name+' · '+mm+':'+ss+' · '+S.deaths+' retr'+(S.deaths===1?'y':'ies');
  var st=[[S.correct+' of '+S.answered,'questions right'],[Math.min(NR,S.done?NR:S.best)+' / '+NR,'rooms cleared'],[S.deaths+'','retries'],[mm+':'+ss,'time']];
  $('lp-stats').innerHTML=st.map(function(s){ return '<div class="lp-stat"><b>'+s[0]+'</b><span>'+s[1]+'</span></div>'; }).join('');
  var sr=stars(), got=sr.filter(function(x){ return x[0]; }).length;
  $('lp-stars').innerHTML='<b>'+'★'.repeat(got)+'☆'.repeat(4-got)+'</b> &nbsp;'+sr.map(function(x){ return '<i class="'+(x[0]?'on':'')+'">'+x[1]+'</i>'; }).join(' · ');
  $('lp-endscore').textContent=S.score.toLocaleString(); $('lp-end').hidden=false;
  if(window.SpitzCode) setTimeout(function(){ window.SpitzCode.show('lp','starter',S); },0); }

/* ---------------- effects ---------------- */
function puff(x,y,n,col){ if(RM.matches) n=Math.min(n,2); for(var i=0;i<n;i++) dust.push({x:x+(Math.random()-0.5)*16,y:y-2,vx:(Math.random()-0.5)*120,vy:-20-Math.random()*50,t:0,max:0.35+Math.random()*0.2,r:3+Math.random()*3,col:col}); }
function sparkle(x,y,n,col){ for(var i=0;i<n;i++){ var a=Math.random()*Math.PI*2, s=60+Math.random()*120; sparks.push({x:x,y:y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-60,t:0,max:0.5+Math.random()*0.3,col:col}); } }
function stepFx(dt){ dust=dust.filter(function(d){ d.t+=dt; d.x+=d.vx*dt; d.y+=d.vy*dt; d.vx*=0.9; d.vy*=0.92; return d.t<d.max; });
  sparks=sparks.filter(function(s){ s.t+=dt; s.x+=s.vx*dt; s.y+=s.vy*dt; s.vy+=300*dt; return s.t<s.max; });
  ghosts=ghosts.filter(function(g){ g.t-=dt; return g.t>0; }); if(shake>0) shake-=dt; sq*=Math.pow(0.0005,dt); if(Math.abs(sq)<0.01) sq=0; }

/* ---------------- drawing ---------------- */
/* each chapter's look: sky bands, rock, its top (grass or moss), outline */
var LOOK=[ { sky:['#93C6CF','#BBD8C8','#E8DCAE','#F3C990','#F2B47C'], rock:'#6E5B4A', rock2:'#5E4D3F', top:'#7DB45E', top2:'#5E9A4A', line:'#2A1B2E', far:'#8DAE8C' },
           { sky:['#6F8CB8','#9E9BC0','#D9A2A8','#EEAE8E','#F4C381'], rock:'#6B6A8E', rock2:'#5A5979', top:'#9FB6C9', top2:'#7F96AB', line:'#2A1B2E', far:'#8C8AAE' } ];
var ROOMC={};
function roomCanvas(i){ if(ROOMC[i]) return ROOMC[i]; var r=ROOMS[i], L=LOOK[r.ch], c=document.createElement('canvas'); c.width=W; c.height=H; var g=c.getContext('2d'); g.imageSmoothingEnabled=false;
  /* sky */
  for(var b=0;b<5;b++){ g.fillStyle=L.sky[b]; g.fillRect(0,b*H/5-1,W,H/5+2); }
  if(r.ch===0&&ready(BG1)){ g.globalAlpha=0.9; g.drawImage(BG1,0,0,W,H); g.globalAlpha=1; }
  else { g.fillStyle=L.far; for(var k=0;k<6;k++){ var px=k*190-40, ph=180+((k*73)%90); g.beginPath(); g.moveTo(px,H); g.lineTo(px+95,H-ph); g.lineTo(px+190,H); g.fill(); }
    g.fillStyle='rgba(255,255,255,.35)'; for(k=0;k<3;k++){ g.fillRect(140+k*300,0,6,H); g.fillRect(150+k*300,0,2,H); } }
  /* rock and ledges */
  var M=r.map, sol=function(x,y){ var ch=RP.tileAt(r,x,y); return ch==='#'; };
  for(var y=0;y<18;y++) for(var x=0;x<32;x++){ var ch=M[y][x], X=x*T, Y=y*T;
    if(ch==='#'){ g.fillStyle=((x*7+y*13)%5===0)?L.rock2:L.rock; g.fillRect(X,Y,T,T);
      g.fillStyle='rgba(255,255,255,.06)'; if((x+y)%3===0) g.fillRect(X+6,Y+8,8,4);
      g.fillStyle=L.line; if(!sol(x,y-1)) g.fillRect(X,Y,T,3); if(!sol(x,y+1)) g.fillRect(X,Y+T-3,T,3); if(!sol(x-1,y)) g.fillRect(X,Y,3,T); if(!sol(x+1,y)) g.fillRect(X+T-3,Y,3,T);
      if(!sol(x,y-1)&&y>0){ g.fillStyle=L.top; g.fillRect(X,Y+3,T,6); g.fillStyle=L.top2; g.fillRect(X+((x*11)%3)*8,Y+9,6,4); } }
    else if(ch==='='){ g.fillStyle='#C68A52'; g.fillRect(X,Y,T,10); g.fillStyle=L.line; g.fillRect(X,Y,T,2); g.fillRect(X,Y+10,T,2); g.fillStyle='#9A6A3C'; g.fillRect(X+T/2-1,Y+2,2,8); }
    else if('^v<>'.indexOf(ch)>=0) spike(g,ch,X,Y); }
  return ROOMC[i]=c; }
function spike(g,ch,X,Y){ g.save(); g.translate(X+15,Y+15); g.rotate({'^':0,'>':Math.PI/2,'v':Math.PI,'<':-Math.PI/2}[ch]); g.fillStyle='#7B2D5B'; g.strokeStyle='#2A1B2E'; g.lineWidth=2;
  for(var i=0;i<3;i++){ g.beginPath(); g.moveTo(-15+i*10,15); g.lineTo(-10+i*10,-1); g.lineTo(-5+i*10,15); g.closePath(); g.fill(); g.stroke(); } g.fillStyle='#E8C9D8'; for(i=0;i<3;i++) g.fillRect(-11+i*10,2,2,4); g.restore(); }
function drawRoom(c,r,ox,oy,t,live){ var i=ROOMS.indexOf(r); c.drawImage(roomCanvas(i),ox,oy);
  var L=LOOK[r.ch];
  /* crumbling rock */
  for(var y=0;y<18;y++) for(var x=0;x<32;x++) if(r.map[y][x]==='c'){ var s=live&&r.cr[x+','+y], X=ox+x*T, Y=oy+y*T, gone=s&&s.gone!==undefined, shk=s&&s.t!==undefined&&!gone;
    if(gone){ var ft=rt-s.gone; if(ft<0.4){ c.globalAlpha=1-ft/0.4; Y+=ft*ft*500; } else { c.globalAlpha=0.25; c.strokeStyle='#FFF6E8'; c.setLineDash([4,4]); c.strokeRect(X+3,Y+3,T-6,T-6); c.setLineDash([]); c.globalAlpha=1; continue; } }
    if(shk&&!RM.matches) X+=Math.sin(gt*70)*1.5;
    c.fillStyle='#A88A6A'; c.fillRect(X,Y,T,T); c.fillStyle=L.line; c.fillRect(X,Y,T,3); c.fillRect(X,Y+T-3,T,3); c.fillRect(X,Y,3,T); c.fillRect(X+T-3,Y,3,T);
    c.fillRect(X+8,Y+6,2,10); c.fillRect(X+10,Y+14,8,2); c.fillRect(X+18,Y+14,2,9); c.globalAlpha=1; }
  /* embers that refill the dash */
  r.orbs.forEach(function(o,k){ var gone=live&&o.gone!==undefined&&rt<o.gone+PH.EMBERBACK; var X=ox+o.x, Y=oy+o.y+(RM.matches?0:Math.sin(t*2.6+k)*3);
    if(gone){ c.globalAlpha=0.3; c.strokeStyle='#FFC23D'; c.lineWidth=2; c.beginPath(); c.arc(X,Y,10,0,7); c.stroke(); c.globalAlpha=1; return; }
    c.fillStyle='rgba(255,194,61,.25)'; c.beginPath(); c.arc(X,Y,18,0,7); c.fill(); c.save(); c.translate(X,Y+3); A.ember(c,0,0,1.15,RM.matches?0:t); c.restore(); });
  /* the Waystone and the summit lantern */
  if(r.way){ var lit=S.lit.indexOf(i)>=0?need():(S.room===i?S.runes:0); A.waystone(c,ox+r.way.x,oy+r.way.y,lit,need(),t,S.lit.indexOf(i)<0); }
  if(r.lantern){ A.camp(c,ox+r.lantern.x-12,oy+r.lantern.y,S.done,t); }
}
function render(){ var c=cx, t=gt; c.setTransform(1,0,0,1,0,0); c.imageSmoothingEnabled=false;
  var ox=shake>0?(Math.random()-0.5)*5:0, oy=shake>0?(Math.random()-0.5)*5:0;
  c.save(); c.translate(ox,oy);
  if(mode==='slide'&&slideFrom){ var k=Math.min(1,modeT/0.4), e=k<0.5?2*k*k:1-Math.pow(-2*k+2,2)/2, dx=0, dy=0;
    if(slideFrom.dir==='up') dy=H*e; else if(slideFrom.dir==='right') dx=-W*e; else dx=W*e;
    drawRoom(c,slideFrom.room,dx,dy,t,false); drawRoom(c,R,dx+(slideFrom.dir==='right'?W:slideFrom.dir==='left'?-W:0),dy-(slideFrom.dir==='up'?H:0),t,true);
    c.restore(); return; }
  drawRoom(c,R,0,0,t,true);
  dust.forEach(function(d){ c.globalAlpha=1-d.t/d.max; c.fillStyle=d.col; c.fillRect(d.x-d.r/2,d.y-d.r/2,d.r,d.r); }); c.globalAlpha=1;
  if(ready(HERO)&&!RM.matches) ghosts.forEach(function(g){ c.globalAlpha=0.45*g.t/0.22; spriteHero(c,'run',g.x,g.y,g.face); }); c.globalAlpha=1;
  if(mode!=='dead'&&mode!=='title') drawHero(c);
  sparks.forEach(function(s){ c.globalAlpha=1-s.t/s.max; c.fillStyle=s.col; c.fillRect(s.x-3,s.y-3,6,6); }); c.globalAlpha=1;
  c.restore();
  if(mode==='dead'){ var a=modeT<0.25?modeT/0.25:1-(modeT-0.25)/0.25; c.fillStyle='rgba(27,20,38,'+(0.6*Math.max(0,Math.min(1,a)))+')'; c.fillRect(0,0,W,H); }
  if(mode==='title'){ c.fillStyle='rgba(18,13,26,.35)'; c.fillRect(0,0,W,H); }
}
var runPh=0;
function drawHero(c){ if(P.onG) runPh+=Math.abs(P.vx)*(1/60)/11;
  var f; if(P.dashT>0) f='run'; else if(!P.onG) f=P.vy<-40?'jump':'fall'; else if(gt-lastLandT<0.12&&sq>0.2) f='land'; else if(Math.abs(P.vx)>30) f=(Math.floor(runPh/1.6)%2)?'run':'idle'; else f='idle';
  if(ready(HERO)) spriteHero(c,f,P.x,P.y,P.face||1);
  /* the dash is ready: a small ember glows at the scarf (grey when it is spent) */
  if(S.dash){ var X=Math.round(P.x-(P.face||1)*9), Y=Math.round(P.y-30); c.fillStyle='#2A1B2E'; c.fillRect(X-4,Y-4,8,8); c.fillStyle=P.dashOk?'#FFC23D':'#6D6680'; c.fillRect(X-3,Y-3,6,6); if(P.dashOk){ c.fillStyle='#FFF1C2'; c.fillRect(X-1,Y-2,2,2); } } }
function spriteHero(c,f,x,y,face){ var r=PIX.heroF[f], w=r[2], h=r[3];
  c.save(); c.imageSmoothingEnabled=false; c.translate(Math.round(x),Math.round(y)); c.scale(face,1); c.drawImage(HERO,r[0],r[1],w,h,-Math.round(w/2),-h,w,h); c.restore(); }

/* the dash demo on the reward card */
var demoT=0, dcv=$('lp-demo'), dcx=dcv.getContext('2d');
function demo(dt){ demoT+=dt; var c=dcx, T2=demoT%3.2, x, y=200, f='idle', label='', v;
  c.setTransform(1,0,0,1,0,0); c.clearRect(0,0,520,260); c.fillStyle='#2B2140'; c.fillRect(0,0,520,260);
  c.fillStyle='#6B6A8E'; c.fillRect(20,200,140,60); c.fillRect(330,110,170,150); c.fillStyle='#2A1B2E'; c.fillRect(20,200,140,3); c.fillRect(330,110,170,3);
  for(v=0;v<5;v++) spike(c,'^',165+v*32,230);
  if(T2<0.4){ x=50+T2*150; f=(Math.floor(T2*8)%2)?'run':'idle'; }
  else if(T2<0.75){ var u=T2-0.4; x=110+u*200; y=200-(520*u-700*u*u); f='jump'; label='Space'; }
  else if(T2<1.0){ var u2=T2-0.75; x=180+u2*560; y=200-(520*0.35-700*0.35*0.35)-u2*360; f='run'; label='↗ + Shift'; if(!RM.matches&&ready(HERO)) for(v=1;v<4;v++){ c.globalAlpha=0.4-0.1*v; c.save(); c.translate(x-v*22,y+v*14); c.scale(1.5,1.5); spriteHero(c,'run',0,0,1); c.restore(); } c.globalAlpha=1; }
  else { x=Math.min(400,320+(T2-1.0)*200); y=110; f=x<400?'run':'idle'; }
  if(ready(HERO)){ c.save(); c.translate(x,y); c.scale(1.5,1.5); spriteHero(c,f,0,0,1); c.restore(); }
  if(label){ c.font='600 22px '+F; c.fillStyle='#FFF6E8'; c.textAlign='left'; c.fillText(label,20,40); } }

/* ---------------- main loop ---------------- */
var last=performance.now(), testHold=false;
function loop(now){ var dt=Math.min(0.05,(now-last)/1000); last=now;
  try{ if(!testHold||mode==='title') update(dt); render(); if(mode==='reward') demo(dt); }catch(e){ console.error(e); }
  requestAnimationFrame(loop); }

/* ---------------- boot ---------------- */
fit(); setMode('title');
['lp-boss','lp-meter'].forEach(function(id){ $(id).style.display='none'; });
if(S.name) $('lp-name').value=S.name; $('lp-go').disabled=!$('lp-name').value.trim();
if(S.started&&!S.over){ $('lp-go').textContent='Keep climbing'; }
if(S.over){ S=Object.assign(fresh(),{name:S.name}); save(); }
R=ROOMS[S.room]||ROOMS[0];
requestAnimationFrame(loop);
setTimeout(function(){ if(!$('lp-start').hidden) try{ $('lp-name').focus(); }catch(e){} },300);

/* ---------------- test hooks ---------------- */
window.__G={ state:function(){ return S; }, hero:function(){ return P; }, mode:function(){ return mode; }, rooms:ROOMS, room:function(){ return R; }, need:need,
  key:function(a,b){ held[a]=!!b; if(b&&a==='j') jumpEdge=true; if(b&&a==='ds') dashEdge=true; },
  go:function(i,dash){ if(dash!==undefined) S.dash=!!dash; enter(i); setMode('play'); }, step:function(dt){ update(dt); }, hold:function(b){ testHold=!!b; }, gt:function(){ return gt; },
  end:function(){ finish(); showEnd(); }, openCP:openCP, endEarly:endEarly, closeCP:function(){ S.cp=false; S.q=null; S.qDone=false; $('lp-cp').hidden=true; setMode('play'); }, blocked:function(){ return Object.keys(blocked); } };
})();
