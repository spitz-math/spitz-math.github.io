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
  if(p.i>0){ var fx=W-150, lit=S.cp>=p.i, L='#2A1B2E';
    cx.fillStyle=L; cx.fillRect(fx-4,py-80,10,80); cx.fillStyle='#7A5A3A'; cx.fillRect(fx-2,py-78,6,78); cx.fillStyle=L; cx.fillRect(fx-4,py-84,34,6); cx.fillRect(fx+20,py-84,4,12);   // post and arm
    var lx=fx+22, ly=py-72;
    if(lit){ cx.fillStyle='rgba(255,200,90,.22)'; cx.fillRect(lx-26,ly-6,52,46); cx.fillStyle='rgba(255,200,90,.18)'; cx.fillRect(lx-36,ly+2,72,30); }
    cx.fillStyle=L; cx.fillRect(lx-12,ly,24,30); cx.fillRect(lx-8,ly-4,16,4);
    cx.fillStyle=lit?'#FFC23D':'#5C5670'; cx.fillRect(lx-9,ly+4,18,22); cx.fillStyle=lit?'#FFF1C2':'#7D7792'; cx.fillRect(lx-3,ly+8,6,12);
    cx.textAlign='left'; cx.font='400 30px '+DF; cx.lineWidth=6; cx.strokeStyle='rgba(0,0,0,.6)'; cx.strokeText(Math.floor(p.h/20)+' m',22,py-14); cx.fillStyle='#fff'; cx.fillText(Math.floor(p.h/20)+' m',22,py-14); } }

//@@ GEM
var GEMS={};
function gemArt(gold){ var k=gold?'g':'c'; if(GEMS[k]) return GEMS[k];
  var c1=gold?'#FFC82E':'#2DE2E6', c2=gold?'#E09A12':'#1AA9B8', hi=gold?'#FFF3B0':'#C8FFFF', s=gold?5:4;
  return GEMS[k]=pxc(11,13,s,function(g){ for(var y=0;y<13;y++){ var hw=y<6?y:12-y; for(var x=5-hw;x<=5+hw;x++){ var edge=(x===5-hw||x===5+hw||y===0||y===12); g.fillStyle=edge?'#1B1328':(x<5&&y<6)?hi:(x>5||y>6)?c2:c1; g.fillRect(x,y,1,1); } } }); }
function drawGem(gx,gy,gold){ var a=gemArt(gold); cx.imageSmoothingEnabled=false; cx.drawImage(a,Math.round(gx-a.width/2),Math.round(gy-a.height/2)); }
