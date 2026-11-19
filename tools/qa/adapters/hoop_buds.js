/* Hoop Buds adapter (tier 1: reads __G.state() and __G.play(); the checks only read them).
   Shape: a huddle of 2 questions before every possession, then Space checks the ball and the play goes live.
   Real input throughout: number keys answer, Space tips off, arrow keys run, Space shoots (jumps), two clicks on Play again restart. */
const { sleep } = require('../lib/harness');

const A = {
  intents: { left: 'ArrowLeft', right: 'ArrowRight', action: ' ' },
  actName: 'Space shoots (the player jumps)',
  resetKeys: ['score', 'pts', 'buds', 'rivals', 'answered', 'correct', 'streak', 'poss', 'clock', 'ot', 'over'],

  async open(pg, set = 'mult') {
    await pg.goto(pg.qaUrl('games/hoop_buds.html?set=' + set), { waitUntil: 'load' });
    await pg.evaluate(() => localStorage.clear()); await pg.reload({ waitUntil: 'load' });
    await pg.waitForFunction(() => window.__G && document.getElementById('hb-nameinput'), null, { timeout: 15000 });
  },
  async start(pg) {
    await pg.fill('#hb-nameinput', 'Test S'); await pg.click('#hb-go');
    await pg.waitForFunction(() => { const S = __G.state(); return S.started && S.q && !S.qDone; }, null, { timeout: 8000 }).catch(() => {});
    await sleep(300);
  },
  /* clock in whole seconds so the restart check compares "a fresh 1:30 game", not a fraction */
  snapshot: pg => pg.evaluate(() => { const S = __G.state(), P = __G.play() || {}, me = P.me || {};
    return { started: !!S.started, over: !!S.over, score: S.score, pts: S.pts, buds: S.buds, rivals: S.rivals, answered: S.answered, correct: S.correct,
      streak: S.streak, poss: S.poss, clock: Math.ceil(S.clock), ot: !!S.ot, ready: !!S.ready, live: !!P.live, x: Math.round(me.x), h: Math.round(me.h || 0),
      shot: !!P.shot, qOpen: !!(S.q && !S.qDone) }; }),
  playable: s => s.started && !s.over,
  /* only while the ball is live: the huddle freezes the players */
  moved: (a, b) => a.live && b.live && a.x !== b.x,
  acted: (a, b) => b.live && (b.h > 0 || b.shot),
  answeredRight: (before, after) => after.correct === before.correct + 1 && after.pts > before.pts,

  async openQuestion(pg) {
    const before = await A.snapshot(pg);
    const q = await pg.evaluate(() => { const S = __G.state(); return { open: !!(S.q && !S.qDone), right: S.q ? S.q.choices.findIndex(c => c.ok) : -1 }; });
    return { ...q, before };
  },
  /* Finish the huddle the way a student does: answer until the team is ready, then Space to check the ball. */
  async continueQuestion(pg) {
    for (let i = 0; i < 6; i++) {
      const s = await pg.evaluate(() => { const S = __G.state(); return { ready: !!S.ready, open: !!(S.q && !S.qDone), right: S.q ? S.q.choices.findIndex(c => c.ok) : -1 }; });
      if (s.ready) break;
      if (s.open) await pg.keyboard.press('Digit' + (s.right + 1));
      await sleep(400);
    }
    await pg.keyboard.press('Space');
    await pg.waitForFunction(() => (__G.play() || {}).live, null, { timeout: 6000 }).catch(() => {});
    await sleep(200);
  },

  async act(pg) { await sleep(300); await pg.keyboard.press('Space'); },
  async dirty(pg) { await pg.evaluate(() => { const S = __G.state(); S.pts += 1234; S.score = S.pts; S.buds = 7; S.rivals = 2; S.streak = 4; }); },

  /* The game clock only runs while the ball is live: put it at zero with the Buds ahead, end the play, and let the game call the final. */
  async forceEnd(pg) {
    await pg.evaluate(() => { const S = __G.state(), P = __G.play(); S.buds = S.rivals + 3; S.clock = 0; if (P) { P.live = false; P.dead = 0.05; } });
    await pg.waitForFunction(() => __G.state().over, null, { timeout: 8000 }).catch(() => {});
  },
  async endShown(pg) {
    try { await pg.waitForFunction(() => !document.getElementById('hb-end').hidden, null, { timeout: 15000 }); return true; } catch (e) { return false; }
  },
  async restart(pg) {
    await pg.click('#hb-again'); await sleep(250); await pg.click('#hb-again');   // asks "tap again" first, on purpose
    await sleep(400); await A.start(pg);
  },
  scenarios: [],
};
module.exports = A;
