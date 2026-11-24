/* Hill Climb adapter (tier 1, built with _shared.js). Starts at the gas station: questions first, then the drive.
   Number keys answer, two taps on Play again restart. Added 2026-11-23 in the Arcade-wide bug check. */
const { sleep } = require('../lib/harness');
const { make } = require('./_shared');

module.exports = make({
  id: 'hill_climb', pre: 'hc', endBy: 'clock',
  go: 'hc-go-start',
  extra: ['gas', 'crashes'],
});
