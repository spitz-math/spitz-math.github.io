
/* ================= THE SWARM =================
   A Galaga remix on one wide field. Hold Space to fire; Shift dashes through danger (a short burst of cover, and dashing THROUGH a shot or a
   diving bug pays a Phase bonus). Bugs flash white before they dive and always come for where the ship WAS, so there is always a way out.
   A hit costs a little fuel and the chain, never the run. */
SND.shot=function(){ tone(1250,420,0,0.08,'square',0.03); };
SND.zip=function(){ tone(700,260,0,0.12,'triangle',0.045); };
SND.tele=function(){ tone(1500,1900,0,0.09,'sine',0.05); tone(1500,1900,0.12,0.09,'sine',0.05); };
SND.dash=function(){ tone(300,1100,0,0.16,'sine',0.07); noise(0,0.1,120,2500); };
SND.phase=function(){ tone(E5,E5,0,0.07,'sine',0.11); tone(B5,B5,0.06,0.07,'sine',0.11); tone(E6,E6,0.12,0.2,'sine',0.1); };
SND.graze=function(){ tone(2400,2400,0,0.03,'sine',0.04); };
SND.dock=function(){ tone(520,390,0,0.18,'sine',0.08); };
SND.launch=function(){ tone(200,900,0,0.3,'sine',0.08); tone(400,1200,0.05,0.25,'triangle',0.05); };
SND.thunk=function(){ tone(90,60,0,0.1,'sine',0.2); };
SND.kill=function(n){ var f=440*Math.pow(1.0595,Math.min(12,n)); tone(f,f*1.5,0,0.07,'triangle',0.09); noise(0,0.16,70,0,900); };
SND.power=function(){ tone(C5,C5,0,0.07,'sine',0.13); tone(E5,E5,0.06,0.07,'sine',0.13); tone(G5,G5,0.12,0.07,'sine',0.13); tone(C6,C6,0.18,0.22,'sine',0.12); };
SND.goal=function(){ tone(G5,G5,0,0.1,'sine',0.13); tone(C6,C6,0.09,0.1,'sine',0.13); tone(E6,E6,0.18,0.35,'sine',0.12); tone(C5,C5,0.18,0.35,'triangle',0.07); };
SND.beam=function(){ tone(220,440,0,0.9,'sine',0.06); tone(330,660,0.1,0.9,'sine',0.04); };
SND.captured=function(){ tone(660,220,0,0.9,'triangle',0.1); tone(440,147,0.15,0.9,'triangle',0.07); };
SND.warn=function(){ tone(300,300,0,0.22,'sawtooth',0.05); tone(300,300,0.3,0.22,'sawtooth',0.05); tone(300,300,0.6,0.22,'sawtooth',0.05); };
SND.nova=function(){ tone(200,900,0,0.3,'sine',0.1); noise(0,0.25,300,0,600); };
SND.bigboom=function(){ [0,0.14,0.28,0.42,0.56].forEach(function(t,i){ setTimeout(function(){ noise(0,0.4-i*0.05,260,0,500-i*60); },t*1000); }); tone(120,40,0,0.9,'triangle',0.22); [C5,E5,G5].forEach(function(f,i){ brass(f,0.75+i*0.12,0.25,0.11); }); brass(C6,1.15,0.7,0.13); };

var cv=$('sw-canvas'), cx=cv.getContext('2d'), W=1600, H=900, RS=cv.width/W, DF='Bungee, Inter, sans-serif';
var SHIP_Y=H-104, TOP=178, SPX=112, SPY=74;
var GUN=[ [[0,0]], [[-15,0],[15,0]], [[0,0],[-20,-230],[20,230]], [[-13,0],[13,0],[-28,-270],[28,270]], [[-17,0],[0,0],[17,0],[-30,-330],[30,330]] ];
var gt=0, formT=0, paused=false, hitStop=0, trauma=0, lastInput=0, lastShot=-9, lastMissile=0, lastDrone=0, calmUntil=0, lastHurt=-99, tutMove=0, tutKills=0, grazeAt=0;
var ship={x:W/2,safeUntil:0,shield:0,shieldAt:0,dashAt:-9,dashFrom:0,dashTo:0,dashSafe:0,dir:1,over:0,phased:0}, keys={l:false,r:false,f:false}, ptr={on:false,x:W/2};
var enemies=[], shots=[], beams=[], missiles=[], caps=[], rings=[], pops=[], bolts=[], laters=[], stars=[], boss=null, rush=null, wv=null, F={cols:8,amp:200};
var REDUCE=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
function heat(k){ return CFG[k][clamp(S.heat,1,5)-1]; }
function later(sec,fn){ laters.push({at:gt+sec,fn:fn}); }
function flying(){ return S.started&&!S.over&&!frozen; }
function letGo(){ keys.l=keys.r=keys.f=false; ptr.on=false; }

/* ---------- sparks: one fixed pool, the oldest is reused ---------- */
var SPK=[], spkI=0; for(var si=0;si<256;si++) SPK.push({on:false,x:0,y:0,vx:0,vy:0,life:0,max:1,c:'#fff',s:4});
function burst(x,y,c,n,sp,sz){ if(REDUCE) n=Math.ceil(n/3); for(var i=0;i<n;i++){ var p=SPK[spkI]; spkI=(spkI+1)%256; var an=Math.random()*6.283, v=(sp||260)*(0.35+Math.random()*0.75);
  p.on=true; p.x=x; p.y=y; p.vx=Math.cos(an)*v; p.vy=Math.sin(an)*v; p.life=0; p.max=0.35+Math.random()*0.4; p.c=i%3?c:'#FFFFFF'; p.s=(sz||7)*(0.6+Math.random()*0.7); } }
function ring(x,y,c,r,d){ rings.push({x:x,y:y,c:c,r:r,d:d||0.5,t0:gt}); if(rings.length>10) rings.shift(); }
function pop(x,y,txt,lab,d){ pops.push({x:clamp(x,150,W-150),y:Math.max(150,y),t0:gt,txt:txt,lab:lab||'',d:d||1.0}); if(pops.length>8) pops.shift(); }
function shake(v){ trauma=Math.min(1,Math.max(trauma,v)); }
function stop(ms){ if(hitStop<=0&&gt-stopAt>0.3){ hitStop=(REDUCE?Math.min(40,ms):ms)/1000; stopAt=gt; } } var stopAt=-9;

/* ---------- the run: four swarms, a rush, the Mothership. A cleared wave brings the next one early; an uncleared wave retreats at its deadline ---------- */
var WAVES=[
  {k:'swarm', until:0.14, rows:['bee','bee'], title:'SCOUTS', sub:'ZAP THEM ALL'},
  {k:'swarm', until:0.30, rows:['fly','bee','bee'], title:'RED FLIES', sub:'THEY ZIGZAG AND SHOOT'},
  {k:'rush',  until:0.42, title:'SWARM RUSH', sub:'ZAP ALL 24 FOR A PERFECT'},
  {k:'swarm', until:0.57, rows:['cmd','fly','bee','bee'], title:'COMMANDERS', sub:'TWO HITS · THEY BRING ESCORTS'},
  {k:'swarm', until:CFG.bossAt, rows:['top','fly','fly','bee'], title:'BOMBERS', sub:'KEEP MOVING'},
  {k:'boss',  until:1.01, title:'MOTHERSHIP!', sub:'TAKE OUT THE TURRETS'}
];
var VICTORY={k:'swarm', until:1.01, rows:['top','fly','fly','bee'], title:'VICTORY LAP', sub:'GOLD BUGS EVERYWHERE', gold:4};
function waveDef(){ return S.wave<WAVES.length?WAVES[S.wave]:VICTORY; }
var HP={bee:1,fly:1,cmd:2,bomber:3}, BASE={bee:10,fly:20,cmd:50,bomber:60};
function slotX(a){ return W/2+(a.col-(F.cols-1)/2)*SPX+Math.sin(formT*0.55)*F.amp; }
function slotY(a){ return TOP+a.row*SPY+Math.sin(formT*1.1+a.col*0.5)*4; }
function bz(p0,p1,p2,p3,u){ var v=1-u; return v*v*v*p0+3*v*v*u*p1+3*v*u*u*p2+u*u*u*p3; }
function goldChance(d){ return Math.min(0.6,0.06*(1+L('gold'))*(d.gold||1)); }
function startWave(){ var d=waveDef(); enemies=enemies.filter(function(a){ return a.state==='flee'; }); rush=null; wv={def:d,noHit:true,done:false,t0:gt}; calmUntil=gt+1.7; banner(d.title,d.sub,d.k==='boss'?'#FF4F6D':'#3DE0FF');
  if(d.k==='boss'){ startBoss(); return; }
  if(d.k==='rush'){ rush={T:-1.4,hit:0,total:24,done:false,bugs:[]}; for(var g=0;g<3;g++) for(var i=0;i<8;i++) rush.bugs.push({g:g,i:i,type:g%2?'fly':'bee',dead:false,on:false,x:-99,y:-99}); return; }
  spawnRows(d.rows,d.gold||1); nextDive=gt+(S.wave===0?5.5:3.4); nextVolley=gt+4; SND.wave(); }
function spawnRows(rows,goldK){ var cols=8, mid=(cols-1)/2; F={cols:cols,amp:(W-(cols-1)*SPX-150)/2-20};
  rows.forEach(function(ty,r){ var list=[]; if(ty==='cmd') list=[[2,'cmd'],[3,'cmd'],[4,'cmd'],[5,'cmd']]; else if(ty==='top') list=[[0,'bomber'],[2,'cmd'],[3,'cmd'],[4,'cmd'],[5,'cmd'],[7,'bomber']]; else for(var j=0;j<cols;j++) list.push([j,ty]);
    list.forEach(function(s){ var side=s[0]<mid?-1:1, a={type:s[1],row:r,col:s[0],hp:HP[s[1]],gold:s[1]!=='cmd'&&s[1]!=='bomber'&&Math.random()<goldChance({gold:goldK}),state:'in',t:-(0.2+r*0.2+Math.abs(s[0]-mid)*0.05),dur:1.15,x:0,y:-90,dead:false,fire:[],flash:-9,
        sx:W/2+side*(W/2+90), sy:H*0.5, c1x:W/2+side*340, c1y:H*0.72, c2x:W/2-side*260, c2y:110};
      a.x=a.sx; a.y=a.sy; enemies.push(a); }); }); }
/* a wave cleared ahead of its deadline brings bonus squads (lots of gold) until the next wave is due: the timeline itself never moves */
var SQUADS=[['bee'],['fly','bee'],['fly','bee'],['cmd','fly'],['top','fly']];
function reinforce(){ if(!wv||wv.done||S.over) return; wv.sq=(wv.sq||0)+1; rush=null; spawnRows(SQUADS[Math.min(S.wave,4)],3); nextDive=gt+2.6; nextVolley=gt+3; pop(W/2,300,'BONUS SQUAD','GOLD BUGS',1.4); SND.wave(); }
function timeLeft(d){ return (d.until-prog())*CFG.runWall*0.6; }
var nextDive=0, nextVolley=0, bannerT={t0:-9};
function banner(big,small,col){ bannerT={t0:gt,big:big,small:small||'',col:col||'#3DE0FF'}; }
function waveOver(cleared){ if(!wv||wv.done) return; var d=wv.def;
  if(cleared){ var clean=wv.noHit, first=!wv.clears, b=first?pts(300)+(clean?pts(300):0):pts(150); wv.clears=(wv.clears||0)+1; addScore(b);
    pop(W/2,430,'+'+b,!first?'SQUAD CLEAR!':clean?'WAVE CLEAR · NO HITS!':'WAVE CLEAR!',1.6); SND.wave(); if(first){ var s=cvPoint(W/2,380); confetti(s[0],s[1],90,2.8); }
    if(clean&&first) S.heat=Math.min(5,S.heat+1);
    if(timeLeft(d)>4){ var w0=wv; later(1.3,function(){ if(wv===w0) reinforce(); }); save(); hud(); return; } }
  wv.done=true;
  if(!cleared){ enemies.forEach(function(a){ if(!a.dead){ a.state='flee'; a.fire=[]; } }); shots=[]; }
  S.wave++; later(cleared?1.5:1.0,startWave); save(); hud(); }

/* ---------- the ship ---------- */
function fx(a,b){ return clamp(a+(b||0),50,W-50); }
function shipSafe(){ return gt<ship.safeUntil||gt<ship.dashSafe||gt<resumeAt; }
function aim(x,y,sp,spread){ var dx=ship.x-x, dy=SHIP_Y-y, an=Math.atan2(dy,dx)+(spread||0); return {x:x,y:y,vx:Math.cos(an)*sp,vy:Math.max(sp*0.5,Math.sin(an)*sp)}; }
function efire(x,y,n,fan,down){ if(gt<resumeAt+0.6||y>SHIP_Y-190) return; var sp=heat('shotSpeed'), max=heat('shotMax');
  for(var i=0;i<n&&shots.length<max;i++) shots.push(down?{x:x,y:y+20,vx:0,vy:sp*0.8}:aim(x,y+20,sp,n>1?(i-(n-1)/2)*(fan||0.24):0)); SND.zip(); }
function hurt(){ if(shipSafe()) return false; lastHurtPrev=lastHurt; lastHurt=gt; S.hurts++; if(wv) wv.noHit=false; shake(0.5); stop(60);
  if(gt-lastHurtPrev<20) S.heat=Math.max(1,S.heat-1);
  shots=shots.filter(function(b){ return Math.hypot(b.x-ship.x,b.y-SHIP_Y)>330; });
  if(ship.shield){ ship.shield=0; ship.shieldAt=gt; ship.safeUntil=gt+1.0; pop(ship.x,SHIP_Y-80,'SHIELD!',''); ring(ship.x,SHIP_Y,'#4ADE80',140,0.35); SND.hit(); return true; }
  ship.safeUntil=gt+CFG.hitSafe; breakChain(); S.fuel=Math.max(0.1,S.fuel-CFG.hitFuel); burst(ship.x,SHIP_Y,'#FF4F6D',14,300);
  pop(ship.x,SHIP_Y-80,'HIT!',MINUS+CFG.hitFuel+' FUEL'); SND.hurt(); return true; }
var lastHurtPrev=-99, chainUntil=0;
function chainSecs(){ return [2.5,3.5,4.5,6][L('chain')]; }
function breakChain(){ if(S.chain>=5){ pop(230,210,'CHAIN LOST',''); SND.lost(); } S.chain=0; chainUntil=0; }
function addChain(n){ S.chain+=n||1; S.bestChain=Math.max(S.bestChain,S.chain); chainUntil=gt+chainSecs(); }
function dash(){ if(!flying()||gt<resumeAt||gt-ship.dashAt<CFG.dashCool) return false; var dir=(keys.r?1:0)-(keys.l?1:0)||ship.dir; ship.dashAt=gt; ship.dashFrom=ship.x; ship.dashTo=fx(ship.x+dir*CFG.dashDist);
  ship.dashSafe=gt+CFG.dashSafe; ship.phased=0; SND.dash(); S.tut|=4; return true; }
function dashEnd(){ var l=L('nova'); if(!l) return; var r=[0,150,200,260][l]; ring(ship.x,SHIP_Y-20,'#C77DFF',r,0.4); SND.nova(); shake(0.25);
  shots=shots.filter(function(b){ return Math.hypot(b.x-ship.x,b.y-SHIP_Y)>r; });
  enemies.slice().forEach(function(a){ if(!a.dead&&a.state!=='flee'&&Math.hypot(a.x-ship.x,a.y-SHIP_Y)<r+30) hitEnemy(a,2); });
  if(rush) rush.bugs.forEach(function(b){ if(!b.dead&&b.on&&Math.hypot(b.x-ship.x,b.y-SHIP_Y)<r+30) rushHit(b); }); }
function phase(x,y){ if(ship.phased>=3) return; ship.phased++; S.phases++; addChain(3); S.fuel=Math.min(tankMax(),S.fuel+0.5); var p=pts(50); addScore(p); pop(x,y-50,'PHASE! +'+p,'+0.5 FUEL'); burst(x,y,'#3DE0FF',8,200); SND.phase(); }
function overdrive(){ return gt<ship.over; }
function fire(){ if(!flying()||gt<resumeAt) return false; var gap=CFG.fireGap/(1+0.2*L('rapid'))*(overdrive()?0.55:1); if(gt-lastShot<gap) return false; lastShot=gt; S.shots++; SND.shot();
  var pat=GUN[Math.min(4,L('gun')+(overdrive()?1:0))]; pat.forEach(function(o){ beams.push({x:ship.x+o[0],y:SHIP_Y-40,vx:o[1],left:1+L('pierce'),seen:[]}); });
  var dn=L('drone'); if(dn&&gt-lastDrone>0.42){ lastDrone=gt; droneXs().forEach(function(dx){ beams.push({x:dx,y:SHIP_Y-14,vx:0,left:1,seen:[],small:1}); }); }
  return true; }
function droneXs(){ var n=L('drone'), o=[]; if(n>=1) o.push(ship.x-74); if(n>=2) o.push(ship.x+74); if(n>=3) o.push(ship.x); return o.map(function(x,i){ return i===2?x:x; }); }
function targets(){ var t=enemies.filter(function(a){ return !a.dead&&a.state!=='flee'&&a.y>40&&!(a.state==='in'&&a.t<0); });
  if(rush) rush.bugs.forEach(function(b){ if(!b.dead&&b.on) t.push(b); });
  if(boss&&!boss.dead&&boss.enter>=1){ var p=bossTarget(); if(p) t.push({x:boss.x+MOMP[p][0],y:boss.y+MOMP[p][1],part:p}); } return t; }
function fireMissile(){ var l=L('missile'); if(!l||gt<resumeAt||gt-lastMissile<[0,1.4,1.0,0.7][l]) return; var t=targets(); if(!t.length) return; lastMissile=gt;
  missiles.push({x:ship.x,y:SHIP_Y-30,vx:(Math.random()<0.5?-1:1)*260,vy:-200,t:0,tg:t[Math.floor(Math.random()*t.length)]}); }

/* ---------- hits, kills, power-ups ---------- */
function hitEnemy(a,dmg){ if(a.dead) return; a.hp-=dmg||1; S.dmg+=dmg||1; a.flash=gt;
  if(a.hp>0){ addScore(pts(10)); SND.hit(); burst(a.x,a.y,'#FFFFFF',4,160,5); return; }
  a.dead=true; S.kills++; tutKills++; addChain(); var gold=a.gold, dive=a.state==='dive'||a.state==='bomb', p=pts(BASE[a.type]*(gold?5:1)*(dive?2:1)); addScore(p);
  var col=gold?'#FFC82E':a.type==='cmd'?'#4ADE80':a.type==='fly'?'#FF4F6D':a.type==='bomber'?'#C77DFF':'#FFD23D'; burst(a.x,a.y,col,gold||a.type!=='bee'?16:10,gold?340:260); flashes.push({x:a.x,y:a.y,c:col,t0:gt});
  pop(a.x,a.y-34,'+'+p,gold?'GOLD!':dive?'DIVE ×2':'',0.8);
  if(gold||a.type==='cmd'||a.type==='bomber'){ SND.bull(); stop(40); shake(0.3); } else { SND.kill(S.chain); shake(0.12); }
  var ch=0.05+0.04*L('magnet'); if(gold||a.type==='cmd'||a.type==='bomber') ch=0.5+0.12*L('magnet'); if(!novaing&&Math.random()<ch) dropCap(a.x,a.y);
  if(wv&&wv.def.k!=='boss'&&!wv.done&&!(rush&&!rush.done)&&!enemies.some(function(o){ return !o.dead&&o.state!=='flee'; })) waveOver(true); hud(); }
var flashes=[];
function dropCap(x,y,k){ if(caps.length>=4) return; var r=Math.random(); var kk=k||(r<0.15?'N':r<0.6?'O':'S'); if(kk==='N'&&(gt-novaAt<20||caps.some(function(c){ return c.k==='N'; }))) kk='O'; caps.push({x:x,y:y,k:kk,t0:gt}); }   /* v2: Nova is rare (15%, one at a time, 20 s apart): Kody found it cleared the screen constantly */
function grab(c){ SND.power();
  if(c.k==='S'){ if(ship.shield){ var p=pts(200); addScore(p); pop(c.x,SHIP_Y-90,'+'+p,'SHIELD FULL'); } else { ship.shield=1; pop(c.x,SHIP_Y-90,'SHIELD','BLOCKS ONE HIT'); } }
  else if(c.k==='O'){ ship.over=gt+7; pop(c.x,SHIP_Y-90,'OVERDRIVE!','7 SECONDS'); }
  else nova(); hud(); }
function nova(){ S.novas=(S.novas||0)+1; shots=[]; ring(ship.x,SHIP_Y,'#FF9A2E',560,0.6); pop(W/2,520,'NOVA BLAST!',''); shake(0.7); SND.nova(); novaAt=gt;
  novaing=true; enemies.slice().forEach(function(a){ if(!a.dead&&a.state!=='flee'&&!(a.state==='in'&&a.t<0)&&Math.abs(a.x-ship.x)<520&&a.y>SHIP_Y-640) hitEnemy(a,1); }); novaing=false;   /* v2: 1 damage in a big ring, not the whole screen at 2 */
  if(boss&&!boss.dead&&boss.enter>=1){ var p=bossTarget(); if(p) hitPart(p,Math.ceil(S.bossHp.mc*0.08)); }
  if(rush) rush.bugs.forEach(function(b){ if(!b.dead&&b.on) rushHit(b); }); }
var novaAt=-9, novaing=false;
function cvPoint(x,y){ return [x*1.2,y*1.2]; }                                  // field point -> the 1920x1080 stage (confetti)

/* ---------- dives: a bug flashes white for 0.6 s, then swoops at where the ship was ---------- */
function tele(a,mode,tx){ a.state='tele'; a.t=0; a.mode=mode||'dive'; a.tx=tx; SND.tele(); if(!(S.tut&4)&&!(S.tut&8)){ S.tut|=8; tipDash=gt; } }
var tipDash=-99;
function go(a){ var side=a.x<W/2?-1:1, tx=a.tx==null?ship.x:a.tx; a.t=0;
  if(a.mode==='bomb'){ a.state='bomb'; a.bx=a.x; a.by=a.y; a.dirx=a.x<W/2?1:-1; a.drop=1.2; return; }
  a.state='dive'; a.dur=heat('diveSecs'); a.zig=a.type==='fly'?(Math.random()<0.5?-1:1):0;
  a.p=[a.x,a.y, fx(a.x,side*170),a.y-110, fx(tx,-side*100),H*0.5, tx,H+80];
  a.fire=S.heat>=2?(a.type==='fly'?[0.3]:a.type==='cmd'?[0.34]:[]):[]; SND.dive(); }
function diverCount(){ return enemies.filter(function(a){ return !a.dead&&(a.state==='dive'||a.state==='tele'||a.state==='bomb'); }).length; }

/* ---------- the Mothership: two turrets, then the core opens and its beam sweeps; under a third, drones pour out ---------- */
var MOMP={ l:[-215,40,48], r:[215,40,48], c:[0,54,58] };
function momOpen(){ return S.bossHp&&S.bossHp.l<=0&&S.bossHp.r<=0; }
function bossTarget(){ var B=S.bossHp; return !B?null:B.l>0?'l':B.r>0?'r':B.c>0?'c':null; }
function startBoss(){ if(!S.bossHp){ var rate=S.dmg/Math.max(25,S.flown), total=clamp(Math.round(rate*25+27),60,420), th=Math.round(total*0.2), ch=Math.round(total*0.6); S.bossHp={l:th,r:th,c:ch,mt:th,mc:ch}; }
  boss={t:0,x:W/2,y:-220,enter:0,flash:-9,cool:{l:1.8,r:2.9,c:3.2},beam:0,beamT:2.5,drone:3,dead:false}; calmUntil=gt+3.2; SND.warn(); enemies=enemies.filter(function(a){ return a.state==='flee'; }); }
function hitPart(p,dmg){ var B=S.bossHp; if(!B||B[p]<=0||!boss||boss.dead) return; dmg=dmg||1; B[p]=Math.max(0,B[p]-dmg); S.dmg+=dmg; boss.flash=gt; addScore(pts(5*dmg));
  var px=boss.x+MOMP[p][0], py=boss.y+MOMP[p][1];
  if(B[p]>0){ if(Math.random()<0.3) SND.hit(); burst(px,py+20,'#FFFFFF',2,140,5); return; }
  if(p!=='c'){ var b=pts(500); addScore(b); burst(px,py,'#FF9A2E',26,380,9); ring(px,py,'#FF9A2E',200,0.45); pop(px,py-60,'+'+b,'TURRET DOWN',1.4); SND.bull(); SND.thunk(); addChain(); stop(90); shake(0.6); dropCap(px,py+40);
    if(momOpen()){ banner('CORE OPEN!','BLAST IT · DODGE THE BEAM','#FF4F6D'); boss.beamT=3; } save(); hud(); return; }
  bossDeath(); }
function bossDeath(){ var b=boss; b.dead=true; b.deadAt=gt; S.bossDown++; shots=[]; S.bossHp=null; S.wave=WAVES.length; if(wv) wv.done=true; var big=pts(4000)+Math.round(S.score*0.1); addScore(big);
  enemies.forEach(function(a){ if(!a.dead){ a.state='flee'; a.fire=[]; } }); stop(250); shake(1); SND.bigboom(); addChain();
  for(var i=0;i<12;i++) (function(i){ later(i*0.1,function(){ var x=b.x+(Math.random()-0.5)*520, y=b.y+(Math.random()-0.5)*120; burst(x,y,i%2?'#C77DFF':'#FFF04D',14,340,9); flashes.push({x:x,y:y,c:'#FFF04D',t0:gt}); shake(0.5); }); })(i);
  later(0.5,function(){ ring(b.x,b.y,'#FFFFFF',900,0.6); });
  later(1.3,function(){ pop(W/2,440,'+'+big.toLocaleString(),'MOTHERSHIP DESTROYED!',2.4); var s=cvPoint(b.x,b.y); confetti(s[0],s[1],170,3); SND.goal(); hud(); });
  later(2.6,function(){ boss=null; S.heat=Math.min(5,S.heat+1); startWave(); save(); }); save(); }
function overcharge(n){ for(var i=0;i<n;i++) (function(i){ later(0.5+i*0.22,function(){ if(!boss||boss.dead) return; var p=bossTarget(); if(!p) return; var tx=boss.x+MOMP[p][0], ty=boss.y+MOMP[p][1];
  bolts.push({x:ship.x,y:SHIP_Y-40,tx:tx,ty:ty,t0:gt}); pop(tx,ty+110,'OVERCHARGE!','RIGHT ANSWER',0.9); SND.bull(); shake(0.4); burst(tx,ty,'#A6FF4D',16,320,8); hitPart(p,Math.ceil(S.bossHp.mc*0.1)); }); })(i); }
function updateBoss(dt){ var b=boss, B=S.bossHp; b.t+=dt; if(b.enter<1) b.enter=Math.min(1,b.enter+dt/2.6);
  var e=b.enter*b.enter*(3-2*b.enter); b.x=W/2+Math.sin(b.t*0.42)*430*e; b.y=-220+(430+Math.sin(b.t*0.9)*14)*e;
  if(b.enter<1||b.dead) return;
  ['l','r'].forEach(function(p){ if(B[p]<=0) return; b.cool[p]-=dt; if(b.cool[p]<=0){ b.cool[p]=2.2*(0.9+Math.random()*0.3)*(S.heat<=1?1.4:1); efire(b.x+MOMP[p][0],b.y+MOMP[p][1]+20,S.heat>=3?3:2,0.2); } });
  if(momOpen()){ b.beamT-=dt;
    if(b.beam===0&&b.beamT<=0){ b.beam=1; b.beamT=1.0; b.phased=false; SND.beam(); }
    else if(b.beam===1&&b.beamT<=0){ b.beam=2; b.beamT=1.5; SND.captured(); }
    else if(b.beam===2){ if(Math.abs(ship.x-b.x)<62&&!shipSafe()) hurt(); else if(Math.abs(ship.x-b.x)<62&&gt<ship.dashSafe&&gt>ship.dashAt&&!b.phased){ b.phased=true; phase(ship.x,SHIP_Y); } if(b.beamT<=0){ b.beam=0; b.beamT=3.4-0.3*S.heat; } }
    if(S.heat>=3&&b.beam===0){ b.cool.c-=dt; if(b.cool.c<=0){ b.cool.c=3.2; efire(b.x,b.y+90,3,0.3); } } }
  b.drone-=dt; if(b.drone<=0){ var third=momOpen()&&B.c<B.mc/3; b.drone=third?3:6; for(var i=0;i<(third?2:1);i++){ if(enemies.length>12) break;
      var d={type:Math.random()<0.5?'bee':'fly',row:0,col:0,hp:1,gold:Math.random()<0.2,state:'form',t:0,x:b.x+(i?130:-130),y:b.y+70,dead:false,fire:[],flash:-9,drone:true}; enemies.push(d); tele(d,'dive'); } } }

/* ---------- Swarm Rush: three flights of eight fly a pattern and never shoot ---------- */
var RUSH=[ [[-70,230],[620,1000],[1000,-300],[W+70,440]], [[W+70,230],[W-620,1000],[W-1000,-300],[-70,440]], [[-70,560],[480,-200],[W-480,-200],[W+70,560]] ];
var RUSH_GAP=2.9, RUSH_DUR=4.6;
function updateRush(dt){ var r=rush; r.T+=dt;
  r.bugs.forEach(function(b){ if(b.dead) return; var P=RUSH[b.g], u=(r.T-b.g*RUSH_GAP-b.i*0.2)/RUSH_DUR; b.on=u>=0&&u<=1; if(b.on){ b.x=bz(P[0][0],P[1][0],P[2][0],P[3][0],u); b.y=bz(P[0][1],P[1][1],P[2][1],P[3][1],u); } });
  if(!r.done&&(r.T>2*RUSH_GAP+RUSH_DUR+7*0.2+0.2||r.hit>=r.total)){ r.done=true; var perfect=r.hit>=r.total;
    if(perfect){ var b=pts(2000); addScore(b); pop(W/2,440,'PERFECT! +'+b,'',1.8); SND.bull(); var s=cvPoint(W/2,380); confetti(s[0],s[1],150,3); dropCap(W/2-90,300,'O'); dropCap(W/2+90,300,'S'); }
    else pop(W/2,440,r.hit+' of '+r.total,'SWARM RUSH',1.6);
    if(wv&&timeLeft(wv.def)>4){ var w1=wv; later(1.6,function(){ if(wv===w1) reinforce(); }); } else { if(wv) wv.done=true; S.wave++; later(1.6,startWave); } save(); hud(); } }
function rushHit(b){ if(!rush||b.dead) return; b.dead=true; rush.hit++; S.kills++; S.dmg++; addChain(); var p=pts(40); addScore(p); SND.kill(S.chain); shake(0.1);
  burst(b.x,b.y,b.type==='fly'?'#FF4F6D':'#FFD23D',10,260); pop(b.x,b.y-34,'+'+p,rush.hit===rush.total?'ALL 24!':'',0.7); hud(); }

/* ================= UPDATE ================= */
function update(dt){ if(!S.started||S.over||frozen) return;
  if(hitStop>0){ hitStop-=dt; return; }
  stars.forEach(function(s){ s.y+=s.v*dt*(REDUCE?0.25:1); if(s.y>H+8){ s.y=-8; s.x=Math.random()*W; } });
  gt+=dt; formT+=dt; trauma=Math.max(0,trauma-dt*2.5);
  for(var li=laters.length-1;li>=0;li--) if(gt>=laters[li].at){ var f=laters.splice(li,1)[0]; f.fn(); }
  if(S.over) return;
  if(!wv&&!laters.length) startWave();
  var calm=gt<calmUntil||gt<resumeAt||(boss&&boss.dead);
  // the flight clock and the fuel only run while there is something to fight
  if(!calm){ S.flown+=dt; S.fuel=Math.max(0,S.fuel-dt); }
  // the ship: arrow keys, A/D, or hold a finger or the mouse on the field
  var x0=ship.x, dashing=gt-ship.dashAt<CFG.dashTime;
  if(dashing){ var u=(gt-ship.dashAt)/CFG.dashTime; ship.x=ship.dashFrom+(ship.dashTo-ship.dashFrom)*(1-(1-u)*(1-u)); if(!REDUCE&&Math.random()<0.8) burst(ship.x,SHIP_Y,'#3DE0FF',1,60,6); }
  else { if(ship.wasDash){ dashEnd(); }
    var dir=(keys.r?1:0)-(keys.l?1:0);
    if(ptr.on){ var d=ptr.x-ship.x; if(Math.abs(d)<1000*dt) ship.x=ptr.x; else ship.x+=(d>0?1:-1)*1000*dt; dir=0; }
    if(dir){ ship.x+=dir*CFG.shipSpeed*dt; ship.dir=dir; } ship.x=fx(ship.x); }
  ship.wasDash=dashing; tutMove+=Math.abs(ship.x-x0); if(tutMove>200) S.tut|=1; if(tutKills>=3) S.tut|=2;
  if(keys.f||ptr.on) fire(); fireMissile();
  var sl=L('shield'); if(sl&&!ship.shield&&gt-ship.shieldAt>[0,16,11,7][sl]){ ship.shield=1; ring(ship.x,SHIP_Y,'#4ADE80',90,0.3); }
  if(chainUntil&&gt>chainUntil){ S.chain=0; chainUntil=0; hud(); }
  // the swarm
  if(boss) updateBoss(dt);
  if(rush&&!rush.done) updateRush(dt);
  var live=[], form=[];
  enemies.forEach(function(a){ if(a.dead) return; a.t+=dt; var u, e;
    if(a.state==='in'){ if(a.t>=0){ u=Math.min(1,a.t/a.dur); e=u*u*(3-2*u); a.x=bz(a.sx,a.c1x,a.c2x,slotX(a),e); a.y=bz(a.sy,a.c1y,a.c2y,slotY(a),e); if(u>=1) a.state='form'; } }
    else if(a.state==='form'){ if(!a.drone){ a.x=slotX(a); a.y=slotY(a); } form.push(a); }
    else if(a.state==='tele'){ if(!a.drone){ a.x=slotX(a); a.y=slotY(a); } if(a.t>=0.6) go(a); }
    else if(a.state==='dive'){ u=Math.min(1,a.t/a.dur); var p=a.p; a.x=bz(p[0],p[2],p[4],p[6],u)+(a.zig?Math.sin(u*Math.PI*4)*70*a.zig*u:0); a.y=bz(p[1],p[3],p[5],p[7],u);
      if(a.fire.length&&u>=a.fire[0]){ a.fire.shift(); efire(a.x,a.y,a.type==='cmd'?3:1,0.22); }
      if(u>=1){ if(a.drone){ a.dead=true; return; } a.state='back'; a.t=0; a.bx=null; a.by=-70; } }
    else if(a.state==='bomb'){ if(a.t<1){ e=a.t; e=e*e*(3-2*e); a.x=a.bx; a.y=a.by+(390-a.by)*e; }
      else { a.x+=a.dirx*170*dt; a.y=390+Math.sin(a.t*3)*8; a.drop-=dt; if(a.drop<=0){ a.drop=0.75; efire(a.x,a.y,1,0,true); }
        if(a.t>5.2||a.x<70||a.x>W-70){ a.state='back'; a.t=0; a.bx=a.x; a.by=a.y; } } }
    else if(a.state==='flee'){ a.y-=620*dt; if(a.y<-120){ a.dead=true; return; } }
    else { u=Math.min(1,a.t/1.0); e=1-(1-u)*(1-u); var bx=a.bx==null?slotX(a):a.bx; a.x=bx+(slotX(a)-bx)*e; a.y=a.by+(slotY(a)-a.by)*e; if(u>=1) a.state='form'; }
    live.push(a); });
  if(enemies.length>live.length) enemies=live;
  // dives and potshots, only once the wave has settled and the ship is back in the fight
  var swarm=wv&&wv.def.k!=='boss'&&!wv.done&&!(rush&&!rush.done);
  if(swarm&&!calm&&gt>nextDive){ var canDive=form.filter(function(a){ return !a.drone; });
    if(canDive.length&&!live.some(function(a){ return a.state==='in'; })&&diverCount()<heat('divers')){ var a=canDive[Math.floor(Math.random()*canDive.length)];
      if(a.type==='bomber') tele(a,'bomb');
      else { tele(a,'dive',ship.x); if(a.type==='cmd') canDive.filter(function(o){ return o!==a&&(o.type==='bee'||o.type==='fly')&&o.row===a.row+1&&Math.abs(o.col-a.col)<=1; }).slice(0,2).forEach(function(o,i){ tele(o,'dive',fx(ship.x,i?130:-130)); }); } }
    nextDive=gt+heat('diveSecs')*(0.9+Math.random()*0.5)*(live.length<6?0.6:1); }
  if(swarm&&!calm&&S.heat>=2&&gt>nextVolley){ nextVolley=gt+heat('volley')*(0.7+Math.random()*0.6); var fl=form.filter(function(a){ return a.type==='fly'||a.type==='cmd'; }); if(fl.length){ var s0=fl[Math.floor(Math.random()*fl.length)]; efire(s0.x,s0.y,1); } }
  // the wave's deadline: whoever is left flies off and the next wave comes in (the Mothership's deadline is the end of the run)
  if(wv&&!wv.done&&wv.def.k!=='boss'&&prog()>=wv.def.until){ if(rush&&!rush.done){ rush.done=true; pop(W/2,440,rush.hit+' of '+rush.total,'SWARM RUSH',1.6); } rush=null; waveOver(false); }
  // what can hurt the ship: diving bugs and shots. The core of the ship is small; a near miss is a GRAZE, a dash through danger is a PHASE
  var inDash=gt<ship.dashSafe&&gt>=ship.dashAt;
  live.forEach(function(a){ if((a.state==='dive'||a.state==='bomb')&&Math.abs(a.x-ship.x)<38&&Math.abs(a.y-SHIP_Y)<32){ if(inDash){ if(!a.phased){ a.phased=true; phase(a.x,a.y); } } else hurt(); } });
  for(var i=shots.length-1;i>=0;i--){ var b=shots[i]; b.x+=b.vx*dt; b.y+=b.vy*dt; var dx=Math.abs(b.x-ship.x), dy=Math.abs(b.y-SHIP_Y);
    if(dx<17&&dy<20){ if(inDash){ if(!b.phased){ b.phased=true; phase(b.x,b.y); } } else if(hurt()) break; else continue; }
    else if(dx<46&&dy<40&&!b.grazed&&!shipSafe()){ b.grazed=true; var g=pts(15); addScore(g); if(gt-grazeAt>0.12){ grazeAt=gt; SND.graze(); burst(b.x,b.y,'#FFFFFF',3,120,4); pop(ship.x,SHIP_Y-70,'GRAZE +'+g,'',0.5); } }
    if(b.y>H+20||b.x<-20||b.x>W+20) shots.splice(i,1); }
  // power-ups float down; touch one to grab it (the Magnet pulls them in)
  var mg=L('magnet'); caps.forEach(function(c){ c.y+=170*dt; if(mg){ var d2=ship.x-c.x; if(Math.abs(d2)<220+160*mg) c.x+=clamp(d2,-1,1)*Math.min(Math.abs(d2),(180+90*mg)*dt); }
    if(Math.abs(c.x-ship.x)<56&&Math.abs(c.y-SHIP_Y)<54){ c.got=true; grab(c); } }); caps=caps.filter(function(c){ return !c.got&&c.y<H+30; });
  // beams: the first thing in the path takes the hit; Pierce lets a beam carry on
  beams=beams.filter(function(b){ var y0=b.y; b.y-=CFG.beamSpeed*dt; b.x+=b.vx*dt; var stopBeam=false;
    if(boss&&!boss.dead&&boss.enter>=1){ var got=null; ['l','r','c'].forEach(function(p){ var m=MOMP[p], px=boss.x+m[0], py=boss.y+m[1]; if(S.bossHp[p]>0&&(p!=='c'||momOpen())&&Math.abs(b.x-px)<m[2]&&py+m[2]>=b.y&&py-m[2]<=y0) got=got||p; });
      if(got){ hitPart(got,1); return false; }
      if(Math.abs(b.x-boss.x)<300&&b.y<boss.y+70&&y0>boss.y-60){ burst(b.x,boss.y+80,'#3DE0FF',1,90,4); return false; } }
    if(rush&&!rush.done){ rush.bugs.forEach(function(q){ if(stopBeam||q.dead||!q.on||b.seen.indexOf(q)>=0) return; if(Math.abs(b.x-q.x)<40&&q.y+28>=b.y&&q.y-28<=y0){ b.seen.push(q); rushHit(q); if(--b.left<=0) stopBeam=true; } }); if(stopBeam) return false; }
    for(var k=0;k<enemies.length;k++){ var a=enemies[k]; if(a.dead||a.state==='flee'||(a.state==='in'&&a.t<0)||b.seen.indexOf(a)>=0) continue; var hw=a.type==='bomber'?52:a.type==='cmd'?46:40, hh=30;
      if(Math.abs(b.x-a.x)<hw&&a.y+hh>=b.y&&a.y-hh<=y0){ b.seen.push(a); hitEnemy(a,1); if(--b.left<=0) return false; } }
    return b.y>-40&&b.x>-40&&b.x<W+40; });
  // homing missiles
  missiles=missiles.filter(function(m){ m.t+=dt; var t=m.tg; if(!t||t.dead||(t.part&&(!boss||boss.dead))||(t.g!=null&&!rush)){ var ts=targets(); t=m.tg=ts.length?ts[Math.floor(Math.random()*ts.length)]:null; }
    if(t){ var tx=t.part?boss.x+MOMP[t.part][0]:t.x, ty=t.part?boss.y+MOMP[t.part][1]:t.y, dx=tx-m.x, dy=ty-m.y, d=Math.max(1,Math.hypot(dx,dy)); m.vx+=(dx/d*760-m.vx)*Math.min(1,dt*5); m.vy+=(dy/d*760-m.vy)*Math.min(1,dt*5);
      if(d<34){ burst(m.x,m.y,'#FF9A2E',8,220); if(t.part) hitPart(t.part,2); else if(t.g!=null) rushHit(t); else hitEnemy(t,2); return false; } }
    else m.vy-=600*dt;
    m.x+=m.vx*dt; m.y+=m.vy*dt; return m.t<4&&m.y>-60; });
  for(var s=0;s<256;s++){ var p=SPK[s]; if(!p.on) continue; p.life+=dt; if(p.life>=p.max){ p.on=false; continue; } p.x+=p.vx*dt; p.y+=p.vy*dt; var dr=Math.pow(0.02,dt); p.vx*=dr; p.vy*=dr; }
  rings=rings.filter(function(o){ return gt-o.t0<o.d; }); pops=pops.filter(function(o){ return gt-o.t0<o.d; }); flashes=flashes.filter(function(o){ return gt-o.t0<0.12; }); bolts=bolts.filter(function(o){ return gt-o.t0<0.3; });
  // out of fuel: the game freezes and the question card opens. Out of time (prog() reaches 1): the run ends
  if(prog()>=1){ endRun(); return; }
  if(S.fuel<=0&&!calm){ openCard(); } }
