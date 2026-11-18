# spitz.dev M4 regression drill, 2026-11-18 03:3xZ (live database, rolled back)

Cases 1-5: `m4_regression_drill.sql` against the live Supabase project, as Kody's iPhone session, the ChatGPT and
Claude OAuth sessions, and the server key. Result: **DRILL PASSED**, 0 drill rows left afterwards.

| # | Case | Result |
|---|------|--------|
| 1 | Ember Kiln substitution | round 3 pit without fetching the source: refused. With the fetch: stored HELD. Attach / mark ready / fetch for task: refused. Sent as made from the held conversion: refused. |
| 2 | Unapproved derivative (held 1x conversion) | attach, mark ready, deliver in a message, fetch for task: all refused |
| 3 | Worker approval | ChatGPT, Claude: "Approvals cannot come from an app connected through OAuth". Server key (OpenAI worker): studio_approve, direct approval row, status update all refused; fake proof row: permission denied; proof recorder from Claude: permission denied; review_asset: retired |
| 4 | Held-file access | ChatGPT and the Claude worker: refused ("waiting for Kody's approval") |
| 5 | Missing source | refine task with no source handed to ChatGPT or created on the Claude worker: "Not ready to hand on"; held picture as source: refused |
| 6 | Unlisted game art | `tools/art_check/art_list.py check` on a Rook & Ruin test build with one extra picture: FAIL "unlisted picture near 'extra_crate'"; the real build: PASS (90 pictures, 88 unique on the list) |

art_check history: `run_regression.py` 20/20 cases match.
Exact refusal texts: see the thread report (copied from the drill output).
