/* Rocket Buds adapter (tier 1: uses __G.state(); the game has more hooks, but the checks only read state).
   Different shape from the other two pilots: questions come in a pit stop BEFORE play (answer 3 to kick off),
   then a live car-soccer match on a running clock. Real input throughout: number keys answer, Space leaves the pit,
   arrow keys drive, Space jumps, two clicks on Play again restart. Hooks only set the scene (score, the clock). */
const { sleep } = require('../lib/harness');

const A = {
  intents: { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown', action: ' ' },
  actName: 'Space jumps the car',
  resetKeys: ['score', 'buds', 'rivals', 'answered', 'correct', 'boost', 'phase', 'pitKind', 'clock', 'ot', 'over'],

  async open(pg, set = 'mult') {
    await pg.goto(pg.qaUrl('games/rocket_buds.html?set=' + set), { waitUntil: 'load' });
    await pg.evaluate(() => localStorage.clear()); await pg.reload({ waitUntil: 'load' });
    await pg.waitForFunction(() => window.__G && document.getElementById('rk-nameinput'), null, { timeout: 15000 });
  },
  async start(pg) {
    await pg.fill('#rk-nameinput', 'Test S'); await pg.click('#rk-go-start');
    await pg.waitForFunction(() => { const S = __G.state(); return S.started && S.phase === 'pit' && S.q && !S.qDone; }, null, { timeout: 8000 }).catch(() => {});
    await sleep(300);
  },
  /* clock is rounded to whole minutes so the restart check compares "a fresh 4:00 match", not the exact tenth of a second */
  snapshot: pg => pg.evaluate(() => { const S = __G.state(), P = S.P || {};
    return { started: !!S.started, over: !!S.over, phase: S.phase, pitKind: S.pitKind, score: S.pts, buds: S.buds, rivals: S.rivals,
      answered: S.answered, correct: S.correct, boost: Math.round(P.boost), x: Math.round(P.x), y: Math.round(P.y), ground: !!P.ground,
      clock: Math.ceil(S.clock / 60), ot: !!S.ot, qOpen: !!(S.phase === 'pit' && S.q && !S.qDone), pitAns: (S.pitAns || []).length }; }),
  playable: s => s.started && !s.over,
  /* only while the match is live: a goal or kickoff also moves the car, and that must not count as the player moving it */
  moved: (a, b) => a.phase === 'live' && b.phase === 'live' && a.x !== b.x,
  acted: (a, b) => a.phase === 'live' && b.phase === 'live' && (!b.ground || b.y < a.y - 4),
  answeredRight: (before, after) => after.correct === before.correct + 1 && after.boost > before.boost,

  async openQuestion(pg) {
    const before = await A.snapshot(pg);
    const q = await pg.evaluate(() => { const S = __G.state(); return { open: !!(S.phase === 'pit' && S.q && !S.qDone), right: S.q ? S.q.choices.findIndex(c => c.ok) : -1 }; });
    return { ...q, before };
  },
  /* Finish the kickoff pit stop the way a student does: answer until the pit lets you go, then Space, then wait for the countdown. */
  async continueQuestion(pg) {
    for (let i = 0; i < 8; i++) {
      const s = await pg.evaluate(() => { const S = __G.state(); return { go: __G.canGo(), open: !!(S.q && !S.qDone), right: S.q ? S.q.choices.findIndex(c => c.ok) : -1 }; });
      if (s.go) break;
      if (s.open) { await pg.keyboard.press('Digit' + (s.right + 1)); await sleep(300); }
      else { await pg.keyboard.press('Enter'); await sleep(500); }   // mult moves on by itself; Enter covers the other sets
    }
    await pg.keyboard.press('Space');
    await pg.waitForFunction(() => __G.state().phase === 'live', null, { timeout: 6000 }).catch(() => {});
    // scene: the Rival can score from kickoff in about a second; park it in its own corner so the drive and jump checks happen in live play
    await pg.evaluate(() => { const S = __G.state(); S.R.x += 600; S.R.vx = 0; });
  },

  async hold(pg, intent, ms) { const k = A.intents[intent]; await pg.keyboard.down(k); await sleep(ms); await pg.keyboard.up(k); await sleep(60); },
  async press(pg, intent) { await pg.keyboard.press(A.intents[intent] === ' ' ? 'Space' : A.intents[intent]); },
  async act(pg) { await sleep(400); await pg.keyboard.press('Space'); },   // land first, then one real jump
  async dirty(pg) { await pg.evaluate(() => { const S = __G.state(); S.pts += 1234; S.buds = 2; S.P.boost = 77; }); },

  /* The match is timed: move the clock to the end with the player ahead, so time-up ends it (a tie would go to overtime). */
  async forceEnd(pg) {
    await pg.evaluate(() => { const S = __G.state(); S.buds = S.rivals + 1; S.clock = 0.05; });
    await pg.waitForFunction(() => __G.state().over, null, { timeout: 8000 }).catch(() => {});
  },
  async endShown(pg) {
    try { await pg.waitForFunction(() => !document.getElementById('rk-end').hidden, null, { timeout: 15000 }); return true; } catch (e) { return false; }
  },
  async restart(pg) {
    await pg.click('#rk-again'); await sleep(250); await pg.click('#rk-again');   // asks "tap again" first, on purpose
    await sleep(400); await A.start(pg);
  },
  scenarios: [],
};
module.exports = A;
