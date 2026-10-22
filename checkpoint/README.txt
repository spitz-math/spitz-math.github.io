SPITZ CHECKPOINT
================

What's in this folder
  player.html              The test player (the whole engine).
  tests/index.js           The list of tests.
  tests/<id>/              One folder per test: test.js, img/ (graphs), rat/ (TEA explanations)
  refs/                    Reference sheets
  single/                  Each test as one self-contained file. Saves on that computer only, no Session ID.
  apps-script/Code.gs      The saving backend for your Google Sheet (see SETUP below)

Two ways students can use it
  1. Saved to your Sheet (use this in class): the Apps Script web app link. Students type first name,
     class period and a Session ID. Their school Google account identifies them; emails are never stored.
  2. Practice only: player.html on GitHub, or a single/ file. Work is kept on that computer only.

Adding a test
  1. Make a folder in tests/ (for example tests/alg1-2024/) with test.js, and img/ and rat/ if needed.
  2. Add one line for it in tests/index.js. Push to GitHub. Nothing else changes.

SETUP (one time)
  A. GitHub: put everything in this folder except apps-script/ into a folder named "checkpoint" in the
     spitz-math.github.io repository, so this works:  https://spitz-math.github.io/checkpoint/player.html
     (If you use a different folder, change GH_ROOT at the top of Code.gs.)
  B. Make a new Google Sheet on your school account, for example "Spitz Checkpoint Results".
  C. In the Sheet: Extensions > Apps Script. Delete what's there, paste all of apps-script/Code.gs, Save.
  D. In the Apps Script editor, pick "setup" in the function drop-down and click Run. Allow the
     permissions it asks for. This makes the Sessions and Attempts tabs.
  E. Deploy > New deployment > type: Web app. Execute as: Me. Who has access: Anyone within
     misdtx.net. Deploy and copy the web app link. That link is what students open.
  F. Reload the Sheet. Use the "Spitz Checkpoint" menu > New session... and type the test ID
     (for example alg1-2025). Give students the Session ID it shows.

Each session (Sessions tab)
  Status   Open = students can sign in. Closed = only students who already submitted can sign in
           (to see results).
  Review   Nothing = students only see "your test was submitted."
           Score only = score and level, no question review (the default).
           Score + review = everything, including TEA explanations.
  Changes take effect right away; a student on the results page sees them within about 30 seconds.

Attempts tab
  One row per student per session. Student Code is a scrambled code, not the email. State, Items and
  Events hold the saved answers and activity record for the dashboard (next step). Don't edit those
  columns. Sorting or deleting rows is fine.

After changing player.html
  Push it to GitHub, then Spitz Checkpoint menu > Reload the player from GitHub (or wait 10 minutes).
  No redeploy needed. Only redeploy (Deploy > Manage deployments > edit > New version) when Code.gs changes.
