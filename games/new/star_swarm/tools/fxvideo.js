// A ~30 s clip of the pixel effects in real play (scripted): node tools/fxvideo.js <outdir>
const { chromium } = require('playwright');
(async()=>{ const out=process.argv[2]; const b=await chromium.launch();
  const ctx=await b.newContext({viewport:{width:1280,height:720},recordVideo:{dir:out,size:{width:1280,height:720}}}); const pg=await ctx.newPage();
  await pg.goto('file://'+__dirname+'/../out/star_swarm_candidate.html'); await pg.waitForTimeout(400);
  await pg.evaluate(()=>{ localStorage.clear(); window.__noBlurDock=1; }); await pg.reload(); await pg.waitForTimeout(600); await pg.evaluate(()=>{ window.__noBlurDock=1; });
  await pg.fill('#sw-nameinput','Test T'); await pg.click('#sw-go'); await pg.waitForTimeout(2500);
  const W=ms=>pg.waitForTimeout(ms);
  await pg.evaluate(()=>{ const s=__G.state(); s.fuel=19; ['gun','drone'].forEach(k=>s.lv[k]=2); });
  await pg.keyboard.down(' ');
  for(let i=0;i<3;i++){ await pg.keyboard.down('ArrowLeft'); await W(700); await pg.keyboard.up('ArrowLeft'); await pg.keyboard.down('ArrowRight'); await W(900); await pg.keyboard.up('ArrowRight'); }
  await pg.evaluate(()=>{ __G.dropCap(__G.ship().x,__G.consts.SHIP_Y-60,'O'); }); await W(1500);
  await pg.keyboard.up(' '); await pg.evaluate(()=>{ __G.state().fuel=1; __G.dock(); }); await W(1500);
  await pg.evaluate(()=>{ const q=__G.state().q; __G.noWait(); __G.answer(q.choices.findIndex(c=>c.ok)); }); await W(900); await pg.evaluate(()=>{ __G.noWait(); __G.launch(); });
  await pg.keyboard.down(' '); await W(2200);
  await pg.evaluate(()=>{ __G.state().fuel=19; __G.ship().safeUntil=0; __G.ship().shield=0; __G.hurt(); }); await W(1800);
  await pg.evaluate(()=>{ __G.nova(); }); await W(2500);
  await pg.evaluate(()=>{ __G.state().fuel=19; ['gun','missile'].forEach(k=>__G.state().lv[k]=3); __G.setWave(5); }); await W(6500);
  await pg.evaluate(()=>{ const B=__G.state().bossHp; __G.hitPart('l',B.l); }); await W(2000);
  await pg.evaluate(()=>{ const B=__G.state().bossHp; __G.hitPart('r',B.r); }); await W(2500);
  await pg.evaluate(()=>{ __G.ship().safeUntil=1e9; const B=__G.state().bossHp; if(B) __G.hitPart('c',B.c); }); await W(4500);
  await pg.keyboard.up(' '); const v=pg.video(); await ctx.close(); console.log(await v.path()); await b.close(); })();
