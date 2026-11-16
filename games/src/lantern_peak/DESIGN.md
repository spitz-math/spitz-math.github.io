# Lantern Peak (working title): design notes

## What I found in Jump Man (checked against the code and by playing it)
- **Moving costs energy.** `spend()` takes energy for every step and jump, so 1.5 s of running dropped energy from 15 to 10. Students were spending their math reward on learning the controls.
- **The explanation bug is real.** After a right answer, `newQ()` fires 140 ms later, but `showQ()` only clears the feedback box before the first answer of the run. The new question appeared under the old explanation ("Subtract 5x from both sides…" stayed under the next question).
- **The question panel is always open beside the play area**, so play and reading compete for attention all round.
- **Worth keeping:** `SpitzQ.forGame(prefix)` (hub set + topics, missed questions come back), the run save that `scorecode.js` watches (answer log, 20-minute expiry), `SpitzCode.show` on the end screen, and the kit (music switch, jingle, confetti, toast, F hint, Shift+R box). All of these are wired the same way here.

## The concept
- **Who:** Pip, a brown-skinned kid courier in a yellow knit hat and a teal scarf. The name stays provisional until Kody has met the character.
- **Where:** one mountain, climbed from the village at its foot to the peak. The beacon tower on the peak is always visible on the skyline and gets closer as you climb.
- **Goal:** reach the top and light the beacon. A storm spirit, **the Gloom**, has put it out and sits on the tower.
- **The loop:** climb freely, reach a **Waystone**, light its runes by answering questions, the gate opens, and you learn a new move. The next zone is built around that move.
- **Identity:** movement and the climb. There is no combat: the Gloom is beaten by lighting fires (answering questions), never by hitting it.

## Movement (free, forgiving)
- Running and jumping cost nothing.
- Quick acceleration, extra grip when turning, and softer gravity near the top of a held jump for easier aiming. Falls are faster.
- Jump buffer 0.14 s, coyote time 0.10 s, short hop on release (tap 77 px, full 148 px).
- Ledges are jump-through, Down drops through, and corners are corrected on solid blocks.
- **Recovering from mistakes:** lanterns along the climb are checkpoints. A fall more than 280 px below your lantern, or thorns, bring you back to it in under a second, and nothing else is lost. After 3 falls in the same stretch, a helping wind gives +13% jump height until the next lantern.

## The climb (4 zones and a finale)
| part | look | built around | ends at |
|---|---|---|---|
| 1 Pinewood Steps | morning pine woods | plain jumps, lifts, cracked planks, a calm/brave fork | Waystone 1: **Cloud Hop** |
| 2 Falls Cliffs | sunset cliffs | Cloud Hop: 200+ px steps and 400 px gaps | Waystone 2 (the Falls Lookout): **Scarf Glide** |
| 3 Windy Ruins | dusk ruins | rising winds that lift a glider, one tail wind, a calm/brave fork | Waystone 3: **Ember Dash** |
| 4 Beacon Summit | night snow | ice walls a dash melts, an ice alcove with a Star Feather | the foot of the tower |
| Finale: the Beacon Tower | brick tower, the Gloom above | three short climbs while the Gloom throws ice and gusts | three fires; the third is the beacon |

## Moves (a small, coherent set)
| Waystone | move | how | used for |
|---|---|---|---|
| 1 | **Cloud Hop** | jump again in the air | Falls Cliffs |
| 2 | **Scarf Glide** | after the hop, hold jump: the scarf opens and the fall slows to 140 px/s. Rising winds lift a glider at 300 px/s | Windy Ruins |
| start | **Ember Dash** | X or C: a quick straight dash (about 145 px), once per jump. **Each dash burns 1 ember**; with none left, X only fizzles | everywhere |
| 3 | **Blazing Dash** | the dash now melts ice | Beacon Summit and the tower |

Each Waystone card shows the new move in a small looping demo, and the pause screen lists the moves learned so far.
The earlier plan (Glide Dash, then a choice of Wall Kick or Spring Step) was replaced: two simple moves read better than a choice screen, and neither puts an action on W, A, S or D.

## Hearts and hard mode (Kody, 2026-11-16: "not punishing enough, not hard enough")
- **3 hearts.** A fall, thorns or an icicle costs a heart and the last 3 embers picked up (they go back on the mountain).
- **Out of hearts:** back to the start of the stretch (the last Waystone, the foot of the tower or the last fire) with 3 hearts. Moves and lit stations are never lost.
- **Only the three Waystones refill hearts.** The tower fires do not (Kody: refills must be rare), so you climb the tower on the hearts you bring.
- **Embers are dash fuel** (Kody, 2026-11-16): each ember picked up is one dash, a fall burns 3. The ember chip shows how many you have.
- **Hard falls** (Kody, v3: "falling still doesn't do a whole lot"): landing 200+ px below the last ledge you stood on costs a heart right where you land. A glide softens the landing. The signposted way never needs a drop that big.
- **Lanterns only at the stations** (the Waystones, the tower's foot and the fires), so a long fall loses real height.
- Cracked planks break in 0.35 s (was 0.5), plain ledges a fifth narrower past each zone's opening, and no helping wind.

## The Gloom (finale)
- It wakes when the hero reaches the foot of the tower. A small bar at the top shows three flames, one per fire.
- **Ice:** a dashed lane and a small icicle warn for 0.65 s (2, 3, then 4 lanes), then the icicle falls and breaks on the first ledge it meets. One lane is aimed at the hero, the others are beside it.
- **Gusts** (from the foot of the tower on): the Gloom breathes in for 1 s, then blows for 1.4 s. A standing hero is pushed about 115 px, and walking into the wind holds your place.
- A hit costs a heart, the same as a fall. Each fire is a lantern.
- **It is frozen while a question is up**, and it clears its ice when a fire is lit.
- It does not tire.
- Lighting the third fire lights the beacon: the Gloom dissolves, the sky turns to dawn, confetti, then the end screen.

## Stopping early
A full climb is longer than most Spitz Arcade rounds, so the pause screen has **"Stop here and show my score"** (it asks first). The end screen then says "Climb ended in <zone>" with the same score line, so a class can stop at the bell and still show a score.

Replay variety comes from the brave/calm forks, the four Star Feathers on the brave routes and in the ice alcove, and the four stars on the end screen (beacon lit, 90% right, 90% of embers, every Star Feather). It does not come from speed.

## Math cadence
- A Waystone sits at the end of zones 1 to 3, and the tower has three fires. The world is frozen at each and there is **no clock**.
- Quick sets (multiplication, integers, squares and roots) need 5 runes at a Waystone and 2 sparks at a fire. Algebra sets need 3 and 1.
- **Right answer:** a rune lights. **Wrong answer:** the student's answer is marked, the reason and the explanation are shown, and the only cost is that rune. Continue brings a new question. Missed questions come back later through `SpitzQ.missed`.
- **Question, answer and explanation stay together** until the student presses Continue. The old explanation is always cleared before the next question.
- **Held-input guard:** keys held when the card opens are blocked until released. Keys and clicks in the first 0.45 s are ignored, and so are clicks that started before the question appeared. Space never answers. Enter key-repeat is ignored. Movement keys held when the card closes don't move the hero until they are released.
- **Questions in a full climb:** 21 on quick sets, 12 on algebra sets (more after wrong answers).
- **Expected length:** the test bot, which never hesitates, climbs the whole mountain in about 2 minutes. My estimate for a student is 8 to 12 minutes with the questions. That is an estimate from jump counts, and a real student run is the true test.

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
| Zones 2 to 4 and the tower scenery (sunset cliffs, dusk ruins with pillars and arches, night snow crags with stars and a moon, brick tower) | **code**, drawn at half resolution in the same chunky pixels. ChatGPT backdrops can replace them later |
| The Gloom (cloud body, two eyes), icicles, ice walls, braziers, beacon flame, glide canopy, dash afterimages (code) | **code**, in the 8/16-bit style |
| Ledges: wood, stone, ruin, snow, brick, cracked, lift; thorns, embers, Star Feather, lanterns, Waystone, gate, signs (code) | crisp code shapes; may get pixel versions if Kody wants them to match the hero more closely |
| Old vector Pip in art.js | fallback only, used if the sprite fails to load |
| Title screen | live game scene behind the panel (no separate art) |
| Sounds | procedural (Web Audio): jump, Cloud Hop, glide, dash, ice shatter, landing, embers (a rising scale for chains), feather, lantern, cracking plank, thorns, respawn, chimes, gate, unlock, the Gloom's warning tick, breath and gust, fire, beacon. Music: a soft folk loop in D through the kit, and a D minor variant on the tower |
| Wanted from ChatGPT later | more run frames, a Cloud Hop flip, a glide pose and a dash pose for Pip; backdrops for zones 2 to 4 |

## Tested (see `run_tests.sh`)
- **Route checker** (real physics, about 1 minute): every stage is beatable, nothing above a gate is reachable before it opens, each zone is impossible without its move and beatable with it, the ice alcove needs the dash, there are no softlocks, and the **signposted way** is proven jump by jump (plus the brave rising wind and the alcove side trips).
- **Bot:** climbs the whole mountain through the real game's keys, answers at all six stations, and lights the beacon.
- **Waystone rules:** all the rules listed above, plus reload in the middle of a Waystone (same question comes back).
- **Falls, thorns and the helping wind;** pause freezes the world; Shift+R asks first; reload keeps the climb; an ended climb starts fresh. (A save from the old slice is ignored by a version check in the code; that one is not in the tests.)
- **Moves:** glide fall speed, rising winds (the tail wind is covered by the route checker), ice blocks without the dash and melts with it, one dash per jump, and the moves and melted ice survive a reload.
- **The Gloom:** warnings before ice, ice breaks on ledges, a hit only sends you back, no gusts before the first fire, gust timing and push, frozen while a question is up, it tires after 3 falls.
- **End screens:** stop early and the full four-star finish both fit at 1366x768 and 1366x620.
- **All 17 question sets** fit the card with the explanation open, at 1366x768, 1366x620 and 1280x720, at a Waystone and at a fire.
- **Speed:** 43 to 60 fps at 6x CPU slowdown at 1366x768 in every zone and on the tower (the target is 30+).

## Not tested / still to do
- I can't hear the sounds or judge how the jumps, the glide and the Gloom feel to a 13-year-old. That needs Kody and a student.
- Real timing with students, and whether the tower is the right difficulty.
- The name "Lantern Peak" and "Pip" are still working titles.
- Score code: the game id gets registered in `scorecode.js` at go-live (same as Rook & Ruin).
