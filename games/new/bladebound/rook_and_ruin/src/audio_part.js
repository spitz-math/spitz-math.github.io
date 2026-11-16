/* ================= AUDIO PACK (2026-11-15) =================
   Music: OGG files played as decoded AudioBuffers. Loops use loop=true, so they are gapless; tracks crossfade over 0.8 s.
   Effects: 46 OGG one-shots (second batch of 16 added the same night), decoded on the first click or key press. Anything that has not loaded (or will not decode)
   falls back to the old synth sound, so the game never goes silent and never throws.
   Where the files come from: on the site they sit beside the game in audio/rook_and_ruin/ (fetched). The _mult test copy
   carries them inside the file (window.RR_AUD, base64), because a page opened from Downloads cannot fetch files.
   Music by game state (Kody 2026-11-15: no dungeon track, battle_loop in every regular room):
     title screen + intro scene -> title_loop | regular rooms -> battle_loop | shop -> shop_loop | Warden room -> boss_metal_loop
     Last Stand -> last_stand_metal_2min, kept in step with the 2:00 timer (pauses with it), final hit lands on 0:00
     end screen -> victory_sting / defeat_sting.  Questions, picks and pause duck the music to 40%.
   Volumes: music 0.5, effects 0.8 (times the Music / Effects sliders on the pause screen, saved per device). N and M still work. */
var AUD_BASE='audio/rook_and_ruin/';
var MUSF={title:'title_loop',battle:'battle_loop',shop:'shop_loop',boss:'boss_metal_loop',ls:'last_stand_metal_2min',win:'victory_sting',lose:'defeat_sting'};
var SFXF=['answer_correct','answer_wrong','card_pick_gold','card_pick_power','chest_open','dodge_roll','door_open','door_unlock','enemy_death_bat','enemy_death_goblin',
  'enemy_death_skeleton','enemy_death_slime','footstep_stone_1','footstep_stone_2','footstep_stone_3','level_up','pickup_coin','pickup_gem','pickup_heart','player_hurt',
  'player_knocked_out','pot_smash','room_cleared','shield_block','shop_purchase','sword_hit_armor','sword_hit_flesh','sword_swing','warden_ground_slam','warden_roar',
  'spark_zap','bomb_explosion','warden_orb_volley','power_bolt','crit_strike','wall_crack','secret_found','combo_up','enemy_telegraph','warden_telegraph',
  'boss_defeated','enemy_death_wisp','torch_light','relic_glow','goblin_snarl','ui_tick'];
/* per effect: [shortest gap in ms, most copies at once, volume]. Everything else: [45,4,1]. */
var FXC={ sword_swing:[60,3,1], sword_hit_flesh:[45,3,1], sword_hit_armor:[80,3,1], pickup_coin:[60,4,1], pickup_gem:[90,3,0.9], pot_smash:[60,4,1],
  enemy_death_goblin:[50,4,1], enemy_death_bat:[50,4,1], enemy_death_skeleton:[60,3,1], enemy_death_slime:[50,4,1], warden_roar:[2400,1,1], warden_ground_slam:[200,2,1],
  footstep_stone_1:[120,1,1], footstep_stone_2:[120,1,1], footstep_stone_3:[120,1,1], player_hurt:[120,2,1], dodge_roll:[120,2,1], level_up:[200,1,1], room_cleared:[400,1,1],
  spark_zap:[120,2,1], bomb_explosion:[110,3,1], power_bolt:[90,3,1], warden_orb_volley:[150,1,1], enemy_telegraph:[180,2,1], warden_telegraph:[400,1,1],
  enemy_death_wisp:[50,4,1], combo_up:[150,1,1], wall_crack:[150,1,1], torch_light:[200,2,1], boss_defeated:[1000,1,1] };
var SYNTH_TRIM=1;   /* level of the synth effects that have no file yet, relative to the Effects slider */
var AU={ raw:{}, getting:{}, buf:{}, dec:{}, bad:{}, fail:{}, wait:{}, used:{}, vol:{m:1,f:1}, mg:null, dg:null, fg:null, sg:null, cur:null, src:null, g:null, t0:0, off0:0, pend:null,
  sting:null, fxLast:{}, fxN:{}, fxAll:0, test:null, pre:0 };
try{ var auv=JSON.parse(localStorage.getItem('rook_and_ruin_audio')||'null'); if(auv){ if(auv.m>=0&&auv.m<=1) AU.vol.m=+auv.m; if(auv.f>=0&&auv.f<=1) AU.vol.f=+auv.f; } }catch(e){}
function auSaveVol(){ try{ localStorage.setItem('rook_and_ruin_audio',JSON.stringify(AU.vol)); }catch(e){} }
function auMusicOff(){ return muted||KIT.musicOff(); }

/* ---------- loading ---------- */
/* A download that fails (busy school Wi-Fi) is tried again: up to 3 times, 4 s apart. Only then, or when the file can never load
   (a local copy with no audio beside it, or bytes that will not decode), is the name marked bad for the rest of the visit. */
function auBytes(n){ if(AU.raw[n]) return Promise.resolve(AU.raw[n]); if(AU.getting[n]) return AU.getting[n];
  if(AU.wait[n]&&performance.now()<AU.wait[n]) return Promise.reject(new Error('audio: waiting to retry'));
  var E=window.RR_AUD, p, local=!(E&&E[n])&&location.protocol==='file:';
  if(E&&E[n]) p=new Promise(function(res){ var s=atob(E[n]), a=new Uint8Array(s.length); for(var i=0;i<s.length;i++) a[i]=s.charCodeAt(i); res(a.buffer); });
  else if(location.protocol==='file:') p=Promise.reject(new Error('no audio beside a local file'));
  else p=fetch(AUD_BASE+n+'.ogg').then(function(r){ if(!r.ok) throw new Error('audio '+r.status); return r.arrayBuffer(); });
  AU.getting[n]=p.then(function(b){ AU.raw[n]=b; delete AU.getting[n]; return b; },function(e){ delete AU.getting[n]; AU.fail[n]=(AU.fail[n]||0)+1; if(local||AU.fail[n]>=3) AU.bad[n]=1; else AU.wait[n]=performance.now()+4000; throw e; });
  AU.getting[n].catch(function(){}); return AU.getting[n]; }
function auDecode(a,b){ return new Promise(function(res,rej){ var done=0, ok=function(x){ if(!done){ done=1; res(x); } }, no=function(e){ if(!done){ done=1; rej(e||new Error('decode')); } };
  try{ var r=a.decodeAudioData(b.slice(0),ok,no); if(r&&r.then) r.then(ok,no); }catch(e){ no(e); } }); }
function auBuf(n){ AU.used[n]=performance.now(); if(AU.buf[n]) return Promise.resolve(AU.buf[n]); if(AU.dec[n]) return AU.dec[n];
  var a=AC; if(!a||AU.bad[n]) return Promise.reject(new Error('no audio'));
  AU.dec[n]=auBytes(n).then(function(b){ return auDecode(a,b); }).then(function(x){ AU.buf[n]=x; delete AU.dec[n]; auTrim(); return x; },function(e){ delete AU.dec[n]; if(AU.raw[n]) AU.bad[n]=1;   /* the bytes arrived but will not decode */ throw e; });
  AU.dec[n].catch(function(){}); return AU.dec[n]; }
/* Chromebook memory: a decoded 80 s loop is ~30 MB, so at most 3 long tracks stay decoded (the playing one first). The compressed bytes stay, so a track comes back fast. */
function auTrim(){ var big=[], k; for(k in MUSF){ var n=MUSF[k]; if(AU.buf[n]&&k!=='win'&&k!=='lose') big.push(n); }
  if(big.length<=3) return; var keep={}; keep[MUSF[AU.cur]||'']=1; if(AU.cur==='boss') keep[MUSF.ls]=1;
  big.sort(function(x,y){ return (AU.used[x]||0)-(AU.used[y]||0); });
  for(var i=0;i<big.length&&big.length-i>3;i++){ if(!keep[big[i]]&&!(AU.src&&AU.src.buffer===AU.buf[big[i]])) delete AU.buf[big[i]]; } }
function auPreload(){ if(AU.pre||!AC) return; AU.pre=1; SFXF.forEach(function(n){ auBuf(n).catch(function(){}); });
  /* fetch the music ahead of time (compressed bytes only, one file at a time), so each room's track starts the moment it is needed */
  var q=['battle','shop','boss','ls'].map(function(k){ return MUSF[k]; }), next=function(){ var n=q.shift(); if(n) auBytes(n).then(next,next); }; setTimeout(next,2500); }
/* effects that missed their first download are asked for again every 5 s until they load or are marked bad */
setInterval(function(){ if(!AU.pre||!AC) return; SFXF.forEach(function(n){ if(!AU.buf[n]&&!AU.bad[n]&&!AU.dec[n]) auBuf(n).catch(function(){}); }); },5000);

/* ---------- graph: music -> duck -> music volume, effects -> effects volume, synth effects -> trim ---------- */
function auGraph(){ var a=AC; if(!a) return null; if(AU.mg) return AU.mg;
  try{ AU.mg=a.createGain(); AU.dg=a.createGain(); AU.fg=a.createGain(); AU.sg=a.createGain();
    AU.dg.connect(AU.mg); AU.mg.connect(a.destination); AU.fg.connect(a.destination); AU.sg.connect(a.destination); auVol(true); }catch(e){ AU.mg=null; }
  return AU.mg; }
function auSynthOut(a){ return auGraph()?AU.sg:a.destination; }
/* music level: every track is mastered to -18 LUFS. Kody's classroom test 2026-11-16: "the music is too loud on launch" on Chromebooks,
   so the music bus went from 0.5 to 0.3 (-4.4 dB) and the title loop plays a further 3 dB under that. */
var MUSV=0.3, MUS_TITLE=0.7;
function auVol(now){ if(!AU.mg) return; var t=AC.currentTime, set=function(p,v){ if(now) p.value=v; else p.setTargetAtTime(v,t,0.03); };
  set(AU.mg.gain,MUSV*AU.vol.m); set(AU.fg.gain,0.8*AU.vol.f);   /* the soft synth set (Nov 15, 3rd pack) is mastered 6-14 dB quieter, so effects are back at 0.8 */ set(AU.sg.gain,SYNTH_TRIM*AU.vol.f); }
function auKick(){ try{ var a=ac(); if(!a) return; auGraph(); auPreload(); auTick(); }catch(e){} }
['pointerdown','keydown','touchstart'].forEach(function(n){ addEventListener(n,auKick,true); });

/* ---------- music ---------- */
function auWant(){ if(AU.test) return AU.test==='stop'?null:AU.test; if(!S||auMusicOff()) return null;
  if(!S.started) return 'title'; if(S.over) return null;   /* the end screen belongs to the sting */
  var w=S.w; if(!w) return 'title';
  if(S.mode==='cut') return 'title';
  if(S.mode==='endcut') return AU.cur==='ls'&&ECUT&&ECUT.kind==='escape'?'ls':null;   /* the Last Stand track rings out over the escape; a fall fades */
  if(w.last>0) return 'ls';
  var R=ROOMS[w.rid]||{}; return R.boss?'boss':R.shop?'shop':'battle'; }
function auStart(b,off,loop,fade){ var a=AC, s=a.createBufferSource(), g=a.createGain(), t=a.currentTime; s.buffer=b; s.loop=!!loop;
  g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(b===AU.buf[MUSF.title]?MUS_TITLE:1,t+fade); s.connect(g); g.connect(AU.dg); s.start(t,off||0);
  AU.src=s; AU.g=g; AU.t0=t; AU.off0=off||0; s.onended=function(){ if(AU.src===s){ AU.src=null; AU.g=null; } try{ g.disconnect(); }catch(e){} }; }
function auFadeOut(sec){ if(!AU.src) return; var a=AC, s=AU.src, g=AU.g, t=a.currentTime; AU.src=null; AU.g=null;
  try{ g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(Math.max(0.0001,g.gain.value),t); g.gain.linearRampToValueAtTime(0.0001,t+sec); s.stop(t+sec+0.05); }catch(e){} }
function auPos(){ return AU.src?AU.off0+(AC.currentTime-AU.t0):null; }
/* where the Last Stand track is right now (null when it is not the one playing) */
function auLSPos(){ var b=AU.buf[MUSF.ls]; return AC&&AU.cur==='ls'&&AU.src&&b&&AU.src.buffer===b&&AC.state==='running'?auPos():null; }
function auTick(){ var a=AC; if(!a||!AU.mg) return;
  var duck=S&&S.started&&!S.over&&(S.mode==='ask'||S.mode==='pick'||S.mode==='build');
  AU.dg.gain.setTargetAtTime(duck&&!AU.test?0.4:1,a.currentTime,0.2);
  if(AU.sting&&S&&!S.over&&!AU.test){ try{ AU.sting.stop(); }catch(e){} AU.sting=null; }
  var want=auWant();
  if(want==='ls') return auLS();
  if(want!==AU.cur){ auFadeOut(want?0.8:1.0); AU.cur=want; }
  if(want==='boss') auBuf(MUSF.ls).catch(function(){});   /* get the Last Stand ready while the Warden fight runs */
  if(!want||AU.src||AU.pend===want) return;
  var n=MUSF[want]; if(AU.bad[n]) return;
  AU.pend=want; auBuf(n).then(function(b){ if(AU.pend===want) AU.pend=null; if(AU.cur===want&&!AU.src) auStart(b,0,!/^(ls|win|lose)$/.test(want),0.8); },function(){ if(AU.pend===want) AU.pend=null; }); }
/* the Last Stand track follows the timer: it pauses when the timer pauses (pause, revive question, re-entry count) and
   jumps back in step if slow motion or hit-stop let it drift, so the final hit lands on 0:00 */
function auLS(){ var w=S.w, n=MUSF.ls;
  if(AU.cur!=='ls'){ auFadeOut(0.8); AU.cur='ls'; }
  if(S.mode==='endcut') return;
  if(S.mode!=='play'){ if(AU.src) auFadeOut(0.15); return; }
  var b=AU.buf[n]; if(!b){ if(AU.pend!=='ls'&&!AU.bad[n]){ AU.pend='ls'; auBuf(n).then(function(){ AU.pend=null; auTick(); },function(){ AU.pend=null; }); } return; }
  var want=Math.max(0,LAST-w.last), pos=auPos(), tol=1.5;   /* the clock follows the track (lastTick), so only a deliberate jump of the clock (or a resume) moves the music */
  if(pos!=null&&Math.abs(pos-want)<tol) return;
  if(want>=b.duration-0.05) return;
  var cut=pos!=null; if(cut) auFadeOut(0.06);
  auStart(b,want,false,cut?0.06:(want<0.5?0.05:0.15)); }
setInterval(function(){ try{ auTick(); }catch(e){} },150);
KIT.onMusic=function(){ try{ auTick(); }catch(e){} };
/* a hidden tab goes silent: the game already pauses there, and 25 Chromebooks should not keep playing music from background tabs */
document.addEventListener('visibilitychange',function(){ if(!AC) return; try{ var r=document.hidden?AC.suspend():AC.resume(); if(r&&r.catch) r.catch(function(){}); }catch(e){} });
function auSting(win){ var a=AC; if(!a||!AU.mg){ (win?SYNTH.win:SYNTH.miss)(); return; }
  auFadeOut(0.4); AU.cur=null; if(muted) return;
  if(KIT.musicOff()){ (win?SYNTH.win:SYNTH.miss)(); return; }   /* music off: keep the old short effect so the end still has a sound */
  auBuf(win?MUSF.win:MUSF.lose).then(function(b){ if(!S.over||AU.sting) return; var s=a.createBufferSource(); s.buffer=b; s.connect(AU.dg); s.start(a.currentTime+0.3); AU.sting=s; s.onended=function(){ if(AU.sting===s) AU.sting=null; }; },
    function(){ (win?SYNTH.win:SYNTH.miss)(); }); }

/* ---------- effects ---------- */
function fxPlay(n,o){ var a=AC; if(!a||muted||!AU.fg) return false; var b=AU.buf[n]; if(!b) return false; o=o||{};
  var c=FXC[n]||[45,4,1], t=performance.now();
  if(AU.fxLast[n]&&t-AU.fxLast[n]<c[0]) return true;            /* rate limit: skip it (and don't fall back to synth) */
  if((AU.fxN[n]||0)>=c[1]||AU.fxAll>=16) return true;
  AU.fxLast[n]=t; AU.fxN[n]=(AU.fxN[n]||0)+1; AU.fxAll++;
  var s=a.createBufferSource(), g=a.createGain(); s.buffer=b; if(o.rate) s.playbackRate.value=o.rate; g.gain.value=c[2]*(o.vol||1);
  s.connect(g); g.connect(AU.fg); s.onended=function(){ AU.fxN[n]--; AU.fxAll--; try{ s.disconnect(); g.disconnect(); }catch(e){} };
  s.start(a.currentTime+(o.at||0)); count(); return true; }
var SYNTH={}; Object.keys(SND).forEach(function(k){ SYNTH[k]=SND[k]; });
[['swing','sword_swing'],['dodge','dodge_roll'],['block','shield_block'],['hurt','player_hurt'],['clang','sword_hit_armor'],['coin','pickup_coin'],['gem','pickup_gem'],
 ['chest','chest_open'],['crack','pot_smash'],['correct','answer_correct'],['miss','answer_wrong'],['level','level_up'],['pick','card_pick_power'],['gold','card_pick_gold'],
 ['buy','shop_purchase'],['gate','door_unlock'],['door','door_open'],['boss','warden_roar'],
 ['zap','spark_zap'],['boom','bomb_explosion'],['orb','warden_orb_volley'],['bolt','power_bolt'],['crit','crit_strike'],['tele','enemy_telegraph'],['btele','warden_telegraph'],
 ['solve','secret_found'],['bossDown','boss_defeated'],['torch','torch_light'],['relic','relic_glow'],['snarl','goblin_snarl'],['tick','ui_tick']].forEach(function(m){ var k=m[0], n=m[1]; SND[k]=function(){ if(!fxPlay(n)) SYNTH[k].apply(null,arguments); }; });
SND.hit=function(e,o){ if(o&&o.melee&&e&&fxPlay(e.type==='skel'||e.type==='boss'?'sword_hit_armor':'sword_hit_flesh')) return; SYNTH.hit(); };
var DIEF={gob:'enemy_death_goblin',bat:'enemy_death_bat',skel:'enemy_death_skeleton',slime:'enemy_death_slime',wiz:'enemy_death_wisp'};
SND.die=function(e){ if(e&&e.type==='boss') return; var n=e&&DIEF[e.type]; if(!(n&&fxPlay(n,{rate:e.small?1.1:1}))) SYNTH.pop(); };
SND.wall=function(){ if(!fxPlay('wall_crack')) SYNTH.crack(); };
/* combo_up is in D; each multiplier step plays it higher (D, F, A, D) like the old synth figure */
SND.combo=function(m){ var r=[1,1,1,1.189,1.498,2][Math.min(5,Math.round(m))]||1; if(!fxPlay('combo_up',{rate:r})) SYNTH.combo(m); };
SND.slam=function(){ if(!fxPlay('warden_ground_slam')) SYNTH.boom(); };
SND.heart=function(){ if(!fxPlay('pickup_heart')) SYNTH.chest(); };
/* shop, not enough coins: a low soft tick (not the wrong-answer sound, which belongs to questions only) */
SND.deny=function(){ if(!fxPlay('ui_tick',{rate:0.6})) tone(300,260,0,0.08,'triangle',0.06); };
SND.ko=function(){ fxPlay('player_knocked_out'); };
SND.clear=function(){ if(fxPlay('room_cleared')) fxPlay('door_unlock',{at:0.45}); else SYNTH.door(); };
SND.lsStart=function(){ SYNTH.boss(); };
SND.step=function(){ fxPlay('footstep_stone_'+(1+Math.floor(Math.random()*3)),{rate:0.96+Math.random()*0.08}); };

/* ---------- pause screen sliders ---------- */
(function(){ var m=$('dn-volm'), f=$('dn-volf'); if(!m||!f) return;
  function show(){ m.value=Math.round(AU.vol.m*100); f.value=Math.round(AU.vol.f*100); $('dn-volmv').textContent=m.value+'%'; $('dn-volfv').textContent=f.value+'%'; }
  function set(){ AU.vol.m=m.value/100; AU.vol.f=f.value/100; auSaveVol(); auVol(); show(); }
  [m,f].forEach(function(el){ el.addEventListener('input',set); el.addEventListener('change',function(){ set(); el.blur(); if(el===f) SND.coin(); }); el.addEventListener('keydown',function(e){ if(/^(Arrow|Home|End|Page)/.test(e.key)) e.stopPropagation(); else el.blur(); }); });
  show(); })();

/* ---------- sound test: add #sound to the end of the link. Every track and effect, plus the combo pitch steps. ---------- */
var SNDTEST=/^#sound/.test(location.hash)||/[?&]sound\b/.test(location.search);   /* #sound survives the question-set link rewrite */
function soundTest(){ var box=document.createElement('div'); box.className='dn-cover dn-snd'; box.id='dn-snd';
  var MUS=[['title','Title'],['battle','Rooms (battle)'],['shop','Shop'],['boss','Warden'],['ls','Last Stand (2:05)'],['win','Victory sting'],['lose','Defeat sting']];
  var h='<div class="dn-bdbox"><div class="dn-bdhead"><h2>Sound test</h2><span class="dn-paused" id="dn-sndnow">Click anything to hear it</span><button class="dn-next dn-bdclose" id="dn-sndclose" type="button">Close</button></div>';
  h+='<h4>Music</h4><div class="dn-sndrow">'+MUS.map(function(m){ return '<button data-m="'+m[0]+'">'+m[1]+'</button>'; }).join('')+'<button data-m="ls110">Last Stand from 1:50</button><button data-m="stop">Stop music</button></div>';
  h+='<h4>Effects (files)</h4><div class="dn-sndrow">'+SFXF.map(function(n){ return '<button data-f="'+n+'">'+n.replace(/_/g,' ')+'</button>'; }).join('')+'<button data-f="steps">footsteps walking</button></div>';
  h+='<h4>Effect variations the game makes</h4><div class="dn-sndrow">'+[2,3,4,5].map(function(k){ return '<button data-c="'+k+'">combo up x'+k+'</button>'; }).join('')+'</div>';
  h+='<p class="dn-cred">Music rendered with the Fluid (R3) GM SoundFont, (c) Frank Wen, MIT licence.</p></div>';
  AU.test='stop'; box.innerHTML=h; ($('dn-bdwrap').parentNode).appendChild(box);
  var now=$('dn-sndnow'), say=function(t){ now.textContent=t; };
  box.addEventListener('click',function(e){ var b=e.target.closest('button'); if(!b) return; e.stopPropagation(); auKick(); var a=AC; if(!a) return;
    if(b.id==='dn-sndclose'){ AU.test=null; auFadeOut(0.3); AU.cur=null; box.remove(); return; }
    if(b.dataset.m){ var k=b.dataset.m; auFadeOut(0.3); AU.cur=null; if(AU.sting){ try{ AU.sting.stop(); }catch(x){} AU.sting=null; } AU.test='stop'; if(k==='stop'){ say('Music stopped'); return; }
      var key=k==='ls110'?'ls':k, n=MUSF[key]; say('Loading '+n+'...');
      auBuf(n).then(function(buf){ AU.cur=null; auFadeOut(0.05); auStart(buf,k==='ls110'?110:0,!/^(ls|win|lose)$/.test(key),0.3); say('Playing '+n+' ('+buf.duration.toFixed(1)+' s'+(/^(ls|win|lose)$/.test(key)?', one-shot':', loops')+')'); },function(){ say(n+' did not load'); }); return; }
    if(b.dataset.f){ var f=b.dataset.f; if(f==='steps'){ var i=0, iv=setInterval(function(){ SND.step(); if(++i>=12) clearInterval(iv); },320); say('Footsteps (random 1-3, slight pitch change)'); return; }
      auBuf(f).then(function(){ AU.fxLast[f]=0; fxPlay(f); say('Effect: '+f); },function(){ say(f+' did not load'); }); return; }
    if(b.dataset.c){ auBuf('combo_up').then(function(){ AU.fxLast.combo_up=0; SND.combo(+b.dataset.c); say('Combo up x'+b.dataset.c); },function(){ say('combo_up did not load'); }); } });
  window.__sndtest=box; }
if(SNDTEST) addEventListener('load',function(){ try{ soundTest(); }catch(e){ console.warn(e); } });
window.__AU=AU;
