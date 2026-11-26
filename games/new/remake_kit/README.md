# Remake kit (games/new/remake_kit)

The four things every remake kept rebuilding by hand, in one file: **title screen, box-free HUD, the question card (2 questions plus a spare), end screen**. Pulled on 2026-11-26 from Star Swarm HD v71, Football Buds BLITZ v78, Jump Man v15, Burger Blaster v2 and Rook & Ruin v81.

It sits on top of `games/kit.js` and does not replace or change it. kit.js still does music, confetti, the "Press F" hint, the controls card and the end-screen count-up. This file adds the remake layer and restyles the kit's key caps to match the game.

| File | What it is |
| --- | --- |
| `remake_kit.js` | The kit. One file, styles included. |
| `spitz_digits.css` | The Spitz Digits number font (the one where 1 does not look like 7). |
| `demo.html` | Gem Run, a tiny stand-in game made only from the kit. Not on the hub. |
| `tools/qa/adapters/remake_kit.js` | The Gameplay checks for it (8 tests). |

**No live game loads this yet.** A remake's build inlines `remake_kit.js` the same way kit.js is inlined into a test copy. Nothing here needs the ChatGPT review until it moves into a shared file.

## See it

Open `games/new/remake_kit/demo.html?set=slope`. The Look buttons bottom left switch between three looks (pixel, cartoon, dungeon) to show that a game changes its look with a few variables, not by rewriting the kit. Any of the 20 question sets works: `?set=mult`, `?set=plot`, and so on.

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

- The header shows "1 of 2", "2 of 2", then "Spare question", with a row of boxes that fill in green or red. The spare box only appears after a miss.
- Keys 1 to 4 answer, Space or Enter goes on. A right answer moves on by itself. A miss holds for 2 seconds so the reason gets read.
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
| `--rk-key-face`, `--rk-key-text`, `--rk-key-rim`, `--rk-key-low` | Every key cap: controls card, small keys line, F hint, answer numbers |
| `--rk-heart`, `--rk-heart-off` | Hearts |
| `--rk-dim`, `--rk-over` | The dim behind a card, and the title and end screen background (put the title painting here) |

Sizes are set so no kit text is under 11px on a 1366 by 620 Chromebook screen. Keep `--rk-word` text in mixed case when the font is Pixelify Sans (its capitals are hard to read).

## What is checked

`node tools/qa/run.js remake_kit` (about 4 minutes) plays the demo with real keys and clicks:

1. The shared baseline: start, answer, move, game over, end screen, Play again resets.
2. Every answer pattern (RR, RWR, WRR, RWW, WRW, WW) gives the right count, and the markers read "1 of 2", "2 of 2", "Spare question".
3. A reload comes back on the same question, and a miss can not be retried.
4. The card owns the keyboard: held keys do not answer, arrows do not move the player, Space does not skip.
5. All 20 question sets fit the card: one right answer, nothing off screen, no text spilling.
6. Title screen in all three looks: Back to Arcade top left, no header, pixel arrows and WASD the same size, "or" on the bottom row, no text under 11px.
7. HUD: nothing boxed, survival left, score right, readable.
8. End screen: mashing keys does not skip it, plain stats, the score counts up.

A remake built on the kit still gets its own adapter for its own rules. These checks cover the shared parts so the remake's tests do not have to.

## Not in here yet

- The upgrade pick (three cards after a right answer) and the pause box. Each game still does those its own way.
- Sound. The card calls `env.snd.open`, `right`, `wrong` and `next` if the game passes them (see the spitz-sound skill).
- Moving this into `games/kit.js` itself. That is a shared file, so it needs the ChatGPT review and Kody's "push it". It can wait until one remake has shipped on the kit.
