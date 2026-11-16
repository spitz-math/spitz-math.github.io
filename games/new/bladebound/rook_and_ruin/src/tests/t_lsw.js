/* Last Stand Wardens: alive count follows 1 / 2 / 3 targets, kills get replaced, killing Wardens never ends the run; ends at 2:00 with the escape scene */
const {chromium}=require('playwright'); const D=require('path').join(__dirname,'..','out');
(async()=>{ const b=await chromium.launch(); const pg=await (await b.newContext()).newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(String(e)));
 await pg.goto('file://'+D+'/rook_and_ruin_fonts.html'); await pg.evaluate('localStorage.clear()'); await pg.reload(); await pg.waitForTimeout(600);
 await pg.fill('#dn-nameinput','Test T'); await pg.click('#dn-go'); await pg.waitForTimeout(200); await pg.click('#dn-skip'); await pg.waitForTimeout(100);
 const r=await pg.evaluate(()=>{ const S=__G.state(); __G.room('boss','s'); S.mode='play'; S.w.en=[]; __G.last(); const log=[]; let banners={};
   for(let i=0;i<60*125;i++){ const w=S.w; if(S.mode!=='play'&&S.mode!=='endcut'){ S.mode='play'; } w.p.hp=99; w.p.inv=1;
     __G.step(1/60); if(S.mode==='endcut'||S.over) { log.push('end at '+(w.lastT||0).toFixed(1)+' mode '+S.mode+' lastDone '+w.lastDone); break; }
     if(w.banner&&w.banner.txt&&!banners[w.banner.txt+Math.floor(w.lastT)]&&/WARDEN/.test(w.banner.txt)){ banners[w.banner.txt+Math.floor(w.lastT)]=1; log.push(w.lastT.toFixed(1)+' banner '+w.banner.txt); }
     const alive=w.en.filter(e=>!e.dead&&e.type==='boss');
     if(i%(60*5)===0) log.push(w.lastT.toFixed(0)+'s alive '+alive.length+' target '+(w.lsTgt||0)+' en '+w.en.length);
     // kill a Warden at 30 s, 60 s, 100 s
     if([30,60,100].some(t=>Math.abs(w.lastT-t)<0.009)&&alive[0]){ alive[0].dead=true; log.push(w.lastT.toFixed(1)+" killed one"); } }
   return log; });
 console.log(r.join('\n')); console.log('errors',errs); await b.close(); })();
