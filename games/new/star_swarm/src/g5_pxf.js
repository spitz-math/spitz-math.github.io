/* ================= PIXEL EFFECTS (PixelFX by patch-gg, MIT; strips made by tools/pixelfx/pack.mjs) =================
   HD-2D look: each effect is a crisp pixel colour frame plus a soft light frame added on top ('lighter') for the glow.
   Effects run on game time, so they freeze under the question card and during hit-stop. V turns them off and on.
   Reduced motion: off. */
var PXF={on:true,list:[],img:{},lightBudget:300000};
Object.keys(PXF_DATA).forEach(function(k){ var d=PXF_DATA[k], c=new Image(), l=new Image(); c.src=d.c; l.src=d.l; PXF.img[k]=[c,l]; });
function pfx(k,x,y,s,delay,o){ if(!PXF.on||REDUCE||!PXF_DATA[k]) return; o=o||{};
  PXF.list.push({k:k,x:x,y:y,s:s||2.5,t0:gt+(delay||0),back:!!o.back,follow:!!o.follow,dy:o.follow?y-SHIP_Y:0});
  if(PXF.list.length>48) PXF.list.shift(); }
var KILL_FX={bee:'k_bee',fly:'k_fly',cmd:'k_cmd',bomber:'k_bomb'};
function drawFx(back){ var Lst=PXF.list, i, f, d, n, im, w, h, x0, y0, live=[]; if(!Lst.length) return;
  for(i=Lst.length-1;i>=0;i--){ f=Lst[i]; d=PXF_DATA[f.k]; if(gt<f.t0) continue; n=Math.floor((gt-f.t0)*1000/d.ms); if(n>=d.n){ Lst.splice(i,1); continue; }
    if(f.back===back) live.push([f,d,n]); }
  if(!live.length) return;
  var sm=cx.imageSmoothingEnabled; cx.imageSmoothingEnabled=false;
  for(i=0;i<live.length;i++){ f=live[i][0]; d=live[i][1]; n=live[i][2]; im=PXF.img[f.k][0]; if(!im.complete) continue; if(f.follow) f.x=ship.x, f.y=SHIP_Y+f.dy;
    w=d.w*f.s; h=d.h*f.s; x0=Math.round(f.x-w*d.ax); y0=Math.round(f.y-h*d.ay);
    cx.drawImage(im,(n%d.cols)*d.w,Math.floor(n/d.cols)*d.h,d.w,d.h,x0,y0,Math.round(w),Math.round(h)); }
  cx.imageSmoothingEnabled=true; cx.globalCompositeOperation='lighter'; cx.globalAlpha=0.85;
  var budget=PXF.lightBudget;   // the glow is the costly part on a slow Chromebook: newest effects get it first, the rest stay crisp pixels only
  for(i=0;i<live.length;i++){ f=live[i][0]; d=live[i][1]; n=live[i][2]; im=PXF.img[f.k][1]; if(!im.complete) continue;
    w=d.w*f.s; h=d.h*f.s; budget-=w*h; if(budget<0&&i>0) break; x0=f.x-w*d.ax; y0=f.y-h*d.ay;
    cx.drawImage(im,(n%d.cols)*d.lw,Math.floor(n/d.cols)*d.lh,d.lw,d.lh,x0,y0,w,h); }
  cx.globalAlpha=1; cx.globalCompositeOperation='source-over'; cx.imageSmoothingEnabled=sm; }
document.addEventListener('keydown',function(e){ if(e.metaKey||e.ctrlKey||e.altKey||e.repeat) return; if(e.target&&/^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return;
  if(e.key==='v'||e.key==='V'){ PXF.on=!PXF.on; PXF.list.length=0; toast('Pixel effects '+(PXF.on?'ON':'OFF')+' (V)'); } });
