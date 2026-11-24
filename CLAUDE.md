# Spitz Arcade repo: rules for Claude sessions

- Before asking Kody for "push it" on a PR that changes a shared file (tools/review/review.json: scorecode.js, catalog.js, kit.js, questions.js, sw.js, teacher.css, checkpoint/player.html, workflows, the QA runner), get the independent ChatGPT review: see tools/review/README.md.
- Every claude/* push runs the Safety check and Gameplay checks (tools/qa/README.md). When you change a game for the first time, add its adapter so it gets played, not just loaded.
- Never merge without Kody's "push it". Never change branch protection.
- Sprite Drop hand-offs: when a thread creates a task for someone else or hands one away, it schedules its own check with send_later (10 min, 20, 40, then hourly). On each check, get_task; if it is back on claude_thread's turn, take the turn. After 8 hours with no change, tell Kody what it is waiting on and stop. Nothing else wakes a Claude thread: the instant wake only covers turn "claude".
