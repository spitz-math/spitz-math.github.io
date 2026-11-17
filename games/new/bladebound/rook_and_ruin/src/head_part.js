(function(){
'use strict';
var $=function(id){ return document.getElementById(id); };
var KEY='bladebound_v3';
var QS=window.SpitzQ?(window.SpitzQ.forGame('dn')||defaultSet()):null; if(QS) KEY+=QS.suffix;
var FAST=!!(QS&&QS.set==='mult');
function defaultSet(){ var set=SpitzQ.sets.slope, Q=set.make('dn'), tb=[], last='';
  return { set:'slope', name:set.name, custom:false, suffix:'',
    topicTable:function(){ var o={}; set.topics.forEach(function(t){ o[t[1]]=[0,0]; }); return o; },
    next:function(){ if(!tb.length) tb=set.topics.slice().sort(function(){ return Math.random()-0.5; });
      var t=tb.pop(), l=t[2], ty; do{ ty=l[Math.floor(Math.random()*l.length)]; }while(ty===last&&l.length>1); last=ty; var q=Q.build(ty); q.topic=t[1]; return q; } }; }
var RM=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ================= SOUND (synthesized) ================= */
var AC=null, muted=false;
function ac(){ if(!AC){ var C=window.AudioContext||window.webkitAudioContext; if(!C) return null; AC=new C(); } if(AC.state==='suspended'){ try{ var r=AC.resume(); if(r&&r.catch) r.catch(function(){}); }catch(e){} } return AC; }
function count(){ window.__snd=(window.__snd||0)+1; }
var BUS=null, VOX=[];
function bus(a){ if(!BUS){ try{ var cmp=a.createDynamicsCompressor(); cmp.threshold.value=-20; cmp.knee.value=12; cmp.ratio.value=5; cmp.attack.value=0.004; cmp.release.value=0.18; cmp.connect(auSynthOut(a)); BUS=cmp; }catch(e){ BUS=a.destination; } } return BUS; }
/* room(dur): false when too many sounds are already playing (keeps a busy horde from turning into a wall of noise) */
function room(a,dur,max){ var t=a.currentTime, n=0; for(var i=VOX.length-1;i>=0;i--){ if(VOX[i]<=t) VOX.splice(i,1); else n++; } if(n>=(max||10)) return false; VOX.push(t+dur); return true; }
var SOFT=0;   /* set while a low-priority sound is being made */
function tone(f1,f2,t0,dur,type,vol){ var a=ac(); if(!a||muted) return; if(!room(a,t0+dur,SOFT?9:22)) return; var o=a.createOscillator(), g=a.createGain(), t=a.currentTime+t0;
  o.type=type||'sine'; o.frequency.setValueAtTime(f1,t); if(f2&&f2!==f1) o.frequency.exponentialRampToValueAtTime(f2,t+dur);
  g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(vol||0.25,t+0.015); g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  o.connect(g); g.connect(bus(a)); o.start(t); o.stop(t+dur+0.03); count(); }
function noise(t0,vol,ms,hp,lp){ var a=ac(); if(!a||muted) return; if(SOFT&&!room(a,t0+(ms||35)/1000,9)) return; var n=Math.floor(a.sampleRate*(ms||35)/1000), buf=a.createBuffer(1,n,a.sampleRate), d=buf.getChannelData(0);
  for(var i=0;i<n;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/n,2);
  var s=a.createBufferSource(), f=a.createBiquadFilter(), g=a.createGain(); s.buffer=buf; f.type=lp?'lowpass':'highpass'; f.frequency.value=lp||hp||1800; g.gain.value=vol||0.5;
  s.connect(f); f.connect(g); g.connect(bus(a)); s.start(a.currentTime+t0); count(); }
function brass(f,t0,dur,vol){ var a=ac(); if(!a||muted) return; var t=a.currentTime+t0, g=a.createGain(), lp=a.createBiquadFilter(); vol=vol||0.14;
  lp.type='lowpass'; lp.frequency.setValueAtTime(900,t); lp.frequency.linearRampToValueAtTime(3200,t+0.05); lp.frequency.linearRampToValueAtTime(1700,t+dur);
  g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(vol,t+0.025); g.gain.setValueAtTime(vol,t+Math.max(0.03,dur-0.08)); g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  [-6,6].forEach(function(det){ var o=a.createOscillator(); o.type='sawtooth'; o.frequency.value=f; o.detune.value=det; o.connect(lp); o.start(t); o.stop(t+dur+0.03); });
  lp.connect(g); g.connect(bus(a)); count(); }
var C5=523.25,D5=587.33,E5=659.25,F5=698.46,G5=783.99,A5=880,C6=1046.5,D6=1174.66,E6=1318.5,A6=1760;
var lastS={};
function gate(k,ms){ var t=performance.now(); if(lastS[k]&&t-lastS[k]<ms) return false; lastS[k]=t; return true; }
var SND={
  swing:function(){ if(gate('sw',60)){ noise(0,0.05,80,0,2200); tone(340,190,0,0.08,'sine',0.03); } },
  hit:function(){ if(gate('hit',45)) tone(190,120,0,0.06,'triangle',0.07); },
  pop:function(){ if(gate('pop',50)) tone(520,820,0,0.08,'triangle',0.045); },
  gem:function(){ if(gate('gem',70)) tone(1320,1760,0,0.05,'sine',0.02); },
  hurt:function(){ tone(260,150,0,0.25,'triangle',0.17); },
  block:function(){ tone(880,660,0,0.12,'triangle',0.08); },
  torch:function(){ noise(0,0.05,160,0,1200); tone(392,523,0.02,0.18,'triangle',0.06); },
  solve:function(){ [E5,G5,C6].forEach(function(f,i){ tone(f,f,i*0.09,0.25,'triangle',0.08); }); },
  chest:function(){ [C5,E5,G5,C6,E6].forEach(function(f,i){ tone(f,f,i*0.07,0.22,'triangle',0.075); }); },
  door:function(){ noise(0,0.12,420,0,260); tone(98,82,0,0.5,'triangle',0.12); },
  bolt:function(){ if(gate('bo',90)) tone(900,1300,0,0.06,'sine',0.02); },
  zap:function(){ if(gate('zp',260)) tone(1250,1650,0,0.06,'sine',0.009); },
  orb:function(){ if(gate('ob',150)) tone(300,420,0,0.12,'sine',0.03); },
  level:function(){ [D5,F5,A5,D6].forEach(function(f,i){ tone(f,f,i*0.08,0.2,'triangle',0.08); }); },
  pick:function(){ tone(A5,A5,0,0.1,'triangle',0.08); tone(D6,D6,0.08,0.2,'triangle',0.08); },
  gold:function(){ [A5,C6,E6,A6].forEach(function(f,i){ tone(f,f,i*0.07,0.3,'triangle',0.08); }); },
  boss:function(){ brass(146.8,0,0.5,0.02); brass(174.6,0.25,0.6,0.02); },
  bossDown:function(){ [D5,F5,A5].forEach(function(f,i){ brass(f/2,i*0.12,0.3,0.1); }); brass(D5,0.4,0.9,0.12); },
  correct:function(){ tone(A5,A5,0,0.14,'sine',0.13); tone(1108.73,1108.73,0.07,0.14,'sine',0.12); tone(E6,E6,0.14,0.32,'triangle',0.1); },
  miss:function(){ tone(233,175,0.02,0.36,'triangle',0.18); },
  dodge:function(){ noise(0,0.05,120,0,900); tone(260,420,0,0.08,'sine',0.03); },
  clang:function(){ if(gate('cl',80)){ tone(1400,1100,0,0.09,'square',0.025); tone(2100,1800,0,0.06,'triangle',0.03); } },
  boom:function(){ if(gate('bm',110)){ noise(0,0.018,160,0,420); tone(110,60,0,0.16,'sine',0.03); } },
  coin:function(){ if(gate('cn',60)) { tone(1568,1568,0,0.05,'square',0.018); tone(2093,2093,0.05,0.08,'square',0.018); } },
  buy:function(){ [G5,C6,E6].forEach(function(f,i){ tone(f,f,i*0.06,0.16,'triangle',0.08); }); },
  tele:function(){ if(gate('tl',180)) tone(440,470,0,0.08,'sine',0.01); },
  btele:function(){ if(gate('bt',400)) tone(330,350,0,0.12,'sine',0.008); },
  crit:function(){ tone(900,1500,0,0.08,'triangle',0.07); noise(0,0.06,90,3000,0); },
  combo:function(m){ var f=[0,0,D5,F5,A5,D6][Math.min(5,Math.round(m))]||D5; tone(f,f,0,0.12,'triangle',0.05); tone(f*1.5,f*1.5,0.06,0.16,'triangle',0.04); },
  crack:function(){ noise(0,0.12,220,0,700); },
  tick:function(){ tone(1200,1200,0,0.05,'triangle',0.1); },
  win:function(){ var t=0.1; [D5/2,D5,F5,A5].forEach(function(f,i){ tone(f,f,t+i*0.1,0.16,'triangle',0.11); });
    [D5,F5,A5].forEach(function(f){ tone(f,f,t+0.5,1.2,'triangle',0.07); tone(f/2,f/2,t+0.5,1.2,'sine',0.06); }); tone(146.83,146.83,t+0.5,1.1,'triangle',0.2); }
};
['hit','pop','gem','zap','boom','bolt','tele','btele','coin','clang','orb'].forEach(function(k){ var f=SND[k]; SND[k]=function(){ SOFT=1; try{ f(); }finally{ SOFT=0; } }; });

/* (the synth song "Warden's Keep" was replaced by the audio pack music on 2026-11-15: see audio_part.js) */
/* ================= SPITZ KIT (games/kit.js) ================= */
var KIT=SpitzKit.game({ ac:function(){ return AC; }, muted:function(){ return muted; }, voice:function(f,t0,dur){ tone(f,f,t0,dur,'triangle',0.11); }, confetti:'dn-confetti', toast:'dn-toast', colors:['#FFC23A','#FFE07A','#E3961C','#F4ECD8','#4FE3F0','#38C8F0'] }),
  musicToggle=KIT.musicToggle, musBtn=KIT.musBtn, toast=KIT.toast, stagePoint=KIT.stagePoint;

/* ================= THE DUNGEON ================= */
var W=960, H=540, TS=30, COLS=32, ROWS=18;
var cv=$('dn-canvas'), cx=cv.getContext('2d'), HELD={};
cx.imageSmoothingEnabled=false;
function FONT(px){ return '700 '+px+'px '+getComputedStyle(document.documentElement).getPropertyValue('--display'); }
var FONTS={}; function F(px){ return FONTS[px]||(FONTS[px]=FONT(px)); }
function FB(px){ return FONTS['b'+px]||(FONTS['b'+px]=(px>=20?'800 ':'700 ')+px+'px Lexend,system-ui,sans-serif'); }
/* any words use Lexend (Kody 2026-11-15: the pixel font was still showing on all-caps warnings and banners); only bare numbers keep the pixel font */
function FT(str,px){ return /[a-zA-Z]/.test(str)?FB(px):F(px); }
function rnd(a,b){ return a+Math.random()*(b-a); }
function clamp(v,a,b){ return v<a?a:v>b?b:v; }

/* ---------- pixel sprites, drawn once ---------- */
function mk(w,h,fn){ var c=document.createElement('canvas'); c.width=w; c.height=h; var x=c.getContext('2d'); fn(x,w,h); return c; }
function white(src){ return mk(src.width,src.height,function(x){ x.drawImage(src,0,0); x.globalCompositeOperation='source-in'; x.fillStyle='#FFFFFF'; x.fillRect(0,0,src.width,src.height); }); }
function dots(x,list,col){ x.fillStyle=col; list.forEach(function(p){ x.fillRect(p[0],p[1],p[2]||1,p[3]||1); }); }
var SPR={}, GLOW=null;
function makeSprites(){
  var ART=bbMake(document);
  [['hd','hoodF'],['hd2','hoodF2'],['hs','hoodS'],['hs2','hoodS2'],['hu','hoodB'],['hu2','hoodB2'],['sword','sword'],
   ['gremlin','gremlin'],['batU','batU'],['batD','batD'],['skel','skel'],['golem','golem'],['wisp','wisp'],['king','king']].forEach(function(m){ SPR[m[0]]=ART[m[1]]; SPR[m[0]+'W']=ART[m[1]+'_w']; });
  SPR.chest=mk(16,14,function(x){ dots(x,[[1,4,14,9]],'#2A1608'); dots(x,[[2,5,12,7]],'#A0612B'); dots(x,[[2,5,12,1]],'#C98447'); dots(x,[[2,8,12,1]],'#5E3412');
    dots(x,[[2,5,1,7],[13,5,1,7]],'#FFC93C'); dots(x,[[7,7,2,3]],'#FFC93C'); dots(x,[[7,8,2,1]],'#5E3412'); });
  SPR.chestO=mk(16,14,function(x){ dots(x,[[1,6,14,7]],'#2A1608'); dots(x,[[2,7,12,5]],'#A0612B'); dots(x,[[2,7,12,1]],'#FFE08A'); dots(x,[[2,1,12,4]],'#5E3412'); dots(x,[[2,1,12,1]],'#C98447');
    dots(x,[[2,7,1,5],[13,7,1,5]],'#FFC93C'); });
  SPR.heart=mk(9,8,function(x){ var m=['.XX...XX.','XRRX.XRRX','XRWRXRRRX','XRRRRRRRX','.XRRRRRX.','..XRRRX..','...XRX...','....X....'];
    m.forEach(function(r,j){ for(var i=0;i<9;i++){ var ch=r[i]; if(ch==='.') continue; x.fillStyle=ch==='X'?'#2A0A12':ch==='W'?'#FFD0D8':'#FF4B6B'; x.fillRect(i,j,1,1); } }); });
  SPR.heartE=mk(9,8,function(x){ var m=['.XX...XX.','XEEX.XEEX','XEEEXEEEX','XEEEEEEEX','.XEEEEEX.','..XEEEX..','...XEX...','....X....'];
    m.forEach(function(r,j){ for(var i=0;i<9;i++){ var ch=r[i]; if(ch==='.') continue; x.fillStyle=ch==='X'?'#2A0A12':'#3A2440'; x.fillRect(i,j,1,1); } }); });
  /* Second Wind v3 (ChatGPT via Sprite Drop, 2026-11-15, sha256 50b160d5...; art/second_wind_v3/): exact pixels, cell 0 = shop charm (whole 32x32 cell), cell 1 = HUD heart 9x8. Made by art/second_wind_v3/make_js.py */
  var SWP={A:'#130C1B',B:'#FFF9F0',C:'#F0E8EA',D:'#8DF7FB',E:'#3CEBFF',F:'#2ED8E7',G:'#F1FFFC',H:'#9E8BA0',I:'#D6CAD7',J:'#058092',K:'#075B6F'}, swDraw=function(x,m,ox,oy){ m.forEach(function(r,j){ for(var i=0;i<r.length;i++){ var ch=r[i]; if(ch==='.') continue; x.fillStyle=SWP[ch]; x.fillRect(ox+i,oy+j,1,1); } }); };
  SPR.rev=mk(9,8,function(x){ swDraw(x,['.AA..AA..','ADDA.AFAA','ADGDAFFFA','.AGEEJJA.','.AEEEJJA.','..AEEJA..','...AEA...','....A....'],0,0); });
  SPR.revShop=mk(32,32,function(x){ swDraw(x,['................................','................................','................................','..AAA......................AAA..','..AAA......................AAA..','..ABB....AAAAA....AAAAA....BBA..','..ACCA.AADDDDEA..AFFFFFAA.ACCA..','..ACCA.AADDDDEA..AFFFFFAA.ACCA..','..ACCB.AADDGGDEAAFFFFFFAA.BCCA..','...AACADDDGGGEEEEFFFFFFFFACAA...','...AACADDDGGGEEEEFFFFFFFFACAA...','..AAAHADDDDDDEGEEFFFFFFFFAHAAA..','..AIIACAAEEEEDDEEFFFFFFFFAAIIA..','..AIIACAAEEEEDDEEFFFFFFFFAAIIA..','..ABBIHAAEEEEEEEEFFJJJJAAHIBBA..','..AIIBIIIAFFFFFFFJJJJKAIIIBIIA..','..AIIBIIIAFFFFFFFJJJJKAIIIBIIA..','...AAIBIIIAFFFFFFJJJJAIIIBIAA...','...AAHIIIAAAAFFFFJJAAAAIIIHAA...','...AAHIIIAAAAFFFFJJAAAAIIIHAA...','.....AAAACCAAAFFFKAAACCAAAA.....','.....ACBBCCCCCAFFACCCCCBBCA.....','.....ACBBCCCCCAFFACCCCCBBCA.....','......ACCHCAAA.AA.AAACHCCA......','......AAAAA..........AAAAA......','......AAAAA..........AAAAA......','................................','................................','................................','................................','................................','................................'],0,0); });
  /* Falling rubble v1 (ChatGPT via Task Drop task dea2ac39 / Sprite Drop asset 78e5837d, 2026-11-15, sha256 93eeebc4...; art/falling_rubble_v1/): exact pixels, two 24x24 rocks. Made by art/falling_rubble_v1/make_js.py */
  var RBP={A:'#12101D',B:'#9D9FBF',C:'#565C7E',D:'#3A3F55',E:'#6E76A4'}, rbDraw=function(x,m){ m.forEach(function(r,j){ for(var i=0;i<r.length;i++){ var ch=r[i]; if(ch==='.') continue; x.fillStyle=RBP[ch]; x.fillRect(i,j,1,1); } }); };
  SPR.rubble=[mk(24,24,function(x){ rbDraw(x,['........................','..............AAAAA.....','...AAABBBBBBBBBBBBBA....','...ABBBBBBBBBBBBBBCAA...','..ABBBBBBBBBBBBBCCCCA...','.AABBBBBBBBBBBCCCCCDA...','.ABBBBBBBBCCCCCCCCDA....','.ADCCCCCCCCCCCCCDDDA....','.ADCCCCCCCCCCCCDDDD.....','.ADCCCCCCCCCCCCDEAA.....','.ADCCCCCCCCCCCCCEEE.....','.ADCCCCCCCCCCCCCCEEEAA..','.ADDCCCCCCCCCCCCCCEEEAA.','.ADDCCCCCCCCCCCCCCCDDDA.','.ADDDDDDDDDCCCCCCCDDDA..','.ADDDDDDDDDDDDCCCCDDAA..','.ADDDDDDDDDDDDDDDDDDA...','.AEEEEEEEEDEECCCDDDA....','.ADDDDDDDDDCCCCCDDAA....','.ADDDDDDDDDCCCCCCAAA....','.ADDDDDDDDDCCCCCCCEEE...','..AADDDDDDDCCCDDDDDAA...','...AAAAAAAAAAAAAAAAA....','........................']); }),mk(24,24,function(x){ rbDraw(x,['........................','...........AAAA.........','.........AABBBCA........','.......AABBBBBCAAA......','....ABBBBBBBBBCCCA......','...AABBBBBBBBCCCCA......','..ABBBBBBBBCCCCCA.......','..ABBBBBBCCCCCCDD.......','.ABBBBBCCCCCCCCDDAA.....','.ACCCCCCCCCCCCCDABBAA...','.ADDCCCCCCCCCDDDABBBAA..','.ADDDCCCCCCCDDDAABBBBA..','.AADDCCCCCCDAAABBBBBCCA.','...DDDDDDDDAAEEEEBBBCCA.','...AECCCADAACEECCCCCCCA.','..AEEEEEEAAACCCCCCCCCAA.','.AAEEEEEBBBACCCCCCCCCA..','.AEEEEEEECCCDDDCCCCCAA..','.ACDDDECCCCCDDDCCDDA....','.AADDDDCCCCCDDDCCDDA....','..ADDDDCCCAA.AADDDA.....','...AADDDDCA...AAAAA.....','....AAAA................','........................']); })];
  /* Merchant speech bubble v1 (ChatGPT via Task Drop task ec41f295 / Sprite Drop asset 22a89043, 2026-11-16, sha256 9b46014a...; art/merchant_bubble_v1/): exact pixels, 8x8 cells: 0-8 = 9-slice frame (TL,T,TR,L,C,R,BL,B,BR), 9 = tail pointing down. Made by art/merchant_bubble_v1/make_js.py */
  var BBP={A:'#12101D',B:'#D9C7A0',C:'#FFC23A',D:'#A88B5E',E:'#E3961C',F:'#F4ECD8'}, bbDraw=function(x,m){ m.forEach(function(r,j){ for(var i=0;i<r.length;i++){ var ch=r[i]; if(ch==='.') continue; x.fillStyle=BBP[ch]; x.fillRect(i,j,1,1); } }); };
  SPR.bubble=[mk(8,8,function(x){ bbDraw(x,['...AAAAA','.AABBBBB','ABBCBBBB','ABDEBFFF','ABBBFFFF','ABBFFFFF','ABBFFFFF','ABBFFFFF']); }),mk(8,8,function(x){ bbDraw(x,['AAAAAAAA','BBBBBBBB','BBBBBBBB','FFFFFFFF','FFFFFFFF','FFFFFFFF','FFFFFFFF','FFFFFFFF']); }),mk(8,8,function(x){ bbDraw(x,['AAAAAAA.','BBBBDDDA','BBBBDCDA','FFFBDEDA','FFFFDDDA','FFFFFDDA','FFFFFDDA','FFFFFDDA']); }),mk(8,8,function(x){ bbDraw(x,['ABBFFFFF','ABBFFFFF','ABBFFFFF','ABBFFFFF','ABBFFFFF','ABBFFFFF','ABBFFFFF','ABBFFFFF']); }),mk(8,8,function(x){ bbDraw(x,['FFFFFFFF','FFFFFFFF','FFFFFFFF','FFFFFFFF','FFFFFFFF','FFFFFFFF','FFFFFFFF','FFFFFFFF']); }),mk(8,8,function(x){ bbDraw(x,['FFFFFDDA','FFFFFDDA','FFFFFDDA','FFFFFDDA','FFFFFDDA','FFFFFDDA','FFFFFDDA','FFFFFDDA']); }),mk(8,8,function(x){ bbDraw(x,['ABBFFFFF','ABBFFFFF','ABBFFFFF','ABBBFFFF','ABBCBFFF','ADDEDDDD','AADDDDDD','..AAAAAA']); }),mk(8,8,function(x){ bbDraw(x,['FFFFFFFF','FFFFFFFF','FFFFFFFF','FFFFFFFF','FFFFFFFF','DDDDDDDD','DDDDDDDD','AAAAAAAA']); }),mk(8,8,function(x){ bbDraw(x,['FFFFFDDA','FFFFFDDA','FFFFFDDA','FFFFDDDA','FFFDCCDA','DDDDEEDA','DDDDDDA.','AAAAAAA.']); }),mk(8,8,function(x){ bbDraw(x,['........','.AAAAAA.','..AFFA..','...ABA..','...AA...','........','........','........']); })];
  SPR.gem=mk(6,8,function(x){ dots(x,[[2,0,2,1],[1,1,4,1],[0,2,6,3],[1,5,4,1],[2,6,2,1]],'#38C8F0'); dots(x,[[1,2,2,2],[2,1,1,1]],'#D6FBFF'); dots(x,[[3,4,2,2]],'#1784C4'); });
  SPR.gemB=mk(6,8,function(x){ dots(x,[[2,0,2,1],[1,1,4,1],[0,2,6,3],[1,5,4,1],[2,6,2,1]],'#FFC93C'); dots(x,[[1,2,2,2],[2,1,1,1]],'#FFF2C2'); dots(x,[[3,4,2,2]],'#C98A12'); });
  if(window.PX){ var walkF=function(src,side){ return mk(src.width,src.height,function(x){ var h=src.height; x.drawImage(src,0,0);
      if(side){ x.clearRect(0,h-4,src.width,4); x.drawImage(src,0,h-4,src.width,4,2,h-5,src.width,4); }
      else { var hf=Math.floor(src.width/2); x.clearRect(0,h-4,hf,4); x.drawImage(src,0,h-4,hf,4,0,h-5,hf,4); } }); };
    SPR.hd=PX.rookF; SPR.hd2=walkF(PX.rookF); SPR.hs=PX.rookS; SPR.hs2=walkF(PX.rookS,1); SPR.hu=PX.rookB; SPR.hu2=walkF(PX.rookB);
    [['gremlin','goblin'],['batU','bat'],['skel','skel'],['wisp','wizard'],['king','boss']].forEach(function(m){ SPR[m[0]]=PX[m[1]]; SPR[m[0]+'W']=white(PX[m[1]]); });
    SPR.batD=mk(PX.bat.width,PX.bat.height,function(x){ x.drawImage(PX.bat,0,0,PX.bat.width,5,0,2,PX.bat.width,4); x.drawImage(PX.bat,0,5,PX.bat.width,PX.bat.height-5,0,5,PX.bat.width,PX.bat.height-5); }); SPR.batDW=white(SPR.batD); }
  SPR.coin=mk(6,6,function(x){ dots(x,[[1,0,4,1],[0,1,6,4],[1,5,4,1]],'#8A5A12'); dots(x,[[1,1,4,4]],'#FFC93C'); dots(x,[[2,1,1,2]],'#FFF2C2'); });
  if(window.PX){ SPR.slime=PX.slime; SPR.slimeW=white(PX.slime); }
  GLOW=mk(120,120,function(x){ var g=x.createRadialGradient(60,60,2,60,60,60); g.addColorStop(0,'rgba(255,170,80,.38)'); g.addColorStop(1,'rgba(255,170,80,0)'); x.fillStyle=g; x.fillRect(0,0,120,120); });
}

/* ---------- rooms ---------- */
/* tiles: 0 floor, 1 wall, 2 pillar, 3 north door, 4 torch, 5 plate, 6 side door (hall only, open) */
var MAP=new Uint8Array(COLS*ROWS), ROOMC=null;
function tset(x,y,v){ MAP[y*COLS+x]=v; }
function tget(x,y){ if(x<0||y<0||x>=COLS||y>=ROWS) return 1; return MAP[y*COLS+x]; }
function pillar(x,y){ tset(x,y,2); tset(x+1,y,2); tset(x,y+1,2); tset(x+1,y+1,2); }
var ROOMRECTS=null, ROOMART=null, FLR=[30,30,930,510];   /* FLR = the walkable floor box of the current room, in px */
function inR(x,y,r){ return x>=r[0]&&x<r[2]&&y>=r[1]&&y<r[3]; }
/* ---------- art rooms: every room is drawn from the Entry Hall kit (rooms_art.js), native 480x270 shown 2x ---------- */
var KIMG={}, KP={}, KMAP={start:'entry',guard:'guard',crossr:'cross',vault:'vault',arena:'arena',library:'library',shop:'shop',siege:'siege',bossroom:'boss'};
(function(){ if(!window.KROOMS) return; Object.keys(KROOMS).forEach(function(n){ var im=new Image(); im.src=KROOMS[n].src; KIMG[n]=im; }); Object.keys(KPATCH).forEach(function(n){ var im=new Image(); im.src=KPATCH[n]; KP[n]=im; }); })();
function artReady(){ return Object.keys(KIMG).every(function(n){ return KIMG[n].complete&&KIMG[n].naturalWidth; })&&Object.keys(KP).every(function(n){ return KP[n].complete&&KP[n].naturalWidth; }); }
var DOORN=[456,506], DOORS=[260,332];   /* north door opening (x range) and side door opening (y range), px */
function secretX(){ return (S.w.secL?98:382)*2; }
function buildArtRoom(K){ var d=KROOMS[K], Z=2, fl=d.floor.map(function(v){ return v*Z; }), x, y, w=S.w, R=ROOMS[w.rid]||{}, ex=R.exits||{};
  /* side doors only exist where they lead somewhere: a real exit, or the door Rook just came in through */
  var dw=ex.w?2:(w.from==='e'?1:0), de=ex.e?2:(w.from==='w'?1:0), dn=d.arch?(ex.n||R.boss?2:1):0;
  FLR=fl; ROOMART={key:K,floor:fl,n:dn,w:dw,e:de,south:d.south&&w.from!=='w'&&w.from!=='e',torches:d.torches.map(function(t){ return [t[0]*Z,t[1]*Z]; })};
  var obs=d.rects.map(function(r){ return r.map(function(v){ return v*Z; }); });
  ROOMRECTS=[[0,fl[3],W,H]];
  if(dw) ROOMRECTS.push([0,0,fl[0],DOORS[0]],[0,DOORS[1],fl[0],H],[0,DOORS[0],fl[0],DOORS[1],dw===2?1:0]); else ROOMRECTS.push([0,0,fl[0],H]);
  if(de) ROOMRECTS.push([fl[2],0,W,DOORS[0]],[fl[2],DOORS[1],W,H],[fl[2],DOORS[0],W,DOORS[1],de===2?1:0]); else ROOMRECTS.push([fl[2],0,W,H]);
  if(dn) ROOMRECTS.push([0,0,DOORN[0],fl[1]],[DOORN[1],0,W,fl[1]],[DOORN[0],0,DOORN[1],fl[1],dn===2&&ex.n?1:0]); else ROOMRECTS.push([0,0,W,fl[1]]);
  ROOMRECTS=ROOMRECTS.concat(obs);
  for(y=0;y<ROWS;y++) for(x=0;x<COLS;x++){ var X0=x*TS, Y0=y*TS, cxm=X0+TS/2, cym=Y0+TS/2, v=0;
    if(X0+TS<=fl[0]||X0>=fl[2]||Y0+TS<=fl[1]||Y0>=fl[3]) v=1; else if(!inR(cxm,cym,fl)) v=7; else if(obs.some(function(r){ return inR(cxm,cym,[r[0]-6,r[1]-6,r[2]+6,r[3]+6]); })) v=7;
    if(ex.n&&dn&&cxm>DOORN[0]-15&&cxm<DOORN[1]+15&&cym<fl[1]) v=3;
    if(ex.w&&x===0&&cym>DOORS[0]-15&&cym<DOORS[1]+15) v=9;
    if(ex.e&&x===COLS-1&&cym>DOORS[0]-15&&cym<DOORS[1]+15) v=10;
    MAP[y*COLS+x]=v; }
  ROOMC=mk(W,H,function(c){ c.imageSmoothingEnabled=false; c.drawImage(KIMG[K],0,0,W,H);
    if(dw) c.drawImage(KP.doorw,0,126*Z,27*Z,44*Z); if(de) c.drawImage(KP.doore,453*Z,126*Z,27*Z,44*Z);
    if(R.secret){ var sx=secretX();
      if(w.secretOpen){ c.drawImage(KP.alcove,sx-64,8,128,86); c.fillStyle='#3A3350'; [[-70,84,8,6],[-52,88,6,4],[58,86,8,5],[40,89,5,3]].forEach(function(q){ c.fillRect(sx+q[0],q[1],q[2],q[3]); }); }
      else { c.globalAlpha=0.5; c.fillStyle='#1B1626'; [[-2,40,2,10],[0,50,2,8],[2,58,2,6],[-4,64,2,8],[0,72,2,10],[4,62,4,2]].forEach(function(q){ c.fillRect(sx+q[0],q[1],q[2],q[3]); }); c.globalAlpha=1; } }
    if(VIG) c.drawImage(VIG,0,0); }); }
function buildMap(kind){ var x,y; ROOMRECTS=null; ROOMART=null; FLR=[30,30,930,510];
  if(KMAP[kind]&&KIMG[KMAP[kind]]&&artReady()){ buildArtRoom(KMAP[kind]); return; }
  for(y=0;y<ROWS;y++) for(x=0;x<COLS;x++) MAP[y*COLS+x]=(x===0||y===0||x===COLS-1||y===ROWS-1)?1:0;
  var R=ROOMS[S.w.rid]||{}, ex=R.exits||{};
  if(ex.n) { tset(15,0,3); tset(16,0,3); }
  if(ex.w) { tset(0,8,9); tset(0,9,9); }
  if(ex.e) { tset(COLS-1,8,10); tset(COLS-1,9,10); }
  if(kind==='guard'){ pillar(8,5); pillar(22,5); pillar(8,11); pillar(22,11); }
  else if(kind==='crossr'){ pillar(6,4); pillar(24,4); pillar(6,12); pillar(24,12); pillar(15,8); }
  else if(kind==='vault'){ pillar(9,6); pillar(21,6); pillar(9,10); pillar(21,10); }
  else if(kind==='arena'){ [5,11,19,25].forEach(function(px){ pillar(px,3); pillar(px,13); }); }
  else if(kind==='library'){ for(x=4;x<=10;x++){ tset(x,5,2); tset(x,12,2); } for(x=21;x<=27;x++){ tset(x,5,2); tset(x,12,2); }
    /* two thick wall blocks in the top corners look the same; one hides the secret room */
    for(y=1;y<=4;y++) for(x=25;x<=30;x++){ tset(x,y,1); tset(31-x,y,1); }
    var sx0=S.w.secL?1:25; tset(sx0+2,4,8); tset(sx0+3,4,8); if(S.w.secretOpen) openSecret(true); }
  else if(kind==='shop'){ pillar(6,4); pillar(24,4); }
  else if(kind==='siege'){ pillar(7,4); pillar(23,4); pillar(7,12); pillar(23,12); }
  else if(kind==='bossroom'){ pillar(4,3); pillar(26,3); pillar(4,13); pillar(26,13); }
  if(kind==='start'){ pillar(7,5); pillar(23,5); pillar(7,11); pillar(23,11); }
  else if(kind==='pillars'){ [6,12,18,24].forEach(function(px){ pillar(px,4); pillar(px,12); }); pillar(3,8); pillar(27,8); }
  else if(kind==='torch'){ tset(4,3,4); tset(27,3,4); tset(4,14,4); tset(27,14,4); pillar(11,8); pillar(19,8); }
  else if(kind==='block'){ tset(21,9,5); pillar(6,4); pillar(24,4); pillar(6,12); pillar(24,12); for(x=10;x<=12;x++) tset(x,5,2); for(x=19;x<=21;x++) tset(x,13,2); }
  else if(kind==='cross'){ for(x=9;x<=22;x++){ if(x<14||x>17) tset(x,8,2); } for(y=4;y<=13;y++){ if(y<7||y>10) tset(15,y,2),tset(16,y,2); } }
  else if(kind==='boss'){ pillar(5,4); pillar(25,4); pillar(5,12); pillar(25,12); }
  else if(kind==='hall'){ tset(15,0,6); tset(16,0,6); tset(15,ROWS-1,6); tset(16,ROWS-1,6); tset(0,8,6); tset(0,9,6); tset(COLS-1,8,6); tset(COLS-1,9,6); pillar(8,5); pillar(22,5); pillar(8,11); pillar(22,11); }
  ROOMC=drawRoom(kind); }
function seeded(s){ return function(){ s=(s*16807)%2147483647; return (s&0xffff)/0xffff; }; }
function drawRoom(kind){ var r=seeded(kind.length*977+31);
  return mk(W,H,function(x){ var i,j,X,Y,t;
    /* floor: castle flagstones */
    for(j=0;j<ROWS;j++) for(i=0;i<COLS;i++){ t=tget(i,j); X=i*TS; Y=j*TS; if(t===6){ x.fillStyle='#04050B'; x.fillRect(X,Y,TS,TS); continue; } if(t===1) continue;
      var v=r(); x.fillStyle=v<0.33?'#30365A':v<0.66?'#2B3152':'#353C62'; x.fillRect(X,Y,TS,TS);
      x.fillStyle='#1D2139'; x.fillRect(X,Y+TS-1,TS,1); x.fillRect(X+TS-1,Y,1,TS);
      x.fillStyle='rgba(255,255,255,.05)'; x.fillRect(X,Y,TS-1,1); x.fillRect(X,Y,1,TS-1);
      if(r()<0.10){ x.fillStyle='#1D2139'; var a=4+Math.floor(r()*16), b=4+Math.floor(r()*16); x.fillRect(X+a,Y+b,3,1); x.fillRect(X+a+2,Y+b+1,2,1); x.fillRect(X+a+3,Y+b+2,1,2); }
      if(r()<0.04){ x.fillStyle='#3F6E2A'; x.fillRect(X+6+Math.floor(r()*14),Y+8+Math.floor(r()*12),3,2); } }
    /* a royal carpet up the middle of the open rooms */
    if(kind==='guard'||kind==='bossroom'||kind==='shop'){ var cx0=15*TS+5, cw=2*TS-10, cy0=TS, chh=(ROWS-2)*TS;
      x.fillStyle='#7A1F33'; x.fillRect(cx0,cy0,cw,chh); x.fillStyle='#C98A12'; x.fillRect(cx0+2,cy0,2,chh); x.fillRect(cx0+cw-4,cy0,2,chh);
      x.fillStyle='#932A42'; for(var q=cy0+10;q<cy0+chh-10;q+=30){ var mc=cx0+cw/2; [2,6,10,6,2].forEach(function(wd,n){ x.fillRect(mc-wd/2,q+4+n*2,wd,2); }); } }
    /* walls: big castle blocks */
    for(j=0;j<ROWS;j++) for(i=0;i<COLS;i++){ var tw=tget(i,j); if(tw!==1&&tw!==8) continue; X=i*TS; Y=j*TS; var top=(j===0);
      x.fillStyle='#262A44'; x.fillRect(X,Y,TS,TS); x.fillStyle=top?'#3D4263':'#474D72';
      var off=((i+j)%2)*15; x.fillRect(X+1,Y+1,(off?14:28),13); if(off) x.fillRect(X+16,Y+1,13,13); x.fillRect(X+1,Y+16,(off?28:14),13); if(!off) x.fillRect(X+16,Y+16,13,13);
      x.fillStyle=top?'#4A5078':'#5A6190'; x.fillRect(X+1,Y+1,28,2); x.fillRect(X+1,Y+16,28,2);
      if(tw===8){ x.globalAlpha=0.35; x.fillStyle='#14172A'; [[13,14,1,5],[14,18,3,1],[16,19,1,4]].forEach(function(q){ x.fillRect(X+q[0],Y+q[1],q[2],q[3]); }); x.globalAlpha=1; }
      else if(r()<0.08){ x.fillStyle='#3F6E2A'; x.fillRect(X+3+Math.floor(r()*20),Y+12,5,3); } }
    /* shadows where the floor meets a wall */
    for(j=0;j<ROWS;j++) for(i=0;i<COLS;i++){ X=i*TS; Y=j*TS; t=tget(i,j); if(t!==0&&t!==5) continue;
      if(tget(i,j-1)===1){ x.fillStyle='rgba(0,0,0,.38)'; x.fillRect(X,Y,TS,9); }
      if(tget(i-1,j)===1){ x.fillStyle='rgba(0,0,0,.22)'; x.fillRect(X,Y,6,TS); } }
    /* pillars and torch stands */
    for(j=0;j<ROWS;j++) for(i=0;i<COLS;i++){ t=tget(i,j); X=i*TS; Y=j*TS;
      if(t===2){ x.fillStyle='rgba(0,0,0,.4)'; x.fillRect(X+4,Y+7,TS,TS); x.fillStyle='#565C80'; x.fillRect(X,Y,TS,TS);
        x.fillStyle='#7C84B0'; x.fillRect(X,Y,TS,6); x.fillStyle='#3B4062'; x.fillRect(X,Y+TS-5,TS,5);
        x.fillStyle='#484E70'; x.fillRect(X+9,Y+6,2,TS-11); x.fillRect(X+19,Y+6,2,TS-11);
        if(tget(i+1,j)!==2){ x.fillStyle='#3B4062'; x.fillRect(X+TS-3,Y,3,TS); } if(tget(i-1,j)!==2){ x.fillStyle='#8A92BE'; x.fillRect(X,Y,2,TS-5); } }
      if(t===4){ x.fillStyle='rgba(0,0,0,.4)'; x.fillRect(X+6,Y+10,22,20); x.fillStyle='#565C80'; x.fillRect(X+10,Y+14,10,14); x.fillStyle='#3B4062'; x.fillRect(X+7,Y+25,16,4);
        x.fillStyle='#7C84B0'; x.fillRect(X+4,Y+8,22,7); x.fillStyle='#1A1F38'; x.fillRect(X+7,Y+9,16,4); } }
    if(VIG) x.drawImage(VIG,0,0);
  }); }
/* ---------- text and effect sprites, drawn once ----------
   Canvas text and anti-aliased circles are the slow part of a busy frame on a Chromebook, so every label, number and
   repeating effect is rendered to a small sprite the first time it is needed and blitted after that. */
var TXC={}, TXN=0;
function tspr(str,px,col,ol){ var k=px+'|'+col+'|'+(ol||'')+'|'+str, s=TXC[k]; if(s) return s; if(TXN>600){ TXC={}; TXN=0; } TXN++;
  var fo=FT(str,px); cx.font=fo; var tw=Math.ceil(cx.measureText(str).width), pad=ol?3:1, by=Math.round(px*1.02)+pad;
  s=mk(tw+pad*2,Math.ceil(px*1.36)+pad*2,function(x){ x.font=fo; x.textBaseline='alphabetic';
    if(ol){ x.fillStyle=ol; for(var a=-2;a<=2;a+=2) for(var b=-2;b<=2;b+=2) if(a||b) x.fillText(str,pad+a,by+b); }
    x.fillStyle=col; x.fillText(str,pad,by); });
  s.by=by; s.pad=pad; TXC[k]=s; return s; }
/* draw cached text. al: 'left' | 'right' | 'center' (default). ol: outline colour (optional) */
function dtx(c,str,x,y,px,col,al,ol){ var s=tspr(String(str),px,col,ol); c.drawImage(s,Math.round(al==='left'?x-s.pad:al==='right'?x-s.width+s.pad:x-s.width/2),Math.round(y-s.by)); }
function textFlush(){ TXC={}; TXN=0; FONTS={}; }
if(document.fonts){ if(document.fonts.ready) document.fonts.ready.then(textFlush); if(document.fonts.addEventListener) document.fonts.addEventListener('loadingdone',textFlush); }
var FX={};
function ringSpr(r,lw,col,dash){ var s=r*2+lw*2+2; return mk(s,s,function(x){ x.strokeStyle=col; x.lineWidth=lw; if(dash) x.setLineDash(dash); x.beginPath(); x.arc(s/2,s/2,r,0,6.2832); x.stroke(); }); }
function discSpr(r,col){ var s=r*2+2; return mk(s,s,function(x){ x.fillStyle=col; x.beginPath(); x.arc(s/2,s/2,r,0,6.2832); x.fill(); }); }
function makeFx(){ var i;
  /* spawn warning: a dashed ring, 4 frames of rotation */
  FX.spawn=[]; for(i=0;i<4;i++) (function(i){ FX.spawn.push(mk(48,48,function(x){ x.translate(24,24); x.rotate(i*0.39); x.strokeStyle='rgba(255,90,140,.85)'; x.lineWidth=2; x.setLineDash([9,6.7]); x.beginPath(); x.arc(0,0,19,0,6.2832); x.stroke(); x.fillStyle='rgba(255,90,140,.16)'; x.beginPath(); x.arc(0,0,17,0,6.2832); x.fill(); })); })(i);
  FX.orb=mk(24,24,function(x){ x.fillStyle='rgba(181,107,255,.4)'; x.beginPath(); x.arc(12,12,10,0,7); x.fill(); x.fillStyle='#F2DBFF'; x.beginPath(); x.arc(12,12,5,0,7); x.fill(); });
  FX.orbR=mk(24,24,function(x){ x.fillStyle='rgba(125,245,255,.35)'; x.beginPath(); x.arc(12,12,10,0,7); x.fill(); x.fillStyle='#E8FFFF'; x.beginPath(); x.arc(12,12,5,0,7); x.fill(); });
  FX.rico=mk(16,16,function(x){ x.fillStyle='#5AA8FF'; x.beginPath(); x.arc(8,8,7,0,7); x.fill(); x.fillStyle='#FFFFFF'; x.fillRect(6,5,2,2); });
  FX.shard=mk(10,10,function(x){ x.fillStyle='#FFB15A'; x.beginPath(); x.arc(5,5,4,0,7); x.fill(); x.fillStyle='#FFFFFF'; x.fillRect(3,2,2,2); });
  /* explosion: 6 frames at radius 64, drawn scaled to the blast radius */
  FX.boom=[]; for(i=0;i<6;i++) (function(k){ FX.boom.push(mk(132,132,function(x){ var r=64*(0.5+0.5*k); x.fillStyle='rgba(255,170,60,'+(0.45*(1-k))+')'; x.beginPath(); x.arc(66,66,r,0,7); x.fill(); x.strokeStyle='rgba(255,230,160,'+(1-k)+')'; x.lineWidth=3; x.stroke(); })); })(i/6);
  FX.warnRing=ringSpr(44,2,'rgba(255,90,90,.75)'); FX.warnDisc=discSpr(44,'rgba(255,60,80,1)');
  /* sword waves: a crescent at 16 angles, in the three colours waves come in */
  FX.wave={}; [['c','rgba(140,230,255,.9)',17,5],['g','rgba(255,214,90,.9)',17,5],['s','rgba(140,230,255,.8)',11,3]].forEach(function(q){ var arr=[]; for(var a=0;a<16;a++) (function(a){ arr.push(mk(48,48,function(x){ var an=a*Math.PI/8; x.strokeStyle=q[1]; x.lineWidth=q[3]; x.beginPath(); x.arc(24-Math.cos(an)*q[2]*0.6,24-Math.sin(an)*q[2]*0.6,q[2],an-1,an+1); x.stroke(); })); })(a); FX.wave[q[0]]=arr; });
  FX.star=mk(24,24,function(x){ x.fillStyle='#FFFFFF'; x.fillRect(10,0,4,24); x.fillRect(0,10,24,4); x.fillStyle='rgba(255,255,255,.6)'; x.fillRect(6,6,12,12); });
  FX.puff=discSpr(28,'rgba(181,107,255,1)'); FX.wizGlow=discSpr(23,'rgba(181,107,255,.35)');
  /* kill pop: 4 frames of a pixel burst */
  FX.pop=[]; for(i=0;i<4;i++) (function(k){ FX.pop.push(mk(40,40,function(x){ var r=6+k*4, al=1-k*0.22; x.fillStyle='rgba(255,255,255,'+al+')'; for(var a=0;a<8;a++){ var an=a*Math.PI/4, s=k<2?4:2; x.fillRect(Math.round(20+Math.cos(an)*r)-s/2,Math.round(20+Math.sin(an)*r)-s/2,s,s); } if(k===0){ x.fillRect(16,16,8,8); } })); })(i);
  /* a soft ring under Rook so he is easy to find in a crowd */
  FX.crown=mk(14,10,function(x){ x.fillStyle='#3A2408'; x.fillRect(0,2,14,8); x.fillRect(0,0,2,4); x.fillRect(6,0,2,4); x.fillRect(12,0,2,4); x.fillStyle='#FFC93C'; x.fillRect(1,5,12,4); x.fillRect(1,2,2,4); x.fillRect(6,1,2,5); x.fillRect(11,2,2,4); x.fillStyle='#FFF3B0'; x.fillRect(2,6,10,1); x.fillStyle='#FF5A6E'; x.fillRect(6,7,2,1); });
  FX.halo=mk(44,20,function(x){ x.strokeStyle='rgba(125,245,255,.9)'; x.lineWidth=2; x.beginPath(); x.ellipse(22,10,19,7,0,0,6.2832); x.stroke(); });
  FX.elite=mk(44,20,function(x){ x.strokeStyle='rgba(255,201,60,.95)'; x.lineWidth=2; x.beginPath(); x.ellipse(22,10,19,7,0,0,6.2832); x.stroke(); x.fillStyle='rgba(255,120,40,.3)'; x.fill(); });
  /* pickups at screen size (no per-frame scaling) */
  ['gem','gemB','coin','heart','heartE','rev'].forEach(function(n){ var im=SPR[n]; SPR[n+'2']=mk(im.width*2,im.height*2,function(x){ x.imageSmoothingEnabled=false; x.drawImage(im,0,0,im.width*2,im.height*2); }); }); }
function dotLine(c,x,y,ux,uy,len,gap,sz){ var h=sz>>1; for(var q=gap;q<=len;q+=gap) c.fillRect(Math.round(x+ux*q)-h,Math.round(y+uy*q)-h,sz,sz); }
/* explosions, cached per blast radius: 5 frames each */
var BOOMC={};
function boomSpr(r){ r=Math.round(r/2)*2; var b=BOOMC[r]; if(b) return b; b=[]; var s=r*2+8; for(var i=0;i<5;i++) (function(k){ b.push(mk(s,s,function(x){ var rr=r*(0.5+0.5*k); x.fillStyle='rgba(255,170,60,'+(0.45*(1-k))+')'; x.beginPath(); x.arc(s/2,s/2,rr,0,7); x.fill(); x.strokeStyle='rgba(255,230,160,'+(1-k)+')'; x.lineWidth=3; x.stroke(); })); })(i/5+0.1); b.h=s/2; BOOMC[r]=b; return b; }
var VIG=null;
function makeVig(){ VIG=mk(W,H,function(x){ var g=x.createRadialGradient(W/2,H/2,H*0.35,W/2,H/2,W*0.62); g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(1,'rgba(0,0,0,.42)'); x.fillStyle=g; x.fillRect(0,0,W,H); }); }

