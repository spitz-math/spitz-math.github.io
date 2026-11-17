const {chromium}=require('playwright');(async()=>{const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});const p=await b.newPage({viewport:{width:1366,height:768}});
p.on('pageerror',e=>console.log('ERR',e.message));
await p.goto('file://'+(process.env.DIG_OUT||'/home/user/dig')+'/dig_buds_mult.html');await p.evaluate(()=>__G.reseed(777));await p.reload();await p.waitForTimeout(300);await p.screenshot({path:'r_start.png'});
await p.fill('#dg-nameinput','Test T');await p.click('#dg-go');await p.waitForTimeout(400);
await p.evaluate(()=>{__G.modal(null);const S=__G.state();S.energy=60;});await p.waitForTimeout(600);await p.screenshot({path:'r_surface.png'});
// walk to nearest bud's column
const bud=await p.evaluate(()=>{const P=__G.P();let best=null,bd=1e9;__G.buds().forEach(b=>{const d=Math.hypot(b.x-P.x,b.z-P.z);if(d<bd){bd=d;best=b}});P.x=best.x-3;P.z=best.z;P.y=__G.topY(Math.floor(P.x),Math.floor(P.z))+0.01;P.peak=P.y;P.yaw=Math.PI/2;P.pit=0.25;return [best.i,best.x,best.y,best.z,P.y]});console.log('bud',bud);
await p.waitForTimeout(500);await p.screenshot({path:'r_beam.png'});
await p.evaluate((b)=>{const P=__G.P();P.x=b[1];P.z=b[3];P.y=__G.topY(Math.floor(b[1]),Math.floor(b[3]))+0.01;P.pit=-1.5;__G.hold('mine',true)},bud);
let t0=Date.now(),log=[];for(let i=0;i<60;i++){await p.waitForTimeout(500);const s=await p.evaluate(()=>{const S=__G.state();return [S.buds.filter(Boolean).length,S.energy,S.mined,S.chests,+__G.P().y.toFixed(1),S.score,S.goal]});log.push(s);if(s[0]>0||s[1]<1)break;}
console.log('dig secs',(Date.now()-t0)/1000,JSON.stringify(log[log.length-1]),JSON.stringify(log.filter((x,i)=>i%6==0)));
await p.evaluate(()=>__G.hold('mine',false));await p.waitForTimeout(400);await p.screenshot({path:'r_rescued.png'});
// climb out of a fresh shaft
await p.evaluate(()=>{const P=__G.P();P.x=30.5;P.z=30.5;P.y=__G.topY(30,30)+0.01;P.peak=P.y;P.vy=0;P.pit=-1.5;__G.state().energy=40;__G.hold('mine',true)});await p.waitForTimeout(5000);await p.evaluate(()=>__G.hold('mine',false));
const y0=await p.evaluate(()=>[__G.P().y,__G.topY(30,30),__G.state().energy]);await p.evaluate(()=>__G.hold('jump',true));await p.waitForTimeout(3000);await p.screenshot({path:'r_shaft.png'});await p.evaluate(()=>__G.hold('up',true));await p.waitForTimeout(2500);const y1=await p.evaluate(()=>[__G.P().y,__G.P().x,__G.P().z,__G.hp()]);await p.evaluate(()=>{__G.hold('jump',false);__G.hold('up',false)});console.log('climb',y0,y1);
// sideways doorway dig
await p.evaluate(()=>{const P=__G.P();P.pit=-0.1;P.yaw=0;__G.state().energy=50;__G.hold('mine',true);__G.hold('up',true)});await p.waitForTimeout(4000);await p.evaluate(()=>{__G.hold('mine',false);__G.hold('up',false)});
console.log('tunnel',await p.evaluate(()=>[__G.P().x.toFixed(1),__G.P().z.toFixed(1),__G.state().mined,__G.state().energy]));
await p.evaluate(()=>{__G.state().cash=200;__G.modal('shop')});await p.waitForTimeout(300);await p.click('.dg-buy[data-p="tnt"]');await p.waitForTimeout(200);await p.screenshot({path:'r_shop.png'});
await p.evaluate(()=>{__G.modal(null);__G.P().pit=-1.2;});await p.waitForTimeout(200);await p.evaluate(()=>__G.place());await p.waitForTimeout(600);await p.screenshot({path:'r_tnt.png'});await p.waitForTimeout(1600);
console.log('tnt',await p.evaluate(()=>[__G.state().inv[21],__G.state().mined,__G.hp(),__G.fps()]));
await p.evaluate(()=>__G.end());await p.waitForTimeout(2500);await p.screenshot({path:'r_end.png'});
await b.close()})()
