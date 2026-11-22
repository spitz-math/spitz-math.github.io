#!/usr/bin/env bash
# Live site check (see .github/workflows/live-check.yml). Run from the repo root of the deployed commit.
#   1. Every key page and every game page answers 200 on https://spitzmath.com.
#   2. The site files this commit changed are served byte for byte (the deploy landed, not just "a" site).
# GitHub Pages can take a few minutes to show a new deploy everywhere, so step 2 retries for up to 10 minutes.
set -uo pipefail
SITE="${SITE:-https://spitzmath.com}"
fail=0

get(){ curl -sS -L --max-time 30 -A "spitz-live-check" -o "$2" -w '%{http_code}' "$SITE/$1?live=$(date +%s)" 2>/dev/null || echo 000; }

# 1. pages that must answer
pages=( "" "arcade/" "leaderboard.html" "teacher.html" "games/catalog.js" "games/kit.js" "games/questions.js"
        "games/scorecode.js" "games/sw.js" "sw.js" "data/topics.json" "data/news.json" "data/leaderboard.json" )
for f in games/*.html; do pages+=("$f"); done
for p in "${pages[@]}"; do
  code=$(get "$p" /tmp/live_body)
  if [ "$code" != "200" ]; then echo "::error::$SITE/$p answered $code"; fail=1; else echo "ok   $p"; fi
done

# 2. the files this commit changed (site files only; tools and workflows are not served)
mapfile -t changed < <(git diff --name-only --diff-filter=AM HEAD~1 HEAD 2>/dev/null \
  | grep -Ev '^(\.github/|tools/|README|CLAUDE)' | grep -E '\.(html|js|css|json)$' | head -20)
if [ "${#changed[@]}" -eq 0 ]; then echo "No served text files changed in this commit; pages-answer check only."; fi
for f in "${changed[@]}"; do
  want=$(sha256sum "$f" | cut -d' ' -f1); ok=0
  for try in $(seq 1 20); do
    code=$(get "$f" /tmp/live_file)
    if [ "$code" = "200" ] && [ "$(sha256sum /tmp/live_file | cut -d' ' -f1)" = "$want" ]; then ok=1; break; fi
    sleep 30
  done
  if [ "$ok" = 1 ]; then echo "live $f matches this deploy"; else echo "::error::$SITE/$f still isn't the deployed version after 10 minutes (last answer $code)"; fail=1; fi
done

if [ "$fail" = 1 ]; then echo "Live site check FAILED: see the errors above."; exit 1; fi
echo "Live site check passed: spitzmath.com is up and shows this deploy."
