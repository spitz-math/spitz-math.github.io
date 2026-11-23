/* Shared adapter builder for the classic kit games (2026-11-23, thread "Bug check every Arcade game").
   Most Arcade games share one shape: a start screen with <prefix>-nameinput and a Start button, __G.state() with
   started/over/score/answered/correct/streak and q.choices[].ok, an end screen <prefix>-end and a two-tap <prefix>-again.
   make({...}) turns that shape into a tier 1 adapter, so a game only lists what is its own:
     id, pre             page name and id prefix ('mini_golf', 'mg')
     go                  Start button id when it is not <pre>-go (the pit games use <pre>-go-start)
     extra               more state fields that Play again must put back (dotted paths into __G.state())
     watch               fields read for the movement/action checks only; 'G.paddle.x' reads __G.paddle().x
     resetKeys           snapshot fields Play again must put back (default: the shared counters plus extra)
     endBy               'endAt' (timed by a deadline), 'clock' / 'left' (seconds counting down), or 'end' (the game's __G.end,
                         for games where time running out can mean overtime)
     clear               after the first answer, keep answering with real number keys (and Enter between questions)
                         until no question is open, for games that ask a few before play goes on
     intents, moved      real keys that move the player, and how to tell it moved (from the snapshot's extra fields)
     act, acted, actName the main action (a key in intents.action, or an act(pg) function) and how to tell it happened
     unsupported         { movement: 'why' } for things the game does not have
   Hooks only set the scene (open a question, move the clock to its end); real keys and clicks do the action. */
const { sleep } = require('../lib/harness');

const BASE = ['score', 'cash', 'answered', 'correct', 'streak', 'best'];

function make(o) {
  const pre = o.pre, extra = o.extra || [], watch = o.watch || [];
  const A = {
    intents: o.intents || {},
    unsupported: o.unsupported || {},
    actName: o.actName,
    resetKeys: o.resetKeys || BASE.concat(['over'], extra),

    async open(pg, set = 'mult') {
      await pg.goto(pg.qaUrl(`games/${o.id}.html?set=` + set), { waitUntil: 'load' });
      await pg.evaluate(() => localStorage.clear()); await pg.reload({ waitUntil: 'load' });
      await pg.waitForFunction(p => window.__G && document.getElementById(p + '-nameinput'), pre, { timeout: 15000 });
    },
    async start(pg) {
      await pg.fill(`#${pre}-nameinput`, 'Test S'); await pg.click('#' + (o.go || pre + '-go'));
      await pg.waitForFunction(() => __G.state().started, null, { timeout: 8000 }).catch(() => {});
      await sleep(600);
    },
    snapshot: pg => pg.evaluate(keys => { const S = __G.state(), r = { started: !!S.started, over: !!S.over, qOpen: !!(S.q && !S.qDone) };
      keys.forEach(k => { let v;
        if (k.startsWith('G.')) { const [, f, ...rest] = k.split('.'); let o = typeof __G[f] === 'function' ? __G[f]() : __G[f]; v = rest.reduce((x, p) => (x == null ? x : x[p]), o); }
        else v = k.split('.').reduce((x, p) => (x == null ? x : x[p]), S);
        r[k] = (typeof v === 'number') ? Math.round(v * 100) / 100 : v; });
      return r; }, BASE.concat(extra, watch)),
    playable: s => s.started && !s.over,
    answeredRight: (before, after) => after.correct === before.correct + 1 && after.answered === before.answered + 1,

    /* wait for the game's own question; if none comes, the game's showQ hook opens one (setting the scene) */
    async openQuestion(pg) {
      const before = await A.snapshot(pg);
      const open = () => pg.evaluate(() => { const S = __G.state(); return S.q && !S.qDone ? S.q.choices.findIndex(c => c.ok) : -1; });
      let right = -1;
      for (let i = 0; i < 30 && right < 0; i++) {
        right = await open(); if (right >= 0) break;
        if (i === 10) await pg.evaluate(() => { try { if (__G.showQ) __G.showQ(); else if (__G.newQ) __G.newQ(); } catch (e) { } });
        await sleep(150);
      }
      return { open: right >= 0, right, before: right >= 0 ? await A.snapshot(pg) : before };
    },
    async dirty(pg) { await pg.evaluate(() => { const S = __G.state(); S.score = (S.score || 0) + 1234; if (typeof S.cash === 'number') S.cash += 50; S.streak = 4; S.best = Math.max(S.best || 0, 4); }); },

    /* the run is timed: put the clock at its last moment and let the game's own loop end it */
    async forceEnd(pg) {
      await pg.evaluate(by => { const S = __G.state(); if (by === 'end') __G.end(); else if (by === 'endAt') S.endAt = Date.now() - 1; else S[by] = 0.01; }, o.endBy || 'endAt');
      await pg.waitForFunction(() => __G.state().over, null, { timeout: 8000 }).catch(() => {});
    },
    async endShown(pg) {
      try { await pg.waitForFunction(p => !document.getElementById(p + '-end').hidden, pre, { timeout: 15000 }); return true; } catch (e) { return false; }
    },
    async restart(pg) {
      await pg.click(`#${pre}-again`); await sleep(250);
      if (await pg.isVisible(`#${pre}-again`)) await pg.click(`#${pre}-again`);   // asks "tap again" first, on purpose
      await sleep(400); await A.start(pg);
    },
    scenarios: [],
  };
  if (o.moved) A.moved = o.moved;
  if (o.act) A.act = o.act;
  if (o.acted) A.acted = o.acted;
  if (o.continueQuestion) A.continueQuestion = o.continueQuestion;
  else if (o.clear) A.continueQuestion = async pg => {
    for (let i = 0; i < 10; i++) {
      const r = await pg.evaluate(() => { const S = __G.state(); return S.q && !S.qDone ? S.q.choices.findIndex(c => c.ok) : -1; });
      if (r >= 0) { await pg.keyboard.press('Digit' + (r + 1)); await sleep(350); continue; }
      await pg.keyboard.press('Enter'); await sleep(300);
      if (await pg.evaluate(() => { const S = __G.state(); return !(S.q && !S.qDone); })) break;
    }
  };
  return A;
}

module.exports = { make };
