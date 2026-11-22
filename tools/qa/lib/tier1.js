/* Tier 1 baseline: the same play-through for every game, driven by its adapter.
   start -> answer a question with a number key -> real keys move -> real input action ->
   game over -> end screen -> restart puts back what the first start had (adapter.resetKeys). Every step checks state through adapter.snapshot(),
   so a failure says exactly which promise broke ("hearts after restart: expected 5, got 1").
   Every capability ends up in the coverage table as pass, fail, unsupported (the adapter says the game has no such thing, and why)
   or unimplemented (nothing tests it yet). A missing adapter part is never a silent pass. */
const { sleep } = require('./harness');

const CAPS = ['start', 'question', 'movement', 'action', 'game over', 'end screen', 'restart resets'];

/* Poll a snapshot until ok(snapshot) is true or ms pass; returns the last snapshot. Avoids fixed waits that flake on slow runners. */
async function settle(A, pg, ok, ms = 3000) {
  const t0 = Date.now(); let s = await A.snapshot(pg);
  while (!ok(s) && Date.now() - t0 < ms) { await sleep(100); s = await A.snapshot(pg); }
  return s;
}

/* Is this capability tested? 'unsupported' needs a reason in adapter.unsupported; anything else missing is 'unimplemented'. */
function skip(r, A, cap, missing) {
  const why = (A.unsupported || {})[cap];
  if (why) r.cover(cap, 'unsupported', why); else r.cover(cap, 'unimplemented', 'adapter has no ' + missing);
}
const press = (pg, A, intent) => A.press ? A.press(pg, intent) : pg.keyboard.press(A.intents[intent] === ' ' ? 'Space' : A.intents[intent]);
const hold = async (pg, A, intent, ms) => { if (A.hold) return A.hold(pg, intent, ms);
  const k = A.intents[intent]; await pg.keyboard.down(k); await sleep(ms); await pg.keyboard.up(k); await sleep(60); };

async function tier1(run, A, viewport = 'chromebook') {
  await run.test(`baseline play-through (${viewport})`, async (r) => {
    const pg = await r.page(viewport);
    r.cap('start');
    await A.open(pg); await A.start(pg);
    const s0 = await A.snapshot(pg);
    r.check('run started and is playable', true, s0.started && A.playable(s0));
    await r.shot(pg, `${viewport}_1_start`);

    // a question, answered with the real number key. The answer is checked as soon as it counts (some games move on by themselves),
    // and again after the adapter's "continue" step for games that only count it then.
    if (A.openQuestion && A.answeredRight) {
      r.cap('question');
      const q = await A.openQuestion(pg);
      r.check('a question opens', true, !!q && q.open);
      if (q && q.open) {
        await r.shot(pg, `${viewport}_2_question`);
        if (A.answer) await A.answer(pg, q); else await pg.keyboard.press('Digit' + (q.right + 1));
        let after = await settle(A, pg, s => A.answeredRight(q.before, s), 1500);
        const early = !!A.answeredRight(q.before, after);
        if (A.continueQuestion) await A.continueQuestion(pg);
        if (!early) after = await settle(A, pg, s => A.answeredRight(q.before, s));
        r.check('right answer is accepted', true, !!A.answeredRight(q.before, after));
      }
    } else skip(r, A, 'question', 'openQuestion/answeredRight');

    // movement with real keys (games where the player moves)
    if (A.intents && A.intents.right && A.moved) {
      r.cap('movement');
      const before = await A.snapshot(pg);
      await hold(pg, A, 'right', 450); if (A.intents.down) await hold(pg, A, 'down', 300);
      r.check('holding real arrow keys moves the player', true, !!A.moved(before, await A.snapshot(pg)));
    } else skip(r, A, 'movement', 'intents.right/moved');

    // the main action with real input: a key by default, or the adapter's own (a mouse drag, a click)
    if ((A.act || (A.intents && A.intents.action)) && A.acted) {
      r.cap('action');
      const a0 = await A.snapshot(pg);
      if (A.act) await A.act(pg); else await press(pg, A, 'action');
      const a1 = await settle(A, pg, s => A.acted(a0, s));
      r.check('the main action works (' + (A.actName || (A.intents.action === ' ' ? 'Space' : A.intents.action)) + ')', true, !!A.acted(a0, a1));
    } else skip(r, A, 'action', 'act/intents.action/acted');

    // make the run "dirty" (coins, score, upgrades) so the restart check proves something
    if (A.dirty) { await A.dirty(pg); const d = await A.snapshot(pg); r.note('state before game over: ' + JSON.stringify(d)); }

    // game over and the end screen
    r.cap('game over');
    await A.forceEnd(pg);
    const end = await A.snapshot(pg);
    r.check('run ends (game over)', true, !!end.over);
    r.cap('end screen');
    r.check('end screen shows', true, await A.endShown(pg)); await sleep(1500);
    await r.shot(pg, `${viewport}_3_end`);

    // restart resets: with no dirty() step or no resetKeys the check would prove nothing, so it fails instead of passing
    r.cap('restart resets');
    await A.restart(pg);
    const fresh = await A.snapshot(pg);
    r.check('adapter lists values that Play again must reset', true, Array.isArray(A.resetKeys) && A.resetKeys.length > 0);
    r.check('adapter changes the run before game over (dirty), so the reset proves something', true, typeof A.dirty === 'function');
    for (const k of A.resetKeys || []) r.check(`after restart, ${k} is reset`, s0[k], fresh[k]);
    r.check('after restart the run is playable again', true, !fresh.over && A.playable(fresh));
    await r.shot(pg, `${viewport}_4_restart`);
    await pg.context().close();
  });
}

module.exports = { tier1, CAPS };
