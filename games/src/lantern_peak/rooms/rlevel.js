/* ================= LANTERN PEAK (rooms): the climb, room by room =================
   Slice (Kody picked Celeste as the model, 2026-11-16): chapter 1 Pinewood Steps teaches jumps, thorns, wall jumps and crumbling
   rock; its Waystone (questions) gives the Ember Dash; chapter 2 Falls Cliffs is built around the dash and the embers that refill it.
   Rooms are drawn with a few box() calls on a 32 x 18 grid (x 0..31, y 0..17, y down). tests/solve.js proves each room can be beaten. */
(function(root){
var C=32, Rn=18;
function blank(){ var m=[]; for(var y=0;y<Rn;y++){ var r=[]; for(var x=0;x<C;x++) r.push('.'); m.push(r); } return m; }
function box(m,x0,y0,x1,y1,ch){ for(var y=y0;y<=y1;y++) for(var x=x0;x<=x1;x++) m[y][x]=ch||'#'; return m; }
function put(m,x,y,ch){ m[y][x]=ch; return m; }
function rows(m){ return m.map(function(r){ return r.join(''); }); }
/* the outer walls, with the exit cut out */
function walls(m,exit){ box(m,0,0,0,17); box(m,31,0,31,17); if(exit&&exit.side==='right') box(m,31,exit.y0,31,exit.y1,'.'); if(exit&&exit.side==='up'){ } return m; }

var R=[];
/* ---------- chapter 1: Pinewood Steps ---------- */
(function(){ var m=walls(blank(),{side:'up'}); box(m,0,15,31,17); box(m,8,12,11,14); box(m,15,9,18,14); box(m,21,6,24,6,'='); box(m,27,3,30,14);
  box(m,1,0,25,0); put(m,2,14,'S');
  R.push({ ch:0, name:'First steps', rows:rows(m), exit:'up', hint:'<kbd>←</kbd><kbd>→</kbd> Run · <kbd>Space</kbd> Jump (hold it to go higher)' }); })();
(function(){ var m=walls(blank(),{side:'right',y0:6,y1:9}); box(m,0,15,31,17); box(m,8,15,11,15,'^'); box(m,16,15,20,15,'^'); box(m,13,12,14,14);
  box(m,22,12,24,12,'='); box(m,25,10,30,14); box(m,0,0,31,0); put(m,2,14,'S');
  R.push({ ch:0, name:'Thorns', rows:rows(m), exit:'right', hint:'Thorns send you back to the start of the room' }); })();
(function(){ var m=box(blank(),0,0,31,17); box(m,1,10,13,14,'.'); box(m,14,0,17,14,'.'); put(m,3,14,'S');
  R.push({ ch:0, name:'The chimney', rows:rows(m), exit:'up', hint:'Jump at a wall, then jump again to kick off it' }); })();
(function(){ var m=walls(blank(),{side:'right',y0:5,y1:8}); box(m,0,16,31,17); box(m,1,16,30,16,'^'); box(m,0,13,4,17); box(m,8,12,10,12,'c'); box(m,14,11,16,11,'c'); box(m,20,10,22,10,'c');
  box(m,26,9,30,17); box(m,0,0,31,0); put(m,2,12,'S');
  R.push({ ch:0, name:'Crumbling rock', rows:rows(m), exit:'right', hint:'Cracked rock falls soon after you touch it. Keep moving!' }); })();
(function(){ var m=walls(blank(),{side:'right',y0:10,y1:13}); box(m,0,14,31,17); box(m,0,0,31,0); put(m,3,13,'S'); put(m,15,13,'W');
  R.push({ ch:0, name:'The Waystone', rows:rows(m), exit:'right', way:true }); })();
/* ---------- chapter 2: Falls Cliffs (the Ember Dash) ---------- */
(function(){ var m=walls(blank(),{side:'right',y0:7,y1:10}); box(m,0,16,31,17); box(m,7,16,15,16,'^'); box(m,0,12,6,17); box(m,16,12,20,17); box(m,21,16,26,16,'^'); box(m,27,11,30,17); box(m,0,0,31,0); put(m,2,11,'S');
  R.push({ ch:1, name:'Across the falls', rows:rows(m), exit:'right', hint:'Jump, then <kbd>Shift</kbd>, <kbd>X</kbd> or <kbd>K</kbd> to dash. Your move keys aim it.' }); })();
(function(){ var m=walls(blank(),{side:'right',y0:4,y1:7}); box(m,0,15,31,17); box(m,11,15,19,15,'^'); box(m,20,8,30,17); box(m,0,0,31,0); put(m,3,14,'S');
  R.push({ ch:1, name:'Dash up', rows:rows(m), exit:'right', hint:'Hold <kbd>↑</kbd> or <kbd>W</kbd>, then <kbd>Shift</kbd>, <kbd>X</kbd> or <kbd>K</kbd> to dash straight up' }); })();
(function(){ var m=walls(blank(),{side:'right',y0:5,y1:8}); box(m,0,16,31,17); box(m,1,16,30,16,'^'); box(m,0,10,4,17); box(m,14,11,16,17); box(m,27,9,30,17); box(m,0,0,31,0);
  put(m,9,8,'o'); put(m,21,8,'o'); put(m,2,9,'S');
  R.push({ ch:1, name:'Ember chain', rows:rows(m), exit:'right', hint:'Touch an ember to get your dash back in the air' }); })();
(function(){ var m=box(blank(),0,0,31,17); box(m,1,12,9,14,'.'); box(m,10,0,15,14,'.'); box(m,10,15,15,15,'^'); box(m,1,15,9,15,'#');
  box(m,10,9,11,9,'c'); box(m,10,1,10,6,'>'); box(m,15,1,15,6,'<'); put(m,12,7,'o'); put(m,13,3,'o'); put(m,3,14,'S');
  R.push({ ch:1, name:'Up the falls', rows:rows(m), exit:'up', hint:'Wall jumps, a dash up, an ember: mix them' }); })();
(function(){ var m=walls(blank(),null); box(m,0,14,31,17); box(m,0,0,31,0); put(m,3,13,'S'); put(m,22,13,'L');
  R.push({ ch:1, name:'The Lookout', rows:rows(m), exit:'none', lantern:true }); })();

root.LPROOMS={ rooms:R, chapters:[{name:'Pinewood Steps'},{name:'Falls Cliffs'}] };
})(typeof window!=='undefined'?window:globalThis);
