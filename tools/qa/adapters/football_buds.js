/* Football Buds BLITZ adapter (tier 1: reads __G.state() and __G.play(); the checks only read them).
   Shape: a huddle (one question, then a bonus question) before every snap, then a pick-a-play shelf; Space hikes and the play goes live.
   Real input throughout: number keys answer, Space hikes / spins, arrow keys run, two clicks on Play again restart. */
const { sleep } = require('../lib/harness');

const A = {
  intents: { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown', action: ' ' },
  actName: 'Space throws the ball (or spins once you run with it)',
  resetKeys: ['score', 'pts', 'buds', 'rivals', 'answered', 'correct', 'qtr', 'clock', 'over'],

  async open(pg, set = 'mult') {
    await pg.goto(pg.qaUrl('games/football_buds.html?set=' + set), { waitUntil: 'load' });
    await pg.evaluate(() => localStorage.clear()); await pg.reload({ waitUntil: 'load' });
    await pg.waitForFunction(() => window.__G && document.getElementById('fb-nameinput'), null, { timeout: 20000 });
  },
  async start(pg) {
    await pg.fill('#fb-nameinput', 'Test S');
    await pg.waitForFunction(() => !document.getElementById('fb-go').disabled, null, { timeout: 8000 }).catch(() => {});
    await pg.click('#fb-go');
    await pg.waitForFunction(() => { const S = __G.state(); return S.started && __G.huddleOpen(); }, null, { timeout: 8000 }).catch(() => {});
    await sleep(300);
  },
  /* clock in whole seconds so the restart check compares "a fresh 8:00 game" */
  snapshot: pg => pg.evaluate(() => { const S = __G.state(), P = __G.play() || {}, me = P.me || {};
    return { started: !!S.started, over: !!S.over, score: S.score || 0, pts: S.pts, buds: S.buds, rivals: S.rivals, answered: S.answered, correct: S.correct,
      qtr: S.qtr, clock: Math.ceil(S.clock), live: !!P.live, x: Math.round((me.x || 0) * 10), y: Math.round((me.y || 0) * 10), qOpen: !!__G.huddleOpen(), passed: !!(P.passed || P.ball), st: me.st || '', flip: (P.flipUntil || 0) > (P.t || 0) }; }),
  playable: s => s.started && !s.over,
  /* only while the ball is live: the huddle and the pick shelf freeze the players */
  moved: (a, b) => a.live && b.live && (a.x !== b.x || a.y !== b.y),
  acted: (a, b) => a.live && (b.passed !== a.passed || (b.st !== a.st && /spin|truck|dive|jump|wrap/.test(b.st)) || (!a.flip && b.flip)),
  answeredRight: (before, after) => after.correct === before.correct + 1 && after.answered === before.answered + 1,

  async openQuestion(pg) {
    const before = await A.snapshot(pg);
    const q = await pg.evaluate(() => { const S = __G.state(); return { open: !!__G.huddleOpen(), right: S.q ? S.q.choices.findIndex(c => c.ok) : -1 }; });
    return { ...q, before };
  },
  /* Finish the huddle the way a student does: answer (or Space to skip the bonus) until the pick shelf opens. */
  async continueQuestion(pg) {
    for (let i = 0; i < 8; i++) {
      const s = await pg.evaluate(() => { const S = __G.state(); return { open: !!__G.huddleOpen(), pick: !!(__G.pickOpen && __G.pickOpen()), ask4: !!S.ask4, right: S.q ? S.q.choices.findIndex(c => c.ok) : -1 }; });
      if (s.pick || (!s.open && !s.ask4)) break;
      if (s.open && s.right >= 0) await pg.keyboard.press('Digit' + (s.right + 1));
      await sleep(600);
    }
    await sleep(800);   // the play cards deal in
    for (let i = 0; i < 6; i++) { await pg.keyboard.press('Space'); await sleep(250); if (await pg.evaluate(() => !!(__G.play() || {}).live)) break; }   // Space hikes
  },

  async act(pg) { await pg.keyboard.press('Space'); },
  async dirty(pg) { await pg.evaluate(() => { const S = __G.state(); S.pts += 1234; S.score = S.pts; S.buds = 14; S.rivals = 3; }); },

  /* The clock only runs during live plays: put it at the last whistle of the 4th quarter with the Buds ahead and end the play. */
  async forceEnd(pg) {
    await pg.evaluate(() => { const S = __G.state(), P = __G.play(); S.buds = S.rivals + 7; S.qtr = 4; S.clock = 0; if (P) { P.live = false; P.dead = 0.05; } });
    await pg.waitForFunction(() => __G.state().over, null, { timeout: 12000 }).catch(() => {});
  },
  async endShown(pg) {
    try { await pg.waitForFunction(() => !document.getElementById('fb-end').hidden, null, { timeout: 15000 }); return true; } catch (e) { return false; }
  },
  async restart(pg) {
    await pg.click('#fb-again'); await sleep(250); await pg.click('#fb-again');   // asks "tap again" first, on purpose
    await sleep(500);
    if (await pg.evaluate(() => !document.getElementById('fb-nameinput') || document.getElementById('fb-start').hidden)) return;
    await A.start(pg);
  },
  scenarios: [],
};
module.exports = A;
