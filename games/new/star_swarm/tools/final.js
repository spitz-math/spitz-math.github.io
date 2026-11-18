const { chromium } = require('playwright');
(async()=>{ const b=await chromium.launch(); 
  for(const [f,tag] of [['star_swarm_rebuild_mult_v1.html','mult'],['star_swarm_rebuild_preview_v1.html','prev']]){
    const pg=await b.newPage({viewport:{width:1366,height:620},deviceScaleFactor:1}); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
    await pg.goto('file://'+__dirname+'/../out/'+f); await pg.waitForTimeout(700); await pg.evaluate(()=>{ localStorage.clear(); }); await pg.reload(); await pg.waitForTimeout(700); await pg.evaluate(()=>{ window.__noBlurDock=1; });
    await pg.screenshot({path:'shots/f_'+tag+'_start.png'});
    await pg.fill('#sw-nameinput','Kody S'); await pg.click('#sw-go'); await pg.waitForTimeout(2500); await pg.keyboard.down(' '); await pg.keyboard.down('ArrowLeft'); await pg.waitForTimeout(900); await pg.keyboard.up('ArrowLeft');
    await pg.keyboard.down('ArrowRight'); await pg.waitForTimeout(500); await pg.keyboard.press('Shift'); await pg.waitForTimeout(120); await pg.screenshot({path:'shots/f_'+tag+'_dash.png'}); await pg.waitForTimeout(2500); await pg.keyboard.up('ArrowRight');
    await pg.screenshot({path:'shots/f_'+tag+'_play.png'}); await pg.waitForTimeout(6500); await pg.keyboard.up(' ');
    const st=await pg.evaluate(()=>({open:__G.cardOpen(),set:location.search,q:__G.state().q&&__G.state().q.prompt,fuel:__G.state().fuel,kills:__G.state().kills}));
    await pg.screenshot({path:'shots/f_'+tag+'_card.png'}); console.log(tag,JSON.stringify(st),JSON.stringify(errs)); await pg.close(); }
  await b.close(); })();
