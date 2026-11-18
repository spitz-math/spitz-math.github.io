// Plays the live Star Swarm (old) and the rebuild (new) hundreds of times with simulated students, on a virtual clock.
// Time is fake: Date.now, timers and rAF are replaced, the canvas draws nothing, and the bot drives the game's own update().
// A 5-minute run takes a second or two. Usage:
//   node games/new/star_swarm/tools/compare.js [runsPerCell=40] [sets=mult,slope] [out.json]
// Env: VERSIONS picks the files (see below). PAR = pages at once (default 6). PRIORS = JSON think/acc per set.
// oldBank: on the live game the question panel is always on screen, so students answer several ahead before flying (fits the log).
// Students: think time per question (lognormal), accuracy, dodge and aim skill, how many answers they bank before flying.
// Think-time and accuracy priors are placeholders until the answer log calibrates them (see PRIORS).
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const ROOT = path.resolve(__dirname, '../../../..');
// VERSIONS="old=games/star_swarm.html,v2=games/new/star_swarm/out/star_swarm_candidate.html" (paths from the repo root, or absolute)
const VERS = (process.env.VERSIONS || 'old=games/star_swarm.html,new=games/new/star_swarm/out/star_swarm_candidate.html').split(',').map(x => { const i = x.indexOf('='), l = x.slice(0, i), f = x.slice(i + 1); return [l, path.resolve(ROOT, f)]; });
const RUNS = +(process.argv[2] || 40), SETS = (process.argv[3] || 'mult,slope').split(','), OUT = process.argv[4];
const PAR = +(process.env.PAR || 6);

// median seconds to read and answer one question, by set; accuracy by set. Profiles scale these.
// calibrated 2026-11-18 from the answer log: the live game's full runs answer about 37 (mult) and 28 (algebra sets) in 5:00 at 93% right.
// With these, the simulated 'solid' student on the live game lands on those numbers.
const PRIORS = JSON.parse(process.env.PRIORS || 'null') || { mult: { think: 2.4, acc: 0.93 }, slope: { think: 3.5, acc: 0.93 } };
const PROFILES = {
  weak:    { thinkX: 1.4, accX: 0.8,  dodge: 0.25, aim: 0.5,  bank: 1, oldBank: 3, dash: 0,   shop: 0.4, feedback: 2.5 },
  solid:   { thinkX: 1.0, accX: 1.0,  dodge: 0.65, aim: 0.8,  bank: 2, oldBank: 5, dash: 0.3, shop: 1,   feedback: 1.5 },
  strong:  { thinkX: 0.7, accX: 1.12, dodge: 0.9,  aim: 0.95, bank: 3, oldBank: 6, dash: 0.8, shop: 1,   feedback: 0.8 },
  guesser: { thinkX: 0,   think: 1.2, acc: 0.25, dodge: 0.65, aim: 0.8, bank: 1, dash: 0.3, shop: 1, feedback: 0.3 }
};

const INIT = `(()=>{ let vt=0; const T0=1790000000000, q=[]; let id=1;
  Date.now=()=>T0+vt; performance.now=()=>vt;
  window.setTimeout=(f,ms,...a)=>{ const i=id++; q.push({i,t:vt+(+ms||0),f,a}); return i; };
  window.setInterval=(f,ms,...a)=>{ const i=id++, e=Math.max(1,+ms||0); q.push({i,t:vt+e,f,a,every:e}); return i; };
  window.clearTimeout=window.clearInterval=(i)=>{ const k=q.findIndex(e=>e.i===i); if(k>=0) q.splice(k,1); };
  window.requestAnimationFrame=()=>0; window.cancelAnimationFrame=()=>0;
  window.__vt=()=>vt;
  window.__adv=(ms)=>{ const end=vt+ms; for(;;){ let k=-1, mt=Infinity; for(let j=0;j<q.length;j++) if(q[j].t<mt){ mt=q[j].t; k=j; }
      if(k<0||mt>end) break; const e=q[k]; vt=Math.max(vt,e.t); if(e.every) e.t+=e.every; else q.splice(k,1);
      try{ if(typeof e.f==='function') e.f(...e.a); }catch(err){ (window.__errs=window.__errs||[]).push(String(err&&err.message||err)); } }
    vt=end; };
  const P=CanvasRenderingContext2D.prototype;
  ['fillRect','strokeRect','clearRect','fill','stroke','drawImage','fillText','strokeText','putImageData'].forEach(n=>{ P[n]=function(){}; });
  try{ localStorage.clear(); }catch(e){}
  window.addEventListener('error',e=>{ (window.__errs=window.__errs||[]).push(String(e.message)); });
})();`;

// the simulated student, run inside the page. ver 2 = live game, ver 3 = rebuild
function play(P) {
  const G = __G, $ = id => document.getElementById(id), DT = 1 / 30, MS = 1000 / 30;
  const rnd = Math.random, logn = (m, s) => m * Math.exp(s * Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd()));
  const S0 = G.state(), v3 = S0.ver === 3, C = G.consts;
  let stops = 0, mode = 'q', wait = 0.6, phase = 'think', thinkFor = 0, lastGain = 0, flyT = 0, qT = 0, cardT = 0, dashes = 0, shopT = 0, buys = 0;
  const ans = [], stuck = { n: 0 };
  const think = () => P.thinkX ? Math.max(1, logn(P.think, 0.45)) : P.think * (0.8 + 0.4 * rnd());
  const S = () => G.state();
  const keys = (l, r, f) => { G.key('l', l); G.key('r', r); G.key('f', f); };
  const click = el => { if (el && !el.disabled) { el.click(); return true; } return false; };
  const choose = () => { const ch = S().q.choices, ok = rnd() < P.acc; let i = ch.findIndex(c => !!c.ok === ok); if (i < 0) i = 0; return i; };
  function steer() { // one flying tick: dodge the nearest danger, else line up on a target
    const sh = G.ship(), shots = G.shots(), bo = G.boss(); let dir = 0, danger = null;
    shots.forEach(s => { const dy = C.SHIP_Y - s.y; if (dy > 0 && dy < 230 && Math.abs(s.x + (s.vx || 0) * (dy / Math.max(60, s.vy || 300)) - sh.x) < 46) danger = danger || s; });
    const foes = (v3 ? G.enemies() : G.aliens()).filter(a => !a.dead);
    foes.forEach(a => { if ((a.state === 'dive' || a.state === 'bomb' || a.state === 'beam') && a.y > C.SHIP_Y - 260 && Math.abs(a.x - sh.x) < 70) danger = danger || a; });
    if (v3 && bo && bo.beam >= 1 && Math.abs(bo.x - sh.x) < 110) danger = danger || { x: bo.x };
    if (danger && rnd() < P.dodge) { dir = sh.x < danger.x ? -1 : 1; if (sh.x < 120) dir = 1; if (sh.x > C.W - 120) dir = -1;
      if (v3 && rnd() < P.dash * 0.08) { keys(dir < 0, dir > 0, true); G.dash(); dashes++; } }
    else { let tx = null; const wv = !v3 && G.wave && G.wave(), ru = G.rush();
      if (wv && wv.pods && !wv.done) { const pod = rnd() < 0.02 ? null : (wv.pick = wv.pick || (rnd() < P.acc ? wv.pods.find(p => p.ok) : wv.pods[Math.floor(rnd() * wv.pods.length)])); tx = pod ? pod.x : null; }
      else if (bo && !bo.dead && (bo.enter == null || bo.enter >= 1)) { const B = v3 ? S().bossHp : S().boss; tx = bo.x + (B && B.l > 0 ? -215 : B && B.r > 0 ? 215 : 0); }
      else if (ru && !ru.done && ru.bugs) { const on = ru.bugs.filter(q => !q.dead && q.on !== false); if (on.length) tx = on.reduce((m, q) => Math.abs(q.x - sh.x) < Math.abs(m.x - sh.x) ? q : m).x; }
      else if (foes.length) tx = foes.reduce((m, a) => Math.abs(a.x - sh.x) < Math.abs(m.x - sh.x) ? a : m).x;
      const cp = G.caps()[0]; if (cp && cp.y > 500) tx = cp.x;
      if (tx != null && rnd() < P.aim) { if (Math.abs(tx - sh.x) > 14) dir = tx > sh.x ? 1 : -1; } else if (tx != null) dir = rnd() < 0.5 ? -1 : 1; }
    keys(dir < 0, dir > 0, true);
  }
  // ---- old game: question panel always on screen; energy drains while flying; shop
  const UPG_ORDER = ['energy', 'cannon', 'mult', 'energy', 'cannon', 'cash', 'mult', 'energy', 'cannon', 'mult', 'cash', 'cash'];
  function shopOld() { if (rnd() > P.shop) return 0; const s = S(); let n = 0;
    for (const id of UPG_ORDER) { const b = document.querySelector('.sw-buy[data-u="' + id + '"]'); if (!b) { click($('sw-shopbtn')); } }
    for (const id of UPG_ORDER) { const b = document.querySelector('.sw-buy[data-u="' + id + '"]'); if (b && !b.disabled) { b.click(); n++; } }
    if (!$('sw-shop').hidden) click($('sw-shopx')); buys += n; return n; }
  function tickOld() { const s = S(), wv = G.wave();
    if (wv && mode === 'q') { mode = 'fly'; wait = 0.8; }
    if (mode === 'fly') { if (wait > 0) { wait -= DT; keys(false, false, false); return; }
      if (!wv && s.energy <= 0) { mode = 'q'; stops++; phase = 'think'; wait = 0.8; thinkFor = think(); keys(false, false, false); return; }
      flyT += DT; steer(); return; }
    keys(false, false, false); qT += DT; if (wait > 0) { wait -= DT; return; }
    if (phase === 'think') { if (!s.q || s.qDone) { if (s.qDone && click($('sw-next'))) { thinkFor = think(); } return; }
      thinkFor -= DT; if (thinkFor > 0) return;
      const e0 = s.energy, i = choose(); document.querySelectorAll('#sw-choices .sw-ch')[i].click();
      const ok = !!s.q.choices[i].ok; ans.push([G.clock(), ok, +(window.__vt() / 1000).toFixed(1)]); if (ok) lastGain = s.energy - e0;
      phase = 'fb'; wait = ok ? 0.5 : P.feedback; return; }
    if (phase === 'fb') { // feedback read: then shop, fly, or the next question
      if (s.cash >= 30 && rnd() < 0.5) { const n = shopOld(); if (n) { wait = 2 + n; shopT += wait; return; } }
      if (lastGain > 0 && s.energy >= (P.oldBank || P.bank) * lastGain - 0.01) { mode = 'fly'; wait = 0.8; phase = 'think'; return; }
      if (s.qDone) { if (!click($('sw-next'))) return; } phase = 'think'; thinkFor = think(); return; } }
  // ---- rebuild: the card freezes the game; Space launches, a full tank launches itself; upgrade picks
  let banked = 0;
  function tickNew() { const s = S();
    if (G.draftOpen()) { keys(false, false, false); cardT += DT; if (wait > 0) { wait -= DT; return; } G.pick(Math.floor(rnd() * 3)); wait = 0.3; return; }
    if (!G.cardOpen()) { if (mode === 'q') { mode = 'fly'; banked = 0; } flyT += DT; steer(); return; }
    keys(false, false, false); cardT += DT;
    if (mode === 'fly') { mode = 'q'; stops++; phase = 'think'; thinkFor = think(); wait = 0.5; }
    if (wait > 0) { wait -= DT; return; }
    if (phase === 'think') { if (s.qDone) { phase = 'fb'; return; } thinkFor -= DT; if (thinkFor > 0) return;
      const i = choose(), ok = !!s.q.choices[i].ok, n0 = s.answered; G.answer(i); if (S().answered === n0) return;
      ans.push([G.clock(), ok, +(window.__vt() / 1000).toFixed(1)]); if (ok) banked++; phase = 'fb'; wait = ok ? 0.4 : P.feedback; return; }
    if (phase === 'fb') { if (!s.qDone) { phase = 'think'; thinkFor = think(); return; }
      const full = s.fuel >= G.cfg.fuel * G.cfg.tank - 0.05;
      if (s.fuel > 0.05 && (banked >= P.bank || full) && s.q.choices[s.picked].ok) { G.launch(); return; }
      if ($('sw-next').disabled) return; G.next(); if (G.cardOpen() && !S().qDone) { phase = 'think'; thinkFor = think(); } return; } }

  $('sw-nameinput').value = 'Sim S'; $('sw-nameinput').dispatchEvent(new Event('input', { bubbles: true })); $('sw-go').disabled = false; $('sw-go').click();
  if (!v3) { window.__adv(50); } else { window.__adv(50); }
  let ticks = 0; const LIMIT = 15 * 60 * 30;
  while (!S().over && ticks < LIMIT) { ticks++; if (v3) tickNew(); else tickOld(); G.step(DT); window.__adv(MS); }
  const s = S(), wall = window.__vt() / 1000;
  return { ver: s.ver, over: !!s.over, wall: +wall.toFixed(1), answered: s.answered, correct: s.correct, score: s.score, hurts: s.hurts, kills: s.kills,
    flyT: +flyT.toFixed(1), qT: +(v3 ? cardT : qT).toFixed(1), shopT: +shopT.toFixed(1), buys, picks: s.picks || 0, dashes,
    stops, novas: s.novas || 0, stage: v3 ? s.wave : s.stage, boss: v3 ? s.bossDown : s.bossKills, wavesHit: s.wavesHit || 0, ans, errs: (window.__errs || []).slice(0, 3) };
}

async function one(browser, label, file, set, prof) {
  const P = Object.assign({}, PROFILES[prof]);
  const pr = PRIORS[set] || PRIORS.slope; if (P.thinkX) { P.think = pr.think * P.thinkX; P.acc = Math.min(0.99, pr.acc * P.accX); }
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  await ctx.addInitScript(INIT); const pg = await ctx.newPage(); const errs = [];
  pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + file.split('?')[0] + '?set=' + set + (file.includes('?') ? '&' + file.split('?')[1] : '')); await pg.waitForFunction(() => window.__G && window.__vt, null, { timeout: 15000 });
  const r = await pg.evaluate(play, P); r.set = set; r.prof = prof; r.label = label; r.pageErrs = errs.slice(0, 3);
  await ctx.close(); return r;
}

function summarize(rows) {
  const g = {}; rows.forEach(r => { const k = [r.label, r.set, r.prof].join(' '); (g[k] = g[k] || []).push(r); });
  const med = a => { const b = a.slice().sort((x, y) => x - y); return b.length ? b[Math.floor(b.length / 2)] : 0; };
  const out = {};
  for (const k of Object.keys(g).sort()) { const a = g[k];
    const apm = a.map(r => r.answered / (r.wall / 60)), rpm = a.map(r => r.correct / (r.wall / 60));
    // pacing across the run: answers per minute in each third of the wall clock
    const thirds = [0, 1, 2].map(t => med(a.map(r => r.ans.filter(x => x[2] >= r.wall * t / 3 && x[2] < r.wall * (t + 1) / 3).length / (r.wall / 180))));
    out[k] = { runs: a.length, wallMin: +(med(a.map(r => r.wall)) / 60).toFixed(2), answers: med(a.map(r => r.answered)), apm: +med(apm).toFixed(2), rightPerMin: +med(rpm).toFixed(2),
      apmThirds: thirds.map(x => +x.toFixed(2)), flyShare: +med(a.map(r => r.flyT / r.wall)).toFixed(2), qShare: +med(a.map(r => r.qT / r.wall)).toFixed(2),
      score: med(a.map(r => r.score)), hurts: med(a.map(r => r.hurts)), bossShare: +(a.filter(r => r.boss > 0).length / a.length).toFixed(2),
      stage: med(a.map(r => r.stage)), stopsPerMin: +med(a.map(r => r.stops / (r.wall / 60))).toFixed(2), novasPerMin: +med(a.map(r => r.novas / (r.wall / 60))).toFixed(2), flightPerStop: +med(a.map(r => r.flyT / Math.max(1, r.stops))).toFixed(1), errs: a.reduce((n, r) => n + r.errs.length + r.pageErrs.length, 0), unfinished: a.filter(r => !r.over).length };
  }
  return out;
}

(async () => {
  const t0 = Date.now(), browser = await chromium.launch(), jobs = [];
  for (const set of SETS) for (const prof of Object.keys(PROFILES)) for (const [label, file] of VERS) for (let i = 0; i < RUNS; i++) jobs.push([label, file, set, prof]);
  const rows = []; let next = 0;
  await Promise.all(Array.from({ length: PAR }, async () => { while (next < jobs.length) { const j = jobs[next++];
    try { rows.push(await one(browser, ...j)); } catch (e) { rows.push({ label: j[0], set: j[2], prof: j[3], fail: String(e.message).slice(0, 200), ans: [], errs: [], pageErrs: [], wall: 1 }); }
    if (rows.length % 20 === 0) process.stderr.write(rows.length + '/' + jobs.length + ' runs\n'); } }));
  await browser.close();
  const sum = summarize(rows.filter(r => !r.fail));
  console.table(Object.fromEntries(Object.entries(sum).map(([k, v]) => [k, { runs: v.runs, min: v.wallMin, ans: v.answers, apm: v.apm, rpm: v.rightPerMin, stops: v.stopsPerMin, perStop: v.flightPerStop, nova: v.novasPerMin, fly: v.flyShare, hurts: v.hurts, score: v.score, boss: v.bossShare, errs: v.errs, unf: v.unfinished }])));
  const fails = rows.filter(r => r.fail); if (fails.length) console.log('FAILED runs:', fails.length, fails[0].fail);
  if (OUT) fs.writeFileSync(OUT, JSON.stringify({ priors: PRIORS, profiles: PROFILES, summary: sum, rows }, null, 0));
  console.log('done in', ((Date.now() - t0) / 1000).toFixed(0), 's');
})();
