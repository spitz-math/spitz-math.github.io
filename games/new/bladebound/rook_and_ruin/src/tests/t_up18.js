const {chromium}=require('playwright'); const D=require('path').join(__dirname,'..','out');
(async()=>{ const b=await chromium.launch(); const pg=await (await b.newContext({viewport:{width:1366,height:620}})).newPage();
 await pg.goto('file://'+D+'/rook_and_ruin_mult.html'); await pg.evaluate('localStorage.clear()'); await pg.reload(); await pg.waitForTimeout(600);
 await pg.fill('#dn-nameinput','Test T'); await pg.click('#dn-go'); await pg.waitForTimeout(300); await pg.keyboard.press('Escape'); await pg.waitForTimeout(1200);
 const r=await pg.evaluate(()=>{ const p=__G.state().w.p, out={}; for(const [nm,a] of [['up',-Math.PI/2],['down',Math.PI/2],['right',0]]){ out[nm]=[]; for(const el of [0.02,0.08,0.13,0.18]){ p.sw=0.2-el; p.spin=0; p.swA=a; p.roll=0; p.rec=0; out[nm].push(__G.pose()[2]); } } p.sw=0; return out; });
 console.log(JSON.stringify(r)); const ok=r.up.join()==='0,1,2,2'&&r.down.join()==='0,1,2,2'&&r.right.join()==='0,1,2,2'; console.log('errors',ok?'[]':'["slash poses wrong"]'); await b.close(); })();
