/* ================= LANTERN PEAK =================
   A short climbing adventure (vertical slice: Pinewood Steps -> the first Waystone -> Falls Cliffs -> Falls Lookout).
   Loop: climb freely (running and jumping cost nothing) -> reach a Waystone -> answer questions to light its runes (the world is frozen,
   no clock) -> the gate opens and you learn a new move -> the next zone is built around that move.
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
/* math cadence: quick sets (facts answer in 2-3 s) light 5 runes, the algebra sets 3 */
var NEED=FAST?5:3;
var RM=matchMedia('(prefers-reduced-motion: reduce)');

/* ---------------- questions (no set in the link and no questions.js: plain multiplication facts) ---------------- */
function ri(a,b){ return a+Math.floor(Math.random()*(b-a+1)); }
function multQ(){ var a=ri(2,12), b=ri(2,12), ans=a*b, seen={}, ch=[{html:''+ans,ok:true,why:''}]; seen[ans]=1;
  [a,-a,b,-b,10,-10,1,-1,2*a].forEach(function(d){ var v=ans+d; if(ch.length<4&&v>0&&!seen[v]){ seen[v]=1; ch.push({html:''+v,ok:false,why:a+' × '+b+' means '+b+' groups of '+a+'.'}); } });
  ch.sort(function(){ return Math.random()-0.5; });
  return { topic:'Multiplication', type:'mult', prompt:'<span class="lp-eq">'+a+' × '+b+' = ?</span>', visual:'', choices:ch, explain:'<span class="lp-eq">'+a+' × '+b+' = <span class="c-ans">'+ans+'</span></span>' }; }
function nextQuestion(){ return QS?QS.next():multQ(); }

/* ---------------- run state (saved: a reload or a slow Chromebook keeps the climb; scorecode.js clears it after 20 minutes) ---------------- */
function fresh(){ return { ver:1, name:'', started:false, over:false, len:0, score:0, answered:0, correct:0,
  topics:QS?QS.topicTable():{'Multiplication':[0,0]}, q:null, qDone:false, picked:-1,
  camp:'c0', dj:false, runes:0, cp:false, reward:false, embers:[], feathers:[], falls:0, playT:0, best:0, done:false, campFalls:0, help:false, zone:0, hints:{} }; }
var S=load()||fresh();
function save(){ try{ localStorage.setItem(KEY,JSON.stringify(S)); localStorage.setItem(KEY+'_mute',muted?'1':'0'); }catch(e){} }
function load(){ try{ muted=localStorage.getItem(KEY+'_mute')==='1'; var v=JSON.parse(localStorage.getItem(KEY)||'null'); if(v&&v.ver===1&&v.topics&&Array.isArray(v.embers)) return v; }catch(e){} return null; }
function score(){ return S.embers.length*10+S.feathers.length*250+S.correct*100+Math.floor(S.best/10)+(S.done?500:0); }

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
  pause:function(){ tone(440,330,0,0.12,'sine',0.04); }
};
/* the song: a gentle folk loop in D (plucked triangle arpeggios, soft bass); it backs off while a question is up */
var CH=[[146.83,[293.66,369.99,440,587.33]],[123.47,[246.94,293.66,369.99,493.88]],[98,[196,246.94,293.66,392]],[110,[220,277.18,329.63,440]]], ROLL=[0,1,2,3,2,1,2,1];
var SONG={ level:0.085, echo:0.27,
  want:function(){ return !!S&&S.started&&!S.over; },
  busy:function(){ return mode==='play'; },
  sd:function(){ return 60/96/2; },
  voice:function(f,t0,dur){ tone(f,f,t0,dur,'triangle',0.12); },
  step:function(ctx,g,i,t,sd){ var bar=Math.floor(i/8), c=CH[bar%4], k=i%8;
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
var gateOpen=0, dust=[], sparks=[], shake=0, scarf=[[-9,4],[-7,8]], pom=0, lamp=0, sq=0, spin=0, blinkT=2, lastLandT=0, flash=0;
var camps={}; LV.camps.forEach(function(c){ camps[c.id]=c; });
function campOf(id){ return camps[id]||camps.c0; }
function solids(){ LV.solids.forEach(function(s){ if(s.gate) s.off=S.dj; }); return LV.solids; }
var WORLD={ plats:LV.plats, solids:LV.solids, hazards:LV.hazards, t:0, dj:false };

/* ---------------- input: held keys, fresh presses, and the guard that keeps a held key or click from answering ---------------- */
var held={}, blocked={}, downKeys={}, jumpEdge=false, downEdge=false, ptrDownAt=0, qShownAt=0, answeredAt=0, panelAt=0;
function act(k){ return ({arrowleft:'l',a:'l',arrowright:'r',d:'r',arrowup:'j',w:'j',' ':'j',z:'j',arrowdown:'dn',s:'dn'})[k]; }
function blockHeld(){ Object.keys(downKeys).forEach(function(k){ blocked[k]=true; }); held={}; jumpEdge=downEdge=false; P.buf=0; }
function inp(){ var j=held.j; return { l:!!held.l, r:!!held.r, jumpHeld:!!j, jumpPressed:jumpEdge, downPressed:downEdge }; }
addEventListener('pointerdown',function(){ ptrDownAt=performance.now(); ac(); },true);
addEventListener('blur',function(){ held={}; downKeys={}; if(mode==='play') pause(true); });
document.addEventListener('visibilitychange',function(){ if(document.hidden&&mode==='play') pause(true); });

document.addEventListener('keydown',function(e){
  var k=(e.key||'').toLowerCase(); downKeys[k]=1; var typing=document.activeElement===$('lp-name');
  if(typing){ if(k==='enter'&&!$('lp-go').disabled){ e.preventDefault(); start(); } return; }
  if(!$('sz-ask').hidden){ e.preventDefault(); if(k==='y') newRun(); else if(k==='n'||k==='escape') askNew(false); return; }
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
  if(mode==='play'){ if(!held[a]&&!e.repeat){ if(a==='j') jumpEdge=true; if(a==='dn') downEdge=true; } }
  held[a]=true;
});
document.addEventListener('keyup',function(e){ var k=(e.key||'').toLowerCase(); delete blocked[k]; delete downKeys[k]; var a=act(k); if(a) held[a]=false; });

/* ---------------- flow ---------------- */
function setMode(m){ mode=m; modeT=0; $('lp-hud').hidden=!(m==='play'||m==='respawn'||m==='finish'||m==='cp'||m==='reward'||m==='pause'); }
function start(){ var n=$('lp-name').value.trim().replace(/\s+/g,' '); if(!n) return; ac();
  if(!S.started){ S=fresh(); S.name=n; S.started=true; }
  save(); $('lp-start').hidden=true; KIT.jingle(); place(campOf(S.camp)); gateOpen=S.dj?1:0; buildMeter(); hud(); setMode('play');
  if(S.cp) setTimeout(openCP,50); else if(S.reward) setTimeout(function(){ S.reward=false; openReward(); },50);
  showZone(zoneAt(P.y),true); }
function place(c){ P=LPPH.fresh(c.x,c.y); P.face=1; cam=Math.max(-60,c.y-190); LV.plats.forEach(function(p){ delete p.goneAt; delete p.tT; }); }
function pause(o){ if(o){ if(mode==='pause') return; pauseFrom=mode; setMode('pause'); $('lp-pause').hidden=false; $('lp-pausewhere').textContent=ZN[zoneAt(P.y)]+' · '+Math.floor(Math.max(0,P.y)/20)+' m'; pauseLabels(); SND.pause(); blockHeld(); }
  else { if(mode!=='pause') return; $('lp-pause').hidden=true; setMode(pauseFrom||'play'); blockHeld(); if(mode==='cp') qShownAt=performance.now(); } }
var pauseFrom='play';
function pauseLabels(){ $('lp-pmute').textContent='Sound: '+(muted?'off':'on')+'  (M)'; $('lp-pmusic').textContent='Music: '+(KIT.musicOff()?'off':'on')+'  (N)'; }
$('lp-pausebtn').addEventListener('click',function(){ if(mode==='play') pause(true); });
$('lp-resume').addEventListener('click',function(){ pause(false); });
$('lp-pmute').addEventListener('click',function(){ muted=!muted; save(); pauseLabels(); });
$('lp-pmusic').addEventListener('click',function(){ KIT.musicToggle(); pauseLabels(); });
$('lp-prestart').addEventListener('click',function(){ askNew(true); });
function askNew(o){ $('sz-ask').hidden=!o; if(o&&mode==='play') pause(true); }
$('sz-askyes').addEventListener('click',newRun); $('sz-askno').addEventListener('click',function(){ askNew(false); });
function newRun(){ var n=S.name; S=fresh(); S.name=n; try{ localStorage.setItem(KEY,JSON.stringify(S)); }catch(e){} location.reload(); }
$('lp-again').addEventListener('click',newRun);
function fullscreen(){ var d=document, e=d.documentElement; if(d.fullscreenElement||d.webkitFullscreenElement) (d.exitFullscreen||d.webkitExitFullscreen).call(d); else (e.requestFullscreen||e.webkitRequestFullscreen||function(){}).call(e); }
$('lp-name').addEventListener('input',function(){ $('lp-go').disabled=!this.value.trim(); });
$('lp-go').addEventListener('click',start);

/* ---------------- zones, meter, HUD ---------------- */
var ZN=LV.zones.map(function(z){ return z.name; });
function zoneAt(y){ var z=0; LV.zones.forEach(function(q,i){ if(!q.locked&&y>=q.y+10) z=i; }); return z; }
var zoneT=0;
function showZone(z,first){ var el=$('lp-zone'); el.innerHTML='<small>Zone '+(z+1)+' of 4</small>'+ZN[z]; el.classList.add('on'); clearTimeout(zoneT); zoneT=setTimeout(function(){ el.classList.remove('on'); },first?2600:2400); }
var ZC=['#86B86A','#2EC4B6','#C98BE0','#7E8DB0'];
function buildMeter(){ var m=$('lp-meter'), h=800, top=LV.summitY, html='<div class="rail"></div>';
  LV.zones.forEach(function(z,i){ var y0=z.y, y1=i<LV.zones.length-1?LV.zones[i+1].y:top; html+='<div class="zone'+(z.locked?' locked':'')+'" style="bottom:'+(y0/top*h)+'px;height:'+((y1-y0)/top*h-4)+'px;background:'+ZC[i]+'"></div>'; });
  html+='<div class="tick" style="bottom:'+(LV.finish.y/top*h)+'px">Lookout ▸</div>';
  html+='<svg class="goal" viewBox="0 0 56 56"><path d="M20 50h16l-2-26h-12z" fill="#7E8DB0" stroke="#2A1B2E" stroke-width="3" stroke-linejoin="round"/><path d="M16 24h24l-12-14z" fill="#5A6385" stroke="#2A1B2E" stroke-width="3" stroke-linejoin="round"/><rect x="24" y="30" width="8" height="9" fill="#C9A86A" stroke="#2A1B2E" stroke-width="2"/></svg>';
  html+='<div class="me" id="lp-me"></div>'; m.innerHTML=html; }
var meY=-1;
function hud(){ $('lp-emb').textContent=S.embers.length; $('lp-feath').textContent=S.feathers.length; $('lp-fchip').hidden=!S.feathers.length; $('lp-abchip').hidden=!S.dj; }
function pop(id){ var e=$(id); e.classList.remove('pop'); void e.offsetWidth; e.classList.add('pop'); }
var hintKey='', hintT=0;
function hint(html,key){ var el=$('lp-hint'); if(!html){ el.classList.remove('on'); hintKey=''; return; } if(hintKey===key) return; hintKey=key; el.innerHTML=html; el.classList.add('on'); }
function hints(){ var h=S.hints;
  if(!h.run) return hint('<kbd>←</kbd><kbd>→</kbd> Run','run');
  if(!h.jump) return hint('<kbd>Space</kbd> or <kbd>↑</kbd> Jump','jump');
  if(S.dj&&!h.hop) return hint('Jump, then <kbd>Space</kbd> again in the air: Cloud Hop','hop');
  if(S.help&&!h.helpSeen) return hint('A helping wind: your jumps go higher until the next lantern','help');
  hint(null); }

/* ---------------- the Waystone (math checkpoint) ---------------- */
function nearWay(){ return P.on&&P.on.id==='way'&&Math.abs(P.x-LV.way.x)<58; }
function runes(){ var h=''; for(var i=0;i<NEED;i++){ var on=i<S.runes; h+='<svg class="lp-rune" viewBox="0 0 58 58"><circle cx="29" cy="29" r="24" fill="'+(on?'#FFC23D':'#3A2D50')+'" stroke="#2A1B2E" stroke-width="4"/>'+(on?'<path d="M29 15l4 10 10 4-10 4-4 10-4-10-10-4 10-4z" fill="#FFF1C2"/>':'<circle cx="29" cy="29" r="6" fill="#5D6178"/>')+'</svg>'; }
  $('lp-runes').innerHTML=h; var left=NEED-S.runes; $('lp-cpsub').textContent=left>0?'Light '+left+' more rune'+(left>1?'s':'')+' to open the gate':'Every rune is lit!'; }
function openCP(){ S.cp=true; setMode('cp'); blockHeld(); P.vx=0; $('lp-cp').hidden=false; $('lp-card').hidden=false; $('lp-reward').hidden=true; hint(null);
  if(!S.q||(S.qDone&&S.runes<NEED&&!keepAnswered)){ newQ(); } else showQ(); keepAnswered=false; save(); }
var keepAnswered=true;   // on a reload mid-Waystone, the answered question stays up with its explanation
function newQ(){ S.q=nextQuestion(); S.qDone=false; S.picked=-1; save(); showQ(); }
function showQ(){ var q=S.q; runes(); $('lp-tag').textContent=q.topic;
  $('lp-prompt').innerHTML=q.prompt; $('lp-visual').innerHTML=q.visual||''; $('lp-q').classList.toggle('vis',!!q.visual);
  $('lp-choices').innerHTML=q.choices.map(function(c,i){ return '<button class="lp-ch" data-i="'+i+'"><span class="k">'+(i+1)+'</span><span class="t">'+c.html+'</span></button>'; }).join('');
  var fb=$('lp-fb'); fb.hidden=true; fb.className='lp-fb'; fb.innerHTML=''; $('lp-next').hidden=true;
  $('lp-cpnote').textContent='Press 1, 2, 3 or 4, or click an answer. Take your time: the mountain waits.';
  qShownAt=performance.now(); if(S.qDone) mark(S.picked,false); }
function mark(i,fresh){ var q=S.q, c=q.choices[i], btns=$('lp-choices').querySelectorAll('.lp-ch'), fb=$('lp-fb');
  btns.forEach(function(b,j){ b.disabled=true; if(q.choices[j].ok) b.classList.add('right'); });
  if(btns[i]){ if(!c.ok) btns[i].classList.add('wrong'); btns[i].insertAdjacentHTML('beforeend','<span class="mine">Your answer</span>'); }
  fb.hidden=false;
  if(c.ok){ fb.className='lp-fb ok'; fb.innerHTML='<span class="h">Correct! A rune lights up.</span>'+q.explain; }
  else { fb.className='lp-fb bad'; fb.innerHTML='<span class="h">Not quite. No rune this time.</span>'+(c.why?c.why+'<br>':'')+q.explain; }
  var left=NEED-S.runes;
  $('lp-cpnote').textContent=c.ok?(left>0?left+' more to go.':'The gate is opening!'):'Read how it works, then try a new question. Nothing is lost.';
  var nx=$('lp-next'); nx.hidden=false; nx.firstChild.textContent=(c.ok&&left<=0)?'Open the gate ':(c.ok?'Next question ':'Try a new question '); }
function answer(i,how){ if(mode!=='cp'||S.qDone||!S.q) return; var now=performance.now();
  if(now-qShownAt<450) return;                                  // a key or click that was already on its way when the question appeared
  if(how==='click'&&ptrDownAt<qShownAt) return;                   // a press that started before the question was up
  var c=S.q.choices[i]; if(!c) return;
  S.qDone=true; S.picked=i; S.answered++; var tp=S.topics[S.q.topic]||(S.topics[S.q.topic]=[0,0]); tp[1]++;
  if(c.ok){ S.correct++; tp[0]++; S.runes++; SND.correct(); SND.rune(S.runes-1); var b=$('lp-choices').querySelectorAll('.lp-ch')[i]; if(b){ var p=KIT.stagePoint(b,80,40); KIT.confetti(p[0],p[1],RM.matches?14:26,1.6); } }
  else SND.miss();
  answeredAt=now; save(); mark(i,true); runes(); }
function cont(how){ if(mode!=='cp'||!S.qDone) return; if(performance.now()-answeredAt<400) return;
  if(S.runes>=NEED){ S.cp=false; S.q=null; S.qDone=false; S.picked=-1; S.dj=true; S.reward=true; solids(); save(); $('lp-cp').hidden=true; setMode('play'); gateT=0; opening=true; SND.open(); blockHeld(); return; }
  newQ(); }
$('lp-choices').addEventListener('click',function(e){ var b=e.target.closest('.lp-ch'); if(b) answer(+b.dataset.i,'click'); });
$('lp-next').addEventListener('click',function(){ if(ptrDownAt<answeredAt+1) return; cont('click'); });
var opening=false, gateT=0;
function openReward(){ setMode('reward'); $('lp-cp').hidden=false; $('lp-card').hidden=true; $('lp-reward').hidden=false; panelAt=performance.now(); SND.unlock(); KIT.confetti(960,420,RM.matches?40:90,2.4); pop('lp-abchip'); hud(); demoT=0; }
function closeReward(){ S.reward=false; save(); $('lp-cp').hidden=true; setMode('play'); blockHeld(); }
$('lp-try').addEventListener('click',function(){ if(performance.now()-panelAt>600&&ptrDownAt>panelAt) closeReward(); });

/* ---------------- the climb ---------------- */
var FIX=1/120, acc=0;
function update(dt){
  modeT+=dt;
  if(mode==='title'){ gt+=dt; titleCam(dt); return; }
  if(mode==='respawn'){ if(modeT>0.45&&!respawned){ respawned=true; place(campOf(S.camp)); SND.respawn(); } if(modeT>0.9) setMode('play'); stepFx(dt); return; }
  if(opening){ gateT+=dt; gateOpen=Math.min(1,gateT/1.3); stepFx(dt); camFollow(dt,true); if(gateT>1.5){ opening=false; S.reward=false; openReward(); } return; }
  if(mode==='finish'){ stepFx(dt); finishT+=dt; cam+=(LV.finish.y-120+Math.min(1,finishT/2.5)*260-cam)*Math.min(1,dt*2); if(finishT>3.2&&!$('lp-end').offsetParent) showEnd(); return; }
  if(mode!=='play') return;
  S.playT+=dt; acc+=dt; var n=0;
  WORLD.dj=S.dj; solids();
  while(acc>=FIX&&n<10){ acc-=FIX; n++; gt+=FIX; WORLD.t=gt; var I=inp(); if(S.help) boost(); LPPH.step(P,I,FIX,WORLD); unboost(); jumpEdge=false; downEdge=false; events(); if(mode!=='play') break; }
  if(acc>FIX) acc=FIX;
  if(Math.abs(P.vx)>40) S.hints.run=1;
  camFollow(dt,false); stepFx(dt); pickups(); campCheck();
  if(nearWay()&&!S.dj&&mode==='play'){ openCP(); return; }
  if(P.on&&P.on.id==='top'&&!S.done&&mode==='play'){ finish(); return; }
  if(P.y<campOf(S.camp).y-280) fall('fell');
  var z=zoneAt(P.y); if(z!==S.zone){ S.zone=z; showZone(z); save(); }
  if(P.y>S.best){ S.best=P.y; }
  hints();
}
var JV0=PH.JV, DJ0=PH.DJV; function boost(){ PH.JV=JV0*1.13; PH.DJV=DJ0*1.1; } function unboost(){ PH.JV=JV0; PH.DJV=DJ0; }
var respawned=false, finishT=0;
function events(){ P.ev.forEach(function(e){
  if(e==='jump'){ SND.jump(); sq=-0.35; S.hints.jumps=(S.hints.jumps||0)+1; if(S.hints.jumps>=2) S.hints.jump=1; puff(P.x,P.y,4,'#F3E9D8'); }
  else if(e==='dj'){ SND.hop(); sq=-0.3; spin=RM.matches?0:1; ring(P.x,P.y+6); S.hints.hop=1; }
  else if(e==='land'||e==='landHard'){ if(gt-lastLandT>0.08){ SND.land(e==='landHard'); } lastLandT=gt; sq=e==='landHard'?0.55:0.32; puff(P.x,P.y,e==='landHard'?8:4,'#F3E9D8'); if(e==='landHard'&&!RM.matches) shake=0.12; }
  else if(e==='crack') SND.crack();
  else if(e==='crumble'){ SND.crumble(); }
  else if(e==='drop'){ }
  else if(e==='hurt') fall('hurt');
}); }
function fall(why){ if(mode!=='play') return; S.falls++; S.campFalls++; if(why==='hurt'){ SND.hurt(); P.ouch=true; }
  if(S.campFalls>=3&&!S.help){ S.help=true; KIT.toast('A helping wind lifts your jumps until the next lantern'); }
  respawned=false; setMode('respawn'); save(); }
function campCheck(){ if(!P.on) return; LV.camps.forEach(function(c,i){ if(c.id===S.camp||Math.abs(P.y-c.y)>2||Math.abs(P.x-c.x)>140) return;
  if(c.y<campOf(S.camp).y) return; S.camp=c.id; S.campFalls=0; if(S.help){ S.help=false; S.hints.helpSeen=1; } SND.camp(); sparkle(c.x+12,c.y+34,8,'#FFD98A'); save(); }); }
function pickups(){ var px=P.x, py=P.y+22;
  LV.embers.forEach(function(e,i){ if(S.embers.indexOf(i)>=0) return; if(Math.abs(e[0]-px)<24&&Math.abs(e[1]-py)<30){ S.embers.push(i); SND.ember(); sparkle(e[0],e[1],6,'#FFC23D'); pop('lp-embchip'); hud(); save(); } });
  LV.feathers.forEach(function(f){ if(S.feathers.indexOf(f.id)>=0) return; if(Math.abs(f.x-px)<28&&Math.abs(f.y-py)<34){ S.feathers.push(f.id); SND.feather(); sparkle(f.x,f.y,14,'#2EC4B6'); KIT.toast('Star Feather! '+S.feathers.length+' of '+LV.feathers.length); hud(); pop('lp-fchip'); save(); } }); }
function finish(){ S.done=true; S.over=true; S.score=score(); save(); SND.finish(); setMode('finish'); finishT=0; hint(null);
  var p=[960,300]; KIT.confetti(p[0],p[1],RM.matches?60:140,2.6); }
function showEnd(){ setMode('end'); panelAt=performance.now(); $('lp-hud').hidden=true; S.score=score(); save();
  var t=Math.round(S.playT), mm=Math.floor(t/60), ss=('0'+t%60).slice(-2);
  $('lp-endclimb').innerHTML='Pinewood Steps ✓ <span>›</span> Falls Cliffs ✓ <span>›</span> <span style="color:var(--muted)">Windy Ruins and Beacon Summit come next</span>';
  $('lp-endname').textContent=S.name+' · climbed '+Math.floor(S.best/20)+' m in '+mm+':'+ss+(S.falls?' · '+S.falls+' fall'+(S.falls>1?'s':''):' · no falls!');
  var st=[[S.correct+' of '+S.answered,'questions right'],[S.embers.length+' / '+LV.embers.length,'embers'],[S.feathers.length+' / '+LV.feathers.length,'Star Feathers'],[S.dj?'Cloud Hop':'—','move learned']];
  $('lp-stats').innerHTML=st.map(function(s){ return '<div class="lp-stat"><b>'+s[0]+'</b><span>'+s[1]+'</span></div>'; }).join('');
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
  /* hero animation state */
  sq*=Math.pow(0.0005,dt); if(Math.abs(sq)<0.01) sq=0; if(spin>0){ spin-=dt/0.34; if(spin<0) spin=0; }
  pom+=((P.vy<0?1:P.vy>200?-1:0)-pom)*Math.min(1,dt*10); lamp+=((-P.vx/330)*0.6-lamp)*Math.min(1,dt*8);
  var trail=P.on?(Math.abs(P.vx)/330):0.6, up=P.on?0:(P.vy>0?-1:1);
  var tgt=[[-9-trail*6,4-trail*3+up*5],[-7-trail*8,8-trail*2+up*7]]; scarf.forEach(function(s,i){ s[0]+=(tgt[i][0]+Math.sin(gt*8+i)*trail*1.5-s[0])*Math.min(1,dt*12); s[1]+=(tgt[i][1]-s[1])*Math.min(1,dt*12); });
  blinkT-=dt; if(blinkT<-0.12) blinkT=2+Math.random()*3; if(mode==='play'&&!P.on) P.ouch=false; }

/* ---------------- drawing ---------------- */
var SKY=[['#93C6CF','#BBD8C8','#E8DCAE','#F3C990','#F2B47C'],['#6F8CB8','#9E9BC0','#D9A2A8','#EEAE8E','#F4C381']];
function skyAt(y){ var k=Math.max(0,Math.min(1,(y-1500)/900)); return SKY[0].map(function(c,i){ return A.mixHex(c,SKY[1][i],k); }); }
function sy(y){ return H-(y-cam); }
function render(){
  var t=gt, c=LOWC; c.setTransform(0.5,0,0,0.5,0,0); c.imageSmoothingEnabled=false;   /* scenery is drawn at 480x270 and doubled, so it matches the pixel art */
  var sk=skyAt(cam+270), haze=sk[2], ox=shake>0?(Math.random()-0.5)*4:0, oy=shake>0?(Math.random()-0.5)*4:0;
  c.imageSmoothingEnabled=false;
  /* sky in flat bands */
  for(var i=0;i<5;i++){ c.fillStyle=sk[i]; c.fillRect(0,i*H/5-1,W,H/5+2); }
  var b1=ready(BG1)?Math.max(0,Math.min(1,1-(cam-1300)/700)):0;
  /* far peak + beacon (the goal, always in view, a little closer as you climb) */
  if(b1<1){ c.globalAlpha=1;
  var prog=Math.max(0,Math.min(1,cam/LV.summitY)), ms=Math.round((0.62+prog*0.5)*50)/50, mt=cache('mtn'+(S.done?1:0)+'_'+ms,Math.ceil(640*ms),Math.ceil(1000*ms),function(g,w,h){ g.scale(ms,ms); A.mountain(g,640,1000,S.done); });
  var mw=640*ms, mh=700*ms, mx=560-mw/2, my=34+prog*120;
  c.drawImage(mt,mx,my,Math.ceil(640*ms),Math.ceil(1000*ms));
  if(S.done){ var bx=mx+mw*0.5, by=my+385*ms*0.13-26*ms; c.fillStyle='rgba(255,217,138,.35)'; c.beginPath(); c.arc(bx,by,16+Math.sin(t*3)*2,0,7); c.fill(); } }
  /* drifting clouds */
  for(var k=0;k<2;k++){ var cxp=((k*287+t*(8+k*3))%(W+300))-150, cyp=60+k*70-(cam*0.06%400); A.cloud(c,cxp,((cyp%420)+420)%420+20,0.8+k*0.15,A.mixHex('#FFF6E8',sk[1],0.25),A.mixHex('#FFF6E8',sk[2],0.5)); }
  /* zone 1: ChatGPT's approved pixel backdrop (480x270 art px at 2x), sinking slowly as you climb */
  if(b1>0){ var by1=Math.max(0,cam*0.18); c.globalAlpha=b1; c.fillStyle='#BFE3E8'; c.fillRect(0,0,W,by1+2); c.drawImage(BG1,0,by1,960,540); c.globalAlpha=1; }
  /* valley hills (code art, behind the pixel backdrop in zone 1) */
  var v0=H-130+cam*0.25;
  if(v0<H+20&&b1<1){ c.drawImage(cache('r1',960,260,function(g,w,h){ A.ridge(g,w,h,7,A.mixHex('#A9BE9C',sk[2],0.35),A.mixHex('#93AD8B',sk[2],0.3),26); }),0,v0-120,960,260);
    c.drawImage(cache('r2',960,260,function(g,w,h){ A.ridge(g,w,h,19,'#7FA27A','#6B9068',40); }),0,v0-40+cam*0.15,960,260); }
  /* cliff walls (zone 2): rise in from below as the valley sinks */
  var cl=Math.max(0,Math.min(1,(cam-1200)/700));
  if(cl>0){ var tl=cache('cl',160,540,function(g,w,h){ A.cliff(g,w,h,3,-1,'#8C8AAE','#7A789C'); }), tr=cache('cr',160,540,function(g,w,h){ A.cliff(g,w,h,11,1,'#8C8AAE','#7A789C'); });
    c.globalAlpha=cl; var off=((cam*0.7)%540+540)%540; for(var j=-1;j<2;j++){ c.drawImage(tl,-20,j*540+off,160,540); c.drawImage(tr,W-140,j*540+off,160,540); } c.globalAlpha=1; }
  /* village at the foot of the climb (scenery: no outlines) */
  if(cam<500){ var gy=sy(0); [[40,58,'#D9B48A','#9A5B48'],[520,70,'#E1C49C','#8C4E44'],[700,50,'#D5AE84','#A06A4C'],[830,64,'#DDBB91','#7F4A40']].forEach(function(hh,ii){ A.house(c,hh[0],gy,hh[1],hh[1]*0.8,A.mixHex(hh[2],haze,0.25),A.mixHex(hh[3],haze,0.25),'#FFD98A'); });
    [[160,gy,64],[470,gy,52],[905,gy,70],[640,gy,44]].forEach(function(p){ A.pine(c,p[0],p[1],p[2],A.mixHex('#4F7A5C',haze,0.2),A.mixHex('#3F6650',haze,0.2)); }); }
  c=cx; c.setTransform(RS,0,0,RS,0,0); c.imageSmoothingEnabled=false; c.drawImage(LOW,0,0,W,H);
  c.save(); c.translate(ox,oy);
  /* gate */
  var gs=LV.solids[0]; if(sy(gs.y+gs.h)<H+40&&sy(gs.y)>-60) A.gate(c,sy(gs.y+gs.h),gateOpen,t,S.dj?NEED:S.runes,NEED);
  /* lifts' ropes */
  LV.plats.forEach(function(p){ if(!p.per) return; var q=LPPH.platAt(p,gt), x=q.x, yy=sy(q.y); if(yy<-60||yy>H+60) return; c.strokeStyle='rgba(42,27,46,.55)'; c.lineWidth=2;
    if(p.mx){ var cy=sy(p.y+150); c.beginPath(); c.moveTo(p.x-10,cy); c.lineTo(p.x+p.mx+p.w+10,cy); c.stroke(); c.beginPath(); c.moveTo(x+14,yy); c.lineTo(x+p.w/2,cy); c.lineTo(x+p.w-14,yy); c.stroke(); c.fillStyle='#6B4A30'; c.beginPath(); c.arc(x+p.w/2,cy,5,0,7); c.fill(); }
    else { var top=sy(p.y+p.my+260); c.beginPath(); c.moveTo(x+14,yy); c.lineTo(x+14,top); c.moveTo(x+p.w-14,yy); c.lineTo(x+p.w-14,top); c.stroke(); } });
  /* camps, signs, the Waystone */
  LV.camps.forEach(function(cp){ if(cp.id==='c0') return; var yy=sy(cp.y); if(yy<-20||yy>H+80) return; A.camp(c,cp.x,yy,litCamp(cp),t); });
  LV.signs.forEach(function(s){ if(s.need==='dj'&&!S.dj) return; if(s.need==='nodj'&&S.dj) return; var yy=sy(s.y); if(yy<-40||yy>H+70) return; A.sign(c,s.x,yy,s.text,s.keys,F); });
  var wy=sy(LV.way.y); if(wy>-140&&wy<H+20) A.waystone(c,LV.way.x,wy,S.dj?NEED:S.runes,NEED,t,!S.dj);
  /* ledges + thorns */
  LV.plats.forEach(function(p){ var q=LPPH.platAt(p,gt), yy=sy(q.y); if(yy<-30||yy>H+70) return;
    var alive=LPPH.alive(p,gt), x=q.x;
    if(!alive){ var ft=gt-p.goneAt; if(ft<0.7){ c.globalAlpha=1-ft/0.7; A.ledge(c,p,x,yy+ft*ft*600,t); c.globalAlpha=1; } return; }
    if(p.kind==='crumble'&&p.tT!==undefined&&!RM.matches) x+=Math.sin(gt*70)*1.5;
    A.ledge(c,p,x,yy,t); if(p.thorn) A.thorns(c,p.thorn[0],yy,p.thorn[1],t); });
  /* pickups */
  LV.embers.forEach(function(e,i){ if(S.embers.indexOf(i)>=0) return; var yy=sy(e[1]); if(yy<-20||yy>H+20) return; c.drawImage(cache('ember',28,32,function(g){ A.ember(g,14,17,1,0); }),e[0]-14,yy+Math.sin(t*2.4+i)*3-17,28,32); });
  LV.feathers.forEach(function(f){ if(S.feathers.indexOf(f.id)>=0) return; var yy=sy(f.y); if(yy<-30||yy>H+30) return; A.feather(c,f.x,yy+Math.sin(t*2)*4,1.1,t); });
  /* dust behind, hero, sparks in front */
  dust.forEach(function(d){ c.globalAlpha=1-d.t/d.max; c.fillStyle=d.col; c.beginPath(); c.arc(d.x,sy(d.y),d.r*(1+d.t*2),0,7); c.fill(); }); c.globalAlpha=1;
  if(mode!=='respawn'||modeT>0.45||modeT<0.12) drawHero(c,P.x,sy(P.y),1.2);
  sparks.forEach(function(s){ c.globalAlpha=1-s.t/s.max; c.save(); c.translate(s.x,sy(s.y)); c.scale(0.6,0.6); A.star(c,s.col); c.restore(); }); c.globalAlpha=1;
  c.restore();
  /* respawn: a soft iris to the last lantern */
  if(mode==='respawn'){ var a=modeT<0.45?modeT/0.45:1-(modeT-0.45)/0.45; c.fillStyle='rgba(27,20,38,'+(0.85*Math.max(0,Math.min(1,a)))+')'; c.fillRect(0,0,W,H); }
  if(mode==='finish'){ var fa=Math.min(1,finishT/1.2); c.fillStyle='rgba(255,217,138,'+(0.18*fa)+')'; c.fillRect(0,0,W,H); }
  meter();
}
function litCamp(cp){ var order=LV.camps.map(function(c){ return c.id; }); return order.indexOf(cp.id)<=order.indexOf(S.camp); }
function pose(){ var sp=P.on?Math.min(1,Math.abs(P.vx)/330):0; return { run:runPh, speed:sp, air:P.on?null:(P.vy>60?-1:1), sq:sq, spin:spin>0?(1-spin)*Math.PI*2:0, blink:blinkT<0, face:P.face, scarf:scarf, lamp:lamp, pom:pom, t:gt, ouch:P.ouch }; }
var runPh=0;
function drawHero(c,x,y,s){ if(P.on) runPh+=Math.abs(P.vx)*(1/60)/11;
  if(ready(HERO)){ var f, sp=P.on?Math.abs(P.vx):0;
    if(mode==='title') f='front'; else if(!P.on) f=P.vy>40?'jump':'fall'; else if(gt-lastLandT<0.12&&sq>0.2) f='land'; else if(sp>30) f=(Math.floor(runPh/1.6)%2)?'run':'idle'; else f='idle';
    spriteHero(c,f,x,y,P.face||1,spin>0&&!RM.matches?(1-spin)*Math.PI*2:0,P.ouch); return; }
  var ps=pose(); if(mode==='title'){ ps.wave=1; ps.face=-1; } A.hero(c,x,y,s,ps); }
/* draws one pose from the approved pixel sheet, feet at (x,y) */
function spriteHero(c,f,x,y,face,rot,ouch){ var r=PIX.heroF[f], w=r[2], h=r[3];
  c.save(); c.imageSmoothingEnabled=false; c.translate(Math.round(x),Math.round(y)); if(rot){ c.translate(0,-20); c.rotate(rot*face); c.translate(0,20); } c.scale(face,1);
  c.drawImage(HERO,r[0],r[1],w,h,-Math.round(w/2),-h,w,h); c.restore(); }
function meter(){ var y=Math.max(0,Math.min(1,P.y/LV.summitY))*800; if(Math.abs(y-meY)>0.5){ meY=y; var me=$('lp-me'); if(me) me.style.bottom=(y-22)+'px'; } }

/* the Cloud Hop demo on the reward card: Pip hops a gap on loop */
var demoT=0, dcv=$('lp-demo'), dcx=dcv.getContext('2d');
function demo(dt){ demoT+=dt; var c=dcx, T=demoT%2.4; c.setTransform(1,0,0,1,0,0); c.clearRect(0,0,520,260);
  c.fillStyle='#2B2140'; c.fillRect(0,0,520,260);
  var p1={kind:'stone',w:130}, p2={kind:'stone',w:130}; A.ledge(c,p1,20,200,0); A.ledge(c,p2,370,110,0);
  var x,y,air=null,sp=0,spn=0; if(T<0.3){ x=60+T*200; y=200; sp=1; } else if(T<1.3){ var u=T-0.3; x=120+u*300; y=200-(380*u-420*u*u); if(u>0.42){ var v=u-0.42; y=200-(380*0.42-420*0.42*0.42)-(330*v-500*v*v); spn=Math.min(1,v/0.3); } air=u<0.6?-1:1; } else { x=420; y=110; }
  if(T>=1.3) { x=420; y=110; air=null; } if(y>200) y=200;
  if(T>0.72&&T<0.82){ c.fillStyle='rgba(255,255,255,.7)'; c.beginPath(); c.ellipse(120+0.42*300,200-(380*0.42-420*0.42*0.42)+20,26,7,0,0,7); c.fill(); }
  if(ready(HERO)){ c.save(); c.translate(x,y); c.scale(1.5,1.5); spriteHero(c,air===null?(sp?((Math.floor(T*8)%2)?'run':'idle'):'idle'):(air<0?'jump':'fall'),0,0,1,spn>0&&spn<1&&!RM.matches?spn*Math.PI*2:0); c.restore(); }
  else A.hero(c,x,y,1.6,{ run:T*14, speed:sp, air:air, sq:0, spin:spn>0&&spn<1&&!RM.matches?spn*Math.PI*2:0, face:1, scarf:[[-12,2],[-10,6]], lamp:0, pom:0, t:demoT });
  c.font='600 22px '+F; c.fillStyle='#FFF6E8'; c.textAlign='left'; c.fillText(T>0.62&&T<1.3?'Space again!':'Space',20,40); }

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
window.__G={ state:function(){ return S; }, hero:function(){ return P; }, mode:function(){ return mode; }, level:LV, need:NEED, ph:PH,
  key:function(a,b){ held[a]=!!b; if(b&&a==='j') jumpEdge=true; if(b&&a==='dn') downEdge=true; },
  tp:function(x,y){ P=LPPH.fresh(x,y); P.on=null; cam=Math.max(-60,y-200); },
  setCamp:function(id){ S.camp=id; }, step:function(dt){ update(dt); }, cam:function(){ return cam; }, rs:function(){ return RS; },
  blocked:function(){ return Object.keys(blocked); }, gt:function(){ return gt; }, hold:function(b){ testHold=!!b; }, world:WORLD, held:function(){ return held; }, end:function(){ finish(); finishT=9; showEnd(); }, openCP:openCP };
})();
