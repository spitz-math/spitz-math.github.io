/* Super Jump Man adapter (tier 1). Source copy: games/src/jump_man_remaster/qa_adapter_jump_man.js
   Shape: run and jump up an endless tower; a Waystone card (2 questions + a spare third) freezes the tower at ledge 10, then every 30;
   2 right opens a "New move!" card. Real input throughout: arrow keys run, Space jumps, number keys answer and pick.
   Hooks only set the scene: stand the climber on the Waystone ledge, end the run. */
const { sleep } = require('../lib/harness');

const A = {
  intents: { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', action: ' ' },
  actName: 'Space jumps',
  resetKeys: ['score', 'hearts', 'answered', 'correct', 'ledge', 'moves', 'over'],

  async open(pg, set = 'mult') {
    await pg.goto(pg.qaUrl('games/jump_man_multiplication.html?set=' + set), { waitUntil: 'load' });
    await pg.evaluate(() => localStorage.clear()); await pg.reload({ waitUntil: 'load' });
    await pg.waitForFunction(() => window.__G && document.getElementById('jm-nameinput'), null, { timeout: 30000 });
  },
  async start(pg) {
    await pg.fill('#jm-nameinput', 'Test S');
    await pg.waitForFunction(() => !document.getElementById('jm-go').disabled, null, { timeout: 15000 }).catch(() => {});
    await pg.click('#jm-go');
    await pg.waitForFunction(() => __G.state().started, null, { timeout: 8000 }).catch(() => {});
    await sleep(500);
  },
  snapshot: pg => pg.evaluate(() => { const S = __G.state(), P = __G.man();
    return { started: !!S.started, over: !!S.over, score: S.score || 0, hearts: S.hearts, answered: S.answered, correct: S.correct, ledge: S.pi || 0,
      moves: Object.keys(S.mv || {}).filter(k => S.mv[k]).length, jumps: S.jumps || 0, x: Math.round(P.x), h: Math.round(P.h), qOpen: !!(S.way && S.q && !S.qDone), card: !!(S.way || S.offer) }; }),
  playable: s => s.started && !s.over,
  moved: (a, b) => a.x !== b.x || a.h !== b.h,
  acted: (a, b) => b.jumps > a.jumps,
  answeredRight: (before, after) => after.correct === before.correct + 1 && after.answered === before.answered + 1,

  /* Stand the climber on the next Waystone's ledge; the card opens by itself. */
  async openQuestion(pg) {
    await pg.evaluate(() => { const S = __G.state(), P = __G.man(), q = __G.plats()[S.nextWay]; P.on = q; P.h = q.h; P.x = __G.cxAt(q); P.vx = 0; P.vy = 0; P.lastI = q.i - 1; S.pi = q.i - 1; });
    await pg.waitForFunction(() => { const S = __G.state(); return S.way && S.q && !S.qDone; }, null, { timeout: 10000 }).catch(() => {});
    await sleep(400);
    const before = await A.snapshot(pg);
    const q = await pg.evaluate(() => { const S = __G.state(); return { open: !!(S.way && S.q && !S.qDone), right: S.q ? S.q.choices.findIndex(c => c.ok) : -1 }; });
    return { ...q, before };
  },
  /* The second question comes up by itself 1.5 s after a right answer: answer it right too. Then the New move! card opens;
     it ignores keys for 0.8 s, then 1 takes the move and the climb goes on. */
  async continueQuestion(pg) {
    await pg.waitForFunction(() => { const S = __G.state(); return S.offer || (S.way && S.q && !S.qDone); }, null, { timeout: 6000 }).catch(() => {});
    if (await pg.evaluate(() => { const S = __G.state(); return !!(S.way && S.q && !S.qDone); })) {
      await sleep(300);
      const k = await pg.evaluate(() => __G.state().q.choices.findIndex(c => c.ok));
      await pg.keyboard.press('Digit' + (k + 1));
    }
    await pg.waitForFunction(() => !!__G.state().offer, null, { timeout: 6000 }).catch(() => {});
    for (let i = 0; i < 8; i++) { if (!(await pg.evaluate(() => !!__G.state().offer))) break; await sleep(500); await pg.keyboard.press('Digit1'); }
    await pg.waitForFunction(() => { const S = __G.state(); return !S.way && !S.offer; }, null, { timeout: 8000 }).catch(() => {});
    await sleep(400);
  },
  async dirty(pg) { await pg.evaluate(() => { const S = __G.state(); S.bonus += 1234; S.hearts = 1; }); await sleep(300); },

  async forceEnd(pg) {
    await pg.evaluate(() => __G.end());
    await pg.waitForFunction(() => __G.state().over, null, { timeout: 12000 }).catch(() => {});
  },
  async endShown(pg) {
    try { await pg.waitForFunction(() => !document.getElementById('jm-end').hidden, null, { timeout: 15000 }); return true; } catch (e) { return false; }
  },
  /* Play again unlocks after 2 s and asks for a second tap; it lands on the start screen with the name kept, or in a new run. */
  async restart(pg) {
    await sleep(2300);
    for (let i = 0; i < 3; i++) { if (await pg.evaluate(() => document.getElementById('jm-end').hidden)) break; await pg.click('#jm-again').catch(() => {}); await sleep(700); }
    await pg.waitForFunction(() => window.__G && (!document.getElementById('jm-start').hidden || (__G.state().started && !__G.state().over)), null, { timeout: 10000 }).catch(() => {});
    if (await pg.evaluate(() => !document.getElementById('jm-start').hidden)) return A.start(pg);
    await sleep(500);
  },
  scenarios: [],
};
module.exports = A;
