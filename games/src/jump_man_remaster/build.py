#!/usr/bin/env python3
"""Jump Man, remastered: the live tower game with the Lantern Peak climber and pixel art.

Starts from the live games/jump_man_multiplication.html and swaps only the drawing (remaster.js), so the gameplay,
score key, save key, controls and shop stay exactly as students know them. Writes to out/:
  jump_man_multiplication.html   site candidate (replaces the live file only on Kody's "push it")
  jump_man_remaster_mult.html    self-contained test copy (fonts, kit, questions, scorecode, art inside); opens
                                 straight into multiplication facts. Never goes on the site.
Run: python3 games/src/jump_man_remaster/build.py
"""
import base64, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
G = os.path.normpath(os.path.join(HERE, '..', '..'))           # games/
ROOT = os.path.dirname(G)
O = os.path.join(HERE, 'out'); os.makedirs(O, exist_ok=True)
read = lambda p: open(p, encoding='utf-8').read()

src = read(os.path.join(G, 'jump_man_multiplication.html'))
parts = dict(re.findall(r'//@@ (\w+)\n(.*?)(?=//@@ |\Z)', read(os.path.join(HERE, 'remaster.js')), re.S))
art = read(os.path.join(G, 'src', 'lantern_peak', 'art_data.js'))

def cut(t, start, end, new):
    """replace t[start:end) (end not included) with new; both markers must be found exactly once"""
    assert t.count(start) == 1, start; i = t.index(start); j = t.index(end, i); assert t.count(end) >= 1, end
    return t[:i] + new + t[j:]
def swap(t, old, new):
    assert t.count(old) == 1, old[:80]; return t.replace(old, new)

t = src
# 1. the climber, the ledges and the new art helpers (drawMan .. panel)
t = cut(t, 'function drawMan(x,y,ghost){', 'function panel(', parts['ART'] + parts['MAN'] + parts['BACK'] + parts['FLOOR'] + parts['GEM'] + parts['FOG'] + parts['WALLS'])
# 2. the sky: stepped pixel bands instead of a smooth gradient
t = swap(t, "var c=SKYS.c.getContext('2d'), g=c.createLinearGradient(0,0,0,H); g.addColorStop(0,sk[0]); g.addColorStop(1,sk[1]); c.fillStyle=g; c.fillRect(0,0,1,H);",
         "bandStrip(SKYS.c.getContext('2d'),sk);")
# 3. stars, clouds and ground -> drawBack
t = cut(t, "  cx.fillStyle='#fff'; for(i=0;i<70;i++){", "  for(i=0;i<plats.length;i++){", "  drawBack(m);\n")
# 4. full floors -> drawFloor
t = cut(t, "    if(p.floor){ cx.fillStyle=z.body;", "    else drawPlat(p,py,z);", "    if(p.floor) drawFloor(p,py,z);\n")
# 5. gems -> pixel gems
t = cut(t, "    if(p.gem!==undefined&&!S.got[p.i]&&solid(p)){ var gx=", "  dust.forEach(",
        "    if(p.gem!==undefined&&!S.got[p.i]&&solid(p)) drawGem(cxAt(p,gt)+p.gem,py-74+Math.round(Math.sin(gt*3+p.i)*6),p.gold); }\n")
t = swap(t, "cx.fillStyle=d.col; cx.fillRect(d.x-4,sy(d.h)-4,8,8);", "cx.fillStyle=d.col; cx.fillRect(Math.round(d.x/4)*4-4,Math.round(sy(d.h)/4)*4-4,8,8);")
# 6. zone skies in the Lantern Peak palette (the names and heights stay)
for old, new in [("a:[70,150,245],b:[175,222,255]", "a:[120,182,200],b:[191,227,232]"), ("a:[60,70,170],b:[250,150,110]", "a:[111,140,184],b:[244,184,128]"),
                 ("a:[14,16,40],b:[40,30,90]", "a:[30,42,79],b:[108,120,168]"), ("a:[6,7,16],b:[20,14,44]", "a:[14,10,32],b:[52,32,92]"), ("a:[2,2,6],b:[34,12,30]", "a:[4,4,12],b:[34,20,44]")]:
    t = swap(t, old, new)
# 7. the art itself (hero sprite sheet + Pinewood backdrop) loads before the game
t = swap(t, '<script src="scorecode.js"></script>', '<script>\n' + art + '\n</script>\n<script src="scorecode.js"></script>')
# 8. the climber waves hello on the start screen
fr = re.search(r'idle:\[(\d+),(\d+),(\d+),(\d+)\]', art).groups(); fx, fy, fw, fh = map(int, fr); S3 = 2
heroimg = re.search(r'hero:"(data:image/png;base64,[^"]+)"', art).group(1)
css = ('.jmr-hero{ width:%dpx; height:%dpx; margin:0 auto 6px; background:url(%s) -%dpx -%dpx / %dpx %dpx no-repeat; image-rendering:pixelated; }\n'
       % (fw * S3, fh * S3, heroimg, fx * S3, fy * S3, 165 * S3, 42 * S3))
t = swap(t, '</style>\n</head>', css + '</style>\n</head>') if t.count('</style>\n</head>') == 1 else swap(t, '<script src="kit.js"></script>', '<style>' + css + '</style>\n<script src="kit.js"></script>')
t = swap(t, '<div class="sz-eyebrow">Spitz <b>Arcade</b></div><h2 class="jm-big">', '<div class="sz-eyebrow">Spitz <b>Arcade</b></div><div class="jmr-hero" aria-hidden="true"></div><h2 class="jm-big">')
assert 'createLinearGradient(0,0,0,H)' not in t

V2CSS = """#jm-shopbtn,#jm-cashchip{ display:none !important; }
.jmr-offer{ position:absolute; inset:0; z-index:6; background:rgba(8,16,40,.9); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:26px; }
.jmr-offer[hidden]{ display:none; }
.jmr-offer h2{ margin:0; font:700 64px/1 var(--display); color:#7CF0FF; text-shadow:6px 6px 0 var(--px); }
.jmr-picks{ display:flex; gap:30px; }
.jmr-pick{ width:560px; min-height:260px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:14px; padding:22px; background:var(--panel); color:#fff; border:6px solid var(--px); box-shadow:0 0 0 4px var(--accent), 10px 10px 0 4px var(--px); cursor:pointer; font:inherit; }
.jmr-pick:hover,.jmr-pick:focus-visible{ background:var(--panel-2); outline:none; }
.jmr-pick .k{ width:56px; height:56px; display:grid; place-items:center; background:var(--paper); font:400 32px/1 var(--display); color:var(--accent); }
.jmr-pick b{ font:700 42px/1.1 var(--display); color:var(--accent); } .jmr-pick b small{ font-size:24px; color:var(--muted); }
.jmr-pick .d{ font:700 26px/1.3 var(--body); color:#fff; text-align:center; }
.jmr-how{ font:700 28px/1 var(--display); color:#7CF0FF; padding:10px 16px; background:var(--paper); }
.jmr-score{ font:800 24px/1 var(--body); color:var(--muted); letter-spacing:.04em; }
.jmr-offer.miss h2{ color:#FFB4A8; } .jmr-pick.locked b{ color:var(--muted); }
.jmr-ofoot{ margin:0; font:700 26px/1 var(--body); color:var(--muted); }
.jmr-idle{ display:block; font:800 40px/1.25 var(--body); white-space:normal; } .jmr-idle b{ color:#7CF0FF; }
.jmr-moves{ display:flex; flex-direction:column; gap:8px; }
.jmr-mh{ font:800 22px/1 var(--body); letter-spacing:.12em; text-transform:uppercase; color:var(--muted); margin-bottom:4px; }
.jmr-mv{ display:flex; justify-content:space-between; gap:16px; padding:12px 18px; background:var(--panel-2); border:3px solid var(--border); font:800 32px/1.1 var(--body); }
.jmr-mv span{ color:var(--accent); font-weight:700; }
"""

# ---------------- v2 gameplay (Kody 2026-11-17): free movement, Waystones every full floor, a new move after each ----------------
t = cut(t, '/* ================= START / END', '/* ================= START / END', parts['PLAY'] + parts['V4'] + '\n')
t = t.replace(parts['FLOOR'], parts['FLOOR'] + parts['WAYDRAW'])
for old, new in [
  # state: version 3, moves, Waystones
  ("function fresh(){ return { ver:2,", "function fresh(){ return { ver:3,"),
  ("lv:{energy:0,cash:0,jump:0,combo:0}, buff:", "lv:{energy:0,cash:0,jump:0,combo:0,speed:0,magnet:0}, mv:{}, way:null, offer:null, ways:0, nextWay:10, kicks:0, learned:[], buff:"),
  ("if(v&&v.ver===2&&v.topics", "if(v&&v.ver===3&&v.topics"),
  ("jumpQ=false, shk=0,", "jumpQ=false, dashQ=false, shk=0,"),
  # movement is free
  ("function tryMove(){ if(S.started&&!S.over&&S.energy<=0&&!buffOn('free')) noEnergy(); }", "function tryMove(){}"),
  ("function spend(n){ if(buffOn('free')) return; S.energy=Math.max(0,S.energy-n); if(S.energy===0) noEnergy(); }", "function spend(n){}"),
  ("function vmax(){ return VMAX*(1+0.1*turbo()); }", "function vmax(){ return VMAX*(1+0.1*turbo()+0.07*S.lv.speed); }"),
  # update: the tower freezes at a Waystone and while a move is picked
  ("function update(dt){ var t=now(); if(!S.started||S.over) return; gt+=dt;",
   "function update(dt){ var t=now(); if(!S.started||S.over) return; if(S.way||S.offer){ cam+=(P.h-cam)*Math.min(1,dt*6); return; } gt+=dt;"),
  ("var open=!$('jm-shop').hidden, free=buffOn('free'), can=free||S.energy>0, vm=vmax(),", "var open=false, can=true, vm=vmax(),"),
  ("P.vx=Math.max(-vm,Math.min(vm,P.vx)); if(mv) P.face=mv;", "var vcap=P.dashT>0?vm*1.8:vm; P.vx=Math.max(-vcap,Math.min(vcap,P.vx)); if(mv&&!(P.dashT>0)) P.face=mv;"),
  ("var side=P.x<PW/2?1:-1; P.x=side>0?PW/2:W-PW/2;", "var side=P.x<PW/2?1:-1; P.x=side>0?PW/2:W-PW/2; if(!on){ P.wallT=gt; P.wallSide=side; }"),
  ("if(!P.on){ var oh=P.h; P.vy=Math.max(-1500,P.vy-GRAV*dt);",
   "if(!P.on){ var oh=P.h; P.vy=Math.max(-1500,P.vy-GRAV*dt); if(P.dashT>0){ P.dashT-=dt; P.vy=Math.max(P.vy,0); }\n    P.glide=!!S.mv.glide&&(keys.j||ptrJ())&&P.vy<-200; if(P.glide) P.vy=-200;"),
  ("Math.abs(P.x-(cxAt(g,gt)+g.gem))<46&&Math.abs((P.h+PH/2)-(g.h+74))<58", "Math.abs(P.x-(cxAt(g,gt)+g.gem))<46+45*S.lv.magnet&&Math.abs((P.h+PH/2)-(g.h+74))<58+45*S.lv.magnet"),
  ("  checkGoals();\n  cam+=", "  if(P.on&&P.on.i>=S.nextWay&&!S.way&&!S.offer) openWay();\n  checkGoals();\n  cam+="),
  ("P.on=p; P.dbl=false;", "P.on=p; P.dbl=false; P.airJ=0; P.dashed=false; P.dashT=0; P.glide=false;"),
  # answering only happens at a Waystone; 3 right passes it
  ("function answer(i){ if(!S.started||S.over||S.qDone||!S.q) return;", "function answer(i){ if(!S.started||S.over||S.qDone||!S.q||!S.way) return;"),
  ("var pa=U('energy'), ca=U('cash')+streakBonus(S.streak);\n    S.energy+=pa; S.cash+=ca; SND.correct(); var p=stagePoint(btn,60,40);  \n    markAnswered(i,true); nextT=setTimeout(function(){ if(S.qDone&&!S.over) newQ(); },140); }",
   "S.bonus+=10; S.way.got++; S.way.n++; S.way.res.push(1); SND.correct();\n    markAnswered(i,true); nextT=setTimeout(function(){ if(S.qDone&&!S.over) newQ(); },S.way.n>=3?700:450); }"),
  ("else { S.streak=0; S.cash=Math.max(0,S.cash-3); SND.miss(); markAnswered(i,true); }", "else { S.streak=0; S.way.n++; S.way.res.push(0); SND.miss(); markAnswered(i,true); }"),
  ("function newQ(){ clearTimeout(nextT); S.q=nextQuestion();", "function newQ(){ clearTimeout(nextT); if(S.way&&S.way.n>=3){ closeWay(); return; } if(!S.way){ S.q=null; S.qDone=false; S.picked=-1; showQ(); return; } S.q=nextQuestion();"),
  ("function showQ(){ var q=S.q;", "function showQ(){ var q=S.q; if(!S.way||!q){ idleQ(); return; }"),
  ("fb.innerHTML='Answer correctly to add energy and earn cash.';", "fb.innerHTML='Answer 3 right to pass the Waystone.';"),
  # HUD: the Energy chip becomes Waystones; cash and the shop go away
  ("function hud(){ hudLive(); $('jm-cash').textContent='$'+S.cash; $('jm-streak').textContent=S.streak;\n  $('jm-shopcash').textContent='$'+S.cash; $('jm-reward').textContent='+'+U('energy')+' energy · +$'+(U('cash')+streakBonus(S.streak+1)); if(!$('jm-shop').hidden) drawShop(); }",
   "function hud(){ hudLive(); $('jm-en').textContent=S.ways; $('jm-streak').textContent=S.streak; $('jm-reward').textContent=S.way?'Waystone · question '+Math.min(3,S.way.n+1)+' of 3':''; }"),
  ("var a=S.score.toLocaleString(), b=buffOn('free')?'∞':''+Math.ceil(S.energy), e=$('jm-score'), f=$('jm-en');\n  if(e.textContent!==a) e.textContent=a; if(f.textContent!==b) f.textContent=b; $('jm-enchip').classList.toggle('empty',S.started&&!S.over&&S.energy<=0&&!buffOn('free')); }",
   "var a=S.score.toLocaleString(), e=$('jm-score'); if(e.textContent!==a) e.textContent=a; }"),
  ('<div class="jm-chip" id="jm-enchip"><span class="l">Energy</span><span class="v" id="jm-en">0</span></div>', '<div class="jm-chip" id="jm-enchip"><span class="l">Waystones</span><span class="v" id="jm-en">0</span></div>'),
  ('<div class="jm-shop" id="jm-shop" hidden>', '<div class="jmr-offer" id="jmr-offer" hidden><h2 id="jmr-offerh">New move!</h2><div class="jmr-picks" id="jmr-picks"></div><p class="jmr-ofoot">Press Enter or click to keep climbing</p></div>\n      <div class="jm-shop" id="jm-shop" hidden>'),
  # keys: Shift, X or K dash; 1 or 2 picks a move
  ("  if(d){ e.preventDefault(); if(!S.started||S.over) return;", "  if(k==='shift'||k==='x'||k==='k'){ e.preventDefault(); if(S.started&&!S.over&&!e.repeat) dashQ=true; return; }\n  if(d){ e.preventDefault(); if(!S.started||S.over) return;"),
  ("if(/^[1-4]$/.test(e.key)){ answer(+e.key-1); return; }", "if(/^[1-4]$/.test(e.key)){ if(S.offer) pickOffer(+e.key-1); else answer(+e.key-1); return; }"),
  ("jumpQ=false;\n  if(P.on&&(!solid(P.on)", "jumpQ=false; doDash(mv,vm);\n  if(P.on&&(!solid(P.on)"),
  # touch: a dash button once Air Dash is learned
  ("var BTN={ l:{x:92,y:H-86,r:64}, r:{x:244,y:H-86,r:64}, j:{x:W-104,y:H-86,r:72} };", "var BTN={ l:{x:92,y:H-86,r:64}, r:{x:244,y:H-86,r:64}, j:{x:W-104,y:H-86,r:72}, d:{x:W-262,y:H-86,r:58} };"),
  ("[['l','◀'],['r','▶'],['j','▲']].forEach(function(b){", "[['l','◀'],['r','▶'],['j','▲']].concat(S.mv&&S.mv.dash?[['d','»']]:[]).forEach(function(b){"),
  ("if(b==='j') jumpQ=true; tryMove();", "if(b==='d'&&!S.mv.dash){ delete ptr[e.pointerId]; return; } if(b==='j') jumpQ=true; if(b==='d') dashQ=true; tryMove();"),
  # start screen
  ("You have 5 minutes: answer to charge up, then run, jump and combo your way up the tower.", "You have 5 minutes: climb the tower, answer well at each Waystone to learn new moves, and stay above the fog."),
  ('data-ctl="1234=Answer | LR=Run | Space=Jump"', 'data-ctl="LR/AD=Run | Space=Jump | X/K=Dash | 1234=Answer"'),
  ("<b>Answer</b>Right answers add energy and cash. 5 in a row turns on Turbo shoes. A wrong answer costs $3 and your streak.", "<b>Climb</b>Run fast to jump higher. Skip 2+ floors per jump for a combo. Running and jumping are free."),
  ("<b>Climb</b>Run fast to jump higher. Skip 2+ floors per jump for a combo. Finish goals for bonus points.", "<b>Waystones</b>Every 30 ledges a Waystone stops you: answer 3 questions right to pass. 5 in a row turns on Turbo shoes."),
  ("<b>Upgrade</b>Spend cash in the Shop on jump boots, a longer combo clock, bigger energy packs and power-ups.", "<b>New moves</b>Moves to learn: wall kick off the sides, double jump, glide, air dash and more."),
  # canvas: tutorial line, test hooks, boot
  ("'Every step and jump uses energy'", "'A Waystone waits on every full floor'"),
  ("types:Object.keys(GEN) };", "types:Object.keys(GEN), dash:function(){ dashQ=true; }, pick:function(){ pickOffer(0); }, airMax:airMax, ans:function(i){ answer(i); }, newQ:function(){ newQ(); }, closeWay:function(){ closeWay(); }, rocks:function(){ return rocks; }, fogOn:function(){ return fogOn(); }, fogSpeed:function(){ return fogSpeed(); }, reset:function(){ resetTower(); }, gen:function(h){ genTo(h); } };"),
  ("else if(S.q){ showQ(); } else newQ(); }", "else if(S.way&&S.q){ showQ(); } else newQ(); showOffer(); }"),
]:
    t = swap(t, old, new)
t = cut(t, "  if(want&&!open){ var dbl=", "  jumpQ=false;", "  if(want&&!open) doJump(vm);\n")
t = swap(t, "if(/^[1-4]$/.test(e.key)){ if(S.offer)", "if(S.offer&&e.key==='Enter'){ e.preventDefault(); pickOffer(0); return; }\n  if(/^[1-4]$/.test(e.key)){ if(S.offer)")
for old, new in [
  ("ways:0, nextWay:10, kicks:0, learned:[], buff:", "ways:0, nextWay:FLOOR_EVERY, learned:[], hearts:3, fog:-800, fogOut:false, buff:"),
  ("  if(P.on&&P.on.i>=S.nextWay&&!S.way&&!S.offer) openWay();", "  fogStep(dt); if(S.over) return;\n  if(P.on&&P.on.i>=S.nextWay&&!S.way&&!S.offer) openWay();"),
  ("  cx.restore();\n  // zone banner", "  drawFog();\n  cx.restore();\n  drawHearts();\n  // zone banner"),
  ('<p class="jm-sub" style="margin:0">Time!</p>', '<p class="jm-sub" style="margin:0" id="jmr-endwhy">Time!</p>'),
  ("function showEnd(celebrate){", "function showEnd(celebrate){ $('jmr-endwhy').textContent=S.fogOut?'The fog caught you!':'Time!';"),
  ("'A Waystone waits on every full floor'", "'Waystones teach new moves. Then the fog rises!'"),
  ("<b>Climb</b>Run fast to jump higher. Skip 2+ floors per jump for a combo. Running and jumping are free.", "<b>Climb</b>Run fast to jump higher. Skip 2+ floors per jump for a combo. Stay above the rising fog: you have 3 hearts."),
  ("answer 3 questions right to pass. 5 in a row turns on Turbo shoes.", "answer 3 questions. 2 right teaches a new move; 3 of 3 also gives back a heart."),
]:
    t = swap(t, old, new)
for old, new in [
  ("var GRAV=2400, JV=860, JK=0.95, VMAX=560, ACC=1700, AIRACC=1250, FRIC=2800, ICEACC=1100, ICEFRIC=1000,", "var GRAV=2400, JV=860, JK=0.95, VMAX=560, ACC=3200, AIRACC=2600, FRIC=6000, ICEACC=1500, ICEFRIC=1500,"),   # v3: tighter, less slide
  ("else if(mv) P.vx+=mv*AIRACC*dt;", "else if(mv) P.vx+=mv*AIRACC*dt; else if(!(P.dashT>0)){ var af=700*dt; P.vx=Math.abs(P.vx)<=af?0:P.vx-(P.vx>0?af:-af); }"),
  ("P.vy=Math.max(-1500,P.vy-GRAV*dt);", "P.vy=Math.max(-1500,P.vy-GRAV*dt*(P.vy<0?1.3:1));"),
  ("  drawFog();\n", "  drawKickHint(); drawFog();\n"),
  ("  if(P.on&&P.on.i>=S.nextWay&&!S.way&&!S.offer) openWay();", "  if(P.on&&P.on.i>=S.nextWay&&!S.way&&!S.offer) openWay();"),
]:
    t = swap(t, old, new)
t = swap(t, "  drawBack(m);\n", "  drawBack(m); drawWalls();\n")
# the energy gauge becomes a Waystone meter; the out-of-energy box becomes the Waystone box
t = cut(t, "  var cap=40, fh=420, fy=220,", "  // Turbo chip",
  "  var fh=420, fy=220, lvl=Math.max(0,Math.min(1,((S.pi||0)-Math.max(0,S.nextWay-WAY_EVERY))/(S.nextWay>WAY_FIRST?WAY_EVERY:WAY_FIRST))), left=Math.max(0,S.nextWay-(S.pi||0)), mc='#7CF0FF';\n"
  "  if(S.rush){ left=Math.max(0,S.rush.i-(S.pi||0)); lvl=Math.max(0,Math.min(1,1-left/(S.rush.n?SUMMIT_NEXT:SUMMIT_UP))); mc='#FFC23D'; } panel(W-108,fy-58,94,fh+112);\n"
  "  cx.fillStyle='#242936'; cx.fillRect(W-76,fy,30,fh); cx.fillStyle=mc; cx.fillRect(W-76,fy+fh*(1-lvl),30,fh*lvl);\n"
  "  cx.fillStyle='#1B1328'; cx.fillRect(W-71,fy-46,20,32); cx.fillStyle='#8A8FA6'; cx.fillRect(W-69,fy-44,16,28); cx.fillStyle='#7CF0FF'; cx.fillRect(W-63,fy-40,4,18);\n"
  "  cx.fillStyle='#fff'; cx.font='800 32px Inter, sans-serif'; cx.fillText(left,W-61,fy+fh+44);\n")
t = cut(t, "  if(live&&S.energy<=0&&!buffOn('free')){", "  else if(live&&S.jumps<3){",
  "  if(live&&S.way){ cx.fillStyle='rgba(8,9,13,.82)'; cx.fillRect(W/2-380,230,760,236); cx.strokeStyle='#7CF0FF'; cx.lineWidth=4; cx.strokeRect(W/2-380,230,760,236);\n"
  "    cx.fillStyle='#fff'; cx.font='400 60px '+DF; cx.fillText('WAYSTONE',W/2,306); cx.font='700 32px Inter, sans-serif'; cx.fillStyle='#7CF0FF'; cx.fillText('3 of 3 right: a new move and a heart back  →',W/2,358);\n"
  "    cx.font='700 26px Inter, sans-serif'; cx.fillStyle='#D6C8F0'; cx.fillText('Each right answer holds the fog back 3 seconds',W/2,400);\n"
  "    for(var wk=0;wk<3;wk++){ cx.fillStyle=S.way.res[wk]===1?'#FFC23D':S.way.res[wk]===0?'#FF6B6B':'#3A3550'; cx.fillRect(W/2-58+wk*42,424,32,20); } }\n"
  "  else if(live&&S.offer){ }\n")
t = swap(t, '</style>\n</head>', V2CSS + '</style>\n</head>') if t.count('</style>\n</head>') == 1 else swap(t, '<script src="kit.js"></script>', '<style>' + V2CSS + '</style>\n<script src="kit.js"></script>')
# ---------------- v4 (Nov 22 remake pass): Waystones every 50, right answers hold the fog, idle fog, rockfall, Summit Rush ----------------
for old, new in [
  ("function fresh(){ return { ver:3,", "function fresh(){ return { ver:4,"),
  ("if(v&&v.ver===3&&v.topics", "if(v&&v.ver===4&&v.topics"),
  ("hearts:3, fog:-800, fogOut:false, buff:", "hearts:3, fog:-800, fogOut:false, calm:0, climbT:0, rush:null, rockOn:false, buff:"),
  ("  fogStep(dt); if(S.over) return;\n  if(P.on&&P.on.i>=S.nextWay&&!S.way&&!S.offer) openWay();",
   "  fogStep(dt); if(S.over) return; rockStep(dt); rushStep();\n  if(P.on&&P.on.i>=S.nextWay&&!S.way&&!S.offer&&!S.rush) openWay();"),
  ("  drawKickHint(); drawFog();\n", "  drawRocks(); drawRush(); drawFx(); drawKickHint(); drawFog();\n"),
  # v5: the end screen shows the score as height + bonus; HUD numbers in a heavy sans so they stay readable when the canvas is scaled down
  ("['Best streak',S.best],['Height · combo',Math.floor(S.top/20).toLocaleString()+' m · '+S.bestCombo]", "['Height points',Math.floor(S.top/20).toLocaleString()],['Bonus points','+'+S.bonus.toLocaleString()]"),
  ("cx.fillStyle='#fff'; cx.font='400 52px '+DF; cx.fillText(Math.floor(Math.max(0,P.h)/20)+' m',W-114,104);", "cx.fillStyle='#fff'; cx.font='800 48px Inter, sans-serif'; cx.fillText(Math.floor(Math.max(0,P.h)/20)+' m',W-114,102);"),
  ("function landOn(p){ var diff=p.i-P.lastI, wasTop=S.top;", "function landOn(p){ if(P.vy<-1100) fxAdd('land',P.x,p.h); var diff=p.i-P.lastI, wasTop=S.top;"),
  ("  pops.forEach(function(o){", "  if(!S.way) pops.forEach(function(o){"),
  ("  else if(live&&S.jumps<3){", "  else if(live&&S.jumps<3&&!banner){"),
  # feel pass (spitz-game-feel): smooth summed-sine shake instead of random jitter, off with reduced motion
  ("cx.save(); if(shk>0.5) cx.translate((Math.random()-0.5)*shk,(Math.random()-0.5)*shk);", "cx.save(); if(shk>0.5&&!RM()) cx.translate(Math.round(shk*0.6*Math.sin(t*0.051)),Math.round(shk*0.4*Math.sin(t*0.069)));"),
  ("cx.fillText('NEW ZONE · '+banner.sub,W/2,216);", "cx.fillText(banner.kind?banner.sub.toUpperCase():'NEW ZONE · '+banner.sub,W/2,216);"),
  ("var w=comboWord(f), pts=comboPts(f); S.bonus+=pts; S.combos++;", "var w=comboWord(f), pts=comboPts(f)*(S.rush?2:1); S.bonus+=pts; S.combos++; if(fogOn()) fogCalm(Math.min(4,Math.floor(f/4)));"),
  ("S.bonus+=10; S.way.got++; S.way.n++; S.way.res.push(1); SND.correct();", "S.bonus+=10; S.way.got++; S.way.n++; S.way.res.push(1); fogCalm(CALM_PER); SND.correct();"),
  ("lockT=setTimeout(function(){ $('jm-next').disabled=false; if(S.qDone&&!S.over) newQ(); },1200);", "lockT=setTimeout(function(){ $('jm-next').disabled=false; },2000);"),
  ("fb.innerHTML='Answer 3 right to pass the Waystone.';", "fb.innerHTML='Waystone: 3 questions. Each right answer holds the fog back.';"),
  ("function endRun(){ S.over=true;", "function endRun(){ S.over=true; S.offer=null; $('jmr-offer').hidden=true; rocks=[];"),
  ("if(celebrate){ SND.win();", "$('jm-again').disabled=true; setTimeout(function(){ $('jm-again').disabled=false; },2000); if(celebrate&&!S.fogOut&&S.correct>0){ SND.win();"),
  ("Every 30 ledges a Waystone stops you: answer 3 questions. 2 right teaches a new move; 3 of 3 also gives back a heart.",
   "Every 40 ledges: 3 questions. Right answers hold back the fog; all 3 right teaches a new move and gives back a heart."),
  ("<b>New moves</b>Moves to learn: wall kick off the sides, double jump, glide, air dash and more.",
   "<b>Summit Rush</b>Learn wall kick, double jump, glide and air dash. In the last minute, race the fog to the golden lanterns!"),
  ("cx.fillText('Waystones teach new moves. Then the fog rises!',W/2,424);",
   "cx.fillText(S.jumps===0&&(S.climbT||0)>6?'Press ← or → to run, then ↑ to jump!':'Waystones teach new moves. Then the fog rises!',W/2,424);"),
]:
    t = swap(t, old, new)
# ---------------- v6 game UI (Kody 2026-11-22: "redesign the UI to align with our more recent games") ----------------
t = t.replace(parts['FLOOR'] + parts['WAYDRAW'], parts['FLOOR'] + parts['WAYDRAW'])
t = cut(t, "  drawHearts();\n  // zone banner", "var lastF=now(); function loop()", "  towerHud(t,live); }\n")
for old, new in [
  ("/* ================= START / END", parts['HUD6'] + "\n/* ================= START / END"),
  ('<div class="jm-top">', '<div id="jmr-sky" aria-hidden="true"></div><canvas id="jmr-sl" class="jmr-col" width="352" height="1080" aria-hidden="true"></canvas><canvas id="jmr-sr" class="jmr-col" width="352" height="1080" aria-hidden="true"></canvas>\n  <div class="jm-top">'),
  ("function hud(){ hudLive();", "function hud(){ hudLive(); $('jm-q').classList.toggle('on',!!(S.way&&S.q&&!S.offer)); if(S.way) $('jm-wayn').innerHTML=[0,1,2].map(function(k){ var r=S.way.res[k]; return '<i class=\"'+(r===1?'ok':r===0?'no':k===S.way.n?'now':'')+'\"></i>'; }).join('');"),
  ("fb.innerHTML='Waystone: 3 questions. Each right answer holds the fog back.';", "fb.innerHTML='All 3 right: a new move and a heart back. Each right answer holds the fog 3 s.';"),
  ('<div class="jm-qhead"><span class="jm-tag" id="jm-tag">Facts</span><span class="jm-reward" id="jm-reward"></span></div>', '<div class="jm-qhead"><span class="jmr-wt">Waystone</span><span class="jmr-wayn" id="jm-wayn"></span><span class="jm-sp"></span><span class="jm-tag" id="jm-tag">Facts</span><span class="jm-reward" id="jm-reward"></span></div>'),
  ("function showQ(){ var q=S.q; if(!S.way||!q){ idleQ(); return; }", "function showQ(){ var q=S.q; if(!S.way||!q){ idleQ(); hud(); return; }"),
  ("['Correct',S.correct+' of '+S.answered]", "['Correct',S.correct+' of '+S.answered]"),
]:
    t = swap(t, old, new)
t = swap(t, "  sideHud(); }\n", "  sideHud(); }\nsetInterval(function(){ if(!S.started||S.over) sideHud(true); },500);\n")
V6CSS = """
/* start screen: the three steps sit in one game window as plain rows (no box per step) */
.jm-steps{ background:#16264A; border:6px solid #E8EEFF; box-shadow:0 0 0 4px #0B0F1C, 8px 8px 0 4px #0B0F1C; padding:14px 26px !important; gap:0 !important; }
.jm-step{ border:0 !important; box-shadow:none !important; background:none !important; padding:12px 0 !important; }
.jm-step + .jm-step{ border-top:3px solid #2C3F6E !important; }

/* ---- v6 layout: tower in the middle, side columns drawn on #jmr-side, question window over the tower ---- */
#stage{ display:block !important; padding:0 !important; background:#0B0F1C !important; }
#jmr-sky{ position:absolute; left:0; top:0; width:1920px; height:1080px; z-index:0; }
.jmr-col{ position:absolute; top:0; width:352px; height:1080px; z-index:0; }
#jmr-sl{ left:0; } #jmr-sr{ left:1568px; }
.jm-top{ display:block !important; }
.jm-top > .jm-chip, .jm-top > .jm-shopbtn, .jm-top > .jm-sp{ display:none !important; }
.jm-brand{ position:absolute; left:44px; top:34px; z-index:2; }
.jm-brand .jm-logo{ font-size:58px; }
#jm-main{ display:block !important; }
.jm-range{ position:absolute !important; left:352px; top:0; width:1054px !important; height:936px !important; margin:0 !important; border:0 !important; border-radius:0 !important; box-shadow:none !important;
  transform:scale(1.15385) !important; transform-origin:0 0 !important; z-index:1; }
.jm-buffs{ display:none !important; }
.jm-q{ position:absolute !important; left:452px; top:150px; width:1016px; z-index:6; padding:26px 34px 30px !important; gap:16px !important; border-radius:0 !important;
  background:#16264A !important; border:6px solid #E8EEFF !important; box-shadow:0 0 0 6px #0B0F1C, 0 16px 0 6px rgba(0,0,0,.35) !important;
  opacity:0; transform:translateY(14px); pointer-events:none; transition:opacity .15s, transform .15s; }
.jm-q.on{ opacity:1; transform:none; pointer-events:auto; }
.jm-q.nudge{ animation:none !important; }
.jm-qhead{ gap:16px !important; }
.jmr-wt{ font:500 44px/1 var(--display); color:#7CF0FF; }
.jmr-wayn{ display:flex; gap:10px; } .jmr-wayn i{ width:30px; height:18px; background:#3A3550; box-shadow:0 0 0 4px #0B0F1C; }
.jmr-wayn i.ok{ background:#FFC23D; } .jmr-wayn i.no{ background:#FF6B6B; } .jmr-wayn i.now{ background:#E8EEFF; }
.jm-tag{ background:none !important; box-shadow:none !important; min-width:0 !important; padding:0 !important; font:800 24px/1 var(--body) !important; letter-spacing:0 !important; text-transform:none !important; color:#A9C2EE !important; }
.jm-reward{ display:none !important; }
.jm-prompt{ font-size:96px !important; height:auto !important; min-height:0 !important; padding:4px 0 8px !important; text-shadow:6px 6px 0 #0B0F1C !important; }
.jm-choices{ display:grid !important; grid-template-columns:1fr 1fr; gap:14px !important; }
.jm-q.vis .jm-choices{ grid-template-columns:1fr; }
.jm-ch{ min-height:84px !important; font-size:42px !important; border-radius:0 !important; background:#0F1B38 !important; border:4px solid #3C5590 !important; box-shadow:none !important; }
.jm-ch .k{ width:52px !important; height:52px !important; background:#E8EEFF !important; color:#0B0F1C !important; box-shadow:0 4px 0 #8A9BC4; }
.jm-ch.right{ border-color:var(--ok) !important; background:#123A2A !important; } .jm-ch.wrong{ border-color:var(--no) !important; background:#3A1626 !important; }
.jm-fb{ min-height:0 !important; height:auto !important; border:0 !important; background:none !important; padding:4px 2px 0 !important; font:700 28px/1.3 var(--body) !important; color:#C9D6F5 !important; }
.jm-fb.ok, .jm-fb.bad{ border:0 !important; }
.jm-next{ display:block !important; align-self:center; height:auto !important; padding:12px 26px !important; border-radius:0 !important; background:#E8EEFF !important; color:#0B0F1C !important; font:500 30px/1 var(--display) !important; box-shadow:0 6px 0 #8A9BC4; }
.jm-next:disabled{ visibility:hidden; }
.jmr-offer{ position:absolute; inset:0; background:rgba(6,10,26,.55) !important; }
.jmr-offer h2{ font-size:72px !important; text-shadow:0 0 0 transparent, 6px 6px 0 #0B0F1C !important; }
.jmr-pick{ border-radius:0 !important; background:#16264A !important; border:6px solid #E8EEFF !important; box-shadow:0 0 0 6px #0B0F1C, 0 16px 0 6px rgba(0,0,0,.35) !important; }
.jmr-ofoot{ color:#E8EEFF !important; text-shadow:3px 3px 0 #0B0F1C; }
.jm-stats, .jm-topics{ gap:6px 30px !important; margin:22px 0 12px !important; }
.jm-stat{ background:none !important; border:0 !important; box-shadow:none !important; border-radius:0 !important; padding:4px !important; }
.jm-stat .l{ text-transform:none !important; letter-spacing:0 !important; font:700 24px/1.2 var(--body) !important; color:#A9C2EE !important; }
.jm-stat .v{ font:400 52px/1.1 var(--display) !important; text-shadow:4px 4px 0 #0B0F1C; }
.jm-topics .jm-stat .v{ font-size:36px !important; }
"""
t = swap(t, '</style>\n</head>', V6CSS + '</style>\n</head>') if t.count('</style>\n</head>') == 1 else swap(t, '<script src="kit.js"></script>', '<style>' + V6CSS + '</style>\n<script src="kit.js"></script>')
# ---- v8 sounds: the Pixel Arcade one-shots (licensed for use inside games only) stay OUT of the repo. The block lives in
# project files and is embedded into the built game when present; without it the game keeps its code sounds.
t = swap(t, "$('jm-again').disabled=true;", "$('jm-again').disabled=true; if(S.fogOut&&SND.over) SND.over();")
SOUND_BLOCK = os.environ.get('JMR_SOUNDS', '/mnt/project-files/studio_trials/pixel_arcade_vital/jump_man_sound_block.js')
if os.path.exists(SOUND_BLOCK):
    sb = read(SOUND_BLOCK); assert 'PIXEL ARCADE SOUNDS' in sb and t.count('\n})();\n') == 1
    t = t.replace('\n})();\n', '\n' + sb.rstrip('\n') + '\n})();\n')
else:
    print('WARNING: no sound block at', SOUND_BLOCK, '- built with code sounds only')
# ---- v10 harder platforming (Kody 2026-11-24 "make the platforming and the jumps hard, not just the fog"). Measured reach with
# no upgrades: standing jump 147 px up, half-speed run 297, full run 392. v11 (Kody: running jumps 'mean', picked 'soften a lot'):
# most rises stay standing-jump height (108-138 px); by ledge 140 up to 1 ledge in 5 is a tall one (175-220 px) that needs a run.
# Ledges are narrower (110-170 px), farther apart sideways (up to 340 px), and more of them move or crumble.
# tests/reach.js proves every gap can be made from a half-speed run with no upgrades.
GEN_SWAPS = [
  ("    var p={i:i,h:prev.h+108+r[0]*24};",
   "    var L=Math.max(0,Math.min(1,(i-10)/130)), tall=i%FLOOR_EVERY!==0&&prev.kind!=='crumble'&&(r[5]*7)%1<0.2*L, p={i:i,h:prev.h+(tall?175+r[0]*45:108+r[0]*(24+6*L)),tall:tall};"),
  ("    else { var L=Math.min(1,i/150); p.w=Math.round(240-95*L+r[1]*(80-20*L));\n      p.amp=(i>12&&r[4]<0.16+0.16*L)? Math.round(50+r[9]*(20+70*L)) : 0;",
   "    else { p.w=Math.round(240-130*L+r[1]*(70-10*L));\n      p.amp=(i>12&&r[4]<0.16+0.26*L)? Math.round(50+r[9]*(20+80*L)) : 0;"),
  ("var d=(r[2]<0.5?-1:1)*(110+r[3]*(120+60*L));", "var d=(r[2]<0.5?-1:1)*(120+r[3]*(120+100*L));"),
  ("else if(i>18&&r[6]<0.10+0.18*L&&prev.kind!=='crumble') p.kind='crumble';", "else if(i>18&&r[6]<0.10+0.22*L&&prev.kind!=='crumble') p.kind='crumble';"),
]
for a_, b_ in GEN_SWAPS:
    t = swap(t, a_, b_)
# ---- v12 (Kody 2026-11-25, remake spec): a spare Waystone question, the fog pushed back by right answers and combos and
# never fast enough to win on math alone, a featured ledge type per stretch, a faster start, and the balance-check fixes.
t = swap(t, "/* ================= START / END", parts['V12'] + "\n/* ================= START / END")
for old, new in [
  ("function fresh(){ return { ver:4,", "function fresh(){ return { ver:5,"),
  ("if(v&&v.ver===4&&v.topics", "if(v&&v.ver===5&&v.topics"),
  ("function newQ(){ clearTimeout(nextT); if(S.way&&S.way.n>=3){ closeWay(); return; }", "function newQ(){ clearTimeout(nextT); if(S.over) return; if(S.way&&wayDone(S.way)){ closeWay(); return; }"),
  ("S.way.n>=3?700:450", "1500"),
  ("pick:function(){ pickOffer(0); }", "pick:function(){ offerAt=0; pickOffer(0); }"),   # test hook skips the card's 0.8 s read lock                                          # a right answer's explanation stays 1.5 s (Enter skips it)
  ("fogCalm(CALM_PER); SND.correct();", "fogPush(FOG_PUSH); SND.correct();"),
  ("if(fogOn()) fogCalm(Math.min(4,Math.floor(f/4)));", "if(fogOn()) fogPush(COMBO_PUSH*Math.min(4,Math.floor(f/4)));"),
  ("function comboPts(f){ return Math.round(f*f/2); }", "function comboPts(f){ f=Math.min(f,COMBO_CAPF); return Math.round(f*f/2); }"),
  ("rockStep(dt); rushStep();", "rockStep(dt); rushStep(); stretchStep(); idleStep(dt);"),
  ("drawKickHint(); drawFog();\n", "drawKickHint(); drawFog(); drawNudge();\n"),
  ("      if(!p.amp){ if(i>8&&r[6]<0.10", "      if(i<=3) p.cx=W/2+(i%2?-1:1)*(70+r[3]*50);   /* v12: the first ledges sit close to the start */\n      if(!p.amp){ if(i>8&&r[6]<0.10"),
  ("      if(p.kind!=='spring'&&r[11]<0.3){", "      stretchGen(p,prev,r);\n      if(p.kind!=='spring'&&r[11]<0.3){"),
  ("document.addEventListener('keyup',function(e){ var d=keyDir(e); if(d) keys[d]=false; });", "document.addEventListener('keyup',function(e){ var d=keyDir(e); if(d){ keys[d]=false; held[d]=false; } });"),
  ("  if(d){ e.preventDefault(); if(!S.started||S.over) return; if(d==='j')", "  if(d){ e.preventDefault(); held[d]=true; if(!S.started||S.over) return; if(d==='j')"),
  ("var armT=0; $('jm-again').addEventListener('click',function(){ var b=this; if(!b.classList.contains('arm')){ b.classList.add('arm');",
   "var armT=0, armAt=0; $('jm-again').addEventListener('click',function(){ var b=this; if(b.classList.contains('arm')&&now()-armAt<AGAIN_LOCK) return; if(!b.classList.contains('arm')){ armAt=now(); b.classList.add('arm');"),
  (".jm-next:disabled{ visibility:hidden; }", ".jm-next:disabled{ opacity:.35; cursor:default; }"),
  ("$('jmr-endwhy').textContent=S.fogOut?'The fog caught you!':'Time!';", "$('jmr-endwhy').textContent=S.fogOut?'The fog caught you! Right answers push it back, so keep going next time.':'Time!';"),
  ("[0,1,2].map(function(k){ var r=S.way.res[k];", "[0,1,2,3].slice(0,waySlots(S.way)).map(function(k){ var r=S.way.res[k];"),
  ("Every 40 ledges: 3 questions. Right answers hold back the fog; all 3 right teaches a new move and gives back a heart.",
   "Every 40 ledges a Waystone asks questions. Each right answer pushes the fog back; 3 right teaches a new move and gives back a heart. Miss one? You get a spare question."),
  ("All 3 right: a new move and a heart back. Each right answer holds the fog 3 s.", "3 right: a new move and a heart back. Miss one and you get a spare question. Each right answer pushes the fog back."),
]:
    t = swap(t, old, new)
# ---- v13 (Kody's v12 play notes): 2 right teaches the move with a spare 3rd question, rocks take a heart, faster late fog
for old, new in [
  ("function fresh(){ return { ver:5,", "function fresh(){ return { ver:6,"),
  ("if(v&&v.ver===5&&v.topics", "if(v&&v.ver===6&&v.topics"),
  ("Each right answer pushes the fog back; 3 right teaches a new move and gives back a heart. Miss one? You get a spare question.",
   "2 right teaches a new move and gives back a heart. Miss one? You get a spare question. Each right answer pushes the fog back."),
  ("3 right: a new move and a heart back. Miss one and you get a spare question. Each right answer pushes the fog back.",
   "2 right: a new move and a heart back. Miss one and you get a spare question. Each right answer pushes the fog back."),
]:
    t = swap(t, old, new)
# ---- v15: the title-screen arrow keycaps use the same pixel arrows as the in-game Moves list (game-local, kit.js untouched)
TITLE_ARROWS = r'''<script>
(function(){ var M={'↑':['...#...','..###..','.#####.','#######','..###..','..###..','..###..'],'←':['...#...','..##...','.######','#######','.######','..##...','...#...'],'→':['...#...','...##..','######.','#######','######.','...##..','...#...']};
  function svg(m){ var r=''; m.forEach(function(row,y){ for(var x=0;x<7;x++) if(row[x]==='#') r+='<rect x="'+x+'" y="'+y+'" width="1.02" height="1.02"/>'; }); return '<svg viewBox="0 0 7 7" style="width:30px;height:30px;display:block" fill="#15151D" shape-rendering="crispEdges" aria-hidden="true">'+r+'</svg>'; }
  function run(){ document.querySelectorAll('.jm-keys .sz-ctl kbd').forEach(function(k){ var ch=k.textContent.trim(); if(M[ch]){ k.innerHTML=svg(M[ch]); k.setAttribute('aria-label',ch==='←'?'Left arrow':ch==='→'?'Right arrow':'Up arrow'); } }); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',run); else run(); })();
</script>
</body>'''
t = swap(t, '</body>', TITLE_ARROWS)
for gone in ['S.energy+=', "U('energy')"]:
    assert gone not in t, gone
open(os.path.join(O, 'jump_man_multiplication.html'), 'w', encoding='utf-8').write(t)

# ---- the self-contained test copy ----
def inline(html, q):
    for name, body in [('kit.js', read(os.path.join(G, 'kit.js'))), ('questions.js', q), ('scorecode.js', read(os.path.join(G, 'scorecode.js')))]:
        tag = '<script src="%s"></script>' % name; assert html.count(tag) == 1, name
        html = html.replace(tag, '<script>\n' + body.replace('</script', '<\\/script') + '\n</script>')
    return html
q = read(os.path.join(G, 'questions.js'))
line = [l for l in q.split('\n') if l.startswith('var FALLBACK=ASSIGN.length?')][0]
qm = q.replace(line, "var FALLBACK='mult';   /* test copy: opens straight into multiplication facts */").replace('ASSIGN=TOPICS.assign.filter(', 'ASSIGN=[].filter(').replace('var HIDDEN=TOPICS.hidden,', 'var HIDDEN=[],')
assert qm.count("FALLBACK='mult'") == 1 and 'ASSIGN=[].filter(' in qm and 'var HIDDEN=[],' in qm
m = inline(t, qm)
link = re.search(r'<link href="\.\./fonts/([^"]+\.css)"[^>]*>', m)
fcss = read(os.path.join(ROOT, 'fonts', link.group(1)))
fcss = re.sub(r'url\((files/[^)]+)\)', lambda u: 'url(data:font/woff2;base64,' + base64.b64encode(open(os.path.join(ROOT, 'fonts', u.group(1)), 'rb').read()).decode() + ')', fcss)
m = m.replace(link.group(0), '<style>\n' + fcss + '\n</style>')
open(os.path.join(O, 'jump_man_remaster_mult.html'), 'w', encoding='utf-8').write(m)
print('built', len(t), 'site bytes;', len(m), 'test-copy bytes')
