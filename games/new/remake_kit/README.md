# Remake kit (games/new/remake_kit)

The things every remake kept rebuilding by hand, in one file: **title screen, box-free HUD, the question card (2 questions plus a spare), upgrade pick, pause box, sound and feel hooks, run extras, end screen**. Pulled on 2026-11-26 from Star Swarm HD v71, Football Buds BLITZ v78, Jump Man v15, Burger Blaster v2 and Rook & Ruin v81.

Around the file sit four time savers: **a starter game** (`new_game.py`), **the `_mult` test copy builder** (`build_mult.py`), **the look test** (`look.html`, `look_sheet.js`) and **the math rule test** (`tools/qa/adapters/_mathrule.js`).

It sits on top of `games/kit.js` and does not replace or change it. kit.js still does music, confetti, the "Press F" hint, the controls card and the end-screen count-up. This file adds the remake layer and restyles the kit's key caps to match the game.

| File | What it is |
| --- | --- |
| `remake_kit.js` | The kit. One file, styles included. |
| `spitz_digits.css` | The Spitz Digits number font (the one where 1 does not look like 7). |
| `demo.html` | Gem Run, a tiny stand-in game made only from the kit. Not on the hub. It is also the starter every remake begins from. |
| `new_game.py` | Starts a remake: copies the starter with your name, prefix and save key. |
| `build_mult.py` | Builds Kody's self-contained `_mult` test copy from a kit game page. |
| `look.html`, `look_sheet.js`, `looks/example.json` | The look test: the kit's screens in a game's colours and fonts, before any gameplay code. |
| `tools/qa/adapters/remake_kit.js` | The Gameplay checks for it (13 tests). |
| `tools/qa/adapters/_mathrule.js` | The math rule as a ready test: six bots, five promises. Any game's adapter plugs in. |

**No live game loads this yet.** A remake's build inlines `remake_kit.js` the same way kit.js is inlined into a test copy. Nothing here needs the ChatGPT review until it moves into a shared file.

## See it

Open `games/new/remake_kit/demo.html?set=slope`. The Look buttons bottom left switch between three looks (pixel, cartoon, dungeon) to show that a game changes its look with a few variables, not by rewriting the kit. Any of the 20 question sets works: `?set=mult`, `?set=plot`, and so on.

## Start a remake in one command

```
python3 games/new/remake_kit/new_game.py shift_racer sr --title "Shift Racer" --out /mnt/project-files/games/remake/shift_racer_v2/src
python3 games/new/remake_kit/build_mult.py <out>/game.html <out>/shift_racer_v1_mult.html
```

The first line writes `game.html`: Gem Run with your id prefix, your save key (`shift_racer_v1`) and your name, and the demo-only parts taken out. Already wired: stage, save and reload, title, HUD, question card, upgrade pick, pause, Shift+R, M and N, sound and feel hooks, best today, idle nudge, end screen, and the `__G` test hooks the Gameplay checks read. Replace the Gem Run parts (`CFG`, `fresh`, `step`, `draw`, the card rewards) with the real game. It refuses a prefix a live game already uses unless you pass `--same-prefix` (for a remake that replaces that game).

The second line makes the one-file test copy for Downloads: every script, style sheet and font is built in, it opens straight into multiplication (`--set slope` for another set), with no hidden sets and no assigned lock. It runs with no internet. Never put a `_mult` copy on the site.

## Approve the look before any gameplay code

Write a look file (copy `looks/example.json`): a name, a tagline, font files, the `--rk-*` variables and a few canvas colours. Then:

```
node games/new/remake_kit/look_sheet.js games/new/remake_kit/looks/example.json look.png
```

That saves one picture with seven screens in that look at Chromebook size: title, HUD, question card, a miss, upgrade pick, pause box, end screen. `look.html?file=looks/example.json` shows the same sheet live, with a box to edit the look and see it again. Send Kody the picture with the one-page spec, and only start the game once the look is approved.

## Use it in a remake

Load order: `kit.js`, `questions.js`, `scorecode.js`, `remake_kit.js`. The page needs a `#stage` that is 1920 by 1080. Call the pieces while the page loads (not later), because kit.js draws the controls card and scorecode.js adds Back to Arcade when the page finishes loading.

```js
var RK = SpitzRemake.make({ pre:'bb', S:function(){ return S; }, save:save, next:nextQuestion });
```

`pre` is the game's two-letter prefix. Every id the kit makes starts with it (`bb-start`, `bb-nameinput`, `bb-go`, `bb-q`, `bb-end`, `bb-endscore`, `bb-endcode`, `bb-again`), which is what kit.js, scorecode.js and the Gameplay checks already look for. `S` returns the run's save object, `save` saves it, `next` returns the next question (`SpitzQ.forGame(pre).next`).

### Title screen

```js
var title = RK.title({ name:'Burger <b>Blaster</b>',          // or logo:'<img ...>' for a painted logo
  tagline:'Knock down ten forts and the King.',
  controls:'ARROWS/WASD=Move | Space=Jump | X/K=Dash | 1234=Answer',
  onStart:function(name){ ... } });
```

What it settles so nobody has to again:
- Back to Arcade top left. No "Spitz Arcade" header.
- The set name comes first in the tagline (kit.js fills it in).
- Controls card shows WASD beside the arrows. Arrow keys are drawn as pixel shapes, so they match the letter keys in size and weight. "or" sits on the keys' bottom row.
- Start waits for a name. Typing a name never steers the game (W A S D, M, N, F stay in the box). Enter starts.

### HUD

```js
var hud = RK.hud({ left:[ {id:'hearts', type:'hearts', max:3}, {id:'time', type:'num', label:'Time'} ],
                   right:[ {id:'score', type:'num', label:'Score', size:'big'}, {id:'next', type:'bar', label:'Next fort', text:true} ] });
hud.set({ hearts:2, time:'3:23', score:3201, next:{ f:0.4, text:'3 forts to go' } });   // call every frame; it only touches the page when a value changed
hud.flag('time', 'warn', secondsLeft <= 20);                                              // warn = red, hot = gold
```

- **Left = you and your survival** (hearts, time, the thing chasing you). **Right = score and progress.** Kody's split from Jump Man v15.
- Nothing is boxed: no chips, no panels, no corner brackets. Words and numbers sit on the play field with a dark outline.
- No "Made by Spitz" in the HUD or anywhere in the in-game view. The credit shows only bottom right on the title and end screens, which `RK.title` and `RK.end` already do (Kody, 2026-11-26).
- Types: `num`, `hearts` (pass `icon:'🍔'` for burgers as lives), `bar`, `text`. `cols:true` stacks each side as a column (Jump Man's side columns).

### Question card: 2 questions plus a spare

```js
var card = RK.card({ fast: QS.set==='mult', kinds:{
  hangar:{ title:'Hangar', safe:'Ship docked. You are safe.',
           rewards:['No upgrade this time.', 'one upgrade', 'two upgrades'],      // what 0, 1 and 2 right earn; the card writes its own lines from these
           done:function(r){ /* r.right, r.asked, r.missed, r.perfect, r.spare */ } },
  strike:{ title:'Boss strike', need:1, spare:0, rewards:['The shot fizzled.', 'the charged shot'], done:function(r){ ... } } } });

card.open('hangar');        // the game freezes itself: skip its update while card.isOpen()
card.resume();              // once, after loading a saved run
```

The rule (Kody, 2026-11-25, "the new standard"):

| Answers | Result |
| --- | --- |
| right, right | 2 right, perfect |
| one miss in the first two | a spare third question appears: 2 right or 1 right |
| wrong, wrong | 0 right, no spare |

**The look is Kody's standard for every game (2026-11-27, from Burger Blaster v21: "emulate that across other games"):**

- ONE paper card: thick border, hard offset shadow with no blur, tilted about 1 degree. It should read as part of the game's world, not a quiz overlay.
- Title in the game's display font with an ink outline. Give it game-flavoured wording (`title:'Load your burgers!'`, not "Question").
- Reward slots top right fill as you answer (green ring right, red ring wrong, a pop when one fills). `icon` puts the prize in the slot: a string shown on a right answer (`icon:'🍔'`), or a function `icon(state, i)` that returns HTML (an `<img>` or a `<canvas>` you draw into) for `'ok'`, `'no'` and `''` (empty). With no icon the slots show a tick or a cross. The spare slot only appears after a miss.
- Small "Question 1 of 2" line, then the big prompt with the key terms coloured (they never wrap mid-term), a graph on the left when the question has one.
- Four chunky answer buttons in a 2 by 2 grid, each with a round numbered coin (keys 1 to 4), a thick border and a hard shadow. Right turns green, the picked wrong one turns red, the others dim.
- One footer line. Before an answer it says what a right answer wins. After a miss: "Not quite." plus one explanation, and it waits for Space or Enter (it never moves on by itself; the first 2 seconds are held so the reason gets read). A right answer moves on by itself after 0.9 s.
- 15 seconds with no key or click: the card bobs and a "Pick an answer: 1-4" sticker appears (`nudge:'...'` and `nudgeAfter:15` change it).
- Place it so it does not cover what the student needs to see: `--rk-q-x` and `--rk-q-y` move it, `--rk-q-scale` sizes it, `--rk-q-tilt` tilts it, `--rk-dim` sets how much the game behind is dimmed (`transparent` keeps the game fully visible, as in Burger Blaster).
- Colours come from the game's own variables: `--rk-win` (paper), `--rk-frame` (border), `--rk-tile` (answer buttons), `--rk-coin` and `--rk-coin-text` (number coins), `--rk-accent` (title).
- While it is open the card owns the keyboard, and it ignores keys for the first quarter second so a key held from play never answers.
- **Reload-safe.** The card writes the run's own save (`S.q`, `S.qDone`, `S.picked`, `S.answered`, `S.correct`, `S.streak`, `S.best`, `S.topics`, `S.card`) and saves with every answer. A reload comes back on the same question, and a missed question stays missed. That save shape is also what scorecode.js reads for the answer log and for bringing missed questions back, so both keep working with no extra code.
- Works with all 20 question sets, including graph questions (the card widens and puts the graph on the left) and long answers (one column).
- The math rule stays the game's job: `done` gets a count, the game decides the reward, and 0 right must still let the run go on.

### End screen

```js
var end = RK.end({ name:'Burger <b>Blaster</b>', gameId:'burger_blaster', onAgain:function(){ ... } });
end.show({ score:S.score, headline:'King Muncher beaten!', goal:'Next run: 3 right in a row for ×1.5 points.',
           stats:[ ['Correct', S.correct+' / '+S.answered], ['Best streak', S.best], ['Forts', '7 of 10'] ] });
```

- Name, score (kit.js counts it up), one headline, **one line to chase next run**, three plain stats with no tiles, the score code, Play again on Enter.
- Play again waits 1.2 seconds, so mashing Space or Enter as the run ends never skips the screen (the Rook & Ruin bug).
- `gameId` makes scorecode.js fill in the code, the Send button and "you'd be #X". Leave it out on a look test.

Pass `topics:S.topics` and the end screen adds a row of right-out-of-asked per topic (only when two or more topics came up).

### Upgrade pick

```js
var pick = RK.pick({ title:'Hangar', options:function(){ return [
    { id:'gun', name:'Gun up', desc:'One more barrel.', icon:'🔫', off:S.gun>=3 }, ... ]; },      // up to 4; off:true greys one out
  onPick:function(id){ ... } });
pick.open(1, 'Both right! Pick an upgrade.');   // from the card's done()
pick.resume();                                   // once, after loading a saved run (after card.resume())
```

Keys 1 to 4 or a click. It ignores keys for the first 0.4 seconds, so the key that answered the question never also picks. The pick is saved (`S.pick`), so a reload can not pick twice. Kody's note from Jump Man: a fixed reward beats a choice unless the choice is the fun, so use this only where it is.

### Pause box

```js
RK.pause({ when:function(){ return S.started && !S.over; }, controls:CONTROLS, stats:function(){ return [['Score',S.score]]; } });
```

P or Esc pauses and resumes. The box shows the run's stats, Music and Effects sliders (remembered) and the keys. It also pauses when the tab is hidden. **In the game loop, skip the update while `RK.busy()`**: that one check covers the question card, the pick, the pause box and the new-game box, so the clock and the player always stop together.

### Sound and feel

```js
RK.snd('right');                          // built-in soft chimes: open, right, wrong, next, pick, tick. Pass env.snd to use the game's own kit.
RK.fx.shake(0.5);                         // screen shake on the game picture; fades by itself
RK.fx.stop(70);                           // hit-stop in ms (never longer than 200); skip the update while RK.fx.frozen()
RK.fx.pop(x, y, '+100', 'good');          // a number pop at stage position x, y (good, bad, gold); at most 14 at once
RK.fx.banner('Rock storm!', 'watch the sky', { kind:'bad' });   // one at a time, waits while a card is up
```

The limits are built in: nothing flashes, shake and hit-stop switch off with reduce-motion, pops and banners are capped. The card and the pick already play their own chimes. M mutes, N is the music switch (pass `music:` the object from `SpitzKit.game`).

### Run extras

- `RK.mult(S.streak)`: the answer-streak multiplier, 3 in a row ×1.5, 6 ×2, 10 ×3. `RK.multNext(n)` says what comes next, for the HUD.
- `RK.best.get()` and `RK.best.keep(score)`: today's best on this question set, to chase. It never carries over to the next day.
- `RK.goal({ score, was, streak })`: writes the one line to chase for the end screen (new best, how far short, or the next streak step).
- `RK.idle({ after:6, text:'Move! Catch the gems', when })`: a nudge after 6 seconds with no key or click.

### Also in the box

- `RK.ask({ onYes, when })`: the "Start a new game?" box on Shift+R, with Y and N.
- F toggles full screen. `RK.fit()` scales the stage to the window.

## Give the game its own look

Set these on `:root` (the F hint sits outside the stage). Anything not set keeps the dark pixel default. `demo.html` has two full examples.

| Variable | What it changes |
| --- | --- |
| `--rk-word`, `--rk-word-scale` | The font for game words, and a size factor for fonts that run small (Bangers 1.55, Pixelify Sans 1.5) |
| `--rk-num`, `--rk-body` | Numbers (Spitz Digits) and the font the math is read in (Inter) |
| `--rk-ink`, `--rk-ol` | Outline colour, and the outline itself (a light outline for a light game) |
| `--rk-text`, `--rk-muted`, `--rk-accent`, `--rk-gold`, `--rk-good`, `--rk-bad` | Text and state colours |
| `--rk-win`, `--rk-frame`, `--rk-tile`, `--rk-tile-text`, `--rk-radius` | The one game window: fill, frame, answer buttons, corners |
| `--rk-go`, `--rk-go-text` | Start and Continue |
| `--rk-key-face`, `--rk-key-text`, `--rk-key-rim`, `--rk-key-low` | Every key cap: controls card, small keys line, F hint |
| `--rk-heart`, `--rk-heart-off` | Hearts |
| `--rk-coin`, `--rk-coin-text`, `--rk-q-x`, `--rk-q-y`, `--rk-q-scale`, `--rk-q-tilt` | Question card: the number coins, and where the card sits, its size and its tilt |
| `--rk-dim`, `--rk-over` | The dim behind a card, and the title and end screen background (put the title painting here) |

Sizes are set so no kit text is under 11px on a 1366 by 620 Chromebook screen. Keep `--rk-word` text in mixed case when the font is Pixelify Sans (its capitals are hard to read).

## What is checked

`node tools/qa/run.js remake_kit` (about 7 minutes) plays the demo with real keys and clicks. `QA_ONLY=pause node tools/qa/run.js remake_kit` runs only the tests with that word in the name.

1. The shared baseline: start, answer, move, game over, end screen, Play again resets.
2. Every answer pattern (RR, RWR, WRR, RWW, WRW, WW) gives the right count, and the markers read "1 of 2", "2 of 2", "Spare question".
3. A reload comes back on the same question, and a miss can not be retried.
4. The card owns the keyboard: held keys do not answer, arrows do not move the player, Space does not skip.
5. All 20 question sets fit the card: one right answer, nothing off screen, no text spilling.
6. Title screen in all three looks: Back to Arcade top left, no header, pixel arrows and WASD the same size, "or" on the bottom row, no text under 11px.
7. HUD: nothing boxed, survival left, score right, readable.
8. End screen: mashing keys does not skip it, plain stats, the score counts up.
9. Upgrade pick: the answering key never picks, a taken upgrade greys out, a reload can not pick twice.
10. Pause box: the clock and the player stop, sliders set and remember the volume, a paused question ignores answer keys.
11. Sound and feel: chimes on answers, pops and banners capped, shake fades, hit-stop capped, M mutes, reduce-motion keeps the screen still.
12. Run extras: streak steps, best today (and not yesterday's), the idle nudge, the line to chase.
13. The math rule (below).

## The math rule as a ready test

Kody's rule: math is not fuel. Do the math well and the game gets better; get it wrong and it stings, but the game still runs. `tools/qa/adapters/_mathrule.js` checks that by playing. Six bots play whole runs with real keys (all right, always wrong, guessing, always pressing 1, mashing every key, and one that touches nothing), then five promises are checked:

1. **Zero right still plays.** The always-wrong player keeps scoring after its first missed card and ends on the end screen.
2. **Knowing the math wins.** All right beats guessing, always 1, mashing and always wrong by 10% or more (averaged over two runs).
3. **A miss never strands.** Every card closes again and every playing bot reaches the end screen.
4. **Idle does not outscore.** Touching nothing scores less than every bot that plays.
5. **Questions at set moments.** The number of cards in a run and the gap between them match what the game says, and mashing can not call up more.

A game plugs in by adding `...mathRule({ open, start, peek, drive, release, moments })` to its adapter's scenarios. `peek` reads the score, the play clock and the open question; `drive` is one short step of normal play with real keys, the same for every bot. The top of `_mathrule.js` has the full list and `tools/qa/adapters/remake_kit.js` is a working example. Give the game a short round on the test box (the starter takes `?secs=30` on localhost and in `_mult` files only). The report lists each bot's score, so the same run doubles as a first balance read.

A remake built on the kit still gets its own adapter for its own rules. These checks cover the shared parts so the remake's tests do not have to.

## Not in here yet

- A per-game sound kit and music. The built-in chimes are a soft default; a game with its own sounds passes `env.snd` (see the spitz-sound skill).
- Art. The starter draws squares. Each game brings its own (see the spitz-draw-sprites skill and the art rules).
- Moving this into `games/kit.js` itself. That is a shared file, so it needs the ChatGPT review and Kody's "push it". It can wait until one remake has shipped on the kit.
