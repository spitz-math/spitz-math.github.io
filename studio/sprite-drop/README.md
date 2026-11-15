# Sprite Drop (spitz.dev experiment 1)

**Question:** can ChatGPT hand an image it just generated to a tool as real bytes, with nobody downloading or uploading it, and can Claude fetch those exact bytes later in a different session?

It's a throwaway test bridge. It lives in its **own Supabase project** and never touches Off the Clock's bridge, database or sign-in. Nothing here changes the arcade or any game.

## What's here

| File | What it is |
|---|---|
| `supabase/functions/sprite-drop/index.ts` | Sign-in wiring (Supabase OAuth 2.1, the same pattern as the Off the Clock bridge). |
| `supabase/functions/sprite-drop/tools.ts` | The three tools. |
| `supabase/functions/sprite-drop/image.ts` | Pure helpers: file-type check, pixel dimensions, safe storage paths. |
| `supabase/functions/sprite-drop/*.test.ts` | Tests (see the end of this README). |
| `sprite-drop.bundle.ts` | The same function as ONE file, for pasting into the Supabase dashboard. |
| `supabase/migrations/20261115000000_sprite_drop.sql` | Private bucket and two tables, with owner-only row-level security. |
| `consent/index.html` | The hidden approval page (`spitzmath.com/studio/sprite-drop/consent/`), noindex and unlinked. |

## Tools

| Tool | What it does |
|---|---|
| `drop_asset` | Takes an image as `file` (ChatGPT's file passing, `openai/fileParams`), `url`, or `image_base64`. It downloads the bytes **immediately**, because ChatGPT links expire. It checks the real file type from the bytes (PNG, JPEG, WebP or GIF only, 10 MB max) and stores the file in the private bucket. It records the task ID, file name, MIME type (both the real one and the declared one), size, width × height and SHA-256. The same file on the same task is never stored twice. |
| `list_assets` | Saved images, newest first. It also lists the last 10 **drop attempts, including failed ones, with the step that failed**. |
| `get_asset` | Re-reads the stored bytes and re-checks them against the saved checksum (`checksum_matches`). It shows the image, gives a download link that expires in 10 minutes, and can return the raw bytes as base64 (up to 1 MB). |

Every `drop_asset` call writes a row to `studio_drop_log` with a `stage`: `input` (no image arrived), `download` (the link failed), `check` (the bytes weren't an image), `decode`, `store`, `record`, `saved` or `duplicate`. It also records what arrived: the keys of the `file` object, `file_id`, the declared MIME type and name, and the link's host. It never stores the full link. This is how we document exactly where a transfer fails.

**Security:** the bucket is private, and every query runs as the signed-in user under row-level security, with no service-role key. Download links expire after 10 minutes. There is an optional owner lock (`SPRITE_DROP_OWNER_EMAIL`). After the first sign-in, new sign-ups get switched off.

---

## Setup (Kody, one time, about 20 minutes)

### 1. New Supabase project
In supabase.com, click **New project** and name it `sprite-drop`. Use the free plan, any region near you, and any strong database password (you won't need it).
Then send Claude two things from **Project Settings → API Keys / Data API**: the **Project URL** (`https://xxxx.supabase.co`) and the **Publishable key** (`sb_publishable_…`). Both are meant to be public. Don't send the secret or service-role key. Claude puts them into the sign-in page.

### 2. Tables and bucket
Go to **SQL Editor → New query**, paste all of `supabase/migrations/20261115000000_sprite_drop.sql`, and click **Run**.

### 3. Signing keys
Go to **Project Settings → JWT Keys**. If you see **Migrate JWT secret**, click it, then **Rotate keys**. New projects may already be set up, and then there's nothing to do.

### 4. Deploy the function
Pick one:
- **Dashboard:** go to **Edge Functions → Deploy a new function → Via Editor**. Name it `sprite-drop`. Replace the starter code with all of `sprite-drop.bundle.ts`, then click **Deploy**. Then open the function's **Settings** and turn **Verify JWT** OFF. The function checks sign-in itself, the same as the Off the Clock bridge.
- **Command line** (from a clone, in `studio/sprite-drop/`): put the project ref in `supabase/config.toml`, then run
  `npx supabase login` and `npx supabase functions deploy sprite-drop --project-ref <ref> --no-verify-jwt`

### 5. Sign-in settings
- **Authentication → URL Configuration:**
  - Set **Site URL** to `https://spitzmath.com/studio/sprite-drop/`.
  - Add the Redirect URL `https://spitzmath.com/studio/sprite-drop/consent/**`.
- **Authentication → OAuth Server:**
  - Turn it **on**.
  - Allow **dynamic client registration**.
  - Set **Authorization path** to `consent/`, so the approval page is `https://spitzmath.com/studio/sprite-drop/consent/`.
- **Authentication → Sign In / Providers:** Email stays on (the default). Sign-in is by email link, so no GitHub app is needed.

### 6. The approval page goes live
Once Claude has the URL and key, Claude opens the PR. Say "push it" and the hidden page goes up. Only that page and this folder change. No games or site pages change.

## Connect

Connector URL: `https://<your-ref>.supabase.co/functions/v1/sprite-drop`

- **ChatGPT (web):**
  1. Go to **Settings → Apps & Connectors → Advanced** and turn on **Developer mode**.
  2. Create a connector named **Sprite Drop** with the URL above and **OAuth**.
  3. The approval page opens. Enter your email, open the link in the email, then click **Approve**.
- **Claude:**
  1. Go to **claude.ai → Settings → Connectors → Add custom connector**.
  2. Use the same URL and approve the same way.
- **Then lock it:**
  1. Go to **Authentication → Sign In / Providers** and turn off **Allow new users to sign up**.
  2. In **Edge Functions → Secrets**, add `SPRITE_DROP_OWNER_EMAIL` = the email you signed in with.

---

## The test

### Test 1: freshly generated image, passed directly (in ChatGPT web, a NEW chat with Sprite Drop turned on)

Paste this:

```
This is a technical test of the Sprite Drop connector. The art quality does not matter.

1. Generate one image: a pixel-art heart made of glowing cyan crystal (about #3CEBFF, near-white highlight, deep teal shadow) with two small ivory feathered wings, near-black 1-pixel outline, on a transparent background. Square pixels, no anti-aliasing.
2. Right after it is generated, call the Sprite Drop tool drop_asset with:
   - task_id: "rook-and-ruin/second-wind"
   - file: the image you just generated in this conversation
   - file_name: "second_wind_test1_direct.png"
   - note: "Test 1: generated image passed directly, no download or upload by Kody"
3. Do NOT ask me to download or upload anything. If you cannot pass the generated image as the file, say exactly that, quote any error, and tell me whether drop_asset was offered the image at all.
4. Report the tool's full reply (saved, size, width x height, sha256, or the error with its [stage]).
```

### Test 2: the same image, re-attached (only if Test 1 fails)
Download the image ChatGPT made, attach it in the **same chat**, and paste:

```
Test 2. I attached the image you generated. Call drop_asset with task_id "rook-and-ruin/second-wind", file = the image I just attached, file_name "second_wind_test2_reattached.png", note "Test 2: same image, re-attached by Kody". Report the tool's full reply.
```

### Test 3: Claude fetches it in a separate session
In a new Claude thread (with the Sprite Drop connector on), ask: "Use Sprite Drop: list_assets for rook-and-ruin/second-wind, then get_asset with include_base64 for the newest one. Check that checksum_matches is true, the size and sha256 match what ChatGPT reported, and the dimensions. Then decode the bytes and confirm the PNG opens." Claude can also put it into a Rook & Ruin **test copy** (not the site).

### Test 4: still there later
A day later, in another new Claude session, run `get_asset` again. Pass means `checksum_matches: true` and the same sha256.

### Test 5: phone (record only)
Repeat Test 1 once in the ChatGPT phone app and note what happens. Off the Clock's `attach_reading` showed phone uploads don't pass files, and we want to know if generated images behave the same.

## Results (fill in)

| Test | Result | Where it stopped (stage / ChatGPT message) | sha256 | size, w×h |
|---|---|---|---|---|
| 1 Direct generated image | | | | |
| 2 Re-attached image | | | | |
| 3 Claude fetch (new session) | | | | |
| 4 Next-day fetch | | | | |
| 5 Phone | | | | |

Notes on limits found (file size, auth prompts, web vs phone):

## Clean up after the experiment
Delete the hidden page folder `studio/sprite-drop/consent/` from the site, remove the connectors, and pause or delete the `sprite-drop` Supabase project. If the Studio board gets built, it starts from this code.

## Tests
- `node --experimental-strip-types --test supabase/functions/sprite-drop/image.test.ts`: file types, dimensions (PNG, JPEG, WebP lossy and lossless, GIF), safe paths, and links never logged.
- `npx deno test --allow-net --allow-env --allow-read supabase/functions/sprite-drop/tools.int.test.ts`: all three tools over real MCP calls, using an in-memory stand-in for Supabase and fake ChatGPT file links. It covers: a file drop stored with the right size and dimensions, duplicates refused, `get_asset` returning byte-identical data with `checksum_matches`, and each failure stage (no image, expired link, HTML instead of image, bad base64) logged with its stage and nothing stored.

## Task Drop (spitz.dev experiment 2)

Four more tools on the same function: `create_task`, `list_tasks`, `get_task`, `post_message` (code in `tasks.ts`,
database rules in `supabase/migrations/20261115120000_task_drop.sql`). The author of every task and message comes
from the signed-in app (claude.ai or chatgpt.com), never from an argument. Messages are append-only, `request_key`
makes retries safe, and changing status or turn needs the task's current version.

### Acceptance test result (2026-11-15): PASSED

Kody typed only four prompts, each in a fresh chat with Sprite Drop on. Nothing was copied between chats.

| Step | Who | What the database shows |
|---|---|---|
| Create | Claude | Task "Shopkeeper dialogue review" (rook-and-ruin), created_by claude, turn chatgpt, version 1 |
| A | ChatGPT | seq 1 review (3 new lines rated for warmth, brevity, middle-school fit) |
| B | ChatGPT | seq 2 decision: use line C as a later-visit greeting, set_turn claude |
| B | Claude | seq 3 note acknowledging it (no game change), set_status done |
| C | ChatGPT | read-only calls after 21:06:54 UTC, no new rows; reported the final status and history |

One task, three messages, version 4, status done, no duplicates, no conflicts, no errors in the function logs.
