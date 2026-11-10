# Off the Clock — graduate-school workspace

Static single-page client for GitHub Pages at `/grad-school/`. The current UI is a temporary visual version and may be redesigned; the backend contracts must be preserved.

## Backend contract

Supabase project: `pkonclmfrpozizmmtnrv`. `config.js` contains only a browser-safe publishable key. **Do not add service-role keys or private coursework.**

Private Postgres table: `public.grad_profiles` with `user_id` (PK, auth user FK), `data` (JSONB application document), `revision` (bigint, starts at 1) and `updated_at`. Database RLS limits select/insert/update/delete to matching authenticated owner. A trigger increments `revision` after each update.

The client reads `data,revision` for the signed-in user. On first save it **inserts**. Subsequent saves **update only when revision matches** the last loaded revision. A zero-row update is a conflict, not a successful save. The user must export local edits and explicitly reload the remote copy or resolve the conflict before retrying. Focus/visibility reloads never discard unsaved changes.

Task data shape: `{ version:4, courses:[{id,name,description}], tasks:[{id,course,title,due,target,status,submission,notes}] }`. `due` is a verified Brightspace date or empty; `target` is a personal work target. Values for `status`: `todo|inprogress|done`; for `submission`: `unconfirmed|submitted`. Never equate `done` with `submitted`. Empty due date is **unverified**.

## Auth requirements (manual Supabase setup)

1. Auth > Email Templates > Magic Link: show `{{ .Token }}` for the code-based flow.
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

The live email and cross-device login flows cannot be declared verified until the site is deployed and the Supabase email template is configured.
