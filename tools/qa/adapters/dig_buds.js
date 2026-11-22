/* Dig Buds adapter (tier 1: reads __G.state() and __G.P(); the checks only read them, except where a comment says it sets something up).
   A 3D block game (raw WebGL), so apps.json marks it "webgl": true and the harness launches Chrome with software WebGL.
   Questions come in Power Stops at set moments (every 40 s of play), so openQuestion fast-forwards the play timer to the first stop
   instead of waiting 25 s. Real input throughout: number keys answer, arrow keys walk, holding X digs, two clicks on Play again restart. */
const { sleep } = require('../lib/harness');

const A = {
  intents: { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown' },
  actName: 'holding X digs the block under you',
  resetKeys: ['score', 'cash', 'answered', 'correct', 'streak', 'mined', 'power', 'over'],

  async open(pg, set = 'mult') {
    await pg.goto(pg.qaUrl('games/dig_buds.html?set=' + set), { waitUntil: 'load' });
    await pg.evaluate(() => localStorage.clear()); await pg.reload({ waitUntil: 'load' });
    await pg.waitForFunction(() => window.__G && document.getElementById('dg-nameinput'), null, { timeout: 20000 });
  },
  async start(pg) {
    await pg.fill('#dg-nameinput', 'Test D'); await pg.click('#dg-go');
    await pg.waitForFunction(() => __G.state().started, null, { timeout: 8000 }).catch(() => {});
    await sleep(400);
  },
  snapshot: pg => pg.evaluate(() => { const S = __G.state(), P = __G.P();
    return { started: !!S.started, over: !!S.over, score: S.score, cash: S.cash, answered: S.answered, correct: S.correct, streak: S.streak,
      mined: S.mined, power: S.energy, stop: S.stop || null, menu: __G.M(), x: +P.x.toFixed(2), z: +P.z.toFixed(2), qOpen: !!(S.stop && S.q && !S.qDone) }; }),
  playable: s => s.started && !s.over,
  moved: (a, b) => Math.hypot(b.x - a.x, b.z - a.z) > 0.2,
  acted: (a, b) => b.mined > a.mined,
  answeredRight: (before, after) => after.correct === before.correct + 1 && after.power > before.power,

  /* Setup, not a check: jump the play timer to just before the first Power Stop, then let the game open it on its own. */
  async openQuestion(pg) {
    const before = await A.snapshot(pg);
    await pg.evaluate(() => { __G.state().playT = 24.9; });
    await pg.waitForFunction(() => { const S = __G.state(); return S.stop && S.q && !S.qDone; }, null, { timeout: 8000 }).catch(() => {});
    await sleep(500);   // the game ignores answers for 0.4 s after a question appears (double-tap guard)
    const q = await pg.evaluate(() => { const S = __G.state(); return { open: !!(S.stop && S.q && !S.qDone), right: S.q ? S.q.choices.findIndex(c => c.ok) : -1 }; });
    return { ...q, before };
  },
  /* Finish the Power Stop the way a student does: answer each question with its number key until the card closes. */
  async continueQuestion(pg) {
    for (let i = 0; i < 10; i++) {
      const s = await pg.evaluate(() => { const S = __G.state(); return { stop: !!S.stop, open: !!(S.q && !S.qDone), right: S.q ? S.q.choices.findIndex(c => c.ok) : -1 }; });
      if (!s.stop) break;
      if (s.open) { await sleep(450); await pg.keyboard.press('Digit' + (s.right + 1)); }
      await sleep(700);
    }
    await pg.waitForFunction(() => !__G.state().stop && !__G.M(), null, { timeout: 6000 }).catch(() => {});
    await sleep(200);
  },

  async act(pg) { await pg.keyboard.down('x'); await sleep(2500); await pg.keyboard.up('x'); await sleep(100); },
  async dirty(pg) { await pg.evaluate(() => { const S = __G.state(); S.score += 1234; S.cash += 50; S.streak = 4; S.energy += 30; }); },

  async forceEnd(pg) {
    await pg.evaluate(() => __G.end());
    await pg.waitForFunction(() => __G.state().over, null, { timeout: 8000 }).catch(() => {});
  },
  async endShown(pg) {
    try { await pg.waitForFunction(() => !document.getElementById('dg-end').hidden, null, { timeout: 15000 }); return true; } catch (e) { return false; }
  },
  async restart(pg) {
    await pg.click('#dg-again'); await sleep(250); await pg.click('#dg-again');   // asks "tap again" first, on purpose
    await pg.waitForFunction(() => !document.getElementById('dg-start').hidden, null, { timeout: 15000 }).catch(() => {});
    await A.start(pg);
  },
  scenarios: [],
};
module.exports = A;
