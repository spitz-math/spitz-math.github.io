//@@ ART
/* ================= REMASTER ART: the Lantern Peak climber and pixel-art ledges =================
   Same tower, same rules. Only the drawing changed: the hero is the Lantern Peak sprite (2x, crisp pixels), ledges are
   pixel rock with grass, snow or metal on top, checkpoints are lanterns that light up, and each zone has its own sky. */
var PIX=window.LPPIX||null, HERO=null, BG1=null, HS=2;
if(PIX){ HERO=new Image(); HERO.src=PIX.hero; BG1=new Image(); BG1.src=PIX.bg1; }
function ready(im){ return !!(im&&im.complete&&im.naturalWidth>0); }
/* draw w x h "art pixels" with draw(g), then blow them up s times with no smoothing */
function pxc(w,h,s,draw){ var a=document.createElement('canvas'); a.width=w; a.height=h; var g=a.getContext('2d'); draw(g); if(s===1) return a;
  var b=document.createElement('canvas'); b.width=w*s; b.height=h*s; var g2=b.getContext('2d'); g2.imageSmoothingEnabled=false; g2.drawImage(a,0,0,b.width,b.height); return b; }
function srnd(seed){ var s=seed|0; return function(){ s=s+0x6D2B79F5|0; var t=Math.imul(s^s>>>15,1|s); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
/* ledge colors for each zone, plus the special ledges (same meaning as before: ice is pale blue, crumbling is cracked brown) */
var PAL=[ {rock:'#6E5B4A',rock2:'#5E4D3F',hi:'#86705C',top:'#7DB45E',top2:'#5E9A4A',tuft:'#A6D67A',line:'#2A1B2E'},
          {rock:'#6B6A8E',rock2:'#5A5979',hi:'#8584A8',top:'#F2B47C',top2:'#D88E5E',tuft:'#FFD3A0',line:'#2A1B2E'},
          {rock:'#4C5470',rock2:'#3F465E',hi:'#646E8E',top:'#EEF3FF',top2:'#B9C4DE',tuft:'#FFFFFF',line:'#141A30'},
          {rock:'#4B3A6E',rock2:'#3E2F5C',hi:'#634C8E',top:'#C77DFF',top2:'#9B5BD6',tuft:'#E2B8FF',line:'#140E24',brick:true},
          {rock:'#5F6372',rock2:'#4E5260',hi:'#7A7F90',top:'#FFE44D',top2:'#D8BC30',tuft:'#FFF6A8',line:'#12141C',metal:true} ];
var PAL_ICE={rock:'#8ED8F8',rock2:'#74C4EA',hi:'#D2F2FF',top:'#E8FAFF',top2:'#B8ECFF',tuft:'#FFFFFF',line:'#1A4A6A',ice:true},
    PAL_CR={rock:'#8A5A3A',rock2:'#744A2E',hi:'#A87250',top:'#C98B5A',top2:'#A87046',tuft:'#E0A878',line:'#2A1B12',crack:true};
/* one ledge = a left cap, repeating middles (3 kinds so it never looks tiled) and a right cap, each 14 art pixels tall at 2x */
var LT={}, TH=14;
function ledgeTiles(key,c){ if(LT[key]) return LT[key];
  function col(g,x,top,r){ var lip=(r()<0.35)?1:0;
    g.fillStyle=c.line; g.fillRect(x,0,1,1); g.fillRect(x,TH-1,1,1);
    g.fillStyle=c.top; g.fillRect(x,1,1,3); g.fillStyle=c.top2; g.fillRect(x,4,1,1+lip);
    for(var y=5+lip;y<TH-1;y++){ g.fillStyle=(c.brick?((y===9)||((x+(y>9?4:0))%8===0)):c.metal?(y===9||x%12===0):(r()<0.16))?c.rock2:c.rock; g.fillRect(x,y,1,1); }
    if(r()<0.18){ g.fillStyle=c.tuft; g.fillRect(x,1,1,1); }
    if(!c.brick&&!c.metal&&r()<0.08){ g.fillStyle=c.hi; g.fillRect(x,7+Math.floor(r()*4),2,1); }
    if(c.metal&&x%12===3){ g.fillStyle=c.hi; g.fillRect(x,11,1,1); } }
  var o={M:[]}, k;
  for(k=0;k<3;k++) o.M.push(pxc(24,TH+(c.ice?6:0),HS,function(g){ var r=srnd(k*977+key.length*31); for(var x=0;x<24;x++) col(g,x,true,r);
    if(c.crack){ g.fillStyle=c.line; [[5,6],[6,7],[6,8],[7,9],[8,10],[16,5],[17,6],[16,7],[17,8],[18,9]].forEach(function(q){ g.fillRect(q[0],q[1],1,1); }); }
    if(c.ice){ g.fillStyle='#FFFFFF'; g.fillRect(3+k*5,2,4,1); g.fillStyle='#BFE3FF'; [[4,3],[12,4],[19,2]].forEach(function(q,j){ if((j+k)%3===2) return; g.fillRect(q[0],TH,3,1); g.fillRect(q[0]+1,TH,1,q[1]); }); } }));
  function cap(left){ return pxc(6,TH,HS,function(g){ var r=srnd(left?11:23); for(var x=0;x<6;x++) col(g,x,true,r);
    var e=left?0:5, e2=left?1:4; g.clearRect(e,0,1,2); g.clearRect(e,TH-2,1,2); g.fillStyle=c.line; g.fillRect(e,2,1,TH-4); g.fillRect(e2,0,1,1); g.fillRect(e2,TH-1,1,1); g.fillRect(e2+(left?-1:1)*0,1,1,1); g.fillRect(e2,TH-2,1,1); }); }
  o.L=cap(true); o.R=cap(false); return LT[key]=o; }
function drawLedge(px,py,w,key,c,seed){ var t=ledgeTiles(key,c), X=Math.round(px), Y=Math.round(py), cw=6*HS, mw=24*HS, end=X+Math.round(w)-cw, j=0;
  cx.fillStyle='rgba(0,0,0,.22)'; cx.fillRect(X+6,Y+8,Math.round(w),TH*HS);
  for(var x=X+cw;x<end;x+=mw){ var m=t.M[(seed+j++)%3], ww=Math.min(mw,end-x); cx.drawImage(m,0,0,ww,m.height,x,Y,ww,m.height); }
  cx.drawImage(t.L,X,Y); cx.drawImage(t.R,end,Y); }
function zKey(z){ var i=ZONES.indexOf(z); return i<0?0:i; }
function drawPlat(p,py,z){ var x0=cxAt(p,gt), px=x0-p.w/2, k=p.kind, a=1;
  if(p.goneAt){ var gtime=gt-p.goneAt; if(gtime<0.7){ py+=gtime*gtime*1400; a=1-gtime/0.7; } else if(gtime>RETURN_S-0.6){ a=(gtime-(RETURN_S-0.6))/0.6*0.9; } else return; }
  else if(p.crAt){ px+=Math.round(Math.sin(gt*70)*3); }
  cx.globalAlpha=a; px=Math.round(px); py=Math.round(py);
  if(k==='spring'){ var bo=p.boing!==undefined&&gt-p.boing<0.25?Math.round(Math.sin((gt-p.boing)/0.25*Math.PI)*10):0, L='#2A1B2E';
    cx.fillStyle='rgba(0,0,0,.22)'; cx.fillRect(px+6,py+34,p.w,8);
    cx.fillStyle=L; cx.fillRect(px,py+28,p.w,10); cx.fillStyle='#566074'; cx.fillRect(px+2,py+30,p.w-4,6); cx.fillStyle='#8A93A8'; cx.fillRect(px+2,py+30,p.w-4,2);   // base
    [0.22,0.5,0.78].forEach(function(f){ var sx=Math.round(px+p.w*f), top=py+8+bo, n=4, hgt=(py+28-top)/n;                                                       // coils
      for(var s=0;s<n;s++){ var yy=Math.round(top+s*hgt); cx.fillStyle=L; cx.fillRect(sx-12,yy,24,6); cx.fillStyle=s%2?'#AEB7CA':'#E2E7F0'; cx.fillRect(sx-10,yy+2,20,2); } });
    cx.fillStyle=L; cx.fillRect(px,py-6+bo,p.w,16); cx.fillStyle='#E8553D'; cx.fillRect(px+2,py-4+bo,p.w-4,12); cx.fillStyle='#FFB199'; cx.fillRect(px+6,py-2+bo,p.w-12,2);   // pad
    cx.fillStyle='#B83A2A'; cx.fillRect(px+2,py+6+bo,p.w-4,2); }
  else { var c=k==='ice'?PAL_ICE:k==='crumble'?PAL_CR:PAL[zKey(z)], key=k==='ice'?'ice':k==='crumble'?'cr':'z'+zKey(z);
    drawLedge(px,py,p.w,key,c,p.i);
    if(p.amp){ cx.fillStyle='#2A1B2E'; arrow(px+12,py+14,-1,'#2A1B2E',1); arrow(px+p.w-12,py+14,1,'#2A1B2E',1); arrow(px+12,py+14,-1,'#FFF04D',0); arrow(px+p.w-12,py+14,1,'#FFF04D',0); } }
  cx.globalAlpha=1; }
/* a little pixel arrow on a moving ledge, pointing out (o = 1 draws the outline, a size larger) */
function arrow(x,y,d,col,o){ cx.fillStyle=col; for(var i=0;i<5+o;i++){ var hh=2*(5+o-i)-1; cx.fillRect(x+d*(i*2)-(d<0?2:0)+(o?-d*2:0),y-hh,2,hh*2); } }

//@@ MAN
/* the climber: Lantern Peak sprite frames, picked from what the body is doing */
var TINT={};
function tinted(col){ if(TINT[col]) return TINT[col]; if(!ready(HERO)) return null; var c=document.createElement('canvas'); c.width=HERO.naturalWidth; c.height=HERO.naturalHeight;
  var g=c.getContext('2d'); g.drawImage(HERO,0,0); g.globalCompositeOperation='source-in'; g.fillStyle=col; g.fillRect(0,0,c.width,c.height); return TINT[col]=c; }
function heroFrame(){ if(!P.on) return P.vy>60?'jump':'fall'; if(P.sq>0.45) return 'land'; if(Math.abs(P.vx)>40) return Math.sin(P.walk*16)>0?'run':'idle'; return 'idle'; }
function drawMan(x,y,ghost){ var air=!P.on, f=P.face||1, sq=P.sq, sx=1+0.16*sq, syy=1-0.16*sq;
  if(air&&!P.spin){ var st=Math.min(0.08,Math.abs(P.vy)/16000); sx-=st; syy+=st; }
  cx.save(); cx.translate(Math.round(x),Math.round(y)); cx.imageSmoothingEnabled=false;
  if(!air&&!ghost){ cx.fillStyle='rgba(0,0,0,.28)'; cx.fillRect(-20,-3,40,6); cx.fillRect(-14,-5,28,10); }
  if(P.rot){ cx.translate(0,-40); cx.rotate(P.rot); cx.translate(0,40); }
  cx.scale(sx,syy);
  var tb=turbo();
  if(!ghost&&tb&&(Math.abs(P.vx)>200||air)){ var fl=Math.round(10+tb*8+Math.random()*8), fc=tb>=3?'#FF6BD6':tb>=2?'#FF8A1F':'#FFC93C';    // Turbo shoes: pixel flames
    [-10,8].forEach(function(lx){ var bx=lx-(air?0:f*4); cx.fillStyle=fc; for(var i=0;i<fl;i+=4){ var wv=Math.max(2,10-i*0.6); if(air) cx.fillRect(bx-wv/2+2,i,wv,4); else cx.fillRect(bx-f*i*0.8-wv/2+2,-6-i*0.2,wv,4); }
      cx.fillStyle='#FFF6C8'; cx.fillRect(bx,air?0:-6,4,4); }); }
  var fr=heroFrame(), r=PIX&&PIX.heroF[fr], img=ghost?tinted(ghost):(ready(HERO)?HERO:null);
  if(r&&img){ var w=r[2]*HS, h=r[3]*HS; cx.scale(f,1); cx.drawImage(img,r[0],r[1],r[2],r[3],-Math.round(w/2),-h,w,h); cx.scale(f,1); }
  else if(!ghost){ cx.fillStyle='#E8553D'; cx.fillRect(-18,-70,36,70); }          // art not loaded yet: a plain block, never a blank
  if(!ghost&&P.glide){ var Lc='#2A1B2E'; cx.fillStyle=Lc; cx.fillRect(-40,-122,80,6); cx.fillRect(-46,-116,92,8); cx.fillStyle='#FF8A5C'; cx.fillRect(-36,-120,72,4); cx.fillStyle='#FFC23D'; cx.fillRect(-42,-114,84,4);
    cx.fillStyle=Lc; cx.fillRect(-40,-108,2,30); cx.fillRect(38,-108,2,30); cx.fillRect(-2,-108,2,24); }
  if(!ghost&&tb){ cx.fillStyle=['','#FFC93C','#FF8A1F','#FF6BD6'][tb]; cx.fillRect(-18,-6,14,4); cx.fillRect(4,-6,14,4); }    // glowing soles
  if(!ghost&&(buffOn('rocket')||P.vy>1900)){ var rf=Math.round(40+Math.random()*30);
    for(var k=0;k<rf;k+=6){ var ww=Math.max(4,24-k*0.4); cx.fillStyle=k<rf*0.45?'#FFF04D':'#FF8A1F'; cx.fillRect(-ww/2,k,ww,6); } }
  cx.restore();
  /* running fast kicks up a little dust */
  if(!ghost&&!air&&Math.abs(P.vx)>0.75*VMAX&&Math.random()<0.18&&dust.length<70) dust.push({x:x-f*16,h:P.h+2,vx:-f*(60+Math.random()*80),vy:40+Math.random()*60,t:0.12,col:'rgba(255,248,232,.7)'}); }

//@@ BACK
/* the sky behind the tower: stepped pixel bands, the Pinewood valley at the bottom, then one big sky thing per zone */
function bandStrip(c,sk){ var A=sk[0].match(/\d+/g).map(Number), B=sk[1].match(/\d+/g).map(Number), n=14, bh=Math.ceil(H/n);
  for(var b=0;b<n;b++){ var k=b/(n-1); c.fillStyle='rgb('+A.map(function(v,j){ return Math.round(v+(B[j]-v)*k); }).join(',')+')'; c.fillRect(0,b*bh,1,bh+1); } }
var SKYOBJ={};
function skyObj(i){ if(SKYOBJ[i]) return SKYOBJ[i]; var o=null;
  if(i===1) o=pxc(40,40,5,function(g){ for(var y=0;y<40;y++) for(var x=0;x<40;x++){ var d=Math.hypot(x-19.5,y-19.5); if(d<19){ g.fillStyle=d<13?'#FFE6A8':d<16?'#FFC27A':'#FF9A6A'; g.fillRect(x,y,1,1); } }
    g.fillStyle='rgba(255,154,106,.0)'; [26,30,33].forEach(function(y,j){ g.clearRect(0,y,40,1+j); }); });                      // the setting sun, with bands cut through it
  else if(i===2) o=pxc(120,40,4,function(g){ var r=srnd(5); var hs=[]; for(var x=0;x<120;x++){ var h=14+Math.round(20*Math.abs(Math.sin(x/17+1))+6*Math.abs(Math.sin(x/6.1))); hs.push(Math.min(40,h)); }
    for(x=0;x<120;x++){ for(var y=40-hs[x];y<40;y++){ g.fillStyle=y<40-hs[x]+4?'#DCE6FA':y<40-hs[x]+12?'#8E9CC8':'#6E7AA6'; g.fillRect(x,y,1,1); } } });           // far snowy peaks
  else if(i===3) o=pxc(44,30,5,function(g){ for(var y=0;y<30;y++) for(var x=0;x<44;x++){ var dx=x-21.5, dy=y-14.5, d=Math.hypot(dx,dy);
      if(d<10){ g.fillStyle=(dy<-3)?'#E0B8FF':(dy<3)?'#B98BFF':'#8A5CD6'; g.fillRect(x,y,1,1); }
      else if(Math.abs(dy*2.6-dx*0.6)<2.2&&Math.abs(dx)<21&&!(d<10.5&&dy<0)){ g.fillStyle='#FFC6F0'; g.fillRect(x,y,1,1); } } });         // a ringed planet
  else if(i===4) o=pxc(48,48,6,function(g){ for(var y=0;y<48;y++) for(var x=0;x<48;x++){ var d=Math.hypot(x-23.5,y-23.5); if(d<22){ g.fillStyle=d<20?'#F4F0DC':'#D9D2B0'; g.fillRect(x,y,1,1); } }
    [[15,14,5],[30,22,4],[20,31,3],[33,11,2],[11,26,2]].forEach(function(q){ for(var y=-q[2];y<=q[2];y++) for(var x=-q[2];x<=q[2];x++) if(x*x+y*y<=q[2]*q[2]){ g.fillStyle=(x+y<0)?'#C9C1A0':'#E2DBBE'; g.fillRect(q[0]+x,q[1]+y,1,1); } }); });   // the moon
  return SKYOBJ[i]=o; }
var BGC=null;
function bg1(){ if(BGC) return BGC; BGC=document.createElement('canvas'); BGC.width=W; BGC.height=594; var g=BGC.getContext('2d'); g.imageSmoothingEnabled=false; g.drawImage(BG1,0,0,W,594); return BGC; }   // scaled once, not every frame
var CLOUD=null;
function cloud(){ return CLOUD||(CLOUD=pxc(48,14,5,function(g){ g.fillStyle='#FFFFFF'; g.fillRect(8,6,34,6); g.fillRect(14,2,12,4); g.fillRect(24,4,12,2); g.fillRect(4,9,42,4);
  g.fillStyle='#DCEBF2'; g.fillRect(4,12,42,2); })); }
function drawBack(m){ var i, y, zi=zoneIx(m), wz=function(j){ var z=ZONES[j], n=ZONES[j+1], a=Math.min(1,Math.max(0,(m-z.m+40)/60)), b=n?Math.min(1,Math.max(0,(n.m-m)/40)):1; return Math.min(a,b); };
  cx.imageSmoothingEnabled=false;
  /* stars come out as the sky darkens (square pixels, a slow twinkle) */
  var sa=Math.min(0.9,Math.max(0,(m-180)/300)); if(sa>0){ cx.fillStyle='#fff'; for(i=0;i<70;i++){ cx.globalAlpha=sa*(0.5+0.5*((i*37)%10)/10); y=Math.round((((i*193)%H)+cam*0.08)%H); cx.fillRect((i*271)%W,y,(i%3)?2:4,(i%3)?2:4); } cx.globalAlpha=1; }
  /* one big thing in the sky for each zone: the sun at Sunset Cliffs, far peaks at Ice Peaks, a planet at Star Tower, the moon at Moon Base */
  for(i=1;i<ZONES.length;i++){ var a=wz(i); if(a<=0.01) continue; var o=skyObj(i), drift=Math.max(-160,Math.min(140,(m-ZONES[i].m)*0.6)); cx.globalAlpha=a*(i===2?0.7:1);
    if(i===1) cx.drawImage(o,W-330,Math.round(260+drift));
    else if(i===2) cx.drawImage(o,Math.round((W-o.width)/2),Math.round(H-o.height-150+drift*0.5));
    else if(i===3) cx.drawImage(o,90,Math.round(150+drift*0.5));
    else cx.drawImage(o,W-380,Math.round(110+drift*0.2)); }
  cx.globalAlpha=1;
  /* the Pinewood valley the climb starts from; it sinks away as you go up */
  var by=Math.round(700-594+cam*0.3); if(by<H&&ready(BG1)){ for(var f=0;f<6;f++){ cx.fillStyle='rgba(191,227,232,'+((f+1)/7).toFixed(2)+')'; cx.fillRect(0,by-96+f*16,W,16); } cx.drawImage(bg1(),0,by); }
  /* drifting pixel clouds (gone by the time the stars are out) */
  var ca=Math.max(0,0.75-m/420); if(ca>0.02){ var cl=cloud(); for(i=0;i<5;i++){ y=Math.round((((i*211)%(H+240))+cam*0.35)%(H+240)-120); cx.globalAlpha=ca*(i%2?0.7:1); cx.drawImage(cl,Math.round((i*397+gt*(8+i*3))%(W+260))-200,y); } cx.globalAlpha=1; }
  /* snow drifts down through Ice Peaks */
  var sn=wz(2); if(sn>0.02){ cx.fillStyle='#fff'; cx.globalAlpha=sn*0.8; for(i=0;i<40;i++){ var fx=Math.round(((i*157)+Math.sin(gt*0.8+i)*20+W)%W), fy=Math.round(((i*263)+gt*(40+i%5*12)+cam*0.2)%H); cx.fillRect(fx,fy,i%4?2:4,i%4?2:4); } cx.globalAlpha=1; }
  /* the ground under the first floor: rock */
  var gy=sy(0); if(gy<H+20){ cx.fillStyle='#4A3A2E'; cx.fillRect(0,gy,W,H-gy+20); cx.fillStyle='#3E3026'; for(var s=0;s<W;s+=36) for(var r2=gy+40;r2<H;r2+=30) cx.fillRect(s+((r2/30|0)%2)*18,r2,14,6); } }

//@@ FLOOR
/* every 10th ledge is a full floor: rock across the screen, a height sign, and a lantern that lights when it is your checkpoint */
function drawFloor(p,py,z){ py=Math.round(py); var zi=zKey(z); drawLedge(-12,py,W+24,'z'+zi,PAL[zi],p.i);
  if(isWayFloor(p.i)) drawWaystone(300,py,p.i<S.nextWay,!!S.way&&p.i<=S.way.i&&S.way.i<nextWayAfter(p.i));
  if(p.i>0){ var fx=W-150, lit=S.cp>=p.i, L='#2A1B2E';
    cx.fillStyle=L; cx.fillRect(fx-4,py-80,10,80); cx.fillStyle='#7A5A3A'; cx.fillRect(fx-2,py-78,6,78); cx.fillStyle=L; cx.fillRect(fx-4,py-84,34,6); cx.fillRect(fx+20,py-84,4,12);   // post and arm
    var lx=fx+22, ly=py-72;
    if(lit){ cx.fillStyle='rgba(255,200,90,.22)'; cx.fillRect(lx-26,ly-6,52,46); cx.fillStyle='rgba(255,200,90,.18)'; cx.fillRect(lx-36,ly+2,72,30); }
    cx.fillStyle=L; cx.fillRect(lx-12,ly,24,30); cx.fillRect(lx-8,ly-4,16,4);
    cx.fillStyle=lit?'#FFC23D':'#5C5670'; cx.fillRect(lx-9,ly+4,18,22); cx.fillStyle=lit?'#FFF1C2':'#7D7792'; cx.fillRect(lx-3,ly+8,6,12);
    cx.textAlign='left'; cx.font='800 26px Inter, sans-serif'; cx.lineWidth=6; cx.strokeStyle='rgba(0,0,0,.6)'; cx.strokeText(Math.floor(p.h/20)+' m',22,py-14); cx.fillStyle='#fff'; cx.fillText(Math.floor(p.h/20)+' m',22,py-14); } }

//@@ GEM
var GEMS={};
function gemArt(gold){ var k=gold?'g':'c'; if(GEMS[k]) return GEMS[k];
  var c1=gold?'#FFC82E':'#2DE2E6', c2=gold?'#E09A12':'#1AA9B8', hi=gold?'#FFF3B0':'#C8FFFF', s=gold?5:4;
  return GEMS[k]=pxc(11,13,s,function(g){ for(var y=0;y<13;y++){ var hw=y<6?y:12-y; for(var x=5-hw;x<=5+hw;x++){ var edge=(x===5-hw||x===5+hw||y===0||y===12); g.fillStyle=edge?'#1B1328':(x<5&&y<6)?hi:(x>5||y>6)?c2:c1; g.fillRect(x,y,1,1); } } }); }
function drawGem(gx,gy,gold){ var a=gemArt(gold); cx.imageSmoothingEnabled=false; cx.drawImage(a,Math.round(gx-a.width/2),Math.round(gy-a.height/2)); }

//@@ PLAY
/* ================= v2: free movement, Waystones and new moves =================
   Running and jumping are free. A Waystone waits on floor 10, then every 30 ledges: the tower freezes for exactly 3 questions,
   right or wrong (Kody 2026-11-19: math well = a better game, never a wall). 2 or 3 right teaches the next move; 3 of 3 also
   gives a heart back; 0 or 1 right means no move this time (it is offered again next Waystone). Moves come in a fixed order:
   Wall Kick, Double Jump, Glide, Air Dash, Triple Jump, then boosts that stack up to 3 times. */
var WAY_FIRST=10, WAY_EVERY=40;   /* v4: every 40 ledges (v3's 30 left a middling climber standing still ~45% of the round) */
function isWayFloor(i){ return i>=WAY_FIRST&&(i-WAY_FIRST)%WAY_EVERY===0; }
function nextWayAfter(i){ return WAY_FIRST+WAY_EVERY*(Math.floor((i-WAY_FIRST)/WAY_EVERY)+1); }
var MOVES=[ {id:'wall', name:'Wall Kick', d:'Jump just as you hit a side wall to kick up off it', how:'Jump at a side wall'},
            {id:'dbl', name:'Double Jump', d:'Jump again in the air', how:'Jump in the air'},
            {id:'glide', name:'Glide', d:'Hold Jump while falling to float down', how:'Hold Jump, falling'},
            {id:'dash', name:'Air Dash', d:'A fast burst sideways in the air', how:'Shift, X or K'},
            {id:'triple', name:'Triple Jump', d:'A third jump in the air', how:'Jump in the air', need:'dbl'} ];
var BOOSTS=[ {id:'jump', name:'Spring Boots', d:'Jump higher'}, {id:'speed', name:'Speed Shoes', d:'Run faster'},
             {id:'combo', name:'Combo Clock', d:'More time to land a combo'}, {id:'magnet', name:'Gem Magnet', d:'Grab gems from farther away'} ];
function moveDef(id){ return MOVES.filter(function(m){ return m.id===id; })[0]||BOOSTS.filter(function(m){ return m.id===id; })[0]||{id:'pts',name:'+150 Points',d:'Every move is maxed out!'}; }
function airMax(){ return (S.mv.dbl?1:0)+(S.mv.triple?1:0); }
function doJump(vm){ var nearL=P.x<PW/2+10, nearR=P.x>W-PW/2-10; if(!P.on&&(nearL||nearR)&&!(gt-(P.wallT===undefined?-9:P.wallT)<0.3)){ P.wallT=gt; P.wallSide=nearL?1:-1; }
  var kick=!P.on&&S.mv.wall&&gt-(P.wallT===undefined?-9:P.wallT)<0.3;
  if(kick){ P.vx=P.wallSide*vm*0.95; P.vy=JV*1.12*Math.sqrt(U('jump')); P.face=P.wallSide; P.spin=P.wallSide; P.rot=0; P.wallT=-9; S.kicks=(S.kicks||0)+1;
    S.jumps++; S.bounces++; SND.boing(); puff(P.x,P.h+40,6); fxAdd('kick',P.x-P.wallSide*PW/2,P.h,P.wallSide); return; }
  var air=!P.on; if(air&&(P.airJ||0)>=airMax()) return;
  if(air){ P.airJ=(P.airJ||0)+1; puff(P.x,P.h,6,'rgba(190,240,255,.9)'); }
  P.on=null; var sp=Math.abs(P.vx); P.vy=(JV+JK*sp)*Math.sqrt(U('jump'))*(air?0.92:1); P.spin=sp>0.78*vm?(P.vx>0?1:-1):0; P.rot=0;
  S.jumps++; SND.jump(sp/VMAX); if(!air&&sp>300) puff(P.x,P.h,5); }
function doDash(mv,vm){ if(!dashQ) return; dashQ=false; if(!S.mv.dash||P.on||P.dashed) return; var d=mv||P.face||1;
  P.dashed=true; P.dashT=0.2; P.vx=d*vm*1.8; P.face=d; P.vy=Math.max(P.vy,60); SND.dash(); puff(P.x,P.h+30,6,'rgba(255,214,140,.9)'); }
SND.dash=function(){ tone(520,1040,0,0.12,'triangle',0.09); tone(260,520,0.02,0.1,'sine',0.05); };
SND.way=function(){ [523.25,783.99,1046.5].forEach(function(f,i){ tone(f,f,i*0.09,0.22,'triangle',0.11); }); };
function openWay(){ S.way={i:P.on.i,got:0,n:0,res:[]}; keys.l=keys.r=keys.j=false; ptr={}; jumpQ=false; dashQ=false; P.vx=0; SND.way();
  newQ(); save(); hud(); nudge(); }
function closeWay(){ var w=S.way, r=w.got; S.way=null; S.ways++; S.nextWay=nextWayAfter(w.i); S.q=null; S.qDone=false; S.bonus+=r*20+(r===3?300:0);
  if(r===3){ SND.goal(); var q=stagePoint(cv,P.x,sy(P.h)-80); confetti(q[0],q[1],60,2.4); } else SND.miss();
  var healed=r===3&&wayHeal(); S.offer=makeOffer().concat([r,healed?1:0]); showOffer(); showQ(); save(); hud(); }
/* the reward is fixed: the next move in order, then the boosts in turn (each up to 3 times), then points */
var BOOST_ORDER=['jump','speed','combo','magnet'];
function makeOffer(){ var m=MOVES.filter(function(x){ return !S.mv[x.id]&&(!x.need||S.mv[x.need]); })[0]; if(m) return [m.id];
  var nb=S.learned.filter(isBoost).length; for(var k=0;k<12;k++){ var id=BOOST_ORDER[(nb+k)%4]; if(S.lv[id]<3) return [id]; } return ['pts']; }
function isBoost(id){ return BOOSTS.some(function(x){ return x.id===id; }); }
function showOffer(){ var el=$('jmr-offer'); if(!S.offer){ el.hidden=true; return; } var id=S.offer[0], r=S.offer[1]===undefined?3:S.offer[1], d=moveDef(id), win=r===3;
  $('jmr-offerh').textContent=!win?'Almost!':isBoost(id)?'Upgrade!':id==='pts'?'Bonus!':'New move!';
  $('jmr-offer').classList.toggle('miss',!win);
  var score='<span class="jmr-score">'+r+' of 3 right'+(S.offer[2]?' · +1 heart':'')+(r===3?' · +300':'')+(win?'':' · get all 3 right next time to learn it')+'</span>';
  $('jmr-picks').innerHTML='<button class="jmr-pick'+(win?'':' locked')+'" data-i="0">'+score+'<b>'+d.name+(isBoost(id)?' <small>level '+(S.lv[id]+1)+' of 3</small>':'')+'</b><span class="d">'+d.d+'</span>'+(d.how&&win?'<span class="jmr-how">'+d.how+'</span>':'')+'</button>';
  el.hidden=false; }
var LASTR=3;
function pickOffer(i){ if(!S.offer||!S.offer[0]||S.over) return; var id=S.offer[0], d=moveDef(id); LASTR=S.offer[1]===undefined?3:S.offer[1]; S.offer=null; $('jmr-offer').hidden=true;
  var won=LASTR===3;
  if(won){ if(id==='pts') S.bonus+=150; else if(isBoost(id)) S.lv[id]=Math.min(3,S.lv[id]+1); else S.mv[id]=1; S.learned.push(id); } SND.goal(); keys.l=keys.r=keys.j=false; jumpQ=false; save(); showQ(); hud(); }
$('jmr-picks').addEventListener('click',function(e){ var b=e.target.closest('.jmr-pick'); if(b) pickOffer(+b.dataset.i); });
/* between Waystones the question panel shows the moves you have */
function idleQ(){ $('jm-tag').textContent='Climb'; $('jm-reward').textContent=''; $('jm-q').classList.remove('vis'); $('jm-visual').innerHTML='';
  var left=Math.max(0,S.nextWay-(S.pi||0)); $('jm-prompt').innerHTML=S.rush?'<span class="jmr-idle">Summit Rush! Reach the <b class="g">golden lantern</b></span>':'<span class="jmr-idle">Next Waystone in <b>'+left+'</b> ledge'+(left===1?'':'s')+'</span>';
  var rows=[['Run','← →'],['Jump','Space or ↑']]; MOVES.forEach(function(m){ if(S.mv[m.id]) rows.push([m.name,m.how]); });
  BOOSTS.forEach(function(b){ if(S.lv[b.id]) rows.push([b.name,'Level '+S.lv[b.id]]); });
  $('jm-choices').innerHTML='<div class="jmr-moves"><div class="jmr-mh">Your moves</div>'+rows.map(function(r){ return '<div class="jmr-mv"><b>'+r[0]+'</b><span>'+r[1]+'</span></div>'; }).join('')+'</div>';
  var fb=$('jm-fb'); fb.className='jm-fb'; fb.innerHTML='Each Waystone asks 3 questions. Every right answer holds the fog back 3 seconds. All 3 right teaches a new move and gives back a heart.'; $('jm-next').disabled=true; }
var idleLeft=-1; setInterval(function(){ if(S&&S.started&&!S.over&&!S.way){ var l=(S.rush?'r':'')+(S.nextWay-(S.pi||0)); if(l!==idleLeft){ idleLeft=l; idleQ(); } } },300);

//@@ WAYDRAW
/* a Waystone on every full floor: a stone pillar whose rune glows cyan ahead of you and gold once it is passed */
function drawWaystone(x,py,done,active){ var L='#1B1328', rune=done?'#FFC23D':'#7CF0FF';
  if(active||!done){ cx.fillStyle=done?'rgba(255,194,61,.18)':'rgba(124,240,255,.16)'; cx.fillRect(x-34,py-96,68,92); }
  cx.fillStyle=L; cx.fillRect(x-22,py-86,44,86); cx.fillRect(x-26,py-12,52,12);
  cx.fillStyle='#8A8FA6'; cx.fillRect(x-18,py-82,36,72); cx.fillStyle='#A9AEC2'; cx.fillRect(x-18,py-82,36,6); cx.fillStyle='#6E7388'; cx.fillRect(x+10,py-76,8,66); cx.fillRect(x-22,py-8,44,6);
  cx.fillStyle=rune; [[-6,-70,12,4],[-2,-66,4,22],[-10,-56,20,4],[-6,-42,4,12],[2,-42,4,12],[-6,-30,12,4]].forEach(function(r){ cx.fillRect(x+r[0],py+r[1],r[2],r[3]); });
  if(active){ for(var k=0;k<3;k++){ cx.fillStyle=L; cx.fillRect(x-28+k*20,py-112,16,16); var rr2=S.way?S.way.res[k]:undefined; cx.fillStyle=rr2===1?'#FFC23D':rr2===0?'#FF6B6B':'#3A3550'; cx.fillRect(x-26+k*20,py-110,12,12); } } }

//@@ FOG
/* ================= hearts and the rising fog (Kody 2026-11-17) =================
   3 hearts. After the first Waystone a fog rises up the tower, a little faster the higher you are, and never more than
   about 5 ledges below you. Sinking into it costs a heart and lifts you to a safe ledge above it; at 0 hearts the run ends.
   The fog stops at every Waystone, and passing one gives a heart back and pushes the fog down. */
var FOG_GAP=700, HEART_MAX=3, FOG_START=20, CALM_PER=3, CALM_MAX=12;
/* v4: the fog also starts 20 s into the climb (so standing still loses), each right answer holds it 3 s (shown under the
   hearts), combos of 4+ floors hold it too, and it runs 25% faster in the Summit Rush */
function fogOn(){ return S.ways>0||(S.climbT||0)>=FOG_START; }
function fogSpeed(){ return Math.min(FOG_CAP,FOG_V0+Math.floor(S.top/20)*FOG_RAMP)*(S.rush?1.25:1); }
var FOG_V0=24, FOG_RAMP=0.07, FOG_CAP=85;    /* v8: Kody 'way too easy' (v4 was 24 + 0.07/m, cap 85, gap 560) */
function fogCalm(s){ S.calm=Math.min(CALM_MAX,(S.calm||0)+s); }
function fogStep(dt){ var was=fogOn(); S.climbT=(S.climbT||0)+dt; if(!was&&fogOn()&&!S.ways){ pop(P.x,P.h+260,'THE FOG RISES!','climb up and away','#D6C8F0',true); SND.crash(); }
  if(!fogOn()){ S.fog=P.h-FOG_GAP; return; }
  if(S.calm>0){ S.calm=Math.max(0,S.calm-dt); S.fog=Math.max(S.fog,P.h-FOG_GAP); }
  else S.fog=Math.max(S.fog+fogSpeed()*dt, P.h-FOG_GAP);
  if(P.h+PH*0.45<S.fog) fogHit(); }
function fogHit(){ S.hearts=Math.max(0,S.hearts-1); SND.crash(); shk=10; endCombo();
  if(S.hearts<=0){ S.fogOut=true; endRun(); return; }
  var tgt=null; for(var i=Math.max(0,S.pi-20);i<plats.length;i++){ var p=plats[i]; if(p.h>S.fog+300&&solid(p)&&p.kind!=='spring'&&p.kind!=='crumble'){ tgt=p; break; } }
  if(tgt){ P.on=tgt; P.h=tgt.h; P.x=tgt.floor?W/2:cxAt(tgt,gt); P.vx=0; P.vy=0; P.lastI=tgt.i; S.pi=tgt.i; P.airJ=0; P.dashed=false; P.glide=false; }
  S.fog=P.h-FOG_GAP; S.calm=Math.max(S.calm||0,3); cam=P.h;   /* v8: 3 s of held fog after a hit, so one mistake never costs two hearts */ pop(P.x,P.h+160,'OUCH!',S.hearts+(S.hearts===1?' heart left':' hearts left'),'#FF8FA3',true); hud(); save(); }
function wayHeal(){ if(S.hearts<HEART_MAX){ S.hearts++; pop(P.x,P.h+230,'+1 HEART','','#FF8FA3'); return true; } return false; }
var FOGC=null;
function fogTop(){ return FOGC||(FOGC=pxc(64,8,4,function(g){ for(var x=0;x<64;x++){ var h=3+Math.round(2*Math.sin(x/5)+1.5*Math.sin(x/2.3)); g.fillStyle='rgba(214,200,240,.55)'; g.fillRect(x,8-h-2,1,2); g.fillStyle='rgba(176,156,214,.78)'; g.fillRect(x,8-h,1,h); } })); }
function drawFog(){ if(!S.started||!fogOn()) return; var y=Math.min(Math.round(sy(S.fog)),H-40);   /* it always peeks in at the bottom, so you know it is there */ var ft=fogTop(), off=Math.round((gt*20)%256);
  var calm=S.calm>0, edge=calm?'#7CF0FF':'#FF8FA3';
  cx.fillStyle=calm?'rgba(124,240,255,.22)':'rgba(255,143,163,.25)'; cx.fillRect(0,y-26,W,26);             // a glow just above the edge
  for(var x=-off;x<W;x+=ft.width) cx.drawImage(ft,x,y-ft.height);
  cx.fillStyle='rgba(150,124,200,.9)'; cx.fillRect(0,y,W,H-y+40); cx.fillStyle='rgba(84,60,132,.75)'; cx.fillRect(0,y+50,W,H-y);
  cx.fillStyle=edge; cx.fillRect(0,y-2,W,4); drawWisps(y);
  var near=P.h-S.fog; if(!S.over&&!S.way&&!S.offer){
    if(near<240){ cx.fillStyle='rgba(255,143,163,.10)'; cx.fillRect(0,0,W,H); }
    if(near<340&&!calm){ var bob=RM()?0:Math.round(Math.sin(gt*4)*4); panel(W/2-210,y-118+bob,420,62); cx.textAlign='center'; cx.fillStyle='#FF8FA3'; cx.font='400 36px '+DF; cx.fillText('FOG CLOSE! CLIMB ↑',W/2,y-76+bob); } } }
function RM(){ return !!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches); }
function drawHearts(){ if(!S.started) return; var x0=512, y0=26; panel(x0-14,14,218,72);
  for(var k=0;k<HEART_MAX;k++){ var x=x0+k*64, on=k<S.hearts; heartPx(x,y0,on); }
  if(fogOn()&&!S.over){ var held=S.calm>0, gap=Math.max(0,Math.round((P.h-S.fog)/20)); panel(x0-14,92,218,44); cx.textAlign='center'; cx.font='800 24px Inter, sans-serif';
    cx.fillStyle=held?'#7CF0FF':gap<17?'#FF8FA3':'#D6C8F0'; cx.fillText(held?'FOG HELD '+Math.ceil(S.calm)+' s':'FOG '+gap+' m BELOW',x0+95,122); } }   /* always says how close the fog is */
var HEARTS={};
function heartPx(x,y,on){ var k=on?'on':'off'; if(!HEARTS[k]) HEARTS[k]=pxc(11,10,5,function(g){ var M=['.##...##...','#hh#.#hh#..','#hhffffff#.','#hffffffff#','#ffffffff#.','.#ffffff#..','..#ffff#...','...#ff#....','....##.....','...........'];
    M.forEach(function(r,yy){ for(var xx=0;xx<11;xx++){ var c=r[xx]; if(c==='.') continue; g.fillStyle=c==='#'?'#1B1328':c==='h'?(on?'#FFC2CF':'#7A7590'):(on?'#FF4F6E':'#4A4660'); g.fillRect(xx,yy,1,1); } }); });
  cx.drawImage(HEARTS[k],x,y); }

//@@ WALLS
/* the tower's side walls, drawn so it is clear you can bounce (and, once learned, kick) off them */
var WALLT={};
function wallTile(zi){ if(WALLT[zi]) return WALLT[zi]; var c=PAL[zi];
  return WALLT[zi]=pxc(9,24,2,function(g){ g.fillStyle=c.rock; g.fillRect(0,0,9,24); g.fillStyle=c.rock2; g.fillRect(0,11,9,1); g.fillRect(0,23,9,1); g.fillRect(4,0,1,11); g.fillRect(1,12,1,11); g.fillStyle=c.hi; g.fillRect(6,3,2,1); g.fillRect(3,15,2,1); }); }
function drawWalls(){ var zi=zoneIx(cam/20), t=wallTile(zi), th=t.height, off=Math.round(((cam%th)+th)%th), L='#1B1328';
  for(var y=-th+off;y<H;y+=th){ cx.drawImage(t,0,y); cx.drawImage(t,W-t.width,y); }
  cx.fillStyle=L; cx.fillRect(t.width,0,3,H); cx.fillRect(W-t.width-3,0,3,H);
  if(S.mv&&S.mv.wall){ cx.fillStyle='#7CF0FF'; for(var k=0;k<8;k++){ var yy=Math.round(((k*140+cam*1)%(H+140)+H+140)%(H+140))-70;      // up arrows on the walls once Wall Kick is learned
      [3,W-15].forEach(function(x){ cx.fillRect(x+4,yy,4,4); cx.fillRect(x+2,yy+4,8,4); cx.fillRect(x,yy+8,12,4); }); } } }
/* the first few times you touch a wall in the air after learning Wall Kick, a prompt says what to do */
function drawKickHint(){ if(!S.started||S.over||!S.mv.wall||(S.kicks||0)>=3||P.on) return; if(!(gt-(P.wallT===undefined?-9:P.wallT)<0.45)) return;
  var x=Math.max(130,Math.min(W-130,P.x+(P.wallSide||1)*90)), y=sy(P.h)-110; panel(x-104,y-34,208,56); cx.textAlign='center'; cx.fillStyle='#7CF0FF'; cx.font='400 34px '+DF; cx.fillText('JUMP!',x,y+6); }

//@@ V4
/* ================= v4 (Nov 22 remake pass): rockfall stretches and the Summit Rush finale =================
   Rockfall: halfway between Waystones (ledges 25-34, 65-74, ...) rocks drop from the sky. Each one shows a warning
   mark at the top for 0.8 s first. A hit knocks you sideways and breaks your combo; it never costs a heart (only the fog does).
   Summit Rush: the last 60 seconds. A golden lantern waits 40 ledges up; reaching it pays 400, then the next one is 30 higher.
   No Waystones during the rush, the fog runs 25% faster, and combos pay double. */
var ROCK_LEN=10, ROCK_FROM=WAY_FIRST+WAY_EVERY/2-ROCK_LEN/2, ROCK_WARN=0.8, ROCK_EVERY=1.15, ROCK_V=560, SUMMIT_UP=40, SUMMIT_NEXT=30, SUMMIT_PTS=400, RUSH_S=60;
var rocks=[], rockT=0, bonkT=0;
function inRocks(i){ return i>=ROCK_FROM&&(i-ROCK_FROM)%WAY_EVERY<ROCK_LEN; }
function rockStep(dt){ var i=P.lastI||0, live=inRocks(i)&&!S.rush;
  if(live&&!S.rockOn){ S.rockOn=true; banner={t0:now(),txt:'Rockfall!',sub:'watch the sky',kind:'rock'}; SND.crack(); }
  if(!live&&S.rockOn) S.rockOn=false;
  rockT-=dt; bonkT-=dt;
  if(live&&rockT<=0){ rockT=ROCK_EVERY; var x=Math.max(60,Math.min(W-60,P.x+(Math.random()-0.5)*520)); rocks.push({x:x,h:cam+700,warn:ROCK_WARN}); }
  rocks.forEach(function(r){ if(r.warn>0){ r.warn-=dt; r.h=cam+700; return; } r.h-=ROCK_V*dt;
    if(bonkT<=0&&Math.abs(r.x-P.x)<PW/2+24&&r.h<P.h+PH+10&&r.h>P.h-10){ r.dead=true; bonk(r); } });
  rocks=rocks.filter(function(r){ return !r.dead&&sy(r.h)<H+80; }); }
function bonk(r){ bonkT=2; var d=P.x>=r.x?1:-1; P.vx=d*340; if(P.on){ P.on=null; P.vy=-120; } else P.vy=Math.min(P.vy,-120);
  endCombo(); CB.on=false; shk=RM()?0:8; SND.crack(); fxAdd('bonk',P.x,P.h);
  /* v10: back to a knock with no heart lost: on the narrow v10 ledges a knock already costs height (v8-v9 took a heart) */
  pop(P.x,P.h+160,'BONK!','','#FFB020'); }
var ROCKC=null;
function rockPx(){ return ROCKC||(ROCKC=pxc(12,12,5,function(g){ var M=['...####.....','..#bbbb##...','.#bbhbbbb#..','#bbhhbbbbb#.','#bbbbbbbsb#.','#bbbbbbbsbb#','#bsbbbbbbbb#','.#bbbbbbsb#.','.#bbbbbbbb#.','..##bbbb##..','....####....','............'];
  M.forEach(function(row,y){ for(var x=0;x<12;x++){ var c=row[x]; if(c==='.') continue; g.fillStyle=c==='#'?'#1B1328':c==='h'?'#E8C79A':c==='s'?'#6B3F22':'#A8693A'; g.fillRect(x,y,1,1); } }); })); }
function drawRocks(){ if(!rocks.length) return; var img=rockPx();
  rocks.forEach(function(r){ if(r.warn>0){ var a=0.55+0.45*(1-r.warn/ROCK_WARN); cx.globalAlpha=a; cx.fillStyle='#1B1328'; cx.fillRect(r.x-22,150,44,52); cx.fillStyle='#FFB020'; cx.fillRect(r.x-18,154,36,44);
      cx.fillStyle='#1B1328'; cx.fillRect(r.x-4,160,8,22); cx.fillRect(r.x-4,186,8,8); cx.globalAlpha=1; return; }
    cx.drawImage(img,Math.round(r.x-img.width/2),Math.round(sy(r.h)-img.height)); }); }
/* ---- Summit Rush ---- */
function rushStep(){ var left=S.endAt-now();
  if(!S.rush&&left<=RUSH_S*1000&&left>0){ S.rush={i:summitAfter(S.pi||0,SUMMIT_UP),n:0}; rocks=[]; banner={t0:now(),txt:'Summit Rush!',sub:'last minute',kind:'rush'}; SND.way(); idleLeft=-1; save(); }
  if(S.rush){ while(plats.length<=S.rush.i+2) genTo(plats[plats.length-1].h+400);
    if(P.on&&P.on.i>=S.rush.i){ S.rush.n++; S.bonus+=SUMMIT_PTS; fxAdd('sum',P.x,P.h); pop(P.x,P.h+240,'SUMMIT!','+'+SUMMIT_PTS,'#FFC23D',true); SND.combo(30);
      var q=stagePoint(cv,P.x,sy(P.h)-80); confetti(q[0],q[1],80,2.6); S.rush.i=summitAfter(S.rush.i,SUMMIT_NEXT); save(); } } }
function summitAfter(i,up){ var t=i+up; while(plats.length<=t+3) genTo(plats[plats.length-1].h+400);
  while(t%FLOOR_EVERY===0||plats[t].amp||plats[t].kind){ t++; while(plats.length<=t+3) genTo(plats[plats.length-1].h+400); } return t; }   /* a plain, still ledge */
var LANT=null;
function lanternPx(){ return LANT||(LANT=pxc(12,18,4,function(g){ var M=['....####....','...#....#...','..########..','..#gggggg#..','.#gyyyyyyg#.','.#gywwwwyg#.','.#gywwwwyg#.','.#gyywwyyg#.','.#gyyyyyyg#.','..#gggggg#..','..########..','....#..#....','....####....','............','............','............','............','............'];
  M.forEach(function(row,y){ for(var x=0;x<12;x++){ var c=row[x]; if(c==='.') continue; g.fillStyle=c==='#'?'#1B1328':c==='g'?'#C8891E':c==='y'?'#FFC23D':'#FFF3C4'; g.fillRect(x,y,1,1); } }); })); }
function drawRush(){ if(!S.rush||S.over) return; var p=plats[S.rush.i]; if(!p) return; var img=lanternPx(), x=cxAt(p,gt), py=sy(p.h);
  drawBeam(x,py); if(py>40){ var gl=RM()?0.3:0.25+0.1*Math.sin(gt*3); cx.globalAlpha=gl; cx.fillStyle='#FFC23D'; cx.fillRect(x-70,py-150,140,150); cx.globalAlpha=1;
    cx.drawImage(img,Math.round(x-img.width/2),Math.round(py-img.height-6)); cx.textAlign='center'; cx.fillStyle='#FFC23D'; cx.font='400 30px '+DF; cx.fillText('SUMMIT',x,py-img.height-18); }
  else if(!banner){ var n=Math.max(0,S.rush.i-(S.pi||0)); panel(W/2-190,150,380,60); cx.textAlign='center'; cx.fillStyle='#FFC23D'; cx.font='400 34px '+DF; cx.fillText('SUMMIT ↑ '+n+' LEDGES',W/2,192); } }
/* ================= v5 pixel effects (Kody 2026-11-22: small and few). Drawn in code on a 4 px grid, PixelFX-style timing:
   a quick hit, a short hold, a fade. Presentation only: none of this touches the rules. At most 6 at once. */
var FXS=[], FXMAX=6;
function fxAdd(k,x,h,d){ if(FXS.length>=FXMAX) FXS.shift(); FXS.push({k:k,x:x,h:h,d:d||1,t0:now(),s:Math.random()*6}); }
function px4(x,y,s,c){ cx.fillStyle=c; cx.fillRect(Math.round(x/4)*4,Math.round(y/4)*4,s,s); }
var FXDUR={kick:0.3,land:0.4,sum:0.7,bonk:0.3};
function drawFx(){ var t=now();
  FXS=FXS.filter(function(f){ return (t-f.t0)/1000<FXDUR[f.k]; });
  FXS.forEach(function(f){ var e=(t-f.t0)/1000, k=e/FXDUR[f.k], y=sy(f.h), a=k<0.6?1:1-(k-0.6)/0.4; cx.globalAlpha=a;
    if(f.k==='kick'){ /* wall-kick sparks: a 4-point star at the wall, then 5 sparks flying off the wall */
      var r=Math.round(4+k*10); if(k<0.35){ px4(f.x-2,y-46-r,4,'#FFFFFF'); px4(f.x-2,y-42+r,4,'#FFFFFF'); px4(f.x-2-r*f.d*-1,y-44,4,'#7CF0FF'); px4(f.x-2,y-44,8,'#FFF3C4'); }
      for(var i=0;i<5;i++){ var an=(-0.9+i*0.45), sp=60+i*18; px4(f.x+f.d*Math.cos(an)*sp*e*3,y-44+Math.sin(an)*sp*e*3,4,i%2?'#7CF0FF':'#FFF3C4'); } }
    else if(f.k==='land'){ /* heavy-landing dust: two low puffs rolling out along the ledge */
      for(var j=0;j<4;j++){ var dx=(18+j*14)*(0.4+k), sz=k<0.5?8:4, c=j%2?'rgba(236,226,206,.95)':'rgba(255,255,255,.9)'; px4(f.x-dx,y-6-j%2*4-k*6,sz,c); px4(f.x+dx-4,y-6-j%2*4-k*6,sz,c); } }
    else if(f.k==='sum'){ /* Summit reached: a ring of gold pixels and four rays */
      var R=20+k*90; for(var q=0;q<12;q++){ var aa=q/12*6.283+f.s; px4(f.x+Math.cos(aa)*R,y-60+Math.sin(aa)*R*0.8,k<0.5?8:4,q%2?'#FFC23D':'#FFF3C4'); }
      if(k<0.4) [[0,-1],[0,1],[-1,0],[1,0]].forEach(function(v){ for(var s=1;s<4;s++) px4(f.x+v[0]*(R*0.5+s*8),y-60+v[1]*(R*0.4+s*8),4,'#FFFFFF'); }); }
    else if(f.k==='bonk'){ /* rock hit: a small orange star */
      var rr=6+k*14; [[1,0],[-1,0],[0,1],[0,-1],[0.7,0.7],[-0.7,0.7],[0.7,-0.7],[-0.7,-0.7]].forEach(function(v,i){ px4(f.x+v[0]*rr,y-70+v[1]*rr,i<4?8:4,i<4?'#FFB020':'#FFF3C4'); }); }
    cx.globalAlpha=1; }); }
/* the summit lantern sends a stepped beam of light up the tower, so you can see where to go */
function drawBeam(x,py){ var g=RM()?0.22:0.18+0.06*Math.sin(gt*2.4); cx.globalAlpha=g; cx.fillStyle='#FFC23D';
  for(var s=0;s<6;s++){ var w=40-s*6; cx.fillRect(Math.round(x-w/2),py-130-(s+1)*90,w,90); } cx.globalAlpha=1; }
/* fog edge shimmer: a few light wisps drifting along the top of the fog */
function drawWisps(y){ for(var i=0;i<7;i++){ var x=((i*157+gt*(18+i*5))%(W+80))-40, yy=y-8-((i*37)%14); cx.fillStyle=i%2?'rgba(255,255,255,.55)':'rgba(230,214,255,.6)'; cx.fillRect(Math.round(x/4)*4,Math.round(yy/4)*4,12+(i%3)*4,4); } }

//@@ HUD6
/* ================= v6 game UI (Kody 2026-11-22: match the newer games) =================
   The tower fills the middle of the screen. Everything you read lives on the two side columns, drawn as outlined text on the
   sky (no boxes, no chips): time and score, goals, Turbo and your moves on the left; height, hearts, the fog and the
   next-Waystone meter on the right. Questions open as a game window over the tower only at a Waystone. Numbers use Spitz Digits. */
var SKYD=document.getElementById('jmr-sky'), SL=document.getElementById('jmr-sl').getContext('2d'), SR=document.getElementById('jmr-sr').getContext('2d'), sideT=0, sideKey=['','',''];
/* speed: the sky behind the columns is a CSS gradient changed every 10 m, and each column is its own small canvas
   that redraws only when one of its own numbers changes (one 1920x1080 canvas cost half the frame rate at 6x slowdown) */
function sideLayer(i,key){ if(sideKey[i]===key) return false; sideKey[i]=key; return true; }
var SW=1920, SH=1080, TX=352, TW=1216, INK='#0B0F1C', WF="'Pixelify Sans', Inter, sans-serif", NF="'Spitz Digits', 'Pixelify Sans', Inter, sans-serif";
function otext(c,txt,x,y,font,col,al,lw,mw){ c.font=font; c.textAlign=al||'left'; c.lineJoin='round'; c.lineWidth=lw||9; c.strokeStyle=INK; if(mw){ c.strokeText(txt,x,y,mw); c.fillStyle=col; c.fillText(txt,x,y,mw); return; } c.strokeText(txt,x,y); c.fillStyle=col; c.fillText(txt,x,y); }
function sideHud(force){ var t=now(); if(!force&&t-sideT<100) return; sideT=t;
  var live=S.started&&!S.over, m=cam/20, left=S.started?Math.max(0,S.endAt-t):S.len*60000, secs=Math.ceil(left/1000), clock=Math.floor(secs/60)+':'+('0'+(secs%60)).slice(-2);
  var wayLeft=Math.max(0,S.nextWay-(S.pi||0)), rushLeft=S.rush?Math.max(0,S.rush.i-(S.pi||0)):0, gap=Math.max(0,Math.round((P.h-S.fog)/20));
  if(force) sideKey=['','',''];
  var sk=skyAt(Math.floor(m/10)*10); if(sideLayer(0,sk.join())) SKYD.style.background='linear-gradient(rgba(6,10,26,.62),rgba(6,10,26,.62)),linear-gradient('+sk[0]+','+sk[1]+')';
  var c=SL, tb=turbo();
  if(sideLayer(1,[S.started,clock,S.score,JSON.stringify(S.goals&&S.goals.map(function(g){ return [g.txt,Math.min(goalProg(g),g.n)]; })),S.streak,tb,JSON.stringify(S.mv)].join('|'))){
  c.setTransform(1,0,0,1,0,0); c.clearRect(0,0,352,SH); c.fillStyle=INK; c.fillRect(TX-8,0,8,SH);
  if(S.started){
  var L=44;
  otext(c,'Time',L,190,'500 36px '+WF,'#A9C2EE'); otext(c,clock,L,272,'400 88px '+NF,secs<=30?'#FF8FA3':'#FFFFFF');
  otext(c,'Score',L,350,'500 36px '+WF,'#A9C2EE'); otext(c,S.score.toLocaleString(),L,432,'400 88px '+NF,'#FFC93C');
  if(S.goals){ otext(c,'Goals',L,520,'500 32px '+WF,'#A9C2EE'); S.goals.forEach(function(g,j){ var y=566+j*78, pr=Math.min(goalProg(g),g.n);
      otext(c,'★',L,y,'400 30px '+WF,'#FFC93C',null,7); otext(c,g.txt,L+38,y,'800 24px Inter, sans-serif','#FFFFFF',null,7,248);
      c.fillStyle=INK; c.fillRect(L+32,y+14,176,22); c.fillStyle='#242936'; c.fillRect(L+36,y+18,168,14); c.fillStyle='#FFC93C'; c.fillRect(L+36,y+18,Math.round(168*pr/g.n),14);
      otext(c,pr+' / '+g.n,L+218,y+34,'800 20px Inter, sans-serif','#A9C2EE',null,6); }); }
  var nx=tb>=3?0:[5,10,15][tb];
  otext(c,tb?'Turbo '+tb+'!':'Turbo',L,720,'500 32px '+WF,tb?['','#FFC93C','#FF8A1F','#FF6BD6'][tb]:'#A9C2EE');
  otext(c,tb>=3?'Top speed!':(nx-S.streak)+' more right in a row',L,760,'800 22px Inter, sans-serif','#FFFFFF',null,6);
  otext(c,'Moves',L,836,'500 32px '+WF,'#A9C2EE'); var rows=[['Run','← →'],['Jump','↑ / Space']]; MOVES.forEach(function(mv){ if(S.mv[mv.id]) rows.push([mv.name,mv.id==='dash'?'Shift':mv.id==='wall'?'at a wall':mv.id==='glide'?'hold ↑':'↑ in air']); });
  rows.slice(0,6).forEach(function(r,j){ var y=878+j*34; otext(c,r[0],L,y,'800 22px Inter, sans-serif','#FFFFFF',null,6); otext(c,r[1],L+270,y,'800 20px Inter, sans-serif','#7CF0FF','right',6); });
  } }
  // right column (its canvas starts at x=1568, so draw in stage coordinates shifted left)
  c=SR; if(!sideLayer(2,[S.started,Math.floor(Math.max(0,P.h)/20),S.hearts,Math.ceil(S.calm||0),fogOn()?gap:-1,wayLeft,rushLeft,!!S.rush,live&&CB.on?CB.floors+':'+Math.round(CB.t*10):0,S.ways].join('|'))) return;
  c.setTransform(1,0,0,1,0,0); c.clearRect(0,0,352,SH); c.setTransform(1,0,0,1,-(TX+TW),0); c.fillStyle=INK; c.fillRect(TX+TW,0,8,SH);
  if(!S.started) return;
  var R=TX+TW+44;
  otext(c,'Height',R,190,'500 36px '+WF,'#A9C2EE'); otext(c,Math.floor(Math.max(0,P.h)/20)+' m',R,272,'400 88px '+NF,'#FFFFFF');
  heartPx(-99,-99,true); heartPx(-99,-99,false); for(var k=0;k<HEART_MAX;k++) c.drawImage(HEARTS[k<S.hearts?'on':'off'],R+k*92,320,77,70);
  if(fogOn()){ var held=S.calm>0; otext(c,held?'Fog held '+Math.ceil(S.calm)+' s':'Fog '+gap+' m below',R,450,'800 28px Inter, sans-serif',held?'#7CF0FF':gap<17?'#FF8FA3':'#D6C8F0',null,7); }
  else otext(c,'Fog starts soon',R,450,'800 28px Inter, sans-serif','#D6C8F0',null,7);
  var rush=!!S.rush, n=rush?rushLeft:wayLeft, tot=rush?(S.rush.n?SUMMIT_NEXT:SUMMIT_UP):(S.nextWay>WAY_FIRST?WAY_EVERY:WAY_FIRST), lv=Math.max(0,Math.min(1,1-n/tot)), col=rush?'#FFC23D':'#7CF0FF';
  otext(c,rush?'Summit':'Next Waystone',R,540,'500 32px '+WF,col); otext(c,n+(n===1?' ledge':' ledges'),R,588,'800 30px Inter, sans-serif','#FFFFFF',null,7);
  c.fillStyle=INK; c.fillRect(R-6,616,264,40); c.fillStyle='#242936'; c.fillRect(R,622,252,28); c.fillStyle=col; c.fillRect(R,622,Math.round(252*lv),28);
  if(CB.on&&live){ var w=comboWord(Math.max(4,CB.floors)), lvl=Math.max(0,CB.t/U('combo'));
    otext(c,'Combo',R,760,'500 32px '+WF,'#A9C2EE'); otext(c,''+CB.floors,R,836,'400 72px '+NF,CB.jumps>=2&&CB.floors>=4?w[2]:'#FFFFFF'); otext(c,CB.floors===1?'floor':'floors',R+12+c.measureText(''+CB.floors).width,836,'800 30px Inter, sans-serif','#FFFFFF',null,7);
    c.fillStyle=INK; c.fillRect(R-6,862,264,32); c.fillStyle='#242936'; c.fillRect(R,868,252,20); c.fillStyle=lvl>0.3?'#FFC93C':'#FF7A7A'; c.fillRect(R,868,Math.round(252*lvl),20); }
  otext(c,'Waystones cleared',R,676,'800 22px Inter, sans-serif','#A9C2EE',null,6); otext(c,''+S.ways,R+252,676,'800 22px Inter, sans-serif','#FFFFFF','right',6); }
/* the in-tower layer keeps only what belongs in the world: the zone banner, first-time hints and touch buttons */
function towerHud(t,live){
  if(banner){ var bk=(t-banner.t0)/2200; if(bk>=1) banner=null; else { cx.globalAlpha=Math.min(1,bk*6,(1-bk)*4); cx.textAlign='center';
      otext(cx,banner.kind?banner.sub:'New zone · '+banner.sub,W/2,216,'800 30px Inter, sans-serif','#FFC93C','center',8); otext(cx,banner.txt,W/2,296,'400 76px '+WF,'#FFFFFF','center',12); cx.globalAlpha=1; } }
  [['l','◀'],['r','▶'],['j','▲']].concat(S.mv&&S.mv.dash?[['d','»']]:[]).forEach(function(b){ var B=BTN[b[0]], on=Object.keys(ptr).some(function(k){ return ptr[k]===b[0]; }); cx.fillStyle=on?'rgba(255,176,32,.75)':'rgba(8,9,13,.45)'; cx.beginPath(); cx.arc(B.x,B.y,B.r,0,6.28); cx.fill();
    cx.lineWidth=4; cx.strokeStyle='rgba(243,245,249,.5)'; cx.stroke(); cx.fillStyle='#F3F5F9'; cx.textAlign='center'; cx.font='800 '+(b[0]==='j'?56:48)+'px Inter, sans-serif'; cx.textBaseline='middle'; cx.fillText(b[1],B.x,B.y+3); cx.textBaseline='alphabetic'; });
  if(live&&!S.way&&!S.offer&&S.jumps<3&&!banner){ otext(cx,'← → Run     ↑ Jump',W/2,320,'400 60px '+WF,'#FFFFFF','center',12);
    otext(cx,S.jumps===0&&(S.climbT||0)>6?'Press ← or → to run, then ↑ to jump!':'Run fast to jump higher. Skip floors to combo!',W/2,374,'800 30px Inter, sans-serif','#FFC93C','center',8); }
  sideHud(); }
