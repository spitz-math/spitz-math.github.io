/* Remake kit adapter (tier 2). Plays games/new/remake_kit/demo.html, a small stand-in game built only from the shared remake kit
   (title screen, box-free HUD, the 2-questions-plus-a-spare card, end screen). A remake that uses the kit inherits what is proven here.
   Real input throughout: number keys answer, Space goes on, arrow keys move, Enter and clicks restart. Hooks only set the scene
   (__G.open('dock') opens a card, __G.end() ends the run). */
const { sleep } = require('../lib/harness');

const URL = 'games/new/remake_kit/demo.html';
const SETS = ['mult', 'slope', 'point', 'hoy', 'shift', 'func', 'int', 'sq', 'plot0', 'plot', 'fam', 'fslope', 'stdform', 'slide', 'perp', 'solve', 'evalf', 'dr', 'rate', 'icpt'];

const state = pg => pg.evaluate(() => { const S = __G.state(), c = S.card;
  return { answered: S.answered, correct: S.correct, n: c ? c.n : 0, got: c ? c.got : 0, miss: c ? c.miss : 0, open: __G.card.isOpen(), qDone: !!S.qDone,
    prompt: S.q ? S.q.prompt : '', right: S.q ? S.q.choices.findIndex(x => x.ok) : -1, nChoices: S.q ? S.q.choices.length : 0, nRight: S.q ? S.q.choices.filter(x => x.ok).length : 0,
    marker: document.getElementById('dm-qn').textContent, pips: document.querySelectorAll('#dm-qpips .rk-pip').length, results: __G.results.slice() }; });
/* text under 11 real pixels inside sel (the stage is 1920 wide and scales to the window) */
const smallText = (pg, sel) => pg.evaluate(sel => { const k = 1920 / document.getElementById('stage').getBoundingClientRect().width;
  return [].filter.call(document.querySelectorAll(sel + ' *'), e => e.offsetParent && [].some.call(e.childNodes, n => n.nodeType === 3 && n.nodeValue.trim()) && parseFloat(getComputedStyle(e).fontSize) / k < 11).map(e => (e.className && e.className.baseVal === undefined ? e.className : '') || e.tagName).join(', '); }, sel);
/* answer the open question with the real number key: the right one, or a wrong one */
async function answer(pg, right) { await sleep(320);
  const s = await state(pg); const i = right ? s.right : (s.right + 1) % s.nChoices;
  await pg.keyboard.press('Digit' + (i + 1)); await sleep(80); return s; }
/* go on with Space once the card allows it (a miss holds for 2 s so the reason gets read) */
async function goOn(pg) { await pg.waitForFunction(() => !document.getElementById('dm-next').disabled, null, { timeout: 5000 }).catch(() => {});
  const before = await state(pg); await pg.keyboard.press('Space');
  await pg.waitForFunction(b => { const S = __G.state(); return !__G.card.isOpen() || (S.card && S.card.n !== b); }, before.n, { timeout: 3000 }).catch(() => {}); }
/* play one whole card with a pattern like 'RWR' */
async function playCard(pg, pattern, kind = 'dock') {
  await pg.evaluate(k => __G.open(k), kind); const seen = [];
  for (const ch of pattern) { const s = await state(pg); if (!s.open) break; seen.push(s.marker); await answer(pg, ch === 'R'); await goOn(pg); }
  const s = await state(pg); return { seen, closed: !s.open, result: s.results[s.results.length - 1] || null };
}

const A = {
  intents: { left: 'ArrowLeft', right: 'ArrowRight' },
  unsupported: { action: 'the stand-in game only moves; Dash changes speed and has nothing of its own to check' },
  resetKeys: ['score', 'hearts', 'gems', 'answered', 'correct', 'over'],

  async open(pg, set = 'mult', look = 'pixel') {
    await pg.goto(pg.qaUrl(`${URL}?set=${set}&look=${look}`), { waitUntil: 'load' });
    await pg.evaluate(() => localStorage.clear()); await pg.reload({ waitUntil: 'load' });
    await pg.waitForFunction(() => window.__G && document.getElementById('dm-nameinput'), null, { timeout: 15000 });
  },
  async start(pg) {
    await pg.fill('#dm-nameinput', 'Test S'); await pg.click('#dm-go');
    await pg.waitForFunction(() => __G.state().started, null, { timeout: 8000 }).catch(() => {});
    await sleep(300);
  },
  snapshot: pg => pg.evaluate(() => { const S = __G.state();
    return { started: !!S.started, over: !!S.over, score: S.score, hearts: S.hearts, gems: S.gems, answered: S.answered, correct: S.correct,
      x: Math.round(__G.ship().x), qOpen: !!(S.q && !S.qDone && __G.card.isOpen()) }; }),
  playable: s => s.started && !s.over,
  moved: (a, b) => a.x !== b.x,
  answeredRight: (before, after) => after.correct === before.correct + 1 && after.answered === before.answered + 1,

  async openQuestion(pg) {
    await pg.evaluate(() => { __G.ship().x = 300; __G.open('dock'); }); await sleep(400);
    const before = await A.snapshot(pg);
    const q = await pg.evaluate(() => { const S = __G.state(); return { open: !!(S.q && !S.qDone && __G.card.isOpen()), right: S.q ? S.q.choices.findIndex(c => c.ok) : -1 }; });
    return { ...q, before };
  },
  /* the card asks a second question: answer it too, then the run goes on */
  async continueQuestion(pg) { await goOn(pg); if ((await state(pg)).open) { await answer(pg, true); await goOn(pg); } await sleep(200); },
  async dirty(pg) { await pg.evaluate(() => { const S = __G.state(); S.score += 1234; S.gems += 7; S.hearts = 1; }); },
  async forceEnd(pg) { await pg.evaluate(() => __G.end()); await sleep(200); },
  async endShown(pg) { try { await pg.waitForFunction(() => !document.getElementById('dm-end').hidden, null, { timeout: 8000 }); return true; } catch (e) { return false; } },
  async restart(pg) { await sleep(1400); await pg.click('#dm-again'); await sleep(300); await A.start(pg); },

  scenarios: [
    { name: 'question card: two questions, plus a spare third only after one miss', async run(r) {
      const pg = await r.page('chromebook'); await A.open(pg); await A.start(pg);
      const want = { RR: [2, 2, true, false], RWR: [2, 3, false, true], WRR: [2, 3, false, true], RWW: [1, 3, false, true], WRW: [1, 3, false, true], WW: [0, 2, false, false] };
      for (const p of Object.keys(want)) {
        const got = await playCard(pg, p), w = want[p], x = got.result || {};
        r.check(`${p}: the card closes after ${w[1]} questions`, true, got.closed);
        r.check(`${p}: right, asked, perfect, spare used`, JSON.stringify(w), JSON.stringify([x.right, x.asked, x.perfect, x.spare]));
        if (p === 'RWR') { r.check('markers read "1 of 2", "2 of 2", then "Spare question"', '1 of 2|2 of 2|Spare question', got.seen.join('|')); }
        if (p === 'WW') r.check('two misses never show a spare', '1 of 2|2 of 2', got.seen.join('|'));
      }
      const one = await playCard(pg, 'W', 'revive');
      r.check('a single-question kind (need 1, no spare) ends after one answer', JSON.stringify([0, 1]), JSON.stringify([one.result.right, one.result.asked]));
      await pg.context().close();
    } },

    { name: 'question card: a reload comes back on the same question, and an answer can not be retried', async run(r) {
      const pg = await r.page('chromebook'); await A.open(pg, 'slope'); await A.start(pg);
      await pg.evaluate(() => __G.open('dock')); await sleep(350); const a = await state(pg);
      await pg.reload({ waitUntil: 'load' }); await pg.waitForFunction(() => window.__G && __G.card.isOpen(), null, { timeout: 8000 }).catch(() => {});
      const b = await state(pg);
      r.check('after a reload the card is open again', true, b.open);
      r.check('it shows the same question', a.prompt, b.prompt);
      r.check('still question 1 of 2', '1 of 2', b.marker);
      await answer(pg, false); const c = await state(pg);
      r.check('a miss is counted and saved with the answer', JSON.stringify([1, 0, 1]), JSON.stringify([c.answered, c.correct, c.miss]));
      await pg.reload({ waitUntil: 'load' }); await pg.waitForFunction(() => window.__G && __G.card.isOpen(), null, { timeout: 8000 }).catch(() => {});
      const d = await state(pg);
      r.check('reloading after a miss does not give the question back', true, d.qDone && d.prompt === c.prompt);
      await pg.keyboard.press('Digit' + (d.right + 1)); await sleep(200); const e = await state(pg);
      r.check('the answered question ignores more number keys', JSON.stringify([1, 0]), JSON.stringify([e.answered, e.correct]));
      await r.shot(pg, 'reload_after_miss');
      await goOn(pg); const f = await state(pg);
      r.check('Space moves on to question 2 of 2', '2 of 2', f.marker);
      const saved = await pg.evaluate(() => { const k = Object.keys(localStorage).find(x => /^remake_kit_demo_v1/.test(x) && !/_t$/.test(x)); const v = JSON.parse(localStorage.getItem(k)); return [typeof v.answered, !!v.q, typeof v.qDone, typeof v.picked, !!v.card]; });
      r.check('the save keeps the shape the answer log reads (answered, q, qDone, picked) plus the card', JSON.stringify(['number', true, 'boolean', 'number', true]), JSON.stringify(saved));
      await pg.context().close();
    } },

    { name: 'question card: it owns the keyboard while open', async run(r) {
      const pg = await r.page('chromebook'); await A.open(pg); await A.start(pg);
      await pg.evaluate(() => { __G.ship().x = 480; __G.open('dock'); });
      const s0 = await state(pg); await pg.keyboard.press('Digit' + (s0.right + 1)); await sleep(60);
      r.check('a key pressed in the first quarter second (held over from play) does not answer', 0, (await state(pg)).answered);
      await pg.keyboard.down('ArrowRight'); await sleep(500); await pg.keyboard.up('ArrowRight');
      r.check('arrow keys do not move the player behind the card', 480, (await A.snapshot(pg)).x);
      await pg.keyboard.press('Space'); await sleep(150);
      r.check('Space before answering does not skip the question', true, (await state(pg)).open && (await state(pg)).n === 1);
      await pg.click('#dm-choices .rk-ch:nth-child(' + (s0.right + 1) + ')'); await sleep(150);
      r.check('a click answers too', 1, (await state(pg)).correct);
      r.check('no card text under 11px at Chromebook size', '', await smallText(pg, '#dm-q'));
      await pg.context().close();
    } },

    { name: 'question card: every question set fits the card', async run(r) {
      const pg = await r.page('chromebook'); const bad = [];
      for (const set of SETS) {
        await A.open(pg, set); await A.start(pg);
        for (let i = 0; i < 2; i++) {
          await pg.evaluate(() => __G.open('dock')); await sleep(60);
          for (let k = 0; k < 3 && (await state(pg)).open; k++) {
            const s = await state(pg);
            const box = await pg.evaluate(() => { const w = document.getElementById('dm-q').getBoundingClientRect(), st = document.getElementById('stage').getBoundingClientRect();
              const over = [].some.call(document.querySelectorAll('#dm-q .rk-ch .t, #dm-qp'), e => e.scrollWidth > e.clientWidth + 2);
              return { in: w.top >= st.top - 1 && w.bottom <= st.bottom + 1 && w.left >= st.left && w.right <= st.right, over }; });
            if (s.nRight !== 1 || s.nChoices < 2 || s.nChoices > 4) bad.push(`${set}: ${s.nChoices} choices, ${s.nRight} right`);
            if (!box.in) bad.push(`${set}: card leaves the screen`); if (box.over) bad.push(`${set}: text runs out of its box`);
            await answer(pg, (i + k) % 2 === 0); if (i === 0 && k === 0 && (set === 'plot' || set === 'mult' || set === 'solve')) await r.shot(pg, 'set_' + set);
            await goOn(pg);
          }
        }
      }
      r.check('all 20 sets: one right answer, 2 to 4 choices, the card stays on screen, no text spills', '', bad.slice(0, 6).join('; '));
      await pg.context().close();
    } },

    { name: 'title screen: Back to Arcade top left, no header, WASD beside the arrows', async run(r) {
      for (const look of ['pixel', 'cartoon', 'dungeon']) {
        const pg = await r.page('chromebook'); await A.open(pg, 'mult', look); await sleep(500);
        const t = await pg.evaluate(() => { const st = document.getElementById('stage').getBoundingClientRect(), k = 1920 / st.width, vis = e => !!e && !!e.offsetParent;
          const hub = document.querySelector('#dm-start .spz-hub'), hr = hub ? hub.getBoundingClientRect() : null, ctl = document.querySelector('#dm-start .sz-ctl');
          const caps = [].map.call(ctl.querySelectorAll('kbd'), e => e.querySelector('svg') ? 'arrow' : e.textContent), g = ctl.querySelector('.g .k'), or = g.querySelector('.or'), kb = g.querySelectorAll('.t');
          const small = [].filter.call(document.querySelectorAll('#dm-start *'), e => vis(e) && [].some.call(e.childNodes, n => n.nodeType === 3 && n.nodeValue.trim()) && parseFloat(getComputedStyle(e).fontSize) / k < 11).map(e => e.className || e.tagName);
          return { hubLeft: hr ? Math.round((hr.left - st.left) * k) : -1, hubTop: hr ? Math.round((hr.top - st.top) * k) : -1, header: vis(document.querySelector('#dm-start .sz-eyebrow')),
            arrows: caps.filter(c => c === 'arrow').length, wasd: ['W', 'A', 'S', 'D'].every(c => caps.includes(c)), go: document.getElementById('dm-go').disabled,
            orOnBottomRow: or && kb.length === 2 ? Math.abs((or.getBoundingClientRect().top + or.getBoundingClientRect().height / 2) - (kb[0].getBoundingClientRect().bottom - kb[0].querySelector('kbd').getBoundingClientRect().height / 2)) < 3 : false,
            sameSize: (() => { const a = kb[0].querySelector('kbd').getBoundingClientRect(), b = kb[1].querySelector('kbd').getBoundingClientRect(); return Math.abs(a.width - b.width) < 1 && Math.abs(a.height - b.height) < 1; })(), small }; });
        r.check(`${look}: Back to Arcade sits top left`, true, t.hubLeft >= 0 && t.hubLeft < 60 && t.hubTop >= 0 && t.hubTop < 60);
        r.check(`${look}: no "Spitz Arcade" header`, false, t.header);
        r.check(`${look}: four arrow keys drawn as pixel shapes, and W A S D`, true, t.arrows === 4 && t.wasd);
        r.check(`${look}: arrow keys and letter keys are the same size, "or" sits on their bottom row`, true, t.sameSize && t.orOnBottomRow);
        r.check(`${look}: Start waits for a name`, true, t.go);
        r.check(`${look}: no title text under 11px at Chromebook size`, '', t.small.join(', '));
        await pg.fill('#dm-nameinput', 'wasd f m'); await sleep(100);
        r.check(`${look}: typing a name with game keys in it does not start or steer anything`, false, (await A.snapshot(pg)).started);
        await r.shot(pg, 'title_' + look);
        await pg.keyboard.press('Enter'); await sleep(300);
        r.check(`${look}: Enter in the name box starts the run`, true, (await A.snapshot(pg)).started);
        await pg.context().close();
      }
    } },

    { name: 'HUD: nothing boxed, survival left, score right, readable at Chromebook size', async run(r) {
      const pg = await r.page('chromebook'); await A.open(pg); await A.start(pg); await pg.evaluate(() => { __G.state().score = 12450; }); await sleep(200);
      const h = await pg.evaluate(() => { const st = document.getElementById('stage').getBoundingClientRect(), k = 1920 / st.width, mid = st.left + st.width / 2, its = [].slice.call(document.querySelectorAll('#dm-hud .rk-it'));
        const boxed = its.filter(e => { const c = getComputedStyle(e); return c.backgroundColor !== 'rgba(0, 0, 0, 0)' || parseFloat(c.borderTopWidth) > 0 || c.boxShadow !== 'none'; }).map(e => e.dataset.id);
        const side = id => { const e = document.querySelector('#dm-hud [data-id="' + id + '"]').getBoundingClientRect(); return e.left + e.width / 2 < mid ? 'left' : 'right'; };
        const small = [].filter.call(document.querySelectorAll('#dm-hud .l, #dm-hud .v, #dm-hud .tx'), e => parseFloat(getComputedStyle(e).fontSize) / k < 11).length;
        return { boxed, hearts: side('hearts'), time: side('time'), score: side('score'), dock: side('dock'), small, text: document.querySelector('#dm-hud [data-id="score"] .v').textContent,
          aria: document.querySelector('#dm-hud .rk-hearts').getAttribute('aria-label') }; });
      r.check('no HUD item has a box, border or panel behind it', '', h.boxed.join(', '));
      r.check('hearts and time on the left, score and progress on the right', 'left left right right', [h.hearts, h.time, h.score, h.dock].join(' '));
      r.check('the score shows with a comma', '12,450', h.text);
      r.check('hearts are read out for screen readers', '3 of 3 hearts left', h.aria);
      r.check('no HUD text under 11px at Chromebook size', 0, h.small);
      await r.shot(pg, 'hud');
      await pg.context().close();
    } },

    { name: 'end screen: mashing keys as the run ends does not skip it', async run(r) {
      const pg = await r.page('chromebook'); await A.open(pg); await A.start(pg); await A.dirty(pg);
      await pg.evaluate(() => __G.end());
      for (let i = 0; i < 6; i++) { await pg.keyboard.press(i % 2 ? 'Enter' : 'Space'); await sleep(90); }
      const e = await pg.evaluate(() => ({ shown: !document.getElementById('dm-end').hidden, header: !!document.querySelector('#dm-end .sz-eyebrow').offsetParent, name: document.getElementById('dm-endname').textContent,
        stats: document.querySelectorAll('#dm-endstats .rk-stat').length, boxed: [].filter.call(document.querySelectorAll('#dm-endstats .rk-stat'), s => getComputedStyle(s).backgroundColor !== 'rgba(0, 0, 0, 0)' || parseFloat(getComputedStyle(s).borderTopWidth) > 0).length,
        hub: !!document.querySelector('#dm-end .spz-hub') }));
      r.check('the end screen is still up after Space and Enter in the first second', true, e.shown);
      r.check('it shows the name, three plain stats (no tiles), Back to Arcade and no header', JSON.stringify(['Test S', 3, 0, true, false]), JSON.stringify([e.name, e.stats, e.boxed, e.hub, e.header]));
      await sleep(2600);
      r.check('the score counts up to the real score', '1,234', await pg.evaluate(() => document.getElementById('dm-endscore').textContent));
      r.check('no end screen text under 11px at Chromebook size', '', await smallText(pg, '#dm-end'));
      await r.shot(pg, 'end');
      await pg.keyboard.press('Enter'); await sleep(300);
      r.check('after that, Enter plays again (back to the title with the name kept)', JSON.stringify([true, false, 'Test S']),
        JSON.stringify(await pg.evaluate(() => [document.getElementById('dm-end').hidden, document.getElementById('dm-start').hidden, document.getElementById('dm-nameinput').value])));
      await pg.context().close();
    } },
  ],
};
module.exports = A;
