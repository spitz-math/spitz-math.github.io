/* smashable pots: placement in every room (count, clear of walls/doors), solid to Rook, sword and roll smash them,
   loot rules (coins + rare heart before the Shop; hearts only, no coins, in Siege/Warden; none in the Shop). Screenshots out/tour/pots_*.png */
const {chromium}=require('playwright'); const D=process.argv[2]||require('path').join(__dirname,'..','out'); const O=D+'/tour/';
(async()=>{ const b=await chromium.launch(); const pg=await (await b.newContext({viewport:{width:1366,height:768}})).newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(String(e)));
 await pg.goto('file://'+D+'/rook_and_ruin_mult.html'); await pg.evaluate('localStorage.clear()'); await pg.reload(); await pg.waitForTimeout(600);
 await pg.fill('#dn-nameinput','Test T'); await pg.click('#dn-go'); await pg.waitForTimeout(300); await pg.keyboard.press('Escape'); await pg.waitForTimeout(1200);
 const bad=[]; const want={entry:3,guard:4,cross:4,vault:4,arena:4,library:4,shop:0,siege:4,boss:4};
 for(const id of Object.keys(want)){ for(let rep=0;rep<12;rep++){
   const r=await pg.evaluate(id=>{ __G.room(id,'s'); const S=__G.state(), w=S.w; w.en=[]; w.spawns=[]; w.waves=[]; return w.pots.map(p=>[p.x,p.y]); },id);
   if(r.length!==want[id]) bad.push(id+' count '+r.length);
   const chk=await pg.evaluate(()=>{ const w=__G.state().w, out=[]; for(const p of w.pots){ const q={x:p.x,y:p.y,r:12}; const c=__G.collide(q); if(Math.hypot(q.x-p.x,q.y-p.y)>0.5) out.push('in wall '+p.x+','+p.y); } return out; });
   bad.push(...chk.map(s=>id+' '+s)); }
   await pg.evaluate(()=>{ const S=__G.state(); S.over=true; }); await pg.waitForTimeout(60); await pg.evaluate(()=>{ __G.frame(); }); await pg.screenshot({path:O+'pots_'+id+'.png'}); await pg.evaluate(()=>{ __G.state().over=false; }); }
 /* looks: all 6 rows show up, originals more often, the two pots in a corner pair never match */
 const looks=await pg.evaluate(()=>{ const n=[0,0,0,0,0,0]; let same=0; for(let i=0;i<150;i++){ __G.room('guard','s'); const P=__G.state().w.pots; P.forEach(p=>n[p.k]++); for(let j=1;j<P.length;j++) if(Math.hypot(P[j].x-P[j-1].x,P[j].y-P[j-1].y)<50&&P[j].k===P[j-1].k) same++; } return {n,same}; });
 console.log('looks',JSON.stringify(looks)); if(looks.same||looks.n.some(v=>v===0)||!(looks.n[0]>looks.n[2]&&looks.n[1]>looks.n[3])) bad.push('looks');
 /* solid + sword + roll */
 const act=await pg.evaluate(()=>{ __G.room('guard','s'); const S=__G.state(), w=S.w, p=w.p; w.en=[]; w.spawns=[]; w.waves=[]; w.cleared=true; w.open=true; p.hp=p.max;
   const pt=w.pots[0]; pt.st=0; const dir=pt.y<270?1:-1; p.x=pt.x; p.y=pt.y+60*dir; p.inv=0; const res={};
   __G.hold(dir>0?'arrowup':'arrowdown',true); for(let i=0;i<90;i++) __G.step(1/60); __G.hold('arrowup',false); __G.hold('arrowdown',false); res.blocked=Math.round(Math.hypot(p.x-pt.x,p.y-pt.y)); res.intact=pt.st;
   p.fx=0; p.fy=-dir; __G.hold(' ',true); for(let i=0;i<4;i++) __G.step(1/60); __G.hold(' ',false); for(let i=0;i<30;i++) __G.step(1/60); res.sword=pt.st;
   return res; });
 const S2=await pg.evaluate(()=>{ const w=__G.state().w, p=w.p, p2=w.pots[1]; p2.st=0; p.x=p2.x; p.y=p2.y+(p2.y<270?80:-80); p.rollCd=0; p.roll=0; __G.hold(p2.y<270?'arrowup':'arrowdown',true); __G.step(1/60); return 1; });
 await pg.keyboard.press('Shift'); act.roll=await pg.evaluate(()=>{ const w=__G.state().w, p2=w.pots[1]; for(let i=0;i<40;i++) __G.step(1/60); __G.hold('arrowup',false); __G.hold('arrowdown',false); return p2.st; });
 console.log('act',JSON.stringify(act)); if(!(act.blocked>=22&&act.blocked<=32&&act.intact===0&&act.sword===2&&act.roll===2)) bad.push('smash '+JSON.stringify(act));
 /* loot rules, 300 pots each */
 const loot=await pg.evaluate(()=>{ const out={}; for(const [id,hurt] of [['guard',0],['guard',1],['siege',0],['siege',1]]){ __G.room(id,'s'); const w=__G.state().w, p=w.p; w.en=[]; w.spawns=[]; let coins=0, hearts=0;
   for(let i=0;i<300;i++){ p.hp=hurt?1:p.max; w.coinsF=[]; w.hearts=[]; w.pots=[{x:400,y:300,k:0,st:1,br:0}]; __G.potTick(1/60); coins+=w.coinsF.length; hearts+=w.hearts.length; } out[id+(hurt?'_hurt':'')]=[coins,hearts]; } return out; });
 console.log('loot per 300',JSON.stringify(loot));
 if(!(loot.guard[0]>150&&loot.guard[1]===0&&loot.guard_hurt[1]>15&&loot.siege[0]===0&&loot.siege[1]===0&&loot.siege_hurt[0]===0&&loot.siege_hurt[1]>30)) bad.push('loot');
 console.log('errors',JSON.stringify([...errs,...bad.slice(0,12)])); await b.close(); })();
