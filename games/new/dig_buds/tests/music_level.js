const {chromium}=require('playwright');const fs=require('fs');(async()=>{const b=await chromium.launch();
for(const f of process.argv.slice(2)){const p=await b.newPage();p.on('pageerror',e=>console.log('ERR',e.message));
await p.goto((process.env.DIG_URL||'http://localhost:8765')+'/'+f+'?set=mult');await p.waitForTimeout(600);
const r=await p.evaluate(async()=>{const m=await __music(64);return m});
console.log(f,JSON.stringify(r),'rms dB',(20*Math.log10(r.rms)).toFixed(1),'peak dB',(20*Math.log10(r.peak)).toFixed(1));await p.close();}
await b.close()})()
