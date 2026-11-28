/* Burger Blaster adapter, remake v2 (level run: burgers are lives, 2 questions before each fort, no spare).
   GO-LIVE: this file replaces tools/qa/adapters/burger_blaster.js in the same PR that swaps games/burger_blaster.html, and the app's "tier" in tools/qa/apps.json goes from 1 to 2
   so the six scenarios below run. Until then it is tried against a test build: BB_FILE=games/_bb_vN.html node tools/qa/run.js burger_blaster --no-suite (all 7 pass on v24).
   Real input throughout: number keys answer the tray, a mouse drag on the canvas fires, two clicks on Play again restart. */
const { sleep } = require('../lib/harness');
const FILE = process.env.BB_FILE || 'games/burger_blaster.html';

const A = {
  intents: {},
  unsupported: { movement: 'the slingshot stays put; you aim it with a drag or the arrow keys' },
  actName: 'mouse drag fires a burger',
  resetKeys: ['score', 'burgers', 'answered', 'correct', 'shots', 'level', 'over', 'streak'],

  async open(pg, set = 'mult') {
    await pg.goto(pg.qaUrl(FILE + '?set=' + set), { waitUntil: 'load' });
    await pg.evaluate(() => localStorage.clear()); await pg.reload({ waitUntil: 'load' });
    await pg.waitForFunction(() => window.__G && window.__G2 && document.getElementById('bl-nameinput'), null, { timeout: 15000 });
  },
  async start(pg) {
    await pg.fill('#bl-nameinput', 'Test S'); await pg.click('#bl-go');
    await pg.waitForFunction(() => { const S = __G.state(); return S.started && S.tray; }, null, { timeout: 8000 }).catch(() => {});
    await sleep(500);
  },
  snapshot: pg => pg.evaluate(() => { const S = __G.state();
    return { started: !!S.started, over: !!S.over, score: S.score, burgers: S.burgers, answered: S.answered, correct: S.correct,
      shots: S.shots, level: S.level, streak: S.streak, spec: (S.spec || []).length, qOpen: !!S.tray }; }),
  playable: s => s.started && !s.over,
  acted: (a, b) => b.shots > a.shots,
  // a right answer counts and turns a burger into a special (burgers themselves never change on an answer)
  answeredRight: (before, after) => after.correct === before.correct + 1 && after.spec === before.spec + 1,

  async openQuestion(pg) {
    const before = await A.snapshot(pg);
    const q = await pg.evaluate(() => { const T = __G.state().tray; return { open: !!(T && T.q && !document.getElementById('bb-tray').hidden), right: T && T.q ? T.q.choices.findIndex(c => c.ok) : -1 }; });
    return { ...q, before };
  },

  /* Finish the tray with real keys, then pull back on the slingshot and let go: a real mouse drag across the canvas. */
  async act(pg) {
    for (let i = 0; i < 6; i++) {
      const t = await pg.evaluate(() => { const T = __G.state().tray; return T ? { r: T.q ? T.q.choices.findIndex(c => c.ok) : -1, done: !!T.done } : null; });
      if (!t) break;
      if (t.r >= 0 && !t.done) await pg.keyboard.press('Digit' + (t.r + 1)); else await pg.keyboard.press('Enter');
      await sleep(1100);
    }
    await pg.waitForFunction(() => __G.canFire(), null, { timeout: 6000 }).catch(() => {});
    const box = await pg.locator('#bl-canvas').boundingBox();
    const x = box.x + box.width * 0.15, y = box.y + box.height * 0.7;
    await pg.mouse.move(x, y); await pg.mouse.down();
    for (let i = 1; i <= 8; i++) { await pg.mouse.move(x - i * 12, y + i * 7); await sleep(20); }
    await pg.mouse.up(); await sleep(300);
  },
  async dirty(pg) { await pg.evaluate(() => { const S = __G.state(); S.score += 1234; S.streak = 5; }); },

  /* No clock any more: the run ends when the burgers run out. End it the way the game does. */
  async forceEnd(pg) {
    await pg.evaluate(() => __G2.endRun());
    await pg.waitForFunction(() => __G.state().over, null, { timeout: 8000 }).catch(() => {});
  },
  async endShown(pg) {
    try { await pg.waitForFunction(() => !document.getElementById('bl-end').hidden, null, { timeout: 15000 }); return true; } catch (e) { return false; }
  },
  async restart(pg) {
    await pg.click('#bl-again'); await sleep(250); await pg.click('#bl-again');   // asks "tap again" first, on purpose
    await sleep(400); await A.start(pg);
  },
  scenarios: [
    { name: 'question card: exactly two questions, never a spare', async run(r) {
      const pg = await r.page('chromebook'); const want = { RR: [2, 2], RW: [1, 2], WR: [1, 2], WW: [0, 2] };   /* Kody 2026-11-27: this game has no spare question */
      for (const p of Object.keys(want)) {
        await A.open(pg); await A.start(pg); const b0 = (await A.snapshot(pg)).burgers; let asked = 0;
        for (const ch of p) { const t = await tray(pg); if (!t) break; await pg.keyboard.press('Digit' + ((ch === 'R' ? t.r : (t.r + 1) % t.n) + 1)); asked++; await sleep(ch === 'R' ? 1300 : 1400); if (ch !== 'R') { await pg.keyboard.press('Space'); await sleep(450); } }
        const s = await A.snapshot(pg);
        r.check(`${p}: the card closes after ${want[p][1]} questions`, JSON.stringify([false, want[p][1]]), JSON.stringify([s.qOpen, asked]));
        r.check(`${p}: ${want[p][0]} right, ${Math.min(2, want[p][0])} special burgers loaded`, JSON.stringify([want[p][0], Math.min(2, want[p][0])]), JSON.stringify([s.correct, s.spec]));
        r.check(`${p}: a wrong answer never takes a burger (2 for 2 adds one)`, b0 + (p === 'RR' ? 1 : 0), s.burgers);
      }
      await pg.context().close();
    } },

    { name: 'question card: guards (fresh card, miss waits, right moves on, reload keeps the miss)', async run(r) {
      const pg = await r.page('chromebook'); await A.open(pg); await pg.fill('#bl-nameinput', 'Test S'); await pg.click('#bl-go');
      await pg.keyboard.press('Digit1'); await sleep(60);
      r.check('a key in the first moment of a fresh card does not answer it (double tap on the clear banner)', 0, (await A.snapshot(pg)).answered);
      await sleep(600); const t = await tray(pg); await pg.keyboard.press('Digit' + ((t.r + 1) % t.n + 1)); await sleep(300);
      const cap = await pg.evaluate(() => [].map.call(document.querySelectorAll('#bb-tray .slot i'), e => e.textContent).join('|'));
      r.check('the slot says what the miss did', true, /plain/.test(cap));
      await sleep(3500); const m = await tray(pg);
      r.check('a miss waits for the student (still on the same card after 3.8 s)', true, !!m && m.done && m.prompt === t.prompt);
      await pg.reload({ waitUntil: 'load' }); await pg.waitForFunction(() => window.__G && __G.state().started, null, { timeout: 8000 }); await sleep(500);
      const m2 = await tray(pg), s2 = await A.snapshot(pg);
      r.check('a reload keeps the same question and the miss', JSON.stringify([t.prompt, true, 1, 0]), JSON.stringify([m2 && m2.prompt, !!(m2 && m2.done), s2.answered, s2.correct]));
      await pg.keyboard.press('Space'); await sleep(600); const t2 = await tray(pg); await pg.keyboard.press('Digit' + (t2.r + 1)); await sleep(1500);
      const t3 = await tray(pg);
      r.check('a right answer moves on by itself', true, !t3 || t3.prompt !== t2.prompt || !t3.done);
      r.check('no card text under 11px at Chromebook size', '', await small(pg, '#bb-tray'));
      await pg.context().close();
    } },

    { name: 'graph questions: big graph, answers on one line, card clear of the fort', async run(r) {
      const pg = await r.page('chromebook'); let seen = 0; const bad = [];
      for (const set of ['plot', 'func', 'slope']) for (let i = 0; i < 5; i++) {
        await A.open(pg, set); await A.start(pg);
        const g = await pg.evaluate(() => { const el = document.getElementById('bb-tray'), sv = el.querySelector('.vis svg'); if (!sv) return null; const R = el.getBoundingClientRect(), st = document.getElementById('stage').getBoundingClientRect();
          const cv = document.getElementById('bl-canvas').getBoundingClientRect(), fx = cv.left + Math.min.apply(null, __G.world().munchers.map(m => m[0])) / 1664 * cv.width;
          return { g: sv.getBoundingClientRect().width, wrap: [].some.call(el.querySelectorAll('.c span'), s => s.getClientRects().length > 1), inside: R.top >= st.top && R.bottom <= st.bottom && R.left >= st.left, clear: R.right < fx }; });
        if (!g) continue; seen++;
        if (g.g < 200) bad.push(`${set}: graph ${Math.round(g.g)} px`); if (g.wrap) bad.push(`${set}: an answer wraps`); if (!g.inside) bad.push(`${set}: card leaves the screen`); if (!g.clear) bad.push(`${set}: card covers a Muncher`);
        if (seen === 1) await r.shot(pg, 'graph_card');
      }
      r.check('graph cards were seen', true, seen >= 3);
      r.check('every graph is 200 px or more, no answer wraps, the card stays on screen and off the fort', '', bad.join('; '));
      await pg.context().close();
    } },

    { name: 'firing: aim first, a wrong-answer run still plays, Space after a set-off does not fling', async run(r) {
      const pg = await r.page('chromebook'); await A.open(pg); await A.start(pg);
      for (let i = 0; i < 8; i++) { const t = await tray(pg); if (!t) break; if (t.done) await pg.keyboard.press('Space'); else await pg.keyboard.press('Digit' + ((t.r + 1) % t.n + 1)); await sleep(1400); }
      const a = await A.snapshot(pg);
      r.check('two misses close the card with no special and every burger kept', JSON.stringify([false, 0, 12]), JSON.stringify([a.qOpen, a.spec, a.burgers]));
      await pg.waitForFunction(() => __G.canFire(), null, { timeout: 6000 }).catch(() => {});
      await pg.keyboard.press('Space'); await sleep(300);
      r.check('Space before aiming does not fire ("Aim first!")', 0, (await A.snapshot(pg)).shots);
      await pg.keyboard.press('ArrowUp'); await pg.keyboard.press('Space'); await sleep(400);
      r.check('0 right still plays: a plain burger flies', 1, (await A.snapshot(pg)).shots);
      /* a special in the air: Space sets it off, and the very next Space must not fling another burger */
      await A.open(pg); await A.start(pg);
      for (let i = 0; i < 4; i++) { const t = await tray(pg); if (!t) break; if (t.done) await pg.keyboard.press('Space'); else await pg.keyboard.press('Digit' + (t.r + 1)); await sleep(1300); }
      await pg.waitForFunction(() => __G.canFire(), null, { timeout: 6000 }).catch(() => {});
      const b = await A.snapshot(pg); r.check('two right answers load two specials', 2, b.spec);
      await pg.keyboard.press('ArrowUp'); await pg.keyboard.press('Space'); await sleep(550); await pg.keyboard.press('Space'); await sleep(70); await pg.keyboard.press('Space'); await sleep(300);
      r.check('Space twice in the air spends one burger, not two', 1, (await A.snapshot(pg)).shots);
      await pg.context().close();
    } },

    { name: 'forts start at different aims, and the King gets a question card', async run(r) {
      const pg = await r.page('chromebook'); const aims = new Set();
      for (let i = 0; i < 4; i++) { await A.open(pg); await A.start(pg); aims.add(await pg.evaluate(() => __G.state().aim.join('/'))); }
      r.check('four fresh runs do not all start at the same aim', true, aims.size > 1);
      await pg.evaluate(() => { const k = Object.keys(localStorage).find(k => { try { const v = JSON.parse(localStorage.getItem(k)); return v && v.order; } catch (e) { return false; } }); const v = JSON.parse(localStorage.getItem(k)); v.level = 9; v.tray = null; v.world = null; localStorage.setItem(k, JSON.stringify(v)); });
      await pg.reload({ waitUntil: 'load' }); await pg.waitForFunction(() => window.__G && __G.state().started, null, { timeout: 8000 }); await sleep(600);
      await pg.evaluate(() => document.getElementById('bl-skip').click()); await sleep(700);   // the hidden test button steps to the next level the way a clear does
      const k = await pg.evaluate(() => ({ king: __G.world().munchers.length > 0 && __G.state().level === 10, card: !!__G.state().tray }));
      r.check('the King level opens with a question card', JSON.stringify({ king: true, card: true }), JSON.stringify(k));
      await r.shot(pg, 'king_card'); await pg.context().close();
    } },

    { name: 'end screen: digits font, kind line and a practice tip after a rough run', async run(r) {
      const pg = await r.page('chromebook'); await A.open(pg); await A.start(pg);
      await pg.evaluate(() => { const s = __G.state(), k = Object.keys(s.topics); s.answered = 12; s.correct = 5; s.topics[k[0]] = [4, 7]; s.topics[k[1]] = [1, 5]; s.tray = null; document.getElementById('bb-tray').hidden = true; __G2.endRun(); });
      r.check('the end screen shows', true, await A.endShown(pg)); await sleep(400);
      const e = await pg.evaluate(() => ({ font: getComputedStyle(document.querySelector('#bl-end .bl-stat .v')).fontFamily.split(',')[0].replace(/["']/g, ''), tip: (document.querySelector('#bl-end .bb-prac') || {}).textContent || '', why: document.getElementById('bl-endwhy').textContent,
        credit: !!document.querySelector('#bl-end') }));
      r.check('stat numbers use Spitz Digits (a 7 never reads as a 1)', 'Spitz Digits', e.font);
      r.check('a rough run names one topic to practice', true, /Worth practicing/.test(e.tip));
      r.check('a rough run gets a kind line', true, /Try again/.test(e.why));
      r.check('no end screen text under 11px at Chromebook size', '', await small(pg, '#bl-end'));
      await r.shot(pg, 'end_rough'); await pg.context().close();
    } },
  ],
};
/* the open card: index of the right choice, number of choices, answered yet, its prompt */
const tray = pg => pg.evaluate(() => { const T = __G.state().tray; return T && T.q ? { r: T.q.choices.findIndex(c => c.ok), n: T.q.choices.length, done: !!T.done, prompt: T.q.prompt } : null; });
/* text under 11 real pixels inside sel (the stage is 1920 wide and scales to the window) */
const small = (pg, sel) => pg.evaluate(sel => { const root = document.querySelector(sel), box = root.querySelector('.bl-box') || root, z = box.getBoundingClientRect().width / box.offsetWidth;
  return [].filter.call(root.querySelectorAll('*'), e => e.offsetParent && [].some.call(e.childNodes, n => n.nodeType === 3 && n.nodeValue.trim()) && parseFloat(getComputedStyle(e).fontSize) * z < 10.9).map(e => (typeof e.className === 'string' && e.className) || e.tagName).join(', '); }, sel);
module.exports = A;
