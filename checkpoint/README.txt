SPITZ CHECKPOINT
================

What's in this folder
  index.html               The clean student link: forwards to the web app.
  player.html              The test player (the whole engine).
  dash.html                The live teacher dashboard (opens only for you).
  tests/index.js           The list of tests.
  tests/<id>/              One folder per test: test.js, img/ (graphs), rat/ (TEA explanations)
  refs/                    Reference sheets
  single/                  Each test as one self-contained file. Saves on that computer only, no Session ID.
  apps-script/Code.gs      The saving backend for your Google Sheet (see SETUP below)

Student link
  spitzmath.com/checkpoint         (index.html forwards to the Apps Script web app link)
  Log Out also returns there. If you ever make a NEW deployment (not a new version), put its /exec link
  in index.html (the link with id="go") and push it. Adding ?view=dash opens your dashboard.

Two ways students can use it
  1. Saved to your Sheet (use this in class): the Apps Script web app link. Students type first name,
     class period and a Session ID. Their school Google account identifies them; emails are never stored.
  2. Practice only: player.html on GitHub, or a single/ file. Work is kept on that computer only.

Adding or replacing a test (dashboard > Tests)
  Claude hands you one zip per test, for example alg1-2024.zip (a folder with test.js, plus img/ and rat/ if
  the test has pictures, and refs/ if it needs a new reference sheet).
  1. Open the dashboard and click Tests (top right).
  2. Drop the zip on the page (or Choose a zip file / Choose a folder). The page checks it: answer keys,
     pictures, TEA explanation images, reference sheet. Problems are marked with an X and block publishing.
     "Show every question and its answer key" lists the key so you can compare it with TEA's.
  3. Preview opens the test exactly as students will see it. Nothing is saved to your Sheet.
  4. Publish. Everything goes to GitHub in one commit: the test folder, the line in tests/index.js and the
     test's single/ file. The page says "Live on the site" when GitHub Pages has updated (1-2 minutes).
  5. "Make a session for this test" gives you the Session ID (same as the Sheet menu).
  Replacing: drop a fixed version of a test that's already there. The page lists what changes (answer keys,
  points, wording, pictures) and warns you if an open session uses that test.
  Your tests: Hide/Show takes a test off the practice list (player.html without a Session ID) without
  deleting anything; Preview; New session.
  Single files: "Rebuild single files" after player.html changes (only then: each rebuild saves another 4 MB copy).
  Published test.js files are scrambled so students can't read the answer key by opening them. The Tests page
  scrambles each test when it publishes, and shows the questions and key as usual.

Building a test from the warm-up bank (dashboard > Tests > Build a test from the warm-up bank)
  The questions come from the warm-up generator. Upload it to GitHub once, as warmup/index.html in
  spitz-math.github.io (so spitzmath.com/warmup works). Until then, "Choose the generator file" loads it from
  your computer. Updating the generator on GitHub updates the builder; nothing is copied.
  1. Questions: Released (exact wording), Released with fresh numbers, or Practice generators.
     Years: untick years you don't want (for example 2025, which is also a full test here).
  2. Use + and - to pick how many questions from each standard (grouped by reporting category).
  3. Draw questions. Swap any question for another from the same standard, or remove it.
  4. Give it a title (the test ID is made from it), then Make the test. It goes through the same checks as an
     uploaded zip, including the answer-key check in the real player, then Preview and Publish.
  What the builder changes so questions look like the online test: paper wording becomes "Enter your answer in
  the box provided.", x/y lists become tables, fractions are stacked, minus signs and variables are set like the
  test, and graphs are redrawn in black (questions that name a color keep their colors). Gridded questions
  become equation-editor questions; multiselect questions are worth 2 points.
  Not yet: written explanations in review, and the warm-up's ordered-pair practice questions (skipped).
  Browsers never use an old copy of a test: tests/index.js carries a version code (v) for each test, which
  the Tests page updates on every publish.

Teachers' own questions (dashboard > My sessions > My tests > Write my own test)
  Any teacher on the Teachers tab can write a test: multiple choice, check all that apply, number answer, written answer,
  and the interactive types (equation editor, drop-down, table match, drag into boxes, plot a point, draw a line,
  drag into groups, hot spot on a grid or on the question's picture, graph an inequality, graph a system of
  inequalities, graph a function (linear, quadratic or exponential), graph an exponential curve, number line (points
  or an inequality), fill in a table, data display (bar graph, dot plot, histogram), shade a model (bar, circle, grid),
  draw a figure, fill in the blanks, label a picture, put in order, hot text, two-part)
  questions, optional reading passages (shown beside their questions) and one picture per question. Save draft keeps it in
  the Sheet only; Publish puts the questions on GitHub (tests/<id>/test.js and img/) WITHOUT the answers.
  The answers live only in the Sheet's Teacher Questions tab (one row per question; Answer is a letter like B, letters like
  A, C, or a number like 3/4; an expression like 2x + 5; one letter per drop-down, table row or box like B, A; a point
  like (2, -3); a line as two of its points like (0, 1), (1, 3); an inequality like y ≥ 2x + 1 through (0, 1), (1, 3);
  two inequalities joined by ; for a system; a function like quadratic with vertex (1, 2) through (2, 3) or
  exponential through (0, 2), (1, 3), asymptote y = 1; one letter per tile for drag into groups (A = group 1); the correct spots for a hot spot; number line points like -1 1/2, 1 or an inequality like x < 3; table boxes
  in reading order joined by ; like 6; 3; heights like Red: 4; Blue: 6; a shaded count like 3 parts shaded; a figure's corners like (-1, 1), (-3, 1), (-1, 4); blanks like 2; -3;
  one letter per spot for labels; the correct order as letters like B, A, C; hot text parts like A, B; two-part like
  A: B; B: A, C). Put-in-order items are kept in the correct order and shown mixed up. Drop-downs, table rows and tiles are in the Choices
  column. Every save from a student is scored there, so a student's computer never has the key.
  After Submit the student sees their points; the answers come only when the session is set to Score + review.
  A hand fix in the Answer column counts after Re-score. Editing a used test: Save changes, then Re-score its sessions.
  With "Check teachers' new tests" on, a new test waits for an Admin to approve it, like question bank tests.

SETUP (one time)
  A. GitHub: put everything in this folder except apps-script/ into a folder named "checkpoint" in the
     spitz-math.github.io repository, so this works:  https://spitzmath.com/checkpoint/player.html
     (If you use a different folder, change GH_ROOT at the top of Code.gs.)
  B. Make a new Google Sheet on your school account, for example "Spitz Checkpoint Results".
  C. In the Sheet: Extensions > Apps Script. Delete what's there, paste all of apps-script/Code.gs, Save.
  D. In the Apps Script editor, pick "setup" in the function drop-down and click Run. Allow the
     permissions it asks for. This makes the Sessions and Attempts tabs.
  E. Deploy > New deployment > type: Web app. Execute as: Me. Who has access: Anyone within
     misdtx.net. Deploy and copy the web app link. That link is what students open.
  F. Reload the Sheet. Use the "Spitz Checkpoint" menu > New session... (or the dashboard's Tests page) and type the test ID
     (for example alg1-2025). Give students the Session ID it shows.
  G. GitHub token for the Tests page: on GitHub, Settings > Developer settings > Fine-grained tokens >
     Generate new token. Repository access: only spitz-math.github.io. Permissions: Contents: Read and write.
     Pick the longest expiration it allows. In the Sheet: Spitz Checkpoint > Set GitHub token... and paste it
     (the first time, Google asks you to allow "Connect to an external service"). The token is kept in the
     script's properties, never in the Sheet or a browser. Spitz Checkpoint > Remove GitHub token turns it off.
     When it expires, the Tests page says so; make a new one and set it again.

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
