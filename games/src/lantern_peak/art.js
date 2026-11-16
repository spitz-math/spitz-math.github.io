/* ================= LANTERN PEAK: art (all drawn in code: crisp at any Chromebook size, a few KB, easy to animate) =================
   Rules: gameplay things (hero, ledges, pickups, thorns, lanterns, Waystone) get a 2.2-unit plum outline and full colour.
   Scenery gets no outline and is mixed toward the sky colour (haze), so a jumpable thing never looks like background.
   The hero follows ChatGPT's approved concept sheet for Pip (Sprite Drop asset a1fb807f): yellow knit hat with pom-pom,
   teal two-tail scarf, coral puffy jacket, navy pants, brown boots, small backpack with a brass lantern. */
(function(root){
var PLUM='#2A1B2E', OL=2.2;
function hex(c){ c=c.replace('#',''); return [parseInt(c.slice(0,2),16),parseInt(c.slice(2,4),16),parseInt(c.slice(4,6),16)]; }
function mix(a,b,k){ var A=hex(a), B=hex(b); return 'rgb('+[0,1,2].map(function(i){ return Math.round(A[i]+(B[i]-A[i])*k); }).join(',')+')'; }
function mixHex(a,b,k){ var A=hex(a), B=hex(b); return '#'+[0,1,2].map(function(i){ return ('0'+Math.round(A[i]+(B[i]-A[i])*k).toString(16)).slice(-2); }).join(''); }
function rr(c,x,y,w,h,r){ r=Math.min(r,w/2,h/2); c.beginPath(); c.moveTo(x+r,y); c.arcTo(x+w,y,x+w,y+h,r); c.arcTo(x+w,y+h,x,y+h,r); c.arcTo(x,y+h,x,y,r); c.arcTo(x,y,x+w,y,r); c.closePath(); }
function ol(c,fill,w){ c.fillStyle=fill; c.fill(); c.lineWidth=w||OL; c.strokeStyle=PLUM; c.lineJoin='round'; c.stroke(); }
function rng(seed){ var s=seed|0; return function(){ s=s+0x6D2B79F5|0; var t=Math.imul(s^s>>>15,1|s); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }

/* ---------------- the hero ----------------
   pose: { run (stride phase), speed 0..1, air (-1 rising .. 1 falling), sq (squash: + flat, - tall), spin (radians), blink, face (1 right, -1 left),
           scarf:[[dx,dy]x2 tails, local], lamp (swing angle), wave (0..1 for the title wave) } */
function hero(c,x,y,s,P){
  /* simple on purpose (Kody: "much simpler"): a big round head with a knit hat, a bean of a body, stubby legs, a scarf that streams, a lantern */
  var f=P.face||1, sq=P.sq||0, sx=s*(1+0.22*sq), sy=s*(1-0.26*sq);
  c.save(); c.translate(x,y);
  if(P.spin){ c.translate(0,-22*s); c.rotate(P.spin*f); c.translate(0,22*s); }
  c.scale(sx*f,sy); c.lineCap='round'; c.lineJoin='round';
  var run=P.run||0, sp=P.speed||0, air=P.air, onG=air===undefined||air===null;
  var st=onG?Math.sin(run)*6*sp:0, l1=onG?Math.max(0,Math.cos(run))*3*sp:0, l2=onG?Math.max(0,-Math.cos(run))*3*sp:0;
  var bob=onG?(sp>0.1?Math.abs(Math.sin(run))*1.5:Math.sin((P.t||0)*2.2)*0.5):0, lean=onG?sp*2:0;
  var F1=[st+2,-l1], F2=[-st-2,-l2];
  if(!onG){ if(air<0){ F1=[5,-5]; F2=[-3,-3]; } else { F1=[5,0]; F2=[-5,1]; } }
  /* scarf tails behind everything */
  var T=P.scarf||[[-9,4],[-7,8]];
  c.save(); c.translate(-3+lean,-22-bob);
  T.forEach(function(p,i){ c.beginPath(); c.moveTo(0,0); c.quadraticCurveTo(p[0]*0.5,p[1]*0.4+1,p[0],p[1]); c.lineWidth=6; c.strokeStyle=PLUM; c.stroke(); c.lineWidth=3.2; c.strokeStyle=i?'#259E95':'#2EC4B6'; c.stroke(); });
  c.restore();
  /* legs */
  foot(c,F2[0],F2[1],-1+lean*0.3,-8-bob*0.3,'#1F2B52','#5E3A20');
  /* lantern in the back hand, swinging */
  var la=P.lamp||0, hx=-8+lean, hy=onG?-13-bob:(air<0?-18:-26);
  c.save(); c.translate(hx,hy); c.rotate(la);
  c.beginPath(); c.moveTo(0,0); c.lineTo(0,4); c.lineWidth=1.6; c.strokeStyle=PLUM; c.stroke();
  rr(c,-3.4,3.5,6.8,8.5,2); ol(c,'#C4973F',1.8); c.fillStyle=P.lampLit===false?'#8C8496':'#FFD98A'; c.fillRect(-1.7,5.5,3.4,4.5);
  c.restore();
  /* body: one round bean */
  rr(c,-8+lean,-23-bob,16,16,7); ol(c,'#E8553D');
  foot(c,F1[0],F1[1],1+lean*0.3,-8-bob*0.3,'#2B3A67','#7A4A2A');
  /* back hand holds the lantern; front arm swings (up when jumping) */
  var ax=onG?4-st*0.5:(air<0?7:6), ay=onG?-13-bob:(air<0?-31:-34);
  c.beginPath(); c.moveTo(lean+3,-19-bob); c.lineTo(ax+lean,ay); c.lineWidth=6.6; c.strokeStyle=PLUM; c.stroke(); c.lineWidth=3.2; c.strokeStyle='#E8553D'; c.stroke();
  c.beginPath(); c.arc(ax+lean,ay,2.6,0,Math.PI*2); ol(c,'#E0C3A6',1.6);
  c.beginPath(); c.moveTo(lean-3,-19-bob); c.lineTo(hx+0.5,hy); c.lineWidth=6.6; c.strokeStyle=PLUM; c.stroke(); c.lineWidth=3.2; c.strokeStyle='#C64533'; c.stroke();
  /* head */
  var X=1+lean*1.2, Y=-33-bob;
  c.beginPath(); c.arc(X,Y,11,0,Math.PI*2); ol(c,'#E8C9A8');
  /* scarf wrap at the neck */
  rr(c,-8.5+lean,-25-bob,17,5.5,2.7); ol(c,'#2EC4B6',2);
  /* face: two eyes, a small smile */
  if(P.blink){ c.lineWidth=1.6; c.strokeStyle=PLUM; c.beginPath(); c.moveTo(X+2.5,Y+1); c.lineTo(X+5.3,Y+1); c.moveTo(X+7.4,Y+1); c.lineTo(X+9.6,Y+1); c.stroke(); }
  else { c.fillStyle=PLUM; c.beginPath(); c.ellipse(X+3.9,Y+0.6,1.5,2.2,0,0,Math.PI*2); c.ellipse(X+8.5,Y+0.6,1.4,2.1,0,0,Math.PI*2); c.fill(); }
  c.beginPath(); c.lineWidth=1.4; c.strokeStyle=PLUM; if(P.ouch) c.arc(X+6.4,Y+6,1.4,0,Math.PI*2); else c.arc(X+6.3,Y+4.3,2,0.25,Math.PI-0.45); c.stroke();
  /* knit hat above the eyes, pom-pom on top */
  c.beginPath(); c.moveTo(X-11.6,Y-3.5); c.bezierCurveTo(X-12,Y-19,X+12,Y-19,X+11.6,Y-3.5); c.closePath(); ol(c,'#FFC23D');
  rr(c,X-12.4,Y-6.5,24.8,5,2.5); ol(c,'#F2A93B',2);
  var pb=P.pom||0; c.beginPath(); c.arc(X-2-pb*1.5,Y-18-pb*1.2,4,0,Math.PI*2); ol(c,'#FFC23D',2);
  c.restore();
}
function foot(c,fx,fy,hx,hy,pant,boot){ c.beginPath(); c.moveTo(hx,hy); c.lineTo(fx,fy-3); c.lineWidth=7.6; c.strokeStyle=PLUM; c.stroke(); c.lineWidth=4.2; c.strokeStyle=pant; c.stroke(); rr(c,fx-3.8,fy-5.5,9,6,2.6); ol(c,boot,2); }
function leg(c,x0,y0,x1,y1,col){ c.beginPath(); c.moveTo(x0,y0); c.lineTo(x1,y1-4); c.lineWidth=7.6; c.strokeStyle=PLUM; c.stroke(); c.lineWidth=4; c.strokeStyle=col; c.stroke(); }
function boot(c,x,y,col){ rr(c,x-4.2,y-6,9.6,6.5,2.6); ol(c,col,2); }
function arm(c,x0,y0,x1,y1,col){ c.beginPath(); c.moveTo(x0,y0); c.lineTo(x1,y1); c.lineWidth=7.4; c.strokeStyle=PLUM; c.stroke(); c.lineWidth=3.8; c.strokeStyle=col; c.stroke();
  c.beginPath(); c.arc(x1,y1,2.8,0,Math.PI*2); ol(c,'#E0C3A6',1.8); }

/* ---------------- gameplay objects ---------------- */
function ledge(c,p,x,y,t,zk){   // x,y = screen left/top; zk = zone colouring 0..1 (wood warmth)
  var w=p.w, k=p.kind;
  if(k==='floor'){ c.fillStyle='#5E7F4E'; c.fillRect(-10,y,980,400); c.fillStyle='#7C9F5C'; c.fillRect(-10,y,980,10);
    c.fillStyle='#4F6B42'; for(var i=0;i<24;i++){ var gx=(i*97)%960; c.fillRect(gx,y+22+(i*37)%60,26,5); } return; }
  if(k==='stone'){
    rr(c,x,y,w,22,7); ol(c,'#8D90A6'); c.fillStyle='#71738C'; rr(c,x+3,y+13,w-6,7,3); c.fill();
    c.fillStyle='#86B86A'; rr(c,x-1,y-2,w+2,8,4); c.fill(); c.lineWidth=OL; c.strokeStyle=PLUM; c.stroke();
    c.fillStyle='#86B86A'; for(var d=14;d<w-10;d+=37){ c.beginPath(); c.ellipse(x+d,y+6,4,4+(d%3)*1.4,0,0,Math.PI); c.fill(); }
    c.strokeStyle='rgba(42,27,46,.35)'; c.lineWidth=1.4; for(var j=40;j<w-20;j+=56){ c.beginPath(); c.moveTo(x+j,y+9); c.lineTo(x+j-5,y+20); c.stroke(); }
    return; }
  /* wood: posts below (scenery-dark, no outline), plank deck */
  var cr=k==='crumble', lift=k==='lift';
  rr(c,x,y,w,18,5); ol(c,cr?'#E2BE8C':'#C68A50');
  c.fillStyle=cr?'#F2D7AE':'#E3B074'; rr(c,x+2,y+2,w-4,5,2); c.fill();
  c.strokeStyle=PLUM; c.lineWidth=1.5; for(var s=34;s<w-6;s+=34){ c.beginPath(); c.moveTo(x+s,y+3); c.lineTo(x+s,y+16); c.stroke(); }
  if(cr){ c.lineWidth=1.8; c.beginPath(); c.moveTo(x+w*0.3,y+1); c.lineTo(x+w*0.38,y+8); c.lineTo(x+w*0.32,y+17); c.moveTo(x+w*0.68,y+1); c.lineTo(x+w*0.62,y+10); c.lineTo(x+w*0.7,y+17); c.stroke(); }
  if(lift){ c.fillStyle='#FFC23D'; c.beginPath(); c.arc(x+12,y+9,3,0,7); c.arc(x+w-12,y+9,3,0,7); c.fill(); }
}
function thorns(c,x,y,w,t){
  c.save(); c.translate(x,y);
  c.beginPath(); c.moveTo(0,2); for(var i=0;i<=w;i+=8){ c.lineTo(i,-10-((i/8)%2)*7); c.lineTo(i+4,-2); } c.lineTo(w,2); c.closePath(); ol(c,'#7B2D5B');
  c.fillStyle='#F5D3E4'; for(var j=4;j<w;j+=8){ c.beginPath(); c.moveTo(j-2,-8-((j/8|0)%2)*5); c.lineTo(j,-16-((j/8|0)%2)*6); c.lineTo(j+2,-8-((j/8|0)%2)*5); c.closePath(); c.fill(); }
  c.restore();
}
function ember(c,x,y,s,t){ c.save(); c.translate(x,y); c.scale(s,s); c.rotate(Math.sin(t*3)*0.12);
  c.beginPath(); c.moveTo(0,-11); c.bezierCurveTo(5,-5,9,-1,9,4); c.arc(0,4,9,0,Math.PI); c.bezierCurveTo(-9,-1,-4,-4,-3,-7); c.bezierCurveTo(-1,-5,-1,-8,0,-11); c.closePath(); ol(c,'#FF9A3C',2);
  c.beginPath(); c.arc(0,6,4,0,Math.PI*2); c.fillStyle='#FFE08A'; c.fill(); c.restore(); }
function feather(c,x,y,s,t){ c.save(); c.translate(x,y); c.scale(s,s); c.rotate(-0.5+Math.sin(t*2)*0.15);
  c.beginPath(); c.moveTo(-3,16); c.bezierCurveTo(-12,4,-6,-12,10,-18); c.bezierCurveTo(10,-2,4,10,-3,16); c.closePath(); ol(c,'#2EC4B6',2.2);
  c.beginPath(); c.moveTo(-4,18); c.lineTo(7,-12); c.lineWidth=1.8; c.strokeStyle=PLUM; c.stroke();
  c.restore();
  var k=(Math.sin(t*4)+1)/2; c.save(); c.translate(x+12,y-14); c.scale(0.7+k*0.4,0.7+k*0.4); star(c,'#FFC23D'); c.restore(); }
function star(c,col){ c.beginPath(); for(var i=0;i<10;i++){ var r=i%2?2.6:6.5, a=-Math.PI/2+i*Math.PI/5; c.lineTo(Math.cos(a)*r,Math.sin(a)*r); } c.closePath(); ol(c,col,1.6); }
function camp(c,x,y,lit,t){
  c.fillStyle='#6B4A30'; rr(c,x-3,y-46,6,46,2); ol(c,'#6B4A30',2);
  c.beginPath(); c.moveTo(x,y-46); c.lineTo(x+12,y-46); c.lineWidth=3; c.strokeStyle=PLUM; c.stroke();
  if(lit){ c.fillStyle='rgba(255,217,138,.22)'; c.beginPath(); c.arc(x+12,y-34,22+Math.sin(t*3)*1.5,0,Math.PI*2); c.fill(); }
  rr(c,x+6,y-42,12,15,3); ol(c,'#C4973F',2); c.fillStyle=lit?'#FFD98A':'#6E667A'; c.fillRect(x+9,y-39,6,9);
  if(lit){ c.fillStyle='#FF9A3C'; c.beginPath(); c.ellipse(x+12,y-34,1.6,2.8+Math.sin(t*9)*0.6,0,0,Math.PI*2); c.fill(); }
}
function waystone(c,x,y,lit,need,t,glow){
  c.save(); c.translate(x,y);
  c.beginPath(); c.moveTo(-30,0); c.lineTo(-26,-96); c.quadraticCurveTo(0,-122,26,-96); c.lineTo(30,0); c.closePath(); ol(c,'#9AA0B8',2.6);
  c.fillStyle='#80869F'; c.beginPath(); c.moveTo(10,0); c.lineTo(14,-90); c.quadraticCurveTo(22,-94,26,-96); c.lineTo(30,0); c.closePath(); c.fill();
  c.fillStyle='#86B86A'; c.beginPath(); c.ellipse(-14,-2,16,6,0,Math.PI,0); c.fill();
  for(var i=0;i<need;i++){ var ry=-22-i*(70/Math.max(1,need-1||1)); if(need===1) ry=-58; var on=i<lit;
    c.beginPath(); c.arc(-2,ry,7,0,Math.PI*2); ol(c,on?'#FFC23D':'#5D6178',2); if(on){ c.fillStyle='#FFF1C2'; c.beginPath(); c.arc(-2,ry,2.6,0,Math.PI*2); c.fill(); } }
  if(glow){ c.globalAlpha=0.25+0.15*Math.sin(t*4); c.fillStyle='#FFC23D'; c.beginPath(); c.moveTo(-26,-96); c.quadraticCurveTo(0,-122,26,-96); c.lineTo(22,-100); c.quadraticCurveTo(0,-114,-22,-100); c.closePath(); c.fill(); c.globalAlpha=1; }
  c.restore();
}
function gate(c,y,open,t,lit,need){   // a stone lintel across the climb; splits and slides away when the runes are lit
  var o=Math.min(1,open)*520, h=30;
  [[-1,0],[1,480]].forEach(function(s){ var x=s[1]+s[0]*o; rr(c,x,y,480,h,6); ol(c,'#8D90A6',2.6); c.fillStyle='#71738C'; c.fillRect(x+6,y+h-9,468,5);
    for(var i=0;i<4;i++){ var rx=x+60+i*120; c.beginPath(); c.arc(rx,y+h/2-1,6.5,0,Math.PI*2); ol(c,lit>i*need/4?'#2EC4B6':'#5D6178',1.8); } });
  if(open<=0){ c.fillStyle='#86B86A'; for(var j=20;j<960;j+=90){ c.beginPath(); c.ellipse(j,y+h+2,10,5+(j%7),0,0,Math.PI); c.fill(); } }
}
function sign(c,x,y,text,keys,F){
  c.font='600 15px '+F; var tw=Math.ceil(c.measureText(text).width), kw=keyW(keys), w=tw+kw+(kw?24:18), h=30;
  c.fillStyle='#6B4A30'; c.fillRect(x-2.5,y-30,5,30);
  rr(c,x-w/2,y-30-h,w,h,6); ol(c,'#F3E2C0',2.2);
  var cx=x-w/2+9; if(kw){ drawKeys(c,cx,y-30-h+5,keys,F); cx+=kw+6; }
  c.fillStyle=PLUM; c.textBaseline='middle'; c.textAlign='left'; c.fillText(text,cx,y-30-h/2+1);
}
function keyW(k){ return !k?0: k==='LR'?42: k==='JUMP'||k==='HOLD'||k==='JUMP2'?56: 20; }
function cap(c,x,y,w,t,F){ rr(c,x,y,w,20,4); ol(c,'#FFFFFF',1.6); c.fillStyle=PLUM; c.font='700 11px '+F; c.textAlign='center'; c.textBaseline='middle'; c.fillText(t,x+w/2,y+11); c.textAlign='left'; c.font='600 15px '+F; }
function drawKeys(c,x,y,k,F){ if(k==='LR'){ cap(c,x,y,19,'←',F); cap(c,x+23,y,19,'→',F); } else if(k==='JUMP'||k==='HOLD'){ cap(c,x,y,56,k==='HOLD'?'hold ␣':'Space',F); } else if(k==='JUMP2'){ cap(c,x,y,25,'␣',F); cap(c,x+31,y,25,'␣',F); } }

/* ---------------- scenery (no outlines; hazed toward the sky) ---------------- */
function mountain(c,w,h0,lit){ var h=385;   // far peak with the beacon tower, drawn once into a cache
  var B='#7E8DB0', D='#66749A', S='#EEF1F7', SS='#CFD6E6';
  c.beginPath(); c.moveTo(-w*0.2,h0); c.lineTo(w*0.12,h*0.86); c.lineTo(w*0.26,h*0.6); c.lineTo(w*0.38,h*0.36); c.lineTo(w*0.47,h*0.17); c.lineTo(w*0.5,h*0.13); c.lineTo(w*0.53,h*0.17); c.lineTo(w*0.62,h*0.32); c.lineTo(w*0.72,h*0.46); c.lineTo(w*0.86,h*0.7); c.lineTo(w*1.2,h0); c.closePath(); c.fillStyle=B; c.fill();
  c.beginPath(); c.moveTo(w*0.5,h*0.13); c.lineTo(w*0.53,h*0.17); c.lineTo(w*0.62,h*0.32); c.lineTo(w*0.72,h*0.46); c.lineTo(w*0.86,h*0.7); c.lineTo(w*1.2,h0); c.lineTo(w*0.6,h0); c.lineTo(w*0.58,h*0.6); c.lineTo(w*0.52,h*0.36); c.closePath(); c.fillStyle=D; c.fill();
  c.beginPath(); c.moveTo(w*0.38,h*0.36); c.lineTo(w*0.47,h*0.17); c.lineTo(w*0.5,h*0.13); c.lineTo(w*0.53,h*0.17); c.lineTo(w*0.62,h*0.32); c.lineTo(w*0.58,h*0.35); c.lineTo(w*0.55,h*0.3); c.lineTo(w*0.51,h*0.36); c.lineTo(w*0.47,h*0.3); c.lineTo(w*0.43,h*0.37); c.closePath(); c.fillStyle=S; c.fill();
  c.beginPath(); c.moveTo(w*0.5,h*0.13); c.lineTo(w*0.53,h*0.17); c.lineTo(w*0.62,h*0.32); c.lineTo(w*0.58,h*0.35); c.lineTo(w*0.55,h*0.3); c.lineTo(w*0.52,h*0.2); c.closePath(); c.fillStyle=SS; c.fill();
  /* the beacon tower on the peak */
  var tx=w*0.5, ty=h*0.13; c.fillStyle='#5A6385'; c.fillRect(tx-6,ty-30,12,30); c.beginPath(); c.moveTo(tx-9,ty-30); c.lineTo(tx,ty-40); c.lineTo(tx+9,ty-30); c.closePath(); c.fill();
  c.fillStyle=lit?'#FFD98A':'#C9A86A'; c.fillRect(tx-3,ty-27,6,7);
}
function cloud(c,x,y,s,col,sh){ c.save(); c.translate(x,y); c.scale(s,s); c.fillStyle=col; c.beginPath(); c.ellipse(0,0,46,16,0,0,Math.PI*2); c.ellipse(-18,-8,20,14,0,0,Math.PI*2); c.ellipse(14,-12,24,18,0,0,Math.PI*2); c.fill();
  c.fillStyle=sh; c.beginPath(); c.ellipse(4,8,40,7,0,0,Math.PI*2); c.fill(); c.restore(); }
function ridge(c,w,h,seed,col,col2,pines){   // a hill line; pines = pine trees along the top
  var r=rng(seed), pts=[], n=12; for(var i=0;i<=n;i++) pts.push([i*w/n, h*0.25+r()*h*0.25]);
  c.beginPath(); c.moveTo(0,h); pts.forEach(function(p,i){ if(!i) c.lineTo(p[0],p[1]); else { var q=pts[i-1]; c.quadraticCurveTo(q[0]+w/n/2,(q[1]+p[1])/2-8,p[0],p[1]); } }); c.lineTo(w,h); c.closePath(); c.fillStyle=col; c.fill();
  if(pines){ for(var j=0;j<pines;j++){ var px=r()*w, k=Math.floor(px/(w/n)), a=pts[Math.min(n,k)], b=pts[Math.min(n,k+1)], py=a[1]+(b[1]-a[1])*((px-a[0])/(w/n))+6, ph=18+r()*26;
    c.fillStyle=r()<0.5?col2:col; c.beginPath(); c.moveTo(px,py-ph); c.lineTo(px+ph*0.32,py); c.lineTo(px-ph*0.32,py); c.closePath(); c.fill(); } }
}
function pine(c,x,y,h,col,col2){ c.fillStyle=col2; c.fillRect(x-2,y-h*0.2,4,h*0.2); for(var i=0;i<3;i++){ var ty=y-h*0.15-i*h*0.25, tw=h*(0.36-i*0.08);
  c.fillStyle=i%2?col2:col; c.beginPath(); c.moveTo(x,ty-h*0.38); c.lineTo(x+tw,ty); c.lineTo(x-tw,ty); c.closePath(); c.fill(); } }
function house(c,x,y,w,h,wall,roof,win){ c.fillStyle=wall; c.fillRect(x,y-h,w,h); c.fillStyle=roof; c.beginPath(); c.moveTo(x-8,y-h); c.lineTo(x+w/2,y-h-w*0.45); c.lineTo(x+w+8,y-h); c.closePath(); c.fill();
  c.fillStyle=win; c.fillRect(x+w*0.3,y-h*0.62,w*0.22,h*0.3); c.fillRect(x+w*0.62,y-h*0.62,w*0.16,h*0.3); }
function cliff(c,w,h,seed,side,col,col2,moss,water){   // a tall cliff wall for one side of the climb (drawn into a 160 x h tile)
  var r=rng(seed); c.beginPath(); var x0=side<0?0:w; c.moveTo(x0,0);
  for(var y=0;y<=h;y+=h/8){ var e=40+r()*70; c.lineTo(side<0?e:w-e,y); } c.lineTo(x0,h); c.closePath(); c.fillStyle=col; c.fill();
  c.beginPath(); c.moveTo(x0,0); for(var y2=0;y2<=h;y2+=h/8){ var e2=16+r()*30; c.lineTo(side<0?e2:w-e2,y2); } c.lineTo(x0,h); c.closePath(); c.fillStyle=col2; c.fill();
}

root.LPART={ hero:hero, ledge:ledge, thorns:thorns, ember:ember, feather:feather, camp:camp, waystone:waystone, gate:gate, sign:sign, mountain:mountain, cloud:cloud, ridge:ridge, pine:pine, house:house, cliff:cliff,
  mix:mix, mixHex:mixHex, rr:rr, ol:ol, star:star, PLUM:PLUM, rng:rng };
})(typeof window!=='undefined'?window:globalThis);
