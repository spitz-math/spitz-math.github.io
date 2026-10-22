SPITZ CHECKPOINT
================

What's in this folder
  player.html              The test player (the whole engine).
  dash.html                The live teacher dashboard (opens only for you).
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

Teacher dashboard
  Open it from the Sheet: Spitz Checkpoint menu > Open the dashboard (or add ?view=dash to the end of the
  web app link). It only opens for the account that deployed the script; anyone else sees "only for the
  teacher", and the data calls refuse them too.
  Live       One row per student, one square per question: green correct, red incorrect, yellow partly,
             gray seen but blank, white not seen, blue outline = the question they are on now, orange
             corner = flagged. Hover a square for the TEKS, time, visits and answer changes. "Time"
             shows minutes per question instead. Status: Working, Idle (no clicks or typing for 3+ min),
             Left the test tab, No signal (no save for 100+ s: closed or offline), Paused, Stopped,
             Submitted. Click a name for the student's detail panel.
  Pause      The student's screen shows "Your teacher has paused your test" with no Resume button,
             within about 30 seconds. Resume puts them back where they were.
  Stop       Saves and stops the test without submitting. They can't continue or sign back in until
             you Unlock. Unlock lets them keep going (or sign back in) where they left off.
  Standards  Class results by reporting category and by TEKS (weakest first), a student-by-category
             table, and results and average time per question. "Submitted tests only" is on by default.
  Filters    Session chips (pick sessions for one test at a time), period, sort and name search. The
             page refreshes every 15 seconds and remembers your choices on that computer.
  The dashboard adds a Control column at the end of Attempts (blank, paused or locked). Don't edit it by
  hand; use the dashboard buttons.

After changing player.html
  Push it to GitHub. Students get it the next time they open or reload the page (GitHub Pages can take a
  minute or two to update). No redeploy needed. Only redeploy (Deploy > Manage deployments > edit >
  New version) when Code.gs changes.

How the web app page works
  Google rewrites any page an Apps Script web app serves, and that broke the player. So the web app only
  serves a tiny loader page; the student's browser downloads player.html from GitHub and shows it in a
  full-window frame. Saving still goes through Apps Script to your Sheet.
