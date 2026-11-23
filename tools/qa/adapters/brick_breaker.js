/* Brick Breaker adapter (tier 1, built with _shared.js). Real input: arrow keys move the paddle, Up launches.
   Number keys answer, two taps on Play again restart. Added 2026-11-23 in the Arcade-wide bug check. */
const { sleep } = require('../lib/harness');   // used by act()
const { make } = require('./_shared');

module.exports = make({
  id: 'brick_breaker', pre: 'bb', endBy: 'endAt',
  extra: ['level', 'bricks', 'bosses'],
  watch: ['G.paddle.x', 'freeLaunch'],
  intents: { right: 'ArrowRight', left: 'ArrowLeft' },
  moved: (a, b) => b['G.paddle.x'] !== a['G.paddle.x'],
  act: async pg => { await pg.keyboard.press('ArrowUp'); await sleep(300); },
  acted: (a, b) => a.freeLaunch && !b.freeLaunch,
  actName: 'Up launches the ball',
});
