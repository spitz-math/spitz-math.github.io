/* Rook & Ruin adapter (tier 2: has __G.step, __G.room and other scene helpers).
   Real keys for everything a student does (move, swing, answer, buy, restart); hooks only to set up a scene
   (put Rook in the shop with coins, drop hearts to 1) and to read state. */
const { sleep } = require('../lib/harness');

const A = {
  intents: { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown', action: ' ', dodge: 'x', use: 'e' },
  resetKeys: ['room', 'hp', 'max', 'coins', 'score', 'revUsed', 'buildSize', 'over'],

  async open(pg, set = 'mult') {
    await pg.goto(pg.qaUrl('games/rook_and_ruin.html?set=' + set), { waitUntil: 'load' });
    await pg.evaluate(() => localStorage.clear()); await pg.reload({ waitUntil: 'load' });
    await pg.waitForFunction(() => window.__G && document.getElementById('dn-nameinput'), null, { timeout: 15000 });
  },
  async start(pg) {
    await pg.fill('#dn-nameinput', 'Test S'); await pg.click('#dn-go'); await sleep(400);
    await pg.keyboard.press('Escape');                       // the intro is skippable; the ending is not
    await A.waitMode(pg, m => m === 'play', 8000);
  },
  snapshot: pg => pg.evaluate(() => { const S = __G.state(), w = S.w || {}, p = w.p || {};
    return { started: !!S.started, over: !!S.over, mode: S.mode, room: w.rid, hp: p.hp, max: p.max, coins: w.coins, score: S.score,
      revUsed: S.revUsed, buildSize: Object.keys(w.b || {}).length, x: Math.round(p.x), y: Math.round(p.y), sid: p.sid }; }),
  playable: s => s.mode === 'play',
  moved: (a, b) => a.x !== b.x || a.y !== b.y,
  acted: (a, b) => b.sid > a.sid,
  answeredRight: (before, after) => after.hp > 0 && !after.over && after.revUsed === before.revUsed + 1,
  async continueQuestion(pg) { await sleep(700); await pg.keyboard.press('Enter'); await A.waitMode(pg, m => m === 'play', 6000); await sleep(300); },

  async hold(pg, intent, ms) { const k = A.intents[intent]; await pg.keyboard.down(k); await sleep(ms); await pg.keyboard.up(k); await sleep(60); },
  async press(pg, intent) { await pg.keyboard.press(A.intents[intent]); },
  async waitMode(pg, ok, ms) { const t = Date.now(); let m; while (Date.now() - t < ms) { m = await pg.evaluate(() => __G.state().mode); if (ok(m)) return m; await sleep(100); } return m; },

  async dirty(pg) { await pg.evaluate(() => { const S = __G.state(); S.w.coins = 37; S.score = 1234; S.w.p.max = 6; S.w.p.hp = 6; }); },

  /* A knockout opens the revive question (one per run). */
  async openQuestion(pg) {
    const before = await A.snapshot(pg);
    const q = await pg.evaluate(() => { const S = __G.state(); S.w.p.hp = 1; S.w.p.inv = 0; __G.hurt(1);
      for (let i = 0; i < 900 && S.mode !== 'ask'; i++) __G.step(1 / 60);
      return { open: S.mode === 'ask', why: S.ask && S.ask.why, right: S.q ? S.q.choices.findIndex(c => c.ok) : -1 }; });
    await sleep(900);                                          // answer keys open after a short reading gate
    return { ...q, before };
  },

  /* Lose every heart until the run is over; a revive question (if one is still owed) gets a wrong answer. */
  async forceEnd(pg) {
    for (let k = 0; k < 4; k++) {
      const s = await pg.evaluate(() => { const S = __G.state(); if (S.over) return 'over';
        if (S.mode === 'ask') { const i = S.q.choices.findIndex(c => c.ok); __G.answer((i + 1) % S.q.choices.length); __G.askNext(); return 'answered'; }
        for (let i = 0; i < 300 && S.mode !== 'play'; i++) __G.step(1 / 60);
        S.w.p.hp = 1; S.w.p.inv = 0; __G.hurt(1); for (let i = 0; i < 900 && S.mode !== 'ask' && !S.over; i++) __G.step(1 / 60); return S.over ? 'over' : S.mode; });
      if (s === 'over') return; await sleep(300);
    }
  },
  async endShown(pg) {
    try { await pg.waitForFunction(() => !document.getElementById('dn-end').hidden, null, { timeout: 15000 }); return true; } catch (e) { return false; }
  },
  async restart(pg) {
    await sleep(1400);                                         // Play again ignores presses for 1.2 s after the end screen shows
    await pg.keyboard.press('Enter'); await sleep(500);
    await pg.keyboard.press('Escape');
    await A.waitMode(pg, m => m === 'play', 8000);
  },

  /* Tier 2 scenarios: things only this game has. */
  scenarios: [
    { name: 'shop: buying a max heart with the real E key', async run(r) {
      const pg = await r.page('chromebook'); await A.open(pg); await A.start(pg);
      const setup = await pg.evaluate(() => { const S = __G.state(), w = S.w; __G.room('shop', 's'); S.mode = 'play'; w.dealt = 1; w.coins = 100; w.banner = null;
        const i = w.shop.findIndex(it => it.id === 'max'); const it = w.shop[i]; w.p.x = it.x; w.p.y = it.y + 10;
        return { i, cost: it.cost, coins: w.coins, max: w.p.max }; });
      r.check('the shop sells a max heart', true, setup.i >= 0);
      await sleep(500); await r.shot(pg, 'shop_before');
      await pg.keyboard.down(' '); await sleep(600); await pg.keyboard.up(' ');
      r.check('swinging (Space) in the shop never buys', setup.coins, (await A.snapshot(pg)).coins);
      await pg.keyboard.down('e'); await sleep(600); await pg.keyboard.up('e');
      for (let k = 0; k < 6; k++) { await pg.keyboard.press('e'); await sleep(90); }
      const after = await A.snapshot(pg);
      r.check('E buys exactly once: coins go down by the price', setup.coins - setup.cost, after.coins);
      r.check('the upgrade applies: max hearts +1', setup.max + 1, after.max);
      r.check('buying a max heart refills hearts', after.max, after.hp);
      await r.shot(pg, 'shop_after');
      await pg.context().close();
    } },
  ],
};
module.exports = A;
