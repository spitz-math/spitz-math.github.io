/* v14 rapid-input stress: random directions, swings, dodges, Shield Bash, Aegis blocks, spins, damage and restarts
   with every enemy type around, through the real loop. Checks: no errors, poses keep changing, Rook still moves after. */
const {chromium}=require('playwright'); const D=require('path').join(__dirname,'..','out');
(async()=>{ const b=await chromium.launch(); const pg=await (await b.newContext({viewport:{width:1366,height:768}})).newPage();
 const errs=[]; pg.on('pageerror',e=>errs.push(String(e)));
 await pg.goto('file://'+D+'/rook_and_ruin_fonts.html'); await pg.evaluate('localStorage.clear()'); await pg.reload(); await pg.waitForTimeout(700);
 await pg.fill('#dn-nameinput','Test T'); await pg.click('#dn-go'); await pg.waitForTimeout(300); await pg.click('#dn-skip'); await pg.waitForTimeout(200);
 const keys=['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'];
 for(let round=0;round<3;round++){
  await pg.evaluate((round)=>{ const S=__G.state(), w=S.w; ['whirl','bash','aegis','thorns'].forEach(id=>__G.give(id,round===1?3:1)); S.w.p.hp=99;
    ['gob','gob','skel','wiz','bat','slime','boss'].forEach((t,i)=>{ const e=__G.spawn(t,200+i*90,140+(i%2)*260); if(t==='boss'){ e.hp=e.max=99999; } }); },round);
  const poses=new Set(); let last='';
  for(let i=0;i<260;i++){ const r=Math.random();
    if(r<0.35){ const k=keys[Math.floor(Math.random()*4)]; await pg.keyboard.down(k); await pg.waitForTimeout(20+Math.random()*60); await pg.keyboard.up(k); }
    else if(r<0.6) await pg.keyboard.press('Space');
    else if(r<0.75) await pg.keyboard.press('Shift');
    else if(r<0.82) await pg.evaluate(()=>{ const p=__G.state().w.p; p.inv=0; p.sh=0; });   // let the next hit land (Aegis blocks or real damage)
    else await pg.waitForTimeout(30);
    const pz=await pg.evaluate(()=>{ const S=__G.state(); if(S.mode!=='play'){ if(S.mode==='pick'||S.mode==='ask') S.mode='play'; } S.w.p.hp=Math.max(S.w.p.hp,5); const p=__G.pose(); return p.join(','); });
    poses.add(pz.split(',').slice(0,1).join()+':'+pz.split(',')[2]); }
  const st=await pg.evaluate(()=>{ const S=__G.state(), w=S.w, p=w.p; S.mode='play'; const x0=p.x; __G.hold('arrowright',1); for(let i=0;i<30;i++) __G.step(1/60); __G.hold('arrowright',0);
    const fr={}; w.en.forEach(e=>{ if(!e.dead&&__G.eframe&&e.type!=='bat'&&e.type!=='slime'){ const f=__G.eframe(e); fr[e.type+':'+f.n+':'+f.col]=1; } });
    return {moved:Math.round(p.x-x0), mode:S.mode, roll:p.roll, sw:p.sw, blk:p.blkT, en:w.en.length, frames:Object.keys(fr)}; });
  console.log('round',round,'distinct poses',poses.size,[...poses].sort().join(' '),'\n  after:',JSON.stringify(st));
  await pg.evaluate(()=>{ __G.state().w.en=[]; }); }
 // restart from the end screen twice
 for(let k=0;k<2;k++){ await pg.evaluate(()=>{ __G.finish(false,'test'); __G.endShown(); }); await pg.waitForTimeout(1400); await pg.evaluate(()=>__G.playAgain()); await pg.waitForTimeout(600);
   const s=await pg.evaluate(()=>{ const S=__G.state(); return [S.mode,S.over,__G.pose()[0]]; }); console.log('restart',k,s);
   if(s[0]==='cut') { await pg.click('#dn-skip'); await pg.waitForTimeout(200); } }
 const fin=await pg.evaluate(()=>{ const S=__G.state(), p=S.w.p, x0=p.x; __G.hold('arrowleft',1); for(let i=0;i<30;i++) __G.step(1/60); __G.hold('arrowleft',0); return [S.mode,Math.round(p.x-x0)]; });
 console.log('after restarts',fin,'errors',errs); await b.close(); })();
