const {chromium}=require('playwright');(async()=>{const seed=+process.argv[2]||4242, ansMs=+process.argv[3]||3500, acc=+process.argv[4]||0.85, file=process.argv[5]||'dig_buds_mult.html';
const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});const p=await b.newPage({viewport:{width:1366,height:768}});
const errs=[];p.on('pageerror',e=>{errs.push(e.message);console.log('ERR',e.message)});
await p.goto((process.env.DIG_URL||'http://localhost:8765')+'/'+file);await p.evaluate(()=>{localStorage.clear()});await p.reload();await p.evaluate((s)=>__G.reseed(s),seed);await p.reload();
await p.fill('#dg-nameinput','Bot B');await p.click('#dg-go');await p.waitForTimeout(300);
const t0=Date.now(),ev=[];let lastN=0,shots=0,stuckT=0,lastPos='';
while(true){const st=await p.evaluate(()=>{const S=__G.state(),P=__G.P();return {over:S.over,e:S.energy,M:__G.M(),n:S.buds.filter(Boolean).length,score:S.score,cash:S.cash,x:P.x,y:P.y,z:P.z,surf:S.surf,hp:__G.hp(),ch:S.chests,goal:S.goal,ans:S.answered,lv:S.lv.bucket}});
 if(st.over)break; const el=(Date.now()-t0)/1000;
 if(st.n!==lastN){ev.push([Math.round(el),st.n,st.score]);lastN=st.n; if(shots<2){await p.waitForTimeout(700);await p.screenshot({path:'bot_rescue'+(shots++)+'.png'});}}
 if(st.e<2){ if(st.M!=='q')await p.evaluate(()=>{['up','jump','digdown'].forEach(k=>__G.hold(k,false));__G.modal('q')});
   for(let i=0;i<5;i++){await p.waitForTimeout(ansMs);const o=await p.evaluate((acc)=>{const S=__G.state();if(S.over||!S.q||S.qDone)return 0;const ok=S.q.choices.findIndex(c=>c.ok);__G.answer(Math.random()<acc?ok:(ok+1)%S.q.choices.length);return 1},acc);
     if(!await p.evaluate(()=>__G.fast)){await p.waitForTimeout(1900);await p.evaluate(()=>{const n=document.getElementById('dg-next');if(!n.disabled)n.click()});}}
   await p.evaluate(()=>{const S=__G.state();__G.modal('shop');for(const id of ['drill','magnet','bucket','luck','drill','scan','magnet','bucket']){const bt=document.querySelector('.dg-buy[data-u="'+id+'"]');if(bt&&!bt.disabled){bt.click();}}__G.modal(null)});continue;}
 const r=await p.evaluate(()=>{const P=__G.P(),S=__G.state();let best=null,bd=1e9;__G.buds().forEach(b=>{if(b.home||(b.i===6&&S.buds.slice(0,6).filter(Boolean).length<6))return;if(!best)best=b});
   if(!best){__G.hold('digdown',true);return 'free';}
   const hd=Math.hypot(best.x-P.x,best.z-P.z),deep=P.y<S.surf-6;
   if(hd<0.6){__G.hold('up',false);__G.hold('jump',false);__G.hold('digdown',true);return 'dig';}
   __G.hold('digdown',false);
   if(deep&&hd>3){document.dispatchEvent(new KeyboardEvent('keydown',{key:'h'}));return 'home';}
   P.yaw=Math.atan2(best.x-P.x,-(best.z-P.z));P.pit=-0.2;__G.hold('up',true);__G.hold('jump',true);return 'walk';});
 const pos=Math.round(st.x)+','+Math.round(st.y)+','+Math.round(st.z);if(pos===lastPos&&r==='walk'){stuckT++;if(stuckT>12){await p.evaluate(()=>{__G.hold('mine',true)});await p.waitForTimeout(600);await p.evaluate(()=>{__G.hold('mine',false)});stuckT=0;}}else stuckT=0;lastPos=pos;
 if(process.env.DBG&&Math.random()<0.08)console.log(Math.round(el),r,pos,'e',st.e,'n',st.n,await p.evaluate(()=>{const P=__G.P();let o=[];__G.buds().forEach(b=>{if(!b.home&&b.i<6)o.push([b.i,Math.round(Math.hypot(b.x-P.x,b.z-P.z)),Math.round(b.y)])});return JSON.stringify(o)}));
 await p.waitForTimeout(250);}
const fin=await p.evaluate(()=>{const S=__G.state();return {score:S.score,buds:S.buds,ans:S.answered,correct:S.correct,mined:S.mined,chests:S.chests,ores:S.ores,goal:S.goal,kos:S.kos,lv:S.lv,cash:S.cash,oreCash:S.oreCash}});
console.log('seed',seed,'ansMs',ansMs,JSON.stringify(fin),'rescues',JSON.stringify(ev),'errs',errs.length);await p.screenshot({path:'bot_end_'+seed+'.png'});await b.close()})()
