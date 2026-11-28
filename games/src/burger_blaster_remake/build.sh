#!/bin/bash
# Burger Blaster remake build: frozen old game -> look -> rules -> art/feel -> out/burger_blaster.html (+ optional offline _mult copy)
# usage: bash build.sh [mult_out.html]
set -e; cd "$(dirname "$0")"; mkdir -p out
python3 look_patch.py base_burger_blaster.html out/_look.html
python3 rules_patch.py out/_look.html out/_rules.html 10
python3 art_patch.py out/_rules.html out/burger_blaster.html
rm out/_look.html out/_rules.html
if [ -n "$1" ]; then cp out/burger_blaster.html ../../_bb_build.html; (cd ../.. && python3 src/burger_blaster_remake/build_mult.py _bb_build.html "$1" "$PWD/"); rm ../../_bb_build.html; fi
