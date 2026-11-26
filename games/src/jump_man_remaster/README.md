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

## v5 (2026-11-22, Kody picked 2-4 from the follow-ups)
- End screen: "Height points" and "Bonus points" replace Best streak and Height · combo (score = height + bonus).
- Height, the Waystone/summit meter count and the ledge height marks use Inter 800: the pixel digits blurred when the canvas is scaled to a Chromebook screen.
- Pixel effects drawn in code (PixelFX-style timing, 4 px grid, at most 6 at once): wall-kick sparks, heavy-landing dust (falls faster than 1100 px/s), rock bonk star, summit burst, a stepped light beam above the summit lantern, light wisps along the fog edge. Presentation only: scripted policy scores unchanged.

## v6 (2026-11-22): game UI to match the newer games
Kody: "completely redesign the ui to align more with our more recent games." Follows the Star Swarm v14 rule (no sci-fi dashboard: no chips, boxes or mono caps labels).
- The tower sits in the middle of the 1920x1080 stage at full height. Everything you read sits on two side columns as outlined text on the sky: Time, Score, Goals (with progress bars), Turbo and Moves on the left; Height, hearts, fog, Next Waystone or Summit meter, Waystones cleared and Combo on the right. Big numbers use Spitz Digits.
- Speed: the sky behind the columns is a CSS gradient changed every 10 m, and each column is its own 352x1080 canvas that redraws only when its own numbers change (one 1920x1080 canvas halved the frame rate at 6x slowdown).
- The Waystone question opens as one game window over the tower (solid fill, light frame, dark outline) with 3 pips and 2x2 choices; the in-tower layer keeps only the zone banner, first-time hints and touch buttons.
- Start screen steps sit in one window as plain rows; end-screen stats are plain numbers.
- Gameplay unchanged: tests/v4.js and tests/sets.js pass (sets needs a 2.1 s miss wait).

## v9 (2026-11-24): harder climb, Waystones need 3 of 3
Kody: "game is currently waaaaaay too easy, dont love how we have 3 questions at the waystones but answering 2 right still give it to you."
- A Waystone teaches the next move and gives a heart back only for 3 of 3 right (+300 too). 0-2 right: "Almost!", no move. Each right answer still holds the fog 3 s and pays +20.
- Fog: 28 px/s + 0.1 per meter climbed, cap 100 (was 24 + 0.07, cap 85); it trails at most 540 px below you (was 560). After a fog hit it holds 3 s so one slip never costs two hearts.
- Rocks: a hit costs a heart but never your last one (only the fog ends a run); 2 s safe after a hit.
- Sounds: the Pixel Arcade one-shots (v8 gains) are licensed for use inside games only, so they are NOT in the repo. build.py embeds them from /mnt/project-files/studio_trials/pixel_arcade_vital/jump_man_sound_block.js (or $JMR_SOUNDS) when that file exists; otherwise the game keeps its code sounds. The end screen plays SND.over when the fog catches you.
- Scripted results (bal/kid.js middling climber that never dodges rocks, 70% right): survives about 3 runs in 8, most heart losses from rocks; all-right 8,048-8,810 vs always-wrong 1,588-3,007 (always-wrong now usually loses to the fog in the last 2 minutes).

## v10 (2026-11-24): harder platforming
Kody: "make the platforming and the jumps hard, not just the fog."
- Measured reach with no upgrades: standing jump 147 px up, half-speed run 297, full run 392.
- From ledge 10 to ledge 130 the tower ramps up: rises 110-134 px grow to 180-274 px (most need a running jump; at most 0.70 of the full-run reach), ledges shrink to 110-170 px wide, sideways gaps grow to 340 px, and more ledges move (up to 42%) or crumble (up to 32%). The first floor stays easy.
- tests/reach.js proves every gap in the first 600 ledges of 5 towers can be made from a half-speed run with no upgrades (moving ledges: you may wait for them to swing close).
- Since the jumps are now the challenge, the fog went back to v4 speed (24 px/s + 0.07 per meter, cap 85) and sits up to 700 px below you, and a rock hit is a knock again (no heart). Waystones still need 3 of 3.
- Test bots: a clumsy climber bot (running jumps, no rock dodging) at 70% right dies in about 2 minutes; the same bot at 100% right learns 4 moves and survives 1 run in 4. The tests/v4.js bot with all moves climbs 280 ledges in 4 minutes with 3 hearts.

## v11 (2026-11-24): softer jumps
Kody on v10: "those running jumps are mean lol", then picked "Soften a lot".
- Most rises are back to standing-jump height (108-138 px, standing reach 147). From ledge 10 to 140 up to 1 ledge in 5 becomes a tall one (175-220 px) that needs a running jump; floors and ledges after a crumble ledge are never tall. Narrow, far, moving and crumbling ledges from v10 stay.
- Fog: a second dip within 4 game seconds of a hit only lifts you again (no second heart), and the lift picks a steady ledge (not moving, ice, crumble or spring).
- Test bots: clumsy climber at 70% right survives 7 of 8 runs (0-2 hearts lost); all-right 7,147-7,237; always-wrong and random guessing fall to the fog (1,900-2,300); idle loses fast.

## v12 (2026-11-25, remake spec approved by Kody)
Balance check first (/mnt/project-files/reviews/balance_jump_man_v11_2026-11-26/RESULTS.md), spec doc "Jump Man remake spec", then:
- Waystones: 3 right teaches the move; after one miss a spare 4th question; two misses end it (wayDone, waySlots).
- Right answers push the fog back 180 px (FOG_PUSH) and combos 60 px per 4 floors; the push is real distance (S.drop). The fog starts and restarts after a hit 700 px below (FOG_NEAR) but may trail up to 1200 (FOG_GAP). Combo pay capped at 30 floors.
- Each stretch right after a Waystone features one ledge type (moving, springs, crumble, ice; stretchGen/stretchStep) with a banner. First 3 ledges sit near the middle; arrow over the next ledge for the first 3 jumps; a nudge after 6 s standing still.
- Fixes from the balance check: no Waystone pay after the buzzer, Play again double-click guard, 0.8 s card read lock (the __G.pick hook skips it), held arrow keys survive a Waystone, Next greyed during the lock, right-answer explanation 1.5 s, "Not this time"/"So close!", FOG! on a fog hit, kinder fog-loss line. Save ver 5.
Tests: tests/v12.js (new rules), tests/v4.js (updated for v12), tests/sets.js, tests/fps.js, tests/reach.js.

## v13 (2026-11-25, Kody's v12 play notes)
"two questions and a spare third if needed", "rocks should take out a heart", "make the fog climb faster, especially as you get closer to the end. once i had all the upgrades i was FLYING".
- WAY_NEED=2: 2 right teaches the move (+ heart, +300); a miss brings a spare 3rd; two misses end it. Save ver 6.
- Rocks cost a heart (never the last) and still knock you; Kody: "don't nerf the rocks ... falling more, especially closer to the top": every 1.15 s at the first Rockfall down to 0.6 s from ledge 265 (rockEvery), 0.8 s warning.
- Fog: speed x(1 + 0.04 per learned move) x(1 + 0.25 x lateK), lateK 0 -> 1 from 1:30 to the end; trailing room fogGap() = 1200 - 60 per move - 200 x lateK (min 600).
Tests: tests/v12.js and tests/v4.js updated for v13.
