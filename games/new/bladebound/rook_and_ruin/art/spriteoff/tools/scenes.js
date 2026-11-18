/* node scenes.js <out dir> <shot prefix> : the same staged scenes for every sprite-off set (fixed positions and states, then one frame drawn) */
const {chromium}=require('playwright'); const [D,P]=process.argv.slice(2);
(async()=>{ const b=await chromium.launch(); const pg=await (await b.newContext({viewport:{width:1366,height:768},deviceScaleFactor:1})).newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(''+e));
 await pg.goto('file://'+D+'/rook_and_ruin_fonts.html?set=slope'); await pg.evaluate('localStorage.clear()'); await pg.reload(); await pg.waitForTimeout(900);
 await pg.fill('#dn-nameinput','Levi S'); await pg.click('#dn-go'); await pg.waitForTimeout(2500); await pg.click('#dn-skip'); await pg.waitForTimeout(1200);
 await pg.evaluate(()=>{ window.requestAnimationFrame=()=>0; }); await pg.waitForTimeout(100);   /* stop the game loop: every shot is exactly the staged frame */
 const stage=async(room,list,fires,rook)=>{ await pg.evaluate(([room,list,fires,rook])=>{ const S=__G.state(); __G.room(room,'s'); S.mode='play'; const w=S.w; w.banner=null; w.bannerQ=[]; w.waves=[]; w.spawns=[]; w.en=[]; w.fx=[]; w.cleared=false; w.open=w.door=false; w.wave=0; w.waveT=99; w.p.x=rook[0]; w.p.y=rook[1]; w.p.fx=0; w.p.fy=-1; w.p.inv=0;
   w.fires=fires.map(f=>({x:f[0],y:f[1],t:f[2]==null?1.5:f[2],s:f[0]%9,lite:f[3]?1:0,life:f[3]?4:null}));
   list.forEach(it=>{ const e=__G.spawn(it[0],it[1],it[2],1); e.cd=99; Object.assign(e,it[3]||{}); e.losT=99; e.los=true; });
   w.waves=[[['gob',1]]]; for(let i=0;i<4;i++) __G.step(1/60); w.spawns=[];  /* settle facing rows */
   w.en.forEach((e,i)=>{ e.cd=99; Object.assign(e,list[i][3]||{}); e.kx=e.ky=0; e.fl=0; e.x=list[i][1]; e.y=list[i][2]; }); w.fx=[]; __G.frame(); },[room,list,fires,rook]); await pg.waitForTimeout(80); };
 const shot=async n=>{ const c=await pg.$('canvas'); await c.screenshot({path:P+'_'+n+'.png'}); };
 const imp=(x,y,o)=>['imp',x,y,o], L=(x,y,o)=>['lance',x,y,o];
 /* 1 Ember Kiln fight: imps idle / winding up over Rook's spot / one smoke poof, with goblins, a bat, a wizard and a knight, a small imp fire + Warden fire */
 await stage('kiln',[imp(240,150,{st:0}),imp(720,150,{st:1,tx:480,ty:400,c0:0.65,cd:0.3}),imp(820,330,{st:0,bkT:null}),['gob',380,300,{st:0}],['gob',590,330,{st:1,sx:-0.3,sy:0.9}],['bat',640,230,{st:0}],['wiz',160,380,{st:0}],['skel',330,430,{st:0,fa:0}]],[[560,440,1.2,1],[250,260,2.0]],[480,400]);
 await shot('1_kiln_fight');
 /* 2 Barracks fight: one Lancer aiming (red lane), one charging, one stunned; goblins, knight, wizard, bat */
 await stage('barracks',[L(260,180,{st:1,fa:0.6,c0:0.8,cd:0.3,sx:0.8,sy:0.6}),L(700,250,{st:2,fa:3.0,sx:-1,sy:0.1}),L(840,420,{st:9}),['gob',420,330,{st:0}],['gob',560,180,{st:0}],['skel',620,420,{st:0,fa:3.1}],['wiz',150,420,{st:0}],['bat',520,260,{st:0}]],[],[480,400]);
 await shot('2_barracks_fight');
 /* 3 lineup in the Guard Room: the current cast next to the new enemies (down-facing, side-facing, back-facing) */
 await stage('guard',[['gob',110,300,{st:0}],['skel',190,300,{st:0,fa:1.57}],['wiz',340,300,{st:0}],['slime',410,300,{st:0}],['bat',480,290,{st:0}],
   imp(560,300,{st:0}),imp(625,300,{st:1,tx:625,ty:600,c0:0.65,cd:0.6}),L(760,300,{st:0}),L(840,300,{st:1,fa:1.57,sx:0,sy:1,c0:0.8,cd:0.79}),
   imp(340,470,{st:3}),L(420,470,{st:3}),imp(560,470,{st:0}),L(620,470,{st:2,fa:0,sx:1,sy:0}),L(780,470,{st:9})],[],[150,470]);
 await shot('3_lineup');
 console.log(P,'errors',JSON.stringify(errs)); await b.close(); })();
