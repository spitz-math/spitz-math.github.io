/* ================= LANTERN PEAK: movement =================
   Pure functions, shared by the game and the route checker (tests/routes.js), so the checker proves routes with the exact same physics.
   World units are px of the 960x540 view; y points UP; the hero's feet are at P.y and P.x is the middle of the body. */
(function(root){
var PH={
  W:960,                       // the climb is one screen wide: no sideways camera, every route choice is visible
  RUN:330, ACC:2700, TURN:1.7, DEC:3600, AIRACC:2100, AIRDEC:1000,
  G:2300, GFALL:2900, GHANG:1500, HANGV:120,   // softer gravity near the top of a held jump: easier to aim the landing
  JV:830, JCUT:0.45, DJV:760, MAXFALL:980,
  COYOTE:0.10, BUFFER:0.14, HW:13, HH:44, DROP:0.24, CORNER:12
};

/* where a platform is at world time t (moving lifts ease back and forth) */
function platAt(p,t){ if(!p.per) return p; var k=0.5-0.5*Math.cos(2*Math.PI*((t/p.per)+(p.ph||0)));
  return { x:p.x+(p.mx||0)*k, y:p.y+(p.my||0)*k }; }
function alive(p,t){ return !(p.goneAt!==undefined&&t<p.goneAt+(p.back||3)); }
function overX(P,x,w,inset){ return P.x+PH.HW-inset>x&&P.x-PH.HW+inset<x+w; }

function fresh(x,y){ return { x:x, y:y, vx:0, vy:0, on:null, face:1, coy:0, buf:0, dropT:0, djUsed:false, jumped:false, cut:false, ev:[], airT:0, fallFrom:y }; }

/* one step. inp: { l, r, jumpHeld, jumpPressed, downPressed }   W: { plats, solids, hazards, t (world time, already advanced), dj (Cloud Hop unlocked) } */
function step(P,inp,dt,W){
  var t=W.t, t0=t-dt;
  P.ev.length=0;
  if(inp.jumpPressed) P.buf=PH.BUFFER; else P.buf=Math.max(0,P.buf-dt);
  P.coy=P.on?PH.COYOTE:Math.max(0,P.coy-dt);
  P.dropT=Math.max(0,P.dropT-dt);

  /* run: quick to start, quick to stop, a little extra grip when turning around */
  var dir=(inp.r?1:0)-(inp.l?1:0);
  if(dir){ var acc=P.on?PH.ACC:PH.AIRACC; if(dir*P.vx<0) acc*=PH.TURN; P.vx+=dir*acc*dt; if(Math.abs(P.vx)>PH.RUN) P.vx=PH.RUN*(P.vx>0?1:-1); P.face=dir; }
  else { var d=(P.on?PH.DEC:PH.AIRDEC)*dt; P.vx=Math.abs(P.vx)<=d?0:P.vx-(P.vx>0?d:-d); }

  /* ride a moving lift */
  if(P.on&&P.on.per){ var a=platAt(P.on,t0), b=platAt(P.on,t); P.x+=b.x-a.x; P.y+=b.y-a.y; }
  /* crumbling plank: shakes, then drops */
  if(P.on&&P.on.kind==='crumble'){ if(P.on.tT===undefined) { P.on.tT=t; P.ev.push('crack'); } if(t-P.on.tT>(P.on.hold||0.5)){ P.on.goneAt=t; P.on.tT=undefined; P.ev.push('crumble'); P.on=null; P.coy=PH.COYOTE*0.6; } }

  /* drop down through a ledge */
  if(inp.downPressed&&P.on&&!P.on.floor&&!P.on.solid){ P.on=null; P.dropT=PH.DROP; P.coy=0; P.y-=1; P.ev.push('drop'); }

  /* jump (buffered, with coyote time), then Cloud Hop in the air */
  if(P.buf>0){
    if(P.on||P.coy>0){ P.vy=PH.JV+(P.on&&P.on.per&&P.on.my?Math.max(0,(platAt(P.on,t).y-platAt(P.on,t0).y)/dt*0.5):0); P.on=null; P.coy=0; P.buf=0; P.jumped=true; P.cut=false; P.fallFrom=P.y; P.ev.push('jump'); }
    else if(W.dj&&!P.djUsed&&P.airT>0.05){ P.vy=PH.DJV; P.djUsed=true; P.buf=0; P.jumped=true; P.cut=false; P.ev.push('dj'); }
  }
  /* let go early for a short hop */
  if(!inp.jumpHeld&&P.jumped&&!P.cut&&P.vy>0){ P.vy*=PH.JCUT; P.cut=true; }

  if(!P.on){ P.airT+=dt;
    var g=P.vy>0?((inp.jumpHeld&&P.vy<PH.HANGV)?PH.GHANG:PH.G):((inp.jumpHeld&&P.vy>-PH.HANGV)?PH.GHANG:PH.GFALL);
    P.vy-=g*dt; if(P.vy<-PH.MAXFALL) P.vy=-PH.MAXFALL; }
  else P.airT=0;

  /* sideways: the two cliff walls and solid blocks */
  P.x+=P.vx*dt;
  if(P.x<PH.HW){ P.x=PH.HW; P.vx=0; } if(P.x>PH.W-PH.HW){ P.x=PH.W-PH.HW; P.vx=0; }
  var S=W.solids||[], i, s;
  for(i=0;i<S.length;i++){ s=S[i]; if(s.off) continue; if(P.y<s.y+s.h-2&&P.y+PH.HH>s.y+2&&overX(P,s.x,s.w,0)){ if(P.x<s.x+s.w/2) P.x=s.x-PH.HW; else P.x=s.x+s.w+PH.HW; P.vx=0; } }

  /* up and down */
  var prevY=P.y; if(!P.on) P.y+=P.vy*dt;
  if(P.on){ var q=platAt(P.on,t); if(!alive(P.on,t)||!overX(P,q.x,P.on.w,4)){ P.on=null; P.coy=PH.COYOTE; } else P.y=q.y; }
  if(!P.on&&P.vy>0){   // head bumps: solid blocks only (ledges are jump-through); slide around a corner you only clipped
    for(i=0;i<S.length;i++){ s=S[i]; if(s.off) continue; if(prevY+PH.HH<=s.y+1&&P.y+PH.HH>s.y&&overX(P,s.x,s.w,0)){
      var inL=P.x+PH.HW-s.x, inR=s.x+s.w-(P.x-PH.HW);
      if(inL<PH.CORNER&&s.x>PH.HW*2) P.x=s.x-PH.HW; else if(inR<PH.CORNER&&s.x+s.w<PH.W-PH.HW*2) P.x=s.x+s.w+PH.HW;
      else { P.y=s.y-PH.HH; P.vy=0; P.ev.push('bonk'); } } } }
  if(!P.on&&P.vy<=0){
    var L=W.plats, best=null, by=-1e9;
    for(i=0;i<L.length;i++){ var p=L[i]; if(!alive(p,t)||p.hidden) continue; if(P.dropT>0&&!p.floor&&!p.solid) continue;
      var n=platAt(p,t), o=platAt(p,t0); if(!overX(P,n.x,p.w,3)) continue;
      if(prevY>=o.y-0.5&&P.y<=n.y+0.01&&n.y>by){ best=p; by=n.y; } }
    for(i=0;i<S.length;i++){ s=S[i]; if(s.off) continue; var top=s.y+s.h; if(overX(P,s.x,s.w,3)&&prevY>=top-0.5&&P.y<=top&&top>by){ best={solid:true,x:s.x,w:s.w,y:top,blk:s}; by=top; } }
    if(best){ var fell=P.fallFrom-by; P.y=by; P.ev.push(P.vy<-700?'landHard':'land'); P.vy=0; P.on=best.blk?{x:best.x,w:best.w,y:by,solid:true}:best; P.djUsed=false; P.jumped=false; P.airT=0; P.fallFrom=by; P.lastFall=fell; }
  }
  if(P.vy>0) P.fallFrom=Math.max(P.fallFrom,P.y);

  /* thorns */
  var H=W.hazards||[]; for(i=0;i<H.length;i++){ var z=H[i]; if(P.x+PH.HW-5>z.x&&P.x-PH.HW+5<z.x+z.w&&P.y+4<z.y+z.h&&P.y+PH.HH-8>z.y){ P.ev.push('hurt'); break; } }
  return P;
}

root.LPPH={ PH:PH, step:step, fresh:fresh, platAt:platAt, alive:alive };
})(typeof window!=='undefined'?window:globalThis);
