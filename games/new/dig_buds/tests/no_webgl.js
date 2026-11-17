const {chromium}=require('playwright');(async()=>{const b=await chromium.launch({args:process.argv[2]?['--disable-gpu','--disable-webgl','--disable-3d-apis']:[]});const p=await b.newPage({viewport:{width:1366,height:768}});
p.on('pageerror',e=>console.log('ERR',e.message));p.on('console',m=>{if(m.type()==='error')console.log('CON',m.text())});
await p.goto((process.env.DIG_URL||'http://localhost:8765')+'/dig_buds.html?set=mult');await p.waitForTimeout(800);
console.log('gl',await p.evaluate(()=>__G.glerr()));
await p.fill('#dg-nameinput','Test T');await p.click('#dg-go');await p.waitForTimeout(1500);await p.screenshot({path:'nogl'+(process.argv[2]||0)+'.png'});
await b.close()})()
