/* Burger Shop adapter (tier 1, built with _shared.js). Real input: arrow keys pick the slot, Space drops.
   Number keys answer, two taps on Play again restart. Added 2026-11-23 in the Arcade-wide bug check. */
const { sleep } = require('../lib/harness');
const { make } = require('./_shared');

module.exports = make({
  id: 'burger_shop', pre: 'bs', endBy: 'endAt',
  extra: ['served', 'ing'],
  watch: ['sel', 'bounces'],
  intents: { right: 'ArrowRight', left: 'ArrowLeft' },
  moved: (a, b) => b.sel !== a.sel,
  act: async pg => { await pg.keyboard.press('Space'); await sleep(450); },
  acted: (a, b) => b.bounces > a.bounces || b.ing < a.ing,
  actName: 'Space drops the ingredient',
});
