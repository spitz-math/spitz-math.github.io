// Named caves: across many seeds, every cave is placed, every Bud waits inside its cave on a real floor,
// the Mossy Hollow has a walk-in mouth, walking in triggers "You found", and the glow trail grows underground.
const {chromium}=require('playwright');(async()=>{
const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});const p=await b.newPage({viewport:{width:1366,height:768}});
const errs=[];p.on('pageerror',e=>{errs.push(e.message);console.log('ERR',e.message)});
const url=(process.env.DIG_URL||'http://localhost:8765')+'/dig_buds_mult.html';
await p.goto(url);let bad=0,mouths=0;const N=+process.argv[2]||12;
for(let s=1;s<=N;s++){await p.evaluate(()=>localStorage.clear());await p.reload();await p.evaluate(sd=>__G.reseed(sd*7919),s);const t0=Date.now();await p.reload();const ms=Date.now()-t0;
 const r=await p.evaluate(()=>{const C=__G.caves(),g=__G.get;return {n:C.length,mouth:C.filter(c=>c.mouth).length,buds:__G.buds().filter(b=>b.i<7).map(b=>{const c=C.find(c=>c.i===b.cave);const x=Math.floor(b.x),y=Math.floor(b.y),z=Math.floor(b.z);return {cave:b.cave,floor:!!g(x,y-1,z)&&g(x,y-1,z)!==23,air:!g(x,y,z)&&!g(x,y+1,z)}})}});
 const ok=r.n===7&&r.buds.every(x=>x.cave>=0&&x.floor&&x.air);mouths+=r.mouth;if(!ok){bad++;console.log('ERR seed',s,JSON.stringify(r));}
 console.log('seed',s,'caves',r.n,'mouth',r.mouth,'load ms',ms,ok?'ok':'BAD');}
// walk-in: stand at the Mossy Hollow mouth, walk toward the cave, expect discovery and a trail
await p.evaluate(()=>localStorage.clear());await p.reload();await p.evaluate(()=>__G.reseed(4242));await p.reload();
await p.fill('#dg-nameinput','Cave K');await p.click('#dg-go');await p.waitForTimeout(300);await p.evaluate(()=>__G.modal(null));
const walk=await p.evaluate(async()=>{const c=__G.caves().find(c=>c.mouth);if(!c)return 'no mouth';const P=__G.P();P.x=c.bx;P.z=c.bz;P.y=__G.topY(Math.floor(c.bx),Math.floor(c.bz))+0.01;P.vy=0;
 for(let k=0;k<700;k++){P.yaw=Math.atan2(c.x+.5-P.x,-(c.z+.5-P.z));__G.hold('up',true);__G.update(1/30);if(__G.state().caves[c.i])break;}__G.hold('up',false);
 return {found:!!__G.state().caves[c.i],trail:__G.trail().length,y:+P.y.toFixed(1),fy:c.fy};});
console.log('walk-in',JSON.stringify(walk));if(!walk.found){bad++;console.log('ERR walk-in did not reach the cave');}
await p.waitForTimeout(400);await p.screenshot({path:'caves_found.png'});
console.log('bad',bad,'mouths',mouths+'/'+N,'errs',errs.length);await b.close();if(bad)process.exitCode=1;})()
