/* Star Swarm adapter (tier 2: __G.state(), __G.step(), __G.end()).
   Plays both versions: the live game (ver 2: side question panel, 5:00 wall clock) and the rebuild (ver 3: pop-up question card that
   freezes play, 5:00 wall clock). Real input throughout: number keys answer, arrow keys move, holding Space fires, Enter opens the card
   in the rebuild; Play again restarts (two clicks on the live game, one in the rebuild). Hooks only set the scene (score, the clock).
   STAR_SWARM_FILE=games/new/star_swarm/out/star_swarm.html plays a candidate build instead of the live file. */
const { sleep } = require('../lib/harness');
const FILE = process.env.STAR_SWARM_FILE || 'games/star_swarm.html';

const A = {
  intents: { left: 'ArrowLeft', right: 'ArrowRight', action: ' ' },
  unsupported: { up: 'the ship only moves left and right', down: 'the ship only moves left and right' },
  actName: 'holding Space fires',
  resetKeys: ['score', 'answered', 'correct', 'streak', 'over', 'shots'],

  async open(pg, set = 'mult') {
    await pg.goto(pg.qaUrl(FILE + '?set=' + set), { waitUntil: 'load' });
    await pg.evaluate(() => localStorage.clear()); await pg.reload({ waitUntil: 'load' });
    await pg.waitForFunction(() => window.__G && document.getElementById('sw-nameinput'), null, { timeout: 15000 });
  },
  async start(pg) {
    await pg.fill('#sw-nameinput', 'Test S'); await pg.click('#sw-go');
    await pg.waitForFunction(() => __G.state().started, null, { timeout: 8000 }).catch(() => {});
    await sleep(2600);                                   // the first wave flies in
  },
  snapshot: pg => pg.evaluate(() => { const S = __G.state(), sh = __G.ship(), v3 = S.ver === 3;
    return { ver: S.ver, started: !!S.started, over: !!S.over, score: S.score, answered: S.answered, correct: S.correct, streak: S.streak,
      shots: S.shots || 0, x: Math.round(sh.x), res: Math.round((v3 ? S.fuel : S.energy) * 10) / 10,
      qOpen: v3 ? __G.cardOpen() && !S.qDone : !!(S.q && !S.qDone) }; }),
  playable: s => s.started && !s.over,
  moved: (a, b) => a.x !== b.x,
  acted: (a, b) => b.shots > a.shots,
  answeredRight: (before, after) => after.correct === before.correct + 1 && after.res > before.res,

  /* The live game always shows a question. The rebuild opens its card when fuel runs out or on Enter: press the real Enter key. */
  async openQuestion(pg) {
    let before = await A.snapshot(pg);
    if (before.ver === 3 && !before.qOpen) { await pg.keyboard.press('Enter'); await sleep(450); before = await A.snapshot(pg); }
    const q = await pg.evaluate(() => { const S = __G.state(), open = S.ver === 3 ? __G.cardOpen() && !S.qDone : !!(S.q && !S.qDone);
      return { open, right: S.q ? S.q.choices.findIndex(c => c.ok) : -1 }; });
    return { ...q, before };
  },
  /* back to flying: the rebuild launches on Space (or by itself when the tank is full) */
  async continueQuestion(pg) {
    await sleep(900);
    if (!(await pg.evaluate(() => __G.state().ver === 3))) return;
    if (await pg.evaluate(() => __G.draftOpen())) { await pg.keyboard.press('Digit1'); await sleep(500); }
    if (await pg.evaluate(() => __G.cardOpen())) { await pg.keyboard.press('Space'); await sleep(800); }
  },
  async hold(pg, intent, ms) { const k = A.intents[intent]; await pg.keyboard.down(k); await sleep(ms); await pg.keyboard.up(k); await sleep(60); },
  async press(pg, intent) { await pg.keyboard.press(A.intents[intent] === ' ' ? 'Space' : A.intents[intent]); },
  async act(pg) { await pg.keyboard.down(' '); await sleep(450); await pg.keyboard.up(' '); await sleep(100); },
  async dirty(pg) { await pg.evaluate(() => { const S = __G.state(); S.score += 1234; S.streak = 4; }); },
  async forceEnd(pg) {
    await pg.evaluate(() => __G.end());
    await pg.waitForFunction(() => __G.state().over, null, { timeout: 8000 }).catch(() => {});
  },
  async endShown(pg) {
    try { await pg.waitForFunction(() => !document.getElementById('sw-end').hidden, null, { timeout: 15000 }); return true; } catch (e) { return false; }
  },
  async restart(pg) {
    await pg.waitForFunction(() => !document.getElementById('sw-again').disabled, null, { timeout: 5000 }).catch(() => {});
    await sleep(2100);                                   // the rebuild's Play again waits 2 s after the end
    await pg.click('#sw-again'); await sleep(350);
    // the live game asks "tap again" first and then shows the name box; the rebuild (v2) starts the next run on one tap, name kept
    if (await pg.evaluate(() => !__G.state().started || __G.state().over)) {
      if (await pg.evaluate(() => document.getElementById('sw-start').hidden)) { await pg.click('#sw-again'); await sleep(400); }
      await A.start(pg);
    } else await sleep(2600);
  },
  scenarios: [],
};
module.exports = A;
