#!/bin/bash
# Usage: ./run.sh <test.sql> [extra.sql ...]   builds a throwaway Postgres with the live snapshot, applies extras, runs the test.
set -e
HERE=$(cd "$(dirname "$0")" && pwd); ROOT=$(dirname "$HERE")
BIN=/usr/lib/postgresql/16/bin; D=$(mktemp -d); PORT=$((5500 + RANDOM % 400))
chown -R postgres "$D" 2>/dev/null || true
run() { if [ "$(id -u)" = 0 ]; then su postgres -c "$*"; else bash -c "$*"; fi; }
run "$BIN/initdb -D $D/db -A trust -U postgres >/dev/null"
run "$BIN/pg_ctl -D $D/db -o '-p $PORT -k $D' -l $D/log start -w >/dev/null"
P="psql -h $D -p $PORT -U postgres -d postgres -v ON_ERROR_STOP=1 -q"
trap 'run "$BIN/pg_ctl -D $D/db stop -m fast >/dev/null"; rm -rf $D' EXIT
for f in "$HERE/stubs.sql" "$HERE/tables.sql" "$ROOT/live_snapshot/functions_2026-11-17.sql" "$HERE/triggers.sql" "$HERE/helpers.sql" "${@:2}" "$1"; do
  $P -f "$f" >/dev/null 2>$D/err || { echo "ERROR in $f:"; cat $D/err; exit 2; }
done
$P -At -F ' | ' -c "select case when ok then 'ok  ' else 'FAIL' end, name, coalesce(detail,'') from t.results order by n"
$P -At -c "select count(*) filter (where not ok) from t.results" | { read f; echo "--- $f failing"; [ "$f" = 0 ]; }
