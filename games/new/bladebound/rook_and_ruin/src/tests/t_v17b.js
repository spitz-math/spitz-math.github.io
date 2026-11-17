const {chromium}=require('playwright'); const D=require('path').join(__dirname,'..','out');
(async()=>{ const b=await chromium.launch(); const pg=await (await b.newContext({viewport:{width:1366,height:768}})).newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(String(e)));
 await pg.goto('file://'+D+'/rook_and_ruin_mult.html'); await pg.evaluate('localStorage.clear()'); await pg.reload(); await pg.waitForTimeout(600);
 await pg.fill('#dn-nameinput','Test T'); await pg.click('#dn-go'); await pg.waitForTimeout(300); await pg.click('#dn-skip'); await pg.waitForTimeout(300);
 const r={};
 // shop: restock price climbs, armor soaks hits
 await pg.evaluate(()=>{ __G.room('shop','s'); __G.state().w.dealt=1; }); await pg.waitForTimeout(700);
 r.shop=await pg.evaluate(async()=>{ const S=__G.state(), w=S.w, p=w.p; w.coins=200; const out=[]; const sc=w.shop[2], ar=w.shop[4], hc=w.shop[1];
   p.x=hc.x; p.y=hc.y; __G.hold(' ',true); await new Promise(r=>setTimeout(r,120)); __G.hold(' ',false); await new Promise(r=>setTimeout(r,120)); out.push(['heart',hc.cost,hc.sold,p.max]);
   __G.hold(' ',true); await new Promise(r=>setTimeout(r,120)); __G.hold(' ',false); await new Promise(r=>setTimeout(r,120)); out.push(['heart2',hc.sold,p.max,w.coins]);
   p.x=ar.x; p.y=ar.y; __G.hold(' ',true); await new Promise(r=>setTimeout(r,120)); __G.hold(' ',false); out.push(['arm',p.arm,ar.sold]);
   await new Promise(r=>setTimeout(r,150)); p.x=sc.x; p.y=sc.y; __G.hold(' ',true); await new Promise(r=>setTimeout(r,150)); __G.hold(' ',false); out.push(['scroll',S.mode,sc.cost,sc.sold]); __G.pick(0); await new Promise(r=>setTimeout(r,100));
   return out; });
 r.armor=await pg.evaluate(async()=>{ const S=__G.state(), p=S.w.p; const hp0=p.hp; const out=[]; for(let i=0;i<4;i++){ p.inv=0; __G.hurt(1); out.push([p.arm,p.hp]); } return {hp0,out}; });
 // reload in the middle of a doorway walk
 for(const ms of [150,600]){ await pg.evaluate(()=>{ __G.room('guard','s'); const w=__G.state().w; w.waves=[]; w.en=[]; w.spawns=[]; w.cleared=true; w.open=w.door=true; w.p.x=480; w.p.y=110; __G.hold('arrowup',true); });
  await pg.waitForTimeout(ms); const pre=await pg.evaluate(()=>{ const S=__G.state(); return [S.mode,S.w.rid]; }); await pg.reload(); await pg.waitForTimeout(800);
  r['reload'+ms]=[pre, await pg.evaluate(()=>{ const S=__G.state(); return [S.mode,S.w.rid,Math.round(S.w.p.x),Math.round(S.w.p.y)]; })]; }
 // room clear heals one heart
 r.heal=await pg.evaluate(async()=>{ const S=__G.state(); __G.room('cross','s'); S.mode='play'; const w=S.w; w.p.hp=3; w.waves=[]; w.spawns=[]; w.en=[]; await new Promise(r=>setTimeout(r,400)); return [w.cleared,w.p.hp]; });
 console.log(JSON.stringify(r)); console.log('errors',JSON.stringify(errs)); await b.close(); })();
