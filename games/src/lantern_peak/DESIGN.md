# Lantern Peak (working title): design notes

## What I found in Jump Man (checked against the code and by playing it)
- **Moving costs energy.** `spend()` takes energy for every step and jump, so 1.5 s of running dropped energy from 15 to 10. Students were spending their math reward on learning the controls.
- **The explanation bug is real.** After a right answer, `newQ()` fires 140 ms later, but `showQ()` only clears the feedback box before the first answer of the run. The new question appeared under the old explanation ("Subtract 5x from both sides…" stayed under the next question).
- **The question panel is always open beside the play area**, so play and reading compete for attention all round.
- **Worth keeping:** `SpitzQ.forGame(prefix)` (hub set + topics, missed questions come back), the run save that `scorecode.js` watches (answer log, 20-minute expiry), `SpitzCode.show` on the end screen, and the kit (music switch, jingle, confetti, toast, F hint, Shift+R box). All of these are wired the same way here.

## The concept
- **Who:** Pip, a brown-skinned kid courier in a yellow knit hat and a teal scarf. The name stays provisional until Kody has met the character.
- **Where:** one mountain, climbed from the village at its foot to the peak. The beacon tower on the peak is always visible on the skyline and gets closer as you climb.
- **Goal:** reach the top and light the beacon. In the slice, the finish is the Falls Lookout.
- **The loop:** climb freely, reach a **Waystone**, light its runes by answering questions, the gate opens, and you learn a new move. The next zone is built around that move.
- **Identity:** movement and the climb. There is no combat.

## Movement (free, forgiving)
- Running and jumping cost nothing.
- Quick acceleration, extra grip when turning, and softer gravity near the top of a held jump for easier aiming. Falls are faster.
- Jump buffer 0.14 s, coyote time 0.10 s, short hop on release (tap 77 px, full 148 px).
- Ledges are jump-through, Down drops through, and corners are corrected on solid blocks.
- **Recovering from mistakes:** lanterns along the climb are checkpoints. A fall more than 280 px below your lantern, or thorns, bring you back to it in under a second, and nothing else is lost. After 3 falls in the same stretch, a helping wind gives +13% jump height until the next lantern.

## Moves (a small, coherent set)
| Waystone | move | used for |
|---|---|---|
| 1 (in slice) | **Cloud Hop**: a second jump in the air | Falls Cliffs: 200+ px steps and 400 px gaps |
| 2 (planned) | **Glide Dash**: one short air dash | Windy Ruins: long gaps across gusts |
| 3 (planned) | **choice:** Wall Kick or Spring Step | Beacon Summit: each opens its own optional route. The main route needs neither, so there's no softlock |

Replay variety comes from the brave/calm route forks, Star Feathers on the brave routes, and (planned) the choice at Waystone 3. It does not come from speed or score inflation.

## Math cadence
- A Waystone sits at the end of each zone. The world is frozen and there is **no clock**.
- Quick sets (multiplication, integers, squares and roots) need 5 runes. Algebra sets need 3.
- **Right answer:** a rune lights. **Wrong answer:** the student's answer is marked, the reason and the explanation are shown, and the only cost is that rune. Continue brings a new question. Missed questions come back later through `SpitzQ.missed`.
- **Question, answer and explanation stay together** until the student presses Continue. The old explanation is always cleared before the next question.
- **Held-input guard:** keys held when the card opens are blocked until released. Keys and clicks in the first 0.45 s are ignored, and so are clicks that started before the question appeared. Space never answers. Enter key-repeat is ignored. Movement keys held when the card closes don't move the hero until they are released.
- **Expected per zone:** about 60 to 90 s of uninterrupted climbing, then about 1 to 2 minutes of questions on algebra sets (15 to 30 s on quick sets). The slice is about 3 to 5 minutes. The full game, with 4 zones and 3 Waystones, is about 6 to 8 minutes. If that runs long, zone 4 shortens. These timings are estimates from the level's jump counts (zone 1: 20 required jumps, zone 2: 13). A real student run is the true test.
- Questions in the slice: 3 (algebra) or 5 (quick sets) minimum. In the full game, 9 to 15.

## Art direction: 8/16-bit pixel (Kody, 2026-11-16)
- Kody's notes on the first art: "much simpler", then "even blockier", then a brown-skinned kid South Texas students can see themselves in, then "more of an 8 bit/16 bit look, make it a little dated". The ChatGPT proof pair (hero sheet 77970cdf + Pinewood backdrop f7841bb6) was approved "for now as a proof of concept".
- **Pip** is now a brown-skinned kid in the yellow knit hat and teal scarf, drawn from that sheet as a 6-pose sprite strip (front, idle, run, jump, fall, land) at 1 world px per art px.
- **Zone 1 backdrop** is the approved ChatGPT painting at 480x270, doubled. It sinks slowly as you climb and fades out into zone 2.
- **Everything else in the scenery** (sky bands, far peak and beacon, clouds, hills, cliffs, village) is still drawn in code, but at 480x270 and doubled, so it reads as the same chunky pixels.
- **Gameplay objects** (ledges, embers, thorns, lanterns, signs, the Waystone and gate) keep the crisp dark plum outline (#2A1B2E) at full resolution, so a ledge never looks like background.
- The canvas is a fixed 960x540, upscaled with `image-rendering: pixelated`.
- `art/make_art.py` rebuilds `art_data.js` from the two source PNGs in `art/` (hero strip downsampled 2:1 with outline priority, backdrop cleaned of the grey bar and given a pale teal sky).
- **Palette** (unchanged): hat #FFC23D, scarf #2EC4B6, jacket #E8553D, embers #FF9A3C, thorns #7B2D5B. The UI is a dark ink panel (#1B1426), so every question set's math colours read as they do in the other Spitz Arcade games.

## Asset list
| asset | status |
|---|---|
| Pip sprite strip (6 poses, ChatGPT sheet 77970cdf) | **proof**, approved by Kody as proof of concept. Wanted for the real batch: more run frames, a Cloud Hop flip pose |
| Zone 1 backdrop (ChatGPT f7841bb6) | **proof**, approved |
| Zone 2 backdrop (Falls Cliffs, sunset) | **TEMP**: code scenery at half resolution until a ChatGPT backdrop is made |
| Ledges: wood, stone, cracked, lift; thorns, embers, Star Feather, lanterns, Waystone, gate, signs (code) | **TEMP-ish**: crisp code shapes; may get pixel versions if Kody wants them to match the hero more closely |
| Old vector Pip in art.js | fallback only, used if the sprite fails to load |
| Title screen | live game scene behind the panel (no separate art) |
| Sounds | procedural (Web Audio): jump, Cloud Hop, landing, embers (a rising scale for chains), feather, lantern, cracking plank, thorns, respawn, chimes, gate, unlock, finish. Music: a soft folk loop in D through the kit |
| Zones 3 to 4 art (dusk ruins, night summit, the lit beacon) | not built |

## Tested (see `run_tests.sh`)
- **Route checker:** zone 1 is beatable with plain jumps, nothing above the Waystone is reachable before the gate opens, zone 2 is impossible without Cloud Hop and beatable with it, every ledge is reachable, and there are no softlocks.
- **Bot:** climbs the whole slice through the real game (lights the Waystone, gate, Cloud Hop, Lookout, end screen).
- **Waystone:** all the rules listed above, plus reload in the middle of a Waystone (same question comes back).
- **Falls, thorns and the helping wind;** pause freezes the world; Shift+R asks first; reload keeps the climb.
- **All 17 question sets** fit the Waystone card with the explanation open, at 1366x768, 1366x620 and 1280x720.
- **Speed:** about 60 fps at 6x CPU slowdown at 1366x768 after the pixel pass (scenery is drawn at a quarter of the pixels).

## Not tested / still to do
- I can't hear the sounds or judge how the jumps feel to a 13-year-old. That needs Kody and a student.
- Real timing with students.
- Zones 3 and 4, the other moves, the beacon finale.
- Score code: the game id gets registered in `scorecode.js` at go-live (same as Rook & Ruin).
