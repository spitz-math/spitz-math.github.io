/* Brawl Buds adapter (tier 1, built with _shared.js). Starts in the corner (pit): questions first, then the round.
   Number keys answer, two taps on Play again restart. Added 2026-11-23 in the Arcade-wide bug check. */
const { sleep } = require('../lib/harness');
const { make } = require('./_shared');

module.exports = make({
  id: 'brawl_buds', pre: 'bb', endBy: 'end',
  go: 'bb-go-start',
  extra: ['round', 'buds', 'rivals', 'supers'],
});
