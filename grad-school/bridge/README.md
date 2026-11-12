# Off the Clock bridge (Claude ↔ ChatGPT)

The bridge is one small MCP server that both ChatGPT and Claude connect to as a custom connector. It runs as a Supabase Edge Function in the Off the Clock project (`pkonclmfrpozizmmtnrv`). Each AI signs in as Kody through Supabase's OAuth 2.1 server, so every query runs under Kody's own row-level security. It uses no service-role key.

URL once deployed: `https://pkonclmfrpozizmmtnrv.supabase.co/functions/v1/otc-bridge`

## Tools

| Tool | What it does |
|---|---|
| `project_rules` | Who owns what (Claude = look, ChatGPT/Codex = data and sync), plus the data rules. Read it first. |
| `read_board` | Handoff notes, tasks and questions between the two AIs. |
| `post_note` | Leave a handoff after a change, a task for the other AI, or a question for Kody. |
| `update_note` | Claim a task, reply, or mark it done. |
| `get_tracker` | Courses and assignments with ids, dates, steps, and finished/submitted state. |
| `get_briefing` | Read-only daily/weekly snapshot. Lead with `needsSubmission`: finished, submission-required work not yet confirmed submitted, regardless of due date. |
| `suggest_catch_up` | Read-only proposals for missed step plan dates; does not save changes. |
| `add_assignment` | Add an assignment. It is never added as submitted. |
| `update_assignment` | Change dates, notes and steps, or mark it submitted when Kody says it's turned in. |

Tracker writes use the same revision guard as the site. If the site saved in between, the bridge reloads and re-applies that one change, up to 3 tries. If the site is open with unsaved edits, the site shows its normal conflict message.

`get_briefing` requires the user's local `today` (`YYYY-MM-DD`). Its `needsSubmission` entries use the same fields as `dueThisWeek` and `overdueAssignments`, sorted by verified due date (earliest first, unverified dates last), then title. Empty `due` stays empty; `target` is never used as an official deadline. Entries remain in the existing deadline lists when applicable. The projection never changes completion or submission state. After merging bridge changes, redeploy the Edge Function (or rebuild and deploy the dashboard bundle) before expecting them in connected tools.

Files:
- `supabase/functions/otc-bridge/index.ts`: sign-in wiring.
- `tools.ts`: the tools.
- `logic.ts`: pure data rules, tested by `logic.test.ts`. Run it with `node --experimental-strip-types --test grad-school/bridge/supabase/functions/otc-bridge/logic.test.ts`.
- `supabase/migrations/…_bridge_notes.sql`: the handoff board table, owner-only RLS. It does not touch `grad_profiles`.
- `../oauth/consent/`: the approval page that opens when an AI asks to connect.

## One-time setup (Kody, in the Supabase dashboard)

1. **Handoff board table.** Open SQL Editor, paste `supabase/migrations/20261112000000_bridge_notes.sql`, and run it.
2. **Signing keys.** Go to Project Settings, then JWT Keys. Click **Migrate JWT secret**, then **Rotate keys**. Supabase's docs say no one gets signed out. Off the Clock uses the publishable key, which doesn't depend on the JWT secret. Don't revoke the legacy secret yet.
3. **OAuth server.** Go to Authentication, then OAuth Server, and turn on the OAuth 2.1 server.
   - Allow **dynamic client registration**, so ChatGPT and Claude can register themselves.
   - Set the **Authorization path** so the full approval URL is `https://spitzmath.com/grad-school/oauth/consent/`. The path is added to the Site URL `https://spitzmath.com/grad-school/`, so try `oauth/consent/`.
4. **Redirect URL.** In Authentication, then URL Configuration, add `https://spitzmath.com/grad-school/oauth/consent/**` to Redirect URLs. This lets the GitHub sign-in on the approval page come back to it.

## Deploy

From `grad-school/bridge/`, run:

```
npx supabase login
npx supabase functions deploy otc-bridge --project-ref pkonclmfrpozizmmtnrv --no-verify-jwt
```

`config.toml` has no `[auth]` block on purpose, so nothing here can overwrite the live sign-in settings.

## Connect

- **ChatGPT** (web, Plus/Pro/Edu):
  1. In Settings → Apps & Connectors → Advanced, turn on Developer mode.
  2. Create a connector with the URL above and OAuth authentication.
  3. Approve on the Off the Clock page that opens.
  ChatGPT asks before each tool that changes data.
- **Claude:** Settings → Connectors → Add custom connector. Use the same URL, then approve the same way.

First test: ask ChatGPT to "use Off the Clock: read project_rules, then post a hello note on the board". Then ask Claude to read the board.

## Rules (also served by `project_rules`)

- Never commit coursework, dates, names or grades. They live only in Kody's private data.
- Never add secrets. `config.js` holds only the publishable key.
- Finished is not submitted. Only mark an assignment submitted when Kody says it's turned in.
- A due date comes from Brightspace or the syllabus, or stays empty.
- Don't change `grad_profiles`, its RLS, or the revision guard without Kody's OK.
