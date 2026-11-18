"""Art-list check: every picture inside a built game must be on the game's art list, byte for byte.

    python3 tools/art_check/art_list.py check games/rook_and_ruin.html games/new/bladebound/rook_and_ruin/art_list.json
    python3 tools/art_check/art_list.py make  games/rook_and_ruin.html games/new/bladebound/rook_and_ruin/art_list.json

Finds every embedded picture (data:image/...;base64,...) in the built file and its SHA-256. check prints PASS (exit 0)
only when every picture is on the list and nothing on the list is missing; otherwise FAIL with each unlisted, changed or
missing picture (exit 1). make writes the list for the current build, marking each picture as legacy (in the game before
spitz.dev approvals). A new picture is added by hand with its asset id, so the list says which approval it came from.
Never judges looks.
"""
import base64, hashlib, json, re, sys

PIC = re.compile(r'data:image/(png|gif|jpeg|webp);base64,([A-Za-z0-9+/=]+)')
NAME = re.compile(r'([A-Za-z_$][\w$]*)\s*:\s*\{[^{}]{0,400}$')


def pictures(path):
    text = open(path, encoding='utf-8').read(); out = []
    for m in PIC.finditer(text):
        raw = base64.b64decode(m.group(2))
        near = NAME.search(text[max(0, m.start() - 400):m.start()])
        out.append({'sha256': hashlib.sha256(raw).hexdigest(), 'type': m.group(1), 'bytes': len(raw),
                    'near': near.group(1) if near else None, 'at': m.start()})
    return out


def check(build, listfile):
    pics = pictures(build); lst = json.load(open(listfile))
    known = {p['sha256']: p for p in lst['pictures']}
    seen = set(); ok = True
    for p in pics:
        seen.add(p['sha256'])
        if p['sha256'] not in known:
            ok = False
            print(f"FAIL unlisted picture near '{p['near']}' ({p['type']}, {p['bytes']} bytes, sha256 {p['sha256'][:16]}..., offset {p['at']}):"
                  ' not on the art list, so nobody approved it for this game')
    for sha, p in known.items():
        if sha not in seen:
            ok = False; print(f"FAIL missing picture '{p.get('name')}' (sha256 {sha[:16]}...): on the art list but not in the build (changed or removed)")
    print(f'{len(pics)} pictures in the build, {len(known)} on the list')
    print('PASS' if ok else 'FAIL')
    return 0 if ok else 1


def make(build, listfile):
    pics = pictures(build); seen = {}
    for p in pics:
        if p['sha256'] in seen: continue
        seen[p['sha256']] = {'name': p['near'], 'sha256': p['sha256'], 'type': p['type'], 'bytes': p['bytes'],
                             'asset_id': None, 'approval': 'legacy: in the game before spitz.dev approvals'}
    json.dump({'game': build, 'about': 'Every picture in the built game. New pictures need asset_id (an approved spitz.dev asset).',
               'pictures': list(seen.values())}, open(listfile, 'w'), indent=1)
    print(f'wrote {len(seen)} pictures to {listfile}')
    return 0


if __name__ == '__main__':
    if len(sys.argv) != 4 or sys.argv[1] not in ('check', 'make'): print(__doc__); sys.exit(2)
    sys.exit((check if sys.argv[1] == 'check' else make)(sys.argv[2], sys.argv[3]))
