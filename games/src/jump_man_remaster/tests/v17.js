// Super Jump Man v17: painted zone skies load, each zone shows its painting, no errors. node v17.js <mult copy> [outdir]
const {chromium}=require('playwright'); const F=process.argv[2], OUT=process.argv[3]||'/tmp/sjm17/'; let fails=0;
require('fs').mkdirSync(OUT,{recursive:true});
const ok=(c,m,v)=>{ if(!c) fails++; console.log(c?'  ok':'  FAIL',m,v===undefined?'':JSON.stringify(v)); };
(async()=>{ const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1366,height:620}}); const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
 await p.goto('file://'+F); await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.waitForTimeout(600);
 const have=await p.evaluate(()=>[0,1,2,3,4].map(i=>__G17.skyHas(i)));
 ok(have.filter(Boolean).length>=+(process.env.SKIES||5),'zone paintings loaded',have);
 await p.fill('#jm-nameinput','Test K'); await p.click('#jm-go'); await p.waitForTimeout(400);
 for(const [name,floor] of [['z0',0],['z0b',8],['z1',20],['z1b',32],['z2',48],['z2b',70],['z3',90],['z3b',115],['z4',135]]){
   const r=await p.evaluate((fi)=>{ const G=__G, S=G.state(), P=G.man(); S.nextWay=1e9; let pl=G.plats(); while(pl.length<fi+30){ P.h+=3000; G.step(1/60); pl=G.plats(); }
     const q=pl[fi]; P.on=q; P.h=q.h; P.x=q.floor?400:G.cxAt(q); P.vx=0; P.vy=0; P.lastI=fi; S.pi=fi; S.top=Math.max(S.top,q.h); for(let k=0;k<30;k++) G.step(1/60); return {h:Math.round(P.h/20)}; },floor);
   await p.waitForTimeout(250); await p.screenshot({path:OUT+name+'.png'}); console.log('  ',name,'m',r.h); }
 ok(!errs.length,'no page errors',errs); console.log(fails?fails+' FAILED':'ALL PASS'); await b.close(); process.exit(fails?1:0); })();
