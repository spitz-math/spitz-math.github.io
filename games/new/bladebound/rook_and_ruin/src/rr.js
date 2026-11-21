/* ================= ROOK & RUIN: animation sheets + opening cutscene =================
   RRART (rr_art.js) holds the processed sheets. Every frame shares one fixed box per sheet with the
   feet on (px,py), so bodies never jump between frames. Left = right row mirrored around the pivot.
   Hitboxes are untouched: the art is drawn around the same foot point the old sprites used. */
/* stand-in looks for the two fork enemies until they get their own art: Ember Imp = a fire-tinted wizard (F), Lancer = a steel-tinted goblin (S) */
var RRTINT={wiz:['F','#FF7A1E'],wizw:['F','#FF7A1E'],wizb:['F','#FF7A1E'],goba:['S','#6F8FC8'],gobw:['S','#6F8FC8']};
var RRALIAS={imp:{as:'wiz',tint:'F',own:'imp'},lance:{as:'gob',tint:'S',st:{9:3},own:'lancea'}};   /* used only while the enemy has no art of its own */
function rrAlias(t){ var A=RRALIAS[t]; return A&&!RRART[A.own]?A:null; }
var RRI={}, RRSH={imp:16,impw:16,impb:16,lancea:22,lancew:22,wiz:18,wizw:18,wizb:18,gobw:19,goba:19,skelw:21,skela:21,bossw:48,bossa:48};
(function(){ Object.keys(RRART).forEach(function(n){ var im=new Image(); im.onload=function(){ var sh=RRSH[n], m=RRART[n]; RRI[n]=sh?mk(im.width,im.height,function(x){ x.drawImage(im,0,0); x.globalCompositeOperation='destination-over'; x.fillStyle='rgba(0,0,0,.32)'; for(var r=0;r<m.rows;r++) for(var q=0;q<m.cols;q++) x.fillRect(q*m.fw+m.px-Math.round(sh/2),r*m.fh+m.py-3,sh,3); }):im; RRI[n+'R']=im; RRI[n+'W']=white(im); RRI[n+'K']=mk(im.width,im.height,function(x){ x.drawImage(im,0,0); x.globalCompositeOperation='source-in'; x.fillStyle='#06060C'; x.fillRect(0,0,im.width,im.height); });
    var tt=RRTINT[n]; if(tt) RRI[n+tt[0]]=mk(im.width,im.height,function(x){ x.drawImage(im,0,0); x.globalCompositeOperation='color'; x.fillStyle=tt[1]; x.fillRect(0,0,im.width,im.height); x.globalCompositeOperation='destination-in'; x.drawImage(im,0,0); if(sh){ x.globalCompositeOperation='destination-over'; x.fillStyle='rgba(0,0,0,.32)'; for(var r=0;r<m.rows;r++) for(var q=0;q<m.cols;q++) x.fillRect(q*m.fw+m.px-Math.round(sh/2),r*m.fh+m.py-3,sh,3); } }); }; im.src=RRART[n].src; }); })();
function rrReady(n){ return !!RRI[n]; }
var RRF={};
/* Kody 2026-11-21: elite outline. While RR_GOLD=[dx,dy] is set, rrDraw draws a solid gold copy of the frame, shifted. The gold sheets are made once per sheet, so this costs one extra drawImage per pass (no canvas filters) */
var RR_GOLD=null;
function rrGoldSheet(k){ var g=RRI[k+'G']; if(g) return g; var im=RRI[k+'R']||RRI[k];  /* raw sheet: no baked floor shadow, so the gold outline skips the shadow */ if(!im) return null; return RRI[k+'G']=mk(im.width,im.height,function(q){ q.drawImage(im,0,0); q.globalCompositeOperation='source-in'; q.fillStyle='#FFC93C'; q.fillRect(0,0,im.width,im.height); q.globalCompositeOperation='source-over'; }); }
function rrDraw(c,n,row,col,x,fy,flip,wh){ var m=RRART[n], k=wh?n+(wh===true?'W':wh):n, im=RRI[k]; if(RR_GOLD){ k=n+'G'; im=rrGoldSheet(n); x+=RR_GOLD[0]; fy+=RR_GOLD[1]; } if(!im) return false; var sy=row*m.fh; x=Math.round(x); fy=Math.round(fy);
  if(flip){ var fi=RRF[k]||(RRF[k]=mk(im.width,im.height,function(q){ q.translate(im.width,0); q.scale(-1,1); q.drawImage(im,0,0); })); c.drawImage(fi,im.width-(col+1)*m.fw,sy,m.fw,m.fh,x-(m.fw-m.px),fy-m.py,m.fw,m.fh); }
  else c.drawImage(im,col*m.fw,sy,m.fw,m.fh,x-m.px,fy-m.py,m.fw,m.fh); return true; }
/* direction with a little stickiness so a diagonal never flickers between rows. rows: 0 down, 1 up, 2 side */
function rrDir(o,x,y){ var ax=Math.abs(x), ay=Math.abs(y), row=o.rrRow==null?0:o.rrRow;
  if(ax>ay+0.12) row=2; else if(ay>ax+0.12) row=y<0?1:0; else if(row!==2) row=y<0?1:0;
  if(x<-0.05) o.rrFl=true; else if(x>0.05) o.rrFl=false; o.rrRow=row; return [row,row===2?!!o.rrFl:false]; }

/* ---------- Rook ---------- */
var RR_WIND=0.035;   /* windup before the blade is live: the slash frame and the hit arrive together */
function heroPose(p){ var w=S.w;
  if(p.cutPose) return p.cutPose;
  if(p.roll>0||p.rec>0){ var dr=rrDir(p,p.rx,p.ry), k=0.24-Math.max(0,p.roll);
    if(p.roll>0&&L('bash')) return ['rook_shield',0,dr[0],dr[1]];   /* Shield Bash: the dodge is a shield charge */
    return ['rook_dodge',dr[0],p.roll>0?(k<0.045?0:k<0.15?1:2):3,dr[1]]; }
  if(p.sw>0){ var dur=p.spin?0.26:0.2, el=dur-p.sw, a=p.spin?p.swA+el/dur*6.283:p.swA, da=rrDir(p,Math.cos(a),Math.sin(a));
    /* spin: cols = sword right, toward viewer (down), left, away (up), picked from the blade's real angle */
    if(p.spin) return ['rook_spin',0,((Math.round(a/1.5708)%4)+4)%4,false];
    /* long slash rows: 0 front (down), 1 back (up), 2 right (left mirrored); cols windup, slash, follow-through, recover.
       Nov 14 sheet: the back-view follow-through ends upper-left above the helmet, so all three rows play every frame again. */
    return ['rook_slash',da[0],el<RR_WIND?0:el<0.11?1:2,da[1]]; }
  if(p.swR>0&&!p.mv){ var dr2=rrDir(p,Math.cos(p.swA),Math.sin(p.swA)); return ['rook_slash',dr2[0],3,dr2[1]]; }
  var df=rrDir(p,p.fx,p.fy);
  if(p.blkT>0) return ['rook_shield',0,df[0],df[1]];   /* Aegis block: shield up for a moment */
  if(p.hurtT>0) return ['rook_idle',df[0],2,df[1]];
  if(p.mv) return ['rook_walk',df[0],Math.floor(p.walk*8)%4,df[1]];
  return ['rook_idle',df[0],Math.floor((w?w.t:0)*1.7)%2,df[1]]; }
function drawHeroRR(c,p,t){ var pose=heroPose(p), foot=p.y+p.r+3; invRing(c,p);
  c.fillStyle='rgba(0,0,0,.32)'; c.fillRect(Math.round(p.x-12),Math.round(p.y+p.r-1),24,4);
  /* grounded marker (readability pass 2026-11-15): a small gold ring at Rook's feet, always on in play, never a big glow */
  if(S.mode==='play'||S.mode==='ask'||S.mode==='pick'||S.mode==='reentry'||S.mode==='build'){ var gx=Math.round(p.x), gy=Math.round(p.y+p.r+1); c.lineWidth=4; c.strokeStyle='rgba(18,8,28,.85)'; c.beginPath(); c.ellipse(gx,gy,17,6,0,0,6.2832); c.stroke(); c.lineWidth=2; c.strokeStyle='#FFD45C'; c.beginPath(); c.ellipse(gx,gy,17,6,0,0,6.2832); c.stroke(); }
  if(p.rip>0&&L('riposte')){ c.fillStyle='rgba(255,214,90,.32)'; c.beginPath(); c.arc(p.x,p.y-24,32,0,7); c.fill(); }
  rrDraw(c,pose[0],pose[1],pose[2],p.x,foot,pose[3]);
  if(L('aegis')&&p.sh<=0){ c.strokeStyle='rgba(77,224,192,.55)'; c.lineWidth=2; c.beginPath(); c.arc(p.x,p.y-22,34,0,7); c.stroke(); }
  if(p.rollCd>0&&S.mode==='play'){ var s=stat(); c.strokeStyle='rgba(255,255,255,.55)'; c.lineWidth=3; c.beginPath(); c.arc(p.x,p.y+p.r+8,7,-1.57,-1.57+6.28*(1-p.rollCd/s.rollCd)); c.stroke(); } }

/* ---------- enemies (v14 cleaned pack). rows: 0 down, 1 side (left = mirrored), 2 up.
   Down/side action poses use the original sheets; facing up uses the back sheets (*b, same column meaning);
   walking/floating uses the cycle sheets (*w), advanced by distance walked (e.wd) so the feet match the speed
   and stop when the enemy stops. Bats and slimes have their own sheets (bat2, slime2). ---------- */
var RRE={gob:'goba',skel:'skela',wiz:'wiz',boss:'bossa',imp:'wiz',lance:'goba'}, RRBASE={gob:'gob',skel:'skel',boss:'boss',lance:'lance'}, RRSTEP={gob:9,skel:8,boss:12,lance:9};
var RRH={gob:44,skel:56,wiz:58,boss:96,imp:50,lance:56};
function enemyPose(e,p){ var dx=p.x-e.x, dy=p.y-e.y, fx=dx, fy=dy, col=0, t=e.type;
  if(t==='gob'||t==='lance'){ if(e.st===1||e.st===2){ fx=e.sx; fy=e.sy; } col=e.stun>0||e.st===9?3:[0,1,2,3][e.st]||0; }
  else if(t==='imp'){ col=e.st===1||e.st===2?1:0; if(e.stun>0) col=3; }
  else if(t==='skel'){ fx=Math.cos(e.fa); fy=Math.sin(e.fa); col=e.stun>0?3:[0,1,2,3][e.st]||0; }
  else if(t==='wiz'){ col=e.st===1?1:0; if(e.bkT!=null&&e.t-e.bkT<0.28) col=3; if(e.stun>0) col=0; }
  else if(t==='boss'){ if(e.st>=1&&e.st<=4){ fx=Math.cos(e.fa); fy=Math.sin(e.fa); }
    col=e.st===9?3:(e.st===1||e.st===2||e.st===4)?1:(e.st===5&&(e.lastA==='slam'||e.lastA==='swipe')&&e.cd>0.2)?2:0; }
  var n=Math.hypot(fx,fy)||1; fx/=n; fy/=n;
  /* hysteresis so a diagonal never flickers between rows */
  var row=e.rrRow==null?1:e.rrRow; if(fy>0.62) row=0; else if(fy<-0.62) row=2; else if((row===0&&fy<0.52)||(row===2&&fy>-0.52)) row=1;
  if(fx<-0.08) e.rrFl=true; else if(fx>0.08) e.rrFl=false; e.rrRow=row;
  return [col,row,row===1?!!e.rrFl:false]; }
function enemyFrame(e,p){ var A=rrAlias(e.type); if(A){ var t0=e.type, s0=e.st; e.type=A.as; if(A.st&&A.st[s0]!=null) e.st=A.st[s0]; try{ return enemyFrame(e,p); } finally{ e.type=t0; e.st=s0; } }
  var pz=enemyPose(e,p), t=e.type, n, col=pz[0], row=pz[1], walk=0, idle=e.st===0&&col===0&&!(e.stun>0);
  if(t==='imp'){ n='imp'; if(idle){ walk=1; n='impw'; col=Math.floor(e.t*5)%4; } else if(row===2){ n='impb'; row=0; } }
  else if(t==='wiz'){ n='wiz'; if(idle){ walk=1; n='wizw'; col=Math.floor(e.t*4)%4; } else if(row===2){ n='wizb'; row=0; } }
  else if(idle&&(e.mv||0)>0.5){ walk=1; n=RRBASE[t]+'w'; col=Math.floor((e.wd||0)/RRSTEP[t])%4; }
  else n=RRBASE[t]+'a';   /* v16 action sheets: rows down / side / up, same scale as the walk */
  return {n:n,row:row,col:col,fl:pz[2],walk:walk}; }
function drawEnemyRR(c,e,p,t){ var A=rrAlias(e.type); if(A){ var t0=e.type, s0=e.st; e.type=A.as; if(A.st&&A.st[s0]!=null) e.st=A.st[s0]; e.tint=A.tint; try{ return drawEnemyRR(c,e,p,t); } finally{ e.type=t0; e.st=s0; e.tint=null; } }
  var ty=e.type;
  if(ty==='bat') return drawBatRR(c,e,p); if(ty==='slime') return drawSlimeRR(c,e);
  if(!RRE[ty]||e.small) return null; var f=enemyFrame(e,p); if(!rrReady(f.n)) return null;
  var bob=ty==='wiz'||ty==='imp'?Math.sin(e.t*3)*2-3:0;   /* the wizard hovers; walkers get their bounce from the cycle itself */
  var jx=((e.st===1&&(ty==='gob'||ty==='skel'||ty==='lance'))||(ty==='boss'&&e.st===3))?rnd(-1.5,1.5):0;
  var foot=e.y+e.r+2;
  rrDraw(c,f.n,f.row,f.col,e.x+jx,foot+bob,f.fl,e.fl>0&&!RM?true:(e.tint||false));
  return foot-RRH[ty]+bob; }
/* bat: rows front / side (left mirrored); wings up, down, spread, dive */
function drawBatRR(c,e,p){ if(!rrReady('bat2')) return null; var fx=e.st===2?e.sx:p.x-e.x, fy=e.st===2?e.sy:p.y-e.y, ax=Math.abs(fx), ay=Math.abs(fy);
  var row=e.rrRow==null?0:e.rrRow; if(ax>ay*1.3) row=1; else if(ay>ax*1.1) row=0;
  if(fx<-0.05) e.rrFl=true; else if(fx>0.05) e.rrFl=false; e.rrRow=row;
  var col=e.st===2?3:[0,2,1,2][Math.floor(e.t*(e.st===1?16:11))%4], bob=e.st===2?0:Math.sin(e.t*5)*3;
  rrDraw(c,'bat2',row,col,e.x,e.y+27+bob,row===1&&!!e.rrFl,e.fl>0&&!RM); return e.y-18+bob; }
/* slime: rows full / small; rest, squash, hop, landing, following its own 1 s hop cycle (still 0-0.4 s, hop 0.4-1 s) */
/* the wind-up (0.15-0.4 s) holds the squash frame and shakes a little; a sword hit squashes it for 0.1 s */
function drawSlimeRR(c,e){ if(!rrReady('slime2')) return null; var cyc=e.t%1, col=cyc<0.4?(cyc<0.1?3:cyc<0.15?0:1):cyc<0.75?2:0;   /* stretch on the way up, round on the way down */
  if(e.sq>0) col=1;
  var bob=e.st===1&&cyc>=0.4?-Math.sin((cyc-0.4)/0.6*Math.PI)*(e.small?6:10):0, foot=e.y+e.r+2, jx=e.wu&&!RM?(Math.floor(e.t*30)%2?1:-1):0;
  rrDraw(c,'slime2',e.small?1:0,col,e.x+jx,foot+bob,false,e.fl>0&&!RM); return foot-(e.small?16:30)+bob; }
/* landing marker: thin soft-pink ellipse where the hop lands. Fades in over the wind-up, out as it lands; still outline with reduced motion. */
function slimeMark(c,e){ var cyc=e.t%1, a=RM?0.8:e.wu?Math.min(1,(cyc-0.15)/0.25)*0.85:Math.max(0,Math.min(1,(1-cyc)/0.15))*0.85; if(a<=0.02) return;
  var rx=e.small?11:19, ry=Math.round(rx*0.45), x=Math.round(e.tx), y=Math.round(e.ty+e.r+2);
  c.save(); c.globalAlpha=a*0.22; c.fillStyle='#FD63AF'; c.beginPath(); c.ellipse(x,y,rx,ry,0,0,7); c.fill();
  c.globalAlpha=a; c.strokeStyle='#FD63AF'; c.lineWidth=2; c.beginPath(); c.ellipse(x,y,rx,ry,0,0,7); c.stroke(); c.restore(); }
/* goo splat: 3 frames over 0.6 s (ChatGPT art when present, simple pixel blocks otherwise), fading in the last frame */
function drawSplat(c,f){ var k=Math.min(2,Math.floor(f.t/0.2)), a=k<2?1:Math.max(0,1-(f.t-0.4)/0.2), s=f.sm?1:2;
  c.save(); c.globalAlpha=a;
  if(RRI.slime_splat){ c.imageSmoothingEnabled=false; c.drawImage(RRI.slime_splat,k*24,0,24,24,Math.round(f.x-12*s),Math.round(f.y-12*s),24*s,24*s); }
  else { var w2=[7,9,9][k]*s, h2=[3,4,3][k]*s, x=Math.round(f.x), y=Math.round(f.y);
    c.fillStyle='#0B0108'; c.fillRect(x-w2-s,y-h2-s,2*w2+2*s,2*h2+2*s); c.fillStyle=k<2?'#FD63AF':'#C63A80'; c.fillRect(x-w2,y-h2,2*w2,2*h2);
    c.fillStyle='#652246'; c.fillRect(x-w2,y+h2-s,2*w2,s); if(k<2){ c.fillStyle='#FEE6F3'; c.fillRect(x-w2+2*s,y-h2+s,2*s,s); } }
  c.restore(); }

/* ---------- cutscene: 12 s, in the engine, plays on new runs only ---------- */
var CUT=null, EAT={};
var PED={x:480,y:312}, TORCH=[[404,322],[556,322]];
function cutStart(){ var w=S.w, p=w.p; S.mode='cut';
  CUT={t:0, gob:{x:480,y:52,show:0}, skel:{a:0}, bits:[], gate:0, ped:0, relic:1, torch:[0,0], pulse:-1, cap:'', capT:0, cues:{}, eyes:0, shake:0};
  w.open=true; w.banner=null; p.x=480; p.y=H-40; p.fx=0; p.fy=-1; p.mv=false; p.walk=0; p.cutPose=null; p.inv=0; HELD={}; BUF.s=BUF.r=0;
  $('dn-skip').hidden=false; cine(true); bigCut(true); }
/* no game UI during a scene; it fades back in afterwards */
var HUDAT=0;
function cine(on){ document.body.classList.toggle('dn-cine',!!on); if(!on) HUDAT=performance.now(); }
var BIG=0;
function bigPlace(){ var a=$('dn-arena'); if(!BIG){ a.style.transform=''; return; } var s=Math.min(innerWidth/1920,innerHeight/1080);
  a.style.transition='none'; a.style.transform=''; var r=a.getBoundingClientRect(), k=Math.min(innerWidth/r.width,innerHeight/r.height), tx=(innerWidth-r.width*k)/2, ty=(innerHeight-r.height*k)/2;
  a.style.transform='translate('+((tx-r.left)/s)+'px,'+((ty-r.top)/s)+'px) scale('+k+')'; }
function bigCut(on){ var a=$('dn-arena'); BIG=on?1:0; document.body.classList.toggle('dn-big',!!on);
  if(on){ bigPlace(); void a.offsetWidth; } else { document.body.classList.add('dn-shrink'); a.style.transition=RM?'none':'transform .9s cubic-bezier(.65,0,.35,1)'; a.style.transform=''; setTimeout(function(){ if(!BIG) document.body.classList.remove('dn-shrink'); },RM?0:950); } }
addEventListener('resize',function(){ if(BIG) bigPlace(); });
function cue(k,at){ if(CUT.t>=at&&!CUT.cues[k]){ CUT.cues[k]=1; return true; } return false; }
function cutTick(dt){ if(!CUT||S.mode!=='cut') return; var w=S.w, p=w.p, C=CUT; C.t+=dt; var T=C.t;
  /* 0-3 s: Rook walks up to the relic */
  if(T<2.6){ p.mv=true; p.walk+=dt; p.y=H-40-(H-40-372)*Math.min(1,T/2.6); p.fx=0; p.fy=-1; } else { p.mv=false; p.y=372; }
  if(cue('cap1',0.3)){ C.cap='Just one relic.'; C.capT=0; }
  /* 3-5 s: the relic breaks into cyan pixels that fly into the gem on his shield */
  if(cue('relic',3.0)){ C.relic=0; SND.relic(); var nb=RM?10:34; for(var i=0;i<nb;i++) C.bits.push({x:PED.x+rnd(-8,8),y:PED.y-34+rnd(-8,8),vx:rnd(-60,60),vy:rnd(-90,-20),d:rnd(0,0.6),t:0}); }
  C.bits.forEach(function(b){ b.t+=dt; if(b.t<b.d) return; var tx=p.x-9, ty=p.y-26, k=Math.min(1,(b.t-b.d)/0.9); b.x+=(tx-b.x)*Math.min(1,dt*(2+8*k))+b.vx*dt*(1-k); b.y+=(ty-b.y)*Math.min(1,dt*(2+8*k))+b.vy*dt*(1-k); if(Math.hypot(tx-b.x,ty-b.y)<5) b.done=1; });
  C.bits=C.bits.filter(function(b){ return !b.done; });
  if(cue('pulse',4.4)){ C.pulse=0; SND.gem(); }
  if(C.pulse>=0) C.pulse+=dt;
  /* 5-8 s: the pedestal sinks, the gate slams, the torches go violet, a short shake */
  if(T>5) C.ped=Math.min(1,(T-5)/1.2);
  if(cue('gate',5.6)){ C.gate=1; SND.gate(); if(!RM) C.shake=0.28; p.fx=0; p.fy=1; }
  if(cue('t1',6.4)){ C.torch[0]=1; SND.torch(); } if(cue('t2',6.9)){ C.torch[1]=1; SND.torch(); }
  if(cue('back',7.6)){ p.fx=0; p.fy=-1; }
  if(C.shake>0) C.shake=Math.max(0,C.shake-dt);
  /* 8-10 s: red eyes, a goblin steps into the light, a skeleton waits behind it. Rook raises his shield */
  if(T>8) C.eyes=Math.min(1,(T-8)/0.4);
  if(cue('gob',8.5)){ C.gob.show=1; SND.snarl(); }
  if(C.gob.show&&T<9.7){ C.gob.y=52+(178-52)*Math.min(1,(T-8.5)/1.2); C.gob.walk=1; } else if(C.gob.show) C.gob.walk=0;
  if(T>9.0) C.skel.a=Math.min(1,(T-9.0)/0.5);
  if(T>9.3) p.cutPose=['rook_shield',0,1,false];
  /* 10-12 s: "Of course." The skeleton slips back into the dark, the door shuts, the HUD comes up */
  if(cue('cap2',10.0)){ C.cap='Of course.'; C.capT=0; }
  if(T>10.4) C.skel.a=Math.max(0,1-(T-10.4)/0.5);
  if(cue('door',10.9)){ w.open=false; SND.door(); }
  C.capT+=dt;
  if(T>=12) cutEnd(); }
/* skip and the natural end both land here, exactly once */
function cutEnd(){ if(S.mode!=='cut') return; var w=S.w, p=w.p, gx=480, gy=CUT&&CUT.gob.show?CUT.gob.y:178;
  w.open=false; p.cutPose=null; p.mv=false; p.x=480; p.y=372; p.fx=0; p.fy=-1; p.inv=Math.max(p.inv,0.6); p.cd=0.15; p.roll=0; p.rec=0;
  /* the goblin from the scene is real: it joins the first wave in place of one spawn */
  if(!w.cutGob){ w.cutGob=1; var g=spawnEnemy('gob',gx,gy); g.cd=3.0; g.st=0; if(w.waves[0]&&w.waves[0][0]&&w.waves[0][0][1]>1) w.waves[0]=[[w.waves[0][0][0],w.waves[0][0][1]-1]].concat(w.waves[0].slice(1)); }
  /* playtest handoff 2026-11-15: the controls stay up a little longer and the first wave waits for them; then the starter relic is dealt (dealStarter) */
  w.waveT=Math.max(w.waveT,2.8); w.banner={txt:ROOMS[w.rid].name.toUpperCase(),sub:ROOMS[w.rid].sub||'',t:3.0}; dealStarter();
  CUT=null; HELD={}; BUF.s=BUF.r=0; $('dn-skip').hidden=true; S.mode='play'; cine(false); bigCut(false); save(); }
function cutCam(){ if(!CUT||RM) return null; var T=CUT.t, k=T<10?0:Math.min(1,(T-10)/1.4), e=k*k*(3-2*k), z=1.12-0.12*e;
  var fy=T<7.8?330:330-80*Math.min(1,(T-7.8)/0.8); fy=fy+(270-fy)*e;
  var hh=H/(2*z); fy=Math.max(hh,Math.min(H-hh,fy)); return {z:z,x:480,y:fy}; }
function drawCutWorld(c,t){ var C=CUT; if(!C) return; var T=C.t;
  /* torches + glow */
  TORCH.forEach(function(tp,i){ var vi=C.torch[i], col=vi?'181,107,255':'255,170,80', fl=0.85+0.15*Math.sin(t*13+i*2);
    var g=c.createRadialGradient(tp[0],tp[1]-30,2,tp[0],tp[1]-30,70); g.addColorStop(0,'rgba('+col+','+(0.32*fl)+')'); g.addColorStop(1,'rgba('+col+',0)'); c.fillStyle=g; c.fillRect(tp[0]-70,tp[1]-100,140,140);
    c.fillStyle='#1B1626'; c.fillRect(tp[0]-3,tp[1]-26,6,26); c.fillStyle='#4A4058'; c.fillRect(tp[0]-9,tp[1]-30,18,6); c.fillStyle='#2A2236'; c.fillRect(tp[0]-7,tp[1]-2,14,4);
    var h=10+3*Math.sin(t*17+i); c.fillStyle=vi?'#7B3CFF':'#FF8A1E'; c.fillRect(tp[0]-6,tp[1]-30-h,12,h); c.fillStyle=vi?'#C9A2FF':'#FFD25A'; c.fillRect(tp[0]-3,tp[1]-30-h*0.7,6,h*0.7); });
  /* pedestal (sinks into the floor) */
  var sink=Math.round(C.ped*30); c.save(); c.beginPath(); c.rect(PED.x-30,PED.y-80,60,80); c.clip();
  c.fillStyle='#2B2C42'; c.fillRect(PED.x-16,PED.y-26+sink,32,26); c.fillStyle='#4C4F70'; c.fillRect(PED.x-19,PED.y-30+sink,38,6); c.fillStyle='#6E76A4'; c.fillRect(PED.x-19,PED.y-30+sink,38,2); c.fillStyle='#1A1B2C'; c.fillRect(PED.x-16,PED.y-6+sink,32,6);
  c.restore(); if(C.ped>0&&C.ped<1){ for(var d=0;d<3;d++){ c.fillStyle='rgba(110,118,164,.6)'; c.fillRect(PED.x-20+rnd(0,40),PED.y-2+rnd(-2,2),3,3); } }
  /* relic */
  if(C.relic){ var ry=PED.y-46+Math.sin(t*2.4)*3, gg=c.createRadialGradient(PED.x,ry,1,PED.x,ry,28); gg.addColorStop(0,'rgba(77,235,255,.55)'); gg.addColorStop(1,'rgba(77,235,255,0)'); c.fillStyle=gg; c.fillRect(PED.x-28,ry-28,56,56);
    c.fillStyle='#0E3A44'; c.beginPath(); c.moveTo(PED.x,ry-11); c.lineTo(PED.x+8,ry); c.lineTo(PED.x,ry+11); c.lineTo(PED.x-8,ry); c.fill(); c.fillStyle='#3CEBFF'; c.beginPath(); c.moveTo(PED.x,ry-9); c.lineTo(PED.x+6,ry); c.lineTo(PED.x,ry+9); c.lineTo(PED.x-6,ry); c.fill(); c.fillStyle='#E0FFFF'; c.fillRect(PED.x-2,ry-5,2,4); }
  /* south gate */
  if(C.gate&&T<5.72){ var gk=Math.min(1,(T-5.6)/0.12), gh=Math.round(50*gk), gx0=448, gy0=H-50; c.fillStyle='#14121C'; c.fillRect(gx0,gy0,64,gh); c.fillStyle='#5A5E7E'; for(var b=0;b<6;b++) c.fillRect(gx0+4+b*11,gy0,4,gh); c.fillRect(gx0,gy0+Math.max(0,gh-8),64,4); c.fillRect(gx0,gy0+Math.max(0,gh-30),64,3); }
  /* eyes in the north arch, then the goblin and the skeleton silhouette */
  if(C.eyes>0&&!C.gob.show){ c.fillStyle='rgba(255,196,40,'+C.eyes+')'; c.fillRect(470,50,4,3); c.fillRect(486,50,4,3); }
  if(C.skel.a>0&&rrReady('skela')){ c.globalAlpha=C.skel.a*0.92; rrDraw(c,'skela',0,0,480,92,false,'K'); c.globalAlpha=1;
    c.fillStyle='rgba(255,50,60,'+C.skel.a+')'; c.fillRect(473,60,3,3); c.fillRect(485,60,3,3); }
  if(C.gob.show&&rrReady('gobw')&&rrReady('goba')){ var gn=C.gob.walk?'gobw':'goba', gc=C.gob.walk?Math.floor((C.gob.y-52)/9)%4:1, lit=Math.min(1,(C.gob.y-52)/60);
    rrDraw(c,gn,0,gc,480,C.gob.y+14,false);
    if(lit<1){ c.globalAlpha=(1-lit)*0.88; rrDraw(c,gn,0,gc,480,C.gob.y+14,false,'K'); c.globalAlpha=1; } }
  /* cyan bits + gem pulse */
  c.fillStyle='#7DF5FF'; C.bits.forEach(function(b){ if(b.t>=b.d) c.fillRect(Math.round(b.x)-2,Math.round(b.y)-2,4,4); });
  if(C.pulse>=0&&C.pulse<0.6){ var pk=C.pulse/0.6, p=S.w.p; c.strokeStyle='rgba(77,235,255,'+(1-pk)+')'; c.lineWidth=3; c.beginPath(); c.arc(p.x,p.y-22,10+pk*60,0,7); c.stroke(); } }
function drawCutOverlay(c){ var C=CUT; if(!C||!C.cap) return; var al=Math.min(1,C.capT*3); if(C.cap==='Just one relic.'&&C.t>2.8) al=Math.max(0,1-(C.t-2.8)*3);
  c.globalAlpha=al; c.font=FT(C.cap,24); c.textAlign='center'; var tw=c.measureText('“'+C.cap+'”').width+44; c.fillStyle='rgba(7,8,18,.78)'; c.fillRect(W/2-tw/2,H-82,tw,42); c.fillStyle='#F3F5FF'; c.fillText('“'+C.cap+'”',W/2,H-52); c.globalAlpha=1;
  /* letterbox bars ease away in the last 1.4 s */
  var bar=C.t<10.6?26:26*Math.max(0,1-(C.t-10.6)/1.4); if(bar>0){ c.fillStyle='#04050B'; c.fillRect(0,0,W,bar); c.fillRect(0,H-bar,W,bar); } }
function hudAlpha(){ if(S.mode==='cut') return 0; if(S.mode==='endcut') return ECUT?Math.max(0,1-ECUT.t/0.5):0; return Math.max(0,Math.min(1,(performance.now()-HUDAT)/900)); }
function skipScene(){ if(S.mode==='cut') cutEnd(); }

/* ---------- ending scenes ----------
   escape: the horde turns to dust, the north door bursts open, Rook runs out.  ~6 s
   fall:   Rook goes down, the horde closes in, the camera pulls up and away.  ~6 s */
var ECUT=null;
function finishRun(win,kind){ if(S.over||S.mode==='endcut') return; var w=S.w, p=w.p;
  ['dn-qwrap','dn-pick'].forEach(function(id){ $(id).hidden=true; }); S.endWin=!!win; S.mode='endcut'; HELD={}; BUF.s=BUF.r=0;
  ECUT={t:0,kind:kind,dur:6.2,x0:p.x,y0:p.y,cues:{},cap:'',capT:0}; p.roll=0; p.sw=0; p.rec=0; p.cutPose=null; w.orbs=[]; w.rings=[]; w.shots=[]; w.spawns=[]; w.gems=[]; w.coinsF=[]; w.hearts=[]; w.en.forEach(function(e){ e.fl=0; });
  if(kind==='escape'){ w.rub=[]; } else { p.cutPose=['rook_idle',0,2,false]; w.rub=[]; }
  $('dn-skip').hidden=true; cine(true); save(); }
function ecue(k,at){ if(ECUT.t>=at&&!ECUT.cues[k]){ ECUT.cues[k]=1; return true; } return false; }
function endTick(dt){ if(!ECUT||S.mode!=='endcut') return; var w=S.w, p=w.p, E=ECUT, T=(E.t+=dt); E.capT+=dt;
  if(w.shake) w.shake=Math.max(0,w.shake-dt); stepFx(dt);
  w.en.forEach(function(e){ e.t+=dt; e.fl=0; });
  if(E.kind==='escape'){
    if(ecue('dust',0.2)){ var wl=0; w.en.forEach(function(e){ if(!e.dead){ if(e.type==='boss') wl=1; e.dead=true; if(w.fx.length<140) w.fx.push({k:'puff',x:e.x,y:e.y,t:0}); } }); if(wl) SND.bossDown(); else SND.slam(); if(!RM) w.shake=0.4; }   /* the death groan (Warden voice, 2026-11-15) only when a Warden is actually there to fall */
    if(!RM&&T<4&&Math.random()<dt*5&&w.fx.length<140) for(var b=0;b<5;b++) w.fx.push({k:'bit',x:rnd(60,W-60),y:rnd(60,H-60),vx:rnd(-60,60),vy:rnd(-120,0),t:0,c:'#8A92BE'});
    if(ecue('door',0.9)){ w.open=true; SND.door(); E.cap='Not today.'; E.capT=0; }
    if(T>1.3&&T<4.6){ var k=Math.min(1,(T-1.3)/3.0), tx=480, ty=-30, mx=k<0.4?(E.x0+(tx-E.x0)*(k/0.4)):tx, my=E.y0+(ty-E.y0)*k;
      var dx=mx-p.x, dy=my-p.y; p.mv=true; p.walk+=dt*1.4; if(Math.abs(dx)+Math.abs(dy)>0.5){ var dl=Math.hypot(dx,dy); p.fx=dx/dl; p.fy=dy/dl; } p.x=mx; p.y=my; }
    else if(T>=4.6) p.mv=false;
  } else {
    if(ecue('down',0.1)){ SYNTH.miss(); }
    if(ecue('more',0.3)){ for(var i=0;i<(RM?12:30);i++){ var a=Math.random()*6.28, d=rnd(300,520); var ty2=['gob','gob','skel','bat','slime','wiz'][i%6]; var e2=spawnEnemy(ty2,p.x+Math.cos(a)*d,p.y+Math.sin(a)*d*0.7,1); e2.st=0; e2.cd=99; } }
    var live=w.en.filter(function(e){ return !e.dead; });
    live.forEach(function(e,i){ e.st=0; e.stun=0; var a=Math.atan2(e.y-p.y,e.x-p.x)+0.0001*i, ring=Math.max(10,70-T*16)+(i%5)*6, tx=p.x+Math.cos(a)*ring, ty=p.y+Math.sin(a)*ring*0.8; e.x+=(tx-e.x)*Math.min(1,dt*1.6); e.y+=(ty-e.y)*Math.min(1,dt*1.6); });
    if(ecue('cap',1.6)){ E.cap='The Crooked Keep wins this time.'; E.capT=0; }
  }
  if(T>=E.dur) endCutEnd(); }
function endCutEnd(){ if(S.mode!=='endcut') return; var win=!!S.endWin; ECUT=null; $('dn-skip').hidden=true; cine(false); S.mode='play'; endRun(win); }
function endCam(){ if(!ECUT||RM) return null; var E=ECUT, T=E.t, p=S.w.p;
  if(E.kind==='escape'){ var z=1+0.1*Math.min(1,T/1.2), hh=H/(2*z), y=Math.max(hh,Math.min(H-hh,p.y)); return {z:z,x:Math.max(W/(2*z),Math.min(W-W/(2*z),p.x)),y:y}; }
  var k=Math.min(1,Math.max(0,(T-1.0)/4.2)), e2=k*k*(3-2*k), z2=1.45-0.45*e2, cy=E.y0-e2*170, hh2=H/(2*z2);
  return {z:z2,x:Math.max(W/(2*z2),Math.min(W-W/(2*z2),E.x0)),y:Math.max(hh2,Math.min(H-hh2,cy))}; }
function drawEndOverlay(c){ var E=ECUT; if(!E) return; var T=E.t;
  if(E.kind==='escape'&&S.w.open){ var g=c.createRadialGradient(W/2,0,4,W/2,0,260); g.addColorStop(0,'rgba(255,230,160,.55)'); g.addColorStop(1,'rgba(255,230,160,0)'); c.fillStyle=g; c.fillRect(W/2-260,0,520,260); }
  var bar=Math.min(26,T*60); c.fillStyle='#04050B'; c.fillRect(0,0,W,bar); c.fillRect(0,H-bar,W,bar);
  if(E.cap){ var al=Math.min(1,E.capT*3); c.globalAlpha=al; c.font=FT(E.cap,24); c.textAlign='center'; var tw=c.measureText('“'+E.cap+'”').width+44; c.fillStyle='rgba(7,8,18,.78)'; c.fillRect(W/2-tw/2,H-82,tw,42); c.fillStyle='#F3F5FF'; c.fillText('“'+E.cap+'”',W/2,H-52); c.globalAlpha=1; }
  var f=Math.max(0,(T-(E.dur-1.2))/1.2); if(f>0){ c.fillStyle=E.kind==='escape'?'rgba(255,240,205,'+f+')':'rgba(4,5,11,'+f+')'; c.fillRect(0,0,W,H); } }
SND.relic=function(){ [E5,G5,C6,E6].forEach(function(f,i){ tone(f,f*1.01,i*0.11,0.35,'sine',0.035); }); };
SND.gem=function(){ tone(C6,E6,0,0.3,'sine',0.04); };
SND.gate=function(){ noise(0,0.09,260,0,300); tone(90,55,0,0.35,'triangle',0.08); };
SND.snarl=function(){ tone(150,95,0,0.3,'sawtooth',0.018); };
try{ $('dn-start').style.backgroundImage='url('+RRTITLE+')'; }catch(e){}
/* the HUD wordmark (art/hud_pack, 112x20 art px drawn 3x); the typed title stays as the fallback */
try{ if(typeof RRWORD!=='undefined'){ var lg=document.querySelector('.dn-logo'); lg.classList.add('art'); lg.style.backgroundImage='url('+RRWORD+')'; } }catch(e){}
