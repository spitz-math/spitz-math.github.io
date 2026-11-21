/* Chain Spark and Volatile numbers (Kody 2026-11-16 nerf); defined first because the card text reads them at load */
var CSPK={every:[0,3.0,2.6,2.2], jumps:[0,1,2,3], dmg:[0,2,4,6]}, VOLD=[0,1,2,3];
/* ---------- the castle: one run = these rooms ---------- */
/* exits: n/w/e -> next room. Rooms lock while there are enemies; clearing opens every exit. */
var ROOMS={
  entry:  {name:'Entry Hall',     kind:'start',    exits:{n:'guard'},   waves:[[['gob',3]],[['gob',4]],[['gob',4],['bat',2]]], sub:'Hold Space to attack. Move to face enemies. X or K to dodge.'},
  guard:  {name:'Guard Room',     kind:'guard',    exits:{n:'cross'},   m:1.0,  waves:[[['gob',4],['bat',2]],[['bat',5],['gob',3]],[['gob',6],['bat',3]],[['gob',5],['bat',4],['gob',1,1]]], sub:'Bats hover, then dive. Dodge through!'},
  cross:  {name:'Crossroads',     kind:'crossr',   exits:{w:'vault',e:'arena'}, m:1.0, waves:[[['skel',1]],[['skel',1],['gob',4],['bat',3]],[['skel',2],['gob',6],['bat',2]]], intro:1, sub:'A shield knight guards this hall. Learn his shield first.'},
  vault:  {name:'Treasure Vault', kind:'vault',    exits:{n:'library'}, m:1.1, waves:[[['slime',4]],[['slime',3],['bat',5]]], chest:'treasure', sub:'A quiet room... mostly.'},
  arena:  {name:'Proving Ground', kind:'arena',    exits:{n:'library'}, m:1.1,  waves:[[['skel',2],['gob',6]],[['wiz',2],['bat',6]],[['skel',2],['wiz',2],['gob',7]],[['gob',12],['bat',5],['skel',1,1]]], chest:'gold', sub:'The doors lock behind you. Win for a GOLD reward.'},
  /* Kody 2026-11-17: each side of the fork gets a second room with its own new enemy. Which side has the Ember Imps and which the Lancers is random every run (w.impV, see applyFork). */
  kiln:   {name:'Ember Kiln',     kind:'kiln',     exits:{n:'library'}, m:1.15, waves:[[['imp',1],['gob',4],['bat',2]],[['imp',2],['gob',4]],[['imp',2],['bat',4],['slime',2]],[['gob',8],['bat',3],['imp',2],['imp',1,1]]], sub:'Ember Imps throw fire. Only sword hits hurt them, and one hit kills. Step out of the orange ring!'},
  barracks:{name:'Barracks',      kind:'barracks', exits:{n:'library'}, m:1.15, waves:[[['lance',1],['gob',4],['bat',2]],[['lance',2],['gob',4]],[['lance',2],['skel',1],['bat',4]],[['gob',8],['bat',3],['lance',2],['lance',1,1]]], sub:'Lancers charge in a straight line. Sidestep and let them hit the wall!'},
  library:{name:'Library',        kind:'library',  exits:{n:'shop'},    m:1.2,  waves:[[['wiz',2],['slime',3],['gob',3]],[['skel',2],['slime',2],['bat',6]],[['wiz',3],['gob',7]],[['gob',10],['slime',2],['wiz',1],['skel',1,1]]], secret:true, sub:'Wizards aim first. Swing at orbs to bat them back!'},
  shop:   {name:'Shop',           kind:'shop',     exits:{n:'siege'},   waves:[], shop:true, sub:'Walk up to an item and press E to buy'},
  siege:  {name:'Siege Hall',     kind:'siege',    exits:{n:'boss'},    siege:50, sub:'The doors slam shut. Survive!'},
  boss:   {name:'The Iron Warden',kind:'bossroom', exits:{},            boss:true, sub:"Bait his charge into a wall. Strike while he's stunned."}
};
var MAPPOS={entry:[0,9],guard:[0,8],cross:[0,7],vault:[-1,6],arena:[1,6],kiln:[-1,5],barracks:[1,5],library:[0,4],shop:[0,3],siege:[0,2],boss:[0,1]};

/* ---------- enemies ---------- */
var ET={
  gob:  {r:12, hp:6,   spd:72,  xp:1, spr:'gremlin', coin:0.25, col:'#5BE88A'},
  bat:  {r:9,  hp:3,   spd:115, xp:1, spr:'batU', fly:1, coin:0.2, col:'#8A6AD0'},
  skel: {r:13, hp:16,  spd:48,  xp:3, spr:'skel', coin:1, col:'#EDE6D6'},
  wiz:  {r:11, hp:9,   spd:62,  xp:3, spr:'wisp', coin:1, col:'#B56BFF'},
  slime:{r:14, hp:9,   spd:0,   xp:2, spr:'slime', coin:0.4, col:'#FF7AB0'},
  imp:  {r:10, hp:8,   spd:80,  xp:3, spr:'wisp', coin:0.8, col:'#FF8A2A'},   /* Ember Imp: keeps away and lobs small fires at Rook's spot */
  lance:{r:14, hp:20,  spd:52,  xp:4, spr:'gremlin', coin:1, col:'#9AB0D0'},  /* Lancer: aims a red lane, charges straight, stuns itself on a wall */
  boss: {r:30, hp:950, spd:58,  xp:0, spr:'king', heavy:1, col:'#B56BFF'}
};
/* goblin pounce: starts inside GOBT, covers GOBL. COMBOT = seconds a combo lasts without a kill */
var LANCEV=430, LANCEL=322;   /* Lancer charge speed; LANCEL = fallback lane length. The lane is drawn to the first wall (laneLen) */
function laneLen(x,y,a){ var cx=Math.cos(a), cy=Math.sin(a); for(var d=16;d<1200;d+=8){ if(wallAt(x+cx*d,y+cy*d)) return d; } return 1200; }
var GOBT=106, GOBL=100, GOBLOCK=0.24, COMBOT=2.5;
/* only a few goblins may wind up at once, so a crowd attacks in beats you can read instead of all together */
function gobSlots(w){ return w.last>0||ROOMS[w.rid].siege?4:(w.rid==='entry'||w.rid==='guard'||early(w))?2:3; }
/* early(w): Rook has fewer than 4 powers, so the build is not online yet. Enemies wind up a little longer until it is. */
function early(w){ return (w.picks||0)<4&&!(w.last>0); }
/* elite: a tougher, faster version with a gold ring under it, a gold outline and a big crown. Worth more gems, coins and points. */
var ELSC=1.15;   /* elites drawn 15% bigger (hit box unchanged) */
function spawnEnemy(type,x,y,mult,small,elite){ var t=ET[type], e={type:type,x:x,y:y,r:small?9:t.r,hp:Math.round(t.hp*(mult||1)*(small?0.4:1)*(elite?3:1)),max:0,t:Math.random()*5,kx:0,ky:0,fl:0,st:0,sx:0,sy:0,cd:rnd(0.6,1.4),oh:0,rh:0,eh:0,fa:0,small:!!small};
  if(elite){ e.el=1; if(!S.w.eliteTold){ S.w.eliteTold=1; (S.w.bannerQ=S.w.bannerQ||[]).push({txt:'ELITE ENEMY',sub:'Gold glow and crown = 3x health and faster. Take it down for big gems and coins!',t:3.6,tip:1}); } }   /* Kody 2026-11-21: explain elites the first time one shows up in a run */
  e.max=e.hp; S.w.en.push(e); return e; }

/* ---------- powers ---------- */
/* path: blade (your sword does more), storm (things happen on their own), guard (survive).
   Every power goes to Lv 3. Synergies are one-time cards that show up once you own both halves. */
var UP=[
  {id:'wave',     path:'blade', ic:'🌊', n:'Sword Wave',   d:function(l){ return ['','Every swing launches an energy wave through 2 enemies','Waves go through 4 enemies and hit harder','Waves bounce off walls and go through 6'][l]; }},
  {id:'whirl',    path:'blade', ic:'🌀', n:'Whirlwind',    d:function(l){ return ['','Every 3rd swing in a row is a full spin','Bigger, stronger spin','Every 2nd swing in a row spins'][l]; }},
  {id:'riposte',  path:'blade', ic:'🤺', n:'Riposte',      d:function(l){ return ['','Every dodge (not just perfect ones) sets up a crit that fires a 3-wave fan','Dodge recharges 30% faster','Dodging through enemies cuts them'][l]; }},
  {id:'edge',     path:'blade', ic:'🗡️', n:'Keen Edge',   d:function(l){ return 'Sword hits for '+(3+2*l)+' and reaches farther'; }},
  {id:'volatile', path:'storm', ic:'💥', n:'Volatile',     d:function(l){ return ['','Defeated enemies explode and hurt enemies nearby','Bigger, stronger explosions','Huge explosions that chain through crowds'][l]; }},
  {id:'spark',    path:'storm', ic:'⚡', n:'Chain Spark',  d:function(l){ return 'Lightning hits the nearest enemy every '+CSPK.every[l]+'s and jumps to '+CSPK.jumps[l]+' more'; }},
  {id:'orbit',    path:'storm', ic:'🔪', n:'Orbit Blades', d:function(l){ return [0,2,3,4][l]+' blades circle you and cut what they touch'; }},
  {id:'ricochet', path:'storm', ic:'🔵', n:'Ricochet Orb', d:function(l){ return 'Throws an orb that bounces off walls '+(l+2)+' times'+(l>=3?', two at a time':''); }},
  {id:'bash',     path:'bulwark', ic:'🛡️', n:'Shield Bash', d:function(l){ return ['','Your dodge becomes a shield charge: enemies you hit take damage and are stunned','Harder bash, longer stun','Huge bash, and your dodge recharges faster'][l]; }},
  {id:'thorns',   path:'bulwark', ic:'🌵', n:'Thorns',      d:function(l){ return 'Enemies that hit you or touch you take '+[0,6,10,15][l]+' damage back'; }},
  {id:'aegis',    path:'bulwark', ic:'💠', n:'Aegis',        d:function(l){ return 'Blocks a hit every '+[0,12,9,6][l]+'s. Each block blasts harder than the last'; }},
  {id:'ward',     path:'bulwark', ic:'💎', n:'Relic Ward',   d:function(l){ return l+' relic gem'+(l>1?'s':'')+' circle you, eat enemy orbs and fire them back as bolts'; }},
  {id:'heart',    path:'any', ic:'❤️', n:'Heart Container', d:function(l){ return '+1 max heart and heal to full'; }},
  {id:'boots',    path:'any',   ic:'👢', n:'Fleet Boots',  d:function(l){ return 'Move '+(12*l)+'% faster and dodge more often'; }}
];
var SYN=[
  {id:'splitwave', ic:'🔱', n:'Splitting Waves', need:[['wave',2]],              d:'Waves split into 3 when they hit something'},
  {id:'bladestorm',ic:'🌪️', n:'Blade Storm',     need:[['whirl',1],['wave',1]],  d:'Every spin fires 8 waves in all directions'},
  {id:'overcharge',ic:'🌩️', n:'Overcharge',      need:[['volatile',1],['spark',1]], d:'Each explosion has a 35% chance to send lightning that hits 2 enemies'},
  {id:'tempest',   ic:'🌀', n:'Tempest',         need:[['orbit',1],['spark',1]], d:'+1 orbit blade, and every blade cut zaps the next enemy over'},
  {id:'shrapnel',  ic:'☄️', n:'Shrapnel',        need:[['volatile',1],['ricochet',1]], d:'Every explosion throws 2 bouncing shards (3 damage each)'},
  {id:'tcharge',   ic:'🛡️', ic2:'⚡', n:'Thunder Charge',  need:[['bash',1],['spark',1]],  d:'Every enemy you bash sends lightning on to 3 more enemies'},
  {id:'spite',     ic:'💢', n:'Spite Blast',     need:[['thorns',1],['volatile',1]], d:'Enemies that hit you explode (8 damage blast)'},
  {id:'thunder',   ic:'⛈️', n:'Thunder Guard',   need:[['aegis',1],['spark',1]], d:'Every dodge roll or block strikes up to 4 nearby enemies with lightning'},
  {id:'stormcall', ic:'⚔️', n:'Storm Blade',     need:[['wave',1],['spark',1]],  d:'Sword waves call lightning down on the first enemy they hit'},
  {id:'executioner',ic:'🪓', n:'Executioner',    need:[['edge',2],['riposte',1]], d:'Crits hit 3 times as hard, and a crit kill resets your dodge'},
  {id:'battlespin',ic:'💫', n:'Battle Spin',     need:[['bash',1],['whirl',1]],  d:'A shield bash that connects ends in a free spin attack'},
  {id:'bladering', ic:'✴️', n:'Blade Ring',      need:[['orbit',2],['wave',1]],  d:'Every 1.7 s each orbit blade fires a sword wave outward'}
];
/* readability pass 2026-11-15: every power says what it does from scratch (base) and its real numbers per level (st).
   The numbers are copied from the code that runs each power (stat(), powers(), strike(), roll, hurtP, thorns, explosions). */
/* how + use (playtest handoff 2026-11-15): cards lead with what the power does and what you do to use it (Automatic / Hold attack / After dodge / Defensive) */
var INFO={
  wave:{how:'Send attacks forward', use:'Hold attack', base:'Every sword swing also fires an energy wave straight ahead.', st:function(l){ return [['Wave damage',[0,5,6,8][l]],['Goes through',[0,2,4,6][l]+' enemies'],['Bounces off walls',l>=3?'yes':'no']]; }},
  whirl:{how:'Attack all around you', use:'Hold attack', base:'Keep swinging without a pause and your chain ends in a full spin that hits all around you.', st:function(l){ return [['Spin on',l>=3?'every 2nd swing':'every 3rd swing'],['Spin damage',(1.5+0.25*l)+'× sword'],['Spin reach','+'+Math.round((12+8*l)/58*100)+'%']]; }},
  riposte:{how:'Dodge, then land a powerful strike', use:'After dodge', base:'After every dodge roll, your next swing (within 1.2 s) is a critical hit: double damage plus a fan of 3 sword waves.', st:function(l){ return [['Dodge recharge',l>=2?'30% faster':'normal'],['Rolling through enemies',l>=3?'cuts them (6)':'no damage']]; }},
  edge:{how:'Bigger, longer sword hits', use:'Hold attack', base:'A sharper sword: every swing hits harder and reaches farther.', st:function(l){ return [['Sword damage',(3+2*l)+' (base 3)'],['Sword reach','+'+Math.round(7*l/58*100)+'%']]; }},
  volatile:{how:'Defeated enemies explode', use:'Automatic', base:'Defeated enemies explode and hurt the enemies around them.', st:function(l){ return [['Blast damage',VOLD[l]],['Blast size',[0,100,120,145][l]+'%'],['Blasts set off blasts',l>=3?'yes, one step':'no']]; }},
  spark:{how:'Automatic lightning', use:'Automatic', base:'Lightning strikes the nearest enemy on its own, then jumps to more enemies nearby.', st:function(l){ return [['Strikes every',CSPK.every[l]+' s'],['Jumps to',CSPK.jumps[l]+' more'],['First-hit damage',CSPK.dmg[l]]]; }},
  orbit:{how:'Blades circle you and cut', use:'Automatic', base:'Blades circle close around you and cut any enemy they touch.', st:function(l){ return [['Blades',[0,2,3,4][l]],['Damage per cut',3+l]]; }},
  ricochet:{how:'A bouncing orb, thrown for you', use:'Automatic', base:'Every 1.5 s you throw an orb at the nearest enemy. It bounces off walls and hits everything it passes.', st:function(l){ return [['Wall bounces',l+2],['Damage',3+l],['Orbs per throw',l>=3?2:1]]; }},
  bash:{how:'Damage enemies with your dodge', use:'After dodge', base:'Your dodge roll becomes a shield charge: enemies you roll into take damage and are stunned (the Warden is only pushed).', st:function(l){ return [['Bash damage',[0,6,9,13][l]],['Stun',[0,0.8,1.1,1.4][l]+' s'],['Dodge recharge',l>=3?'25% faster':'normal']]; }},
  thorns:{how:'Hurts enemies that hit you', use:'Defensive', base:'Enemies that hit you take damage back. Bumping into them deals half.', st:function(l){ return [['Damage back',[0,6,10,15][l]]]; }},
  aegis:{how:'Block a hit, then blast back', use:'Defensive', base:'A shield blocks one hit, then recharges. Each block blasts the enemies around you, and every block makes the next blast stronger (up to 5).', st:function(l){ return [['Recharge',[0,12,9,6][l]+' s'],['First blast damage',Math.round((6+3*l)*1.25)]]; }},
  ward:{how:'Reflect enemy projectiles', use:'Defensive', base:'Relic gems circle close to you. They catch enemy magic orbs and fire them back as bolts, and nick enemies they touch.', st:function(l){ return [['Gems',l],['Bolt damage',8+3*l],['Bolts go through',l>=3?'3 enemies':'1 enemy']]; }},
  heart:{how:'One more heart', use:'Defensive', base:'One more heart, and you heal to full.', st:function(l){ return [['Max hearts',Math.min(MAXH,S&&S.w?S.w.p.max-L('heart')+l:5+l)]]; }},
  boots:{how:'Run and dodge faster', use:'Always on', base:'You run faster and your dodge roll recharges sooner.', st:function(l){ return [['Move speed','+'+(12*l)+'%'],['Dodge recharge',(10*l)+'% faster']]; }}
};
/* the stat lines for a card: from -> to, changed ones marked */
function statRows(id,from,to){ var a=from?INFO[id].st(from):null, b=INFO[id].st(to);
  return b.map(function(r,i){ var o=a?String(a[i][1]):null, n=String(r[1]), ch=o!==null&&o!==n;
    return '<div class="dn-st'+(ch?' ch':'')+(o!==null&&!ch?' same':'')+'"><span class="sl">'+r[0]+'</span><span class="sv">'+(ch?'<s>'+o+'</s> → ':'')+n+'</span></div>'; }).join(''); }
function synName(s){ return s.need.map(function(q){ return UPI[q[0]].n+(q[1]>1?' Lv '+q[1]:''); }).join(' + '); }
var UPI={}; UP.forEach(function(u){ UPI[u.id]=u; }); SYN.forEach(function(u){ UPI[u.id]=u; u.syn=1; });
function L(id){ return S.w.b[id]||0; }
function HAS(id){ return !!(S.w.b[id]); }
function synReady(u){ return !HAS(u.id)&&u.need.every(function(q){ return L(q[0])>=q[1]; }); }
function synFor(id){ return SYN.filter(function(u){ return u.need.some(function(q){ return q[0]===id; }); }); }

/* ---------- a run ---------- */
function freshWorld(){
  return { rid:'entry', from:'s', seen:{entry:1}, t:0, runT:0,
    p:{x:W/2,y:H-70,r:11,fx:0,fy:-1,hp:5,max:5,arm:0,inv:0,sw:0,swA:0,cd:0,kx:0,ky:0,sh:0,walk:0,roll:0,rollCd:0,rx:0,ry:0,rip:0,chain:0,chainT:0,sid:0,spin:0,crit:0,buyLock:0},
    b:{}, picks:0, xp:0, lv:1, need:7,   /* 7 (was 5): the starter relic is free now, so the Entry Hall pays one level instead of two */
    pend:0, coins:0, kills:0, combo:0, comboT:0, bestCombo:0, flawless:0, last:0, en:[], spawns:[], gems:[], coinsF:[], hearts:[], shots:[], orbs:[], fx:[], booms:[], tele:[],
    waves:[], wave:0, waveT:0.9, cleared:false, open:false, door:false, chest:null, resolve:0, siegeT:0, crack:0, shop:null, boss:null, victory:0,
    tm:{spark:1.5, rico:1, spawn:0.5, swarm:22}, oa:0, banner:null, fork:Math.random()<0.5?1:0, impV:Math.random()<0.5?1:0, secL:Math.random()<0.5?1:0, batch:null }; }
function loadRoom(id,from){ var w=S.w, R=ROOMS[id]; applyFork(); w.bannerQ=[]; w.batch=null; w.aeg=0; w.hurtRoom=0; w.roomT0=w.runT; w.rid=id; w.from=from||'s'; w.seen[id]=1; buildMap(R.kind);
  w.en=[]; w.spawns=[]; w.gems=[]; w.coinsF=[]; w.hearts=[]; w.shots=[]; w.orbs=[]; w.fx=[]; w.booms=[]; w.tele=[]; w.t=0; w.fires=[]; w.p.burn=0;
  w.waves=(R.waves||[]).map(function(v){ return v.slice(); });
  var pe=pathE(id); if(pe&&!R.after){ var wi=1+Math.floor(Math.random()*(w.waves.length-1)); w.waves[wi].push([pe,1]); if(id==='arena') w.waves[w.waves.length-1].push([pe,1]); }   /* a taste of this side's new enemy in its first room */
  if(R.after==='arena') w.waves.shift();   /* the Proving Ground side already fought 4 waves, so its second room has 3: both paths stay about even */
  w.wave=0; w.waveT=0.9; w.chest=null; w.resolve=0; w.siegeT=R.siege||0; w.crack=0; w.boss=null; w.shop=null;
  w.cleared=!w.waves.length&&!R.siege&&!R.boss; w.open=w.door=w.cleared;
  if(R.shop){ w.mA='wave'; w.mAt=0; }   /* the merchant waves hello as you walk in */
  if(R.shop) w.shop=[{id:'heal',ic:'🧪',n:'Potion',d:'Heal to full',cost:10},{id:'max',ic:'❤️',n:'Heart Container',d:'+1 max heart',cost:18},{id:'card',ic:'📜',n:'Upgrade Scroll',d:'Pick 1 of 3 powers',cost:22,next:[34,48]},{id:'gold',ic:'🌟',n:'Gold Scroll',d:'Pick 1 of 3 gold powers (+2 levels)',cost:48},{id:'arm',ic:'🪖',n:'Armor',d:'Blocks the next 3 hits',cost:26},{id:'rev',ic:'💙',n:'Second Wind',d:'One more chance if you are knocked out again',cost:30}].map(function(it,k){ it.x=W/2+(k-2.5)*130; it.y=322; return it; });
  if(w.shop&&S.revExtra) w.shop[5].sold=1;   /* Second Wind (Kody 2026-11-15): a second revive, bought here, one per run */
  placePots(id);
  if(R.secret) w.secretChest=ROOMART?{x:secretX(),y:FLR[1]+10,open:false}:{x:w.secL?W-(27.5*TS+15):27.5*TS+15,y:2.5*TS,open:false};
  else w.secretChest=null;
  var p=w.p; p.kx=p.ky=0; p.roll=0; p.inv=Math.max(p.inv,0.6);
  var dy0=ROOMART?(DOORS[0]+DOORS[1])/2:9*TS; if(from==='w'){ p.x=W-78; p.y=dy0; p.fx=-1; p.fy=0; } else if(from==='e'){ p.x=78; p.y=dy0; p.fx=1; p.fy=0; } else { p.x=W/2; p.y=H-64; p.fx=0; p.fy=-1; }
  w.banner={txt:R.name.toUpperCase(),sub:R.sub||'',t:2.4};
  if(R.boss){ w.bossIntro=1.6; SND.boss(); } }
function openSecret(noDraw){ if(ROOMART){ if(!noDraw) buildMap(ROOMS[S.w.rid].kind); return; } var x0=S.w.secL?1:25, x, y; for(y=1;y<=3;y++) for(x=x0+1;x<=x0+4;x++) tset(x,y,0); tset(x0+2,4,0); tset(x0+3,4,0); if(!noDraw) ROOMC=drawRoom(ROOMS[S.w.rid].kind); }
function applyFork(){ var f=S.w&&S.w.fork, iv=S.w&&S.w.impV, vs=f?1:-1, vn=iv?'kiln':'barracks', an=iv?'barracks':'kiln';
  ROOMS.cross.exits=f?{w:'arena',e:'vault'}:{w:'vault',e:'arena'}; MAPPOS.vault=[vs,6]; MAPPOS.arena=[-vs,6];
  /* equal rewards: each path gets one treasure chest and one gold chest */
  ROOMS.vault.exits={n:vn}; ROOMS.arena.exits={n:an}; MAPPOS[vn]=[vs,5]; MAPPOS[an]=[-vs,5]; ROOMS[vn].chest='gold'; ROOMS[an].chest='treasure'; ROOMS[vn].after='vault'; ROOMS[an].after='arena'; }
function pathE(id){ var n=id==='kiln'||id==='barracks'?id:(id==='vault'||id==='arena')?(ROOMS[id].exits||{}).n:null; return n==='kiln'?'imp':n==='barracks'?'lance':null; }
function restoreMap(){ applyFork(); buildMap(ROOMS[S.w.rid].kind); var w=S.w; if(w.boss) w.boss=w.en.filter(function(e){ return e.type==='boss'&&!e.dead; })[0]||null; }

/* ---------- collision ---------- */
function solid(tx,ty){ var t=tget(tx,ty); if(t===1||t===2||t===4||t===8) return true; if(t===3||t===9||t===10) return !S.w.open; return false; }
function solidE(tx,ty){ var t=tget(tx,ty); if(t===3||t===9||t===10) return true; return solid(tx,ty); }
function collide(e,sf){ sf=sf||solid; for(var pass=0;pass<2;pass++){
  var x0=Math.floor((e.x-e.r)/TS), x1=Math.floor((e.x+e.r)/TS), y0=Math.floor((e.y-e.r)/TS), y1=Math.floor((e.y+e.r)/TS);
  for(var ty=y0;ty<=y1;ty++) for(var tx=x0;tx<=x1;tx++){ if(!sf(tx,ty)) continue;
    var qx=clamp(e.x,tx*TS,tx*TS+TS), qy=clamp(e.y,ty*TS,ty*TS+TS), dx=e.x-qx, dy=e.y-qy, d2=dx*dx+dy*dy;
    if(d2<e.r*e.r){ e.hitWall=1; if(d2>0.0001){ var d=Math.sqrt(d2), k=(e.r-d); e.x+=dx/d*k; e.y+=dy/d*k; }
      else { var cxm=tx*TS+TS/2, cym=ty*TS+TS/2, ox=e.x-cxm, oy=e.y-cym; if(Math.abs(ox)>Math.abs(oy)) e.x=cxm+(ox<0?-1:1)*(TS/2+e.r); else e.y=cym+(oy<0?-1:1)*(TS/2+e.r); } } }
    if(ROOMRECTS) for(var ri=0;ri<ROOMRECTS.length;ri++){ var rr=ROOMRECTS[ri]; if(rr[4]&&S.w.open&&sf===solid) continue;
      var qx2=clamp(e.x,rr[0],rr[2]), qy2=clamp(e.y,rr[1],rr[3]), ex=e.x-qx2, ey=e.y-qy2, dd=ex*ex+ey*ey;
      if(dd<e.r*e.r){ e.hitWall=1; if(dd>0.0001){ var dq=Math.sqrt(dd), kq=e.r-dq; e.x+=ex/dq*kq; e.y+=ey/dq*kq; }
        else { var l2=e.x-rr[0], r2=rr[2]-e.x, t2=e.y-rr[1], b2=rr[3]-e.y, m2=Math.min(l2,r2,t2,b2); if(m2===l2) e.x=rr[0]-e.r; else if(m2===r2) e.x=rr[2]+e.r; else if(m2===t2) e.y=rr[1]-e.r; else e.y=rr[3]+e.r; } } } }
  return e; }
function wallAt(x,y){ var t=tget(Math.floor(x/TS),Math.floor(y/TS)); if(t===1||t===2||t===4||t===8||((t===3||t===9||t===10)&&!S.w.open)) return true; if(ROOMRECTS) for(var ri=0;ri<ROOMRECTS.length;ri++) if(inR(x,y,ROOMRECTS[ri])) return true; return false; }
function lineClear(x0,y0,x1,y1){ var n=Math.ceil(Math.hypot(x1-x0,y1-y0)/12); for(var i=1;i<n;i++){ if(wallAt(x0+(x1-x0)*i/n,y0+(y1-y0)*i/n)) return false; } return true; }

/* ---------- stats ---------- */
function stat(){ var e=L('edge'), bo=L('boots');
  return { dmg:3+2*e, range:58+7*e, arc:2.4, cd:0.3, spd:180*(1+0.12*bo), rollCd:Math.max(0.55,1.15*(L('riposte')>=2?0.7:1)*(L('bash')>=3?0.75:1)*(1-0.1*bo)) }; }

/* ---------- combat ---------- */
var DSRC='sword', BGEN=0; function tally(d){ var t=window.__dmg; if(t) t[DSRC]=(t[DSRC]||0)+d; }
function angDiff(a,b){ var d=a-b; while(d>Math.PI) d-=2*Math.PI; while(d<-Math.PI) d+=2*Math.PI; return Math.abs(d); }
/* Kody's classroom test 2026-11-16: "lightning and volatile are still way too strong, especially for dealing with the skeletons".
   Chain Spark: slower (was 2.4/2.0/1.6 s), one fewer jump (was 2/3/4), less damage (was 6/8/10). Volatile blasts 2/3/4 (was 3/4/5).
   Shield knights' shields ground lightning and blunt blasts: they take a third of any storm damage, so the sword is still the answer. */
var STORMD={spark:1,overcharge:1,tcharge:1,thunder:1,stormcall:1,volatile:1,spite:1};
function hurtE(e,d,fx,fy,kb,opt){ if(e.dead) return; opt=opt||{}; var w=S.w;
  /* Kody 2026-11-18: Ember Imps ignore everything except a real sword slash (powers, storms, blasts, fire, rubble, bash, riposte), and one slash always kills */
  if(e.type==='imp'){ if(!(DSRC==='sword'&&opt.melee)){ if(!(e.t-(e.immT||-9)<1.2)&&w.fx.length<90){ e.immT=e.t; w.fx.push({k:'txt',x:e.x,y:e.y-30,t:0,v:'IMMUNE',c:'#FFB36B'}); } return; } d=Math.max(d,e.hp); }
  if(e.type==='skel'&&STORMD[DSRC]&&d>0) d=Math.max(1,Math.round(d/3));
  /* skeleton knights block sword hits from the front, unless they are recovering or you crit */
  if(e.type==='skel'&&(opt.melee||opt.proj||opt.orb)&&!opt.crit&&!opt.bash&&e.st!==3){ var pa=opt.proj?Math.atan2(-fy,-fx):Math.atan2(w.p.y-e.y,w.p.x-e.x); if(angDiff(pa,e.fa)<1.3){ d=0; SND.clang(); if(!(w.t-(e.blkAt||-9)<0.9)){ e.blkAt=w.t; if(!(w.t-(w.blkTxt||-9)<0.7)){ w.blkTxt=w.t; w.fx.push({k:'txt',x:e.x,y:e.y-34,t:0,v:'BLOCKED',c:'#CFE0FF'}); } if(opt.melee){ w.p.kx-=fx*70; w.p.ky-=fy*70; } }   /* a small push back, once per knight per 0.9 s (was 220 on every blocked hit: Rook pinballed in crowds, Kody's playtest 2026-11-15) */ kb=40; if(!opt.melee) return; } }
  if(e.type==='boss'&&e.st===9) d=Math.round(d*1.6);   /* stunned boss takes more */
  if(e.type==='lance'&&e.st===9) d=Math.round(d*1.5);   /* so does a Lancer stuck in a wall */
  tally(Math.min(d,Math.max(0,e.hp))); e.hp-=d; e.fl=0.09; if(kb){ var k=kb/(ET[e.type].heavy?5:1); e.kx+=fx*k; e.ky+=fy*k; }
  if(d>0&&w.fx.length<80) w.fx.push({k:'num',x:e.x+rnd(-4,4),y:e.y-e.r-6,t:0,v:d,c:opt.crit?'#FFC93C':'#FFFFFF'});
  if(e.type==='slime'&&opt.melee&&d>0){ e.sq=0.1; for(var gd=0;gd<(RM?3:4)&&w.fx.length<90;gd++) w.fx.push({k:'goo',x:e.x+rnd(-4,4),y:e.y-6,vx:fx*rnd(40,110)+rnd(-50,50),vy:rnd(-130,-50),t:0,c:['#FD63AF','#C63A80','#FEE6F3','#FD63AF'][gd]}); }   /* goo droplets and a quick squash */
  if(opt.melee&&w.fx.length<90) w.fx.push({k:'spark',x:e.x-fx*e.r*0.6,y:e.y-fy*e.r*0.6-6,a:Math.atan2(fy,fx),t:0});
  SND.hit(e,opt); if(e.hp<=0) killE(e,opt); }
/* score = points. Kills are worth more while your combo is high; getting hit drops it. Rooms pay for speed and for taking no hits. */
function cMult(){ var c=S.w.combo||0; return Math.min(5,1+0.25*Math.floor(c/5)); }
function addPts(n,x,y,col){ var w=S.w; n=Math.round(n); S.score+=n; if(x!=null&&w.fx.length<100) w.fx.push({k:'txt',lo:1,x:x,y:y,t:0,v:'+'+n,c:col||'#FFE08A'}); }
function killE(e,opt){ var w=S.w, t=ET[e.type]; e.dead=true; w.kills++; SND.die(e);
  if(w.fx.length<130){ var dn=RRE[e.type]; if(dn&&rrReady(dn)&&!e.small){ var dz=enemyFrame(e,w.p); w.fx.push({k:'die',n:rrReady(dz.n)?dz.n:dn,row:rrReady(dz.n)?dz.row:Math.min(1,dz.row),col:dz.col,fl:dz.fl,x:e.x,y:e.y+e.r+2,t:0}); } if(!RM) w.fx.push({k:'pop',x:e.x,y:e.y-8,t:0}); }
  if(opt&&opt.crit&&HAS('executioner')) w.p.rollCd=0;
  var late=ROOMS[w.rid].siege||ROOMS[w.rid].boss;
  if(e.el){ addPts(60*cMult()*(w.last>0?2:1),e.x,e.y-40,'#FFC93C'); if(!(w.last>0)){ for(var eg=0;eg<3;eg++) dropGem(e.x+rnd(-14,14),e.y+rnd(-14,14),2); for(var ec=0;ec<(late?0:2);ec++) w.coinsF.push({x:e.x+rnd(-12,12),y:e.y+rnd(-12,12),m:0}); } }
  if(e.type!=='boss'){ var m0=cMult(); w.combo=(w.combo||0)+1; w.comboT=COMBOT; w.comboPop=0.12; w.bestCombo=Math.max(w.bestCombo||0,w.combo); if(cMult()>m0){ w.comboUp=0.9; SND.combo(cMult()); } var bladeK=DSRC==='sword'||DSRC==='wave'||DSRC==='riposte'||DSRC==='return'||DSRC==='bash'||DSRC==='thorns'||DSRC==='spite'||DSRC==='tcharge'; S.score+=Math.round(10*cMult()*(bladeK?1.6:1)*(w.last>0?2:1)); if(w.last>0) w.lsKills=(w.lsKills||0)+1; }  /* blade kills are riskier, so they pay more */
  if(t.xp&&!(w.last>0)) for(var i=0;i<(e.small?1:Math.max(1,Math.round(t.xp/2)));i++) dropGem(e.x+rnd(-8,8),e.y+rnd(-8,8),e.small?1:Math.ceil(t.xp/Math.max(1,Math.round(t.xp/2))));
  if(!(w.last>0)&&!late&&Math.random()<t.coin*0.6*(e.small?0.5:1)) for(var c=0;c<(t.coin>=1?2:1);c++) w.coinsF.push({x:e.x+rnd(-10,10),y:e.y+rnd(-10,10),m:0});
  if(w.fx.length<100) for(var j=0;j<(RM||w.fx.length>50?3:7);j++) w.fx.push({k:'bit',x:e.x,y:e.y-8,vx:rnd(-110,110),vy:rnd(-140,30),t:0,c:t.col});
  if(!(w.last>0)&&Math.random()<(w.p.hp<=2?0.15:0.045)&&w.p.hp<w.p.max&&w.hearts.length<4) w.hearts.push({x:e.x,y:e.y,t:0});
  else if(w.last>0&&w.p.hp<w.p.max&&!w.hearts.length&&(w.t-(w.lsHeartT||-99))>25&&Math.random()<0.004){ w.lsHeartT=w.t; w.hearts.push({x:e.x,y:e.y,t:0}); }   /* Kody 2026-11-16: Last Stand hearts are back but insanely rare (0.4% a kill, one at a time, 25 s apart) */
  if(e.type==='slime'&&w.fx.length<130) w.fx.push({k:'splat',x:e.x,y:e.y+e.r+2,sm:e.small?1:0,t:0});   /* goo splat on the floor, also when a big one splits */
  if(e.type==='slime'&&!e.small){ for(var s2=0;s2<2;s2++){ var a=Math.random()*6.28, sm=spawnEnemy('slime',e.x+Math.cos(a)*10,e.y+Math.sin(a)*10,1,true); sm.kx=Math.cos(a)*220; sm.ky=Math.sin(a)*220; sm.cd=0.6; } }
  if(L('volatile')&&w.booms.length<40&&(DSRC!=='volatile'||(L('volatile')>=3&&!BGEN))){ var lv=L('volatile'); w.booms.push({x:e.x,y:e.y,r:[0,40,48,58][lv],dmg:VOLD[lv],t:0.06,g:DSRC==='volatile'?1:0}); }   /* level 3 chains one step, never forever */
  if(opt&&opt.melee&&!RM) S.hs=Math.max(S.hs||0,0.05);
  if(e.type==='boss'&&w.last>0){ w.lsWK=(w.lsWK||0)+1; addPts(1500,e.x,e.y-60,'#FFC93C'); SND.bossDown(); toast('A Warden falls! +1500'); for(var q=0;q<(RM?6:16);q++) w.fx.push({k:'bit',x:e.x,y:e.y-20,vx:rnd(-160,160),vy:rnd(-200,20),t:0,c:'#8A92BE'}); }
  else if(e.type==='boss'){ var bt=w.runT-(w.roomT0||w.runT); addPts(2000+Math.max(0,1500-15*bt)+(w.hurtRoom?0:500),e.x,e.y-60,'#FFC93C'); w.flawless+=w.hurtRoom?0:1; SND.bossDown(); w.won=1; w.victory=2.6; w.en.forEach(function(o){ if(o!==e&&!o.dead){ o.dead=true; } }); w.tele=[]; w.orbs=[]; var gv=0; w.gems.forEach(function(g){ gv+=g.v; }); w.gems=[]; if(gv) gainXP(gv,1);   /* gems still on the floor count */ toast('The Iron Warden falls!'); } }
function dropGem(x,y,v){ var w=S.w; if(w.gems.length>=200){ w.gems[Math.floor(Math.random()*w.gems.length)].v+=v; return; } w.gems.push({x:x,y:y,v:v,m:0}); }
function nearestFoe(x,y,maxD,skip){ var w=S.w, best=null, bd=maxD*maxD; for(var i=0;i<w.en.length;i++){ var e=w.en[i]; if(e.dead||(skip&&skip.indexOf(e)>=0)) continue; var dx=e.x-x, dy=e.y-y, d2=dx*dx+dy*dy; if(d2<bd){ bd=d2; best=e; } } return best; }
/* sword: swings the way Rook faces. Light aim help: an enemy within ~50° of where you face pulls the swing toward it. */
function aimAngle(range){ var w=S.w, p=w.p, fa=Math.atan2(p.fy,p.fx), best=null, bs=1e9;
  for(var i=0;i<w.en.length;i++){ var e=w.en[i]; if(e.dead) continue; var dx=e.x-p.x, dy=e.y-p.y, d=Math.hypot(dx,dy); if(d>range+e.r) continue; var ad=angDiff(Math.atan2(dy,dx),fa); if(ad>0.9) continue; var sc=d+ad*80; if(sc<bs){ bs=sc; best=e; } }
  return best?Math.atan2(best.y-p.y,best.x-p.x):fa; }
function swingHits(){ var w=S.w, p=w.p, s=stat(), a=p.swA, rng=p.spin?s.range+12+8*L('whirl'):s.range, arc=p.spin?7:s.arc, mult=(p.spin?1.5+0.25*L('whirl'):1)*(p.crit?(HAS('executioner')?3:2):1), hit=false; DSRC='sword';
  for(var i=0;i<w.en.length;i++){ var e=w.en[i]; if(e.dead||e.sid===p.sid) continue; var dx=e.x-p.x, dy=e.y-p.y+6, d=Math.hypot(dx,dy);
    if(d-e.r<rng+4&&(d<e.r+16||angDiff(Math.atan2(dy,dx),a)<arc/2)){ e.sid=p.sid; hit=true; hurtE(e,Math.round(s.dmg*mult),dx/(d||1),dy/(d||1),p.crit?520:p.spin?320:240,{melee:1,crit:p.crit}); } }
  if(hit&&!p.hitOnce){ p.hitOnce=1; if(!RM){ S.hs=Math.max(S.hs||0,p.crit?0.09:0.04); w.shake=Math.max(w.shake||0,p.crit?0.12:0.05); } }
  potHitsSwing(rng,arc,a);
  /* bat orbs back: a swing that meets an enemy orb sends it flying at the nearest enemy */
  w.orbs.forEach(function(o){ if(o.fr) return; var dx=o.x-p.x, dy=o.y-(p.y-6), d=Math.hypot(dx,dy); if(d<rng+8&&(d<22||angDiff(Math.atan2(dy,dx),a)<arc/2)){ var tg=nearestFoe(o.x,o.y,600), ta=tg?Math.atan2(tg.y-o.y,tg.x-o.x):a; o.fr=1; o.vx=Math.cos(ta)*420; o.vy=Math.sin(ta)*420; o.t=0; SND.clang(); w.fx.push({k:'txt',x:o.x,y:o.y-14,t:0,v:'Return!',c:'#7DF5FF'}); } });
  /* secret wall */
  if(w.secretChest&&!w.secretOpen){ (ROOMART?[[0,0]]:w.secL?[[3,4],[4,4]]:[[27,4],[28,4]]).forEach(function(c){ if(!ROOMART&&tget(c[0],c[1])!==8) return; var tx=ROOMART?secretX():c[0]*TS+15, ty=ROOMART?FLR[1]-4:c[1]*TS+15; if(Math.hypot(tx-p.x,ty-p.y)<rng+22&&!p.crackHit){ p.crackHit=1; w.crack++; SND.wall(); if(!RM) w.shake=0.1; for(var k=0;k<8;k++) w.fx.push({k:'bit',x:tx,y:ty+10,vx:rnd(-90,90),vy:rnd(-120,10),t:0,c:'#6E76A4'});
      if(w.crack>=3){ w.secretOpen=1; openSecret(); if(!ROOMART) ROOMC=drawRoom(ROOMS[w.rid].kind); SND.solve(); toast('A secret room!'); } else toast(w.crack===1?'That wall sounds hollow...':'It is cracking!'); } }); } }
function swing(){ var w=S.w, p=w.p, s=stat(); if(p.cd>0||p.roll>0) return; var a=aimAngle(s.range+30);
  p.chain=(w.t-p.chainT<0.6)?p.chain+1:1; p.chainT=w.t;
  var every=L('whirl')>=3?2:3; p.spin=L('whirl')&&p.chain>=every&&p.chain%every===0?1:0;
  p.crit=p.rip>0&&(L('riposte')||p.ripP)?1:0; if(p.crit){ p.rip=0; p.ripP=0; SND.crit(); }
  p.swA=a; p.sw=p.spin?0.26:0.2; p.cd=s.cd; p.hitOnce=0; p.crackHit=0; p.struck=0; p.swR=0; SND.swing(); p.sid++; }
/* the blade goes live after a short windup (RR_WIND), on the slash frame */
function strike(){ var w=S.w, p=w.p, a=p.swA; p.struck=1; swingHits();
  var lw=L('wave'); DSRC='wave';
  if(p.spin&&HAS('bladestorm')){ for(var k=0;k<8;k++) fireWave(k*Math.PI/4,Math.max(1,lw)); }
  else if(lw) fireWave(a,lw);
  if(p.crit&&L('riposte')){ fireWave(a-0.35,Math.max(1,lw)); fireWave(a+0.35,Math.max(1,lw)); if(!lw) fireWave(a,1); } }
function fireWave(a,l,x,y,child){ var w=S.w, p=w.p, ux=Math.cos(a), uy=Math.sin(a);
  w.shots.push({k:'wave',x:x!=null?x:p.x+ux*16,y:y!=null?y:p.y-6+uy*16,vx:ux*380,vy:uy*380,a:a,t:0,life:child?0.35:0.55,dmg:child?2+l:3+Math.round(1.5*l),pierce:child?2:[0,2,4,6][l],bounce:!child&&l>=3?1:0,child:child?1:0,hit:[]}); }
var BUF={s:0,r:0};
function roll(){ var w=S.w, p=w.p, s=stat(); if(p.roll>0||p.rollCd>0||S.mode!=='play'){ if(S.mode==='play') BUF.r=0.15; return; }
  var mx=(HELD.arrowright||HELD.d?1:0)-(HELD.arrowleft||HELD.a?1:0), my=(HELD.arrowdown||HELD.s?1:0)-(HELD.arrowup||HELD.w?1:0), ml=Math.hypot(mx,my);
  p.rx=ml?mx/ml:p.fx; p.ry=ml?my/ml:p.fy; p.roll=0.24; p.rollCd=s.rollCd; p.inv=Math.max(p.inv,0.3); p.rolling=1; p.rollHit=[]; SND.dodge(); if(p.burn>0){ p.burn=0; p.bn=0; S.w.fx.push({k:'txt',x:p.x,y:p.y-56,t:0,v:'Fire out!',c:'#7DF5FF'}); }   /* Kody 2026-11-18: a dodge roll puts the fire out again */
  if(HAS('thunder')) thunderGuard(); }
function thunderGuard(){ var w=S.w, p=w.p, near=w.en.filter(function(e){ return !e.dead&&Math.hypot(e.x-p.x,e.y-p.y)<220; }).sort(function(a,b){ return Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y); }).slice(0,4);
  DSRC='thunder'; near.forEach(function(e){ w.fx.push({k:'zap',x:e.x,y:e.y,t:0}); hurtE(e,5+2*L('spark'),0,0,0); }); if(near.length) SND.zap(); }
function thorns(e,mult){ var w=S.w, l=L('thorns'); if(!l||!e||!e.type||e.dead||e.thT>0) return; e.thT=0.45; DSRC='thorns'; var dx=e.x-w.p.x, dy=e.y-w.p.y, d=Math.hypot(dx,dy)||1;
  hurtE(e,Math.round([0,6,10,15][l]*(mult||1)),dx/d,dy/d,260); if(w.fx.length<90) w.fx.push({k:'spark',x:(e.x+w.p.x)/2,y:(e.y+w.p.y)/2-8,a:Math.atan2(dy,dx),t:0});
  if(HAS('spite')&&(mult||1)>=1&&w.booms.length<40) w.booms.push({x:e.x,y:e.y,r:64,dmg:8,t:0.05,spite:1}); }
function hurtP(src,dmg){ var w=S.w, p=w.p; if(S.mode!=='play'||w.victory) return; if(src&&src.type) thorns(src,1);
  if(p.inv>0){ if(p.roll>0&&!p.perfect){ p.perfect=1; p.rip=1.4; p.ripP=1; addPts(50*cMult(),p.x,p.y-60,'#7DF5FF'); S.slow=RM?0:0.35; SND.crit(); w.fx.push({k:'txt',x:p.x,y:p.y-40,t:0,v:'Perfect! Strike now!',c:'#7DF5FF'}); w.fx.push({k:'ring',x:p.x,y:p.y-6,t:0}); } return; }
  /* Kody's classroom test 2026-11-16: kids with armor and Aegis took no damage in the Last Stand. There a Warden's blow smashes through
     armor and Aegis and costs 2 hearts; only a dodge (or being out of reach) saves you. A kid who walked away still survived,
     so falling rubble (aimed at Rook) also gets through armor and Aegis there, for 1 heart: standing still is no longer safe. */
  var wb=src&&(src.fire||w.last>0&&(src.type==='boss'||src.ls||src.rk));
  if(wb){ if(w.last>0&&!src.rk&&!src.fire) dmg=2; if(p.arm>0||(L('aegis')&&p.sh<=0)) w.fx.push({k:'txt',x:p.x,y:p.y-34,t:0,v:'Smashed through!',c:'#FF8A8A'}); }
  if(p.arm>0&&!wb){ p.arm--; p.inv=0.8; SND.block(); w.fx.push({k:'txt',x:p.x,y:p.y-34,t:0,v:p.arm?'Armor! ('+p.arm+' left)':'Armor broke!',c:'#7DC8FF'}); w.fx.push({k:'ring',x:p.x,y:p.y-6,t:0}); return; }
  if(L('aegis')&&p.sh<=0&&!wb){ p.sh=[0,12,9,6][L('aegis')]; w.aeg=Math.min(5,(w.aeg||0)+1); var ar=130+20*w.aeg, am=1+0.25*w.aeg; w.fx.push({k:'boom',x:p.x,y:p.y-6,r:ar,t:0}); p.inv=0.8; SND.block(); w.fx.push({k:'txt',x:p.x,y:p.y-34,t:0,v:'Blocked!',c:'#4DE0C0'}); p.blkT=0.3; w.fx.push({k:'ring',x:p.x,y:p.y-6,t:0});
    DSRC='aegis'; w.en.forEach(function(e){ var dx=e.x-p.x, dy=e.y-p.y, d=Math.hypot(dx,dy)||1; if(d<ar&&!e.dead) hurtE(e,Math.round((6+3*L('aegis'))*am),dx/d,dy/d,420); }); w.orbs=w.orbs.filter(function(o){ return o.fr||Math.hypot(o.x-p.x,o.y-p.y)>ar; });
    if(HAS('thunder')) thunderGuard(); return; }
  w.hitBy=!src?'':src.fire?'fire':src.type?src.type:('vx' in src)?'orb':('r' in src)?'ring':'rubble';
  p.hp-=dmg||1; p.inv=early(w)?1.3:1.0; p.hurtT=0.22; if(w.combo>=5) w.fx.push({k:'txt',x:p.x,y:p.y-56,t:0,v:'Combo lost',c:'#FF8A8A'}); w.combo=0; w.hurtRoom=1; SND.hurt(); if(!RM){ w.shake=0.2; S.hs=0.06; } w.fx.push({k:'hurt',t:0});
  if(src){ var dx=p.x-src.x, dy=p.y-src.y, d=Math.hypot(dx,dy)||1; p.kx=dx/d*280; p.ky=dy/d*280; }
  if(p.hp<=0){ p.hp=0; knockedOut(); } }

/* ---------- update ---------- */
var GRIDN=28*17, GRID=[]; (function(){ for(var i=0;i<GRIDN;i++) GRID.push([]); })();
function update(dt){ var w=S.w, p=w.p, s=stat(), i, e;
  w.t+=dt; w.runT+=dt; if(w.shake) w.shake=Math.max(0,w.shake-dt); if(w.comboT>0){ w.comboT-=dt; if(w.comboT<=0) w.combo=0; } if(w.comboPop>0) w.comboPop-=dt; if(w.comboUp>0) w.comboUp-=dt; if(w.ringT>0) w.ringT-=dt;
  if(w.banner){ w.banner.t-=dt; if(w.banner.t<=0) w.banner=null; }
  if(!w.banner&&w.bannerQ&&w.bannerQ.length) w.banner=w.bannerQ.shift();
  if(w.victory){ w.victory-=dt; stepFx(dt); if(w.victory<=0){ w.victory=0; if(w.pend>0){ w.preLast=1; w.resolve=0; } else startLast(); } return; }
  /* levels banked during the Warden fight are paid out before the Last Stand starts */
  if(w.preLast){ stepFx(dt); if(w.pend>0){ w.resolve-=dt; if(w.resolve<=0) levelUp(); } else { w.preLast=0; startLast(); } hud(); return; }
  /* move (or roll) */
  var mx=(HELD.arrowright||HELD.d?1:0)-(HELD.arrowleft||HELD.a?1:0), my=(HELD.arrowdown||HELD.s?1:0)-(HELD.arrowup||HELD.w?1:0);
  var ml=Math.hypot(mx,my); p.mv=!!ml; if(ml&&p.roll<=0&&p.sw<=0.1){ p.fx=mx/ml; p.fy=my/ml; } if(ml) p.walk+=dt;
  if(p.roll>0){ var rs=380*(1+0.06*L('boots')); p.x+=p.rx*rs*dt; p.y+=p.ry*rs*dt; p.roll-=dt;
    var lb=L('bash'); if(lb) w.en.forEach(function(e){ if(!e.dead&&p.rollHit.indexOf(e)<0&&Math.hypot(e.x-p.x,e.y-p.y)<e.r+p.r+10){ p.rollHit.push(e); DSRC='bash'; SND.clang(); if(!RM) S.hs=Math.max(S.hs||0,0.05);
        hurtE(e,[0,6,9,13][lb],p.rx,p.ry,e.type==='boss'?60:560,{melee:1,bash:1}); if(e.type!=='boss'&&!e.dead){ e.stun=[0,0.8,1.1,1.4][lb]; e.st=0; e.cd=Math.max(e.cd,0.4); }
        if(HAS('tcharge')){ var nx=nearestFoe(e.x,e.y,180,[e]); if(nx){ DSRC='tcharge'; chainZap(e.x,e.y,nx,2,6+2*L('spark')); SND.zap(); } } } });
    if(L('riposte')>=3) w.en.forEach(function(e){ if(!e.dead&&p.rollHit.indexOf(e)<0&&Math.hypot(e.x-p.x,e.y-p.y)<e.r+p.r+6){ p.rollHit.push(e); DSRC='riposte'; hurtE(e,6,p.rx,p.ry,200); } });
    if(p.roll<=0){ p.rolling=0; p.perfect=0; p.rec=0.16; if(L('riposte')&&p.rip<=0) p.rip=1.2; if(early(w)&&L('bash')&&p.rollHit&&p.rollHit.length) p.inv=Math.max(p.inv,0.4);
      if(HAS('battlespin')&&L('bash')&&p.rollHit&&p.rollHit.length){ p.rec=0; p.chain=0; p.spin=1; p.crit=0; p.swA=Math.atan2(p.ry,p.rx); p.sw=0.26; p.cd=0.22; p.hitOnce=0; p.crackHit=0; p.struck=0; p.swR=0; p.sid++; SND.swing(); } } }
  else { var slow=(p.sw>0?0.85:1)*(p.rec>0?0.25:1);   /* Kody's playtest 2026-11-15: holding attack slowed Rook to 55% for most of a fight; now 85% */ p.x+=(ml?mx/ml*s.spd*slow:0)*dt; p.y+=(ml?my/ml*s.spd*slow:0)*dt;
    if(ml){ p.stepT=(p.stepT||0)-dt*slow; if(p.stepT<=0){ p.stepT=0.32*165/s.spd; SND.step(); } } else p.stepT=0.08; }
  p.x+=p.kx*dt; p.y+=p.ky*dt; p.kx*=Math.max(0,1-9*dt); p.ky*=Math.max(0,1-9*dt);
  collide(p); potTick(dt);
  if(p.inv>(p.invP||0)+0.01) p.invMax=p.inv; p.invP=p.inv; if(p.inv>0) p.inv-=dt; if(p.cd>0) p.cd-=dt; if(p.sw>0){ p.sw-=dt; if(p.sw<=0){ if(!p.struck&&p.sid) strike(); p.spin=0; p.crit=0; p.swR=0.08; } } if(p.swR>0) p.swR-=dt; if(p.hurtT>0) p.hurtT-=dt; if(p.blkT>0) p.blkT-=dt; if(p.sh>0) p.sh-=dt; if(p.rollCd>0) p.rollCd-=dt; if(p.rip>0) p.rip-=dt; if(p.rec>0) p.rec-=dt;
  /* shop: stand on an item and press Space */
  /* one purchase per visit to an item: after buying, step off and back on to buy it again (final UI pass: no double buys from mashing Space) */
  var near=null; if(w.shop) w.shop.forEach(function(it){ var d=Math.hypot(p.x-it.x,p.y-it.y); if(d>=40) it.hold=0; if(!it.sold&&d<34) near=it; }); if(near!==w.shopNear){ NEARAT=performance.now(); if(near&&!w.shopSeen){ w.shopSeen=1; say('browse'); } } w.shopNear=near;
  if(w.bub&&w.bub.t>0) w.bub.t-=dt; if(w.shop&&w.dealt&&p.y<FLR[1]+80&&Math.abs(p.x-W/2)<90) say('leave');
  if(BUF.e){ var eAt=BUF.e; BUF.e=0; if(near&&eAt>NEARAT&&!near.hold) buy(near); }   /* playtest handoff 2026-11-15: E to buy, a fresh press after stepping up (holding E or walking across items never buys) */
  /* input buffer: a tap during a roll or a swing still lands as soon as it can */
  if(BUF.s>0) BUF.s-=dt; if(BUF.r>0){ BUF.r-=dt; if(p.rollCd<=0&&p.roll<=0){ BUF.r=0; roll(); } }
  if(p.buyT>0) p.buyT-=dt;
  if(HELD[' ']||BUF.s>0){ if(p.cd<=0&&p.roll<=0){ BUF.s=0; swing(); } }
  if(p.sw>0&&p.sid){ if(!p.struck&&(p.spin?0.26:0.2)-p.sw>=RR_WIND-1e-6) strike(); else if(p.struck) swingHits(); }
  /* doorways */
  if(w.open){ var ex=ROOMS[w.rid].exits;
    if(ex.n&&p.y<(ROOMART?FLR[1]-6:p.r+6)&&p.x>14*TS&&p.x<18*TS){ goRoom(ex.n,'s'); return; }
    if(ex.w&&p.x<(ROOMART?FLR[0]-4:p.r+6)){ goRoom(ex.w,'w'); return; }
    if(ex.e&&p.x>(ROOMART?FLR[2]+4:W-p.r-6)){ goRoom(ex.e,'e'); return; } }
  roomTick(dt);
  for(i=w.spawns.length-1;i>=0;i--){ var sp=w.spawns[i]; sp.t-=dt; if(sp.t<=0){ spawnEnemy(sp.type,sp.x,sp.y,sp.m,false,sp.el); w.spawns.splice(i,1); } }
  /* enemies */
  var grid=GRID; for(i=0;i<GRIDN;i++) grid[i].length=0;
  for(i=0;i<w.en.length;i++){ e=w.en[i]; var gcx=clamp((e.x/40)|0,0,25), gcy=clamp((e.y/40)|0,0,14); grid[gcx+1+(gcy+1)*28].push(e); }
  navUpdate(p);
  var gb=0; for(i=0;i<w.en.length;i++){ e=w.en[i]; if(!e.dead&&e.type==='gob'&&(e.st===1||e.st===2)&&!(e.stun>0)) gb++; } w.gobBusy=gb;
  for(i=0;i<w.en.length;i++){ e=w.en[i]; if(e.dead) continue; e.hitWall=0; enemyAI(e,dt,p);
    if(e.type!=='boss'){ var gx=clamp((e.x/40)|0,0,25), gy=clamp((e.y/40)|0,0,14);
      for(var a=-1;a<=1;a++) for(var b=-1;b<=1;b++){ var cell=grid[gx+a+1+(gy+b+1)*28]; if(!cell.length) continue;
        for(var c=0;c<cell.length;c++){ var o=cell[c]; if(o===e||o.type==='boss') continue; var dx=e.x-o.x, dy=e.y-o.y, rr=e.r+o.r-2, d2=dx*dx+dy*dy;
          if(d2<rr*rr&&d2>0.01){ var d=Math.sqrt(d2), push=(rr-d)*0.5; e.x+=dx/d*push; e.y+=dy/d*push; } } } }
    if(!ET[e.type].fly){ collide(e,solidE); if(e.type==='lance'&&e.st===2&&e.hitWall){ e.st=9; e.cd=1.4; SND.boom(); w.fx.push({k:'txt',x:e.x,y:e.y-50,t:0,v:'STUNNED!',c:'#FFC93C'}); } } else { e.x=clamp(e.x,FLR[0]+10,FLR[2]-10); e.y=clamp(e.y,FLR[1]+6,FLR[3]-10); }
    if(e.fl>0) e.fl-=dt; if(e.thT>0) e.thT-=dt; if(e.wh>0) e.wh-=dt; if(e.oh>0) e.oh-=dt; if(e.rh>0) e.rh-=dt; if(e.eh>0) e.eh-=dt;
    /* touching only hurts while an enemy is attacking (lunge, dive, hop, boss); otherwise bodies just shove you */
    var pdx=p.x-e.x, pdy=p.y-e.y, cr=p.r+e.r-5, pd2=pdx*pdx+pdy*pdy;
    if(pd2<cr*cr){ if(attacking(e)) hurtP(e); else if(pd2>0.01&&p.roll<=0){ if(L('thorns')) thorns(e,0.5); var pd=Math.sqrt(pd2), pk=(cr-pd)*0.6; p.x+=pdx/pd*pk; p.y+=pdy/pd*pk; collide(p); } }
    if(S.mode!=='play') return; }
  telegraphs(dt,p); if(S.mode!=='play') return;
  fireTick(dt,p); if(S.mode!=='play') return;
  powers(dt,p);
  if(w.shots.length>150) w.shots.splice(0,w.shots.length-150);
  for(i=w.shots.length-1;i>=0;i--){ if(stepShot(w.shots[i],dt,p)) w.shots.splice(i,1); }
  for(i=w.orbs.length-1;i>=0;i--){ var ob=w.orbs[i]; if(!ob) continue; /* a block or a boss kill can clear the list mid-loop */ ob.x+=ob.vx*dt; ob.y+=ob.vy*dt; ob.t+=dt;
    if(ob.t>5||wallAt(ob.x,ob.y)){ w.orbs.splice(i,1); continue; }
    if(ob.fr){ var hitE=null; w.en.forEach(function(q){ if(!q.dead&&!hitE&&Math.hypot(q.x-ob.x,q.y-ob.y)<q.r+7) hitE=q; }); if(hitE){ DSRC='return'; hurtE(hitE,8+L('edge')*2,ob.vx/420,ob.vy/420,200); w.orbs.splice(i,1); } continue; }
    if(Math.hypot(ob.x-p.x,ob.y-(p.y-6))<p.r+6){ if(p.inv>0){ hurtP(ob); continue; } w.orbs.splice(i,1); hurtP(ob); if(S.mode!=='play') return; } }
  explosions(dt);
  if(w.en.some(function(q){ return q.dead; })) w.en=w.en.filter(function(q){ return !q.dead; });
  /* pickups: gems and coins fly to you inside 110 px (was 70), hearts inside 170 px when Rook is hurt (Kody's playtest 2026-11-15: much larger, mostly for hearts), and all of them come home when a room is clear */
  for(i=w.gems.length-1;i>=0;i--){ var g=w.gems[i], gdx=p.x-g.x, gdy=p.y-g.y, gd=Math.hypot(gdx,gdy);
    if(gd<110||g.m||w.cleared){ g.m=1; g.x+=gdx/(gd||1)*480*dt; g.y+=gdy/(gd||1)*480*dt; }
    if(gd<p.r+8){ w.gems.splice(i,1); gainXP(g.v); } }
  for(i=w.coinsF.length-1;i>=0;i--){ var cn=w.coinsF[i], cdx=p.x-cn.x, cdy=p.y-cn.y, cd=Math.hypot(cdx,cdy);
    if(cd<110||cn.m||w.cleared){ cn.m=1; cn.x+=cdx/(cd||1)*480*dt; cn.y+=cdy/(cd||1)*480*dt; }
    if(cd<p.r+8){ w.coinsF.splice(i,1); w.coins++; SND.coin(); } }
  for(i=w.hearts.length-1;i>=0;i--){ var h=w.hearts[i], hdx=p.x-h.x, hdy=p.y-h.y, hd=Math.hypot(hdx,hdy); h.t+=dt; if(p.hp<p.max&&(hd<170||h.m||w.cleared)){ h.m=1; var hs=Math.min(hd,520*dt); h.x+=hdx/(hd||1)*hs; h.y+=hdy/(hd||1)*hs; hd=Math.hypot(p.x-h.x,p.y-h.y); } if(hd<p.r+20&&p.hp<p.max){ p.hp++; w.hearts.splice(i,1); SND.heart(); w.fx.push({k:'txt',x:p.x,y:p.y-30,t:0,v:'+1 ♥',c:'#FF6B86'}); } else if(h.t>14) w.hearts.splice(i,1); }
  /* chests */
  /* a chest that lands on top of Rook waits: it opens once he steps off and back, or after a beat once the level-ups are done (so nobody gets stuck standing on it) */
  if(w.chest&&!w.chest.arm){ if(Math.hypot(p.x-w.chest.x,p.y-w.chest.y)>p.r+34) w.chest.arm=1; else if(w.pend<=0){ w.chest.wait=(w.chest.wait||0)+dt; if(w.chest.wait>1.2) w.chest.arm=1; } }
  if(w.chest&&!w.chest.open&&w.chest.arm&&w.pend<=0&&Math.hypot(p.x-w.chest.x,p.y-w.chest.y)<p.r+18){ w.chest.open=true; SND.chest(); var gold=w.chest.type==='gold'; w.coins+=gold?10:6; toast('+'+(gold?10:6)+' coins'); openAsk('chest',{w:gold?'gold':'chest',g:gold?1:0.3,c:gold?8:4}); return; }
  var sc=w.secretChest; if(sc&&w.secretOpen&&!sc.open&&Math.hypot(p.x-sc.x,p.y-sc.y)<p.r+18){ sc.open=true; SND.chest(); w.coins+=10; p.hp=p.max; toast('Secret treasure! +10 coins, full hearts'); openAsk('chest',{w:'secret',g:0.5,c:6}); return; }
  stepFx(dt);
  /* banked level-ups get answered at the end of the fight, never in the middle of it */
  if(w.cleared&&w.pend>0&&S.mode==='play'){ w.resolve-=dt; if(w.resolve<=0) levelUp(); }
  hud(); }
function stepFx(dt){ var w=S.w; for(var i=w.fx.length-1;i>=0;i--){ var f=w.fx[i]; f.t+=dt; if(f.k==='bit'||f.k==='goo'){ f.x+=f.vx*dt; f.y+=f.vy*dt; f.vy+=300*dt; }
    var life=f.k==='bit'?0.5:f.k==='goo'?0.4:f.k==='splat'?0.6:f.k==='die'?0.16:f.k==='pop'?0.18:f.k==='zap'||f.k==='arc'?0.22:f.k==='ring'?0.35:f.k==='boom'?0.3:f.k==='spark'?0.14:f.k==='hurt'?0.3:f.k==='puff'?0.4:0.8; if(f.t>life) w.fx.splice(i,1); } }
var TT=0.9, TH=0.45;   /* doorway walk: 0.45 s out through the door, 0.45 s in through the next one */
function goRoom(id,from){ var w=S.w, p=w.p; if(w.shop) say('leave'); w.next=[id,from]; w.tdir=from==='w'?[-1,0]:from==='e'?[1,0]:[0,-1]; p.fx=w.tdir[0]; p.fy=w.tdir[1]; SND.door(); p.sw=0; p.roll=0; p.kx=p.ky=0; S.mode='trans'; trans=TT; HELD={}; save(); }

/* ---------- enemy behaviour: every attack is shown before it lands ---------- */
function attacking(e){ var t=e.type; return (t==='boss'&&e.st!==5&&e.st!==9)||((t==='gob'||t==='bat'||t==='lance')&&e.st===2)||(t==='slime'&&e.st===1); }
/* flow field toward Rook, rebuilt when he moves to a new tile. Tiles are blocked if a wall or prop touches them. */
var NAV={key:'',dist:null,block:null,room:''};
function navBlock(){ var b=new Uint8Array(COLS*ROWS), x, y; for(y=0;y<ROWS;y++) for(x=0;x<COLS;x++){ var X=x*TS, Y=y*TS; if(solidE(x,y)||wallAt(X+15,Y+15)||wallAt(X+4,Y+4)||wallAt(X+26,Y+4)||wallAt(X+4,Y+26)||wallAt(X+26,Y+26)) b[y*COLS+x]=1; } return b; }
function navUpdate(p){ var w=S.w, rk=w.rid+(w.secretOpen?'s':'')+(w.open?'o':''); if(NAV.room!==rk){ NAV.room=rk; NAV.block=navBlock(); NAV.key=''; }
  var px=clamp(Math.floor(p.x/TS),0,COLS-1), py=clamp(Math.floor(p.y/TS),0,ROWS-1), key=px+','+py; if(key===NAV.key) return; NAV.key=key;
  var D=new Int16Array(COLS*ROWS).fill(9999), q=[px+py*COLS], h=0; D[q[0]]=0;
  while(h<q.length){ var c=q[h++], cx=c%COLS, cy=(c/COLS)|0;
    for(var k=0;k<8;k++){ var ox=[1,-1,0,0,1,1,-1,-1][k], oy=[0,0,1,-1,1,-1,1,-1][k], nx=cx+ox, ny=cy+oy; if(nx<0||ny<0||nx>=COLS||ny>=ROWS) continue; var n=nx+ny*COLS;
      if(NAV.block[n]||D[n]<=D[c]+1) continue; if(ox&&oy&&(NAV.block[cx+ox+cy*COLS]||NAV.block[cx+(cy+oy)*COLS])) continue; D[n]=D[c]+1; q.push(n); } }
  NAV.dist=D; }
function navDir(e,p){ if(!NAV.dist) return null; var tx=Math.floor(e.x/TS), ty=Math.floor(e.y/TS), best=null, bd=1e9;
  if(tx<0||ty<0||tx>=COLS||ty>=ROWS) return null; var here=NAV.dist[tx+ty*COLS];
  for(var k=0;k<8;k++){ var ox=[1,-1,0,0,1,1,-1,-1][k], oy=[0,0,1,-1,1,-1,1,-1][k], nx=tx+ox, ny=ty+oy; if(nx<0||ny<0||nx>=COLS||ny>=ROWS) continue; var dd=NAV.dist[nx+ny*COLS];
    if(ox&&oy&&(NAV.block[tx+ox+ty*COLS]||NAV.block[tx+(ty+oy)*COLS])) continue; if(dd<bd){ bd=dd; best=[nx,ny]; } }
  if(!best||bd>=9999) return null; if(bd>=here&&here<9999) return null;
  var gx=best[0]*TS+15-e.x, gy=best[1]*TS+15-e.y, gl=Math.hypot(gx,gy)||1; return [gx/gl,gy/gl]; }
function enemyAI(e,dt,p){ var w=S.w, dx=p.x-e.x, dy=p.y-e.y, d=Math.hypot(dx,dy)||1, ux=dx/d, uy=dy/d, t=ET[e.type], v=t.spd, mx, my;
  /* no clear line to Rook: follow the flow field around obstacles (checked a few times a second) */
  if(!t.fly&&e.type!=='boss'){ e.losT=(e.losT||0)-dt; if(e.losT<=0){ e.losT=0.2+Math.random()*0.1; e.los=lineClear(e.x,e.y,p.x,p.y)&&lineClear(e.x+e.r*0.7,e.y,p.x,p.y)&&lineClear(e.x-e.r*0.7,e.y,p.x,p.y); }
    if(!e.los){ var nd=navDir(e,p); if(nd){ ux=nd[0]; uy=nd[1]; } } }
  mx=ux; my=uy;
  if(e.sq>0) e.sq-=dt;
  if(e.stun>0){ e.mv=0; e.stun-=dt; e.x+=e.kx*dt; e.y+=e.ky*dt; e.kx*=Math.max(0,1-8*dt); e.ky*=Math.max(0,1-8*dt); return; }
  e.t+=dt; e.cd-=dt;
  if(e.type==='gob'){   /* chase, crouch with a red "!" for 0.45 s, lunge, then stand there catching its breath */
    if(e.st===0){ if(d<GOBT&&e.cd<=0&&lineClear(e.x,e.y,p.x,p.y)){ if((w.gobBusy||0)>=gobSlots(w)) e.cd=0.2+Math.random()*0.2; else { w.gobBusy=(w.gobBusy||0)+1; e.st=1; e.cd=e.el?0.4:w.rid==='entry'?0.62:early(w)?0.58:0.48; e.sx=dx/d; e.sy=dy/d; SND.tele(); } } }
    else if(e.st===1){ v=0; if(e.cd>GOBLOCK){ e.sx=dx/d; e.sy=dy/d; } if(e.cd<=0){ e.st=2; e.cd=0.26; } }
    else if(e.st===2){ v=GOBL/0.26; mx=e.sx; my=e.sy; if(e.cd<=0){ e.st=3; e.cd=0.6; } }
    else if(e.st===3){ v=0; if(e.cd<=0){ e.st=0; e.cd=rnd(0.6,1.2); } } }
  else if(e.type==='bat'){   /* flutters around you, hovers with a "!", then dives in a straight line */
    if(e.st===0){ var wob=Math.sin(e.t*5+e.x)*1.1; mx=ux-uy*wob; my=uy+ux*wob; if(d<150) { mx=-uy; my=ux; v*=0.8; } if(d<200&&e.cd<=0){ e.st=1; e.cd=early(w)?0.6:0.5; SND.tele(); } }
    else if(e.st===1){ v=0; e.sx=ux; e.sy=uy; if(e.cd<=0){ e.st=2; e.cd=0.38; } }
    else if(e.st===2){ v=380; mx=e.sx; my=e.sy; if(e.cd<=0){ e.st=0; e.cd=rnd(1.6,2.6); } } }
  else if(e.type==='skel'){   /* walks behind its shield, raises its sword (red wedge on the floor), slashes, then drops its guard */
    if(e.st===0){ var ta=Math.atan2(uy,ux), df=ta-e.fa; while(df>Math.PI) df-=2*Math.PI; while(df<-Math.PI) df+=2*Math.PI; e.fa+=clamp(df,-3.3*dt,3.3*dt); mx=Math.cos(e.fa); my=Math.sin(e.fa); if(d<70) v=0;
      if(d<95&&e.cd<=0){ e.st=1; e.cd=early(w)?0.85:0.7; e.c0=e.cd; SND.tele(); } }
    else if(e.st===1){ v=0; if(e.cd<=0){ e.st=2; e.cd=0.12; var pa=Math.atan2(p.y-e.y,p.x-e.x); w.fx.push({k:'slash',x:e.x,y:e.y-6,a:e.fa,t:0}); if(d<100&&angDiff(pa,e.fa)<1.2) hurtP(e); } }
    else if(e.st===2){ v=0; if(e.cd<=0){ e.st=3; e.cd=1.0; } }
    else if(e.st===3){ v=0; if(e.cd<=0){ e.st=0; e.cd=rnd(1.2,1.8); } } }
  else if(e.type==='wiz'){   /* keeps its distance, glows and shows 3 aim lines, then throws slow orbs. Blinks away if you get close. */
    if(e.st===0){ if(d>260){ } else if(d<170){ mx=-ux; my=-uy; } else { mx=-uy*(e.x>W/2?1:-1); my=ux*(e.x>W/2?1:-1); v*=0.6; }
      if(d<80&&e.cd<1.2&&!e.blinked){ var spot=randFloor(260); w.fx.push({k:'puff',x:e.x,y:e.y,t:0}); w.fx.push({k:'wout',x:e.x,y:e.y+e.r+2,row:e.rrRow==null?1:e.rrRow,fl:!!e.rrFl,t:0}); e.bkT=e.t; e.x=spot[0]; e.y=spot[1]; e.blinked=1; w.fx.push({k:'puff',x:e.x,y:e.y,t:0}); e.cd=1.0; }
      if(e.cd<=0&&d<460&&lineClear(e.x,e.y,p.x,p.y)){ e.st=1; e.cd=0.85; e.aim=Math.atan2(dy,dx); SND.tele(); } }
    else if(e.st===1){ v=0; e.aim=Math.atan2(dy,dx); if(e.cd<=0){ e.st=0; e.cd=rnd(2.6,3.4); e.blinked=0; if(w.orbs.length<40){ [-0.28,0,0.28].forEach(function(o){ w.orbs.push({x:e.x,y:e.y-8,vx:Math.cos(e.aim+o)*150,vy:Math.sin(e.aim+o)*150,t:0}); }); SND.orb(); } } } }
  else if(e.type==='slime'){   /* sits, winds up for the last 0.25 s (held squash, a shake and a pink landing marker), then hops in a straight line to the marked spot */
    var cyc=(e.t%1.0), cn=Math.floor(e.t), hv=e.small?150:120;
    if(cyc>=0.15&&e.lk!==cn){ e.lk=cn; e.sx=ux; e.sy=uy; var hd=hv*(e.el?1.2:1)*0.6; e.tx=e.x+ux*hd; e.ty=e.y+uy*hd; e.mk=d<200?1:0; }   /* direction locks when the wind-up starts */
    if(cyc<0.4){ v=0; e.st=0; e.wu=cyc>=0.15?1:0; } else { v=hv; e.st=1; e.wu=0; mx=e.sx; my=e.sy; } }
  else if(e.type==='imp'){   /* keeps its distance, marks Rook's spot with an orange ring (locks halfway through), lobs a small fire there, then waits */
    if(e.st===0){ if(d>300){ } else if(d<180){ mx=-ux; my=-uy; } else { var sd=e.x>W/2?1:-1; mx=-uy*sd; my=ux*sd; v*=0.6; }
      if(e.cd<=0&&d<460){ e.st=1; e.cd=early(w)?0.8:0.65; e.c0=e.cd; e.tx=p.x; e.ty=p.y; SND.tele(); } }
    else if(e.st===1){ v=0; if(e.cd>e.c0*0.5){ e.tx=p.x; e.ty=p.y; } if(e.cd<=0){ e.st=2; e.cd=0.3;
        var fx0=clamp(e.tx,FLR[0]+60,FLR[2]-60), fy0=clamp(e.ty,FLR[1]+60,FLR[3]-60);
        if(addFire(fx0,fy0,null,0.6,{lite:1,life:4})&&w.fx.length<90) w.fx.push({k:'lob',x:e.x,y:e.y-14,x2:fx0,y2:fy0,t:0}); } }
    else if(e.st===2){ v=0; if(e.cd<=0){ e.st=0; e.cd=rnd(3.0,4.0); } } }
  else if(e.type==='lance'){   /* walks in, aims a red lane (follows Rook for the first half, then locks), charges straight; a wall stuns it (st 9) */
    if(e.st===0){ if(d<60) v=0; if(e.cd<=0&&d<330&&lineClear(e.x,e.y,p.x,p.y)){ e.st=1; e.cd=early(w)?0.95:0.8; e.c0=e.cd; e.fa=Math.atan2(dy,dx); SND.tele(); } }
    else if(e.st===1){ v=0; if(e.cd>e.c0*0.45){ e.fa=Math.atan2(dy,dx); e.lane=laneLen(e.x,e.y,e.fa); } if(e.cd<=0){ e.st=2; e.cd=3.0; } }   /* Kody 2026-11-18: the charge runs until a wall stops it (3 s is only a safety cap) */
    else if(e.st===2){ v=LANCEV; mx=Math.cos(e.fa); my=Math.sin(e.fa); if(e.cd<=0){ e.st=3; e.cd=0.7; } }
    else { v=0; if(e.cd<=0){ e.st=0; e.cd=rnd(1.4,2.2); } }
    e.sx=Math.cos(e.fa); e.sy=Math.sin(e.fa); }
  else if(e.type==='boss'){ bossAI(e,dt,p,d,ux,uy); return; }
  if(e.el&&(e.st===0||e.type==='slime')) v*=1.2;
  e.mv=v; e.wd=(e.wd||0)+v*dt;   /* walk cycle advances with distance */
  e.x+=(mx*v+e.kx)*dt; e.y+=(my*v+e.ky)*dt; e.kx*=Math.max(0,1-8*dt); e.ky*=Math.max(0,1-8*dt); }

/* ---------- the Iron Warden ----------
   0 walk · 1 charge warning (red lane) · 2 charging · 9 stunned after hitting a wall
   3 slam warning (red circle) · 4 sweep warning (red wedge) · 5 recover · 6 volley warning */
function bossAI(e,dt,p,d,ux,uy){ var w=S.w, half=e.hp<e.max/2, sp=half?0.85:1;
  if(w.last>0){ half=true; sp=0.7; e.raged=0; }   /* Last Stand Wardens: quicker wind-ups (was 0.8) */ else if(half&&!e.raged){ e.raged=1; e.addT=10; w.banner={txt:'THE WARDEN IS ENRAGED',sub:'Faster attacks. Reinforcements incoming!',t:1.8}; SND.boss(); var n0=w.spawns.length; spawnWave([['gob',3],['skel',1],['imp',1],['lance',1]],1,true); for(var si=n0;si<w.spawns.length;si++) w.spawns[si].t+=0.9; }
  if(e.raged){ e.addT-=dt; if(e.addT<=0){ e.addT=10; e.addN=(e.addN||0)+1; spawnWave([['gob',2],['bat',2],[capNew(e.addN%2?'lance':'imp',2),1]],1,true); } }   /* every wave of adds brings an Imp or a Lancer (Kody 2026-11-18) */
  var v=0, mx=0, my=0;
  if(e.st===0&&e.cd<=0&&w.last>0){ var busy=0; for(var bi=0;bi<w.en.length;bi++){ var o2=w.en[bi]; if(o2!==e&&!o2.dead&&o2.type==='boss'&&o2.st!==0&&o2.st!==5&&o2.st!==9) busy++; } if(busy>=2) e.cd=0.3; }
  if(e.st===0){ v=ET.boss.spd*(half?1.25:1); mx=ux; my=uy; if(e.cd<=0){ var r=Math.random();
      if(!e.taught&&!(w.last>0)){ e.taught=1; e.st=1; e.cd=1.25; e.c0=e.cd; e.fa=Math.atan2(p.y-e.y,p.x-e.x); e.chains=0; }
      else if(d<130){ e.st=4; e.cd=0.7*sp; e.fa=Math.atan2(p.y-e.y,p.x-e.x); }
      else if(r<(half?0.7:0.55)){ e.st=1; e.cd=0.85*sp; e.c0=e.cd; e.fa=Math.atan2(p.y-e.y,p.x-e.x); e.chains=half?2:(Math.random()<0.5?1:0); }   /* Kody 2026-11-16: charges more, much more when enraged (was 45%, 1 extra charge) */
      else if(r<0.88||!half){ e.st=3; e.cd=0.8*sp; e.fa=Math.atan2(p.y-e.y,p.x-e.x); }
      else { e.st=6; e.cd=0.7*sp; }
      SND.btele(); } }
  else if(e.st===1){ if(e.cd>e.c0*0.4) e.fa=Math.atan2(p.y-e.y,p.x-e.x); if(e.cd<=0){ e.st=2; e.cd=1.4; e.cdist=0; e.cnext=40; e.cfn=0; } }
  else if(e.st===2){ v=560; mx=Math.cos(e.fa); my=Math.sin(e.fa); if(half){ e.cdist=(e.cdist||0)+v*dt; if(e.cdist>=e.cnext&&e.cfn<4){ if(addFire(e.x-mx*30,e.y-my*30,p,0.12)){ e.cfn++; e.cnext+=85; } else e.cnext+=20; } }   /* Kody 2026-11-16: an enraged charge drops 3-4 fires right along its path, almost at once */
    if(e.cd<=0){ e.lastA='charge'; e.st=5; e.cd=0.5; } }
  else if(e.st===3){ if(e.cd<=0){ if(!RM) w.shake=0.25; SND.slam(); if(Math.hypot(p.x-e.x,p.y-e.y)<120) hurtP(e); w.fx.push({k:'boom',x:e.x,y:e.y,r:120,t:0}); e.lastA='slam'; if(half&&!e.wallSlam) slamFire(e,p); e.wallSlam=0;   /* Kody 2026-11-16: first Warden fight makes fire only once he is enraged; the Last Stand always */ if(half&&!(w.last>0)&&!(w.ringT>0)){ var ga=Math.random()*6.283; w.ringT=1.5; w.rings=(w.rings||[]).concat([{x:e.x,y:e.y,r:120,hit:0,ls:w.last>0?1:0,g:[ga,ga+Math.PI+rnd(-0.5,0.5)]}]); } e.st=5; e.cd=0.7; } }
  else if(e.st===4){ if(e.cd<=0){ var pa=Math.atan2(p.y-e.y,p.x-e.x); w.fx.push({k:'slash',x:e.x,y:e.y-10,a:e.fa,t:0,big:1}); if(Math.hypot(p.x-e.x,p.y-e.y)<130&&angDiff(pa,e.fa)<1.25) hurtP(e); e.lastA='swipe'; e.st=5; e.cd=half?0.35:0.6; } }
  else if(e.st===6){ if(e.cd<=0){ e.lastA='orbs'; for(var k=0;k<10;k++){ var a=k*Math.PI/5+e.t; w.orbs.push({x:e.x,y:e.y-20,vx:Math.cos(a)*140,vy:Math.sin(a)*140,t:0}); } SND.orb(); e.st=5; e.cd=0.6; } }
  else if(e.st===9){ if(e.cd<=0){ e.wallSlam=1; e.st=3; e.cd=0.6; e.fa=Math.atan2(p.y-e.y,p.x-e.x); SND.btele(); } }
  else if(e.st===5){ if(e.cd<=0){ if(e.chains>0){ e.chains--; e.st=1; e.cd=0.7*sp; e.c0=e.cd; e.fa=Math.atan2(p.y-e.y,p.x-e.x); SND.btele(); } else { e.st=0; e.cd=rnd(0.6,1.1)*sp; } } }
  e.mv=v; e.wd=(e.wd||0)+v*dt;
  e.x+=(mx*v+e.kx)*dt; e.y+=(my*v+e.ky)*dt; e.kx*=Math.max(0,1-8*dt); e.ky*=Math.max(0,1-8*dt);
  e.hitWall=0; collide(e,solidE);
  if(e.st===2&&e.hitWall){ e.st=9; e.cd=1.1; e.chains=0; SND.boom(); if(!RM) w.shake=0.3; w.fx.push({k:'txt',x:e.x,y:e.y-80,t:0,v:'STUNNED!',c:'#FFC93C'}); for(var q=0;q<10;q++) w.fx.push({k:'bit',x:e.x,y:e.y,vx:rnd(-150,150),vy:rnd(-160,20),t:0,c:'#8A92BE'}); } }
/* ---------- Warden fire (Kody's classroom test 2026-11-16: a student asked for poison / damage over time) ----------
   Every Last Stand Warden slam, and every slam once the first Warden is enraged (below half health), leaves 2 fire patches. Each shows a dim outline for 0.5 s, burns 6 s, then dies out.
   At most 4 burn at once; never on a door, never under Rook. Stepping in sets Rook on fire for 6 s: his last heart visibly drains and he loses 1 heart every 3 s (2 in all),
   (straight through armor and Aegis). Kody 2026-11-18: a dodge roll puts it out again, and fire never takes the last heart
   (it can't light you, and stops burning, at 1 heart); rolling across a patch still doesn't light you. One burn at a time, no stacking.
   Enemies standing in fire take 4 damage every 0.5 s (Wardens are immune). */
var FIRE={r:38, warn:0.5, life:6, max:8, burn:6, tick:3};   /* max 8: enraged charges drop 3-4 fires along their path */   /* Kody 2026-11-16: burn ticks health down over a longer time: 1 heart every 3 s for 6 s (2 hearts) */
function addFire(x,y,p,warn,o){ var w=S.w; w.fires=w.fires||[]; if(w.fires.length>=FIRE.max) return false;
  if(x<FLR[0]+60||x>FLR[2]-60||y<FLR[1]+60||y>FLR[3]-60||wallAt(x,y)||(p&&Math.hypot(x-p.x,y-p.y)<FIRE.r+40)) return false;
  if(w.fires.some(function(f){ return Math.hypot(f.x-x,f.y-y)<FIRE.r*1.6; })) return false;
  var f={x:x,y:y,t:-(warn==null?FIRE.warn:warn),s:Math.random()*9}; if(o&&o.lite){ f.lite=1; f.life=o.life; } w.fires.push(f); return true; }
function slamFire(e,p){ var w=S.w; w.fires=w.fires||[]; var made=0;
  for(var k=0;k<12&&made<2&&w.fires.length<FIRE.max;k++){ var a=Math.random()*6.283, d=rnd(70,130), x=e.x+Math.cos(a)*d, y=e.y+Math.sin(a)*d;
    if(x<FLR[0]+60||x>FLR[2]-60||y<FLR[1]+60||y>FLR[3]-60||wallAt(x,y)) continue;
    if(Math.hypot(x-p.x,y-p.y)<FIRE.r+40) continue;
    if(w.fires.some(function(f){ return Math.hypot(f.x-x,f.y-y)<FIRE.r*1.6; })) continue;
    w.fires.push({x:x,y:y,t:-FIRE.warn,s:Math.random()*9}); made++; } }
function fireTick(dt,p){ var w=S.w, F=w.fires; if(!F||(!F.length&&!(p.burn>0))) return;
  for(var i=F.length-1;i>=0;i--){ var f=F[i]; f.t+=dt; if(f.t>=(f.life||FIRE.life)){ F.splice(i,1); continue; } if(f.t<0) continue;
    if(!(p.burn>0)&&p.roll<=0&&p.hp>1&&Math.hypot(p.x-f.x,(p.y-f.y)*1.6)<FIRE.r){ if(f.lite){ p.burn=p.bmax=FIRE.tick; p.bn=1; } else { p.burn=p.bmax=FIRE.burn; p.bn=Math.round(FIRE.burn/FIRE.tick); } p.bseg=FIRE.tick; SND.tele(); if(!w.fireTold){ w.fireTold=1; w.fx.push({k:'txt',x:p.x,y:p.y-56,t:0,v:'On fire! Stay out of the lava',c:'#FF9A3C'}); } }
    f.hT=(f.hT||0)-dt; if(f.hT<=0){ f.hT=0.5; DSRC='fire'; for(var j=0;j<w.en.length;j++){ var e=w.en[j]; if(!e.dead&&e.type!=='boss'&&e.type!=='imp'&&Math.hypot(e.x-f.x,(e.y-f.y)*1.6)<FIRE.r+e.r*0.5) hurtE(e,4,0,0,0); } } }
  if(p.burn>0&&p.hp<=1){ p.burn=0; return; }   /* Kody 2026-11-18: fire never takes the last heart */
  if(p.burn>0){ p.burn-=dt; p.bseg=(p.bseg||FIRE.tick)-dt; if(p.bseg<=0){ p.bseg=FIRE.tick; p.bn=(p.bn||1)-1; hurtP({x:p.x,y:p.y+1,fire:1},1); if(p.bn<=0||S.mode!=='play'){ p.burn=0; return; } } if(p.burn<0.05) p.burn=0.05; } }
/* fire patch = a lava pool (gentle, never flashing). Outline only during the warning. */
function drawFire(c,f,t){ var rx=FIRE.r, ry=Math.round(FIRE.r*0.62), x=Math.round(f.x), y=Math.round(f.y);
  var fade=f.t<0?0:Math.min(1,f.t/0.25)*Math.min(1,((f.life||FIRE.life)-f.t)/0.6);
  c.save();
  if(f.t<0){ c.globalAlpha=0.35+0.5*(1+f.t/FIRE.warn); c.strokeStyle='#FF8A2A'; c.lineWidth=2; c.beginPath(); c.ellipse(x,y,rx,ry,0,0,7); c.stroke(); c.restore(); return; }
  if(RRI.fire_patch){ /* Kody 2026-11-21: fire patches are now LAVA POOLS (Sprite Drop task f21d2bcc, approved painting 7fdb236d); the crust rim is the danger edge. Slow 4 fps, same brightness every frame */
    var k=RM?0:Math.floor(t*4+f.s*3)%3; c.globalAlpha=fade; c.imageSmoothingEnabled=false;
    c.drawImage(RRI.fire_patch,k*80,0,80,48,x-40,y-24,80,48);
  } else { /* fallback: scorched ember oval */
    c.globalAlpha=0.55*fade; c.fillStyle='#3A1214'; c.beginPath(); c.ellipse(x,y,rx,ry,0,0,7); c.fill();
    c.globalAlpha=0.35*fade; c.fillStyle='#B33B1B'; c.beginPath(); c.ellipse(x,y,rx*0.72,ry*0.72,0,0,7); c.fill();
    c.globalAlpha=0.9*fade; c.strokeStyle='#6E1D14'; c.lineWidth=2; c.beginPath(); c.ellipse(x,y,rx,ry,0,0,7); c.stroke();
  }
  c.restore(); }
/* Rook on fire: two small flames on his shoulders and a draining orange bar over his head */
function drawBurn(c,p,t){ if(!(p.burn>0)) return; var x=Math.round(p.x), y=Math.round(p.y), k=Math.min(1,p.burn/(p.bmax||FIRE.burn));
  for(var s2=-1;s2<=1;s2+=2){
    if(RRI.burn_flame){ var kb=RM?1:(Math.floor(t*9)+(s2>0?1:0))%3; c.imageSmoothingEnabled=false; c.drawImage(RRI.burn_flame,kb*12,0,12,20,x+s2*15-6,y-16-17,12,20); }
    else { var h=RM?8:Math.round(7+3*Math.sin(t*9+s2)); c.fillStyle='#3A0E06'; c.fillRect(x+s2*9-3,y-30-h,6,h+2); c.fillStyle='#FF6A1E'; c.fillRect(x+s2*9-2,y-29-h,4,h); } }
  c.fillStyle='#141026'; c.fillRect(x-20,y-58,40,7); c.fillStyle='#FF8A2A'; c.fillRect(x-19,y-57,Math.round(38*k),5); }
var RGAP=0.4;   /* half-width of the safe gaps in a slam ring */
function telegraphs(dt,p){ var w=S.w; if(!w.rings) return;
  for(var i=w.rings.length-1;i>=0;i--){ var r=w.rings[i]; r.r+=220*dt; var d=Math.hypot(p.x-r.x,p.y-r.y); if(!r.hit&&Math.abs(d-r.r)<12){ var pa=Math.atan2(p.y-r.y,p.x-r.x); if(!(r.g&&(angDiff(pa,r.g[0])<RGAP||angDiff(pa,r.g[1])<RGAP))){ r.hit=1; hurtP(r); if(S.mode!=='play') return; } } if(r.r>620) w.rings.splice(i,1); } }

/* ---------- automatic powers ---------- */
function chainZap(x,y,first,jumps,dmg,skip){ var w=S.w, hitL=skip?skip.slice():[], cur=first, cx0=x, cy0=y;
  for(var j=0;j<=jumps&&cur;j++){ hitL.push(cur); w.fx.push({k:'arc',x:cx0,y:cy0,x2:cur.x,y2:cur.y-6,t:0}); hurtE(cur,Math.round(dmg*Math.pow(0.85,j)),0,0,30); cx0=cur.x; cy0=cur.y-6; cur=nearestFoe(cx0,cy0,170,hitL); } }
function powers(dt,p){ var w=S.w, i, e, l;
  l=L('orbit'); if(l){ DSRC='orbit'; var n=[0,2,3,4][l]+(HAS('tempest')?1:0), R=58, dmg=3+l; w.oa+=dt*3.6;
    for(var k=0;k<n;k++){ var a=w.oa+k*2*Math.PI/n, bx=p.x+Math.cos(a)*R, by=p.y-6+Math.sin(a)*R;
      for(i=0;i<w.en.length;i++){ e=w.en[i]; if(e.dead||e.oh>0) continue; var dx=e.x-bx, dy=e.y-by; if(dx*dx+dy*dy<(e.r+11)*(e.r+11)){ e.oh=0.4; var dd=Math.hypot(e.x-p.x,e.y-p.y)||1; hurtE(e,dmg,(e.x-p.x)/dd,(e.y-p.y)/dd,150,{orb:1});
        if(HAS('tempest')){ var nx=nearestFoe(e.x,e.y,150,[e]); if(nx){ DSRC='tempest'; chainZap(e.x,e.y,nx,0,3+l); DSRC='orbit'; } } } } } }
  if(HAS('bladering')&&L('orbit')){ w.tm.br=(w.tm.br||0)-dt; if(w.tm.br<=0){ if(nearestFoe(p.x,p.y,380)){ w.tm.br=1.7; var bn=[0,2,3,4][L('orbit')]+(HAS('tempest')?1:0); for(var bq=0;bq<bn;bq++){ var ba=w.oa+bq*2*Math.PI/bn; fireWave(ba,Math.max(1,L('wave')),p.x+Math.cos(ba)*58,p.y-6+Math.sin(ba)*58); } SND.swing(); } else w.tm.br=0.3; } }
  l=L('ward'); if(l){ w.wa=(w.wa||0)+dt*2.4; for(var gi=0;gi<l;gi++){ var ga=w.wa+gi*2*Math.PI/l, gx=p.x+Math.cos(ga)*38, gy=p.y-6+Math.sin(ga)*38;
      for(var oi=w.orbs.length-1;oi>=0;oi--){ var o=w.orbs[oi]; if(o.fr) continue; if(Math.hypot(o.x-gx,o.y-gy)<16){ w.orbs.splice(oi,1); var tw=nearestFoe(gx,gy,520), ta=tw?Math.atan2(tw.y-gy,tw.x-gx):ga;
          w.shots.push({k:'rico',ward:1,x:gx,y:gy,vx:Math.cos(ta)*460,vy:Math.sin(ta)*460,t:0,life:1.4,dmg:8+3*l,bounce:0,pierce:l>=3?3:1,hit:[]}); SND.bolt(); } }
      for(i=0;i<w.en.length;i++){ e=w.en[i]; if(e.dead||e.wh>0) continue; if(Math.hypot(e.x-gx,e.y-gy)<e.r+9){ e.wh=0.5; DSRC='ward'; var gd=Math.hypot(e.x-p.x,e.y-p.y)||1; hurtE(e,2+l,(e.x-p.x)/gd,(e.y-p.y)/gd,200,{orb:1}); } } } }
  l=L('spark'); if(l){ w.tm.spark-=dt; if(w.tm.spark<=0){ var tg=nearestFoe(p.x,p.y,420); if(tg){ w.tm.spark=CSPK.every[l]; DSRC='spark'; w.fx.push({k:'zap',x:tg.x,y:tg.y,t:0}); chainZap(p.x,p.y-10,tg,CSPK.jumps[l],CSPK.dmg[l]); SND.zap(); } else w.tm.spark=0.3; } }
  l=L('ricochet'); if(l){ w.tm.rico-=dt; if(w.tm.rico<=0){ w.tm.rico=1.5; var tg2=nearestFoe(p.x,p.y,500), base=tg2?Math.atan2(tg2.y-p.y,tg2.x-p.x):Math.atan2(p.fy,p.fx);
      (l>=3?[base-0.25,base+0.25]:[base]).forEach(function(a){ w.shots.push({k:'rico',x:p.x,y:p.y-6,vx:Math.cos(a)*360,vy:Math.sin(a)*360,t:0,life:3,dmg:3+l,bounce:l+2,hit:[]}); }); SND.bolt(); } } }
function explosions(dt){ var w=S.w, n=0;
  for(var i=w.booms.length-1;i>=0&&n<14;i--){ var b=w.booms[i]; b.t-=dt; if(b.t>0) continue; w.booms.splice(i,1); n++;
    w.fx.push({k:'boom',x:b.x,y:b.y,r:b.r,t:0}); SND.boom(); DSRC=b.spite?'spite':b.shard?'shrapnel':'volatile'; BGEN=b.g||0;
    var victims=w.en.filter(function(e){ return !e.dead&&e.type!=='boss'?Math.hypot(e.x-b.x,e.y-b.y)<b.r+e.r:(!e.dead&&Math.hypot(e.x-b.x,e.y-b.y)<b.r+e.r); });
    victims.forEach(function(e){ var dx=e.x-b.x, dy=e.y-b.y, d=Math.hypot(dx,dy)||1; hurtE(e,b.dmg,dx/d,dy/d,180); });
    if(HAS('overcharge')&&Math.random()<0.35){ var tg=nearestFoe(b.x,b.y,200); if(tg){ DSRC='overcharge'; chainZap(b.x,b.y,tg,1,4+L('spark')); } }
    if(HAS('shrapnel')){ for(var k=0;k<2;k++){ var a=Math.random()*6.28; w.shots.push({k:'rico',small:1,x:b.x,y:b.y,vx:Math.cos(a)*320,vy:Math.sin(a)*320,t:0,life:0.9,dmg:3,bounce:1,hit:[]}); } } } }
function stepShot(s,dt,p){ var w=S.w, i, e; DSRC=s.ward?'ward':s.k==='rico'?(s.small?'shrapnel':'ricochet'):'wave'; s.t+=dt; if(s.t>s.life) return true;
  var nx=s.x+s.vx*dt, ny=s.y+s.vy*dt;
  if(wallAt(nx,ny)){ if(s.bounce>0){ s.bounce--; if(wallAt(nx,s.y)) s.vx=-s.vx; if(wallAt(s.x,ny)) s.vy=-s.vy; if(!wallAt(nx,s.y)&&!wallAt(s.x,ny)){ s.vx=-s.vx; s.vy=-s.vy; } s.a=Math.atan2(s.vy,s.vx); s.hit=[]; return false; } return true; }
  s.x=nx; s.y=ny;
  var sr=s.k==='wave'?14:s.small?5:9;
  for(i=0;i<w.en.length;i++){ e=w.en[i]; if(e.dead) continue; var sdx=e.x-s.x, sdy=e.y-6-s.y, srr=e.r+sr; if(sdx>srr||sdx<-srr||sdy>srr||sdy<-srr||sdx*sdx+sdy*sdy>=srr*srr||s.hit.indexOf(e)>=0) continue; { s.hit.push(e);
      hurtE(e,s.dmg,s.vx/400,s.vy/400,s.k==='wave'?150:70,{proj:1});
      if(s.k==='wave'&&!s.child&&!s.called&&HAS('stormcall')){ s.called=1; DSRC='stormcall'; w.fx.push({k:'zap',x:e.x,y:e.y,t:0}); hurtE(e,3+L('spark'),0,0,0); var sn=nearestFoe(e.x,e.y,170,[e]); if(sn) chainZap(e.x,e.y-6,sn,L('spark'),3+2*L('spark'),[e]); SND.zap(); DSRC='wave'; }
      if(s.k==='wave'&&!s.child&&!s.split&&HAS('splitwave')){ s.split=1; [-0.6,0.6].forEach(function(o){ fireWave(s.a+o,Math.max(1,L('wave')),s.x,s.y,true); var c=w.shots[w.shots.length-1]; c.hit=[e]; }); }
      if(s.k==='wave'&&s.hit.length>=s.pierce) return true; if(s.ward&&s.hit.length>=s.pierce) return true; } }
  return false; }

/* ---------- rooms ---------- */
function randFloor(minD){ var p=S.w.p; for(var k=0;k<80;k++){ var tx=1+Math.floor(Math.random()*(COLS-2)), ty=2+Math.floor(Math.random()*(ROWS-3));
    if(tget(tx,ty)!==0) continue; if(!ROOMART&&S.w.rid==='library'&&(tx>=25||tx<=6)&&ty<=4) continue; /* never inside the secret nook */ var x=tx*TS+TS/2, y=ty*TS+TS/2; if(Math.hypot(x-p.x,y-p.y)<minD) continue; if(wallAt(x,y)) continue; return [x,y]; } return [W/2,120]; }
function spawnWave(list,m,edges){ list.forEach(function(it){ for(var n=0;n<it[1];n++){ var pos=edges&&Math.random()<0.6?edgePos(Math.floor(Math.random()*4)):randFloor(220); S.w.spawns.push({type:it[0],x:pos[0],y:pos[1],t:0.8+Math.random()*0.5,m:m||1,el:it[2]?1:0}); } }); }
function roomTick(dt){ var w=S.w, R=ROOMS[w.rid];
  if(R.shop&&!w.dealt){ w.dealT=(w.dealT||0)+dt; if(w.dealT>0.6){ w.dealt=1; openAsk('deal'); } return; }
  if(w.cleared) return;
  if(w.last>0){ lastTick(dt); return; }
  if(R.boss){ if(w.bossIntro>0){ w.bossIntro-=dt; if(w.bossIntro<=0){ var b=spawnEnemy('boss',W/2,170,1); b.cd=1.2; w.boss=b; } } return; }
  if(R.siege){ siegeTick(dt); return; }
  var alive=w.en.length+w.spawns.length;
  if(w.wave<w.waves.length){ if(alive<=3&&w.waveT>0.7) w.waveT=0.7; if(R.intro&&w.wave===1&&(alive||w.spawns.length)&&(w.introT=(w.introT||0)+dt)<25) w.waveT=Math.max(w.waveT,1.4); w.waveT-=dt; if(w.waveT<=0){ var last=w.wave===w.waves.length-1&&w.waves.length>3; spawnWave(w.waves[w.wave],R.m||1,w.wave>0); if(last) w.banner={txt:'HERE THEY COME!',sub:'',t:1.1}; if(R.intro&&w.wave===0) (w.bannerQ=w.bannerQ||[]).push({txt:'Shield Knight',sub:'He blocks attacks from the front. Dodge past his swing, then strike from behind.',t:4.5,tip:1}); w.wave++; w.waveT=6; } }
  else if(!alive) roomClear(); }
function roomClear(){ var w=S.w, R=ROOMS[w.rid]; var rt=w.runT-(w.roomT0||w.runT), fl=!w.hurtRoom, bonus=150+Math.max(0,450-6*rt)+(fl?300:0); addPts(bonus); if(fl) w.flawless++;
  w.clearMsg='+'+Math.round(bonus)+' room bonus'+(fl?' · FLAWLESS!':'');
  w.cleared=true; w.open=w.door=true; w.resolve=0.9; SND.clear(); w.orbs=[]; w.rings=[]; w.fires=[]; w.p.burn=0;
  if(w.p.hp<w.p.max&&!R.boss){ w.p.hp++; w.fx.push({k:'txt',x:w.p.x,y:w.p.y-48,t:0,v:'+1 ♥ room clear',c:'#FF6B86'}); }
  w.banner={txt:'ROOM CLEAR',sub:w.clearMsg,t:1.8};
  if(R.chest) w.chest={x:W/2,y:R.kind==='vault'?9*TS:6*TS,open:false,type:R.chest};
  save(); }
/* LAST STAND: the Warden falls, the keep starts to crumble, and the horde pours in for 2 minutes. This is where scores spread out. */
var LAST=120;
function startLast(){ var w=S.w; w.won=1; w.last=LAST; w.lastT=0; w.boss=null; w.tm.spawn=0.5; w.tm.swarm=18; w.tm.rub=3; w.rub=[]; w.fires=[]; w.p.burn=0; w.lsW=0; w.lsKills=0; w.lsWK=0; w.cleared=false; w.open=false; w.lsHard=lsHard();
  w.banner={txt:'BONUS: LAST STAND',sub:'You already won! Survive 2:00 to escape. Kills count double.',t:3.2}; SND.lsStart(); save(); }
/* Last Stand: a flood of enemies, falling rubble, and Wardens that keep coming (1 at 0:15, 2 at 0:50, 3 at 1:25) */
var LSCAP=105;   /* seconds into the Last Stand where the difficulty ramp stops */
/* Kody's classroom test 2026-11-16: "people are getting through last stand way too easily, especially with all their upgrades".
   The horde scales with how built-up Rook is: every upgrade level adds 4% enemy health (Wardens too), capped at +60%.
   It changes health and rubble, never how many enemies are on screen, so the frame rate stays where it was. */
function lsHard(){ var b=S.w.b||{}, n=0; for(var k in b) n+=(+b[k]||0); return Math.min(1.3,1+0.02*n); }   /* Kody 2026-11-16: eased from +4% (max +60%) after the Spark/Volatile nerf */
var LSW=[[15,1,'ANOTHER WARDEN!'],[50,2,'TWO WARDENS?!'],[85,3,'THREE WARDENS!!']];   /* [time, Wardens alive from then on, banner] */
function lastTick(dt){ var w=S.w, T=w.lastT; w.lastT+=dt; w.last-=dt;
  /* the survive clock follows the music while the Last Stand track plays (Kody's playtest 2026-11-15: the music skipped).
     Hit-stop and slow frames used to let the clock fall behind the track, and every 0.3 s of drift cut the music back to match. */
  var mp=auLSPos(); if(mp!=null&&mp>0.05&&Math.abs(LAST-mp-w.last)<1.5) w.last=Math.max(0,Math.min(LAST,LAST-mp));   /* a bigger gap means the clock was moved on purpose: the music seeks to it instead */
  if(w.last<=0){ w.last=0; addPts(5000,w.p.x,w.p.y-60,'#FFC93C'); w.lastDone=1; finishRun(true,'escape'); return; }
  var wardens=w.en.filter(function(e){ return !e.dead&&e.type==='boss'; }); w.boss=wardens[0]||null;
  /* Wardens: the target count only goes up. A milestone tops the room up to that many at once; a fallen Warden is replaced 12 s later */
  var pendW=w.spawns.filter(function(s){ return s.type==='boss'; }).length, haveW=wardens.length+pendW;
  var lsSpawn=function(n,txt){ for(var k=0;k<n;k++){ var sx=[W/2,160,W-160][(w.lsN=(w.lsN||0)+1)%3]; w.spawns.push({type:'boss',x:sx,y:FLR[1]+70,t:1.2,m:0.7*(w.lsHard||1)}); } if(n>0){ w.lsWT=T; w.banner={txt:txt,sub:w.lsTold?'':'Its blows break armor. Dodge them!',t:w.lsTold?1.4:2.2}; w.lsTold=1; SND.boss(); } };
  LSW.forEach(function(q,i){ if(T>=q[0]&&w.lsW<=i){ w.lsW=i+1; w.lsTgt=q[1]; w.lsRe=0; var need=Math.max(1,q[1]-haveW); lsSpawn(need,q[2]); haveW+=need; } });
  if(w.lsTgt&&haveW<w.lsTgt){ w.lsRe=(w.lsRe||0)+dt; if(w.lsRe>=12){ w.lsRe=0; lsSpawn(1,haveW+1>=2?(['','','TWO','THREE'][haveW+1]+' WARDENS AGAIN!'):'ANOTHER WARDEN!'); } } else w.lsRe=0;
  /* Kody 2026-11-15 asked for "a tiny bit easier" (10% slower growth, cap at 1:30); the 2026-11-16 classroom test showed it was too easy, so full-speed growth is back, the cap moved to 1:45, and H scales with upgrades */
  var Te=Math.min(T,LSCAP), H=w.lsHard||(w.lsHard=lsHard());
  w.tm.spawn-=dt; if(w.tm.spawn<=0&&w.en.length+w.spawns.length<(LITE?60:90)){ w.tm.spawn=Math.max(0.13,0.5-Te*0.003);
    var pool=['gob','gob','bat','slime','gob']; if(T>8) pool.push('skel','gob','bat'); if(T>25) pool.push('wiz','skel','bat','slime'); if(T>60) pool.push('skel','wiz','gob'); if(T>15) pool.push('imp','lance');
    var pos=edgePos(Math.floor(Math.random()*4)), grp=2+Math.floor(Te/20);
    for(var g=0;g<grp;g++){ var lt=capNew(pool[Math.floor(Math.random()*pool.length)],3); w.spawns.push({type:lt,x:clamp(pos[0]+rnd(-40,40),FLR[0]+16,FLR[2]-16),y:clamp(pos[1]+rnd(-40,40),FLR[1]+16,FLR[3]-16),t:0.6+g*0.08,m:(1+Te/28)*H,el:T>20&&lt!=='bat'&&Math.random()<0.05+0.08*(H-1)?1:0}); } }
  w.tm.swarm-=dt; if(w.tm.swarm<=0&&T-(w.lsWT==null?-99:w.lsWT)<7) w.tm.swarm=7-(T-w.lsWT);   /* playtest handoff: big threats are staggered, a swarm never lands within 7 s of a Warden */
  if(w.tm.swarm<=0){ w.tm.swarm=20; w.banner={txt:'BAT SWARM!',sub:'',t:1.0}; var sd=Math.floor(Math.random()*4); for(var k=0;k<20;k++){ var p2=edgePos(sd); w.spawns.push({type:'bat',x:p2[0],y:p2[1],t:0.6+k*0.04,m:1+T/60}); } }
  /* falling rubble: a red circle, then a rock. Aimed near Rook, hurts enemies too */
  w.tm.rub-=dt; if(w.tm.rub<=0&&T-(w.lsWT==null?-99:w.lsWT)<3) w.tm.rub=0.5;   /* no rubble in the 3 s a new Warden lands */
  if(w.tm.rub<=0){ w.tm.rub=Math.max(0.5,2.0-Te*0.014); var nr=1+Math.floor(Te/35)+(H>=1.4?1:0);
    for(var r=0;r<nr;r++){ var at=r===0?[w.p.x+rnd(-40,40),w.p.y+rnd(-30,30)]:randFloor(0); w.rub.push({x:clamp(at[0],FLR[0]+20,FLR[2]-20),y:clamp(at[1],FLR[1]+20,FLR[3]-20),t:1.0,r:44}); } }
  for(var i=w.rub.length-1;i>=0;i--){ var rb=w.rub[i]; if(!rb) continue;   /* a knock-out from one rock can clear the list mid-loop */ rb.t-=dt; if(rb.t<=0){ w.rub.splice(i,1); SND.boom(); if(!RM) w.shake=Math.max(w.shake||0,0.08);
      for(var b=0;b<(RM?3:8);b++) if(w.fx.length<110) w.fx.push({k:'bit',x:rb.x,y:rb.y-6,vx:rnd(-120,120),vy:rnd(-160,10),t:0,c:'#8A92BE'});
      if(Math.hypot(w.p.x-rb.x,w.p.y-rb.y)<rb.r) hurtP({x:rb.x,y:rb.y,rk:1},1);
      DSRC='rubble'; w.en.forEach(function(e){ if(!e.dead&&e.type!=='boss'&&Math.hypot(e.x-rb.x,e.y-rb.y)<rb.r+e.r) hurtE(e,20,0,0,0); }); } } }
function drawRubble(c){ var w=S.w; (w.rub||[]).forEach(function(rb){ var k=1-rb.t/1.0, rd=Math.round(rb.r*(0.45+0.55*k)); c.globalAlpha=0.12+0.25*k; c.drawImage(FX.warnDisc,Math.round(rb.x-rd),Math.round(rb.y-rd),rd*2,rd*2); c.globalAlpha=1; c.drawImage(FX.warnRing,Math.round(rb.x-FX.warnRing.width/2),Math.round(rb.y-FX.warnRing.height/2));
  if(rb.t<0.3){ var fy=rb.y-6-rb.t*500; c.drawImage(SPR.rubble[(Math.round(rb.x)+Math.round(rb.y))&1],Math.round(rb.x-12),Math.round(fy-12));   /* falling rubble v1: 2 rocks, picked by spot so each rock keeps its look */ } }); }
function siegeTick(dt){ var w=S.w, R=ROOMS[w.rid], T=R.siege-w.siegeT; w.siegeT-=dt;
  if(!w.rally&&w.siegeT>0&&w.siegeT<=R.siege/2){ w.rally=1; openAsk('rally'); return; }
  if(w.siegeT<=0){ w.siegeT=0; if(!w.siegeDone){ w.siegeDone=1; w.spawns=[]; DSRC='siege'; w.en.forEach(function(e){ if(!e.dead){ w.fx.push({k:'puff',x:e.x,y:e.y,t:0}); killE(e,{}); } }); w.banner={txt:'YOU HELD THE HALL',sub:'',t:1.4}; } if(!w.en.filter(function(e){ return !e.dead; }).length) roomClear(); return; }
  w.tm.spawn-=dt; if(w.tm.spawn<=0&&w.en.length+w.spawns.length<50){ w.tm.spawn=Math.max(0.4,1.0-T*0.012);
    var pool=['gob','gob','bat']; if(T>8) pool.push('slime','bat'); if(T>16) pool.push('skel','gob'); if(T>26) pool.push('wiz','skel','slime'); if(T>12) pool.push('imp','lance');
    var side=Math.floor(Math.random()*4), pos=edgePos(side), grp=1+Math.floor(T/20);
    for(var g=0;g<grp;g++){ w.spawns.push({type:capNew(pool[Math.floor(Math.random()*pool.length)],2),x:clamp(pos[0]+rnd(-30,30),FLR[0]+16,FLR[2]-16),y:clamp(pos[1]+rnd(-30,30),FLR[1]+16,FLR[3]-16),t:0.7+g*0.12,m:1.15+T/80,el:T>18&&g===0&&Math.random()<0.12?1:0}); } }
  w.tm.swarm-=dt; if(w.tm.swarm<=0){ w.tm.swarm=99; w.banner={txt:'BAT SWARM!',sub:'',t:1.2}; var sd=Math.floor(Math.random()*4); for(var k=0;k<12;k++){ var p2=edgePos(sd); w.spawns.push({type:'bat',x:p2[0],y:p2[1],t:0.6+k*0.05,m:1}); } } }
/* Kody 2026-11-18: after the Library, Ember Imps and Lancers join the Siege Hall, the Warden's reinforcements and the Last Stand.
   A few at a time so fire rings and charge lanes stay readable. */
function capNew(t,n){ if(t!=='imp'&&t!=='lance') return t; var w=S.w, k=w.en.filter(function(e){ return !e.dead&&e.type===t; }).length+w.spawns.filter(function(q){ return q.type===t; }).length; return k<n?t:'gob'; }
function edgePos(side){ var p=S.w.p, f=FLR; for(var k=0;k<30;k++){ var x, y; if(side===0){ x=rnd(f[0]+30,f[2]-30); y=f[1]+26; } else if(side===1){ x=rnd(f[0]+30,f[2]-30); y=f[3]-24; } else if(side===2){ x=f[0]+24; y=rnd(f[1]+34,f[3]-30); } else { x=f[2]-24; y=rnd(f[1]+34,f[3]-30); }
    if(!wallAt(x,y)&&Math.hypot(x-p.x,y-p.y)>200) return [x,y]; side=(side+1)%4; } return [W/2,80]; }
/* ---------- smashable pots (rooms before the Shop) ----------
   Sheet (RRART.pots, ChatGPT Nov 14 via art/pots_pack/bundle_pots.py): 40x40 cells, base on row 36. Cols 0 intact / 1 cracked / 2 smashed.
   Rows = 6 looks: 0 terracotta pot, 1 grey-violet urn, 2 olive pot, 3 teal urn, 4 sandy pot, 5 plum urn (pots 28 tall, urns 34).
   pt.k is the row, picked when the room loads and kept for the pot's whole life; the stand-in below (2 rows) is only a fallback. A pot stops Rook (not enemies), breaks on one sword hit
   or a dodge roll. Before the Shop: a coin most of the time, a heart now and then if Rook is hurt.
   After the Shop (Siege, Warden): no coins (Kody 2026-11-14), only the occasional heart if Rook is hurt. */
var POTN={entry:3,guard:4,cross:4,vault:4,arena:4,library:4,siege:4,boss:4};   /* none in the Shop (it has its pedestals) */
var POTSTAND=null, PC=40, PB=36;   /* cell size and the base row inside a cell */
function potSheet(){ if(rrReady('pots')) return RRI.pots; if(POTSTAND) return POTSTAND;
  POTSTAND=mk(PC*3,PC*2,function(x){ var O='#141026', C=PC/2;
    function px(c,X,Y,w,h){ x.fillStyle=c; x.fillRect(X,Y,w||1,h||1); }
    function body(ox,oy,hw,top,cols,band,handles){ for(var y=top;y<=PB;y++){ var h=hw(y); if(h<=0) continue; px(O,ox+C-h-1,oy+y,2*h+2,1);
        for(var xx=-h+1;xx<=h-1;xx++){ var k=(xx+h)/(2*h); px(y>=band[0]&&y<=band[1]?cols[3]:k<0.3?cols[0]:k>0.72?cols[2]:cols[1],ox+C+xx,oy+y); } }
      px(O,ox+C-hw(top),oy+top-1,2*hw(top),1); px(O,ox+C-hw(PB),oy+PB+1,2*hw(PB),1);
      if(handles) [-1,1].forEach(function(s){ var hx=ox+C+s*(hw(10)+1); px(O,s<0?hx-3:hx,oy+9,4,1); px(O,s<0?hx-3:hx+3,oy+9,1,7); px(O,s<0?hx-3:hx,oy+15,4,1); }); }
    var RP=['#E08A4E','#B5552B','#7A3420','#5A2A1E'], UR=['#A7A3C4','#77729A','#4C4868','#E0A93C'];
    function rp(y){ return y<=10?7:y<=13?5:Math.round(5+7*Math.sin(Math.PI*Math.min(1,(y-12)/27))); }      /* 28 tall: rows 8-36 */
    function ur(y){ return y<=4?7:y<=9?4:y<=16?4+Math.round((y-9)*0.75):Math.max(5,Math.round(9-(y-16)*0.2)); }   /* 34 tall: rows 2-36 */
    for(var col=0;col<3;col++){ var ox=col*PC;
      if(col<2){ body(ox,0,rp,8,RP,[23,25]); body(ox,PC,ur,2,UR,[17,19],1);
        if(col===1){ [[17,15],[18,16],[18,17],[19,18],[19,19],[24,19],[25,20],[25,21],[26,22]].forEach(function(q){ px(O,ox+q[0],q[1]); }); [[16,14],[17,15],[17,16],[18,17],[23,24],[24,25],[24,26],[25,27]].forEach(function(q){ px(O,ox+q[0],PC+q[1]); }); } }
      else { body(ox,0,function(y){ return y>=31?rp(y):0; },31,RP,[99,99]); body(ox,PC,function(y){ return y>=32?ur(y):0; },32,UR,[99,99]);
        [[6,33,4,2],[29,34,4,2],[11,37,3,1],[27,30,3,2],[3,29,2,2],[33,31,3,1]].forEach(function(q,i){ px(O,ox+q[0]-1,q[1]-1,q[2]+2,q[3]+2); px(RP[i%3],ox+q[0],q[1],q[2],q[3]); px(O,ox+q[0]-1,PC+q[1]-1,q[2]+2,q[3]+2); px(UR[i%3],ox+q[0],PC+q[1],q[2],q[3]); }); } } });
  return POTSTAND; }
function placePots(id){ var w=S.w, R=ROOMS[id], n=POTN[id]||0; w.pots=[]; if(!n||!ROOMART) return; var fl=FLR, top=fl[1]+24, bot=fl[3]-20;
  var corners=[[[fl[0]+28,top],[fl[0]+64,top],[fl[0]+28,top+40]],[[fl[2]-28,top],[fl[2]-64,top],[fl[2]-28,top+40]],[[fl[0]+28,bot],[fl[0]+64,bot],[fl[0]+28,bot-40]],[[fl[2]-28,bot],[fl[2]-64,bot],[fl[2]-28,bot-40]]];
  function ok(q){ var x=q[0], y=q[1]; if(Math.abs(x-481)<100&&(y<fl[1]+90||y>fl[3]-90)) return false;
    if((x<fl[0]+90||x>fl[2]-90)&&y>DOORS[0]-60&&y<DOORS[1]+60) return false; if(R.secret&&Math.abs(x-secretX())<100&&y<fl[1]+100) return false;
    for(var a=-1;a<=1;a++) for(var b=-1;b<=1;b++) if(wallAt(x+a*14,y+b*14)) return false; return true; }
  var order=corners.map(function(c,i){ return [Math.random(),c]; }).sort(function(a,b){ return a[0]-b[0]; }).map(function(a){ return a[1]; });
  for(var i=0;i<order.length&&w.pots.length<n;i++){ var c=order[i].filter(ok); var prev=-1; for(var j=0;j<c.length&&j<2&&w.pots.length<n;j++){ var k; do k=potLook(); while(k===prev); prev=k; w.pots.push({x:c[j][0],y:c[j][1],k:k,st:0,br:0}); } } }
/* look: the two originals a bit more often (25% each), the four new colourways 12.5% each; the two pots in a pair never match */
function potLook(){ var r=Math.random(); return r<0.25?0:r<0.5?1:2+Math.floor((r-0.5)/0.125); }
var POTFX=[['#E08A4E','#B5552B','#7A3420'],['#A7A3C4','#77729A','#E0A93C'],['#B5B060','#83803F','#5A5A2C'],['#7FA5B2','#51727F','#E0A93C'],['#F6BF7F','#E1A465','#B07548'],['#A0839A','#7F6677','#E0A93C']];
function hitPot(pt){ if(pt.st) return; pt.st=1; pt.br=0.08; SND.crack(); }
function potTick(dt){ var w=S.w, p=w.p; if(!w.pots||!w.pots.length) return;
  w.pots.forEach(function(pt){ if(pt.st===1){ pt.br-=dt; if(pt.br<=0){ pt.st=2; potLoot(pt); } } if(pt.st) return;
    var dx=p.x-pt.x, dy=p.y-pt.y, d=Math.hypot(dx,dy), rr=p.r+13;
    if(p.roll>0&&d<rr+6){ hitPot(pt); return; }
    if(d<rr&&d>0.01){ p.x=pt.x+dx/d*rr; p.y=pt.y+dy/d*rr; } }); }
function potLoot(pt){ var w=S.w, p=w.p, cl=POTFX[pt.k]||POTFX[0];
  for(var k=0;k<7;k++) w.fx.push({k:'bit',x:pt.x+rnd(-8,8),y:pt.y-2,vx:rnd(-110,110),vy:rnd(-150,-30),t:0,c:cl[k%3]});
  var r=Math.random(), late=ROOMS[w.rid].siege||ROOMS[w.rid].boss;
  if(p.hp<p.max&&r<(late?0.2:0.12)&&w.hearts.length<4) w.hearts.push({x:pt.x,y:pt.y+6,t:0}); else if(!late&&r<0.72) w.coinsF.push({x:pt.x+rnd(-6,6),y:pt.y+8,m:0}); }
function potHitsSwing(rng,arc,a){ var w=S.w, p=w.p; if(!w.pots) return; w.pots.forEach(function(pt){ if(pt.st) return; var dx=pt.x-p.x, dy=pt.y-p.y+6, d=Math.hypot(dx,dy);
  if(d<rng+12&&(d<26||angDiff(Math.atan2(dy,dx),a)<arc/2)) hitPot(pt); }); }
function drawPot(c,pt){ var sh=potSheet(), col=pt.st===2?2:pt.st, fy=Math.round(pt.y+10);
  if(pt.st<2){ c.fillStyle='rgba(0,0,0,.3)'; c.fillRect(Math.round(pt.x-11),fy-1,22,3); }
  c.drawImage(sh,col*PC,(sh===POTSTAND?pt.k%2:pt.k)*PC,PC,PC,Math.round(pt.x-PC/2),fy-PB,PC,PC); }
/* shop art (Nov 14): sprite column per item, and the merchant's spot (feet) behind the item row, left of the carpet.
   He is scenery only: no hitbox, never a target. Frames: 0/1 idle breathing, 2 wave hello, 3 nod after a purchase or a good deal. */
var SHOPSP={heal:0,max:1,card:2,gold:3,arm:4}, MERCH=[W/2-84,262];
/* the merchant's speech bubble (playtest handoff 2026-11-15): one short line at a time, only on real moments (walking in, first look, a buy,
   not enough coins, heading out). Never the same line twice in a row, a cooldown for the quiet ones, no clicks, no sound, no blocking. */
var SAY={ enter:['Welcome in, knight. Catch your breath.','Come on in. Have a look.'], browse:['Something here might help.','Take your time. You\u2019re safe here.'],
  bought:['There you go. Make it count!','A little help for the road.'], poor:['A few more coins, friend.'], leave:['Take care out there, Rook.'] };
function say(k){ var w=S.w; if(!w||!w.shop) return; var quiet=k==='enter'||k==='browse', now=w.t; if(quiet&&w.bub&&w.bub.t>0) return; if(quiet&&now<(w.sayCd||0)) return;
  if(k==='leave'&&w.saidLeave) return; if(k==='leave') w.saidLeave=1;
  var L0=SAY[k], last=w.bub&&w.bub.s, opts=L0.filter(function(x){ return x!==last; }); if(!opts.length) opts=L0; var line=opts[Math.floor(Math.random()*opts.length)];
  if(k==='poor'&&w.bub&&w.bub.s===line&&w.bub.t>0){ w.bub.t=2.2; return; }
  w.bub={s:line,t:k==='leave'?1.8:2.6}; w.sayCd=now+6; }
function drawBubble(c,w){ var b=w.bub; if(!b||b.t<=0) return; var im=tspr(b.s,15,'#2B1D14'), K=2, E=8*K, bw=Math.max(2*E,im.width+28), bh=Math.max(2*E,im.height+14), x=Math.round(Math.max(FLR[0]+6,Math.min(FLR[2]-6-bw,MERCH[0]-bw/2))), y=MERCH[1]-104-(bh-32);
  /* merchant bubble v1: ChatGPT's parchment 9-slice (SPR.bubble, 8x8 art cells drawn at K=2); edges stretch along their run (every edge row/column is one colour), centre is one flat fill */
  var ga=c.globalAlpha, sm=c.imageSmoothingEnabled, B=SPR.bubble, mw=bw-2*E, mh=bh-2*E; c.globalAlpha=ga*Math.min(1,b.t/0.25); c.imageSmoothingEnabled=false;
  c.drawImage(B[0],x,y,E,E); c.drawImage(B[2],x+bw-E,y,E,E); c.drawImage(B[6],x,y+bh-E,E,E); c.drawImage(B[8],x+bw-E,y+bh-E,E,E);
  if(mw>0){ c.drawImage(B[1],x+E,y,mw,E); c.drawImage(B[7],x+E,y+bh-E,mw,E); }
  if(mh>0){ c.drawImage(B[3],x,y+E,E,mh); c.drawImage(B[5],x+bw-E,y+E,E,mh); }
  if(mw>0&&mh>0) c.drawImage(B[4],x+E,y+E,mw,mh);
  var tx=Math.round(Math.max(x+E,Math.min(x+bw-E,MERCH[0]))); c.drawImage(B[9],tx-E/2,y+bh-2*K,E,E); /* tail row 1 (its top outline) sits on the frame bottom outline */
  c.imageSmoothingEnabled=sm; c.drawImage(im,Math.round(x+bw/2-im.width/2),Math.round(y+bh/2-im.height/2)); c.globalAlpha=ga; }
function drawMerchant(c,w){ var el=w.t-(w.mAt||0), col=Math.floor(w.t/0.8)%2;
  if(w.mA==='wave'&&el<1.8) col=Math.floor(el/0.3)%2?1:2; else if(w.mA==='nod'&&el>=0&&el<0.7) col=3;
  c.fillStyle='rgba(0,0,0,.32)'; c.fillRect(MERCH[0]-14,MERCH[1]-2,28,4); rrDraw(c,'merchant',0,col,MERCH[0],MERCH[1],false); }
var NEARAT=0;
function buy(it){ var w=S.w, p=w.p; if(it.id==='max'&&p.max>=MAXH){ toast('Hearts are maxed ('+MAXH+')'); SND.deny(); return; }
  if(w.coins<it.cost){ toast('Not enough coins ('+w.coins+' / '+it.cost+')'); SND.deny(); say('poor'); return; }
  w.coins-=it.cost; it.hold=1; if(it.next&&it.next.length) it.cost=it.next.shift(); else it.sold=1; SND.buy(); w.mA='nod'; w.mAt=w.t; say('bought');
  if(it.id==='heal'){ p.hp=p.max; toast('Healed!'); } else if(it.id==='max'){ p.max=Math.min(MAXH,p.max+1); p.hp=p.max; toast('+1 max heart!'); } else if(it.id==='arm'){ p.arm=(p.arm||0)+3; toast('Armor on: blocks the next 3 hits'); } else if(it.id==='rev'){ S.revExtra=1; toast('Second Wind: one more chance if you are knocked out'); } else if(it.id==='card'){ openPick('shop',3,0.25); } else if(it.id==='gold'){ openPick('gold',3,1); } }
var trans=0;
function transTick(dt){ var w=S.w, p=w.p, d=w.tdir||[0,-1], was=trans; trans-=dt; if(w.bub&&w.bub.t>0) w.bub.t-=dt;
  if(was>TH&&trans<=TH&&w.next){ var n=w.next; w.next=null; loadRoom(n[0],n[1]); save(); p.x-=d[0]*54; p.y-=d[1]*54; p.fx=d[0]; p.fy=d[1]; }
  var sp=w.next?(d[1]?110:80):120; p.x+=d[0]*sp*dt; p.y+=d[1]*sp*dt; p.mv=true; p.walk+=dt;
  if(trans<=0){ trans=0; S.mode='play'; p.mv=false; } }

/* ---------- levels, picks and questions ---------- */
function gainXP(v,quiet){ var w=S.w; w.xp+=v; if(!quiet) SND.gem(); while(w.xp>=w.need){ w.xp-=w.need; w.lv++; w.need=2+3*w.lv; w.pend++; if(!w.cleared&&!quiet) w.fx.push({k:'txt',x:w.p.x,y:w.p.y-44,t:0,v:'Upgrade banked!',c:'#FFC93C'}); } }
function levelUp(){ var w=S.w; w.pend--; if(w.batch==null){ SND.level(); openAsk('level'); } else { w.batch.i=(w.batch.i||1)+1; openPick('level',w.batch.n,w.batch.g,w.batch.pm); } }
function knockedOut(){ var w=S.w; HELD={}; SND.ko(); if(!S.revUsed){ S.revUsed=1; openAsk('revive'); } else if(S.revExtra===1){ S.revExtra=2; openAsk('revive'); }   /* Second Wind from the shop: the same question, once more */ else finishRun(!!w.won,'fall'); }
/* starter relic (playtest handoff 2026-11-15): dealt as Rook walks into the Entry Hall, before the first wave, with no screen to accept.
   Still random from the same three families; a Bulwark starter comes at Lv 2 as before (they are weaker on their own). w.starter = its id, so a reload never deals a second one. */
function dealStarter(){ var w=S.w; if(w.starter||w.picks) return; var ST=[['wave','whirl'],['spark','orbit','volatile'],['bash','thorns','aegis']], pth=ST[Math.floor(Math.random()*3)];
  var fid=pth[Math.floor(Math.random()*pth.length)], lv=UPI[fid].path==='bulwark'?2:1; w.b[fid]=lv; w.picks=1; w.starter=fid;
  w.bannerQ=[{txt:'STARTER RELIC: '+UPI[fid].n.toUpperCase(),sub:INFO[fid].how+'. '+INFO[fid].use+'. Right answers earn more powers.',t:3.0,ic:fid}]; renderBuild(); }
/* Kody's classroom test 2026-11-16: start with 5 hearts, never more than 7. The Shop sells one Heart Container,
   and the Heart Container card is rare (weight 0.35, other cards 1-3) and stops showing up at 7. */
var MAXH=7;
function cardsFor(n,goldChance,perfect){ var w=S.w, out=[];
  SYN.forEach(function(u){ if(out.length<1&&synReady(u)) out.push({id:u.id,syn:1}); });
  var paths={}; UP.forEach(function(u){ if(L(u.id)&&u.path!=='any') paths[u.path]=(paths[u.path]||0)+1; });
  var pool=UP.filter(function(u){ return L(u.id)<3&&(u.id!=='heart'||w.p.max<MAXH); }).map(function(u){ var wt=1; if(u.id==='heart') return {id:u.id,wt:0.35}; if(L(u.id)) wt=3; else if(paths[u.path]) wt=2;
      synFor(u.id).forEach(function(sy){ if(!HAS(sy.id)&&sy.need.some(function(q){ return q[0]!==u.id&&L(q[0])>0; })) wt+=2; });
      return {id:u.id,wt:wt}; });
  while(out.length<n&&pool.length){ var tot=pool.reduce(function(a,b){ return a+b.wt; },0), r=Math.random()*tot, k=0; for(;k<pool.length-1;k++){ r-=pool[k].wt; if(r<=0) break; }
    out.push({id:pool[k].id,gold:Math.random()<goldChance}); pool.splice(k,1); }
  if(!out.length) out.push({id:'snack'});
  if(perfect){ var best=null; out.forEach(function(c){ if(c.syn||c.id==='snack') return; if(!best||L(c.id)<L(best.id)) best=c; }); if(best){ best.gold=true; best.pm=1; } }
  return out; }
/* Kody's classroom test 2026-11-16: "allow the ability to re roll powers with gold". R (or the button) deals a fresh hand
   for coins: 15, then 10 more each time this run. Same number of cards and the same perfect-math gold card; never on the starter relic. */
function rerollCost(){ return 15+10*(S.w.rrN||0); }
function canReroll(){ return S.mode==='pick'&&S.cards.length&&!S.cards[0].first&&S.cards[0].id!=='snack'; }
function reroll(){ if(!canReroll()||!gateOpen()) return; var w=S.w, c=rerollCost();
  if(w.coins<c){ toast('Reroll costs '+c+' coins'); SND.tick(); return; }
  var a=S.pickArgs||[S.cards.length,0,S.cards.some(function(x){ return x.pm; })]; w.coins-=c; w.rrN=(w.rrN||0)+1;
  S.cards=cardsFor(a[0],a[1],a[2]); SND.pick(); showPick(); renderBuild(); save(); }
function openPick(why,n,goldChance,perfect){ S.pickArgs=[n||3,goldChance||0,perfect]; S.cards=cardsFor(n||3,goldChance||0,perfect); S.pickWhy=why; S.mode='pick'; HELD={}; showPick(); arm($('dn-pick').querySelector('.dn-pickbox')); save(); }
var PATHN={blade:'Blade',storm:'Storm',bulwark:'Bulwark',any:'Extra'};
/* every family has one color everywhere: cards, combo chips and the build list */
/* power icons: the Nov 14 pixel icons (RRICON in rr_art.js, one 24x24 image per power, sized by font-size: 1em).
   The emoji in UP/SYN stay as the fallback if an icon is ever missing. */
(function(){ if(typeof RRICON==='undefined') return; var css='.dn-pi{ display:inline-block; width:1em; height:1em; vertical-align:middle; background:center/100% 100% no-repeat; image-rendering:pixelated; image-rendering:crisp-edges; font-style:normal; }\n';
  Object.keys(RRICON).forEach(function(id){ css+='.dn-pi.pi-'+id+'{ background-image:url('+RRICON[id]+'); }\n'; }); var st=document.createElement('style'); st.textContent=css; document.head.appendChild(st); })();
function PIC(u){ return typeof RRICON!=='undefined'&&RRICON[u.id]?'<i class="dn-pi pi-'+u.id+'"></i>':null; }
function ICON(u){ return PIC(u)||u.ic+(u.ic2?'<i class="dn-ic2">'+u.ic2+'</i>':''); }
/* the combos a power can make: partner chip -> synergy, owned partners first */
function comboHTML(id,to){ var rows=synFor(id).filter(function(u){ return !HAS(u.id); }).map(function(s){ var mine=s.need.filter(function(q){ return q[0]===id; })[0], others=s.need.filter(function(q){ return q[0]!==id; }),
      have=others.every(function(q){ return L(q[0])>=q[1]; }), ready=have&&to>=mine[1];
    var parts=s.need.map(function(q){ if(q[0]===id) return '<span class="pt this">'+(others.length?'This card':UPI[q[0]].n)+(q[1]>1?' Lv '+q[1]:'')+'</span>';
      var own=L(q[0])>=q[1]; return '<span class="pt'+(own?' own':'')+'">'+(own?'✓ ':'')+UPI[q[0]].n+(q[1]>1?' Lv '+q[1]:'')+'</span>'; }).join('<span class="ar">+</span>');
    return {have:ready?2:have?1:0, s:s, h:'<div class="dn-co'+(ready?' have':'')+'">'+parts+'<span class="ar">→</span><span class="sn">'+(PIC(s)||s.ic)+' '+s.n+'</span></div>'}; });
  if(!rows.length) return ''; rows.sort(function(a,b){ return b.have-a.have; }); var r=rows[0];
  /* what taking this card does for that synergy. cardsFor offers the first ready synergy (in SYN order) on the very next card choice, so say "next" only when it will be this one */
  var note='';
  if(r.have===2){ var nextS=SYN.filter(function(u){ return !HAS(u.id)&&u.need.every(function(q){ return (q[0]===id?to:L(q[0]))>=q[1]; }); })[0];
    note='<div class="dn-conote">Taking this unlocks '+r.s.n+(nextS===r.s?' as your next upgrade choice.':' as a future upgrade choice.')+'</div>'; }
  return '<div class="dn-combos"><div class="t">Synergy</div>'+r.h+note+'</div>'; }
function showPick(){ var why=S.pickWhy;
  var w=S.w, b=why==='level'&&w.batch, first=S.cards.length===1&&S.cards[0].first, n=S.cards.length;
  $('dn-pickstep').textContent=b&&b.tot>1?'Reward '+Math.min(b.i,b.tot)+' of '+b.tot:'';
  $('dn-picktitle').textContent=first?'Starter relic':why==='chest'?'Treasure':why==='gold'?'Gold treasure':why==='secret'?'Secret treasure':why==='shop'?'Upgrade Scroll':'Earned upgrade';
  $('dn-picknote').textContent=first?'Assigned by the Keep. No choosing this one: build around it, or fight against it. Press 1 to take it.'
    :(n>1?'Choose 1 of '+n+'. ':'')+(S.cards.some(function(c){ return c.syn; })?'A synergy is ready to choose! ':S.cards.some(function(c){ return c.pm; })?'Perfect math: one card is gold. ':why==='level'&&n<3?'No right answers this time, so 2 cards. ':'')+'Press '+(n>1?'1'+(n>2?', 2 or 3':' or 2'):'1')+', or click a card.';
  var anyReady=false;
  $('dn-cards').innerHTML=S.cards.map(function(c,i){ if(c.id==='snack') return '<button class="dn-card" data-i="'+i+'"><span class="k">'+(i+1)+'</span><span class="ic">🍎</span><span class="n">Snack</span><span class="lv">Everything is maxed</span><span class="d">Heal to full</span></button>';
    var u=UPI[c.id];
    if(u.syn) return '<button class="dn-card evo" data-i="'+i+'"><span class="k">'+(i+1)+'</span><span class="dn-fam">Synergy</span><span class="ic">'+ICON(u)+'</span><span class="n">'+u.n+'</span><span class="lv">'+synName(u)+'</span><span class="d">'+u.d+'</span><span class="dn-rar">Synergy · one level</span></button>';
    var l=L(c.id), to=Math.min(3,l+(c.gold?2:1)), cn=comboHTML(c.id,to);
    var tier=(l?'Upgrade · Lv '+l+' → '+(to>=3?'MAX':to):'New power'+(to>1?' · Lv '+to:''))+' · '+INFO[c.id].use,
        body=l?'<div class="dn-sts">'+statRows(c.id,l,to)+'</div><span class="d base">'+INFO[c.id].base+'</span>'
              :'<div class="dn-sts">'+statRows(c.id,0,to)+'</div><span class="d base">'+INFO[c.id].base+'</span>';
    return '<button class="dn-card fam p-'+u.path+(c.gold?' gold':'')+'" data-i="'+i+'"><span class="k">'+(i+1)+'</span><span class="dn-fam">'+PATHN[u.path]+(u.path==='any'?'':' power')+'</span><span class="ic">'+ICON(u)+'</span><span class="n">'+u.n+'</span><span class="lv">'+tier+'</span><span class="dn-how">'+INFO[c.id].how+'</span>'+body+cn+(c.pm?'<span class="dn-rar">Perfect math · +2 levels</span>':c.gold?'<span class="dn-rar">Gold card · skips a level</span>':'')+'</button>'; }).join('');
  $('dn-readynote').textContent='';
  var rb=$('dn-reroll'), rc=rerollCost(); rb.hidden=!canReroll(); rb.disabled=w.coins<rc; rb.innerHTML='Reroll (R) · <b>'+rc+'</b> coins';
  $('dn-pick').hidden=false; }
function pick(i){ if(S.mode!=='pick') return; var c=S.cards[i]; if(!c) return; var w=S.w, p=w.p;
  if(c.id==='snack'){ p.hp=p.max; }
  else if(c.syn){ w.b[c.id]=1; }
  else { var before=L(c.id), to=Math.min(3,before+(c.gold?2:1)); w.b[c.id]=to;
    if(c.id==='heart'){ p.max=Math.min(MAXH,p.max+to-before); p.hp=p.max; }
    if(c.id==='aegis'&&!before) p.sh=0; }
  w.picks++;
  var card=$('dn-cards').children[i]; if(card){ var r=card.getBoundingClientRect(), pt=stagePoint(card,0,0), k=1920/$('stage').getBoundingClientRect().width; sparks(pt[0]+r.width*k/2,pt[1]+r.height*k/3,c.syn?26:c.gold?20:12,c.syn||c.gold?1:0); }
  if(c.gold||c.syn) SND.gold(); else SND.pick();
  toast(c.id==='snack'?'Healed!':c.syn?'Synergy: '+UPI[c.id].n:(c.first?'Starter relic: ':'')+UPI[c.id].n+(w.b[c.id]>=3?' MAX':' Lv '+w.b[c.id]));
  var why=S.pickWhy; $('dn-pick').hidden=true; S.cards=[]; S.mode='play'; S.pickWhy=''; w.resolve=0.25; if(w.pend<=0) w.batch=null; renderBuild();
  if(why==='level'&&w.batch&&w.pend>0&&(w.cleared||w.preLast)){ levelUp(); return; }   /* more earned upgrades: straight to the next choice, no arena in between (the input gate still applies) */
  save(); }

/* sparks (2026-11-14, replaces the kit's rainbow confetti in this game): a small burst of square gold sparks, plus cyan relic
   fragments for gold and synergy picks. Short, time-based, drawn on the confetti layer; nothing at all with reduced motion. */
var SPK=[], spkRaf=0, spkLast=0;
function sparks(x,y,n,relic){ if(RM) return; for(var i=0;i<n;i++){ var a=-Math.PI/2+(Math.random()-0.5)*2.2, v=260+Math.random()*420, cy=relic&&i%3===0;
    SPK.push({x:x+(Math.random()-0.5)*40,y:y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,s:cy?8:(Math.random()<0.5?6:4),c:cy?(i%2?'#4FE3F0':'#9AF2FF'):['#FFC23A','#FFE07A','#E3961C'][i%3],t:0,m:0.45+Math.random()*0.4}); }
  if(SPK.length>240) SPK=SPK.slice(-240); if(!spkRaf){ spkLast=0; spkRaf=requestAnimationFrame(spkStep); } }
function spkStep(ts){ spkRaf=0; var cv0=$('dn-confetti'), c=cv0.getContext('2d'), k=cv0.width/1920, dt=spkLast?Math.min(0.05,(ts-spkLast)/1000):0.016; spkLast=ts;
  c.setTransform(1,0,0,1,0,0); c.clearRect(0,0,cv0.width,cv0.height); SPK=SPK.filter(function(p){ return p.t<p.m; });
  SPK.forEach(function(p){ p.t+=dt; p.vy+=900*dt; p.vx*=Math.pow(0.2,dt); p.x+=p.vx*dt; p.y+=p.vy*dt; c.globalAlpha=Math.max(0,Math.min(1,(p.m-p.t)/0.2)); c.fillStyle=p.c;
    c.fillRect(Math.round(p.x*k),Math.round(p.y*k),Math.max(2,Math.round(p.s*k)),Math.max(2,Math.round(p.s*k))); });
  c.globalAlpha=1; if(SPK.length) spkRaf=requestAnimationFrame(spkStep); else c.clearRect(0,0,cv0.width,cv0.height); }
window.__sparks=function(){ return SPK.length; };

/* questions (the shared panel), shown over the frozen castle, only between fights */
var nextT=0, lockT=0;
/* input gate (2026-11-14): when a question or a reward screen opens out of combat it shows at once, but for ARM_MS nothing can be picked,
   keys still held from the fight are eaten until they are released, and a click only counts if the mouse/touch went down after the gate opened.
   Nothing pressed during the gate is queued. The same gate (shorter) sits between an answer and its Continue. */
var ARM_MS=500, NEXT_MS=400, GATE=0, NEXTGATE=0, DOWNK={}, lastPD=0, armT=0;
function arm(el){ GATE=performance.now()+ARM_MS; HELD={}; BUF.s=0; BUF.e=0; Object.keys(DOWNK).forEach(function(k){ EAT[k]=1; }); if(DOWNK.shift) EAT.shift=1;
  try{ if(document.activeElement&&document.activeElement!==document.body) document.activeElement.blur(); }catch(e){}
  if(el){ el.classList.add('arming'); clearTimeout(armT); armT=setTimeout(function(){ el.classList.remove('arming'); },ARM_MS); } }
function gateOpen(){ return performance.now()>=GATE; }
function freshClick(e,since){ return e.detail>0&&lastPD>=since; }
document.addEventListener('pointerdown',function(){ lastPD=performance.now(); },true);
document.addEventListener('keydown',function(e){ var k=(e.key||'').toLowerCase(); DOWNK[k]=1; if(e.key==='Shift') DOWNK.shift=1; },true);
document.addEventListener('keyup',function(e){ var k=(e.key||'').toLowerCase(); delete DOWNK[k]; if(e.key==='Shift') delete DOWNK.shift; },true);
addEventListener('blur',function(){ DOWNK={}; });
if(FAST) $('dn-q').classList.add('fast');
var ASKTXT={ level:['Power up!',''], revive:['Knocked out!','Right answer: get back up with 3 hearts'],
  chest:['Unlock the chest','Right answer: bonus coins and better odds of gold treasure'], deal:["The merchant's deal",'Each right answer: +6 coins'], rally:['Rally!','Right answer: +1 heart (or armor if full)'] };
/* what a level-up's questions really pay (2026-11-14 flow pass): 1+ right = pick from 3 cards (0 right = 2), both right = each card has a 1 in 5 gold chance.
   The starter relic is dealt at the start of the Entry Hall instead (dealStarter). */
function levelPromise(){ var w=S.w, more=w.pend||0;
  return '1 right: choose from 3 cards (else 2). 2 right: one card is guaranteed gold (+2 levels).'+(more?' Then '+(more+1)+' upgrade choices in a row.':''); }
/* the question card never shrinks during one ask (Kody 2026-11-15: it bounced up and down after each answer); it starts fresh on the next ask */
var QMIN=0;
if(window.ResizeObserver) new ResizeObserver(function(){ var q=$('dn-q'); if(!S||S.mode!=='ask') return; var h=q.offsetHeight; if(h>QMIN){ QMIN=h; q.style.minHeight=h+'px'; } }).observe($('dn-q'));
function openAsk(why,o){ QMIN=0; $('dn-q').style.minHeight=''; S.mode='ask'; HELD={}; S.ask={why:why, need:why==='level'||why==='deal'?2:1, got:0, n:0, o:o||null}; newQ(); $('dn-qwrap').hidden=false; arm($('dn-q')); save(); }
function showQ(){ var q=S.q, a=S.ask; if(!q||!a) return; var t=ASKTXT[a.why];
  $('dn-qtitle').innerHTML=t[0]+(a.need>1?' <small>Question '+Math.min(a.n+1,a.need)+' of '+a.need+'</small>':'');
  $('dn-tag').textContent=q.topic; $('dn-reward').textContent='';
  $('dn-prompt').innerHTML=q.prompt; $('dn-visual').innerHTML=q.visual||''; $('dn-q').classList.toggle('vis',!!q.visual);
  $('dn-choices').innerHTML=q.choices.map(function(c,i){ return '<button class="dn-ch" data-i="'+i+'"><span class="k">'+(i+1)+'</span><span class="t">'+c.html+'</span></button>'; }).join('');
  var fb=$('dn-fb'); if(!S.qDone){ fb.className='dn-fb'; fb.innerHTML='<span class="h">'+(a.why==='level'?levelPromise():t[1]+'.')+'</span>Press 1, 2, 3 or 4, or click an answer.'; } $('dn-next').disabled=true; $('dn-next').textContent='Continue ›';
  if(S.qDone) markAnswered(S.picked,false); }
function newQ(){ clearTimeout(nextT); clearTimeout(lockT); if(!QS) return; S.q=QS.next(); S.qDone=false; S.picked=-1; save(); showQ(); }
function markAnswered(i,fresh){ var q=S.q, btns=$('dn-choices').querySelectorAll('.dn-ch'), c=q.choices[i], fb=$('dn-fb');
  btns.forEach(function(b,j){ b.disabled=true; if(q.choices[j].ok){ b.classList.add('right'); if(!b.querySelector('.mk')) b.insertAdjacentHTML('beforeend','<span class="mk">✓ Right answer</span>'); } else if(j!==i) b.classList.add('dim'); });
  if(!c.ok&&btns[i]){ btns[i].classList.add('wrong'); if(!btns[i].querySelector('.mk')) btns[i].insertAdjacentHTML('beforeend','<span class="mk">Your answer</span>'); }
  var nx=$('dn-next'); nx.textContent=S.ask&&S.ask.n<S.ask.need?'Next question ›':'Continue ›';
  if(fresh) NEXTGATE=performance.now()+(c.ok?NEXT_MS:1800);
  if(c.ok){ fb.className='dn-fb ok'; fb.innerHTML='<span class="h">Correct!'+(fresh&&S.streak>1?' Streak '+S.streak+'.':'')+'</span>'+q.explain; }
  else { fb.className='dn-fb bad'; fb.innerHTML='<span class="h">Not quite.</span>'+c.why+(FAST?' ':'<br>')+q.explain; }
  /* the explanation stays until the student presses Continue (or Enter); it unlocks after a short beat so the answering press can't skip it */
  nx.disabled=true; clearTimeout(lockT); var wait=Math.max(0,NEXTGATE-performance.now()); lockT=setTimeout(function(){ if(S.qDone) nx.disabled=false; },wait); }
function answer(i){ if(S.mode!=='ask'||S.qDone||!S.q) return; var c=S.q.choices[i]; if(!c) return; S.qDone=true; S.picked=i; S.answered++; S.ask.n++;
  if(!S.topics[S.q.topic]) S.topics[S.q.topic]=[0,0]; S.topics[S.q.topic][1]++;
  var btn=$('dn-choices').querySelectorAll('.dn-ch')[i];
  if(c.ok){ S.correct++; S.topics[S.q.topic][0]++; S.streak++; S.best=Math.max(S.best,S.streak); S.ask.got++; SND.correct(); markAnswered(i,true);
    var pt=stagePoint(btn,60,40); sparks(pt[0],pt[1],10,0); }
  else { S.streak=0; SND.miss(); markAnswered(i,true); }
  save(); hud(1); }
function askNext(){ clearTimeout(nextT); var a=S.ask; if(!a||!S.qDone||performance.now()<NEXTGATE) return; if(a.n<a.need){ newQ(); arm($('dn-q')); return; } closeAsk(); }
function closeAsk(){ var a=S.ask, w=S.w, p=w.p, all=a.got>=a.need; $('dn-qwrap').hidden=true; S.ask=null; S.q=null; S.mode='play';
  if(a.why==='level'){ var n=a.got?3:2; w.batch={n:n,g:all?0.2:0,pm:all?1:0,tot:1+(w.pend||0),i:1}; if(all) toast('Perfect! A gold card is guaranteed'); openPick('level',n,w.batch.g,w.batch.pm); }
  else if(a.why==='revive'){ if(all){ p.burn=0; w.fires=[]; p.hp=Math.min(p.max,3); p.inv=2.2; S.mode='reentry'; S.reT=REENTRY; HELD={}; BUF.s=0; Object.keys(DOWNK).forEach(function(k){ EAT[k]=1; }); w.orbs=[]; w.rings=[]; w.en.forEach(function(e){ var dx=e.x-p.x, dy=e.y-p.y, d=Math.hypot(dx,dy)||1; if(d<240){ e.kx=dx/d*460; e.ky=dy/d*460; e.st=0; e.cd=1.2; } }); w.fx.push({k:'ring',x:p.x,y:p.y,t:0}); SND.level(); }
    else finishRun(!!w.won,'fall'); }
  else if(a.why==='chest'){ var o=a.o||{w:'chest',g:0.3,c:4}; if(all){ w.coins+=o.c; toast('Unlocked! +'+o.c+' coins'); } openPick(o.w,3,all?Math.min(1,o.g+0.4):o.g); }
  else if(a.why==='deal'){ setTimeout(function(){ if(S.w&&S.w.shop) say('enter'); },0); if(a.got){ w.mA='nod'; w.mAt=w.t; w.coins+=6*a.got; toast('+'+(6*a.got)+' coins from the merchant'); SND.chest(); } else toast('No deal this time'); }
  else if(a.why==='rally'){ p.inv=Math.max(p.inv||0,1.2); if(all){ var hv=p.hp<p.max; if(hv) p.hp++; else p.arm=(p.arm||0)+1; w.fx.push({k:'txt',x:p.x,y:p.y-44,t:0,v:hv?'+1 ♥':'+1 armor',c:'#FF6B86'}); SND.level(); } else toast('No bonus this time'); if(!RM) S.slow=0.6; }
  hud(1); save(); }
/* clicks count only if the press started after the gate opened (a held or spammed click from the fight never answers); keyboard "clicks" on a focused button are ignored, 1-4 and Enter do that job */
$('dn-choices').addEventListener('click',function(e){ var b=e.target.closest('.dn-ch'); if(b&&gateOpen()&&freshClick(e,GATE)) answer(+b.dataset.i); });
$('dn-next').addEventListener('click',function(e){ if(S.qDone&&freshClick(e,NEXTGATE)) askNext(); });
$('dn-reroll').addEventListener('click',function(e){ if(freshClick(e,GATE)) reroll(); this.blur(); });
$('dn-cards').addEventListener('click',function(e){ var b=e.target.closest('.dn-card'); if(b&&gateOpen()&&freshClick(e,GATE)) pick(+b.dataset.i); });
function clock(t){ t=Math.floor(t); return Math.floor(t/60)+':'+('0'+t%60).slice(-2); }

/* ---------- drawing ---------- */
function sprF(name,x,footY,flip,sc){ var im=SPR[name]; sc=sc||2; var w=im.width*sc, h=im.height*sc; x=Math.round(x); var y=Math.round(footY-h);
  if(flip){ cx.save(); cx.translate(x,0); cx.scale(-1,1); cx.drawImage(im,-w/2,y,w,h); cx.restore(); } else cx.drawImage(im,x-w/2,y,w,h); }
function spr(name,x,y,flip,scale){ var im=SPR[name]; scale=scale||2; var w=im.width*scale, h=im.height*scale;
  if(flip){ cx.save(); cx.translate(Math.round(x),0); cx.scale(-1,1); cx.drawImage(im,Math.round(-w/2),Math.round(y-h/2),w,h); cx.restore(); }
  else cx.drawImage(im,Math.round(x-w/2),Math.round(y-h/2),w,h); }
/* a tapered crescent between angles t0..t1 at radius r, th thick in the middle */
function crescent(c,x,y,t0,t1,r,th){ var mid=(t0+t1)/2, cr=2*(r-th)-r*Math.cos((t1-t0)/2); c.beginPath(); c.arc(x,y,r,t0,t1); c.quadraticCurveTo(x+Math.cos(mid)*cr,y+Math.sin(mid)*cr,x+Math.cos(t0)*r,y+Math.sin(t0)*r); c.closePath(); }
function wedge(c,x,y,a,arc,r,al){ c.fillStyle='rgba(255,60,80,'+al+')'; c.beginPath(); c.moveTo(x,y); c.arc(x,y,r,a-arc,a+arc); c.closePath(); c.fill(); }
/* art rooms: wooden doors over the dark openings; an open exit shows a slow gold glint so it reads as the way on */
function drawArtDoors(c,w,R,t){ var A=ROOMART, ex=R.exits||{}, fl=A.floor;
  if(A.n){ var nOpen=w.open&&(ex.n||S.mode==='endcut'||S.mode==='cut'); if(!nOpen){ var dy0=22, dh=fl[1]-dy0, x0=DOORN[0], dw=DOORN[1]-DOORN[0]; c.fillStyle='#2A1A0E'; c.fillRect(x0+2,dy0,dw-4,dh); c.fillStyle='#7A5230'; c.fillRect(x0+5,dy0+3,dw-10,dh-3); c.fillStyle='#5E3D22'; for(var pk=x0+12;pk<x0+dw-6;pk+=10) c.fillRect(pk,dy0+3,2,dh-3); c.fillStyle='#3A3F55'; c.fillRect(x0+5,dy0+16,dw-10,4); c.fillRect(x0+5,dy0+46,dw-10,4); if(ex.n) padlock(c,W/2,dy0+31); }
    }
  var inSide=S.mode==='trans'&&!w.next?(w.from==='w'?'e':w.from==='e'?'w':'s'):'';
  [['w',16],['e',W-50]].forEach(function(sd){ var st=A[sd[0]]; if(!st) return; var x0=sd[1], y0=DOORS[0]+6, hh=DOORS[1]-DOORS[0]-10, open=(w.open&&st===2)||inSide===sd[0];
    if(!open){ c.fillStyle='#2A1A0E'; c.fillRect(x0,y0,34,hh); c.fillStyle='#7A5230'; c.fillRect(x0+3,y0+3,28,hh-6); c.fillStyle='#5E3D22'; for(var pq=y0+11;pq<y0+hh-6;pq+=10) c.fillRect(x0+3,pq,28,2); c.fillStyle='#3A3F55'; c.fillRect(x0+9,y0+3,4,hh-6); c.fillRect(x0+22,y0+3,4,hh-6); if(st===2) padlock(c,x0+17,y0+hh/2); }
    else if(!(w.open&&st===2)){ c.fillStyle='#04050B'; c.fillRect(x0,y0,34,hh); } });
  if(w.open&&S.mode==='play') drawExitArrows(c,ex,t);
  if(A.south&&inSide!=='s'&&!(CUT&&(!CUT.gate||CUT.t<5.72))){ var gx0=448, gy0=H-50; c.fillStyle='#14121C'; c.fillRect(gx0,gy0,64,50); c.fillStyle='#5A5E7E'; for(var b=0;b<6;b++) c.fillRect(gx0+4+b*11,gy0,4,50); c.fillRect(gx0,gy0+42,64,4); c.fillRect(gx0,gy0+20,64,3); } }
/* a locked exit shows a small iron padlock (was a red square: Kody's playtest 2026-11-15). Doors that are not exits show none. */
function padlock(c,x,y){ x=Math.round(x); y=Math.round(y);
  c.fillStyle='#141026'; c.fillRect(x-5,y-12,10,3); c.fillRect(x-5,y-12,3,9); c.fillRect(x+2,y-12,3,9); c.fillRect(x-8,y-4,16,13);
  c.fillStyle='#8A90B0'; c.fillRect(x-4,y-11,8,1); c.fillRect(x-4,y-11,1,7); c.fillRect(x+3,y-11,1,7);
  c.fillStyle='#8A90B0'; c.fillRect(x-7,y-3,14,11); c.fillStyle='#B4BAD6'; c.fillRect(x-7,y-3,14,2); c.fillStyle='#5E6488'; c.fillRect(x-7,y+6,14,2);
  c.fillStyle='#141026'; c.fillRect(x-1,y,2,2); c.fillRect(x-1,y+2,2,3); }
/* Whirlwind (Kody's playtest 2026-11-15: "looks off"): the old spin drew a moon-shaped crescent that ran ahead of Rook's body,
   centred low and fading in late. Now an even ring of steel trails the blade around Rook, its leading edge on the same angle the
   body faces (heroPose), with a tail that fades behind it. It stays outside his body so it never covers him. */
function spinTrail(c,p,dur,rng){ var el=Math.max(0,dur-p.sw), k=Math.min(1,el/dur), lead=p.swA+k*6.283, len=Math.min(4.4,0.6+k*7), cx0=p.x, cy0=p.y-18,
    ro=rng+8, ri=Math.max(44,rng*0.66), fade=k>0.72?Math.max(0,1-(k-0.72)/0.28):1, col=p.crit?'#FFEC96':HAS('bladestorm')?'#BFF6FF':'#E8F6FF', N=8;
  for(var i=0;i<N;i++){ var a1=lead-len*i/N, a0=lead-len*(i+1)/N; c.globalAlpha=fade*0.85*(1-i/N);
    c.beginPath(); c.arc(cx0,cy0,ro,a0,a1); c.arc(cx0,cy0,ri,a1,a0,true); c.closePath(); c.fillStyle=col; c.fill(); }
  c.globalAlpha=fade; c.beginPath(); c.arc(cx0,cy0,ro,lead-len,lead); c.strokeStyle=p.crit?'#FFAA3C':'#7DF5FF'; c.lineWidth=2; c.stroke();
  c.beginPath(); c.moveTo(cx0+Math.cos(lead)*ri,cy0+Math.sin(lead)*ri); c.lineTo(cx0+Math.cos(lead)*ro,cy0+Math.sin(lead)*ro); c.strokeStyle='#FFFFFF'; c.lineWidth=3; c.stroke(); c.globalAlpha=1; }
/* bobbing gold arrows point out of every open exit */
function drawExitArrows(c,ex,t){ var b=RM?0:Math.abs(Math.sin(t*3.2))*7, my=(DOORS[0]+DOORS[1])/2;
  if(ex.n) exitArrow(c,W/2,FLR[1]+38-b,0,-1); if(ex.w) exitArrow(c,FLR[0]+38-b,my,-1,0); if(ex.e) exitArrow(c,FLR[2]-38+b,my,1,0); }
function exitArrow(c,x,y,dx,dy){ var px=-dy, py=dx;   /* (px,py) runs across the arrow */
  function pt(a,s){ return [Math.round(x+dx*a+px*s),Math.round(y+dy*a+py*s)]; }
  var P=[pt(16,0),pt(-2,-18),pt(-2,-8),pt(-16,-8),pt(-16,8),pt(-2,8),pt(-2,18)];
  c.beginPath(); c.moveTo(P[0][0],P[0][1]); for(var i=1;i<P.length;i++) c.lineTo(P[i][0],P[i][1]); c.closePath();
  c.lineJoin='miter'; c.lineWidth=6; c.strokeStyle='#141026'; c.stroke(); c.fillStyle='#FFC93C'; c.fill();
  c.beginPath(); var Q=[pt(12,0),pt(0,-12),pt(0,-5)]; c.moveTo(Q[0][0],Q[0][1]); c.lineTo(Q[1][0],Q[1][1]); c.lineTo(Q[2][0],Q[2][1]); c.closePath(); c.fillStyle='#FFF1B8'; c.fill(); }
function drawDoor(c,side,open,t,locked){ var x0,y0,w0,h0; if(side==='n'){ x0=15*TS; y0=0; w0=2*TS; h0=TS; } else if(side==='w'){ x0=0; y0=8*TS; w0=TS; h0=2*TS; } else { x0=W-TS; y0=8*TS; w0=TS; h0=2*TS; }
  if(open){ c.fillStyle='#04050B'; c.fillRect(x0,y0,w0,h0); c.fillStyle='rgba(255,201,60,'+(0.25+0.15*Math.sin(t*4))+')'; c.fillRect(x0+(side==='e'?0:side==='w'?w0-4:0),y0+(side==='n'?h0-4:0),side==='n'?w0:4,side==='n'?4:h0); return; }
  c.fillStyle='#2A1A0E'; c.fillRect(x0,y0,w0,h0); c.fillStyle='#7A5230'; c.fillRect(x0+3,y0+3,w0-6,h0-6); c.fillStyle='#3A3F55';
  if(side==='n'){ c.fillRect(x0+3,y0+8,w0-6,3); c.fillRect(x0+3,y0+19,w0-6,3); } else { c.fillRect(x0+8,y0+3,3,h0-6); c.fillRect(x0+19,y0+3,3,h0-6); }
  if(locked) padlock(c,x0+w0/2,y0+h0/2); }
function draw(){ var c=cx, w=S&&S.w; c.setTransform(1,0,0,1,0,0);
  if(!w||!ROOMC){ c.fillStyle='#07080F'; c.fillRect(0,0,W,H); return; }
  var t=performance.now()/1000, sk=w.shake&&!RM?w.shake*16:0; if(CUT&&CUT.shake) sk=CUT.shake*16; var cam=S.mode==='cut'?cutCam():S.mode==='endcut'?endCam():null;
  if(cam) c.setTransform(cam.z,0,0,cam.z,W/2-cam.x*cam.z+(sk?rnd(-sk,sk):0),H/2-cam.y*cam.z+(sk?rnd(-sk,sk):0)); else if(sk) c.setTransform(1,0,0,1,Math.round(rnd(-sk,sk)),Math.round(rnd(-sk,sk)));
  c.drawImage(ROOMC,0,0); var R=ROOMS[w.rid], i, p=w.p; if(ROOMART&&window.KANIM&&KANIM[ROOMART.key]&&KANIM[ROOMART.key].im.complete){ var ka=KANIM[ROOMART.key], kf=(typeof RM!=="undefined"&&RM)?0:Math.floor(performance.now()/ka.ms)%ka.n; c.imageSmoothingEnabled=false; c.drawImage(ka.im,kf*ka.fw,0,ka.fw,ka.fh,ka.x*2,ka.y*2,ka.fw*2,ka.fh*2); }
  /* doors */
  if(ROOMART) drawArtDoors(c,w,R,t);
  else { Object.keys(R.exits).forEach(function(sd){ drawDoor(c,sd,w.open,t,!w.open); });
    var back=w.from==='w'?'e':w.from==='e'?'w':'s'; if(back==='s'){ var bx=15*TS, by=(ROWS-1)*TS; c.fillStyle='#2A1A0E'; c.fillRect(bx,by,2*TS,TS); c.fillStyle='#5E3D22'; c.fillRect(bx+3,by+3,2*TS-6,TS-6); } else drawDoor(c,back,false,t,false); }
  if(ROOMART){ if(!RM) for(var qi=0;qi<ROOMART.torches.length;qi++){ var q=ROOMART.torches[qi], ph=Math.floor(t*9+qi*1.7)%3; c.fillStyle='#FFE9A8'; c.fillRect(q[0]-2+(ph===1?2:0),q[1]-8-(ph===2?2:0),2,2); if(ph===0){ c.fillStyle='#FFB23C'; c.fillRect(q[0],q[1]-12,2,2); } } }
  else for(var wt=0;wt<4;wt++){ var WX=wt<2?15:W-15, WY=(wt%2?13:4)*TS+12, fl2=RM?0:Math.sin(t*9+wt*2)*1.5; c.drawImage(GLOW,WX-45,WY-45,90,90);
    c.fillStyle='#3A3F55'; c.fillRect(WX-3,WY+4,6,8); c.fillStyle='#FF8A3D'; c.fillRect(WX-4,WY-5+fl2,8,9); c.fillStyle='#FFD34D'; c.fillRect(WX-2,WY-2+fl2,4,5); }
  /* shop */
  if(w.shop){ c.textAlign='center'; var pix=rrReady('shopi'); w.shop.forEach(function(it){
    /* Nov 14 art: the stone pedestal is its own sprite (col 5); the item stands on its top (cols 0-4). Same spot and pickup radius as before. */
    if(pix){ c.drawImage(RRI.shopi,160,0,32,32,Math.round(it.x-16),Math.round(it.y-11),32,32); if(!it.sold){ if(it.id==='rev') c.drawImage(SPR.revShop,Math.round(it.x-16),Math.round(it.y-37)); else c.drawImage(RRI.shopi,SHOPSP[it.id]*32,0,32,32,Math.round(it.x-16),Math.round(it.y-37),32,32); } }
    else { c.fillStyle='#262A44'; c.fillRect(it.x-26,it.y-8,52,24); c.fillStyle='#565C80'; c.fillRect(it.x-24,it.y-6,48,20); }
    if(!it.sold){ if(!pix){ c.font='28px sans-serif'; c.fillStyle='#FFFFFF'; c.fillText(it.ic,it.x,it.y-14); } dtx(c,it.cost+' coins',it.x,it.y+42,14,w.coins>=it.cost?'#FFC93C':'#C0788A',0,'#141026'); dtx(c,it.n,it.x,it.y+60,14,'#E8ECFF',0,'#141026'); } else dtx(c,'Sold',it.x,it.y+42,14,'#8A92BE',0,'#141026'); });
    if(w.shopNear){ var nm=w.shopNear, can=w.coins>=nm.cost, ns=nm.hold?'Bought! Step off and back on to buy another ('+nm.cost+' coins)':can?'Press E to buy '+nm.n+' for '+nm.cost+' coins · '+nm.d:nm.n+' costs '+nm.cost+' · you have '+w.coins+' (need '+(nm.cost-w.coins)+' more)', nc=can?'#FFE08A':'#FFB0BE', nw=tspr(ns,16,nc).width+30; c.fillStyle='rgba(18,8,28,.9)'; c.fillRect(Math.round(W/2-nw/2),H-96,nw,40); dtx(c,ns,W/2,H-70,16,nc); } }
  /* chests */
  [w.chest,w.secretChest].forEach(function(ch){ if(!ch) return; if(ch===w.secretChest&&!w.secretOpen){ return; } if(!ch.open){ c.globalAlpha=0.25+0.15*Math.sin(t*3); c.fillStyle=ch.type==='gold'?'#FFE08A':'#FFC93C'; c.beginPath(); c.arc(ch.x,ch.y+2,26,0,7); c.fill(); c.globalAlpha=1; } spr(ch.open?'chestO':'chest',ch.x,ch.y,false,ch.type==='gold'?3:2); });
  /* pickups */
  for(i=0;i<w.gems.length;i++){ var g2=w.gems[i]; c.drawImage(g2.v>=3?SPR.gemB2:SPR.gem2,Math.round(g2.x-6),Math.round(g2.y-8)); }
  if(w.pots) w.pots.forEach(function(pt){ if(pt.st===2) drawPot(c,pt); });
  for(i=0;i<w.coinsF.length;i++){ var cn=w.coinsF[i]; c.drawImage(SPR.coin2,Math.round(cn.x-6),Math.round(cn.y-6+Math.sin(t*6+i)*2)); }
  for(i=0;i<w.hearts.length;i++){ var h0=w.hearts[i]; var ha0=c.globalAlpha; if(h0.t>11) c.globalAlpha=ha0*Math.max(0.25,1-(h0.t-11)); c.drawImage(SPR.heart2,Math.round(h0.x-9),Math.round(h0.y-8+Math.sin(t*4)*2)); c.globalAlpha=ha0; }
  /* spawn warnings */
  var sf=FX.spawn[RM?0:Math.floor(t*10)&3]; for(i=0;i<w.spawns.length;i++){ var s0=w.spawns[i]; if(s0.type==='boss') c.drawImage(sf,Math.round(s0.x-48),Math.round(s0.y-48),96,96); else c.drawImage(sf,Math.round(s0.x-24),Math.round(s0.y-24)); }
  /* damage numbers and point floats sit UNDER the floor warnings and bodies (readability pass): a number never hides a telegraph */
  for(i=0;i<w.fx.length;i++){ var fn=w.fx[i]; if(fn.k==='num'){ c.globalAlpha=Math.max(0,0.9*(1-fn.t/0.8)); dtx(c,fn.v,fn.x,fn.y-fn.t*34,fn.c==='#FFC93C'?20:14,fn.c||'#FFFFFF',0,'#141026'); c.globalAlpha=1; }
    else if(fn.k==='txt'&&fn.lo){ c.globalAlpha=Math.max(0,Math.min(1,2.4*(1-fn.t/0.8))); dtx(c,fn.v,fn.x,fn.y-fn.t*30,16,fn.c,0,'#141026'); c.globalAlpha=1; } }
  /* floor warnings (drawn under everyone) */
  w.en.forEach(function(e){ if(e.dead) return;
    if(e.type==='skel'&&e.st===1){ wedge(c,e.x,e.y-4,e.fa,1.2,100,0.12+0.3*(1-e.cd/(e.c0||0.7))); }
    if(e.type==='gob'&&e.st===1){ c.fillStyle='rgba(255,60,80,.6)'; dotLine(c,e.x,e.y,e.sx,e.sy,GOBL,12,4); }
    if(e.type==='bat'&&e.st===1){ c.fillStyle='rgba(255,60,80,.5)'; dotLine(c,e.x,e.y,e.sx,e.sy,140,12,3); }
    if(e.type==='lance'&&e.st===1){ var kL=1-e.cd/(e.c0||0.8); c.save(); c.translate(e.x,e.y); c.rotate(e.fa); c.fillStyle='rgba(255,60,80,'+(0.12+0.3*kL)+')'; c.fillRect(0,-e.r,e.lane||LANCEL,e.r*2); c.restore(); }
    if(e.type==='imp'&&e.st===1){ var kI=1-e.cd/(e.c0||0.65); c.strokeStyle='rgba(255,138,42,'+(0.45+0.5*kI)+')'; c.lineWidth=2; c.beginPath(); c.ellipse(e.tx,e.ty,FIRE.r,FIRE.r*0.62,0,0,7); c.stroke(); c.fillStyle='rgba(255,138,42,'+(0.1*kI)+')'; c.fill(); }
    if(e.type==='wiz'&&e.st===1){ c.fillStyle='rgba(181,107,255,'+(0.4+0.5*(1-e.cd/0.85))+')'; for(var wo=-1;wo<=1;wo++) dotLine(c,e.x,e.y-8,Math.cos(e.aim+wo*0.28),Math.sin(e.aim+wo*0.28),170,11,3); }
    if(e.type==='boss'){ var k=e.st===1?1-e.cd/0.85:e.st===3?1-e.cd/0.8:e.st===4?1-e.cd/0.6:0;
      if(e.st===1){ var L3=900; c.save(); c.translate(e.x,e.y); c.rotate(e.fa); c.fillStyle='rgba(255,60,80,'+(0.12+0.3*k)+')'; c.fillRect(0,-e.r,L3,e.r*2); c.restore(); }
      if(e.st===3){ c.fillStyle='rgba(255,60,80,'+(0.1+0.3*k)+')'; c.beginPath(); c.arc(e.x,e.y,120*Math.min(1,0.4+k),0,7); c.fill(); c.strokeStyle='rgba(255,60,80,.8)'; c.lineWidth=2; c.beginPath(); c.arc(e.x,e.y,120,0,7); c.stroke(); }
      if(e.st===4) wedge(c,e.x,e.y-6,e.fa,1.25,130,0.12+0.3*k);
      if(e.st===6){ c.strokeStyle='rgba(181,107,255,.6)'; c.lineWidth=3; c.beginPath(); c.arc(e.x,e.y-20,30+20*Math.sin(t*20),0,7); c.stroke(); } } });
  (w.rings||[]).forEach(function(r){ c.strokeStyle='rgba(255,90,90,.9)'; c.lineWidth=6; if(!r.g){ c.beginPath(); c.arc(r.x,r.y,r.r,0,6.2832); c.stroke(); return; }
    var g0=r.g[0], g1=r.g[1]; c.beginPath(); c.arc(r.x,r.y,r.r,g0+RGAP,g1-RGAP); c.stroke(); c.beginPath(); c.arc(r.x,r.y,r.r,g1+RGAP,g0+6.2832-RGAP); c.stroke(); });
  /* orbit blades under bodies */
  var lw2=L('ward'); for(var gj=0;gj<lw2;gj++){ var gaa=(w.wa||0)+gj*2*Math.PI/lw2, gxx=p.x+Math.cos(gaa)*38, gyy=p.y-6+Math.sin(gaa)*38; c.fillStyle='#0E2A33'; c.beginPath(); c.moveTo(gxx,gyy-9); c.lineTo(gxx+7,gyy); c.lineTo(gxx,gyy+9); c.lineTo(gxx-7,gyy); c.fill(); c.fillStyle='#3CEBFF'; c.beginPath(); c.moveTo(gxx,gyy-7); c.lineTo(gxx+5,gyy); c.lineTo(gxx,gyy+7); c.lineTo(gxx-5,gyy); c.fill(); c.fillStyle='#C8FAFF'; c.fillRect(gxx-1,gyy-4,2,3); }
  var lo=L('orbit'); if(lo){ var n=[0,2,3,4][lo]+(HAS('tempest')?1:0); for(var kb=0;kb<n;kb++){ var a=w.oa+kb*2*Math.PI/n, bx2=p.x+Math.cos(a)*58, by2=p.y-6+Math.sin(a)*58;
    c.save(); c.translate(bx2,by2); c.rotate(a+1.57); c.fillStyle='#141026'; c.fillRect(-4,-11,8,22); c.fillStyle=HAS('tempest')?'#BFF6FF':'#CFE0FF'; c.fillRect(-3,-10,6,20); c.fillStyle='#FFFFFF'; c.fillRect(-1,-10,2,20); c.restore(); } }
  if(S.mode==='cut') drawCutWorld(c,t); if(w.rub&&w.rub.length) drawRubble(c);
  /* slime landing markers and goo splats sit on the floor, under every body */
  for(i=0;i<w.en.length;i++){ var se=w.en[i]; if(se.type==='slime'&&!se.dead&&se.mk&&!(se.stun>0)&&(se.wu||se.st===1)) slimeMark(c,se); }
  for(i=0;i<w.fx.length;i++) if(w.fx[i].k==='splat'&&!LITE) drawSplat(c,w.fx[i]);
  if(w.fires) for(i=0;i<w.fires.length;i++) drawFire(c,w.fires[i],t);
  /* bodies, top to bottom */
  var openSk=null, od=170; w.en.forEach(function(e){ if(!e.dead&&e.type==='skel'&&e.st===3){ var dd=Math.hypot(e.x-p.x,e.y-p.y); if(dd<od){ od=dd; openSk=e; } } });   /* Kody 2026-11-17: only the nearest open knight gets the label, so crowds stay readable */
  var list=w.en.filter(function(e){ return !e.dead; }); list.push({hero:1,y:p.y}); if(w.shop&&rrReady('merchant')) list.push({merch:1,y:MERCH[1]-14}); if(w.pots) w.pots.forEach(function(pt){ if(pt.st<2) list.push({pot:pt,y:pt.y}); }); list.sort(function(a,b){ return a.y-b.y; });
  list.forEach(function(e){ if(e.hero){ drawHero(c,p,t); drawBurn(c,p,t); return; } if(e.merch){ drawMerchant(c,w); return; } if(e.pot){ drawPot(c,e.pot); return; }
    var T2=ET[e.type], nm=T2.spr; if(e.type==='bat') nm=Math.floor(e.t*10)%2?'batU':'batD';
    var im=SPR[nm], sc=e.small?1:2, jx=(e.st===1&&(e.type==='gob'||e.type==='skel'))?rnd(-1.5,1.5):0;
    var bob=e.type==='slime'?(e.st===1?-Math.abs(Math.sin((e.t%1)*Math.PI/0.6))*10:0):T2.fly?Math.sin(e.t*5)*3:-Math.abs(Math.sin(e.t*7))*1.5;
    var foot=T2.fly?e.y+im.height-4:e.y+e.r+2;
    if(!RRE[e.type]||e.small){ c.fillStyle='rgba(0,0,0,.32)'; c.fillRect(Math.round(e.x-e.r*0.8),Math.round(e.y+e.r-1+(T2.fly?8:0)),Math.round(e.r*1.6),3); }
    if(e.el&&e.type==='boss') c.drawImage(FX.elite,Math.round(e.x-22),Math.round(e.y+e.r-9+(T2.fly?8:0)));
    if(e.type==='wiz'&&e.st===1) c.drawImage(FX.wizGlow,Math.round(e.x-24),Math.round(e.y-44));
    var flip=e.type==='skel'?Math.cos(e.fa)<0:(p.x<e.x&&e.type!=='boss'&&e.type!=='slime');
    /* Kody 2026-11-21: elites must read at a glance: a steady gold outline (no pulse), 15% bigger, and a big crown.
       The outline = the same frame drawn 4 times in solid gold, 2 px out each way (pre-made gold sheets, see rrDraw) */
    var elG=e.el&&e.type!=='boss', top, hh;
    if(elG){ c.save(); c.translate(e.x,foot); c.scale(ELSC,ELSC); c.translate(-e.x,-foot); var sj=e.t, sf=e.fl;
      if(RRE[e.type]||e.type==='bat'||e.type==='slime'){ e.fl=0; for(var gq=0;gq<4;gq++){ RR_GOLD=[[2,0],[-2,0],[0,2],[0,-2]][gq]; e.t=sj; try{ drawEnemyRR(c,e,p,t); } finally{ RR_GOLD=null; } } e.t=sj; e.fl=sf; } }
    top=drawEnemyRR(c,e,p,t); hh=top==null?im.height*sc:foot-top; if(top==null) sprF(e.fl>0&&!RM?nm+'W':nm,e.x+jx,foot+bob,flip&&e.type!=='bat',sc);
    if(elG){ c.restore(); hh*=ELSC; }
    if(e.el&&!(e.st===1&&e.type!=='slime')){ c.imageSmoothingEnabled=false; c.drawImage(RRI.crown||FX.crown,Math.round(e.x-14),Math.round(foot-hh-24),28,20); }
    if(e===openSk) dtx(c,'Open: strike!',e.x,foot-hh-6,13,'#FFE08A',0,'#141026');
    if((e.st===1&&e.type!=='slime'&&e.type!=='boss')) dtx(c,'!',e.x,foot-hh-4,22,'#FF5A6E',0,'#1A0A12');
    if(e.stun>0){ for(var sz=0;sz<2;sz++){ var ab=t*5+sz*3.1; dtx(c,'★',e.x+Math.cos(ab)*12,foot-hh-2+Math.sin(ab)*4,12,'#FFC93C'); } }
    if(e.type==='lance'&&e.st===9){ for(var sl=0;sl<2;sl++){ var al2=t*5+sl*3.1; dtx(c,'★',e.x+Math.cos(al2)*14,foot-hh-2+Math.sin(al2)*4,13,'#FFC93C'); } }
    if(e.type==='boss'&&e.st===9){ for(var st=0;st<3;st++){ var aa=t*4+st*2.1; dtx(c,'★',e.x+Math.cos(aa)*26,foot-hh-4+Math.sin(aa)*6,16,'#FFC93C'); } } });
  /* orbs */
  for(i=0;i<w.orbs.length;i++){ var o0=w.orbs[i]; c.drawImage(o0.fr?FX.orbR:FX.orb,Math.round(o0.x-12),Math.round(o0.y-12)); }
  /* sword: a clean crescent that sweeps the real hit area (the art pack's ragged swoosh was removed from the frames) */
  if(p.sw>0&&(p.struck||!rrReady('rook_slash'))){ var s=stat(), dur=p.spin?0.26:0.2, k2=Math.max(0,Math.min(1,((1-p.sw/dur)-RR_WIND/dur)/(1-RR_WIND/dur))), rng=p.spin?s.range+12+8*L('whirl'):s.range, hy0=p.y-6, t0, t1;
    if(p.spin){ spinTrail(c,p,dur,rng); }
    else { /* sweep the way the drawn blade travels: right-facing top to bottom, otherwise the other way (hit area unchanged) */
      var sg=(p.rrRow===2&&!p.rrFl)?1:-1, a0=p.swA-sg*s.arc/2, hd=a0+sg*s.arc*Math.min(1,k2*2.2), tl=a0+sg*s.arc*clamp((k2-0.3)*1.45,0,1); t0=Math.min(hd,tl); t1=Math.max(hd,tl); }
    if(!p.spin&&t1-t0>0.08){ c.globalAlpha=k2<0.55?0.95:Math.max(0,0.95*(1-(k2-0.55)/0.45)); crescent(c,p.x,hy0,t0,t1,rng,rng*0.27);
      c.fillStyle=p.crit?'#FFEC96':p.spin&&HAS('bladestorm')?'#BFF6FF':'#E8F6FF'; c.fill(); c.strokeStyle=p.crit?'#FFAA3C':'#7DF5FF'; c.lineWidth=2; c.stroke(); c.globalAlpha=1; }
    if(!rrReady('rook_slash')){ var sl=Math.max(40,rng-14); c.save(); c.translate(Math.round(p.x),Math.round(hy0)); c.rotate(t1+Math.PI/2); c.drawImage(SPR.sword,-7,-(14+sl),14,sl); c.restore(); } }
  /* shots */
  var wk=L('wave')>=3?'g':'c';
  for(i=0;i<w.shots.length;i++){ var s2=w.shots[i];
    if(s2.k==='wave') c.drawImage(FX.wave[s2.child?'s':wk][Math.round(s2.a/0.3927)&15],Math.round(s2.x-24),Math.round(s2.y-24));
    else if(s2.ward) c.drawImage(FX.orbR,Math.round(s2.x-12),Math.round(s2.y-12));
    else if(s2.small) c.drawImage(FX.shard,Math.round(s2.x-5),Math.round(s2.y-5));
    else c.drawImage(FX.rico,Math.round(s2.x-8),Math.round(s2.y-8)); }
  /* effects */
  var nbolt=0;
  for(i=0;i<w.fx.length;i++){ var f=w.fx[i], fk=f.k;
    if(fk==='bit'){ if(!LITE){ c.fillStyle=f.c; c.fillRect(Math.round(f.x),Math.round(f.y),4,4); } }
    else if(fk==='goo'){ c.fillStyle='#0B0108'; c.fillRect(Math.round(f.x)-1,Math.round(f.y)-1,6,6); c.fillStyle=f.c; c.fillRect(Math.round(f.x),Math.round(f.y),4,4); }
    else if(fk==='splat'){}
    else if(fk==='num'||f.lo){}
    else if(fk==='txt'){ c.globalAlpha=Math.max(0,Math.min(1,2.4*(1-f.t/0.8))); dtx(c,f.v,f.x,f.y-f.t*30,f.big?26:18,f.c,0,'#141026'); c.globalAlpha=1; }
    else if(fk==='spark'){ c.globalAlpha=Math.max(0,1-f.t/0.14); c.drawImage(FX.star,Math.round(f.x-12),Math.round(f.y-12)); c.globalAlpha=1; }
    else if(fk==='die'){ c.globalAlpha=Math.max(0,0.85*(1-f.t/0.16)); rrDraw(c,f.n,f.row,f.col,f.x,f.y,f.fl,true); c.globalAlpha=1; }
    else if(fk==='pop'){ var pf=Math.min(3,Math.floor(f.t/0.045)); c.drawImage(FX.pop[pf],Math.round(f.x-20),Math.round(f.y-20)); }
    else if(fk==='slash'){ var al=1-f.t/0.8, rr=f.big?130:100; c.strokeStyle='rgba(255,120,120,'+al+')'; c.lineWidth=f.big?10:6; c.beginPath(); c.arc(f.x,f.y,rr*0.75,f.a-1.1,f.a+1.1); c.stroke(); }
    else if(fk==='zap'||fk==='arc') nbolt++;
    else if(fk==='boom'){ var bk=Math.min(0.999,f.t/0.3);
      if(f.r<=92){ var bs=boomSpr(f.r); c.drawImage(bs[Math.floor(bk*5)],Math.round(f.x-bs.h),Math.round(f.y-6-bs.h)); }
      else { c.fillStyle='rgba(255,170,60,'+(0.45*(1-bk))+')'; c.beginPath(); c.arc(f.x,f.y-6,f.r*(0.5+0.5*bk),0,7); c.fill(); c.strokeStyle='rgba(255,230,160,'+(1-bk)+')'; c.lineWidth=3; c.stroke(); } }
    else if(fk==='puff'){ var pr=12+f.t*40; c.globalAlpha=Math.max(0,0.5*(1-f.t/0.4)); c.drawImage(FX.puff,Math.round(f.x-pr),Math.round(f.y-12-pr),Math.round(pr*2),Math.round(pr*2)); c.globalAlpha=1; }
    else if(fk==='wout'){ if(f.t<0.3){ c.globalAlpha=1-f.t/0.3; rrDraw(c,f.row===2?'wizb':'wiz',f.row===2?0:f.row,2,f.x,f.y,f.row===1&&f.fl); c.globalAlpha=1; } }
    else if(fk==='lob'){ if(f.t<0.45){ var lk=f.t/0.45, lx=f.x+(f.x2-f.x)*lk, ly=f.y+(f.y2-f.y)*lk-Math.sin(lk*Math.PI)*70; c.fillStyle='#3A0E06'; c.fillRect(Math.round(lx)-5,Math.round(ly)-5,10,10); c.fillStyle='#FF8A2A'; c.fillRect(Math.round(lx)-4,Math.round(ly)-4,8,8); c.fillStyle='#FFE08A'; c.fillRect(Math.round(lx)-2,Math.round(ly)-2,4,4); } }
    else if(fk==='ring'){ c.strokeStyle='rgba(77,224,192,'+(1-f.t/0.35)+')'; c.lineWidth=4; c.beginPath(); c.arc(f.x,f.y,30+f.t*360,0,7); c.stroke(); } }
  if(nbolt){ c.lineJoin='bevel'; for(var bp=0;bp<2;bp++){ var any=0; c.beginPath(); for(i=0;i<w.fx.length;i++){ var fb=w.fx[i]; if((fb.k!=='zap'&&fb.k!=='arc')||(fb.t<0.1)!==(bp===0)) continue; any=1; var jz=RM?0:7;
        if(fb.k==='zap'){ c.moveTo(fb.x+rnd(-jz,jz),fb.y-110); for(var z=1;z<5;z++) c.lineTo(fb.x+rnd(-jz,jz),fb.y-110+z*22); c.lineTo(fb.x,fb.y); }
        else { c.moveTo(fb.x,fb.y); c.lineTo((fb.x+fb.x2)/2+rnd(-jz,jz),(fb.y+fb.y2)/2+rnd(-jz,jz)); c.lineTo(fb.x2,fb.y2); } }
      if(any){ c.strokeStyle=bp?'rgba(170,215,255,.6)':'rgba(225,245,255,.95)'; c.lineWidth=bp?2:3; c.stroke(); } } }
  if(heroHidden(w,p)) heroOutline(c,p);   /* after bodies and effects: Rook is never lost in a crowd or a blast */
  c.setTransform(1,0,0,1,0,0);
  for(i=0;i<w.fx.length;i++){ var fh=w.fx[i]; if(fh.k==='hurt'){ c.fillStyle='rgba(255,40,60,'+(0.5*(1-fh.t/0.3))+')'; c.fillRect(0,0,W,14); c.fillRect(0,H-14,W,14); c.fillRect(0,14,14,H-28); c.fillRect(W-14,14,14,H-28); break; } }
  var ha=hudAlpha(); if(ha>0){ c.globalAlpha=ha; drawHUD(t); c.globalAlpha=1; } if(S.mode==='cut') drawCutOverlay(c); if(S.mode==='endcut') drawEndOverlay(c);
  if(S.mode==='trans'){ var fa=trans>TH?Math.pow(Math.min(1,(TT-trans)/TH),1.5):Math.pow(Math.max(0,trans/TH),1.5); c.fillStyle='rgba(4,5,11,'+fa.toFixed(3)+')'; c.fillRect(0,0,W,H); } }
/* is anything drawn in front of Rook? (an enemy below him on screen, close enough to overlap, or a blast on him) */
function heroHidden(w,p){ if(!(S.mode==='play'||S.mode==='reentry')||!rrReady('rook_walk')) return false;
  for(var i=0;i<w.en.length;i++){ var e=w.en[i]; if(e.dead) continue; var dy=e.y-p.y, dx=Math.abs(e.x-p.x), hh=RRH[e.type]||30;
    if(dy>-2&&dy<hh+4&&dx<e.r+16) return true; }
  for(i=0;i<w.fx.length;i++){ var f=w.fx[i]; if(f.k==='boom'&&f.t<0.3&&Math.hypot(f.x-p.x,f.y-p.y)<f.r*0.7) return true; }
  return false; }
/* a thin light outline plus a see-through Rook, drawn on top only while he is covered */
function heroOutline(c,p){ var pose=heroPose(p), foot=p.y+p.r+3; c.globalAlpha=0.9;
  for(var d=0;d<4;d++) rrDraw(c,pose[0],pose[1],pose[2],p.x+[2,-2,0,0][d],foot+[0,0,2,-2][d],pose[3],true);
  c.globalAlpha=0.85; rrDraw(c,pose[0],pose[1],pose[2],p.x,foot,pose[3]); c.globalAlpha=1; }
function drawHero(c,p,t){ var w=S.w;
  if(S.mode==='trans'&&w.next){ var ha2=1-Math.min(1,(TT-trans)/0.32); if(ha2<=0) return; c.globalAlpha=ha2; drawHero2(c,p,t); c.globalAlpha=1; return; }
  drawHero2(c,p,t); }
/* no blinking (playtest handoff 2026-11-15): while Rook can't be hurt he stays fully drawn and a steady light ring at his feet shrinks as the safe time runs out */
function invRing(c,p){ if(!(p.inv>0&&p.roll<=0&&(p.invMax||0)>0.5&&(S.mode==='play'||S.mode==='reentry'))) return; var f=Math.max(0,Math.min(1,p.inv/p.invMax)), cy=p.y+p.r+1;
  c.strokeStyle='rgba(200,240,255,.85)'; c.lineWidth=3; c.beginPath(); c.ellipse(p.x,cy,20,8,0,-Math.PI/2,-Math.PI/2+f*2*Math.PI); c.stroke(); }
function drawHero2(c,p,t){
  invRing(c,p);
  if(rrReady('rook_walk')&&rrReady('rook_slash')&&rrReady('rook_spin')&&rrReady('rook_shield')&&rrReady('rook_dodge')&&rrReady('rook_idle')) return drawHeroRR(c,p,t);
  var face=Math.abs(p.fx)>Math.abs(p.fy)?'hs':(p.fy<0?'hu':'hd'), step=p.mv&&Math.floor(p.walk*9)%2;
  c.fillStyle='rgba(0,0,0,.32)'; c.fillRect(Math.round(p.x-11),Math.round(p.y+p.r-1),22,4);
  if(p.roll>0){ c.globalAlpha=0.35; sprF(face,p.x-p.rx*18,p.y+p.r+3-p.ry*18,face==='hs'&&p.rx<0); c.globalAlpha=1; }
  if(p.rip>0&&L('riposte')){ c.fillStyle='rgba(255,214,90,.32)'; c.beginPath(); c.arc(p.x,p.y-20,30,0,7); c.fill(); }
  sprF(face+(step?'2':''),p.x,p.y+p.r+3-(step?1:0)+(p.roll>0?3:0),face==='hs'&&p.fx<0);
  if(L('aegis')&&p.sh<=0){ c.strokeStyle='rgba(77,224,192,.55)'; c.lineWidth=2; c.beginPath(); c.arc(p.x,p.y-18,30,0,7); c.stroke(); }
  /* dodge meter */
  if(p.rollCd>0){ var s=stat(); c.strokeStyle='rgba(255,255,255,.55)'; c.lineWidth=3; c.beginPath(); c.arc(p.x,p.y+p.r+8,7,-1.57,-1.57+6.28*(1-p.rollCd/s.rollCd)); c.stroke(); } }
/* readability pass 2026-11-15: hearts + XP share one dark plate (top left); room line + map on another (top right).
   Empty hearts are hollow outlines; low health adds a LOW HEALTH label and a slow heartbeat (no flashing). */
var HEARTE=null, LOWHP=function(p){ return p.hp<=Math.max(1,Math.floor(p.max/3)); };
function heartEmpty(){ if(HEARTE) return HEARTE; var im=SPR.heart2; if(!im||!im.width) return SPR.heartE2;
  HEARTE=mk(im.width,im.height,function(x){ x.drawImage(im,0,0); var d=x.getImageData(0,0,im.width,im.height), a=d.data, W2=im.width, H2=im.height, o=new Uint8ClampedArray(a);
    for(var y=0;y<H2;y++) for(var q=0;q<W2;q++){ var k=(y*W2+q)*4; if(a[k+3]<128) continue;
      var edge=q<2||y<2||q>=W2-2||y>=H2-2; if(!edge) for(var dy=-2;dy<=2&&!edge;dy++) for(var dx=-2;dx<=2;dx++){ if(Math.abs(dx)+Math.abs(dy)>2) continue; if(a[((y+dy)*W2+q+dx)*4+3]<128){ edge=true; break; } }
      if(edge){ o[k]=0xD8; o[k+1]=0xCC; o[k+2]=0xE6; o[k+3]=255; } else { o[k]=0x2A; o[k+1]=0x18; o[k+2]=0x3C; o[k+3]=255; } }
    d.data.set(o); x.putImageData(d,0,0); }); return HEARTE; }
function plate(c,x,y,w2,h2,warn){ c.fillStyle='rgba(18,8,28,.9)'; c.fillRect(x,y,w2,h2); c.fillStyle=warn?'#C8324E':'#45346A'; c.fillRect(x,y,w2,2); c.fillRect(x,y+h2-2,w2,2); c.fillRect(x,y,2,h2); c.fillRect(x+w2-2,y,2,h2); }
function drawHUD(t){ var c=cx, w=S.w, p=w.p, i, R=ROOMS[w.rid], na=p.arm||0, low=LOWHP(p)&&S.mode!=='cut';
  if(SHOWFPS) dtx(c,Math.round(1000/PERF.ema)+' fps'+(LITE?' · lite':''),10,H-10,14,'#F4ECD8','left','#141026');
  if(w.shop) drawBubble(c,w);
  /* vitals plate */
  var rv=S.revExtra===1?1:0, hw=(p.max+na+rv)*22, pend=w.pend>0&&!(w.last>0), ptx=pend?(w.cleared?'⬆ '+w.pend+' upgrade'+(w.pend>1?'s':'')+' ready to choose':'⬆ '+w.pend+' upgrade'+(w.pend>1?'s':'')+' banked · '+(R.boss?'beat the Warden':R.siege?'survive':'clear this room')+' to claim'):'', pw=Math.max(hw+(low?118:0),262,pend?tspr(ptx,14,'#FFE08A').width+8:0)+16, ph=pend?78:56;
  plate(c,4,4,pw,ph,low);
  var beat=low&&!RM?1+0.12*Math.max(0,Math.sin(t*5.5)):1, HE=heartEmpty();
  for(i=0;i<p.max;i++){ var hx=12+i*22, hy=9; if(i<p.hp){ if(i===p.hp-1&&beat>1){ var hs=Math.round(18*beat); c.drawImage(SPR.heart2,hx+9-hs/2,hy+8-hs/2,hs,hs); } else c.drawImage(SPR.heart2,hx,hy); } else c.drawImage(HE,hx,hy); }
  if(p.burn>0&&p.hp>0){ var bh=12+(p.hp-1)*22, bf=Math.max(0,Math.min(1,1-(p.bseg||FIRE.tick)/FIRE.tick)); c.save(); c.beginPath(); c.rect(bh-2,7,24,Math.round(22*bf)); c.clip(); c.drawImage(HE,bh,9); c.restore(); c.fillStyle='#FF8A2A'; c.fillRect(bh,9+Math.round(18*bf),18,2); }   /* the heart that is burning drains from the top */
  for(i=0;i<na;i++){ var ax=14+(p.max+i)*22; c.fillStyle='#141026'; c.fillRect(ax-1,8,18,20); c.fillStyle='#7DC8FF'; c.fillRect(ax+1,10,14,10); c.fillRect(ax+3,20,10,4); c.fillRect(ax+6,24,4,2); c.fillStyle='#D8F0FF'; c.fillRect(ax+3,12,4,6); }
  if(rv) c.drawImage(SPR.rev2,12+(p.max+na)*22,9);   /* Second Wind in hand: a cyan heart after the hearts and armor */
  if(low) dtx(c,'Low health',16+hw+6,24,14,'#FF8FA3','left','#12081C');
  var bx=56, bw=pw-56-34, fw=Math.round((bw-4)*Math.min(1,w.xp/w.need));
  dtx(c,'Lv '+w.lv,12,49,15,'#FFC93C','left');
  c.fillStyle='#0B0614'; c.fillRect(bx-1,35,bw+2,16); c.fillStyle='#45346A'; c.fillRect(bx,36,bw,14); c.fillStyle='#150C25'; c.fillRect(bx+2,38,bw-4,10);
  /* gems fill it, so it is relic cyan (UI pass 2026-11-14) */ c.fillStyle='#38C8F0'; c.fillRect(bx+2,38,fw,10); c.fillStyle='#9AF2FF'; c.fillRect(bx+2,38,fw,2); c.fillStyle='#1784C4'; c.fillRect(bx+2,46,fw,2);
  dtx(c,'XP',bx+bw+6,48,13,'#9AF2FF','left');
  if(pend) dtx(c,ptx,12,72,14,'#FFE08A','left');
  /* the castle map (the room name is in the top bar now) */
  plate(c,W-46,4,42,94,false);
  for(var id in MAPPOS){ var m=MAPPOS[id], X=W-25+m[0]*12, Y=6+m[1]*9; c.fillStyle=id===w.rid?'#FFC93C':w.seen[id]?'#8E86B4':'rgba(142,134,180,.3)'; c.fillRect(X-5,Y-4,10,7); }
  if(w.shop){ var cst='Your coins: '+w.coins, csw=tspr(cst,15,'#FFE07A').width+40; plate(c,4,ph+8,csw,28,false); c.drawImage(SPR.coin2,12,ph+15); dtx(c,cst,32,ph+28,15,'#FFE07A','left'); }
  /* the Warden's health is in the top bar now (lsTop) */
  /* combo: top right, under the room plate (never over Rook). A new multiplier pops there too. */
  if(w.combo>=3){ var cm=cMult(), big=(w.comboPop>0?2:0)+(cm>=3?3:cm>=2?2:0), col=cm>=4?'#FF5A6E':cm>=3?'#FF8A3D':cm>=2?'#FFC93C':'#E8ECFF', cxr=W-54;
    var cs='Combo '+w.combo+(cm>1?'  ×'+cm:'');
    dtx(c,cs,cxr,26+big/2,18+big,col,'right','#0A0B16');
    c.fillStyle='#0A0B16'; c.fillRect(cxr-120,32+big/2,120,6); c.fillStyle=col; c.fillRect(cxr-119,33+big/2,Math.round(118*Math.max(0,w.comboT/COMBOT)),4);
    if(w.comboUp>0){ c.globalAlpha=Math.min(1,w.comboUp*2.5); dtx(c,'Multiplier ×'+cm+'!',cxr,60,18,col,'right','#0A0B16'); c.globalAlpha=1; } }
  /* the Siege and Last Stand timers are in the top bar now (lsTop) */
  var obj=''; if(S.mode==='play'&&w.cleared&&!w.pend){ if(w.chest&&!w.chest.open) obj='Walk into the chest to open it'; else if(Object.keys(R.exits).length) obj=Object.keys(R.exits).length>1?'Choose a door: west or east':'The door is open ↑'; }
  if(obj){ var os=tspr(obj,18,'#FFE08A'), tw=os.width+30; c.fillStyle='rgba(7,8,18,.75)'; c.fillRect(Math.round(W/2-tw/2),H-58,tw,28); dtx(c,obj,W/2,H-38,18,'#FFE08A'); }
  /* Kody 2026-11-16: teaching notes are a small plate along the top wall, not a full-width banner */
  /* Kody 2026-11-18: every on-screen notice (room names, Room Clear, starter relic, swarms, Wardens...) uses this same plate, size and spot as the Shield Knight tip */
  if(w.banner){ var tb=w.banner, ga2=c.globalAlpha, pw=Math.max(660,Math.min(W-40,Math.max(tspr(tb.txt,17,'#FFC23A').width,tb.sub?tspr(tb.sub,14,'#F4ECD8').width:0)+48)), ph=tb.sub?54:34, px=Math.round(W/2-pw/2), py=64; c.globalAlpha=ga2*Math.min(1,tb.t*2);
    c.fillStyle='#120A1F'; c.fillRect(px-2,py-2,pw+4,ph+4); c.fillStyle='#1E1233'; c.fillRect(px,py,pw,ph); c.fillStyle='#FFC23A'; c.fillRect(px,py,4,ph);
    dtx(c,tb.txt,W/2,py+17,17,'#FFC23A'); if(tb.sub) dtx(c,tb.sub,W/2,py+39,14,'#F4ECD8'); c.globalAlpha=ga2; }
  if(w.victory){ dtx(c,'VICTORY!',W/2,H/2,64,'#FFC93C',0,'#141026'); dtx(c,'The Warden is beaten. You win!',W/2,H/2+46,24,'#F4ECD8',0,'#141026'); }
  /* back from a knockout: what came back, then a short count-in before enemies move again */
  if(S.mode==='reentry'){ var rn=Math.max(1,Math.ceil(S.reT/(REENTRY/3))); c.fillStyle='rgba(18,10,31,.72)'; c.fillRect(0,H/2-78,W,140);
    dtx(c,'Back on your feet!',W/2,H/2-36,30,'#FFE07A',0,'#12081C'); dtx(c,p.hp+' hearts restored. Enemies were pushed back.',W/2,H/2-2,18,'#F4ECD8',0,'#12081C'); dtx(c,String(rn),W/2,H/2+44,36,'#F4ECD8',0,'#12081C'); } }
var REENTRY=1.8;
/* Last Stand readouts in the page top bar: written only when they change */
var LSV={};
function lsSet(id,k,v){ if(LSV[id+k]===v) return; LSV[id+k]=v; var el=$(id); if(!el) return; if(k==='hidden') el.hidden=v; else if(k==='text') el.textContent=v; else if(k==='w') el.style.width=v; else if(k==='cls') el.className=v; }
function lsTop(w){ var live=!!(w&&S.started&&!S.over&&S.mode!=='endcut'&&S.mode!=='cut'), R=live?ROOMS[w.rid]||{}:{}, ls=live&&w.last>0;
  /* the room: name and number, except in the Last Stand (that space goes to the timer and the Wardens) */
  var showRoom=live&&!ls&&!(R.boss&&w.boss&&!w.boss.dead); lsSet('dn-roomchip','hidden',!showRoom);   /* the Warden bar names the room in the boss fight */
  if(showRoom){ var n=0; for(var sk in w.seen) n++; lsSet('dn-roomn','text','Room '+Math.max(1,Math.min(9,n))+' of 9'); lsSet('dn-roomv','text',R.name||''); }
  /* the timer: Last Stand or the Siege Hall */
  var gl=null; if(ls) gl=['Last Stand',w.last,LAST]; else if(live&&R.siege&&!w.cleared&&w.siegeT>0) gl=['Hold the gate',w.siegeT,R.siege];
  lsSet('dn-goal','hidden',!gl);
  if(gl){ lsSet('dn-goaln','text',gl[0]); lsSet('dn-lsclock','text',clock(Math.ceil(gl[1]))); lsSet('dn-lsfill','w',Math.round(100*Math.max(0,gl[1]/gl[2]))+'%');
    var hot=gl[1]<=10; if(hot!==!!LSV.hot){ LSV.hot=hot; $('dn-goal').classList.toggle('hot',hot); } }
  /* the Warden's health: the boss fight, and every Warden in the Last Stand */
  var nW=0, bb=null; if(ls){ for(var i=0;i<w.en.length;i++){ var e=w.en[i]; if(!e.dead&&e.type==='boss'){ nW++; if(!bb||e.hp/e.max>bb.hp/bb.max) bb=e; } } }
  if(!bb&&live&&w.boss&&!w.boss.dead){ bb=w.boss; nW=1; }
  lsSet('dn-lsw','hidden',!bb);
  if(bb){ lsSet('dn-lswn','text',(nW>1?'Iron Wardens ×'+nW:'The Iron Warden')+(nW>1?'':bb.st===9?' · stunned':bb.raged?' · enraged':'')); lsSet('dn-lswfill','w',Math.round(100*Math.max(0,bb.hp/bb.max))+'%'); lsSet('dn-lsw','cls','dn-lsg dn-lsw'+(bb.st===9?' stun':'')); }
  lsSet('dn-ls','hidden',!(gl||bb)); }
var lastF=performance.now();
var lastF0=0;
/* slow-Chromebook guard (Kody's playtest 2026-11-15): if play runs under about 33 fps for 3 s, LITE mode turns on for the rest of
   the visit: no debris particles, and the Last Stand horde stops at 60 bodies instead of 90. Add ?fps (or #fps) to the link to see the frame rate. */
var LITE=0, PERF={ema:16.7,slowT:0}, SHOWFPS=/[?&#]fps\b/.test(location.search+location.hash);
function perfTick(ft){ if(!S||!S.started||S.over||S.mode!=='play'||document.hidden||ft>250) return; PERF.ema=PERF.ema*0.95+ft*0.05;
  if(PERF.ema>30) PERF.slowT+=ft/1000; else PERF.slowT=Math.max(0,PERF.slowT-ft/2000); if(!LITE&&PERF.slowT>3) LITE=1; }
function loop(){ var t=performance.now(), dt=Math.min(0.05,(t-lastF)/1000); perfTick(t-lastF); lastF=t; lsTop(S&&S.w);
  /* total session time (classroom length): everything but the pause screen and a hidden tab; real time, not slowed */
  if(S&&S.started&&!S.over&&!document.hidden&&S.mode!=='build') S.sess=(S.sess||0)+Math.min(0.25,(t-(lastF0||t))/1000); lastF0=t; if(S&&S.slow>0){ S.slow-=dt; dt*=0.4; }
  if(S.started&&!S.over){ if(S.mode==='cut') cutTick(dt); else if(S.mode==='endcut') endTick(dt); else if(S.mode==='trans') transTick(dt); else if(S.mode==='reentry'){ S.reT-=dt; if(S.reT<=0){ S.mode='play'; S.reT=0; } } else if(canPlay()){ if(S.hs>0) S.hs-=dt; else update(dt); } }
  draw(); requestAnimationFrame(loop); }

/* ================= GAME STATE ================= */
var S;
function fresh(){ return { name:'', started:false, over:false, win:false, score:0, answered:0, correct:0, streak:0, best:0, revUsed:0, revExtra:0, hs:0,
  topics:QS?QS.topicTable():{}, q:null, qDone:false, picked:-1, mode:'play', ask:null, cards:[], pickWhy:'', w:null }; }
function save(){ try{ localStorage.setItem(KEY,JSON.stringify(S,function(k,v){ return k==='hit'||k==='rollHit'||k==='fx'?[]:v; })); localStorage.setItem(KEY+'_mute',muted?'1':'0'); }catch(e){} }
function load(){ try{ var v=JSON.parse(localStorage.getItem(KEY)||'null'); muted=localStorage.getItem(KEY+'_mute')==='1'; if(v&&v.topics&&'mode' in v) return v; }catch(e){} return null; }
function canPlay(){ return !!(S.started&&!S.over&&S.mode==='play'); }

/* ================= HUD ================= */
var HUDV={}, HUDE={};
function hset(id,v){ if(HUDV[id]!==v){ HUDV[id]=v; (HUDE[id]||(HUDE[id]=$(id))).textContent=v; } }
var hudAt=0, hudSc=-1, hudStr='';
function hud(force){ var w=S.w, n=0, t=performance.now(); if(!force&&t-hudAt<160) return; hudAt=t; if(w) for(var k in w.seen) n++; if(S.score!==hudSc){ hudSc=S.score; hudStr=S.score.toLocaleString(); } hset('dn-score',hudStr); hset('dn-coins',w?w.coins:0); hset('dn-streak',S.streak); }
/* readability pass 2026-11-15: the sidebar is a compact relic inventory (big icon, level written out).
   B or a click opens the build details, which PAUSE the run (mode 'build'), so reading never costs a hit. */
function lvTxt(u){ return u.syn?'Synergy':L(u.id)>=3?'MAX':'Lv '+L(u.id); }
function renderBuild(){ var w=S.w, held=w?UP.concat(SYN).filter(function(u){ return L(u.id)>0; }):[], bl=$('dn-buildlist');
  if(!held.length){ bl.className=''; bl.innerHTML='<div class="dn-empty">The Keep deals your starter relic as you walk in. Mix two powers to unlock a synergy.</div>'; $('dn-buildmore').hidden=true; return; }
  held.sort(function(a,b){ return (a.syn?1:0)-(b.syn?1:0); });
  bl.className=held.length>9?'inv many':'inv';
  bl.innerHTML=held.map(function(u){ var rdy=!u.syn&&synFor(u.id).some(synReady);
    return '<div class="dn-bi'+(u.syn?' evo':L(u.id)>=3?' max':'')+(u.syn?'':' p-'+u.path)+'" title="'+u.n+'"><span class="ic">'+ICON(u)+(rdy?'<b class="rd">✦</b>':'')+'</span><span class="lvl">'+lvTxt(u)+'</span></div>'; }).join('');
  $('dn-buildmore').hidden=false; var bp=$('dn-build'); ['inv many','inv many g4'].forEach(function(k){ if(bp.scrollHeight>bp.clientHeight+2) bl.className=k; }); }
function buildDetails(){ var w=S.w, held=UP.concat(SYN).filter(function(u){ return L(u.id)>0; });
  function card(u){ var l=L(u.id);
    return '<div class="dn-bd'+(u.syn?' evo':' p-'+u.path)+'"><span class="ic">'+ICON(u)+'</span><div><div class="nm">'+u.n+' <em>'+(u.syn?'Synergy':PATHN[u.path]+(u.path==='any'?'':' power'))+' · '+(u.syn?'Active':l>=3?'Lv 3 (MAX)':'Lv '+l+' of 3')+'</em></div>'
      +(u.syn?'<div class="ds">'+synName(u)+'</div><div class="ds">'+u.d+'</div>':'<div class="ds">'+INFO[u.id].base+'</div><div class="dn-sts">'+statRows(u.id,0,l)+'</div>')+'</div></div>'; }
  var ready=SYN.filter(synReady), near=SYN.filter(function(s){ return !HAS(s.id)&&!synReady(s)&&s.need.some(function(q){ return L(q[0])>0; }); }).slice(0,4);
  $('dn-bdlist').innerHTML=(held.length?held.map(card).join(''):'<p class="dn-bdnone">No powers yet. The Keep deals your starter relic as you walk into the Entry Hall.</p>');
  $('dn-bdsyn').innerHTML=(ready.length?'<h4>Unlocked: offered on your next upgrade choice</h4>'+ready.map(function(s){ return '<div class="dn-bs have">'+(PIC(s)||s.ic)+' <b>'+s.n+'</b> = '+synName(s)+'. '+s.d+'</div>'; }).join(''):'')
    +(near.length?'<h4>Synergies you are close to</h4>'+near.map(function(s){ return '<div class="dn-bs">'+(PIC(s)||s.ic)+' <b>'+s.n+'</b> = '+s.need.map(function(q){ var own=L(q[0])>=q[1]; return '<span class="'+(own?'own':'miss')+'">'+(own?'✓ ':'')+UPI[q[0]].n+(q[1]>1?' Lv '+q[1]:'')+(own?'':' (need)')+'</span>'; }).join(' + ')+'</div>'; }).join(''):''); }
function openBuild(){ if(!canPlay()) return; S.mode='build'; HELD={}; BUF.s=0; buildDetails(); $('dn-bdwrap').hidden=false; $('dn-toast').hidden=true;   /* a toast would sit on top of the Music slider */ save(); }
function closeBuild(){ if(S.mode!=='build') return; $('dn-bdwrap').hidden=true; arm(null); S.mode='play'; save(); }
function timerDraw(){ var t=S.w?S.w.runT:0; $('dn-time').textContent=clock(t); }

/* ================= START / END ================= */
/* the title art has the moon in the top right and Back to Arcade in the top left, so on the title the kit's "Press F" hint waits in the bottom left corner
   (it takes over again, in its usual spot, as soon as the title closes) */
(function(){ function place(){ var b=document.getElementById('sz-fs'), st=$('dn-start'), sg=$('stage'); if(!b||!sg) return;
  if(!st.hidden&&st.offsetParent){ b.dataset.own='1'; var r=sg.getBoundingClientRect(), k=r.width/1920; b.style.top='auto'; b.style.left=(r.left+24*k)+'px'; b.style.bottom=(innerHeight-r.bottom+24*k)+'px'; b.style.transformOrigin='0 100%'; b.style.transform='scale('+k+')'; }
  else if(b.dataset.own){ delete b.dataset.own; dispatchEvent(new Event('resize')); } }
  setInterval(place,200); addEventListener('resize',function(){ setTimeout(place,80); }); document.addEventListener('fullscreenchange',function(){ setTimeout(place,80); }); setTimeout(place,0); })();
function goState(){ var ok=!!$('dn-nameinput').value.trim(); $('dn-go').disabled=!ok; $('dn-gohint').hidden=ok; }
$('dn-nameinput').addEventListener('input',goState);
$('dn-nameinput').addEventListener('keydown',function(e){ if(e.key==='Enter'&&this.value.trim()) $('dn-go').click(); });
function startRun(){ S.started=true; $('dn-start').hidden=true; $('dn-end').hidden=true; S.w=freshWorld(); loadRoom('entry','s'); S.mode='play'; cutStart(); renderBuild(); save(); hud(1); }
$('dn-go').addEventListener('click',function(){ var n=$('dn-nameinput').value.trim(); if(!n) return; ac(); S.name=n; $('dn-nameinput').blur(); startRun(); });
var endShownAt=0;
function endRun(win){ S.over=true; S.win=!!win; HELD={}; clearTimeout(nextT); if(win) S.score+=0;
  ['dn-qwrap','dn-pick'].forEach(function(id){ $(id).hidden=true; }); save(); showEnd(true); }
/* one short, useful tip on the end screen (playtest handoff 2026-11-15): from what actually landed the last hit when we know it, else from the room */
var TIPS={ gob:['A goblin pounce','Goblins flash a red ! before they leap. Dodge sideways, then strike.'],
  fire:['Warden fire','Every Warden slam leaves fire on the floor. Watch where he slams and steer around the flames.'],
  bat:['A diving bat','Bats hover, then dive. Dodge through the dive and swing as they pass.'],
  skel:['A shield knight','Shield knights block frontal attacks. Dodge past their swing and strike from behind.'],
  wiz:['A wizard','Wizards aim before they cast. Swing at the orbs to send them back.'], orb:['A magic orb','Wizards aim before they cast. Swing at the orbs to send them back.'],
  slime:['A slime','Slimes hit hard up close. Keep moving and strike from the side.'],
  boss:['The Iron Warden','Bait his charge into a wall, then strike while he is stunned.'], ring:['A shockwave','Shockwave rings have a gap. Run through the gap, or dodge as the ring reaches you.'],
  rubble:['Falling rubble','Rubble shows a warning mark first. Step out of the mark.'] };
function endTip(w){ var t=TIPS[w.hitBy]; if(t) return '<b>'+t[0]+' got you.</b> '+t[1];
  var room={guard:'bat',cross:'skel',arena:'skel',library:'wiz',boss:'boss'}[w.rid]; t=TIPS[room]||TIPS.gob; return '<b>Tip:</b> '+t[1]; }
function showEnd(celebrate){ var w=S.w; endShownAt=performance.now(); $('dn-toast').hidden=true;   /* a leftover toast would sit on the name line */
  $('dn-endtitle').textContent=S.win?(w&&w.lastDone?'Victory! You beat the Warden AND escaped the Last Stand!':'Victory! The Warden is beaten. You fell in the Last Stand at '+clock(w?w.lastT:0)+'.'):'Defeated in the '+(w?ROOMS[w.rid].name:'castle')+'.';
  $('dn-endname').textContent=S.name; $('dn-endscore').innerHTML=S.score.toLocaleString()+'<small>points</small>';
  /* results (final UI pass 2026-11-15): the run and the math are separate; untouched topics say Not attempted */
  var acc=S.answered?Math.round(100*S.correct/S.answered):0, bl=w?UP.concat(SYN).filter(function(u){ return L(u.id)>0; }):[];
  var esc=w&&w.won?(w.lastDone?'Escaped! (2:00)':w.last>0||w.lastT?'Fell at '+clock(w.lastT||0):'Not started'):'Not reached';
  function row(l,v,na){ return '<div class="dn-row2'+(na?' na':'')+'"><span>'+l+'</span><b>'+v+'</b></div>'; }
  /* Combat time is the HUD clock (it stops for questions and choices); Total time is the whole session minus pauses (playtest handoff 2026-11-15) */
  $('dn-endstats').innerHTML=row('Enemies defeated',w?w.kills:0)+row('Best combo',w?w.bestCombo||0:0)
    +row('Iron Warden',w&&w.won?'Beaten: you win!':'Not beaten',!(w&&w.won))+row('Last Stand',esc,!(w&&w.won))
    +row('Time',w?clock(S.sess||0)+' total · '+clock(w.runT)+' combat':'0:00')
;
  $('dn-endbuild').className='dn-endbuild'+(bl.length>12?' many':'');
  $('dn-endbuild').innerHTML=bl.length?bl.map(function(u){ return '<div class="dn-eb">'+ICON(u)+'<span>'+u.n+'</span><em>'+(u.syn?'Synergy':L(u.id)>=3?'MAX':'Lv '+L(u.id))+'</em></div>'; }).join(''):'<div class="dn-eb"><span>No powers yet</span></div>';
  $('dn-mathbig').innerHTML=S.answered?S.correct+' of '+S.answered+' right<small>'+acc+'%</small>':'No questions answered';
  $('dn-endtopics').innerHTML=Object.keys(S.topics).map(function(k){ var t=S.topics[k]; return t[1]?row(k,t[0]+' / '+t[1]):row(k,'Not attempted',1); }).join('')
    +(w&&!(w.won&&w.lastDone)?'<p class="dn-tip">'+endTip(w)+'</p>':'');   /* the one combat tip sits under the math column, which has room */
  if(window.SpitzCode&&SpitzCode.show) try{ SpitzCode.show('dn','rook_and_ruin',S); }catch(e){}
  $('dn-end').hidden=false; if(celebrate) auSting(S.win); if(celebrate&&S.win){ [0,350,700,1100].forEach(function(ms,i){ setTimeout(function(){ sparks(360+i*400,1000,18,1); sparks(1560-i*400,1000,18,1); },ms); }); } }
function playAgain(){ if(performance.now()-endShownAt<1200) return; var keepName=S.name; S=fresh(); S.name=keepName; startRun(); timerDraw(); }
$('dn-again').addEventListener('click',playAgain);

/* ================= KEYS ================= */
function fullscreen(){ var d=document, e=d.documentElement; if(d.fullscreenElement||d.webkitFullscreenElement) (d.exitFullscreen||d.webkitExitFullscreen).call(d);
  else { var r=e.requestFullscreen||e.webkitRequestFullscreen; if(r){ var p=r.call(e); if(p&&p.catch) p.catch(function(){}); } } }
function k0(e){ return (e.key||'').toLowerCase(); }
var MOVE={arrowup:1,arrowdown:1,arrowleft:1,arrowright:1,w:1,a:1,s:1,d:1,' ':1};
document.addEventListener('keydown',function(e){ if(e.metaKey||e.ctrlKey||e.altKey) return; if(e.target&&/^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return;
  if(!$('sz-ask').hidden){ e.preventDefault(); if(k0(e)==='y') newRun(); else if(k0(e)==='n'||e.key==='Escape') askNew(false); return; }
  if(k0(e)==='r'&&e.shiftKey){ e.preventDefault(); if(S.started) askNew(true); return; } var k=k0(e);
  if(S.over&&S.started&&(e.key==='Enter'||k===' ')&&!e.repeat){ e.preventDefault(); playAgain(); return; }
  if((S.mode==='cut'||S.mode==='endcut')&&S.started&&!S.over){ if(k!=='f'&&k!=='n'&&k!=='m') EAT[k]=1; if(e.key==='Shift') EAT.shift=1; if(e.key==='Enter'||e.key==='Escape'||k===' '||k==='j'){ e.preventDefault(); if(!e.repeat) skipScene(); } else if(MOVE[k]) e.preventDefault(); if(k!=='f'&&k!=='n'&&k!=='m') return; }
  if(EAT[k]||(e.key==='Shift'&&EAT.shift)){ e.preventDefault(); return; }
  if(k==='j'||k===' '){ e.preventDefault(); if(canPlay()){ HELD[' ']=true; if(!e.repeat) BUF.s=0.3; } return; }
  if(k==='e'){ e.preventDefault(); if(canPlay()&&!e.repeat) BUF.e=performance.now(); return; }
  /* dodge: X (arrow-key players) or K (WASD players). Shift still works, but no hint names it: five quick Shift taps open Sticky Keys on Windows (Kody's playtest 2026-11-15) */
  if((k==='x'||k==='k'||e.key==='Shift')&&!e.repeat){ if(k==='x') e.preventDefault(); if(canPlay()) roll(); return; }
  if(MOVE[k]){ e.preventDefault(); if(canPlay()) HELD[k]=true; return; }
  if((k==='b'||k==='p'||e.key==='Escape')&&!e.repeat){ if(S.mode==='build'){ e.preventDefault(); closeBuild(); return; } if(canPlay()){ e.preventDefault(); openBuild(); return; } if(k==='b'||k==='p') return; }
  if(S.mode==='build'&&e.key==='Enter'){ e.preventDefault(); closeBuild(); return; }
  if(k==='f'){ e.preventDefault(); fullscreen(); return; }
  if(k==='n'){ e.preventDefault(); musicToggle(); return; }
  if(k==='m'){ e.preventDefault(); muted=!muted; save(); toast(muted?'Sound off':'Sound on'); if(!muted) SND.tick(); return; }
  if(k==='r'&&S.mode==='pick'){ e.preventDefault(); if(!e.repeat) reroll(); return; }
  if(/^[1-4]$/.test(e.key)){ if(e.repeat||!gateOpen()) return; if(S.mode==='ask') answer(+e.key-1); else if(S.mode==='pick') pick(+e.key-1); return; }
  if(e.key==='Enter'){ if(S.mode==='ask'){ e.preventDefault(); if(!e.repeat&&S.qDone&&!$('dn-next').disabled) askNext(); } return; } });
document.addEventListener('keyup',function(e){ var k=k0(e); delete EAT[k]; if(e.key==='Shift') delete EAT.shift; HELD[k]=false; if(k==='j') HELD[' ']=false; });
/* leaving the tab or window pauses the fight (final UI pass): nothing hits you while you are away */
addEventListener('blur',function(){ HELD={}; EAT={}; if(S&&canPlay()) openBuild(); });
document.addEventListener('visibilitychange',function(){ if(document.hidden&&S&&canPlay()) openBuild(); });
$('dn-skip').addEventListener('click',function(e){ e.preventDefault(); e.stopPropagation(); skipScene(); this.blur(); });
function fit(){ var s=Math.min(innerWidth/1920,innerHeight/1080), y=$('stage').style; y.transform='scale('+s+')'; y.left=((innerWidth-1920*s)/2)+'px'; y.top=((innerHeight-1080*s)/2)+'px'; }
addEventListener('resize',fit);
function askNew(o){ $('sz-ask').hidden=!o; if(o) HELD={}; }
function newRun(){ var n=S.name; S=fresh(); S.name=n; try{ localStorage.setItem(KEY,JSON.stringify(S)); }catch(e){} location.reload(); }
$('sz-askyes').addEventListener('click',newRun); $('sz-askno').addEventListener('click',function(){ askNew(false); });
document.querySelector('.dn-top .dn-logo').addEventListener('click',function(){ if(S.started) askNew(true); });
$('sz-mus').addEventListener('click',function(e){ e.stopPropagation(); ac(); musicToggle(); }); musBtn();
/* no start fanfare in this game (Kody 2026-11-14: doesn't fit the vibe) */
cv.addEventListener('pointerdown',function(e){ if(!canPlay()) return; e.preventDefault(); if(e.button===2) roll(); });   // right-click (two-finger tap) dodges; clicking never swings (Kody 2026-11-14: accidental clicks)
cv.addEventListener('contextmenu',function(e){ e.preventDefault(); });
$('dn-build').addEventListener('click',function(){ openBuild(); });
$('dn-bdclose').addEventListener('click',function(e){ e.preventDefault(); closeBuild(); });

/* ================= BOOT ================= */
makeSprites(); makeVig(); makeFx();
S=load()||fresh(); fit();
function boot(){
if(!QS){ $('dn-prompt').textContent='questions.js is missing: keep it in the same folder as this game.'; }
if(S.started){ $('dn-start').hidden=true;
  if(S.over){ if(S.w) restoreMap(); showEnd(false); }
  else { if(!S.w){ S.w=freshWorld(); loadRoom('entry','s'); } else { restoreMap(); if(S.w.rid==='entry') dealStarter(); } if(S.mode==='cut'){ CUT={t:12,gob:{show:0},cues:{}}; S.mode='cut'; cutEnd(); }
    if(S.mode==='endcut'){ S.mode='play'; endRun(!!S.endWin); }
    if(S.mode==='reentry'||S.mode==='build') S.mode='play';
    if(S.mode==='trans'){ S.mode='play'; if(S.w.next){ loadRoom(S.w.next[0],S.w.next[1]); S.w.next=null; } else loadRoom(S.w.rid,S.w.from); }

    if(S.mode==='ask'){ if(!S.ask) S.mode='play'; else { $('dn-qwrap').hidden=false; if(S.q) showQ(); else newQ(); arm($('dn-q')); } }
    else if(S.mode==='pick'){ if(S.cards&&S.cards.length) showPick(); else S.mode='play'; } } }
else { $('dn-nameinput').value=S.name||''; goState(); }
renderBuild(); hud(1); timerDraw(); setInterval(timerDraw,250); setInterval(function(){ if(S.started&&!S.over) save(); },2500); requestAnimationFrame(loop); window.__ready=1; }
(function waitArt(n){ if(artReady()||n>150) boot(); else setTimeout(function(){ waitArt(n+1); },20); })(0);

/* test hooks */
window.__G={ pressE:function(){ BUF.e=performance.now(); }, perf:function(){ return {lite:LITE,ema:PERF.ema}; }, hidden:function(){ return heroHidden(S.w,S.w.p); }, showPick:function(){ showPick(); }, info:function(){ return INFO; }, last:function(){ startLast(); }, frame:function(){ draw(); }, potTick:function(dt){ potTick(dt); }, potSheet:function(){ return potSheet(); }, icons:function(){ return UP.concat(SYN).map(function(u){ return [u.id,ICON(u),typeof RRICON!=='undefined'?RRICON[u.id]:null]; }); }, finish:function(w,k){ finishRun(w,k); }, pose:function(){ return heroPose(S.w.p); }, spawn:function(t,x,y,m,s){ return spawnEnemy(t,x,y,m,s); }, eframe:function(e){ return enemyFrame(e,S.w.p); }, draw:function(){ return rrDraw.apply(null,arguments); }, state:function(){ return S; }, rects:function(){ return ROOMRECTS; }, collide:function(e){ return collide(e); }, answer:answer, pick:pick, save:save, canPlay:canPlay, update:update, swing:swing, roll:roll, held:HELD,
  hold:function(k,on){ HELD[k]=!!on; }, open:function(w,n,g){ openPick(w,n,g); }, hurt:function(d){ hurtP(null,d||1); }, give:function(id,l){ S.w.b[id]=l; renderBuild(); }, room:function(id,from){ loadRoom(id,from||'s'); }, fast:FAST, stat:stat, ROOMS:ROOMS, playAgain:playAgain, tile:tget, solid:solid, askNext:function(){ NEXTGATE=0; askNext(); }, gate:function(){ return {open:gateOpen(),next:performance.now()>=NEXTGATE,mode:S.mode}; }, step:function(dt){ if(S.slow>0){ S.slow-=dt; dt*=0.4; } if(S.started&&!S.over){ if(S.mode==='cut') cutTick(dt); else if(S.mode==='endcut') endTick(dt); else if(S.mode==='trans') transTick(dt); else if(S.mode==='reentry'){ S.reT-=dt; if(S.reT<=0){ S.mode='play'; S.reT=0; } } else if(canPlay()){ if(S.hs>0) S.hs-=dt; else update(dt); } } }, roomsList:function(){ return ROOMS; }, wallAt:wallAt, endShown:function(){ endShownAt=0; } };
})();
