#!/usr/bin/env python3
"""Burger Blaster remake v1 rules, applied on top of look_patch.py output.
Burgers = lives (start 10, +3 per fort clear, +1 for 3 stars), tray of 2 questions per fort (+1 spare after a miss),
right = special burger (max 2 per fort), streak multiplier x1/x1.5/x2, 10 forts from pools, 2-stage King's Castle,
no clock, no shop. Usage: rules_patch.py <look.html> <out.html> [version]"""
import sys
src, out = sys.argv[1], sys.argv[2]
VER = sys.argv[3] if len(sys.argv) > 3 else 'v1'
H = open(src, encoding='utf-8').read()

def rep(a, b, count=1):
    global H
    assert a in H, 'MISSING: ' + a[:90]
    H = H.replace(a, b, count)

# ---------- keys / state ----------
rep("PULL=140, VMAX=21,", "PULL=140, VMAX=23,")
rep("var KEY='burger_blaster_v1';", "var KEY='burger_blaster_v2';")
rep("ver:2, spec:[]", "ver:3, tray:null, won:false, order:null, loseAt:0, spec:[]")
rep("score:0, burgers:0, cash:0,", "score:0, burgers:START_BURGERS, cash:0,")
rep("if(v&&v.ver===2&&v.topics&&v.lv) return v;", "if(v&&v.ver===3&&v.topics&&v.lv) return v;")
rep("function haveBurger(){ return S.burgers>0||S.spec.length>0||buffOn('free'); }",
    """function haveBurger(){ return S.burgers>0; }
var START_BURGERS=11, CLEAR_BURGERS=1, STAR_BURGERS=1, TRAY_N=2, SPEC_MAX=2, NFORTS=10, BURGER_CAP=15, EXTRA_PTS=500;
/* add burgers up to the cap; extras turn into points (Kody 2026-11-26: a good aimer shouldn't pile up 20 burgers) */
function giveBurgers(n){ var g=Math.max(0,Math.min(n,BURGER_CAP-S.burgers)), x=n-g, pts=Math.round(x*EXTRA_PTS*mulNow()); S.burgers+=g; S.score+=pts; return {g:g,pts:pts}; }
function mulNow(){ return S.streak>=6?3:S.streak>=4?2:S.streak>=2?1.5:1; }
/* the run: fort 1 fixed, then shuffled pools, the Snack stand breather, then the King's Castle in two stages */
function makeOrder(seed){ var r=rng(seed);
  /* every fort is built fresh each run (Kody: same 10 forts = no reason to replay). Codes g0/g1/g2 = easy/medium/hard, gs = Snack stand, gc = castle */
  var o=[{d:'g0',first:1},{d:'g0'},{d:'g0',helm:0.4},{d:'g1',wind:1},{d:'g1',wind:r()<0.6?1:0},{d:'g2',helm:0.3},{d:'g2',helm:0.35,wind:1},{d:'g2',helm:0.4},{d:'gs'},{d:'gc',helm:0.3},{d:'king'}];
  o.forEach(function(f){ if(f.wind) f.wind=(r()<0.5?-1:1)*(0.02+r()*0.025); }); return o; }
function fortOf(n){ return (S.order&&S.order[n])||{d:'r9'}; }
function fortNum(n){ return Math.min(n+1,NFORTS); }
function isKing(n){ return fortOf(n).d==='king'; }""")
rep("function isBoss(n){ return n%5===4; }", "function isBoss(n){ return isKing(n); }")

# ---------- fort designs ----------
rep("function levelDef(n){ var d={statics:[],blocks:[],munchers:[],tip:''}, r=rng(S.seed+n*7919), helm=n<6?0:Math.min(0.45,0.15+0.04*(n-6));",
    """var FORT_HELM=0;
function levelDef(n){ var f=fortOf(n), code=f.d, dn=code==='king'?-1:code==='castle'?7:code==='shack'?100:code==='snack'?101:code==='g0'?(f.first?203:200):code==='g1'?201:code==='g2'?202:code==='gs'?204:code==='gc'?205:typeof code==='string'?8+(+code.slice(1)||0)*3+n:code;
  FORT_HELM=f.helm||0; var d=oldDef(dn,n); d.wind=f.wind||0; d.code=code; return d; }
function oldDef(n,slot){ var d={statics:[],blocks:[],munchers:[],tip:''}, r=rng(S.seed+(slot==null?n:slot*31+n)*7919), helm=FORT_HELM;""")
rep("if(isBoss(n)){ var bl=Math.floor(n/5);", "if(n<0){ var bl=0;")
rep("d.tip='Boss! Hit the King '+(3+Math.min(2,bl))+' times'; }",
    """d.tip='Feed the King: 3 hits!'; }
  else if(n===100){ /* fort 1: three open wooden huts, one Muncher each */
    hut(640,GY,'wood',140,110); hut(830,GY,'wood',140,110); t=hut(1000,GY,'wood',120,100,'wood',false); mun(1000,GY-MUNCH_R,0); d.tip='Feed all 3 Munchers!'; }
  else if(n===101){ /* the Snack stand: glass, junk and easy Munchers (a breather before the Castle) */
    t=hut(660,GY,'glass',150,100); t=hut(660,t,'glass',130,90); hut(880,GY,'glass',150,100); t=pyramid(1010,GY,2,'glass',false); mun(1010,t-MUNCH_R,0); tnt(770,GY); d.tip='Snack break! Smash the glass'; }""")

# ---------- firing: every shot costs a burger; specials are burgers the tray upgraded ----------
rep("var sp=loadedSpec(); if(S.spec.length) S.spec.shift(); else if(!buffOn('free')) S.burgers--;",
    "var sp=loadedSpec(); if(S.spec.length) S.spec.shift(); S.burgers--; lastInput=now();")
rep("function canFire(){ return S.started&&!S.over&&!S.clearing&&!!engine&&$('bl-shop').hidden&&haveBurger()&&now()-lastShotAt>450; }",
    "var lastInput=0, FASTSIM=false;\nfunction canFire(){ return S.started&&!S.over&&!S.clearing&&!S.tray&&!!engine&&haveBurger()&&(FASTSIM||now()-lastShotAt>450); }")
rep("function fire(a,pw){ if(!S.started||S.over) return false;\n  if(!haveBurger()){ outOfBurgers(); return false; }",
    "function fire(a,pw){ if(!S.started||S.over||S.tray) return false;\n  if(!haveBurger()){ outOfBurgers(); return false; }")
rep("function outOfBurgers(){ SND.empty(); var q=$('bl-q'); q.classList.remove('nudge'); void q.offsetWidth; q.classList.add('nudge'); dirty=true; }",
    "function outOfBurgers(){ SND.empty(); dirty=true; }")
rep("return S.spec.length?S.spec[0]:buffOn('spicy')?SPECS[S.shots%3]:null;", "return S.spec.length?S.spec[0]:null;")

# ---------- scoring: streak multiplier on every point ----------
rep("pts=Math.round(base*U('mult')*mul); S.score+=pts;", "pts=Math.round(base*U('mult')*mul*mulNow()); S.score+=pts;")

# ---------- clear: burgers back, win at the King ----------
rep("function finishClear(){ var st=S.lvStars||1, pts=Math.round([0,1000,1600,2500][st]*U('mult')); S.score+=pts; S.levels++; S.stars+=st; banner={t:0,text:'LEVEL CLEAR!',sub:'+'+pts+' points',stars:st}; SND.clear();",
    """function finishClear(){ if(S.won||S.over||S.paidLv===S.level) return; S.paidLv=S.level; var st=S.lvStars||1, pts=Math.round([0,1000,1600,2500][st]*mulNow()), code=fortOf(S.level).d; S.score+=pts; S.levels++; S.stars+=st;
  if(code==='king'){ var feast=5000+500*S.burgers; S.score+=feast; S.won=true; banner={t:0,text:'YOU FED THE KING!',sub:'Feast bonus +'+feast.toLocaleString(),stars:st}; SND.clear(); SND.win(); hud(); save(); setTimeout(function(){ if(!S.over) endRun(); },2600); return; }
  var back=CLEAR_BURGERS+(st===3?STAR_BURGERS:0), gb=giveBurgers(back); S.spec=[];
  banner={t:0,text:code==='castle'||code==='gc'?'THE GATE FELL!':'FORT CLEAR!',sub:(gb.g?'+'+gb.g+' burger'+(gb.g>1?'s':'')+' · ':'Burger pile full · ')+'+'+(pts+gb.pts).toLocaleString()+' points',stars:st}; SND.clear();""")
rep("function nextLevel(){ S.level++; S.clearing=false; S.world=null; buildLevel(false); save(); hud(); }",
    "function nextLevel(){ if(S.over) return; S.level++; S.clearing=false; S.world=null; buildLevel(false); save(); hud(); }")

# ---------- building a fort opens the tray ----------
rep("""levelStart=stepN; clearAt=0; nextAt=0; banner={t:0,text:isBoss(S.level)?'BOSS FORT':'FORT '+(S.level+1),sub:d.tip||munchers.length+' hungry Munchers'};""",
    """levelStart=stepN; clearAt=0; nextAt=0; S.wind=d.wind||0; var code=d.code; banner={t:0,text:code==='king'?'THE KING!':code==='castle'||code==='gc'?"THE CASTLE":code==='snack'||code==='gs'?'SNACK STAND':'FORT '+fortNum(S.level),sub:d.wind?'Wind! Watch the arrow':d.tip||munchers.length+' hungry Munchers'};""")
rep("if(!fromSnap){ S.world=null; S.lvShots=0; S.lvPar=d.par; } }",
    "if(!fromSnap){ S.world=null; S.lvShots=0; S.lvPar=d.par; S.spec=[]; if(S.started&&!S.over&&d.code!=='king') trayOpen(); } }")

# ---------- wind pushes flying burgers ----------
rep("flying=flying.filter(function(b){ var age=stepN-b.born, sp=Math.hypot(b.velocity.x,b.velocity.y);",
    "if(S.wind) flying.forEach(function(b){ if(stepN-b.born<240&&b.position.y<GY-40) M.Body.setVelocity(b,{x:b.velocity.x+S.wind,y:b.velocity.y}); });\n  flying=flying.filter(function(b){ var age=stepN-b.born, sp=Math.hypot(b.velocity.x,b.velocity.y);")

# ---------- out of burgers = run over ----------
rep("if(nextAt&&now()>nextAt){ nextAt=0; nextLevel(); }",
    "if(nextAt&&now()>nextAt){ nextAt=0; nextLevel(); }\n  checkOut();")
rep("function loop(t){", """function outNow(){ return S.started&&!S.over&&!S.clearing&&!S.tray&&S.burgers<=0&&!flying.length&&!booms.length&&munchers.some(function(m){ return m.state==='hungry'; }); }
function checkOut(){ if(!outNow()){ S.loseAt=0; return; } if(!S.loseAt){ S.loseAt=now()+(worldQuiet()?1400:4000); return; } if(now()>S.loseAt&&(worldQuiet()||now()>S.loseAt+4000)) endRun(); }
function loop(t){""")

# ---------- no clock ----------
rep("S.started=true; S.endAt=now()+S.len*60000; $('bl-start').hidden=true;\n  $('bl-nameinput').blur(); buildLevel(false); newQ(); save(); hud(); jingle(); });",
    "S.started=true; S.endAt=now()+864e5; S.order=makeOrder(S.seed); S.burgers=START_BURGERS; lastInput=now(); $('bl-start').hidden=true;\n  $('bl-nameinput').blur(); S.level=0; buildLevel(false); save(); hud(); jingle(); });")
rep("if(S.q&&!(FAST&&S.qDone)) showQ(); else newQ(); } }", "if(S.tray) trayRender(); } }")

# ---------- end screen ----------
rep('<p class="bl-sub" style="margin:0">Time!</p>', '<p class="bl-sub" style="margin:0" id="bl-endwhy">Out of burgers!</p>')
rep("function showEnd(celebrate){ $('bl-endname').textContent=S.name;",
    "function showEnd(celebrate){ $('bl-endwhy').textContent=S.won?'You fed the King!':'Out of burgers at '+(fortOf(S.level).d==='castle'||fortOf(S.level).d==='king'?\"the King's Castle\":'fort '+fortNum(S.level))+'!'; $('bl-endname').textContent=S.name;")
rep("['Levels · stars',S.levels+' · '+S.stars+'★']", "['Forts cleared',S.levels+' · '+S.stars+'★']")
rep("if(celebrate&&S.score>0){ SND.win();", "if(celebrate&&S.won){")

# ---------- keys: WASD = arrows, 1-4 answer the tray, Enter/Space go on ----------
rep("if(k==='s'){ e.preventDefault(); openShop($('bl-shop').hidden); return; }\n  if(/^[1-4]$/.test(e.key)){ answer(+e.key-1); return; }\n  if(e.key==='Enter'){ if(S.qDone&&!$('bl-next').disabled&&!FAST){ e.preventDefault(); newQ(); } return; }",
    "lastInput=now();\n  if(/^[1-4]$/.test(e.key)){ trayAnswer(+e.key-1); return; }\n  if(e.key==='Enter'){ if(S.tray){ e.preventDefault(); trayNext(); } return; }")
rep("if(e.key===' '){ e.preventDefault(); if(!e.repeat&&S.started&&!S.over&&$('bl-shop').hidden&&!activate()) fire(S.aim[0],S.aim[1]); return; }\n  var arr={ArrowUp:[2,0],ArrowDown:[-2,0],ArrowRight:[0,0.03],ArrowLeft:[0,-0.03]}[e.key];",
    "if(e.key===' '){ e.preventDefault(); if(e.repeat) return; if(S.tray){ trayNext(); return; } if(S.started&&!S.over&&!activate()) fire(S.aim[0],S.aim[1]); return; }\n  var arr={ArrowUp:[2,0],ArrowDown:[-2,0],ArrowRight:[0,0.03],ArrowLeft:[0,-0.03],w:[2,0],s:[-2,0],d:[0,0.03],a:[0,-0.03]}[e.key.length===1?k:e.key];")
rep("cv.addEventListener('pointerdown',function(e){ if(!S.started||S.over) return;", "cv.addEventListener('pointerdown',function(e){ lastInput=now(); if(!S.started||S.over||S.tray) return;")

# ---------- HUD: real multiplier, fort number, wind arrow, idle nudge ----------
rep("canvasText('FORT '+(S.level+1)+' of 10',W/2,70,58,'#FFF4DC');",
    "var fc=fortOf(S.level).d; canvasText(fc==='king'?'THE KING':'FORT '+fortNum(S.level)+' of '+NFORTS,W/2,70,58,'#FFF4DC');\n    if(S.wind){ var wl=Math.abs(S.wind)*2400, wd=S.wind>0?1:-1, wy=162; cx.save(); cx.lineCap='round'; cx.strokeStyle='#2B1B14'; cx.lineWidth=14; cx.beginPath(); cx.moveTo(W/2-wd*wl/2,wy); cx.lineTo(W/2+wd*wl/2,wy); cx.stroke(); cx.strokeStyle='#FFF4DC'; cx.lineWidth=7; cx.stroke(); cx.fillStyle='#FFF4DC'; cx.strokeStyle='#2B1B14'; cx.lineWidth=4; cx.beginPath(); cx.moveTo(W/2+wd*(wl/2+24),wy); cx.lineTo(W/2+wd*(wl/2-6),wy-18); cx.lineTo(W/2+wd*(wl/2-6),wy+18); cx.closePath(); cx.fill(); cx.stroke(); cx.restore(); canvasText('WIND',W/2-wd*(wl/2+50),wy+16,30,'#FFF4DC'); }")
rep("var mul=window.__lookMul||'x1.5'; canvasText(mul,W-34,124,44,'#FFC93D','right'); }",
    "var mn=mulNow(); canvasText('x'+mn+(mn<3?'  ·  streak '+S.streak:''),W-34,124,mn>1?44:34,mn>1?'#FFC93D':'#FFF4DC','right');\n    if(canFire()&&!flying.length&&!drag&&now()-lastInput>8000){ var bob=Math.sin(t/220)*6; canvasText('Pull back to fling!',SL.x+40,SL.y-170+bob,48,'#FFF4DC','left'); } }")
rep("""var nb=Math.max(0,Math.min(S?S.burgers-(ready?1:0):0,12));""", """var nb=Math.max(0,Math.min(S?S.burgers-S.spec.length-(ready&&!S.spec.length?1:0):0,12));""")
rep("""if(S&&S.started) canvasText('×'+Math.max(0,S.burgers),""", """if(S&&S.started) canvasText('×'+Math.max(0,S.burgers)+(S.burgers===1?' LAST ONE!':''),""")

# ---------- the tray ----------
TRAY = r"""
/* ================= THE TRAY: 2 questions before each fort (+1 spare after a miss) ================= */
function trayOpen(){ S.tray={res:[],q:QS?QS.next():null,done:false,picked:-1,n:0}; drag=null; trayShownAt=now(); save(); trayRender(); }
function trayTotal(){ var t=S.tray; return t.res.indexOf('no')>=0&&t.res.length>=TRAY_N?TRAY_N+1:TRAY_N; }
function traySpecials(){ return S.tray.res.filter(function(x){ return x==='ok'; }).length; }
function trayRender(){ var t=S.tray, el=$('bb-tray'); if(!t||!t.q){ el.hidden=true; return; } var q=t.q, tot=Math.max(trayTotal(),t.res.length+(t.done?0:1));
  var slots=[]; for(var i=0;i<tot;i++) slots.push(t.res[i]||'');
  var foot=!t.done?'Right answer = special burger (up to '+SPEC_MAX+'). Wrong = it stays plain. You keep every burger.'
    : q.choices[t.picked].ok?'<em>Right! '+(traySpecials()<=SPEC_MAX?'A special burger is loaded.':'')+'</em> <span class="nx">Space or Enter ›</span>'
    : '<span class="bad">Not quite.</span> '+missText(q.choices[t.picked].why,q.explain)+' <span class="nx">Space or Enter ›</span>';
  el.innerHTML='<div class="hd"><span class="ttl">LOAD YOUR BURGERS!</span><div class="slots">'+slots.map(function(s,i){ return '<div class="slot '+s+(i>=TRAY_N?' spare':'')+(t.done&&s==='ok'&&i===t.res.length-1&&now()-trayAnsAt<600?' pop':'')+'"><canvas width="84" height="84" data-s="'+s+'" data-i="'+i+'"></canvas></div>'; }).join('')+'</div></div>'
    +'<div class="qn">'+(t.res.length>=TRAY_N&&!t.done||t.res.length>TRAY_N?'Spare question':'Question '+Math.min(t.res.length+(t.done?0:1),TRAY_N)+' of '+TRAY_N)+'</div><div class="body"><div class="vis">'+(q.visual||'')+'</div><div class="rt"><div class="pr">'+q.prompt+'</div><div class="ch">'
    +q.choices.map(function(c,i){ var cl=t.done&&c.ok?' right':t.done&&i===t.picked?' wrong':t.done?' dim':''; return '<button class="c'+cl+'" data-i="'+i+'"'+(t.done?' disabled':'')+'><b>'+(i+1)+'</b><span>'+c.html+'</span></button>'; }).join('')+'</div></div></div>'
    +'<div class="foot">'+foot+'</div><div class="nudgetip">Pick an answer: 1-4</div>';
  el.hidden=false; var sn=0;
  Array.prototype.forEach.call(el.querySelectorAll('canvas'),function(cv2){ var g=cv2.getContext('2d'), s=cv2.dataset.s, keep=cx; cx=g; g.clearRect(0,0,84,84);
    if(s==='ok'){ drawAmmo(SPECS[(S.specN-traySpecials()+sn)%3],42,46,24,0,0); sn++; } else if(s==='no') drawBurger(42,46,24,0,0.6); else { g.globalAlpha=0.3; drawBurger(42,46,24,0); g.globalAlpha=1; } cx=keep; }); }
var trayT=0, trayLock=0, trayReadyAt=0, trayShownAt=0, trayAnsAt=0;
setInterval(function(){ var el=document.getElementById('bb-tray'); if(!el) return; var on=!!(S&&S.tray&&!S.tray.done&&!S.over&&now()-Math.max(trayShownAt,lastInput)>15000); el.classList.toggle('nudge',on); },500);
/* the wrong answer's note and the explanation often start the same way: show it once */
function missText(w,e){ w=w||''; e=e||''; var pw=w.replace(/<[^>]*>/g,'').trim(), pe=e.replace(/<[^>]*>/g,'');
  if(pw&&pe.indexOf(pw.replace(/[.!]+$/,'').slice(0,28))>=0) return e; return (w+' '+e).trim(); }
function trayAnswer(i){ var t=S.tray; if(!t||t.done||!t.q||S.over||(now()<trayReadyAt&&!FASTSIM)) return; var c=t.q.choices[i]; if(!c) return; t.done=true; trayAnsAt=now(); t.picked=i; S.answered++;
  if(!S.topics[t.q.topic]) S.topics[t.q.topic]=[0,0]; S.topics[t.q.topic][1]++;
  if(c.ok){ S.correct++; S.topics[t.q.topic][0]++; S.streak++; S.best=Math.max(S.best,S.streak); t.res.push('ok');
    if(traySpecials()<=SPEC_MAX&&S.spec.length<Math.max(0,S.burgers)){ S.spec.push(SPECS[S.specN++%3]); setTimeout(SND.special,200); } SND.correct(); }
  else { S.streak=0; t.res.push('no'); SND.miss(); }
  trayLock=now()+(c.ok?250:(FAST?600:1200)); save(); trayRender(); hud();
  clearTimeout(trayT); if(c.ok) trayT=setTimeout(function tick(){ if(document.hidden){ trayT=setTimeout(tick,500); return; } if(S.tray&&S.tray.done) trayNext(true); },FAST?500:900); }
function trayNext(auto){ var t=S.tray; if(!t||!t.done) return; if(!auto&&now()<trayLock) return; clearTimeout(trayT);
  var more=t.res.length<TRAY_N||(t.res.length===TRAY_N&&t.res.indexOf('no')>=0);
  if(more){ t.q=QS.next(); t.done=false; t.picked=-1; if(auto) trayReadyAt=now()+350; trayShownAt=now(); save(); trayRender(); return; }
  var perfect=t.res.length===TRAY_N&&t.res.every(function(x){ return x==='ok'; });
  S.tray=null; $('bb-tray').hidden=true; if(perfect){ var pb=giveBurgers(1); toast(pb.g?'2 for 2! +1 burger':'2 for 2! Pile full: +'+pb.pts+' points'); }
  lastInput=now(); save(); hud(); dirty=true; if(banner) banner.t=Math.min(banner.t,20); }
$('bb-tray').addEventListener('click',function(e){ var b=e.target.closest('.c'); if(b&&!b.disabled){ trayAnswer(+b.dataset.i); return; } if(S.tray&&S.tray.done) trayNext(); });
"""
GEN=r"""
  else if(n>=200){ /* a fresh fort every run, built from pieces. tier 0 easy, 1 medium, 2 hard; 203 = fort 1 (open huts), 204 = Snack stand (glass), 205 = castle */
    var kind=n-200, tier=kind===3||kind===4?0:kind===5?2:kind, cap=[4,5,6][tier], lo=kind===3?3:tier===2?3:2, tries=0, tip='';
    var mat=function(){ var v=r(); if(kind===4) return 'glass'; if(kind===3) return v<0.75?'wood':'glass'; return tier===0?(v<0.6?'wood':'glass'):tier===1?(v<0.45?'wood':v<0.78?'glass':'stone'):(v<0.38?'wood':v<0.66?'glass':'stone'); };
    var P={ /* each piece: [visual width, build(left x)] */
      hut:function(){ return [160,function(x){ hut(x+80,GY,mat(),140,100+r()*20); }]; },
      stack:function(){ return [160,function(x){ t=hut(x+80,GY,mat(),140,105); t=hut(x+80,t,mat(),120,95); mun(x+80,t-MUNCH_R); if(r()<0.5) rock(x+80,t); }]; },
      pyramid:function(){ var rows=tier?3+Math.floor(r()*2):3; return [rows*BOX,function(x){ var tb=kind!==3&&r()<0.7; t=pyramid(x+rows*BOX/2,GY,rows,r()<0.25?'glass':'wood',tb); mun(x+rows*BOX/2,t-MUNCH_R); if(tb) tip='Hit the TNT!'; }]; },
      pillars:function(){ return [170,function(x){ t=pillar(x+40,GY,'wood',150+r()*100,76); mun(x+40,t-MUNCH_R); t=pillar(x+130,GY,mat(),180+r()*110,76); mun(x+130,t-MUNCH_R); }]; },
      hill:function(){ return [150,function(x){ t=plat(x+75,140,130+Math.floor(r()*(70+tier*60))); t=hut(x+75,t,mat(),120,100); if(r()<0.6){ rock(x+75,t); tip='Roll the boulder!'; } }]; },
      tnthut:function(){ return [170,function(x){ tnt(x+85,GY); t=hut(x+85,GY,mat(),150,100,null,false); t=tnt(x+85,t); mun(x+85,t-MUNCH_R); tip='Hit the TNT!'; }]; },
      tower:function(){ var fl=2+tier+Math.floor(r()*2); return [170,function(x){ t=GY; for(var i=0;i<fl;i++){ var base=t, m=mat(); t=hut(x+85,t,m,150,95,m,false); if(i%2===0||i===fl-1) mun(x+85,base-MUNCH_R); } if(r()<0.7) rock(x+85,t); tip='Knock the tower down!'; }]; },
      bridge:function(){ return [430,function(x){ var m=r()<0.5?'glass':'wood', fl=1+(tier>0&&r()<0.6?1:0); t=GY; t2=GY; for(var i=0;i<fl;i++){ t=hut(x+75,t,m,130,110); t2=hut(x+355,t2,m,130,110); }
          blk('wood',x+215,Math.min(t,t2)-ROOF/2,400,ROOF); mun(x+160,Math.min(t,t2)-ROOF-MUNCH_R); mun(x+270,Math.min(t,t2)-ROOF-MUNCH_R); tnt(x+215,GY); tip='Bring the bridge down!'; }]; },
      dominoes:function(){ var k=4+(r()<0.5?1:0); return [k*96+20,function(x){ for(var i=0;i<k;i++){ t=pillar(x+48+i*96,GY,r()<0.25?'glass':'wood',160+i*(25+r()*20),90); if(i%2===1||i===k-1) mun(x+48+i*96,t-MUNCH_R); } tnt(x+96,GY); tip='Topple the dominoes!'; }]; },
      wall:function(){ return [430,function(x){ var h=180+Math.floor(r()*60); blk('stone',x+20,GY-h/2,40,h); blk('stone',x+410,GY-h/2,40,h); blk('wood',x+215,GY-h-ROOF/2,430,ROOF); t=GY-h-ROOF;
          tnt(x+130,GY); tnt(x+300,GY); mun(x+215,GY-MUNCH_R,0); hut(x+215,t,r()<0.5?'glass':'wood',130,100); rock(x+40,t); rock(x+390,t); mun(x+105,t-MUNCH_R); mun(x+325,t-MUNCH_R); tip='Storm the castle!'; }]; },
      stilts:function(){ return [210,function(x){ var h=200+Math.floor(r()*70); blk('wood',x+30,GY-h/2,POST,h); blk(r()<0.5?'wood':'glass',x+180,GY-h/2,POST,h); blk('wood',x+105,GY-h-ROOF/2,220,ROOF); t=GY-h-ROOF;
          t=hut(x+105,t,mat(),130,95); if(r()<0.6) rock(x+105,t); mun(x+105,GY-MUNCH_R,0); tip='Knock out the legs!'; }]; },
      bunker:function(){ return [310,function(x){ var h=115; blk('stone',x+20,GY-h/2,40,h); blk('stone',x+290,GY-h/2,40,h); blk('stone',x+155,GY-h-ROOF/2,310,ROOF); t=GY-h-ROOF;
          mun(x+105,GY-MUNCH_R,0); mun(x+205,GY-MUNCH_R,0); t=pyramid(x+155,t,2,'glass',false); mun(x+155,t-MUNCH_R); tnt(x+155,GY); tip='Crack the bunker!'; }]; },
      sky:function(){ var fl=4+(r()<0.5?1:0); return [160,function(x){ t=GY; for(var i=0;i<fl;i++){ var base=t, m=i%2?'glass':'wood'; t=hut(x+80,t,m,140,90,m,false); if(i%2===0) mun(x+80,base-MUNCH_R,i===fl-1?1:null); } rock(x+80,t); tip='Topple the skyscraper!'; }]; } };
    var small=kind===3?['hut','hut','stack','pillars']:kind===4?['hut','stack','pyramid','tower']:tier===0?['hut','stack','pyramid','pillars','tnthut','tower','hill']:['stack','pyramid','pillars','tnthut','tower','hill','sky','stilts'];
    var big=kind===5?['wall']:kind===3?[]:tier===0?['bridge','dominoes']:tier===1?['bridge','dominoes','wall','stilts','bunker']:['stilts','bunker','sky','wall','stilts','bunker','bridge','dominoes'];
    do { d.blocks=[]; d.munchers=[]; d.statics=[]; tip=''; x=548+r()*18; var pieces=[], end=1046;
      if(big.length&&(kind===5||r()<(tier===0?0.3:tier===1?0.45:0.6))){ var bp=P[big[Math.floor(r()*big.length)]](); if(x+bp[0]<=end){ pieces.push(bp); } }
      var room=end-x-pieces.reduce(function(a,p){ return a+p[0]+14; },0), guard=0;
      while(room>=150&&guard++<12){ var pp=P[small[Math.floor(r()*small.length)]](); if(pp[0]<=room){ pieces.push(pp); room-=pp[0]+14; } }
      for(var i=pieces.length-1;i>0;i--){ var j=Math.floor(r()*(i+1)), tmp=pieces[i]; pieces[i]=pieces[j]; pieces[j]=tmp; }
      var gap=Math.max(10,room/(pieces.length+1)); x+=Math.min(gap,30)*r();
      pieces.forEach(function(p){ p[1](x); x+=p[0]+Math.max(10,Math.min(40,gap*r()*1.5)); });
      while(d.munchers.length>cap) d.munchers.splice(Math.floor(r()*d.munchers.length),1);
    } while(d.munchers.length<lo&&++tries<6);
    if(kind===4){ d.blocks.forEach(function(b){ if(b.m==='stone'||b.m==='wood') b.m='glass'; }); tip='Snack break! Smash the glass'; }
    d.tip=tip||(kind===3?'Feed every Muncher!':tier===2?'Big fort! Find the weak spot':'Feed every Muncher!'); }
  else switch(n){"""
rep("\n  else switch(n){", GEN)
rep("if(S.clearing){ S.clearing=false; S.level++; S.world=null; buildLevel(false); } else buildLevel(true);",
    "if(S.clearing){ buildLevel(true); var kingWas=fortOf(S.level).d==='king'; if(S.paidLv!==S.level) finishClear(); if(S.won||kingWas){ S.won=true; banner=null; endRun(); } else { nextAt=0; S.clearing=false; S.level++; S.world=null; buildLevel(false); save(); } } else buildLevel(true);")
rep("/* ================= START / END ================= */", TRAY + "/* ================= START / END ================= */")
rep(".bb-tray .foot em{ font-style:normal; color:#2E8B2E; font-weight:800; }",
    ".bb-tray .foot em{ font-style:normal; color:#2E8B2E; font-weight:800; } .bb-tray .foot .bad{ color:#B8452E; font-weight:800; } .bb-tray .foot .nx{ float:right; color:#2B1B14; font-weight:800; animation:bbnx 1.1s ease-in-out 3s infinite alternate; } @keyframes bbnx{ to{ color:#C2410C; } }\n.bb-tray.nudge{ animation:bbnudge 1.2s ease-in-out infinite; } @keyframes bbnudge{ 50%{ transform:translate(-50%,calc(-50% - 10px)) rotate(-1deg); } } .bb-tray .nudgetip{ display:none; } .bb-tray.nudge .nudgetip{ display:block; position:absolute; left:50%; top:-64px; transform:translateX(-50%); background:#2B1B14; color:#FFF4DC; font:800 30px/1 var(--body); padding:12px 22px; border-radius:14px; white-space:nowrap; }\n@media (prefers-reduced-motion: reduce){ .bb-tray.nudge{ animation:none; } }\n.bb-tray .slot.pop{ animation:bbpop .38s cubic-bezier(.34,1.56,.64,1); box-shadow:0 0 0 6px rgba(255,197,61,.55); } @keyframes bbpop{ 0%{ transform:scale(.55); } 100%{ transform:scale(1); } }\n.bb-tray button.c{ font:inherit; color:#2B1B14; text-align:left; cursor:pointer; font:800 44px/1 var(--body); } .bb-tray button.c:hover:not(:disabled){ transform:translate(-2px,-2px); box-shadow:8px 8px 0 #2B1B14; } .bb-tray .c.dim{ opacity:.45; }\n.bb-tray .slot.spare{ border-color:#E2A93A; } .bb-tray{ cursor:default; }")


# ---------- v3: Kody's 3 picks (2026-11-26) ----------
# shorter fort-clear wait (0.9 s + 2.3 s -> 0.6 s + 1.5 s); Space or a click skips it
rep("nextAt=now()+2300; hud(); save(); }", "nextAt=now()+1500; hud(); save(); }")
rep("clearAt=now()+900;", "clearAt=now()+600;")
rep("function nextLevel(){", "function skipClear(){ if(!S.clearing||S.won||S.over) return false; if(S.paidLv!==S.level){ clearAt=0; finishClear(); } if(S.won) return true; nextAt=0; nextLevel(); return true; }\nfunction nextLevel(){")
# the first shot of each fort needs an aim change or a drag (a masher can't just tap Space)
rep("if(!fromSnap){ S.world=null; S.lvShots=0;", "if(!fromSnap){ S.world=null; S.aimed=false; S.lvShots=0;")
rep("if(e.key===' '){ e.preventDefault(); if(e.repeat) return; if(S.tray){ trayNext(); return; } if(S.started&&!S.over&&!activate()) fire(S.aim[0],S.aim[1]); return; }",
    "if(e.key===' '){ e.preventDefault(); if(e.repeat) return; if(S.tray){ trayNext(); return; } if(skipClear()) return; if(S.started&&!S.over&&!activate()){ if(!S.aimed&&canFire()){ aimNag=now(); dirty=true; SND.tick&&SND.tick(); return; } fire(S.aim[0],S.aim[1]); } return; }")
rep("if(arr){ e.preventDefault(); if(S.started&&!S.over){ S.aim=", "if(arr){ e.preventDefault(); if(S.started&&!S.over){ S.aimed=true; S.aim=")
rep("cv.addEventListener('pointerdown',function(e){ lastInput=now(); if(!S.started||S.over||S.tray) return;", "cv.addEventListener('pointerdown',function(e){ lastInput=now(); if(!S.started||S.over||S.tray) return; if(skipClear()) return;")
rep("drag={start:cvPt(e),cur:cvPt(e),id:e.pointerId};", "S.aimed=true; drag={start:cvPt(e),cur:cvPt(e),id:e.pointerId};")
rep("if(canFire()&&!flying.length&&!drag&&now()-lastInput>8000){", "if(canFire()&&!S.aimed&&now()-aimNag<2200){ var bob2=Math.sin(t/120)*4; canvasText('Aim first! Arrows/WASD or drag',SL.x+40,SL.y-170+bob2,44,'#FFF4DC','left'); }\n    else if(canFire()&&!flying.length&&!drag&&now()-lastInput>8000){")
rep("var drag=null;", "var drag=null, aimNag=0;")

# ---------- v6 (2026-11-26, Kody: balance + game feel "all but 2") ----------
# shorter wait after the last burger (was up to ~8 s), King win skippable after 1 s
rep("S.loseAt=now()+(worldQuiet()?1400:4000); return; } if(now()>S.loseAt&&(worldQuiet()||now()>S.loseAt+4000)) endRun(); }",
    "S.loseAt=now()+(worldQuiet()?900:1800); return; } if(now()>S.loseAt&&(worldQuiet()||now()>S.loseAt+1200)) endRun(); }")
rep("S.won=true; banner={t:0,text:'YOU FED THE KING!'", "S.won=true; wonAt=now(); banner={t:0,text:'YOU FED THE KING!'")
rep("function skipClear(){ if(!S.clearing||S.won||S.over) return false;", "var wonAt=0;\nfunction skipClear(){ if(S.won&&!S.over){ if(now()-wonAt>1000) endRun(); return true; } if(!S.clearing||S.over) return false;")
# kind line after a rough run
rep("  var acc2=S.answered?Math.round(100*S.correct/S.answered):0;", "  var acc2=S.answered?Math.round(100*S.correct/S.answered):0; if(!S.won&&(acc2<50||S.levels<3)) $('bl-endwhy').textContent+=' Every fort makes you better. Try again!';")
# mid-shot: arrow keys and M don't save while a burger is flying (a refresh can't keep points from a fort that resets)
rep("S.aimed=true; S.aim=[Math.max(-20,Math.min(85,S.aim[0]+arr[0])),Math.round(Math.max(0.15,Math.min(1,S.aim[1]+arr[1]))*1000)/1000]; dirty=true; save(); }",
    "S.aimed=true; S.aim=[Math.max(-20,Math.min(85,S.aim[0]+arr[0])),Math.round(Math.max(0.15,Math.min(1,S.aim[1]+arr[1]))*1000)/1000]; dirty=true; if(!flying.length&&worldQuiet()) save(); }")
rep("if(k==='m'){ e.preventDefault(); muted=!muted; save();", "if(k==='m'){ e.preventDefault(); muted=!muted; if(!flying.length&&worldQuiet()) save(); else try{ localStorage.setItem(KEY+'_mute',muted?'1':'0'); }catch(err){}")

# ===== game feel (presentation only: never touches rules, scores or the physics of a shot) =====
rep("var comboAt=-999, shake=0,", """/* juice: hit-stop and slow motion scale how fast the render loop feeds the physics (real time); bots step physics directly */
var J={stopUntil:0,slowUntil:0,mulPop:0,lastMul:1,pilePop:0,fly:[],dustStep:{}};
function juiceRate(){ var n=now(); if(n<J.stopUntil) return 0.05; if(n<J.slowUntil&&!RM) return 0.4; return 1; }
function juiceBurst(x,y,n,cols,sp){ for(var i=0;i<n;i++){ if(parts2.length>150) break; var a=Math.random()*6.28, v=(sp||5)*(0.5+Math.random()); parts2.push({x:x,y:y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-2.5,s:5+Math.random()*7,c:cols[i%cols.length],life:0,max:26+Math.random()*14,r:Math.random()*6}); } }
function juice(tier,x,y){ var n=now(), T={small:[0,1.5,4],medium:[50,4,10],large:[120,9,26]}[tier]; J.stopUntil=Math.max(J.stopUntil,n+T[0]); if(!RM) shake=Math.max(shake,T[1]);
  juiceBurst(x,y,T[2],['#FFC53D','#FF8A3D','#7BC043','#FFF4DC'],tier==='large'?7:5); dirty=true; }
var comboAt=-999, shake=0,""")
rep("acc+=dt; var n=0;", "acc+=dt*juiceRate(); var n=0;")
# feeding a Muncher (medium), the last one in a fort (large + slow motion), King hits (large)
rep("kill.push(m); if(!munchers.some(function(x){ return x.state==='hungry'; })) levelClear(); }",
    "kill.push(m); var last=!munchers.some(function(x){ return x.state==='hungry'; }); juice(last||m.king?'large':'medium',m.position.x,m.position.y-20); if(last){ J.slowUntil=now()+650; } if(last) levelClear(); }")
rep("function hitKing(m,how){ if(stepN-m.lastHit<20) return; m.lastHit=stepN; m.hp--; m.ouch=1; SND.king();",
    "function hitKing(m,how){ if(stepN-m.lastHit<20) return; m.lastHit=stepN; m.hp--; m.ouch=1; SND.king(); if(m.hp>0) juice('large',m.position.x,m.position.y-40);")
# dust puff on a hard burger hit
rep("    hurt(a,b,rel); hurt(b,a,rel); }); }",
    "    var bg=a.kind==='burger'?a:b.kind==='burger'?b:null; if(bg&&rel>6&&(J.dustStep[bg.id]||-99)<stepN-12){ J.dustStep[bg.id]=stepN; var sp=p.collision.supports&&p.collision.supports[0]||bg.position; juiceBurst(sp.x,sp.y,5,['#C9B79C','#E8DCC4','#A8957A'],3); if(!RM) shake=Math.max(shake,1.5); }\n    hurt(a,b,rel); hurt(b,a,rel); }); }")
# slingshot snap: a puff and a tiny kick when the burger leaves
rep("  SND.launch(); save(); hud(); return true; }", "  SND.launch(); juiceBurst(SL.x,SL.y,6,['#FFF4DC','#FFE08A'],4); if(!RM) shake=Math.max(shake,2); save(); hud(); return true; }")
# +1 burgers fly into the pile; the count pops
rep("function giveBurgers(n){ var g=Math.max(0,Math.min(n,BURGER_CAP-S.burgers)), x=n-g, pts=Math.round(x*EXTRA_PTS*mulNow()); S.burgers+=g; S.score+=pts;",
    "function giveBurgers(n){ var g=Math.max(0,Math.min(n,BURGER_CAP-S.burgers)), x=n-g, pts=Math.round(x*EXTRA_PTS*mulNow()); S.burgers+=g; S.score+=pts; for(var gi=0;gi<g;gi++) J.fly.push({t:-gi*0.15}); if(g) J.pilePop=now()+150*g;")
# HUD stays still: shake only the world layer
rep("  /* top-left: level and Munchers left */", "  c.setTransform(1,0,0,1,0,0);\n  /* flying +1 burgers (real time) */\n  J.fly=J.fly.filter(function(f){ f.t+=1/60; if(f.t<0) return true; var k=Math.min(1,f.t/0.6), e=1-Math.pow(1-k,3), x0=W/2, y0=330, x1=SL.x+120, y1=GY-60; drawBurger(x0+(x1-x0)*e,y0+(y1-y0)*e-Math.sin(k*Math.PI)*140,30,k*6); if(k>=1){ J.pilePop=now(); SND.tick&&SND.tick(); } return k<1; }); if(J.fly.length) dirty=true;\n  /* top-left: level and Munchers left */")
# the multiplier readout pops (with a soft chime) when it climbs
rep("var mn=mulNow(); canvasText('x'+mn+(mn<3?'  ·  streak '+S.streak:''),W-34,124,mn>1?44:34,mn>1?'#FFC93D':'#FFF4DC','right');",
    "var mn=mulNow(); if(mn>J.lastMul){ J.mulPop=now(); SND.star&&SND.star(2); } J.lastMul=mn; var mk=now()-J.mulPop<450?1+0.45*Math.sin(Math.PI*Math.min(1,(now()-J.mulPop)/450)):1; if(mk>1) dirty=true; cx.save(); cx.translate(W-34,124); cx.scale(mk,mk); canvasText('x'+mn+(mn<3?'  ·  streak '+S.streak:''),0,0,mn>1?44:34,mn>1?'#FFC93D':'#FFF4DC','right'); cx.restore();")
rep("canvasText('×'+Math.max(0,S.burgers)+(S.burgers===1?' LAST ONE!':''),SL.x+86+138,GY-22-Math.max(0,Math.ceil(nb/4)-1)*30-4,52,'#FFE08A','left');",
    "var pk=Math.abs(now()-J.pilePop)<220?1.25:1; if(pk>1) dirty=true; cx.save(); cx.translate(SL.x+86+138,GY-22-Math.max(0,Math.ceil(nb/4)-1)*30-4); cx.scale(pk,pk); canvasText('×'+Math.max(0,S.burgers)+(S.burgers===1?' LAST ONE!':''),0,0,52,'#FFE08A','left'); cx.restore();")
# ---------- test hooks for bots ----------
rep("window.__G={", """window.__G2={ mk:makeOrder, trayAnswer:trayAnswer, trayNext:function(){ trayNext(true); }, fast:function(o){ FASTSIM=!!o; }, outNow:outNow, finish:function(){ if(S.clearing){ clearAt=0; finishClear(); } if(nextAt){ nextAt=0; nextLevel(); } }, order:function(){ return S.order; }, mul:mulNow, endRun:function(){ endRun(); } };
window.__G={""")
H = H.replace("<title>Spitz Arcade - Burger Blaster</title>", "<title>Spitz Arcade - Burger Blaster</title>", 1)
open(out, 'w', encoding='utf-8').write(H)
print('ok', VER, len(H))
