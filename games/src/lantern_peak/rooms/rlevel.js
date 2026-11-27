/* ================= LANTERN PEAK (rooms): the climb, room by room =================
   Celeste is the model (Kody, 2026-11-16: "make it fully Celeste-inspired"). Four chapters of one-screen rooms; each room's exit
   leads straight into the next room (an exit to the right comes in on the left at the same height; an exit up comes in through a
   gap in the next room's floor, covered by a ledge you jump up through). Each chapter ends at a Waystone (questions):
   1 Pinewood Steps   jumps, thorns, wall jumps, crumbling rock, ledges      -> Waystone gives the Ember Dash
   2 Falls Cliffs     the dash, embers, springs, brittle rock                -> Waystone gives the Twin Dash (two dashes in the air)
   3 Windy Ruins      wind, the twin dash                                     -> Waystone lights the way to the summit
   4 Beacon Summit    all of it, then the Lookout (the summit lantern)
   Rooms are drawn with box() on a 32 x 18 grid (x 0..31, y 0..17, y down). tests/solve.js proves each room can be beaten,
   from its start and from the way you come in. */
(function(root){
var C=32, Rn=18;
function blank(){ var m=[]; for(var y=0;y<Rn;y++){ var r=[]; for(var x=0;x<C;x++) r.push('.'); m.push(r); } return m; }
function box(m,x0,y0,x1,y1,ch){ for(var y=y0;y<=y1;y++) for(var x=x0;x<=x1;x++) m[y][x]=ch||'#'; return m; }
function put(m,x,y,ch){ m[y][x]=ch; return m; }

var R=[], prevExit=null;
/* one room: ch chapter, ex its exit ({right:[y0,y1]} / {up:[x0,x1]} / null), draw(m) adds the rock, o extra fields */
function room(ch,name,ex,draw,o){ var m=blank(); o=o||{};
  box(m,0,0,0,17); box(m,31,0,31,17); box(m,0,0,31,0);            // outer walls and ceiling
  draw(m);
  if(ex&&ex.right) for(var y=ex.right[0];y<=ex.right[1];y++) m[y][31]='.';
  if(ex&&ex.up) for(var x=ex.up[0];x<=ex.up[1];x++) m[0][x]='.';
  /* the way in, from the last room's exit; the start (where a retry puts you) is right by it */
  var sx=o.sx, sy=o.sy;
  if(prevExit&&prevExit.right){ for(var y2=prevExit.right[0];y2<=prevExit.right[1];y2++) m[y2][0]='.'; if(sx===undefined){ sx=1; sy=prevExit.right[1]; } }
  if(prevExit&&prevExit.up){ for(var x2=prevExit.up[0];x2<=prevExit.up[1];x2++){ m[15][x2]='='; m[16][x2]='.'; m[17][x2]='.'; }
    [prevExit.up[0]-1,prevExit.up[1]+1].forEach(function(x3){ if(x3>0&&x3<31&&m[15][x3]==='.') m[15][x3]='='; });   // a little extra ledge either side
    if(sx===undefined){ sx=prevExit.up[0]+1; sy=14; } }
  if(sx!==undefined) m[sy][sx]='S';
  var def={ ch:ch, name:name, rows:m.map(function(r){ return r.join(''); }), exit:ex?(ex.right?'right':'up'):'none', inFrom:prevExit?(prevExit.right?'left':'down'):null,
    inSpan:prevExit?(prevExit.right||prevExit.up):null, exitSpan:ex?(ex.right||ex.up):null };
  for(var k in o) if(k!=='sx'&&k!=='sy') def[k]=o[k];
  if(typeof o.way==='string'){ def.give=o.way; def.way=true; }   // what the Waystone gives: 'dash', 'twin' or 'light'
  R.push(def); prevExit=ex; }
function spikes(m,x0,x1,y){ box(m,x0,y,x1,y,'^'); box(m,x0,y+1,x1,17); }   // a row of thorns on rock

/* ---------- chapter 1: Pinewood Steps ---------- */
room(0,'First steps',{right:[3,6]},function(m){ box(m,0,15,31,17); box(m,8,13,11,14); box(m,14,11,17,14); box(m,20,9,23,14); box(m,26,7,30,14); },
  { sx:2, sy:14, hint:'<kbd>←</kbd><kbd>→</kbd> Run · <kbd>Space</kbd> Jump (hold it to go higher)' });
room(0,'Thorns',{right:[4,7]},function(m){ box(m,0,7,5,17); spikes(m,6,25,16); box(m,9,10,11,15); box(m,15,9,17,15); box(m,21,10,23,15); box(m,26,8,30,17); },
  { hint:'Thorns send you back to the start of the room' });
room(0,'The chimney',{up:[9,12]},function(m){ box(m,0,8,12,17); box(m,1,0,8,3); box(m,13,0,31,17); },
  { hint:'Jump at a wall, then jump again to kick off it' });
room(0,'Crumbling rock',{right:[6,9]},function(m){ box(m,0,15,8,17); box(m,13,15,16,17); spikes(m,17,28,15); box(m,19,12,20,12,'c'); box(m,23,11,24,11,'c'); box(m,29,10,30,17); box(m,26,8,26,8); box(m,27,13,28,13,'c'); },
  { hint:'Cracked rock falls soon after you touch it. Keep moving!' });
room(0,'Ledges',{up:[16,19]},function(m){ box(m,0,10,4,17); box(m,5,15,21,17); box(m,8,12,12,12,'='); box(m,13,9,17,9,'='); box(m,9,6,13,6,'='); box(m,15,3,19,3,'='); box(m,22,0,31,17); box(m,1,0,15,0); box(m,20,0,21,0); },
  { hint:'Wooden ledges: jump up through them, then land on top' });
room(0,'The first Waystone',{right:[11,14]},function(m){ box(m,0,15,15,17); box(m,20,15,31,17); put(m,10,14,'W'); },
  { way:'dash' });

/* ---------- chapter 2: Falls Cliffs (the Ember Dash) ---------- */
room(1,'Across the falls',{right:[9,12]},function(m){ box(m,0,15,6,17); spikes(m,7,15,16); box(m,16,13,30,17); },
  { hint:'Jump, then <kbd>Shift</kbd>, <kbd>X</kbd> or <kbd>K</kbd> to dash. Your move keys aim it.' });
room(1,'Dash up',{up:[26,29]},function(m){ box(m,0,13,6,17); box(m,7,15,13,17); box(m,14,8,30,17); },
  { hint:'Hold <kbd>↑</kbd> or <kbd>W</kbd>, then dash to go straight up' });
room(1,'Springs',{up:[2,5]},function(m){ box(m,22,15,30,17); spikes(m,1,21,16); box(m,13,15,15,16); box(m,13,14,15,14,'p'); box(m,1,6,7,17); box(m,8,0,30,2); },
  { hint:'A spring throws you high and gives your dash back' });
room(1,'Ember chain',{right:[6,9]},function(m){ box(m,0,15,1,17); box(m,6,15,9,17); spikes(m,10,26,16); box(m,16,12,18,17); box(m,27,10,30,17); put(m,13,10,'o'); put(m,22,9,'o'); },
  { hint:'Touch an ember to get your dash back in the air' });
room(1,'Brittle rock',{right:[11,14]},function(m){ box(m,0,10,5,17); box(m,6,15,15,17); box(m,10,1,11,14,'b'); spikes(m,16,22,16); box(m,19,1,20,13,'b'); box(m,23,15,30,17); },
  { hint:'Dash into brittle rock to smash it' });
room(1,'Spring, then fly',{up:[25,28]},function(m){ box(m,0,15,4,17); spikes(m,5,30,16); box(m,8,14,10,15); put(m,9,13,'p'); put(m,16,6,'o'); box(m,22,6,30,15); },
  {});
room(1,'The second Waystone',{right:[11,14]},function(m){ box(m,0,15,24,17); box(m,29,15,30,17); put(m,14,14,'W'); },
  { way:'twin' });

/* ---------- chapter 3: Windy Ruins (wind and the Twin Dash) ---------- */
room(2,'Twin Dash',{right:[4,7]},function(m){ box(m,0,15,5,17); spikes(m,6,18,16); box(m,19,10,22,17); box(m,23,8,30,17); },
  { hint:'Dash, then dash again: two dashes before you land' });
room(2,'Headwind',{right:[4,7]},function(m){ box(m,0,8,6,17); spikes(m,7,25,16); box(m,10,10,13,15); box(m,17,9,20,15); box(m,24,8,30,17); },
  { wind:-180, hint:'The wind pushes you back. Dashes cut right through it.' });
room(2,'Tailwind',{right:[6,9]},function(m){ box(m,0,8,4,17); spikes(m,5,25,16); put(m,15,7,'o'); box(m,26,10,30,17); box(m,12,1,13,4,'b'); },
  { wind:190, hint:'A tailwind: ride it, but don\'t overshoot' });
room(2,'Crumbling stairs',{up:[25,28]},function(m){ box(m,0,10,5,17); spikes(m,6,30,16); box(m,9,12,11,12,'c'); box(m,14,10,16,10,'c'); box(m,19,8,21,8,'c'); box(m,24,6,30,15); },
  { hint:'Don\'t stop on the cracked rock' });
room(2,'Smash upward',{right:[4,7]},function(m){ box(m,0,15,24,17); box(m,29,15,30,17); box(m,18,10,24,10,'b'); box(m,25,8,30,9); box(m,13,0,17,10); },
  { sx:21, sy:14, hint:'A dash up smashes brittle rock too' });
room(2,'Gale',{right:[3,6]},function(m){ box(m,0,8,4,17); spikes(m,5,25,16); box(m,10,9,12,15); box(m,18,8,20,15); put(m,15,6,'o'); put(m,23,5,'o'); box(m,26,7,30,17); },
  { wind:-200, hint:'A strong headwind. Use every dash and every ember.' });
room(2,'The third Waystone',{right:[3,6]},function(m){ box(m,0,7,30,17); put(m,8,6,'W'); },
  { way:'light' });

/* ---------- chapter 4: Beacon Summit ---------- */
room(3,'Icy steps',{up:[26,29]},function(m){ box(m,0,7,4,17); spikes(m,5,24,16); box(m,9,13,11,15); put(m,10,12,'p'); box(m,16,6,19,15); box(m,25,4,30,17); },
  {});
room(3,'Thorn tunnel',{up:[2,5]},function(m){ box(m,20,15,25,17); box(m,30,15,30,17); box(m,6,16,19,17); box(m,6,15,19,15,'^'); box(m,6,8,19,9); box(m,6,10,19,10,'v'); put(m,12,13,'o'); box(m,1,8,5,9,'b'); box(m,1,15,5,17); box(m,6,1,30,7); box(m,20,8,30,10); },
  { hint:'Keep low: thorns above and below' });
room(3,'Spring line',{right:[4,7]},function(m){ spikes(m,6,27,16); box(m,0,15,5,17); box(m,9,14,10,15); put(m,9,13,'p'); box(m,17,14,18,15); put(m,18,13,'p'); box(m,28,8,30,17); },
  { wind:150 });
room(3,'Brittle chimney',{up:[6,9]},function(m){ box(m,0,8,5,17); box(m,6,13,9,17); box(m,10,1,30,17); box(m,6,4,9,5,'b'); box(m,1,0,5,3); },
  { hint:'Wall jump, then smash through' });
room(3,'Summit ridge',{right:[3,6]},function(m){ box(m,1,15,5,17); box(m,10,15,12,17); spikes(m,13,30,16); box(m,16,11,17,11,'c'); put(m,21,8,'o'); box(m,26,7,30,15); box(m,6,16,9,17); box(m,6,15,9,15,'^'); },
  { wind:-120 });
room(3,'The Lookout',null,function(m){ box(m,0,7,30,17); put(m,22,6,'L'); },
  { lantern:true });

root.LPROOMS={ rooms:R, chapters:[{name:'Pinewood Steps'},{name:'Falls Cliffs'},{name:'Windy Ruins'},{name:'Beacon Summit'}] };
})(typeof window!=='undefined'?window:globalThis);
