# SpitzMath — shared engineering instructions

These instructions apply across the repository. The Off the Clock-specific guidance below applies only when working on `grad-school/`; do not redirect unrelated Arcade or Checkpoint work into that project.

## Start an Off the Clock session
1. Read `docs/off-the-clock/PROJECT_BRIEF.md`, `docs/off-the-clock/WORKFLOW.md`, `docs/off-the-clock/STATUS.md`, and `grad-school/README.md`.
2. Inspect the current remote main branch, open PRs, and the task's branch/commit before making changes. Treat STATUS as a dated snapshot; verify it against source and GitHub.
3. Use the issue or PR as the task's handoff record. Never assume access to another assistant's private conversation.
4. Keep one active implementation branch per task. Continue an existing branch only when explicitly handed that task; use a separate branch for independent work.

## Responsibilities
Claude normally leads interface design; ChatGPT/Codex normally leads integration, persistence, and technical review. These are defaults, not restrictions on the owner's requests. Preserve approved design and coordinate overlapping edits in the PR.

## Preserve the live contract
- GitHub OAuth is the current primary login. Email Magic Link is an optional fallback. Older OTP references in starter guidance are not instructions to replace working authentication.
- `public.grad_profiles` stores owner-scoped JSONB with optimistic `revision` checks. Preserve ownership enforcement and conflict handling.
- Read the actual schema and client before changing data shape. Preserve unknown/optional fields through normalization and backups.
- Finished preparation and confirmed submission are independent. Verified deadlines, personal targets, and checklist plan dates are independent.
- Course weeks run Wednesday–Tuesday; personal week anchors stay in private data.
- Keep coursework, private records, tokens, and secret keys out of this public repository. Public client keys must be browser-safe.

## Delivery and review
Work through scoped branches and PRs. Do not merge, enable auto-merge, change production settings, or deploy database migrations without owner authorization for that action. Do not change unrelated student-facing pages as part of Off the Clock work.

Record the exact tested commit, verification performed, limitations, and next action using WORKFLOW. Run the existing Safety check for code changes and relevant targeted checks; do not claim authenticated testing without doing it.

## Code Review Rules
- Flag any save path that bypasses the revision condition or treats a zero-row update as success.
- Flag regressions that expose private data or infer submission from checklist completion.
- Flag import/export or normalization changes that drop checklist dates, submissionRequired, or weekCalendar.
- Distinguish source review, synthetic tests, authenticated live checks, and owner approval.
