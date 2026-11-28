# Burger Blaster remake: go-live list (nothing here is live until Kody says "push it")

This PR holds every step below. Steps 2 to 4 touch shared files, so the ChatGPT review (tools/review/README.md) comes before "push it".

1. **The page.** games/burger_blaster.html = `bash build.sh` output (v25). The old game is kept as base_burger_blaster.html.
2. **Score board (games/scorecode.js).** The remake KEEPS id 13. The code holds the game in 5 bits (ids 1 to 31) and all 31 are taken, so a new id (32) would have been read as Super Jump Man (found by the ChatGPT review, 2026-11-27). Old and new Burger Blaster codes share one board until Kody decides otherwise; the Thanksgiving leaderboard reset clears the old ones anyway. A separate "before remake" board needs a wider code layout first (a shared-file change of its own).
3. **Save key.** The remake saves under `burger_blaster_v2`; the 20-minute list in scorecode.js now names that key.
4. **Hub (games/catalog.js).** `UNLOCK` entry `burger_blaster:null` = secret link, off the hub and leaderboard until Kody picks a date. KODY'S CALL: this takes the current Burger Blaster off the hub until then (as Jump Man did). To swap it in place instead, put the old date back (`'2026-10-26T12:00'`). New hub card picture games/cards/burger_blaster.webp (a v25 screenshot).
5. **Gameplay checks.** tools/qa/adapters/burger_blaster.js is the new adapter (baseline + 6 scenarios) and the app is tier 2 in tools/qa/apps.json.
6. **After.** News post, _mult copy to Downloads\Spitz new games\.

Known and left alone: the test hooks (window.__G, __G2, the hidden #bl-skip button) are open on the site, as in the old Burger Blaster. Star Swarm HD shows how to make them read-only off localhost.
Still open with Kody: his own play test of v25, the title painting slingshot repaint (briefs/), the name for the old board.
