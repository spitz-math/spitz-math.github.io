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
  if(k==='ruin'){   // Windy Ruins: warm sandstone with a carved band, so it stands out against the dusk sky
    rr(c,x,y,w,22,4); ol(c,'#D2B285'); c.fillStyle='#B08C62'; rr(c,x+3,y+13,w-6,7,2); c.fill();
    c.fillStyle='#EBD6AC'; rr(c,x-2,y-2,w+4,8,3); c.fill(); c.lineWidth=OL; c.strokeStyle=PLUM; c.stroke();
    c.fillStyle='#B08C62'; for(var q=12;q<w-8;q+=22) c.fillRect(x+q,y+8,10,3);
    c.strokeStyle='rgba(42,27,46,.4)'; c.lineWidth=1.4; for(var j2=46;j2<w-16;j2+=64){ c.beginPath(); c.moveTo(x+j2,y+11); c.lineTo(x+j2+4,y+16); c.lineTo(x+j2-2,y+21); c.stroke(); }
    return; }
  if(k==='snow'){   // Beacon Summit: blue rock under a thick cap of snow
    rr(c,x,y,w,22,6); ol(c,'#7C8DB6'); c.fillStyle='#62729C'; rr(c,x+3,y+13,w-6,7,3); c.fill();
    c.fillStyle='#F4F8FF'; rr(c,x-2,y-3,w+4,11,5); c.fill(); c.lineWidth=OL; c.strokeStyle=PLUM; c.stroke();
    c.fillStyle='#F4F8FF'; for(var d2=16;d2<w-10;d2+=41){ c.beginPath(); c.ellipse(x+d2,y+7,5,3+(d2%3)*1.5,0,0,Math.PI); c.fill(); }
    c.fillStyle='#D5E2F7'; for(var d3=30;d3<w-14;d3+=53) c.fillRect(x+d3,y+1,12,2);
    return; }
  if(k==='brick'){   // the beacon tower's balconies
    rr(c,x,y,w,24,4); ol(c,'#A3A7C4'); c.fillStyle='#7F83A6'; rr(c,x+3,y+15,w-6,7,2); c.fill();
    c.fillStyle='#D3D6EA'; rr(c,x-2,y-2,w+4,8,3); c.fill(); c.lineWidth=OL; c.strokeStyle=PLUM; c.stroke();
    c.strokeStyle='rgba(42,27,46,.4)'; c.lineWidth=1.4; for(var b2=30;b2<w-10;b2+=48){ c.beginPath(); c.moveTo(x+b2,y+8); c.lineTo(x+b2,y+22); c.stroke(); }
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
  var bx=Math.max(8,Math.min(898-w,x-w/2));   // the board stays clear of the screen edge and the height meter
  rr(c,bx,y-30-h,w,h,6); ol(c,'#F3E2C0',2.2);
  var cx=bx+9; if(kw){ drawKeys(c,cx,y-30-h+5,keys,F); cx+=kw+6; }
  c.fillStyle=PLUM; c.textBaseline='middle'; c.textAlign='left'; c.fillText(text,cx,y-30-h/2+1);
}
function keyW(k){ return !k?0: k==='LR'?42: k==='JUMP'||k==='HOLD'||k==='JUMP2'?56: k==='X'?24: 20; }
function cap(c,x,y,w,t,F){ rr(c,x,y,w,20,4); ol(c,'#FFFFFF',1.6); c.fillStyle=PLUM; c.font='700 11px '+F; c.textAlign='center'; c.textBaseline='middle'; c.fillText(t,x+w/2,y+11); c.textAlign='left'; c.font='600 15px '+F; }
function drawKeys(c,x,y,k,F){ if(k==='LR'){ cap(c,x,y,19,'←',F); cap(c,x+23,y,19,'→',F); } else if(k==='JUMP'||k==='HOLD'){ cap(c,x,y,56,k==='HOLD'?'hold ␣':'Space',F); } else if(k==='JUMP2'){ cap(c,x,y,25,'␣',F); cap(c,x+31,y,25,'␣',F); } else if(k==='X'){ cap(c,x,y,24,'X',F); } }

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

/* ---------------- new gameplay objects: ice walls, the tower's fires, falling ice ---------------- */
function ice(c,x,y,w,h){   // x,y = screen left/top. An Ember Dash melts it.
  rr(c,x,y,w,h,5); ol(c,'#BDE8F6',2.4);
  c.fillStyle='#E9F9FF'; c.fillRect(x+5,y+6,7,h-12); c.fillStyle='#8FCBE3'; c.fillRect(x+w-11,y+6,6,h-12);
  c.strokeStyle='#FFFFFF'; c.lineWidth=2; for(var i=20;i<h-16;i+=58){ c.beginPath(); c.moveTo(x+w-8,y+i); c.lineTo(x+16,y+i+14); c.stroke(); }
  c.strokeStyle='rgba(42,27,46,.35)'; c.lineWidth=1.4; for(var j=44;j<h-20;j+=74){ c.beginPath(); c.moveTo(x+12,y+j); c.lineTo(x+w/2,y+j+8); c.lineTo(x+w-12,y+j+2); c.stroke(); }
}
function icicle(c,x,y){   // y = screen y of the tip
  c.beginPath(); c.moveTo(x,y); c.lineTo(x+8,y-26); c.lineTo(x-8,y-26); c.closePath(); ol(c,'#D8F3FF',2); c.fillStyle='#FFFFFF'; c.fillRect(x-4,y-24,3,12); }
function flame(c,x,y,s,t){ var f=1+Math.sin(t*9)*0.06, g=1+Math.sin(t*13+1)*0.05; c.save(); c.translate(x,y); c.scale(s*g,s*f);
  c.beginPath(); c.moveTo(0,-34); c.bezierCurveTo(12,-20,20,-12,16,2); c.bezierCurveTo(13,12,-13,12,-16,2); c.bezierCurveTo(-20,-8,-8,-12,-8,-22); c.bezierCurveTo(-3,-18,-2,-26,0,-34); c.closePath(); ol(c,'#FF9A3C',2.2);
  c.beginPath(); c.moveTo(0,-16); c.bezierCurveTo(6,-8,9,-3,7,3); c.bezierCurveTo(5,8,-5,8,-7,3); c.bezierCurveTo(-9,-3,-4,-8,0,-16); c.closePath(); c.fillStyle='#FFE08A'; c.fill(); c.restore(); }
function brazier(c,x,y,lit,need,done,t){   // a stone bowl on a post; `lit` sparks out of `need`; done = burning
  c.fillStyle='#7F83A6'; rr(c,x-8,y-34,16,34,2); ol(c,'#7F83A6',2.2);
  c.beginPath(); c.moveTo(x-30,y-58); c.lineTo(x+30,y-58); c.lineTo(x+20,y-32); c.lineTo(x-20,y-32); c.closePath(); ol(c,'#A3A7C4',2.4);
  c.fillStyle='#D3D6EA'; c.fillRect(x-28,y-58,56,5);
  for(var i=0;i<need;i++){ var px=x+(i-(need-1)/2)*14; c.beginPath(); c.arc(px,y-44,4.5,0,Math.PI*2); ol(c,i<lit||done?'#FFC23D':'#5D6178',1.6); }
  if(done) flame(c,x,y-60,1,t);
  else { c.fillStyle='#3A2D50'; c.fillRect(x-18,y-64,36,6); }
}
function beacon(c,x,y,lit,need,k,t){   // the great lamp on the peak: k = how far the fire has grown (0..1)
  c.fillStyle='#7F83A6'; [[-70],[58]].forEach(function(o){ rr(c,x+o[0],y-150,12,150,2); ol(c,'#A3A7C4',2.4); });
  c.beginPath(); c.moveTo(x-92,y-150); c.lineTo(x,y-206); c.lineTo(x+92,y-150); c.closePath(); ol(c,'#6B7096',2.6);
  c.fillStyle='#8388AE'; c.beginPath(); c.moveTo(x-60,y-156); c.lineTo(x,y-194); c.lineTo(x+60,y-156); c.closePath(); c.fill();
  c.fillStyle='#7F83A6'; rr(c,x-12,y-40,24,40,2); ol(c,'#7F83A6',2.2);
  c.beginPath(); c.moveTo(x-46,y-72); c.lineTo(x+46,y-72); c.lineTo(x+30,y-38); c.lineTo(x-30,y-38); c.closePath(); ol(c,'#A3A7C4',2.6);
  c.fillStyle='#D3D6EA'; c.fillRect(x-43,y-72,86,6);
  for(var i=0;i<need;i++){ var px=x+(i-(need-1)/2)*18; c.beginPath(); c.arc(px,y-54,6,0,Math.PI*2); ol(c,i<lit||k>0?'#FFC23D':'#5D6178',1.8); }
  if(k>0){ c.fillStyle='rgba(255,217,138,'+(0.2*k)+')'; c.beginPath(); c.arc(x,y-100,70+60*k,0,Math.PI*2); c.fill(); flame(c,x,y-74,0.6+1.5*k,t); }
  else { c.fillStyle='#3A2D50'; c.fillRect(x-28,y-80,56,8); }
}
/* ---------------- the Gloom: the storm that put the beacon out (drawn into the half-resolution scenery, so it reads as chunky pixels) ----------------
   m: { a (alpha), mood ('idle','warn','blow','hurt'), look (-1..1, where the eyes point), dir (blowing left -1 / right 1) } */
function gloom(c,x,y,s,m,t){
  c.save(); c.globalAlpha=Math.max(0,Math.min(1,m.a)); c.translate(x,y+Math.sin(t*1.6)*4); c.scale(s,s);
  function blob(col,L){ c.fillStyle=col; c.beginPath(); L.forEach(function(e){ c.moveTo(e[0]+e[2],e[1]); c.ellipse(e[0],e[1],e[2],e[3],0,0,Math.PI*2); }); c.fill(); }
  blob('#171226',[[0,4,156,50],[-84,-24,74,50],[8,-44,92,62],[96,-18,68,46],[-136,14,52,30],[140,16,48,28]]);
  blob('#2A2244',[[0,-4,142,42],[-82,-32,62,40],[8,-54,78,50],[94,-26,56,36]]);
  blob('#40356A',[[-74,-52,34,14],[18,-80,46,16],[98,-42,28,10]]);
  c.fillStyle='#171226'; [[-96,40,18,22],[-40,48,14,30],[30,46,16,24],[92,40,14,18]].forEach(function(d){ c.fillRect(d[0],d[1],d[2],d[3]); });
  var lk=(m.look||0)*6, hurt=m.mood==='hurt', warn=m.mood==='warn';
  [-1,1].forEach(function(sd){ c.save(); c.translate(sd*46,-10); c.scale(sd,1);
    if(hurt){ c.fillStyle='#FFD98A'; c.fillRect(-20,2,40,6); }
    else { c.beginPath(); c.moveTo(-22,-12); c.lineTo(20,2); c.lineTo(20,14); c.lineTo(-22,12); c.closePath(); c.fillStyle=warn?'#FFF1C2':'#FFD98A'; c.fill();
      c.fillStyle='#171226'; c.fillRect(-4+lk*sd,-2,10,12); }
    c.restore(); });
  if(m.mood==='blow'){ c.fillStyle='#0C0916'; c.beginPath(); c.ellipse((m.dir||1)*30,30,16,13,0,0,Math.PI*2); c.fill(); }
  else if(hurt){ c.fillStyle='#0C0916'; c.fillRect(-16,26,32,6); }
  else { c.fillStyle='#0C0916'; c.fillRect(-20,30,40,5); c.fillRect(-24,34,6,5); c.fillRect(18,34,6,5); }
  c.restore();
}
/* ---------------- more scenery (no outlines) ---------------- */
function ruins(c,w,h,seed,col,col2){   // broken columns and arches for one screen-wide tile
  var r=rng(seed); for(var i=0;i<6;i++){ var x=r()*w, cw=26+r()*22, ch=120+r()*260, y=h*0.1+r()*(h*0.9-ch);
    c.fillStyle=i%2?col:col2; c.fillRect(x,y,cw,ch); c.fillRect(x-7,y,cw+14,10); c.fillRect(x-5,y+ch-8,cw+10,8);
    c.fillStyle=i%2?col2:col; for(var f=6;f<cw-4;f+=9) c.fillRect(x+f,y+16,3,ch-30);
    if(r()<0.5){ var aw=70+r()*60; c.fillStyle=i%2?col:col2; c.beginPath(); c.moveTo(x+cw,y+10); c.quadraticCurveTo(x+cw+aw*0.5,y-34,x+cw+aw,y+26); c.lineTo(x+cw+aw,y+42); c.quadraticCurveTo(x+cw+aw*0.5,y-10,x+cw,y+30); c.closePath(); c.fill(); } }
}
function crag(c,w,h,seed,side,col,col2,snow){   // a snowy rock wall for one side of the summit (160 x h tile)
  var r=rng(seed), x0=side<0?0:w, pts=[]; for(var y=0;y<=h;y+=h/9) pts.push([side<0?46+r()*74:w-46-r()*74,y]);
  c.beginPath(); c.moveTo(x0,0); pts.forEach(function(p){ c.lineTo(p[0],p[1]); }); c.lineTo(x0,h); c.closePath(); c.fillStyle=col; c.fill();
  c.beginPath(); c.moveTo(x0,0); pts.forEach(function(p,i){ c.lineTo(side<0?p[0]-34:p[0]+34,p[1]+(i%2?10:0)); }); c.lineTo(x0,h); c.closePath(); c.fillStyle=col2; c.fill();
  c.fillStyle=snow; pts.forEach(function(p,i){ if(i%2) return; var sx=side<0?p[0]-40:p[0]+4; c.fillRect(sx,p[1],36,8); c.fillRect(sx+(side<0?10:0),p[1]+8,26,5); });
}
function stars(c,w,h,seed){ var r=rng(seed); for(var i=0;i<70;i++){ var x=Math.floor(r()*w/2)*2, y=Math.floor(r()*h/2)*2, b=r(); c.fillStyle=b<0.15?'#FFF6E8':(b<0.5?'#C9D2F2':'#8B95C9'); c.fillRect(x,y,b<0.15?4:2,b<0.15?4:2); } }
function moon(c,x,y){ c.fillStyle='#F6F1D8'; c.beginPath(); c.arc(x,y,34,0,Math.PI*2); c.fill(); c.fillStyle='#DDD6B8'; c.beginPath(); c.arc(x-10,y-8,7,0,Math.PI*2); c.arc(x+12,y+10,9,0,Math.PI*2); c.arc(x+6,y-16,4,0,Math.PI*2); c.fill(); }
function tower(c,w,h){   // one repeat of the beacon tower's wall (w x h tile): rows of bricks, a lit edge, one arched window
  c.fillStyle='#3A3E64'; c.fillRect(0,0,w,h); c.fillStyle='#4A4F7A'; c.fillRect(0,0,22,h); c.fillStyle='#2C2F50'; c.fillRect(w-26,0,26,h);
  c.fillStyle='#2C2F50'; for(var y=0;y<h;y+=30){ c.fillRect(22,y,w-48,3); for(var x=22+((y/30)%2?24:0);x<w-30;x+=48) c.fillRect(x,y,3,30); }
  c.fillStyle='#1B1D36'; c.beginPath(); c.moveTo(w/2-22,h*0.62); c.lineTo(w/2-22,h*0.42); c.quadraticCurveTo(w/2,h*0.3,w/2+22,h*0.42); c.lineTo(w/2+22,h*0.62); c.closePath(); c.fill();
  c.fillStyle='#4A4F7A'; c.fillRect(w/2-28,h*0.62,56,6);
}

root.LPART={ ice:ice, icicle:icicle, flame:flame, brazier:brazier, beacon:beacon, gloom:gloom, ruins:ruins, crag:crag, stars:stars, moon:moon, tower:tower, hero:hero, ledge:ledge, thorns:thorns, ember:ember, feather:feather, camp:camp, waystone:waystone, gate:gate, sign:sign, mountain:mountain, cloud:cloud, ridge:ridge, pine:pine, house:house, cliff:cliff,
  mix:mix, mixHex:mixHex, rr:rr, ol:ol, star:star, PLUM:PLUM, rng:rng };
})(typeof window!=='undefined'?window:globalThis);
