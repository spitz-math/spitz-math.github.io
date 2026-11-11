# Off the Clock — infrastructure checkpoint

Recorded: 2026-11-11. Recheck GitHub before acting; this is a snapshot.

## Source inspected
- Production source branch: `main`.
- Inspected main commit: `9617f57a14190d95f2e7f2c55709a0ff9bae3be2`.
- Bridge setup PR: https://github.com/spitz-math/spitz-math.github.io/pull/103
- Setup branch: `feature/off-the-clock-agent-setup`.

## Current source capabilities
GitHub OAuth primary login, optional Magic Link fallback, owner-scoped Supabase profile storage, optimistic revision checks, assignment checklists with planned dates, daily planner cards, independent submission confirmation, and Wednesday–Tuesday course weeks are implemented.

The grad-school README records owner verification of GitHub login and normal cloud persistence on 2026-11-10. This session inspected source; it did not repeat authenticated live checks or inspect the live database.

## This checkpoint
Shared instructions now describe the existing app. WORKFLOW defines how to start sessions, transfer a task, review the exact head commit, and keep context current. The setup branch includes the inspected main source so it does not preview an obsolete app.

No account-level conversation sync, API relay, agent GitHub Action, or automatic merge is installed by this PR. Both assistants must have their own authorized access to the repository.

## Next actions
1. Review and merge setup PR #103 when the owner is ready. Until then, main does not contain these instructions; a Claude session must explicitly open the setup branch or PR to read them.
2. Open that branch in Claude Code and ask it to read the shared docs and summarize the current architecture and next action.
3. Use one small, owner-selected Off the Clock task for the first Claude implementation → ChatGPT/Codex review handoff.
4. Complete real-device verification of the new daily checklist controls; the README still identifies that check as outstanding.

Do not infer the state of personal assignments from this public checkpoint.
