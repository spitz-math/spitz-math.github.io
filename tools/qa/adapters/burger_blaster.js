/* Burger Blaster adapter (tier 1: uses only __G.state(), which 18 games share).
   Real input throughout: number keys answer, a mouse drag on the canvas fires, two clicks on Play again restart. */
const { sleep } = require('../lib/harness');

const A = {
  intents: {},
  unsupported: { movement: 'the burger cannon stays put; you aim with a slingshot drag' },
  actName: 'mouse drag fires a burger',
  resetKeys: ['score', 'burgers', 'cash', 'answered', 'correct', 'shots', 'level', 'over'],

  async open(pg, set = 'mult') {
    await pg.goto(pg.qaUrl('games/burger_blaster.html?set=' + set), { waitUntil: 'load' });
    await pg.evaluate(() => localStorage.clear()); await pg.reload({ waitUntil: 'load' });
    await pg.waitForFunction(() => window.__G && document.getElementById('bl-nameinput'), null, { timeout: 15000 });
  },
  async start(pg) {
    await pg.fill('#bl-nameinput', 'Test S'); await pg.click('#bl-go');
    await pg.waitForFunction(() => { const S = __G.state(); return S.started && S.q; }, null, { timeout: 8000 }).catch(() => {});
    await sleep(500);
  },
  snapshot: pg => pg.evaluate(() => { const S = __G.state();
    return { started: !!S.started, over: !!S.over, score: S.score, burgers: S.burgers, cash: S.cash, answered: S.answered, correct: S.correct,
      shots: S.shots, level: S.level, qOpen: !!(S.q && !S.qDone) }; }),
  playable: s => s.started && !s.over,
  acted: (a, b) => b.shots > a.shots,
  answeredRight: (before, after) => after.correct === before.correct + 1 && after.burgers > before.burgers,

  async openQuestion(pg) {
    const before = await A.snapshot(pg);
    const q = await pg.evaluate(() => { const S = __G.state(); return { open: !!(S.q && !S.qDone), right: S.q ? S.q.choices.findIndex(c => c.ok) : -1 }; });
    return { ...q, before };
  },

  /* Pull back on the slingshot and let go: a real mouse drag across the canvas. */
  async act(pg) {
    await sleep(500);                                // the game ignores shots less than 0.45 s apart
    const box = await pg.locator('canvas').first().boundingBox();
    const x = box.x + box.width * 0.45, y = box.y + box.height * 0.5;
    await pg.mouse.move(x, y); await pg.mouse.down();
    for (let i = 1; i <= 8; i++) { await pg.mouse.move(x - i * 14, y + i * 8); await sleep(20); }
    await pg.mouse.up(); await sleep(300);
  },
  async dirty(pg) { await pg.evaluate(() => { const S = __G.state(); S.score += 1234; S.cash += 50; }); },

  /* The round is timed: move the clock to the end, the way the starter template's __G.end does. */
  async forceEnd(pg) {
    await pg.evaluate(() => { __G.state().endAt = Date.now() - 1; });
    await pg.waitForFunction(() => __G.state().over, null, { timeout: 8000 }).catch(() => {});
  },
  async endShown(pg) {
    try { await pg.waitForFunction(() => !document.getElementById('bl-end').hidden, null, { timeout: 15000 }); return true; } catch (e) { return false; }
  },
  async restart(pg) {
    await pg.click('#bl-again'); await sleep(250); await pg.click('#bl-again');   // asks "tap again" first, on purpose
    await sleep(400); await A.start(pg);
  },
  scenarios: [],
};
module.exports = A;
