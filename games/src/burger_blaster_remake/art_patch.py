"""v7: draw the approved ChatGPT art (Munchers, King, burgers, slingshot) from one sprite atlas.
Code drawing stays as the fallback until the atlas loads.  usage: python3 art_patch.py in.html out.html"""
import sys, json, os
src, dst = sys.argv[1], sys.argv[2]
h = open(src).read(); here = os.path.dirname(os.path.abspath(__file__))
B64 = open(os.path.join(here, 'art/sprites.webp.b64')).read().strip()
LAY = json.load(open(os.path.join(here, 'art/sprites.json')))
def rep(a, b, n=1):
    global h; c = h.count(a); assert c == n, (c, a[:80]); h = h.replace(a, b)

# 1. atlas loader + helper, right before drawBurger
rep("function drawBurger(x,y,r,ang,alpha){", """/* v7 art: one atlas cut from the approved sheets (Sprite Drop 7b334bd1 + 5dacb39e) */
var SPR=new Image(), SPRok=false, SPRL=%s; SPR.onload=function(){ SPRok=true; }; SPR.src='data:image/webp;base64,%s';
function spr(n,x,y,w,h){ var q=SPRL[n]; cx.drawImage(SPR,q[0],q[1],q[2],q[3],x,y,w,h); }
function blink0(m,t){ return ((t/1000+m.blink)%%4)<0.12; }
/* v8 frames (Sprite Drop 5855df0e; helmet frames 5684b3ac): chomp loop while a burger is coming, blink, scared when one whizzes close, chewing when fed; King: open mouth while you aim, angry after a hit, chewing when beaten */
function sprPose(m,t,bl){ var aim=!!(drag||flying.length), f=flying[0], near=f&&Math.hypot(f.position.x-m.position.x,f.position.y-m.position.y)<230;
  if(m.king){ if(m.ouch>0.9) m.madUntil=now()+1600; if(m.state!=='hungry') return m.t<26?'k5':'k2'; if(m.ouch>0.02) return 'k1'; if(m.madUntil&&now()<m.madUntil) return 'k4'; return aim?'k3':'k0'; }
  if(m.helmet) m.hadHelm=1; else if(m.hadHelm){ m.hadHelm=0; m.helmOff=now(); }
  if(m.state==='fed') return m.t<26?'m7':'m1'; if(m.state==='bonk') return 'm2';
  if(m.helmOff&&now()-m.helmOff<550) return 'h3';
  if(m.helmet){ if(near) return 'h2'; if(bl) return 'h1'; var hp2=(t/1000+m.blink*0.37)%%(aim?0.36:2.6); return hp2<(aim?0.17:0.22)?'h0':'m3'; }
  if(near) return 'm6'; if(bl) return 'm5';
  var ph=(t/1000+m.blink*0.37)%%(aim?0.36:2.6); return ph<(aim?0.17:0.22)?'m4':'m0'; }
window.__BBpose=function(){ var t=performance.now(); return munchers.map(function(m){ return sprPose(m,t,blink0(m,t)); }); };
function sprBurger(n,x,y,r,ang,alpha){ var c=cx, q=SPRL[n], b=SPRL.b0, k=r*1.95/b[2], w=q[2]*k, hh=q[3]*k; c.save(); c.translate(x,y); c.rotate(ang||0); if(alpha!=null) c.globalAlpha*=alpha; spr(n,-w/2,b[3]*k/2-hh,w,hh); c.restore(); }
function drawBurger(x,y,r,ang,alpha){ if(SPRok){ sprBurger('b0',x,y,r,ang,alpha); return; }""" % (json.dumps(LAY, separators=(',', ':')), B64))
# 2. specials
rep("function drawAmmo(sp,x,y,r,ang,t){ var c=cx;", "function drawAmmo(sp,x,y,r,ang,t){ var c=cx; if(SPRok&&(sp==='slider'||sp==='hot'||sp==='bomb')){ sprBurger(sp==='slider'?'b1':sp==='hot'?'b2':'b3',x,y,r,ang); return; }")
# 3. Munchers and the King
rep("  var bob=m.state==='hungry'?Math.sin(t/300+m.id)*1.2:0; c.lineJoin='round'; c.lineWidth=3.6; c.strokeStyle=INK;\n",
    "  var bob=m.state==='hungry'?Math.sin(t/300+m.id)*1.2:0; c.lineJoin='round'; c.lineWidth=3.6; c.strokeStyle=INK;\n"
    "  if(SPRok){ var pn=sprPose(m,t,blink0(m,t)), q=SPRL[pn], sk=(m.king?2.7:2.75)*22/SPRL[m.king?'k0':'m0'][3], sw=q[2]*sk, sh=q[3]*sk;\n"
    "    spr(pn,-sw/2,23-sh+bob*0.4,sw,sh); } else {\n")
rep("    c.fillStyle='#E2382C'; c.beginPath(); c.arc(0,-27,3.2,0,7); c.fill(); c.stroke(); }\n  c.restore();",
    "    c.fillStyle='#E2382C'; c.beginPath(); c.arc(0,-27,3.2,0,7); c.fill(); c.stroke(); }\n  } c.restore();")
# 4. slingshot: painted fork, bands tied to its wraps
L = h.split('\n'); i = [n for n, l in enumerate(L) if l.startswith("  /* the fork: back prong")]; assert len(i) == 1; i = i[0]
stem, back, bband, burger, fband, front, wraps = L[i+1:i+8]
assert stem.startswith("  c.lineCap='round'") and wraps.startswith("  c.fillStyle='#E2382C'"), (stem[:40], wraps[:40])
bband = bband.replace("SL.x+22,SL.y-28", "SL.x+FX,SL.y-28").replace("SL.x+16,SL.y-26", "SL.x+FX-6,SL.y-26")
fband = fband.replace("SL.x-22,SL.y-28", "SL.x-FX,SL.y-28")
assert 'FX' in bband and fband.count('FX') == 2
L[i+1:i+8] = ["  if(!SPRok){", stem, "  }", "  var FX=SPRok?40:22; if(SPRok){ var sq=SPRL.sling; spr('sling',SL.x-67,SL.y-63,135,GY+4-(SL.y-63)); } else {", back, "  }", bband, burger, fband, "  if(!SPRok){", front, wraps, "  }"]
h = '\n'.join(L)
# the painted slingshot stands on the roof ledge: no grey base block
rep("  c.fillStyle='#8A8F9C'; c.strokeStyle=INK; c.lineWidth=5; c.beginPath(); c.rect(SL.x-34,GY-30,68,26); c.fill(); c.stroke(); }", "  }")

# ================= v10: art critique fixes (Kody "Yes", 2026-11-26) =================
# 2. slingshot: back band behind the fork, painted pouch behind the burger, thick inked bands
L = h.split('\n'); i = [n for n, l in enumerate(L) if l.startswith("  var FX=SPRok?40:22;")]; assert len(i) == 1; i = i[0]
assert L[i+3].startswith("  if(ready){ c.strokeStyle='#2B1B14'; c.lineWidth=11;") and L[i+5].startswith("  if(ready){ c.strokeStyle='#2B1B14'; c.lineWidth=12;"), (L[i+3][:50], L[i+5][:50])
# v11: chunky turned slingshot kit (Sprite Drop 51ce9bca): back band behind the fork, pouch back, burger, pouch front lip, front band
L[i] = "  var FX=SPRok?40:22, SG=bbSlingGeo(), PRL=SPRok?SG.aF:[SL.x-FX,SL.y-28], PRR=SPRok?SG.aB:[SL.x+FX,SL.y-28], PG=null, BA=null, BB=null;\n" \
       "  if(ready){ if(SPRok){ PG=bbPouchG(bx2,by2,P.r,PRL,PRR); var dl=Math.hypot(PG.L[0]-PRL[0],PG.L[1]-PRL[1]), dr=Math.hypot(PG.R[0]-PRL[0],PG.R[1]-PRL[1]); BA=dl<dr?PG.L:PG.R; BB=dl<dr?PG.R:PG.L; } else { BA=[bx2-P.r*0.6,by2]; BB=[bx2+P.r*0.6,by2]; } bbBand(PRR[0],PRR[1],BB[0],BB[1],'#B8261D'); }\n" \
       "  if(SPRok){ bbSlingDraw(SG); /* v20: the back strap is drawn first, so it runs behind the wood */ } else {"
L[i+3] = "  if(PG) bbPouch(bx2,by2,PG,false);"
L[i+5] = "  if(ready){ if(PG) bbPouch(bx2,by2,PG,true); bbBand(PRL[0],PRL[1],BA[0],BA[1],'#E2382C'); if(SPRok){ bbWrapTop('wf'); if(Math.hypot(bx2-PRL[0],by2-PRL[1])<P.r+34) drawAmmo(loadedSpec(),bx2,by2,P.r,d?0:-0.15,t); } }"
h = '\n'.join(L)
rep("function drawBurger(x,y,r,ang,alpha){ if(SPRok)", """/* v13b: the slingshot itself drawn in code to Kody's reference: natural tapered wooden Y, near prong left, far prong right (darker, behind), cut tops, dark leather wraps */
var BBSL=null;
function bbSlingGeo(){ var H=GY+4-(SL.y-70), s=H/362, bx=SL.x, by=GY+6; function P(x,y){ return [bx+x*s, by+y*s]; }
  var sw=bbSway(), cs=Math.cos(sw), sn=Math.sin(sw); function R(p){ var x=p[0]-bx, y=p[1]-by; return [bx+x*cs-y*sn, by+x*sn+y*cs]; }
  return {s:s, P:P, top:by-366*s, cx:bx, by:by, H:H, sw:sw, aF:R(P(-34,-292)), aB:R(P(42,-289))}; }
/* v19 feel: after a shot the slingshot rocks forward and settles, and the empty pouch whips through and springs back (off with reduce motion) */
var BBsnap={pull:[0,0]};
function bbSway(){ var ts=now()-lastShotAt; if(RM||!lastShotAt||ts>560) return 0; var k=ts/560; return 0.05*Math.sin(k*Math.PI*3)*(1-k); }
function bbSwayOn(G){ if(!G.sw) return false; cx.save(); cx.translate(G.cx,G.by); cx.rotate(G.sw); cx.translate(-G.cx,-G.by); return true; }
function bbSlingDraw(G){ if(!BBSL){ var K=2, w=200, h=G.H+30, ox=G.cx-100, oy=G.top-18, cv2=document.createElement('canvas'); cv2.width=w*K; cv2.height=h*K; var g=cv2.getContext('2d'); g.scale(K,K); g.translate(-ox,-oy);
    var s=G.s, P=G.P, INK='#140C06', WB='#FC941D', WS='#B75D0F', WH='#FFB24A', WG='#A2520E', GL='rgba(255,244,214,.85)', WR='#4E2C18', WRH='#7A4A2A';
    /* v17: same paint as the crates (orange wood, dark wavy grain, thick ink, a glossy streak); ONE traced outline so nothing looks stuck on */
    function sil(dx,dy){ dx=(dx||0); dy=(dy||0); function m(x,y){ var p=P(x,y); return [p[0]+dx,p[1]+dy]; }
      function M(x,y){ var p=m(x,y); g.moveTo(p[0],p[1]); } function Ln(x,y){ var p=m(x,y); g.lineTo(p[0],p[1]); } function Q(a,b,x,y){ var c=m(a,b), p=m(x,y); g.quadraticCurveTo(c[0],c[1],p[0],p[1]); }
      g.beginPath(); M(-16,0); Ln(-15,-100); Q(-21,-160,-41,-215); Q(-57,-265,-58,-358); Ln(-17,-362);
      Q(-16,-200,-5,-166); Q(4,-146,13,-166); Q(25,-205,28,-342); Ln(63,-345); Q(59,-232,41,-186); Q(17,-150,16,-100); Ln(16,0); g.closePath(); }
    var CL={trunk:[[0,-4],[0,-80],[0,-150]], front:[[-14,-170],[-38,-228],[-38,-352]], back:[[18,-176],[42,-228],[45,-336]]};
    function qp(c,t,o){ var u=1-t, x=u*u*c[0][0]+2*u*t*c[1][0]+t*t*c[2][0], y=u*u*c[0][1]+2*u*t*c[1][1]+t*t*c[2][1]; return P(x+o,y); }
    function grain(c,o,t0,t1,col,lw,wob){ g.beginPath(); for(var i=0;i<=24;i++){ var t=t0+(t1-t0)*i/24, p=qp(c,t,o+Math.sin(t*14+o)*wob); if(!i) g.moveTo(p[0],p[1]); else g.lineTo(p[0],p[1]); } g.strokeStyle=col; g.lineWidth=lw; g.stroke(); }
    g.lineJoin='round'; g.lineCap='round';
    var d=7*s;
    g.save(); sil(); g.clip();
    g.fillStyle=WS; g.fillRect(ox,oy,w,h);
    g.fillStyle=WH; sil(-d,0); g.fill();
    g.save(); sil(-d,0); g.clip(); g.fillStyle=WB; sil(d*0.5,0); g.fill(); g.restore();
    grain(CL.trunk,-6,0.05,0.95,WG,3,1.6); grain(CL.trunk,6,0.15,0.75,WG,2.6,1.4);
    grain(CL.front,-4,0.05,0.62,WG,3,1.6); grain(CL.front,8,0.25,0.6,WG,2.4,1.2);
    grain(CL.back,1,0.05,0.62,WG,2.6,1.4);
    var f0=P(0,-170), f1=P(0,-230), gr=g.createLinearGradient(0,f0[1],0,f1[1]); gr.addColorStop(0,'rgba(90,30,0,0)'); gr.addColorStop(1,'rgba(90,30,0,.22)'); var bx0=P(12,0)[0];
    g.fillStyle=gr; g.fillRect(bx0,oy,w,f0[1]-oy);
    grain(CL.front,-11,0.28,0.6,GL,4.5*s+1,0); grain(CL.trunk,-8,0.45,0.85,GL,4*s+1,0); grain(CL.back,-7,0.35,0.58,'rgba(255,244,214,.5)',3.5*s+1,0);
    function band(x0,x1,ya,yb,tilt){ var a=P(x0,ya-tilt), b=P(x1,ya+tilt), c2=P(x1,yb+tilt), e=P(x0,yb-tilt); g.beginPath(); g.moveTo(a[0],a[1]); g.lineTo(b[0],b[1]); g.lineTo(c2[0],c2[1]); g.lineTo(e[0],e[1]); g.closePath();
      g.fillStyle=WR; g.fill(); var m1=P(x0,(ya+yb)/2), m2=P(x1,(ya+yb)/2); g.strokeStyle='rgba(20,10,4,.35)'; g.lineWidth=2; g.beginPath(); g.moveTo(m1[0],m1[1]); g.lineTo(m2[0],m2[1]); g.stroke();
      g.strokeStyle=INK; g.lineWidth=4.5; g.beginPath(); g.moveTo(a[0],a[1]); g.lineTo(b[0],b[1]); g.moveTo(e[0],e[1]); g.lineTo(c2[0],c2[1]); g.stroke();
      var h1=P(x0,ya-tilt+7), h2=P(x1,ya+tilt+7); g.strokeStyle=WRH; g.lineWidth=3; g.beginPath(); g.moveTo(h1[0],h1[1]); g.lineTo(h2[0],h2[1]); g.stroke(); }
    band(-70,6,-318,-266,2); band(14,72,-312,-266,2);
    g.restore();
    sil(); g.strokeStyle=INK; g.lineWidth=6.5; g.stroke();
    function cap(x,y,rx,col,ring){ var c=P(x,y); g.beginPath(); g.ellipse(c[0],c[1],rx*s,rx*s*0.32,-0.06,0,7); g.fillStyle=col; g.fill(); g.lineWidth=5; g.strokeStyle=INK; g.stroke();
      g.beginPath(); g.ellipse(c[0]+1,c[1],rx*s*0.5,rx*s*0.14,-0.06,0,7); g.lineWidth=2; g.strokeStyle=ring; g.stroke(); }
    cap(45.5,-343.5,17.5,'#F2B866','#C46E1C'); cap(-38,-360,20,'#FFD08A','#D07A20');
    /* v18: each wrap again on its own layer, laid over the strap end, so the strap comes out from under the wrap like Kody's picture */
    function ov(x0,x1,ya,yb){ var c3=document.createElement('canvas'); c3.width=w*K; c3.height=h*K; g=c3.getContext('2d'); g.scale(K,K); g.translate(-ox,-oy); g.lineJoin='round'; g.lineCap='round';
      g.save(); sil(); g.clip(); band(x0,x1,ya,yb,2); g.restore();
      g.save(); var a=P(x0,ya-8), b=P(x1,yb+8); g.beginPath(); g.rect(a[0],a[1],b[0]-a[0],b[1]-a[1]); g.clip(); sil(); g.strokeStyle=INK; g.lineWidth=6.5; g.stroke(); g.restore(); return c3; }
    var WF=ov(-70,6,-318,-266), WK=ov(14,72,-312,-266);
    BBSL={cv:cv2,x:ox,y:oy,w:w,h:h,wf:WF,wb:WK}; }
  BBSL.G=G; var sw=bbSwayOn(G); cx.drawImage(BBSL.cv,BBSL.x,BBSL.y,BBSL.w,BBSL.h); if(sw) cx.restore(); }
function bbWrapTop(k){ if(!(BBSL&&BBSL[k])) return; var sw=bbSwayOn(BBSL.G); cx.drawImage(BBSL[k],BBSL.x,BBSL.y,BBSL.w,BBSL.h); if(sw) cx.restore(); }
/* v12b: straps drawn like Kody's reference: thin dark leather from each prong's wrap to a strap cupped round the back of the burger */
function bbStrap(c,pts,th){ c.save(); c.lineCap='round'; c.lineJoin='round'; c.beginPath(); c.moveTo(pts[0][0],pts[0][1]); for(var i=1;i<pts.length;i++) c.lineTo(pts[i][0],pts[i][1]);
  c.strokeStyle='#140C06'; c.lineWidth=th+6; c.stroke(); c.strokeStyle='#4E2C18'; c.lineWidth=th; c.stroke(); c.restore(); }
function bbBand(x0,y0,x1,y1,col){ var L=Math.hypot(x1-x0,y1-y0); bbStrap(cx,[[x0,y0],[x1,y1]],Math.max(6,9-L/60)); }
function bbPouchG(bx,by,r,PL,PR){ var mx=(PL[0]+PR[0])/2, my=(PL[1]+PR[1])/2, d=Math.hypot(mx-bx,my-by), u=d<34?-Math.PI/2:Math.atan2(my-by,mx-bx), k=u+Math.PI, sp=0.85, pts=[], o=[], n=[];
  for(var i=0;i<=14;i++){ var f=i/14, t=k-sp+2*sp*f, th=6+11*Math.sin(Math.PI*f), rr=r*0.95; pts.push([bx+Math.cos(t)*rr,by+Math.sin(t)*rr]); o.push([bx+Math.cos(t)*(rr+th*0.75),by+Math.sin(t)*(rr+th*0.75)]); n.push([bx+Math.cos(t)*(rr-th*0.25),by+Math.sin(t)*(rr-th*0.25)]); }
  return {pts:pts,o:o,n:n,L:pts[0],R:pts[14]}; }
/* v17 pouch: a leather patch cupping the far side of the burger, wide in the middle and narrowing into the straps */
function bbPouch(bx,by,g,front){ if(front) return; var c=cx; c.save(); c.lineJoin='round'; c.beginPath(); c.moveTo(g.o[0][0],g.o[0][1]); g.o.forEach(function(p){ c.lineTo(p[0],p[1]); }); for(var i=g.n.length-1;i>=0;i--) c.lineTo(g.n[i][0],g.n[i][1]); c.closePath();
  c.fillStyle='#4E2C18'; c.fill(); c.strokeStyle='#140C06'; c.lineWidth=5; c.stroke();
  c.beginPath(); for(var j=3;j<=11;j++){ var a=g.o[j], b=g.n[j], q=[a[0]*0.35+b[0]*0.65,a[1]*0.35+b[1]*0.65]; if(j===3) c.moveTo(q[0],q[1]); else c.lineTo(q[0],q[1]); } c.strokeStyle='#7A4A2A'; c.lineWidth=2.5; c.lineCap='round'; c.stroke(); c.restore(); }
function drawBurger(x,y,r,ang,alpha){ if(SPRok)""")
# 3. HUD Munchers-left row: small painted heads (hungry = open mouth, fed = full and happy), no grey ghosts
rep("cx.save(); cx.globalAlpha=fi<faces?1:0.35; cx.fillStyle='#A85AD8';",
    "if(SPRok){ var hn=fi<faces?'m0':'m1', hq=SPRL[hn], hk=38/SPRL.m0[3]; spr(hn,fx-hq[2]*hk/2,fy+19-hq[3]*hk,hq[2]*hk,hq[3]*hk); continue; } cx.save(); cx.globalAlpha=fi<faces?1:0.35; cx.fillStyle='#A85AD8';")
rep("var fx=W/2+(fi-(tot-1)/2)*40, fy=112;", "var fx=W/2+(fi-(tot-1)/2)*(SPRok?50:40), fy=SPRok?110:112;")
# 4. trails: crumbs and sesame seeds behind a plain burger; heat puffs / sparks / blue streaks behind specials
rep("  c.fillStyle='rgba(43,27,20,.22)'; lastTrail.forEach(function(p,i){ if(i%2) return; c.beginPath(); c.arc(p[0],p[1],3,0,7); c.fill(); });\n  c.fillStyle='rgba(43,27,20,.5)'; trail.forEach(function(p,i){ if(i%2) return; c.beginPath(); c.arc(p[0],p[1],i%4?3:4.5,0,7); c.fill(); });",
    "  bbCrumbs(lastTrail,0.3); bbCrumbs(trail,1);")
rep("function bbBand(", """function bbCrumbs(tr,al){ var c=cx; c.save(); c.lineWidth=1.6; c.strokeStyle='rgba(43,27,20,'+(0.7*al)+')'; tr.forEach(function(p,i){ if(i%2) return; var k=i%6;
  if(k===0){ c.fillStyle='rgba(255,240,200,'+al+')'; c.beginPath(); c.ellipse(p[0],p[1],4.2,2.4,(i*0.7)%3,0,7); c.fill(); c.stroke(); }
  else { c.fillStyle=k===2?'rgba(201,124,58,'+(0.85*al)+')':'rgba(150,84,40,'+(0.8*al)+')'; c.beginPath(); c.arc(p[0]+((i*7)%5-2),p[1]+((i*3)%5-2),k===2?3.2:2.4,0,7); c.fill(); } }); c.restore(); }
function bbSpecTrail(b,t){ var c=cx, tr=b._tr||(b._tr=[]); tr.push([b.position.x,b.position.y]); if(tr.length>18) tr.shift(); c.save();
  for(var i=0;i<tr.length;i++){ var p=tr[i], k=i/tr.length, j=Math.sin(i*12.9+t/60);
    if(b.spec==='hot'){ c.globalAlpha=k*0.55; c.fillStyle=i%3?'#FF8A3D':'#FFC53D'; c.beginPath(); c.arc(p[0]+j*3,p[1]+j*2,4+(1-k)*14,0,7); c.fill(); }
    else if(b.spec==='bomb'){ if(i%2) continue; c.globalAlpha=k; c.fillStyle=i%4?'#FFE08A':'#FF8A3D'; c.beginPath(); c.arc(p[0]+j*9,p[1]+Math.cos(i*7.3+t/50)*9,2+k*3,0,7); c.fill(); }
    else { c.globalAlpha=k*0.6; c.strokeStyle='#58C7FF'; c.lineWidth=3+k*5; c.lineCap='round'; if(i){ c.beginPath(); c.moveTo(tr[i-1][0],tr[i-1][1]); c.lineTo(p[0],p[1]); c.stroke(); } } }
  c.restore(); }
function bbBand(""")
rep("if(b.spec&&!b.used){ c.strokeStyle=SPEC[b.spec].c; c.globalAlpha=0.5+0.3*Math.sin(t/90); c.lineWidth=4; c.beginPath(); c.arc(b.position.x,b.position.y,b.r+9,0,7); c.stroke(); c.globalAlpha=1; }",
    "if(b.spec&&!b.used) bbSpecTrail(b,t);")
# 5. burger pile: a tight pyramid (5, 4, 3), special burgers sit on top of it
rep("for(var i=0;i<nb;i++){ var px=SL.x+86+(i%4)*40+((i/4|0)%2)*20, py=GY-22-(i/4|0)*30; drawBurger(px,py,17,0); }",
    "var PCX=SL.x+178, prow=[0,5,9,12], ptop=GY-22; for(var i=0;i<nb;i++){ var rw=i<5?0:i<9?1:2, rn=Math.min(nb,prow[rw+1])-prow[rw], j=i-prow[rw], px=PCX+(j-(rn-1)/2)*36, py=GY-22-rw*27; ptop=py; drawBurger(px,py,17,0); }")
rep("cx.translate(SL.x+86+138,GY-22-Math.max(0,Math.ceil(nb/4)-1)*30-4);", "cx.translate(PCX+104,GY-26);")
rep("drawAmmo(sp,SL.x-120,GY-30-(i-(ready?1:0))*56,22,0,t);", "var wi=i-(ready?1:0), wn=S.spec.length-(ready?1:0); drawAmmo(sp,PCX+(wi-(wn-1)/2)*44,nb?ptop-28:GY-26,22,0,t);")
rep("x1=SL.x+120, y1=GY-60;", "x1=SL.x+178, y1=GY-70;")
# 7. HUD right: one column. Score, then the multiplier/streak line only once it means something, combo on the same line style
rep("cx.save(); cx.translate(W-34,124); cx.scale(mk,mk); canvasText('x'+mn+(mn<3?'  ·  streak '+S.streak:''),0,0,mn>1?44:34,mn>1?'#FFC93D':'#FFF4DC','right'); cx.restore();",
    "var hl2=(mn>1?'x'+mn+' points':'')+(mn>1&&S.streak>1&&mn<3?'  ·  ':'')+(S.streak>1&&mn<3?'streak '+S.streak:''); J.hudY=hl2?172:124; if(hl2){ cx.save(); cx.translate(W-34,124); cx.scale(mk,mk); canvasText(hl2,0,0,40,mn>1?'#FFC93D':'#FFF4DC','right'); cx.restore(); }")
rep("canvasText('COMBO ×'+Math.min(2,1+0.1*(S.combo-1)).toFixed(1),W-34,172,38,'#9BE87A','right');",
    "canvasText('combo x'+Math.min(2,1+0.1*(S.combo-1)).toFixed(1),W-34,J.hudY||124,40,'#9BE87A','right');")

# v10: painted blocks (Sprite Drop ef404fd0) and rooftop backdrop (f30fd86b)
BLK = open(os.path.join(here, 'art/blocks.webp.b64')).read().strip(); BGD = open(os.path.join(here, 'art/backdrop.webp.b64')).read().strip()
rep("function drawBlock(b){ var cr=b.hp<b.hpMax*0.6; if(!b.spr||b.sprCr!==cr){",
    """/* v10 painted block tiles: squares use the whole tile, long planks and posts stretch it like a picture frame (corners kept, grain runs along the plank) */
var BLK=new Image(), BLKok=false; BLK.onload=function(){ BLKok=true; dirty=true; }; BLK.src='data:image/webp;base64,%s';
var BGI=new Image(), BGok=false; BGI.onload=function(){ BGok=true; drawBg(); dirty=true; }; BGI.src='data:image/webp;base64,%s';
var BLKC=136, BLKI={wood:0,glass:1,stone:2,tnt:3,rock:4};
function bbTile(c,b,cr){ var col=BLKI[b.mat]||0, w=b.w, h=b.h, sx=col*BLKC, sy=cr?BLKC:0;
  if(b.mat==='rock'||Math.max(w,h)/Math.min(w,h)<1.3){ c.drawImage(BLK,sx,sy,BLKC,BLKC,-w/2-1,-h/2-1,w+2,h+2); return; }
  c.save(); if(h>w){ c.rotate(Math.PI/2); var t0=w; w=h; h=t0; }
  var S0=20, d=Math.min(13,h/2), m=BLKC-2*S0, ey=0;
  function nine(sy2,onlyMid){ var X=[-w/2,-w/2+d,w/2-d,w/2], Y=[-h/2,-h/2+d,h/2-d,h/2], U=[0,S0,BLKC-S0,BLKC];
    for(var i=0;i<3;i++) for(var j=0;j<3;j++){ if(onlyMid&&(i!==1||j!==1)) continue; var dw=X[i+1]-X[i], dh=Y[j+1]-Y[j]; if(dw<=0||dh<=0) continue;
      c.drawImage(BLK,sx+U[i],sy2+U[j],U[i+1]-U[i],U[j+1]-U[j],X[i],Y[j],dw+0.6,dh+0.6); } }
  nine(0,false); if(cr){ nine(BLKC,true); var r2=rng(b.seed+3); c.strokeStyle=b.mat==='glass'?'#FFFFFF':'#2B1B14'; c.lineWidth=3; c.lineJoin='round'; c.beginPath(); var x=-w*0.2, y=-h/2+2; c.moveTo(x,y); for(var s=0;s<3;s++){ x+=(r2()-0.3)*h*0.9; y+=h/3.2; c.lineTo(x,y); } c.stroke(); }
  c.restore(); }
function drawBlock(b){ var cr=b.hp<b.hpMax*0.6; if(!b.spr||b.sprCr!==cr||b.sprOk!==BLKok){ b.sprOk=BLKok;""" % (BLK, BGD))
rep("function paintBlock(c,b){ var w=b.w, h=b.h, INK='#2B1B14';", "function paintBlock(c,b){ if(BLKok){ bbTile(c,b,b.hp<b.hpMax*0.6); return; } var w=b.w, h=b.h, INK='#2B1B14';")
rep("function drawBg(){ var c=bx, r=rng(42), INK='#2B1B14';", "function drawBg(){ var c=bx, r=rng(42), INK='#2B1B14'; if(BGok){ c.drawImage(BGI,0,0,W,H); } else {")
rep("  /* chimney platforms: brick with a cream cap */", "  }\n  /* chimney platforms: brick with a cream cap */")
# 6 + 8 + 9: end screen as a cream card with a painted Muncher/King, readable START and credit, smaller question card higher up
rep('<div class="bl-over" id="bl-end" hidden><div class="bl-box"><div class="sz-eyebrow">Spitz <b>Arcade</b></div>',
    '<div class="bl-over" id="bl-end" hidden><div class="bl-box"><canvas id="bb-endart" width="300" height="300" aria-hidden="true"></canvas>')
rep("  $('bl-end').hidden=false; if(celebrate&&S.won)",
    "  try{ var ea=$('bb-endart'), eg=ea.getContext('2d'); eg.clearRect(0,0,300,300); if(SPRok){ var en=S.won?'k5':'m1', eq=SPRL[en], es=Math.min(290/eq[2],290/eq[3]); eg.drawImage(SPR,eq[0],eq[1],eq[2],eq[3],150-eq[2]*es/2,296-eq[3]*es,eq[2]*es,eq[3]*es); } }catch(e){}\n  $('bl-end').hidden=false; if(celebrate&&S.won)")
CSS = """
/* ===== v10 art critique fixes ===== */
#bl-start .bl-go{ color:#FFF4DC; text-shadow:3px 3px 0 #2B1B14; }
#bl-start .bl-go:disabled{ background:#E9D9C2; color:#6E5440; text-shadow:none; box-shadow:5px 5px 0 #2B1B14; }
.bl-over .bl-credit.sz-credit{ background:#FFF4DC; color:#2B1B14 !important; border:4px solid #2B1B14; border-radius:999px; padding:10px 20px; box-shadow:4px 4px 0 #2B1B14; }
#bl-end{ background:rgba(43,27,20,.78) !important; }
#bl-end::before, #bl-end::after{ display:none !important; }
#bl-end{ --panel:#FFF8EA; --muted:#6E5440; --text:#2B1B14; --accent:#C2410C; }
#bl-end .bl-box{ position:relative; background:#FFF4DC; color:#2B1B14; border:7px solid #2B1B14; border-radius:30px; box-shadow:16px 16px 0 rgba(43,27,20,.85); padding:40px 60px 40px 330px; max-width:1240px; text-align:left; transform:rotate(-.6deg); }
#bb-endart{ position:absolute; left:20px; top:50%; width:300px; height:300px; transform:translateY(-50%); }
#bl-end .bl-sub{ color:#6E5440 !important; font:800 34px/1.2 var(--body) !important; }
#bl-end .bl-name{ color:#E2382C !important; font:400 56px/1 'Bangers',sans-serif !important; letter-spacing:.03em; -webkit-text-stroke:2px #2B1B14; text-shadow:3px 3px 0 #2B1B14; margin:12px 0 0; }
#bl-end .bl-final{ color:#FFC53D !important; font:400 150px/1 'Bangers',sans-serif !important; -webkit-text-stroke:5px #2B1B14; text-shadow:7px 7px 0 #2B1B14; margin:4px 0 16px; }
#bl-end .bl-stats, #bl-end .bl-topics{ display:flex !important; flex-wrap:wrap; gap:6px 34px; justify-content:flex-start; margin:0 0 14px; }
#bl-end .bl-stat{ background:none !important; border:0 !important; box-shadow:none !important; padding:0 !important; min-width:0 !important; display:flex; align-items:baseline; gap:10px; }
#bl-end .bl-stat .l{ order:2; font:700 26px/1.2 var(--body) !important; letter-spacing:0 !important; text-transform:none !important; color:#6E5440 !important; }
#bl-end .bl-stat .v{ order:1; font:400 46px/1 'Bangers',sans-serif !important; color:#2B1B14 !important; letter-spacing:.02em; }
#bl-end .bl-topics .bl-stat .v{ font-size:36px !important; } #bl-end .bl-topics .bl-stat .l{ font-size:22px !important; }
#bl-end .spz-code{ background:#FFF8EA; border:4px dashed #C2410C; margin:8px 0 18px; justify-content:flex-start; }
#bl-end .spz-code .v{ color:#2B1B14; }
#bl-end .bl-again{ background:#E2382C; color:#FFF4DC; border:5px solid #2B1B14; border-radius:16px; box-shadow:7px 7px 0 #2B1B14; font:400 50px/1 'Bangers',sans-serif; letter-spacing:.05em; text-shadow:3px 3px 0 #2B1B14; padding:14px 50px; transform:none; }
.bb-tray{ top:160px !important; width:900px !important; padding:26px 40px 30px !important; transform:translate(-50%,0) rotate(-1deg) scale(.8) !important; transform-origin:50% 0; }
.bb-tray.nudge{ animation:bbnudge2 1.2s ease-in-out infinite !important; } @keyframes bbnudge2{ 50%{ transform:translate(-50%,-10px) rotate(-1deg) scale(.8); } }
.bb-tray .pr{ margin:0 0 20px !important; } .bb-tray .foot{ margin-top:14px !important; }
.bb-tray.nudge .nudgetip{ background:#FFC53D !important; color:#2B1B14 !important; border:5px solid #2B1B14; box-shadow:5px 5px 0 #2B1B14; font:400 38px/1 'Bangers',sans-serif !important; letter-spacing:.04em; top:auto !important; bottom:-62px; transform:translateX(-50%) rotate(1.5deg) !important; }
@media (prefers-reduced-motion: reduce){ .bb-tray.nudge{ animation:none !important; } }
/* v19 cleanup (balance check, 2026-11-27): the card sits left of centre so it stops covering the fort; the F hint moves clear of the Made by Spitz pill */
.bb-tray{ left:41% !important; }
:root{ --sz-fs-x:.66 !important; }
.bb-tray .pr span, .bb-tray .pr b, .bb-tray .pr i{ white-space:nowrap; }
#bl-start span.or{ color:#8A6A4E !important; }
.bb-tray .body .vis svg{ max-height:260px !important; }
.bb-tray .body .vis:not(:empty) ~ .rt .c{ padding:12px 14px !important; gap:12px !important; font-size:38px !important; }
.bb-tray .body .vis:not(:empty) ~ .rt .c b{ width:48px; height:48px; font-size:32px; }
.bb-tray .foot span:not(.bad):not(.nx), .bb-tray .foot i{ filter:brightness(.62) saturate(1.3); }
"""
# v19: end screen says forts and stars as two plain stats
rep("['Forts cleared',S.levels+' · '+S.stars+'★']", "['Forts cleared',S.levels],['Stars',S.stars+' ★']")
# ===== v21 critique pass (Kody 2026-11-27: "critique the game, anything that looks or feels off, fix it") =====
# the flight prompt never sits on the wind arrow or on the fort-clear stars
rep("if(ls&&stepN-ls.born>=5) canvasText('SPACE or click: '+SPEC[ls.spec].tip+'!',W/2,210,46,SPEC[ls.spec].c);",
    "if(ls&&stepN-ls.born>=5&&!S.clearing&&!(banner&&banner.stars)) canvasText('SPACE or click: '+SPEC[ls.spec].tip+'!',W/2,S.wind?252:210,46,SPEC[ls.spec].c);")
# the combo readout no longer hangs around half faded while a question card is open
rep("if(S.combo>=3&&stepN-comboAt<90){", "if(S.combo>=3&&stepN-comboAt<90&&!S.tray&&!S.clearing){")
# no HUD bleeding through behind the end card
rep("  if(engine){ var left=munchers.filter(", "  if(engine&&!S.over){ var left=munchers.filter(")
# multiplier line: a deeper gold that still reads when it lands on a cloud
rep("canvasText(hl2,0,0,40,mn>1?'#FFC93D':'#FFF4DC','right');", "canvasText(hl2,0,0,42,mn>1?'#FFB21A':'#FFF4DC','right');")
# point pops: stay solid, then fade (they used to fade from the first frame and read as grey mush); quick strings of small pops fold into one total
rep("pops=pops.filter(function(p){ p.life++; c.globalAlpha=Math.max(0,1-p.life/60); canvasText(p.t,p.x,p.y-p.life*0.9,34,p.c); c.globalAlpha=1; return p.life<60; });",
    "pops=pops.filter(function(p){ p.life++; var pk=p.life<8?0.7+p.life*0.0375:1; c.globalAlpha=p.life<38?1:Math.max(0,1-(p.life-38)/22); c.save(); c.translate(p.x,p.y-(1-Math.pow(1-Math.min(1,p.life/60),2))*56); c.scale(pk,pk); canvasText(p.t,0,0,p.big?44:34,p.c); c.restore(); c.globalAlpha=1; return p.life<60; });")
rep("function pop(x,y,t,c){ pops.push({x:x,y:y,t:t,c:c,life:0}); }",
    "function pop(x,y,t,c){ var mm=/^\\+(\\d+)$/.exec(String(t)); if(mm){ for(var pi=pops.length-1;pi>=0;pi--){ var q=pops[pi]; if(q.sum&&q.life<22&&Math.abs(q.x-x)<150&&Math.abs(q.y-y)<150){ q.sum+=+mm[1]; q.t='+'+q.sum; q.life=Math.min(q.life,8); q.c=c; return; } } pops.push({x:x,y:y,t:t,c:c,life:0,sum:+mm[1]}); return; } pops.push({x:x,y:y,t:t,c:c,life:0,big:1}); }")
# empty stars on the clear banner: light cream, not muddy brown
rep("canvasText('★',(si-1)*96,-100-(si===1?18:0),on?96:84,on?'#FFC93D':'#C7A98A');", "canvasText('★',(si-1)*96,-100-(si===1?18:0),on?96:84,on?'#FFC93D':'#F3E7CF');")
# the castle shape belongs to fort 10 only, so THE CASTLE is not a repeat of fort 6 or 7
rep("tier===1?['bridge','dominoes','wall','stilts','bunker']:['stilts','bunker','sky','wall','stilts','bunker','bridge','dominoes']", "tier===1?['bridge','dominoes','stilts','bunker']:['stilts','bunker','sky','stilts','bunker','bridge','dominoes']")
# the King reads as the boss: drawn a fifth bigger (look only, his hit area is unchanged)
rep("sk=(m.king?2.7:2.75)*22/SPRL[m.king?'k0':'m0'][3]", "sk=(m.king?3.3:2.75)*22/SPRL[m.king?'k0':'m0'][3]")
# ===== v19 feel: strap snap + idle straps =====
rep("  var P=PATTY[S?U('patty'):0], bx2=SL.x+pull[0], by2=SL.y+pull[1];",
    "  var P=PATTY[S?U('patty'):0], snapT=now()-lastShotAt, snapping=SPRok&&!RM&&lastShotAt>0&&snapT<280, strapOn=ready||(SPRok&&S&&S.started);\n"
    "  if(snapping){ var sk=snapT/280, se=Math.cos(sk*Math.PI*2.5)*(1-sk); if(se<0) se*=0.5; pull=[BBsnap.pull[0]*se,BBsnap.pull[1]*se]; dirty=true; } else if(ready&&SPRok) BBsnap.pull=[pull[0],pull[1]];\n"
    "  if(SPRok&&lastShotAt>0&&snapT<600) dirty=true;\n"
    "  var bx2=SL.x+pull[0], by2=SL.y+pull[1];")
rep("  if(ready){ if(SPRok){ PG=bbPouchG(", "  if(strapOn){ if(SPRok){ PG=bbPouchG(")
rep("  var lsp=ready?loadedSpec():null; if(ready){ var bounce=", "  var lsp=ready?loadedSpec():null; if(ready&&!snapping){ var bounce=")
rep("  if(ready){ if(PG) bbPouch(bx2,by2,PG,true);", "  if(strapOn){ if(PG) bbPouch(bx2,by2,PG,true);")
rep("if(Math.hypot(bx2-PRL[0],by2-PRL[1])<P.r+34) drawAmmo(", "if(ready&&!snapping&&Math.hypot(bx2-PRL[0],by2-PRL[1])<P.r+34) drawAmmo(")

# ===== v22: fixes for all 13 finds of the v21 balance check (2026-11-27) =====
CSS += r"""
/* v22: graph questions get a wide card and a big graph (was ~120 px on a Chromebook) */
.bb-tray.vis{ width:1240px !important; left:33.9% !important; }
.bb-tray.vis .body .vis svg{ max-height:none !important; width:480px !important; height:480px !important; }
.bb-tray .body .rt .ch.one{ grid-template-columns:1fr !important; gap:14px !important; }
.bb-tray .body .rt .c span{ white-space:nowrap; }   /* v23: an answer never breaks in the middle, on any card */
.bb-tray .vis svg .bbdim{ opacity:.18; } .bb-tray .vis svg .bbhit{ stroke-width:9px; }
/* v22: graphs sit on the dark board they were drawn for, so grid numbers and labels read */
.bb-tray .body .vis svg{ background:#12151D !important; }
/* v22: end screen numbers use the digit font (a Bangers 7 read as a 1) */
#bl-end .bl-stat .v{ font-family:'Spitz Digits','Bangers',sans-serif !important; }
#bl-end .bb-prac{ flex-basis:100%; font:700 26px/1.2 var(--body); color:#6E5440; } #bl-end .bb-prac b{ color:#2B1B14; }
/* v22: each slot says what the answer did */
.bb-tray .slots{ gap:30px !important; } .bb-tray .slot{ position:relative; margin-bottom:28px; }
.bb-tray .slot i{ position:absolute; top:94px; left:50%; transform:translateX(-50%); font:800 26px/1 var(--body); font-style:normal; white-space:nowrap; }
.bb-tray .slot.ok i{ color:#2E8B2E; } .bb-tray .slot.no i{ color:#B8452E; }
/* v22: the toast sits clear of the score and multiplier */
.bl-toast{ top:236px !important; }
"""
# 1+2. graph card: wide layout, one answer per row when answers are long, right line marked after a miss
rep("""  el.hidden=false; var sn=0;""",
"""  el.classList.toggle('vis',!!q.visual); var chEl=el.querySelector('.ch'); if(chEl) chEl.classList.toggle('one',q.choices.some(function(c){ return String(c.html).replace(/<[^>]*>/g,'').length>(q.visual?8:11); }));
  if(t.done&&q.visual) try{ var okc=q.choices.filter(function(c){ return c.ok; })[0], lm=/^Line ([A-D])$/.exec(String(okc.html).replace(/<[^>]*>/g,'')), sv=el.querySelector('.vis svg');
    if(lm&&sv){ var tx=[].filter.call(sv.querySelectorAll('text'),function(e){ return e.textContent===lm[1]; })[0], col=tx&&tx.getAttribute('fill');
      if(col) [].forEach.call(sv.querySelectorAll('line[stroke-width="5"],circle[r="17"],text[font-size="22"]'),function(e){ var mine=(e.getAttribute('stroke')||e.getAttribute('fill'))===col; e.classList.add(mine?'bbhit':'bbdim'); if(mine&&e.tagName==='line') e.setAttribute('stroke-width','9'); }); } }catch(err){}
  el.hidden=false; var sn=0;
  /* v23: long answers get one row each; if one still does not fit, every answer shrinks a step (never under 30px) */
  try{ var cs=el.querySelectorAll('.c'), fz=0; for(var pass=0;pass<8;pass++){ var over=[].some.call(cs,function(b){ return b.scrollWidth>b.clientWidth+1; }); if(!over) break; fz=(fz||parseFloat(getComputedStyle(cs[0]).fontSize))-2; if(fz<30) break; [].forEach.call(cs,function(b){ b.style.setProperty('font-size',fz+'px','important'); }); } }catch(err){}""")
# 10. slot captions
rep("""<600?' pop':'')+'"><canvas width="84" height="84" data-s="'+s+'" data-i="'+i+'"></canvas></div>'; }).join('')""",
    """<600?' pop':'')+'"><canvas width="84" height="84" data-s="'+s+'" data-i="'+i+'"></canvas><i>'+(s==='ok'?'special':s==='no'?'plain':'')+'</i></div>'; }).join('')""")
# 4. a fresh card ignores input for a moment, so a double tap on the clear banner can't answer it
rep("function trayOpen(){ S.tray={res:[],q:QS?QS.next():null,done:false,picked:-1,n:0}; drag=null; trayShownAt=now();",
    "function trayOpen(){ S.tray={res:[],q:QS?QS.next():null,done:false,picked:-1,n:0}; drag=null; trayShownAt=now(); trayReadyAt=now()+450;")
# 8. Space spam: the press right after a set-off does not fling the next burger
rep("var b=liveSpec(); if(!b||stepN-b.born<5) return false; b.used=true; dirty=true;",
    "var b=liveSpec(); if(!b||stepN-b.born<5) return false; b.used=true; dirty=true; J.actAt=now();")
rep("if(!haveBurger()){ outOfBurgers(); return false; } if(!canFire()) return false;",
    "if(!haveBurger()){ outOfBurgers(); return false; } if(!canFire()) return false; if(!FASTSIM&&now()-(J.actAt||0)<400) return false;")
# 6. the special prompt waits for the fort banner
rep("if(ls&&stepN-ls.born>=5&&!S.clearing&&!(banner&&banner.stars))", "if(ls&&stepN-ls.born>=5&&!S.clearing&&!(banner&&(banner.stars||banner.t<125)))")
# 5. a tough fort gets a longer aim line from the 4th burger on
rep("var pts=path(a,pw,buffOn('aim')?400:(d?30:22));", "var pts=path(a,pw,buffOn('aim')?400:(d?30:22)*(S.lvShots>=3?2.2:1));")
rep("shotStep=stepN; S.shots++; S.lvShots++;", "shotStep=stepN; S.shots++; S.lvShots++; if(S.lvShots===3&&!FASTSIM) setTimeout(function(){ if(!S.over&&!S.clearing&&!S.tray) toast('Tough fort! Longer aim line'); },1400);")
# 5. a burger that is only trickling along the ground is done (late plain shots took 5-8 s)
rep("b.still=sp<0.25?b.still+1:0;", "b.still=sp<0.25?b.still+1:0; b.slow=(sp<1.3&&age>120&&b.position.y>GY-60)?(b.slow||0)+1:0;")
rep("||age>540||(age>60&&(b.still>45||b.isSleeping));", "||age>540||(age>60&&(b.still>45||b.isSleeping))||b.slow>40;")
# 12. hands off during play: the nudge grows after 20 s
rep("else if(canFire()&&!flying.length&&!drag&&now()-lastInput>8000){ var bob=Math.sin(t/220)*6; canvasText('Pull back to fling!',SL.x+40,SL.y-170+bob,48,'#FFF4DC','left'); } }",
    "else if(canFire()&&!flying.length&&!drag&&now()-lastInput>8000){ var late=now()-lastInput>20000, bob=Math.sin(t/(late?140:220))*(late?12:6); canvasText(late?'Drag the burger back, then let go!':'Pull back to fling!',SL.x+40,SL.y-170+bob,late?56:48,late?'#FFC53D':'#FFF4DC','left'); dirty=true; } }")
# 7. every fort starts at its own aim, so an untouched aim is never a plan; 11. the King gets his card and specials too
rep("S.aimed=false; S.lvShots=0; S.lvPar=d.par; S.spec=[]; if(S.started&&!S.over&&d.code!=='king') trayOpen(); } }",
    "S.aimed=false; S.lvShots=0; S.lvPar=d.par; S.spec=[]; if(S.started&&!S.over){ S.aim=[Math.round(26+Math.random()*26),Math.round((0.55+Math.random()*0.33)*100)/100]; trayOpen(); } } }")
# 9. a rough run names what to practise; 3 is CSS
rep("""  /* LEADERBOARD HOOK: the shared score code (scorecode.js) shows the student's code here */""",
"""  try{ var wk=null; Object.keys(S.topics).forEach(function(k){ var t=S.topics[k]; if(t[1]>0&&t[0]<t[1]&&(!wk||t[0]/t[1]<wk[1])) wk=[k,t[0]/t[1]]; });
    if(wk&&S.answered>=4&&acc2<70) $('bl-endtopics').innerHTML+='<div class="bb-prac">Worth practicing: <b>'+wk[0]+'</b>. Right answers load special burgers.</div>'; }catch(err){}
  /* LEADERBOARD HOOK: the shared score code (scorecode.js) shows the student's code here */""")
# 13. leaving full screen redraws the layout
rep("addEventListener('resize',fit);", "addEventListener('resize',fit); ['fullscreenchange','webkitfullscreenchange'].forEach(function(ev){ document.addEventListener(ev,function(){ fit(); setTimeout(fit,250); }); });")

# ===== v23: the painted clouds drift (lifted off the backdrop by art/make_clouds.py), and the score gets its label =====
import json as _json
SKYB = open(os.path.join(here, 'art/backdrop_sky.webp.b64')).read().strip(); CLDB = open(os.path.join(here, 'art/clouds.webp.b64')).read().strip(); CLDR = _json.load(open(os.path.join(here, 'art/clouds.json')))
rep("BGI.src='data:image/webp;base64,%s';" % BGD, "BGI.src='data:image/webp;base64,%s';" % SKYB)
rep("function draw(t){ var c=cx; c.setTransform(1,0,0,1,0,0); c.clearRect(0,0,W,H);",
"""/* v23 clouds: the backdrop's own five painted clouds, drawn as sprites so they drift. Bigger ones are nearer and move faster; a windy fort pushes them the wind's way.
   They stand still with reduce motion on. The loop already redraws about 8 times a second when nothing else moves, which is plenty for a slow drift. */
var CLD=new Image(), CLDok=false, CLDS=%s.map(function(r,i){ return {r:r,x:r[4],y:r[5],v:[4.6,4,3.3,2.3,2][i]||3}; }), CLDT=0; CLD.onload=function(){ CLDok=true; dirty=true; }; CLD.src='data:image/webp;base64,%s';
function bbClouds(c){ if(!CLDok||!BGok) return; var tn=now(), dt=Math.min(0.25,(tn-(CLDT||tn))/1000); CLDT=tn; var wd=S&&S.started&&!S.over&&S.wind?(S.wind>0?1:-1)*3.2:1;
  CLDS.forEach(function(o){ if(!RM) o.x+=o.v*wd*dt; var w=o.r[2]; if(o.x>W+20) o.x=-w-20; else if(o.x<-w-20) o.x=W+20; c.drawImage(CLD,o.r[0],o.r[1],w,o.r[3],Math.round(o.x*2)/2,o.y,w,o.r[3]); }); }
function draw(t){ var c=cx; c.setTransform(1,0,0,1,0,0); c.clearRect(0,0,W,H); bbClouds(c);""" % (_json.dumps(CLDR), CLDB))
rep("canvasText(S.score.toLocaleString(),W-34,74,64,'#FFF4DC','right');",
    "var scs=S.score.toLocaleString(); canvasText(scs,W-34,74,64,'#FFF4DC','right'); cx.save(); cx.font=\"64px \"+DF; var scw=cx.measureText(scs).width; cx.restore(); canvasText('SCORE',W-34-scw-18,70,30,'#FFF4DC','right');")

# ===== v24: no spare question (Kody 2026-11-27: "this game really doesn't need a spare question"). Every fort asks exactly two. =====
rep("function trayTotal(){ var t=S.tray; return t.res.indexOf('no')>=0&&t.res.length>=TRAY_N?TRAY_N+1:TRAY_N; }", "function trayTotal(){ return TRAY_N; }")
rep("var more=t.res.length<TRAY_N||(t.res.length===TRAY_N&&t.res.indexOf('no')>=0);", "var more=t.res.length<TRAY_N;")
rep("2 questions before each fort, plus a spare if you miss one. Right answers make special burgers.", "2 questions before each fort. Right answers make special burgers.")
# ===== v25 (Kody 2026-11-27 picked 2-9): King finale (entrance, belly meter, win moment), three new fort pieces, retune =====
# --- the King drops in (look only: his body is already in place) ---
rep("if(!fromSnap){ S.world=null; S.aimed=false;", "J.kingIn=(!fromSnap&&code==='king'&&S.started&&!S.over)?now():0; J.kingLanded=0; J.crown=null; if(!fromSnap){ S.world=null; S.aimed=false;")
rep("function drawMuncher(m,t){ var c=cx, x=m.position.x, y=m.position.y, k=1, a=1, INK='#2B1B14';",
    """function drawMuncher(m,t){ var c=cx, x=m.position.x, y=m.position.y, k=1, a=1, INK='#2B1B14';
  if(m.king&&J.kingIn){ var ke=(now()-J.kingIn-350)/620; if(ke<1){ if(RM){ J.kingIn=0; } else { dirty=true; if(ke<0) return; y-=(1-ke*ke)*820; } }
    else if(!J.kingLanded){ J.kingLanded=1; shake=Math.max(shake,13); SND.land(); m.ouch=0.9; m.madUntil=now()+1500; juiceBurst(x-50,y+40,10,['#E8D9B5','#CDB98C','#FFF4DC'],6); juiceBurst(x+50,y+40,10,['#E8D9B5','#CDB98C','#FFF4DC'],6); dirty=true; } }""")
# --- belly meter under the title instead of the three dots under him ---
rep("if(m.king&&m.state==='hungry'){ for(var hp=0;hp<m.hpMax;hp++){", "if(false){ for(var hp=0;hp<m.hpMax;hp++){")
rep("var fc=fortOf(S.level).d; canvasText(fc==='king'?'THE KING':'FORT '+fortNum(S.level)+' of '+NFORTS,W/2,70,58,'#FFF4DC');",
    """var fc=fortOf(S.level).d; canvasText(fc==='king'?'THE KING':'FORT '+fortNum(S.level)+' of '+NFORTS,W/2,70,58,'#FFF4DC');
    if(fc==='king'&&!S.won){ var kg=munchers.filter(function(m){ return m.king; })[0], kmax=kg?kg.hpMax:3, kfed=kg&&kg.state==='hungry'?kg.hpMax-kg.hp:kmax, bw=kmax*74+34, bx0=W/2-bw/2, by0=150;
      cx.save(); cx.fillStyle='rgba(43,27,20,.82)'; cx.strokeStyle='#2B1B14'; cx.lineWidth=5; cx.beginPath(); if(cx.roundRect) cx.roundRect(bx0,by0,bw,70,35); else cx.rect(bx0,by0,bw,70); cx.fill(); cx.stroke(); cx.restore();
      for(var ki=0;ki<kmax;ki++){ var kp=ki===kfed-1&&now()-(J.kingFedAt||0)<420?1+0.4*Math.sin(Math.PI*(now()-J.kingFedAt)/420):1; if(kp>1) dirty=true; drawBurger(bx0+54+ki*74,by0+35,24*kp,0,ki<kfed?1:0.45); }
      canvasText(kfed>=kmax?'FULL!':'FEED HIM '+(kmax-kfed)+' MORE',W/2,by0+112,34,kfed>=kmax?'#FFC53D':'#FFF4DC'); }""")
rep("function hitKing(m,how){ if(stepN-m.lastHit<20) return; m.lastHit=stepN; m.hp--; m.ouch=1; SND.king();",
    "function hitKing(m,how){ if(stepN-m.lastHit<20) return; m.lastHit=stepN; m.hp--; m.ouch=1; SND.king(); SND.belly(m.hpMax-m.hp); J.kingFedAt=now(); if(m.hp<=0){ SND.crown(); J.slowUntil=now()+1300; J.crown={x:m.position.x,y:m.position.y-m.R-30,vx:-2.4,vy:-17,r:0}; }")
# --- win moment: the crown pops off and party bursts go up until the end screen (still picture with reduce motion) ---
rep("setTimeout(function(){ if(!S.over) endRun(); },2600); return; }", "setTimeout(function(){ if(!S.over) endRun(); },3800); return; }")
rep("canvasText('SPACE or click: '+SPEC[ls.spec].tip+'!',W/2,S.wind?252:210,46,SPEC[ls.spec].c);", "canvasText('SPACE or click: '+SPEC[ls.spec].tip+'!',W/2,fortOf(S.level).d==='king'?322:S.wind?252:210,46,SPEC[ls.spec].c);")
rep("  rings=rings.filter(function(o){ o.t++; var k=Math.min(1,o.t/14)",
    """  if(J.crown){ var cr=J.crown; if(!RM){ cr.vy+=0.5; cr.x+=cr.vx; cr.y+=cr.vy; cr.r+=0.16; if(cr.y>GY-22){ cr.y=GY-22; cr.vy*=-0.45; cr.vx*=0.6; if(Math.abs(cr.vy)<1.5){ cr.vy=0; cr.r=0; } } dirty=true; }
    c.save(); c.translate(cr.x,cr.y); c.rotate(cr.r); c.scale(2.3,2.3); c.fillStyle='#FFC93D'; c.strokeStyle='#2B1B14'; c.lineWidth=2.2; c.lineJoin='round'; c.beginPath(); c.moveTo(-14,10); c.lineTo(-17,-10); c.lineTo(-7,0); c.lineTo(0,-14); c.lineTo(7,0); c.lineTo(17,-10); c.lineTo(14,10); c.closePath(); c.fill(); c.stroke(); c.fillStyle='#E2382C'; c.beginPath(); c.arc(0,3,3.2,0,7); c.fill(); c.stroke(); c.restore(); }
  if(S.won&&!S.over&&!RM&&now()-(J.fwAt||0)>330){ J.fwAt=now(); SND.pop(); juiceBurst(W*0.2+Math.random()*W*0.65,150+Math.random()*330,30,['#FFC53D','#FF4B3E','#7BC043','#58C7FF','#FFF4DC'],7); dirty=true; }
  rings=rings.filter(function(o){ o.t++; var k=Math.min(1,o.t/14)""")
# --- three new fort pieces for forts 4 and up: a seesaw, a rockslide and a TNT fuse ---
rep("      sky:function(){ var fl=4+(r()<0.5?1:0);",
    """      seesaw:function(){ return [300,function(x){ blk('stone',x+150,GY-BOX/2,BOX,BOX); blk('wood',x+150,GY-BOX-ROOF/2,290,ROOF); mun(x+35,GY-BOX-ROOF-MUNCH_R,0); mun(x+265,GY-BOX-ROOF-MUNCH_R); tnt(x+245,GY); tip='Flip the seesaw!'; }]; },
      rockslide:function(){ return [385,function(x){ t=plat(x+45,90,220+Math.floor(r()*40)); rock(x+52,t); t2=plat(x+125,70,140); rock(x+125,t2); t=hut(x+245,GY,r()<0.5?'glass':'wood',130,100); mun(x+245,t-MUNCH_R); mun(x+352,GY-MUNCH_R,0); tip='Start a rockslide!'; }]; },
      fuse:function(){ return [390,function(x){ tnt(x+35,GY); tnt(x+115,GY); tnt(x+195,GY); var m=mat(); t=hut(x+310,GY,m,150,100,m,false); tnt(x+310,GY); t=hut(x+310,t,mat(),130,95); mun(x+310,t-MUNCH_R); mun(x+115,GY-TNT-MUNCH_R,0); tip='Light the fuse!'; }]; },
      sky:function(){ var fl=4+(r()<0.5?1:0);""")
rep("['stack','pyramid','pillars','tnthut','tower','hill','sky','stilts'];", "['stack','pyramid','pillars','tnthut','tower','hill','sky','stilts','seesaw'];")
rep("tier===1?['bridge','dominoes','stilts','bunker']:['stilts','bunker','sky','stilts','bunker','bridge','dominoes'];", "tier===1?['bridge','dominoes','stilts','bunker','rockslide','fuse']:['stilts','bunker','sky','stilts','bunker','bridge','dominoes','rockslide','fuse'];")
# --- v25 sounds for the finale: the King lands, each bite fills the belly, the crown pops off, soft party pops ---
rep("  king:function(){ tone(196,98,0,0.3,'triangle',0.16); tone(392,330,0.08,0.22,'sine',0.08); },",
    """  king:function(){ tone(196,98,0,0.3,'triangle',0.16); tone(392,330,0.08,0.22,'sine',0.08); },
  land:function(){ tone(150,45,0,0.4,'sine',0.26); tone(330,150,0,0.22,'triangle',0.14); noise(0,0.12,200,0,600); brass(G4*0.5,0.18,0.3,0.1); brass(G4*0.5*0.75,0.42,0.5,0.1); },   // the King drops in: a thud, then two low horn notes
  belly:function(n){ var f=[C5,E5,G5][Math.max(0,Math.min(2,n-1))]; tone(f,f,0.1,0.12,'triangle',0.1); tone(f*2,f*2,0.17,0.2,'sine',0.07); },   // each bite: one step up the C chord
  crown:function(){ tone(G5,G5,0,0.1,'triangle',0.09); tone(C6,C6,0.07,0.3,'sine',0.08); tone(E6,E6,0.14,0.3,'sine',0.05); },
  pop:function(){ if(limited('pp',250)) return; var f=[G5,C6,E6][Math.floor(Math.random()*3)]; tone(f,f*0.9,0,0.09,'triangle',0.04); },""")
# --- v25 sound fixes from the ears check (2026-11-27): wood, stone and the boom sat under 250 Hz (Chromebook speakers barely play that), so each gets a brighter layer;
#     the glass smash moves down out of the piercing 2-5 kHz band; the win chord is a little louder ---
rep("wood:function(v){ if(limited('w',70)) return; tone(190,130,0,0.09,'triangle',Math.min(0.16,0.05+v*0.01)); },",
    "wood:function(v){ if(limited('w',70)) return; tone(190,130,0,0.09,'triangle',Math.min(0.16,0.05+v*0.01)); tone(640,420,0,0.05,'triangle',Math.min(0.09,0.03+v*0.006)); },")
rep("stone:function(v){ if(limited('s',70)) return; tone(120,85,0,0.12,'sine',Math.min(0.2,0.07+v*0.01)); },",
    "stone:function(v){ if(limited('s',70)) return; tone(120,85,0,0.12,'sine',Math.min(0.2,0.07+v*0.01)); tone(380,260,0,0.07,'triangle',Math.min(0.1,0.035+v*0.006)); },")
rep("if(m==='glass'){ [2637,3136,2349,3520].forEach(function(f,i){ tone(f,f*0.96,i*0.03,0.09,'triangle',0.045); }); }",
    "if(m==='glass'){ [1760,2093,1568,2349].forEach(function(f,i){ tone(f,f*0.96,i*0.03,0.09,'triangle',0.05); }); }")
rep("boom:function(){ if(limited('bm',90)) return; tone(130,38,0,0.45,'sine',0.26); tone(260,90,0,0.2,'triangle',0.1);",
    "boom:function(){ if(limited('bm',90)) return; tone(130,38,0,0.45,'sine',0.26); tone(260,90,0,0.2,'triangle',0.1); tone(520,170,0,0.16,'triangle',0.09);")
rep("[G4,B4,D5].forEach(function(f){ tone(f*2,f*2,t+0.5,1.2,'triangle',0.07); tone(f,f,t+0.5,1.2,'sine',0.06); });",
    "[G4,B4,D5].forEach(function(f){ tone(f*2,f*2,t+0.5,1.2,'triangle',0.1); tone(f,f,t+0.5,1.2,'sine',0.08); });")
# --- v25 retune: with no spare question a miss costs more, so the run starts with one more burger (typical bot back to fort 6.9) ---
rep("var START_BURGERS=11,", "var START_BURGERS=12,")
rep("</style>", CSS + "</style>", h.count("</style>"))
open(dst, 'w').write(h); print('art_patch ok', len(h))
