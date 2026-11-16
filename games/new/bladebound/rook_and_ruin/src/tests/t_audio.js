/* audio pack (2026-11-15): files load and decode (embedded in _mult, fetched beside the page on the site build, silent synth
   fallback on a local plain build), music follows the game state, the Last Stand track stays in step with the 2:00 timer and
   pauses with it, ducking, stings, M / N, sliders saved, effects play and are rate-limited, ?sound screen plays everything. */
const {chromium}=require('playwright'); const http=require('http'), fs=require('fs'), path=require('path'); const D=process.argv[2]||'out', O=D+'/tour/';
(async()=>{ const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']}); const errs=[], R={}, bad=[];
 const check=(n,ok,info)=>{ R[n]=ok?'ok':('FAIL '+JSON.stringify(info)); if(!ok) bad.push(n); };
 const wait=(pg,fn,ms=6000)=>pg.waitForFunction(fn,null,{timeout:ms}).then(()=>true,()=>false);
 async function open(url){ const pg=await (await b.newContext({viewport:{width:1366,height:768}})).newPage(); pg.on('pageerror',e=>errs.push(String(e)));
   await pg.goto(url); await pg.evaluate('localStorage.clear()'); await pg.reload(); await pg.waitForTimeout(600); return pg; }
 const A=pg=>pg.evaluate(()=>{ const a=__AU; return {cur:a.cur, playing:!!a.src, name:a.src&&a.src.buffer?Math.round(a.src.buffer.duration):0, fx:Object.keys(a.buf).filter(n=>!/loop|sting|2min/.test(n)).length,
   bad:Object.keys(a.bad), duck:a.dg?+a.dg.gain.value.toFixed(2):null, sting:!!a.sting, mode:__G.state().mode}; });

 // 1. _mult copy (audio inside the file)
 const m=await open('file://'+D+'/rook_and_ruin_mult.html');
 await m.click('#dn-nameinput'); await m.fill('#dn-nameinput','Levi S');
 check('titleMusic',await wait(m,()=>__AU.cur==='title'&&__AU.src&&__AU.src.loop),await A(m));
 check('effectsDecoded',await wait(m,()=>Object.keys(__AU.buf).filter(n=>!/loop|sting|2min/.test(n)).length===46),await A(m));
 await m.click('#dn-go'); await m.waitForTimeout(500);
 check('introKeepsTitle',(await A(m)).cur==='title',await A(m));
 await m.keyboard.press('Escape'); await m.waitForTimeout(400);
 check('roomBattle',await wait(m,()=>__AU.cur==='battle'&&__AU.src&&__AU.src.loop&&Math.abs(__AU.src.buffer.duration-73.33)<0.1),await A(m));
 // effects: a swing plays the file
 await m.keyboard.press(' '); await m.waitForTimeout(150);
 check('swingFile',await m.evaluate(()=>__AU.fxLast.sword_swing>0),'');
 // footsteps while walking
 await m.keyboard.down('ArrowRight'); await m.waitForTimeout(900); await m.keyboard.up('ArrowRight');
 check('footsteps',await m.evaluate(()=>['footstep_stone_1','footstep_stone_2','footstep_stone_3'].some(n=>__AU.fxLast[n]>0)),'');
 // pause ducks
 await m.keyboard.press('p'); await m.waitForTimeout(800); const pd=await A(m); await m.screenshot({path:O+'audio_01_pause_sliders.png'});
 check('pauseDucks',pd.mode==='build'&&pd.duck<=0.45,pd);
 // sliders save
 await m.evaluate(()=>{ const el=document.getElementById('dn-volm'); el.value=40; el.dispatchEvent(new Event('input')); });
 const sv=await m.evaluate(()=>({ls:localStorage.getItem('rook_and_ruin_audio'), g:+__AU.mg.gain.value.toFixed(2)}));
 await m.waitForTimeout(200); const sv2=await m.evaluate(()=>+__AU.mg.gain.value.toFixed(3));
 check('sliderSaved',/"m":0.4/.test(sv.ls)&&Math.abs(sv2-0.12)<0.02,{sv,sv2});
 await m.keyboard.press('p'); await m.waitForTimeout(800); check('unduck',(await A(m)).duck>=0.95,await A(m));
 // shop, boss
 await m.evaluate(()=>{ __G.room('shop','s'); __G.state().mode='play'; });
 check('shopMusic',await wait(m,()=>__AU.cur==='shop'&&__AU.src&&Math.round(__AU.src.buffer.duration)===64),await A(m));
 await m.evaluate(()=>{ __G.room('boss','s'); __G.state().mode='play'; });
 check('bossMusic',await wait(m,()=>__AU.cur==='boss'&&__AU.src&&Math.abs(__AU.src.buffer.duration-72.73)<0.1),await A(m));
 check('lsPredecoded',await wait(m,()=>!!__AU.buf.last_stand_metal_2min,8000),'');
 // Last Stand: starts with the timer, stays in step, pauses with it
 await m.evaluate(()=>{ const S=__G.state(); S.w.p.inv=999; S.w.p.hp=99; S.w.p.max=99; __G.last(); S.mode='play'; });
 check('lsStarts',await wait(m,()=>__AU.cur==='ls'&&__AU.src&&!__AU.src.loop),await A(m));
 await m.waitForTimeout(3000);
 const sync=()=>m.evaluate(()=>{ const S=__G.state(), a=__AU; return {pos:a.src?+(a.off0+(a.src.context.currentTime-a.t0)).toFixed(2):null, want:+(120-S.w.last).toFixed(2)}; });
 const s1=await sync(); check('lsInStep',s1.pos!=null&&Math.abs(s1.pos-s1.want)<0.35&&s1.want>2,s1);
 // playtest 2026-11-15: constant hit-stop (and slow frames) must not make the Last Stand music cut and jump
 const hs=await m.evaluate(()=>new Promise(res=>{ const a=__AU, S=__G.state(); let cuts=0, ticks=0, src=a.src; const t0=performance.now(); const iv=setInterval(()=>{ if(++ticks%3===0) S.hs=0.09; if(a.src!==src){ cuts++; src=a.src; } if(performance.now()-t0>4000){ clearInterval(iv); setTimeout(()=>{ if(a.src!==src) cuts++; res({cuts, drift:+((a.off0+(a.src.context.currentTime-a.t0))-(120-S.w.last)).toFixed(2)}); },400); } },60); }));
 check('lsNoCutsUnderHitstop',hs.cuts===0&&Math.abs(hs.drift)<0.35,hs);
 await m.keyboard.press('p'); await m.waitForTimeout(700); const s2=await sync(); check('lsPausesWithTimer',s2.pos===null,s2);
 await m.waitForTimeout(1500); await m.keyboard.press('p'); await m.waitForTimeout(600); const s3=await sync();
 check('lsResumesInStep',s3.pos!=null&&Math.abs(s3.pos-s3.want)<0.35&&Math.abs(s3.want-s2.want)<1.2,{s2,s3});
 // jump near the end: the final hit (2:00.0) lands on 0:00
 await m.evaluate(()=>{ __G.state().w.last=2.5; }); await m.waitForTimeout(800);
 const end=await m.evaluate(()=>new Promise(res=>{ const t0=performance.now(); (function poll(){ const S=__G.state(), a=__AU; if(S.mode==='endcut'||performance.now()-t0>8000){ res({mode:S.mode, pos:a.src?+(a.off0+(a.src.context.currentTime-a.t0)).toFixed(2):null}); } else setTimeout(poll,10); })(); }));
 check('finalHitOnZero',end.mode==='endcut'&&end.pos!=null&&Math.abs(end.pos-120)<0.2,end);
 check('ringsOutInEscape',await m.evaluate(()=>new Promise(r=>setTimeout(()=>r(__AU.cur==='ls'&&!!__AU.src),1500))),'');
 const vs=await m.evaluate(()=>new Promise(res=>{ const t0=performance.now(), log=[]; (function poll(){ const S=__G.state(); log.push(S.mode+(S.over?'O':'')+(__AU.sting?'S':'')); if(__AU.sting||performance.now()-t0>15000) res({d:__AU.sting?__AU.sting.buffer.duration:0, log:[...new Set(log)]}); else setTimeout(poll,20); })(); }));
 check('victorySting',Math.abs(vs.d-7.5)<0.1,vs);
 await m.screenshot({path:O+'audio_02_end_credits.png'});
 const ec=await m.evaluate(()=>{ const c=document.querySelector('#dn-end .dn-cred'), bx=document.querySelector('.dn-endbox').getBoundingClientRect(), r=c.getBoundingClientRect(); return {txt:c.textContent, inside:r.bottom<=bx.bottom+1&&bx.bottom<=innerHeight}; });
 check('endCredits',/Frank Wen, MIT licence/.test(ec.txt)&&!/Kenney/.test(ec.txt)&&ec.inside,ec);
 // defeat sting: play again, die
 await m.waitForTimeout(1300); await m.click('#dn-again'); await m.waitForTimeout(400); await m.keyboard.press('Escape');
 check('stingStopsOnReplay',await wait(m,()=>!__AU.sting&&__AU.cur==='battle'),await A(m));
 await m.evaluate(()=>{ __G.finish(false,'fall'); });
 check('fallFades',await wait(m,()=>__G.state().mode==='endcut'&&__AU.cur===null),await A(m));
 check('defeatSting',await wait(m,()=>__G.state().over&&__AU.sting&&Math.round(__AU.sting.buffer.duration)===5,15000),await A(m));
 // M mutes music and effects, N turns music off
 await m.waitForTimeout(1300); await m.click('#dn-again'); await m.waitForTimeout(400); await m.keyboard.press('Escape'); await wait(m,()=>__AU.cur==='battle'&&__AU.src);
 await m.keyboard.press('m'); await m.waitForTimeout(400); const mu=await A(m); const sw0=await m.evaluate(()=>__AU.fxLast.sword_swing); await m.keyboard.press(' '); await m.waitForTimeout(100);
 check('muteStopsAll',mu.cur===null&&!mu.playing&&await m.evaluate(s=>__AU.fxLast.sword_swing===s,sw0),mu);
 await m.keyboard.press('m'); await m.waitForTimeout(300); await m.keyboard.press('n'); await m.waitForTimeout(400); const no=await A(m);
 await m.keyboard.press(' '); await m.waitForTimeout(100);
 check('musicOffKeepsEffects',no.cur===null&&!no.playing&&await m.evaluate(s=>__AU.fxLast.sword_swing!==s,sw0),no);
 await m.keyboard.press('n'); check('musicBackOn',await wait(m,()=>__AU.cur==='battle'&&__AU.src),await A(m));
 check('noneBad',(await A(m)).bad.length===0,await A(m));

 // 2. site layout over http: files fetched from audio/rook_and_ruin/
 const flaky={}; const srv=http.createServer((q,r)=>{ const f=path.join(D,decodeURIComponent(q.url.split('?')[0])); const fk=path.basename(f); if(flaky[fk]>0){ flaky[fk]--; r.writeHead(503); r.end(); return; } fs.readFile(f,(e,d)=>{ if(e){ r.writeHead(404); r.end(); return; } r.writeHead(200,{'Content-Type':f.endsWith('.ogg')?'audio/ogg':f.endsWith('.js')?'text/javascript':'text/html'}); r.end(d); }); }).listen(8765);
 const s=await open('http://localhost:8765/site_playtest.html?set=slope'); await s.click('#dn-nameinput');
 check('siteFetches',await wait(s,()=>__AU.cur==='title'&&__AU.src&&Object.keys(__AU.buf).length>=31,8000),await A(s));
 check('musicFetchedAhead',await wait(s,()=>['battle_loop','shop_loop','boss_metal_loop','last_stand_metal_2min'].every(n=>__AU.raw[n])&&Object.keys(__AU.bad).length===0,9000),await A(s));
 // 2b. busy Wi-Fi: a download that fails is tried again, and nothing is marked bad
 flaky['sword_swing.ogg']=1; flaky['title_loop.ogg']=1; flaky['pickup_coin.ogg']=2;
 const sR=await open("http://localhost:8765/site_playtest.html?set=slope"); await sR.click('#dn-nameinput');
 check('retriesFailedDownloads',await wait(sR,()=>__AU.cur==="title"&&__AU.src&&__AU.buf.sword_swing&&__AU.buf.pickup_coin&&Object.keys(__AU.bad).length===0,16000),await sR.evaluate(()=>({bad:Object.keys(__AU.bad),fail:__AU.fail,src:!!__AU.src})));
 await sR.close();
 // 3. plain build opened from disk: no audio files reachable -> synth fallback, no errors
 const f=await open('file://'+D+'/rook_and_ruin_fonts.html?set=slope'); await f.click('#dn-nameinput'); await f.fill('#dn-nameinput','Ana R'); await f.click('#dn-go'); await f.waitForTimeout(300); await f.keyboard.press('Escape'); await f.waitForTimeout(500); await f.keyboard.press(' '); await f.waitForTimeout(300);
 const fb=await f.evaluate(()=>({snd:window.__snd||0, bad:Object.keys(__AU.bad).length, cur:__AU.cur, playing:!!__AU.src}));
 check('localFallsBackToSynth',fb.snd>0&&fb.bad>=30&&!fb.playing,fb);
 // 4. ?sound screen: every button
 const t=await open('file://'+D+'/rook_and_ruin_mult.html#sound'); await t.waitForTimeout(300); await t.screenshot({path:O+'audio_03_soundtest.png'});
 const nb=await t.evaluate(()=>document.querySelectorAll('#dn-snd button').length);
 const btns=await t.$$('#dn-snd button:not(#dn-sndclose)'); let ok=0;
 for(const bt of btns){ await bt.click(); await t.waitForTimeout(60); ok++; }
 await t.waitForTimeout(800); const st=await t.evaluate(()=>document.getElementById('dn-sndnow').textContent);
 check('soundTest',nb>=55&&ok===nb-1&&!/did not load/.test(st),{nb,ok,st});
 await t.click('[data-m="ls110"]'); await t.waitForTimeout(1500); const lsn=await t.evaluate(()=>({pos:+(__AU.off0+(__AU.src.context.currentTime-__AU.t0)).toFixed(1)}));
 check('soundTestLsFrom110',lsn.pos>=110&&lsn.pos<113,lsn);
 await t.click('#dn-sndclose'); await t.waitForTimeout(300); check('soundTestCloses',await t.evaluate(()=>!document.getElementById('dn-snd')&&__AU.test===null),'');
 // 5. a hidden tab goes silent (and comes back); the pause screen clears any toast so the Music slider is never covered; the shop "not enough coins" sound is not the wrong-answer sound
 const hid=async v=>{ await t.evaluate(v=>{ Object.defineProperty(document,'hidden',{configurable:true,get:()=>v}); document.dispatchEvent(new Event('visibilitychange')); },v); await t.waitForTimeout(350); return t.evaluate(()=>__AU.mg.context.state); };
 const h1=await hid(true), h2=await hid(false); check('hiddenTabSilent',h1==='suspended'&&h2==='running',{h1,h2});
 await t.fill('#dn-nameinput','Levi S'); await t.click('#dn-go'); await t.waitForTimeout(400); await t.keyboard.press('Escape'); await t.waitForTimeout(900);
 const ps=await t.evaluate(()=>{ const S=__G.state(); S.mode='play'; const el=document.getElementById('dn-toast'); el.textContent='A Warden falls! +1500'; el.hidden=false; if(document.activeElement) document.activeElement.blur(); }); await t.keyboard.press('p'); await t.waitForTimeout(200); const ps2=await t.evaluate(()=>({mode:__G.state().mode,toast:document.getElementById('dn-toast').hidden}));
 check('pauseHidesToast',ps2.mode==='build'&&ps2.toast===true,ps2);
 srv.close();
 console.log(JSON.stringify(R,null,1)); console.log('errors',JSON.stringify(bad.concat(errs))); await b.close(); })();
