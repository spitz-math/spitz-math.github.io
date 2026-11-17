# Dig Buds: build and checks

The game is one hand-edited file: `games/dig_buds.html` (that file is the source; there is no bundling step).
It loads `kit.js`, `questions.js` and `scorecode.js` from `games/` like every other arcade game.

Live at the hidden address `/games/dig_buds.html`. It stays off the hub and leaderboard while
`UNLOCK` in `games/catalog.js` has `dig_buds:null`; set a date there to unlock it.

## What is here
- `build_mult.py`: writes `out/dig_buds_mult.html`, a self-contained copy that opens straight into
  multiplication facts (the test copy Kody plays from his Downloads folder). `out/` is not committed.
- `run_tests.sh`: builds, then runs the scripts in `tests/` (`bash run_tests.sh`, or `full` for the slow ones).
- `tests/`: Playwright scripts that drive the real game through its `window.__G` test hooks.

| Script | What it exercises |
| --- | --- |
| `smoke.js` | start, dig, climb, tunnel, dynamite |
| `upgrades.js` | shop fits; Drill, Ore Magnet, Lucky Pick, Ore Scanner; ore cash, crystals, Star Power |
| `allpro_bonus.js` | All-Pro mode, all six Buds, Star Bud, Bonus Buds, save and reload, end screen at 1366x620 |
| `score_code.js` | answers questions and checks the end screen shows a score code |
| `fall_jump_keys.js` | no hop when sliding along a wall, step-hop on a real step, cave fall, R hop back, H and R buttons |
| `no_webgl.js` | opens with and without WebGL; no script errors either way |
| `sets_fit.js` | every question set fits the question menu (`"cut":0`) |
| `speed.js` (full) | frame rate and dig hitch at 6x CPU slowdown |
| `music_level.js` (full) | renders the song off line and prints its loudness |
| `bot.js` (full) | plays a whole 5-minute round: `node bot.js <seed> <ms per answer> <accuracy>` |

## Honest limits
- These checks catch script errors and layout cut-offs, and print numbers to read. Most do not assert
  on the numbers, so a wrong-but-not-crashing result still needs a person to look.
- Headless Chromium draws with software WebGL. Speed numbers compare one build with another; they
  are not real Chromebook frame rates.
- Not yet wired into `tools/qa` (the shared gameplay runner). That needs an adapter plus the software
  WebGL launch flags in the shared harness.

## Rules Kody set for this game
- 5-minute rescue run. No crafting, building, torches, night or fall damage.
- Never an animated hand or a held tool.
- Every key a student needs is shown on screen during play.
- Original name, art, critters and music; never copy Minecraft.
