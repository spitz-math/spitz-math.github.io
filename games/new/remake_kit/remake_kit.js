/* ================= SPITZ REMAKE KIT (games/new/remake_kit/remake_kit.js) =================
   The pieces every remade Spitz Arcade game was rebuilding by hand (Star Swarm HD, Football Buds BLITZ, Jump Man, Burger Blaster,
   Rook & Ruin), pulled into one file on 2026-11-26. It sits ON TOP of games/kit.js (music, confetti, the F hint, the controls card,
   the end-screen count-up) and adds four things:

     RK.title({...})   the title screen: Back to Arcade top left, no "Spitz Arcade" header, name box, Start, controls as pixel keys
     RK.hud({...})     a box-free HUD: survival on the left, score and progress on the right, outlined text on the play field
     RK.card({...})    the question card: TWO questions plus a spare third if one is missed, "1 of 2" marker, reload-safe
     RK.end({...})     the end screen: name, score, one line to chase, plain stats, score code, Play again

   One call sets it up:   var RK = SpitzRemake.make({ pre:'bb', S:function(){ return S; }, save:save, next:nextQuestion });
   Every id it makes starts with the game's two-letter prefix (bb-start, bb-nameinput, bb-go, bb-q, bb-end, bb-endscore,
   bb-endcode, bb-again), which is what kit.js, scorecode.js and the Gameplay checks already look for.
   Each game keeps its own look: colours, fonts and key caps are CSS variables (--rk-*), see README.md. Set them on :root (the F hint sits outside the stage).
   No live game loads this file yet. A remake's build inlines it, the same way kit.js is inlined into test copies. */
(function(){
'use strict';
var VERSION=2;

function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function plain(h){ return String(h||'').replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim(); }
function reduce(){ try{ return matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){ return false; } }

/* ---------- styles: structure here, look through --rk-* variables (defaults = a dark 16-bit game) ---------- */
function css(P){ var p='.'+P+'-';
return [
':root{ --rk-ink:#05070F; --rk-text:#FFFFFF; --rk-muted:#A9C2EE; --rk-accent:#3DE0FF; --rk-good:#4ADE80; --rk-bad:#FF7A7A; --rk-gold:#FFC82E;',
'  --rk-win:#0B1430; --rk-frame:#DCE6F5; --rk-tile:#17233F; --rk-tile-text:#FFFFFF; --rk-go:#A6FF4D; --rk-go-text:#10130A; --rk-dim:rgba(3,5,12,.6);',
'  --rk-over:rgba(3,5,12,.9); --rk-radius:4px; --rk-word:"Press Start 2P","Inter",system-ui,sans-serif; --rk-num:"Spitz Digits","Inter",system-ui,sans-serif;',
'  --rk-body:"Inter",system-ui,sans-serif; --rk-word-scale:1; --rk-key-face:linear-gradient(#22366A,#142249); --rk-key-text:#EAF6FF; --rk-key-rim:#3DE0FF; --rk-key-low:#0F6F8E;',
'  --rk-heart:#FF4F6D; --rk-heart-off:#3A4458;',
'  --rk-ol:-3px 0 var(--rk-ink),3px 0 var(--rk-ink),0 -3px var(--rk-ink),0 3px var(--rk-ink),-3px -3px var(--rk-ink),3px 3px var(--rk-ink),-3px 3px var(--rk-ink),3px -3px var(--rk-ink); }',
'.rk-hud [hidden],.rk-dim[hidden],.rk-over[hidden],.rk-hud[hidden],.rk-banner[hidden],.rk-nudge[hidden],.rk-topics[hidden]{ display:none !important; }',

/* --- HUD: words and numbers sit on the play field with a dark pixel outline. Nothing is boxed. --- */
'.rk-hud{ position:absolute; left:44px; right:44px; top:26px; z-index:4; display:flex; justify-content:space-between; align-items:flex-start; pointer-events:none; white-space:nowrap; color:var(--rk-text); }',
'.rk-hud .rk-side{ display:flex; align-items:flex-start; gap:40px; } .rk-hud .rk-r{ flex-direction:row-reverse; text-align:right; }',
'.rk-hud.cols .rk-side{ flex-direction:column; gap:30px; } .rk-hud.cols .rk-r{ align-items:flex-end; }',
'.rk-it{ display:flex; flex-direction:column; gap:8px; } .rk-r .rk-it{ align-items:flex-end; }',
'.rk-it .l{ font:400 calc(22px*var(--rk-word-scale))/1 var(--rk-word); color:var(--rk-muted); text-shadow:var(--rk-ol); }',
'.rk-it .v{ font:800 58px/1 var(--rk-num); font-variant-numeric:tabular-nums; color:var(--rk-text); text-shadow:var(--rk-ol); }',
'.rk-it.big .v{ font-size:76px; } .rk-it.small .v{ font-size:40px; } .rk-it .v small{ font:800 .5em/1 var(--rk-body); margin-left:.25em; }',
'.rk-it.warn .v,.rk-it.warn .tx{ color:var(--rk-bad); } .rk-it.hot .v,.rk-it.hot .tx{ color:var(--rk-gold); }',
'.rk-it .tx{ font:800 30px/1.15 var(--rk-body); color:var(--rk-text); text-shadow:var(--rk-ol); }',
'.rk-hearts{ display:flex; gap:10px; } .rk-hearts svg{ width:66px; height:60px; display:block; shape-rendering:crispEdges; } .rk-hearts .off .f{ fill:var(--rk-heart-off); }',
'.rk-hearts .f{ fill:var(--rk-heart); } .rk-hearts .o{ fill:var(--rk-ink); } .rk-hearts .s{ fill:rgba(255,255,255,.75); } .rk-hearts .off .s{ fill:none; }',
'.rk-hearts .ic{ width:60px; height:60px; display:grid; place-items:center; font-size:48px; line-height:1; } .rk-hearts .ic.off{ opacity:.28; filter:grayscale(1); }',
'.rk-bar{ width:300px; height:22px; background:var(--rk-ink); padding:4px; box-sizing:border-box; } .rk-bar i{ display:block; height:100%; width:0; background:var(--rk-accent); }',
'.rk-it.warn .rk-bar i{ background:var(--rk-bad); } .rk-it.hot .rk-bar i{ background:var(--rk-gold); }',

/* --- the game window: the ONE framed thing on screen (question card, new-game box). Solid fill, light frame, dark outline, hard shadow --- */
'.rk-dim{ position:absolute; inset:0; z-index:8; display:grid; place-items:center; background:var(--rk-dim); }',
'.rk-win{ box-sizing:border-box; background:var(--rk-win); border:4px solid var(--rk-frame); border-radius:var(--rk-radius); box-shadow:0 0 0 4px var(--rk-ink), 10px 10px 0 4px rgba(0,0,0,.45); color:var(--rk-text); }',
'.rk-q{ width:1120px; padding:24px 30px 26px; display:flex; flex-direction:column; gap:16px; font-family:var(--rk-body); }',
'.rk-q.vis{ width:1340px; } .rk-q,.rk-q *{ transition:none !important; }',
'.rk-q.pop{ animation:rkPop .12s ease-out; } @keyframes rkPop{ from{ opacity:0; transform:scale(.96); } }',
'.rk-q.shake{ animation:rkShake .15s 2; } @keyframes rkShake{ 25%{ transform:translateX(-9px); } 75%{ transform:translateX(9px); } }',
'.rk-qhead{ display:flex; align-items:center; gap:18px; min-height:52px; }',
'.rk-qt{ font:400 calc(30px*var(--rk-word-scale))/1.1 var(--rk-word); color:var(--rk-accent); white-space:nowrap; }',
'.rk-qn{ font:800 28px/1 var(--rk-body); color:var(--rk-text); white-space:nowrap; } .rk-qn.spare{ color:var(--rk-gold); }',
'.rk-qs{ font:700 26px/1 var(--rk-body); color:var(--rk-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; min-width:0; }',
'.rk-sp{ flex:1; }',
'.rk-pips{ display:flex; gap:10px; flex:none; } .rk-pip{ width:44px; height:44px; box-sizing:border-box; display:grid; place-items:center; border:4px solid var(--rk-muted); border-radius:var(--rk-radius); font:800 28px/1 var(--rk-body); color:var(--rk-ink); }',
'.rk-pip.now{ border-color:var(--rk-text); } .rk-pip.ok{ background:var(--rk-good); border-color:var(--rk-good); } .rk-pip.no{ background:var(--rk-bad); border-color:var(--rk-bad); } .rk-pip.spare{ border-style:dashed; border-color:var(--rk-gold); } .rk-pip.spare.ok{ border-style:solid; border-color:var(--rk-good); } .rk-pip.spare.no{ border-style:solid; border-color:var(--rk-bad); }',
'.rk-qp{ font:700 40px/1.28 var(--rk-body); min-height:102px; } .rk-q.fast .rk-qp{ font-size:88px; line-height:1.1; min-height:0; text-align:center; padding:6px 0 10px; } .rk-q.vis .rk-qp{ min-height:0; }',
'.rk-qbody{ display:flex; flex-direction:column; gap:14px; min-width:0; } .rk-q.vis .rk-qbody{ flex-direction:row; align-items:flex-start; gap:26px; }',
'.rk-choices{ display:grid; grid-template-columns:1fr 1fr; gap:14px; } .rk-choices.one,.rk-q.vis .rk-choices{ grid-template-columns:1fr; flex:1; min-width:0; }',
'.rk-ch{ min-height:84px; display:flex; align-items:center; gap:18px; padding:8px 18px; border-radius:var(--rk-radius); background:var(--rk-tile); color:var(--rk-tile-text); border:3px solid transparent; box-shadow:0 0 0 3px var(--rk-ink); text-align:left; font:800 38px/1.15 var(--rk-body); min-width:0; cursor:pointer; }',
'.rk-ch .t{ min-width:0; overflow-wrap:anywhere; } .rk-ch .m{ flex:none; margin-left:auto; font:800 34px/1 var(--rk-body); }',
'.rk-ch:not(:disabled):hover{ border-color:var(--rk-accent); } .rk-ch.right{ border-color:var(--rk-good); } .rk-ch.right .m{ color:var(--rk-good); } .rk-ch.wrong{ border-color:var(--rk-bad); } .rk-ch.wrong .m{ color:var(--rk-bad); }',
'.rk-ch:disabled{ cursor:default; } .rk-ch:disabled:not(.right):not(.wrong){ opacity:.45; }',
'.rk-fb{ min-height:80px; font:600 30px/1.3 var(--rk-body); color:var(--rk-muted); } .rk-fb .h{ font-weight:800; margin-right:10px; } .rk-fb.ok .h{ color:var(--rk-good); } .rk-fb.bad{ color:var(--rk-text); } .rk-fb.bad .h{ color:var(--rk-bad); } .rk-fb b{ color:var(--rk-text); }',
'.rk-next{ height:80px; border-radius:var(--rk-radius); background:var(--rk-go); color:var(--rk-go-text); font:400 calc(28px*var(--rk-word-scale))/1 var(--rk-word); box-shadow:0 0 0 3px var(--rk-ink); cursor:pointer; border:0; }',
'.rk-next:disabled{ background:var(--rk-tile); color:var(--rk-muted); cursor:default; }',
/* what the question bank writes (classes carry the game prefix) */
p+'graph{ display:block; flex:none; width:440px; height:440px; border-radius:6px; background:#12151D; border:2px solid var(--rk-ink); }',
p+'eq{ white-space:nowrap; font-weight:800; }',
p+'fr{ display:inline-flex; flex-direction:column; vertical-align:middle; text-align:center; font-size:.78em; line-height:1.05; margin:0 .08em; } '+p+'fr span:first-child{ border-bottom:.08em solid currentColor; padding:0 .12em; }',
p+'table{ border-collapse:collapse; font:800 34px/1 var(--rk-body); align-self:flex-start; } '+p+'table td,'+p+'table th{ border:2px solid var(--rk-muted); padding:8px 20px; text-align:center; min-width:78px; }',
'.rk-q .c-m{ color:var(--c-m,#FFC82E); white-space:nowrap; } .rk-q .c-pt{ color:var(--c-pt,#FFF04D); } .rk-q .c-b{ color:var(--c-b,#FF7AD0); } .rk-q .c-x{ color:var(--c-x,#2DE2C8); } .rk-q .c-ans{ color:var(--c-ans,#D9A6FF); }',

/* --- one key cap everywhere: controls card, the small keys line, the F hint, answer numbers, Continue, Play again --- */
'html body .sz-ctl kbd, html body .sz-meta kbd, html body .sz-fs kbd, .rk-key{ display:inline-grid; place-items:center; box-sizing:border-box; background:var(--rk-key-face); color:var(--rk-key-text); border:2px solid var(--rk-key-rim); border-radius:var(--rk-radius);',
'  box-shadow:0 4px 0 var(--rk-key-low), 0 0 0 2px var(--rk-ink), 0 4px 0 2px var(--rk-ink); font-family:var(--rk-word); font-weight:400; letter-spacing:0; text-transform:none; }',
/* key text is never under 20px on the 1920 stage: that is 11px on a 1366x620 Chromebook screen */
':root{ --rk-key-scale:min(var(--rk-word-scale),1.3); }',
'html body .sz-ctl kbd{ font-size:calc(20px*var(--rk-key-scale)); height:56px; min-width:56px; } html body .sz-ctl kbd.mid{ min-width:136px; } html body .sz-ctl kbd.wide{ min-width:190px; }',
'html body .sz-ctl .t kbd{ font-size:calc(20px*var(--rk-key-scale)); height:44px; min-width:44px; } html body .sz-ctl .t{ grid-template-columns:repeat(3,44px); grid-auto-rows:44px; }',
'html body .sz-ctl .k{ align-items:flex-end; } html body .sz-ctl .or{ align-self:flex-end; height:56px; display:grid; place-items:center; margin:0 6px; font:800 22px/1 var(--rk-body); color:var(--rk-muted); text-shadow:var(--rk-ol); }',
'html body .sz-ctl .t + .or{ height:44px; }',   /* between the arrow T and the WASD T, "or" sits on their bottom row */
'html body .sz-ctl .l{ font:400 calc(20px*var(--rk-word-scale))/1.3 var(--rk-word); color:var(--rk-text); text-shadow:var(--rk-ol); } html body .sz-ctl .g{ gap:14px; } html body .sz-ctl{ gap:18px 48px; margin:0 0 18px; }',
'html body .sz-meta{ background:none; padding:0; border-radius:0; font:800 22px/1 var(--rk-body); color:var(--rk-text); text-shadow:var(--rk-ol); gap:12px 28px; }',
'html body .sz-meta kbd{ font-size:calc(20px*var(--rk-key-scale)); height:38px; min-width:38px; padding:0 8px; text-shadow:none; box-shadow:0 3px 0 var(--rk-key-low), 0 0 0 2px var(--rk-ink), 0 3px 0 2px var(--rk-ink); }',
'html body .sz-fs kbd{ font-size:20px; }',
'.rk-key{ min-width:54px; height:54px; padding:0 10px; font-size:calc(24px*var(--rk-word-scale)); flex:none; } .rk-key.sm{ min-width:0; height:46px; font-size:calc(20px*var(--rk-key-scale)); margin-right:14px; vertical-align:middle; }',
'html body .sz-ctl kbd svg.rk-arw, html body .sz-meta kbd svg.rk-arw{ display:block; width:22px; height:22px; shape-rendering:crispEdges; fill:currentColor; } html body .sz-ctl .t kbd svg.rk-arw{ width:18px; height:18px; }',

/* --- upgrade pick, pause, feel layer, nudge --- */
'.rk-pickwin{ width:1360px; padding:28px 32px 32px; text-align:center; font-family:var(--rk-body); } .rk-pickwin .rk-qt{ margin:0; font-size:calc(40px*var(--rk-word-scale)); }',
'.rk-picktip{ margin:12px 0 22px; font:700 30px/1.2 var(--rk-body); color:var(--rk-muted); }',
'.rk-cards{ display:grid; grid-template-columns:repeat(var(--n,3),1fr); gap:18px; }',
'.rk-card{ min-height:320px; padding:22px 20px; display:flex; flex-direction:column; align-items:center; gap:14px; border-radius:var(--rk-radius); background:var(--rk-tile); color:var(--rk-tile-text); border:3px solid transparent; box-shadow:0 0 0 3px var(--rk-ink); cursor:pointer; font-family:var(--rk-body); }',
'.rk-card:not(.off):hover{ border-color:var(--rk-accent); } .rk-card.off{ opacity:.4; cursor:default; }',
'.rk-card .ic{ font-size:84px; line-height:1; height:110px; display:grid; place-items:center; } .rk-card .ic canvas,.rk-card .ic img{ width:110px; height:110px; image-rendering:pixelated; }',
'.rk-card .n{ font:400 calc(30px*var(--rk-word-scale))/1.15 var(--rk-word); } .rk-card .d{ font:700 28px/1.25 var(--rk-body); color:var(--rk-muted); }',
'.rk-pausewin{ width:1180px; gap:22px; } .rk-pausewin .rk-stats{ margin:0; }',
'.rk-vol{ display:flex; gap:50px; font:800 28px/1 var(--rk-body); } .rk-vol label{ display:flex; align-items:center; gap:14px; } .rk-vol input{ width:260px; height:30px; accent-color:var(--rk-accent); } .rk-vol b{ min-width:76px; text-align:left; font-variant-numeric:tabular-nums; }',
'html body .rk-pkeys .sz-ctl{ margin:0; }',
'.rk-fx{ position:absolute; inset:0; z-index:5; pointer-events:none; overflow:hidden; }',
'.rk-pop{ position:absolute; translate:-50% -150%; white-space:nowrap; font:800 46px/1 var(--rk-num); color:var(--rk-text); text-shadow:var(--rk-ol); } .rk-pop.good{ color:var(--rk-good); } .rk-pop.bad{ color:var(--rk-bad); } .rk-pop.gold{ color:var(--rk-gold); }',
'.rk-banner{ position:absolute; left:0; right:0; top:230px; z-index:5; display:flex; flex-direction:column; align-items:center; gap:10px; pointer-events:none; text-align:center; }',
'.rk-banner b{ font:400 calc(62px*var(--rk-word-scale))/1.1 var(--rk-word); color:var(--rk-text); text-shadow:var(--rk-ol), 6px 6px 0 var(--rk-ink); } .rk-banner span{ font:800 34px/1.2 var(--rk-body); color:var(--rk-gold); text-shadow:var(--rk-ol); }',
'.rk-banner.gold b{ color:var(--rk-gold); } .rk-banner.bad b{ color:var(--rk-bad); } .rk-banner.good b{ color:var(--rk-good); }',
'.rk-nudge{ position:absolute; left:0; right:0; bottom:150px; z-index:5; text-align:center; pointer-events:none; font:400 calc(34px*var(--rk-word-scale))/1.2 var(--rk-word); color:var(--rk-gold); text-shadow:var(--rk-ol); animation:rkBob 1.2s ease-in-out infinite; } @keyframes rkBob{ 50%{ translate:0 -8px; } }',
'.rk-topics{ display:flex; justify-content:center; flex-wrap:wrap; gap:8px 34px; margin:0 0 12px; font:700 24px/1.2 var(--rk-body); color:var(--rk-muted); } .rk-topics b{ color:var(--rk-text); font-weight:800; margin-right:6px; }',

/* --- title and end screens --- */
'.rk-over{ position:absolute; inset:0; z-index:15; display:grid; place-items:center; text-align:center; background:var(--rk-over); color:var(--rk-text); font-family:var(--rk-body); }',
'.rk-box{ width:1240px; display:flex; flex-direction:column; align-items:center; }',
'.rk-over .sz-eyebrow{ display:none !important; }',   /* Kody 2026-11-25: no "Spitz Arcade" header. The element stays: kit.js finds the box through it */
'.rk-logo{ margin:0 0 6px; font:400 calc(120px*var(--rk-word-scale))/1.05 var(--rk-word); color:var(--rk-text); text-shadow:6px 6px 0 var(--rk-ink); } .rk-logo b{ font-weight:400; color:var(--rk-accent); } .rk-logo img{ display:block; max-width:900px; max-height:300px; }',
'.rk-sub{ max-width:1180px; margin:16px 0 28px; font:700 34px/1.35 var(--rk-body); color:var(--rk-muted); text-shadow:0 2px 0 var(--rk-ink); }',
'.rk-row{ display:flex; justify-content:center; align-items:center; gap:16px; margin-bottom:22px; flex-wrap:wrap; }',
'.rk-input{ width:520px; height:84px; box-sizing:border-box; border-radius:var(--rk-radius); border:3px solid var(--rk-muted); background:var(--rk-win); color:var(--rk-text); font:700 36px/1 var(--rk-body); padding:0 24px; -webkit-user-select:text; user-select:text; } .rk-input:focus{ outline:none; border-color:var(--rk-go); } .rk-input::placeholder{ color:var(--rk-muted); opacity:.8; }',
'html body .rk-over .sz-mus{ height:84px; border-radius:var(--rk-radius); background:var(--rk-win); border:3px solid var(--rk-accent); color:var(--rk-text); font:800 28px/1 var(--rk-body); padding:0 24px; cursor:pointer; }',
'.rk-go{ height:96px; padding:0 70px; border:0; border-radius:var(--rk-radius); background:var(--rk-go); color:var(--rk-go-text); font:400 calc(40px*var(--rk-word-scale))/1 var(--rk-word); box-shadow:0 0 0 4px var(--rk-ink), 0 8px 0 4px var(--rk-ink); cursor:pointer; margin-bottom:34px; } .rk-go:disabled{ background:var(--rk-tile); color:var(--rk-muted); cursor:default; }',
'.rk-keys{ display:flex; flex-direction:column; align-items:center; }',
'html body .rk-over .sz-credit{ position:absolute; right:36px; bottom:28px; font-size:22px !important; }',
'html body .rk-over .spz-hub{ left:24px; right:auto; top:24px; }',   /* Back to Arcade: top left on every game */
'.rk-endname{ font:400 calc(44px*var(--rk-word-scale))/1.15 var(--rk-word); color:var(--rk-accent); margin:10px 0 4px; word-break:break-word; text-shadow:var(--rk-ol); }',
'.rk-endlogo{ font:400 calc(54px*var(--rk-word-scale))/1.05 var(--rk-word); text-shadow:4px 4px 0 var(--rk-ink); } .rk-endlogo b{ font-weight:400; color:var(--rk-accent); } .rk-endlogo img{ display:block; max-height:150px; }',
'.rk-final{ font:800 150px/1 var(--rk-num); font-variant-numeric:tabular-nums; color:var(--rk-go); text-shadow:var(--rk-ol); }',
'.rk-medal{ font:400 calc(34px*var(--rk-word-scale))/1.25 var(--rk-word); color:var(--rk-gold); min-height:44px; margin-top:6px; text-shadow:var(--rk-ol); }',
'.rk-goal{ font:700 30px/1.3 var(--rk-body); color:var(--rk-text); margin-top:6px; min-height:40px; }',
'.rk-stats{ display:flex; justify-content:center; gap:70px; margin:18px 0 16px; } .rk-stat{ display:flex; flex-direction:column; align-items:center; gap:6px; }',
'.rk-stat .l{ font:700 26px/1.2 var(--rk-body); color:var(--rk-muted); } .rk-stat .v{ font:800 50px/1 var(--rk-num); font-variant-numeric:tabular-nums; text-shadow:var(--rk-ol); } .rk-stat .v small{ font:800 .6em/1 var(--rk-body); }',
'.rk-code{ display:inline-flex; flex-direction:column; align-items:center; gap:10px; padding:16px 34px; }',
'.rk-code .l{ font:700 24px/1 var(--rk-body); color:var(--rk-muted); } .rk-codev{ font:800 50px/1 ui-monospace,Menlo,Consolas,monospace; letter-spacing:.06em; -webkit-user-select:text; user-select:text; }',
'.rk-note{ font:700 26px/1.3 var(--rk-body); color:var(--rk-muted); margin:8px 0 18px; }',
'.rk-again{ height:80px; padding:0 40px; border:0; border-radius:var(--rk-radius); background:var(--rk-tile); color:var(--rk-tile-text); font:400 calc(28px*var(--rk-word-scale))/1 var(--rk-word); box-shadow:0 0 0 4px var(--rk-ink); cursor:pointer; } .rk-again:disabled{ opacity:.5; cursor:default; }',
'.rk-ask{ width:1000px; padding:40px; display:flex; flex-direction:column; align-items:center; gap:24px; } .rk-ask h2{ margin:0; font:400 calc(52px*var(--rk-word-scale))/1.1 var(--rk-word); } .rk-ask p{ margin:0; font:700 30px/1.3 var(--rk-body); color:var(--rk-muted); }',
'.rk-ask .rk-row{ margin:0; gap:22px; } .rk-ask button{ height:90px; padding:0 36px; margin:0; font-size:calc(24px*var(--rk-word-scale)); } .rk-ask .rk-go{ background:var(--rk-bad); box-shadow:0 0 0 4px var(--rk-ink); }'
].join('\n'); }

/* arrows as one pixel shape, so ← → ↑ ↓ match each other and the pixel letters beside them (Jump Man v15) */
var ARW={ '↑':['...#...','..###..','.#####.','#######','..###..','..###..','..###..'], '↓':['..###..','..###..','..###..','#######','.#####.','..###..','...#...'],
          '←':['...#...','..##...','.######','#######','.######','..##...','...#...'], '→':['...#...','...##..','######.','#######','######.','...##..','...#...'] };
function arrow(ch){ var m=ARW[ch], s=''; m.forEach(function(r,j){ for(var i=0;i<7;i++) if(r[i]==='#') s+='<rect x="'+i+'" y="'+j+'" width="1.02" height="1.02"/>'; });
  return '<svg class="rk-arw" viewBox="0 0 7 7" role="img" aria-label="'+({'↑':'up','↓':'down','←':'left','→':'right'})[ch]+' arrow">'+s+'</svg>'; }
function pixelArrows(root){ (root||document).querySelectorAll('.sz-ctl kbd, .sz-meta kbd').forEach(function(k){ var t=k.textContent; if(ARW[t]) k.innerHTML=arrow(t); }); }
var HEART=['.##.##.','#######','#######','#######','.#####.','..###..','...#...'];
function heartSvg(){ var o='', f='', i, j; for(j=0;j<7;j++) for(i=0;i<7;i++) if(HEART[j][i]==='#'){ o+='<rect class="o" x="'+(i+0.5)+'" y="'+(j+0.5)+'" width="2" height="2"/>'; f+='<rect class="f" x="'+(i+1)+'" y="'+(j+1)+'" width="1.02" height="1.02"/>'; }
  return '<svg viewBox="0 0 9 9" aria-hidden="true">'+o+f+'<rect class="s" x="2" y="2" width="1" height="1"/></svg>'; }

/* wrong-answer text: some sets say the rule in both the choice's "why" and the question's "explain". Say it once (Star Swarm v68). */
function explainOnce(why,ex){ ex=ex||''; var tx=function(h){ return plain(h).replace(/[.!?:\s]+$/,'').trim(); };
  if(tx(ex)&&tx(why).indexOf(tx(ex))>=0) return '';
  if(why){ var wy=tx(why).toLowerCase(); try{ ex=ex.split(/(?<=[.!?])\s+(?![^<]*>)/).filter(function(st){ var t=tx(st).toLowerCase(), u=t.replace(/^[a-z]{2,6}:\s*/,'');
      if(!t||(st.match(/<[a-z]/gi)||[]).length!==(st.match(/<\//g)||[]).length) return true; return wy.indexOf(t)<0&&(u.length<12||wy.indexOf(u)<0); }).join(' '); }catch(e){} }
  return /[.!?:]\s*$/.test(plain(ex))||!ex?ex:ex+'.'; }

function make(env){
  var P=env.pre, stage=document.getElementById(env.stage||'stage'), RK={ version:VERSION, pre:P };
  if(!/^[a-z]{2}$/.test(P)) throw new Error('SpitzRemake: pre must be two lower-case letters (scorecode.js and kit.js find screens by it)');
  if(!stage) throw new Error('SpitzRemake: no #stage');
  function $(id){ return document.getElementById(P+'-'+id); }
  function S(){ return env.S(); }
  function save(){ try{ env.save(); }catch(e){} }
  function snd(n){ RK.snd(n); }
  function add(html){ var d=document.createElement('div'); d.innerHTML=html; var el=d.firstElementChild; stage.appendChild(el); return el; }
  if(!document.getElementById('rk-css-'+P)){ var st=document.createElement('style'); st.id='rk-css-'+P; st.textContent=css(P); document.head.appendChild(st); }
  var CREDIT='<span class="sz-credit">Made by Spitz <i class="sz-burger" aria-hidden="true"></i></span>';

  /* fit the 1920x1080 stage to the window (every game did this by hand) */
  RK.fit=function(){ var s=Math.min(innerWidth/1920,innerHeight/1080), y=stage.style; y.transform='scale('+s+')'; y.left=((innerWidth-1920*s)/2)+'px'; y.top=((innerHeight-1080*s)/2)+'px'; };
  if(env.fit!==false){ addEventListener('resize',RK.fit); RK.fit(); }

  /* ======================= TITLE SCREEN =======================
     RK.title({ name:'Jump <b>Man</b>' | logo:'<img ...>', tagline:'Climb the tower...', controls:'ARROWS/WASD=Move | Space=Jump | 1234=Answer',
                onStart:function(name){...} })
     Call it while the page loads (before DOMContentLoaded), so kit.js draws the controls card and scorecode.js adds Back to Arcade. */
  RK.title=function(o){
    var el=add('<div class="rk-over" id="'+P+'-start"><div class="rk-box"><div class="sz-eyebrow">Spitz <b>Arcade</b></div>'+
      '<h1 class="rk-logo" aria-label="'+esc(plain(o.name||o.label||''))+'">'+(o.logo||o.name||'')+'</h1>'+
      '<p class="rk-sub"><span class="sz-setname"></span> '+(o.tagline||'')+'</p>'+
      '<div class="rk-row"><input class="rk-input" id="'+P+'-nameinput" maxlength="24" placeholder="First name or nickname" autocomplete="off" aria-label="Your name">'+
      '<button class="sz-mus" id="sz-mus" type="button" aria-label="Music on or off, key N">♪ Music on</button></div>'+
      '<button class="rk-go" id="'+P+'-go" type="button" disabled>Start</button>'+
      '<div class="rk-keys"><div class="sz-ctl" data-ctl="'+esc(o.controls||'1234=Answer')+'"></div></div>'+
      '</div>'+CREDIT+'</div>');
    var inp=$('nameinput'), go=$('go');
    function ok(){ return inp.value.trim().length>0; }
    function upd(){ go.disabled=!ok(); }
    function start(){ if(!ok()||el.hidden) return; var n=inp.value.trim().slice(0,24); el.hidden=true; inp.blur(); try{ o.onStart(n); }catch(e){ el.hidden=false; throw e; } }
    inp.addEventListener('input',upd); go.addEventListener('click',start);
    inp.addEventListener('keydown',function(e){ e.stopPropagation(); if(e.key==='Enter') start(); });   /* typing a name never drives the game (W A S D, M, N, F) */
    function late(){ setTimeout(function(){ pixelArrows(el); backLink(el); upd(); },0); }
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',late); else late();
    return { el:el, show:function(){ el.hidden=false; upd(); }, hide:function(){ el.hidden=true; }, open:function(){ return !el.hidden; } };
  };
  /* scorecode.js adds Back to Arcade to the start and end screens. A page without it (a look test) still gets the link. */
  function backLink(ov){ if(ov.querySelector('.spz-hub')) return; var a=document.createElement('a'); a.className='spz-hub'; a.href=location.protocol==='file:'?'https://spitzmath.com/arcade/':(env.hub||'../arcade/');
    a.innerHTML='<b aria-hidden="true">←</b> Back to Arcade'; a.setAttribute('aria-label','Back to the Spitz Arcade');
    a.style.cssText='position:absolute;z-index:6;display:inline-flex;align-items:center;gap:12px;min-height:64px;box-sizing:border-box;padding:12px 28px 12px 20px;border:3px solid var(--rk-accent);border-radius:var(--rk-radius);background:var(--rk-win);color:var(--rk-text);font:800 28px/1 var(--rk-body);text-decoration:none;';
    ov.appendChild(a); }

  /* ======================= HUD =======================
     RK.hud({ cols:false, left:[ {id:'hearts',type:'hearts',max:3}, {id:'time',type:'num',label:'Time'} ],
              right:[ {id:'score',type:'num',label:'Score',size:'big'}, {id:'next',type:'bar',label:'Next fort'} ] })
     LEFT = you and your survival (hearts, time, the thing chasing you).  RIGHT = score and progress.
     types: num (label + big number), hearts (max, optional icon), bar (0..1), text (one outlined line).
     hud.set({ score:1200, hearts:2, next:0.4, time:'3:23' }); a value only touches the page when it changed.
     hud.flag('time','warn', true) turns one item red (warn) or gold (hot). */
  RK.hud=function(o){
    var items={}, last={};
    function it(d){ var c='rk-it'+(d.size?' '+d.size:''), h='<div class="'+c+'" data-id="'+d.id+'">'+(d.label?'<span class="l">'+esc(d.label)+'</span>':'');
      if(d.type==='hearts'){ var s=''; for(var i=0;i<d.max;i++) s+=d.icon?'<span class="ic">'+d.icon+'</span>':heartSvg().replace('<svg','<svg class="h"'); h+='<div class="rk-hearts" role="img">'+s+'</div>'; }
      else if(d.type==='bar') h+='<div class="rk-bar"><i></i></div>'+(d.text?'<span class="tx"></span>':'');
      else if(d.type==='text') h+='<span class="tx"></span>';
      else h+='<span class="v">0</span>';
      return h+'</div>'; }
    var el=add('<div class="rk-hud'+(o.cols?' cols':'')+'" id="'+P+'-hud" hidden><div class="rk-side rk-l">'+(o.left||[]).map(it).join('')+'</div><div class="rk-side rk-r">'+(o.right||[]).map(it).join('')+'</div></div>');
    (o.left||[]).concat(o.right||[]).forEach(function(d){ items[d.id]={ d:d, el:el.querySelector('[data-id="'+d.id+'"]') }; });
    function set(vals){ for(var k in vals){ var m=items[k], v=vals[k]; if(!m) continue; var key=typeof v==='object'?JSON.stringify(v):String(v); if(last[k]===key) continue; last[k]=key; var d=m.d;
        if(d.type==='hearts'){ var hs=m.el.querySelector('.rk-hearts'); [].forEach.call(hs.children,function(h,i){ h.classList.toggle('off',i>=v); }); hs.setAttribute('aria-label',v+' of '+d.max+' '+(d.label||d.what||'hearts')+' left'); }
        else if(d.type==='bar'){ var f=typeof v==='object'?v.f:v; m.el.querySelector('i').style.width=Math.round(Math.max(0,Math.min(1,f))*100)+'%'; if(d.text) m.el.querySelector('.tx').textContent=typeof v==='object'?v.text:''; }
        else if(d.type==='text') m.el.querySelector('.tx').textContent=v;
        else m.el.querySelector('.v').innerHTML=typeof v==='number'?v.toLocaleString('en-US'):esc(v).replace(/^([\d:,.]+)\s+(.+)$/,'$1<small>$2</small>'); } }
    return { el:el, set:set, show:function(on){ el.hidden=on===false; }, flag:function(id,cls,on){ if(items[id]) items[id].el.classList.toggle(cls,!!on); },
             hide:function(id,off){ if(items[id]) items[id].el.hidden=off!==false; } };
  };

  /* ======================= QUESTION CARD: two questions plus a spare =======================
     Kody's standard from 2026-11-25: a question moment asks TWO; miss one and a spare THIRD appears. Two misses end it.
       right right          -> 2 right (perfect)
       right wrong, spare   -> 2 right or 1 right
       wrong right, spare   -> 2 right or 1 right
       wrong wrong          -> 0 right, no spare
     var card = RK.card({ kinds:{ hangar:{ title:'Hangar', safe:'Ship docked. You are safe.', rewards:['No upgrade this time.','one upgrade','two upgrades'],
                                           done:function(r){ ... r.right, r.asked, r.missed, r.perfect, r.spare ... } } },
                          onAnswer:function(ok,q,kind){ ... } });
     card.open('hangar')  opens it (the game freezes itself: check card.isOpen() in its loop).
     card.resume()        call once after loading a saved run: a card that was open comes back on the same question.
     The card writes the run's own save (S.q, S.qDone, S.picked, S.answered, S.correct, S.streak, S.best, S.topics, S.card) and calls save()
     right after every answer. That is the shape scorecode.js reads for the answer log and for bringing missed questions back,
     and the shape the Gameplay checks read, so both keep working with no extra code.
     A kind can set need (default 2) and spare (default 1). need:1, spare:0 is a single question (a boss strike, a revive). */
  RK.card=function(o){
    var kinds=o.kinds, kind='', openAt=0, nextT=0, lockT=0, wrongRun=0, FAST=!!o.fast;
    var dim=add('<div class="rk-dim" id="'+P+'-qdim" hidden><div class="rk-win rk-q" id="'+P+'-q" role="dialog" aria-modal="true" aria-label="Question. The game is paused.">'+
      '<div class="rk-qhead"><span class="rk-qt" id="'+P+'-qtitle"></span><span class="rk-qn" id="'+P+'-qn"></span><span class="rk-qs" id="'+P+'-qsafe"></span><span class="rk-sp"></span><span class="rk-pips" id="'+P+'-qpips"></span></div>'+
      '<div class="rk-qp" id="'+P+'-qp"></div><div class="rk-qbody"><div id="'+P+'-qvisual"></div><div class="rk-choices" id="'+P+'-choices"></div></div>'+
      '<div class="rk-fb" id="'+P+'-fb" aria-live="polite"></div><button class="rk-next" id="'+P+'-next" type="button" disabled><span class="rk-key sm">Space</span>Continue</button></div></div>');
    var win=$('q');
    function K(){ return kinds[kind]||{}; }
    function need(){ return K().need||2; } function spare(){ return K().spare==null?1:K().spare; }
    function isOpen(){ return !dim.hidden; }
    function st(){ return S().card; }
    function finished(c){ return c.got>=need()||c.miss>spare(); }
    function reward(n){ var r=K().rewards||[]; return r[n]||''; }
    function earned(n){ var r=reward(n); return !r?'':n?'You earned '+r+'.':r; }
    function marker(c){ return c.n>need()?'Spare question':need()>1?c.n+' of '+need():''; }
    function pips(c){ var h=c.h||'', n=need()+(c.miss>0?spare():0), s=''; if(need()+spare()<2) return '';
      for(var i=0;i<n;i++){ var d=h.charAt(i), sp=i>=need(); s+='<span class="rk-pip'+(sp?' spare':'')+(d==='R'?' ok':d==='W'?' no':i===c.n-1?' now':'')+'">'+(d==='R'?'✓':d==='W'?'✗':'')+'</span>'; }
      return s; }
    function intro(c){ if(K().intro) return K().intro(c); var top=reward(need());
      if(need()===1) return top?'A right answer: '+top+'.':'';
      if(c.n>need()) return 'Spare question: get it right'+(top?' for '+top:'')+'.';
      if(c.n===1) return (top?need()+' right: <b>'+top+'</b>. ':'')+(spare()?'Miss one and you get a spare question.':'');
      return c.got?'Get this one right too'+(top?' for <b>'+top+'</b>':'')+'.':spare()?'Get this one right, then the spare question.':''; }
    function show(){ var s=S(), q=s.q, c=st(); if(!q||!c) return;
      win.classList.toggle('fast',FAST&&!q.visual); win.classList.toggle('vis',!!q.visual); win.setAttribute('data-kind',kind);
      $('qtitle').textContent=K().title||''; var qn=$('qn'); qn.textContent=marker(c); qn.classList.toggle('spare',c.n>need()); $('qsafe').textContent=K().safe||''; $('qpips').innerHTML=pips(c);
      $('qp').innerHTML=q.prompt; $('qvisual').innerHTML=q.visual||''; $('qvisual').hidden=!q.visual;
      var long=q.choices.some(function(x){ return plain(x.html).length>14; }), ch=$('choices'); ch.classList.toggle('one',long);
      ch.innerHTML=q.choices.map(function(x,i){ return '<button class="rk-ch" type="button" data-i="'+i+'"><span class="rk-key">'+(i+1)+'</span><span class="t">'+x.html+'</span><span class="m"></span></button>'; }).join('');
      var fb=$('fb'); fb.className='rk-fb'; fb.innerHTML=intro(c); $('next').disabled=true;
      if(s.qDone) mark(s.picked,false);
      fitWin(); }
    function fitWin(){ win.style.zoom=''; var h=win.offsetHeight; if(h>1030) win.style.zoom=(1030/h).toFixed(3); }
    function mark(i,live){ var s=S(), q=s.q, c=st(), x=q.choices[i], btns=$('choices').querySelectorAll('.rk-ch'), fb=$('fb'), fin=finished(c), tail;
      btns.forEach(function(b,j){ b.disabled=true; if(q.choices[j].ok){ b.classList.add('right'); b.querySelector('.m').textContent='✓'; } });
      $('qpips').innerHTML=pips(c);
      if(x&&x.ok){ tail=fin?earned(c.got):(K().more?K().more(c):'One more'+(reward(need())?' for '+reward(need()):'')+'.');
        fb.className='rk-fb ok'; fb.innerHTML='<span class="h">✓ Correct!</span>'+tail; $('next').disabled=false; }
      else { if(btns[i]){ btns[i].classList.add('wrong'); btns[i].querySelector('.m').textContent='✗'; }
        tail=fin?(earned(c.got)||''):c.n>=need()?'You get a spare question.':'Keep going: one miss still leaves you a spare question.';
        fb.className='rk-fb bad'; fb.innerHTML='<span class="h">✗ Not quite.</span>'+((x&&x.why)||'')+' '+explainOnce(x&&x.why,q.explain)+' <b>'+tail+'</b>';
        $('next').disabled=!!live; if(live){ clearTimeout(lockT); lockT=setTimeout(function(){ $('next').disabled=false; },wrongRun>=2?2500:2000); } }   /* a miss holds for 2 s so the reason gets read */
      fitWin(); }
    function newQ(){ var s=S(); s.q=env.next(); s.qDone=false; s.picked=-1; openAt=Date.now(); save(); show(); }
    function open(k){ var s=S(); if(isOpen()) return false; kind=k; if(!kinds[k]) throw new Error('SpitzRemake card: unknown kind '+k);
      var fresh=!s.card||s.card.kind!==k; if(fresh) s.card={ kind:k, n:1, got:0, miss:0, h:'' };
      dim.hidden=false; win.classList.remove('pop','shake'); if(!reduce()){ void win.offsetWidth; win.classList.add('pop'); }
      openAt=Date.now(); snd('open'); if(fresh||!pendingQ(s)) newQ(); else show();   /* a saved card comes back on the same question, answered or not */
      return true; }
    /* is S.q the question this card is on? (a fresh card after an old answered question needs a new one) */
    function pendingQ(s){ var c=s.card; return !!s.q&&(!s.qDone||(c.h||'').length===c.n); }
    function close(){ clearTimeout(nextT); clearTimeout(lockT); dim.hidden=true; }
    function answer(i){ var s=S(), c=st(); if(!isOpen()||!c||s.qDone||!s.q||Date.now()-openAt<250) return false; var x=s.q.choices[i]; if(!x) return false;   /* 250 ms: a key held from the game never answers */
      s.qDone=true; s.picked=i; s.answered=(s.answered||0)+1; var tp=s.topics&&s.topics[s.q.topic]; if(tp) tp[1]++;
      if(x.ok){ s.correct=(s.correct||0)+1; if(tp) tp[0]++; s.streak=(s.streak||0)+1; s.best=Math.max(s.best||0,s.streak); c.got++; c.h+='R'; wrongRun=0; }
      else { s.streak=0; c.miss++; c.h+='W'; wrongRun++; }
      try{ if(o.onAnswer) o.onAnswer(!!x.ok,s.q,kind,c); }catch(e){}
      save();                                      /* saved with the answer: a reload can't win a second try or lose a right answer */
      snd(x.ok?'right':'wrong'); mark(i,true);
      if(x.ok) nextT=setTimeout(proceed,FAST?550:750);
      else { win.classList.remove('shake','pop'); if(!reduce()){ void win.offsetWidth; win.classList.add('shake'); } }
      return true; }
    function proceed(){ var s=S(), c=st(); if(!isOpen()||!c||!s.qDone||$('next').disabled) return; clearTimeout(nextT);
      if(!finished(c)){ c.n++; newQ(); return; }
      var res={ kind:kind, right:c.got, asked:c.n, missed:c.miss, need:need(), perfect:c.miss===0&&c.got>=need(), spare:c.n>need() };
      s.card=null; close(); snd('next'); try{ if(K().done) K().done(res); }finally{ save(); } }
    win.addEventListener('click',function(e){ var b=e.target.closest?e.target.closest('.rk-ch'):null; if(b){ answer(+b.dataset.i); return; } if(e.target.closest&&e.target.closest('.rk-next')) proceed(); });
    /* while the card is up it owns the keyboard: 1-4 answer, Space or Enter go on. The game never sees those presses. */
    document.addEventListener('keydown',function(e){ if(!isOpen()||e.ctrlKey||e.metaKey||e.altKey||idOpen('confirm')||idOpen('pause')) return;
      var k=e.key, n='1234'.indexOf(k);
      if(n>=0&&k.length===1){ e.preventDefault(); e.stopImmediatePropagation(); if(!e.repeat) answer(n); }
      else if(k===' '||k==='Enter'){ e.preventDefault(); e.stopImmediatePropagation(); if(!e.repeat) proceed(); }
      else if(/^(Arrow|[wasdxkj]$)/i.test(k)){ e.stopImmediatePropagation(); if(/^Arrow/.test(k)) e.preventDefault(); } },true);
    return { open:open, isOpen:isOpen, answer:answer, proceed:proceed, close:close, kind:function(){ return kind; },
      resume:function(){ var s=S(); if(s&&s.card&&kinds[s.card.kind]&&!s.over){ open(s.card.kind); return true; } return false; },
      fast:function(v){ FAST=!!v; } };
  };

  /* ======================= END SCREEN =======================
     var end = RK.end({ name:'Jump <b>Man</b>', gameId:'jump_man_multiplication', onAgain:function(){...} });
     end.show({ score:S.score, headline:'Summit reached!', goal:'Next run: 3 right in a row for ×1.5 points.',
                stats:[ ['Correct', S.correct+' / '+S.answered], ['Best streak', S.best], ['Height', '696 m'] ] })
     One line to chase next run, stats as plain numbers (no tiles), the score code from scorecode.js, Play again on Enter.
     Play again waits 1.2 s, so mashing Space or Enter as the run ends never skips the screen. */
  RK.end=function(o){
    var shownAt=0, el=add('<div class="rk-over" id="'+P+'-end" hidden><div class="rk-box"><div class="sz-eyebrow">Spitz <b>Arcade</b></div>'+
      '<div class="rk-endlogo">'+(o.logo||o.name||'')+'</div><div class="rk-endname" id="'+P+'-endname"></div>'+
      '<div class="rk-final" id="'+P+'-endscore">0</div><div class="rk-medal" id="'+P+'-endmedal"></div><div class="rk-goal" id="'+P+'-endgoal"></div>'+
      '<div class="rk-stats '+P+'-stats" id="'+P+'-endstats"></div><div class="rk-topics" id="'+P+'-endtopics"></div>'+
      '<div class="rk-code"><span class="l">Your score code</span><span class="rk-codev" id="'+P+'-endcode"></span></div>'+
      '<p class="rk-note" id="'+P+'-endnote">Tap the button, then paste the code into the form with your name.</p>'+
      '<button class="rk-again" id="'+P+'-again" type="button"><span class="rk-key sm">Enter</span>Play again</button>'+
      '</div>'+CREDIT+'</div>');
    function again(){ if(el.hidden||Date.now()-shownAt<1200) return; el.hidden=true; o.onAgain(); }
    $('again').addEventListener('click',again);
    document.addEventListener('keydown',function(e){ if(el.hidden) return; var c=document.getElementById(P+'-confirm'); if(c&&!c.hidden) return; if(e.key==='Enter'&&!e.repeat){ e.preventDefault(); again(); } });
    function late(){ setTimeout(function(){ backLink(el); },0); }
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',late); else late();
    return { el:el, open:function(){ return !el.hidden; }, hide:function(){ el.hidden=true; },
      show:function(d){ var s=S(); $('endname').textContent=s.name||''; $('endscore').textContent=(d.score||0).toLocaleString('en-US'); $('endmedal').textContent=d.headline||''; $('endgoal').textContent=d.goal||'';
        $('endstats').innerHTML=(d.stats||[]).map(function(r){ return '<div class="rk-stat"><span class="l">'+esc(r[0])+'</span><span class="v">'+esc(r[1]).replace(/^([\d:,.]+(?: \/ [\d,]+)?)\s+(\D.*)$/,'$1 <small>$2</small>')+'</span></div>'; }).join('');
        var tp=d.topics||{}, tk=Object.keys(tp).filter(function(k){ return tp[k][1]>0; }); $('endtopics').hidden=tk.length<2;   /* per-topic row: only when more than one topic was asked */
        $('endtopics').innerHTML=tk.slice(0,5).map(function(k){ return '<span><b>'+tp[k][0]+' / '+tp[k][1]+'</b> '+esc(k)+'</span>'; }).join('');
        var code=''; if(o.gameId&&window.SpitzCode) try{ code=window.SpitzCode.show(P,o.gameId,s)||''; }catch(e){}
        if(!code){ $('endcode').textContent=d.code||''; el.querySelector('.rk-code').hidden=!d.code; $('endnote').hidden=!d.code; }
        var b=$('again'); b.disabled=true; setTimeout(function(){ b.disabled=false; },1200);
        shownAt=Date.now(); el.hidden=false; } };
  };

  /* ======================= "Start a new game?" (Shift+R) =======================
     RK.ask({ onYes:function(){...}, text:'This erases the current run.' })  kit.js already guards the Yes button against a stray click. */
  RK.ask=function(o){
    var el=add('<div class="rk-over" id="'+P+'-confirm" hidden style="z-index:40"><div class="rk-win rk-ask" role="dialog" aria-modal="true" aria-labelledby="'+P+'-asktitle">'+
      '<h2 id="'+P+'-asktitle">Start a new game?</h2><p>'+esc(o.text||'This erases the current run.')+'</p>'+
      '<div class="rk-row"><button class="rk-again" id="'+P+'-askno" type="button">No, keep playing (N)</button><button class="rk-go" id="'+P+'-askyes" type="button">Yes, new game (Y)</button></div></div></div>');
    function shut(){ el.hidden=true; } function yes(){ shut(); o.onYes(); }
    $('askno').addEventListener('click',shut); $('askyes').addEventListener('click',yes);
    document.addEventListener('keydown',function(e){ var t=e.target&&e.target.tagName; if(t==='INPUT') return;
      if(el.hidden){ if(e.shiftKey&&(e.key==='R'||e.key==='r')&&(!o.when||o.when())){ e.preventDefault(); e.stopImmediatePropagation(); el.hidden=false; } return; }
      e.stopImmediatePropagation(); if(e.key==='y'||e.key==='Y') yes(); else if(e.key==='n'||e.key==='N'||e.key==='Escape') shut(); },true);
    return { el:el, open:function(){ return !el.hidden; } };
  };

  /* ======================= who has the screen =======================
     RK.busy() is true while a card, an upgrade pick, the pause box or the "new game?" box is up. A game's loop skips its update while it is,
     so nothing moves or hurts the player behind a window and the run clock waits (the Shift+R box did not pause in three games). */
  var layers=[];
  RK.busy=function(){ for(var i=0;i<layers.length;i++) if(layers[i]()) return true; return false; };
  function idOpen(id){ var e=document.getElementById(P+'-'+id); return !!e&&!e.hidden; }
  layers.push(function(){ return idOpen('qdim')||idOpen('pick')||idOpen('pause')||idOpen('confirm'); });

  /* ======================= SOUND =======================
     RK.snd('right') plays a soft built-in chime unless the game passed its own (env.snd.right). Built-ins: open, right, wrong, next, pick, tick.
     One AudioContext for the game: RK.ac(). M mutes everything (RK.muted()); the pause box has Music and Effects sliders (RK.vol('fx'), RK.vol('music')). */
  var AC=null, muted=false, VOL={ fx:1, music:1 };
  try{ muted=localStorage.getItem('spitz_muted')==='1'; ['fx','music'].forEach(function(k){ var v=localStorage.getItem('spitz_vol_'+k); if(v!==null&&v!==''&&!isNaN(+v)) VOL[k]=Math.max(0,Math.min(1,+v)); }); }catch(e){}
  RK.ac=function(){ if(!AC){ var C=window.AudioContext||window.webkitAudioContext; if(!C) return null; try{ AC=new C(); }catch(e){ return null; } } if(AC.state==='suspended') try{ AC.resume(); }catch(e){} return AC; };
  RK.muted=function(){ return muted; };
  RK.mute=function(on){ muted=on==null?!muted:!!on; try{ localStorage.setItem('spitz_muted',muted?'1':'0'); }catch(e){} if(env.onVolume) env.onVolume(); return muted; };
  RK.vol=function(k,v){ if(v!=null){ VOL[k]=Math.max(0,Math.min(1,+v)); try{ localStorage.setItem('spitz_vol_'+k,String(VOL[k])); }catch(e){} if(env.onVolume) env.onVolume(); } return VOL[k]; };
  function note(f,t,d,type,vol){ var a=RK.ac(); if(!a) return; var o=a.createOscillator(), g=a.createGain(), t0=a.currentTime+t; o.type=type||'sine'; o.frequency.value=f;
    g.gain.setValueAtTime(0.0001,t0); g.gain.exponentialRampToValueAtTime(vol*VOL.fx,t0+0.012); g.gain.exponentialRampToValueAtTime(0.0001,t0+d); o.connect(g); g.connect(a.destination); o.start(t0); o.stop(t0+d+0.03); }
  /* soft and musical on purpose (25 Chromebooks play them at once): no buzzer for a miss, just two low notes stepping down */
  var CHIME={ open:[[523,0,0.14,'triangle',0.07]], right:[[659,0,0.16,'sine',0.14],[880,0.09,0.26,'sine',0.14]], wrong:[[330,0,0.18,'triangle',0.09],[262,0.12,0.3,'triangle',0.09]],
    next:[[440,0,0.07,'triangle',0.05]], pick:[[523,0,0.14,'sine',0.11],[659,0.08,0.14,'sine',0.11],[784,0.16,0.3,'sine',0.11]], tick:[[880,0,0.05,'triangle',0.04]] };
  var asked=window.__rkSnd=[];   /* tests read which sounds were asked for */
  RK.snd=function(n){ asked.push(n); if(asked.length>50) asked.shift(); if(muted||VOL.fx<=0) return;
    try{ if(env.snd&&env.snd[n]){ env.snd[n](); return; } (CHIME[n]||[]).forEach(function(x){ note(x[0],x[1],x[2],x[3],x[4]); }); }catch(e){} };

  /* ======================= FEEL =======================
     RK.fx.shake(0.5)            screen shake on the game canvas (two sines on real time, fades on real time). Off with reduce-motion.
     RK.fx.pop(x,y,'+200','good') a number that floats up from a point on the 1920x1080 stage. Kinds: good, bad, gold.
     RK.fx.banner('Rockfall!','watch the sky')  one banner at a time, queued, and it waits while a window is up, so banners never pile on a card.
     RK.fx.stop(60)              hit-stop: RK.fx.frozen() is true for that many ms; the game's loop skips its update.
     Nothing here flashes: no full-screen white, nothing faster than 3 a second. */
  RK.fx=(function(){
    var trauma=0, rafOn=false, lastT=0, target=null, stopUntil=0, pops=0, queue=[], showing=null, bTimer=0;
    function el(){ return target||(target=document.getElementById(env.shake||P+'-canvas')); }
    function tick(ts){ var dt=lastT?Math.min(0.1,(ts-lastT)/1000):0; lastT=ts; trauma=Math.max(0,trauma-dt*1.6); var e=el();
      if(e){ if(trauma>0.01&&!reduce()){ var k=trauma*trauma*18, t=ts/1000; e.style.translate=((Math.sin(t*47)+Math.sin(t*31+1))*k/2).toFixed(1)+'px '+((Math.sin(t*41+2)+Math.sin(t*29))*k/2).toFixed(1)+'px'; } else e.style.translate=''; }
      if(trauma>0.01) requestAnimationFrame(tick); else { rafOn=false; lastT=0; } }
    var layer=add('<div class="rk-fx" id="'+P+'-fx" aria-hidden="true"></div>'), ban=add('<div class="rk-banner" id="'+P+'-banner" role="status" hidden><b></b><span></span></div>');
    function next(){ if(showing||!queue.length) return; if(RK.busy()){ clearTimeout(bTimer); bTimer=setTimeout(next,250); return; }
      showing=queue.shift(); ban.className='rk-banner'+(showing.kind?' '+showing.kind:''); ban.firstChild.textContent=showing.text; ban.lastChild.textContent=showing.sub||''; ban.hidden=false;
      if(ban.animate&&!reduce()) ban.animate([{opacity:0,scale:'0.9'},{opacity:1,scale:'1'}],{duration:160,easing:'ease-out'});
      clearTimeout(bTimer); bTimer=setTimeout(function(){ ban.hidden=true; showing=null; next(); },showing.ms||1600); }
    return {
      shake:function(a){ trauma=Math.min(1,trauma+(a==null?0.4:a)); if(!rafOn&&!reduce()){ rafOn=true; requestAnimationFrame(tick); } },
      stop:function(ms){ if(!reduce()) stopUntil=Math.max(stopUntil,Date.now()+Math.min(200,ms||60)); },
      frozen:function(){ return Date.now()<stopUntil; },
      pop:function(x,y,text,kind){ if(pops>=14) return; pops++; var s=document.createElement('span'); s.className='rk-pop'+(kind?' '+kind:''); s.textContent=text; s.style.left=x+'px'; s.style.top=y+'px'; layer.appendChild(s);
        var done=function(){ pops--; if(s.parentNode) s.parentNode.removeChild(s); };
        if(s.animate){ var a=s.animate(reduce()?[{opacity:1},{opacity:1,offset:0.8},{opacity:0}]:[{opacity:0,translate:'-50% -30%',scale:'0.7'},{opacity:1,translate:'-50% -90%',scale:'1.15',offset:0.18},{opacity:1,translate:'-50% -150%',scale:'1',offset:0.7},{opacity:0,translate:'-50% -190%',scale:'1'}],{duration:850,easing:'ease-out'}); a.onfinish=done; a.oncancel=done; } else setTimeout(done,850); },
      banner:function(text,sub,o){ o=o||{}; if((showing&&showing.text===text)||queue.some(function(q){ return q.text===text; })) return; if(queue.length>=3) queue.shift(); queue.push({text:text,sub:sub,kind:o.kind,ms:o.ms}); next(); },
      clear:function(){ queue=[]; clearTimeout(bTimer); ban.hidden=true; showing=null; trauma=0; },
      showing:function(){ return showing?showing.text:''; } };
  })();

  /* ======================= UPGRADE PICK =======================
     var pick = RK.pick({ title:'Hangar', options:function(){ return [ {id:'gun', name:'Gun up', desc:'One more barrel.', icon:'<canvas ...>' | '🔫', off:false}, ... ]; },
                          onPick:function(id){ ... }, done:function(){ ... } });
     pick.open(n, 'Both right: pick two!')   n picks in a row (default 1). Keys 1 2 3 or a click. An option with off:true shows greyed out.
     pick.resume()                            after loading a saved run (S.pick is saved with each choice, so a reload can't pick twice).
     Fixed rewards need no pick screen at all (Kody: fixed beats choice in Jump Man). Use this only where the choice is the fun. */
  RK.pick=function(o){
    var openAt=0, el=add('<div class="rk-dim" id="'+P+'-pick" hidden><div class="rk-win rk-pickwin" role="dialog" aria-modal="true" aria-labelledby="'+P+'-picktitle">'+
      '<h2 class="rk-qt" id="'+P+'-picktitle"></h2><p class="rk-picktip" id="'+P+'-picktip"></p><div class="rk-cards" id="'+P+'-cards"></div></div></div>');
    function isOpen(){ return !el.hidden; }
    function opts(){ return (o.options()||[]).slice(0,4); }
    function show(){ var s=S(), list=opts(); $('picktitle').textContent=o.title||'Pick one'; $('picktip').textContent=s.pick.tip||(s.pick.left>1?'Pick '+s.pick.left+'.':'Pick one.');
      $('cards').style.setProperty('--n',list.length);
      $('cards').innerHTML=list.map(function(c,i){ return '<button class="rk-card'+(c.off?' off':'')+'" type="button" data-i="'+i+'"'+(c.off?' disabled':'')+'><span class="rk-key">'+(i+1)+'</span>'+(c.icon?'<span class="ic">'+c.icon+'</span>':'')+'<span class="n">'+esc(c.name)+'</span><span class="d">'+esc(c.desc||'')+'</span></button>'; }).join(''); }
    function choose(i){ var s=S(), list=opts(), c=list[i]; if(!isOpen()||!s.pick||!c||c.off||Date.now()-openAt<400) return false;   /* 0.4 s: the key that answered the question never also picks */
      s.pick.left--; try{ o.onPick(c.id,c); }catch(e){} snd('pick');
      if(s.pick.left>0&&opts().some(function(x){ return !x.off; })){ s.pick.tip=''; openAt=Date.now(); save(); show(); return true; }
      s.pick=null; el.hidden=true; try{ if(o.done) o.done(); }finally{ save(); } return true; }
    el.addEventListener('click',function(e){ var b=e.target.closest?e.target.closest('.rk-card'):null; if(b) choose(+b.dataset.i); });
    document.addEventListener('keydown',function(e){ if(!isOpen()||idOpen('confirm')||idOpen('pause')||e.ctrlKey||e.metaKey||e.altKey) return; var n='1234'.indexOf(e.key);
      if(n>=0&&e.key.length===1){ e.preventDefault(); e.stopImmediatePropagation(); if(!e.repeat) choose(n); }
      else if(/^(Arrow|[wasdxkj ]$|Enter)/i.test(e.key)){ e.stopImmediatePropagation(); if(/^Arrow| /.test(e.key)) e.preventDefault(); } },true);
    return { isOpen:isOpen, choose:choose,
      open:function(n,tip){ var s=S(); if(isOpen()) return false; if(!opts().some(function(x){ return !x.off; })){ if(o.done) o.done(); return false; }
        s.pick={ left:n||1, tip:tip||'' }; el.hidden=false; openAt=Date.now(); save(); show(); return true; },
      resume:function(){ var s=S(); if(s&&s.pick&&!s.over){ el.hidden=false; openAt=Date.now(); show(); return true; } return false; },
      close:function(){ el.hidden=true; } };
  };

  /* ======================= PAUSE =======================
     RK.pause({ when:function(){ return S.started&&!S.over; }, controls:'ARROWS/WASD=Move | Space=Jump', stats:function(){ return [['Score',S.score],['Hearts',S.hearts]]; } })
     P or Esc pauses and resumes. The box has Music and Effects sliders and the keys. It also pauses when the tab is hidden, so a run clock never
     keeps going behind another tab. Check RK.busy() in the loop (it covers this box, cards, the pick and the new-game box). */
  RK.pause=function(o){ o=o||{};
    var el=add('<div class="rk-over" id="'+P+'-pause" hidden style="z-index:38"><div class="rk-win rk-ask rk-pausewin" role="dialog" aria-modal="true" aria-labelledby="'+P+'-ptitle">'+
      '<h2 id="'+P+'-ptitle">Paused</h2><div class="rk-stats" id="'+P+'-pstats"></div>'+
      '<div class="rk-vol"><label>Music <input type="range" id="'+P+'-volm" min="0" max="100" step="5" aria-label="Music volume"><b id="'+P+'-volmv"></b></label>'+
      '<label>Effects <input type="range" id="'+P+'-volf" min="0" max="100" step="5" aria-label="Effects volume"><b id="'+P+'-volfv"></b></label></div>'+
      '<div class="rk-pkeys"><div class="sz-ctl" data-ctl="'+esc(o.controls||'1234=Answer')+'"></div></div>'+
      '<div class="rk-row"><button class="rk-go" id="'+P+'-resume" type="button"><span class="rk-key sm">P</span>Resume</button></div></div></div>');
    function isOpen(){ return !el.hidden; }
    function sync(){ [['m','music'],['f','fx']].forEach(function(p){ var v=Math.round(RK.vol(p[1])*100); $('vol'+p[0]).value=v; $('vol'+p[0]+'v').textContent=v+'%'; }); }
    function can(){ return (!o.when||o.when())&&!idOpen('confirm')&&!idOpen('start')&&!idOpen('end'); }
    function open(){ if(isOpen()||!can()) return false; $('pstats').innerHTML=(o.stats?o.stats():[]).map(function(r){ return '<div class="rk-stat"><span class="l">'+esc(r[0])+'</span><span class="v">'+esc(typeof r[1]==='number'?r[1].toLocaleString('en-US'):r[1])+'</span></div>'; }).join('');
      sync(); el.hidden=false; if(o.onPause) o.onPause(true); return true; }
    function shut(){ if(!isOpen()) return; el.hidden=true; if(o.onPause) o.onPause(false); }
    $('volm').addEventListener('input',function(){ RK.vol('music',this.value/100); sync(); }); $('volf').addEventListener('input',function(){ RK.vol('fx',this.value/100); sync(); });
    $('volf').addEventListener('change',function(){ RK.snd('right'); });
    $('resume').addEventListener('click',shut);
    document.addEventListener('keydown',function(e){ if(e.target&&e.target.tagName==='INPUT'&&e.target.type!=='range') return; if(e.ctrlKey||e.metaKey||e.altKey||(e.shiftKey&&/^r$/i.test(e.key))) return;
      var k=e.key; if(isOpen()){ if(/^(p|Escape|Enter)$/i.test(k)){ e.preventDefault(); e.stopImmediatePropagation(); if(!e.repeat) shut(); }
        else if(!/^(f|m|n|Tab|Arrow(Left|Right))$/i.test(k)) e.stopImmediatePropagation(); return; }
      if(/^(p|Escape)$/i.test(k)&&!e.repeat&&can()){ e.preventDefault(); e.stopImmediatePropagation(); open(); } },true);
    document.addEventListener('visibilitychange',function(){ if(document.hidden&&o.auto!==false) open(); });
    function late(){ setTimeout(function(){ pixelArrows(el); var m=el.querySelector('.sz-meta'); if(m) m.hidden=true; },0); }
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',late); else late();
    return { el:el, isOpen:isOpen, open:open, close:shut };
  };

  /* ======================= RUN EXTRAS =======================
     RK.best       today's best score on this question set, to chase: RK.best.get(), RK.best.keep(score) (returns the old best). Never kept across days.
     RK.mult(n)    the answer-streak multiplier: 3 in a row ×1.5, 6 ×2, 10 ×3 (pass your own steps to change it). RK.multNext(n) says what is next.
     RK.goal({score, was, streak})  the one line to chase on the end screen.
     RK.idle({after:6, text:'Move! ← →', when:fn})  a nudge after 6 s with no key or click while the run is in play.
     M mutes. N is the kit.js music switch; pass env.music (the object from SpitzKit.game) and the kit wires N for you. */
  var STEPS=env.streak||[[3,1.5],[6,2],[10,3]];
  RK.mult=function(n){ var m=1; STEPS.forEach(function(s){ if(n>=s[0]) m=s[1]; }); return m; };
  RK.multNext=function(n){ for(var i=0;i<STEPS.length;i++) if(n<STEPS[i][0]) return { at:STEPS[i][0], mult:STEPS[i][1], more:STEPS[i][0]-n }; return null; };
  function day(){ var d=new Date(); return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate(); }
  RK.best=(function(){ var key=P+'_best'+(env.suffix||'');
    function get(){ try{ var v=JSON.parse(localStorage.getItem(key)||'null'); if(v&&v.d===day()) return v.v||0; }catch(e){} return 0; }
    return { get:get, keep:function(score){ var was=get(); if(score>was) try{ localStorage.setItem(key,JSON.stringify({d:day(),v:score})); }catch(e){} return was; } }; })();
  RK.goal=function(d){ var n=function(v){ return v.toLocaleString('en-US'); }, nx=RK.multNext(d.streak||0);
    if(d.was>0&&d.score>d.was) return 'New best today! Old best: '+n(d.was)+'.';
    if(d.was>d.score) return n(d.was-d.score)+' short of your best today.';
    if(nx) return (d.streak?'Best streak '+d.streak+': get ':'Next run: get ')+nx.at+' right in a row for ×'+nx.mult+' points.';
    return d.score>0?'Can you beat '+n(d.score)+'?':''; };
  RK.idle=function(o){ var lastIn=Date.now(), el=add('<div class="rk-nudge" id="'+P+'-nudge" hidden></div>'); el.textContent=o.text||'Keep moving!';
    ['keydown','pointerdown'].forEach(function(n){ addEventListener(n,function(){ lastIn=Date.now(); if(!el.hidden) el.hidden=true; },true); });
    setInterval(function(){ var on=(!o.when||o.when())&&!RK.busy(); if(!on){ lastIn=Date.now(); el.hidden=true; return; } el.hidden=Date.now()-lastIn<(o.after||6)*1000; },500);
    return { el:el, reset:function(){ lastIn=Date.now(); el.hidden=true; } }; };
  document.addEventListener('keydown',function(e){ if(e.target&&e.target.tagName==='INPUT') return; if(e.ctrlKey||e.metaKey||e.altKey||e.repeat) return;
    if(e.key==='m'||e.key==='M'){ var on=RK.mute(); if(env.toast) env.toast(on?'Sound off':'Sound on'); }
    else if((e.key==='n'||e.key==='N')&&env.music&&env.music.musicToggle&&!idOpen('confirm')) env.music.musicToggle(); });

  /* F = full screen (the kit's "Press F" button sends this key too) */
  if(env.fullscreen!==false) document.addEventListener('keydown',function(e){ if((e.key==='f'||e.key==='F')&&!e.ctrlKey&&!e.metaKey&&!(e.target&&e.target.tagName==='INPUT')){
    var d=document, r=d.documentElement; try{ if(d.fullscreenElement||d.webkitFullscreenElement) (d.exitFullscreen||d.webkitExitFullscreen).call(d); else (r.requestFullscreen||r.webkitRequestFullscreen).call(r); }catch(x){} } });
  return RK;
}
window.SpitzRemake={ make:make, version:VERSION, arrow:arrow, explainOnce:explainOnce };
if(window.SpitzKit) window.SpitzKit.remake=make;
})();
