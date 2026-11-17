# Gameplay checks (tools/qa)

One test runner for every Spitz Arcade game, and later the hub, Checkpoint and the spitz.dev dashboard. It plays the game the way a student does (real key presses, real mouse drags, real clicks) and checks the game's state after each step, so a failure reads like a sentence:

> **after restart, hp is reset**: expected 5, got 1

Started 2026-11-17 as the pilot from the "spitz.dev tooling evaluation". Rook & Ruin was the first game; Burger Blaster and Rocket Buds were added with an adapter each and no runner changes. Rook & Ruin is the first testing ground, not the boundary: the same runner, report and review loop are meant for every Arcade game, the hub, Checkpoint and other spitz.dev apps.

## Run it

```
node tools/qa/run.js rook_and_ruin                 # one game, quick lane
node tools/qa/run.js rook_and_ruin burger_blaster  # several
node tools/qa/run.js --changed origin/main         # only what this branch changed (what CI does)
node tools/qa/run.js --all --lane full             # everything, plus 1920x1080 and each game's own full suite
node tools/qa/run.js rook_and_ruin --no-suite      # skip the game's own suite (fast, for writing adapters)
```

Needs Playwright (`npm install --no-save playwright@1.49.1 && npx playwright install chromium`). It serves the repo on localhost, so run it from anywhere in the repo.

Output goes to `qa-out/` (ignored by git): `qa-out/summary.md` for everything, and per game `results.json`, `summary.md` and screenshots of each step.

Exit codes: **0** nothing failed, **1** a game check failed, **2** the runner itself broke. Add `--strict` to also fail when something is untested.

## Every result has one of five labels

| Label | Means |
| --- | --- |
| pass | checked and worked |
| fail | checked and broke (the reason reads like a sentence) |
| flaky | failed, then passed on its one retry. Never shown as a plain pass |
| unsupported | the game has no such thing (Burger Blaster has no arrow-key movement). The adapter must say why in `unsupported` |
| not tested yet (unimplemented) | nothing tests it: an adapter part is missing, a tier 1 game has no scenarios, or a changed page has no adapter at all |

Missing coverage never counts as passing: the headline says "Nothing failed, but N things are not tested yet" and lists them.

## In GitHub

`.github/workflows/qa.yml` ("Gameplay checks") runs on every push to a `claude/*` branch and on other pull requests. It only plays the games whose files changed, and it **always reports a status** (a change with nothing to play passes in about a minute and says so), so it can be a required check. `--plan` prints what would run; CI uses it to skip installing Chrome when nothing needs playing. A change to a shared file (`kit.js`, `scorecode.js`, `catalog.js`, `questions.js`, `sw.js`, or this folder) plays every game that has an adapter. Results show on the run's Summary page, with screenshots in the `qa-results` artifact (kept 7 days). It has read-only permissions and never comments, merges or deploys.

## The baseline every game gets (tier 1)

`lib/tier1.js` runs the same play-through for every game:

1. Open the game with multiplication questions and start a run.
2. A question opens; the right answer is chosen **with the number key** and accepted.
3. Arrow keys move the player (games that have movement).
4. The main action works with real input (Space to swing, a mouse drag to fire, ...).
5. The run is made "dirty" (score, coins) so the next checks prove something.
6. Game over happens and the end screen shows.
7. Play again: every value in the adapter's `resetKeys` is back to what the first start had, and the run is playable.

Screenshots: start, question, end screen, after restart.

## Adding a game: write one adapter

Copy `adapters/burger_blaster.js` (a tier 1 game that only has `__G.state()`) and add the game to `apps.json` with the paths that belong to it. An adapter provides:

| Part | What it does |
| --- | --- |
| `open(pg)`, `start(pg)` | Load the page with `?set=mult`, clear saved runs, type a name, press Start, skip any intro |
| `snapshot(pg)` | A small plain object read from `__G.state()`: score, lives, mode, room, coins... |
| `playable(s)` | Is the run in normal play right now? |
| `openQuestion(pg)` | Make a question appear (or find the open one); return `{open, right, before}` |
| `answeredRight(before, after)`, `continueQuestion(pg)` | Did the right answer count; how to move on (optional) |
| `answer(pg, q)` | Optional: answer the open question your own way (a click, a different key). Default: the real number key for the right choice |
| `intents` + `moved(a, b)` | Keys for left/right/up/down/action and how to tell the player moved (omit for games without movement) |
| `act(pg)`, `actName`, `acted(a, b)` | Real input for the main action when it isn't a key (a drag, a click) and how to tell it happened |
| `dirty(pg)`, `forceEnd(pg)`, `endShown(pg)`, `restart(pg)` | Set up a scene, end the run, wait for the end screen, press Play again the way a student does |
| `resetKeys` | Which `snapshot` values must be back to their first-start value after Play again |
| `unsupported` | `{ movement: 'why' }` for things the game doesn't have. Anything else missing is reported as not tested yet |
| `scenarios` | Tier 2 only: extra tests for things only this game has (Rook & Ruin's shop) |

Rule of thumb: **hooks set the scene, real input does the action.** Use `__G` to put the player in the shop with 100 coins; press the real E key to buy.

## Tiers

| Tier | The game provides | Tested |
| --- | --- | --- |
| 0 | nothing | the Safety check (`.github/smoke/smoke.js`): loads, Start works, no errors |
| 1 | `__G.state()` (18 games already) | the baseline above |
| 2 | `__G.step(dt)` and scene helpers | scenario tests (shop, boss, revive) without waiting on real time |
| 3 | `__G.seed(n)` | exact-value checks and stable screenshot comparison (no game yet) |

## A game's own suite

`apps.json` can name a game's existing suite (`suite.quick`, `suite.full`). Its `PASS`/`FAIL` lines become one test in the same report. Rook & Ruin's 18 tests run this way (`run_tests.sh`).

## Readability (text size and contrast)

`tools/qa/readability.js` runs inside the Safety check. It opens the site pages, the Checkpoint player and every game's start screen, hides all text, photographs the page, and compares each text colour with what was really behind it. It fails on text smaller than **11px** or below **4.5:1** contrast (**3:1** for large text, 24px+ or 18.7px+ bold). Text covered by something else (the HUD under a start screen) and text drawn on a game canvas are not checked.

Problems that already existed are listed in `readability-baseline.json` and only reported; a new one turns the check red. After fixing a known one, run `node tools/qa/readability.js --update-baseline` and commit the shorter list. Never add a new problem to the list to get green without Kody's OK.
