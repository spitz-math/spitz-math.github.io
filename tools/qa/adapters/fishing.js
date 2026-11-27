/* Go Fish adapter (tier 1, built with _shared.js). Real input: Space casts.
   Number keys answer, two taps on Play again restart. Added 2026-11-23 in the Arcade-wide bug check. */
const { sleep } = require('../lib/harness');
const { make } = require('./_shared');

module.exports = make({
  id: 'fishing', pre: 'fh', endBy: 'endAt',
  extra: ['fish', 'orders', 'bait'],
  watch: ['casts'],
  act: async pg => { await pg.keyboard.press('Space'); await sleep(450); },
  acted: (a, b) => b.casts > a.casts,
  actName: 'Space casts the line',
});
