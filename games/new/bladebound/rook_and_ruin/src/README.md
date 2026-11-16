# Rook & Ruin source (the one true copy)

This folder holds everything needed to rebuild and test the game. Edit these files directly.

**Git is now the source of truth** (added Nov 16, 2026). Before this, the only copy lived in the Claude project files
(`games/new/bladebound/rook_and_ruin/src/`), with no history. From here on:
- Pull `main` first, edit here, commit on a branch, open a pull request. Every thread works from git, not from project files.
- Nothing goes live until Kody says "push it".
- To update the play-test page: `python3 build.py`, then copy `out/site_playtest.html` to `games/rook_and_ruin.html`
  (the audio already lives in `games/audio/rook_and_ruin/`).
- Git keeps one copy of the big binary files: the music and effects (.ogg) come from `games/audio/rook_and_ruin/`
  and the two fonts from `fonts/files/`. `build.py` uses local `audio/rook_and_ruin/` and `fonts/` folders instead when they exist
  (the older project-files copy has them). To change a sound, change it in `games/audio/rook_and_ruin/`.
- `out/` is build output and is not committed.

The old patch scripts and the src_v4 to src_v20 snapshots are retired in `../../_archive/`.

## Build
`python3 build.py` writes to `out/`:
- `rook_and_ruin.html` is the site copy (loads kit.js, questions.js, scorecode.js from beside it).
- `rook_and_ruin_fonts.html` is the same with fonts embedded (what the tests use).
- `site_playtest.html` is the hidden play-test page (goes to games/rook_and_ruin.html in the repo).
- `rook_and_ruin_mult.html` is the offline test copy that opens straight into multiplication.

## Test
`bash run_tests.sh` builds, then runs the quick suite (needs Playwright, about 4 minutes).
`bash run_tests.sh full` adds speed at 6x CPU slowdown, 3 runs back to back, and 3 full bot runs.
`bash run_tests.sh stress` adds 24 full bot runs (builds, skill levels, question sets, reloads every few seconds), about 25 minutes.
Every test must print `errors []`. There are 18 in the quick suite. Screenshots land in `out/tour/`.

| Test | Checks |
|---|---|
| t9 | revive, defeat, restart, ending can't be skipped, roll and swing |
| t_rapid | key mashing, restarts mid-cutscene |
| t_chest | level-up first, then the chest; a chest under Rook's feet opens by itself after a beat (nobody gets stuck) |
| t_v17b | shop prices, armor, reload in the middle of a doorway |
| t_endskip | ending scene ignores Space |
| t_q21 | merchant's deal (2 questions), chest question, Siege rally, reload mid-question |
| t_up18 | slash plays windup, slash, follow-through, recover in every direction |
| t_art14 | Nov 14 art: a real swing in all 4 directions in frame order, merchant waves/idles/nods, shop pedestals, all 26 power icons present and distinct (screenshots art14_*.png) |
| t_pots | pots in every room but the Shop (count, clear of walls and doors), solid to Rook, sword and roll smash them, coins before the Shop, hearts only after it |
| t_lsw | Last Stand Wardens |
| t_layout | layout at desktop, tablet, phone and short screens |
| t_final | Warden-fight levels are paid out before the Last Stand; long builds fit the panel; a held number key answers once |
| t_golive | with the save key registered in scorecode.js: answers reach Class Stats, missed questions come back, 20-minute expiry |
| t_sets | all 17 question sets fit the question panel at 1366x620 |
| t_perf (full) | fps at 6x CPU slowdown: Siege 41 to 52, Last Stand with a maxed storm build 24 to 30 |
| t_soak (full) | 3 runs back to back with reduce-motion on: memory flat, each run starts clean |
| t7 + bot2 (full) | full bot run |
| stress + stress_batch + stress_report (stress) | 24 bot runs; flags stuck runs, NaN, out-of-room, lost progress on reload |
| t_audio | the audio pack: every track by game state, Last Stand sync, effects, sliders, mute, site fetch, music fetched ahead, failed downloads retried, hidden tab silent, pause screen clears toasts, #sound screen |
| sweep | not a test: `node tests/sweep.js` takes a screenshot of every room and screen at 1366x768 and 1366x620 into out/sweep/ (run build.py first) |

## Files
| File | What's in it |
|---|---|
| head.html, digits.css | page, CSS, panels; Spitz Digits font |
| head_part.js | setup, state, synth sounds (fallback), test hooks start |
| audio_part.js | the audio pack: file music by game state, Last Stand track synced to the timer, 46 file effects, volume sliders, #sound test screen |
| audio/ | CREDITS.md, licences and the Warden voice scripts (the .ogg files live in games/audio/rook_and_ruin/ in git). Source pack: rook_ruin_audio_final (Nov 15) |
| rr.js | sprite-sheet hero/enemy drawing (RRART), intro and ending scenes, full-screen intro |
| body_part.js | rooms (ROOMS), enemies, powers (UP, SYN), questions (openAsk, ASKTXT), shop, HUD, save/load |
| rr_art.js | the ChatGPT sprite sheets (made by art/v17_pack/bundle17.py; the Nov 14 drop's Rook slash, merchant, shop items and power icons by art/nov14_pack/bundle_nov14.py; the title background RRTITLE by art/title_pack/bundle_title.py) |
| head.html title frames | the gold pixel frames of the title panel are written by art/title_pack/frames.py between the TITLE FRAMES markers |
| rooms_art.js | room pictures |
| sprites.js, options.js, v3.js, v4.js, keep.js | older pixel maps the game still loads (icons, fallback drawing) |
| kit.js, questions.js, scorecode.js | copies of the site's shared files |

## Playtest handoff pass (v46, 2026-11-15, Kody approved)
- Starter relic is dealt as Rook walks into the Entry Hall (dealStarter, w.starter), shown in a banner after the controls banner; no accept screen. The Entry Hall's first level costs 7 gems (was 5) so the free starter doesn't add a power.
- Reward flow: earned upgrades chain straight from one pick to the next (no arena in between); the 0.5 s input gate still applies to each screen.
- Perfect math (2 of 2): one card is guaranteed gold (+2 levels), marked "Perfect math"; the other cards keep the 1 in 5 gold chance.
- Cards lead with INFO.how (what it does) and INFO.use (Automatic / Hold attack / After dodge / Defensive). One synergy row per card: ✓ only for powers you own, "This card" for the half the card supplies, and "unlocks X as your next / a future upgrade choice" (next only when cardsFor will really offer it next).
- Shop: E buys (fresh press after stepping up; Space always attacks). The merchant's bubble (say(), drawBubble()) says one short line on walking in, first look, a buy, not enough coins, heading out; cooldowns, no repeats.
- Crossroads opens with one shield knight alone (SHIELD KNIGHT banner); the mixed waves wait until he falls (25 s cap). BLOCKED shows at most every 0.9 s per knight; "Open: strike!" while he recovers.
- Warden: first attack is always one slow charge (1.25 s warning) so the wall stun can be learned; swipe and chained-charge warnings raised to 0.7 s × phase speed (were 0.6 and 0.55). Enrage reinforcements get longer spawn marks; banner says "Reinforcements incoming!".
- Last Stand: a bat swarm never lands within 7 s of a Warden arriving, no rubble in the 3 s after one lands.
- Win vs escape: beating the Warden is the win (w.won set at his death); the Last Stand is the bonus escape. Results show Iron Warden, Last Stand, Time (total session · combat) and one tip from what landed the last hit (w.hitBy, TIPS).
- No blinking: Rook stays drawn while he can't be hurt; a steady light ring at his feet shrinks with the safe time (invRing). Riposte glow and dropped hearts no longer pulse or blink.
- Shift+R box restyled to the square plum panel and gold button (CSS at the end of head.html). HUD timer is labelled Combat time. Title no longer states a run length (Kody: some kids go faster).

## Where questions happen (18 to 22 in a full run)
- Level-up after each room: 2 questions (1 right = 3 cards, 2 right = one guaranteed gold card).
- Chests (vault, arena, secret): 1 question, right = bonus coins and better treasure odds.
- Shop on arrival: the merchant's deal, 2 questions, +6 coins each right. Buying is E.
- Siege Hall halfway: Rally, 1 question, right = +1 heart (armor if full).
- After the Warden falls: levels banked in that fight are paid out (2 questions) before the Last Stand.
- Knocked out once: 1 question to get back up.
- Second Wind (shop, 30 coins, one per run, Kody 2026-11-15): a second knock-out also gets the revive question. A cyan heart shows after the hearts while it is in hand.

Last Stand tuning (Kody 2026-11-15, "a tiny bit easier"): the horde ramp runs 10% slower and stops at 1:30 (LSCAP), a fallen Warden is replaced after 12 s (was 10). Bots that reach it now last about 89 s on average (was about 77).

## Go-live checklist (needs Kody's "push it")
- scorecode.js: add `rook_and_ruin:'bladebound_v3'` to the save-key list (turns on Class Stats answer logging, missed questions coming back, and the 20-minute expiry; tests/t_golive.js proves it works), and register the game id in GAMES; then change `'starter'` in SpitzCode.show to that id.
- catalog.js card (art/rook_and_ruin.webp), tab emoji, unlock date.
- Use out/rook_and_ruin.html (no noindex) instead of out/site_playtest.html.
- Upload out/audio/rook_and_ruin/ to the repo as games/audio/rook_and_ruin/ (the site build fetches the music and effects from there). The _mult copy carries them inside.

## Audio
Music: title_loop (title + intro), battle_loop (every regular room; Kody: no dungeon track), shop_loop, boss_metal_loop, last_stand_metal_2min (synced to the 2:00 timer), victory/defeat stings. Alternates (boss_loop, last_stand_loop, last_stand_metal_loop, harp dungeon) need Kody's OK. Music 0.5, effects 0.8 times the pause-screen sliders (localStorage rook_and_ruin_audio). Sound test: add #sound to the link. tests/t_audio.js.

Loading (2026-11-15 release pass): effects load on the first click or key; the music files are fetched ahead one at a time (compressed bytes only) so each room's track starts at once. A download that fails is retried up to 3 times, 4 s apart, before the name is marked bad; missing effects fall back to the synth. A hidden tab suspends the audio (the game already pauses there).

## Rules
Save key `bladebound_v3`, score id `starter` until go-live, prefix `dn`. Goblin is the rust-orange, gold-eyed, fangless one. Ending scene is not skippable (Kody's call).

## Playtest fixes (v49, 2026-11-15)
- Locked exits show a small iron `padlock()` instead of a red square; doors that are not exits show nothing.
- Warden laugh: the original file re-mastered about 11 dB louder (-20 LUFS). A synthesised replacement was rejected as clicky; a real one is waiting on Kody's generated audio.
- Whirlwind: `spinTrail()` draws an even ring that trails the blade, leading edge on the body's angle.
- Pickups: gems/coins home in from 110 px (was 70); hearts from 170 px when hurt, and on room clear.
- Dodge hint is X (K and right-click too). Shift still works but is never named (Windows Sticky Keys).
- Last Stand: the clock follows the music (`auLSPos`); music only seeks on a jump over 1.5 s. Hit-stop used to cut the track several times a second. Test: t_audio `lsNoCutsUnderHitstop`.
- Last Stand timer and Warden health moved to the page top bar (`#dn-ls`, `lsTop()`); the canvas plates are gone in the Last Stand.
- LITE mode: under ~33 fps for 3 s of play, debris particles stop and the Last Stand horde caps at 60 (was 90). `?fps` or `#fps` shows the frame rate.

## Top bar readouts (v50, 2026-11-15, Kody: "push that clutter into the top bar throughout the game")
- `lsTop()` drives the top bar: room chip (`#dn-roomchip`, "Room N of 8" + name; hidden in the Last Stand and while the Warden bar shows),
  timer (`#dn-goal`: Siege "Hold the gate" or "Last Stand"), Warden health (`#dn-lsw`, with stunned/enraged).
- The canvas no longer draws the room plate, the boss plate or the timer plates. The combo moved up into the freed top-right corner; the map stays.

## Movement pass (v53, 2026-11-15, Kody's playtest: "too slow, pinballed by blocking mobs")
- Moving while attacking: 85% speed (was 55%). Base speed 180 (was 165). Fleet Boots unchanged (+12%/level).
- Shield knights still block from the front, but the push back on Rook is 70 (was 220) and only once per knight per 0.9 s (with the BLOCKED text).
