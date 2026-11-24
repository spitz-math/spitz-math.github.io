/* Fit Check adapter (tier 1, built with _shared.js). Real input: arrow keys move between rack tabs.
   Number keys answer, two taps on Play again restart. Added 2026-11-23 in the Arcade-wide bug check. */
const { sleep } = require('../lib/harness');
const { make } = require('./_shared');

module.exports = make({
  id: 'fit_check', pre: 'fc', endBy: 'endAt',
  extra: ['gems', 'looks', 'wins'],
  watch: ['tab'],
  intents: { right: 'ArrowRight', left: 'ArrowLeft' },
  moved: (a, b) => b.tab !== a.tab,
});
