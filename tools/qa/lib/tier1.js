/* Tier 1 baseline: the same play-through for every game, driven by its adapter.
   start -> answer a question with a number key -> real keys move -> real input action ->
   game over -> end screen -> restart puts back what the first start had (adapter.resetKeys). Every step checks state through adapter.snapshot(),
   so a failure says exactly which promise broke ("hearts after restart: expected 5, got 1"). */
const { sleep } = require('./harness');

async function tier1(run, A, viewport = 'chromebook') {
  await run.test(`baseline play-through (${viewport})`, async (r) => {
    const pg = await r.page(viewport);
    await A.open(pg); await A.start(pg);
    const s0 = await A.snapshot(pg);
    r.check('run started and is playable', true, s0.started && A.playable(s0));
    await r.shot(pg, `${viewport}_1_start`);

    // a question, answered with the real number key
    if (A.openQuestion) {
      const q = await A.openQuestion(pg);
      r.check('a question opens', true, !!q && q.open);
      if (q && q.open) {
        await r.shot(pg, `${viewport}_2_question`);
        await pg.keyboard.press(String(q.right + 1)); await sleep(400);
        if (A.continueQuestion) await A.continueQuestion(pg);
        const after = await A.snapshot(pg);
        r.check('right answer is accepted', true, !!A.answeredRight(q.before, after));
      }
    }

    // movement with real keys (games where the player moves)
    if (A.intents.right) {
      const before = await A.snapshot(pg);
      await A.hold(pg, 'right', 450); await A.hold(pg, 'down', 300);
      r.check('holding real arrow keys moves the player', true, !!A.moved(before, await A.snapshot(pg)));
    }

    // the main action with real input: a key by default, or the adapter's own (a mouse drag, a click)
    if (A.act || A.intents.action) {
      const a0 = await A.snapshot(pg);
      if (A.act) await A.act(pg); else await A.press(pg, 'action');
      await sleep(250);
      r.check('the main action works (' + (A.actName || (A.intents.action === ' ' ? 'Space' : A.intents.action)) + ')', true, !!A.acted(a0, await A.snapshot(pg)));
    }

    // make the run "dirty" (coins, score, upgrades) so the restart check proves something
    if (A.dirty) { await A.dirty(pg); const d = await A.snapshot(pg); r.note('state before game over: ' + JSON.stringify(d)); }

    // game over and the end screen
    await A.forceEnd(pg);
    const end = await A.snapshot(pg);
    r.check('run ends (game over)', true, !!end.over);
    r.check('end screen shows', true, await A.endShown(pg)); await sleep(1500);
    await r.shot(pg, `${viewport}_3_end`);

    // restart resets
    await A.restart(pg);
    const fresh = await A.snapshot(pg);
    const want = {}, got = {};
    for (const k of A.resetKeys) { want[k] = s0[k]; got[k] = fresh[k]; }
    for (const k of Object.keys(want)) r.check(`after restart, ${k} is reset`, want[k], got[k]);
    r.check('after restart the run is playable again', true, !fresh.over && A.playable(fresh));
    await r.shot(pg, `${viewport}_4_restart`);
    await pg.context().close();
  });
}

module.exports = { tier1 };
