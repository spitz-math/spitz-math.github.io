// plays whole runs with the game's own update(), fast. node tools/bot.js [set] [runs]
const { chromium } = require('playwright');
const PROFILES={ weak:{acc:0.6,dodge:0.25,bank:1,dash:0,aim:0.5}, solid:{acc:0.85,dodge:0.7,bank:2,dash:0.4,aim:0.85}, strong:{acc:0.97,dodge:0.95,bank:3,dash:0.9,aim:1} };
(async()=>{ const b=await chromium.launch(); const set=process.argv[2]||'slope', runs=+(process.argv[3]||4), file=process.argv[4]||'star_swarm.html';
  for(const name of Object.keys(PROFILES)){ const out=[];
    for(let r=0;r<runs;r++){ const pg=await b.newPage({viewport:{width:1366,height:768}}); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
      await pg.goto('file://'+__dirname+'/../out/'+file+'?set='+set); await pg.waitForTimeout(300); await pg.evaluate(()=>{ localStorage.clear(); }); await pg.reload(); await pg.waitForTimeout(300);
      await pg.fill('#sw-nameinput','Bot B'); await pg.click('#sw-go'); await pg.waitForTimeout(100);
      const res=await pg.evaluate((P)=>{ const G=__G, S=G.state(), C=G.consts; G.pause(true); window.__noBlurDock=1; let steps=0, bossAt=null, bossDead=null, maxShots=0, heat=[], stuck=0; const log={};
        while(!S.over&&steps<200000){ steps++;
          if(G.draftOpen()){ G.noWait(); G.pick(Math.floor(Math.random()*3)); continue; }
          if(G.cardOpen()){ G.noWait(); const full=S.fuel>=G.cfg.fuel*Math.min(G.cfg.tank,P.bank)-0.05;
            if(S.qDone){ if(full&&S.fuel>0.05) G.launch(); else G.next(); if(G.cardOpen()&&S.qDone&&++stuck>50){ document.getElementById('sw-next').disabled=false; } continue; }
            stuck=0; if(full&&S.fuel>0.05){ G.launch(); continue; }
            const ok=Math.random()<P.acc, i=S.q.choices.findIndex(c=>!!c.ok===ok); G.answer(i<0?0:i); document.getElementById('sw-next').disabled=false; continue; }
          // flying
          const sh=G.ship(), en=G.enemies().filter(a=>!a.dead), shots=G.shots(); let dir=0;
          let danger=null; shots.forEach(s=>{ const dy=C.SHIP_Y-s.y; if(dy>0&&dy<230&&Math.abs(s.x+s.vx*(dy/Math.max(60,s.vy))-sh.x)<46) danger=danger||s; });
          en.forEach(a=>{ if((a.state==='dive'||a.state==='bomb')&&a.y>C.SHIP_Y-260&&Math.abs(a.x-sh.x)<70) danger=danger||a; });
          const bo=G.boss(); if(bo&&bo.beam>=1&&Math.abs(bo.x-sh.x)<110) danger=danger||{x:bo.x};
          if(danger&&Math.random()<P.dodge){ dir=sh.x<danger.x?-1:1; if(sh.x<120) dir=1; if(sh.x>C.W-120) dir=-1; if(Math.random()<P.dash*0.08) { G.key('l',dir<0); G.key('r',dir>0); G.dash(); } }
          else { let tx=null; const ru=G.rush(); if(bo&&!bo.dead&&bo.enter>=1){ const B=S.bossHp; tx=bo.x+(B&&B.l>0?-215:B&&B.r>0?215:0); if(bo.beam>=1&&B&&B.l<=0&&B.r<=0) tx=null; }
            else if(ru&&!ru.done){ const on=ru.bugs.filter(q=>!q.dead&&q.on); if(on.length) tx=on.reduce((m,q)=>Math.abs(q.x-sh.x)<Math.abs(m.x-sh.x)?q:m).x; }
            else if(en.length){ const t=en.reduce((m,a)=>Math.abs(a.x-sh.x)<Math.abs(m.x-sh.x)?a:m); tx=t.x; }
            const cp=G.caps()[0]; if(cp&&cp.y>500) tx=cp.x;
            if(tx!=null&&Math.random()<P.aim){ if(Math.abs(tx-sh.x)>14) dir=tx>sh.x?1:-1; } else if(tx!=null) dir=Math.random()<0.5?-1:1; }
          G.key('l',dir<0); G.key('r',dir>0); G.key('f',true);
          G.step(1/30); maxShots=Math.max(maxShots,shots.length);
          if(bo&&bossAt==null) bossAt=Math.round(S.flown); if(S.bossDown&&bossDead==null) bossDead=Math.round(S.flown);
          if(steps%900===0) heat.push(S.heat); }
        return {score:S.score,ans:S.answered,ok:S.correct,kills:S.kills,hurts:S.hurts,wave:S.wave,bossAt,bossDead,esc:S.escaped,picks:S.picks,chain:S.bestChain,phases:S.phases,maxShots,heat:heat.join(''),over:S.over,flown:Math.round(S.flown),steps}; },PROFILES[name]);
      res.errs=errs.slice(0,2); out.push(res); await pg.close(); }
    console.log(name, set); out.forEach(o=>console.log('  '+JSON.stringify(o))); }
  await b.close(); })();
