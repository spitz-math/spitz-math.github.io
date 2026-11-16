const {chromium}=require('playwright'); const D=require('path').join(__dirname,'..','out');
(async()=>{ const b=await chromium.launch(); const pg=await (await b.newContext({viewport:{width:1366,height:768}})).newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(String(e)));
 await pg.goto('file://'+D+'/rook_and_ruin_mult.html'); await pg.evaluate('localStorage.clear()'); await pg.reload(); await pg.waitForTimeout(600);
 await pg.fill('#dn-nameinput','Test T'); await pg.click('#dn-go'); await pg.waitForTimeout(500);
 const st=()=>pg.evaluate(()=>{ const S=__G.state(); const r=document.getElementById('dn-arena').getBoundingClientRect(); return [S.mode,S.over,Math.round(r.width),Math.round(r.height),Math.round(r.left),Math.round(r.top)]; });
 console.log('intro',await st()); await pg.screenshot({path:D+'/gal/big_intro.png'});
 await pg.keyboard.press('Escape'); await pg.waitForTimeout(450); console.log('mid shrink',await st()); await pg.screenshot({path:D+'/gal/big_mid.png'}); await pg.waitForTimeout(800); console.log('after',await st());
 for(const how of ['Escape','Enter','Space']){ for(const kind of ['escape','fall']){
   await pg.evaluate(()=>{ const S=__G.state(); S.over=false; S.mode='play'; }); 
   await pg.evaluate(k=>__G.finish(k==='escape',k),kind); await pg.waitForTimeout(700); const a=await st();
   if(how==='click') await pg.click('#dn-skip'); else await pg.keyboard.press(how); await pg.waitForTimeout(300); console.log(how,kind,a[0],'->',(await st()).slice(0,2));
   await pg.evaluate(()=>{ document.getElementById('dn-end').hidden=true; }); } }
 // holding space when the scene starts, then pressing again
 await pg.evaluate(()=>{ const S=__G.state(); S.over=false; S.mode='play'; }); await pg.keyboard.down(' '); await pg.evaluate(()=>__G.finish(true,'escape')); await pg.waitForTimeout(500); await pg.keyboard.up(' '); await pg.keyboard.press(' '); await pg.waitForTimeout(300); console.log('held space then tap',(await st()).slice(0,2));
 console.log('errors',JSON.stringify(errs)); await b.close(); })();
