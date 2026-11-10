# Codex / ChatGPT — SpitzMath Engineering Guide

Read `docs/off-the-clock/PROJECT_BRIEF.md` and `CLAUDE.md` before modifying `grad-school/`. Work in branches and PRs; never merge without the owner's approval.

## Assignment
Own technical integration: Supabase email OTP, signed-in data access, sync between devices, error handling, backup/restore, and tests. Preserve Claude's owner-approved visual interface; don't redraw it as a generic dashboard.

## Backend contract
- Project ref: `pkonclmfrpozizmmtnrv`
- Table: `public.grad_profiles` with `user_id` referencing `auth.users`, `data jsonb` and `updated_at`.
- Enforce per-user row-level security. Test that anonymous requests fail and other users cannot read or write someone else's record.
- Use only a **publishable** Supabase key in public JavaScript; never use a service-role/secret key in frontend code.
- A PIN or hidden URL is not access control. Avoid placing real coursework or personal emails in GitHub.
- Never silently overwrite newer cloud updates. Explicitly handle concurrent writes, stale caches, expiry, offline mode and failed saves.
- Finished versus submitted is distinct. Unverified dates must not lead to false "all done" status.
- Keep any database migration non-destructive and reviewed.

## Delivery
Review Claude's PRs for functionality and security with specific actionable comments. Implement backend changes in scoped branches, preserve existing pages, and run the current `.github/workflows/smoke.yml` safety check. Describe what was and was not tested. No automatic merging or production changes.
