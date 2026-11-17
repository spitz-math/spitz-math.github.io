const {chromium}=require('playwright');(async()=>{const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
async function open(file,thr){const p=await b.newPage({viewport:{width:1366,height:768}});p.on('pageerror',e=>console.log('ERR',file,e.message));
 await p.goto('file://'+(process.env.DIG_OUT||'/home/user/dig')+'/'+file);await p.fill('#dg-nameinput','Test T');await p.click('#dg-go');await p.waitForTimeout(400);await p.evaluate(()=>{__G.modal(null);const S=__G.state();S.energy=9999;S.pick=4;S.inv[21]=5;S.inv[19]=9;});
 if(thr){const c=await p.context().newCDPSession(p);await c.send('Emulation.setCPUThrottlingRate',{rate:6});}return p;}
// functional: chest mine + dynamite + home key
let p=await open('dig_buds_mult.html');
const c=await p.evaluate(()=>{for(let y=38;y>1;y--)for(let x=0;x<80;x++)for(let z=0;z<80;z++)if(__G.get(x,y,z)===22){const P=__G.P();for(let a=-2;a<=0;a++)for(let h=0;h<=2;h++){if(a===0&&h===0)continue;const v=__G.get(x+a,y+h,z);if(v&&v!==12&&v!==22)__G.setBlock(x+a,y+h,z,0);}for(let a=-2;a<0;a++)if(!__G.get(x+a,y-1,z))__G.setBlock(x+a,y-1,z,3);P.x=x-1.4;P.y=y;P.z=z+.5;P.yaw=Math.PI/2;P.pit=-0.75;P.peak=P.y;P.vy=0;return [x,y,z];}});
await p.waitForTimeout(300);console.log('tgt',await p.evaluate(()=>__G.tgt()&&__G.tgt().b));
await p.evaluate(()=>{__G.hold('mine',true)});await p.waitForTimeout(700);await p.evaluate(()=>{__G.hold('mine',false)});
console.log('chest',c,await p.evaluate(()=>[__G.state().chests,JSON.stringify(__G.state().inv),__G.state().score]));
await p.keyboard.press('h');await p.waitForTimeout(300);console.log('home',await p.evaluate(()=>[__G.P().x,__G.P().y,__G.state().surf]));
// dynamite: place & wait
await p.evaluate(()=>{const P=__G.P();P.pit=-1.2;__G.state().sel=7;});await p.waitForTimeout(200);await p.evaluate(()=>__G.place());await p.waitForTimeout(3200);
console.log('boom',await p.evaluate(()=>[__G.state().mined,__G.hp(),__G.fps()]));
// walk test (footsteps counter) + goal progression
await p.evaluate(()=>{__G.hold('up',true)});await p.waitForTimeout(1500);await p.evaluate(()=>{__G.hold('up',false)});
console.log('goal',await p.evaluate(()=>[__G.state().goal,__G.state().score,window.__snd]));
await p.close();
// speed at 6x CPU slowdown (software graphics here, so compare runs with each other, not with a real Chromebook)
for(const f of ['dig_buds_mult.html']){ p=await open(f,true);await p.waitForTimeout(4000);const a=await p.evaluate(()=>__G.fps());
 const m=await p.evaluate(async()=>{const S=__G.state(),P=__G.P();P.pit=-1.5;const t=[];for(let i=0;i<6;i++){__G.update(0.016);__G.mine();const n=S.mined;const t0=performance.now();for(let k=0;k<200&&S.mined<=n;k++)__G.update(0.05);t.push(Math.round(performance.now()-t0));}return t});
 if(f==='dig_buds_mult.html'){await p.evaluate(()=>__G.night(100));await p.waitForTimeout(4000);}
 console.log(f,'fps@6x',a.toFixed(1),'mine ms',m, 'night fps',(await p.evaluate(()=>__G.fps())).toFixed(1));await p.close();}
await b.close()})()
