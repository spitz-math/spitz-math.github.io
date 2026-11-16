/* ================= LANTERN PEAK: the climb (vertical slice: zone 1, the first Waystone, zone 2) =================
   y points up from the village floor (y 0). Each ledge: x = left edge, y = its top, w = width. 20 px = 1 m on the height meter.
   Ledges are jump-through from below; Down drops through them. tests/routes.js proves the required path with the real physics:
   zone 1 with plain jumps only, zone 2 with Cloud Hop, and that zone 2 can't be climbed without it. */
(function(root){
function L(x,y,w,kind,o){ var p={x:x,y:y,w:w,kind:kind||'wood'}; if(o) for(var k in o) p[k]=o[k]; return p; }
var plats=[
  /* ---------------- ZONE 1: PINEWOOD STEPS (learn run, jump, held jump, cracked planks, the lift, one route choice) ---------------- */
  L(0,0,960,'floor',{floor:true}),
  L(330,92,150), L(560,184,140), L(780,276,160),
  L(540,406,140),                       // 130 up: needs a held jump (the sign says so)
  L(320,500,160,'wood',{id:'c1'}),      // camp 1
  L(90,596,150),
  L(300,690,104,'crumble'), L(500,780,104,'crumble'),
  L(700,870,200,'wood',{id:'c2'}),      // camp 2 + the fork
  /* fork, left (calm): a staircase back across */
  L(500,964,140), L(290,1058,140), L(80,1152,160), L(250,1258,150),
  /* fork, right (brave): narrow steps past thorns to the Star Feather */
  L(846,990,90), L(690,1100,84), L(820,1206,120,'wood',{thorn:[820,46]}),
  L(450,1350,220,'wood',{id:'c3'}),     // the paths meet: camp 3
  L(130,1440,130,'lift',{mx:260,per:4.2}),   // a lift that slides sideways
  L(40,1556,140),
  L(240,1660,130), L(470,1758,150,'wood',{thorn:[574,46]}),
  L(720,1856,180),
  L(250,1970,470,'stone',{id:'way',ledge:true}),   // the Waystone ledge
  /* ---------------- ZONE 2: FALLS CLIFFS (Cloud Hop: higher steps, wider gaps, a rising lift, one more route choice) ---------------- */
  L(410,2196,150,'stone'),               // 226 up from the Waystone ledge: only reachable with Cloud Hop (a miss lands back on the ledge)
  L(660,2300,120,'stone'),
  L(90,2330,160,'stone',{id:'c4'}),      // 410 px across from the last ledge: hop to cross (falling lands on the ledge below)
  L(330,2530,120,'stone'),
  L(560,2632,190,'stone',{id:'c5'}),
  L(800,2632,120,'lift',{my:250,per:4.6}),   // a lift that rises
  L(600,2984,150,'stone'),
  L(430,3100,104,'crumble'),
  L(80,3290,160,'stone',{id:'c6'}),
  /* fork, right (calm) */
  L(330,3400,130,'stone'), L(580,3510,130,'stone'), L(800,3640,140,'stone'), L(580,3800,150,'stone'),
  /* fork, left (brave): thin pillars up the waterfall to the Star Feather */
  L(30,3520,74,'stone'), L(190,3740,64,'stone'),
  L(340,3920,360,'stone',{id:'c7'}),
  L(120,4060,160,'stone',{thorn:[120,52]}),
  L(360,4250,120,'stone'), L(640,4370,140,'stone'),
  L(240,4560,480,'stone',{id:'top',ledge:true})   // Falls Lookout: end of the slice
];
var get=function(id){ return plats.filter(function(p){ return p.id===id; })[0]; };
var hazards=[]; plats.forEach(function(p){ if(p.thorn) hazards.push({x:p.thorn[0],y:p.y,w:p.thorn[1],h:24}); });
var way=get('way');
var LEVEL={
  plats:plats, hazards:hazards,
  solids:[ {x:0,y:way.y+178,w:960,h:30,gate:true} ],            // the rune gate over the Waystone: opens when the runes are lit
  zones:[ {name:'Pinewood Steps', y:0}, {name:'Falls Cliffs', y:way.y}, {name:'Windy Ruins', y:6200, locked:true}, {name:'Beacon Summit', y:9000, locked:true} ],
  summitY:11000,                       // full game height (for the meter); the slice ends at the Lookout
  camps:[ {x:60,y:0,id:'c0'} ].concat(['c1','c2','c3','c4','c5','c6','c7'].map(function(id){ var p=get(id); return {x:p.x+(p.w>180?40:24),y:p.y,id:id}; })).concat([{x:way.x+60,y:way.y,id:'way'}]),
  way:{x:way.x+way.w-90,y:way.y},
  finish:{x:get('top').x+get('top').w/2,y:get('top').y},
  feathers:[ {x:880,y:1290,id:'f1'}, {x:222,y:3830,id:'f2'} ],
  embers:[ [400,170],[630,262],[860,356],[610,486],[400,580],[165,676],[350,770],[550,860],
           [570,1044],[360,1138],[150,1232],[320,1338],
           [890,1072],[730,1182],[870,1290],[560,1430],
           [230,1520],[110,1636],[305,1740],[540,1840],[800,1936],
           [485,2276],[720,2380],[400,2400],[170,2410],[390,2610],[650,2712],[860,2800],[860,2950],[675,3064],[480,3180],[160,3370],
           [395,3480],[645,3590],[870,3720],[650,3880],[66,3600],[222,3820],[520,4000],[200,4140],[420,4330],[710,4450] ],
  signs:[
    {x:120,y:0,keys:'LR',text:'Run'},
    {x:250,y:0,keys:'JUMP',text:'Jump'},
    {x:610,y:276,keys:'HOLD',text:'Hold jump to go higher'},
    {x:180,y:596,text:'Cracked planks fall. Keep moving!'},
    {x:810,y:870,text:'Two paths: ← calm   brave →'},
    {x:520,y:1350,text:'Ride the lift'},
    {x:360,y:1970,text:'Touch the Waystone',need:'nodj'},
    {x:410,y:1970,text:'Jump, then jump again in the air!',keys:'JUMP2',need:'dj'},
    {x:150,y:3290,text:'← brave   calm →'}
  ]
};
LEVEL.get=get;
root.LPLEVEL=LEVEL;
})(typeof window!=='undefined'?window:globalThis);
