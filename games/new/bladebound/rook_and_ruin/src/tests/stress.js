/* node stress.js <build> <fork> <dodge 1|0> <acc> <reloadEvery chunks|0> <set> <tag>
   Full bot run at fixed 60 fps steps. Optional page reload every N chunks (save/restore soak). One JSON line out. */
const {chromium}=require('playwright'); const path=require('path'); const D=path.join(__dirname,'..','out');
const [build,fork,dodge,acc,relN,set,tag]=process.argv.slice(2);
(async()=>{ const b=await chromium.launch(); const pg=await (await b.newContext({viewport:{width:1366,height:620}})).newPage();
 const errs=[]; pg.on('pageerror',e=>errs.push(String(e).slice(0,300))); pg.on('console',m=>{ if(m.type()==='error'&&!/topics\.json|leaderboard\.json|ERR_FAILED|CORS/.test(m.text())) errs.push(m.text().slice(0,300)); });
 await pg.goto('file://'+D+'/rook_and_ruin_fonts.html?set='+(set||'slope')); await pg.waitForTimeout(300); await pg.evaluate('localStorage.clear()'); await pg.reload(); await pg.waitForTimeout(700);
 await pg.fill('#dn-nameinput','Test T'); await pg.click('#dn-go'); await pg.waitForTimeout(300);
 const arm=async()=>{ await pg.addScriptTag({path:__dirname+'/bot2.js'}); await pg.evaluate(o=>{ window.__B=Object.assign(window.__Bkeep||{},o); window.__dmg=window.__dmg||{}; },{build,fork,dodge:dodge==='1',acc:+acc}); };
 await arm(); let res, reloads=0, stuck=0, lastSig='', trail=[], notes=[];
 for(let chunk=0;chunk<400;chunk++){
   res=await pg.evaluate(()=>{ const G=__G; for(let i=0;i<75;i++){ const S=G.state(); if(S.over) break; __bot2(); for(let k=0;k<4;k++) G.step(1/60); }
     const S=G.state(), w=S.w, bad=[]; const p=w.p;
     if(!isFinite(p.x)||!isFinite(p.y)) bad.push('player NaN'); if(p.hp>p.max) bad.push('hp>max '+p.hp+'/'+p.max); if(!isFinite(S.score)) bad.push('score NaN'); if(w.coins<0||!isFinite(w.coins)) bad.push('coins '+w.coins);
     w.en.forEach(e=>{ if(!isFinite(e.x)||!isFinite(e.y)) bad.push('enemy NaN '+e.type); else if(!e.dead&&!S.over&&S.mode!=='endcut'&&(e.x<-40||e.x>1000||e.y<-40||e.y>580)) bad.push('enemy out '+e.type+'@'+Math.round(e.x)+','+Math.round(e.y)); });
     if(S.mode==='play'&&!S.over&&(p.x<10||p.x>950||p.y<40||p.y>530)) bad.push('player out @'+Math.round(p.x)+','+Math.round(p.y)+' in '+w.rid);
     return {over:S.over,win:S.win,rid:w.rid,t:w.runT,hp:p.hp,mode:S.mode,why:S.ask?S.ask.why:S.pickWhy,en:w.en.length,pend:w.pend,cleared:w.cleared,x:Math.round(p.x),y:Math.round(p.y),bad:bad,last:w.last,lastT:w.lastT,an:S.answered}; });
   res.bad.forEach(x=>{ if(notes.indexOf(x)<0&&notes.length<12) notes.push(x); });
   const sig=[res.rid,res.mode,res.x,res.y,res.en,res.an,Math.round(res.t)].join('|'); if(sig===lastSig) stuck++; else stuck=0; lastSig=sig; trail.push(sig); if(trail.length>6) trail.shift();
   if(stuck>12){ notes.push('STUCK '+sig); break; }
   if(res.over) break; if(res.t>700){ notes.push('TIMEOUT 700s in '+res.rid+' mode '+res.mode+' en '+res.en+' pend '+res.pend+' cleared '+res.cleared); break; }
   if(+relN&&chunk%(+relN)===(+relN-1)){ const pre=await pg.evaluate(()=>{ const S=__G.state(), w=S.w; window.__Bkeep=null; __G.save();   /* the game saves every 2.5 s of real time; the bot runs faster than real time, so save here */ return {rid:w.rid,score:S.score,lv:w.lv,b:JSON.stringify(w.b),an:S.answered,coins:w.coins,max:w.p.max,B:{rolls:__B.rolls,log:__B.log,dmg:__B.dmg,room:__B.room}}; });
     await pg.reload(); await pg.waitForTimeout(500); reloads++;
     const post=await pg.evaluate(k=>{ window.__Bkeep=k; const S=__G.state(), w=S.w; return {rid:w.rid,score:S.score,lv:w.lv,b:JSON.stringify(w.b),an:S.answered,coins:w.coins,max:w.p.max,mode:S.mode,started:S.started}; },pre.B);
     for(const k of ['score','lv','an','coins','max']) if(post[k]<pre[k]) notes.push('RELOAD lost '+k+' '+pre[k]+' -> '+post[k]+' ('+pre.rid+')');
     if(pre.rid!==post.rid) notes.push('reload room '+pre.rid+' -> '+post.rid);
     if(!post.started) notes.push('RELOAD not started');
     await arm(); } }
 const out=await pg.evaluate(()=>{ const S=__G.state(), w=S.w; return {win:S.win, over:S.over, room:w.rid, time:Math.round(w.runT), score:S.score, kills:w.kills, lastT:Math.round(w.lastT||0), lv:w.lv, coins:w.coins, hp:w.p.hp+'/'+w.p.max, rev:S.revUsed, an:S.answered, ok:S.correct, powers:Object.keys(w.b).length, picks:w.picks, rooms:Object.keys(w.seen||{}).length, endShown:!document.getElementById('dn-end').hidden, code:(document.getElementById('dn-end').textContent.match(/[A-Z0-9]{4,}-[A-Z0-9-]{4,}/)||[''])[0], rooms:(__B.log||[]).filter(l=>l.indexOf('room')===0).map(l=>l.split(' ')[1]+'@'+l.split(' ')[3]+' '+l.split(' ').slice(4).join(' ')), hits:(__B.dmg||[]).length, hitsBy:(__B.dmg||[]).reduce((a,l)=>{ const r=l.split(' ')[0]; a[r]=(a[r]||0)+1; return a; },{}) }; });
 if(res.over){ await pg.waitForTimeout(9000); out.endShown=await pg.evaluate(()=>!document.getElementById('dn-end').hidden); if(tag) await pg.screenshot({path:D+'/stress/end_'+tag+'.png'}); }
 console.log(JSON.stringify(Object.assign({cfg:[build,fork,dodge,acc,relN,set].join(' '),reloads,notes,errs:errs.slice(0,4)},out))); await b.close(); })().catch(e=>{ console.log(JSON.stringify({cfg:[build,fork,dodge,acc,relN,set].join(' '),CRASH:String(e).slice(0,400)})); process.exit(1); });
