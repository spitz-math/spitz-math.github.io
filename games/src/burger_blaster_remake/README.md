# Burger Blaster remake (source)

The live page games/burger_blaster.html is built from the frozen old game plus three patch scripts. Nothing here is loaded by the site.

- `base_burger_blaster.html`: the old Burger Blaster, frozen. The build reads only this.
- `look_patch.py` (cartoon look, title painting), `rules_patch.py` (level run: burgers are lives, 10 generated forts + the King, 2-question card before each fort), `art_patch.py` (painted sprites, juice, card v3, v21 to v25 fixes).
- `art/`: approved paintings as base64 (sprites, blocks, backdrop, clouds, title) and the scripts that cut them.
- `build.sh [mult_out.html]`: writes `out/burger_blaster.html`; with a path it also writes the self-contained copy that opens in multiplication (for Kody's Downloads folder, never on the site).
- `tests/gates.js` (17 checks), `tests/v6_checks.js`, `tests/sim.js <file> strong|typical|weak <runs>` (fast bot runs for balance).
- `qa_adapter_burger_blaster.js`: the copy of tools/qa/adapters/burger_blaster.js (baseline + 6 scenarios).
- `briefs/`: the title slingshot art brief (not sent).

Rules that are locked (Kody): exactly 2 questions per fort, no spare (2026-11-27). 12 starting burgers, cap 15. Wrong answers never take a burger. "Made by Spitz" only on the start and end screens.

Balance targets (40 fast bot runs each, v25): strong (all right, tight aim) reaches fort 9.4 and wins about 2 in 3; typical (70% right) reaches fort 6.9; weak (50% right, loose aim) reaches fort 4.4.
