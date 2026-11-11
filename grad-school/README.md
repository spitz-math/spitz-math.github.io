# Off the Clock — graduate-school workspace

Static single-page client for GitHub Pages at `/grad-school/`. The look follows the Spitz Math site (same fonts and calm side bar as the Checkpoint dashboard, burger orange as this area's accent, dark by default with a light option). All styling lives in `ui.css`; `index.html` keeps every element id the script uses. Backend contracts must be preserved when the look changes.

## Backend contract

Supabase project: `pkonclmfrpozizmmtnrv`. `config.js` contains only a browser-safe publishable key. **Do not add service-role keys or private coursework.**

Private Postgres table: `public.grad_profiles` with `user_id` (PK, auth user FK), `data` (JSONB application document), `revision` (bigint, starts at 1) and `updated_at`. Database RLS limits select/insert/update/delete to matching authenticated owner. A trigger increments `revision` after each update.

The client reads `data,revision` for the signed-in user. On first save it **inserts**. Subsequent saves **update only when revision matches** the last loaded revision. A zero-row update is a conflict, not a successful save. The user must export local edits and explicitly reload the remote copy or resolve the conflict before retrying. Focus/visibility reloads never discard unsaved changes.

Task data shape: `{ version:4, courses:[{id,name,description,instructor}], tasks:[{id,course,title,due,target,status,submission,notes,checklist,submissionRequired}] }`. `due` is a verified Brightspace date or empty; `target` is a personal work target. Values for `status`: `todo|inprogress|done`; for `submission`: `unconfirmed|submitted`. Never equate `done` with `submitted`. Empty due date is **unverified** for a Brightspace assignment; preparation tasks with `submissionRequired:false` can have no official deadline.

### Academic week schedule
- The **academic week is Wednesday–Tuesday**, not a rolling seven-day span. Both the current-week progress ring and calendar strip use these boundaries. The Week view supports previous/current/next week navigation, including planning the next course week before it starts.
- Optional `weekCalendar:{anchorStart:"YYYY-MM-DD",anchorNumber:integer}` in private `grad_profiles.data` maps a dated Wednesday onto an academic week number. For this user's fall 2026 module, private settings anchor **Week 4 to Wednesday 2026-11-11**, which makes **Week 3 = 2026-11-04–10**, **Week 4 = 2026-11-11–17**, **Week 5 = 2026-11-18–24**. This anchor must never be hardcoded into the public site.
- Date math is calendar-day based to avoid DST time-of-day drift. Legacy data without `weekCalendar` still displays Wednesday–Tuesday and generic "COURSE WEEK" labels. This new field is normalized on load and preserved in backups.
- Do not shift individual assignment deadlines: terms/week boundaries and verified Brightspace dates are independent.

### Checklists
- `checklist`: optional ordered array of up to 32 objects `{id:string,text:string,done:boolean,planDate?:string}` (labels capped at 180 characters). `planDate` is an optional personal `YYYY-MM-DD` work date, independent of the assignment’s official `due` and `target`. Older records/backups normalize absent dates to `""`; import/export round-trips each date.
- Users can add/edit/delete steps in the private assignment editor, apply a paper/video/discussion/reading template, and tick steps directly within expandable rows on the Mission, Assignments, and Week views. Toggling a step saves using the existing optimistic `revision` guard.
- **Daily planner:** The Week view has seven Wednesday–Tuesday day cards with linked checkboxes for each dated step, plus a same-day preview on Mission. Marking a step on a day card updates the underlying assignment checklist and its progress everywhere via the same Supabase save. Each day also displays official due dates separately.
- Users can move an individual step between days using its day-card selector or edit its planned date in the assignment dialog. Steps lacking `planDate` are shown in an unscheduled section. The personal assignment target (or official due date if no target) is where the independent **confirm submitted in Brightspace** checkbox appears. Submitting is never inferred from finishing preparation.
- The app intentionally does not hardcode assignment steps or personal dates in GitHub; personalized scheduling is stored in private `grad_profiles.data`, updated via an optimistic revision guard.
- Preparation status follows the checklist: no steps checked = `todo`, some = `inprogress`, all = `done`. **Checking all steps does NOT submit the assignment.** The separate Brightspace confirmation checkbox maps to `submission` and remains independent; confirmed submissions still count as completed.
- `submissionRequired` defaults to `true` for legacy data. Set to `false` for offline-only preparation such as printing, which removes the Brightspace submit button and avoids treating its missing due date as an unverified course deadline.
- New checklists do not change the `grad_profiles` table schema or its owner-only row-level security. Do not hardcode coursework, teachers, or completion data into the public repo.


## Auth requirements (manual Supabase setup)

1. GitHub OAuth is the primary live login method. Its OAuth app credentials must be configured privately in Supabase Authentication > Providers; do not commit OAuth secrets. The default Magic Link remains an optional fallback but the built-in Supabase mailer has tight restrictions (custom SMTP required to customize templates).
2. Auth > URL Configuration: Site URL `https://spitzmath.com/grad-school/` and allow that redirect.
3. Email delivery must work for the intended account. Built-in Supabase SMTP only sends to organization member emails; nonmember emails require custom SMTP. Do not commit SMTP credentials.
4. After first sign-in, consider disabling new account creation (and/or an explicit admin approved-UID policy). The existing owner-based RLS ensures other users cannot access this user's data even if they create their own accounts.

## Production checks

- Anonymous users only see the login page, not the dashboard.
- Successful OTP grants a session and loads only the owning user's `grad_profiles` record.
- Save on one device and reopen on another; data persists.
- A stale revision cannot overwrite newer remote data; the client displays a conflict.
- Simulate disconnected network: show SAVE FAILED, keep data in the open tab, offer RETRY SAVE and export.
- Validate desktop and mobile display and existing SpitzMath Arcade/Checkpoint smoke tests.

The user verified GitHub OAuth sign-in and normal cloud persistence in the live site on 2026-11-10. The new checklist controls still require a real-device smoke test after deployment; authentication and RLS remain unchanged.
