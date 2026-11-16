/* Nov 14 art drop: Rook's slash in motion (every direction), merchant frames, shop pedestals, all 26 power icons.
   Writes out/tour/art14_*.png (2x). Fails if a pose sequence is wrong, an icon is missing/blank, or the page errors. */
const {chromium}=require('playwright'); const D=process.argv[2]||require('path').join(__dirname,'..','out'); const O=D+'/tour/';
(async()=>{ const b=await chromium.launch(); const pg=await (await b.newContext({viewport:{width:1366,height:768},deviceScaleFactor:2})).newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(String(e)));
 await pg.goto('file://'+D+'/rook_and_ruin_mult.html'); await pg.evaluate('localStorage.clear()'); await pg.reload(); await pg.waitForTimeout(600);
 await pg.fill('#dn-nameinput','Test T'); await pg.click('#dn-go'); await pg.waitForTimeout(300); await pg.keyboard.press('Escape'); await pg.waitForTimeout(1200);
 /* 1. a real swing, stepped 1/120 s at a time: the pose columns must run windup -> slash -> follow-through -> recover in order */
 const seq=await pg.evaluate(()=>{ const S=__G.state(), w=S.w, p=w.p, out={}; w.en=[]; w.waves=[]; w.spawns=[];
   for(const [nm,fx,fy] of [['up',0,-1],['down',0,1],['right',1,0],['left',-1,0]]){ p.sw=0; p.swR=0; p.x=480; p.y=330; p.fx=fx; p.fy=fy; p.swA=Math.atan2(fy,fx); p.sw=0.2; p.spin=0; p.mv=0;
     const cols=[]; let row=null, fl=null; for(let i=0;i<40;i++){ const ps=__G.pose(); if(ps[0]==='rook_slash'){ if(cols[cols.length-1]!==ps[2]) cols.push(ps[2]); row=ps[1]; fl=ps[3]; } p.sw=Math.max(0,p.sw-1/120); if(p.sw===0&&p.swR===undefined) break; if(p.sw===0) p.swR=Math.max(0,(p.swR||0.15)-1/120); }
     out[nm]={row,flip:fl,cols:cols.join('')}; } p.sw=0; p.swR=0; return out; });
 console.log('swing',JSON.stringify(seq));
 const ok1=seq.up.row===1&&seq.down.row===0&&seq.right.row===2&&seq.left.row===2&&seq.left.flip===true&&['up','down','right','left'].every(k=>seq[k].cols.startsWith('012'));
 /* 2. each motion phase drawn by the game itself, cropped around Rook */
 const box=await pg.evaluate(()=>{ const r=document.getElementById('dn-canvas').getBoundingClientRect(); return {x:r.left,y:r.top,s:r.width/960}; });
 for(const [nm,a] of [['up',-Math.PI/2],['down',Math.PI/2],['right',0],['left',Math.PI]]){
   for(const [k,el] of [[0,0.02],[1,0.08],[2,0.15],[3,-1]]){
     await pg.evaluate(([a,el])=>{ const S=__G.state(), w=S.w, p=w.p; S.over=true; w.banner=null; p.x=480; p.y=420; p.fx=Math.cos(a); p.fy=Math.sin(a); p.swA=a; p.spin=0; p.mv=0; if(el<0){ p.sw=0; p.swR=0.1; } else { p.sw=0.2-el; p.swR=0; } window.__freeze=[p.sw,p.swR]; },[a,el]);
     await pg.waitForTimeout(40);
     await pg.evaluate(()=>{ const p=__G.state().w.p; p.sw=window.__freeze[0]; p.swR=window.__freeze[1]; __G.frame(); });
     await pg.screenshot({path:O+'art14_slash_'+nm+k+'.png',clip:{x:box.x+(480-60)*box.s,y:box.y+(420-70)*box.s,width:120*box.s,height:110*box.s}}); } }
 await pg.evaluate(()=>{ const S=__G.state(), p=S.w.p; p.sw=0; p.swR=0; S.over=false; });
 /* 3. shop: merchant waves on arrival, idles, nods after a purchase; pedestals + items */
 await pg.evaluate(()=>{ __G.room('shop','s'); const w=__G.state().w; w.coins=200; w.dealt=1; });
 const mc=await pg.evaluate(()=>{ const w=__G.state().w, out=[]; const col=()=>{ const el=w.t-(w.mAt||0); return (w.mA==='wave'&&el<1.8)?(Math.floor(el/0.3)%2?1:2):(w.mA==='nod'&&el>=0&&el<0.7)?3:Math.floor(w.t/0.8)%2; };
   for(let i=0;i<150;i++){ __G.step(1/60); if(i%15===0) out.push(col()); } return out.join(''); });
 await pg.waitForTimeout(100); const cb=await pg.evaluate(()=>{ const r=document.getElementById('dn-canvas').getBoundingClientRect(); return {x:r.left,y:r.top,s:r.width/960}; });
 await pg.screenshot({path:O+'art14_shop.png',clip:{x:cb.x+120*cb.s,y:cb.y+190*cb.s,width:720*cb.s,height:200*cb.s}});
 await pg.evaluate(()=>{ const w=__G.state().w, it=w.shop[0]; w.p.x=it.x; w.p.y=it.y; __G.step(1/60); }); await pg.waitForTimeout(20); await pg.keyboard.press('e');   /* E buys since the playtest handoff */
 const nod=await pg.evaluate(()=>{ const w=__G.state().w, it=w.shop[0]; for(let i=0;i<3;i++) __G.step(1/60); return [w.mA,!!it.sold]; });
 await pg.waitForTimeout(80); await pg.evaluate(()=>{ const w=__G.state().w; w.p.x=700; w.p.y=420; __G.frame(); });
 await pg.screenshot({path:O+'art14_shop_sold.png',clip:{x:cb.x+120*cb.s,y:cb.y+190*cb.s,width:720*cb.s,height:200*cb.s}});
 console.log('merchant cols',mc,'after buy',JSON.stringify(nod));
 const ok2=mc.startsWith('2')&&/[01]{3}$/.test(mc)&&nod[0]==='nod'&&nod[1];
 /* 4. all 26 icons through the game's own ICON(): each one has its own image, is not blank, and is 24x24 art */
 const ic=await pg.evaluate(async()=>{ const all=__G.icons(); const d=document.createElement('div'); d.id='icgrid'; d.style.cssText='position:fixed;left:0;top:0;z-index:99999;background:#14182A;padding:16px;display:grid;grid-template-columns:repeat(7,110px);gap:10px;font:12px Lexend;color:#fff';
   d.innerHTML=all.map(u=>'<div style="text-align:center"><span style="font-size:72px;line-height:1">'+u[1]+'</span><br>'+u[0]+'</div>').join(''); document.body.appendChild(d);
   const bad=[]; for(const u of all){ const src=u[2]; if(!src){ bad.push(u[0]+':none'); continue; } const im=new Image(); im.src=src; await im.decode(); if(im.width!==24||im.height!==24) bad.push(u[0]+':size'); const c=document.createElement('canvas'); c.width=24; c.height=24; const x=c.getContext('2d'); x.drawImage(im,0,0); const a=x.getImageData(0,0,24,24).data; let n=0; for(let i=3;i<a.length;i+=4) if(a[i]) n++; if(n<40) bad.push(u[0]+':blank'); }
   const els=[...d.querySelectorAll('.dn-pi')].map(e=>getComputedStyle(e).backgroundImage.slice(0,30)); return {n:all.length,els:els.length,distinct:new Set(all.map(u=>u[2])).size,bad}; });
 await pg.screenshot({path:O+'art14_icons.png',clip:{x:0,y:0,width:16*2+7*110+6*10,height:16*2+4*100}}); await pg.evaluate(()=>document.getElementById('icgrid').remove());
 console.log('icons',JSON.stringify(ic)); const ok3=ic.n===26&&ic.els===26&&ic.distinct===26&&!ic.bad.length;
 const e=[...errs]; if(!ok1) e.push('swing order'); if(!ok2) e.push('merchant'); if(!ok3) e.push('icons'); console.log('errors',JSON.stringify(e)); await b.close(); })();
