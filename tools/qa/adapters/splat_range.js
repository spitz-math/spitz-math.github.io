/* Splat Range adapter (tier 1: reads __G.state(); the game has more hooks, but the checks only read state).
   Same shape as Burger Blaster: a right answer buys paint, a click on the wall fires it, the round is on a timer.
   Real input throughout: number keys answer, a mouse click on the canvas fires, two clicks on Play again restart. */
const { sleep } = require('../lib/harness');

const A = {
  intents: {},
  unsupported: { movement: 'the paint cannon stays put; you aim by clicking the wall' },
  actName: 'mouse click on the wall fires paint',
  resetKeys: ['score', 'paint', 'cash', 'answered', 'correct', 'shots', 'streak', 'over'],

  async open(pg, set = 'mult') {
    await pg.goto(pg.qaUrl('games/splat_range.html?set=' + set), { waitUntil: 'load' });
    await pg.evaluate(() => localStorage.clear()); await pg.reload({ waitUntil: 'load' });
    await pg.waitForFunction(() => window.__G && document.getElementById('sr-nameinput'), null, { timeout: 15000 });
  },
  async start(pg) {
    await pg.fill('#sr-nameinput', 'Test S'); await pg.click('#sr-go');
    await pg.waitForFunction(() => { const S = __G.state(); return S.started && S.q && !S.qDone; }, null, { timeout: 8000 }).catch(() => {});
    await sleep(400);
  },
  snapshot: pg => pg.evaluate(() => { const S = __G.state();
    return { started: !!S.started, over: !!S.over, score: S.score, paint: S.paint, cash: S.cash, answered: S.answered, correct: S.correct,
      shots: S.shots, streak: S.streak, qOpen: !!(S.q && !S.qDone) }; }),
  playable: s => s.started && !s.over,
  acted: (a, b) => b.shots > a.shots,
  answeredRight: (before, after) => after.correct === before.correct + 1 && after.paint > before.paint,

  async openQuestion(pg) {
    const before = await A.snapshot(pg);
    const q = await pg.evaluate(() => { const S = __G.state(); return { open: !!(S.q && !S.qDone), right: S.q ? S.q.choices.findIndex(c => c.ok) : -1 }; });
    return { ...q, before };
  },

  /* One real click high on the wall (the game ignores clicks below the ground line). Paint comes from the right answer above. */
  async act(pg) {
    await sleep(200);
    const box = await pg.locator('canvas').first().boundingBox();
    await pg.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.3); await sleep(300);
  },
  async dirty(pg) { await pg.evaluate(() => { const S = __G.state(); S.score += 1234; S.cash += 50; S.paint += 7; }); },

  /* The round is timed: move the clock to the end (what __G.end does), then let the game's own timer notice. */
  async forceEnd(pg) {
    await pg.evaluate(() => { __G.state().endAt = Date.now() - 1; });
    await pg.waitForFunction(() => __G.state().over, null, { timeout: 8000 }).catch(() => {});
  },
  async endShown(pg) {
    try { await pg.waitForFunction(() => !document.getElementById('sr-end').hidden, null, { timeout: 15000 }); return true; } catch (e) { return false; }
  },
  async restart(pg) {
    await pg.click('#sr-again'); await sleep(250); await pg.click('#sr-again');   // asks "tap again" first, on purpose
    await sleep(400); await A.start(pg);
  },
  scenarios: [],
};
module.exports = A;
