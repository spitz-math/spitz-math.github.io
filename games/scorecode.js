/* Spitz Arcade score codes.
   Every game shows one code on its end screen. The code holds the game, the question set and topics,
   the run length, the day, the score and correct/answered, sealed with a check that includes the
   student's name, so a code only checks out next to the name it was earned under.
   Old codes keep reading after layout changes (see LAYOUT_A / LAYOUT_B / LAYOUT_C below).
   The teacher page (../teacher.html) reads codes with SpitzCode.read(code, name) and posts the checked top 10s
   to the student leaderboard (../leaderboard.html). Games never open a leaderboard themselves.

   Adding a game: give it the next unused id in GAMES, load this file on the page, and call
   SpitzCode.show(prefix, 'game_id', S) at the end of the end-screen function.
   S needs name, correct, answered, and score (or buds + rivals for a "versus" game, or strokes for golf).

   It stops copied, edited and shared codes. Someone who reads this file could still make a fake one. */
(function(){
'use strict';

var GAMES={                     /* id: [number in the code, display name, how it is ranked] — never renumber */
  splat_range:[1,'Splat Range','points'],
  star_swarm:[2,'Star Swarm','points'],
  shift_racer:[3,'Shift Racer','points'],
  jump_man_multiplication:[4,'Jump Man','points'],
  football_buds:[5,'Football Buds','versus'],
  hoop_buds:[6,'Hoop Buds','versus'],
  dash:[7,'Dash','points'],
  skate:[8,'Skate','points'],
  mini_golf:[9,'Mini Golf','points'],
  fishing:[10,'Go Fish','points'],
  brick_breaker:[11,'Brick Breaker','points'],
  burger_shop:[12,'Burger Shop','points'],
  burger_blaster:[13,'Burger Blaster','points'],
  rocket_buds:[14,'Rocket Buds','versus'],
  paint_royale:[15,'Paint Royale','points'],
  snake_arena:[16,'Snake Arena','points'],
  brawl_buds:[17,'Brawl Buds','versus'],
  pinball:[18,'Pinball','points'],
  hill_climb:[19,'Hill Climb','points'],
  fit_check:[20,'Fit Check','points']
};
/* question sets in the order questions.js lists them; 0 means the game's own questions. Add new sets at the end.
   New codes (layout C, since Oct 21 2026) have 6 bits for the set and 5 for topics, so up to 63 sets with up to 5 topics each fit. */
var SETS=[null,'mult','slope','point','hoy','shift','func','int','sq','plot0','plot','fam','fslope','stdform','slide','perp'];
var SET_NAMES={ mult:'Multiplication facts', slope:'Slope-intercept form', point:'Point-slope form', hoy:'HOY & VUX', shift:'Linear transformations', func:'Functions', int:'Integers', sq:'Squares & roots', plot0:'Graphing y = mx', plot:'Graphing y = mx + b', fam:'Function families', fslope:'Finding slope', stdform:'Standard form', slide:'Slide and Slice', perp:'Parallel & perpendicular' };
/* SET_TOPICS = topics on offer now. A topic's bit is its position, so never reorder; a dropped topic keeps its slot in TOPIC_NAMES
   (graphing's 'Plot it' and 'Points on the line', dropped Oct 10 2026) so older codes still name it. A dropped topic in the middle is null in
   SET_TOPICS (slope's 'yint', merged into 'slope' Oct 19 2026: bit 1 is now "Find slope or y-intercept", bit 2 only appears in older codes).
   TOPIC_ALIAS maps a retired topic id in an old link to the topic that replaced it.
   TOPIC_SHARE lists topics on offer that share another topic's bit, for a set with more topics than the 5 bits hold (Linear transformations
   got Stretches & compressions, Reflections and All together on Oct 25 2026: all three are bit 4, named "Stretches & reflections" in codes). */
var TOPIC_ALIAS={ slope:{ yint:'slope' } };
var TOPIC_SHARE={ shift:{ fl:'st', af:'st' } };
/* codes made before a topic change read with the names and topics on offer then */
var TOPIC_BEFORE={ slope:{ until:'2026-10-19', names:['Write the equation','Find the slope','Find the y-intercept','Read a graph'], topics:['write','slope','yint','graph'] } };
var SET_TOPICS={ mult:['f03','f46','f79','f1012'], slope:['write','slope',null,'graph'], point:['write','point','slope'], hoy:['describe','graph','slope'], shift:['vs','hs','gr','ne','st'], func:['points','table','map','graph'], int:['add','sub','mult'], sq:['square','root','neg','est'], plot0:['match','eq'], plot:['match','eq'], fam:['eq','graph'], fslope:['pts','graph','table','eq'], stdform:['x','y'], slide:['slide','slice','both','slope'], perp:['par','perp','pair'] };
var TOPIC_NAMES={ mult:['Facts 0–3','Facts 4–6','Facts 7–9','Facts 10–12'], slope:['Write the equation','Find slope or y-intercept','Find the y-intercept','Read a graph'],
  point:['Write the equation','Find the point','Find the slope'], hoy:['Describe the line','Match the graph','Find the slope'], shift:['Vertical shifts','Horizontal shifts','Graphs','New equations','Stretches & reflections'],
  func:['Ordered pairs','Tables','Mapping diagrams','Graphs'], int:['Adding','Subtracting','Multiplying'],
  sq:['Squaring','Square roots','Negatives','Estimating roots'],
  plot0:['Pick the line','Write the equation','Plot it','Points on the line'], plot:['Pick the line','Write the equation','Plot it','Points on the line'],
  fam:['From the equation','From the graph'], fslope:['From two points','From a graph','From a table','From an equation'], stdform:['x-intercept','y-intercept'], slide:['Slide','Slice','Both steps','Find the slope'], perp:['Parallel slopes','Perpendicular slopes','Spot the pair'] };

/* Google Form for score submissions. With only url, the button copies the code and opens the form.
   Add the entry.NNNN ids of the Name and Score code questions (from a pre-filled link) to fill both in for the student. */
/* Suggested skill bonus (Kody, 2026-10-21): a run on the skill Mr. Spitz suggests or assigns gets BONUS.pct percent more score, shown on the end
   screen and sealed into the code (read() gives bonus:true), so the leaderboard ranks the boosted score. SUGGEST matches the hub's SKILL list:
   set ids, and optionally topics, e.g. {id:'slide', topics:['both']} means only runs that stick to Both steps count. A run counts when its set
   is listed and every topic it plays is a suggested one. Versus games add the bonus to the Buds' side (rounded up).
   pct 0 or an empty list turns the bonus off. When the teacher panel's data/topics.json is loaded (window.SpitzTopics, set by questions.js),
   its suggest.sets and bonus win; it is read at the end of the run, so script order doesn't matter. BONUS below is the fallback. */
/* Assigned sets earn it too (Kody, 2026-10-21), so assign is matched the same way as suggest. */
var BONUS={ pct:25, suggest:[], assign:[] };
function bonusCfg(){ var T=window.SpitzTopics, c={ pct:BONUS.pct, suggest:BONUS.suggest, assign:BONUS.assign }; if(T){
  if(T.suggest) c.suggest=T.suggest.sets||[]; if(T.assign) c.assign=T.assign; if(T.bonus!=null) c.pct=+T.bonus||0; }
  c.list=(c.suggest||[]).concat(c.assign||[]); return c; }

/* The form and answer-log links are stored scrambled (base64 of the link backwards) so search engines and link scrapers
   don't pick them up from the public repo. A browser still has to open them, so this hides them from casual reading, not from
   someone determined. To change one: btoa(link.split('').reverse().join('')) in the browser console. */
function unhide(s){ try{ return s?atob(s).split('').reverse().join(''):''; }catch(e){ return ''; } }
var FORM={ url:unhide('bXJvZndlaXYvWXEzZV9WS2pGUG9HRl90YXE2cnhoSFV5bFJUR2JRRzZITnJ0LWhUZVA3MTEvZC9zbXJvZi9tb2MuZWxnb29nLnNjb2QvLzpzcHR0aA=='), name:'', code:'' };

var ALPH='ABCDEFGHJKLMNPQRSTUVWXYZ23456789', SECRET='spitz|burger|arcade', BASE=Date.UTC(2026,7,1);
var MASK=BigInt('0xB4E1C93A5D7F02E68C1A');            /* 80 bits */
/* 64 payload bits + 16 check bits. The check's salt says the layout: salts 0–7 = the older layouts, told apart by the first 2 bits (ver):
   ver 0 = layout B, Oct 10–21 2026 (4-bit set, 9-bit day); ver 1–3 = layout A, the first codes (3-bit set, 10-bit day).
   Salts 8–15 = layout C, made since Oct 21 2026: no ver bits, so the set gets 6 bits (63 sets) and topics 5; len (run minutes) drops to 3 bits (up to 7). */
var ORDER=['ver','game','set','topics','len','day','score','correct','answered'];
var LAYOUT_A={ ver:2, game:5, set:3, topics:4, len:4, day:10, score:20, correct:8, answered:8 };
var LAYOUT_B={ ver:2, game:5, set:4, topics:4, len:4, day:9, score:20, correct:8, answered:8 };
var LAYOUT_C={ game:5, set:6, topics:5, len:3, day:9, score:20, correct:8, answered:8 };

function h32(s){ var h=2166136261; for(var i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619)>>>0; } h^=h>>>13; h=Math.imul(h,0x5bd1e995)>>>0; h^=h>>>15; return h>>>0; }
function normName(n){ return String(n||'').toLowerCase().replace(/[^a-z0-9]/g,''); }
/* salt 1–3 give the same code a different spelling, used to skip codes that spell something rude */
function check(P,name,salt){ return BigInt(h32(SECRET+(salt?'#'+salt:'')+'|'+P.toString(36)+'|'+normName(name))&0xFFFF); }
function stream(chk){ var a=BigInt(h32(SECRET+'a'+chk)), b=BigInt(h32(SECRET+'b'+chk)); return ((a<<32n)|b); }   /* 64 bits */
function clamp(v,bits){ v=Math.round(+v||0); return Math.max(0,Math.min(v,Math.pow(2,bits)-1)); }
function today(){ var d=new Date(); return Math.floor((Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())-BASE)/864e5); }

function pack(f,W){ var P=0n; ORDER.forEach(function(k){ if(W[k]) P=(P<<BigInt(W[k]))|BigInt(clamp(f[k],W[k])); }); return P; }
function unpack(P,W){ var f={ ver:0 }; ORDER.slice().reverse().forEach(function(k){ if(!W[k]) return; var w=BigInt(W[k]); f[k]=Number(P&((1n<<w)-1n)); P>>=w; }); return f; }

function encode(f,name,salt){ var P=pack(f,LAYOUT_C), c=check(P,name,salt), full=(((P^stream(c))<<16n)|c)^MASK, s='';
  for(var i=0;i<16;i++){ s=ALPH[Number(full&31n)]+s; full>>=5n; } return s.slice(0,4)+'-'+s.slice(4,8)+'-'+s.slice(8,12)+'-'+s.slice(12); }

/* the hub link names the set and topics; no link means the game's own questions */
function linkSet(){ var q={}; try{ (location.search||'').replace(/^\?/,'').split('&').forEach(function(kv){ var p=kv.split('='); if(p[0]) q[p[0]]=decodeURIComponent(p[1]||''); }); }catch(e){}
  var set=SETS.indexOf(q.set); if(set<1) return {set:0,topics:0};
  var all=SET_TOPICS[q.set], sh=TOPIC_SHARE[q.set]||{}, picked=pickedTopics(q.set,q.topics), m=0;
  if(picked.length===offered(q.set).length) return {set:set,topics:0,picked:picked};   /* every topic = 0, same as none picked */
  picked.forEach(function(t){ m|=1<<all.indexOf(sh[t]||t); });
  return {set:set,topics:m,picked:picked}; }
/* topic ids on offer now, and the ones a link picks (none or no match = all, as questions.js plays it) */
function offered(set){ return SET_TOPICS[set].filter(Boolean).concat(Object.keys(TOPIC_SHARE[set]||{})); }
function pickedTopics(set,topics){ var al=TOPIC_ALIAS[set]||{}, want=String(topics||'').split(',').map(function(t){ return al[t]||t; }),
    p=offered(set).filter(function(t){ return want.indexOf(t)>=0; }); return p.length?p:offered(set); }

/* -> the bonus percent this run earns (0 = none) */
function bonusPct(){ var L=linkSet(), set=SETS[L.set], B=bonusCfg(); if(!set||!(B.pct>0)) return 0;
  var al=TOPIC_ALIAS[set]||{};
  return B.list.some(function(k){ if(!k||k.id!==set) return false; if(!k.topics||!k.topics.length) return true;
    var ok=k.topics.map(function(t){ return al[t]||t; }); return L.picked.every(function(t){ return ok.indexOf(t)>=0; }); })?B.pct:0; }
function boost(v,pct,up){ v=+v||0; return v>0&&pct? (up?Math.ceil:Math.round)(v*(100+pct)/100) : v; }

var RUDE=/FUCK|FUK|FCK|CUNT|SHT|ASS|FAG|CUM|DCK|DICK|PUSS|PNS|PENS|TWAT|SLUT|WHR|NGA|NGR|NAZ|KKK|RAPE|SEX|SXY|XXX|TTS|TTY|CLT|DYKE|GAY|HTLR|PUTA|CRAP|DAMN|HELL|BUTT|PEE|POOP/;
/* salts 12–15 (4–7 in layout B) mark a code that earned the Suggested skill bonus (the score in it is already boosted) */
function make(gameId,S){ var g=GAMES[gameId]; if(!g) throw new Error('Unknown game '+gameId); var L=linkSet(), score, pct=g[2]==='strokes'?0:bonusPct(), b=pct?12:8;
  if(g[2]==='versus') score=(clamp(boost(S.buds,pct,true),10)<<10)|clamp(S.rivals,10); else if(g[2]==='strokes') score=S.strokes; else score=boost(S.score,pct);
  var f={ game:g[0], set:L.set, topics:L.topics, len:S.len||0, day:today()%(1<<LAYOUT_C.day), score:score, correct:S.correct, answered:S.answered }, code;
  for(var salt=b;salt<b+4;salt++){ code=encode(f,S.name,salt); if(!RUDE.test(code.replace(/-/g,''))) break; }
  return code; }

/* -> the fields of P read with layout W, or null if they can't be a real run (recent=true also wants a day in the last year) */
function fields(P,W,recent){ var f=unpack(P,W), set=SETS[f.set]; f.W=W; f.id=null; Object.keys(GAMES).forEach(function(k){ if(GAMES[k][0]===f.game) f.id=k; });
  if(!f.id||f.set>=SETS.length||f.correct>f.answered) return null;
  if(recent){ var wrap=1<<W.day, now=today(), d=f.day; while(d+wrap<=now) d+=wrap; if(d>now||d<now-366||(f.topics>>(set?TOPIC_NAMES[set].length:0))) return null; }
  return f; }

/* -> null if the code is malformed or does not belong to this name, else what the code holds */
/* any=true skips the name check (the teacher's override for a mistyped name); the rest of the checks still apply */
function read(code,name,any){ var c=String(code||'').toUpperCase().replace(/[^A-Z0-9]/g,''); if(c.length!==16) return null;
  var full=0n; for(var i=0;i<16;i++){ var v=ALPH.indexOf(c[i]); if(v<0) return null; full=(full<<5n)|BigInt(v); }
  full^=MASK; var chk=full&0xFFFFn, P=(full>>16n)^stream(chk), prev=(P>>62n)===0n?LAYOUT_B:LAYOUT_A, f=null, bonus=false, salt;
  for(salt=0;salt<16&&!f;salt++) if(check(P,name,salt)===chk){ f=fields(P,salt<8?prev:LAYOUT_C); bonus=!!f&&salt%8>=4; }
  if(!f&&any){ f=fields(P,LAYOUT_C,true)||fields(P,prev,true); }   /* no name to tell the layout by: take the one that reads as a real recent run */
  if(!f) return null; var id=f.id, W=f.W;
  var g=GAMES[id], set=SETS[f.set], r={ code:c.slice(0,4)+'-'+c.slice(4,8)+'-'+c.slice(8,12)+'-'+c.slice(12), game:id, gameName:g[1], kind:g[2],
    set:set||'', setName:set?SET_NAMES[set]:'Game’s own questions', topics:[], len:f.len, correct:f.correct, answered:f.answered, bonus:bonus };
  if(set){ var names=TOPIC_NAMES[set]; r.topics=f.topics? names.filter(function(n,i){ return f.topics&(1<<i); }) : names.filter(function(n,i){ return !!SET_TOPICS[set][i]; }); r.allTopics=!f.topics; }
  var d=f.day, wrap=1<<W.day, now=today(); while(d+wrap<=now) d+=wrap; r.date=new Date(BASE+d*864e5); r.day=d;
  var old=set&&TOPIC_BEFORE[set]; if(old&&r.date<new Date(old.until+'T00:00:00Z')) r.topics=f.topics? old.names.filter(function(n,i){ return f.topics&(1<<i); }) : old.names.filter(function(n,i){ return !!old.topics[i]; });
  if(g[2]==='versus'){ r.buds=f.score>>10; r.rivals=f.score&1023; r.score=r.buds-r.rivals; r.display=r.buds+' – '+r.rivals; }
  else { r.score=f.score; r.display=f.score.toLocaleString(); }
  return r; }

/* ---------- end screen ---------- */
function css(){ if(document.getElementById('spz-code-css')) return; var st=document.createElement('style'); st.id='spz-code-css';
  st.textContent='.spz-code{ display:flex; flex-wrap:wrap; align-items:center; justify-content:center; gap:10px 22px; margin:6px auto 14px; padding:14px 26px; max-width:1100px; border-radius:18px; background:var(--panel,#191C25); border:3px dashed var(--accent,#FFB020); }'+
  '.spz-code .l{ font:800 20px/1 var(--body,Inter,sans-serif); letter-spacing:.12em; text-transform:uppercase; color:var(--muted,#9AA3B8); }'+
  '.spz-code .v{ font:800 46px/1 ui-monospace,Menlo,Consolas,monospace; letter-spacing:.05em; color:var(--text,#fff); -webkit-user-select:all; user-select:all; }'+
  '.spz-code .n{ flex-basis:100%; text-align:center; font:600 20px/1.3 var(--body,Inter,sans-serif); color:var(--muted,#9AA3B8); }'+
  '.spz-code .b{ flex-basis:100%; text-align:center; font:800 22px/1.3 var(--body,Inter,sans-serif); color:var(--accent,#FFB020); }'+
  '.spz-code a,a.spz-send{ font:800 22px/1 var(--body,Inter,sans-serif); color:var(--paper,#0E1016); background:var(--accent,#FFB020); padding:12px 20px; border-radius:12px; text-decoration:none; } a.spz-send{ display:inline-block; margin-top:6px; }';
  document.head.appendChild(st); }
function prefilled(){ return !!(FORM.url&&FORM.name&&FORM.code); }
function formLink(name,code){ if(!FORM.url) return ''; if(!prefilled()) return FORM.url;
  return FORM.url+(FORM.url.indexOf('?')<0?'?':'&')+'usp=pp_url&'+FORM.name+'='+encodeURIComponent(name)+'&'+FORM.code+'='+encodeURIComponent(code); }
function button(link,code){ return '<a href="'+link+'" target="_blank" rel="noopener" data-spz-code="'+code+'">'+(prefilled()?'Send my score':'Copy code &amp; open form')+'</a>'; }
/* Fresh start when coming back later (Kody, 2026-10-12): each game saves its run under KEY so a reload keeps it. We stamp every save
   with the time; on load, any run (finished or not) older than 20 minutes is cleared so the game opens
   at its start screen. Saves from before this change have no stamp and are cleared too. Add each new game's KEY here (the part before any set/topics suffix). */
(function(){
  var K={ splat_range:'splat_range_v5', star_swarm:'star_swarm_v1', shift_racer:'shift_racer_v1', jump_man_multiplication:'jump_man_facts_v1',
    football_buds:'football_buds_game_v2', hoop_buds:'hoop_buds_game_v1', dash:'dash_facts_game_v3', skate:'skate_game_v1', mini_golf:'mini_golf_v1',
    fishing:'go_fish_v1', brick_breaker:'brick_breaker_v1', burger_shop:'burger_shop_v1', burger_blaster:'burger_blaster_v1', rocket_buds:'rocket_buds_v1',
    paint_royale:'paint_royale_v1', snake_arena:'snake_arena_v1', brawl_buds:'brawl_buds_v1', pinball:'pinball_v1', hill_climb:'hill_climb_v1', fit_check:'fit_check_v1' };
  var f=(location.pathname.split('/').pop()||'').replace(/\.html?$/,'').replace(/_(mult|v\d|test)$/,''), key=K[f]; if(!key) return;
  var run=function(k){ return k.indexOf(key)===0&&!/_(mute|t)$/.test(k); };   /* KEY may carry the set and topics after it */
  try{ var ls=window.localStorage;
    Object.keys(ls).filter(run).forEach(function(k){ var st={}; try{ st=JSON.parse(ls.getItem(k))||{}; }catch(e){}
      var t=+ls.getItem(k+'_t')||0, limit=20*60e3;
      if(!t||Date.now()-t>limit){ ls.removeItem(k); ls.removeItem(k+'_t'); } });
    var set=Storage.prototype.setItem;
    Storage.prototype.setItem=function(k,v){ set.call(this,k,v); if(this===ls&&run(k)) try{ set.call(this,k+'_t',String(Date.now())); watch(k,v); }catch(e){} };
  }catch(e){}

  /* Answer log for Kody's Class Stats page (2026-10-16). Every game saves its run right after an answer, so when a save shows
     answered going up we log that question (topic, right or wrong, the prompt) to Kody's private Google Sheet through LOG.
     Off while LOG is empty (the link is scrambled, see unhide() above). Nothing is shown to students and nothing here ever reaches a public page. */
  var LOG=unhide('Y2V4ZS9RbWZncHQ5QVVMdm1GMjJybEVWRUhnenRtdU5HNGNsZVZzOUNuWVdlcFBIUm94VzVUUk54VzllX01QMk1reElZUWVyemJjeWZLQS9zL3NvcmNhbS9tb2MuZWxnb29nLnRwaXJjcy8vOnNwdHRo'), QK='spitz_log_q', DK='spitz_dev', seen={}, timer=0;
  function plain(h){ return String(h||'').replace(/<span class="[a-z]+-fr"><span>(.*?)<\/span><span>(.*?)<\/span><\/span>/g,'$1/$2').replace(/<[^>]+>/g,'').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\s+/g,' ').trim(); }
  function queue(){ try{ return JSON.parse(ls.getItem(QK)||'[]')||[]; }catch(e){ return []; } }
  function dev(){ var d=''; try{ d=ls.getItem(DK); if(!d){ d=Math.random().toString(36).slice(2,10); set.call(ls,DK,d); } }catch(e){} return d; }
  function flush(beacon){ clearTimeout(timer); timer=0; var q=queue(); if(!q.length||!LOG) return;
    var body=JSON.stringify({ v:1, rows:q.slice(0,100) }), sent=false;
    try{ if(beacon&&navigator.sendBeacon) sent=navigator.sendBeacon(LOG,new Blob([body],{type:'text/plain'})); }catch(e){}
    if(sent){ try{ set.call(ls,QK,JSON.stringify(q.slice(100))); }catch(e){} return; }
    try{ fetch(LOG,{ method:'POST', mode:'no-cors', keepalive:true, headers:{'Content-Type':'text/plain'}, body:body }).then(function(){
      var now=queue(); try{ set.call(ls,QK,JSON.stringify(now.slice(Math.min(100,q.length)))); }catch(e){} },function(){}); }catch(e){} }
  function watch(k,v){ if(!LOG) return; var m=/"answered":(\d+)/.exec(v); if(!m) return; var n=+m[1], was=seen[k]||0; seen[k]=n; if(n<=was) return;
    var S=JSON.parse(v), q=S.q, ok=null, pick=null, right=null;
    if(q&&S.qDone&&q.choices&&q.choices[S.picked]){ ok=!!q.choices[S.picked].ok; pick=plain(q.choices[S.picked].html); q.choices.forEach(function(c){ if(c.ok) right=plain(c.html); }); }
    var p={}; (location.search||'').replace(/^\?/,'').split('&').forEach(function(kv){ var a=kv.split('='); if(a[0]) try{ p[a[0]]=decodeURIComponent(a[1]||''); }catch(e){} });
    var row={ t:Date.now(), d:dev(), n:String(S.name||'').slice(0,40), g:f, s:p.set||'', ts:String(p.topics||'').slice(0,60), r:n,
      tp:ok===null?'':String(q.topic||'').slice(0,40), ty:ok===null?'':String(q.type||'').slice(0,30), ok:ok===null?'':ok?1:0,
      q:ok===null?'':plain(q.prompt).slice(0,120), a:pick===null?'':pick.slice(0,40), c:right===null?'':right.slice(0,40) };
    var all=queue(); all.push(row); if(all.length>500) all=all.slice(-500); try{ set.call(ls,QK,JSON.stringify(all)); }catch(e){}
    if(all.length>=10) flush(); else if(!timer) timer=setTimeout(flush,60e3); }
  try{ Object.keys(ls).filter(run).forEach(function(k){ var m=/"answered":(\d+)/.exec(ls.getItem(k)||''); seen[k]=m?+m[1]:0; }); }catch(e){}
  /* Game errors (2026-10-24): a script error on a student's Chromebook goes into the same log as a row with topic ERROR (message, file:line,
     browser), at most 5 per page, so Class Stats can list what broke without a student having to tell anyone. */
  var errs=0; function oops(msg,where){ if(!LOG||errs>=5) return; errs++; var nm=''; try{ Object.keys(ls).filter(run).some(function(k){ var m=/"name":"([^"]{0,40})"/.exec(ls.getItem(k)||''); return m&&(nm=m[1]); }); }catch(e){}
    var p={}; (location.search||'').replace(/^\?/,'').split('&').forEach(function(kv){ var a=kv.split('='); if(a[0]) try{ p[a[0]]=decodeURIComponent(a[1]||''); }catch(e){} });
    var row={ t:Date.now(), d:dev(), n:nm, g:f, s:p.set||'', ts:'', r:0, tp:'ERROR', ty:(/(CrOS|Windows|Mac OS X|iPhone|iPad|Android|Linux)/.exec(navigator.userAgent)||[''])[0]+' '+((/Chrome\/(\d+)/.exec(navigator.userAgent)||['',''])[1]?'Chrome '+/Chrome\/(\d+)/.exec(navigator.userAgent)[1]:''),
      ok:'', q:String(msg||'error').slice(0,120), a:String(where||'').slice(0,40), c:'' };
    var all=queue(); all.push(row); if(all.length>500) all=all.slice(-500); try{ set.call(ls,QK,JSON.stringify(all)); }catch(e){} if(!timer) timer=setTimeout(flush,5e3); }
  addEventListener('error',function(e){ if(!e||!e.message||/^Script error|ResizeObserver/.test(e.message)) return; oops(e.message,(String(e.filename||'').split('/').pop().split('?')[0])+':'+(e.lineno||0)); });
  addEventListener('unhandledrejection',function(e){ var r=e&&e.reason; oops('Promise: '+(r&&r.message||r),''); });
  if(LOG){ setTimeout(flush,4000); addEventListener('pagehide',function(){ flush(true); }); document.addEventListener('visibilitychange',function(){ if(document.visibilityState==='hidden') flush(true); }); }
})();
/* tab icon: each game has its own emoji icon (Kody, 2026-10-11), picked from the file name; unknown pages get the Spitz burger */
(function(){ if(document.querySelector('link[rel~="icon"]')) return;
  var E={ splat_range:'🎯', star_swarm:'👾', shift_racer:'🏎️', jump_man_multiplication:'👟', football_buds:'🏈', hoop_buds:'🏀', dash:'⚡', skate:'🛹', mini_golf:'⛳',
    fishing:'🎣', brick_breaker:'🧱', burger_shop:'🍟', burger_blaster:'💥', rocket_buds:'🚗', paint_royale:'🎨', snake_arena:'🐍', brawl_buds:'🥊', pinball:'🎱', hill_climb:'🚚', fit_check:'👗' };
  var f=(location.pathname.split('/').pop()||'').replace(/\.html?$/,'').replace(/_(mult|v\d|test)$/,''), e=E[f], l=document.createElement('link'); l.rel='icon'; l.type='image/svg+xml';
  l.href=e?'data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#17121F"/><text x="32" y="46" font-size="40" text-anchor="middle">'+e+'</text></svg>')
    :"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%2317121F'/%3E%3Cpath d='M10 29q0-17 22-17t22 17z' fill='%23F2A541'/%3E%3Cg fill='%23FFF3D6'%3E%3Cellipse cx='22' cy='21' rx='2.4' ry='1.4'/%3E%3Cellipse cx='32' cy='17' rx='2.4' ry='1.4'/%3E%3Cellipse cx='42' cy='21' rx='2.4' ry='1.4'/%3E%3Cellipse cx='28' cy='25' rx='2.4' ry='1.4'/%3E%3Cellipse cx='37' cy='25' rx='2.4' ry='1.4'/%3E%3C/g%3E%3Cpath d='M8 31h48l-4 5-5-3-5 3-5-3-5 3-5-3-5 3-5-3-5 3z' fill='%236FD34A'/%3E%3Crect x='9' y='35' width='46' height='8' rx='4' fill='%237A3B1E'/%3E%3Cpath d='M8 43h48l-3 3H11z' fill='%23FFC72C'/%3E%3Cpath d='M10 46h44q0 7-7 7H17q-7 0-7-7z' fill='%23F2A541'/%3E%3C/svg%3E";
  (document.head||document.documentElement).appendChild(l); })();
/* the leaderboard lives on the site, not in the games: hide any old in-game leaderboard button (Star Swarm's #sw-lbopen) */
(function(){ var st=document.createElement('style'); st.textContent='[id$="-lbopen"]{ display:none !important; }'; (document.head||document.documentElement).appendChild(st); })();
/* back to the arcade hub (Kody, 2026-10-24): a link in the top left of each game's start and end screens (the F hint waits top right).
   It borrows the game's own music button look, so it matches each game's colors and fonts. Test copies opened from a file go to the live hub.
   Shift Racer and Star Swarm line their title up on the left, so there it waits top right, beside the F hint. */
(function(){ function add(){ if(document.querySelector('.spz-hub')) return;
    var ov=[].filter.call(document.querySelectorAll('[id$="-start"],[id$="-end"]'),function(e){ return /^[a-z]{2}-(start|end)$/.test(e.id); }); if(!ov.length) return;
    var mus=document.getElementById('sz-mus'), go=document.querySelector('[id$="-start"] button[id$="-go"],[id$="-start"] button[id$="-go-start"]'), m=mus?getComputedStyle(mus):null, g=go?getComputedStyle(go):m,
      line=m&&m.borderTopStyle!=='none'&&m.borderTopWidth!=='0px'?m.borderTopColor:'rgba(255,255,255,.45)', font=g?g.fontFamily:'Inter,system-ui,sans-serif', rad=m?m.borderRadius:'999px',
      href=location.protocol==='file:'?'https://spitzmath.com/arcade/':'../arcade/', st=document.createElement('style');
    st.textContent='.spz-hub{ position:absolute; left:24px; top:24px; z-index:6; display:inline-flex; align-items:center; gap:12px; min-height:64px; box-sizing:border-box; padding:12px 28px 12px 20px; '+
      'border:3px solid '+line+'; border-radius:'+rad+'; background:rgba(8,8,12,.85); color:#fff; font:400 27px/1 '+font+'; letter-spacing:.02em; text-decoration:none; cursor:pointer; transition:background .15s; }'+
      '.spz-hub.r{ left:auto; right:310px; }'+
      '.spz-hub b{ font:800 30px/1 Inter,system-ui,sans-serif; color:'+line+'; }'+
      '.spz-hub:hover,.spz-hub:focus-visible{ background:rgba(255,255,255,.14); outline:none; }';
    (document.head||document.documentElement).appendChild(st);
    ov.forEach(function(o){ var a=document.createElement('a'); a.className='spz-hub'+(/^(rc|sw)-/.test(o.id)?' r':''); a.href=href; a.innerHTML='<b aria-hidden="true">←</b>Back to Arcade'; a.setAttribute('aria-label','Back to the Spitz Arcade'); o.appendChild(a); }); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',add); else add(); })();
/* copy the code as the form opens, so the student can paste it */
document.addEventListener('click',function(e){ var a=e.target.closest&&e.target.closest('[data-spz-code]'); if(!a) return; var c=a.getAttribute('data-spz-code');
  try{ navigator.clipboard.writeText(c).then(function(){ a.textContent='Code copied ✓'; },function(){}); }catch(err){} },true);
/* the bonus line on the end screen: what the run scored and what the code counts */
function bonusLine(gameId,S){ var g=GAMES[gameId], pct=g&&g[2]!=='strokes'?bonusPct():0; if(!pct) return '';
  var was, now; if(g[2]==='versus'){ was=(+S.buds||0)+' – '+(+S.rivals||0); now=boost(S.buds,pct,true)+' – '+(+S.rivals||0); }
  else { was=(+S.score||0).toLocaleString(); now=boost(S.score,pct).toLocaleString(); }
  return '<span class="b">⭐ Suggested skill bonus +'+pct+'%'+(was!==now?': '+was+' → '+now:'')+'</span>'; }
function show(PFX,gameId,S){ try{
  var code=make(gameId,S), link=formLink(S.name,code), old=document.getElementById(PFX+'-endcode'), bl=bonusLine(gameId,S);
  css();
  if(old){ old.textContent=code; old.classList.add('spz-v'); var box=old.parentNode;
    if(link&&!box.querySelector('.spz-send')) box.insertAdjacentHTML('beforeend',button(link,code).replace('<a ','<a class="spz-send" '));
    var ob=box.querySelector('.spz-code-b'); if(ob) ob.remove(); if(bl) box.insertAdjacentHTML('beforeend',bl.replace('class="b"','class="b spz-code-b" style="display:block;margin-top:6px;font:800 20px/1.3 var(--body,Inter,sans-serif);color:var(--accent,#FFB020)"'));
    return code; }
  var end=document.getElementById(PFX+'-end'); if(!end) return code;
  var el=end.querySelector('.spz-code');
  if(!el){ el=document.createElement('div'); el.className='spz-code'; var again=document.getElementById(PFX+'-again');
    if(again&&again.parentNode) again.parentNode.insertBefore(el,again); else (end.firstElementChild||end).appendChild(el); }
  el.innerHTML=bl+'<span class="l">Score code</span><span class="v">'+code+'</span>'+(link?button(link,code):'')+
    '<span class="n">'+(!link?'Type your name and this code into the class Google Form.':prefilled()?'Tap Send my score, then Submit on the form.':'Tap the button, then paste the code into the form with your name.')+'</span>';
  return code; }catch(e){ return ''; } }

window.SpitzCode={ BONUS:BONUS, bonusPct:bonusPct, GAMES:GAMES, SET_NAMES:SET_NAMES, TOPIC_NAMES:TOPIC_NAMES, make:make, read:read, show:show, normName:normName, today:today, FORM:FORM };
})();
