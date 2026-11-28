/* Shift Racer remake adapter (tier 2). Plays games/new/shift_racer/src/game.html, the remake built on the remake kit
   (the kit's own adapter already proves the title, HUD, question card, pick, pause and end screen).
   This one checks Shift Racer's own rules: the car drives itself, pit answers unlock gears and never cost time, the checkpoint clock ends the run,
   a crash costs speed, the finale can be won, and the math rule holds over whole runs.
   Real input throughout: arrow keys change lanes, Space shifts, number keys answer. Hooks only set the scene (__G.jump, __G.set, __G.end). */
const { sleep } = require('../lib/harness');
const { mathRule } = require('./_mathrule');

const URL = 'games/new/shift_racer/src/game.html';
const snap = pg => pg.evaluate(() => { const S = __G.state(), r = S.r || {};
  return { started: !!S.started, over: !!S.over, won: !!S.won, phase: S.phase, score: S.score, n: S.n, left: S.left, answered: S.answered, correct: S.correct, crashes: S.crashes, flags: S.flags,
    lane: r.lane, gear: r.gear, maxGear: r.maxGear, pd: Math.round(r.pd || 0), v: Math.round(__G.car().v), x: Math.round(__G.car().x), boost: S.boost, shield: S.shield,
    qOpen: !!(S.q && !S.qDone && __G.card.isOpen()), cardOpen: __G.card.isOpen(), pickOpen: __G.pick.isOpen() }; });
const waitFor = async (pg, ok, ms = 8000) => { const t0 = Date.now(); let s = await snap(pg); while (!ok(s) && Date.now() - t0 < ms) { await sleep(80); s = await snap(pg); } return s; };
/* answer the open question with the real number key: the right one, or a wrong one */
async function answer(pg, right) { await sleep(330);
  const q = await pg.evaluate(() => { const S = __G.state(); return { right: S.q.choices.findIndex(c => c.ok), n: S.q.choices.length }; });
  await pg.keyboard.press('Digit' + ((right ? q.right : (q.right + 1) % q.n) + 1)); await sleep(90); }
async function goOn(pg) { await pg.waitForFunction(() => !document.getElementById('sr-next').disabled, null, { timeout: 5000 }).catch(() => {}); await pg.keyboard.press('Space'); await sleep(250); }
/* play the open pit card with a pattern like 'RWR', take any tune-up, and wait for the start lights */
async function pit(pg, pattern) { await waitFor(pg, s => s.cardOpen);
  for (const ch of pattern) { if (!(await snap(pg)).cardOpen) break; await answer(pg, ch === 'R'); await goOn(pg); }
  await sleep(200); if ((await snap(pg)).pickOpen) { await sleep(450); await pg.keyboard.press('Digit1'); await sleep(200); }
  return waitFor(pg, s => s.phase === 'lights' || s.phase === 'drive'); }
const toDrive = pg => waitFor(pg, s => s.phase === 'drive', 6000);
/* one short step of driving with real keys: the game's own road reader says which key a careful player would press */
async function drive(pg) { const k = await pg.evaluate(() => __G.hint('pro')); if (k) await pg.keyboard.press(k); await sleep(60); }

const A = {
  intents: { right: 'ArrowRight', left: 'ArrowLeft' },
  resetKeys: ['score', 'n', 'answered', 'correct', 'crashes', 'flags', 'over'],

  async open(pg, set = 'mult', extra = '') {
    await pg.goto(pg.qaUrl(`${URL}?set=${set}${extra}`), { waitUntil: 'load' });
    await pg.evaluate(() => localStorage.clear()); await pg.reload({ waitUntil: 'load' });
    await pg.waitForFunction(() => window.__G && document.getElementById('sr-nameinput'), null, { timeout: 15000 });
  },
  async start(pg) { await pg.fill('#sr-nameinput', 'Test S'); await pg.click('#sr-go');
    await pg.waitForFunction(() => __G.state().started, null, { timeout: 8000 }).catch(() => {}); await sleep(300); },
  snapshot: snap,
  playable: s => s.started && !s.over,
  moved: (a, b) => a.lane !== b.lane,
  answeredRight: (before, after) => after.correct === before.correct + 1 && after.answered === before.answered + 1,
  /* the run opens on the starting grid card */
  async openQuestion(pg) { await waitFor(pg, s => s.qOpen); await sleep(400); const before = await snap(pg);   /* the card ignores keys for its first quarter second */
    const right = await pg.evaluate(() => { const S = __G.state(); return S.q ? S.q.choices.findIndex(c => c.ok) : -1; });
    return { open: before.qOpen, right, before }; },
  async continueQuestion(pg) { await goOn(pg); if ((await snap(pg)).cardOpen) await pit(pg, 'RR'); await toDrive(pg); await pg.evaluate(() => { __G.traffic().length = 0; __G.state().r.lane = 1; }); await sleep(300); },
  async act(pg) { await pg.waitForFunction(() => { const r = __G.state().r; return r.rpm > 0.5 && r.gear < r.maxGear; }, null, { timeout: 5000 }).catch(() => {}); await pg.keyboard.press('Space'); },
  actName: 'Space shifts up a gear',
  acted: (a, b) => b.gear > a.gear,
  async dirty(pg) { await pg.evaluate(() => { const S = __G.state(); S.score += 1234; S.crashes += 3; S.flags += 1; }); },
  async forceEnd(pg) { await pg.evaluate(() => __G.end()); await sleep(200); },
  async endShown(pg) { try { await pg.waitForFunction(() => !document.getElementById('sr-end').hidden, null, { timeout: 8000 }); return true; } catch (e) { return false; } },
  async restart(pg) { await sleep(1400); await pg.click('#sr-again'); await sleep(300); await A.start(pg); },

  scenarios: [
    { name: 'pit card: right answers unlock gears, wrong answers never take time or stop the car', async run(r) {
      const pg = await r.page('chromebook'); await A.open(pg); await A.start(pg);
      const want = { RR: 5, RWR: 5, WRW: 4, WW: 3 };
      for (const p of Object.keys(want)) {
        await pg.evaluate(() => { __G.card.close(); __G.state().card = null; __G.state().left = 40; __G.jump(1, 'pit'); __G.set('pitT', 0); });
        const before = await waitFor(pg, s => s.cardOpen); const after = await pit(pg, p);
        r.check(`${p}: top gear for the next stretch`, want[p], after.maxGear);
        r.check(`${p}: the clock did not lose time on the card`, true, after.left >= 39.9);
        if (p === 'WW') { const d = await toDrive(pg); await sleep(2500); const s = await snap(pg);
          r.check('WW: the car still drives by itself (it has moved up the road)', true, s.pd > d.pd + 150 && s.v > 60);
          r.check('WW: the clock is running again', true, s.left < d.left - 1.5);
          await r.shot(pg, 'zero_right_still_drives'); }
      }
      await pg.context().close();
    } },
    { name: 'driving: Space shifts, 4th and 5th stay locked without right answers, keys change lanes', async run(r) {
      const pg = await r.page('chromebook'); await A.open(pg); await A.start(pg); await pit(pg, 'WW'); await toDrive(pg);
      await pg.evaluate(() => { __G.cfg.own = 0; __G.cfg.plan[0].gap = 99999; __G.traffic().length = 0; });
      const t0 = Date.now(); while (Date.now() - t0 < 7000) { if (await pg.evaluate(() => { const x = __G.state().r; return x.gear < x.maxGear && x.rpm > 0.75; })) await pg.keyboard.press('Space'); await sleep(60); }
      let s = await snap(pg); r.check('with 0 right the car reaches 3rd gear and no higher', 3, s.gear);
      await pg.keyboard.press('Space'); await sleep(100); r.check('Space in a locked top gear does not shift', 3, (await snap(pg)).gear);
      const a = await snap(pg); await pg.keyboard.press('ArrowRight'); await sleep(250); const b = await snap(pg);
      r.check('Right changes one lane', a.lane + 1, b.lane);
      await pg.keyboard.press('KeyA'); await sleep(250); r.check('A changes one lane back', a.lane, (await snap(pg)).lane);
      await pg.context().close();
    } },
    { name: 'a crash costs speed and never time; a bumper shield blocks one', async run(r) {
      const pg = await r.page('chromebook'); await A.open(pg); await A.start(pg); await pit(pg, 'RR'); await toDrive(pg);
      await pg.evaluate(() => { __G.cfg.own = 0; __G.cfg.plan[0].gap = 99999; __G.traffic().length = 0; }); await sleep(2500);
      const put = () => pg.evaluate(() => { const S = __G.state(); __G.traffic().push({ d: S.r.pd + 150, lane: S.r.lane, x: __G.car().x, col: '#7C86A8', truck: 0, len: 74, v0: 40, v: 40, out: 0, rot: 0, pass: 0, hit: 0, th: 0 }); });
      const a = await snap(pg); await put(); await waitFor(pg, s => s.crashes > a.crashes, 4000); await sleep(350); const b = await snap(pg);
      r.check('driving into a car is a crash', a.crashes + 1, b.crashes);
      r.check('the crash drops the speed', true, b.v < a.v * 0.5);
      r.check('the crash takes no time off the clock beyond the seconds that passed', true, a.left - b.left < 2.5);
      await sleep(2600); await pg.evaluate(() => { __G.state().shield = 1; }); const c = await snap(pg); await put(); await sleep(1500); const d = await snap(pg);
      r.check('with a shield the next hit is not a crash and the shield is used up', JSON.stringify([c.crashes, 0]), JSON.stringify([d.crashes, d.shield]));
      await pg.context().close();
    } },
    { name: 'the checkpoint clock: a flag adds time, and the run ends when the clock hits 0', async run(r) {
      const pg = await r.page('chromebook'); await A.open(pg); await A.start(pg); await pit(pg, 'RR'); await toDrive(pg);
      await pg.evaluate(() => { const S = __G.state(); __G.traffic().length = 0; S.left = 20; S.r.pd = S.r.L - 300; });
      const s = await waitFor(pg, x => x.n === 1, 6000);
      r.check('crossing the flag moves on to stretch 2 and adds time', true, s.n === 1 && s.left > 40);
      r.check('a pit card opens at the flag', true, (await waitFor(pg, x => x.cardOpen, 4000)).cardOpen);
      await pit(pg, 'WW'); await toDrive(pg); await pg.evaluate(() => { __G.state().left = 0.6; });
      const e = await waitFor(pg, x => x.over, 4000);
      r.check('the clock at 0 ends the run on the end screen', true, e.over && !e.won && await A.endShown(pg));
      r.check('the headline says where the run ended', true, /stretch 2 of 8/.test(await pg.evaluate(() => document.getElementById('sr-end').textContent)));
      await r.shot(pg, 'out_of_time');
      await pg.context().close();
    } },
    { name: 'the finale: crossing the state line wins the run', async run(r) {
      const pg = await r.page('chromebook'); await A.open(pg); await A.start(pg); await pit(pg, 'RR'); await toDrive(pg);
      await pg.evaluate(() => { const S = __G.state(); S.left = 30; __G.jump(7, 'end'); __G.traffic().length = 0; __G.cfg.plan[7].gap = 99999; __G.cfg.own = 0; });
      const a = await snap(pg); const e = await waitFor(pg, x => x.over, 12000);
      r.check('the run ends as a win', true, e.over && e.won);
      r.check('the win pays the state line bonus', true, e.score >= a.score + 5000);
      r.check('the end screen shows', true, await A.endShown(pg));
      await r.shot(pg, 'win');
      await pg.context().close();
    } },
    { name: 'a reload mid-stretch comes back at the same spot with the same clock', async run(r) {
      const pg = await r.page('chromebook'); await A.open(pg); await A.start(pg); await pit(pg, 'RR'); await toDrive(pg);
      await pg.evaluate(() => { __G.cfg.own = 0; __G.traffic().length = 0; }); await sleep(4500); const a = await snap(pg);
      await pg.reload({ waitUntil: 'load' }); await pg.waitForFunction(() => window.__G && __G.state().started, null, { timeout: 8000 }); const b = await snap(pg);
      r.check('still driving the same stretch', JSON.stringify(['drive', 0, 5]), JSON.stringify([b.phase, b.n, b.maxGear]));
      r.check('no farther back than the last save (2 s) and not ahead', true, b.pd <= a.pd + 200 && b.pd > a.pd - 1200);
      r.check('the clock did not go back up', true, b.left <= a.left + 2.2);
      await pg.context().close();
    } },
    ...mathRule({
      open: pg => A.open(pg, 'mult', '&short=0.22'),
      start: pg => A.start(pg),
      peek: pg => pg.evaluate(() => { const S = __G.state(), up = __G.card.isOpen(), q = S.q;
        return { over: !!S.over, score: S.score, t: Math.round((S.pt || 0) * 10) / 10, correct: S.correct,
          card: { open: up, done: !!S.qDone, right: q ? q.choices.findIndex(c => c.ok) : -1, n: q ? q.choices.length : 4, id: (S.answered - (S.qDone ? 1 : 0)) + '|' + (q ? q.prompt : '') },
          pick: __G.pick.isOpen() ? 0 : false }; }),
      drive,
      moments: { min: 8, max: 8, gap: 3 },
      cap: 200, idleSecs: 30,
    }),
  ],
};
module.exports = A;
