/* ================= SPITZ KIT (games/kit.js): the pieces every Spitz Arcade game shares =================
   Loaded in each game's <head>, so a fix here reaches all the games at once:
   - brand styles (the Made by Spitz credit with Kody's burger, eyebrow, music button, "Start a new game?" box) and the F hint
   - SpitzKit.game(env): music switch (N), the Spitz jingle, the shared music engine, confetti, toast, stagePoint
   - the start screen names the question set the hub link picked
   - an offline cache (sw.js) so games open fast on slow school Wi-Fi
   Each game keeps its own look, sound effects and song, and hands them to the kit in one SpitzKit.game({...}) call.
   Self-contained test copies (*_mult.html) have this file built in, like questions.js and scorecode.js. */
(function(){
'use strict';
var BURGER='data:image/webp;base64,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';

/* ---------- brand styles (were the "SPITZ ARCADE BRAND" block in every game) ---------- */
var css=[
'.sz-credit{ display:inline-flex !important; align-items:center; gap:10px; font:800 18px/1 Inter,system-ui,sans-serif !important; letter-spacing:.16em !important; text-transform:uppercase; color:var(--sz-ink) !important; white-space:nowrap; }',
".sz-credit::before{ content:''; flex:none; width:26px; height:5px; border-radius:3px; background:var(--sz-mark); }",
'.sz-burger{ display:inline-block; flex:none; width:1.4em; height:1.15em; margin:-.15em 0; background:url("'+BURGER+'") center/contain no-repeat; vertical-align:middle; }',
'.sz-eyebrow{ display:inline-flex; align-items:center; gap:14px; margin:0 0 18px; font:800 24px/1 Inter,system-ui,sans-serif; letter-spacing:.34em; text-transform:uppercase; color:var(--sz-ink); }',
".sz-eyebrow::before,.sz-eyebrow::after{ content:''; width:40px; height:5px; border-radius:3px; background:var(--sz-mark); }",
'.sz-eyebrow b{ color:var(--sz-mark); font-weight:800; }',
'.sz-mus{ height:84px; padding:0 26px; border-radius:20px; background:var(--panel); border:3px solid var(--border); font:800 30px/1 Inter,system-ui,sans-serif; color:var(--sz-ink); white-space:nowrap; }',
'.sz-mus.on{ border-color:var(--sz-mark); color:var(--text); }',
'.sz-ask.sz-ask{ z-index:40; } .sz-ask h2{ margin:0 0 6px; font:400 84px/1.05 var(--display); color:var(--text); }',
'.sz-ask .sz-askrow{ display:flex; justify-content:center; gap:20px; }',
'.sz-ask .sz-askrow button{ height:96px; padding:0 44px; border-radius:22px; font:800 32px/1 Inter,system-ui,sans-serif; background:var(--panel); border:3px solid var(--border); color:var(--text); }',
'.sz-ask #sz-askyes{ background:var(--sz-mark); border-color:var(--sz-mark); color:#111; }',
'[class$="-logo"]{ cursor:pointer; }',
/* the F hint */
'.sz-fs{ position:fixed; left:50%; bottom:16px; transform:translateX(-50%); transform-origin:50% 100%; z-index:9999; display:flex; white-space:nowrap; align-items:center; gap:10px; padding:10px 20px 10px 12px; border-radius:999px;',
'  border:2px solid rgba(255,255,255,.4); background:rgba(0,0,0,.78); color:#fff; font:700 18px/1 Inter,system-ui,sans-serif; cursor:pointer; box-shadow:0 8px 24px rgba(0,0,0,.4); transition:opacity .4s; }',
'.sz-fs kbd{ display:inline-grid; place-items:center; min-width:34px; height:34px; border-radius:8px; background:#fff; color:#111; font:800 20px/1 Inter,system-ui,sans-serif; }',
'.sz-fs.quiet{ opacity:.4; } .sz-fs:hover{ opacity:1; }',
'.sz-fs[hidden]{ display:none; }'
].join('\n');
var st=document.createElement('style'); st.id='sz-kit-css'; st.textContent=css;
/* first in <head>, so each game's own styles still win over the shared ones */
var head=document.head||document.documentElement; head.insertBefore(st, head.firstChild);

/* ---------- SpitzKit.game(env) ----------
   env: ac()  -> the game's AudioContext (or null)    muted() -> true while M has everything muted
        song() -> the game's SONG for the shared music engine (leave it out when the game runs its own music)
        voice(f,t0,dur) -> the jingle's instrument (default: SONG.voice)
        confetti, toast -> ids of the confetti canvas and the toast box     colors -> the game's confetti colors
        toastMs -> how long a toast stays (default 1.5 s)     toastFn(msg) -> a game's own toast, if it has one */
var IN=-1e9; ['pointerdown','keydown'].forEach(function(n){ addEventListener(n,function(){ IN=Date.now(); },true); });
function active(ms){ return Date.now()-IN<(ms||2500); }
var JINGLE=[[392.00,0,0.12],[523.25,0.13,0.12],[659.25,0.26,0.12],[783.99,0.40,0.34],[659.25,0.78,0.12],[783.99,0.92,0.7]];

/* the shared music engine: synthesized, no audio files. It plays only during a run, sits under the sound effects
   (25 Chromebooks play it at once), and backs off while the student reads a question. */
function musGraph(ctx,dest,SONG){ var out=ctx.createGain(), act=ctx.createGain(), d=ctx.createDelay(1), fb=ctx.createGain(), wet=ctx.createGain(); out.gain.value=SONG.level; out.connect(dest); act.connect(out);
  d.delayTime.value=SONG.echo||0.3; fb.gain.value=0.28; wet.gain.value=0.3; d.connect(fb); fb.connect(d); d.connect(wet); wet.connect(act);
  var n=Math.floor(ctx.sampleRate*0.3), buf=ctx.createBuffer(1,n,ctx.sampleRate), ch=buf.getChannelData(0); for(var i=0;i<n;i++) ch[i]=Math.random()*2-1;
  return {out:out,act:act,echo:d,noise:buf}; }
function mNote(ctx,to,type,fr,t,dur,vol,cut,echo,att){ var o=ctx.createOscillator(), f=ctx.createBiquadFilter(), e=ctx.createGain(); o.type=type; o.frequency.value=fr; f.type='lowpass'; f.frequency.value=cut||2400;
  e.gain.setValueAtTime(0.0001,t); e.gain.exponentialRampToValueAtTime(vol,t+(att||0.008)); e.gain.setValueAtTime(vol,t+Math.max(att||0.008,dur*0.55)); e.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  o.connect(f); f.connect(e); e.connect(to); if(echo) e.connect(echo); o.start(t); o.stop(t+dur+0.03); return o; }
function mHit(ctx,g,to,t,dur,vol,hp,lp){ var s=ctx.createBufferSource(), f=ctx.createBiquadFilter(), e=ctx.createGain(); s.buffer=g.noise; f.type=lp?'lowpass':'highpass'; f.frequency.value=lp||hp;
  e.gain.setValueAtTime(vol,t); e.gain.exponentialRampToValueAtTime(0.0001,t+dur); s.connect(f); f.connect(e); e.connect(to); s.start(t); s.stop(t+dur+0.03); }
function mKick(ctx,to,t,vol,hi,lo){ var o=ctx.createOscillator(), e=ctx.createGain(); o.type='sine'; o.frequency.setValueAtTime(hi||200,t); o.frequency.exponentialRampToValueAtTime(lo||48,t+0.12);
  e.gain.setValueAtTime(0.0001,t); e.gain.exponentialRampToValueAtTime(vol||0.8,t+0.005); e.gain.exponentialRampToValueAtTime(0.0001,t+0.2); o.connect(e); e.connect(to); o.start(t); o.stop(t+0.22); }

function game(env){
  var K={ active:active, mNote:mNote, mHit:mHit, mKick:mKick, onMusic:function(){} }, off=false;
  function $(id){ return document.getElementById(id); }

  /* music switch: M mutes everything; N turns just the music off (remembered on this Chromebook) */
  try{ off=localStorage.getItem('spitz_music_off')==='1'; }catch(e){}
  K.musicOff=function(){ return off; };
  K.musBtn=function(){ var b=$('sz-mus'); if(b){ b.textContent=off?'♪ Music off':'♪ Music on'; b.classList.toggle('on',!off); } };
  K.musicToggle=function(){ off=!off; try{ localStorage.setItem('spitz_music_off',off?'1':'0'); }catch(e){} K.musBtn(); K.toast(off?'Music off':'Music on'); K.onMusic(); };
  /* the Spitz jingle: the same notes open every game, played on that game's own instrument */
  var voice=env.voice||function(f,t0,dur){ env.song().voice(f,t0,dur); };
  K.jingle=function(){ JINGLE.forEach(function(n){ voice(n[0],n[1],n[2]); }); };

  if(env.song){
    K.musGraph=function(ctx,dest){ return musGraph(ctx,dest,env.song()); };
    var MUS={ on:false, g:null, i:0, t:0 };
    setInterval(function(){ var a=env.ac(), SONG=env.song(), want=SONG.want()&&!env.muted()&&!off;
      if(!want){ if(MUS.on){ MUS.on=false; var g=MUS.g; MUS.g=null; if(g&&a){ g.out.gain.setTargetAtTime(0,a.currentTime,0.2); setTimeout(function(){ try{ g.out.disconnect(); }catch(e){} },1400); } } return; }
      if(!a||a.state!=='running') return;                                              // browsers hold sound until the first click or key press
      if(!MUS.on){ MUS.on=true; MUS.g=K.musGraph(a,a.destination); MUS.g.out.gain.setValueAtTime(0.0001,a.currentTime); MUS.g.out.gain.linearRampToValueAtTime(SONG.level,a.currentTime+1.2); MUS.i=0; MUS.t=a.currentTime+0.1; }
      MUS.g.act.gain.setTargetAtTime(SONG.busy()?1:0.35,a.currentTime,0.35);            // playing: full band. Reading a question: it backs off so they can think
      if(MUS.t<a.currentTime) MUS.t=a.currentTime+0.05;                                 // the tab was in the background: pick up from now
      while(MUS.t<a.currentTime+0.5){ var sd=SONG.sd(); SONG.step(a,MUS.g,MUS.i,MUS.t,sd); MUS.t+=sd; MUS.i++; } },120);
    /* test hook: render the music off line and measure it */
    window.__music=function(sec){ var SONG=env.song(), C=window.OfflineAudioContext||window.webkitOfflineAudioContext, c=new C(1,44100*sec,44100), g=K.musGraph(c,c.destination), t=0.05, i=0;
      while(t<sec){ var sd=SONG.sd(); SONG.step(c,g,i,t,sd); t+=sd; i++; }
      return c.startRendering().then(function(buf){ var d=buf.getChannelData(0), pk=0, sq=0, bad=0, n=d.length; for(var j=0;j<n;j++){ var v=d[j]; if(v!==v) bad++; pk=Math.max(pk,Math.abs(v)); sq+=v*v; }
        return {peak:pk, rms:Math.sqrt(sq/n), bad:bad, steps:i}; }); };
  }

  /* confetti (always on, even with reduced motion): pieces move by elapsed time, not by frame, so a slow Chromebook doesn't leave them
     hanging in the air, and the loop restarts itself if a frame is ever dropped. The layer is drawn at half size (960x540) to save work. */
  var parts=[], craf=0, cfLast=0, cfSeen=0, CFC=env.colors||['#FF3DB4','#B6FF3D','#2DE2E6','#FF8A1F','#FFF04D','#C77DFF','#FFFFFF'];
  function cfStep(ts){ craf=0; cfSeen=Date.now(); var cv0=$(env.confetti), c=cv0.getContext('2d'), k=cv0.width/1920, f=cfLast?Math.min(3,(ts-cfLast)/16.67):1; cfLast=ts;
    c.setTransform(1,0,0,1,0,0); c.clearRect(0,0,cv0.width,cv0.height);
    try{ parts=parts.filter(function(p){ return p.life<p.max&&p.y<1120; });
      var drag1=Math.pow(0.985,f), drag2=Math.pow(0.992,f);
      parts.forEach(function(p){ p.life+=f; p.vy+=0.42*f; p.vx*=drag1; p.vy*=drag2; p.x+=p.vx*f; p.y+=p.vy*f; p.r+=p.vr*f; var s=Math.cos(p.life*0.2);
        c.setTransform(k,0,0,k,0,0); c.translate(p.x,p.y); c.rotate(p.r); c.globalAlpha=Math.max(0,Math.min(1,(p.max-p.life)/25)); c.fillStyle=p.c; c.fillRect(-p.w/2,-p.h/2*s,p.w,p.h*s); });
    }catch(e){ parts=[]; }
    c.globalAlpha=1; c.setTransform(1,0,0,1,0,0);
    if(parts.length) craf=requestAnimationFrame(cfStep); else { c.clearRect(0,0,cv0.width,cv0.height); cfLast=0; } }
  K.confetti=function(x,y,n,spread){ for(var i=0;i<n;i++){ var a=-Math.PI/2+(Math.random()-0.5)*spread, sp=8+Math.random()*15;
      parts.push({x:x,y:y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,w:10+Math.random()*12,h:6+Math.random()*8,r:Math.random()*6.28,vr:(Math.random()-0.5)*0.5,c:CFC[i%CFC.length],life:0,max:85+Math.random()*60}); }
    if(parts.length>700) parts=parts.slice(-700);
    window.__conf=(window.__conf||0)+n; if(!craf||Date.now()-cfSeen>400){ if(craf) cancelAnimationFrame(craf); cfLast=0; craf=requestAnimationFrame(cfStep); } };
  var toastT=0; K.toast=env.toastFn||function(msg){ var t=$(env.toast); t.textContent=msg; t.hidden=false; clearTimeout(toastT); toastT=setTimeout(function(){ t.hidden=true; },env.toastMs||1500); };
  /* where an element sits on the 1920x1080 stage (confetti bursts start there) */
  K.stagePoint=function(el,dx,dy){ var r=el.getBoundingClientRect(), s=$('stage').getBoundingClientRect(), k=1920/s.width; return [(r.left-s.left)*k+(dx||0),(r.top-s.top)*k+(dy||0)]; };
  return K;
}
window.SpitzKit={ game:game, active:active, burger:BURGER };

/* ---------- once the page is read: the set name and the F hint ---------- */
function ready(){
  /* the start screen names the question set the hub link picked */
  var m=/[?&]set=([a-z0-9]+)/.exec(location.search); if(m&&window.SpitzQ&&SpitzQ.sets&&SpitzQ.sets[m[1]]) document.querySelectorAll('.sz-setname').forEach(function(e){ e.textContent=SpitzQ.sets[m[1]].name+'.'; });

  /* "Press F for full screen" */
  var b=document.createElement('button'); b.className='sz-fs'; b.id='sz-fs'; b.hidden=true; b.setAttribute('aria-label','Full screen, key F'); b.innerHTML='<kbd>F</kbd>Press F for full screen';
  document.body.appendChild(b); var t0=Date.now();
  function fs(){ return !!(document.fullscreenElement||document.webkitFullscreenElement); }
  function upd(){ b.hidden=fs(); var st=document.querySelector('[id$="-start"]'), onStart=!!(st&&!st.hidden&&st.offsetParent);
    b.classList.toggle('quiet', !onStart && Date.now()-t0>8000);
    /* sit at the same spot of the game screen at any window size: scale with the stage and follow its letterbox (a game can move it sideways with --sz-fs-x,
       or up top with --sz-fs-y:top and --sz-fs-top). On the start and end screens it waits in the top right corner, so it never covers the keys line
       or the buttons (a game can opt out with --sz-fs-corner:0) */
    if(b.dataset.own) return;   // the game places it itself (Brick Breaker: under the paddle)
    var sg=document.getElementById('stage'); if(sg){ var r=sg.getBoundingClientRect(), k=r.width/1920; if(k>0){ var cs=getComputedStyle(document.documentElement),
        x=parseFloat(cs.getPropertyValue('--sz-fs-x'))||0.5, en=document.querySelector('[id$="-end"]'), over=onStart||!!(en&&!en.hidden&&en.offsetParent);
      if(over&&cs.getPropertyValue('--sz-fs-corner').trim()!=='0'){ b.style.top=(r.top+24*k)+'px'; b.style.bottom='auto'; b.style.left=(r.right-24*k)+'px'; b.style.transformOrigin='100% 0'; b.style.transform='translateX(-100%) scale('+k+')'; }
      else{ var top=!over&&cs.getPropertyValue('--sz-fs-y').trim()==='top'; b.style.top=top?(r.top+(parseFloat(cs.getPropertyValue('--sz-fs-top'))||30)*k)+'px':''; b.style.transformOrigin=top?'50% 0':''; b.style.left=(r.left+r.width*x)+'px'; b.style.bottom=top?'auto':(window.innerHeight-r.bottom+16*k)+'px'; b.style.transform='translateX(-50%) scale('+k+')'; } } } }
  b.addEventListener('click',function(){ document.dispatchEvent(new KeyboardEvent('keydown',{key:'f',bubbles:true})); setTimeout(upd,300); });
  ['click','keydown'].forEach(function(n){ document.addEventListener(n,function(){ setTimeout(upd,60); },true); });   // follow Start / Play again right away
  window.addEventListener('resize',function(){ setTimeout(upd,50); }); document.addEventListener('fullscreenchange',upd); document.addEventListener('webkitfullscreenchange',upd); setInterval(upd,1000); upd();
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',ready); else ready();

/* ---------- offline cache (games/sw.js): a game opens from the Chromebook's cache, then refreshes in the background ---------- */
if('serviceWorker' in navigator && location.protocol==='https:') addEventListener('load',function(){ try{ navigator.serviceWorker.register('sw.js',{scope:'./'}).catch(function(){}); }catch(e){} });
})();
