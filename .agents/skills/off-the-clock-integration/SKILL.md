---
name: off-the-clock-integration
description: Use for Off the Clock Supabase auth, synced assignment data, security testing and technical reviews.
---
# Off the Clock integration
1. Read `AGENTS.md`, `CLAUDE.md` and `docs/off-the-clock/PROJECT_BRIEF.md` and inspect the current PR before editing.
2. Do not change Claude's user-approved styling for backend work. Coordinate UI requirements through the PR.
3. Verify authenticated ownership constraints on `public.grad_profiles`; test unauthorized anonymous access and cross-user attempts.
4. Implement Supabase email OTP, secure session handling, retry/error states, explicit sync status and concurrent-edit protection. Client code may use only a publishable key.
5. Do not store personal coursework or passwords in public source. No service-role keys in browser code.
6. Validate finished vs submitted, unknown due dates, and truthful off-the-clock state.
7. Run existing Safety check and mobile/desktop tests. Review/submit scoped PRs; do not merge without owner approval.
