/* node t7.js <dir> <build> <fork> <dodge 1|0> [acc] [shots]  -- full simulated run, fixed 60 fps steps */
const {chromium}=require('playwright'); const [D,build,fork,dodge,acc,shots]=process.argv.slice(2);
(async()=>{ const b=await chromium.launch(); const pg=await (await b.newContext({viewport:{width:1920,height:1080}})).newPage();
 const errs=[]; pg.on('pageerror',e=>errs.push(String(e))); pg.on('console',m=>{ if(m.type()==='error') errs.push(m.text()); });
 await pg.goto('file://'+D+'/rook_and_ruin_fonts.html?set=slope'); await pg.waitForTimeout(300); await pg.evaluate('localStorage.clear()'); await pg.reload(); await pg.waitForTimeout(700);
 await pg.fill('#dn-nameinput','Test T'); await pg.click('#dn-go'); await pg.waitForTimeout(300);
 await pg.addScriptTag({path:__dirname+'/bot2.js'});
 await pg.evaluate(o=>{ window.__B=o; window.__dmg={}; },{build,fork,dodge:dodge==='1',acc:acc?+acc:0.85});
 let shotRooms={}; let res;
 for(let chunk=0;chunk<200;chunk++){
   res=await pg.evaluate(()=>{ const G=__G; for(let i=0;i<75;i++){ const S=G.state(); if(S.over) break; __bot2(); for(let k=0;k<4;k++) G.step(1/60); }
     const S=G.state(); return {over:S.over,win:S.win,rid:S.w.rid,t:S.w.runT,hp:S.w.p.hp,mode:S.mode}; });
   if(shots&&!shotRooms[res.rid]&&res.mode==='play'){ shotRooms[res.rid]=1; await pg.waitForTimeout(1600);
     const buf=await pg.evaluate(()=>document.getElementById('dn-canvas').toDataURL()); require('fs').writeFileSync(D+'/shot_'+res.rid+'.png',Buffer.from(buf.split(',')[1],'base64')); }
   if(res.over) break; if(res.t>600) break; }
 const out=await pg.evaluate(()=>{ const S=__G.state(), w=S.w; return {win:S.win, over:S.over, room:w.rid, time:Math.round(w.runT), score:S.score, kills:w.kills, bestCombo:w.bestCombo, flawless:w.flawless, lastT:Math.round(w.lastT||0), lastDone:!!w.lastDone, lv:w.lv, coins:w.coins, hp:w.p.hp+'/'+w.p.max, revUsed:S.revUsed, answered:S.answered, correct:S.correct, build:w.b, rolls:__B.rolls, log:__B.log, dmg:__B.dmg, dmgBy:window.__dmg, seen:Object.keys(w.seen), en:w.en.map(e=>e.type+':'+e.st+'@'+Math.round(e.x)+','+Math.round(e.y)+' hp'+e.hp+' cd'+e.cd.toFixed(1)).join(' '), p:[Math.round(w.p.x),Math.round(w.p.y)], cleared:w.cleared, secret:w.secretOpen, crack:w.crack, pend:w.pend, resolve:w.resolve, mode:S.mode, held:JSON.stringify(Object.keys(__G.held||{})), open:w.open, spawns:w.spawns.length, wave:w.wave}; });
 if(shots){ await pg.waitForTimeout(500); await pg.screenshot({path:D+'/shot_end.png'}); }
 console.log(JSON.stringify(out,null,1)); console.log('errors',errs.slice(0,5)); await b.close(); })();
