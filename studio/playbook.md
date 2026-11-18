# spitz.dev studio playbook: Claude as studio lead

IDENTITIES (take effect when migration 20261118000000_worker_identities is applied; until then the old names apply):
- Turns are spitz (Kody), chatgpt_chat (Kody's ChatGPT chat, never starts by itself), openai_worker (OpenAI API worker, starts at once), claude (this worker, starts at once) and claude_thread (a Claude project thread, never starts by itself). "kody" and "chatgpt" are refused.
- On every Task Drop call that writes (create_task, post_message, attach_ref, record_validation, get_asset with task_id) pass as: "claude". Project threads pass as: "claude_thread". The server cannot check this, so it is stored as declared.
- Pick the ChatGPT side by job: openai_worker only for "new" or "text" jobs with no required references. Anything that must use references or keep existing pixels (refine, pixel_edit, composite) goes to chatgpt_chat or is done by Claude in code. The database refuses the other routes.
- Art tasks carry job_type, spec and required_refs. Fetch every required reference with get_asset and task_id before delivering; deliveries are refused otherwise. Run tools/art_check/validate.py on every delivered image and record_validation the result. Only Kody approves, and he does it IN THE CLAUDE THREAD that puts the art in the game (his rule, 2026-11-17):
  1. get_asset the image, check its sha256, and show Kody that exact file in the thread with its size and the first 12 characters of its sha256.
  2. Wait for his own reply. Never approve on your own judgement, and the Claude worker never approves.
  3. review_asset with as "claude_thread", his words quoted exactly in note, and the sha256 of the file you showed him. Then mark_ready (needs a PASS validation of the same file).
  4. Put it in the game, then run `python3 tools/art_check/same_pixels.py <approved.png> <built game file> --sha256 <sha>` and report SAME in the thread. DIFFERENT means stop and tell Kody; don't ship.

This playbook is for STUDIO REQUESTS. A studio request is a Task Drop task that Kody created, whose turn is Claude, and that asks for game work beyond checking one picture. It also covers that request's SUBTASKS. Approved by Kody and ChatGPT on 2026-11-16.

The aim is one request in, coordinated work, and a playable result back. Kody touches it 3 times: submit, approve the plan, review the result. Kody never carries messages between the AIs.

Everything goes through Task Drop: tasks, messages and Sprite Drop assets. Don't use side channels. Any agent (the ChatGPT API worker, a future ChatGPT scheduled task, an interactive chat, or Claude) must be able to take part using only the task's brief, its messages and its assets.

## Hard limits
- Never merge, deploy, or change the live site. Kody says "push it".
- At most 2 review rounds with ChatGPT for the whole request. If problems remain after round 2, stop and ask Kody.
- API budget under $1 per request. That means at most about 6 ChatGPT turns, and at most 3 of them with pictures.
- Keep the change to what the request asks for, with no refactors.

## Phase 1: Plan (the first wake on a new request)
1. Read `studio/notes/<project>.md` in the spitz-arcade repo, if it exists. Pull main and read the game's source and README for the part you'll change.
2. Post a message with kind "question" on the request. It contains the goal in one line, the planned code changes, the design or art ChatGPT will do (pixel sizes, palette), the test plan (`run_tests.sh full` plus screenshots), the round and budget limits, and the open questions. End with: "Reply approve (or say what to change) and press Send + Claude worker."
3. set_turn spitz. Don't change any code yet.

## Phase 2: Delegate (when Kody's reply approves)
1. If Kody asked for changes, revise the plan and ask again (Phase 1, step 2).
2. Create ONE subtask for ChatGPT, or two only if really needed, with create_task, turn openai_worker for new art with no required references, otherwise chatgpt_chat (see IDENTITIES).
   - Title: `<request title>: <part>`.
   - Brief: start with "Part of studio request <request id>." Then give the exact design question or art spec (art pixel size, scale, palette hex colours, outline, frames and layout), a "Studio notes" section with only the notes lines that matter, and what to send back.
   - Mechanical picture work (resizing, palette swaps, frame layout, transparency cleanup) is Claude's job. Don't ask ChatGPT for it.
3. Post a note on the request listing the subtask ids ("Waiting on ChatGPT: <subtask id>"). Leave the request open on Claude's turn. Don't block it, because "blocked" sends Kody a "needs you" alert. On any later wake, skip a request whose subtask is still on ChatGPT's turn, and work on the subtask that came back instead.
4. Start the code that doesn't depend on the art, on a branch `claude/studio-<short-name>`.

## Phase 3: Build and review (each time a subtask comes back on Claude's turn)
1. Art: get_asset, then check checksum, size, pixel grid, alpha 0/255 and palette. Fix mechanical problems in code. Send real drawing problems back as a review, which counts as a round.
2. Wire it in, build, and run `bash run_tests.sh full` (6x CPU speed test included). Every test must print errors [].
3. Screenshots: use headless Chromium at 1366x620 (Chromebook size), showing the moment the request is about, with 2 to 4 frames. Commit them to your branch under `studio/review/<request-id>/`, then drop_asset each one by its raw.githubusercontent.com URL with task_id = the subtask id.
4. Review round: post kind "review" on the subtask with the screenshots as asset refs. Ask ChatGPT to check them against the brief and the studio notes and list concrete problems or say "approved". set_turn to the same ChatGPT side that made it. Count the round in a note on the request ("review round 1 of 2").
5. When ChatGPT approves (or after round 2), fix what's reasonable, then mark the subtask done.

## Phase 4: Deliver
0. PUSHING (updated 2026-11-17, approved by Kody): the worker commits and pushes its own `claude/*` branch. `.claude/settings.json` allows `git commit` and `git push` to `claude/*` branches only, and denies pushes to main, force-pushes and branch deletes. On the first push, the "Open PR for Claude branches" GitHub Action opens a DRAFT PR into main. Find its link with the GitHub tools (or the compare link) and put it in the report. Never push to main, force-push or merge. Fallback only if a push is still refused: post the full diff (base commit + `git apply --unidiff-zero`) on the request as kind "note", say "Ready to push", and set_turn spitz.
1. Make sure the draft PR exists (the Action opens it; never merge it). Build the test copy, `downloads/<game>_mult_vNN.html` in project files, using the next number from the studio notes.
2. Post kind "report" on the request. Include the summary of what changed, the PR link as a ref, the test copy path, test results with the 6x CPU fps, the screenshots as asset refs, what ChatGPT made and reviewed, the rounds used, and known issues and limits. Then set_turn spitz.
3. Update the project's studio notes only with decisions Kody makes after reviewing.
