# ChatGPT review for shared files (tools/review)

Some files can break every game, every student's saved scores, Checkpoint or the CI with one mistake. They are listed in `review.json`, each with what a reviewer should watch for. A PR that changes any of them gets an independent ChatGPT review before Kody says "push it". Kody chose this on 2026-11-17.

## How a thread does it

1. Before asking Kody for "push it", run `node tools/review/brief.js origin/main --pr <PR url>`.
   - "No ChatGPT review needed" means you're done here.
   - Otherwise it writes `qa-out/review/brief-N.txt`. Each one fits Task Drop's 8,000-character brief.
2. Send each brief with Sprite Drop `create_task`: project `spitz-arcade`, turn `chatgpt`, title `Review: <PR title>` (add "part N" if there are several), refs `[{type: "pr", url}]`. At most 3 parts per PR. If there are more, send the riskiest files and say which you skipped.
3. The ChatGPT worker answers in about 1 to 2 minutes (`get_task`) with VERDICT: APPROVED, REVISE or BLOCKED, then hands the task to Kody's turn.
4. Check each finding against the code. Fix the real ones and push. Say why for the ones you decline. One fix round at most. If it's still REVISE or BLOCKED after that, ask Kody.
5. In the "ready for push it" message, add one line: the verdict, findings fixed or declined, and the cost (`studio_worker_runs.est_cost_usd`, about $0.08 a review).

The Gameplay checks summary on GitHub lists "ChatGPT review needed" when a branch touches these files, so a missed review is visible.

## Rules
- The reviewer is read-only and sees only the diff. It never approves a merge: only Kody does.
- Don't send secrets, student names or score data in a brief.
- Budget: the worker's monthly cap still applies ($15). A review is about $0.08.
