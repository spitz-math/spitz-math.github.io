/* Snake Arena adapter (tier 1: reads __G.state() and __G.me(); the checks only read them).
   Shape like Rocket Buds: a snack stop BEFORE play (answer 3 in mult, 2 otherwise, then Space to slither), then a live arena on a 5-minute clock.
   Real input throughout: number keys answer, Space leaves the stop, arrow keys steer, holding Space boosts, two clicks on Play again restart. */
const { sleep } = require('../lib/harness');

const A = {
  intents: { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown' },
  actName: 'holding Space boosts the snake',
  resetKeys: ['score', 'cash', 'answered', 'correct', 'streak', 'takedowns', 'phase', 'stopKind', 'clock', 'over'],

  async open(pg, set = 'mult') {
    await pg.goto(pg.qaUrl('games/snake_arena.html?set=' + set), { waitUntil: 'load' });
    await pg.evaluate(() => localStorage.clear()); await pg.reload({ waitUntil: 'load' });
    await pg.waitForFunction(() => window.__G && document.getElementById('sn-nameinput'), null, { timeout: 15000 });
  },
  async start(pg) {
    await pg.fill('#sn-nameinput', 'Test S'); await pg.click('#sn-go-start');
    await pg.waitForFunction(() => { const S = __G.state(); return S.started && S.phase === 'stop' && S.q && !S.qDone; }, null, { timeout: 8000 }).catch(() => {});
    await sleep(300);
  },
  /* clock in whole minutes so the restart check compares "a fresh 5:00 run", not the exact tenth of a second */
  snapshot: pg => pg.evaluate(() => { const S = __G.state(), m = (S.sn && __G.me()) || {};
    return { started: !!S.started, over: !!S.over, phase: S.phase, stopKind: S.stopKind, score: S.score, cash: S.cash, en: Math.round(S.en),
      answered: S.answered, correct: S.correct, streak: S.streak, takedowns: S.takedowns, clock: Math.ceil(S.clock / 60), want: m.want, alive: !!m.alive,
      sawBoost: !!window.__qaSawBoost, qOpen: !!(S.phase === 'stop' && S.q && !S.qDone) }; }),
  playable: s => s.started && !s.over,
  /* the snake always slithers forward, so "moved" means the arrow key turned it */
  moved: (a, b) => a.phase === 'live' && b.phase === 'live' && a.want !== b.want,
  acted: (a, b) => !a.sawBoost && b.sawBoost,
  answeredRight: (before, after) => after.correct === before.correct + 1 && after.en > before.en,

  async openQuestion(pg) {
    const before = await A.snapshot(pg);
    const q = await pg.evaluate(() => { const S = __G.state(); return { open: !!(S.phase === 'stop' && S.q && !S.qDone), right: S.q ? S.q.choices.findIndex(c => c.ok) : -1 }; });
    return { ...q, before };
  },
  /* Finish the snack stop the way a student does: answer until it lets you go, then Space, then wait out the countdown. */
  async continueQuestion(pg) {
    for (let i = 0; i < 8; i++) {
      const s = await pg.evaluate(() => { const S = __G.state(); return { go: __G.canGo(), open: !!(S.q && !S.qDone), right: S.q ? S.q.choices.findIndex(c => c.ok) : -1 }; });
      if (s.go) break;
      if (s.open) { await pg.keyboard.press('Digit' + (s.right + 1)); await sleep(300); }
      else { await pg.keyboard.press('Enter'); await sleep(500); }   // mult moves on by itself; Enter covers the other sets
    }
    await pg.keyboard.press('Space');
    await pg.waitForFunction(() => __G.state().phase === 'live', null, { timeout: 6000 }).catch(() => {});
    await sleep(200);
  },

  /* Hold the real Space key; while it is held, note whether the game switched the boost on (it switches off on release). */
  async act(pg) {
    await pg.keyboard.down('Space'); await sleep(350);
    await pg.evaluate(() => { const m = __G.me(); window.__qaSawBoost = !!(m && m.boost); });
    await pg.keyboard.up('Space'); await sleep(100);
  },
  async dirty(pg) { await pg.evaluate(() => { const S = __G.state(); S.score += 1234; S.cash += 50; S.takedowns = 3; S.streak = 4; }); },

  /* The run is timed: put the clock at its last moment (what __G.end does) and let the game's own loop end it. */
  async forceEnd(pg) {
    await pg.evaluate(() => { __G.state().clock = 0.01; });
    await pg.waitForFunction(() => __G.state().over, null, { timeout: 8000 }).catch(() => {});
  },
  async endShown(pg) {
    try { await pg.waitForFunction(() => !document.getElementById('sn-end').hidden, null, { timeout: 15000 }); return true; } catch (e) { return false; }
  },
  async restart(pg) {
    await pg.click('#sn-again'); await sleep(250); await pg.click('#sn-again');   // asks "tap again" first, on purpose
    await sleep(400); await pg.evaluate(() => { window.__qaSawBoost = false; }); await A.start(pg);
  },
  scenarios: [],
};
module.exports = A;
