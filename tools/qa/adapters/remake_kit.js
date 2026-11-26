/* Remake kit adapter (tier 2). Plays games/new/remake_kit/demo.html, a small stand-in game built only from the shared remake kit
   (title screen, box-free HUD, the 2-questions-plus-a-spare card, upgrade pick, pause box, sound and feel hooks, run extras, end screen),
   and runs the math rule bots on it. A remake that uses the kit inherits what is proven here.
   Real input throughout: number keys answer, Space goes on, arrow keys move, Enter and clicks restart. Hooks only set the scene
   (__G.open('dock') opens a card, __G.end() ends the run). */
const { sleep } = require('../lib/harness');
const { mathRule } = require('./_mathrule');

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
/* two right on a dock opens the upgrade pick: take the first one on offer with its real number key */
async function clearPick(pg) { if (!(await pg.evaluate(() => __G.pick.isOpen()))) return false; await sleep(450);
  const i = await pg.evaluate(() => [].findIndex.call(document.querySelectorAll('#dm-cards .rk-card'), b => !b.disabled));
  await pg.keyboard.press('Digit' + (i + 1)); await sleep(120); return true; }
/* play one whole card with a pattern like 'RWR' */
async function playCard(pg, pattern, kind = 'dock') {
  await pg.evaluate(k => __G.open(k), kind); const seen = [];
  for (const ch of pattern) { const s = await state(pg); if (!s.open) break; seen.push(s.marker); await answer(pg, ch === 'R'); await goOn(pg); }
  const picked = await clearPick(pg);
  const s = await state(pg); return { seen, closed: !s.open, picked, result: s.results[s.results.length - 1] || null };
}

const A = {
  intents: { left: 'ArrowLeft', right: 'ArrowRight' },
  unsupported: { action: 'the stand-in game only moves; Dash changes speed and has nothing of its own to check' },
  resetKeys: ['score', 'hearts', 'gems', 'answered', 'correct', 'over'],

  async open(pg, set = 'mult', look = 'pixel', extra = '') {
    await pg.goto(pg.qaUrl(`${URL}?set=${set}&look=${look}${extra}`), { waitUntil: 'load' });
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
  async continueQuestion(pg) { await goOn(pg); if ((await state(pg)).open) { await answer(pg, true); await goOn(pg); } await clearPick(pg); await sleep(200); },
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
        r.check(`${p}: the upgrade pick opens only for two right`, x.right === 2, got.picked);
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
      const saved = await pg.evaluate(() => { const k = Object.keys(localStorage).find(x => /^remake_kit_demo_v2/.test(x) && !/_t$/.test(x)); const v = JSON.parse(localStorage.getItem(k)); return [typeof v.answered, !!v.q, typeof v.qDone, typeof v.picked, !!v.card]; });
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
    { name: 'upgrade pick: number keys pick once, a taken upgrade greys out, a reload can not pick twice', async run(r) {
      const pg = await r.page('chromebook'); await A.open(pg); await A.start(pg);
      await pg.evaluate(() => __G.open('dock')); await answer(pg, true); await goOn(pg); await answer(pg, true);
      await pg.waitForFunction(() => !document.getElementById('dm-next').disabled, null, { timeout: 5000 }).catch(() => {});
      await pg.keyboard.press('Space'); await pg.keyboard.press('Digit2'); await sleep(150);
      const p0 = await pg.evaluate(() => ({ open: __G.pick.isOpen(), shield: __G.state().shield, cards: document.querySelectorAll('#dm-cards .rk-card').length, tip: document.getElementById('dm-picktip').textContent }));
      r.check('two right opens the pick with three choices', JSON.stringify([true, 3]), JSON.stringify([p0.open, p0.cards]));
      r.check('a key pressed as the pick opens does not choose', 0, p0.shield);
      r.check('no pick text under 11px at Chromebook size', '', await smallText(pg, '#dm-pick'));
      await r.shot(pg, 'pick');
      await pg.reload({ waitUntil: 'load' }); await pg.waitForFunction(() => window.__G && __G.pick.isOpen(), null, { timeout: 8000 }).catch(() => {});
      r.check('a reload comes back on the pick', true, await pg.evaluate(() => __G.pick.isOpen()));
      await sleep(450); await pg.keyboard.down('ArrowRight'); await sleep(300); await pg.keyboard.up('ArrowRight');
      r.check('arrow keys do not move the player behind the pick', 480, (await A.snapshot(pg)).x);
      await pg.keyboard.press('Digit2'); await sleep(150);
      r.check('key 2 takes the Shield and the pick closes', JSON.stringify([false, 1]), JSON.stringify(await pg.evaluate(() => [__G.pick.isOpen(), __G.state().shield])));
      await pg.reload({ waitUntil: 'load' }); await pg.waitForFunction(() => window.__G && __G.state().started, null, { timeout: 8000 }).catch(() => {}); await sleep(300);
      r.check('reloading after picking does not open the pick again', false, await pg.evaluate(() => __G.pick.isOpen()));
      await pg.evaluate(() => { __G.state().shield = 1; __G.pick.open(1); }); await sleep(450);
      r.check('an upgrade already held shows greyed out', true, await pg.evaluate(() => document.querySelectorAll('#dm-cards .rk-card')[1].disabled));
      await pg.keyboard.press('Digit2'); await sleep(120);
      r.check('its key does nothing', true, await pg.evaluate(() => __G.pick.isOpen()));
      await pg.click('#dm-cards .rk-card:nth-child(3)'); await sleep(150);
      r.check('a click picks too', JSON.stringify([false, true]), JSON.stringify(await pg.evaluate(() => [__G.pick.isOpen(), __G.state().boost > 0])));
      await pg.context().close();
    } },

    { name: 'pause box: P stops the clock and the player, P or the button resumes, sliders set the volume', async run(r) {
      const pg = await r.page('chromebook'); await A.open(pg); await A.start(pg); await sleep(400);
      await pg.keyboard.press('KeyP'); await sleep(150);
      const a = await pg.evaluate(() => ({ open: !document.getElementById('dm-pause').hidden, left: __G.state().left, x: __G.ship().x, stats: document.querySelectorAll('#dm-pstats .rk-stat').length, busy: __G.rk.busy() }));
      r.check('P opens the pause box with the run stats', JSON.stringify([true, 3, true]), JSON.stringify([a.open, a.stats, a.busy]));
      await pg.keyboard.down('ArrowRight'); await sleep(700); await pg.keyboard.up('ArrowRight');
      const b = await pg.evaluate(() => ({ left: __G.state().left, x: __G.ship().x }));
      r.check('while paused the clock stands still and the player does not move', JSON.stringify([a.left, a.x]), JSON.stringify([b.left, b.x]));
      r.check('no pause text under 11px at Chromebook size', '', await smallText(pg, '#dm-pause'));
      await pg.focus('#dm-volf'); for (let i = 0; i < 4; i++) await pg.keyboard.press('ArrowLeft'); await sleep(100);
      const v = await pg.evaluate(() => [Math.round(__G.rk.vol('fx') * 100), document.getElementById('dm-volfv').textContent]);
      r.check('the Effects slider turns the volume down with the arrow keys, and shows it', true, v[0] < 100 && v[1] === v[0] + '%' ? true : JSON.stringify(v));
      await r.shot(pg, 'pause');
      await pg.evaluate(() => document.activeElement.blur()); await pg.keyboard.press('Shift+R'); await sleep(150);
      r.check('Shift+R still asks about a new game on top of the pause box', false, await pg.evaluate(() => document.getElementById('dm-confirm').hidden));
      await pg.keyboard.press('KeyN'); await sleep(150);
      await pg.keyboard.press('KeyP'); await sleep(150);
      r.check('P resumes', true, await pg.evaluate(() => document.getElementById('dm-pause').hidden));
      await sleep(400); r.check('the clock runs again', true, (await pg.evaluate(() => __G.state().left)) < a.left);
      await pg.keyboard.press('Escape'); await sleep(150); await pg.click('#dm-resume'); await sleep(150);
      r.check('Esc pauses and the Resume button resumes', true, await pg.evaluate(() => document.getElementById('dm-pause').hidden && !__G.rk.busy()));
      await pg.evaluate(() => __G.open('dock')); await sleep(300); await pg.keyboard.press('KeyP'); await sleep(150);
      const c = await state(pg); await pg.keyboard.press('Digit' + (c.right + 1)); await sleep(150);
      r.check('pausing over a question card blocks the answer keys', 0, (await state(pg)).answered);
      await pg.keyboard.press('KeyP'); await sleep(350); await pg.keyboard.press('Digit' + (c.right + 1)); await sleep(150);
      r.check('after resuming, the question takes its answer', 1, (await state(pg)).correct);
      await pg.reload({ waitUntil: 'load' }); await pg.waitForFunction(() => window.__G && __G.state().started, null, { timeout: 8000 }).catch(() => {});
      r.check('the volume is remembered after a reload', v[0], await pg.evaluate(() => Math.round(__G.rk.vol('fx') * 100)));
      await pg.context().close();
    } },

    { name: 'sound and feel: chimes on answers, pops and banners capped, M mutes, reduce-motion keeps the screen still', async run(r) {
      const pg = await r.page('chromebook'); await A.open(pg); await A.start(pg);
      await pg.evaluate(() => { window.__rkSnd.length = 0; __G.open('dock'); }); await answer(pg, true); await goOn(pg); await answer(pg, false); await sleep(100);
      const snd = await pg.evaluate(() => window.__rkSnd.slice());
      r.check('opening a card, a right answer and a miss each ask for their own sound', true, ['open', 'right', 'wrong'].every(n => snd.includes(n)) ? true : snd.join(','));
      await goOn(pg); if ((await state(pg)).open) { await answer(pg, true); await goOn(pg); } await clearPick(pg);
      await pg.evaluate(() => { for (let i = 0; i < 40; i++) __G.rk.fx.pop(200 + i * 30, 400, '+100', 'good'); __G.rk.fx.banner('Wave 2', 'here they come'); __G.rk.fx.banner('Wave 2', 'here they come'); __G.rk.fx.banner('Boss!', ''); });
      await sleep(250);
      const f = await pg.evaluate(() => ({ pops: document.querySelectorAll('#dm-fx .rk-pop').length, banner: document.querySelector('#dm-banner b').textContent, shown: !document.getElementById('dm-banner').hidden }));
      r.check('number pops are capped so a burst can not flood the screen', true, f.pops > 0 && f.pops <= 14 ? true : f.pops);
      r.check('banners show one at a time, first one first', JSON.stringify([true, 'Wave 2']), JSON.stringify([f.shown, f.banner]));
      r.check('no pop or banner text under 11px at Chromebook size', '', (await smallText(pg, '#dm-banner')) + (await smallText(pg, '#stage > .rk-fx')));
      await r.shot(pg, 'feel');
      await pg.evaluate(() => __G.rk.fx.shake(1)); await sleep(120);
      r.check('a hit shakes the game picture', true, await pg.evaluate(() => (document.getElementById('dm-canvas').style.translate || '') !== ''));
      await sleep(1600);
      r.check('the shake dies away by itself', '', await pg.evaluate(() => document.getElementById('dm-canvas').style.translate || ''));
      await pg.evaluate(() => __G.rk.fx.stop(5000)); r.check('a hit-stop is never longer than a fifth of a second', false, await (async () => { await sleep(260); return pg.evaluate(() => __G.rk.fx.frozen()); })());
      await pg.keyboard.press('KeyM'); await sleep(100); const m1 = await pg.evaluate(() => __G.rk.muted());
      await pg.keyboard.press('KeyM'); await sleep(100); const m2 = await pg.evaluate(() => __G.rk.muted());
      r.check('M turns the sound off and on', JSON.stringify([true, false]), JSON.stringify([m1, m2]));
      await pg.context().close();
      const calm = await r.page('chromebook'); await calm.emulateMedia({ reducedMotion: 'reduce' }); await A.open(calm); await A.start(calm);
      await calm.evaluate(() => { __G.rk.fx.shake(1); __G.rk.fx.stop(150); }); await sleep(120);
      r.check('with reduce-motion on: no shake and no hit-stop', JSON.stringify(['', false]), JSON.stringify(await calm.evaluate(() => [document.getElementById('dm-canvas').style.translate || '', __G.rk.fx.frozen()])));
      await calm.context().close();
    } },

    { name: 'run extras: streak multiplier, best today, idle nudge, topics on the end screen', async run(r) {
      const pg = await r.page('chromebook'); await A.open(pg, 'slope'); await A.start(pg);
      r.check('streak multiplier steps: 3 in a row ×1.5, 6 ×2, 10 ×3, and a miss is back to ×1', JSON.stringify([1, 1.5, 1.5, 2, 3, 1]), JSON.stringify(await pg.evaluate(() => [2, 3, 5, 6, 12, 0].map(n => __G.rk.mult(n)))));
      await pg.evaluate(() => { __G.state().streak = 3; }); await sleep(200);
      r.check('the HUD says what the streak is worth', true, /3 right = ×1\.5/.test(await pg.evaluate(() => document.querySelector('#dm-hud [data-id="streak"]').textContent)));
      await pg.evaluate(() => { __G.gems().length = 0; }); await sleep(7200);
      r.check('after 6 s with no key the nudge shows', false, await pg.evaluate(() => document.getElementById('dm-nudge').hidden));
      r.check('no nudge text under 11px at Chromebook size', 0, await pg.evaluate(() => { const k = 1920 / document.getElementById('stage').getBoundingClientRect().width; return parseFloat(getComputedStyle(document.getElementById('dm-nudge')).fontSize) / k < 11 ? 1 : 0; }));
      await pg.keyboard.press('ArrowLeft'); await sleep(150);
      r.check('any key clears it', true, await pg.evaluate(() => document.getElementById('dm-nudge').hidden));
      for (const p of ['RR', 'RWR']) await playCard(pg, p);
      await pg.evaluate(() => { __G.state().score = 5000; __G.end(); }); await sleep(2800);
      const e1 = await pg.evaluate(() => ({ goal: document.getElementById('dm-endgoal') ? document.getElementById('dm-endgoal').textContent : '', topics: document.getElementById('dm-endtopics') ? !document.getElementById('dm-endtopics').hidden : false, text: document.getElementById('dm-end').textContent }));
      r.check('the end screen gives one thing to chase', true, e1.goal.length > 8 || /in a row|best/i.test(e1.text));
      r.note('goal line: ' + e1.goal + ' | topics row shown: ' + e1.topics);
      r.check('no end screen text under 11px with the extras on', '', await smallText(pg, '#dm-end'));
      await r.shot(pg, 'end_extras');
      r.check('best today is kept', 5000, await pg.evaluate(() => __G.rk.best.get()));
      await pg.keyboard.press('Enter'); await sleep(300); await A.start(pg); await pg.evaluate(() => { __G.state().score = 4200; __G.end(); }); await sleep(600);
      r.check('a lower run is told how far it fell short', true, /800 short of your best today/.test(await pg.evaluate(() => document.getElementById('dm-end').textContent)));
      r.check('and the best stays', 5000, await pg.evaluate(() => __G.rk.best.get()));
      await pg.evaluate(() => { const k = Object.keys(localStorage).find(x => /^dm_best/.test(x)); const v = JSON.parse(localStorage.getItem(k)); v.d = '2020-1-1'; localStorage.setItem(k, JSON.stringify(v)); });
      r.check('yesterday\'s best does not carry over', 0, await pg.evaluate(() => __G.rk.best.get()));
      await pg.context().close();
    } },

    /* the math rule on the stand-in game: six bots, whole 30 second runs, real keys */
    ...mathRule({
      open: pg => A.open(pg, 'mult', 'pixel', '&secs=30'),
      start: pg => A.start(pg),
      peek: pg => pg.evaluate(() => { const S = __G.state(), up = __G.card.isOpen() && !!S.q;
        return { over: !!S.over, score: S.score, t: __G.cfg.secs - S.left,
          card: { open: up, done: !!S.qDone, right: S.q ? S.q.choices.findIndex(c => c.ok) : -1, n: S.q ? S.q.choices.length : 0, id: S.answered - (S.qDone ? 1 : 0) }, correct: S.correct,
          pick: __G.pick.isOpen() ? 2 : false }; }),   /* a player who earns a pick takes Double points */
      /* normal play: go for the lowest gem, step aside from a rock about to land */
      async drive(pg) {
        const dir = await pg.evaluate(() => { const x = __G.ship().x, rock = __G.rocks().find(r => r.y > 300 && r.y < 500 && Math.abs(r.x - x) < 60);
          if (rock) return rock.x >= x ? (x > 80 ? -1 : 1) : (x < 880 ? 1 : -1);
          const g = __G.gems().filter(g => g.y < 470).sort((a, b) => b.y - a.y)[0]; return !g || Math.abs(g.x - x) < 14 ? 0 : g.x > x ? 1 : -1; });
        if (dir !== pg.__dir) { if (pg.__dir) await pg.keyboard.up(pg.__dir > 0 ? 'ArrowRight' : 'ArrowLeft'); if (dir) await pg.keyboard.down(dir > 0 ? 'ArrowRight' : 'ArrowLeft'); pg.__dir = dir; }
        await sleep(70);
      },
      async release(pg) { if (pg.__dir) await pg.keyboard.up(pg.__dir > 0 ? 'ArrowRight' : 'ArrowLeft'); pg.__dir = 0; },
      moments: { min: 2, max: 9, gap: 2 }, cap: 150, idleSecs: 45,
    }),
  ],
};
/* while building: QA_ONLY=pause node tools/qa/run.js remake_kit runs only the scenarios with that word in the name */
if (process.env.QA_ONLY) A.scenarios = A.scenarios.filter(s => s.name.includes(process.env.QA_ONLY));
module.exports = A;
