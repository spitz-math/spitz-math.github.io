/* Shift Racer adapter (tier 1, built with _shared.js). Real input: arrow keys change lanes, holding Up drives.
   Number keys answer, two taps on Play again restart. Added 2026-11-23 in the Arcade-wide bug check. */
const { sleep } = require('../lib/harness');
const { make } = require('./_shared');

module.exports = make({
  id: 'shift_racer', pre: 'rc', endBy: 'endAt',
  extra: ['races', 'escapes', 'busts'],
  watch: ['r.lane', 'G.car.v'],
  intents: { right: 'ArrowRight', left: 'ArrowLeft' },
  moved: (a, b) => b['r.lane'] !== a['r.lane'],
  act: async pg => { await pg.keyboard.down('ArrowUp'); await sleep(450); await pg.keyboard.up('ArrowUp'); },
  acted: (a, b) => b['G.car.v'] > a['G.car.v'],
  actName: 'holding Up drives the car',
});
