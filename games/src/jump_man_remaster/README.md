# Jump Man, remastered

The live Jump Man tower (games/jump_man_multiplication.html) with the Lantern Peak climber and pixel art, and v3 rules
(Kody 2026-11-17/19): running and jumping are free and tight; a Waystone on floor 10, then every 30 ledges, freezes the
tower for exactly 3 questions (2 right teaches the next move, 3 of 3 also gives a heart; math well = a better game, never a
wall). Moves in a fixed order: Wall Kick, Double Jump, Glide, Air Dash, Triple Jump, then boosts. Visible side walls.
3 hearts and a fog that rises after the first Waystone (sinking in costs a heart, 0 hearts ends the run). No shop or cash.
build.py patches the live file; remaster.js holds the new code. Score key stays jump_man_multiplication; save ver 3.

    python3 games/src/jump_man_remaster/build.py      # writes out/jump_man_multiplication.html (site candidate) and out/jump_man_remaster_mult.html (test copy)

Tests (Playwright; NODE_PATH=$(npm root -g)):
- tests/v2.js <mult copy> <outdir>      free movement, Waystones, every move, boosts, fog and hearts, reload, climbing bot, end screen
- tests/sets.js                         every question set at 1366x768 and 1366x620 (serve the repo root on :8765, copy the site candidate to games/_jmr_test.html, delete it after)
- tests/fps.js <file>...                frame rate at 6x CPU slowdown, 1366x768 (compare with the live file)
- tests/shots.js <file> <outdir>        screenshots in each zone

Go-live (only on Kody's "push it"): copy out/jump_man_multiplication.html over games/jump_man_multiplication.html.

## v4 (2026-11-22, remake playbook pass)
Balance check first (/mnt/project-files/reviews/balance_jump_man_2026-11-22/RESULTS.md), then:
- Waystones at ledge 10, then every 40 (WAY_EVERY). Still 3 questions. Each right answer holds the fog 3 s (max 12, shown under the hearts); 2+ right teaches the next move and gives a heart back; 3 of 3 adds 300.
- After a wrong answer the explanation stays up; Next/Enter unlocks after 2 s (no auto-advance).
- Fog: starts after the first Waystone or 20 s of climbing, whichever is first; 24 -> 85 px/s; visible edge, "FOG CLOSE!" warning and a "FOG n m BELOW" readout; combos of 4+ floors hold it too.
- Rockfall: ledges 25-34, 65-74, ... rocks fall with a 0.8 s warning mark; a hit knocks you sideways and breaks the combo, never costs a heart.
- Summit Rush (last 60 s): no Waystones, fog 25% faster, combos pay double; golden lantern 40 ledges up pays 400, then one 30 higher.
- End: reward card closes, no confetti on 0 right or a fog loss, Play again waits 2 s. Shake is smooth and off with reduced motion. Save ver 4.
Tests: tests/v4.js (rules, replaces v2.js), tests/sets.js, tests/fps.js. Gameplay checks adapter: add it when the remaster replaces the live file (the adapter plays games/jump_man_multiplication.html).
