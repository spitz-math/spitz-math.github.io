const {chromium}=require('playwright');(async()=>{const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});const p=await b.newPage({viewport:{width:1366,height:768}});
p.on('pageerror',e=>console.log('ERR',e.message));
await p.goto('file://'+(process.env.DIG_OUT||'/home/user/dig')+'/dig_buds_mult.html');await p.evaluate(()=>__G.reseed(777));await p.reload();
await p.fill('#dg-nameinput','Test T');await p.click('#dg-go');await p.waitForTimeout(400);
await p.evaluate(()=>{const S=__G.state();S.energy=200;S.cash=135;__G.modal('shop');});await p.waitForTimeout(500);await p.screenshot({path:'s_shop.png'});
const fit=await p.evaluate(()=>{const m=document.getElementById('dg-shop').getBoundingClientRect(),st=document.getElementById('dg-shop');return [m.top,m.bottom,innerHeight,st.scrollHeight,st.clientHeight,[...document.querySelectorAll('#dg-shop .d')].filter(e=>e.scrollWidth>e.clientWidth).map(e=>e.textContent)]});console.log('shop',JSON.stringify(fit));
// baseline dig: 3 s of X
const dig=async(ms)=>{await p.evaluate(()=>__G.hold('digdown',true));await p.waitForTimeout(ms);await p.evaluate(()=>__G.hold('digdown',false));await p.waitForTimeout(300);return p.evaluate(()=>[+__G.P().y.toFixed(1),__G.state().energy,__G.state().cash,__G.state().mined])};
await p.evaluate(()=>{__G.modal(null);const P=__G.P();P.x=30.5;P.z=30.5;P.y=__G.topY(30,30)+1;});await p.waitForTimeout(500);
console.log('nodrill',await dig(4000));
await p.evaluate(()=>{__G.state().lv.drill=2;});console.log('drill2',await dig(4000));
// magnet + cash: place gold next to the dig
await p.evaluate(()=>{const S=__G.state(),P=__G.P();S.lv.magnet=1;S.lv.luck=1;const x=Math.floor(P.x),y=Math.floor(P.y-0.5),z=Math.floor(P.z);__G.setBlock(x+1,y,z,10);__G.setBlock(x-1,y-1,z,11);__G.setBlock(x,y-3,z,18);__G.setBlock(x,y-6,z,17);S.cash=0;});
console.log('magnet',await dig(2500),await p.evaluate(()=>[__G.state().buff.super,__G.state().oreCash]));
await p.evaluate(()=>{const S=__G.state(),P=__G.P();S.lv.scan=2;P.pit=0.2;});await p.waitForTimeout(900);await p.screenshot({path:'s_scan.png'});
await p.evaluate(()=>{const P=__G.P();const x=Math.floor(P.x),y=Math.floor(P.y),z=Math.floor(P.z);__G.setBlock(x+2,y,z,10);__G.setBlock(x+2,y+1,z,0);__G.setBlock(x+1,y,z,0);__G.setBlock(x+1,y+1,z,0);P.x=x+.5;P.z=z+.5;P.yaw=Math.PI/2;P.pit=0.25;});await p.waitForTimeout(700);await p.screenshot({path:'s_ore.png'});
console.log('tgt',await p.evaluate(()=>JSON.stringify(__G.tgt())));
await b.close()})()
