/* Skate adapter (tier 1, built with _shared.js). Real input: Up drops in for a line.
   Number keys answer, two taps on Play again restart. Added 2026-11-23 in the Arcade-wide bug check. */
const { sleep } = require('../lib/harness');
const { make } = require('./_shared');

module.exports = make({
  clear: true,
  id: 'skate', pre: 'sk', endBy: 'end',
  extra: ['lines', 'tricks', 'goals'],
  watch: ['drops'],
  act: async pg => { await pg.keyboard.press('ArrowUp'); await sleep(450); },
  acted: (a, b) => b.drops > a.drops,
  unsupported: { movement: 'the skater rolls by itself; keys do tricks, they do not steer' },
  actName: 'Up drops in',
});
