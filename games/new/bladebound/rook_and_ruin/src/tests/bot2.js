/* Playtest bot for the v5 run. window.__B = {build:'blade'|'storm', fork:'w'|'e', dodge:true, acc:0.85}
   Plays with the same keys a student has (direction keys, Space, dodge). Reacts every call (~66 ms). */
window.__bot2=function(){
  var G=__G, S=G.state(); if(!S.started||S.over) return;
  var B=window.__B; B.log=B.log||[]; B.dmg=B.dmg||[]; B.t=(B.t||0);
  var K=['arrowup','arrowdown','arrowleft','arrowright',' '];
  function rel(){ K.forEach(function(k){ G.hold(k,false); }); }
  if(S.mode==='ask'){ rel(); if(!S.qDone){ var i=S.q.choices.findIndex(function(c){return c.ok;}); var ok=Math.random()<(B.acc==null?0.85:B.acc); G.answer(ok?i:(i+1)%S.q.choices.length); B.log.push((S.ask?S.ask.why:'?')+(ok?' right':' wrong')); } else G.askNext(); return; }
  if(S.mode==='pick'){ rel(); var pref=B.build==='boom'?['volatile','overcharge','spark','shrapnel','ricochet','orbit','heart','boots','edge','wave','whirl','aegis','thorns','spite']:B.build==='pure'?['bash','thorns','aegis','ward','heart','boots','edge','wave','whirl','riposte']:B.build==='bulwark'?['tcharge','spite','thunder','bash','thorns','aegis','ward','heart','spark','volatile','boots','orbit','edge','wave']:B.build==='blade'?['bladestorm','splitwave','wave','whirl','edge','riposte','heart','boots','aegis','orbit','spark','volatile','ricochet']
      :['overcharge','tempest','shrapnel','thunder','spark','volatile','orbit','ricochet','heart','aegis','boots','edge','wave','whirl','riposte'];
    var best=0, bs=1e9; S.cards.forEach(function(c,i){ var r=pref.indexOf(c.id); if(r<0) r=50; if(r<bs){ bs=r; best=i; } }); B.log.push('pick '+S.cards.map(function(c){return c.id;}).join('/')+' -> '+S.cards[best].id); G.pick(best); return; }
  if(S.mode!=='play') return;
  var w=S.w, p=w.p, TS=30, R=G.ROOMS[w.rid];
  if(B.lastHp!=null&&p.hp<B.lastHp){ var near=w.en.filter(function(e){return !e.dead;}).map(function(e){ return e.type+'(st'+e.st+','+Math.round(Math.hypot(e.x-p.x,e.y-p.y))+')'; }).sort(function(a,b){ return parseInt(a.split(',')[1])-parseInt(b.split(',')[1]); }).slice(0,3);
    B.dmg.push(w.rid+' '+Math.round(w.runT)+'s hp'+p.hp+' near:'+near.join(' ')+(w.orbs.length?' orbs'+w.orbs.length:'')+(w.rings&&w.rings.length?' rings':'')); }
  B.lastHp=p.hp; if(B.room!==w.rid){ B.room=w.rid; B.log.push('room '+w.rid+' at '+Math.round(w.runT)+'s hp '+p.hp+'/'+p.max+' c'+w.coins); B.secretHits=0; }
  rel();
  /* ---------- pathing ---------- */
  function free(tx,ty){ if(G.solid(tx,ty)) return false; var X=tx*TS, Y=ty*TS; return !G.wallAt(X+15,Y+15)&&!G.wallAt(X+3,Y+3)&&!G.wallAt(X+27,Y+3)&&!G.wallAt(X+3,Y+27)&&!G.wallAt(X+27,Y+27); }
  function pathTo(gx,gy){ var sx=Math.floor(p.x/TS), sy=Math.floor(p.y/TS), tx=Math.floor(gx/TS), ty=Math.floor(gy/TS); if(sx===tx&&sy===ty) return [gx,gy];
    var prev={}, q=[[sx,sy]], key=function(a,b){return a+','+b;}; prev[key(sx,sy)]=null; var found=false;
    while(q.length){ var c=q.shift(); if(c[0]===tx&&c[1]===ty){ found=true; break; }
      [[1,0],[-1,0],[0,1],[0,-1]].forEach(function(d){ var nx=c[0]+d[0], ny=c[1]+d[1], k=key(nx,ny); if(k in prev) return; if(!(nx===tx&&ny===ty)&&!free(nx,ny)) return; prev[k]=c; q.push([nx,ny]); }); }
    if(!found) return [gx,gy]; var cur=[tx,ty], path=[]; while(cur){ path.push(cur); cur=prev[key(cur[0],cur[1])]; } path.reverse();
    /* skip ahead while the straight line is clear of walls (with body width) */
    var pick=path[1]||path[0]; for(var i=1;i<path.length;i++){ var c2=path[i], cx=c2[0]*TS+15, cy=c2[1]*TS+15, ok=true;
      for(var s=1;s<=10;s++){ var fx=p.x+(cx-p.x)*s/10, fy=p.y+(cy-p.y)*s/10; for(var o=-1;o<=1;o+=2){ if(G.wallAt(fx+o*12,fy)||G.wallAt(fx,fy+o*12)) ok=false; } } if(ok) pick=c2; else break; }
    return (pick[0]===tx&&pick[1]===ty)?[gx,gy]:[pick[0]*TS+15,pick[1]*TS+15]; }
  function steer(dx,dy,dead){ dead=dead||3; if(dx>dead) G.hold('arrowright',true); if(dx<-dead) G.hold('arrowleft',true); if(dy>dead) G.hold('arrowdown',true); if(dy<-dead) G.hold('arrowup',true); }
  function go(x,y){ var n=pathTo(x,y); steer(n[0]-p.x,n[1]-p.y); return Math.hypot(x-p.x,y-p.y); }
  function dodge(ax,ay){ if(!B.dodge||p.rollCd>0||p.roll>0) return false; rel(); steer(ax*10,ay*10,1); G.roll(); B.rolls=(B.rolls||0)+1; return true; }
  /* ---------- threats ---------- */
  var en=w.en.filter(function(e){return !e.dead;});
  if(B.dodge&&p.roll<=0){
    for(var i=0;i<en.length;i++){ var e=en[i], dx=p.x-e.x, dy=p.y-e.y, d=Math.hypot(dx,dy)||1, ux=dx/d, uy=dy/d;
      if(e.type==='gob'&&e.st===1&&d<150&&e.cd<0.25){ if(dodge(-uy,ux)) return; }
      if(e.type==='bat'&&e.st===1&&d<230&&e.cd<0.2){ if(dodge(-uy,ux)) return; }
      if(e.type==='skel'&&e.st===1&&d<120&&e.cd<0.25){ if(dodge(-ux,-uy)) return; }
      if(e.type==='boss'){ var fa=e.fa, fx=Math.cos(fa), fy=Math.sin(fa), along=(p.x-e.x)*fx+(p.y-e.y)*fy, perp=Math.abs(-(p.x-e.x)*fy+(p.y-e.y)*fx);
        if(e.st===1&&along>0&&perp<55&&e.cd<0.3){ var sd=(-(p.x-e.x)*fy+(p.y-e.y)*fx)>=0?1:-1; if(dodge(-fy*sd,fx*sd)) return; }
        if(e.st===3&&d<160&&e.cd<0.3){ if(dodge(ux,uy)) return; }
        if(e.st===4&&d<160&&e.cd<0.3){ if(dodge(ux,uy)) return; } } }
    for(var j=0;j<w.orbs.length;j++){ var o=w.orbs[j]; if(o.fr) continue; var ox=p.x-o.x, oy=p.y-6-o.y, od=Math.hypot(ox,oy), sp=Math.hypot(o.vx,o.vy), cl=(ox*o.vx+oy*o.vy)/(sp*od);
      if(od<70&&cl>0.9){ if(dodge(-o.vy/sp,o.vx/sp)) return; } }
    if(w.rings) for(var k=0;k<w.rings.length;k++){ var r=w.rings[k]; if(r.hit) continue; var rd=Math.hypot(p.x-r.x,p.y-r.y); if(rd-r.r>0&&rd-r.r<40){ if(dodge((p.x-r.x)/rd,(p.y-r.y)/rd)) return; } } }
  if(p.roll>0) return;
  if((B.build==='bulwark'||B.build==='pure')&&G.state().w.b.bash&&p.rollCd<=0&&p.roll<=0){ var cl=en.filter(function(e){ return e.type!=='boss'&&Math.hypot(e.x-p.x,e.y-p.y)<110; }); if(cl.length){ var t0=cl[0], dx0=t0.x-p.x, dy0=t0.y-p.y, d0=Math.hypot(dx0,dy0)||1; if(dodge(dx0/d0,dy0/d0)) return; } }
  /* ---------- fight ---------- */
  if(en.length){ var tg=null, bd=1e9; en.forEach(function(e){ var d=Math.hypot(e.x-p.x,e.y-p.y)-(e.type==='skel'&&e.st!==3?40:0); if(d<bd){ bd=d; tg=e; } });
    var dx=tg.x-p.x, dy=tg.y-p.y, d=Math.hypot(dx,dy), rng=G.stat().range+tg.r;
    var keep=0; if(tg.type==='skel'&&tg.st!==3) keep=80; if(tg.type==='boss'&&tg.st!==9&&tg.st!==5) keep=150; if(tg.type==='gob'&&tg.st===1) keep=0;
    if(keep&&d<keep){ steer(-dx,-dy); return; }
    if(keep&&d<keep+40){ steer(-dy,dx); return; }   /* circle while waiting for an opening */
    if(d<tg.r+16){ steer(-dx,-dy); return; }
    if(d>rng*0.85) go(tg.x,tg.y); else steer(dx,dy,2);
    if(d<rng+4) G.hold(' ',true);
    return; }
  if(w.spawns.length||!w.cleared) { go(480,300); return; }
  if(w.pend>0) return;
  /* ---------- after the fight ---------- */
  if(w.chest&&!w.chest.open){ go(w.chest.x,w.chest.y); return; }
  if(R.secret&&!w.secretOpen&&B.findSecret!==false){ var sx=w.secretChest.x, sy=w.secretChest.y+8; if(Math.hypot(p.x-sx,p.y-sy)>8){ go(sx,sy); return; } G.hold('arrowup',true); if(p.cd<=0){ G.hold(' ',true); } return; }
  var sc=w.secretChest; if(sc&&w.secretOpen&&!sc.open){ go(sc.x,sc.y); return; }
  if(w.shop){ var want=null; ['card','max','rev','arm','heal','gold'].forEach(function(id){ var item=w.shop.find(function(s){return s.id===id;}); if(want||!item||item.sold) return; if(id==='heal'&&p.hp>=p.max) return; if(w.coins>=item.cost) want=item; });
    if(want&&want.hold){ go(want.x,want.y+70); return; }   /* one buy per visit: step off, then back on */
    if(want){ if(Math.hypot(p.x-want.x,p.y-want.y)>20){ go(want.x,want.y); B.bt=0; } else { B.bt=(B.bt||0)+1; if(B.bt%2) G.pressE(); } return; } }
  var ex=R.exits, dir=ex.n?'n':(ex[B.fork]?B.fork:Object.keys(ex)[0]);
  if(dir==='n'){ if(Math.abs(p.x-480)>8||p.y>2*TS) go(480,1*TS+5); else G.hold('arrowup',true); }
  else if(dir==='w'){ if(Math.abs(p.y-270)>8||p.x>2*TS) go(1*TS+5,270); else G.hold('arrowleft',true); }
  else if(dir==='e'){ if(Math.abs(p.y-270)>8||p.x<W_-2*TS) go(W_-TS-5,270); else G.hold('arrowright',true); }
};
var W_=960;
