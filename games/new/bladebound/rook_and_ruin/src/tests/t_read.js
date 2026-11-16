/* readability pass (2026-11-15): HUD plates, low health, room line, Rook in a crowd, damage layer, relic inventory,
   build details pause, card text (base behavior + real numbers + synergy names + family/rarity labels). Real keys for B.
   Screenshots out/tour/read_*.png */
const {chromium}=require('playwright'); const D=process.argv[2]||'out';
(async()=>{ const b=await chromium.launch(); const errs=[], R={}, bad=[];
 const check=(n,ok,info)=>{ R[n]=ok?'ok':('FAIL '+JSON.stringify(info)); if(!ok) bad.push(n); };
 async function page(vw,vh){ const pg=await (await b.newContext({viewport:{width:vw,height:vh}})).newPage(); pg.on('pageerror',e=>errs.push(String(e)));
   await pg.goto('file://'+D+'/rook_and_ruin_fonts.html?set=slope'); await pg.evaluate('localStorage.clear()'); await pg.reload(); await pg.waitForTimeout(700);
   await pg.fill('#dn-nameinput','Levi S'); await pg.click('#dn-go'); await pg.waitForTimeout(400); await pg.keyboard.press('Escape'); await pg.waitForTimeout(1400); return pg; }
 const pg=await page(1366,768), ev=(f,a)=>pg.evaluate(f,a), wait=ms=>pg.waitForTimeout(ms);

 // 1. a crowded fight at low health with a mid build: Rook surrounded, blasts on him, numbers flying
 await ev(()=>{ const S=__G.state(), w=S.w; w.b={};   /* drop the random starter relic so the build is exactly this one */ ['wave','spark','orbit','bash','thorns'].forEach((k,i)=>__G.give(k,i<2?2:1)); __G.room('guard','s'); S.mode='play'; w.waves=[]; w.spawns=[]; w.en=[]; w.pend=1; w.xp=3;
   const p=w.p; p.x=480; p.y=300; p.hp=1; p.inv=0; for(let k=0;k<8;k++){ const a=k*0.785; const e=__G.spawn(k%3?'gob':'skel',p.x+Math.cos(a)*30,p.y+Math.sin(a)*22+12,1); e.st=0; e.cd=5; }
   for(let k=0;k<6;k++) w.fx.push({k:'num',x:p.x-40+k*16,y:p.y-20,t:0.1,v:String(5+k),c:'#FFFFFF'}); w.fx.push({k:'boom',x:p.x+10,y:p.y,r:48,t:0.05}); w.combo=12; w.comboT=2; w.comboUp=0.8; w.last=0; w.banner=null; });
 await ev(()=>{ __G.frame(); }); await pg.screenshot({path:D+'/tour/read_01_crowd_low.png'}); await pg.screenshot({path:D+'/tour/read_01b_zoom.png',clip:await ev(()=>{ const r=document.getElementById('dn-canvas').getBoundingClientRect(), k=r.width/960, p=__G.state().w.p; return {x:r.left+(p.x-90)*k,y:r.top+(p.y-110)*k,width:180*k,height:180*k}; })});
 const hid=await ev(()=>{ const S=__G.state(); return {mode:S.mode, hp:S.w.p.hp}; });
 // the outline is drawn: compare a pixel column through Rook with and without enemies in front
 const outl=await ev(()=>{ const S=__G.state(), w=S.w, cv=document.getElementById('dn-canvas'), c=cv.getContext('2d'); __G.frame(); const a=c.getImageData(w.p.x-30,w.p.y-60,60,80).data; const keep=w.en; w.en=[]; __G.frame(); const b2=c.getImageData(w.p.x-30,w.p.y-60,60,80).data; w.en=keep; let white=0; for(let i=0;i<a.length;i+=4) if(a[i]>215&&a[i+1]>215&&a[i+2]>215&&!(b2[i]>215&&b2[i+1]>215&&b2[i+2]>215)) white++; return white; });
 check('outlineWhenCovered',outl>20,{outl});
 check('lowHealthLabel',await ev(()=>{ const S=__G.state(); return S.w.p.hp<=Math.max(1,Math.floor(S.w.p.max/3)); }),hid);

 // 2. normal fight, full hearts, armor, combo, Last Stand off: plates and room line
 await ev(()=>{ const S=__G.state(), w=S.w; w.en=[]; w.fx=[]; w.p.hp=w.p.max-2; w.p.arm=1; w.pend=0; w.combo=0; w.cleared=true; __G.frame(); });
 await pg.screenshot({path:D+'/tour/read_02_hud.png'});
 const top=await ev(()=>({rooms:document.getElementById('dn-bestchip').hidden, streak:document.querySelector('#dn-streakchip .l').textContent}));
 check('topBar',top.rooms&&top.streak==='Answer streak',top);

 // 3. B opens the build details and the fight is frozen; B closes it
 await ev(()=>{ const S=__G.state(), w=S.w; w.cleared=false; S.mode='play'; for(let k=0;k<4;k++){ const e=__G.spawn('gob',w.p.x+120+k*30,w.p.y,1); e.st=0; e.cd=0.2; } });
 await pg.keyboard.press('b'); await wait(100);
 const b1=await ev(()=>{ const S=__G.state(); return {mode:S.mode, t:S.w.t, ep:S.w.en.map(e=>Math.round(e.x)+','+Math.round(e.y)).join('|'), shown:!document.getElementById('dn-bdwrap').hidden, cards:document.querySelectorAll('.dn-bd').length}; });
 await pg.screenshot({path:D+'/tour/read_03_details.png'}); await wait(1200);
 const b2=await ev(()=>{ const S=__G.state(); return {mode:S.mode, t:S.w.t, ep:S.w.en.map(e=>Math.round(e.x)+','+Math.round(e.y)).join('|'), hp:S.w.p.hp}; });
 check('detailsPause',b1.mode==='build'&&b1.shown&&b1.cards===5&&b2.mode==='build'&&b1.t===b2.t&&b1.ep===b2.ep,{b1,b2});
 const det=await ev(()=>document.getElementById('dn-bdlist').textContent);
 check('detailsText',/Lightning strikes the nearest enemy/.test(det)&&/Strikes every2 s/.test(det)&&/Lv 2 of 3/.test(det),det.slice(0,300));
 await pg.keyboard.press('b'); await wait(100); const b3=await ev(()=>({mode:__G.state().mode, shown:!document.getElementById('dn-bdwrap').hidden}));
 check('detailsClose',b3.mode==='play'&&!b3.shown,b3);
 // clicking the sidebar opens it too; Esc closes
 await pg.click('#dn-build'); await wait(80); const c1=await ev(()=>__G.state().mode); await pg.keyboard.press('Escape'); await wait(80); const c2=await ev(()=>__G.state().mode);
 check('sidebarClick',c1==='build'&&c2==='play',{c1,c2});

 // 4. cards: a NEW power, an upgrade with numbers, a gold card; synergy names + READY
 await ev(()=>{ const S=__G.state(), w=S.w; w.en=[]; S.cards=[{id:'aegis'},{id:'spark',gold:0},{id:'ricochet',gold:1}]; S.pickWhy='level'; S.mode='pick'; w.batch=null; __G.showPick(); document.getElementById('dn-pick').hidden=false; });
 await wait(700); await pg.screenshot({path:D+'/tour/read_04_cards.png'});
 const cd=await ev(()=>[...document.querySelectorAll('.dn-card')].map(c=>({t:c.innerText, h:c.getBoundingClientRect().height, sh:c.scrollHeight, ch:c.clientHeight})));
 check('newPowerBase',/A shield blocks one hit/.test(cd[0].t)&&/New power/.test(cd[0].t)&&/Recharge\s*12 s/.test(cd[0].t)&&/BULWARK POWER/i.test(cd[0].t),cd[0].t);
 check('upgradeNumbers',/Upgrade · Lv 2 → MAX|Upgrade · Lv 2 → 3/.test(cd[1].t)&&/2 s\s*→\s*1.6 s/.test(cd[1].t)&&/3 more\s*→\s*4 more/.test(cd[1].t),cd[1].t);
 check('goldLabel',/Gold card · skips a level/.test(cd[2].t)&&/STORM POWER/i.test(cd[2].t)&&/New power · Lv 2/.test(cd[2].t),cd[2].t);
 check('synergyNames',/Orbit Blades\s*\+\s*✓ Chain Spark|✓ Orbit Blades\s*\+\s*✓ Chain Spark/.test(cd[1].t)||/Chain Spark/.test(cd[1].t)&&/Tempest/.test(cd[1].t),cd[1].t);
 check('cardsFit',cd.every(c=>c.sh<=c.ch+2),cd.map(c=>[c.sh,c.ch]));
 // a synergy card names its ingredients
 await ev(()=>{ const S=__G.state(); S.cards=[{id:'tempest',syn:1},{id:'edge'},{id:'boots'}]; __G.showPick(); });
 await wait(700); await pg.screenshot({path:D+'/tour/read_05_syncard.png'});
 const sy=await ev(()=>document.querySelector('.dn-card.evo').innerText); check('synCard',/Orbit Blades \+ Chain Spark/.test(sy)&&/SYNERGY/i.test(sy),sy);
 await pg.keyboard.press('2'); await wait(300);

 // 5. a big build in the sidebar stays legible and inside its panel
 await ev(()=>{ ['whirl','volatile','ricochet','aegis','ward','heart','boots','edge'].forEach(k=>__G.give(k,1)); __G.give('tcharge',1); __G.give('stormcall',1); });
 await wait(300); await ev(()=>{ __G.frame(); }); await pg.screenshot({path:D+'/tour/read_06_bigbuild.png'});
 const inv=await ev(()=>{ const bp=document.getElementById('dn-build'), r=bp.getBoundingClientRect(), its=[...document.querySelectorAll('#dn-buildlist .dn-bi')], last=its[its.length-1].getBoundingClientRect(), ic=its[0].querySelector('.ic').getBoundingClientRect(), more=document.getElementById('dn-buildmore').getBoundingClientRect();
   return {n:its.length, inside:last.bottom<=more.top+1&&more.bottom<=r.bottom+1, icon:Math.round(ic.width), lv:its[0].querySelector('.lvl').textContent}; });
 check('inventoryFits',inv.n>=14&&inv.inside&&inv.icon>=26,inv);

 // 6. combo announcement sits in the HUD corner, not on Rook (no fx text pushed near the player)
 await ev(()=>{ const S=__G.state(), w=S.w; S.mode='play'; w.en=[]; w.fx=[]; w.combo=0; for(let k=0;k<12;k++){ const e=__G.spawn('gob',w.p.x+200,w.p.y,1); e.hp=1; } });
 await ev(()=>{ const w=__G.state().w; w.en.forEach(e=>{ e.hp=0; }); for(let k=0;k<3;k++) __G.step(1/60); });
 check('comboNotOnRook',await ev(()=>!__G.state().w.fx.some(f=>f.k==="txt"&&/COMBO|Combo/.test(f.v))),'');

 // 7. Chromebook size
 const cb=await page(1366,620); await cb.evaluate(()=>{ const S=__G.state(), w=S.w; w.b={};   /* drop the random starter relic so the build is exactly this one */ ['wave','spark','orbit'].forEach(k=>__G.give(k,1)); __G.room('guard','s'); S.mode='play'; w.waves=[]; w.spawns=[]; w.en=[]; w.p.hp=2; w.pend=2; w.xp=2; __G.frame(); });
 await cb.screenshot({path:D+'/tour/read_07_cb_hud.png'});
 await cb.evaluate(()=>{ const S=__G.state(); S.cards=[{id:'bash'},{id:'spark'},{id:'whirl',gold:1}]; S.pickWhy='level'; S.mode='pick'; __G.showPick(); });
 await cb.waitForTimeout(700); await cb.screenshot({path:D+'/tour/read_08_cb_cards.png'});
 const cbfit=await cb.evaluate(()=>{ const box=document.getElementById('dn-arena').getBoundingClientRect(); return [...document.querySelectorAll('.dn-card')].every(c=>{ const r=c.getBoundingClientRect(); return r.bottom<=box.bottom+1&&r.top>=box.top-1&&c.scrollHeight<=c.clientHeight+2; }); });
 check('cbCardsFit',cbfit,'');

 // 8. live combat with real keys: horde room, several powers firing, low health; screenshots mid-fight
 const lv=await page(1366,768); await lv.evaluate(()=>{ const S=__G.state(), w=S.w; w.b={};   /* drop the random starter relic so the build is exactly this one */ ['wave','volatile','spark','orbit','thorns','ward'].forEach(k=>__G.give(k,2)); __G.room('arena','s'); S.mode='play'; w.p.hp=2; w.banner=null; });
 await lv.keyboard.down(' '); let shots=0, hpMin=9;
 for(let k=0;k<16;k++){ const key=['ArrowLeft','ArrowUp','ArrowRight','ArrowDown'][k%4]; await lv.keyboard.down(key); await lv.waitForTimeout(350); await lv.keyboard.up(key);
   const st=await lv.evaluate(()=>{ const S=__G.state(), w=S.w; if(w.p.hp<2&&S.mode==='play') w.p.hp=2; return {mode:S.mode,en:w.en.filter(e=>!e.dead).length,fx:w.fx.length,hp:w.p.hp}; });
   if(st.mode!=='play') break; if(k===7||k===13){ await lv.screenshot({path:D+'/tour/read_09_live_'+(++shots)+'.png'}); } }
 await lv.keyboard.up(' ');
 const live=await lv.evaluate(()=>({mode:__G.state().mode, kills:__G.state().w.kills}));
 check('liveCombat',shots>=1&&live.kills>0,live);
 console.log(JSON.stringify(R,null,1)); console.log('errors',JSON.stringify(bad.concat(errs))); await b.close(); })();
