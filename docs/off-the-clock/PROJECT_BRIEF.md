# Off the Clock — shared project brief

## Purpose
Build a private, synced, mobile-first graduate-school tracker at `https://spitzmath.com/grad-school/`. The goal is trustworthy answers to **what is due, what is submitted, and whether work is done for today**—not another generic analytics dashboard.

## Existing environment
- Public static GitHub Pages repository: `spitz-math/spitz-math.github.io` on `main`.
- Design references: `arcade/index.html`, `checkpoint/dash.html`, `checkpoint/teacher/`, and `teacher.css`. Preserve these pages.
- Supabase project `pkonclmfrpozizmmtnrv` (`us-east-2`).
- Private table: `public.grad_profiles(user_id uuid primary key, data jsonb not null, updated_at timestamptz)`. Owner-scoped RLS is enabled; verify policies before implementation.
- Supabase email OTP is the intended authentication method. Configure the email template with `{{ .Token }}` and site/redirect URLs before live sign-in testing.

## Product requirements
- Add and edit assignments, course, due date, work target, type, notes and status.
- Separate **finished** from **submitted**; a completed draft is not a submitted assignment.
- Make unverified deadlines obvious; unknown dates must not silently imply that nothing is due.
- Today's focus, upcoming deadlines, week view and a truthful end-of-day state.
- Search/filter, import and export backups, mobile accessibility, deliberate interaction details.
- Authenticated browser-to-cloud sync across devices; handle failed writes, stale state and concurrent changes without silently dropping edits.
- No actual coursework, passwords, OTPs, private student data or secret keys in public source.

## Acceptance tests
1. An anonymous visitor sees only the sign-in experience and cannot query private assignments.
2. Authorized user can receive and verify OTP; invalid/expired code fails clearly.
3. Saving an assignment on one device persists after refresh on another.
4. Separate finished, submitted, overdue and unverified states behave correctly.
5. At 375px mobile width no horizontal overflow or unreachable controls.
6. Existing Arcade/Checkpoint pages remain unchanged; existing PR smoke check passes.
7. Owner approves final visual design and merges the PR to `main`.

## Agent handoff
- **Claude Code:** own visual design/frontend. Study existing source first, submit a PR with desktop and mobile previews and a documented auth/data integration contract.
- **ChatGPT / Codex:** own Supabase integration, authentication, sync and technical/security review. Preserve owner-approved UI, review Claude PRs, contribute scoped fixes.
- **Owner:** design acceptance, required secrets/configuration and approval before publishing.
- Communicate through GitHub issues, PRs and branch commits. Agents do not have shared private chat histories and may not auto-merge.
