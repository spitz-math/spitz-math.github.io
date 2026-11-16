/* ================= LANTERN PEAK (rooms): movement =================
   Celeste-inspired (Kody, 2026-11-16): one-screen rooms, tight jumps, wall jumps, an 8-way dash that refills when you land,
   instant retry of the room on a death. Pure functions, shared by the game and the room solver (tests/solve.js).
   A room is 32 x 18 tiles of 30 px (the 960 x 540 view). y points DOWN here (screen space); P.x is the middle of the body,
   P.y the feet. Tiles: '#' rock, '=' ledge you can jump up through, 'c' crumbling block, '^' 'v' '<' '>' spikes (the way they
   point), 'o' ember (refills the dash), 'p' spring (bounces you high, refills the dash), 'b' brittle rock (a dash smashes it),
   'S' start, 'W' Waystone, 'L' summit lantern, '.' air. A room can have wind (R.wind px/s, + blows right) and two dashes (R.maxDash 2). */
(function(root){
var T=30, COLS=32, ROWS=18;
var PH={
  RUN:270, ACC:2600, AIRACC:1800, DEC:3000, AIRDEC:1100,
  G:2200, MAXFALL:640, JV:700, JCUT:0.45, HANG:0.5, HANGV:90,          // full jump about 111 px (3.7 tiles), a tap about 55 px
  COYOTE:0.10, BUFFER:0.12, HW:10, HH:38,
  SLIDE:150, WJX:300, WJV:640, WJLOCK:0.15, WALLGAP:3,                 // wall slide speed; a wall jump kicks you away from the wall
  DASHV:900, DASHT:0.15, DASHEND:0.45,                                 // dash: about 135 px (4.5 tiles) in any of 8 directions
  CRUMBLE:0.5, CRUMBACK:2.2, EMBERBACK:2.5, SPRINGV:1060, UPBOOST:760
};
function tileAt(R,tx,ty){ if(ty<0) return '.'; if(ty>=ROWS) return '.'; if(tx<0||tx>=COLS) return (R.exit==='right'&&tx>=COLS)||(R.exit==='left'&&tx<0)?'.':'#'; return R.map[ty][tx]; }
function solidAt(R,tx,ty,t){ var ch=tileAt(R,tx,ty); if(ch==='#') return true; if(ch==='b') return !(R.br&&R.br[tx+','+ty]); if(ch==='c'){ var k=tx+','+ty, s=R.cr&&R.cr[k]; return !(s&&s.gone!==undefined&&t<s.gone+PH.CRUMBACK); } return false; }
/* does the box [l,r) x [t,b) touch rock? */
function boxHits(R,l,top,r,b,t){ var x0=Math.floor(l/T), x1=Math.floor((r-0.001)/T), y0=Math.floor(top/T), y1=Math.floor((b-0.001)/T);
  for(var y=y0;y<=y1;y++) for(var x=x0;x<=x1;x++) if(solidAt(R,x,y,t)) return {x:x,y:y}; return null; }
function fresh(x,y){ return { x:x, y:y, vx:0, vy:0, onG:false, coy:0, buf:0, dashOk:true, dashN:1, dashT:0, dvx:0, dvy:0, lock:0, lockDir:0, face:1, jumping:false,
  wall:0, dead:false, exit:false, ev:[], airT:0 }; }
function smash(R,l,top,r,b,P){ var hit=false; for(var y=Math.floor(top/T);y<=Math.floor((b-0.001)/T);y++) for(var x=Math.floor(l/T);x<=Math.floor((r-0.001)/T);x++)
  if(tileAt(R,x,y)==='b'&&!(R.br&&R.br[x+','+y])){ R.br=R.br||{}; R.br[x+','+y]=1; hit=true; } if(hit) P.ev.push('smash'); }
function touchCrumble(R,tx,ty,t,P){ if(tileAt(R,tx,ty)!=='c') return; R.cr=R.cr||{}; var k=tx+','+ty, s=R.cr[k]||(R.cr[k]={});
  if(s.gone!==undefined&&t<s.gone+PH.CRUMBACK) return; if(s.gone!==undefined){ delete s.gone; delete s.t; } if(s.t===undefined){ s.t=t; P.ev.push('crack'); } }
function crumbleStep(R,t,P){ if(!R.cr) return; for(var k in R.cr){ var s=R.cr[k]; if(s.t!==undefined&&s.gone===undefined&&t-s.t>=PH.CRUMBLE){ s.gone=t; P.ev.push('crumble'); }
  if(s.gone!==undefined&&t>=s.gone+PH.CRUMBACK){ var xy=k.split(','), x=+xy[0]*T, y=+xy[1]*T;   // comes back only when nobody is inside it
    if(P.x+PH.HW>x&&P.x-PH.HW<x+T&&P.y>y&&P.y-PH.HH<y+T) continue; delete s.gone; delete s.t; } } }

/* one step. inp: { l, r, u, d, jumpHeld, jumpPressed, dashPressed }   R: the room ({ map, exit, cr, orbs }) ; t: room time (already advanced) */
function step(P,inp,dt,R,t){
  P.ev.length=0; if(P.dead||P.exit) return P;
  if(inp.jumpPressed) P.buf=PH.BUFFER; else P.buf=Math.max(0,P.buf-dt);
  P.coy=P.onG?PH.COYOTE:Math.max(0,P.coy-dt);
  P.lock=Math.max(0,P.lock-dt);
  var dir=(inp.r?1:0)-(inp.l?1:0); if(P.lock>0) dir=P.lockDir;
  if(dir) P.face=dir;
  crumbleStep(R,t,P);

  /* dash: 8 ways (arrows aim; no arrow = the way you face). One per air time, back when you land or touch an ember. */
  if(inp.dashPressed&&P.dashOk&&P.dashT<=0&&!R.noDash){ P.dashN=Math.max(0,(P.dashN||1)-1); var ax=(inp.r?1:0)-(inp.l?1:0), ay=(inp.d?1:0)-(inp.u?1:0); if(!ax&&!ay) ax=P.face;
    var n=Math.sqrt(ax*ax+ay*ay); P.dvx=ax/n*PH.DASHV; P.dvy=ay/n*PH.DASHV; P.dashT=PH.DASHT; P.dashOk=P.dashN>0; P.jumping=false; P.lock=0; if(ax) P.face=ax; P.ev.push('dash'); }
  var dashing=P.dashT>0;
  if(dashing){ P.dashT-=dt; P.vx=P.dvx; P.vy=P.dvy;
    if(P.dashT<=0){ P.dashT=0; P.vx=P.dvx*PH.DASHEND; P.vy=P.dvy<0?P.dvy*PH.DASHEND:P.dvy*0.3; } }
  else if(dir){ var acc=P.onG?PH.ACC:PH.AIRACC; if(Math.abs(P.vx)>PH.RUN&&P.vx*dir>0){ /* keep extra speed from a dash */ P.vx-=Math.sign(P.vx)*PH.AIRDEC*dt*0.5; }
    else { P.vx+=dir*acc*dt; if(Math.abs(P.vx)>PH.RUN) P.vx=PH.RUN*Math.sign(P.vx); } }
  else { var dd=(P.onG?PH.DEC:PH.AIRDEC)*dt; P.vx=Math.abs(P.vx)<=dd?0:P.vx-Math.sign(P.vx)*dd; }

  /* touching a wall (for the slide and the wall jump) */
  P.wall=0; if(!P.onG){ if(boxHits(R,P.x-PH.HW-PH.WALLGAP,P.y-PH.HH+4,P.x-PH.HW,P.y-6,t)) P.wall=-1; else if(boxHits(R,P.x+PH.HW,P.y-PH.HH+4,P.x+PH.HW+PH.WALLGAP,P.y-6,t)) P.wall=1; }

  /* jump (buffered, with coyote time) or wall jump; a jump also ends a dash */
  if(P.buf>0){
    if(P.onG||P.coy>0){ P.vy=-PH.JV; P.onG=false; P.coy=0; P.buf=0; P.jumping=true; P.dashT=0; dashing=false; P.ev.push('jump'); }
    else if(P.wall){ P.vy=-PH.WJV; P.vx=-P.wall*PH.WJX; P.lock=PH.WJLOCK; P.lockDir=-P.wall; P.face=-P.wall; P.buf=0; P.jumping=true; P.dashT=0; dashing=false; P.ev.push('walljump'); }
  }
  if(!inp.jumpHeld&&P.jumping&&P.vy<0&&!dashing){ P.vy*=PH.JCUT; P.jumping=false; }
  if(P.vy>=0) P.jumping=false;

  /* gravity, softer at the top of a held jump; slide slowly down a wall you push into */
  if(!dashing&&!P.onG){ var g=PH.G*((inp.jumpHeld&&Math.abs(P.vy)<PH.HANGV)?PH.HANG:1); P.vy+=g*dt;
    var mf=(P.wall&&dir===P.wall&&P.vy>0)?PH.SLIDE:PH.MAXFALL; if(P.vy>mf) P.vy=Math.max(mf,P.vy-4000*dt); }

  /* move across, then up/down, against the rock */
  var wv=R.wind?R.wind*(P.onG?0.6:1):0; if(dashing) wv=0;
  if(dashing) smash(R,P.x+P.vx*dt-PH.HW-2,P.y+P.vy*dt-PH.HH-2,P.x+P.vx*dt+PH.HW+2,P.y+P.vy*dt+2,P);
  var nx=P.x+(P.vx+wv)*dt, h=boxHits(R,nx-PH.HW,P.y-PH.HH,nx+PH.HW,P.y,t);
  if(h){ if(P.vx+wv>0) nx=h.x*T-PH.HW; else if(P.vx+wv<0) nx=(h.x+1)*T+PH.HW; touchCrumble(R,h.x,h.y,t,P); if(!dashing||Math.abs(P.dvy)<1) P.vx=0; else P.vx=0; }
  P.x=nx;
  var ny=P.y+P.vy*dt, wasG=P.onG; P.onG=false;
  if(P.vy>=0){ var hb=boxHits(R,P.x-PH.HW,ny-PH.HH,P.x+PH.HW,ny,t);
    /* jump-through ledges: land only from above */
    var lt=null, ly0=Math.floor(P.y/T), ly1=Math.floor(ny/T);
    for(var yy=ly0;yy<=ly1&&!lt;yy++){ if(P.y<=yy*T+0.01&&ny>=yy*T){ for(var xx=Math.floor((P.x-PH.HW)/T);xx<=Math.floor((P.x+PH.HW-0.001)/T);xx++) if(tileAt(R,xx,yy)==='='){ lt={y:yy}; break; } } }
    if(hb&&(!lt||hb.y<=lt.y)){ ny=hb.y*T; P.onG=true; touchCrumble(R,hb.x,hb.y,t,P); var x0=Math.floor((P.x-PH.HW)/T), x1=Math.floor((P.x+PH.HW-0.001)/T); for(var cx=x0;cx<=x1;cx++) touchCrumble(R,cx,hb.y,t,P); }
    else if(lt){ ny=lt.y*T; P.onG=true; }
    if(P.onG){ if(!wasG&&P.vy>200) P.ev.push('land'); P.vy=dashing&&P.dvy>0?0:P.vy; if(!dashing) P.vy=0; } }
  else { var hu=boxHits(R,P.x-PH.HW,ny-PH.HH,P.x+PH.HW,ny,t);
    if(hu){ /* clip a corner by a few px: slide around it instead of bonking */
      var cl=null; for(var s=1;s<=8&&!cl;s++){ if(!boxHits(R,P.x-PH.HW+s,ny-PH.HH,P.x+PH.HW+s,ny,t)) cl=s; else if(!boxHits(R,P.x-PH.HW-s,ny-PH.HH,P.x+PH.HW-s,ny,t)) cl=-s; }
      if(cl&&!dashing) P.x+=cl; else { ny=(hu.y+1)*T+PH.HH; P.vy=0; if(dashing){ P.dvy=0; } } } }
  P.y=ny;
  if(P.onG){ P.airT=0; if(!dashing){ P.dashOk=true; P.dashN=R.maxDash||1; } } else P.airT+=dt;
  /* springs: land on one (or touch it going down) and it throws you high, dash back */
  if(P.vy>=0||P.onG){ var spx=Math.floor(P.x/T), spy=Math.floor((P.y-1)/T); for(var dx2=-1;dx2<=1;dx2++){ var qx=Math.floor((P.x+dx2*(PH.HW-2))/T);
    if(tileAt(R,qx,spy)==='p'&&P.y>=spy*T+T-16){ P.vy=-PH.SPRINGV; P.onG=false; P.coy=0; P.jumping=false; P.dashT=0; P.dashOk=true; P.dashN=R.maxDash||1; P.y=spy*T+T-16; P.ev.push('spring'); break; } } }

  /* spikes: the sharp part only (a little forgiving at the edges) */
  var L=P.x-PH.HW+3, Rr=P.x+PH.HW-3, Tp=P.y-PH.HH+4, B=P.y-1;
  for(var sy=Math.floor(Tp/T);sy<=Math.floor(B/T);sy++) for(var sx=Math.floor(L/T);sx<=Math.floor(Rr/T);sx++){ var ch=tileAt(R,sx,sy), bx=sx*T, by=sy*T, k=null;
    if(ch==='^') k=[bx+3,by+14,bx+27,by+30]; else if(ch==='v') k=[bx+3,by,bx+27,by+16]; else if(ch==='<') k=[bx+14,by+3,bx+30,by+27]; else if(ch==='>') k=[bx,by+3,bx+16,by+27];
    if(k&&Rr>k[0]&&L<k[2]&&B>k[1]&&Tp<k[3]){ P.dead=true; P.ev.push('die'); return P; } }
  /* embers refill the dash */
  if(R.orbs) for(var i=0;i<R.orbs.length;i++){ var o=R.orbs[i]; if(o.gone!==undefined&&t<o.gone+PH.EMBERBACK) continue; if(o.gone!==undefined) delete o.gone;
    if((P.dashN||0)<(R.maxDash||1)&&Math.abs(o.x-P.x)<32&&Math.abs(o.y-(P.y-19))<40){ P.dashOk=true; P.dashN=R.maxDash||1; o.gone=t; P.ev.push('ember'); } }
  /* fell out of the room, or left through its exit */
  if(P.y-PH.HH>ROWS*T+10){ P.dead=true; P.ev.push('die'); return P; }
  if((R.exit==='up'&&P.y<4)||(R.exit==='right'&&P.x>COLS*T+4)||(R.exit==='left'&&P.x<-4)){ P.exit=true; P.ev.push('exit'); }
  return P;
}
/* a room from its 18 text rows: the start, the embers, the Waystone or lantern */
function room(def){ var R={ name:def.name, map:def.rows.map(function(r){ return r.split(''); }), exit:def.exit||'up', orbs:[], cr:{}, sx:0, sy:0, hint:def.hint, keys:def.keys, way:null, lantern:null, ch:def.ch, wind:def.wind||0, give:def.give||null, br:{} };
  if(R.map.length!==ROWS) throw new Error(def.name+': '+R.map.length+' rows');
  R.map.forEach(function(row,y){ if(row.length!==COLS) throw new Error(def.name+' row '+y+': '+row.length+' cols');
    row.forEach(function(ch,x){ if(ch==='S'){ R.sx=x*T+T/2; R.sy=(y+1)*T; row[x]='.'; } else if(ch==='o'){ R.orbs.push({x:x*T+T/2,y:y*T+T/2}); row[x]='.'; }
      else if(ch==='W'){ R.way={x:x*T+T/2,y:(y+1)*T}; row[x]='.'; } else if(ch==='L'){ R.lantern={x:x*T+T/2,y:(y+1)*T}; row[x]='.'; } }); });
  return R; }
function reset(R){ R.cr={}; R.br={}; R.orbs.forEach(function(o){ delete o.gone; }); }
/* the climber leaves through the exit and keeps going in the next room (the game pans the view meanwhile) */
function carry(P,dir){ var Q=JSON.parse(JSON.stringify(P)); Q.exit=false; Q.ev=[]; Q.lock=0;
  if(dir==='right'){ Q.x=PH.HW+2; } else if(dir==='up'){ Q.y+=ROWS*T; Q.vy=Math.min(Q.vy,-PH.UPBOOST); Q.jumping=false; if(Q.dashT>0&&Q.dvy<0) Q.dvy=Math.min(Q.dvy,-PH.UPBOOST); }
  return Q; }
root.LPR={ T:T, COLS:COLS, ROWS:ROWS, PH:PH, step:step, fresh:fresh, room:room, reset:reset, carry:carry, tileAt:tileAt, solidAt:solidAt };
})(typeof window!=='undefined'?window:globalThis);
