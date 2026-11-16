# Studio notes: Rook & Ruin

Short, factual notes for any agent working on this game. Every line here was decided or stated by Kody, or is a measured fact, with the date. Anything not listed here is NOT decided. Ask, don't assume.
Last updated 2026-11-16 by Claude: added the slime decisions, test-copy numbering.

## What the game is
- Top-down sword roguelite for middle schoolers. One run is about 12-15 minutes. Keep that run length. (2026-11-16)
- Run order: Entry > Guard > Crossroads fork (luck) > Vault/Arena > Library > Shop > Siege (50 s) > Iron Warden boss > Last Stand. (2026-11-14)
- Math questions come at level-ups, chests, the merchant's deal, the Siege rally and revives, about 18-22 per run. Wrong answers never block winning: a perfect dodger with wrong answers may win. (2026-11-14)
- Enemies include the goblin, skeleton, bat, slime and wizard, and the Iron Warden boss.

## Feel and gameplay (Kody)
- Must feel dangerous. Dodging matters. Horde rooms are the fun. (2026-11-14)
- Moving obstacles and attacks must leave a fair window to react. (site-wide rule)
- No challenges, medals or end-screen goals. No fake doors. Secrets should not be obvious. (2026-11-14)
- Warden warnings and lightning stay quiet, with no flashing backgrounds. Reduced-motion is respected. (site-wide rule)
- Movement pass v53: Rook moves at 85% speed while attacking. (2026-11-15)
- Slime tell: pink (#FD63AF) landing marker within 200 px, wind-up shake, hop direction locked at wind-up, goo droplets on hit, floor splat using ChatGPT's art as-is. Shipped in PR #166. (2026-11-16)

## Look (Kody)
- Pixel art. Sprite packs come from ChatGPT. Every sprite must be a clean pixel grid with alpha 0 or 255.
- The goblin is only the rust-orange, gold-eyed, fangless one, never green. (2026-11-14)
- UI: plum surfaces, stone and aged-gold stepped pixel frames, gold primary actions, cyan only for relics, gems and magic, and ivory text. No emoji as art. (2026-11-14)
- Text with lowercase uses Lexend. Only bare numbers use the pixel font. (2026-11-15)
- Effects stay soft and simple, and the same goes for sounds. There's no dungeon music: battle_loop plays in regular rooms. The Warden laughs. (2026-11-15)

## Rejected before (don't propose again)
- PixelLab or any sprite tool other than the ChatGPT art workflow. (2026-11-14)
- An art bible. Each game should feel unique. (2026-11-15)
- A skippable ending. Only the intro can be skipped. (2026-11-14)
- A synth Warden laugh, rejected as clicky. (2026-11-15)
- Bot runs that "stutter step" in trailers. (2026-11-16)

## Technical facts
- Source: repo games/new/bladebound/rook_and_ruin/src/ on main. Build with `python3 build.py`. Test with `bash run_tests.sh` (quick) or `bash run_tests.sh full` (adds speed at 6x CPU slowdown). Every test must print errors []. (2026-11-16)
- Canvas is 960x540 with time-based motion. Students play on Chromebooks with trackpads, so the target is about 30+ fps at 6x CPU slowdown. Last Stand ran 24-38 fps at 6x. (2026-11-14)
- Test copies go to project files downloads/rook_and_ruin_mult_vNN.html. Use the next number after the highest one already in downloads (other threads add copies too). (2026-11-16)
- The game is locked in the catalog until Mon 2026-11-23 12:00 UTC. The live site changes only on Kody's "push it". (2026-11-16)
