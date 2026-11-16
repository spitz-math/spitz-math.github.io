/* ================= LANTERN PEAK: the climb (four zones, three Waystones, then the beacon tower and the Gloom) =================
   y points up from the village floor (y 0). Each ledge: x = left edge, y = its top, w = width. 20 px = 1 m on the height meter.
   Ledges are jump-through from below; Down drops through them. tests/routes.js proves the required path with the real physics:
   every zone is beatable with the moves you have by then, each zone needs its new move, nothing above a gate is reachable early,
   and there are no softlocks.
   Solid blocks (LEVEL.solids) can't be passed from any side. Where the hero should stand on one, a ledge of the same height lies on top
   of it, so the route checker sees it as a ledge like any other. */
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
  L(846,990,90), L(690,1100,84), L(820,1206,120,'wood',{thorn:[820,46]}), L(700,1290,76),   // the last small step joins the brave path to camp 3
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
  L(240,4560,480,'stone',{id:'top',ledge:true}),  // Falls Lookout: the second Waystone (Scarf Glide)
  /* ---------------- ZONE 3: WINDY RUINS (Scarf Glide: screen-wide gaps, rising wind, a tail wind, one route choice) ---------------- */
  L(390,4790,180,'ruin'),                // 230 up through the gate (a miss lands back on the Lookout)
  L(60,4885,150,'ruin'),
  L(770,4870,160,'ruin',{id:'c8'}),      // 560 px across: only a glide makes it (a miss lands on the ledges below)
  L(230,5290,260,'ruin',{id:'c9'}),      // 420 up: ride the rising wind
  L(760,5480,180,'ruin',{id:'c10'}),     // the fork
  /* fork, left (calm): a glide on the tail wind, then steps and a lift */
  L(20,5600,180,'ruin'), L(250,5710,130,'ruin'),
  L(420,5820,120,'lift',{mx:240,per:4.4}),
  /* fork, up (brave): a narrow rising wind past thorns to the Star Feather */
  L(905,5740,55,'ruin',{thorn:[897,63]}),
  L(790,5930,150,'ruin',{id:'c11'}),     // the paths meet
  L(620,6460,220,'ruin',{id:'c12'}),     // up the second rising wind
  L(430,6580,104,'crumble'), L(230,6680,104,'crumble'),
  L(50,6780,140,'ruin'),
  L(240,6900,480,'ruin',{id:'way3',ledge:true}),   // the third Waystone (Ember Dash)
  /* ---------------- ZONE 4: BEACON SUMMIT (Ember Dash: ice walls to melt through, a Star Feather locked in ice) ---------------- */
  L(400,7130,180,'snow'),
  L(130,7240,160,'snow'),
  L(0,7350,640,'snow',{id:'c13',campX:90}),        // the ice shelf, left of the first ice wall
  L(680,7350,280,'snow'),                          // ...and right of it (on a solid block: no way in from below)
  L(460,7560,330,'snow',{id:'c14',campX:260}),     // the roof of the shelf, right of the second ice wall
  L(0,7560,420,'snow'),                            // ...and left of it
  L(200,7690,150,'snow'),
  L(20,7800,140,'snow',{id:'c15'}),
  L(0,8000,150,'snow'),                            // the ice alcove (Star Feather), on a solid block
  L(190,8000,200,'snow'),                          // stand here and dash left through the ice
  L(460,7910,140,'snow'), L(720,8020,150,'snow'),
  L(500,8140,150,'snow',{id:'c16'}),
  L(760,8170,120,'lift',{my:230,per:4.6}),
  L(470,8450,170,'snow'),
  L(200,8570,560,'brick',{id:'base',ledge:true}),  // the foot of the beacon tower
  /* ---------------- THE BEACON TOWER (finale: three fires to light while the Gloom drops ice and blows) ---------------- */
  L(120,8690,150,'wood'), L(400,8800,160,'wood'), L(690,8900,150,'wood'),
  L(280,9020,400,'brick',{id:'b1',ledge:true}),    // first fire
  L(390,9250,180,'wood'), L(120,9360,150,'wood'), L(520,9460,160,'wood'),
  L(280,9590,400,'brick',{id:'b2',ledge:true}),    // second fire
  L(390,9820,180,'wood'), L(650,9930,104,'crumble'), L(420,10030,104,'crumble'), L(160,10120,150,'wood'),
  L(240,10250,480,'brick',{id:'peak',ledge:true})  // the beacon
];
var get=function(id){ return plats.filter(function(p){ return p.id===id; })[0]; };
/* hard mode (Kody 2026-11-16): past the opening of each zone, plain stepping ledges are a fifth narrower (lanterns, stations, lifts,
   cracked planks, thorny ledges and the wide shelves keep their size). The route checker proves every stretch is still beatable. */
var CALM=[[0,700],[1970,2400],[4560,4900],[6900,7250],[8570,8700]];
plats.forEach(function(p){ if(p.id||p.thorn||p.ledge||p.per||p.kind==='crumble'||p.w<120||p.w>=260) return;
  if(CALM.some(function(c){ return p.y>=c[0]&&p.y<=c[1]; })) return; p.w=Math.round(p.w*0.8); });
var hazards=[]; plats.forEach(function(p){ if(p.thorn) hazards.push({x:p.thorn[0],y:p.y,w:p.thorn[1],h:24}); });
var way=get('way');
/* stations: the three Waystones (each teaches a move and opens the gate above it), then the tower's three fires */
var ST=[ {id:'way',kind:'way',move:'dj'}, {id:'top',kind:'way',move:'gl'}, {id:'way3',kind:'way',move:'ds'},
         {id:'b1',kind:'braz'}, {id:'b2',kind:'braz'}, {id:'peak',kind:'braz',last:true} ];
ST.forEach(function(s,i){ var p=get(s.id); s.i=i; s.y=p.y; s.x=s.kind==='way'?p.x+p.w-90:p.x+p.w/2; });
var solids=[]; ST.forEach(function(s){ if(!s.last) solids.push({x:0,y:s.y+178,w:960,h:30,gate:s.i}); });   // the rune gate over each station
solids.push(
  {x:600,y:7320,w:360,h:30},                       // the ice shelf's solid right half
  {x:640,y:7350,w:40,h:180,ice:true,id:'i1'},      // ice wall 1 (shelf to roof)
  {x:0,y:7530,w:790,h:30},                         // the roof over the shelf: the only way up is the shaft on the right
  {x:420,y:7560,w:40,h:330,ice:true,id:'i2'},      // ice wall 2, standing on the roof (too tall to hop over)
  {x:0,y:7978,w:190,h:22},                         // the alcove's solid floor
  {x:150,y:8000,w:40,h:300,ice:true,id:'i3'}       // ice wall 3: the Star Feather's alcove
);
var CAMPS=['way','top','way3','base','b1','b2'];   /* hard mode (Kody: falling must matter): lanterns only at the Waystones, the tower's foot and the fires */
var LEVEL={
  plats:plats, hazards:hazards, solids:solids, st:ST,
  /* wind boxes: up = rising wind (lifts a glider), vx = tail wind (carries a glider sideways) */
  winds:[ {x:590,y:4870,w:130,h:500,up:300}, {x:200,y:5560,w:560,h:260,vx:-150}, {x:830,y:5480,w:120,h:570,up:300}, {x:420,y:6130,w:120,h:430,up:300} ],
  zones:[ {name:'Pinewood Steps', y:0}, {name:'Falls Cliffs', y:way.y}, {name:'Windy Ruins', y:get('top').y}, {name:'Beacon Summit', y:get('way3').y}, {name:'The Beacon Tower', y:get('base').y, finale:true} ],
  summitY:get('peak').y,
  camps:[ {x:60,y:0,id:'c0'} ].concat(CAMPS.map(function(id){ var p=get(id); return {x:p.x+(p.campX||(p.ledge?60:(p.w>180?40:24))),y:p.y,id:id}; })),
  way:{x:ST[0].x,y:ST[0].y},
  base:get('base'),
  finish:{x:get('peak').x+get('peak').w/2,y:get('peak').y},
  feathers:[ {x:880,y:1290,id:'f1'}, {x:222,y:3830,id:'f2'}, {x:928,y:5860,id:'f3'}, {x:70,y:8050,id:'f4'} ],
  embers:[ [400,170],[630,262],[860,356],[610,486],[400,580],[165,676],[350,770],[550,860],
           [570,1044],[360,1138],[150,1232],[320,1338],
           [890,1072],[730,1182],[870,1290],[560,1430],
           [230,1520],[110,1636],[305,1740],[540,1840],[800,1936],
           [485,2276],[720,2380],[400,2400],[170,2410],[390,2610],[650,2712],[860,2800],[860,2950],[675,3064],[480,3180],[160,3370],
           [395,3480],[645,3590],[870,3720],[650,3880],[66,3600],[222,3820],[520,4000],[200,4140],[420,4330],[710,4450],
           /* the wide glides and the rising winds of zone 3 (the rest of zones 3 and 4 and the tower are placed over each ledge, below) */
           [330,5010],[520,5030],[700,4990],[655,5050],[655,5170],[655,5290],[640,5720],[470,5730],[222,5700],[868,5600],[868,5720],[868,5840],
           [480,6200],[480,6320],[480,6440],[330,7434],[540,7434],[840,7434],[880,7550],[820,8320],[820,8470] ],
  signs:[
    {x:120,y:0,keys:'LR',text:'Run'},
    {x:250,y:0,keys:'JUMP',text:'Jump'},
    {x:610,y:276,keys:'HOLD',text:'Hold jump to go higher'},
    {x:180,y:596,text:'Cracked planks fall. Keep moving!'},
    {x:810,y:870,text:'Two paths: ← calm   brave →'},
    {x:520,y:1350,text:'Ride the lift'},
    {x:360,y:1970,text:'Touch the Waystone',max:0},
    {x:410,y:1970,text:'Jump, then jump again in the air!',keys:'JUMP2',min:1},
    {x:150,y:3290,text:'← brave   calm →'},
    {x:330,y:4560,text:'Touch the Waystone',max:1},
    {x:420,y:4560,text:'After your hop, hold to glide',keys:'HOLD',min:2},
    {x:135,y:4885,text:'Glide all the way across →'},
    {x:850,y:4870,text:'← Ride the rising wind'},
    {x:880,y:5480,text:'← calm   brave ↑'},
    {x:330,y:6900,text:'Touch the Waystone',max:2},
    {x:400,y:6900,text:'Dash!',keys:'X',min:3},
    {x:330,y:7350,text:'A dash melts ice',keys:'X'},
    {x:90,y:7800,text:'A Star Feather is in the ice ↑'},
    {x:300,y:8570,text:'Light the three fires'}
  ]
};
/* one ember over each ledge of the new zones (not over thorns, stations, lifts, or where rock or another ledge is in the way) */
plats.forEach(function(p){ if(p.y<4700||p.thorn||p.ledge||p.per) return; var e=[Math.round(p.x+p.w/2),p.y+84];
  var hit=LEVEL.solids.some(function(q){ return q.gate===undefined&&e[0]>q.x-16&&e[0]<q.x+q.w+16&&e[1]>q.y-20&&e[1]<q.y+q.h+20; })||plats.some(function(q){ return q!==p&&e[0]>q.x-10&&e[0]<q.x+q.w+10&&Math.abs(q.y-e[1])<40; });
  if(!hit) LEVEL.embers.push(e); });
LEVEL.get=get;
root.LPLEVEL=LEVEL;
})(typeof window!=='undefined'?window:globalThis);
