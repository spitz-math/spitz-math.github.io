# Jump Man, remastered

The live Jump Man tower (games/jump_man_multiplication.html) with the Lantern Peak climber and pixel art, and v2 rules
(Kody 2026-11-17): running and jumping are free; a Waystone on every full floor freezes the tower for 3 right answers and
then gives a fixed reward (Double Jump, Wall Kick, Glide, Air Dash, Triple Jump, then boosts); 3 hearts and a fog that
rises after the first Waystone (sinking in costs a heart, 0 hearts ends the run). No shop or cash. build.py patches the
live file; remaster.js holds the new code. Score key stays jump_man_multiplication; save ver 3.

    python3 games/src/jump_man_remaster/build.py      # writes out/jump_man_multiplication.html (site candidate) and out/jump_man_remaster_mult.html (test copy)

Tests (Playwright; NODE_PATH=$(npm root -g)):
- tests/v2.js <mult copy> <outdir>      free movement, Waystones, every move, boosts, fog and hearts, reload, climbing bot, end screen
- tests/sets.js                         every question set at 1366x768 and 1366x620 (serve the repo root on :8765, copy the site candidate to games/_jmr_test.html, delete it after)
- tests/fps.js <file>...                frame rate at 6x CPU slowdown, 1366x768 (compare with the live file)
- tests/shots.js <file> <outdir>        screenshots in each zone

Go-live (only on Kody's "push it"): copy out/jump_man_multiplication.html over games/jump_man_multiplication.html.
