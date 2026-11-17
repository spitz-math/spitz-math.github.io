const {chromium}=require('playwright');
const F=process.argv[2], OUT=process.argv[3]||'/tmp/claude-0/sc/jmr/';
(async()=>{ const b=await chromium.launch(); const p=await (await b.newContext({viewport:{width:1920,height:1080}})).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
  await p.goto('file://'+F); await p.waitForTimeout(800); await p.screenshot({path:OUT+'title.png'});
  await p.fill('#jm-nameinput','Test K'); await p.click('#jm-go'); await p.waitForTimeout(300);
  await p.evaluate(()=>{ const s=__G.state(); s.energy=999; s.streak=12; s.jumps=5; });
  for(const [name,floor] of [['z0',0],['z0b',6],['z1',18],['z1b',30],['z2',45],['z3',82],['z4',125]]){
    await p.evaluate((fi)=>{ const G=__G, S=G.state(), P=G.man(); let pl=G.plats(); while(pl.length<fi+30){ P.h+=3000; G.step(1/60); pl=G.plats(); }
      const q=pl[fi]; P.on=q; P.h=q.h; P.x=q.floor?400:G.cxAt(q); P.vx=300; P.vy=0; P.lastI=fi; S.pi=fi; S.energy=999; S.top=Math.max(S.top,q.h); G.key('r',true); for(let k=0;k<40;k++) G.step(1/60); G.key('r',false); },floor);
    await p.waitForTimeout(250); await p.locator('#jm-canvas').screenshot({path:OUT+name+'.png'}); }
  // a jump mid-air
  await p.evaluate(()=>{ __G.jump(); for(let k=0;k<12;k++) __G.step(1/60); }); await p.waitForTimeout(100); await p.locator('#jm-canvas').screenshot({path:OUT+'air.png'});
  console.log('errors',errs); await b.close(); })();
