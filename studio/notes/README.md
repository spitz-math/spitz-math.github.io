# spitz.dev studio notes

There is one file per project, named after the project slug used in Task Drop (for example `rook-and-ruin.md`). Each file holds the project's visual direction, gameplay decisions, Kody's preferences and approaches that were rejected before.

Rules
- Only write what Kody decided or said, or what was measured, and put the date on each line. Anything not in the notes is undecided. Don't write a guess as if it were a decision.
- Keep each file under about 2,500 characters, because it gets pasted into task briefs, which are capped at 8,000 characters.
- Claude, as the studio lead, updates a project's notes after Kody makes a decision on a studio request. Each update says what changed and when.

How agents get the notes
- Claude reads the file directly.
- ChatGPT and any other agent get the relevant notes inside each task brief that Claude writes. Notes travel through the normal Task Drop task, never through a side channel. That keeps them usable by any ChatGPT setup: the API worker, a native scheduled task, or an interactive chat.
