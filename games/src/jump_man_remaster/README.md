# Jump Man, remastered

The live Jump Man tower (games/jump_man_multiplication.html) with the Lantern Peak climber and pixel art.
Gameplay, score key, save key, controls, shop and goals are untouched: build.py only swaps the drawing (remaster.js).

    python3 games/src/jump_man_remaster/build.py      # writes out/jump_man_multiplication.html (site candidate) and out/jump_man_remaster_mult.html (test copy)

Tests (Playwright; NODE_PATH=$(npm root -g)):
- tests/rules.js <mult copy> <outdir>   the remake's rule tests: physics, combos, springs, crumble, climbing bot, shop, reload, end screen, fps
- tests/sets.js                         every question set at 1366x768 and 1366x620 (serve the repo root on :8765, copy the site candidate to games/_jmr_test.html, delete it after)
- tests/fps.js <file>...                frame rate at 6x CPU slowdown, 1366x768 (compare with the live file)
- tests/shots.js <file> <outdir>        screenshots in each zone

Go-live (only on Kody's "push it"): copy out/jump_man_multiplication.html over games/jump_man_multiplication.html.
