# Super Jump Man: go-live list (nothing here is done until Kody says "push it")

The game itself is built by `python3 build.py` into out/jump_man_multiplication.html. Going live means the steps below.
Steps 2 to 4 touch shared files, so they need the ChatGPT review (tools/review/README.md) before "push it".

1. **The page.** Copy out/jump_man_multiplication.html over games/jump_man_multiplication.html. The build no longer reads that file
   (it reads base_jump_man.html, the frozen old game), so it can be rebuilt afterwards.
2. **Score board (games/scorecode.js).** Same pattern as Star Swarm HD:
   - rename the old entry: `jump_man_v1:[4,'Jump Man (before Super)','points']`
   - add a new id at the end: `jump_man_multiplication:[31,'Super Jump Man','points']` (use the next free id; 30 is Star Swarm HD, 28 is reserved)
   - bot runs score about 1,300 to 9,400, far under the 1,048,575 a code holds, so no "tens" flag
   - teacher.html: old codes should land on the "before Super" board
3. **Save key.** In remaster.js/build.py change KEY from `jump_man_facts_v1` to `super_jump_man_v1` and put the same key in the
   20-minute list in scorecode.js (`jump_man_multiplication:'super_jump_man_v1'`). Old saves are already refused (save ver 6), so this is tidiness.
4. **Hub (games/catalog.js).** name 'Super Jump Man', the approved card art (art/hubcard_abb2f21c.b64 -> games/cards/jump_man_multiplication.webp),
   `UNLOCK` entry `jump_man_multiplication:null` (secret link, off the hub and leaderboard) until Kody picks a date; then the Monday date for the NEW badge.
5. **Gameplay check.** Copy qa_adapter_jump_man.js to tools/qa/adapters/jump_man_multiplication.js and add to tools/qa/apps.json (shared):
   `{"id":"jump_man_multiplication","name":"Super Jump Man","tier":1,"adapter":"adapters/jump_man_multiplication.js","paths":["games/jump_man_multiplication.html","games/src/jump_man_remaster/","games/cards/jump_man_multiplication.webp","tools/qa/adapters/jump_man_multiplication.js"]}`
   Tried 2026-11-27 on a scratch copy of main with the v33 page: baseline play-through PASS (13 s).
6. **Branch.** claude/project-thread-83orxb is behind main (kit.js, scorecode.js changed on main since). Merge main first and rebuild.
7. **After.** News post, _mult copy to Downloads\Spitz new games\, old Jump Man source stays as base_jump_man.html.

Known and left alone: the test hooks (window.__G) are open on the site, as in the old Jump Man; Star Swarm HD shows how to make them read-only off localhost.
