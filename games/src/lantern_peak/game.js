/* ================= LANTERN PEAK =================
   A short climbing adventure: Pinewood Steps -> Falls Cliffs -> Windy Ruins -> Beacon Summit -> the beacon tower, where the Gloom
   (the storm that put the beacon out) drops ice and blows while you light three fires.
   Loop: climb freely (running and jumping cost nothing) -> reach a Waystone -> answer questions to light its runes (the world is frozen,
   no clock) -> the gate opens and you learn a new move (Cloud Hop, Scarf Glide, Ember Dash) -> the next zone is built around that move.
   The tower's fires are small Waystones: fewer questions each, no new move, and each one shrinks the Gloom.
   Integrations kept from Jump Man: SpitzQ.forGame (the hub's set + topics), the run save under KEY (+ set suffix) that scorecode.js watches
   for the answer log and missed-question returns, SpitzCode.show at the end, the kit (music switch, jingle, confetti, toast, F hint). */
(function(){
'use strict';
var PH=LPPH.PH, LV=LPLEVEL, A=LPART, $=function(id){ return document.getElementById(id); };
var W=960, H=540, F="Fredoka, Lexend, system-ui, sans-serif";
var KEY='lantern_peak_v1';
var QS=window.SpitzQ?window.SpitzQ.forGame('lp'):null; if(QS) KEY+=QS.suffix;
var SETID=QS?QS.set:'mult', SETINFO=window.SpitzQ&&SpitzQ.sets?SpitzQ.sets[SETID]:null, FAST=!QS||!!(SETINFO&&SETINFO.big);
if(!FAST) document.documentElement.classList.add('sz-alg');
/* math cadence: quick sets (facts answer in 2-3 s) light 5 runes at a Waystone, the algebra sets 3; a tower fire takes 2 sparks, or 1 */
function stn(){ return LV.st[S.st]||null; }
function needOf(s){ return s&&s.kind==='braz'?(FAST?2:1):(FAST?5:3); }
function need(){ return needOf(stn()); }
var RM=matchMedia('(prefers-reduced-motion: reduce)');

/* ---------------- questions (no set in the link and no questions.js: plain multiplication facts) ---------------- */
function ri(a,b){ return a+Math.floor(Math.random()*(b-a+1)); }
function multQ(){ var a=ri(2,12), b=ri(2,12), ans=a*b, seen={}, ch=[{html:''+ans,ok:true,why:''}]; seen[ans]=1;
  [a,-a,b,-b,10,-10,1,-1,2*a].forEach(function(d){ var v=ans+d; if(ch.length<4&&v>0&&!seen[v]){ seen[v]=1; ch.push({html:''+v,ok:false,why:a+' × '+b+' means '+b+' groups of '+a+'.'}); } });
  ch.sort(function(){ return Math.random()-0.5; });
  return { topic:'Multiplication', type:'mult', prompt:'<span class="lp-eq">'+a+' × '+b+' = ?</span>', visual:'', choices:ch, explain:'<span class="lp-eq">'+a+' × '+b+' = <span class="c-ans">'+ans+'</span></span>' }; }
function nextQuestion(){ return QS?QS.next():multQ(); }

/* ---------------- run state (saved: a reload or a slow Chromebook keeps the climb; scorecode.js clears it after 20 minutes) ---------------- */
/* st = how many stations are done (0..6): 1 = Cloud Hop, 2 = Scarf Glide, 3 = Ember Dash, 4 and 5 = the tower's first two fires, 6 = the beacon */
function fresh(){ return { ver:2, name:'', started:false, over:false, len:0, score:0, answered:0, correct:0,
  topics:QS?QS.topicTable():{'Multiplication':[0,0]}, q:null, qDone:false, picked:-1,
  camp:'c0', st:0, dj:false, gl:false, ds:true, hot:false, runes:0, cp:false, reward:false, embers:[], feathers:[], ice:[], falls:0, playT:0, best:0, done:false, early:false,
  campFalls:0, help:false, zone:0, hints:{}, bossSeen:false, hearts:3, fuel:0 }; }
function moves(){ S.dj=S.st>=1; S.gl=S.st>=2; S.ds=true; S.hot=S.st>=3; }   /* Ember Dash from the start (Kody); Waystone 3 makes it hot enough to melt ice */
var S=load()||fresh();
function save(){ try{ localStorage.setItem(KEY,JSON.stringify(S)); localStorage.setItem(KEY+'_mute',muted?'1':'0'); }catch(e){} }
function load(){ try{ muted=localStorage.getItem(KEY+'_mute')==='1'; var v=JSON.parse(localStorage.getItem(KEY)||'null'); if(v&&v.ver===2&&v.topics&&Array.isArray(v.embers)&&Array.isArray(v.ice)){ if(!(v.hearts>0)) v.hearts=3; if(!(v.fuel>=0)) v.fuel=0; v.help=false; return v; } }catch(e){} return null; }
function score(){ return S.embers.length*10+S.feathers.length*250+S.correct*100+Math.floor(S.best/10)+Math.max(0,Math.min(3,S.st-3))*150+(S.done?1000:0); }

/* ---------------- sound: soft, musical, procedural ---------------- */
var AC=null, muted=false;
function ac(){ if(!AC){ var C=window.AudioContext||window.webkitAudioContext; if(!C) return null; AC=new C(); } if(AC.state==='suspended') AC.resume(); return AC; }
function tone(f1,f2,t0,dur,type,vol,att){ var a=ac(); if(!a||muted) return; var o=a.createOscillator(), g=a.createGain(), t=a.currentTime+(t0||0); window.__snd=(window.__snd||0)+1;
  o.type=type||'triangle'; o.frequency.setValueAtTime(f1,t); if(f2!==f1) o.frequency.exponentialRampToValueAtTime(f2,t+dur);
  g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(vol,t+(att||0.012)); g.gain.exponentialRampToValueAtTime(0.0001,t+dur); o.connect(g); g.connect(a.destination); o.start(t); o.stop(t+dur+0.05); }
function noise(t0,dur,vol,lp,hp){ var a=ac(); if(!a||muted) return; var n=Math.floor(a.sampleRate*dur), b=a.createBuffer(1,n,a.sampleRate), d=b.getChannelData(0); for(var i=0;i<n;i++) d[i]=(Math.random()*2-1)*(1-i/n);
  var s=a.createBufferSource(), f=a.createBiquadFilter(), g=a.createGain(), t=a.currentTime+(t0||0); s.buffer=b; f.type=hp?'highpass':'lowpass'; f.frequency.value=hp||lp||800; g.gain.value=vol; s.connect(f); f.connect(g); g.connect(a.destination); s.start(t); }
var PENTA=[523.25,587.33,659.25,783.99,880,1046.5,1174.66,1318.5], emberRun=0, emberT=0;
var SND={
  jump:function(){ tone(300,470,0,0.11,'triangle',0.045); },
  hop:function(){ tone(520,1040,0,0.16,'sine',0.05); tone(780,1170,0.04,0.14,'triangle',0.03); noise(0,0.16,0.025,0,1800); },
  land:function(hard){ tone(150,80,0,hard?0.12:0.07,'sine',hard?0.1:0.06); if(hard) noise(0,0.08,0.03,500); },
  ember:function(){ var now=performance.now(); emberRun=now-emberT<1300?Math.min(emberRun+1,PENTA.length-1):0; emberT=now; var f=PENTA[emberRun]; tone(f,f,0,0.2,'triangle',0.05); tone(f*2,f*2,0.01,0.12,'sine',0.018); },
  feather:function(){ [783.99,987.77,1174.66,1567.98].forEach(function(f,i){ tone(f,f,i*0.07,0.3,'triangle',0.05); }); },
  camp:function(){ tone(392,392,0,0.5,'triangle',0.05); tone(587.33,587.33,0.08,0.5,'triangle',0.04); },
  crack:function(){ noise(0,0.09,0.05,1200); },
  crumble:function(){ noise(0,0.25,0.06,450); tone(160,90,0,0.2,'sine',0.04); },
  hurt:function(){ tone(330,200,0,0.18,'triangle',0.06); noise(0,0.1,0.03,900); },
  respawn:function(){ tone(392,784,0,0.28,'sine',0.045); },
  correct:function(){ tone(523.25,523.25,0,0.22,'triangle',0.12); tone(659.25,659.25,0.09,0.22,'triangle',0.11); tone(783.99,783.99,0.18,0.36,'triangle',0.11); },
  miss:function(){ tone(311.13,311.13,0,0.22,'triangle',0.09); tone(261.63,261.63,0.13,0.32,'triangle',0.08); },
  rune:function(i){ var f=[659.25,783.99,880,1046.5,1174.66][Math.min(4,i)]; tone(f,f,0.32,0.6,'sine',0.05); },
  open:function(){ [196,293.66,392,587.33].forEach(function(f,i){ tone(f,f,i*0.12,1.2,'triangle',0.07); }); noise(0,0.9,0.03,300); },
  unlock:function(){ [523.25,659.25,783.99,1046.5].forEach(function(f,i){ tone(f,f,i*0.11,0.5,'triangle',0.1); tone(f/2,f/2,i*0.11,0.5,'sine',0.04); }); },
  finish:function(){ [392,523.25,659.25,783.99,1046.5].forEach(function(f,i){ tone(f,f,i*0.13,0.7,'triangle',0.11); }); tone(261.63,261.63,0.6,1.4,'sine',0.06); },
  pause:function(){ tone(440,330,0,0.12,'sine',0.04); },
  glide:function(){ tone(700,900,0,0.22,'sine',0.02); noise(0,0.25,0.012,0,2400); },
  dash:function(){ tone(260,620,0,0.14,'triangle',0.05); noise(0,0.14,0.03,0,1500); },
  shatter:function(){ noise(0,0.22,0.05,0,2600); [1568,2093,1760].forEach(function(f,i){ tone(f,f,0.02+i*0.05,0.16,'sine',0.03); }); },
  warn:function(){ tone(987.77,987.77,0,0.12,'sine',0.025); tone(880,880,0.14,0.12,'sine',0.02); },
  tick:function(){ noise(0,0.07,0.02,0,3000); },
  inhale:function(){ noise(0,0.9,0.012,500); },
  gust:function(){ noise(0,1.3,0.03,700); tone(180,140,0,1.2,'sine',0.02); },
  fire:function(){ [392,523.25,659.25,783.99].forEach(function(f,i){ tone(f,f,i*0.1,0.5,'triangle',0.09); }); noise(0,0.5,0.02,900); },
  gloomHurt:function(){ tone(196,98,0.25,0.7,'sine',0.07); tone(233.08,116.54,0.3,0.7,'triangle',0.03); },
  beacon:function(){ [261.63,392,523.25,659.25,783.99,1046.5].forEach(function(f,i){ tone(f,f,i*0.16,1.1,'triangle',0.1); tone(f/2,f/2,i*0.16,1.1,'sine',0.04); }); noise(0.2,1.2,0.02,500); }
};
/* the song: a gentle folk loop in D (plucked triangle arpeggios, soft bass); it backs off while a question is up.
   On the beacon tower the same loop turns to D minor and picks up a little speed. */
var CHB=[[146.83,[293.66,349.23,440,587.33]],[116.54,[233.08,293.66,349.23,466.16]],[130.81,[261.63,329.63,392,523.25]],[110,[220,277.18,329.63,440]]];
var CH=[[146.83,[293.66,369.99,440,587.33]],[123.47,[246.94,293.66,369.99,493.88]],[98,[196,246.94,293.66,392]],[110,[220,277.18,329.63,440]]], ROLL=[0,1,2,3,2,1,2,1];
var SONG={ level:0.085, echo:0.27,
  want:function(){ return !!S&&S.started&&!S.over; },
  busy:function(){ return mode==='play'; },
  sd:function(){ return 60/(BOSS.on?108:96)/2; },
  voice:function(f,t0,dur){ tone(f,f,t0,dur,'triangle',0.12); },
  step:function(ctx,g,i,t,sd){ var bar=Math.floor(i/8), c=(BOSS.on?CHB:CH)[bar%4], k=i%8;
    if(k===0) KIT.mNote(ctx,g.out,'sine',c[0],t,sd*5,0.16,600,null);
    if(k===4) KIT.mNote(ctx,g.out,'sine',c[0]*1.5,t,sd*3,0.1,600,null);
    KIT.mNote(ctx,g.act,'triangle',c[1][ROLL[k]],t,sd*1.6,0.035,2600,(k===3||k===7)?g.echo:null);
    if(bar%2===1&&k===6) KIT.mNote(ctx,g.act,'triangle',c[1][3]*2,t,sd*2,0.02,3200,g.echo); } };
var KIT=SpitzKit.game({ ac:function(){ return AC; }, muted:function(){ return muted; }, song:function(){ return SONG; }, confetti:'lp-confetti', toast:'lp-toast', toastMs:2200,
  colors:['#FFC23D','#2EC4B6','#E8553D','#FF9A3C','#F3E9D8','#86B86A','#FFFFFF'] });
KIT.musBtn();

/* ---------------- canvas + resolution (sharp on a big screen, light on a small Chromebook) ---------------- */
var cv=$('lp-cv'), cx=cv.getContext('2d'), RS=1, CACHE={};
var PIX=window.LPPIX||null, HERO=null, BG1=null, LOW=document.createElement('canvas'); LOW.width=480; LOW.height=270; var LOWC=LOW.getContext('2d');
if(PIX){ HERO=new Image(); HERO.src=PIX.hero; BG1=new Image(); BG1.src=PIX.bg1; }
function ready(im){ return im&&im.complete&&im.naturalWidth>0; }
function fit(){ var s=Math.min(innerWidth/1920,innerHeight/1080), st=$('stage').style; st.transform='scale('+s+')'; st.left=((innerWidth-1920*s)/2)+'px'; st.top=((innerHeight-1080*s)/2)+'px';
  /* 8/16-bit look (Kody approved the pixel proof art, 2026-11-16): the world is drawn at 960x540 and scaled up crisp, never smoothed */
  if(cv.width!==960){ RS=1; cv.width=960; cv.height=540; CACHE={}; } }
var slowFrames=0;
addEventListener('resize',fit);
function cache(key,w,h,draw){ var o=CACHE[key]; if(o) return o; var c=document.createElement('canvas'); c.width=Math.ceil(w*RS); c.height=Math.ceil(h*RS); var g=c.getContext('2d'); g.scale(RS,RS); draw(g,w,h); return CACHE[key]=c; }

/* ---------------- world ---------------- */
var P=LPPH.fresh(110,0), gt=0, cam=-40, mode='title', modeT=0;   // modes: title, play, cp (Waystone questions), reward, pause, respawn, finish, end
var dust=[], sparks=[], shake=0, scarf=[[-9,4],[-7,8]], pom=0, lamp=0, sq=0, spin=0, blinkT=2, lastLandT=0, flash=0;
var camps={}; LV.camps.forEach(function(c){ camps[c.id]=c; });
function campOf(id){ return camps[id]||camps.c0; }
/* gates are open once their station is done; ice walls stay melted for the rest of the climb */
function solids(){ LV.solids.forEach(function(s){ if(s.gate!==undefined) s.off=S.st>s.gate; else if(s.ice) s.off=S.ice.indexOf(s.id)>=0; }); return LV.solids; }
var BW={ x:0, y:LV.base.y-200, w:960, h:4000, vx:0, always:true, g:0.6, off:true };   // the Gloom's gust (switched on and off by the boss)
var WORLD={ plats:LV.plats, solids:LV.solids, hazards:LV.hazards, winds:LV.winds.concat([BW]), t:0, dj:false, gl:false, ds:false };
function ramp(v,a,b){ return Math.max(0,Math.min(1,(v-a)/(b-a))); }

/* ---------------- input: held keys, fresh presses, and the guard that keeps a held key or click from answering ---------------- */
var held={}, blocked={}, downKeys={}, jumpEdge=false, downEdge=false, dashEdge=false, ptrDownAt=0, qShownAt=0, answeredAt=0, panelAt=0;
function act(k){ return ({arrowleft:'l',a:'l',arrowright:'r',d:'r',arrowup:'j',w:'j',' ':'j',z:'j',arrowdown:'dn',s:'dn',x:'ds',c:'ds'})[k]; }
function blockHeld(){ Object.keys(downKeys).forEach(function(k){ blocked[k]=true; }); held={}; jumpEdge=downEdge=dashEdge=false; P.buf=0; }
function inp(){ var j=held.j; return { l:!!held.l, r:!!held.r, jumpHeld:!!j, jumpPressed:jumpEdge, downPressed:downEdge, dashPressed:dashEdge }; }
addEventListener('pointerdown',function(){ ptrDownAt=performance.now(); ac(); },true);
addEventListener('blur',function(){ held={}; downKeys={}; if(mode==='play') pause(true); });
document.addEventListener('visibilitychange',function(){ if(document.hidden&&mode==='play') pause(true); });

document.addEventListener('keydown',function(e){
  var k=(e.key||'').toLowerCase(); downKeys[k]=1; var typing=document.activeElement===$('lp-name');
  if(typing){ if(k==='enter'&&!$('lp-go').disabled){ e.preventDefault(); start(); } return; }
  if(!$('sz-ask').hidden){ e.preventDefault(); if(k==='y') askYes(); else if(k==='n'||k==='escape') askNew(false); return; }
  if(k==='r'&&e.shiftKey){ e.preventDefault(); if(S.started&&!S.over) askNew(true); return; }
  if(e.ctrlKey||e.metaKey||e.altKey) return;   // leave browser shortcuts alone
  if(k==='f'){ e.preventDefault(); fullscreen(); return; }
  if(k==='n'){ e.preventDefault(); KIT.musicToggle(); pauseLabels(); return; }
  if(k==='m'){ e.preventDefault(); muted=!muted; save(); KIT.toast(muted?'Sound off':'Sound on'); pauseLabels(); return; }
  if(k==='escape'||k==='p'){ e.preventDefault(); if(mode==='pause') pause(false); else if(mode==='play'||mode==='cp'||mode==='reward') pause(true); return; }
  if(mode==='cp'){ e.preventDefault(); if(e.repeat||blocked[k]) return;
    if(/^[1-4]$/.test(k)) answer(+k-1,'key'); else if(k==='enter') cont('key'); return; }
  if(mode==='reward'){ e.preventDefault(); if(!e.repeat&&!blocked[k]&&k==='enter'&&performance.now()-panelAt>600) closeReward(); return; }
  if(mode==='end'){ if(k==='enter'&&!e.repeat&&performance.now()-panelAt>1200){ e.preventDefault(); newRun(); } return; }
  var a=act(k); if(!a) return; e.preventDefault();
  if(blocked[k]) return;
  if(mode==='play'){ if(!held[a]&&!e.repeat){ if(a==='j') jumpEdge=true; if(a==='dn') downEdge=true; if(a==='ds') dashEdge=true; } }
  held[a]=true;
});
document.addEventListener('keyup',function(e){ var k=(e.key||'').toLowerCase(); delete blocked[k]; delete downKeys[k]; var a=act(k); if(a) held[a]=false; });

/* ---------------- flow ---------------- */
function setMode(m){ mode=m; modeT=0; $('lp-hud').hidden=!(m==='play'||m==='respawn'||m==='finish'||m==='cp'||m==='reward'||m==='pause'); }
function start(){ var n=$('lp-name').value.trim().replace(/\s+/g,' '); if(!n) return; ac();
  if(!S.started){ S=fresh(); S.name=n; S.started=true; }
  moves(); solids(); save(); $('lp-start').hidden=true; KIT.jingle(); place(campOf(S.camp)); buildMeter(); hud(); setMode('play');
  if(S.cp) setTimeout(openCP,50); else if(S.reward) setTimeout(function(){ S.reward=false; openReward(); },50);
  showZone(zoneAt(P.y),true); }
function place(c){ P=LPPH.fresh(c.x,c.y); groundY=c.y; P.face=1; cam=Math.max(-60,c.y-190); LV.plats.forEach(function(p){ delete p.goneAt; delete p.tT; }); ghosts.length=0; bossClear(1.6); }
function pause(o){ if(o){ if(mode==='pause') return; pauseFrom=mode; setMode('pause'); $('lp-pause').hidden=false; $('lp-pausewhere').textContent=ZN[zoneAt(P.y)]+' · '+Math.floor(Math.max(0,P.y)/20)+' m'; pauseLabels(); moveList(); SND.pause(); blockHeld(); }
  else { if(mode!=='pause') return; $('lp-pause').hidden=true; setMode(pauseFrom||'play'); blockHeld(); if(mode==='cp') qShownAt=performance.now(); } }
var pauseFrom='play';
function pauseLabels(){ $('lp-pmute').textContent='Sound: '+(muted?'off':'on')+'  (M)'; $('lp-pmusic').textContent='Music: '+(KIT.musicOff()?'off':'on')+'  (N)'; }
$('lp-pausebtn').addEventListener('click',function(){ if(mode==='play') pause(true); });
$('lp-resume').addEventListener('click',function(){ pause(false); });
$('lp-pmute').addEventListener('click',function(){ muted=!muted; save(); pauseLabels(); });
$('lp-pmusic').addEventListener('click',function(){ KIT.musicToggle(); pauseLabels(); });
$('lp-prestart').addEventListener('click',function(){ askNew(true); });
$('lp-pend').addEventListener('click',function(){ askNew(true,'end'); });
/* the pause menu lists the moves learned so far, with their keys */
function moveList(){ var h='<span><kbd>Space</kbd> Jump</span>'; if(S.dj) h+='<span><kbd>Space</kbd><kbd>Space</kbd> Cloud Hop</span>'; if(S.gl) h+='<span>then hold <kbd>Space</kbd> Glide</span>'; if(S.ds) h+='<span><kbd>X</kbd> Dash (1 ember'+(S.hot?', melts ice':'')+')</span>'; $('lp-moves').innerHTML=h; }
/* one box asks before either ending: a new game (Shift+R), or stopping here with a score (for when class time runs out) */
var askKind='new';
function askNew(o,kind){ if(o){ askKind=kind||'new'; var e=askKind==='end';
    $('sz-asktitle').textContent=e?'Stop here?':'Start a new game?'; $('lp-asksub').textContent=e?'Your climb ends here and you get your score.':'Your climb so far will be lost.';
    $('sz-askyes').textContent=e?'Yes, show my score (Y)':'Yes, new game (Y)'; }
  $('sz-ask').hidden=!o; if(o&&mode==='play') pause(true); }
function askYes(){ if(askKind==='end') endEarly(); else newRun(); }
function endEarly(){ $('sz-ask').hidden=true; $('lp-pause').hidden=true; $('lp-cp').hidden=true; S.over=true; S.early=true; S.cp=false; $('lp-boss').hidden=true; showEnd(); }
$('sz-askyes').addEventListener('click',askYes); $('sz-askno').addEventListener('click',function(){ askNew(false); });
function newRun(){ var n=S.name; S=fresh(); S.name=n; try{ localStorage.setItem(KEY,JSON.stringify(S)); }catch(e){} location.reload(); }
$('lp-again').addEventListener('click',newRun);
function fullscreen(){ var d=document, e=d.documentElement; if(d.fullscreenElement||d.webkitFullscreenElement) (d.exitFullscreen||d.webkitExitFullscreen).call(d); else (e.requestFullscreen||e.webkitRequestFullscreen||function(){}).call(e); }
$('lp-name').addEventListener('input',function(){ $('lp-go').disabled=!this.value.trim(); });
$('lp-go').addEventListener('click',start);

/* ---------------- zones, meter, HUD ---------------- */
var ZN=LV.zones.map(function(z){ return z.name; });
function zoneAt(y){ var z=0; LV.zones.forEach(function(q,i){ if(y>=q.y+10) z=i; }); return z; }
var zoneT=0;
function showZone(z,first){ var el=$('lp-zone'); el.innerHTML='<small>'+(LV.zones[z].finale?'Finale':'Zone '+(z+1)+' of 4')+'</small>'+ZN[z]; el.classList.add('on'); clearTimeout(zoneT); zoneT=setTimeout(function(){ el.classList.remove('on'); },first?2600:2400); }
var ZC=['#86B86A','#2EC4B6','#C98BE0','#9DB4E8','#FF9A3C'];
function buildMeter(){ var m=$('lp-meter'), h=800, top=LV.summitY, html='<div class="rail"></div>';
  LV.zones.forEach(function(z,i){ var y0=z.y, y1=i<LV.zones.length-1?LV.zones[i+1].y:top; html+='<div class="zone" style="bottom:'+(y0/top*h)+'px;height:'+((y1-y0)/top*h-4)+'px;background:'+ZC[i]+'"></div>'; });
  html+='<svg class="goal" viewBox="0 0 56 56"><path d="M20 50h16l-2-26h-12z" fill="#7E8DB0" stroke="#2A1B2E" stroke-width="3" stroke-linejoin="round"/><path d="M16 24h24l-12-14z" fill="#5A6385" stroke="#2A1B2E" stroke-width="3" stroke-linejoin="round"/><rect x="24" y="30" width="8" height="9" fill="#C9A86A" stroke="#2A1B2E" stroke-width="2"/></svg>';
  html+='<div class="me" id="lp-me"></div>'; m.innerHTML=html; }
var meY=-1;
function hud(){ var hh=''; for(var i=0;i<3;i++) hh+='<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 34C8 25 4 19 4 13a8 8 0 0 1 16-2 8 8 0 0 1 16 2c0 6-4 12-16 21z" fill="'+(i<S.hearts?'#E8553D':'#3A2D50')+'" stroke="#2A1B2E" stroke-width="3" stroke-linejoin="round"/>'+(i<S.hearts?'<path d="M10 13a4 4 0 0 1 5-4" stroke="#FFB3A0" stroke-width="3" fill="none" stroke-linecap="round"/>':'')+'</svg>'; $('lp-hpchip').innerHTML=hh; $('lp-hpchip').title=S.hearts+' of 3 hearts'; $('lp-emb').textContent=S.fuel||0; $('lp-embchip').classList.toggle('empty',!(S.fuel>0)); $('lp-feath').textContent=S.feathers.length; $('lp-fchip').hidden=!S.feathers.length;
  $('lp-ab-dj').hidden=!S.dj; $('lp-ab-gl').hidden=!S.gl; $('lp-ab-ds').hidden=!S.ds; }
function pop(id){ var e=$(id); e.classList.remove('pop'); void e.offsetWidth; e.classList.add('pop'); }
var hintKey='', hintT=0;
function hint(html,key){ var el=$('lp-hint'); if(!html){ el.classList.remove('on'); hintKey=''; return; } if(hintKey===key) return; hintKey=key; el.innerHTML=html; el.classList.add('on'); }
function hints(){ var h=S.hints; if(BOSS.on) return hint(null);
  if(!h.run) return hint('<kbd>←</kbd><kbd>→</kbd> Run','run');
  if(!h.jump) return hint('<kbd>Space</kbd> or <kbd>↑</kbd> Jump','jump');
  if(S.dj&&!h.hop) return hint('Jump, then <kbd>Space</kbd> again in the air: Cloud Hop','hop');
  if(S.gl&&!h.glide) return hint('After your hop, hold <kbd>Space</kbd> to glide','glide');
  if(S.fuel>0&&!h.dash) return hint('<kbd>X</kbd> Ember Dash · burns 1 ember','dash');
  if(S.help&&!h.helpSeen) return hint('A helping wind: your jumps go higher until the next lantern','help');
  hint(null); }

/* ---------------- the Waystone (math checkpoint) ---------------- */
function nearStation(){ var s=stn(); return !!s&&!!P.on&&P.on.id===s.id&&Math.abs(P.x-s.x)<(s.kind==='way'?58:70); }
/* the words on the card: runes and a gate at a Waystone, sparks and a fire on the tower */
function words(){ var s=stn(); if(s&&s.kind==='braz') return { title:s.last?'The Beacon':(s.i===3?'The First Fire':'The Second Fire'), unit:'spark', goal:s.last?'to light the beacon':'to light the fire',
    ok:'Correct! A spark catches.', bad:'Not quite. No spark this time.', go:s.last?'Light the beacon ':'Light the fire ', note:s.last?'The beacon is ready!':'The fire is ready!', all:'Every spark is lit!' };
  return { title:'The Waystone', unit:'rune', goal:'to open the gate', ok:'Correct! A rune lights up.', bad:'Not quite. No rune this time.', go:'Open the gate ', note:'The gate is opening!', all:'Every rune is lit!' }; }
function runes(){ var h='', NEED=need(), wd=words(); $('lp-cptitle').textContent=wd.title; for(var i=0;i<NEED;i++){ var on=i<S.runes; h+='<svg class="lp-rune" viewBox="0 0 58 58"><circle cx="29" cy="29" r="24" fill="'+(on?'#FFC23D':'#3A2D50')+'" stroke="#2A1B2E" stroke-width="4"/>'+(on?'<path d="M29 15l4 10 10 4-10 4-4 10-4-10-10-4 10-4z" fill="#FFF1C2"/>':'<circle cx="29" cy="29" r="6" fill="#5D6178"/>')+'</svg>'; }
  $('lp-runes').innerHTML=h; var left=NEED-S.runes; $('lp-cpsub').textContent=left>0?'Light '+left+' more '+wd.unit+(left>1?'s':'')+' '+wd.goal:wd.all; }
function openCP(){ S.cp=true; setMode('cp'); blockHeld(); P.vx=0; $('lp-cp').hidden=false; $('lp-card').hidden=false; $('lp-reward').hidden=true; hint(null); bossClear(2);
  if(!S.q||(S.qDone&&S.runes<need()&&!keepAnswered)){ newQ(); } else showQ(); keepAnswered=false; save(); }
var keepAnswered=true;   // on a reload mid-Waystone, the answered question stays up with its explanation
function newQ(){ S.q=nextQuestion(); S.qDone=false; S.picked=-1; save(); showQ(); }
function showQ(){ var q=S.q; runes(); $('lp-tag').textContent=q.topic;
  $('lp-prompt').innerHTML=q.prompt; $('lp-visual').innerHTML=q.visual||''; $('lp-q').classList.toggle('vis',!!q.visual);
  $('lp-choices').innerHTML=q.choices.map(function(c,i){ return '<button class="lp-ch" data-i="'+i+'"><span class="k">'+(i+1)+'</span><span class="t">'+c.html+'</span></button>'; }).join('');
  var fb=$('lp-fb'); fb.hidden=true; fb.className='lp-fb'; fb.innerHTML=''; $('lp-next').hidden=true;
  $('lp-cpnote').textContent='Press 1, 2, 3 or 4, or click an answer. Take your time: the mountain waits.';
  qShownAt=performance.now(); if(S.qDone) mark(S.picked,false); }
function mark(i,fresh){ var q=S.q, c=q.choices[i], btns=$('lp-choices').querySelectorAll('.lp-ch'), fb=$('lp-fb'), NEED=need(), wd=words();
  btns.forEach(function(b,j){ b.disabled=true; if(q.choices[j].ok) b.classList.add('right'); });
  if(btns[i]){ if(!c.ok) btns[i].classList.add('wrong'); btns[i].insertAdjacentHTML('beforeend','<span class="mine">Your answer</span>'); }
  fb.hidden=false;
  if(c.ok){ fb.className='lp-fb ok'; fb.innerHTML='<span class="h">'+wd.ok+'</span>'+q.explain; }
  else { fb.className='lp-fb bad'; fb.innerHTML='<span class="h">'+wd.bad+'</span>'+(c.why?c.why+'<br>':'')+q.explain; }
  var left=NEED-S.runes;
  $('lp-cpnote').textContent=c.ok?(left>0?left+' more to go.':wd.note):'Read how it works, then try a new question. Nothing is lost.';
  var nx=$('lp-next'); nx.hidden=false; nx.firstChild.textContent=(c.ok&&left<=0)?wd.go:(c.ok?'Next question ':'Try a new question '); }
function answer(i,how){ if(mode!=='cp'||S.qDone||!S.q) return; var now=performance.now();
  if(now-qShownAt<450) return;                                  // a key or click that was already on its way when the question appeared
  if(how==='click'&&ptrDownAt<qShownAt) return;                   // a press that started before the question was up
  var c=S.q.choices[i]; if(!c) return;
  S.qDone=true; S.picked=i; S.answered++; var tp=S.topics[S.q.topic]||(S.topics[S.q.topic]=[0,0]); tp[1]++;
  if(c.ok){ S.correct++; tp[0]++; S.runes++; SND.correct(); SND.rune(S.runes-1); var b=$('lp-choices').querySelectorAll('.lp-ch')[i]; if(b){ var p=KIT.stagePoint(b,80,40); KIT.confetti(p[0],p[1],RM.matches?14:26,1.6); } }
  else SND.miss();
  answeredAt=now; save(); mark(i,true); runes(); }
function cont(how){ if(mode!=='cp'||!S.qDone) return; if(performance.now()-answeredAt<400) return;
  if(S.runes>=need()){ var s=stn(); S.cp=false; S.q=null; S.qDone=false; S.picked=-1; S.runes=0; S.st++; if(s.kind==='way') S.hearts=3; hud(); moves(); solids(); $('lp-cp').hidden=true; blockHeld();
    if(s.last){ finish(); return; }
    S.reward=!!s.move; save(); setMode('play'); gateT=0; opening=true; SND.open();
    if(s.kind==='braz'){ SND.fire(); SND.gloomHurt(); BOSS.hurtT=2.4; bossBar(); sparkle(s.x,s.y+70,16,'#FFC23D'); KIT.toast('The Gloom shrinks!'); }
    return; }
  newQ(); }
$('lp-choices').addEventListener('click',function(e){ var b=e.target.closest('.lp-ch'); if(b) answer(+b.dataset.i,'click'); });
$('lp-next').addEventListener('click',function(){ if(ptrDownAt<answeredAt+1) return; cont('click'); });
var opening=false, gateT=0;
var REW={ dj:{ name:'Cloud Hop', chip:'lp-ab-dj', text:'Jump, then press jump <b>again in the air</b> for a second jump.<br>The cliffs above need it.' },
  gl:{ name:'Scarf Glide', chip:'lp-ab-gl', text:'After your Cloud Hop, <b>hold jump</b> to glide.<br>Rising wind lifts you. Let go to drop.' },
  ds:{ name:'Blazing Dash', chip:'lp-ab-ds', text:'Your Ember Dash burns hot now.<br><b>Dash into ice to melt it.</b> Each dash still burns 1 ember.' } }, rewardMove='dj';
function openReward(){ var s=LV.st[S.st-1]; rewardMove=(s&&s.move)||'dj'; var r=REW[rewardMove]; $('lp-rwname').textContent=r.name; $('lp-rwtext').innerHTML=r.text;
  setMode('reward'); $('lp-cp').hidden=false; $('lp-card').hidden=true; $('lp-reward').hidden=false; panelAt=performance.now(); SND.unlock(); KIT.confetti(960,420,RM.matches?40:90,2.4); hud(); pop(r.chip); demoT=0; }
function closeReward(){ S.reward=false; save(); $('lp-cp').hidden=true; setMode('play'); blockHeld(); }
$('lp-try').addEventListener('click',function(){ if(performance.now()-panelAt>600&&ptrDownAt>panelAt) closeReward(); });

/* ---------------- the Gloom: the storm on the beacon tower ----------------
   It wakes when you reach the foot of the tower. Each cycle it warns first (a marked lane, an icicle growing under it), then drops ice.
   From the first fire on it also blows: it slides to one side, breathes in for a second, then a gust pushes across the tower.
   Fair by construction: every lane is marked 0.9 s before the ice falls, ice breaks on the first ledge it meets (a ledge overhead
   is shelter), gusts and ice never overlap. A hit costs a heart, like a fall. It does not tire: 2, 3, then 4 icicles a volley,
   0.65 s warnings, gusts from the start. Nothing moves while a question is up. */
var BOSS={ on:false, a:0, x:480, bt:0, nextV:3, nextG:7, warn:[], ice:[], gust:null, hurtT:0, sc:1, calm:false }, ghosts=[];
function bossPhase(){ return Math.max(0,Math.min(2,S.st-3)); }
function bossWant(){ return S.st>=3&&!S.done&&!S.over&&(P.y>LV.base.y-40||campOf(S.camp).y>=LV.base.y); }
function bossClear(d){ BOSS.warn.length=0; BOSS.ice.length=0; BOSS.gust=null; BW.off=true; BOSS.nextV=BOSS.bt+d; BOSS.nextG=Math.max(BOSS.nextG,BOSS.bt+d+2); }
function bossBar(){ var lit=Math.max(0,S.st-3), h=''; for(var i=0;i<3;i++) h+='<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 4c6 8 12 12 12 20a12 12 0 0 1-24 0c0-5 3-8 5-11 1 4 3 5 4 5 0-5 1-10 3-14z" fill="'+(i<lit?'#FF9A3C':'#3A2D50')+'" stroke="#2A1B2E" stroke-width="3" stroke-linejoin="round"/>'+(i<lit?'<path d="M20 22c3 3 5 5 5 8a5 5 0 0 1-10 0c0-3 2-5 5-8z" fill="#FFE08A"/>':'')+'</svg>'; $('lp-bossf').innerHTML=h; }
function shards(x,y,n){ for(var i=0;i<(n||6);i++){ var a=Math.random()*Math.PI*2, v=50+Math.random()*130; sparks.push({x:x,y:y,vx:Math.cos(a)*v,vy:Math.sin(a)*v+70,t:0,max:0.35+Math.random()*0.25,col:'#D8F3FF'}); } }
function bossStep(dt){
  var on=bossWant();
  if(on&&!BOSS.on){ BOSS.on=true; BOSS.bt=0; BOSS.nextV=3; BOSS.nextG=7; BOSS.x=Math.max(170,Math.min(790,P.x)); $('lp-boss').hidden=false; bossBar();
    if(!S.bossSeen){ S.bossSeen=true; save(); KIT.toast('The Gloom put out the beacon. Light the three fires!'); } }
  if(!on&&BOSS.on){ BOSS.on=false; bossClear(0); $('lp-boss').hidden=true; }
  if(!on){ BW.off=true; return; }
  BOSS.bt+=dt; var ph=bossPhase(), help=false, bt=BOSS.bt, g=BOSS.gust, busy=BOSS.calm||BOSS.hurtT>0;
  /* gusts, from the first fire on */
  if(!g&&bt>=BOSS.nextG&&!busy&&!BOSS.warn.length){ g=BOSS.gust={dir:Math.random()<0.5?-1:1,t:0}; SND.inhale(); }
  if(g){ g.t+=dt; if(g.t>=1&&!g.blow){ g.blow=true; SND.gust(); } if(g.t>=2.4){ BOSS.gust=g=null; BOSS.nextG=bt+(5.5-0.5*ph); BOSS.nextV=Math.max(BOSS.nextV,bt+0.5); } }
  BW.off=!(g&&g.blow); if(g&&g.blow) BW.vx=g.dir*(help?100:165)*Math.min(1,(g.t-1)/0.25,(2.4-g.t)/0.25);
  BOSS.x+=((g?(g.dir>0?150:810):Math.max(170,Math.min(790,P.x)))-BOSS.x)*Math.min(1,dt*(g?3:1.2));
  /* icicles: one aimed at the hero, the others to the sides */
  if(!g&&bt>=BOSS.nextV&&!busy){ var n=2+ph, tele=0.65, xs=[Math.max(30,Math.min(930,P.x))], sd=Math.random()<0.5?-1:1;
    for(var i=1;i<n;i++){ var x=xs[0]+sd*(150+Math.random()*110); if(x<30||x>930) x=xs[0]-sd*(150+Math.random()*110); xs.push(Math.max(30,Math.min(930,x))); sd=-sd; }
    xs.forEach(function(x,i){ BOSS.warn.push({x:x,t:-i*0.18,tele:tele}); }); BOSS.nextV=bt+(2.5-0.25*ph); SND.warn(); }
  BOSS.warn=BOSS.warn.filter(function(w){ w.t+=dt; if(w.t>=w.tele){ BOSS.ice.push({x:w.x,y:cam+H-150,vy:-420}); return false; } return true; });
  var hit=false;
  BOSS.ice=BOSS.ice.filter(function(ic){ var y0=ic.y; ic.vy=Math.max(-760,ic.vy-900*dt); ic.y+=ic.vy*dt;
    if(Math.abs(ic.x-P.x)<PH.HW+7&&ic.y<P.y+PH.HH-4&&y0+26>P.y+6){ shards(ic.x,ic.y,8); hit=true; return false; }
    for(var i=0;i<LV.plats.length;i++){ var p=LV.plats[i]; if(p.y>y0||p.y<ic.y||!LPPH.alive(p,gt)) continue; if(ic.x>p.x&&ic.x<p.x+p.w){ shards(ic.x,p.y+6,5); SND.tick(); return false; } }
    return ic.y>cam-60; });
  if(hit) fall('hurt');
}

/* ---------------- the climb ---------------- */
var FIX=1/120, acc=0;
function update(dt){
  modeT+=dt;
  if(mode==='title'){ gt+=dt; titleCam(dt); return; }
  if(mode==='respawn'){ if(modeT>0.45&&!respawned){ respawned=true; place(campOf(S.camp)); SND.respawn(); } if(modeT>0.9) setMode('play'); stepFx(dt); return; }
  if(opening&&mode==='play'){ gateT+=dt; stepFx(dt); camFollow(dt,true); if(gateT>1.5){ opening=false; if(S.reward){ S.reward=false; openReward(); } } return; }
  if(mode==='finish'){ stepFx(dt); finishT+=dt; cam+=(LV.finish.y-150-cam)*Math.min(1,dt*1.6);
    /* the beacon catches, the Gloom comes apart in sparks, the night turns to dawn */
    if(finishT>0.7&&BOSS.a>0){ BOSS.a=Math.max(0,BOSS.a-dt/1.9); if(Math.random()<dt*16) sparkle(BOSS.x+(Math.random()-0.5)*240,cam+H-100+(Math.random()-0.5)*80,2,'#FFD98A'); }
    if(finishT>2.4&&!finCheer){ finCheer=true; SND.finish(); KIT.confetti(960,300,RM.matches?60:140,2.6); }
    if(finishT>5&&!$('lp-end').offsetParent) showEnd(); return; }
  if(mode!=='play') return;
  S.playT+=dt; acc+=dt; var n=0;
  WORLD.dj=S.dj; WORLD.gl=S.gl; WORLD.ds=S.ds; WORLD.melt=!!S.hot; solids();
  bossStep(dt); if(mode!=='play') return;
  while(acc>=FIX&&n<10){ acc-=FIX; n++; gt+=FIX; WORLD.t=gt; var I=inp(); if(I.dashPressed&&(S.fuel||0)<1){ I.dashPressed=false; noFuel(); } if(S.help) boost(); LPPH.step(P,I,FIX,WORLD); unboost(); jumpEdge=false; downEdge=false; dashEdge=false; events(); if(mode!=='play') break;
    if(P.dashT>0&&(n%2)) ghosts.push({x:P.x,y:P.y,face:P.face,t:0.2}); }
  if(acc>FIX) acc=FIX;
  if(Math.abs(P.vx)>40) S.hints.run=1;
  camFollow(dt,false); stepFx(dt); pickups(); campCheck();
  if(nearStation()&&mode==='play'){ openCP(); return; }
  if(P.y<campOf(S.camp).y-280) fall('fell');
  var z=zoneAt(P.y); if(z!==S.zone){ S.zone=z; showZone(z); save(); }
  if(P.y>S.best){ S.best=P.y; }
  hints();
}
var JV0=PH.JV, DJ0=PH.DJV; function boost(){ PH.JV=JV0*1.13; PH.DJV=DJ0*1.1; } function unboost(){ PH.JV=JV0; PH.DJV=DJ0; }
var respawned=false, finishT=0, finCheer=false;
function events(){ var hard=false; P.ev.forEach(function(e){
  if((e==='land'||e==='landHard')&&groundY-P.y>=HARD&&gt-glideAt>0.12&&mode==='play') hard=true;
  if(e==='jump'){ SND.jump(); sq=-0.35; S.hints.jumps=(S.hints.jumps||0)+1; if(S.hints.jumps>=2) S.hints.jump=1; puff(P.x,P.y,4,'#F3E9D8'); }
  else if(e==='dj'){ SND.hop(); sq=-0.3; spin=RM.matches?0:1; ring(P.x,P.y+6); S.hints.hop=1; }
  else if(e==='glide'){ SND.glide(); S.hints.glide=1; spin=0; }
  else if(e==='dash'){ S.fuel=Math.max(0,(S.fuel||0)-1); hud(); SND.dash(); S.hints.dash=1; spin=0; puff(P.x,P.y+20,5,'#FF9A3C'); }
  else if(e==='shatter'){ var w=P.shat; if(w&&w.id&&S.ice.indexOf(w.id)<0){ S.ice.push(w.id); save(); } SND.shatter(); if(w) for(var q=0;q<5;q++) shards(w.x+w.w/2,w.y+w.h*(0.1+0.2*q),RM.matches?2:5); if(!RM.matches) shake=0.1; }
  else if(e==='land'||e==='landHard'){ if(gt-lastLandT>0.08){ SND.land(e==='landHard'); } lastLandT=gt; sq=e==='landHard'?0.55:0.32; puff(P.x,P.y,e==='landHard'?8:4,'#F3E9D8'); if(e==='landHard'&&!RM.matches) shake=0.12; }
  else if(e==='crack') SND.crack();
  else if(e==='crumble'){ SND.crumble(); }
  else if(e==='drop'){ }
  else if(e==='hurt') fall('hurt');
}); if(P.glide) glideAt=gt; if(P.on) groundY=P.y; if(hard) hardFall(); }
/* hard mode (Kody 2026-11-16: "not punishing enough"): a fall, thorns or ice cost a heart and the last 3 embers picked up (they go back
   on the mountain). Out of hearts: back to the start of the stretch (the last Waystone, the tower's foot or the last fire), hearts refilled.
   Moves and lit stations are never lost. Only the three Waystones refill hearts (Kody: refills must be rare); the tower fires do not. */
var BIG=['c0','way','top','way3','base','b1','b2'];
function bigCamp(){ var y=campOf(S.camp).y, id='c0'; BIG.forEach(function(b){ if(camps[b]&&camps[b].y<=y) id=b; }); return id; }
/* embers are the fuel for Ember Dash (Kody 2026-11-16): each dash burns one; a fall burns 3. With none left, X only fizzles. */
var fizzT=-9;
function noFuel(){ if(gt-fizzT<0.6) return; fizzT=gt; tone(220,150,0,0.12,'sine',0.03); pop('lp-embchip'); KIT.toast('No embers left to dash. Grab more!'); }
function outName(b){ return b==='c0'?'the village':(b==='base'?'the foot of the tower':(b[0]==='b'?'the last fire':'the Waystone')); }
/* lose a heart; true when that was the last one (then the hero goes back to the stretch's start with 3 hearts) */
function loseHeart(what){ S.falls++; S.campFalls++; var lost=S.embers.splice(Math.max(0,S.embers.length-3),3).length; S.fuel=Math.max(0,(S.fuel||0)-3); S.hearts--; hud(); pop('lp-hpchip');
  if(S.hearts<=0){ S.hearts=3; S.camp=bigCamp(); KIT.toast('Out of hearts! Back to '+outName(S.camp)); hud(); return true; }
  KIT.toast(what+' '+S.hearts+' heart'+(S.hearts>1?'s':'')+' left'+(lost?' · lost '+lost+' ember'+(lost>1?'s':''):'')); return false; }
function fall(why){ if(mode!=='play') return; if(why==='hurt'){ SND.hurt(); P.ouch=true; }
  loseHeart(why==='hurt'?'Ouch!':'You fell!'); respawned=false; setMode('respawn'); save(); }
/* a hard fall: landing 200+ px below the last ledge you stood on costs a heart, right where you land (a glide softens the landing) */
var groundY=0, glideAt=-9, HARD=200;
function hardFall(){ SND.hurt(); P.ouch=true; if(!RM.matches) shake=0.25; sq=0.6;
  if(loseHeart('Hard fall!')){ respawned=false; setMode('respawn'); } save(); }
function campCheck(){ if(!P.on) return; LV.camps.forEach(function(c,i){ if(c.id===S.camp) return; if(P.on.id!==c.id&&(Math.abs(P.y-c.y)>2||Math.abs(P.x-c.x)>140)) return;
  if(c.y<campOf(S.camp).y) return; S.camp=c.id; S.campFalls=0; SND.camp(); sparkle(c.x+12,c.y+34,8,'#FFD98A'); save(); }); }
function pickups(){ var px=P.x, py=P.y+22;
  LV.embers.forEach(function(e,i){ if(S.embers.indexOf(i)>=0) return; if(Math.abs(e[0]-px)<24&&Math.abs(e[1]-py)<30){ S.embers.push(i); S.fuel=(S.fuel||0)+1; SND.ember(); sparkle(e[0],e[1],6,'#FFC23D'); pop('lp-embchip'); hud(); save(); } });
  LV.feathers.forEach(function(f){ if(S.feathers.indexOf(f.id)>=0) return; if(Math.abs(f.x-px)<28&&Math.abs(f.y-py)<34){ S.feathers.push(f.id); SND.feather(); sparkle(f.x,f.y,14,'#2EC4B6'); KIT.toast('Star Feather! '+S.feathers.length+' of '+LV.feathers.length); hud(); pop('lp-fchip'); save(); } }); }
function finish(){ S.done=true; S.over=true; S.cp=false; S.score=score(); save(); SND.fire(); SND.beacon(); setMode('finish'); finishT=0; finCheer=false; hint(null);
  BOSS.on=false; bossClear(0); $('lp-boss').hidden=true; }
/* the end screen: after the beacon, or wherever the student chose to stop */
function stars(){ return [ [S.done,'beacon lit'], [S.answered>0&&S.correct/S.answered>=0.9,'90% right'], [S.embers.length>=LV.embers.length*0.9,'90% of embers'], [S.feathers.length>=LV.feathers.length,'every Star Feather'] ]; }
function showEnd(){ setMode('end'); panelAt=performance.now(); $('lp-hud').hidden=true; S.score=score(); save();
  var t=Math.round(S.playT), mm=Math.floor(t/60), ss=('0'+t%60).slice(-2), zi=zoneAt(S.best);
  $('lp-endtitle').textContent=S.done?'You lit the beacon!':'Climb ended in '+ZN[zi];
  $('lp-endtitle').style.fontSize=S.done?'88px':'68px';
  $('lp-endclimb').innerHTML=LV.zones.map(function(z,i){ var ok=i<4?S.st>i:S.done; return '<span style="'+(ok?'':'color:var(--muted)')+'">'+(z.finale?'The Beacon':z.name)+(ok?' ✓':'')+'</span>'; }).join('<span style="color:var(--muted)">›</span>');
  $('lp-endname').textContent=S.name+' · climbed '+Math.floor(S.best/20)+' m in '+mm+':'+ss+(S.falls?' · '+S.falls+' fall'+(S.falls>1?'s':''):' · no falls!');
  var st=[[S.correct+' of '+S.answered,'questions right'],[S.embers.length+' / '+LV.embers.length,'embers'],[S.feathers.length+' / '+LV.feathers.length,'Star Feathers'],[Math.min(3,S.st)+' / 3','moves learned']];
  $('lp-stats').innerHTML=st.map(function(s){ return '<div class="lp-stat"><b>'+s[0]+'</b><span>'+s[1]+'</span></div>'; }).join('');
  var sr=stars(), got=sr.filter(function(x){ return x[0]; }).length;
  $('lp-stars').innerHTML='<b>'+'★'.repeat(got)+'☆'.repeat(4-got)+'</b> &nbsp;'+sr.map(function(x){ return '<i class="'+(x[0]?'on':'')+'">'+x[1]+'</i>'; }).join(' · ');
  $('lp-endscore').textContent=S.score.toLocaleString(); $('lp-end').hidden=false;
  if(window.SpitzCode) setTimeout(function(){ window.SpitzCode.show('lp','starter',S); },0); }

/* ---------------- camera ---------------- */
function camFollow(dt,slow){ var tgt=P.y-200+(P.vy>200?50:0); if(tgt<-60) tgt=-60; var k=Math.min(1,dt*(slow?2.5:(tgt<cam?6:4.2))); cam+=(tgt-cam)*k; if(P.y-cam<70) cam=P.y-70; if(P.y-cam>H-90) cam=P.y-(H-90); }
var titleHeroX=780;
function titleCam(dt){ cam=-60; }

/* ---------------- effects ---------------- */
function puff(x,y,n,col){ if(RM.matches) n=Math.min(n,2); for(var i=0;i<n;i++) dust.push({x:x+(Math.random()-0.5)*20,y:y+2,vx:(Math.random()-0.5)*140,vy:20+Math.random()*60,t:0,max:0.35+Math.random()*0.2,r:4+Math.random()*4,col:col}); }
function ring(x,y){ for(var i=0;i<10;i++){ var a=i/10*Math.PI*2; dust.push({x:x,y:y,vx:Math.cos(a)*150,vy:Math.sin(a)*60-40,t:0,max:0.4,r:6,col:'#FFFFFF'}); } }
function sparkle(x,y,n,col){ for(var i=0;i<n;i++){ var a=Math.random()*Math.PI*2, s=60+Math.random()*120; sparks.push({x:x,y:y,vx:Math.cos(a)*s,vy:Math.sin(a)*s+60,t:0,max:0.5+Math.random()*0.3,col:col}); } }
function stepFx(dt){ dust=dust.filter(function(d){ d.t+=dt; d.x+=d.vx*dt; d.y+=d.vy*dt; d.vx*=0.9; d.vy*=0.92; return d.t<d.max; });
  sparks=sparks.filter(function(s){ s.t+=dt; s.x+=s.vx*dt; s.y+=s.vy*dt; s.vy-=300*dt; return s.t<s.max; });
  if(shake>0) shake-=dt;
  ghosts=ghosts.filter(function(g){ g.t-=dt; return g.t>0; });
  if(mode!=='finish') BOSS.a+=((BOSS.on?1:0)-BOSS.a)*Math.min(1,dt*2.5);
  BOSS.hurtT=Math.max(0,BOSS.hurtT-dt); BOSS.sc+=((1-0.2*bossPhase())-BOSS.sc)*Math.min(1,dt*3);
  /* hero animation state */
  sq*=Math.pow(0.0005,dt); if(Math.abs(sq)<0.01) sq=0; if(spin>0){ spin-=dt/0.34; if(spin<0) spin=0; }
  pom+=((P.vy<0?1:P.vy>200?-1:0)-pom)*Math.min(1,dt*10); lamp+=((-P.vx/330)*0.6-lamp)*Math.min(1,dt*8);
  var trail=P.on?(Math.abs(P.vx)/330):0.6, up=P.on?0:(P.vy>0?-1:1);
  var tgt=[[-9-trail*6,4-trail*3+up*5],[-7-trail*8,8-trail*2+up*7]]; scarf.forEach(function(s,i){ s[0]+=(tgt[i][0]+Math.sin(gt*8+i)*trail*1.5-s[0])*Math.min(1,dt*12); s[1]+=(tgt[i][1]-s[1])*Math.min(1,dt*12); });
  blinkT-=dt; if(blinkT<-0.12) blinkT=2+Math.random()*3; if(mode==='play'&&!P.on) P.ouch=false; }

/* ---------------- drawing ---------------- */
/* the sky by height: day -> sunset (Falls Cliffs) -> dusk (Windy Ruins) -> night (Beacon Summit) -> storm (the tower); dawn after the beacon is lit */
var SKY=[['#93C6CF','#BBD8C8','#E8DCAE','#F3C990','#F2B47C'],['#6F8CB8','#9E9BC0','#D9A2A8','#EEAE8E','#F4C381'],
         ['#3E3F78','#6A4E8E','#A45E92','#D97F86','#F0A77C'],['#0F1433','#182048','#26305F','#3A3F78','#5A4E8A'],['#0B0E24','#131733','#1D2145','#2A2C56','#383565']],
    DAWN=['#7FB7D6','#B9D4D2','#F3D9A4','#F8BE86','#F29A76'], mtnKey='';
function dawnK(){ return S.done?ramp(finishT,0.8,3.8):0; }
function skyAt(y){ var ks=[ramp(y,1500,2400),ramp(y,4400,5300),ramp(y,6500,7300),ramp(y,8250,8750)], i=0; for(var j=3;j>=0;j--) if(ks[j]>0){ i=j; break; }
  var k=ks[i], d=dawnK(); return SKY[i].map(function(c,n){ var m=A.mixHex(c,SKY[i+1][n],k); return d>0?A.mixHex(m,DAWN[n],d):m; }); }
function sy(y){ return H-(y-cam); }
function render(){
  var t=gt, c=LOWC; c.setTransform(0.5,0,0,0.5,0,0); c.imageSmoothingEnabled=false;   /* scenery is drawn at 480x270 and doubled, so it matches the pixel art */
  var sk=skyAt(cam+270), haze=sk[2], ox=shake>0?(Math.random()-0.5)*4:0, oy=shake>0?(Math.random()-0.5)*4:0, dk=dawnK(), night=ramp(cam,6500,7300)*(1-dk), i, j;
  /* sky in flat bands */
  for(i=0;i<5;i++){ c.fillStyle=sk[i]; c.fillRect(0,i*H/5-1,W,H/5+2); }
  if(night>0){ c.globalAlpha=night; c.drawImage(cache('stars',960,540,function(g,w,h){ A.stars(g,w,h,5); }),0,0,960,540); A.moon(c,800,104); c.globalAlpha=1; }
  var b1=ready(BG1)?Math.max(0,Math.min(1,1-(cam-1300)/700)):0;
  /* far peak + beacon (the goal, always in view, a little closer as you climb); it fades as the real tower comes into view */
  var pk=1-ramp(cam,7700,8250);
  if(b1<1&&pk>0){ c.globalAlpha=pk;
    var prog=Math.max(0,Math.min(1,cam/LV.summitY)), ms=Math.round((0.62+prog*0.5)*50)/50, key='mtn'+(S.done?1:0)+'_'+ms;
    if(key!==mtnKey){ delete CACHE[mtnKey]; mtnKey=key; }   // one cached peak at a time (it is redrawn about 25 times over the whole climb)
    var mt=cache(key,Math.ceil(640*ms),Math.ceil(1000*ms),function(g,w,h){ g.scale(ms,ms); A.mountain(g,640,1000,S.done); });
    var mw=640*ms, mx=560-mw/2, my=34+prog*120, bx=mx+mw*0.5, by=my+385*ms*0.13-26*ms;
    c.drawImage(mt,mx,my,Math.ceil(640*ms),Math.ceil(1000*ms));
    if(S.done){ c.fillStyle='rgba(255,217,138,.35)'; c.beginPath(); c.arc(bx,by,16+Math.sin(t*3)*2,0,7); c.fill(); }
    else A.cloud(c,bx+4,by-10*ms,0.5*ms,'#2A2244','#171226');   // the Gloom sits on the beacon from the start
    c.globalAlpha=1; }
  /* drifting clouds (none at night) */
  if(night<1){ c.globalAlpha=1-night; for(var k=0;k<2;k++){ var cxp=((k*287+t*(8+k*3))%(W+300))-150, cyp=60+k*70-(cam*0.06%400); A.cloud(c,cxp,((cyp%420)+420)%420+20,0.8+k*0.15,A.mixHex('#FFF6E8',sk[1],0.25),A.mixHex('#FFF6E8',sk[2],0.5)); } c.globalAlpha=1; }
  /* zone 1: ChatGPT's approved pixel backdrop (480x270 art px at 2x), sinking slowly as you climb */
  if(b1>0){ var by1=Math.max(0,cam*0.18); c.globalAlpha=b1; c.fillStyle='#BFE3E8'; c.fillRect(0,0,W,by1+2); c.drawImage(BG1,0,by1,960,540); c.globalAlpha=1; }
  /* valley hills (code art, behind the pixel backdrop in zone 1) */
  var v0=H-130+cam*0.25;
  if(v0<H+20&&b1<1){ c.drawImage(cache('r1',960,260,function(g,w,h){ A.ridge(g,w,h,7,A.mixHex('#A9BE9C',sk[2],0.35),A.mixHex('#93AD8B',sk[2],0.3),26); }),0,v0-120,960,260);
    c.drawImage(cache('r2',960,260,function(g,w,h){ A.ridge(g,w,h,19,'#7FA27A','#6B9068',40); }),0,v0-40+cam*0.15,960,260); }
  /* cliff walls (zone 2): rise in from below as the valley sinks, and fall away into the ruins */
  var cl=ramp(cam,1200,1900)*(1-ramp(cam,4500,5100));
  if(cl>0){ var tl=cache('cl',160,540,function(g,w,h){ A.cliff(g,w,h,3,-1,'#8C8AAE','#7A789C'); }), tr=cache('cr',160,540,function(g,w,h){ A.cliff(g,w,h,11,1,'#8C8AAE','#7A789C'); });
    c.globalAlpha=cl; var off=((cam*0.7)%540+540)%540; for(j=-1;j<2;j++){ c.drawImage(tl,-20,j*540+off,160,540); c.drawImage(tr,W-140,j*540+off,160,540); } c.globalAlpha=1; }
  /* zone 3: broken columns and arches drifting past in two layers */
  var rk=ramp(cam,4500,5100)*(1-ramp(cam,6450,6950));
  if(rk>0){ var r1=cache('ru1',960,900,function(g,w,h){ A.ruins(g,w,h,23,'#8A5E96','#7C548C'); }), r2=cache('ru2',960,900,function(g,w,h){ A.ruins(g,w,h,41,'#5A3F7A','#4C356C'); });
    var o1=((cam*0.3)%900+900)%900, o2=((cam*0.55)%900+900)%900; c.globalAlpha=rk*0.8;
    for(j=-1;j<1;j++) c.drawImage(r1,0,j*900+o1,960,900); c.globalAlpha=rk; for(j=-1;j<1;j++) c.drawImage(r2,0,j*900+o2,960,900); c.globalAlpha=1; }
  /* zone 4 and the tower: snowy rock walls */
  var ck=ramp(cam,6500,7100);
  if(ck>0){ var gl=cache('gl',160,540,function(g,w,h){ A.crag(g,w,h,5,-1,'#2E3766','#232B54','#C9D6F2'); }), gr=cache('gr',160,540,function(g,w,h){ A.crag(g,w,h,17,1,'#2E3766','#232B54','#C9D6F2'); });
    c.globalAlpha=ck; var of2=((cam*0.7)%540+540)%540; for(j=-1;j<2;j++){ c.drawImage(gl,-30,j*540+of2,160,540); c.drawImage(gr,W-130,j*540+of2,160,540); } c.globalAlpha=1; }
  /* the beacon tower itself (it stands in the world, behind the scaffolds you climb) */
  var TB=LV.base.y, TT=LV.finish.y;
  if(sy(TB-130)>-10&&sy(TT)<H+10){ var tw=cache('tw',300,300,function(g,w,h){ A.tower(g,w,h); });
    c.fillStyle='#2C2F50'; c.beginPath(); c.moveTo(330,sy(TB)); c.lineTo(630,sy(TB)); c.lineTo(566,sy(TB-120)); c.lineTo(394,sy(TB-120)); c.closePath(); c.fill();
    for(var y0=TB;y0<TT;y0+=300){ var hh=Math.min(300,TT-y0), ys=sy(y0+hh); if(ys>H||ys+hh<0) continue; c.drawImage(tw,0,300-hh,300,hh,330,ys,300,hh); } }
  /* village at the foot of the climb (scenery: no outlines) */
  if(cam<500){ var gy=sy(0); [[40,58,'#D9B48A','#9A5B48'],[520,70,'#E1C49C','#8C4E44'],[700,50,'#D5AE84','#A06A4C'],[830,64,'#DDBB91','#7F4A40']].forEach(function(hh,ii){ A.house(c,hh[0],gy,hh[1],hh[1]*0.8,A.mixHex(hh[2],haze,0.25),A.mixHex(hh[3],haze,0.25),'#FFD98A'); });
    [[160,gy,64],[470,gy,52],[905,gy,70],[640,gy,44]].forEach(function(p){ A.pine(c,p[0],p[1],p[2],A.mixHex('#4F7A5C',haze,0.2),A.mixHex('#3F6650',haze,0.2)); }); }
  /* the Gloom */
  if(BOSS.a>0.01){ var gu=BOSS.gust; A.gloom(c,BOSS.x,100,BOSS.sc,{ a:BOSS.a, mood:BOSS.hurtT>0?'hurt':(gu&&gu.blow?'blow':(gu||BOSS.warn.length?'warn':'idle')), look:Math.max(-1,Math.min(1,(P.x-BOSS.x)/200)), dir:gu?gu.dir:1 },RM.matches?0:t); }
  /* snow on the summit (not with reduce-motion) */
  var sn=ramp(cam,6600,7200)*(1-dk);
  if(sn>0&&!RM.matches){ c.fillStyle='rgba(255,255,255,'+(0.75*sn).toFixed(2)+')'; var wx=BW.off?-12:BW.vx*0.8;
    for(var q=0;q<26;q++){ var fx=((q*137+Math.sin(t*0.7+q)*30+t*wx)%960+960)%960, fy=((q*83+t*(46+(q%4)*14)+cam*0.4)%560+560)%560-10, z=q%3?2:4; c.fillRect(Math.round(fx/2)*2,Math.round(fy/2)*2,z,z); } }
  c=cx; c.setTransform(RS,0,0,RS,0,0); c.imageSmoothingEnabled=false; c.drawImage(LOW,0,0,W,H);
  c.save(); c.translate(ox,oy);
  /* the rune gates */
  LV.solids.forEach(function(s){ if(s.gate===undefined) return; var y1=sy(s.y+s.h); if(y1>H+40||y1<-70) return; var n=needOf(LV.st[s.gate]);
    A.gate(c,y1,S.st>s.gate?((opening&&s.gate===S.st-1)?Math.min(1,gateT/1.3):1):0,t,S.st>s.gate?n:(S.st===s.gate?S.runes:0),n); });
  /* wind */
  WORLD.winds.forEach(function(w){ drawWind(c,w,t); });
  /* lifts' ropes */
  LV.plats.forEach(function(p){ if(!p.per) return; var q=LPPH.platAt(p,gt), x=q.x, yy=sy(q.y); if(yy<-60||yy>H+60) return; c.strokeStyle='rgba(42,27,46,.55)'; c.lineWidth=2;
    if(p.mx){ var cy=sy(p.y+150); c.beginPath(); c.moveTo(p.x-10,cy); c.lineTo(p.x+p.mx+p.w+10,cy); c.stroke(); c.beginPath(); c.moveTo(x+14,yy); c.lineTo(x+p.w/2,cy); c.lineTo(x+p.w-14,yy); c.stroke(); c.fillStyle='#6B4A30'; c.beginPath(); c.arc(x+p.w/2,cy,5,0,7); c.fill(); }
    else { var top=sy(p.y+p.my+260); c.beginPath(); c.moveTo(x+14,yy); c.lineTo(x+14,top); c.moveTo(x+p.w-14,yy); c.lineTo(x+p.w-14,top); c.stroke(); } });
  /* solid rock slabs (the ice shelf, its roof, the alcove floor): the ledges on top of them are drawn after */
  LV.solids.forEach(function(s){ if(s.gate!==undefined||s.ice) return; var y0=sy(s.y+s.h); if(y0>H+10||y0+s.h<-10) return; A.rr(c,s.x-2,y0,s.w+4,s.h,5); A.ol(c,'#62729C'); });
  /* camps, signs, the Waystones and the tower's fires */
  LV.camps.forEach(function(cp){ if(cp.id==='c0') return; var yy=sy(cp.y); if(yy<-20||yy>H+80) return; A.camp(c,cp.x,yy,litCamp(cp),t); });
  LV.signs.forEach(function(s){ if(s.min!==undefined&&S.st<s.min) return; if(s.max!==undefined&&S.st>s.max) return; var yy=sy(s.y); if(yy<-40||yy>H+70) return; A.sign(c,s.x,yy,s.text,s.keys,F); });
  LV.st.forEach(function(s){ var yy=sy(s.y); if(yy<-20||yy>H+220) return; var n=needOf(s), lit=S.st>s.i?n:(S.st===s.i?S.runes:0);
    if(s.kind==='way') A.waystone(c,s.x,yy,lit,n,t,S.st===s.i);
    else if(s.last) A.beacon(c,s.x,yy,lit,n,S.done?ramp(finishT,0,1.6):0,RM.matches?0:t);
    else A.brazier(c,s.x,yy,lit,n,S.st>s.i,RM.matches?0:t); });
  /* ledges + thorns */
  LV.plats.forEach(function(p){ var q=LPPH.platAt(p,gt), yy=sy(q.y); if(yy<-30||yy>H+70) return;
    var alive=LPPH.alive(p,gt), x=q.x;
    if(!alive){ var ft=gt-p.goneAt; if(ft<0.7){ c.globalAlpha=1-ft/0.7; A.ledge(c,p,x,yy+ft*ft*600,t); c.globalAlpha=1; } return; }
    if(p.kind==='crumble'&&p.tT!==undefined&&!RM.matches) x+=Math.sin(gt*70)*1.5;
    A.ledge(c,p,x,yy,t); if(p.thorn) A.thorns(c,p.thorn[0],yy,p.thorn[1],t); });
  /* ice walls */
  LV.solids.forEach(function(s){ if(!s.ice||s.off) return; var y0=sy(s.y+s.h); if(y0>H+10||y0+s.h<-10) return; A.ice(c,s.x,y0,s.w,s.h); });
  /* pickups */
  LV.embers.forEach(function(e,i){ if(S.embers.indexOf(i)>=0) return; var yy=sy(e[1]); if(yy<-20||yy>H+20) return; c.drawImage(cache('ember',28,32,function(g){ A.ember(g,14,17,1,0); }),e[0]-14,yy+Math.sin(t*2.4+i)*3-17,28,32); });
  LV.feathers.forEach(function(f){ if(S.feathers.indexOf(f.id)>=0) return; var yy=sy(f.y); if(yy<-30||yy>H+30) return; A.feather(c,f.x,yy+Math.sin(t*2)*4,1.1,t); });
  /* the Gloom's ice: a marked lane and a growing icicle first, then the drop */
  BOSS.warn.forEach(function(w){ if(w.t<0) return; var kk=Math.min(1,w.t/w.tele); c.fillStyle='rgba(216,243,255,.34)'; for(var y=156;y<H;y+=22) c.fillRect(w.x-1.5,y,3,10);
    c.save(); c.translate(w.x+(RM.matches?0:Math.sin(t*44)*1.5*kk),124); c.scale(0.45+0.55*kk,0.45+0.55*kk); A.icicle(c,0,26); c.restore(); });
  BOSS.ice.forEach(function(ic){ A.icicle(c,ic.x,sy(ic.y)); });
  /* dust behind, hero, sparks in front */
  dust.forEach(function(d){ c.globalAlpha=1-d.t/d.max; c.fillStyle=d.col; c.beginPath(); c.arc(d.x,sy(d.y),d.r*(1+d.t*2),0,7); c.fill(); }); c.globalAlpha=1;
  if(ready(HERO)&&!RM.matches) ghosts.forEach(function(g){ c.globalAlpha=0.45*g.t/0.2; spriteHero(c,'run',g.x,sy(g.y),g.face,0); }); c.globalAlpha=1;
  if(mode!=='respawn'||modeT>0.45||modeT<0.12){ drawHero(c,P.x,sy(P.y),1.2); if(P.glide) canopy(c,P.x,sy(P.y)); }
  sparks.forEach(function(s){ c.globalAlpha=1-s.t/s.max; c.save(); c.translate(s.x,sy(s.y)); c.scale(0.6,0.6); A.star(c,s.col); c.restore(); }); c.globalAlpha=1;
  c.restore();
  /* respawn: a soft iris to the last lantern */
  if(mode==='respawn'){ var a=modeT<0.45?modeT/0.45:1-(modeT-0.45)/0.45; c.fillStyle='rgba(27,20,38,'+(0.85*Math.max(0,Math.min(1,a)))+')'; c.fillRect(0,0,W,H); }
  if(S.done){ c.fillStyle='rgba(255,217,138,'+(0.12*ramp(finishT,0.4,2)).toFixed(3)+')'; c.fillRect(0,0,W,H); }
  meter();
}
/* wind you can see: a faint column or band, streaks that move with it, and arrows (so it still reads with reduce-motion) */
function drawWind(c,w,t){ if(w.off) return; var i, tt=RM.matches?0:t;
  if(w===BW){ var sg=w.vx>0?1:-1; c.fillStyle='rgba(255,255,255,.4)'; for(i=0;i<12;i++){ var gx=((tt*520*sg+i*173)%(W+120)+W+120)%(W+120)-60; c.fillRect(gx,(i*47+13)%H,56,3); } return; }
  var y0=sy(w.y+w.h), y1=sy(w.y); if(y1<-10||y0>H+10) return;
  c.fillStyle='rgba(255,255,255,.07)'; c.fillRect(w.x,y0,w.w,w.h); c.fillStyle='rgba(255,255,255,.55)';
  if(w.up){ for(i=0;i<8;i++){ var ph=((tt*190+i*97)%w.h+w.h)%w.h; c.globalAlpha=Math.min(1,ph/60,(w.h-ph)/60); c.fillRect(w.x+10+((i*53)%(w.w-20)),sy(w.y+ph)-22,3,22); } }
  else { var s2=w.vx>0?1:-1; for(i=0;i<9;i++){ var pw=((tt*260*s2+i*131)%w.w+w.w)%w.w; c.globalAlpha=Math.min(1,pw/60,(w.w-pw)/60); c.fillRect(w.x+pw,sy(w.y+14+((i*71)%(w.h-28))),34,3); } }
  c.globalAlpha=0.4; c.strokeStyle='#FFFFFF'; c.lineWidth=3; c.lineJoin='miter'; c.beginPath();
  if(w.up){ for(var yy=w.y+70;yy<w.y+w.h-20;yy+=150){ var mx=w.x+w.w/2, my=sy(yy); c.moveTo(mx-12,my+10); c.lineTo(mx,my-2); c.lineTo(mx+12,my+10); } }
  else { var d=w.vx>0?1:-1; for(var xx=w.x+90;xx<w.x+w.w-40;xx+=170){ var ny=sy(w.y+w.h/2); c.moveTo(xx-10*d,ny-12); c.lineTo(xx+2*d,ny); c.lineTo(xx-10*d,ny+12); } }
  c.stroke(); c.globalAlpha=1; }
function litCamp(cp){ var order=LV.camps.map(function(c){ return c.id; }); return order.indexOf(cp.id)<=order.indexOf(S.camp); }
function pose(){ var sp=P.on?Math.min(1,Math.abs(P.vx)/330):0; return { run:runPh, speed:sp, air:P.on?null:(P.vy>60?-1:1), sq:sq, spin:spin>0?(1-spin)*Math.PI*2:0, blink:blinkT<0, face:P.face, scarf:scarf, lamp:lamp, pom:pom, t:gt, ouch:P.ouch }; }
var runPh=0;
function drawHero(c,x,y,s){ if(P.on) runPh+=Math.abs(P.vx)*(1/60)/11;
  if(ready(HERO)){ var f, sp=P.on?Math.abs(P.vx):0;
    if(mode==='title') f='front'; else if(P.dashT>0) f='run'; else if(!P.on) f=P.vy>40&&!P.glide?'jump':'fall'; else if(gt-lastLandT<0.12&&sq>0.2) f='land'; else if(sp>30) f=(Math.floor(runPh/1.6)%2)?'run':'idle'; else f='idle';
    spriteHero(c,f,x,y,P.face||1,spin>0&&!RM.matches?(1-spin)*Math.PI*2:0,P.ouch); return; }
  var ps=pose(); if(mode==='title'){ ps.wave=1; ps.face=-1; } A.hero(c,x,y,s,ps); }
/* draws one pose from the approved pixel sheet, feet at (x,y) */
function spriteHero(c,f,x,y,face,rot,ouch){ var r=PIX.heroF[f], w=r[2], h=r[3];
  c.save(); c.imageSmoothingEnabled=false; c.translate(Math.round(x),Math.round(y)); if(rot){ c.translate(0,-20); c.rotate(rot*face); c.translate(0,20); } c.scale(face,1);
  c.drawImage(HERO,r[0],r[1],w,h,-Math.round(w/2),-h,w,h); c.restore(); }
/* Scarf Glide: the scarf spread overhead like a little kite (chunky 2 px blocks, like the sprite) */
function canopy(c,x,y){ var X=Math.round(x/2)*2, Y=Math.round(y/2)*2; c.fillStyle=A.PLUM; c.fillRect(X-24,Y-68,48,10); c.fillRect(X-30,Y-62,8,10); c.fillRect(X+22,Y-62,8,10); c.fillRect(X-27,Y-54,2,14); c.fillRect(X+25,Y-54,2,14);
  c.fillStyle='#2EC4B6'; c.fillRect(X-22,Y-66,44,6); c.fillRect(X-28,Y-60,6,6); c.fillRect(X+22,Y-60,6,6); c.fillStyle='#7FE3D8'; c.fillRect(X-16,Y-66,22,2); }
function meter(){ var y=Math.max(0,Math.min(1,P.y/LV.summitY))*800; if(Math.abs(y-meY)>0.5){ meY=y; var me=$('lp-me'); if(me) me.style.bottom=(y-22)+'px'; } }

/* the new move's demo on the reward card: Pip shows it on loop */
var demoT=0, dcv=$('lp-demo'), dcx=dcv.getContext('2d');
function demo(dt){ demoT+=dt; var c=dcx, m=rewardMove, T, x=60, y=200, f='idle', spn=0, label='', gl=false, u, v;
  c.setTransform(1,0,0,1,0,0); c.clearRect(0,0,520,260); c.fillStyle='#2B2140'; c.fillRect(0,0,520,260);
  if(m==='dj'){ T=demoT%2.4; A.ledge(c,{kind:'stone',w:130},20,200,0); A.ledge(c,{kind:'stone',w:130},370,110,0); label='Space';
    if(T<0.3){ x=60+T*200; f=(Math.floor(T*8)%2)?'run':'idle'; }
    else if(T<1.3){ u=T-0.3; x=120+u*300; y=200-(380*u-420*u*u); f=u<0.6?'jump':'fall'; if(u>0.42){ v=u-0.42; y=200-(380*0.42-420*0.42*0.42)-(330*v-500*v*v); spn=Math.min(1,v/0.3); label='Space again!'; } if(y>200) y=200; }
    else { x=420; y=110; label=''; }
    if(T>0.72&&T<0.82){ c.fillStyle='rgba(255,255,255,.7)'; c.beginPath(); c.ellipse(120+0.42*300,200-(380*0.42-420*0.42*0.42)+20,26,7,0,0,7); c.fill(); } }
  else if(m==='gl'){ T=demoT%3.8; A.ledge(c,{kind:'ruin',w:100},10,206,0); A.ledge(c,{kind:'ruin',w:100},410,206,0); label='Space';
    if(T<0.3){ x=40+T*150; y=206; f=(Math.floor(T*8)%2)?'run':'idle'; }
    else if(T<0.75){ u=T-0.3; x=85+u*200; y=206-(420*u-460*u*u); f='jump'; }
    else if(T<1.15){ u=T-0.75; x=175+u*200; y=110-(300*u-380*u*u); f='jump'; spn=Math.min(1,u/0.3); label='Space again!'; }
    else if(T<3.05){ u=T-1.15; x=255+u*104; y=51+u*81.5; f='fall'; gl=true; label='Keep holding Space'; }
    else { x=452; y=206; label=''; } }
  else { T=demoT%2.8; A.ledge(c,{kind:'snow',w:480},20,206,0); label='';
    if(T<0.7){ x=60+T*160; y=206; f=(Math.floor(T*8)%2)?'run':'idle'; }
    else if(T<0.95){ u=T-0.7; x=172+u*640; y=206; f='run'; label='X'; if(!RM.matches) for(v=1;v<4;v++){ c.globalAlpha=0.4-0.1*v; if(ready(HERO)){ c.save(); c.translate(x-v*26,y); c.scale(1.5,1.5); spriteHero(c,'run',0,0,1,0); c.restore(); } } c.globalAlpha=1; }
    else if(T<1.6){ x=Math.min(430,332+(T-0.95)*160); y=206; f=x<430?((Math.floor(T*8)%2)?'run':'idle'):'idle'; }
    else { x=430; y=206; }
    if(T<0.86) A.ice(c,262,86,30,120); else if(T<1.3){ c.fillStyle='#D8F3FF'; for(v=0;v<7;v++){ u=T-0.86; c.fillRect(277+Math.cos(v*2.4)*u*190,150+Math.sin(v*2.4)*u*120+u*u*260-(v%3)*24,6,6); } } }
  if(ready(HERO)){ c.save(); c.translate(x,y); c.scale(1.5,1.5); spriteHero(c,f,0,0,1,spn>0&&spn<1&&!RM.matches?spn*Math.PI*2:0); if(gl) canopy(c,0,0); c.restore(); }
  else A.hero(c,x,y,1.6,{ run:T*14, speed:f==='run'?1:0, air:f==='jump'?-1:(f==='fall'?1:null), sq:0, spin:spn>0&&spn<1&&!RM.matches?spn*Math.PI*2:0, face:1, scarf:[[-12,2],[-10,6]], lamp:0, pom:0, t:demoT });
  if(label){ c.font='600 22px '+F; c.fillStyle='#FFF6E8'; c.textAlign='left'; c.fillText(label,20,40); } }

/* ---------------- main loop ---------------- */
var last=performance.now(), fpsN=0, fpsT=0, testHold=false;
function loop(now){ var dt=Math.min(0.05,(now-last)/1000); last=now;
  try{ if(!testHold) update(dt); else if(mode==='title') update(dt); if(mode==='title'){ P.x=titleHeroX; P.y=0; P.on=LV.plats[0]; P.vx=0; stepFx(dt); } render(); if(mode==='reward') demo(dt); }catch(e){ console.error(e); }
  requestAnimationFrame(loop); }

/* ---------------- boot ---------------- */
fit(); setMode('title'); P.x=titleHeroX;
if(S.name) $('lp-name').value=S.name; $('lp-go').disabled=!$('lp-name').value.trim();
if(S.started&&!S.over){ $('lp-go').textContent='Keep climbing'; }
if(S.over){ S=Object.assign(fresh(),{name:S.name}); save(); }
requestAnimationFrame(loop);
setTimeout(function(){ if(!$('lp-start').hidden) try{ $('lp-name').focus(); }catch(e){} },300);

/* ---------------- test hooks ---------------- */
window.__G={ state:function(){ return S; }, hero:function(){ return P; }, mode:function(){ return mode; }, level:LV, need:need, ph:PH, boss:BOSS, wind:BW,
  key:function(a,b){ held[a]=!!b; if(b&&a==='j') jumpEdge=true; if(b&&a==='dn') downEdge=true; if(b&&a==='ds') dashEdge=true; },
  setSt:function(n,camp){ S.st=n; S.runes=0; moves(); solids(); if(camp) S.camp=camp; hud(); bossBar(); },   // tests: jump to a stage
  calm:function(b){ BOSS.calm=!!b; if(b) bossClear(0); }, closeCP:function(){ S.cp=false; S.q=null; S.qDone=false; $('lp-cp').hidden=true; setMode('play'); }, opening:function(){ return opening; },
  tp:function(x,y){ P=LPPH.fresh(x,y); P.on=null; groundY=y; cam=Math.max(-60,y-200); },
  setCamp:function(id){ S.camp=id; }, step:function(dt){ update(dt); }, cam:function(){ return cam; }, rs:function(){ return RS; },
  blocked:function(){ return Object.keys(blocked); }, gt:function(){ return gt; }, hold:function(b){ testHold=!!b; }, held:function(){ return held; }, end:function(){ finish(); finishT=9; showEnd(); }, openCP:openCP, endEarly:endEarly, world:WORLD };
})();
