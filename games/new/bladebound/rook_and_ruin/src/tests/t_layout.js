const {chromium,devices}=require('playwright'); const D=require('path').join(__dirname,'..','out');
(async()=>{ const b=await chromium.launch(); const errs=[];
 for(const [nm,opt] of [['desk',{viewport:{width:1366,height:768}}],['short',{viewport:{width:1366,height:620}}],['phone',devices['iPhone 13 landscape']||devices['iPhone 13']],['tablet',devices['iPad (gen 7)']]]){
  const pg=await (await b.newContext(opt)).newPage(); pg.on('pageerror',e=>errs.push(nm+': '+e));
  await pg.goto('file://'+D+'/rook_and_ruin_mult.html'); await pg.evaluate('localStorage.clear()'); await pg.reload(); await pg.waitForTimeout(700);
  await pg.screenshot({path:D+'/l_'+nm+'_title.png'});
  await pg.fill('#dn-nameinput','Levi S'); await pg.click('#dn-go'); await pg.waitForTimeout(2500); await pg.click('#dn-skip'); await pg.waitForTimeout(300);
  await pg.evaluate(()=>{ const S=__G.state(); __G.room('cross','s'); S.mode='play'; const w=S.w; w.en=[]; [['gob',380,200],['skel',600,180],['wiz',700,330],['bat',300,330],['slime',520,420],['slime',560,430,1]].forEach(a=>{ const e=__G.spawn(a[0],a[1],a[2],1,a[3]); e.st=0; }); });
  await pg.waitForTimeout(900); await pg.screenshot({path:D+'/l_'+nm+'_play.png'});
  const ov=await pg.evaluate(()=>[document.documentElement.scrollWidth,innerWidth,document.documentElement.scrollHeight,innerHeight]); console.log(nm,'scroll/inner',ov);
 }
 console.log('errors',errs); await b.close(); })();
