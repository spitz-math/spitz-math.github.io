"""Run every regression case: python3 run_regression.py  (exit 0 only if all match)."""
import json, os, sys, tempfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import validate

HERE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fixtures', 'history')
cases = json.load(open(os.path.join(HERE, 'cases.json')))['cases']
bad = 0
for c in cases:
    with tempfile.NamedTemporaryFile('w', suffix='.json', dir=HERE, delete=False) as f:
        json.dump(c['spec'], f)
    try:
        rec = validate.run(os.path.join(HERE, c['image']), f.name)
    finally:
        os.unlink(f.name)
    ok = rec['result'] == c['expect']
    bad += not ok
    why = '; '.join(f"{r['check']}: {r['detail']}" for r in rec['checks'] if r['result'] != 'pass')
    print(f"{'ok  ' if ok else 'MISS'} {rec['result']:13} (want {c['expect']}) {c['name']}" + (f"\n       {why}" if why else ''))
print(f'\n{len(cases) - bad}/{len(cases)} cases match')
sys.exit(1 if bad else 0)
