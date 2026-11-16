/* ================= LANTERN PEAK: movement =================
   Pure functions, shared by the game and the route checker (tests/routes.js), so the checker proves routes with the exact same physics.
   World units are px of the 960x540 view; y points UP; the hero's feet are at P.y and P.x is the middle of the body. */
(function(root){
var PH={
  W:960,                       // the climb is one screen wide: no sideways camera, every route choice is visible
  RUN:330, ACC:2700, TURN:1.7, DEC:3600, AIRACC:2100, AIRDEC:1000,
  G:2300, GFALL:2900, GHANG:1500, HANGV:120,   // softer gravity near the top of a held jump: easier to aim the landing
  JV:830, JCUT:0.45, DJV:760, MAXFALL:980,
  COYOTE:0.10, BUFFER:0.14, HW:13, HH:44, DROP:0.24, CORNER:12,
  GLIDEV:140, GLIDEBRAKE:3200, // Scarf Glide: the fastest you fall while gliding, and how hard the scarf brakes a faster fall
  UPV:300, UPACC:1500,         // rising wind: how fast it lifts a glider
  DASHV:780, DASHT:0.17, DASHCD:0.4   // Ember Dash: about 130 px in a straight line; one per jump, refilled on landing
};

/* where a platform is at world time t (moving lifts ease back and forth) */
function platAt(p,t){ if(!p.per) return p; var k=0.5-0.5*Math.cos(2*Math.PI*((t/p.per)+(p.ph||0)));
  return { x:p.x+(p.mx||0)*k, y:p.y+(p.my||0)*k }; }
function alive(p,t){ return !(p.goneAt!==undefined&&t<p.goneAt+(p.back||3)); }
function overX(P,x,w,inset){ return P.x+PH.HW-inset>x&&P.x-PH.HW+inset<x+w; }

/* wind boxes: { x,y,w,h, up (lift, px/s), vx (sideways carry, px/s), always (pushes even when not gliding: the Gloom's gusts), g (ground share of an "always" wind) } */
function windAt(P,W){ var L=W.winds, out=null; if(!L) return null; var cy=P.y+22;
  for(var i=0;i<L.length;i++){ var w=L[i]; if(w.off) continue; if(P.x>w.x&&P.x<w.x+w.w&&cy>w.y&&cy<w.y+w.h){ if(!out) out={up:0,vx:0,avx:0,g:1}; if(w.up) out.up=Math.max(out.up,w.up); if(w.vx){ if(w.always){ out.avx+=w.vx; if(w.g!==undefined) out.g=w.g; } else out.vx+=w.vx; } } }
  return out; }

function fresh(x,y){ return { x:x, y:y, vx:0, vy:0, on:null, face:1, coy:0, buf:0, dropT:0, djUsed:false, jumped:false, cut:false, ev:[], airT:0, fallFrom:y,
  glide:false, wv:0, dashT:0, dashDir:1, dashCd:0, dashReady:true }; }

/* one step. inp: { l, r, jumpHeld, jumpPressed, downPressed, dashPressed }
   W: { plats, solids, hazards, winds, t (world time, already advanced), dj (Cloud Hop unlocked), gl (Scarf Glide), ds (Ember Dash) } */
function step(P,inp,dt,W){
  var t=W.t, t0=t-dt;
  P.ev.length=0;
  if(inp.jumpPressed) P.buf=PH.BUFFER; else P.buf=Math.max(0,P.buf-dt);
  P.coy=P.on?PH.COYOTE:Math.max(0,P.coy-dt);
  P.dropT=Math.max(0,P.dropT-dt);

  /* run: quick to start, quick to stop, a little extra grip when turning around */
  var dir=(inp.r?1:0)-(inp.l?1:0);
  /* Ember Dash: a short straight burst (no gravity while it lasts). One per jump; on the ground it just needs a short breath between dashes. */
  P.dashCd=Math.max(0,P.dashCd-dt);
  if(inp.dashPressed&&W.ds&&P.dashT<=0&&P.dashCd<=0&&(P.on||P.dashReady)){ P.dashT=PH.DASHT; P.dashDir=dir||P.face||1; P.face=P.dashDir; if(!P.on) P.dashReady=false; P.dashCd=PH.DASHCD; P.glide=false; P.ev.push('dash'); }
  var dashing=P.dashT>0;
  if(dashing){ P.dashT-=dt; P.vx=P.dashDir*PH.DASHV; if(!P.on) P.vy=0; if(P.dashT<=0){ P.dashT=0; P.vx=P.dashDir*PH.RUN; } }
  else if(dir){ var acc=P.on?PH.ACC:PH.AIRACC; if(dir*P.vx<0) acc*=PH.TURN; P.vx+=dir*acc*dt; if(Math.abs(P.vx)>PH.RUN) P.vx=PH.RUN*(P.vx>0?1:-1); P.face=dir; }
  else { var d=(P.on?PH.DEC:PH.AIRDEC)*dt; P.vx=Math.abs(P.vx)<=d?0:P.vx-(P.vx>0?d:-d); }

  /* ride a moving lift */
  if(P.on&&P.on.per){ var a=platAt(P.on,t0), b=platAt(P.on,t); P.x+=b.x-a.x; P.y+=b.y-a.y; }
  /* crumbling plank: shakes, then drops */
  if(P.on&&P.on.kind==='crumble'){ if(P.on.tT===undefined) { P.on.tT=t; P.ev.push('crack'); } if(t-P.on.tT>(P.on.hold||0.35)){ P.on.goneAt=t; P.on.tT=undefined; P.ev.push('crumble'); P.on=null; P.coy=PH.COYOTE*0.6; } }

  /* drop down through a ledge */
  if(inp.downPressed&&P.on&&!P.on.floor&&!P.on.solid){ P.on=null; P.dropT=PH.DROP; P.coy=0; P.y-=1; P.ev.push('drop'); }

  /* jump (buffered, with coyote time), then Cloud Hop in the air */
  if(P.buf>0){
    if(P.on||P.coy>0){ P.dashT=0; dashing=false; P.vy=PH.JV+(P.on&&P.on.per&&P.on.my?Math.max(0,(platAt(P.on,t).y-platAt(P.on,t0).y)/dt*0.5):0); P.on=null; P.coy=0; P.buf=0; P.jumped=true; P.cut=false; P.fallFrom=P.y; P.ev.push('jump'); }
    else if(W.dj&&!P.djUsed&&P.airT>0.05){ P.dashT=0; dashing=false; P.vy=PH.DJV; P.djUsed=true; P.buf=0; P.jumped=true; P.cut=false; P.ev.push('dj'); }
  }
  /* let go early for a short hop */
  if(!inp.jumpHeld&&P.jumped&&!P.cut&&P.vy>0){ P.vy*=PH.JCUT; P.cut=true; }

  /* Scarf Glide: after the Cloud Hop, holding jump lets the scarf catch the air. Falling slows to a drift; rising wind lifts a glider. */
  var wind=windAt(P,W), wasGl=P.glide;
  P.glide=!!(W.gl&&!P.on&&P.djUsed&&inp.jumpHeld&&!dashing&&(P.vy<=0||(wind&&wind.up>0)));
  if(P.glide&&!wasGl) P.ev.push('glide');
  if(!P.on){ P.airT+=dt;
    if(dashing){ /* straight line */ }
    else if(P.glide&&wind&&wind.up>0&&P.vy<wind.up){ P.vy=Math.min(wind.up,P.vy+PH.UPACC*dt); }
    else if(P.glide&&P.vy<=-PH.GLIDEV){ P.vy=Math.min(-PH.GLIDEV,P.vy+PH.GLIDEBRAKE*dt); }   // the scarf opens: brake to the glide speed and hold it
    else { var g=P.vy>0?((inp.jumpHeld&&P.vy<PH.HANGV)?PH.GHANG:PH.G):((inp.jumpHeld&&P.vy>-PH.HANGV)?PH.GHANG:PH.GFALL);
      P.vy-=g*dt; if(P.vy<-PH.MAXFALL) P.vy=-PH.MAXFALL; if(P.glide&&P.vy<-PH.GLIDEV) P.vy=-PH.GLIDEV; } }
  else P.airT=0;
  /* wind carries a glider sideways; the Gloom's gusts push everyone (less on the ground) */
  var wt=0; if(wind&&!dashing){ if(P.glide) wt+=wind.vx; wt+=wind.avx*(P.on?wind.g:1); }
  P.wv+=(wt-P.wv)*Math.min(1,dt*7); if(Math.abs(P.wv)<0.5&&!wt) P.wv=0;

  /* sideways: the two cliff walls and solid blocks (an Ember Dash melts straight through ice) */
  P.x+=(P.vx+P.wv)*dt;
  if(P.x<PH.HW){ P.x=PH.HW; P.vx=0; } if(P.x>PH.W-PH.HW){ P.x=PH.W-PH.HW; P.vx=0; }
  var S=W.solids||[], i, s;
  for(i=0;i<S.length;i++){ s=S[i]; if(s.off) continue; if(P.y<s.y+s.h-2&&P.y+PH.HH>s.y+2&&overX(P,s.x,s.w,0)){
    if(s.ice&&dashing){ s.off=true; s.broken=true; P.ev.push('shatter'); P.shat=s; continue; }
    if(P.x<s.x+s.w/2) P.x=s.x-PH.HW; else P.x=s.x+s.w+PH.HW; P.vx=0; } }

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
    if(best){ var fell=P.fallFrom-by; P.y=by; P.ev.push(P.vy<-700?'landHard':'land'); P.vy=0; P.on=best.blk?{x:best.x,w:best.w,y:by,solid:true}:best; P.djUsed=false; P.jumped=false; P.airT=0; P.glide=false; P.dashReady=true; P.fallFrom=by; P.lastFall=fell; }
  }
  if(P.vy>0) P.fallFrom=Math.max(P.fallFrom,P.y);

  /* thorns */
  var H=W.hazards||[]; for(i=0;i<H.length;i++){ var z=H[i]; if(P.x+PH.HW-5>z.x&&P.x-PH.HW+5<z.x+z.w&&P.y+4<z.y+z.h&&P.y+PH.HH-8>z.y){ P.ev.push('hurt'); break; } }
  return P;
}

root.LPPH={ PH:PH, step:step, fresh:fresh, platAt:platAt, alive:alive, windAt:windAt };
})(typeof window!=='undefined'?window:globalThis);
