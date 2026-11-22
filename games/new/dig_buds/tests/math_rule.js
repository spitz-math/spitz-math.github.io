// Dig Buds math-rule bot (v20): node math_rule.js <policy> <seed> [url]. Policies: idle, right, one, wrong, guess, mash. Prints one JSON line; the rule is that 'wrong' still digs and rescues Buds, and 'right' outscores the rest.
// policies: idle, right, one (always first choice), wrong (always wrong), guess (random), mash (random real keys + clicks)
const {chromium}=require('playwright');(async()=>{const pol=process.argv[2]||'right',seed=+process.argv[3]||4242,url=process.argv[4]||(process.env.DIG_URL||'http://localhost:8791')+'/dig_buds_mult.html';
const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});const p=await b.newPage({viewport:{width:1366,height:620}});
const errs=[];p.on('pageerror',e=>{errs.push(e.message)});
await p.goto(url);await p.evaluate(()=>{localStorage.clear()});await p.reload();await p.evaluate((s)=>__G.reseed(s),seed);await p.reload();
await p.fill('#dg-nameinput','Bot B');await p.click('#dg-go');await p.waitForTimeout(300);
const t0=Date.now();let shopTick=0,ticks=0,menuTicks=0,firstDig=null,lastPos='',stuckT=0;
const keys=['1','2','3','4','Enter',' ','Escape','Tab','ArrowUp','ArrowLeft','w','a','s','d','q','b','h','e','r','f','n','m','Backspace','0','9'];
while(true){const st=await p.evaluate(()=>{const S=__G.state();return {over:S.over,e:S.energy,M:__G.M(),mined:S.mined,score:S.score}});
 if(st.over)break; const el=(Date.now()-t0)/1000; ticks++; if(st.M)menuTicks++; if(firstDig===null&&st.mined>0)firstDig=Math.round(el);
 if(pol==='idle'){await p.waitForTimeout(500);continue;}
 if(pol==='mash'){for(let i=0;i<3;i++){const k=keys[Math.floor(Math.random()*keys.length)];if(Math.random()<0.3){await p.keyboard.down(k);await p.waitForTimeout(150);await p.keyboard.up(k);}else await p.keyboard.press(k);
   if(Math.random()<0.4)await p.mouse.click(100+Math.random()*1166,80+Math.random()*460);await p.waitForTimeout(100);}continue;}
 if(st.M==='q'){ ['up','jump','digdown'].forEach(()=>{}); await p.evaluate(()=>{['up','jump','digdown','mine'].forEach(k=>__G.hold(k,false))});
   const done=await p.evaluate((pol)=>{const S=__G.state();if(!S.q)return 0;if(S.qDone){const n=document.getElementById('dg-next');if(!n.disabled){n.click();}return 0;}
     const n=S.q.choices.length,ok=S.q.choices.findIndex(c=>c.ok);const pick=pol==='right'?ok:pol==='one'?0:pol==='wrong'?(ok+1)%n:Math.floor(Math.random()*n);__G.answer(pick);return 1},pol);
   await p.waitForTimeout(done?1200:400); ticks+=done?4:1; menuTicks+=done?4:1; continue;}
 if(++shopTick%120===0) await p.evaluate(()=>{__G.modal('shop');for(const id of ['drill','magnet','bucket','luck','drill','scan','magnet','bucket']){const bt=document.querySelector('.dg-buy[data-u="'+id+'"]');if(bt&&!bt.disabled){bt.click();}}__G.modal(null)});
 const r=await p.evaluate(()=>{const P=__G.P(),S=__G.state();let best=null;__G.buds().forEach(b=>{if(b.home||(b.i===6&&S.buds.slice(0,6).filter(Boolean).length<6))return;if(!best)best=b});
   if(!best){__G.hold('digdown',true);return 'free';}
   const hd=Math.hypot(best.x-P.x,best.z-P.z),deep=P.y<S.surf-6;
   if(hd<0.6){__G.hold('up',false);__G.hold('jump',false);__G.hold('digdown',true);return 'dig';}
   __G.hold('digdown',false); if(deep&&hd>3){document.dispatchEvent(new KeyboardEvent('keydown',{key:'h'}));return 'home';}
   P.yaw=Math.atan2(best.x-P.x,-(best.z-P.z));P.pit=-0.2;__G.hold('up',true);__G.hold('jump',true);return 'walk';});
 const P=await p.evaluate(()=>{const P=__G.P();return Math.round(P.x)+','+Math.round(P.y)+','+Math.round(P.z)});if(P===lastPos&&r==='walk'){stuckT++;if(stuckT>12){await p.evaluate(()=>__G.hold('mine',true));await p.waitForTimeout(600);await p.evaluate(()=>__G.hold('mine',false));stuckT=0;}}else stuckT=0;lastPos=P;
 await p.waitForTimeout(250);}
const fin=await p.evaluate(()=>{const S=__G.state();return {score:S.score,buds:S.buds.filter(Boolean).length,ans:S.answered,correct:S.correct,mined:S.mined,chests:S.chests,cash:S.cash,caves:Object.keys(S.caves||{}).length,stops:S.stopsDone,playT:Math.round(S.playT||0)}});
console.log(JSON.stringify({pol,seed,...fin,firstDig,menuPct:Math.round(100*menuTicks/Math.max(1,ticks)),errs:errs.length,err1:errs[0]||''}));await p.screenshot({path:'end_'+pol+'_'+seed+'.png'});await b.close()})()
