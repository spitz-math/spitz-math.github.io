/* Pinball adapter (tier 1, built with _shared.js). Real input: Space launches.
   Number keys answer, two taps on Play again restart. Added 2026-11-23 in the Arcade-wide bug check. */
const { sleep } = require('../lib/harness');
const { make } = require('./_shared');

module.exports = make({
  clear: true,
  id: 'pinball', pre: 'pb', endBy: 'endAt',
  go: 'pb-go-start',
  extra: ['jackpots', 'burgers'],
  watch: ['kick'],
  act: async pg => { await pg.keyboard.press('Space'); await sleep(450); },
  acted: (a, b) => b.kick > a.kick,
  actName: 'Space launches a ball',
});
