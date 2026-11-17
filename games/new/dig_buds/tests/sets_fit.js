const {chromium}=require('playwright');(async()=>{const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
for(const s of ["mult","slope","point","hoy","shift","func","int","sq","plot0","plot","fam","fslope","stdform","slide","perp","solve","evalf","dr","rate","icpt"]){const p=await b.newPage({viewport:{width:1366,height:768}});
 await p.goto((process.env.DIG_URL||'http://localhost:8765')+'/dig_buds.html?set='+s);await p.evaluate(()=>{localStorage.clear()});await p.reload();
 await p.fill('#dg-nameinput','Test T');await p.click('#dg-go');await p.waitForTimeout(300);
 const r=await p.evaluate(async()=>{let worst=0,cut=0;const S=__G.state();const qq=document.getElementById('dg-q'),m=document.getElementById('dg-qm');for(let i=0;i<50;i++){const q=S.q;const ok=q.choices.findIndex(c=>c.ok);__G.answer(i%2?(ok+1)%q.choices.length:ok);
   const kids=[...qq.children];const last=document.getElementById('dg-next').getBoundingClientRect(),box=qq.getBoundingClientRect(),mb=m.getBoundingClientRect(),foot=m.querySelector('.dg-mfoot').getBoundingClientRect();
   const stg=document.getElementById("stage").getBoundingClientRect(); const d=Math.round(Math.max(mb.bottom-stg.bottom, stg.top-mb.top, last.bottom-box.bottom)); worst=Math.max(worst,d, Math.round(foot.bottom-mb.bottom)); if(d>2||foot.bottom>mb.bottom+2){cut++; if(cut===1) window.__cutq=i;}
   if(cut===1&&window.__cutq===i) await new Promise(r=>setTimeout(r,2500));
   document.getElementById('dg-next').disabled=false;document.getElementById('dg-next').click();}
  return {worst,cut}});
 console.log(s,JSON.stringify(r)); await p.close();}
await b.close()})()
