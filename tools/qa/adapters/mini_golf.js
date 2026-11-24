/* Mini Golf adapter (tier 1, built with _shared.js). Real input: holding Space charges and putts.
   Number keys answer, two taps on Play again restart. Added 2026-11-23 in the Arcade-wide bug check. */
const { sleep } = require('../lib/harness');
const { make } = require('./_shared');

module.exports = make({
  shopKeys: true,
  id: 'mini_golf', pre: 'mg', endBy: 'endAt',
  extra: ['holes', 'putts', 'balls'],
  watch: ['strokes'],
  act: async pg => { await pg.keyboard.down('Space'); await sleep(450); await pg.keyboard.up('Space'); await sleep(200); },
  acted: (a, b) => b.strokes > a.strokes,
  unsupported: { movement: 'the ball only moves when putted (the main action)' },
  actName: 'holding Space putts',
});
