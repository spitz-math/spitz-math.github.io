/* 3 full runs back to back in one page with reduce-motion ON: no errors, memory and page size stay flat, each new run starts clean */
const {chromium}=require('playwright'); const path=require('path'); const D=path.join(__dirname,'..','out');
(async()=>{ const b=await chromium.launch({args:['--enable-precise-memory-info','--js-flags=--expose-gc']}); const pg=await (await b.newContext({viewport:{width:1366,height:768},reducedMotion:'reduce'})).newPage();
 const errs=[]; pg.on('pageerror',e=>errs.push(String(e).slice(0,200)));
 await pg.goto('file://'+D+'/rook_and_ruin_fonts.html?set=solve'); await pg.evaluate('localStorage.clear()'); await pg.reload(); await pg.waitForTimeout(700);
 await pg.fill('#dn-nameinput','Test T'); await pg.click('#dn-go'); await pg.waitForTimeout(300);
 await pg.addScriptTag({path:__dirname+'/bot2.js'}); const runs=[];
 for(let r=0;r<3;r++){ await pg.evaluate(o=>{ window.__B=o; },{build:['storm','blade','bulwark'][r],fork:r%2?'w':'e',dodge:true,acc:0.85}); let res;
   for(let chunk=0;chunk<400;chunk++){ res=await pg.evaluate(()=>{ const G=__G; for(let i=0;i<75;i++){ const S=G.state(); if(S.over) break; __bot2(); for(let k=0;k<4;k++) G.step(1/60); } const S=G.state(); return {over:S.over,t:S.w.runT}; }); if(res.over||res.t>700) break; }
   await pg.waitForTimeout(1500);
   const m=await pg.evaluate(()=>{ if(window.gc) gc(); const S=__G.state(), w=S.w; return {over:S.over,win:S.win,time:Math.round(w.runT),score:S.score,answered:S.answered,heapMB:Math.round(performance.memory.usedJSHeapSize/1e5)/10,nodes:document.getElementsByTagName('*').length,fx:w.fx.length,endShown:!document.getElementById('dn-end').hidden}; }); runs.push(m);
   if(r<2){ await pg.evaluate(()=>{ __G.endShown(); __G.playAgain(); }); await pg.waitForTimeout(300);
     const st=await pg.evaluate(()=>{ const S=__G.state(), w=S.w; return {score:S.score,answered:S.answered,rev:S.revUsed,room:w.rid,powers:Object.keys(w.b).length,coins:w.coins,hp:w.p.hp+'/'+w.p.max,arm:w.p.arm,mode:S.mode,dealt:!!w.dealt,rally:!!w.rally,preLast:!!w.preLast,endHidden:document.getElementById('dn-end').hidden,build:document.getElementById('dn-buildlist').className+'|'+document.querySelectorAll('#dn-buildlist .dn-bi').length}; });
     runs.push({fresh:st}); if(st.score||st.answered||st.rev||st.powers||st.coins||st.hp!=='6/6'||st.arm||st.dealt||st.rally||st.preLast||!st.endHidden||st.room!=='entry'||st.build!=='|0') errs.push('new run not clean: '+JSON.stringify(st)); } }
 const full=runs.filter(x=>x.heapMB); if(full.some(x=>!x.over||!x.endShown)) errs.push('a run did not finish'); if(full[2].heapMB>full[0].heapMB*1.6+5) errs.push('memory grows '+full.map(x=>x.heapMB)); if(full[2].nodes>full[0].nodes+60) errs.push('page grows '+full.map(x=>x.nodes));
 console.log(JSON.stringify(runs)); console.log('errors',JSON.stringify(errs)); await b.close(); })();
