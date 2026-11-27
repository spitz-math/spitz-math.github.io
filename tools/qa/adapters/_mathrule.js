/* The math rule, as a ready test any game plugs into (2026-11-26, thread "Build a shared remake kit").
   Kody's rule: math is NOT fuel. Do the math well and you get a better game; get it wrong and it stings, but the game still runs.
   Six bots play whole runs with real keys, and five promises are checked:
     1. Zero right still plays      a player who misses every question keeps playing and scoring, and the run still ends properly
     2. Knowing the math wins       all-right scores more than guessing, always pressing 1, and mashing every key
     3. A miss never strands        every card closes again, and after it the game goes on (or ends on the end screen)
     4. Idle does not outscore      a player who touches nothing scores less than every bot that plays
     5. Questions at set moments    cards come as often as the game says (a count per run and a gap between them), mashing can't call more

   In a game's adapter:
     const { mathRule } = require('./_mathrule');
     scenarios: [ ...mathRule({
       open:  (pg) => A.open(pg, 'mult', '&secs=30'),      // a short round on the test box
       start: (pg) => A.start(pg),
       peek:  (pg) => pg.evaluate(() => ({                 // read only; called many times a second
         over, score,                                      //   the run ended; the score so far
         t,                                                //   seconds of PLAY so far (must stand still while a card is up)
         card: { open, done, right, n, id },               //   a question is up; it is answered; index of the right choice; choices; a number that changes per question
         pick: false,                                      //   false, or the number (from 0) of a choice the bot may take when a pick window is up
         correct })),                                      //   optional: right answers so far, as the game counts them (checked against the bot's own count)
       drive: async (pg) => { ... },                       // ONE short step of normal play with real keys (about 100 ms), the same for every bot
       release: async (pg) => { ... },                     // let go of every key (called before a card is answered and at the end)
       moments: { min: 2, max: 8, gap: 3 },                // cards in one all-right run, and the least play seconds between two cards
       cap: 150,                                           // seconds before a run counts as stuck
     }) ]
   Optional: goOn (key that moves a card on, default 'Space'), runs (how many runs of each bot to average, default 2; always-wrong and idle run once),
   margin (all-right must beat the others by this factor, default 1.1), bots (which to run), together (runs side by side, default 5).
   While building: MATHRULE_BOTS=mash,mash,ace node tools/qa/run.js <game> runs just those bots.
   Hooks never answer for a bot: every answer is a real number key. */
const { sleep } = require('../lib/harness');

const BOTS = {
  ace:   { label: 'all right',      plays: true,  pick: (c) => c.right },
  wrong: { label: 'always wrong',   plays: true,  pick: (c) => (c.right + 1) % c.n },
  guess: { label: 'guessing',       plays: true,  pick: (c) => Math.floor(Math.random() * c.n) },
  one:   { label: 'always 1',       plays: true,  pick: () => 0 },
  mash:  { label: 'mashing',        plays: true,  mash: true },
  idle:  { label: 'idle',           plays: false },
};
const MASH = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Space', 'Enter', 'Digit2', 'Digit3'];

/* one bot, one whole run. Returns what happened, for the promises to read. */
async function runBot(pg, G, name) {
  const bot = BOTS[name], cap = (G.cap || 150) * 1000, t0 = Date.now(), goOn = G.goOn || 'Space', isPick = s => s.pick !== false && s.pick != null;
  const out = { bot: name, score: 0, over: false, cards: [], asked: 0, right: 0, stuck: '', playT: 0, secs: 0 };
  let cur = null, lastId = null, answeredId = null, lastChange = Date.now(), lastT = -1, k = 0;
  await G.open(pg); await G.start(pg);
  while (Date.now() - t0 < cap) {
    const s = await G.peek(pg); out.score = s.score; out.playT = s.t; if (s.correct != null) out.counted = s.correct;
    if (s.t !== lastT || s.over) { lastT = s.t; lastChange = Date.now(); }
    if (s.over) { out.over = true; break; }
    const up = s.card && s.card.open;
    if (up && !cur) { cur = { at: s.t, score: s.score, opened: Date.now(), asked: 0, right: 0 }; out.cards.push(cur); if (G.release) await G.release(pg); }
    if (!up && !isPick(s) && cur) { cur.held = (Date.now() - cur.opened) / 1000; cur.closed = true; cur = null; }
    if (up && s.card.id !== lastId) { lastId = s.card.id; lastChange = Date.now(); }
    if (!bot.plays) { await sleep(250); if (Date.now() - t0 > (G.idleSecs || 45) * 1000) break; continue; }
    if (bot.mash) {   /* no reading: number keys, Space and Enter as fast as a student can, and still steering */
      if (up || isPick(s)) { await pg.keyboard.press(MASH[k++ % MASH.length]); await sleep(70);
        if (up && s.card.done && answeredId !== s.card.id) { answeredId = s.card.id; cur.asked++; out.asked++; } }
      else await G.drive(pg);
      continue;
    }
    if (up && !s.card.done) { if (answeredId === s.card.id) { await sleep(60); continue; }
      await sleep(330);   /* cards ignore keys for a moment after opening, so a held key can't answer */
      const c = (await G.peek(pg)).card; if (!c || !c.open || c.done || c.id !== s.card.id) continue;
      const i = bot.pick(c); await pg.keyboard.press('Digit' + (i + 1)); await sleep(90);
      const after = (await G.peek(pg)).card;
      if (after && after.done) { answeredId = c.id; cur.asked++; out.asked++; if (i === c.right) { cur.right++; out.right++; } }
    } else if (up && s.card.done) { await pg.keyboard.press(goOn); await sleep(120); }
    else if (isPick(s)) { await sleep(450); await pg.keyboard.press('Digit' + ((+s.pick || 0) + 1)); await sleep(120); }
    else await G.drive(pg);
    if (Date.now() - lastChange > 15000) { out.stuck = up ? 'a question stayed up for 15 s with the bot answering' : isPick(s) ? 'a pick stayed up for 15 s' : 'the play clock stood still for 15 s'; break; }
  }
  if (G.release) await G.release(pg).catch(() => {});
  out.secs = Math.round((Date.now() - t0) / 1000); if (cur) cur.closed = false;
  return out;
}

const avg = a => a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : 0;

/* the scenarios to spread into an adapter's list */
function mathRule(G) {
  const runs = G.runs || 2, margin = G.margin || 1.1, M = G.moments || {};
  const plan = (process.env.MATHRULE_BOTS ? process.env.MATHRULE_BOTS.split(',') : G.bots || ['ace', 'guess', 'wrong', 'one', 'mash', 'idle']).flatMap(b => (BOTS[b].plays && b !== 'wrong' && !process.env.MATHRULE_BOTS) ? Array(runs).fill(b) : [b]);   /* the bots with luck in them run more than once and are averaged */
  return [{ name: 'math rule: math is not fuel, and knowing it makes the game better (six bots, five promises)', async run(r) {
    const res = [];
    for (let i = 0; i < plan.length; i += (G.together || 5)) {   /* a few runs side by side, each in its own window */
      res.push(...await Promise.all(plan.slice(i, i + (G.together || 5)).map(async b => { const pg = await r.page('chromebook'); try { return await runBot(pg, G, b); } finally { await pg.context().close().catch(() => {}); } })));
    }
    const by = b => res.filter(x => x.bot === b), sc = b => avg(by(b).map(x => x.score)), has = b => by(b).length > 0;
    res.forEach(x => r.note(`${BOTS[x.bot].label}: score ${x.score}, ${BOTS[x.bot].mash && x.counted != null ? x.counted : x.right} of ${x.asked} right on ${x.cards.length} cards, ${Math.round(x.playT)} s of play, ${x.over ? 'reached the end screen' : 'did not finish'} in ${x.secs} s${x.stuck ? ', STUCK: ' + x.stuck : ''}`));
    const players = res.filter(x => BOTS[x.bot].plays);
    const off = players.filter(x => !BOTS[x.bot].mash && x.counted != null && x.counted !== x.right).map(x => `${BOTS[x.bot].label}: bot ${x.right}, game ${x.counted}`);
    r.check('the game counted the same right answers the bots gave', '', off.join('; '));
    r.check('no bot got stuck', '', players.filter(x => x.stuck).map(x => BOTS[x.bot].label + ': ' + x.stuck).join('; '));

    if (has('wrong')) { const w = by('wrong')[0], first = w.cards[0];
      r.check('1. zero right still plays: the always-wrong player was asked questions and got none right', true, w.asked >= 1 && w.right === 0);
      r.check('1. zero right still plays: it kept scoring after its first missed card', true, !!first && w.score > first.score);
      r.check('1. zero right still plays: its run ended on the end screen, not a dead end', true, w.over); }

    if (has('ace')) { const a = sc('ace');
      for (const b of ['guess', 'one', 'mash', 'wrong']) if (has(b))
        r.check(`2. knowing the math wins: all right (${a}) beats ${BOTS[b].label} (${sc(b)}) by ${Math.round((margin - 1) * 100)}% or more`, true, a >= sc(b) * margin && a > sc(b)); }

    const open = players.flatMap(x => x.cards.filter(c => c.closed === false && !x.over).map(() => BOTS[x.bot].label));
    r.check('3. a miss never strands: every card closed again', '', open.join(', '));
    const slow = players.filter(x => !x.bot.match(/mash/)).flatMap(x => x.cards.filter(c => c.closed && c.held > (G.maxHold || 14)).map(c => `${BOTS[x.bot].label} ${Math.round(c.held)} s`));
    r.check(`3. a miss never strands: no card held a player longer than ${G.maxHold || 14} s`, '', slow.join(', '));
    r.check('3. a miss never strands: every playing bot reached the end screen', '', players.filter(x => !x.over).map(x => BOTS[x.bot].label).join(', '));

    if (has('idle')) { const idle = sc('idle'), low = players.reduce((m, x) => Math.min(m, x.score), Infinity);
      r.check(`4. idle does not outscore: touching nothing (${idle}) scores less than every bot that plays (lowest ${low})`, true, idle < low); }

    if (has('ace') && M.max) { const n = by('ace').map(x => x.cards.length), gaps = players.flatMap(x => x.cards.slice(1).map((c, i) => c.at - x.cards[i].at));
      r.check(`5. questions at set moments: ${M.min} to ${M.max} cards in an all-right run`, true, n.every(v => v >= M.min && v <= M.max) ? true : 'cards: ' + n.join(', '));
      if (M.gap) r.check(`5. questions at set moments: at least ${M.gap} s of play between two cards, for every bot`, true, gaps.every(g => g >= M.gap) ? true : 'shortest gap ' + Math.min(...gaps).toFixed(1) + ' s');
      if (has('mash')) r.check('5. questions at set moments: mashing keys does not call up extra cards', true, by('mash')[0].cards.length <= M.max ? true : by('mash')[0].cards.length + ' cards'); }
  } }];
}

module.exports = { mathRule, runBot, BOTS };
