# Spitz Arcade repo: rules for Claude sessions

- Before asking Kody for "push it" on a PR that changes a shared file (tools/review/review.json: scorecode.js, catalog.js, kit.js, questions.js, sw.js, teacher.css, checkpoint/player.html, workflows, the QA runner), get the independent ChatGPT review: see tools/review/README.md.
- Every claude/* push runs the Safety check and Gameplay checks (tools/qa/README.md). When you change a game for the first time, add its adapter so it gets played, not just loaded.
- Never merge without Kody's "push it". Never change branch protection.
