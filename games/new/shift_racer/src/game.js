(function(){
'use strict';
/* Shift Racer remake (Nov 2026), built on the remake kit. Spec: https://claude.ai/artifact/1H17ZCr5LWHkNi8yWUb9s8
   Math is not fuel. The car drives itself. A pit card (2 questions plus a spare) at each flag unlocks 4th and 5th gear for the next stretch,
   fills nitro and feeds the streak multiplier. The checkpoint clock is your life. Stretch 8 is The Getaway. */
function $(id){ return document.getElementById(id); }
var prm={}; location.search.replace(/^\?/,'').split('&').forEach(function(kv){ var a=kv.split('='); if(a[0]) prm[a[0]]=decodeURIComponent(a[1]||''); });
var NAME='Shift <b>Racer</b>', TAGLINE='Dodge traffic and beat the clock to each flag. Answer well at the pit for top gears.';
var VIEW=prm.view==='top'?'top':'chase';   /* chase = behind the car, road to a horizon (v2). ?view=top is the v1 top-down road. */
var REDUCE=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);

var QS=window.SpitzQ?SpitzQ.forGame('sr'):null, KEY='shift_racer_v3'+(QS?QS.suffix:'');
function nextQuestion(){ if(QS) return QS.next();
  var a=2+Math.floor(Math.random()*8), b=2+Math.floor(Math.random()*8), v=[a*b,a*b+a,a*b-b,(a+1)*(b+1)].sort(function(){ return Math.random()-0.5; });
  return { topic:'Multiplication', type:'mult', prompt:a+' × '+b+' = ?', explain:a+' × '+b+' = '+(a*b), choices:v.map(function(n){ return { html:String(n), ok:n===a*b, why:'' }; }) }; }

/* ---------------- every number that tunes the game ---------------- */
var CFG={ start:45, cap:55, V:400, GR:[0.36,0.54,0.70,0.86,1], GT:[0.9,1.1,1.4,1.7,2.0], LO:0.62, PZ:[0.70,0.61,0.52], PZEND:0.98, TV:95,
  nitM:1.9, nitT:[3.0,3.8,4.6], pace:232, own:0.42, crashKeep:0.05, crashBog:1.3, stall:1.3, inv:0.9,
  flag:1000, ramp:150, air:0.95, pad:35, close:100, closeN:12, fast:[1,1,1,1,1.25,1.5], fastN:2, oncK:2, rb:[0.3,0.55,0.8], perfect:50, star:50, gold:150, goal:500, win:5000, perSec:100, dist:12,
  copV:0.68, copWait:4, copMax:260, copStart:160, bust:5, copK:0.5,
  /* the 8 stretches: length, traffic gap, pace (the flag before it adds length/pace seconds), and what is new. Only 1, 7 and 8 are fixed; the rest roll scenery, hazard and goal. */
  plan:[ {len:9500, gap:430, pace:0,   scen:'forest', goal:'perfect3'},
         {len:11000,gap:390, pace:300, pick:1},
         {len:12000,gap:360, pace:325, haz:1},
         {len:12500,gap:330, pace:350, trucks:1},
         {len:13000,gap:320, pace:380, works:1},
         {len:13500,gap:290, pace:420, haz:1, trucks:1},
         {len:11500,gap:800, pace:410, scen:'sunrise', breather:1},
         {len:19000,gap:280, pace:490, scen:'getaway', trucks:1, cop:1} ] };
var NL=4, LW=76, RX=(960-NL*LW)/2, W=960, H=540, PY=420, CARL=74;
var TESTBOX=/^(localhost|127\.0\.0\.1)$/.test(location.hostname)||(location.protocol==='file:'&&/_(mult|test|candidate)/.test(location.pathname));
if(TESTBOX&&+prm.short>0) CFG.plan.forEach(function(p){ p.len=Math.round(p.len*(+prm.short)); });   /* bots: ?short=0.25 makes every stretch a quarter as long */
if(TESTBOX&&+prm.stretches>=1) CFG.plan=CFG.plan.slice(0,+prm.stretches-1).concat([CFG.plan[7]]);

var SCN={
  forest:{nm:'Forest',g:'#0F2B25',g2:'#0A201C',edge:'#3DFFB0',deco:'tree',a:'#17513A',b:'#22754F',c:'#3DBB7C'},
  desert:{nm:'Desert',g:'#5B3A48',g2:'#4A2E3D',edge:'#FFB23D',deco:'cactus',a:'#2E7A5B',b:'#7D4F58',c:'#F0A868'},
  city:{nm:'Night City',g:'#17132C',g2:'#0E0B1E',edge:'#FF3DB4',deco:'block',a:'#2A2450',b:'#FFE14D',c:'#3DE0FF'},
  snow:{nm:'Snow Pass',g:'#6F86B5',g2:'#5F76A6',edge:'#3DE0FF',deco:'pine',a:'#17403F',b:'#E8F1FF',c:'#A9BEE3'},
  coast:{nm:'Coast',g:'#7B6470',g2:'#6B5563',edge:'#3DE0FF',deco:'palm',a:'#1F6B52',b:'#154B86',c:'#2A70B8'},
  canyon:{nm:'Canyon',g:'#6E2F2E',g2:'#571F26',edge:'#FF7A3D',deco:'rock',a:'#8C4034',b:'#A85840',c:'#C9764E'},
  sunrise:{nm:'Sunrise Highway',g:'#B4625C',g2:'#9C5252',edge:'#FFE14D',deco:'grass',a:'#D98A5C',b:'#F0B36B',c:'#FFD98A'},
  getaway:{nm:'The Getaway',g:'#141026',g2:'#0C0919',edge:'#FF4B4B',deco:'block',a:'#2A2450',b:'#FFE14D',c:'#5C8BFF'} };
var ROLL=['desert','city','snow','coast','canyon','forest'];
var HAZ={ ice:'Ice patches', sand:'Sand drifts', oil:'Oil slicks', night:'Headlights only', onc:'Oncoming traffic' };
var GOALS={ perfect3:{t:'3 perfect shifts',n:3,k:'perfect'}, close3:{t:'3 near-misses',n:3,k:'close'}, stars5:{t:'5 stars',n:5,k:'stars'}, combo3:{t:'a ×3 near-miss combo',n:3,k:'combo'},
  gear5:{t:'Drive in 5th gear',n:1,k:'top'}, air2:{t:'2 big jumps',n:2,k:'air'}, nitro1:{t:'Fire your nitro',n:1,k:'nitro'}, clean:{t:'No crashes to the flag',n:1,k:'clean',end:true} };
var GOALROLL=['air2','close3','stars5','combo3','clean','nitro1','perfect3','gear5'];
var TUNE={ zone:{name:'Wide green',desc:'A bigger green zone for perfect shifts.',icon:'🟢',max:2}, tank:{name:'Big nitro',desc:'Nitro burns almost a second longer.',icon:'🔥',max:2},
  shield:{name:'Bumper shield',desc:'Blocks your next crash.',icon:'🛡️',max:1}, magnet:{name:'Star magnet',desc:'Grab stars from the next lane over.',icon:'🧲',max:1}, time:{name:'+5 seconds',desc:'Five more seconds on the clock.',icon:'⏱️',max:99} };

var CARS=[ {id:'sun',nm:'Sunburst',c:'#FFD21F',need:0}, {id:'red',nm:'Redline',c:'#FF4B4B',need:0}, {id:'blue',nm:'Blue Streak',c:'#3D8BFF',need:0},
  {id:'mint',nm:'Mint Flash',c:'#3DFFB0',need:0},
  {id:'tuner',nm:'Night Tuner',c:'#2A5BFF',need:15000,sp:'tuner'}, {id:'charger',nm:'Black Muscle',c:'#3A3A44',need:30000,sp:'charger'}, {id:'lowrider',nm:'Lowrider',c:'#8A2BD0',need:45000,sp:'lowrider'},
  {id:'hotrod',nm:'Hot Rod',c:'#E0202A',need:60000,sp:'hotrod'}, {id:'monster',nm:'Monster Truck',c:'#FF7A1F',need:85000,sp:'monster'}, {id:'super',nm:'Supercar',c:'#7CFF2A',need:120000,sp:'super'} ], CARKEY='shift_racer_car', myCar=CARS[0];
try{ var cid=localStorage.getItem(CARKEY); CARS.forEach(function(k){ if(k.id===cid) myCar=k; }); }catch(e){}
var RES=[], SIM=false;
/* feel: presentation only. Nothing in J is read by the rules. */
var J={ squat:0, punch:0, whoosh:0, whooshX:0, ram:0, ramDir:1, tick:0, rbSaid:0 };
var S=null, car={x:480,v:0,vx:0}, traffic=[], stars=[], patches=[], works=[], parts=[], marks=[], gt=0, last=0, inv=0, wantM=1, multV=1, limT=0, nextTD=0, nextSD=0, lastLane=-1, nextOD=0, zoom=1, slow=0, sandK=1, lockT=0, saveT=0, bestAtStart=0, popT=0, popN=0;
function fresh(name){ return { ver:3, name:name||'', started:false, over:false, won:false, score:0, left:CFG.start, n:0, phase:'pit', pitT:0.4, lt:0, lg:0, seed:(Math.random()*1e9)|0,
  pt:0, flags:0, crashes:0, closes:0, bestCombo:0, perfects:0, nitros:0, starsGot:0, goals:0, busts:0, lv:{zone:0,tank:0,magnet:0}, shield:0, boost:0, offer:null, cop:null, lastScen:'', r:null,
  answered:0, correct:0, streak:0, best:0, topics:QS?QS.topicTable():{}, q:null, qDone:false, picked:-1, card:null, pick:null }; }
function save(){ if(SIM) return; try{ localStorage.setItem(KEY,JSON.stringify(S)); }catch(e){} }
function load(){ try{ var v=JSON.parse(localStorage.getItem(KEY)||'null'); if(v&&v.ver===3&&v.started&&!v.over) return v; }catch(e){} return null; }

/* ---------------- sound: small code tones through the kit's audio (a full spitz-sound kit comes with the art pass) ---------------- */
function tone(f1,f2,t0,dur,type,vol){ if(SIM||RK.muted()||RK.vol('fx')<=0) return; var a=RK.ac(); if(!a) return; var o=a.createOscillator(), g=a.createGain(), t=a.currentTime+t0;
  o.type=type||'sine'; o.frequency.setValueAtTime(f1,t); if(f2&&f2!==f1) o.frequency.exponentialRampToValueAtTime(f2,t+dur);
  g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime((vol||0.2)*RK.vol('fx'),t+0.015); g.gain.exponentialRampToValueAtTime(0.0001,t+dur); o.connect(g); g.connect(a.destination); o.start(t); o.stop(t+dur+0.03); }
function noise(t0,vol,ms,hp,lp){ if(SIM||RK.muted()||RK.vol('fx')<=0) return; var a=RK.ac(); if(!a) return; var n=Math.floor(a.sampleRate*(ms||35)/1000), buf=a.createBuffer(1,n,a.sampleRate), d=buf.getChannelData(0);
  for(var i=0;i<n;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/n,2);
  var s=a.createBufferSource(), f=a.createBiquadFilter(), g=a.createGain(); s.buffer=buf; f.type=lp?'lowpass':'highpass'; f.frequency.value=lp||hp||1800; g.gain.value=(vol||0.5)*RK.vol('fx'); s.connect(f); f.connect(g); g.connect(a.destination); s.start(a.currentTime+t0); }
var C6=1046.5, E5=659.25;
var SND={ star:function(){ tone(C6,C6,0,0.08,'triangle',0.12); tone(1568,1568,0.06,0.16,'triangle',0.1); },
  gold:function(){ tone(220,660,0,0.3,'triangle',0.09); tone(C6,C6,0.25,0.25,'triangle',0.11); },
  crash:function(){ noise(0,0.4,200,0,600); tone(140,50,0,0.22,'sawtooth',0.12); },
  shift:function(){ tone(260,420,0,0.08,'triangle',0.06); },
  perfect:function(){ tone(C6,C6,0,0.08,'triangle',0.1); tone(1568,1568,0.07,0.2,'triangle',0.09); },
  nitro:function(){ noise(0,0.2,420,0,900); tone(220,880,0,0.45,'triangle',0.09); },
  bog:function(){ tone(150,95,0,0.28,'triangle',0.09); },
  close:function(n){ noise(0,0.14,180,0,1600); var f=E5*(1+0.12*Math.min(n||1,5)); tone(f,f,0.04,0.16,'triangle',0.08); },
  light:function(go){ if(go){ tone(880,880,0,0.4,'triangle',0.12); tone(1318.5,1318.5,0,0.4,'sine',0.05); } else tone(440,440,0,0.16,'triangle',0.1); },
  siren:function(){ tone(740,740,0,0.22,'triangle',0.04); tone(587,587,0.24,0.22,'triangle',0.04); },
  flag:function(){ tone(523,523,0,0.12,'triangle',0.11); tone(659,659,0.1,0.12,'triangle',0.11); tone(784,784,0.2,0.3,'triangle',0.11); },
  lock:function(){ tone(320,280,0,0.05,'triangle',0.1); tone(320,280,0.08,0.05,'triangle',0.1); } };
var ENG=null;
function engine(on){ if(SIM) return; var a=ENG||on?RK.ac():null; if(!a) return; if(!ENG){ var o=a.createOscillator(), g=a.createGain(), lp=a.createBiquadFilter(); o.type='sawtooth'; lp.type='lowpass'; lp.frequency.value=380; g.gain.value=0; o.connect(lp); lp.connect(g); g.connect(a.destination); o.start(); ENG={o:o,g:g}; }
  var r=S&&S.r; ENG.o.frequency.setTargetAtTime(46+(r?Math.max(0,r.rpm)*64+r.gear*7+Math.min(r.cc,5)*4:0),a.currentTime,0.05); ENG.g.gain.setTargetAtTime(on&&!RK.muted()?0.022*RK.vol('fx'):0,a.currentTime,0.1); }
/* the song from the live game ("Redline", driving electro-rock): kit.js plays it, N switches it off */
var RC_CH=[[82.41,[329.63,493.88]],[65.41,[261.63,392.00]],[98.00,[392.00,587.33]],[73.42,[293.66,440.00]]], RC_LEAD=[[0,659.25,3],[3,587.33,1],[4,493.88,4],[8,587.33,2],[10,659.25,2],[12,739.99,4]];
var SONG={ get level(){ return 0.1*RK.vol('music'); }, echo:0.32, want:function(){ return !!S&&S.started&&!S.over; }, busy:function(){ return !!S&&S.phase==='drive'; }, sd:function(){ return 0.107; },
  voice:function(f,t0,dur){ tone(f,f,t0,dur,'triangle',0.1); },
  step:function(ctx,g,i,t,sd){ var bar=Math.floor(i/16), c=RC_CH[bar%4], k=i%16;
    if(k%4===0) KIT.mKick(ctx,g.out,t,0.75,170,48);
    if(k%2===0) KIT.mNote(ctx,g.out,'sawtooth',c[0]*(k%4===2?2:1),t,sd*1.6,0.22,520,null);
    if(k===4||k===12){ KIT.mHit(ctx,g,g.act,t,0.12,0.3,1300); KIT.mHit(ctx,g,g.act,t+0.012,0.1,0.18,1800); }
    if(k%2===1) KIT.mHit(ctx,g,g.act,t,0.025,0.06,8000);
    if(k===0||k===3||k===6||k===10) c[1].forEach(function(f){ KIT.mNote(ctx,g.act,'sawtooth',f/2,t,sd*(k===10?4:1.6),0.05,1500,null); });
    if(bar%8>=4) RC_LEAD.forEach(function(m){ if(m[0]===k) KIT.mNote(ctx,g.act,'square',m[1],t,m[2]*sd*0.95,0.05,2600,g.echo); }); } };

var KIT=SpitzKit.game({ ac:function(){ return RK?RK.ac():null; }, muted:function(){ return RK?RK.muted():true; }, song:function(){ return SONG; }, confetti:'sr-confetti', toast:'sr-toast', colors:['#FF3DB4','#FFE14D','#3DE0FF','#FFFFFF','#3DFFB0'] });
var RK=SpitzRemake.make({ pre:'sr', S:function(){ return S; }, save:save, next:nextQuestion, hub:'../../../../arcade/', suffix:QS?QS.suffix:'', music:KIT, toast:KIT.toast, streak:[[2,1.5],[4,2],[6,3]] });
var CONTROLS='ARROWS/AD=Change lanes | Space=Shift gears, then nitro | 1234=Answer';

var title=RK.title({ name:NAME, tagline:TAGLINE, controls:CONTROLS, onStart:function(name){ S=fresh(name); S.started=true; begin(); newStretch(0); save(); play(true); } });
/* the garage: pick your car colour on the start card. Four colours are free; six street cars unlock with your best score. */
var garage=(function(){ var row=document.createElement('div'), cap=document.createElement('div'), go=$('sr-go'); row.className='sr-garage'; row.setAttribute('role','group'); row.setAttribute('aria-label','Your car'); cap.className='sr-garcap';
  go.parentNode.insertBefore(row,go); go.parentNode.insertBefore(cap,go);
  function top(){ var t=0, b=RK.best.get(); try{ t=+localStorage.getItem(CARKEY+'_top')||0; if(b>t){ t=b; localStorage.setItem(CARKEY+'_top',String(b)); } }catch(e){ t=b; } return Math.max(t,b); }   /* cars you unlock stay unlocked on later days */
  function open(k){ return top()>=k.need; }
  function say(k){ cap.textContent=open(k)?'Your car: '+k.nm:k.nm+': score '+k.need.toLocaleString('en-US')+' to unlock'; }
  function draw(){ row.innerHTML=''; if(!open(myCar)) myCar=CARS[0]; CARS.forEach(function(k){ var b=document.createElement('button'), ok=open(k); b.type='button'; b.className='sr-car'+(k===myCar?' on':'')+(ok?'':' off'); b.style.setProperty('--c',k.c); if(k.sp&&window.SRCARS&&SRCARS[k.sp]){ b.className+=' pic'; b.style.backgroundImage='url('+SRCARS[k.sp]+')'; } b.setAttribute('aria-label',k.nm+(ok?'':', locked')); b.setAttribute('aria-pressed',k===myCar?'true':'false'); b.textContent=ok?'':'🔒';
      b.addEventListener('click',function(){ if(open(k)){ myCar=k; try{ localStorage.setItem(CARKEY,k.id); }catch(e){} draw(); } else say(k); }); b.addEventListener('mouseenter',function(){ say(k); }); b.addEventListener('mouseleave',function(){ say(myCar); }); row.appendChild(b); }); say(myCar); }
  draw(); return { draw:draw }; })();
$('sz-mus').addEventListener('click',function(){ KIT.musicToggle(); }); KIT.musBtn();

/* LEFT = you and your survival (the clock, the police). RIGHT = score and progress. */
var hud=RK.hud({ left:[ {id:'time',type:'num',label:'Time',size:'big'}, {id:'cop',type:'bar',label:'Police',text:true} ],
                 right:[ {id:'score',type:'num',label:'Score',size:'big'}, {id:'streak',type:'text',label:'Streak'}, {id:'flag',type:'bar',label:'Stretch',text:true}, {id:'goal',type:'text',label:'Goal'} ] });

var PIT={ safe:'The clock is stopped.', rewards:['Gears 4 and 5 stay locked for this stretch.','4th gear and some nitro','4th and 5th gear and half a nitro bar'], done:pitDone };
var card=RK.card({ fast:!!(QS&&QS.set==='mult')||!QS, kinds:{ grid:{ title:'Starting grid', safe:PIT.safe, rewards:PIT.rewards, done:pitDone }, pit:{ title:'Pit stop', safe:PIT.safe, rewards:PIT.rewards, done:pitDone } } });
function pitDone(r){ RES.push(r); var R=S.r; R.maxGear=3+Math.min(2,r.right); R.jam=r.right<2?1:0; S.boost=Math.min(100,S.boost+25*r.right);
  if(r.perfect&&rollOffer()) pick.open(1,'Perfect pit! Pick a tune-up.'); else lights(); }
function rollOffer(){ var ids=Object.keys(TUNE).filter(function(k){ return k==='shield'?!S.shield:k==='time'?true:S.lv[k]<TUNE[k].max; }); ids.sort(function(){ return Math.random()-0.5; }); S.offer=ids.slice(0,2); return S.offer.length>0; }
var pick=RK.pick({ title:'Tune-up', options:function(){ return (S.offer||[]).map(function(k){ return { id:k, name:TUNE[k].name, desc:TUNE[k].desc, icon:TUNE[k].icon }; }); },
  onPick:tuneUp, done:function(){ lights(); } });
function tuneUp(id){ if(id==='shield') S.shield=1; else if(id==='time') S.left=Math.min(CFG.cap,S.left+5); else S.lv[id]++; S.offer=null; }

var end=RK.end({ name:NAME, onAgain:function(){ S=fresh(S.name); save(); toTitle(); } });
RK.ask({ when:function(){ return S&&S.started&&!S.over; }, onYes:function(){ S=fresh(S.name); save(); toTitle(); } });
RK.pause({ when:function(){ return S&&S.started&&!S.over; }, controls:CONTROLS, stats:function(){ return [['Score',S.score],['Stretch',(S.n+1)+' of '+CFG.plan.length],['Best streak',S.best]]; }, onPause:function(){ last=0; engine(false); } });
RK.idle({ after:6, text:'Left and Right to dodge!', when:function(){ return S&&S.started&&!S.over&&S.phase==='drive'; } });

function begin(){ traffic=[]; stars=[]; parts=[]; marks=[]; car={x:laneX(1),v:0,vx:0}; inv=0; multV=1; zoom=1; slow=0; bestAtStart=RK.best.get(); RK.fx.clear(); }
function toTitle(){ hud.show(false); card.close(); pick.close(); RK.fx.clear(); engine(false); garage.draw(); title.show(); }
function play(fromStart){ title.hide(); end.hide(); hud.show(true); last=0;
  if(!fromStart){ begin(); buildRoad(); car.x=laneX(S.r.lane); if(S.phase==='drive'){ S.r.gear=1; S.r.rpm=0; S.r.nitro=0; nextTD=S.r.pd+500; nextSD=S.r.pd+400; }   /* a reload: same spot, from a stop */
    else if(S.phase==='pit'){ if(!card.resume()&&!pick.resume()) S.pitT=0.2; } } }
function endRun(won){ if(S.over) return; S.over=true; S.won=!!won; S.card=null; S.pick=null; S.phase='over'; save(); if(SIM) return; hud.show(false); card.close(); pick.close(); RK.fx.clear(); engine(false);
  var was=RK.best.keep(S.score), np=CFG.plan.length;
  end.show({ score:S.score, headline:won?'You crossed the state line!':'Out of time on stretch '+(S.n+1)+' of '+np+'.', goal:RK.goal({ score:S.score, was:was, streak:S.best }),
    stats:[ ['Correct',S.correct+' / '+S.answered], ['Flags',S.flags+' of '+np], ['Best near-miss combo','×'+S.bestCombo] ], topics:S.topics, code:'' });   /* at go-live: pass gameId to RK.end and drop code:'' */
  if(won) KIT.confetti(960,300,90,2.6);
  var nu=CARS.filter(function(k){ return k.need>was&&k.need<=S.score; }); if(nu.length) setTimeout(function(){ KIT.toast('New car colour: '+nu[nu.length-1].nm+'!'); },900); }

/* ---------------- the car ---------------- */
function laneX(i){ return RX+LW*i+LW/2; }
function hiG(g){ return CFG.V*CFG.GR[g-1]; }
function loG(g){ return g<=1?0:hiG(g-1)*CFG.LO; }
function baseV(){ var r=S.r; return loG(r.gear)+(hiG(r.gear)-loG(r.gear))*Math.max(0,r.rpm); }
function setV(v){ var r=S.r, lo=loG(r.gear), hi=hiG(r.gear); r.rpm=Math.max(0,Math.min(1,(v-lo)/(hi-lo))); }
function pz(){ return CFG.PZ[S.lv.zone]; }
function mult(){ return RK.mult(S.streak); }
function add(base){ var p=Math.round(base*mult()); S.score+=p; return p; }
function sx(x){ return VIEW==='chase'?480+(x-480-camX)*FOC/CB:480+(x-480)*zoom; }
function sy(d){ return VIEW==='chase'?HZ+(HC-52)*FOC/(d-S.r.pd+CB)-40:PY-(d-S.r.pd)*zoom; }
function pop(x,d,txt,kind){ if(SIM) return; popN=gt-popT<0.6?popN+1:0; popT=gt; RK.fx.pop(sx(x)*2,Math.max(140,sy(d)*2-(popN%3)*64),txt,kind); }   /* pops that land together stack upward instead of overlapping */
function rnd(seed){ var s=seed>>>0; return function(){ s=(s+0x6D2B79F5)>>>0; var t=Math.imul(s^(s>>>15),1|s); t=(t+Math.imul(t^(t>>>7),61|t))^t; return ((t^(t>>>14))>>>0)/4294967296; }; }
function ri(a,b){ return a+Math.floor(Math.random()*(b-a+1)); }

/* ---------------- a stretch: rolled fresh each run (scenery, hazard, goal), except 1, 7 and 8 ---------------- */
function newStretch(n){ var P=CFG.plan[n], R=rnd(S.seed+n*7919), scen=P.scen, haz=[], goal=P.goal;
  if(!scen){ var pool=ROLL.filter(function(k){ return k!==S.lastScen&&(n>1||k!=='forest'); }); scen=pool[Math.floor(R()*pool.length)]; }
  if(P.haz){ var hz=['ice','sand','oil','night']; haz.push(scen==='city'&&R()<0.5?'night':scen==='snow'?'ice':scen==='desert'||scen==='coast'?'sand':hz[Math.floor(R()*3)]); }
  if(P.cop) haz.push('oil');
  if(n===5&&P.haz&&CFG.plan.length===8) haz=['onc'];
  if(!goal){ goal=GOALROLL[Math.floor(R()*GOALROLL.length)]; }
  S.lastScen=scen; S.n=n;
  S.r={ n:n, L:P.len, pd:0, lane:S.r?S.r.lane:1, gear:1, rpm:0, nitro:0, cc:0, ccT:0, scen:scen, haz:haz, goal:goal, gs:{air:0,perfect:0,close:0,stars:0,combo:0,top:0,nitro:0,crashes:0}, gdone:false, maxGear:3, jam:0, bog:0, stall:0 };
  S.cop=P.cop?{gap:CFG.copStart,x:laneX(S.r.lane),warn:0,wait:CFG.copWait}:null; S.phase='pit'; S.pitT=n?1.0:0.4;
  buildRoad(); }
/* hazards and roadworks come from the stretch's seed, so a reload shows the same road */
function buildRoad(){ var r=S.r, P=CFG.plan[r.n], R=rnd(S.seed+r.n*104729+7), d; patches=[]; works=[]; traffic=[]; stars=[]; nextTD=r.pd+500; nextSD=r.pd+400; lastLane=-1;
  r.onc=r.haz.indexOf('onc')>=0?1:0; nextOD=r.pd+900;
  if(P.cop) CFG.rb.forEach(function(f){ var d0=Math.round(r.L*f), gap=Math.floor(R()*NL), l; for(l=0;l<NL;l++) if(l!==gap) works.push({lane:l,d0:d0,d1:d0+56,rb:1,gap:gap}); });
  if(P.works) for(d=1500;d<r.L-1200;d+=2300+R()*900){ works.push({lane:R()<0.5?0:NL-1,d0:d,d1:d+650+R()*250}); }
  r.haz.forEach(function(h){ if(h==='night') return; var step=h==='oil'?900:1500;
    for(d=1100+R()*500;d<r.L-700;d+=step+R()*700){ var l=Math.floor(R()*(h==='oil'?NL:NL-1));
      if(works.some(function(w){ return d>w.d0-500&&d<w.d1+300; })) continue;
      patches.push(h==='oil'?{type:'oil',l0:l,l1:l,d:d,len:46,hit:0}:{type:h,l0:l,l1:l+1,d:d,len:h==='ice'?250:230,hit:0}); } });
  if(r.n>=1) for(d=1700+R()*900;d<r.L-900;d+=2600+R()*1800){ var rl=Math.floor(R()*NL); if(r.onc&&rl===0) rl=1; if(works.some(function(w){ return w.lane===rl&&d>w.d0-420&&d<w.d1+260; })||patches.some(function(q){ return Math.abs(q.d-d)<420&&rl>=q.l0&&rl<=q.l1; })) continue; patches.push({type:'ramp',l0:rl,l1:rl,d:d,len:70,hit:0}); }
  if(r.n>=2) for(d=3100+R()*1500;d<r.L-900;d+=4200+R()*2600){ var pl=Math.floor(R()*NL); if(r.onc&&pl===0) pl=1; if(works.some(function(w){ return w.lane===pl&&d>w.d0-420&&d<w.d1+260; })||patches.some(function(q){ return Math.abs(q.d-d)<420&&pl>=q.l0&&pl<=q.l1; })) continue; patches.push({type:'pad',l0:pl,l1:pl,d:d,len:60,hit:0}); }
  if(P.breather) for(d=900;d<r.L-500;d+=95) stars.push({d:d,x:laneX(1+Math.round(Math.sin(d/700)*0.9+0.5)),gold:1,got:0});
  if(P.pick) patches.push({type:'shield',l0:2,l1:2,d:r.L*0.45,len:40,hit:0});
  STRIPK=''; }
function bonusTime(n){ return Math.round(CFG.plan[n].len/(CFG.plan[n].pace||CFG.pace)); }
function goalProg(){ var r=S.r, g=GOALS[r.goal]; return g.end?0:Math.min(g.n,Math.floor(r.gs[g.k])); }
function goalHit(){ var r=S.r; if(r.gdone) return; r.gdone=true; S.goals++; var p=add(CFG.goal); if(!SIM){ RK.fx.banner('Goal! +'+p.toLocaleString('en-US'),GOALS[r.goal].t,{kind:'good',ms:1300}); SND.gold(); } }

/* green light: one press of Space. On the green = a flying start. Too early = a slow start. No press = an ordinary start. The clock waits. */
function lights(){ S.phase='lights'; S.lt=0; S.lg=1.5+Math.random()*0.8; S.lp=0; save();
  if(!SIM&&S.r.jam) RK.fx.banner('Gear jammed!',(S.r.maxGear===3?'4th and 5th are':'5th is')+' locked for this stretch',{kind:'bad',ms:1500}); }
function go(kind){ var r=S.r; S.phase='drive'; r.gear=1; r.rpm=0; limT=0;
  if(kind==='perfect'){ r.gear=2; setV(hiG(1)*0.95); S.boost=Math.min(100,S.boost+15); var p=add(CFG.perfect); pop(car.x,r.pd+70,'Flying start! +'+p,'good'); SND.perfect(); }
  else if(kind==='early'){ r.bog=1.2; pop(car.x,r.pd+70,'Too early!','bad'); SND.bog(); }
  else SND.light(true);
  if(r.n===0&&!SIM) RK.fx.banner('Space on the green','shift up for speed',{ms:2000});
  if(S.cop&&!SIM){ RK.fx.banner('The Getaway!','stay ahead of the police to the state line',{kind:'bad',ms:2200}); SND.siren(); }
  if(CFG.plan[r.n].breather){ S.boost=100; if(!SIM) RK.fx.banner('Open highway','free nitro and a line of gold stars',{kind:'good',ms:2000}); }
  else if(r.haz.length&&!S.cop&&!SIM) RK.fx.banner(HAZ[r.haz[0]]+'!',r.haz[0]==='ice'?'you slide one lane too far':r.haz[0]==='sand'?'sand slows you down':r.haz[0]==='oil'?'oil spins you sideways':r.haz[0]==='onc'?'the left lane comes at you: near-misses there pay double':'watch your headlights',{kind:'bad',ms:2400});
  else if(works.length&&!works[0].rb&&!SIM) RK.fx.banner('Roadworks!','a lane is closed ahead',{kind:'bad',ms:2000}); }
function pressShift(){ if(!S||!S.started||S.over) return; var r=S.r;
  if(S.phase==='lights'){ if(S.lp) return; S.lp=1; if(S.lt<S.lg) go('early'); else go(S.lt-S.lg<=0.4?'perfect':'ok'); return; }
  if(S.phase!=='drive') return;
  if(r.gear>=r.maxGear){ if(S.boost>=100&&r.nitro<=0){ fireNitro(); return; }
    if(r.maxGear<5){ pop(car.x,r.pd+70,'Gear locked','bad'); SND.lock(); } return; }
  var rpm=r.rpm, v=baseV(); r.gear++; setV(v); limT=0; if(r.gear===5) r.gs.top=1; J.squat=gt;
  if(rpm>=pz()&&rpm<=CFG.PZEND){ r.rpm=Math.min(1,r.rpm+0.14); r.gs.perfect++; S.perfects++; var p=add(CFG.perfect);
    if(S.boost>=100&&r.nitro<=0){ fireNitro(); } else { S.boost=Math.min(100,S.boost+20); pop(car.x,r.pd+70,'Perfect shift +'+p,'good'); SND.perfect(); } if(!SIM){ J.punch=gt; puff(car.x-16,'#FFB23D',4); puff(car.x+16,'#FFB23D',4); } }
  else if(rpm>CFG.PZEND){ pop(car.x,r.pd+70,'Late shift',''); SND.shift(); }
  else if(rpm>=0.45){ SND.shift(); }
  else { r.bog=0.6; pop(car.x,r.pd+70,'Too early','bad'); SND.bog(); } }
function autoShift(){ var r=S.r, v=baseV(); r.gear++; setV(v); limT=0; if(r.gear===5) r.gs.top=1; J.squat=gt; if(!SIM) SND.shift(); }
function puff(x,c,n){ for(var i=0;i<n&&parts.length<90;i++) parts.push({x:x+(Math.random()-0.5)*10,d:S.r.pd-34,vx:(Math.random()-0.5)*90,vd:-80-Math.random()*160,t:0.3+Math.random()*0.2,c:c}); }
function fireNitro(){ var r=S.r; J.punch=gt; S.boost=0; r.nitro=CFG.nitT[S.lv.tank]; r.gs.nitro++; S.nitros++; pop(car.x,r.pd+80,'Nitro!','gold'); if(!SIM){ SND.nitro(); RK.fx.shake(0.25); } }
function steer(dir){ if(!S||S.phase!=='drive'||gt<lockT) return; var r=S.r, to=r.lane+dir; if(to<0||to>=NL) return; var on=onPatch('ice');
  if(on&&to+dir>=0&&to+dir<NL){ to+=dir; pop(car.x,r.pd+70,'Ice!','bad'); }
  r.lane=to; }
function onPatch(type){ var r=S.r; for(var i=0;i<patches.length;i++){ var p=patches[i]; if(p.type===type&&r.pd>p.d-10&&r.pd<p.d+p.len&&car.x>RX+LW*p.l0+8&&car.x<RX+LW*(p.l1+1)-8) return p; } return null; }

/* ---------------- traffic: every car has its own speed and follows what is ahead; never more than 2 of the 4 lanes taken near one spot ---------------- */
function laneShut(l,d,pad){ for(var i=0;i<works.length;i++){ var w=works[i]; if(w.lane===l&&d>w.d0-pad&&d<w.d1+pad) return true; } return false; }
function usedLanes(d,w){ var u=[0,0,0,0], i; traffic.forEach(function(o){ if(!o.out&&Math.abs(o.d-d)<w+o.len/2) u[o.lane]=1; }); for(i=0;i<NL;i++) if(laneShut(i,d,w)) u[i]=1;
  patches.forEach(function(p){ if((p.type==='sand'||p.type==='oil')&&Math.abs(p.d+p.len/2-d)<w) for(i=p.l0;i<=p.l1;i++) u[i]=1; }); return u; }
function rbNear(d,a,b){ for(var i=0;i<works.length;i++){ var w=works[i]; if(w.rb&&d>w.d0-a&&d<w.d0+b) return w; } return null; }
function addCar(d,ln,truck,on){ var u=usedLanes(d,230); if(u[ln]) return false; u[ln]=1; if(!on&&(u[0]+u[1]+u[2]+u[3]>2||rbNear(d,650,200))) return false;
  var cols=['#7C86A8','#B9C1DA','#5E6FA0','#A88FA0','#5B8C8C','#9C7FB0'];
  traffic.push({d:d,lane:ln,x:laneX(ln),col:cols[ri(0,5)],truck:truck?1:0,len:truck?128:CARL,v0:on?-CFG.TV*1.1:CFG.TV*(truck?0.62:0.8+Math.random()*0.35),v:on?-CFG.TV*1.1:CFG.TV,on:on?1:0,pk:ri(0,2519),pc:ri(0,7),out:0,rot:0,pass:0,hit:0,th:0}); return true; }
function spawnAhead(){ var r=S.r, P=CFG.plan[r.n];
  while(nextTD<r.pd+980){ if(nextTD<r.L-140){ var ln; if(Math.random()<CFG.own&&nextTD>r.pd+600&&!(r.onc&&r.lane===0)) ln=r.lane; else do{ ln=ri(r.onc?1:0,NL-1); }while(ln===lastLane); lastLane=ln;
      addCar(nextTD,ln,P.trucks&&Math.random()<0.2); if(r.n>=1&&Math.random()<0.3) addCar(nextTD+ri(-40,40),r.onc?(ln===1?3:1):(ln+2)%NL,0); }
    nextTD+=ri(P.gap*0.62|0,P.gap*1.2|0); }
  if(r.onc) while(nextOD<r.pd+1600){ if(nextOD<r.L-200&&nextOD>r.pd+900) addCar(nextOD,0,0,1); nextOD+=ri(420,760); }
  if(!P.breather) while(nextSD<r.pd+980){ if(nextSD<r.L-100){ var sl=ri(0,NL-1), ok=!laneShut(sl,nextSD,60); traffic.forEach(function(o){ if(o.lane===sl&&Math.abs(o.d-nextSD)<130) ok=false; });
      if(ok) stars.push({d:nextSD,x:laneX(sl),gold:Math.random()<(r.onc&&sl===0?0.5:0.12)?1:0,got:0}); }
    nextSD+=ri(230,430); } }
function blockerV(o){ var best=null, bd=1e9; traffic.forEach(function(q){ if(q!==o&&!q.out&&!q.on&&q.lane===o.lane&&q.d>o.d&&q.d-o.d<160&&q.d-o.d<bd){ bd=q.d-o.d; best=q; } }); return best; }
function crash(o,side){ var r=S.r; if(o){ o.hit=1; o.out=(o.x>=car.x?1:-1)*330; }
  if(S.shield){ S.shield=0; inv=gt+0.6; pop(car.x,r.pd+70,'Shield!','gold'); if(!SIM) SND.star(); return; }
  r.nitro=0; multV=1; car.vx=0; var v=baseV()*CFG.crashKeep; while(r.gear>1&&v<loG(r.gear)) r.gear--; setV(v); r.bog=CFG.crashBog; r.stall=CFG.stall; r.cc=0; r.ccT=0; S.crashes++; r.gs.crashes++; inv=gt+CFG.inv+CFG.stall;
  if(side!=null) r.lane=side;
  if(!SIM){ RK.fx.shake(0.5); RK.fx.stop(70); SND.crash(); pop(car.x,r.pd+70,'Crash!','bad'); puff(car.x-20,'#8A86A8',6); puff(car.x+20,'#8A86A8',6); for(var i=0;i<12;i++) parts.push({x:car.x,d:r.pd+30,vx:(Math.random()-0.5)*300,vd:60+Math.random()*200,t:0.5,c:i%3?'#FFB23D':'#FFF4C2'}); } }
function closeCall(o){ var r=S.r; r.cc=r.ccT>0?r.cc+1:1; r.ccT=2.6; r.gs.combo=Math.max(r.gs.combo,r.cc); S.bestCombo=Math.max(S.bestCombo,r.cc); var fk=(r.nitro>0?CFG.fastN:CFG.fast[r.gear])*(o.on?CFG.oncK:1), p=add(CFG.close*Math.min(r.cc,5)*fk); r.gs.close++; S.closes++; S.boost=Math.min(100,S.boost+CFG.closeN);
  pop((o.x+car.x)/2,r.pd+60,(o.on?'Head-on miss +':fk>1?'Fast miss +':'Near miss +')+p+(r.cc>1?'  ×'+Math.min(r.cc,5):''),r.cc>=3||fk>1?'gold':'good');
  J.whoosh=gt; J.whooshX=o.x;
  if(!SIM){ SND.close(r.cc); RK.fx.shake(0.12); for(var i=0;i<6;i++) parts.push({x:(o.x+car.x)/2,d:r.pd+10,vx:(Math.random()-0.5)*160,vd:-40-Math.random()*160,t:0.35,c:'#FFF4C2'}); if(r.cc===10&&!REDUCE){ slow=1.0; RK.fx.banner('×10 combo!','',{kind:'good',ms:1000}); } } }

function step(dt){ if(!S||!S.started||S.over) return; if(!SIM&&(RK.busy()||RK.fx.frozen())) return;
  gt+=dt; var r=S.r;
  if(S.phase==='pit'){ S.pitT-=dt; car.v*=Math.max(0,1-dt*4); r.pd+=0; if(S.pitT<=0&&!SIM){ save(); card.open(r.n===0?'grid':'pit'); } return; }
  if(S.phase==='lights'){ var was=S.lt; S.lt+=dt; if(!SIM){ if(was<0.5&&S.lt>=0.5) SND.light(false); if(was<1.0&&S.lt>=1.0) SND.light(false); } if(S.lt>=S.lg+0.9) go('ok'); return; }
  if(S.phase==='win'){ S.pitT-=dt; r.pd+=car.v*dt*0.4; if(S.pitT<=0) endRun(true); return; }
  if(S.phase!=='drive') return;
  S.left-=dt; S.pt+=dt; if(slow>0){ slow-=dt; dt*=0.45; }
  /* the engine: rpm sweeps up through each gear and speed follows it. Left on the limiter for a second, it shifts late by itself. */
  if(r.stall>0){ r.stall-=dt; r.rpm=0; }   /* a crash spins the car out: a second with no drive */
  var rate=1/CFG.GT[r.gear-1]*(r.bog>0?0.45:1)*(r.nitro>0?1.5:1); r.rpm=Math.min(1,r.rpm+rate*dt); r.bog=Math.max(0,r.bog-dt);
  if(r.rpm>=0.999){ limT+=dt; if(limT>1.0&&r.gear<r.maxGear) autoShift(); } else limT=0;
  if(r.air>0){ r.air-=dt; if(r.air<=0){ r.air=0; J.squat=gt; if(!SIM){ RK.fx.shake(0.22); SND.bog(); puff(car.x-18,'#C9C4E0',5); puff(car.x+18,'#C9C4E0',5); } } }
  r.nitro=Math.max(0,r.nitro-dt); r.ccT=Math.max(0,r.ccT-dt); if(r.ccT===0) r.cc=0;
  wantM=r.nitro>0?CFG.nitM:1; multV+=(wantM-multV)*Math.min(1,dt*3);
  sandK+=((onPatch('sand')?0.6:1)-sandK)*Math.min(1,dt*6);
  car.v=baseV()*multV*sandK;
  /* steering: snappy; on nitro the car fishtails (swings a little past the lane and wobbles) */
  if(r.nitro>0){ car.vx=(car.vx||0)+((laneX(r.lane)-car.x)*130-car.vx*10+(Math.random()-0.5)*1500)*dt; car.x+=car.vx*dt; var lo=RX+20, hi=RX+LW*NL-20; if(car.x<lo){ car.x=lo; car.vx=Math.abs(car.vx)*0.4; } if(car.x>hi){ car.x=hi; car.vx=-Math.abs(car.vx)*0.4; } }
  else { car.vx=0; car.x+=(laneX(r.lane)-car.x)*Math.min(1,dt*14); }
  var dy=car.v*dt; r.pd+=dy; r.dacc=(r.dacc||0)+dy; if(r.dacc>=100){ var k=Math.floor(r.dacc/100); r.dacc-=k*100; S.score+=Math.round(k*CFG.dist*mult()); }
  spawnAhead();
  var i, o, dd, dx;
  for(i=0;i<traffic.length;i++){ o=traffic[i]; if(o.out){ o.x+=o.out*dt; o.rot+=dt*7; o.d+=CFG.TV*0.5*dt; continue; }
    if(o.on) o.v=o.v0; else { var b=blockerV(o); o.v=b?Math.min(o.v0,b.v*0.95):o.v0; var wb=rbNear(o.d+o.len/2,130,0); if(wb&&wb.gap!==o.lane) o.v=0; } o.d+=o.v*dt; dd=o.d-r.pd; dx=Math.abs(o.x-car.x);
    if(dd>40&&dd<o.len/2+95&&dx<25&&car.v>o.v+30) o.th=1;
    if(!o.pass&&gt>inv&&dx<38&&Math.abs(dd)<(CARL+o.len)/2-7) crash(o);
    if(!o.pass&&dd<-(CARL+o.len)/2){ o.pass=1; if(!o.hit&&o.th) closeCall(o); } }
  traffic=traffic.filter(function(q){ var e=q.d-r.pd; return e>-330&&e<(q.on?1750:1100)&&q.x>-90&&q.x<W+90; });
  /* roadworks: the barrier is a crash that bumps you into the open lane */
  for(i=0;i<works.length;i++){ var w=works[i]; if(w.rb&&!w.said&&w.d0-r.pd<1500&&w.d0>r.pd){ works.forEach(function(q){ if(q.d0===w.d0) q.said=1; }); if(!SIM){ RK.fx.banner('Roadblock!','thread the gap',{kind:'bad',ms:1500}); SND.siren(); } }
    if(gt>inv&&Math.abs(car.x-laneX(w.lane))<38&&r.pd+CARL/2>w.d0&&r.pd-CARL/2<w.d1) { crash(null,w.rb?w.gap:w.lane===0?1:NL-2); break; } }
  for(i=0;i<patches.length;i++){ var p=patches[i]; if(p.hit||r.pd<p.d-20||r.pd>p.d+p.len||car.x<RX+LW*p.l0+6||car.x>RX+LW*(p.l1+1)-6) continue;
    if(p.type==='oil'){ p.hit=1; if(gt>inv){ var dir=r.lane===0?1:r.lane===NL-1?-1:(Math.random()<0.5?-1:1); r.lane+=dir; lockT=gt+0.45; r.cc=0; r.ccT=0; pop(car.x,r.pd+70,'Oil!','bad'); if(!SIM) SND.bog(); } }
    else if(p.type==='ramp'){ p.hit=1; if(r.stall<=0&&car.v>120){ r.air=CFG.air; inv=Math.max(inv,gt+CFG.air+0.12); r.gs.air++; S.airs=(S.airs||0)+1; S.boost=Math.min(100,S.boost+10); var ap=add(CFG.ramp); pop(car.x,r.pd+90,'Big air! +'+ap,'gold'); J.punch=gt; if(!SIM){ tone(330,990,0,0.35,'triangle',0.09); RK.fx.shake(0.15); } } }
    else if(p.type==='pad'){ p.hit=1; S.boost=Math.min(100,S.boost+CFG.pad); pop(car.x,r.pd+80,'Boost pad! Nitro +'+CFG.pad,'gold'); J.punch=gt; if(!SIM){ tone(520,1040,0,0.22,'triangle',0.08); RK.fx.shake(0.12); for(var pe=0;pe<10&&parts.length<90;pe++) parts.push({x:car.x+(Math.random()-0.5)*40,d:r.pd+10,vx:(Math.random()-0.5)*120,vd:-60-Math.random()*260,t:0.45,c:pe%2?'#3DE0FF':'#FFFFFF'}); } }
    else if(p.type==='shield'){ p.hit=1; S.shield=1; pop(car.x,r.pd+70,'Bumper shield!','gold'); if(!SIM) SND.gold(); } }
  var reach=S.lv.magnet?LW+30:36;
  for(i=0;i<stars.length;i++){ var s=stars[i]; if(!s.got&&Math.abs(s.x-car.x)<reach&&Math.abs(s.d-r.pd)<46){ s.got=1; var pts=add(s.gold?CFG.gold:CFG.star); S.starsGot++; r.gs.stars++; S.boost=Math.min(100,S.boost+(s.gold?12:6));
      pop(s.x,r.pd+60,'+'+pts,s.gold?'gold':'good'); if(!SIM){ (s.gold?SND.gold:SND.star)(); for(var e=0;e<(s.gold?8:5)&&parts.length<90;e++) parts.push({x:s.x,d:r.pd+20,vx:(Math.random()-0.5)*240,vd:40+Math.random()*220,t:0.35,c:s.gold?'#FFE14D':'#FFF8D6'}); } } }
  stars=stars.filter(function(q){ return !q.got&&q.d>r.pd-200; });
  /* The Getaway: the police hold a steady speed. Drive faster than them and the gap grows; every crash lets them close. Caught = 5 seconds off the clock. */
  var c=S.cop; if(c){ if(c.wait>0) c.wait-=dt; else c.gap=Math.min(CFG.copMax,c.gap+(car.v-CFG.copV*CFG.V)*dt*CFG.copK);   /* the police give you 4 seconds to get moving */
    c.x+=(car.x-c.x)*Math.min(1,dt*3);
    if(c.gap<=0){ S.busts++; S.left-=CFG.bust; c.gap=CFG.copStart*0.8; inv=gt+1.2; pop(car.x,r.pd+90,'Rammed! −'+CFG.bust+' s','bad'); if(!SIM){ RK.fx.shake(0.6); RK.fx.stop(60); SND.crash(); J.ram=gt; } }
    else if(!SIM&&c.gap<70&&gt-c.warn>1.6){ c.warn=gt; SND.siren(); } }
  if(!r.gdone&&!GOALS[r.goal].end&&goalProg()>=GOALS[r.goal].n) goalHit();
  for(i=parts.length-1;i>=0;i--){ var q=parts[i]; q.t-=dt; q.x+=q.vx*dt; q.d+=q.vd*dt; if(q.t<=0) parts.splice(i,1); }
  if(r.stall>0&&!SIM&&parts.length<70&&Math.random()<0.5) parts.push({x:car.x+(Math.random()-0.5)*30,d:r.pd+10,vx:(Math.random()-0.5)*60,vd:60+Math.random()*80,t:0.5,c:'#8A86A8'});
  if(r.nitro>0&&!SIM&&parts.length<50) parts.push({x:car.x+(Math.random()-0.5)*16,d:r.pd-40,vx:(Math.random()-0.5)*40,vd:-car.v*0.5,t:0.3,c:Math.random()<0.5?'#3DE0FF':'#FFFFFF'});
  if(r.pd>=r.L){ flagReached(); return; }
  if(!SIM&&S.left<=5&&Math.ceil(S.left)!==J.tick){ J.tick=Math.ceil(S.left); tone(660,660,0,0.09,'triangle',0.07); }
  if(S.left<=0){ S.left=0; endRun(false); return; }
  if(!SIM&&(saveT+=dt)>2){ saveT=0; save(); } }
function flagReached(){ var r=S.r, np=CFG.plan.length, p;
  if(!r.gdone&&GOALS[r.goal].end&&r.gs.crashes===0) goalHit();
  S.flags++; p=add(CFG.flag);
  if(r.n>=np-1){ var tb=add(CFG.win), sb=add(Math.ceil(S.left)*CFG.perSec); S.phase='win'; S.pitT=SIM?0:1.6; slow=REDUCE?0:1.6; if(!SIM){ RK.fx.banner('State line! +'+(tb+sb).toLocaleString('en-US'),Math.ceil(S.left)+' seconds left on the clock',{kind:'good',ms:1600}); SND.flag(); } save(); return; }
  var t=bonusTime(r.n+1); S.left=Math.min(CFG.cap,S.left+t);
  if(!SIM){ SND.flag(); RK.fx.banner('Flag '+(r.n+1)+'! +'+p.toLocaleString('en-US'),'+'+t+' seconds',{kind:'good',ms:1000}); var pt=KIT.stagePoint?KIT.stagePoint($('sr-canvas'),480,200):[960,400]; KIT.confetti(pt[0],pt[1],40,2.2); }
  newStretch(r.n+1); save(); }

/* ================= DRAWING ================= */
var cv=$('sr-canvas'), cx=cv.getContext('2d'), DF="'Spitz Digits','Racing Sans One',Inter,sans-serif", WF="'Racing Sans One',Inter,sans-serif", IF='Inter,sans-serif';
function rr(c,x,y,w,h,r){ c.beginPath(); c.moveTo(x+r,y); c.arcTo(x+w,y,x+w,y+h,r); c.arcTo(x+w,y+h,x,y+h,r); c.arcTo(x,y+h,x,y,r); c.arcTo(x,y,x+w,y,r); c.closePath(); }
var SPR={};
function carSprite(kind,col){ var key=kind+col; if(SPR[key]) return SPR[key]; var L=kind==='truck'?128:CARL, s=document.createElement('canvas'); s.width=64; s.height=L+24; var c=s.getContext('2d'), h=L/2; c.translate(32,h+12);
  c.fillStyle='rgba(0,0,0,.4)'; rr(c,-18,-h+5,42,L,9); c.fill();
  c.fillStyle='#0A0A12'; [[-24,-h+10],[17,-h+10],[-24,h-26],[17,h-26]].forEach(function(p){ rr(c,p[0],p[1],7,17,3); c.fill(); });
  if(kind==='truck'){ c.fillStyle='#0B0718'; rr(c,-22,-h-1,44,L+2,6); c.fill(); c.fillStyle=col; rr(c,-20,-h+1,40,26,5); c.fill(); c.fillStyle='#8FD0FF'; rr(c,-15,-h+6,30,9,3); c.fill();
    c.fillStyle='#D8DDEA'; rr(c,-20,-h+31,40,L-33,4); c.fill(); c.fillStyle='rgba(0,0,0,.14)'; for(var y=-h+40;y<h-8;y+=14) c.fillRect(-20,y,40,3); c.fillStyle='#FF4B4B'; c.fillRect(-18,h-4,9,3); c.fillRect(9,h-4,9,3); c.fillStyle='#FFF4C2'; c.fillRect(-17,-h+1,7,3); c.fillRect(10,-h+1,7,3); }
  else { c.fillStyle='#0B0718'; rr(c,-22,-h-1,44,L+2,kind==='traffic'?8:11); c.fill();
    c.fillStyle=kind==='cop'?'#F1F4FA':col; rr(c,-20,-h+1,40,L-2,kind==='traffic'?6:9); c.fill();
    if(kind==='me'){ c.fillStyle='#FFFFFF'; c.fillRect(-7,-h+1,5,L-2); c.fillRect(2,-h+1,5,L-2); c.fillStyle='#0B0718'; c.fillRect(-23,h-7,46,6); }
    if(kind==='cop'){ c.fillStyle='#14161C'; rr(c,-20,-6,40,20,2); c.fill(); }
    c.fillStyle='rgba(11,7,24,.3)'; rr(c,-16,-h+18,32,L-34,6); c.fill();
    c.fillStyle='#8FD0FF'; rr(c,-15,-h+16,30,11,4); c.fill(); c.fillStyle='rgba(143,208,255,.55)'; rr(c,-14,h-22,28,7,3); c.fill();
    c.fillStyle='#FFF4C2'; c.fillRect(-17,-h+1,7,3); c.fillRect(10,-h+1,7,3); c.fillStyle='#FF4B4B'; c.fillRect(-17,h-4,7,3); c.fillRect(10,h-4,7,3); }
  SPR[key]=s; return s; }
var BEAM=null;
function beam(){ if(BEAM) return BEAM; var s=document.createElement('canvas'); s.width=120; s.height=150; var c=s.getContext('2d'), g=c.createLinearGradient(0,150,0,0); g.addColorStop(0,'rgba(255,244,194,.34)'); g.addColorStop(1,'rgba(255,244,194,0)');
  c.fillStyle=g; c.beginPath(); c.moveTo(42,150); c.lineTo(78,150); c.lineTo(120,0); c.lineTo(0,0); c.closePath(); c.fill(); BEAM=s; return s; }
var GLOW={};
function glow(col){ if(GLOW[col]) return GLOW[col]; var s=document.createElement('canvas'); s.width=64; s.height=64; var c=s.getContext('2d'), g=c.createRadialGradient(32,32,2,32,32,32); g.addColorStop(0,col); g.addColorStop(1,'rgba(0,0,0,0)'); c.fillStyle=g; c.fillRect(0,0,64,64); GLOW[col]=s; return s; }

/* the roadside is drawn once per stretch into a strip that tiles every 480 px, plus a sparse top layer that slides a little faster (two depths) */
var STRIP=null, TOP=null, STRIPK='', SX0=-260, SW=1480, PER=480;
function strip(){ var r=S.r, T=SCN[r.scen]; if(STRIPK===r.scen&&STRIP) return; STRIPK=r.scen;
  STRIP=STRIP||document.createElement('canvas'); STRIP.width=SW; STRIP.height=PER; TOP=TOP||document.createElement('canvas'); TOP.width=SW; TOP.height=PER;
  var c=STRIP.getContext('2d'), t=TOP.getContext('2d'), R=rnd(r.scen.length*977+r.scen.charCodeAt(0)), i, x, y, ex=RX-SX0, ew=LW*NL;
  t.clearRect(0,0,SW,PER); c.fillStyle=T.g; c.fillRect(0,0,SW,PER);
  for(i=0;i<70;i++){ c.fillStyle=T.g2; x=R()*SW; y=R()*PER; c.beginPath(); c.ellipse(x,y,20+R()*50,8+R()*14,0,0,6.28); c.fill(); if(y<40){ c.beginPath(); c.ellipse(x,y+PER,20,10,0,0,6.28); c.fill(); } }
  if(T.deco==='palm'){ c.fillStyle=T.b; c.fillRect(0,0,ex-150,PER); c.fillStyle=T.c; for(y=0;y<PER;y+=60){ c.beginPath(); c.ellipse(ex-150,y+30,26,34,0,0,6.28); c.fill(); } c.fillStyle='rgba(255,255,255,.22)'; for(i=0;i<26;i++){ x=R()*(ex-200); y=R()*PER; c.fillRect(x,y,26+R()*30,3); } }
  function deco(c2,x,y,k){ var d=T.deco;
    if(d==='tree'||d==='palm'){ c2.fillStyle='rgba(0,0,0,.28)'; c2.beginPath(); c2.arc(x+7,y+9,24,0,6.28); c2.fill(); c2.fillStyle=T.a; c2.beginPath(); c2.arc(x,y,24,0,6.28); c2.fill(); c2.fillStyle=d==='palm'?'#2C8F6B':T.b; c2.beginPath(); c2.arc(x-5,y-5,15,0,6.28); c2.fill(); c2.fillStyle=d==='palm'?'#49B88A':T.c; c2.beginPath(); c2.arc(x-9,y-9,6,0,6.28); c2.fill(); }
    else if(d==='cactus'){ c2.fillStyle='rgba(0,0,0,.25)'; c2.beginPath(); c2.ellipse(x+6,y+8,16,12,0,0,6.28); c2.fill(); c2.fillStyle=T.a; c2.beginPath(); c2.arc(x,y,11,0,6.28); c2.fill(); c2.beginPath(); c2.arc(x-14,y+3,6,0,6.28); c2.fill(); c2.beginPath(); c2.arc(x+13,y-5,6,0,6.28); c2.fill(); c2.fillStyle='#49B88A'; c2.beginPath(); c2.arc(x-3,y-3,4,0,6.28); c2.fill(); if(k%2){ c2.fillStyle=T.b; c2.beginPath(); c2.ellipse(x+60,y+40,34,16,0.3,0,6.28); c2.fill(); c2.fillStyle=T.c; c2.beginPath(); c2.ellipse(x+56,y+36,22,8,0.3,0,6.28); c2.fill(); } }
    else if(d==='block'){ var w=70+(k%3)*22, h=80+(k%4)*18; c2.fillStyle='rgba(0,0,0,.35)'; c2.fillRect(x-w/2+10,y-h/2+12,w,h); c2.fillStyle=T.a; c2.fillRect(x-w/2,y-h/2,w,h); c2.strokeStyle=k%2?T.c:T.edge; c2.lineWidth=2; c2.strokeRect(x-w/2+4,y-h/2+4,w-8,h-8);
      c2.fillStyle=T.b; for(var a=0;a<3;a++) for(var b=0;b<3;b++) if((a+b+k)%3) c2.fillRect(x-w/2+14+a*(w-34)/2,y-h/2+14+b*(h-36)/2,7,9); }
    else if(d==='pine'){ c2.fillStyle='rgba(0,0,0,.22)'; c2.beginPath(); c2.arc(x+7,y+9,20,0,6.28); c2.fill(); c2.fillStyle=T.a; for(var p=0;p<8;p++){ var an=p*0.785; c2.beginPath(); c2.moveTo(x+Math.cos(an)*22,y+Math.sin(an)*22); c2.lineTo(x+Math.cos(an+0.5)*9,y+Math.sin(an+0.5)*9); c2.lineTo(x+Math.cos(an-0.5)*9,y+Math.sin(an-0.5)*9); c2.fill(); } c2.beginPath(); c2.arc(x,y,12,0,6.28); c2.fill(); c2.fillStyle=T.b; c2.beginPath(); c2.arc(x-2,y-2,6,0,6.28); c2.fill(); }
    else if(d==='rock'){ c2.fillStyle='rgba(0,0,0,.3)'; c2.beginPath(); c2.ellipse(x+8,y+10,34,22,0,0,6.28); c2.fill(); c2.fillStyle=T.a; c2.beginPath(); c2.moveTo(x-34,y+6); c2.lineTo(x-18,y-20); c2.lineTo(x+14,y-24); c2.lineTo(x+34,y-2); c2.lineTo(x+22,y+20); c2.lineTo(x-16,y+22); c2.closePath(); c2.fill(); c2.fillStyle=T.b; c2.beginPath(); c2.moveTo(x-18,y-20); c2.lineTo(x+14,y-24); c2.lineTo(x+8,y-2); c2.lineTo(x-16,y+2); c2.closePath(); c2.fill(); c2.fillStyle=T.c; c2.beginPath(); c2.moveTo(x-12,y-16); c2.lineTo(x+6,y-19); c2.lineTo(x+2,y-8); c2.closePath(); c2.fill(); }
    else { c2.fillStyle=T.a; c2.beginPath(); c2.ellipse(x,y,26,9,0,0,6.28); c2.fill(); c2.fillStyle=T.b; c2.beginPath(); c2.ellipse(x-4,y-2,14,4,0,0,6.28); c2.fill(); } }
  for(i=0;i<6;i++){ y=i*80+40; [0,1].forEach(function(sd){ var n=sd?3:(T.deco==='palm'?1:3); for(var j=0;j<n;j++){ var px=sd?ex+ew+70+j*150+R()*70:ex-70-j*150-R()*70, py=y+R()*30-15; deco(c,px,py,i+j+sd); deco(c,px,py-PER,i+j+sd); deco(c,px,py+PER,i+j+sd); } }); }   /* drawn again one tile up and down, so nothing is cut at the seam */
  for(i=0;i<3;i++){ y=i*160+80; [0,1].forEach(function(sd){ if(T.deco==='grass'||(T.deco==='palm'&&!sd)) return; var px=sd?ex+ew+330+R()*120:ex-330-R()*120; [0,-PER,PER].forEach(function(oy){ t.save(); t.translate(px,y+oy); t.scale(1.5,1.5); deco(t,0,0,i+sd*2); t.restore(); }); }); }
  /* the road: dark asphalt, a neon line on each edge, dashes between lanes */
  c.fillStyle='#0B0718'; c.fillRect(ex-14,0,ew+28,PER); c.fillStyle='#211D3A'; c.fillRect(ex,0,ew,PER);
  c.fillStyle='rgba(255,255,255,.035)'; for(i=0;i<60;i++) c.fillRect(ex+R()*ew,R()*PER,2,10+R()*20);
  [ex-9,ex+ew+3].forEach(function(lx){ var g=c.createLinearGradient(lx-12,0,lx+18,0); g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(0.5,T.edge); g.addColorStop(1,'rgba(0,0,0,0)'); c.globalAlpha=0.35; c.fillStyle=g; c.fillRect(lx-12,0,30,PER); c.globalAlpha=1; c.fillStyle=T.edge; c.fillRect(lx,0,6,PER); c.fillStyle='rgba(255,255,255,.7)'; c.fillRect(lx+2,0,2,PER); });
  c.fillStyle='rgba(236,232,255,.6)'; for(i=1;i<NL;i++) for(y=0;y<PER;y+=80) c.fillRect(ex+LW*i-2,y,4,36); }
var DARK=null;
function night(){ var s=DARK||(DARK=document.createElement('canvas')); s.width=240; s.height=135; var c=s.getContext('2d'); c.globalCompositeOperation='source-over'; c.clearRect(0,0,240,135); c.fillStyle='rgba(4,3,14,.8)'; c.fillRect(0,0,240,135);
  c.globalCompositeOperation='destination-out'; var x=sx(car.x)/4, y=PY/4, g=c.createRadialGradient(x,y-34,6,x,y-34,82); g.addColorStop(0,'rgba(0,0,0,1)'); g.addColorStop(0.55,'rgba(0,0,0,.85)'); g.addColorStop(1,'rgba(0,0,0,0)');
  c.fillStyle=g; c.beginPath(); c.moveTo(x-9,y+14); c.lineTo(x+9,y+14); c.lineTo(x+62,y-120); c.lineTo(x-62,y-120); c.closePath(); c.fill(); cx.drawImage(s,0,0,W,H); }
function drawStar(x,y,r,col){ cx.beginPath(); for(var i=0;i<10;i++){ var a=i*Math.PI/5-Math.PI/2+gt*1.5, q=i%2?r*0.45:r; cx.lineTo(x+Math.cos(a)*q,y+Math.sin(a)*q); } cx.closePath(); cx.fillStyle=col; cx.fill(); cx.lineWidth=2.5; cx.strokeStyle='#0B0718'; cx.stroke(); }
function wy(d){ return PY-(d-S.r.pd); }   /* world y inside the zoomed space */
function lock(x,y,s){ cx.fillStyle='#0B0718'; rr(cx,x-s*0.6,y-s*0.1,s*1.2,s*0.9,2); cx.fill(); cx.strokeStyle='#0B0718'; cx.lineWidth=s*0.28; cx.beginPath(); cx.arc(x,y-s*0.1,s*0.34,Math.PI,0); cx.stroke(); cx.fillStyle='#FFE14D'; rr(cx,x-s*0.45,y+s*0.03,s*0.9,s*0.64,1.5); cx.fill(); }
function txt(s,x,y,font,fill,al){ cx.font=font; cx.textAlign=al||'center'; cx.lineJoin='round'; cx.lineWidth=5; cx.strokeStyle='#0B0718'; cx.strokeText(s,x,y); cx.fillStyle=fill; cx.fillText(s,x,y); }

function draw(){ cx.setTransform(1,0,0,1,0,0); if(!S||!S.started||!S.r){ cx.fillStyle='#150E36'; cx.fillRect(0,0,W,H); return; }
  if(VIEW==='chase') return drawChase();
  var r=S.r, T=SCN[r.scen], P=CFG.plan[r.n], i, o, y, zt=REDUCE?0.86:(r.nitro>0?0.68:1-0.24*Math.min(1,car.v/CFG.V)); zoom+=(zt-zoom)*0.06; if(S.phase!=='drive'&&S.phase!=='win') zoom+=(0.92-zoom)*0.06;
  strip(); cx.fillStyle=T.g; cx.fillRect(0,0,W,H);
  cx.setTransform(zoom,0,0,zoom,480-480*zoom,PY-PY*zoom);
  var top=PY-PY/zoom-10, bot=PY+(H-PY)/zoom+10, off=((r.pd%PER)+PER)%PER;
  for(y=PY+off-PER*Math.ceil((PY+off-top)/PER);y<bot;y+=PER) cx.drawImage(STRIP,SX0,y);
  /* painted lane arrows before roadworks, cones and a barrier */
  for(i=0;i<works.length;i++){ var w=works[i], lx=laneX(w.lane), y0=wy(w.d0), y1=wy(w.d1), dir=w.lane===0?1:-1; if(y1>bot||wy(w.d0-480)<top) continue;
    cx.fillStyle='rgba(255,225,77,.85)'; for(var a=1;a<=3;a++){ y=wy(w.d0-a*140); cx.beginPath(); cx.moveTo(lx-dir*16,y+22); cx.lineTo(lx+dir*8,y-6); cx.lineTo(lx+dir*8,y+4); cx.lineTo(lx+dir*22,y-22); cx.lineTo(lx+dir*20,y+8); cx.lineTo(lx+dir*12,y+2); cx.lineTo(lx-dir*8,y+26); cx.closePath(); cx.fill(); }
    cx.fillStyle='rgba(11,7,24,.55)'; cx.fillRect(lx-LW/2+2,y1,LW-4,y0-y1); cx.fillStyle='#FFB23D'; cx.fillRect(lx-LW/2+4,y0-8,LW-8,10); cx.fillStyle='#0B0718'; for(a=0;a<4;a++) cx.fillRect(lx-LW/2+8+a*18,y0-8,8,10);
    for(y=y0-40;y>y1;y-=46){ cx.fillStyle='#FF7A3D'; cx.beginPath(); cx.arc(lx+dir*(LW/2-7),y,6,0,6.28); cx.fill(); cx.fillStyle='#fff'; cx.beginPath(); cx.arc(lx+dir*(LW/2-7),y,2.5,0,6.28); cx.fill(); } }
  for(i=0;i<patches.length;i++){ var p=patches[i], px=RX+LW*p.l0, pw=LW*(p.l1-p.l0+1); y=wy(p.d+p.len); if(y>bot||y+p.len<top) continue;
    if(p.type==='ice'){ cx.fillStyle='rgba(170,226,255,.55)'; rr(cx,px+5,y,pw-10,p.len,26); cx.fill(); cx.strokeStyle='rgba(255,255,255,.8)'; cx.lineWidth=3; cx.beginPath(); cx.moveTo(px+30,y+p.len-30); cx.lineTo(px+70,y+p.len-90); cx.moveTo(px+pw-70,y+60); cx.lineTo(px+pw-34,y+24); cx.stroke(); }
    else if(p.type==='sand'){ cx.fillStyle='#D9A866'; rr(cx,px+4,y,pw-8,p.len,30); cx.fill(); cx.fillStyle='#B98548'; for(var k=0;k<5;k++){ cx.beginPath(); cx.ellipse(px+30+k*(pw-60)/4,y+40+((k*53)%(p.len-80)),16,5,0,0,6.28); cx.fill(); } }
    else if(p.type==='oil'&&!p.hit){ cx.fillStyle='#07050F'; cx.beginPath(); cx.ellipse(px+LW/2,y+p.len/2,26,20,0,0,6.28); cx.fill(); cx.fillStyle='rgba(175,120,255,.7)'; cx.beginPath(); cx.ellipse(px+LW/2-6,y+p.len/2-5,10,5,-0.4,0,6.28); cx.fill(); }
    else if(p.type==='shield'&&!p.hit){ cx.drawImage(glow('rgba(61,224,255,.6)'),px+LW/2-32,y+p.len/2-32); cx.fillStyle='#3DE0FF'; cx.strokeStyle='#0B0718'; cx.lineWidth=3; cx.beginPath(); cx.moveTo(px+LW/2,y+p.len/2-17); cx.lineTo(px+LW/2+15,y+p.len/2-10); cx.lineTo(px+LW/2+12,y+p.len/2+8); cx.lineTo(px+LW/2,y+p.len/2+18); cx.lineTo(px+LW/2-12,y+p.len/2+8); cx.lineTo(px+LW/2-15,y+p.len/2-10); cx.closePath(); cx.fill(); cx.stroke(); } }
  /* the flag line (the state line on the last stretch) */
  y=wy(r.L); if(y>top-30&&y<bot){ for(i=0;i<NL*LW/19;i++) for(var j=0;j<2;j++){ cx.fillStyle=(i+j)%2?'#0B0718':'#F6F6F8'; cx.fillRect(RX+i*19,y-19+j*19,19,19); } if(P.cop) txt('STATE LINE',480,y-70,'400 34px '+WF,'#FFE14D'); }
  for(i=0;i<stars.length;i++){ var s=stars[i]; y=wy(s.d); if(y<top||y>bot) continue; if(s.gold) cx.drawImage(glow('rgba(255,225,77,.55)'),s.x-32,y-32); drawStar(s.x,y,s.gold?17:13,s.gold?'#FFE14D':'#FFF8D6'); }
  var bm=beam(), nightOn=r.haz.indexOf('night')>=0;
  for(i=0;i<traffic.length;i++){ o=traffic[i]; y=wy(o.d); if(y<top-100||y>bot+100) continue; var sp=carSprite(o.truck?'truck':'traffic',o.col);
    if(o.out){ cx.save(); cx.translate(o.x,y); cx.rotate(o.rot); cx.drawImage(sp,-32,-sp.height/2); cx.restore(); }
    else if(o.on){ cx.save(); cx.translate(o.x,y); cx.rotate(Math.PI); cx.drawImage(sp,-32,-sp.height/2); cx.restore(); }
    else { cx.globalAlpha=0.5; cx.drawImage(bm,o.x-60,y-o.len/2-146); cx.globalAlpha=1; cx.drawImage(sp,o.x-32,y-sp.height/2); cx.drawImage(glow('rgba(255,60,60,.5)'),o.x-32,y+o.len/2-30); } }
  var c=S.cop; if(c){ y=PY+62+Math.max(0,c.gap)*0.25; if(y<bot+60){ cx.drawImage(carSprite('cop',''),c.x-32,y-49); var on=Math.floor(gt*2)%2; cx.drawImage(glow(on?'rgba(255,60,60,.7)':'rgba(70,120,255,.7)'),c.x-46,y-36); cx.drawImage(glow(on?'rgba(70,120,255,.7)':'rgba(255,60,60,.7)'),c.x-18,y-36);
      cx.fillStyle=on?'#FF4B4B':'#5C8BFF'; rr(cx,c.x-15,y-9,13,6,2); cx.fill(); cx.fillStyle=on?'#5C8BFF':'#FF4B4B'; rr(cx,c.x+2,y-9,13,6,2); cx.fill(); } }
  /* my car: headlights, nitro flame, the car, a shield ring */
  var tilt=Math.max(-0.22,Math.min(0.22,(laneX(r.lane)-car.x)*0.006+(car.vx||0)*0.0006)), blink=gt<inv&&Math.floor(gt*8)%2;
  cx.drawImage(bm,car.x-60,PY-CARL/2-146);
  if(r.nitro>0){ cx.drawImage(glow('rgba(61,224,255,.8)'),car.x-32,PY+CARL/2-20,64,64+Math.random()*26); }
  cx.save(); cx.translate(car.x,PY); cx.rotate(tilt); if(blink) cx.globalAlpha=0.45; var me=carSprite('me',myCar.c); cx.drawImage(me,-32,-me.height/2); cx.restore();
  if(S.shield){ cx.strokeStyle='#3DE0FF'; cx.lineWidth=3; cx.beginPath(); cx.ellipse(car.x,PY,34,48,0,0,6.28); cx.stroke(); }
  for(i=0;i<parts.length;i++){ var q=parts[i]; cx.globalAlpha=Math.min(1,q.t*4); cx.fillStyle=q.c; cx.fillRect(q.x-2.5,wy(q.d)-2.5,5,5); } cx.globalAlpha=1;
  /* the top layer slides a little faster than the ground */
  var off2=(((r.pd*1.22)%PER)+PER)%PER; for(y=PY+off2-PER*Math.ceil((PY+off2-top)/PER);y<bot;y+=PER) cx.drawImage(TOP,SX0,y);
  cx.setTransform(1,0,0,1,0,0);
  if(P.cop&&!REDUCE){ var on2=Math.floor(gt*2)%2; cx.globalAlpha=0.07; cx.fillStyle=on2?'#FF4B4B':'#5C8BFF'; cx.fillRect(0,0,W,H); cx.globalAlpha=1; }
  if(nightOn) night();
  /* speed lines down the road on nitro */
  if(!REDUCE&&S.phase==='drive'&&r.nitro>0){ cx.fillStyle='rgba(255,255,255,.3)'; for(i=0;i<10;i++){ var lx2=sx(RX+12+((i*67)%(NL*LW-24))), ly=((i*89+gt*(1100+i*60))%(H+120))-120; cx.fillRect(lx2,ly,2,50+i%3*24); } }
  /* near-miss combo beside the car */
  if(r.cc>=2&&S.phase==='drive') txt('×'+Math.min(r.cc,5)+' combo',sx(car.x)+(r.lane>=NL-1?-86:86),PY-10,'400 24px '+WF,r.cc>=5?'#FFE14D':'#3DFFB0');
  dial(); if(S.phase==='lights') lamp(); }
/* the gear dial, bottom left: needle, green zone, gear number, padlocks on locked gears, nitro bar under it */
function dial(){ var r=S.r, x=92, y=430, R0=58, a0=Math.PI*0.75, sw=Math.PI*1.5, rpm=Math.max(0,r.rpm), z=pz(), can=r.gear<r.maxGear, i;
  cx.fillStyle='rgba(11,7,24,.82)'; cx.beginPath(); cx.arc(x,y,R0+12,0,6.28); cx.fill();
  cx.lineWidth=11; cx.lineCap='butt'; cx.strokeStyle='#3A3360'; cx.beginPath(); cx.arc(x,y,R0,a0,a0+sw); cx.stroke();
  cx.strokeStyle=can?'#3DFFB0':'#5A5480'; cx.beginPath(); cx.arc(x,y,R0,a0+sw*z,a0+sw*CFG.PZEND); cx.stroke();
  cx.strokeStyle='#FF4B4B'; cx.beginPath(); cx.arc(x,y,R0,a0+sw*CFG.PZEND,a0+sw); cx.stroke();
  var a=a0+sw*rpm; cx.strokeStyle='#FFE14D'; cx.lineWidth=5; cx.lineCap='round'; cx.beginPath(); cx.moveTo(x,y); cx.lineTo(x+Math.cos(a)*(R0+3),y+Math.sin(a)*(R0+3)); cx.stroke(); cx.lineCap='butt';
  cx.fillStyle='#0B0718'; cx.beginPath(); cx.arc(x,y,27,0,6.28); cx.fill();
  var inZone=can&&S.phase==='drive'&&rpm>=z&&rpm<=CFG.PZEND;
  cx.textAlign='center'; cx.fillStyle=inZone?'#3DFFB0':'#fff'; cx.font='400 38px '+DF; cx.fillText(String(r.gear),x,y+13);
  txt('Gear',x,y+R0-2,'800 15px '+IF,'#C6B8F0');
  /* five gear pips: filled up to the current gear, padlock on the locked ones */
  for(i=1;i<=5;i++){ var gx=x-52+(i-1)*26, gy=y+R0+30; if(i>r.maxGear){ lock(gx,gy-3,13); } else { cx.fillStyle='#0B0718'; cx.beginPath(); cx.arc(gx,gy,10,0,6.28); cx.fill(); cx.fillStyle=i<=r.gear?'#FFE14D':'#5A5480'; cx.beginPath(); cx.arc(gx,gy,7,0,6.28); cx.fill(); } }
  /* nitro bar to the right of the dial */
  var bx=x+R0+26, bw=120, by=y+34, full=S.boost>=100; cx.fillStyle='#0B0718'; rr(cx,bx-3,by-3,bw+6,20,6); cx.fill(); cx.fillStyle='#3A3360'; rr(cx,bx,by,bw,14,4); cx.fill();
  cx.fillStyle=r.nitro>0?'#FFFFFF':full?'#3DE0FF':'#2E9FC2'; rr(cx,bx,by,Math.max(6,bw*(r.nitro>0?r.nitro/CFG.nitT[S.lv.tank]:S.boost/100)),14,4); cx.fill();
  txt(r.nitro>0?'Nitro!':full?(can?'Nitro ready':'Nitro: press Space'):'Nitro',bx,by-9,'800 15px '+IF,full||r.nitro>0?'#3DE0FF':'#C6B8F0','left');
  if(inZone) txt('Shift! Space',bx,y-8,'400 26px '+WF,'#3DFFB0','left');
  else if(S.phase==='drive'&&!can&&r.maxGear<5&&rpm>0.9) txt((r.maxGear+1)+(r.maxGear===3?'th':'th')+' gear is locked',bx,y-8,'800 16px '+IF,'#FFE14D','left'); }

/* the shift bar (chase view), bottom left: a wide rev bar with a green zone, the gear number, padlocks on locked gears, nitro under it */
function bar(){ var r=S.r, x=118, y=474, w=290, h=22, rpm=Math.max(0,r.rpm), z=pz(), can=r.gear<r.maxGear, i, inZone=can&&S.phase==='drive'&&rpm>=z&&rpm<=CFG.PZEND;
  cx.fillStyle='#0B0718'; cx.beginPath(); cx.arc(70,y+12,40,0,6.28); cx.fill(); var gk=REDUCE?0:Math.max(0,1-(gt-Math.max(J.squat,J.punch))/0.2); cx.fillStyle=inZone?'#3DFFB0':gk>0?'#FFE14D':'#fff'; cx.textAlign='center'; cx.font='400 '+Math.round(50*(1+gk*0.4))+'px '+DF; cx.fillText(String(r.gear),70,y+30+gk*7);
  txt('Gear',70,y-34,'800 15px '+IF,'#C6B8F0');
  cx.fillStyle='#0B0718'; rr(cx,x-4,y-4,w+8,h+8,8); cx.fill(); cx.fillStyle='#3A3360'; rr(cx,x,y,w,h,5); cx.fill();
  cx.fillStyle=can?'#3DFFB0':'#5A5480'; cx.fillRect(x+w*z,y,w*(CFG.PZEND-z),h); cx.fillStyle='#FF4B4B'; cx.fillRect(x+w*CFG.PZEND,y,w*(1-CFG.PZEND),h);
  cx.fillStyle='#0B0718'; cx.fillRect(x+w*rpm-5,y-8,10,h+16); cx.fillStyle='#FFE14D'; cx.fillRect(x+w*rpm-3,y-6,6,h+12);
  for(i=1;i<=5;i++){ var gx=x+12+(i-1)*26, gy=y+h+22; if(i>r.maxGear) lock(gx,gy-3,13); else { cx.fillStyle='#0B0718'; cx.beginPath(); cx.arc(gx,gy,10,0,6.28); cx.fill(); cx.fillStyle=i<=r.gear?'#FFE14D':'#5A5480'; cx.beginPath(); cx.arc(gx,gy,7,0,6.28); cx.fill(); } }
  var bx=x+146, bw=144, by=y+h+12, full=S.boost>=100; cx.fillStyle='#0B0718'; rr(cx,bx-3,by-3,bw+6,26,7); cx.fill(); cx.fillStyle='#3A3360'; rr(cx,bx,by,bw,20,5); cx.fill();
  cx.fillStyle=r.nitro>0?'#FFFFFF':full?'#3DE0FF':'#2E9FC2'; rr(cx,bx,by,Math.max(6,bw*(r.nitro>0?r.nitro/CFG.nitT[S.lv.tank]:S.boost/100)),20,5); cx.fill();
  cx.font='800 14px '+IF; cx.textAlign='center'; cx.fillStyle=full||r.nitro>0?'#0B0718':'#FFFFFF'; cx.fillText(r.nitro>0?'Nitro!':full?(can?'Nitro ready':'Nitro: Space'):'Nitro',bx+bw/2,by+15);
  var mph=Math.round(car.v/Math.max(1,multV)*(1+(multV-1)*0.4)*0.4); cx.textAlign='left'; cx.lineJoin='round'; cx.font='400 44px '+DF; cx.lineWidth=7; cx.strokeStyle='#0B0718'; cx.strokeText(String(mph),x+w+22,y+26); cx.fillStyle=r.nitro>0?'#3DE0FF':'#fff'; cx.fillText(String(mph),x+w+22,y+26); var mphW=cx.measureText(String(mph)).width; txt('mph',x+w+22+mphW+24,y+26,'800 15px '+IF,'#C6B8F0');
  if(inZone) txt('Shift! Space',x+w/2,y-14,'400 28px '+WF,'#3DFFB0');
  else if(S.phase==='drive'&&!can&&r.maxGear<5&&rpm>0.9) txt((r.maxGear+1)+'th gear is locked',x+w/2,y-14,'800 16px '+IF,'#FFE14D'); }
function lamp(){ var x=480, y=262, on=S.lt>=S.lg, n=on?3:S.lt>=1.0?2:S.lt>=0.5?1:0, i; cx.fillStyle='rgba(11,7,24,.88)'; rr(cx,x-92,y-34,184,68,18); cx.fill();
  for(i=0;i<3;i++){ cx.fillStyle=on?'#3DFFB0':i<n?'#FF4B4B':'#3A3360'; cx.beginPath(); cx.arc(x-56+i*56,y,20,0,6.28); cx.fill(); }
  txt(on?'Go!':'Press Space on the green',x,y+72,'400 28px '+WF,on?'#3DFFB0':'#FFFFFF'); }


/* ================= CHASE VIEW (v2): the camera sits behind and above the car; the road runs to a horizon =================
   Only the picture changes. Lanes, distances, traffic and every rule are the same numbers as the top-down view. */
var LENS=+prm.lens||2, HZ=205, HC=92, CB=120*LENS, F0=300*LENS, FOC=F0, ZN=CB-150, FAR=1650, camX=0, focT=F0;   /* LENS: a longer lens makes far cars bigger, so there is more time to read the road */
var SKY={ forest:['#07142B','#1B4A52','#0B2A26','trees'], desert:['#2A1650','#F08A5C','#4A2440','mesa'], city:['#090720','#3A1F6E','#120E2A','city'], snow:['#16224F','#7FA3D9','#C9D9F2','peaks'],
  coast:['#10244F','#F2A07A','#123E73','sea'], canyon:['#3A1235','#F0704A','#5A1F28','mesa'], sunrise:['#5B3A8A','#FFC27A','#8A4A5A','hills'], getaway:['#0A0618','#3B1440','#120E2A','city'] };
var SKYC=null, SKYK='';
/* painted horizons (backs.js, cut from the approved sheets): [strip, height on screen, night tint]. Until a strip has loaded, the code-drawn shapes stand in. */
var BACK={ city:['skyline',128,0.1], getaway:['cityrow',104,0.22], coast:['coastline',74,0.12], sunrise:['beachrow',86,0.12], desert:['mesas',74,0.1], canyon:['canyonwall',100,0.14], forest:['foresthills',80,0.5], snow:['snowpeaks',104,0.28] }, BKIMG={};
function backImg(scen){ var B=BACK[scen], A=window.SRBACK, im; if(!B||!A||!A[B[0]]) return null; im=BKIMG[B[0]]; if(!im){ im=BKIMG[B[0]]=new Image(); im.src=A[B[0]]; } return im.complete&&im.naturalWidth?im:null; }
function sky(){ var r=S.r, K=SKY[r.scen], bk=backImg(r.scen), key=r.scen+(bk?1:0); if(SKYK===key&&SKYC) return SKYC; SKYK=key; var s=SKYC||(SKYC=document.createElement('canvas')); s.width=1200; s.height=HZ+2; var c=s.getContext('2d'), R=rnd(r.scen.length*131+r.scen.charCodeAt(1)), i, x, h, g=c.createLinearGradient(0,0,0,HZ);
  g.addColorStop(0,K[0]); g.addColorStop(1,K[1]); c.fillStyle=g; c.fillRect(0,0,1200,HZ+2);
  if(K[3]!=='sea'&&r.scen!=='sunrise'&&r.scen!=='desert'&&r.scen!=='canyon'){ c.fillStyle='rgba(255,255,255,.8)'; for(i=0;i<70;i++) c.fillRect(R()*1200,R()*HZ*0.75,R()<0.2?3:2,R()<0.2?3:2); c.fillStyle='#F4F0D8'; c.beginPath(); c.arc(880,58,26,0,6.28); c.fill(); c.fillStyle=K[0]; c.beginPath(); c.arc(870,52,23,0,6.28); c.fill(); }
  else { var sun=r.scen==='sunrise'?'#FFF2B0':'#FFD98A'; c.fillStyle='rgba(255,220,150,.25)'; c.beginPath(); c.arc(600,HZ-6,120,0,6.28); c.fill(); c.fillStyle=sun; c.beginPath(); c.arc(600,HZ-6,62,0,6.28); c.fill(); c.fillStyle=K[1]; for(i=0;i<4;i++) c.fillRect(520,HZ-44+i*13,160,3+i); }
  c.fillStyle=K[2];
  if(bk){ var B=BACK[r.scen], bh=B[1], bw=Math.round(bk.naturalWidth*bh/bk.naturalHeight), t=document.createElement('canvas'), tc; t.width=bw; t.height=bh; tc=t.getContext('2d'); tc.drawImage(bk,0,0,bw,bh); tc.globalCompositeOperation='source-atop'; tc.globalAlpha=B[2]; tc.fillStyle=K[0]; tc.fillRect(0,0,bw,bh);
    for(x=-Math.round(bw*0.3);x<1200;x+=bw-1) c.drawImage(t,x,HZ+2-bh); }
  else if(K[3]==='city'){ for(x=0;x<1200;){ var w=28+R()*46; h=30+R()*105; c.fillStyle=K[2]; c.fillRect(x,HZ-h,w,h+2); c.fillStyle=R()<0.5?'#FFE14D':(r.scen==='getaway'?'#FF4B4B':'#3DE0FF'); for(var a=x+5;a<x+w-6;a+=9) for(var b=HZ-h+7;b<HZ-6;b+=11) if(R()<0.45) c.fillRect(a,b,4,5); x+=w+2+R()*8; } }
  else if(K[3]==='trees'){ for(x=-20;x<1220;x+=22+R()*16){ h=34+R()*40; c.beginPath(); c.moveTo(x-18,HZ+2); c.lineTo(x,HZ-h); c.lineTo(x+18,HZ+2); c.fill(); } }
  else if(K[3]==='peaks'){ for(x=-80;x<1250;x+=150+R()*60){ h=80+R()*70; c.fillStyle='#5E78B0'; c.beginPath(); c.moveTo(x-140,HZ+2); c.lineTo(x,HZ-h); c.lineTo(x+140,HZ+2); c.fill(); c.fillStyle=K[2]; c.beginPath(); c.moveTo(x-38,HZ-h+38*h/140*1.0); c.lineTo(x,HZ-h); c.lineTo(x+38,HZ-h+38*h/140); c.lineTo(x+14,HZ-h+30); c.lineTo(x-8,HZ-h+44); c.closePath(); c.fill(); } }
  else if(K[3]==='mesa'){ for(x=-40;x<1220;x+=170+R()*120){ var mw=70+R()*90; h=36+R()*52; c.beginPath(); c.moveTo(x-18,HZ+2); c.lineTo(x,HZ-h); c.lineTo(x+mw,HZ-h); c.lineTo(x+mw+18,HZ+2); c.fill(); } }
  else if(K[3]==='sea'){ c.fillRect(0,HZ-16,1200,18); c.fillStyle='rgba(255,220,170,.5)'; for(i=0;i<14;i++) c.fillRect(540+R()*120,HZ-14+R()*12,20+R()*30,2); c.fillStyle='#1F4B52'; for(x=-40;x<420;x+=120+R()*60){ c.beginPath(); c.ellipse(x,HZ+2,90,22+R()*18,0,Math.PI,0); c.fill(); } }
  else { for(x=-60;x<1260;x+=160){ c.beginPath(); c.ellipse(x,HZ+4,130,26+R()*26,0,Math.PI,0); c.fill(); } }
  return s; }
/* roadside things, seen standing up from the road: one small picture each, drawn once */
var FIXSZ={tower:1,flats:1,skyscraper:1,hotel:1,diner:1,gas:1,billboard:1,watertower:1,cabin:1,lighthouse:1,lamp:1,pole:1,neon:1,carwash:1,garage:1,burger:1,court:1,graffiti:1,ferris:1,beachhut:1,gate:1,windmill:1,signstack:1,donut:1,light:1,busstop:1,hydrant:1,toll:1,tires:1}, SIDEGAP=240, SIDE={}, PROP={}, PRIMG={}, TINT={ forest:['#07142B',0.42], snow:['#16224F',0.2], desert:['#4A2440',0.18], canyon:['#5A1F28',0.2], coast:['#3A2A50',0.18], sunrise:['#8A4A5A',0.15], city:['#120E2A',0.12], getaway:['#2A0A20',0.2] };
/* painted roadside (props.js, cut from the approved sheet), toned a little toward each scenery's light. lw and lh are its size in game units. */
var PVAR={ tree:[null,{R:[70,160,0.2,1,0.1,0.9],V:{dh:-22,l:1.05}},{R:[70,160,0.2,1,0.1,0.9],V:{dh:28,s:0.85,l:0.9}},{R:[70,160,0.2,1,0.1,0.9],V:{h:30,s:1.05}}], cactus:[null,{R:[80,160,0.2,1,0.1,0.9],V:{dh:26,s:0.8,l:0.9}},{R:[80,160,0.2,1,0.1,0.9],V:{dh:-24,s:0.85}}],
  pine:[null,{R:[120,180,0.2,1,0.1,0.6],V:{dh:22,l:0.9}}], palm:[null,{R:[70,160,0.2,1,0.1,0.9],V:{dh:24,s:0.85,l:0.9}}], rock:[null,{R:[0,40,0.2,1,0.1,0.9],V:{dh:14,s:0.75,l:1.08}},{R:[0,40,0.2,1,0.1,0.9],V:{dh:-12,s:0.9,l:0.88}},{R:[0,40,0.2,1,0.1,0.9],V:{h:222,s:0.22,l:1.0}}],
  tower:[null,{R:[205,240,0.2,0.85,0.08,0.45],V:{h:268}},{R:[205,240,0.2,0.85,0.08,0.45],V:{h:186,s:0.9}},{R:[205,240,0.2,0.85,0.08,0.45],V:{h:322,s:0.8}}], flats:[null,{R:[230,330,0.04,0.6,0.15,0.6],V:{h:215,s:1.6}},{R:[230,330,0.04,0.6,0.15,0.6],V:{h:160,s:1.4}},{R:[230,330,0.04,0.6,0.15,0.6],V:{h:12,s:1.5}}], pole:[null], bush:[null,{R:[60,160,0.2,1,0.1,0.9],V:{dh:26,s:0.8,l:0.85}},{R:[60,160,0.2,1,0.1,0.9],V:{h:38,s:0.8}}] };
/* what stands by the road in each scenery: [painted piece, how often, colour variants it may use] */
var MIX={ forest:[['tree',6,[0,1,2]],['autumn',2,[0]],['bush',2,[0,1]],['deadtree',1,[0]],['cabin',1,[0]],['boulder',1,[0]],['pole',1,[0]],['blossom',1,[0]],['windmill',1,[0]]],
  desert:[['cactus',4,[0,1,2]],['rock',2,[0,1]],['mesa',2,[0]],['bush',2,[2,1]],['boulder',1,[0]],['deadtree',1,[0]],['gas',1,[0]],['billboard',1,[0]],['watertower',1,[0]],['tires',1,[0]],['signstack',1,[0]]],
  snow:[['pine',6,[0,1]],['cabin',2,[0]],['boulder',2,[0]],['deadtree',1,[0]],['rock',1,[3]]],
  coast:[['palm',5,[0,1]],['bush',2,[0]],['rock',1,[1]],['lighthouse',1,[0]],['diner',1,[0]],['billboard',1,[0]],['boulder',1,[0]],['lightpalm',3,[0]],['beachhut',2,[0]],['ferris',1,[0]],['donut',1,[0]],['burger',1,[0]],['blossom',1,[0]]],
  canyon:[['rock',5,[0,1,2]],['mesa',3,[0]],['cactus',1,[1]],['bush',1,[2]],['boulder',1,[0]],['deadtree',1,[0]],['watertower',1,[0]],['tires',1,[0]]],
  city:[['tower',3,[0,1,2,3]],['flats',3,[0,1,2,3]],['skyscraper',3,[0]],['hotel',2,[0]],['lamp',1,[0]],['diner',1,[0]],['gas',1,[0]],['billboard',1,[0]],['neon',3,[0]],['garage',2,[0]],['graffiti',2,[0]],['light',2,[0]],['carwash',1,[0]],['burger',1,[0]],['court',1,[0]],['busstop',1,[0]],['hydrant',1,[0]],['signstack',1,[0]],['donut',1,[0]]],
  getaway:[['tower',3,[0,1,3]],['flats',3,[0,1,3]],['skyscraper',3,[0]],['hotel',2,[0]],['lamp',2,[0]],['billboard',1,[0]],['neon',3,[0]],['garage',1,[0]],['graffiti',2,[0]],['light',2,[0]],['signstack',1,[0]],['gate',1,[0]]],
  sunrise:[['pole',3,[0]],['tree',2,[0,3]],['autumn',1,[0]],['bush',2,[0,2]],['billboard',1,[0]],['gas',1,[0]],['watertower',1,[0]],['diner',1,[0]],['blossom',2,[0]],['windmill',1,[0]],['gate',1,[0]],['toll',1,[0]],['busstop',1,[0]],['donut',1,[0]]] };
function mixPick(h){ var M=MIX[S.r.scen]||MIX.forest, n=0, i, k; for(i=0;i<M.length;i++) n+=M[i][1]; k=h%n; for(i=0;i<M.length;i++){ if(k<M[i][1]) break; k-=M[i][1]; } return { name:M[i][0], vr:M[i][2][(h>>3)%M[i][2].length], sc:FIXSZ[M[i][0]]?0.9+((h>>5)%3)*0.08:M[i][0]==='bush'||M[i][0]==='boulder'?0.9+((h>>5)%4)*0.2:0.78+((h>>5)%6)*0.11, flip:(h>>9)&1 }; }
function prop(name,vr){ var A=window.SRPROPS, P=A&&A[name], scen=S.r.scen, key=scen+name+(vr||0), im, s, c, t, pv; if(!P) return null; if(PROP[key]) return PROP[key]; im=PRIMG[name]; if(!im){ im=PRIMG[name]=new Image(); im.src=P.u; } if(!im.complete||!im.naturalWidth) return null;
  s=document.createElement('canvas'); s.width=im.naturalWidth; s.height=im.naturalHeight; c=s.getContext('2d'); c.drawImage(im,0,0); pv=(PVAR[name]||[])[vr||0]; if(pv) repaint(s,pv.R,pv.V); t=TINT[scen]; if(t){ c.globalCompositeOperation='source-atop'; c.globalAlpha=t[1]; c.fillStyle=t[0]; c.fillRect(0,0,s.width,s.height); }
  if(pv){ var f=document.createElement('canvas'); f.width=s.width; f.height=s.height; f.getContext('2d').drawImage(s,0,0); s=f; }   /* a canvas that was read back draws slowly, so hand out a fresh copy */
  s.lw=P.w; s.lh=P.h; PROP[key]=s; return s; }
function side(kind,v){ var key=S.r.scen+kind+v; if(SIDE[key]) return SIDE[key]; var T=SCN[S.r.scen], s=document.createElement('canvas'), c, w=120, h=200; if(kind==='block'){ w=200; h=300+v*60; } s.width=w; s.height=h; c=s.getContext('2d'); var m=w/2, i, j;
  if(kind==='tree'){ c.fillStyle='#3A2418'; c.fillRect(m-7,h-70,14,70); c.fillStyle=T.a; c.beginPath(); c.arc(m,h-110,56,0,6.28); c.fill(); c.fillStyle=T.b; c.beginPath(); c.arc(m-12,h-124,38,0,6.28); c.fill(); c.fillStyle=T.c; c.beginPath(); c.arc(m-22,h-136,16,0,6.28); c.fill(); }
  else if(kind==='pine'){ c.fillStyle='#3A2418'; c.fillRect(m-6,h-34,12,34); for(i=0;i<3;i++){ c.fillStyle=T.a; c.beginPath(); c.moveTo(m-54+i*10,h-30-i*46); c.lineTo(m,h-110-i*40); c.lineTo(m+54-i*10,h-30-i*46); c.fill(); c.fillStyle=T.b; c.beginPath(); c.moveTo(m-20+i*3,h-84-i*42); c.lineTo(m,h-110-i*40); c.lineTo(m+20-i*3,h-84-i*42); c.lineTo(m+6,h-78-i*42); c.lineTo(m-8,h-88-i*42); c.fill(); } }
  else if(kind==='cactus'){ c.fillStyle=T.a; rr(c,m-13,h-150,26,150,13); c.fill(); rr(c,m-46,h-104,18,50,9); c.fill(); c.fillRect(m-46,h-70,40,16); rr(c,m+28,h-128,18,58,9); c.fill(); c.fillRect(m+6,h-88,40,16); c.fillStyle='#49B88A'; rr(c,m-8,h-144,7,120,3); c.fill(); }
  else if(kind==='palm'){ c.strokeStyle='#5A3A2A'; c.lineWidth=11; c.beginPath(); c.moveTo(m+10,h); c.quadraticCurveTo(m-14,h-90,m,h-160); c.stroke(); c.fillStyle='#1F6B52'; for(i=0;i<6;i++){ var an=-2.9+i*0.55; c.beginPath(); c.ellipse(m+Math.cos(an)*30,h-160+Math.sin(an)*18+12,34,10,an*0.6,0,6.28); c.fill(); } c.fillStyle='#2C8F6B'; for(i=1;i<5;i++){ var a2=-2.9+i*0.55; c.beginPath(); c.ellipse(m+Math.cos(a2)*24,h-164+Math.sin(a2)*14+10,22,5,a2*0.6,0,6.28); c.fill(); } }
  else if(kind==='rock'){ c.fillStyle=T.a; c.beginPath(); c.moveTo(m-56,h); c.lineTo(m-40,h-90-v*30); c.lineTo(m+24,h-104-v*30); c.lineTo(m+56,h); c.fill(); c.fillStyle=T.b; c.beginPath(); c.moveTo(m-40,h-90-v*30); c.lineTo(m+24,h-104-v*30); c.lineTo(m+12,h-50); c.lineTo(m-30,h-40); c.fill(); c.fillStyle=T.c; c.fillRect(m-34,h-84-v*30,50,6); }
  else if(kind==='block'){ c.fillStyle=T.a; c.fillRect(10,0,w-20,h); c.fillStyle='rgba(0,0,0,.25)'; c.fillRect(w-50,0,40,h); c.strokeStyle=v%2?T.c:T.edge; c.lineWidth=4; c.strokeRect(12,2,w-24,h); for(i=0;i<5;i++) for(j=0;j<Math.floor(h/36)-1;j++) if((i*7+j*3+v)%3){ c.fillStyle=(i+j+v)%5===0?T.c:T.b; c.fillRect(26+i*31,18+j*36,16,20); } }
  else { c.fillStyle='#5A3A2A'; c.fillRect(m-4,h-150,8,150); c.fillRect(m-34,h-142,68,7); c.fillStyle=T.c; c.fillRect(m-30,h-136,4,10); c.fillRect(m+26,h-136,4,10); }   /* telephone pole on the open highway */
  SIDE[key]=s; return s; }
/* cars seen from behind: body, cabin and rear window in flat tones */
var REAR={}, PIMG={}, PCAN={}, PTYPE=['sedan','hatch','pickup','suv','minivan','taxi','muscle','city','camper','haypickup','van','moto','super','lowrider','tuner','hotrod','caddy','limo','monster','buggy','sportbike','rally','charger','wsuv','icecream','taco','armored','news','pizza','sedan','hatch','suv','taxi','minivan'], PBIG=['truck','bus','tanker','tow','fire','ambulance','garbage','schoolbus','mixer','rv'], PFRONT=['sedan','hatch','pickup','suv'], DW={sportbike:24,pizza:26,monster:58,fire:58,garbage:58,schoolbus:56,mixer:56,rv:56,ambulance:54,icecream:52,taco:56,armored:52,news:52,limo:52,city:44,bus:58,truck:54,tanker:54,tow:54,van:52};
/* painted cars (cars.js, cut from the approved sheet): each gets a soft ground shadow once. Until a picture has loaded, the code-drawn car below stands in. */
/* repaint: every pixel whose hue, saturation and lightness fall in a range gets a new hue (and saturation / lightness scale). One painted car or tree becomes many. */
function repaint(s,R,V){ var c=s.getContext('2d'), d, p, i, r, g, b, mx, mn, l, sa, h, q, t; try{ d=c.getImageData(0,0,s.width,s.height); }catch(e){ return; } p=d.data;
  function hue(t){ t=(t%1+1)%1; return t<1/6?mn+(mx-mn)*6*t:t<0.5?mx:t<2/3?mn+(mx-mn)*(2/3-t)*6:mn; }
  for(i=0;i<p.length;i+=4){ if(p[i+3]<8) continue; r=p[i]/255; g=p[i+1]/255; b=p[i+2]/255; mx=Math.max(r,g,b); mn=Math.min(r,g,b); l=(mx+mn)/2; if(mx===mn){ h=0; sa=0; } else { q=mx-mn; sa=l>0.5?q/(2-mx-mn):q/(mx+mn); h=mx===r?((g-b)/q+(g<b?6:0)):mx===g?(b-r)/q+2:(r-g)/q+4; h*=60; }
    if((R[0]<=R[1]?(h<R[0]||h>R[1]):(h<R[0]&&h>R[1]))||sa<R[2]||sa>R[3]||l<R[4]||l>R[5]) continue;
    h=(V.h==null?h+(V.dh||0):V.h)/360; sa=Math.min(1,sa*(V.s==null?1:V.s)); l=Math.min(0.97,l*(V.l==null?1:V.l)); mx=l<0.5?l*(1+sa):l+sa-l*sa; mn=2*l-mx; p[i]=hue(h+1/3)*255; p[i+1]=hue(h)*255; p[i+2]=hue(h-1/3)*255; }
  c.putImageData(d,0,0); }
var CARBODY={ sedan:[198,222,0.25,0.72,0.3,0.78], hatch:[338,12,0.45,1,0.12,0.8], pickup:[166,196,0.35,1,0.1,0.62], suv:[88,132,0.25,0.85,0.06,0.55], truck:[0,360,0,0.16,0.78,1], van:[0,360,0,0.16,0.78,1], muscle:[14,42,0.5,1,0.2,0.75], city:[186,214,0.4,1,0.3,0.8], bus:[345,12,0.45,1,0.12,0.8], haypickup:[166,196,0.35,1,0.1,0.62] },
    CARCOL=[ null, {h:2,s:1.15}, {h:26,s:1.2}, {h:46,s:1.25,l:1.08}, {h:128,s:0.9}, {h:215,s:0.1,l:1.5}, {h:232,s:0.25,l:0.5}, {h:328,s:1.1} ], BOXCOL=[ null, null, null, {h:46,s:6,l:0.9}, {h:190,s:6,l:0.9}, {h:330,s:6,l:0.92}, null, {h:130,s:5,l:0.9} ];
function painted(name,vr){ var A=window.SRCARS, im, key=name+'#'+(vr||0); if(!A||!A[name]) return null; if(PCAN[key]) return PCAN[key]; im=PIMG[name]; if(!im){ im=PIMG[name]=new Image(); im.src=A[name]; } if(!im.complete||!im.naturalWidth) return null;
  var s=document.createElement('canvas'), c, t=document.createElement('canvas'), base=name.replace('_f',''), V=base==='truck'||base==='van'?BOXCOL[vr||0]:CARCOL[vr||0]; t.width=im.naturalWidth; t.height=im.naturalHeight; t.getContext('2d').drawImage(im,0,0); if(V&&CARBODY[base]) repaint(t,CARBODY[base],V);
  s.width=t.width+12; s.height=t.height+8; c=s.getContext('2d'); c.fillStyle='rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(s.width/2,s.height-9,s.width/2-2,9,0,0,6.28); c.fill(); c.drawImage(t,6,0); s.dw=DW[base]||0; PCAN[key]=s; return s; }
function rear(kind,col,o){ var pn=kind==='me'?(myCar.sp||'me_'+myCar.id):kind==='truck'?PBIG[o?o.pk%PBIG.length:0]:kind==='cop'?'cop':kind==='front'?PFRONT[o?o.pk%4:0]+'_f':PTYPE[o?o.pk%PTYPE.length:0], pi=painted(pn,o&&kind!=='me'&&kind!=='cop'?o.pc:0); if(pi) return pi;
  var key=kind+col; if(REAR[key]) return REAR[key]; var s=document.createElement('canvas'), tr=kind==='truck', fr=kind==='front'; s.width=156; s.height=tr?200:126; var c=s.getContext('2d'), h=s.height, m=78;
  c.fillStyle='rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(m,h-8,72,9,0,0,6.28); c.fill();
  c.fillStyle='#0A0A12'; rr(c,8,h-40,26,34,6); c.fill(); rr(c,122,h-40,26,34,6); c.fill();
  if(tr){ c.fillStyle='#0B0718'; rr(c,10,4,136,h-22,8); c.fill(); c.fillStyle='#D8DDEA'; rr(c,15,9,126,h-56,5); c.fill(); c.fillStyle='#B4BBD0'; c.fillRect(76,9,4,h-56); c.fillRect(15,h-70,126,6); c.fillStyle=col; rr(c,15,h-48,126,24,4); c.fill(); c.fillStyle='#FF4B4B'; c.fillRect(20,h-44,22,12); c.fillRect(114,h-44,22,12); }
  else { var body=kind==='cop'?'#F1F4FA':col;
    c.fillStyle='#0B0718'; rr(c,6,h-86,144,70,14); c.fill(); c.beginPath(); c.moveTo(30,h-80); c.lineTo(44,h-122); c.lineTo(112,h-122); c.lineTo(126,h-80); c.fill();
    c.fillStyle=body; c.beginPath(); c.moveTo(35,h-82); c.lineTo(47,h-117); c.lineTo(109,h-117); c.lineTo(121,h-82); c.fill();
    c.fillStyle='#8FD0FF'; c.beginPath(); c.moveTo(43,h-84); c.lineTo(52,h-110); c.lineTo(104,h-110); c.lineTo(113,h-84); c.fill(); c.fillStyle='rgba(255,255,255,.35)'; c.beginPath(); c.moveTo(52,h-110); c.lineTo(70,h-110); c.lineTo(58,h-84); c.lineTo(43,h-84); c.fill();
    c.fillStyle=body; rr(c,11,h-82,134,60,10); c.fill(); c.fillStyle='rgba(11,7,24,.22)'; rr(c,11,h-46,134,24,8); c.fill();
    if(kind==='me'){ c.fillStyle=col==='#F4F4FA'?'#FF3DB4':'#FFFFFF'; c.fillRect(60,h-117,12,8); c.fillRect(84,h-117,12,8); c.fillRect(60,h-82,12,36); c.fillRect(84,h-82,12,36); c.fillStyle='#0B0718'; rr(c,2,h-96,152,10,4); c.fill(); c.fillRect(22,h-90,8,12); c.fillRect(126,h-90,8,12); }
    if(kind==='cop'){ c.fillStyle='#14161C'; c.fillRect(11,h-64,134,16); c.fillStyle='#FF4B4B'; rr(c,52,h-130,24,10,3); c.fill(); c.fillStyle='#5C8BFF'; rr(c,80,h-130,24,10,3); c.fill(); }
    if(fr){ c.fillStyle='#FFF4C2'; rr(c,15,h-78,34,17,6); c.fill(); rr(c,107,h-78,34,17,6); c.fill(); c.fillStyle='#FFFFFF'; c.fillRect(20,h-74,16,6); c.fillRect(112,h-74,16,6); c.fillStyle='#0B0718'; rr(c,54,h-74,48,22,4); c.fill(); c.fillStyle='#3A3360'; for(var gi=0;gi<4;gi++) c.fillRect(58,h-70+gi*5,40,2); }
    else { c.fillStyle='#FF4B4B'; rr(c,16,h-76,30,13,4); c.fill(); rr(c,110,h-76,30,13,4); c.fill(); c.fillStyle='#FFB0B0'; c.fillRect(20,h-73,12,4); c.fillRect(114,h-73,12,4);
    c.fillStyle='#0B0718'; rr(c,56,h-44,44,14,3); c.fill(); c.fillStyle='#E8E8F0'; c.fillRect(62,h-41,32,8); } }
  REAR[key]=s; return s; }
var RBS=null;
function rbCar(){ var pi=painted('cop_side'); if(pi) return pi; if(RBS) return RBS; var s=RBS=document.createElement('canvas'), c; s.width=220; s.height=110; c=s.getContext('2d');
  c.fillStyle='rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(110,102,104,8,0,0,6.28); c.fill();
  c.fillStyle='#0B0718'; rr(c,4,44,212,50,14); c.fill(); c.beginPath(); c.moveTo(50,48); c.lineTo(72,12); c.lineTo(150,12); c.lineTo(176,48); c.fill();
  c.fillStyle='#F1F4FA'; rr(c,9,49,202,40,10); c.fill(); c.beginPath(); c.moveTo(57,50); c.lineTo(75,17); c.lineTo(147,17); c.lineTo(169,50); c.fill();
  c.fillStyle='#14161C'; c.fillRect(70,49,84,40); c.fillStyle='#8FD0FF'; c.beginPath(); c.moveTo(66,48); c.lineTo(79,22); c.lineTo(108,22); c.lineTo(108,48); c.fill(); c.beginPath(); c.moveTo(114,48); c.lineTo(114,22); c.lineTo(144,22); c.lineTo(160,48); c.fill();
  c.fillStyle='#0A0A12'; c.beginPath(); c.arc(50,90,19,0,6.28); c.arc(170,90,19,0,6.28); c.fill(); c.fillStyle='#B4BBD0'; c.beginPath(); c.arc(50,90,8,0,6.28); c.arc(170,90,8,0,6.28); c.fill();
  c.fillStyle='#FFE14D'; c.font='800 17px Inter,sans-serif'; c.textAlign='center'; c.fillText('POLICE',112,76); return s; }
function pX(x,s){ return 480+(x-480-camX)*s; }
function quad(x0,x1,dd0,dd1,col){ var s0=FOC/(dd0+CB), s1=FOC/(dd1+CB); cx.fillStyle=col; cx.beginPath(); cx.moveTo(pX(x0,s0),HZ+HC*s0); cx.lineTo(pX(x1,s0),HZ+HC*s0); cx.lineTo(pX(x1,s1),HZ+HC*s1); cx.lineTo(pX(x0,s1),HZ+HC*s1); cx.closePath(); cx.fill(); }
function drawChase(){ var r=S.r, T=SCN[r.scen], P=CFG.plan[r.n], K=SKY[r.scen], i, k, s, y, o, dd, near=ZN-CB, list=[], RW=NL*LW, nightOn=r.haz.indexOf('night')>=0;
  var pk=REDUCE?0:Math.max(0,1-(gt-J.punch)/0.3); focT=(REDUCE?300:(r.nitro>0?232:300-34*Math.min(1,car.v/CFG.V))-pk*22)*LENS; FOC+=(focT-FOC)*(pk>0?0.3:0.08); camX+=((car.x-480)*0.62-camX)*0.2;
  cx.drawImage(sky(),-120-camX*0.12,0);
  /* ground in bands that slide toward you, then the road, its neon edges and the lane dashes */
  var k0=Math.floor((r.pd+near)/40), k1=Math.floor((r.pd+FAR)/40);
  cx.fillStyle=T.g; cx.fillRect(0,HZ,W,H-HZ);
  for(k=k1;k>=k0;k--){ if(((k>>1)&1)===0) continue; var a=Math.max(near,k*40-r.pd), b=(k+1)*40-r.pd, ya=HZ+HC*FOC/(a+CB), yb=HZ+HC*FOC/(b+CB); cx.fillStyle=T.g2; cx.fillRect(0,yb,W,ya-yb+0.6); }
  quad(RX-16,RX+RW+16,near,FAR,'#0B0718'); quad(RX,RX+RW,near,FAR,'#211D3A');
  for(k=k1;k>=k0;k--){ var a2=Math.max(near,k*40-r.pd), b2=(k+1)*40-r.pd; if(b2<=a2) continue; if(((k>>1)&1)===0) quad(RX,RX+RW,a2,b2,'#272248'); if((k&1)===0) for(i=r.onc?2:1;i<NL;i++) quad(RX+LW*i-2.5,RX+LW*i+2.5,a2,b2,'rgba(236,232,255,.7)'); }
  if(r.onc){ quad(RX+LW-6,RX+LW-2,near,FAR,'#FFD21F'); quad(RX+LW+2,RX+LW+6,near,FAR,'#FFD21F'); }
  quad(RX-11,RX-3,near,FAR,T.edge); quad(RX+RW+3,RX+RW+11,near,FAR,T.edge); quad(RX-8,RX-6,near,FAR,'rgba(255,255,255,.75)'); quad(RX+RW+6,RX+RW+8,near,FAR,'rgba(255,255,255,.75)');
  /* far haze: the road fades into the sky colour at the horizon */
  var hg=cx.createLinearGradient(0,HZ,0,HZ+46); hg.addColorStop(0,K[1]); hg.addColorStop(1,'rgba(0,0,0,0)'); cx.globalAlpha=0.75; cx.fillStyle=hg; cx.fillRect(0,HZ,W,46); cx.globalAlpha=1;
  /* flat things painted on the road: hazards, roadworks lane, the flag line */
  for(i=0;i<patches.length;i++){ var p=patches[i], d0=Math.max(near,p.d-r.pd), d1=p.d+p.len-r.pd, x0=RX+LW*p.l0, x1=RX+LW*(p.l1+1); if(d1<=near||d0>FAR||p.hit&&p.type!=='ice'&&p.type!=='sand') continue;
    if(p.type==='ice'){ quad(x0+5,x1-5,d0,d1,'rgba(170,226,255,.6)'); quad(x0+18,x0+24,d0,d1,'rgba(255,255,255,.7)'); }
    else if(p.type==='sand'){ quad(x0+4,x1-4,d0,d1,'#D9A866'); quad(x0+20,x1-40,d0+(d1-d0)*0.3,d0+(d1-d0)*0.45,'#B98548'); }
    else if(p.type==='oil'){ quad(x0+16,x1-16,d0,d1,'#07050F'); quad(x0+10,x1-10,d0+(d1-d0)*0.25,d0+(d1-d0)*0.75,'#07050F'); quad(x0+24,x0+38,d0+(d1-d0)*0.4,d0+(d1-d0)*0.6,'rgba(175,120,255,.75)'); }
    else if(p.type==='ramp'){ if(d0>near+4) list.push({dd:p.d-r.pd,k:'ramp',x:(x0+x1)/2,v:Math.floor(p.d)%2}); }
    else if(p.type==='pad'){ if(d0>near+4){ if(prop('boostpad')) list.push({dd:p.d-r.pd,k:'pad',x:(x0+x1)/2}); else quad(x0+8,x1-8,d0,d1,'rgba(61,224,255,.85)'); } }
    else if(p.type==='shield') list.push({dd:p.d+p.len/2-r.pd,k:'shield',x:(x0+x1)/2}); }
  for(i=0;i<works.length;i++){ var w=works[i], lx=laneX(w.lane), wd0=w.d0-r.pd, wd1=w.d1-r.pd, dir=w.lane===0?1:-1; if(wd1<near||wd0-480>FAR) continue;
    if(w.rb){ if(wd0>near+10&&wd0<FAR){ list.push({dd:wd0,k:'rb',x:lx,ph:w.lane}); if(w.lane===(w.gap===0?1:0)){ var gx=laneX(w.gap); for(var q2=0;q2<4;q2++){ var gd=wd0-90-q2*150; if(gd>near+10) { quad(gx-6,gx+6,gd,gd+50,'rgba(61,255,176,.9)'); var sA=FOC/(gd+50+CB), sB=FOC/(gd+90+CB); cx.beginPath(); cx.moveTo(pX(gx-20,sA),HZ+HC*sA); cx.lineTo(pX(gx+20,sA),HZ+HC*sA); cx.lineTo(pX(gx,sB),HZ+HC*sB); cx.closePath(); cx.fill(); } } } } continue; }
    for(var q=1;q<=3;q++){ var ad=wd0-q*140; if(ad>near+20&&ad<FAR){ quad(lx-6,lx+6,ad,ad+50,'rgba(255,225,77,.9)'); quad(lx+dir*2,lx+dir*26,ad+38,ad+56,'rgba(255,225,77,.9)'); } }
    if(wd1>near) quad(lx-LW/2+3,lx+LW/2-3,Math.max(near,wd0),Math.min(FAR,wd1),'rgba(11,7,24,.6)');
    if(wd0>near&&wd0<FAR) list.push({dd:wd0,k:'bar',x:lx,v:Math.floor(w.d0)%2});
    for(var cd=Math.max(wd0+60,near+30);cd<Math.min(wd1,FAR);cd+=90) list.push({dd:cd,k:'cone',x:lx+dir*(LW/2-7)}); }
  dd=r.L-r.pd; if(dd>near&&dd<FAR){ for(i=0;i<16;i++) for(k=0;k<2;k++) quad(RX+i*19,RX+i*19+19,Math.max(near,dd-19+k*19),dd+k*19,(i+k)%2?'#0B0718':'#F6F6F8'); list.push({dd:dd,k:'gate'}); }
  /* my headlights on the road */
  cx.globalAlpha=0.13; quad(car.x-34,car.x+34,20,70,'#FFF4C2'); quad(car.x-52,car.x+52,70,300,'#FFF4C2'); cx.globalAlpha=1;
  /* headlights only: the road past the beams goes dark, and far things fade in as they reach the light */
  if(nightOn){ var nb=HC*FOC/(330+CB), ng=cx.createLinearGradient(0,HZ,0,HZ+nb+40); ng.addColorStop(0,'rgba(4,3,14,.94)'); ng.addColorStop(0.7,'rgba(4,3,14,.88)'); ng.addColorStop(1,'rgba(4,3,14,0)'); cx.fillStyle=ng; cx.fillRect(0,HZ,W,nb+40); }
  /* standing things, far to near: roadside, stars, traffic */
  var j0=Math.floor((r.pd+near+40)/SIDEGAP), j1=Math.floor((r.pd+FAR)/SIDEGAP), kinds={tree:'tree',cactus:'cactus',block:'block',pine:'pine',palm:'palm',rock:'rock',grass:'pole'};
  for(k=j1;k>=j0;k--){ var hsh=(k*2654435761>>>0)%97, h2=Math.imul(k+r.n*131,2246822519)>>>0, base=T.deco==='palm'?'rock':kinds[T.deco];
    list.push({dd:k*SIDEGAP-r.pd,k:'side',x:RX-74-(hsh%3)*30,v:hsh%3,kind:base,sd:0,m:h2>>>3}); list.push({dd:k*SIDEGAP-r.pd+60,k:'side',x:RX+RW+74+((hsh>>2)%3)*30,v:(hsh>>1)%3,kind:kinds[T.deco],sd:1,m:h2>>>7});
    if(T.deco!=='grass'&&k%2===0){ list.push({dd:k*SIDEGAP-r.pd+30,k:'side',x:RX-270-(hsh%5)*24,v:(hsh+1)%3,kind:base,m:h2>>>11}); list.push({dd:k*SIDEGAP-r.pd+100,k:'side',x:RX+RW+270+(hsh%4)*28,v:(hsh+2)%3,kind:kinds[T.deco],m:h2>>>15}); } }
  for(i=0;i<stars.length;i++){ dd=stars[i].d-r.pd; if(dd>near+10&&dd<FAR) list.push({dd:dd,k:'star',o:stars[i]}); }
  for(i=0;i<traffic.length;i++){ o=traffic[i]; dd=o.d-o.len/2-r.pd; if(dd>near+6&&dd<FAR) list.push({dd:dd,k:'car',o:o}); }
  list.sort(function(u,v){ return v.dd-u.dd; });
  function items(behind){ for(i=0;i<list.length;i++){ var it=list[i]; if((it.dd<-6)!==behind) continue; s=FOC/(it.dd+CB); y=HZ+HC*s; var X=pX(it.x||0,s), fade=Math.min(1,(FAR-it.dd)/260); if(nightOn) fade=Math.max(it.k==='side'?0.12:0,Math.min(fade,(470-it.dd)/150));
    if(it.k==='side'){ if(it.kind==='rock'&&T.deco==='palm'&&it.sd===0) continue; var mp=mixPick(it.m), im=prop(mp.name,mp.vr), k2=im?mp.sc:1; if(!im) im=side(it.kind,it.v); var sw=(im.lw||im.width)*0.72*s*k2, sh=(im.lh||im.height)*0.72*s*k2; if(im.lw&&sw>88*s) X+=(it.x<480?-1:1)*(sw/2-44*s); if(X+sw<0||X-sw>W) continue; cx.globalAlpha=fade; if(im.lw&&mp.flip&&!FIXSZ[mp.name]){ cx.save(); cx.translate(X,0); cx.scale(-1,1); cx.drawImage(im,-sw/2,y-sh,sw,sh); cx.restore(); } else cx.drawImage(im,X-sw/2,y-sh,sw,sh); cx.globalAlpha=1; }
    else if(it.k==='star'){ var st=it.o, X2=pX(st.x,s), rad=(st.gold?17:13)*s; if(st.gold) cx.drawImage(glow('rgba(255,225,77,.55)'),X2-rad*2,y-rad*3.2,rad*4,rad*4); cx.save(); cx.translate(X2,y-rad*1.2-Math.sin(gt*4+st.d)*3*s); cx.scale(s,s); drawStar(0,0,st.gold?17:13,st.gold?'#FFE14D':'#FFF8D6'); cx.restore(); }
    else if(it.k==='car'){ o=it.o; var cim=rear(o.truck?'truck':o.on?'front':'traffic',o.col,o), cw=(cim.dw||(o.truck?54:50))*s, chh=cw*cim.height/cim.width, X3=pX(o.x,s); cx.globalAlpha=fade;
      if(o.out){ cx.save(); cx.translate(X3,y-chh/2); cx.rotate(o.rot); cx.drawImage(cim,-cw/2,-chh/2,cw,chh); cx.restore(); } else { cx.drawImage(cim,X3-cw/2,y-chh+3*s,cw,chh); cx.drawImage(glow(o.on?'rgba(255,244,194,.5)':'rgba(255,60,60,.45)'),X3-cw*0.62,y-chh*0.9,cw*1.24,chh*1.1); } cx.globalAlpha=1; }
    else if(it.k==='bar'&&prop('barrier')){ var bi=it.v&&prop('barrels')||prop('barrier'), bw2=(LW-6)*s, bh2=bw2*bi.height/bi.width; cx.drawImage(bi,X-bw2/2,y-bh2+2*s,bw2,bh2); }
    else if(it.k==='ramp'){ var rpi=prop(it.v?'ramp_fire':'ramp')||prop('ramp'), rw2=(LW-4)*s; if(rpi){ var rh3=rw2*rpi.height/rpi.width; cx.drawImage(rpi,X-rw2/2,y-rh3+2*s,rw2,rh3); }
      else { var s9=FOC/(it.dd+70+CB), yb=HZ+HC*s9, Xb=pX(it.x,s9), wb2=(LW-8)*s9, lift=34*s9; cx.fillStyle='#0B0718'; cx.beginPath(); cx.moveTo(X-rw2/2-3*s,y+2*s); cx.lineTo(X+rw2/2+3*s,y+2*s); cx.lineTo(Xb+wb2/2+3*s9,yb-lift-3*s9); cx.lineTo(Xb-wb2/2-3*s9,yb-lift-3*s9); cx.closePath(); cx.fill();
        cx.fillStyle='#FFB23D'; cx.beginPath(); cx.moveTo(X-rw2/2,y); cx.lineTo(X+rw2/2,y); cx.lineTo(Xb+wb2/2,yb-lift); cx.lineTo(Xb-wb2/2,yb-lift); cx.closePath(); cx.fill();
        cx.fillStyle='#0B0718'; for(k=0;k<3;k++){ var f0=0.16+k*0.28, ys=y+(yb-lift-y)*f0, ws=rw2+(wb2-rw2)*f0, xs=X+(Xb-X)*f0, hh=(y-(yb-lift))*0.13; cx.beginPath(); cx.moveTo(xs-ws*0.3,ys); cx.lineTo(xs,ys-hh*1.6); cx.lineTo(xs+ws*0.3,ys); cx.lineTo(xs+ws*0.3,ys-hh); cx.lineTo(xs,ys-hh*2.6); cx.lineTo(xs-ws*0.3,ys-hh); cx.closePath(); cx.fill(); } } }
    else if(it.k==='pad'){ var pdi=prop('boostpad'), pw2=(LW-10)*s, ph2=pw2*pdi.height/pdi.width*0.62; if(!REDUCE) cx.drawImage(glow('rgba(61,224,255,.5)'),X-pw2*0.7,y-ph2*1.5,pw2*1.4,ph2*2); cx.drawImage(pdi,X-pw2/2,y-ph2+3*s,pw2,ph2); }
    else if(it.k==='cone'&&prop('cone')){ var ci=prop('cone'), ch2=24*s, cw2=ch2*ci.width/ci.height; cx.drawImage(ci,X-cw2/2,y-ch2+1.5*s,cw2,ch2); }
    else if(it.k==='bar'){ var bw=(LW-8)*s, bh=26*s; cx.fillStyle='#0B0718'; cx.fillRect(X-bw/2-2,y-bh-2,bw+4,bh+2); cx.fillStyle='#FFB23D'; cx.fillRect(X-bw/2,y-bh,bw,bh*0.55); cx.fillStyle='#0B0718'; for(k=0;k<4;k++) cx.fillRect(X-bw/2+bw*(0.06+k*0.25),y-bh,bw*0.1,bh*0.55); cx.fillRect(X-bw/2+2*s,y-bh*0.45,4*s,bh*0.45); cx.fillRect(X+bw/2-6*s,y-bh*0.45,4*s,bh*0.45); }
    else if(it.k==='rb'){ var rim=rbCar(), rw=(LW+10)*s, rh=rw*rim.height/rim.width, fl=(Math.floor(gt*2)+it.ph)%2; cx.globalAlpha=Math.min(1,fade*1.5); cx.drawImage(rim,X-rw/2,y-rh+2*s,rw,rh); cx.drawImage(glow(fl?'rgba(255,60,60,.85)':'rgba(70,120,255,.85)'),X-rw*0.3,y-rh*1.45,rw*0.6,rw*0.6); cx.fillStyle=fl?'#FF4B4B':'#5C8BFF'; cx.fillRect(X-rw*0.09,y-rh*0.98,rw*0.18,rh*0.1); cx.globalAlpha=1; }
    else if(it.k==='cone'){ cx.fillStyle='#FF7A3D'; cx.beginPath(); cx.moveTo(X-6*s,y); cx.lineTo(X,y-18*s); cx.lineTo(X+6*s,y); cx.fill(); cx.fillStyle='#fff'; cx.fillRect(X-3*s,y-10*s,6*s,3*s); }
    else if(it.k==='shield'){ var sr=16*s; cx.drawImage(glow('rgba(61,224,255,.6)'),X-sr*2,y-sr*3.4,sr*4,sr*4); cx.fillStyle='#3DE0FF'; cx.strokeStyle='#0B0718'; cx.lineWidth=2.5*s; cx.beginPath(); cx.moveTo(X,y-sr*2.5); cx.lineTo(X+sr,y-sr*2.1); cx.lineTo(X+sr*0.8,y-sr*0.9); cx.lineTo(X,y-sr*0.3); cx.lineTo(X-sr*0.8,y-sr*0.9); cx.lineTo(X-sr,y-sr*2.1); cx.closePath(); cx.fill(); cx.stroke(); }
    else if(it.k==='gate'&&prop('arch')){ var ai=prop('arch'), al=pX(RX-80,s), ar=pX(RX+RW+80,s), ah=(ar-al)*0.78; cx.drawImage(ai,al,y-ah+4*s,ar-al,ah); if(s>0.42){ cx.fillStyle='#fff'; cx.font='400 '+Math.round(22*s)+'px '+WF; cx.textAlign='center'; cx.fillText(P.cop?'STATE LINE':'FLAG '+(r.n+1),(al+ar)/2,y-ah+ah*0.155); } }
    else if(it.k==='gate'){ var gl=pX(RX-22,s), gr=pX(RX+RW+22,s), gh=150*s, th=30*s; cx.fillStyle='#0B0718'; cx.fillRect(gl-5*s,y-gh,10*s,gh); cx.fillRect(gr-5*s,y-gh,10*s,gh); cx.fillRect(gl-5*s,y-gh,gr-gl+10*s,th); cx.fillStyle=P.cop?'#FFE14D':T.edge; cx.fillRect(gl,y-gh+3*s,gr-gl,th-6*s);
      if(s>0.5){ cx.fillStyle='#0B0718'; cx.font='400 '+Math.round(20*s)+'px '+WF; cx.textAlign='center'; cx.fillText(P.cop?'STATE LINE':'FLAG '+(r.n+1),(gl+gr)/2,y-gh+th*0.74); } } } }
  items(false);
  if(P.cop&&!REDUCE){ cx.globalAlpha=0.07; cx.fillStyle=Math.floor(gt*2)%2?'#FF4B4B':'#5C8BFF'; cx.fillRect(0,0,W,H); cx.globalAlpha=1; }
  /* my car: nitro flames, the car (it leans into lane changes), the shield, sparks */
  s=FOC/CB; y=HZ+HC*s; var mx=pX(car.x,s), mim=rear('me',myCar.c), mw=(mim.dw||52)*s, mh=mw*mim.height/mim.width, tilt=Math.max(-0.07,Math.min(0.07,(laneX(r.lane)-car.x)*0.003+(car.vx||0)*0.0003)), airK=r.air>0?Math.sin(Math.PI*(1-r.air/CFG.air)):0, blink=gt<inv&&!(r.air>0)&&Math.floor(gt*8)%2;
  if(airK>0){ cx.fillStyle='rgba(0,0,0,.35)'; cx.beginPath(); cx.ellipse(mx,y-2,mw*0.46*(1-airK*0.3),9*(1-airK*0.3),0,0,6.28); cx.fill(); y-=airK*78; }
  if(r.nitro>0){ cx.drawImage(glow('rgba(61,224,255,.85)'),mx-mw*0.42,y-mh*0.42,mw*0.4,mh*0.5+Math.random()*14); cx.drawImage(glow('rgba(61,224,255,.85)'),mx+mw*0.02,y-mh*0.42,mw*0.4,mh*0.5+Math.random()*14); }
  cx.save(); cx.translate(mx,y+4); cx.rotate(tilt+(r.stall>0?Math.sin(gt*30)*0.12:0)); if(blink) cx.globalAlpha=0.45; var sq=REDUCE?0:Math.max(0,1-(gt-J.squat)/0.2), bob=REDUCE||S.phase!=='drive'?0:Math.sin(gt*34)*0.9*Math.min(1,car.v/CFG.V); cx.scale((1+sq*0.07)*(1+airK*0.1),(1-sq*0.09)*(1+airK*0.1)); cx.drawImage(mim,-mw/2,-mh+bob,mw,mh); cx.restore(); if(airK>0) y+=airK*78;
  var sKeep=s, yKeep=y; items(true); s=sKeep; y=yKeep;   /* anything you have passed is closer to the camera than your car */
  var wh=(gt-J.whoosh)/0.28; if(wh>=0&&wh<1&&!REDUCE){ var wx=pX(J.whooshX,s), wdir=J.whooshX<car.x?-1:1; cx.globalAlpha=0.55*(1-wh); cx.fillStyle='#FFFFFF'; for(i=0;i<3;i++) cx.fillRect(wx-18+i*18*wdir,y-mh*(0.25+i*0.22)+wh*120,6,90+i*20); cx.globalAlpha=1; }
  if(S.shield){ cx.strokeStyle='#3DE0FF'; cx.lineWidth=4; cx.beginPath(); cx.ellipse(mx,y-mh*0.45,mw*0.62,mh*0.62,0,0,6.28); cx.stroke(); }
  for(i=0;i<parts.length;i++){ var pt=parts[i], ps=FOC/(Math.max(near+4,pt.d-r.pd)+CB); cx.globalAlpha=Math.min(1,pt.t*4); cx.fillStyle=pt.c; var pz2=Math.max(3,2.6*ps); cx.fillRect(pX(pt.x,ps)-pz2/2,HZ+(HC-18)*ps-pz2/2,pz2,pz2); } cx.globalAlpha=1;
  /* speed streaks from the vanishing point on nitro */
  if(!REDUCE&&S.phase==='drive'&&r.nitro>0){ cx.strokeStyle='rgba(255,255,255,.35)'; cx.lineWidth=2; for(i=0;i<16;i++){ var an=i*0.3927+0.2, t0=((gt*2.2+i*0.37)%1), r0=120+t0*420; cx.beginPath(); cx.moveTo(480+Math.cos(an)*r0,HZ+Math.sin(an)*r0*0.7); cx.lineTo(480+Math.cos(an)*(r0+70),HZ+Math.sin(an)*(r0+70)*0.7); cx.stroke(); } }
  /* the police ride in the rear-view mirror: the closer they are, the bigger they get */
  var c=S.cop; if(c){ var mk=1-Math.max(0,Math.min(1,c.gap/CFG.copMax)), mxx=292, my=60, on=Math.floor(gt*2)%2, cs=0.35+mk*0.75; cx.fillStyle='#0B0718'; rr(cx,mxx-104,my-36,208,72,16); cx.fill(); cx.fillStyle='#1B1838'; rr(cx,mxx-98,my-30,196,60,12); cx.fill();
    cx.save(); cx.beginPath(); rr(cx,mxx-98,my-30,196,60,12); cx.clip(); cx.fillStyle='#2A2450'; cx.fillRect(mxx-98,my+4,196,30); cx.translate(mxx,my+12); cx.scale(cs,cs);
    cx.drawImage(glow(on?'rgba(255,60,60,.8)':'rgba(70,120,255,.8)'),-58,-62,60,60); cx.drawImage(glow(on?'rgba(70,120,255,.8)':'rgba(255,60,60,.8)'),-2,-62,60,60);
    cx.fillStyle='#0B0718'; rr(cx,-36,-30,72,50,8); cx.fill(); cx.fillStyle='#F1F4FA'; rr(cx,-33,-10,66,27,6); cx.fill(); cx.fillStyle='#14161C'; cx.fillRect(-33,2,66,8); cx.fillStyle='#8FD0FF'; rr(cx,-25,-27,50,17,4); cx.fill(); cx.fillStyle='#FFF4C2'; cx.fillRect(-30,-6,12,6); cx.fillRect(18,-6,12,6);
    cx.fillStyle=on?'#FF4B4B':'#5C8BFF'; cx.fillRect(-16,-35,15,7); cx.fillStyle=on?'#5C8BFF':'#FF4B4B'; cx.fillRect(1,-35,15,7); cx.restore(); txt(c.gap<70?'Right behind you!':'Police',mxx,my+54,'800 15px '+IF,c.gap<70?'#FF7A7A':'#C6B8F0');
    /* right behind you: the police car pulls up alongside from the bottom of the screen */
    var near2=Math.max(0,1-c.gap/95), ramK=Math.max(0,1-(gt-J.ram)/0.35); if(near2>0||ramK>0){ var pim=rear('cop',''), sd2=r.lane>=NL-1?-1:1, ps2=s*1.18, pw=52*ps2, ph2=pw*pim.height/pim.width, px2=pX(car.x+sd2*(LW+8)*(1-ramK*0.5),s), py2=y+70+(1-Math.max(near2,ramK))*230;
      cx.drawImage(glow(on?'rgba(255,60,60,.8)':'rgba(70,120,255,.8)'),px2-pw*0.5,py2-ph2*1.25,pw,pw*0.7); cx.drawImage(pim,px2-pw/2,py2-ph2,pw,ph2); } }
  /* nitro: cool blue edges; top gear: thin wind streaks */
  if(r.nitro>0&&S.phase==='drive'){ var vg=cx.createRadialGradient(480,300,260,480,300,560); vg.addColorStop(0,'rgba(61,224,255,0)'); vg.addColorStop(1,'rgba(61,224,255,.22)'); cx.fillStyle=vg; cx.fillRect(0,0,W,H); }
  else if(!REDUCE&&S.phase==='drive'&&car.v>CFG.V*0.6){ var sk=Math.min(1,(car.v/CFG.V-0.6)/0.4), nS=6+Math.round(sk*12); cx.strokeStyle='rgba(255,255,255,'+(0.1+sk*0.2).toFixed(2)+')'; cx.lineWidth=2+sk; for(i=0;i<nS;i++){ var an5=i*6.283/nS+0.4, t5=((gt*(1.4+sk)+i*0.41)%1), r5=190+t5*400; cx.beginPath(); cx.moveTo(480+Math.cos(an5)*r5,HZ+Math.sin(an5)*r5*0.7); cx.lineTo(480+Math.cos(an5)*(r5+46+sk*50),HZ+Math.sin(an5)*(r5+46+sk*50)*0.7); cx.stroke(); }
    if(sk>0.7){ var vg5=cx.createRadialGradient(480,300,300,480,300,580); vg5.addColorStop(0,'rgba(11,7,24,0)'); vg5.addColorStop(1,'rgba(11,7,24,'+((sk-0.7)*1.1).toFixed(2)+')'); cx.fillStyle=vg5; cx.fillRect(0,0,W,H); } }
  if(r.cc>=2&&S.phase==='drive') txt('×'+Math.min(r.cc,5)+' combo',mx+(r.lane>=NL-1?-150:150),y-mh*0.7,'400 28px '+WF,r.cc>=5?'#FFE14D':'#3DFFB0');
  bar(); if(S.phase==='lights') lamp(); }

function clock(s){ s=Math.max(0,Math.ceil(s)); return Math.floor(s/60)+':'+('0'+(s%60)).slice(-2); }
function hudSet(){ if(!S||!S.started||!S.r) return; var r=S.r, m=mult(), nx=RK.multNext(S.streak), g=GOALS[r.goal], np=CFG.plan.length;
  hud.set({ time:clock(S.left), score:S.score, flag:{ f:r.pd/r.L, text:(r.n+1)+' of '+np+': '+SCN[r.scen].nm }, cop:S.cop?{ f:S.cop.gap/CFG.copMax, text:S.cop.gap<70?'Right behind you!':'Stay ahead' }:0,
    streak:m>1?S.streak+' right = ×'+m+' points':nx?nx.more+' more right for ×'+nx.mult:'',
    goal:r.gdone?g.t+' ✓':g.end?g.t:g.t+'  '+goalProg()+'/'+g.n });
  document.body.classList.toggle('sr-driving',S.phase==='drive');
  hud.hide('cop',!S.cop||VIEW==='chase'); hud.hide('streak',m<=1&&!nx); hud.flag('time','warn',S.left<=10&&S.phase==='drive'); hud.flag('cop','warn',!!S.cop&&S.cop.gap<70); hud.flag('streak','hot',m>1); hud.flag('goal','hot',r.gdone); }
function loop(ts){ var dt=last?Math.min(0.05,(ts-last)/1000):0; last=ts; step(dt); draw(); hudSet(); engine(!!S&&S.started&&!S.over&&S.phase==='drive'&&!RK.busy()); requestAnimationFrame(loop); }

/* ---------------- input: two actions. Left/Right (or A/D) change lanes; Space (or Up/W) shifts, and fires nitro in top gear ---------------- */
addEventListener('keydown',function(e){ if(e.target&&e.target.tagName==='INPUT') return; if(e.ctrlKey||e.metaKey||e.altKey) return; var k=e.key.toLowerCase(); if(/^arrow| $/.test(k)) e.preventDefault(); if(e.repeat||!S||!S.started||S.over||RK.busy()) return;
  if(k==='arrowleft'||k==='a') steer(-1); else if(k==='arrowright'||k==='d') steer(1); else if(k===' '||k==='arrowup'||k==='w') pressShift(); });
cv.addEventListener('pointerdown',function(e){ if(!S||!S.started||S.over||RK.busy()) return; var b=cv.getBoundingClientRect(), x=(e.clientX-b.left)/b.width*W, y=(e.clientY-b.top)/b.height*H;
  if(S.phase==='lights'||(x<(VIEW==='chase'?420:300)&&y>(VIEW==='chase'?420:340))) pressShift(); else steer(x<sx(car.x)?-1:1); });

var saved=load(); if(saved){ S=saved; play(false); } else S=fresh('');
requestAnimationFrame(loop);

/* ================= BOTS (balance runs and the Gameplay checks) =================
   hint() looks at the road like a player would and says which key to press. sim() plays whole runs in fast-forward with a driving skill and a math skill. */
var BOT={ pro:{ttc:0.26,jit:0.05,blind:0,shift:'pro',launch:1,rb:1.6}, kid:{ttc:0.5,jit:0.58,blind:0.1,shift:'kid',launch:0.5,rb:1.0}, slow:{ttc:0.48,jit:0.85,blind:0.2,shift:'kid',launch:0.25,rb:0.7}, none:{none:1,shift:'none',launch:0} }, bs={};
function threat(lane,from,to){ var r=S.r, best=null, i, o, a, b;
  for(i=0;i<traffic.length;i++){ o=traffic[i]; if(o.out||o.lane!==lane) continue; a=o.d-o.len/2-CARL/2-r.pd; b=o.d+o.len/2+CARL/2-r.pd; if(b>from&&a<to&&(!best||a<best.a)) best={a:a,v:o.v,id:o}; }
  for(i=0;i<works.length;i++){ var w=works[i]; if(w.lane!==lane) continue; a=w.d0-CARL/2-r.pd; b=w.d1+CARL/2-r.pd; if(b>from&&a<to&&(!best||a<best.a)) best={a:a,v:0,id:w}; }
  for(i=0;i<patches.length;i++){ var p=patches[i]; if(p.hit||(p.type!=='oil'&&p.type!=='sand')||lane<p.l0||lane>p.l1) continue; a=p.d-CARL/2-r.pd; b=p.d+p.len+CARL/2-r.pd; if(b>from&&a<to&&(!best||a<best.a)) best={a:a,v:0,id:p}; }
  return best; }
function hint(B){ B=B||BOT.pro; var r=S.r; if(S.phase==='lights') return S.lt>=S.lg+(B.launch>=1?0.05:0.2)?'Space':null; if(S.phase!=='drive') return null;
  if(!B.none){ var wb=rbNear(r.pd,car.v*B.rb+60,0); if(wb&&wb.gap!==r.lane&&gt>=(bs.rbT||0)){ bs.rbT=gt+0.16; return wb.gap<r.lane?'ArrowLeft':'ArrowRight'; }
    var th=threat(r.lane,-10,700);
    if(th){ if(bs.id!==th.id){ bs.id=th.id; bs.ttc=B.ttc-Math.random()*B.jit; }
      var closing=Math.max(20,car.v-th.v), ttc=th.a/closing;
      if(ttc<bs.ttc||th.a<8){ var look=closing*0.9+120, opts=[r.lane-1,r.lane+1].filter(function(l){ return l>=0&&l<NL; }), best=null, bd=-1;
        if(Math.random()<B.blind) return opts[ri(0,opts.length-1)]<r.lane?'ArrowLeft':'ArrowRight';
        opts.forEach(function(l){ var t2=threat(l,-CARL,r.onc&&l===0?look*2.4:look), d=t2?t2.a:9999; if(d>bd){ bd=d; best=l; } });
        if(best!=null&&bd>30) return best<r.lane?'ArrowLeft':'ArrowRight'; } } }
  if(B.shift==='none') return null;
  var z=pz(); if(r.gear<r.maxGear){ if(bs.g!==r.gear){ bs.g=r.gear; bs.at=B.shift==='pro'?z+0.03:z-0.12+Math.random()*0.5; } if(r.rpm>=Math.min(bs.at,0.999)&&(bs.at<1||limT>bs.at-1)) return 'Space'; }
  else if(S.boost>=100&&r.nitro<=0&&!threat(r.lane,0,260)) return 'Space';
  return null; }
function simPit(acc){ var got=0, miss=0, asked=0, ok; while(got<2&&miss<=1){ asked++; ok=Math.random()<acc; S.answered++; if(ok){ got++; S.correct++; S.streak++; S.best=Math.max(S.best,S.streak); } else { miss++; S.streak=0; } }
  var res={right:got,asked:asked,missed:miss,perfect:got===2&&miss===0,spare:asked>2}; S.sq=(S.sq||0)+asked;
  var R=S.r; R.maxGear=3+Math.min(2,got); R.jam=got<2?1:0; S.boost=Math.min(100,S.boost+25*got); if(res.perfect&&rollOffer()) tuneUp(S.offer[0]); lights(); }
function sim(o){ o=o||{}; var B=BOT[o.drive||'pro'], acc=o.acc==null?1:o.acc, dt=1/60, t=0, reach=[], k, keep=S, keepT=[traffic,stars,patches,works]; SIM=true; S=fresh('bot'); S.started=true; begin(); newStretch(0); bs={};
  while(!S.over&&t<1500){ if(S.phase==='pit'){ simPit(acc); continue; }
    k=hint(B); if(S.phase==='lights'){ if(B.launch>0&&S.lt>=S.lg&&!S.lp){ S.lp=1; go(Math.random()<B.launch?'perfect':'ok'); } }
    else if(k==='ArrowLeft') steer(-1); else if(k==='ArrowRight') steer(1); else if(k==='Space') pressShift();
    step(dt); t+=dt; }
  var out={ score:S.score, won:S.won, stretch:S.n+1, flags:S.flags, secs:Math.round(t), q:S.sq||0, right:S.correct, crashes:S.crashes, closes:S.closes, busts:S.busts, left:Math.round(S.left) };
  SIM=false; S=keep; traffic=keepT[0]; stars=keepT[1]; patches=keepT[2]; works=keepT[3]; STRIPK=''; return out; }

window.__G={ state:function(){ return S; }, results:RES, card:card, pick:pick, hud:hud, rk:RK, cfg:CFG, open:function(k){ return card.open(k||'pit'); }, end:function(w){ endRun(!!w); }, step:step, car:function(){ return car; },
  traffic:function(){ return traffic; }, hint:function(d){ return hint(BOT[d||'pro']); }, sim:sim, bot:BOT, showQ:function(){ return card.open('pit'); },
  jump:function(n,phase,scen,haz){ newStretch(n); if(scen){ S.r.scen=scen; S.r.haz=haz||[]; buildRoad(); } S.r.maxGear=5; if(phase==='drive') go('ok'); else if(phase==='end'){ go('ok'); S.r.pd=S.r.L-600; } save(); },
  set:function(k,v){ if(k in S) S[k]=v; else S.r[k]=v; }, addRamp:function(l,d){ patches.push({type:'ramp',l0:l,l1:l,d:d,len:70,hit:0}); }, zoom:function(){ return zoom; }, clockT:function(){ return gt; } };
})();
