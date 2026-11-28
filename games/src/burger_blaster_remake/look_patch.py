#!/usr/bin/env python3
"""Look test for the Burger Blaster remake: takes the live game and swaps ONLY the presentation
(full-width field, Saturday-morning cartoon art in code, no-box HUD, tray card mock, painted title).
Gameplay underneath is still the live game's. Usage: look_patch.py <live.html> <out.html>"""
import re, sys, os
src, out = sys.argv[1], sys.argv[2]
H = open(src, encoding='utf-8').read()
HERE = os.path.dirname(os.path.abspath(__file__))
TITLE = open(os.path.join(HERE, 'art', 'title_frame.webp.b64')).read().strip()

def sub_fn(name, nxt, body):
    global H
    i = H.index('function ' + name + '(')
    j = H.index(nxt, i)
    H = H[:i] + body.strip() + '\n' + H[j:]

def rep(a, b, count=1):
    global H
    assert a in H, a[:80]
    H = H.replace(a, b, count)

# ---------- world: full-width 16:9 field, forts pushed right (Angry Birds gap) ----------
rep("var M=window.Matter, W=1054, H=936, GY=846;", "var M=window.Matter, W=1664, H=936, GY=846, FX=430;")
rep("var SL={x:170,y:GY-176}", "var SL={x:250,y:GY-176}")
rep("free=function(x,y,w,h){ return x-w/2>8&&x+w/2<W-8&&", "free=function(x,y,w,h){ return x-w/2>8&&x+w/2<1046&&")
rep("for(var gx=525;gx<W-30;gx+=34)", "for(var gx=525;gx<1024;gx+=34)")
rep("function buildLevel(fromSnap){ newEngine(); var d=levelDef(S.level);",
    "function buildLevel(fromSnap){ newEngine(); var d=levelDef(S.level); d.statics.forEach(function(o){ o.x+=FX; }); d.blocks.forEach(function(o){ o.x+=FX; }); d.munchers.forEach(function(o){ o.x+=FX; });")
rep('<canvas id="bl-bgc" width="1054" height="936"', '<canvas id="bl-bgc" width="1664" height="936"')
rep('<canvas id="bl-canvas" width="1054" height="936"', '<canvas id="bl-canvas" width="1664" height="936"')

# ---------- palette ----------
INK = '#2B1B14'
CSS = r"""
/* ===== REMAKE LOOK TEST (Saturday-morning cartoon) ===== */
#stage{ display:block !important; padding:0 !important; background:#8FE3CF !important; }
.bl-top, .bl-q{ display:none !important; }
#bl-main{ position:absolute; inset:0; display:block; }
.bl-field{ position:absolute !important; inset:0; width:1920px !important; height:1080px !important; border:0 !important; border-radius:0 !important; box-shadow:none !important; background:#8FE3CF !important; }
#bl-bgc, #bl-canvas{ width:1920px !important; height:1080px !important; }
.bl-skip{ display:none !important; }
/* tray card */
.bb-tray{ position:absolute; left:calc(50% + 190px); top:calc(50% + 56px); width:980px; transform:translate(-50%,-50%) rotate(-1deg); z-index:12; background:#FFF4DC; color:#2B1B14; border:7px solid #2B1B14; border-radius:28px; box-shadow:14px 14px 0 rgba(43,27,20,.85); padding:34px 46px 40px; font-family:var(--body); }
.bb-tray[hidden]{ display:none !important; }
.bb-tray .hd{ display:flex; align-items:center; gap:22px; margin-bottom:18px; }
.bb-tray .ttl{ font:400 54px/1 'Bangers',sans-serif; letter-spacing:.04em; color:#E2382C; text-shadow:3px 3px 0 #2B1B14; -webkit-text-stroke:2px #2B1B14; }
.bb-tray .slots{ margin-left:auto; display:flex; gap:14px; }
.bb-tray .slot{ width:92px; height:92px; border-radius:50%; border:5px dashed #C7A98A; display:grid; place-items:center; }
.bb-tray .slot canvas{ width:84px; height:84px; }
.bb-tray .slot.ok{ border:5px solid #2E8B2E; background:#E2F7D8; }
.bb-tray .slot.no{ border:5px solid #B8452E; background:#F6E0D6; }
.bb-tray .qn{ font:800 26px/1 var(--body); color:#8A6A4E; margin-bottom:10px; }
.bb-tray .pr{ font:800 50px/1.2 var(--body); margin:0 0 26px; }
.bb-tray .pr .hl{ color:#D2691E; }
.bb-tray .ch{ display:grid; grid-template-columns:1fr 1fr; gap:18px; }
.bb-tray .c{ display:flex; align-items:center; gap:20px; background:#fff; border:5px solid #2B1B14; border-radius:18px; padding:16px 22px; font:800 44px/1 var(--body); box-shadow:6px 6px 0 #2B1B14; }
.bb-tray .c b{ width:58px; height:58px; border-radius:50%; background:#FFC53D; border:4px solid #2B1B14; display:grid; place-items:center; font:400 38px/1 'Spitz Digits','Bangers',sans-serif; flex:none; }
.bb-tray .c.right{ background:#CFF3C2; } .bb-tray .c.wrong{ background:#F9D2C9; opacity:.8; }
.bb-tray .foot{ margin-top:20px; font:700 28px/1.3 var(--body); color:#6E5440; }
.bb-tray .foot em{ font-style:normal; color:#2E8B2E; font-weight:800; }
/* title screen over Kody's painting */
#bl-start{ background:url(data:image/webp;base64,__TITLE__) center/cover no-repeat #8FE3CF !important; }
#bl-start::before, #bl-start::after{ display:none !important; }
#bl-start .sz-eyebrow, #bl-start .bl-big{ display:none !important; }
#bl-start > .bl-box{ width:1120px; margin-top:200px; background:#FFF4DC; color:#2B1B14; border:7px solid #2B1B14; border-radius:30px; box-shadow:14px 14px 0 rgba(43,27,20,.85); padding:24px 40px 18px; }
#bl-start .bl-sub{ color:#4A3426; font-size:28px; margin:0 0 16px; }
#bl-start .sz-ctl{ gap:10px 34px; margin-bottom:8px; } #bl-start .bl-row{ margin-bottom:14px; } #bl-start .bl-go{ height:84px; font-size:54px; } #bl-start .bl-keys{ margin-top:12px; }
#bl-start .bl-steps{ border-top:0; padding-top:0; gap:22px; margin-bottom:24px; }
#bl-start .bl-step{ background:#fff; border:4px solid #2B1B14 !important; border-radius:18px; box-shadow:5px 5px 0 #2B1B14; padding:14px 16px 16px; font-size:22px; transform:rotate(-1deg); -webkit-mask:none; mask:none; }
#bl-start .bl-step::before{ display:none; }
#bl-start .bl-step b{ font-size:34px; border-bottom:0; padding-bottom:4px; margin-bottom:6px; display:block; }
#bl-start .bl-input{ background:#fff; color:#2B1B14; border:5px solid #2B1B14; }
#bl-start .bl-go{ background:#E2382C; border:5px solid #2B1B14; box-shadow:8px 8px 0 #2B1B14; }
#bl-start .bl-keys{ color:#4A3426; }
#bl-start .sz-mus{ background:#fff; color:#2B1B14; border:5px solid #2B1B14; }
#bl-start .sz-mus.on{ background:#FFE08A; }
#bl-start .sz-ctl .l{ color:#2B1B14; font-size:24px; }
#bl-start .sz-ctl kbd{ border:3px solid #2B1B14; }
#bl-start .sz-meta kbd{ font-size:21px !important; } #bl-start .sz-meta{ font-size:21px !important; } #bl-start span.or{ font-size:21px !important; } #stage .sz-credit, .bl-credit{ font-size:21px !important; }
:root{ --sz-fs-x:.9 !important; --sz-fs-y:bottom !important; }
.bb-tray .body{ display:flex; gap:28px; align-items:flex-start; } .bb-tray .body .vis{ flex:none; } .bb-tray .body .vis:empty{ display:none; } .bb-tray .body .vis svg{ max-height:300px; width:auto; background:#fff; border:4px solid #2B1B14; border-radius:14px; } .bb-tray .body .rt{ flex:1; }
.bb-tray .pr span, .bb-tray .pr b, .bb-tray .pr i{ filter:brightness(.62) saturate(1.3); }
#bl-start .bl-credit{ color:#2B1B14; }
""".replace('__TITLE__', TITLE)
rep("</style>\n<script src=\"kit.js\"></script>", CSS + "</style>\n<script src=\"kit.js\"></script>")

# start screen words for the new rules (look only)
rep('<span class="sz-setname">Slope-intercept form.</span> You have 5 minutes: answer questions to earn burgers, then blast the towers.',
    '<span class="sz-setname">Slope-intercept form.</span> Feed every Muncher in 10 forts. Run out of burgers and the run is over.')
rep('<div class="bl-step"><b>Answer</b>Each right answer loads burgers and earns cash. A wrong answer costs a little cash and breaks your streak.</div>',
    '<div class="bl-step"><b>1. Answer</b>2 questions before each fort, plus a spare if you miss one. Right answers make special burgers.</div>')
rep('<div class="bl-step"><b>Blast</b>Drag back and let go to feed every Muncher. A streak of 3 loads a special burger: press Space in the air!</div>',
    '<div class="bl-step"><b>2. Fling</b>Drag back and let go, or aim with WASD or the arrows and press Space.</div>')
rep('<div class="bl-step"><b>Upgrade</b>Spend cash in the Snack Shop on more burgers, heavier patties, more points and power-ups.</div>',
    '<div class="bl-step"><b>3. Survive</b>Clear a fort to win a burger back. Clear it in a few shots for one more.</div>')

rep('data-ctl="1234=Answer | Drag=Aim and launch | Space=Special in the air | S=Shop"', 'data-ctl="ARROWS/WASD=Aim | Space=Fling | Drag=Aim and fling | 1234=Answer"')
rep("canvasText('COMBO ×'+Math.min(2,1+0.1*(S.combo-1)).toFixed(1),W-24,56,46,'#7BE36A','right')", "canvasText('COMBO ×'+Math.min(2,1+0.1*(S.combo-1)).toFixed(1),W-34,172,38,'#9BE87A','right')")
# tray card mock (filled by __look.tray())
rep('<div class="bl-buffs" id="bl-buffs"></div>', '<div class="bl-buffs" id="bl-buffs"></div><div class="bb-tray" id="bb-tray" hidden></div>')

# ---------- background: teal sky, halftone, clouds, skyline, brick rooftop ----------
sub_fn('drawBg', '\nfunction rr(', r"""
function drawBg(){ var c=bx, r=rng(42), INK='#2B1B14';
  var g=c.createLinearGradient(0,0,0,GY); g.addColorStop(0,'#7ED9C4'); g.addColorStop(1,'#C4F2DE'); c.fillStyle=g; c.fillRect(0,0,W,H);
  c.fillStyle='rgba(255,255,255,.16)'; for(var hy=8;hy<GY;hy+=16) for(var hx=(hy/16%2)*8;hx<W;hx+=16){ var k=1.2+2.2*(1-hy/GY); c.beginPath(); c.arc(hx,hy,k,0,7); c.fill(); }
  function cloud(x,y,s){ c.save(); c.translate(x,y); c.scale(s,s); c.fillStyle='#FFF6DD'; c.strokeStyle='rgba(43,27,20,.18)'; c.lineWidth=3;
    var bl=[[0,0,38],[48,-14,46],[102,0,34],[60,8,30]]; c.lineWidth=7; c.strokeStyle='rgba(43,27,20,.16)'; bl.forEach(function(q){ c.beginPath(); c.arc(q[0],q[1],q[2],0,7); c.stroke(); }); c.fillStyle='#FFF6DD'; bl.forEach(function(q){ c.beginPath(); c.arc(q[0],q[1],q[2],0,7); c.fill(); });
    c.fillStyle='rgba(240,200,140,.4)'; c.beginPath(); c.ellipse(60,24,60,10,0,0,7); c.fill(); c.restore(); }
  cloud(120,170,1.1); cloud(620,110,0.8); cloud(980,220,1.3); cloud(1400,130,1); cloud(1560,330,0.7);
  /* far skyline: soft teal blocks with a water tower */
  [['#9FD9C9',380,0.0],['#7CC3B4',260,0.5]].forEach(function(L,li){ var x=-30; while(x<W){ var w=70+r()*120, h=L[1]*(0.45+r()*0.55); c.fillStyle=L[0]; c.fillRect(x,GY-h,w,h);
      c.fillStyle=li?'rgba(255,255,255,.28)':'rgba(255,255,255,.22)'; for(var wy=GY-h+16;wy<GY-24;wy+=26) for(var wx=x+10;wx<x+w-16;wx+=22) if(r()<0.5) c.fillRect(wx,wy,10,14); x+=w+4; } });
  c.save(); c.translate(1180,GY-300); c.fillStyle='#5FA89A'; c.strokeStyle='#4B8B7E'; c.lineWidth=4; c.fillRect(-46,-70,92,70); c.beginPath(); c.moveTo(-54,-70); c.lineTo(0,-110); c.lineTo(54,-70); c.closePath(); c.fill();
    [-36,36].forEach(function(lx){ c.beginPath(); c.moveTo(lx,0); c.lineTo(lx*1.2,110); c.stroke(); }); c.beginPath(); c.moveTo(-40,40); c.lineTo(40,80); c.moveTo(40,40); c.lineTo(-40,80); c.stroke(); c.restore();
  /* the rooftop: cream ledge, red brick wall, dark seams */
  c.fillStyle='#C9533F'; c.fillRect(0,GY,W,H-GY); c.strokeStyle='rgba(43,27,20,.35)'; c.lineWidth=3;
  for(var by=GY+22,row=0;by<H;by+=22,row++){ c.beginPath(); c.moveTo(0,by); c.lineTo(W,by); c.stroke(); for(var bxx=(row%2)*28;bxx<W;bxx+=56){ c.beginPath(); c.moveTo(bxx,by); c.lineTo(bxx,by+22); c.stroke(); } }
  c.fillStyle='#F3E3C0'; c.fillRect(0,GY-6,W,22); c.strokeStyle=INK; c.lineWidth=5; c.beginPath(); c.moveTo(0,GY-6); c.lineTo(W,GY-6); c.moveTo(0,GY+16); c.lineTo(W,GY+16); c.stroke();
  c.fillStyle='rgba(43,27,20,.18)'; c.fillRect(0,GY+16,W,10);
  /* diner awning under the slingshot */
  var ax=40, aw=420, ay=GY+26; for(var i=0;i<aw/42;i++){ c.fillStyle=i%2?'#FFF4DC':'#E2382C'; c.beginPath(); c.moveTo(ax+i*42,ay); c.lineTo(ax+i*42+42,ay); c.lineTo(ax+i*42+48,ay+44); c.lineTo(ax+i*42+6,ay+44); c.closePath(); c.fill(); }
  c.strokeStyle=INK; c.lineWidth=5; c.beginPath(); c.moveTo(ax,ay); c.lineTo(ax+aw,ay); c.lineTo(ax+aw+6,ay+44); c.lineTo(ax+6,ay+44); c.closePath(); c.stroke();
  for(i=0;i<aw/42;i++){ c.beginPath(); c.arc(ax+i*42+27,ay+44,21,0,Math.PI); c.fillStyle=i%2?'#FFF4DC':'#E2382C'; c.fill(); c.stroke(); }
  /* chimney platforms: brick with a cream cap */
  statics.forEach(function(s){ var x0=s.position.x-s.w/2, y0=s.position.y-s.h/2; c.fillStyle='#C9533F'; c.fillRect(x0,y0,s.w,s.h); c.strokeStyle='rgba(43,27,20,.35)'; c.lineWidth=3;
    for(var yy=y0+20,rw=0;yy<y0+s.h;yy+=20,rw++){ c.beginPath(); c.moveTo(x0,yy); c.lineTo(x0+s.w,yy); c.stroke(); }
    c.fillStyle='#F3E3C0'; c.fillRect(x0-10,y0-14,s.w+20,16); c.strokeStyle=INK; c.lineWidth=5; c.strokeRect(x0-10,y0-14,s.w+20,16); c.strokeRect(x0,y0+2,s.w,s.h); });
  /* slingshot base block */
  c.fillStyle='#8A8F9C'; c.strokeStyle=INK; c.lineWidth=5; c.beginPath(); c.rect(SL.x-34,GY-30,68,26); c.fill(); c.stroke(); }
""")

# ---------- blocks: bright cartoon materials, thick brown-black outline ----------
sub_fn('paintBlock', '\nvar look=', r"""
function paintBlock(c,b){ var w=b.w, h=b.h, INK='#2B1B14'; c.save(); c.lineWidth=4; c.strokeStyle=INK; c.lineJoin='round';
  if(b.mat==='rock'){ c.fillStyle='#9AA3B5'; c.beginPath(); c.arc(0,0,w/2-1,0,7); c.fill(); c.fillStyle='#7C8597'; c.beginPath(); c.arc(4,5,w/2-7,0,7); c.fill(); c.fillStyle='#9AA3B5'; c.beginPath(); c.arc(-2,-2,w/2-9,0,7); c.fill();
    c.fillStyle='rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(-w*0.18,-w*0.2,w*0.12,w*0.07,-0.6,0,7); c.fill(); c.beginPath(); c.arc(0,0,w/2-1,0,7); c.stroke(); c.restore(); return; }
  if(b.mat==='wood'){ c.fillStyle='#F2B963'; c.fillRect(-w/2,-h/2,w,h); c.fillStyle='#FFD991'; var along=w>h;
      if(along) c.fillRect(-w/2,-h/2,w,Math.max(4,h*0.22)); else c.fillRect(-w/2,-h/2,Math.max(4,w*0.22),h);
      c.strokeStyle='#C47F36'; c.lineWidth=2.5; for(var i=1;i<3;i++){ c.beginPath(); if(along){ c.moveTo(-w/2+6,-h/2+h*i/3); c.lineTo(w/2-6,-h/2+h*i/3); } else { c.moveTo(-w/2+w*i/3,-h/2+6); c.lineTo(-w/2+w*i/3,h/2-6); } c.stroke(); }
      c.fillStyle='#8A5528'; [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(function(q){ if(Math.min(w,h)<24) return; c.beginPath(); c.arc(q[0]*(w/2-7),q[1]*(h/2-7),2.6,0,7); c.fill(); }); c.strokeStyle=INK; c.lineWidth=4; }
  else if(b.mat==='glass'){ c.fillStyle='rgba(176,238,246,.78)'; c.fillRect(-w/2,-h/2,w,h); c.fillStyle='rgba(120,206,222,.6)'; c.fillRect(-w/2,h/2-Math.max(4,h*0.2),w,Math.max(4,h*0.2));
    c.strokeStyle='rgba(255,255,255,.95)'; c.lineWidth=4; c.beginPath(); c.moveTo(-w/2+7,h/2-10); c.lineTo(-w/2+Math.min(w,h)*0.5,-h/2+7); c.stroke(); c.lineWidth=2.5; c.beginPath(); c.moveTo(-w/2+16,h/2-8); c.lineTo(-w/2+Math.min(w,h)*0.62,-h/2+14); c.stroke(); c.strokeStyle=INK; c.lineWidth=4; }
  else if(b.mat==='tnt'){ c.fillStyle='#E2382C'; c.fillRect(-w/2,-h/2,w,h); c.fillStyle='#B8261D'; c.fillRect(-w/2,-h/2,w,8); c.fillRect(-w/2,h/2-8,w,8); c.fillStyle='rgba(255,255,255,.25)'; c.fillRect(-w/2+4,-h/2+10,6,h-20);
    c.font='400 '+Math.round(h*0.42)+'px '+DF; c.textAlign='center'; c.textBaseline='middle'; c.lineWidth=5; c.strokeStyle=INK; c.strokeText('TNT',0,2); c.fillStyle='#FFE08A'; c.fillText('TNT',0,2); c.textBaseline='alphabetic'; c.strokeStyle=INK; c.lineWidth=4; }
  else { c.fillStyle='#AEB6C6'; c.fillRect(-w/2,-h/2,w,h); c.fillStyle='#C9D0DC'; c.fillRect(-w/2,-h/2,w,Math.max(4,h*0.18)); var r=rng(b.seed); c.fillStyle='#8790A3'; for(var j=0;j<w*h/300;j++){ c.beginPath(); c.arc(-w/2+5+r()*(w-10),-h/2+5+r()*(h-10),1.5+r()*2,0,7); c.fill(); } }
  c.strokeRect(-w/2,-h/2,w,h);
  if(b.hp<b.hpMax*0.6){ var rr2=rng(b.seed+3); c.strokeStyle=b.mat==='glass'?'#FFFFFF':INK; c.lineWidth=3; c.beginPath(); var x=-w/2+w*0.3, y=-h/2+3; c.moveTo(x,y);
    for(var s=0;s<4;s++){ x+=(rr2()-0.3)*w*0.35; y+=h/4.5; c.lineTo(x,y); } c.stroke(); }
  c.restore(); }
""")

# ---------- Munchers: chunky purple, cat ears, googly eyes, fangs ----------
sub_fn('drawMuncher', '\n/* canvas text', r"""
function drawMuncher(m,t){ var c=cx, x=m.position.x, y=m.position.y, k=1, a=1, INK='#2B1B14';
  if(m.state!=='hungry'){ m.t++; k=1+Math.min(0.3,m.t*0.02); a=Math.max(0,1-m.t/45); y-=m.t*(m.state==='fed'?1.6:0.6); }
  if(a<=0) return; c.save(); c.globalAlpha=a; c.translate(x,y); if(m.ouch>0){ k*=1+m.ouch*0.18; m.ouch=Math.max(0,m.ouch-0.08); } c.rotate(m.state==='hungry'?m.angle*0.3:0); var zk=k*(m.R||MUNCH_R)/22; c.scale(zk,zk);
  var bob=m.state==='hungry'?Math.sin(t/300+m.id)*1.2:0; c.lineJoin='round'; c.lineWidth=3.6; c.strokeStyle=INK;
  /* ears */
  c.fillStyle='#9B4FD0'; [-1,1].forEach(function(s){ c.beginPath(); c.moveTo(s*8,-17); c.lineTo(s*19,-31); c.lineTo(s*21,-11); c.closePath(); c.fill(); c.stroke(); c.fillStyle='#E9A3D9'; c.beginPath(); c.moveTo(s*11,-17); c.lineTo(s*18,-26); c.lineTo(s*18.5,-15); c.closePath(); c.fill(); c.fillStyle='#9B4FD0'; });
  /* body + belly shade + halftone */
  c.fillStyle='#A85AD8'; c.beginPath(); c.ellipse(0,bob*0.3,22.5,21+bob*0.5,0,0,7); c.fill();
  c.save(); c.clip(); c.fillStyle='#8A3FBE'; c.beginPath(); c.ellipse(5,9,22,16,0,0,7); c.fill(); c.fillStyle='rgba(60,20,90,.28)'; for(var hy=-4;hy<22;hy+=4.5) for(var hx=-22;hx<24;hx+=4.5) { c.beginPath(); c.arc(hx+(hy%9?2:0),hy,0.9,0,7); c.fill(); } c.restore();
  c.beginPath(); c.ellipse(0,bob*0.3,22.5,21+bob*0.5,0,0,7); c.stroke();
  var blink=m.state==='hungry'&&((t/1000+m.blink)%4)<0.12;
  /* googly eyes on top */
  [-8.5,8.5].forEach(function(ex){ if(m.state==='bonk'){ c.strokeStyle=INK; c.lineWidth=3.4; c.beginPath(); c.moveTo(ex-4,-13); c.lineTo(ex+4,-5); c.moveTo(ex+4,-13); c.lineTo(ex-4,-5); c.stroke(); return; }
    if(m.state==='fed'||blink){ c.strokeStyle=INK; c.lineWidth=3.4; c.beginPath(); c.arc(ex,-8,5,Math.PI*1.1,Math.PI*1.9); c.stroke(); return; }
    c.fillStyle='#FFFDF4'; c.beginPath(); c.ellipse(ex,-10,7.2,8.2,0,0,7); c.fill(); c.lineWidth=3; c.stroke(); var dx=look.x-x, dy=look.y-y, L=Math.hypot(dx,dy)||1; c.fillStyle=INK; c.beginPath(); c.arc(ex+dx/L*3,-10+dy/L*3.4,3.3,0,7); c.fill(); c.fillStyle='#fff'; c.beginPath(); c.arc(ex+dx/L*3-1.1,-10+dy/L*3.4-1.2,1,0,7); c.fill(); });
  c.lineWidth=3.2;
  if(m.state==='fed'){ c.fillStyle='#7A1E2E'; c.beginPath(); c.arc(0,5,8,0,Math.PI); c.closePath(); c.fill(); c.stroke(); c.fillStyle='#FF8FB0'; [-14,14].forEach(function(ex){ c.globalAlpha=a*0.7; c.beginPath(); c.arc(ex,3,4,0,7); c.fill(); }); c.globalAlpha=a; }
  else if(m.state==='bonk'){ c.strokeStyle=INK; c.beginPath(); c.moveTo(-7,9); c.quadraticCurveTo(0,3,7,9); c.stroke(); }
  else { var open=drag||flying.length?1:0.6, mh=4+8*open; c.fillStyle='#7A1E2E'; c.beginPath(); c.moveTo(-12,1); c.quadraticCurveTo(0,-1,12,1); c.quadraticCurveTo(10,1+mh*1.4,0,1+mh*1.4); c.quadraticCurveTo(-10,1+mh*1.4,-12,1); c.closePath(); c.fill(); c.stroke();
    c.fillStyle='#FF7FA0'; c.beginPath(); c.ellipse(1,1+mh*1.05,5.5,2.8,0,0,7); c.fill();
    c.fillStyle='#FFFDF4'; c.lineWidth=2; [[-8,1],[6,1]].forEach(function(f){ c.beginPath(); c.moveTo(f[0],f[1]+0.5); c.lineTo(f[0]+2.2,f[1]+3+2*open); c.lineTo(f[0]+4.4,f[1]+0.5); c.closePath(); c.fill(); c.stroke(); }); }
  if(m.helmet&&m.state==='hungry'){ c.fillStyle='#B9C0CF'; c.strokeStyle=INK; c.lineWidth=3.6; c.beginPath(); c.moveTo(-24,-12); c.quadraticCurveTo(-24,-34,0,-34); c.quadraticCurveTo(24,-34,24,-12); c.closePath(); c.fill(); c.stroke();
    c.fillStyle='#EEF1F7'; c.fillRect(-15,-29,8,4); c.fillStyle='#8A92A5'; c.fillRect(-26,-15,52,6); c.strokeRect(-26,-15,52,6); }
  if(m.king){ c.fillStyle='#FFC93D'; c.strokeStyle=INK; c.lineWidth=3; c.beginPath(); c.moveTo(-14,-20); c.lineTo(-17,-40); c.lineTo(-7,-30); c.lineTo(0,-44); c.lineTo(7,-30); c.lineTo(17,-40); c.lineTo(14,-20); c.closePath(); c.fill(); c.stroke();
    c.fillStyle='#E2382C'; c.beginPath(); c.arc(0,-27,3.2,0,7); c.fill(); c.stroke(); }
  c.restore();
  if(m.king&&m.state==='hungry'){ for(var hp=0;hp<m.hpMax;hp++){ var hx=x+(hp-(m.hpMax-1)/2)*22, hy=y+m.R*0.7; c.fillStyle=hp<m.hp?'#E2382C':'#C7A98A'; c.strokeStyle=INK; c.lineWidth=3; c.beginPath(); c.arc(hx,hy,8,0,7); c.fill(); c.stroke(); } }
  if(m.state==='fed'){ c.save(); c.globalAlpha=a; c.fillStyle='#FF6B9A'; c.font='800 24px Inter, sans-serif'; c.textAlign='center'; c.fillText('♥',x-20,y-40-m.t*0.5); c.fillText('♥',x+22,y-46-m.t*0.7); c.restore(); }
  if(m.state==='bonk'){ c.save(); c.globalAlpha=a; c.fillStyle='#FFC53D'; c.font='800 22px Inter, sans-serif'; c.textAlign='center'; for(var s=0;s<3;s++){ var an=m.t*0.15+s*2.1; c.fillText('★',x+Math.cos(an)*20,y-32+Math.sin(an)*6); } c.restore(); } }
""")

# ---------- burger outline color ----------
rep("var k=r/24; c.scale(k,k); c.lineWidth=2.5; c.strokeStyle='#05030C';", "var k=r/24; c.scale(k,k); c.lineWidth=3.2; c.strokeStyle='#2B1B14'; c.lineJoin='round';")

# ---------- slingshot: wooden Y with a red band ----------
rep("""c.lineCap='round'; c.strokeStyle='#05030C'; c.lineWidth=13; c.beginPath(); c.moveTo(SL.x,SL.y+26); c.lineTo(SL.x+16,SL.y-30); c.stroke(); c.strokeStyle='#DCD7EE'; c.lineWidth=8; c.stroke();""",
    """c.lineCap='round'; c.strokeStyle='#2B1B14'; c.lineWidth=24; c.beginPath(); c.moveTo(SL.x,GY-30); c.lineTo(SL.x,SL.y+30); c.stroke(); c.strokeStyle='#D99A4E'; c.lineWidth=15; c.stroke();
  c.strokeStyle='#2B1B14'; c.lineWidth=22; c.beginPath(); c.moveTo(SL.x,SL.y+34); c.lineTo(SL.x+22,SL.y-34); c.stroke(); c.strokeStyle='#C98642'; c.lineWidth=13; c.stroke();""")
rep("""if(ready){ c.strokeStyle='#C2301F'; c.lineWidth=6;""", """if(ready){ c.strokeStyle='#2B1B14'; c.lineWidth=11; c.beginPath(); c.moveTo(SL.x+22,SL.y-28); c.lineTo(bx2+P.r*0.6,by2); c.stroke(); c.strokeStyle='#B8261D'; c.lineWidth=6;""")
rep("""if(ready){ c.strokeStyle='#FF4B3E'; c.lineWidth=7; c.beginPath(); c.moveTo(SL.x-16,SL.y-24);""", """if(ready){ c.strokeStyle='#2B1B14'; c.lineWidth=12; c.beginPath(); c.moveTo(SL.x-22,SL.y-28); c.lineTo(bx2-P.r*0.6,by2); c.stroke(); c.strokeStyle='#E2382C'; c.lineWidth=7; c.beginPath(); c.moveTo(SL.x-22,SL.y-28);""")
rep("""c.strokeStyle='#05030C'; c.lineWidth=13; c.beginPath(); c.moveTo(SL.x,SL.y+26); c.lineTo(SL.x-16,SL.y-30); c.stroke(); c.strokeStyle='#F3F0FB'; c.lineWidth=8; c.stroke();
  c.strokeStyle='#05030C'; c.lineWidth=13; c.beginPath(); c.moveTo(SL.x,SL.y+26); c.lineTo(SL.x,SL.y+30); c.stroke();""",
    """c.strokeStyle='#2B1B14'; c.lineWidth=22; c.beginPath(); c.moveTo(SL.x,SL.y+34); c.lineTo(SL.x-22,SL.y-34); c.stroke(); c.strokeStyle='#E0A75C'; c.lineWidth=13; c.stroke();
  c.fillStyle='#E2382C'; c.strokeStyle='#2B1B14'; c.lineWidth=3; [[SL.x+22,SL.y-26],[SL.x-22,SL.y-26]].forEach(function(p){ c.beginPath(); c.rect(p[0]-9,p[1]-6,18,12); c.fill(); c.stroke(); });""")

# ---------- burger pile beside the slingshot = the lives readout ----------
rep("""var nb=buffOn('free')?6:Math.min(S?S.burgers-(ready?1:0):0,6); for(var i=0;i<nb;i++) drawBurger(SL.x+78+(i%2)*6,GY-16-i*30,15,0);
  if(S&&S.burgers>7&&!buffOn('free')) canvasText('×'+(S.burgers-1),SL.x+81,GY-16-6*30-28,34,'#FFC53D');""",
    """var nb=Math.max(0,Math.min(S?S.burgers-(ready?1:0):0,12)); for(var i=0;i<nb;i++){ var px=SL.x+86+(i%4)*40+((i/4|0)%2)*20, py=GY-22-(i/4|0)*30; drawBurger(px,py,17,0); }
  if(S&&S.started) canvasText('×'+Math.max(0,S.burgers),SL.x+86+138,GY-22-Math.max(0,Math.ceil(nb/4)-1)*30-4,52,'#FFE08A','left');""")
rep("""drawAmmo(sp,SL.x-86,GY-26-(i-(ready?1:0))*52,20,0,t); });""", """drawAmmo(sp,SL.x-120,GY-30-(i-(ready?1:0))*56,22,0,t); });""")

# ---------- HUD on the field: no boxes ----------
rep("""canvasText('LEVEL '+(S.level+1),24,56,46,'#FFF7EC','left'); canvasText(left?left+' Muncher'+(left>1?'s':'')+' left':'All fed!',24,94,30,'#C9A6FF','left'); }""",
    """canvasText('FORT '+(S.level+1)+' of 10',W/2,70,58,'#FFF4DC');
    var faces=munchers.filter(function(m){ return m.state==='hungry'; }).length, tot=munchers.length; for(var fi=0;fi<tot;fi++){ var fx=W/2+(fi-(tot-1)/2)*40, fy=112; cx.save(); cx.globalAlpha=fi<faces?1:0.35; cx.fillStyle='#A85AD8'; cx.strokeStyle='#2B1B14'; cx.lineWidth=3; cx.beginPath(); cx.arc(fx,fy,14,0,7); cx.fill(); cx.stroke(); cx.fillStyle='#fff'; cx.beginPath(); cx.arc(fx-5,fy-3,4,0,7); cx.arc(fx+5,fy-3,4,0,7); cx.fill(); cx.fillStyle='#2B1B14'; cx.beginPath(); cx.arc(fx-5,fy-3,1.8,0,7); cx.arc(fx+5,fy-3,1.8,0,7); cx.fill(); cx.restore(); }
    canvasText(S.score.toLocaleString(),W-34,74,64,'#FFF4DC','right'); var mul=window.__lookMul||'x1.5'; canvasText(mul,W-34,124,44,'#FFC93D','right'); }""")
rep("""if(!banner) canvasText('★ par '+S.lvPar+' · shots '+S.lvShots,W-24,S.combo>=3&&stepN-comboAt<90?94:56,28,'#C9A6FF','right'); }""", "}")
rep("""if(ls&&stepN-ls.born>=5) canvasText('SPACE or click: '+SPEC[ls.spec].tip+'!',W/2,190,46,SPEC[ls.spec].c);
    else if(lsp&&!flying.length) { canvasText('NEXT: '+SPEC[lsp].name.toUpperCase(),24,146,34,SPEC[lsp].c,'left'); canvasText('Space or click in the air to '+SPEC[lsp].tip,24,178,24,'#FFF7EC','left'); }""",
    """if(ls&&stepN-ls.born>=5) canvasText('SPACE or click: '+SPEC[ls.spec].tip+'!',W/2,210,46,SPEC[ls.spec].c);
    else if(lsp&&!flying.length) { canvasText(SPEC[lsp].name.toUpperCase()+' loaded',SL.x-150,SL.y-120,36,SPEC[lsp].c,'left'); canvasText('Space in the air: '+SPEC[lsp].tip,SL.x-150,SL.y-84,26,'#FFF4DC','left'); }""")
rep("""canvasText('OUT OF BURGERS',W/2,470,74,'#FF4B3E'); canvasText('← Answer a question to reload',W/2,524,38,'#FFF7EC'); }""", """}""")
rep("""if(S.started&&!S.over&&!haveBurger()&&!flying.length&&!S.clearing){ c.fillStyle='rgba(9,6,20,.6)'; rr(c,W/2-330,400,660,150,24); c.fill();""", """if(false){""")
rep("c.save(); c.globalAlpha=al; c.translate(W/2,330);", "c.save(); c.globalAlpha=al; c.translate(W/2,360);")
rep("canvasText(banner.sub,0,56,40,'#C9A6FF');", "canvasText(banner.sub,0,58,42,'#FFF4DC');")
rep("banner.text==='BOSS LEVEL'?'#FF4B3E':'#FFF7EC'", "banner.text==='BOSS LEVEL'?'#E2382C':'#FFF4DC'")
rep("on?'#FFC53D':'#3A2E63'", "on?'#FFC93D':'#C7A98A'")
rep("text:isBoss(S.level)?'BOSS LEVEL':'LEVEL '+(S.level+1)", "text:isBoss(S.level)?'BOSS FORT':'FORT '+(S.level+1)")
# trail crumbs: darker on a light sky
rep("c.fillStyle='rgba(255,247,236,.35)'; lastTrail.forEach", "c.fillStyle='rgba(43,27,20,.22)'; lastTrail.forEach")
rep("c.fillStyle='rgba(255,247,236,.8)'; trail.forEach", "c.fillStyle='rgba(43,27,20,.5)'; trail.forEach")
rep("pts.forEach(function(p,i){ c.globalAlpha=buffOn('aim')?1:Math.max(0.15,1-i/pts.length); c.beginPath(); c.arc(p[0],p[1],i===0?5:4,0,7); c.fill(); });",
    "pts.forEach(function(p,i){ c.globalAlpha=Math.max(0.2,1-i/pts.length); c.beginPath(); c.arc(p[0],p[1],i===0?6.5:5.5,0,7); c.fillStyle='#FFF4DC'; c.fill(); c.lineWidth=2.5; c.strokeStyle='#2B1B14'; c.stroke(); });")

# v5 (Kody 2026-11-26): "Made by Spitz" only bottom right on the start and end screens, never in the in-game top bar
rep('<span><b>BURGER</b> <i>BLASTER</i></span></h1><span class="bl-credit sz-credit">Made by Spitz <i class="sz-burger" aria-hidden="true"></i></span></div>',
    '<span><b>BURGER</b> <i>BLASTER</i></span></h1></div>')

# ---------- look-test hooks: tray card mock ----------
TRAY = r"""
window.__look={ tray:function(state){ var q=QS.next(), el=$('bb-tray'); if(!state){ el.hidden=true; return; }
  var slots=state.slots||['','',''], html='<div class="hd"><span class="ttl">LOAD YOUR BURGERS!</span><div class="slots">'+slots.map(function(s,i){ return '<div class="slot '+s+'"><canvas width="84" height="84" data-s="'+s+'" data-i="'+i+'"></canvas></div>'; }).join('')+'</div></div>'
    +'<div class="qn">Question '+(state.n||1)+' of 3</div><div class="body"><div class="vis">'+(q.visual||'')+'</div><div class="rt"><div class="pr">'+q.prompt+'</div><div class="ch">'+q.choices.map(function(c,i){ var cl=state.show&&c.ok?' right':state.show&&i===state.pick&&!c.ok?' wrong':''; return '<div class="c'+cl+'"><b>'+(i+1)+'</b><span>'+c.html+'</span></div>'; }).join('')+'</div></div></div>'
    +'<div class="foot">'+(state.show?'<em>Right! Your burger is now a Hot Sauce burger.</em>':'Right answer = special burger. Wrong = a plain burger. You keep every burger.')+'</div>';
  el.innerHTML=html; el.hidden=false;
  Array.prototype.forEach.call(el.querySelectorAll('canvas'),function(cv2){ var g=cv2.getContext('2d'), s=cv2.dataset.s, keep=cx; cx=g; g.clearRect(0,0,84,84); if(s==='ok') drawAmmo(['slider','hot','bomb'][+cv2.dataset.i],42,46,24,0,0); else if(s==='no') drawBurger(42,46,24,0,0.55); else { g.globalAlpha=0.3; drawBurger(42,46,24,0); g.globalAlpha=1; } cx=keep; }); } };
"""
rep("window.__G={", TRAY + "window.__G={")
open(out, 'w', encoding='utf-8').write(H)
print('ok', len(H))
