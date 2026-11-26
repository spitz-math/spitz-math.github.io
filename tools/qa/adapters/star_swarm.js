/* Star Swarm HD adapter (tier 1). On localhost the game exposes its test hooks (__G.jump, __G.end, ...); on the site __G is a read-only state() copy.
   Shape: fly and shoot through waves; a hangar card (one question) opens at each wave break, a right answer opens a 3-card upgrade pick.
   Real input throughout: the number key answers, a number key picks the upgrade, arrow keys fly, Space fires, a click on Play again restarts.
   Hooks only set the scene: jump to the first hangar, end the run. */
const { sleep } = require('../lib/harness');

const A = {
  intents: { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown', action: ' ' },
  actName: 'holding Space fires',
  resetKeys: ['score', 'hp', 'wave', 'answered', 'correct', 'gun', 'over'],

  async open(pg, set = 'mult') {
    await pg.goto(pg.qaUrl('games/star_swarm.html?set=' + set), { waitUntil: 'load' });
    await pg.evaluate(() => localStorage.clear()); await pg.reload({ waitUntil: 'load' });
    await pg.waitForFunction(() => window.__G && document.getElementById('sw-nameinput'), null, { timeout: 30000 });
  },
  /* Start, then Enter skips the opening scene (new runs only). */
  async start(pg) {
    await pg.fill('#sw-nameinput', 'Test S');
    await pg.waitForFunction(() => !document.getElementById('sw-go').disabled, null, { timeout: 15000 }).catch(() => {});
    await pg.click('#sw-go');
    await pg.waitForFunction(() => __G.state().started, null, { timeout: 8000 }).catch(() => {});
    await A.skipIntro(pg);
  },
  async skipIntro(pg) {
    await sleep(400);
    for (let i = 0; i < 4; i++) { if (await pg.evaluate(() => document.getElementById('sw-skip').hidden)) break; await pg.keyboard.press('Enter'); await sleep(400); }
    await pg.waitForFunction(() => !!__G.wave && !!__G.wave(), null, { timeout: 12000 }).catch(() => {});
    await sleep(300);
  },
  snapshot: pg => pg.evaluate(() => { const S = __G.state(), sh = __G.ship ? __G.ship() : {};
    if (__G.beams && __G.beams().length) window.__qaFired = (window.__qaFired || 0) + __G.beams().length;
    return { started: !!S.started, over: !!S.over, score: S.score || 0, hp: S.hp, wave: S.wave, answered: S.answered, correct: S.correct, gun: S.gun || 0,
      x: Math.round(sh.x || 0), y: Math.round(sh.y || 0), fired: window.__qaFired || 0, qOpen: !!(S.q && !S.qDone) }; }),
  playable: s => s.started && !s.over,
  moved: (a, b) => a.x !== b.x || a.y !== b.y,
  acted: (a, b) => b.fired > a.fired,
  answeredRight: (before, after) => after.correct === before.correct + 1 && after.answered === before.answered + 1,

  /* The first hangar is wave 1 of the route: set the scene there, then wait for its question card. */
  async openQuestion(pg) {
    await pg.evaluate(() => __G.jump(['rim', 'belt', 'storm'], 1));
    await pg.waitForFunction(() => { const S = __G.state(); return S.q && !S.qDone && __G.cardOpen(); }, null, { timeout: 15000 }).catch(() => {});
    await sleep(900);   // the card ignores keys for a moment after it opens
    const before = await A.snapshot(pg);
    const q = await pg.evaluate(() => { const S = __G.state(); return { open: !!(S.q && !S.qDone && __G.cardOpen()), right: S.q ? S.q.choices.findIndex(c => c.ok) : -1 }; });
    return { ...q, before };
  },
  /* The hangar asks two questions (v71). After the first, the second comes up on the same card: answer it right with its number key.
     Then the upgrade pick opens: press 1 (GUN UP) the way a student does (twice if both were right), then the next wave starts. */
  async continueQuestion(pg) {
    await pg.waitForFunction(() => { const S = __G.state(); return __G.draftOpen() || (__G.cardOpen() && S.q && !S.qDone); }, null, { timeout: 6000 }).catch(() => {});
    if (await pg.evaluate(() => { const S = __G.state(); return __G.cardOpen() && S.q && !S.qDone; })) {
      await sleep(400);
      const k = await pg.evaluate(() => __G.state().q.choices.findIndex(c => c.ok));
      await pg.keyboard.press('Digit' + (k + 1));
    }
    await pg.waitForFunction(() => __G.draftOpen(), null, { timeout: 6000 }).catch(() => {});
    for (let i = 0; i < 6; i++) { if (!(await pg.evaluate(() => __G.draftOpen()))) break; await pg.keyboard.press('Digit1'); await sleep(500); }
    await pg.waitForFunction(() => !__G.frozen() && !__G.cardOpen() && !__G.draftOpen(), null, { timeout: 8000 }).catch(() => {});
    await sleep(600);
  },

  /* Space is held, not tapped: the ship fires while it is down. */
  async act(pg) {
    await pg.keyboard.down('Space');
    for (let i = 0; i < 8; i++) { await sleep(100); await A.snapshot(pg); }
    await pg.keyboard.up('Space');
  },
  async dirty(pg) { await pg.evaluate(() => { const S = __G.state(); S.score += 1234; S.hp = 3; S.gun = 2; }); },

  async forceEnd(pg) {
    await pg.evaluate(() => __G.end());
    await pg.waitForFunction(() => __G.state().over, null, { timeout: 12000 }).catch(() => {});
  },
  async endShown(pg) {
    try { await pg.waitForFunction(() => !document.getElementById('sw-end').hidden, null, { timeout: 15000 }); return true; } catch (e) { return false; }
  },
  /* Play again unlocks 2 s after the end screen shows; it starts a new run (with the opening scene) or lands on the start screen. */
  async restart(pg) {
    await pg.waitForFunction(() => { const b = document.getElementById('sw-again'); return b && !b.disabled; }, null, { timeout: 8000 }).catch(() => {});
    await sleep(2200);
    await pg.click('#sw-again'); await sleep(600);
    if (await pg.evaluate(() => !document.getElementById('sw-start').hidden)) return A.start(pg);
    await A.skipIntro(pg);
  },
  scenarios: [],
};
module.exports = A;
