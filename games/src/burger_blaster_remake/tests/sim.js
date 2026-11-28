// Fast bot runs of a Burger Blaster v2 build. node sim.js <file.html> <policy> <runs> [set]
// policies: strong typical weak zero guess spam
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const http=require('http'),fs=require('fs'),path=require('path');
const FILE=path.resolve(process.argv[2]), POL=process.argv[3], RUNS=+process.argv[4]||10, SET=process.argv[5]||'slope';
const DIR=path.dirname(FILE);
const P={ strong:{acc:1,na:1.3,np:0.02,wind:1,log:1}, typical:{acc:0.7,na:3,np:0.05,wind:0.6}, weak:{acc:0.5,na:5,np:0.08,wind:0.3}, zero:{acc:0,na:1.3,np:0.02,wind:1}, guess:{acc:-1,na:1.3,np:0.02,wind:1}, spam:{acc:1,spam:1}, zerotyp:{acc:0,na:2.2,np:0.035,wind:0.6} }[POL];
const srv=http.createServer((q,r)=>{ const f=path.join(DIR,decodeURIComponent(q.url.split('?')[0])); fs.readFile(f,(e,b)=>{ if(e){r.writeHead(404);return r.end();} r.writeHead(200,{'Content-Type':{'.html':'text/html','.js':'text/javascript'}[path.extname(f)]||'application/octet-stream'}); r.end(b); }); }).listen(0);
(async()=>{ await new Promise(r=>srv.on('listening',r)); const port=srv.address().port; const b=await chromium.launch(); const out=[];
 for(let run=0;run<RUNS;run++){ const pg=await b.newPage({viewport:{width:1366,height:768}}); const errs=[]; pg.on('pageerror',e=>errs.push(String(e)));
  await pg.goto(`http://localhost:${port}/${path.basename(FILE)}?set=${SET}`); await pg.evaluate(()=>localStorage.clear()); await pg.reload(); await pg.waitForTimeout(400);
  await pg.fill('#bl-nameinput','T S'); await pg.click('#bl-go'); await pg.waitForTimeout(200);
  const res=await pg.evaluate((P)=>{ const S=__G.state(); __G2.fast(true); let shots=0, trayQ=0, guard=0, fortsAt=[];
    const gauss=()=>{ let u=0,v=0; while(!u) u=Math.random(); while(!v) v=Math.random(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); };
    while(!S.over && guard++<400){
      if(S.tray){ const q=S.tray.q; if(!S.tray.done){ const ok=q.choices.findIndex(c=>c.ok); let i; if(P.acc<0) i=Math.floor(Math.random()*q.choices.length); else if(Math.random()<P.acc) i=ok; else { const w=q.choices.map((c,j)=>j).filter(j=>j!==ok); i=w[Math.floor(Math.random()*w.length)]; } __G2.trayAnswer(i); trayQ++; } __G2.trayNext(); continue; }
      if(S.clearing){ __G2.finish(); continue; }
      if(__G2.outNow()){ __G.settle(600); if(__G2.outNow()){ __G2.endRun(); break; } continue; }
      if(!__G.canFire()){ __G.settle(300); __G.step(30); continue; }
      let a,p, tgt;
      if(P.spam){ a=8; p=0.62; }
      else { const ms=__G.munchList(); const bl=__G.world().blockList; const tn=bl.filter(x=>x[0]==='tnt');
        const pick=Math.random(); if(tn.length&&pick<0.3){ const t=tn[Math.floor(Math.random()*tn.length)]; tgt=[t[1],t[2]]; } else { const m=ms[Math.floor(Math.random()*ms.length)]; tgt=[m.x,m.y]; }
        const W_=S.wind||0, wpath=(aa,pp)=>{ const r=aa*Math.PI/180, v=pp*23; let x=__G.SL.x, y=__G.SL.y, vx=Math.cos(r)*v, vy=-Math.sin(r)*v, o=[]; for(let i=1;i<=500;i++){ vx*=0.998; vy=vy*0.998+0.27778; if(i<240&&y<__G.GY-40) vx+=W_*(P.wind||0); x+=vx; y+=vy; o.push([x,y]); if(y>__G.GY||x>1700) break; } return o; };
        let best=null; for(let aa=-5;aa<=75;aa+=1.5) for(let pp=0.4;pp<=1.001;pp+=0.015){ const pts=wpath(aa,pp); let hit=false; for(const q of pts){ if(Math.hypot(q[0]-tgt[0],q[1]-tgt[1])<16){ hit=true; break; } } if(hit){ best=[aa,pp]; break; } }
        if(!best) best=[40,0.8]; a=best[0]+gauss()*P.na; p=best[1]*(1+gauss()*P.np); }
      const spec=__G.liveSpec? null:null; const had=S.spec.length?S.spec[0]:null;
      if(!__G.fire(a,p)) { __G.step(30); continue; } shots++;
      if(had&&tgt){ for(let k=0;k<160;k++){ __G.step(1); const f=__G.flyingList()[0]; if(!f) break; if(had==='hot'&&k>18) { __G.activate(); break; } if(Math.abs(f[2]-tgt[0])<(had==='bomb'?40:180)) { __G.activate(); break; } } }
      __G.settle(1500); __G.step(20); __G.settle(600);
      fortsAt.push(S.level); if(P.log) (window.__lg=window.__lg||[]).push([S.level,Math.round(S.score)]);
    }
    const per={}; fortsAt.forEach(l=>per[l]=(per[l]||0)+1); return {lg:JSON.stringify(window.__lg||[]),per:JSON.stringify(per), codes:__G2.order().map(f=>f.d).join(' '), fort:Math.min(S.level+1,10), stage:S.level, won:S.won, score:S.score, shots, trayQ, acc:S.answered?Math.round(100*S.correct/S.answered):0, burgersLeft:S.burgers, over:S.over};
  },P);
  res.errs=errs.length; res.estMin=+((res.shots*4.5+res.trayQ*6+res.stage*4)/60).toFixed(1); out.push(res); await pg.close(); }
 const avg=k=>+(out.reduce((s,r)=>s+r[k],0)/out.length).toFixed(1);
 console.log(JSON.stringify({pol:POL,runs:RUNS,wins:out.filter(r=>r.won).length,fortAvg:avg('fort'),scoreAvg:Math.round(avg('score')),shotsAvg:avg('shots'),qAvg:avg('trayQ'),minAvg:avg('estMin'),errs:out.reduce((s,r)=>s+r.errs,0),forts:out.map(r=>r.won?'W':r.fort).join(',')}));
 if(process.env.V) out.forEach(r=>console.log(r.fort,r.per,r.codes,r.lg));
 await b.close(); srv.close(); })();
