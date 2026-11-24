/* Paint Royale adapter (tier 1, built with _shared.js). Real input: arrow keys move your Bud.
   Number keys answer, two taps on Play again restart. Added 2026-11-23 in the Arcade-wide bug check. */
const { sleep } = require('../lib/harness');
const { make } = require('./_shared');

module.exports = make({
  id: 'paint_royale', pre: 'pr', endBy: 'endAt',
  extra: ['splats', 'wins', 'matches'],
  watch: ['G.me.x'],
  intents: { right: 'ArrowRight', left: 'ArrowLeft', up: 'ArrowUp', down: 'ArrowDown' },
  moved: (a, b) => b['G.me.x'] !== a['G.me.x'],
});
