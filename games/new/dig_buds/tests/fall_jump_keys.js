const {chromium}=require('playwright');(async()=>{const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});const p=await b.newPage({viewport:{width:1366,height:768}});
p.on('pageerror',e=>console.log('ERR',e.message));
await p.goto('file://'+(process.env.DIG_OUT||'/home/user/dig')+'/dig_buds_mult.html');await p.evaluate(()=>{localStorage.clear()});await p.reload();await p.evaluate(()=>__G.reseed(777));await p.reload();
await p.fill('#dg-nameinput','Test T');await p.click('#dg-go');await p.waitForTimeout(400);
await p.evaluate(()=>{__G.modal(null);__G.state().energy=300;});
const pos=()=>p.evaluate(()=>{const P=__G.P();return [+P.x.toFixed(2),+P.y.toFixed(2),+P.z.toFixed(2),!!P.fell,P.ground]});
// A: strafe along a tall wall: must not hop. Build a wall 3 high along x at z=27, stand beside it on flat pad
await p.evaluate(()=>{const P=__G.P();const y=50;for(let x=20;x<34;x++)for(let z=24;z<30;z++){__G.setBlock(x,y,z,3);for(let d=1;d<5;d++)__G.setBlock(x,y+d,z,0);} for(let x=20;x<34;x++)for(let d=1;d<4;d++)__G.setBlock(x,y+d,24,3);
  P.x=22.5;P.z=25.35;P.y=y+1.01;P.vy=0;P.yaw=Math.PI/2;P.pit=0;});await p.waitForTimeout(500);
let maxY=0;await p.evaluate(()=>{__G.hold('left',true)});for(let i=0;i<12;i++){await p.waitForTimeout(100);maxY=Math.max(maxY,(await pos())[1]);}await p.evaluate(()=>{__G.hold('left',false)});
console.log('strafe into tall wall: max y',maxY,'(start 51.01)',await pos());
// B: walk forward into a one-block step: must hop
await p.evaluate(()=>{const P=__G.P();__G.setBlock(27,51,27,3);P.x=24.5;P.z=27.5;P.y=51.01;P.yaw=Math.PI/2;});await p.waitForTimeout(300);
await p.evaluate(()=>{__G.hold('up',true)});await p.waitForTimeout(1500);await p.evaluate(()=>{__G.hold('up',false)});console.log('step hop',await pos());
// C: dig down with X into a hollow: carve a cavern under the player
await p.evaluate(()=>{const P=__G.P();for(let x=20;x<26;x++)for(let z=25;z<30;z++)for(let y=38;y<48;y++)__G.setBlock(x,y,z,0);P.x=22.5;P.z=27.5;P.y=51.01;});await p.waitForTimeout(400);
await p.evaluate(()=>{__G.hold('digdown',true)});await p.waitForTimeout(3500);await p.evaluate(()=>{__G.hold('digdown',false)});await p.waitForTimeout(800);console.log('after fall',await pos());await p.screenshot({path:'f_fell.png'});console.log('rbtn hidden',await p.evaluate(()=>document.getElementById('dg-rbtn').hidden));
await p.click('#dg-rbtn');await p.waitForTimeout(700);console.log('rbtn hidden after',await p.evaluate(()=>document.getElementById('dg-rbtn').hidden));console.log('after R',await pos());await p.waitForTimeout(1200);console.log('still there',await pos());
// D: walk off an edge into the hole
await p.evaluate(()=>{const P=__G.P();for(let y=48;y<51;y++)__G.setBlock(23,y,28,0);__G.setBlock(23,50,28,0);P.x=22.5;P.z=28.5;P.y=51.01;P.yaw=Math.PI/2;P.fell=null;});await p.waitForTimeout(500);
await p.evaluate(()=>{__G.hold('up',true)});await p.waitForTimeout(500);await p.evaluate(()=>{__G.hold('up',false)});await p.waitForTimeout(1500);console.log('walked off',await pos());
await p.keyboard.press('r');await p.waitForTimeout(1500);console.log('after R',await pos());
await p.evaluate(()=>{const P=__G.P();P.x=30.5;P.z=30.5;P.y=__G.topY(30,30)+0.01});await p.waitForTimeout(3200);await p.click('#dg-hbtn');await p.waitForTimeout(600);console.log('H button',await pos());await p.setViewportSize({width:1366,height:620});await p.waitForTimeout(400);await p.screenshot({path:'f_dock620.png'});await b.close()})()
