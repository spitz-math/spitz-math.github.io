
/* ================= DRAWING =================
   Everything that does not change is drawn once into its own small canvas (sprites, glows, labels, the Mothership's hull, the backdrop).
   No shadowBlur and no gradients inside render(): a slow Chromebook only copies pictures and fills squares. */
/* pixel art: each row is the left half plus the centre column, mirrored to 17 wide. sprite() adds a dark one-cell outline */
var ART={
  bee:['.....a...','......a..','......yyy','.....yyyy','ww...yeyy','www.kkkkk','wwwwyyyyy','.wwwkkkkk','..wwyyyyy','...w.kkkk','.....yyyy','......yyy','........k'],
  fly:['....a....','.....a.rr','......rrr','ww...rrrr','www..rerr','wpww.rrrr','wwwwwrrrr','.wwwwrrrr','..www.rrr','...w..rrr','.......rr','........r'],
  cmd:['h........','.h....ggg','..h.ggggg','...gggggg','..ggooggg','.gggooggg','ggggggggg','ggggggggg','gg.gggkkk','g..gggggg','c...gg.gg','c..gg...g','.c.g.....'],
  bomber:['......sss','....sssss','..sssswws','.ssssssss','sssssssss','spsspsspp','sssssssss','.dddddddd','..d.dd.dd','.....dd.d','......d..'],
  ship:['........W','........W','.......WW','.......WC','......WWC','......WWW','R.....WWW','R....WWWW','W...WWWWW','W..WWWRWW','W.WWWWRWW','WWWWWWRWW','WWW.WWWWW','WW...R.WW','W....R..W']
};
var PAL={ bee:{y:'#FFD23D',k:'#7A5200',w:'#7FE7FF',e:'#0B1020',a:'#FFE9A0'}, fly:{r:'#FF4F6D',w:'#B9A6FF',p:'#FFFFFF',e:'#FFFFFF',a:'#FF9FB0'},
  cmd:{g:'#4ADE80',o:'#FF9A2E',k:'#0B3B1E',h:'#D5FBE0',c:'#D5FBE0'}, cmd1:{g:'#8B7BFF',o:'#3DE0FF',k:'#1E1650',h:'#D9D3FF',c:'#D9D3FF'},
  bomber:{s:'#B58CFF',w:'#3DE0FF',p:'#FFF04D',d:'#5A3FA0'}, bomber1:{s:'#FF9A2E',w:'#FFFFFF',p:'#FFF04D',d:'#A0541A'},
  gold:{y:'#FFC82E',k:'#8A6400',w:'#FFF3B0',e:'#3A2A00',a:'#FFF3B0',r:'#FFC82E',p:'#8A6400'},
  ship:{W:'#F3F5F9',R:'#FF4F6D',C:'#3DE0FF'} };
var SPR={}, GLOW={}, bg=document.createElement('canvas'), MOM=document.createElement('canvas'), CAPS={};
function sprite(rows,pal,px,flap){ var w=19, h=rows.length+2, c=document.createElement('canvas'), g, grid=[], x, y; c.width=w*px; c.height=h*px; g=c.getContext('2d');
  for(y=0;y<h;y++){ grid.push([]); for(x=0;x<w;x++) grid[y].push(''); }
  rows.forEach(function(r,ry){ for(x=0;x<17;x++){ var ch=r.charAt(x<9?x:16-x), yy=ry+1; if(flap&&ch==='w') yy++; if(pal[ch]&&yy<h) grid[yy][x+1]=pal[ch]; } });
  for(y=0;y<h;y++) for(x=0;x<w;x++){ var col=grid[y][x]; if(!col&&((y>0&&grid[y-1][x])||(y<h-1&&grid[y+1][x])||(x>0&&grid[y][x-1])||(x<w-1&&grid[y][x+1]))) col='O';
    if(col){ g.fillStyle=col==='O'?'#05070F':col; g.fillRect(x*px,y*px,px,px); } }
  return c; }
function glow(col,size){ var c=document.createElement('canvas'); c.width=c.height=size; var g=c.getContext('2d'), r=g.createRadialGradient(size/2,size/2,0,size/2,size/2,size/2);
  r.addColorStop(0,col); r.addColorStop(0.35,col); r.addColorStop(1,'rgba(0,0,0,0)'); g.globalAlpha=0.9; g.fillStyle=r; g.fillRect(0,0,size,size); return c; }
function makeArt(){ ['bee','fly'].forEach(function(t){ SPR[t]=[sprite(ART[t],PAL[t],5),sprite(ART[t],PAL[t],5,1)]; SPR[t+'G']=[sprite(ART[t],PAL.gold,5),sprite(ART[t],PAL.gold,5,1)]; });
  SPR.cmd=[sprite(ART.cmd,PAL.cmd,5)]; SPR.cmd1=[sprite(ART.cmd,PAL.cmd1,5)]; SPR.bomber=[sprite(ART.bomber,PAL.bomber,6)]; SPR.bomber1=[sprite(ART.bomber,PAL.bomber1,6)]; SPR.ship=sprite(ART.ship,PAL.ship,5);
  SPR.drone=sprite(ART.ship,{W:'#A6FF4D',R:'#F3F5F9',C:'#0B1020'},2);
  [['cyan','#3DE0FF'],['red','#FF4F6D'],['gold','#FFC82E'],['white','#FFFFFF'],['orange','#FF9A2E'],['lime','#A6FF4D']].forEach(function(p){ GLOW[p[0]]=glow(p[1],64); });
  bg.width=cv.width; bg.height=cv.height; var g=bg.getContext('2d'); g.scale(RS,RS); var l=g.createLinearGradient(0,0,0,H); l.addColorStop(0,'#070A1C'); l.addColorStop(1,'#02030A'); g.fillStyle=l; g.fillRect(0,0,W,H);
  [[300,240,460,'rgba(61,224,255,.09)'],[1250,520,520,'rgba(255,79,109,.08)'],[760,820,420,'rgba(139,123,255,.09)'],[1450,120,300,'rgba(166,255,77,.04)']].forEach(function(n){ var r=g.createRadialGradient(n[0],n[1],0,n[0],n[1],n[2]); r.addColorStop(0,n[3]); r.addColorStop(1,'rgba(0,0,0,0)'); g.fillStyle=r; g.fillRect(0,0,W,H); });
  for(var i=0;i<130;i++){ g.globalAlpha=0.15+Math.random()*0.3; g.fillStyle='#BFD9FF'; g.fillRect(Math.random()*W,Math.random()*H,2,2); } g.globalAlpha=1;
  stars=[]; [[40,22,2,0.45],[30,55,3,0.65],[20,120,3,0.9]].forEach(function(ly,k){ for(var j=0;j<ly[0];j++) stars.push({x:Math.random()*W,y:Math.random()*H,v:ly[1],s:ly[2],a:ly[3],k:k,c:['#FFFFFF','#BFD9FF','#FFE9A0','#9FB4FF'][j%4]}); });
  // the Mothership's hull
  MOM.width=700; MOM.height=280; g=MOM.getContext('2d'); var m=350;
  g.fillStyle='#05070F'; g.beginPath(); g.ellipse(m,150,346,96,0,0,6.283); g.fill();
  g.fillStyle='#2A1B5E'; g.beginPath(); g.ellipse(m,150,338,88,0,0,6.283); g.fill();
  g.fillStyle='#4B2FA8'; g.beginPath(); g.ellipse(m,132,312,70,0,0,6.283); g.fill();
  g.fillStyle='#6D3FC4'; g.beginPath(); g.ellipse(m,112,250,50,0,0,6.283); g.fill();
  g.fillStyle='#8E5BE8'; g.beginPath(); g.ellipse(m,96,170,30,0,0,6.283); g.fill();
  g.fillStyle='#B9A6FF'; g.beginPath(); g.ellipse(m,60,90,44,0,Math.PI,0); g.fill(); g.fillStyle='#E9E2FF'; g.beginPath(); g.ellipse(m-24,46,30,12,-0.3,0,6.283); g.fill();
  g.fillStyle='#1A1240'; g.fillRect(m-290,172,580,14);
  for(var q=-10;q<=10;q++){ g.fillStyle=q%2?'#3DE0FF':'#FFF04D'; g.fillRect(m+q*27-5,160,10,10); }
  g.fillStyle='#8B7BFF'; g.fillRect(m-336,140,30,22); g.fillRect(m+306,140,30,22);
  // power-up capsules
  [['N','#FF9A2E'],['O','#A6FF4D'],['S','#3DE0FF']].forEach(function(p){ var c=document.createElement('canvas'); c.width=c.height=72; var k=c.getContext('2d'); k.fillStyle='#05070F'; k.beginPath(); k.arc(36,36,32,0,6.283); k.fill(); k.lineWidth=6; k.strokeStyle=p[1]; k.beginPath(); k.arc(36,36,27,0,6.283); k.stroke();
    k.fillStyle=p[1]; k.font='400 30px '+DF; k.textAlign='center'; k.textBaseline='middle'; k.fillText(p[0],36,38); CAPS[p[0]]=c; }); }

/* text is drawn once into a small canvas and then copied */
var LAB={}, labN=0;
function lab(txt,size,fill,stroke){ var key=txt+'|'+size+'|'+fill, c=LAB[key]; if(c) return c; if(labN>140){ LAB={}; labN=0; } labN++;
  c=document.createElement('canvas'); var g=c.getContext('2d'), f='400 '+size+'px '+DF, sw=stroke==null?Math.max(4,size*0.16):stroke; g.font=f; var w=Math.ceil(g.measureText(txt).width+sw*2+6), h=Math.ceil(size*1.3+sw*2);
  c.width=Math.ceil(w*RS); c.height=Math.ceil(h*RS); c.lw=w; c.lh=h; g=c.getContext('2d'); g.scale(RS,RS); g.font=f; g.textAlign='center'; g.textBaseline='middle'; g.lineJoin='round';
  if(sw){ g.lineWidth=sw; g.strokeStyle='#000'; g.strokeText(txt,w/2,h/2); } g.fillStyle=fill; g.fillText(txt,w/2,h/2); LAB[key]=c; return c; }
function put(c,x,y,k,al){ k=k||1; if(al!=null) cx.globalAlpha=al; cx.drawImage(c,x-c.lw*k/2,y-c.lh*k/2,c.lw*k,c.lh*k); if(al!=null) cx.globalAlpha=1; }
function spr(s,x,y){ cx.drawImage(s,Math.round(x-s.width/2),Math.round(y-s.height/2)); }
function stamp(name,x,y,size,al){ cx.globalAlpha=al==null?0.7:al; cx.drawImage(GLOW[name],x-size/2,y-size/2,size,size); cx.globalAlpha=1; }

function drawEnemy(a){ var fr=Math.floor(formT*(a.state==='form'?2.4:7)+a.col)%2, key=a.type, x=a.x, y=a.y;
  if(a.type==='cmd') key=a.hp<2?'cmd1':'cmd'; else if(a.type==='bomber') key=a.hp<3?'bomber1':'bomber'; else if(a.gold) key+='G';
  var s=SPR[key][fr%SPR[key].length];
  if(a.state==='tele'){ cx.globalCompositeOperation='lighter'; stamp('white',x,y,130,0.75); cx.globalCompositeOperation='source-over'; if(!REDUCE){ x+=Math.sin(gt*70)*3; } }
  else if(a.gold){ cx.globalCompositeOperation='lighter'; stamp('gold',x,y,110,0.4); cx.globalCompositeOperation='source-over'; }
  spr(s,x,y);
  if(gt-a.flash<0.07){ cx.globalCompositeOperation='lighter'; stamp('white',x,y,100,0.9); cx.globalCompositeOperation='source-over'; } }
function drawBoss(){ var b=boss, B=S.bossHp, fl=gt-b.flash<0.05;
  if(b.dead){ var k=(gt-b.deadAt)/2.6; cx.globalAlpha=Math.max(0,1-k*1.1); cx.drawImage(MOM,b.x-350,b.y-130+k*60); cx.globalAlpha=1; return; }
  if(!B) return;
  cx.drawImage(MOM,Math.round(b.x-350),Math.round(b.y-130));
  ['l','r'].forEach(function(p){ var m=MOMP[p], x=b.x+m[0], y=b.y+m[1]; if(B[p]<=0){ cx.fillStyle='#120C2E'; cx.beginPath(); cx.arc(x,y,30,0,6.283); cx.fill(); return; }
    cx.fillStyle='#05070F'; cx.beginPath(); cx.arc(x,y,42,0,6.283); cx.fill(); cx.fillStyle=fl?'#FFFFFF':'#FF9A2E'; cx.beginPath(); cx.arc(x,y,36,0,6.283); cx.fill(); cx.fillStyle='#2A1B5E'; cx.fillRect(x-8,y+8,16,38);
    cx.fillStyle='#1B2338'; cx.fillRect(x-36,y-58,72,8); cx.fillStyle='#FF9A2E'; cx.fillRect(x-36,y-58,72*B[p]/B.mt,8); });
  var open=momOpen(), cy=b.y+MOMP.c[1]; cx.fillStyle='#05070F'; cx.beginPath(); cx.arc(b.x,cy,56,0,6.283); cx.fill();
  cx.fillStyle=open?(fl?'#FFFFFF':'#FF4F6D'):'#2C6C8C'; cx.beginPath(); cx.arc(b.x,cy,open?48:50,0,6.283); cx.fill();
  if(open){ cx.globalCompositeOperation='lighter'; stamp('red',b.x,cy,150,0.5); cx.globalCompositeOperation='source-over'; cx.fillStyle='#FFF04D'; cx.beginPath(); cx.arc(b.x,cy,18+4*Math.sin(gt*8),0,6.283); cx.fill(); }
  else { cx.strokeStyle='#7FE7FF'; cx.lineWidth=5; cx.beginPath(); cx.moveTo(b.x-30,cy); cx.lineTo(b.x+30,cy); cx.moveTo(b.x,cy-30); cx.lineTo(b.x,cy+30); cx.stroke(); }
  // the sweeping beam: a thin line warns for a second, then the beam fires straight down from the core
  if(b.beam===1){ cx.fillStyle='rgba(255,79,109,.55)'; for(var y=cy+60;y<H;y+=34) cx.fillRect(b.x-3,y,6,20); put(lab('BEAM!',34,'#FF4F6D'),b.x,cy+110); }
  else if(b.beam===2){ cx.fillStyle='rgba(255,79,109,.45)'; cx.fillRect(b.x-62,cy+40,124,H); cx.fillStyle='#FFD9E0'; cx.fillRect(b.x-34,cy+40,68,H); }
  if(b.enter>=1){ var tot=B.mt*2+B.mc, left=B.l+B.r+B.c, bw=620, x0=W/2-bw/2; cx.fillStyle='#05070F'; cx.fillRect(x0-4,112,bw+8,22); cx.fillStyle='#1B2338'; cx.fillRect(x0,116,bw,14); cx.fillStyle=open?'#FF4F6D':'#C77DFF'; cx.fillRect(x0,116,bw*left/tot,14); put(lab('MOTHERSHIP',24,'#EAF6FF'),W/2,146); } }

var infoKey='', infoC=null;
function render(){ var play=S.started&&!S.over, i; cx.setTransform(RS,0,0,RS,0,0);
  if(play&&!REDUCE&&trauma>0.02){ var sk=trauma*trauma*14; cx.translate((Math.random()-0.5)*2*sk,(Math.random()-0.5)*2*sk); }
  cx.drawImage(bg,0,0,W,H);
  for(i=0;i<stars.length;i++){ var st=stars[i]; cx.globalAlpha=st.a; cx.fillStyle=st.c; cx.fillRect(st.x|0,st.y|0,st.s,st.k===2&&!REDUCE?9:st.s); } cx.globalAlpha=1;
  if(!S.started) return;
  if(boss) drawBoss();
  for(i=0;i<enemies.length;i++){ var a=enemies[i]; if(!a.dead&&!(a.state==='in'&&a.t<0)) drawEnemy(a); }
  if(rush&&!rush.done){ var fr=Math.floor(formT*7)%2; rush.bugs.forEach(function(b){ if(!b.dead&&b.on) spr(SPR[b.type][fr],b.x,b.y); }); }
  for(i=0;i<caps.length;i++){ var c=caps[i]; cx.drawImage(CAPS[c.k],c.x-36,c.y-36+Math.sin((gt-c.t0)*6)*3); }
  // beams and missiles
  cx.fillStyle='rgba(61,224,255,.35)'; for(i=0;i<beams.length;i++){ var b=beams[i]; cx.fillRect(b.x-(b.small?5:7),b.y-4,b.small?10:14,b.small?26:40); }
  cx.fillStyle='#E9FCFF'; for(i=0;i<beams.length;i++){ b=beams[i]; cx.fillRect(b.x-(b.small?2:3),b.y,b.small?4:6,b.small?20:32); }
  cx.globalCompositeOperation='lighter';
  for(i=0;i<missiles.length;i++) stamp('orange',missiles[i].x,missiles[i].y,56,0.8);
  for(i=0;i<shots.length;i++) stamp('red',shots[i].x,shots[i].y,58,0.75);
  for(i=0;i<flashes.length;i++){ var fl=flashes[i]; stamp(fl.c==='#FFC82E'||fl.c==='#FFD23D'||fl.c==='#FFF04D'?'gold':fl.c==='#FF4F6D'?'red':fl.c==='#4ADE80'?'lime':'white',fl.x,fl.y,150,0.8*(1-(gt-fl.t0)/0.12)); }
  cx.globalCompositeOperation='source-over';
  for(i=0;i<shots.length;i++){ var s=shots[i]; cx.fillStyle='#FF4F6D'; cx.fillRect(s.x-8,s.y-8,16,16); cx.fillStyle='#FFE9A0'; cx.fillRect(s.x-4,s.y-4,8,8); }
  for(i=0;i<missiles.length;i++){ cx.fillStyle='#FFF04D'; cx.fillRect(missiles[i].x-5,missiles[i].y-5,10,10); }
  for(i=0;i<256;i++){ var p=SPK[i]; if(!p.on) continue; var k=1-p.life/p.max, sz=Math.max(2,p.s*k); cx.globalAlpha=Math.min(1,k*1.6); cx.fillStyle=p.c; cx.fillRect(p.x-sz/2,p.y-sz/2,sz,sz); } cx.globalAlpha=1;
  for(i=0;i<rings.length;i++){ var o=rings[i], u=(gt-o.t0)/o.d; cx.globalAlpha=Math.max(0,1-u); cx.strokeStyle=o.c; cx.lineWidth=10*(1-u)+2; cx.beginPath(); cx.arc(o.x,o.y,o.r*(1-(1-u)*(1-u)),0,6.283); cx.stroke(); } cx.globalAlpha=1;
  for(i=0;i<bolts.length;i++){ var bo=bolts[i], ub=(gt-bo.t0)/0.3; cx.globalAlpha=1-ub; cx.strokeStyle='#A6FF4D'; cx.lineWidth=18; cx.beginPath(); cx.moveTo(bo.x,bo.y); cx.lineTo(bo.tx,bo.ty); cx.stroke(); cx.strokeStyle='#FFFFFF'; cx.lineWidth=6; cx.stroke(); } cx.globalAlpha=1;
  if(play&&gt-novaAt<0.08&&!REDUCE){ cx.fillStyle='rgba(255,255,255,.2)'; cx.fillRect(0,0,W,H); }
  drawFx(true);
  // the ship: engine glow, a ghost trail while dashing, the shield ring, the dash meter underneath
  if(play){ var blink=gt<ship.safeUntil&&gt>=resumeAt&&Math.floor(gt*12)%2===0, dashing=gt-ship.dashAt<CFG.dashTime;
    if(dashing&&!REDUCE){ for(i=1;i<=3;i++){ cx.globalAlpha=0.3-i*0.07; spr(SPR.ship,ship.x-(ship.dashTo>ship.dashFrom?1:-1)*i*34,SHIP_Y); } cx.globalAlpha=1; }
    cx.globalCompositeOperation='lighter'; stamp(overdrive()?'lime':'orange',ship.x-18,SHIP_Y+44,36+(Math.floor(gt*20)%2)*10,0.8); stamp(overdrive()?'lime':'orange',ship.x+18,SHIP_Y+44,36+(Math.floor(gt*20)%2)*10,0.8);
    if(gt<ship.dashSafe) stamp('cyan',ship.x,SHIP_Y,170,0.5); cx.globalCompositeOperation='source-over';
    cx.globalAlpha=blink?0.3:1; spr(SPR.ship,ship.x,SHIP_Y); cx.globalAlpha=1;
    droneXs().forEach(function(dx,j){ spr(SPR.drone,dx,SHIP_Y+(j===2?-58:14)); });
    cx.fillStyle='#FFFFFF'; cx.fillRect(ship.x-4,SHIP_Y-4,8,8);                                            // the core: the only part a shot can hit
    if(ship.shield){ cx.lineWidth=4; cx.strokeStyle='#4ADE80'; cx.beginPath(); cx.arc(ship.x,SHIP_Y,62,0,6.283); cx.stroke(); }
    if(frozen||gt<resumeAt){ cx.lineWidth=5; cx.strokeStyle='#3DE0FF'; cx.beginPath(); cx.arc(ship.x,SHIP_Y,74,0,6.283); cx.stroke(); }
    var dk=clamp((gt-ship.dashAt)/CFG.dashCool,0,1); cx.fillStyle='#1B2338'; cx.fillRect(ship.x-34,SHIP_Y+62,68,7); cx.fillStyle=dk>=1?'#3DE0FF':'#5B6B88'; cx.fillRect(ship.x-34,SHIP_Y+62,68*dk,7); }
  drawFx(false);
  cx.setTransform(RS,0,0,RS,0,0);
  // score pop-ups: drawn once each, with a small punch as they appear
  for(i=0;i<pops.length;i++){ var pp=pops[i], pu=(gt-pp.t0)/pp.d, al=Math.max(0,Math.min(1,(1-pu)*2.5)), sc=REDUCE?1:1+0.4*Math.max(0,1-(gt-pp.t0)/0.12), y=pp.y-pu*46;
    put(lab(pp.txt,42,'#FFFFFF'),pp.x,y,sc,al); if(pp.lab) put(lab(pp.lab,26,'#FFC82E'),pp.x,y+40,1,al); }
  if(!play) return;
  if(gt-bannerT.t0<2.2){ var bu=(gt-bannerT.t0)/2.2, ba=Math.min(1,(1-bu)*3); put(lab(bannerT.big,84,bannerT.col,12),W/2,400,1,ba); if(bannerT.small) put(lab(bannerT.small,36,'#FFF04D',7),W/2,474,1,ba); }
  // chain, fuel, tips
  if(S.chain>=2){ var cm=chainMult(); put(lab('CHAIN '+S.chain+(cm>1?'  ×'+cm:''),30,cm>1?'#FF9A2E':'#9DB4D2'),150,132); if(chainUntil){ var ck=clamp((chainUntil-gt)/chainSecs(),0,1); cx.fillStyle='#1B2338'; cx.fillRect(40,154,220,8); cx.fillStyle='#FF9A2E'; cx.fillRect(40,154,220*ck,8); } }
  var fw=460, fx0=W/2-fw/2+40, fy=H-46, low=S.fuel<3, fk=clamp(S.fuel/tankMax(),0,1);
  cx.fillStyle='#05070F'; cx.fillRect(fx0-5,fy-5,fw+10,32); cx.fillStyle='#1B2338'; cx.fillRect(fx0,fy,fw,22); cx.fillStyle=low?'#FFB020':'#3DE0FF'; cx.fillRect(fx0,fy,fw*fk,22);
  cx.fillStyle='#05070F'; for(i=1;i<CFG.tank;i++) cx.fillRect(fx0+fw*i/CFG.tank-2,fy,4,22);
  put(lab('FUEL',26,low?'#FFB020':'#9DB4D2'),fx0-64,fy+11); put(lab('ENTER = REFUEL',24,low?'#FFB020':'#6F84A6'),fx0+fw+120,fy+11);
  if(overdrive()) put(lab('OVERDRIVE '+Math.ceil(ship.over-gt),28,'#A6FF4D'),W/2+40,fy-30);
  if(!frozen&&gt>=resumeAt){ var tip=!(S.tut&1)?'← →  MOVE':!(S.tut&2)?'HOLD SPACE TO FIRE':(!(S.tut&4)&&gt-tipDash<5)?'SHIFT = DASH':''; if(tip) put(lab(tip,40,'#FFFFFF'),W/2,H-190); }
  else if(gt<resumeAt&&!frozen) put(lab('GO!',70,'#A6FF4D',10),W/2,520); }

/* the little pictures on the upgrade cards */
function drawIcon(g,id){ var c=CARDS.filter(function(x){ return x.id===id; })[0].col; g.clearRect(0,0,120,120); g.strokeStyle=c; g.fillStyle=c; g.lineWidth=8; g.lineCap='round'; g.lineJoin='round';
  function line(a,b,c2,d){ g.beginPath(); g.moveTo(a,b); g.lineTo(c2,d); g.stroke(); } function dot(x,y,r,f){ g.beginPath(); g.arc(x,y,r,0,6.283); if(f) g.fill(); else g.stroke(); }
  if(id==='gun'){ line(36,96,36,24); line(60,96,60,14); line(84,96,84,24); }
  else if(id==='pierce'){ dot(60,40,16); dot(60,84,16); g.strokeStyle='#fff'; line(60,112,60,8); }
  else if(id==='rapid'){ [28,56,84].forEach(function(y){ g.beginPath(); g.moveTo(30,y+16); g.lineTo(60,y-8); g.lineTo(90,y+16); g.stroke(); }); }
  else if(id==='drone'){ [[32,70],[88,70],[60,34]].forEach(function(p){ g.beginPath(); g.moveTo(p[0],p[1]-18); g.lineTo(p[0]+16,p[1]+14); g.lineTo(p[0]-16,p[1]+14); g.closePath(); g.fill(); }); }
  else if(id==='missile'){ g.beginPath(); g.moveTo(84,18); g.lineTo(96,48); g.lineTo(52,92); g.lineTo(28,68); g.closePath(); g.fill(); g.fillStyle='#FFF04D'; dot(30,90,12,1); }
  else if(id==='nova'){ dot(60,60,14,1); dot(60,60,34); for(var i=0;i<8;i++){ var a=i*0.785; line(60+Math.cos(a)*44,60+Math.sin(a)*44,60+Math.cos(a)*52,60+Math.sin(a)*52); } }
  else if(id==='shield'){ g.beginPath(); g.moveTo(60,14); g.lineTo(98,30); g.lineTo(92,74); g.lineTo(60,106); g.lineTo(28,74); g.lineTo(22,30); g.closePath(); g.stroke(); }
  else if(id==='magnet'){ g.lineWidth=18; g.beginPath(); g.arc(60,58,30,0,Math.PI); g.stroke(); line(30,58,30,24); line(90,58,90,24); }
  else if(id==='gold'){ g.beginPath(); g.moveTo(60,12); g.lineTo(102,60); g.lineTo(60,108); g.lineTo(18,60); g.closePath(); g.fill(); g.fillStyle='#8A6400'; dot(60,60,12,1); }
  else { dot(42,60,22); dot(78,60,22); } }
