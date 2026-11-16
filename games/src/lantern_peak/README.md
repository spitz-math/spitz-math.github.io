# Lantern Peak (working title): Jump Man rebuilt as a climbing platformer

Vertical slice: Pinewood Steps → the first Waystone (questions) → Cloud Hop → Falls Cliffs → Falls Lookout.
The live `games/jump_man_multiplication.html` is untouched; nothing here is on the site until Kody says "push it".

## Files
| file | what |
|---|---|
| `head.html` | page shell: CSS, HUD, Waystone card, start / pause / end screens (fonts go in at `<!--FONTS-->`) |
| `physics.js` | movement (pure functions, shared with the route checker) |
| `level.js` | the climb: ledges, lifts, cracked planks, thorns, lanterns, embers, Star Feathers, signs, the Waystone and gate |
| `art.js` | code-drawn ledges, pickups, Waystone, gate and scenery (scenery is drawn at half resolution for the pixel look) |
| `art/` | the approved ChatGPT source PNGs (hero sheet, Pinewood backdrop) and `make_art.py`, which writes `art_data.js` |
| `art_data.js` | generated: the hero sprite strip and backdrop as data URLs |
| `game.js` | the game: input guard, Waystone flow, camera, sound, music, save, HUD, test hooks (`window.__G`) |
| `build.py` | writes `out/` (see below) |
| `tests/routes.js` | route checker |
| `tests/play.js` | Playwright play test |
| `DESIGN.md` | concept, math cadence, art direction, asset list, what's tested |

## Build
```
python3 games/src/lantern_peak/art/make_art.py   # only when the source art changes (needs Pillow)
python3 games/src/lantern_peak/build.py
```
- `out/lantern_peak.html`: site build. Goes to `games/lantern_peak.html` at go-live (it loads `kit.js`, `questions.js`, `scorecode.js` beside it and fonts from `../fonts/files/`).
- `out/lantern_peak_mult.html`: Kody's self-contained test copy, which opens straight into multiplication facts. Never goes on the site.
- `out/lantern_peak_preview.html`: self-contained preview with a question-set picker on the start screen.

## Test
```
bash games/src/lantern_peak/run_tests.sh
```

## Go-live checklist (after "push it")
- copy `out/lantern_peak.html` to `games/` (decide: new id, or replace `jump_man_multiplication.html` under the same score key)
- `scorecode.js`: GAMES entry (next free number) + save key `lantern_peak:'lantern_peak_v1'` in the 20-minute list + tab emoji; change `'starter'` in `SpitzCode.show('lp','starter',S)` to the game id
- `catalog.js`: card, locked (`UNLOCK` null) until Kody picks a date
- drop the "Preview · working title" badge in `head.html`
