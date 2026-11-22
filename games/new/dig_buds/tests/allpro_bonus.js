const {chromium}=require('playwright');(async()=>{const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});const p=await b.newPage({viewport:{width:1366,height:620}});
p.on('pageerror',e=>console.log('ERR',e.message));
await p.goto('file://'+(process.env.DIG_OUT||'/home/user/dig')+'/dig_buds_mult.html');await p.evaluate(()=>{localStorage.clear()});await p.reload();await p.evaluate(()=>__G.reseed(777));await p.reload();
await p.click('#dg-pro');await p.fill('#dg-nameinput','Test T');await p.waitForTimeout(300);await p.screenshot({path:'v_start.png'});
console.log('go box',JSON.stringify(await p.evaluate(()=>{const r=document.getElementById('dg-go').getBoundingClientRect(),k=document.querySelector('.dg-keys').getBoundingClientRect();return [r.top,r.bottom,k.bottom,innerHeight]})));
await p.setViewportSize({width:1366,height:768});
await p.click('#dg-go');await p.waitForTimeout(400);
console.log('pro',await p.evaluate(()=>[__G.state().pro,localStorage.getItem('dig_buds_pro')]));
await p.evaluate(()=>{__G.modal(null);__G.state().energy=40;});
// wrong answer costs energy
await p.evaluate(()=>{__G.stop();});await p.waitForTimeout(300);
console.log('wrong',await p.evaluate(()=>{const S=__G.state();const e0=S.energy;const ok=S.q.choices.findIndex(c=>c.ok);__G.answer((ok+1)%S.q.choices.length);return [e0,S.energy]}));
await p.evaluate(()=>{__G.modal(null)});
for(const i of [0,1,2,3,4,5,6]){await p.evaluate((i)=>{const bd=__G.buds()[i],P=__G.P();P.x=bd.x;P.y=bd.y;P.z=bd.z;P.peak=P.y;P.vy=0;},i);await p.waitForTimeout(350);}
console.log('after star',await p.evaluate(()=>[__G.state().buds,__G.state().score,__G.state().bspot,__G.buds().length]));
await p.keyboard.press('h');await p.waitForTimeout(3400);await p.evaluate(()=>{const S=__G.state(),P=__G.P();P.yaw=Math.atan2(S.bspot[0]-P.x,-(S.bspot[2]-P.z));P.pit=0.15;});await p.waitForTimeout(600);await p.screenshot({path:'v_bonus.png'});
for(let k=0;k<3;k++){await p.evaluate(()=>{const bd=__G.buds()[7],P=__G.P();P.x=bd.x;P.y=bd.y;P.z=bd.z;P.peak=P.y;P.vy=0;});await p.waitForTimeout(500);if(k==0)await p.screenshot({path:'v_bonus2.png'});}
console.log('bonus',await p.evaluate(()=>[__G.state().bonus,__G.state().score,__G.state().bspot]));
await p.reload();await p.waitForTimeout(600);console.log('reload',await p.evaluate(()=>[__G.state().bonus,__G.buds().length,__G.buds()[7].y]));
await p.evaluate(()=>__G.end());await p.waitForTimeout(2500);await p.screenshot({path:'v_end.png'});
await b.close()})()
