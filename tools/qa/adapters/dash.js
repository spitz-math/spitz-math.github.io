/* Dash adapter (tier 1, built with _shared.js). Real input: Up starts a dash (the runner then runs by itself).
   Number keys answer, two taps on Play again restart. Added 2026-11-23 in the Arcade-wide bug check. */
const { sleep } = require('../lib/harness');
const { make } = require('./_shared');

module.exports = make({
  clear: true,
  id: 'dash', pre: 'ds', endBy: 'clock',
  extra: ['level', 'flags', 'cleared', 'coinTotal'],
  watch: ['tries', 'G.player.x'],
  act: async pg => { await pg.keyboard.press('ArrowUp'); await sleep(450); },
  acted: (a, b) => b.tries > a.tries,
  unsupported: { movement: 'the runner moves by itself once a dash starts; keys jump, they do not steer' },
  actName: 'Up starts a dash',
});
