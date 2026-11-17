const {chromium}=require('playwright');(async()=>{const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});const p=await b.newPage({viewport:{width:1366,height:768}});
p.on('pageerror',e=>console.log('ERR',e.message));
await p.goto('file://'+(process.env.DIG_OUT||'/home/user/dig')+'/dig_buds_mult.html');await p.evaluate(()=>{localStorage.clear()});await p.reload();
await p.fill('#dg-nameinput','Levi S');await p.click('#dg-go');await p.waitForTimeout(400);
await p.evaluate(()=>{__G.modal('q');});await p.waitForTimeout(300);
for(let i=0;i<6;i++){await p.evaluate(()=>{const S=__G.state();if(S.q&&!S.qDone)__G.answer(S.q.choices.findIndex(c=>c.ok));});await p.waitForTimeout(1800);}
await p.evaluate(()=>{__G.modal(null);__G.state().score=4321;__G.end()});await p.waitForTimeout(2500);await p.screenshot({path:'v_end2.png'});
console.log(await p.evaluate(()=>document.getElementById('dg-end').innerText.replace(/\n+/g,' | ').slice(0,500)));
await b.close()})()
