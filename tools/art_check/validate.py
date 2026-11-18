"""spitz.dev art validator: measurable checks only, no AI judgment.

    python3 validate.py <image.png> <spec.json> [--json out.json]

Every check returns one of three results:
  pass           measured and inside the spec
  fail           measured and outside the spec
  indeterminate  the spec does not give enough to measure it honestly
                 (for example body height on an armed character with no body mask)

Overall result: FAIL if any check fails, else INDETERMINATE if any check is
indeterminate, else PASS. Exit code 0 = PASS, 1 = FAIL, 2 = INDETERMINATE,
3 = the spec itself is invalid. Only PASS may count toward "ready".
This is technical validation only. It says nothing about whether the art
looks right; that is a separate, human visual approval.

Spec keys (unknown keys are rejected, so a typo cannot silently skip a check):
  kind        "sheet" | "prop" | "room"                    required
  size        [W, H]  exact pixel size                      required
  alpha       "hard" (only 0/255) | "opaque" (all 255)
  cell        [fw, fh]  sheet grid
  feet_y      int; feet_tol int (default 1): lowest opaque row in every non-empty cell
  edge_margin int (default 0): art must stay this far from every cell edge
  body        body height, NOT counting weapons:
                {"armed": true|false, "min": a, "max": b,
                 "mask": "body.png",          # same size; opaque px = body only
                 "cells": [[c,r], ...]}      # default: every non-empty cell
              armed false -> the cell's opaque height is the body height.
              armed true  -> a body mask is REQUIRED; without it the check is
                             indeterminate. (Width heuristics proved unreliable on
                             the Lancer and are reported as info only, never gated.)
              armed missing -> indeterminate (the spec must say).
  source      path of the image this one must match outside allowed changes
  allowed_cells [[c,r], ...]: sheet cells that may differ from source; all others identical
  protected   [[x0,y0,x1,y1], ...] inclusive rects that must equal source exactly
  opaque_free [[x0,y0,x1,y1], ...] same rule, named for walkable floor / layout areas
  also_match  [{"source": path, "rects": [[x0,y0,x1,y1], ...]}, ...]: rects that must
              equal a second source exactly (e.g. a carpet strip taken from another room)
  palette     ["#rrggbb", ...]: every opaque pixel must be one of these
Relative paths in the spec resolve from the spec file's folder.
"""
import hashlib, json, os, sys
from PIL import Image
import numpy as np

KEYS = {'kind', 'size', 'alpha', 'cell', 'feet_y', 'feet_tol', 'edge_margin', 'body',
        'source', 'allowed_cells', 'protected', 'opaque_free', 'also_match', 'palette', 'note', 'expect'}
BODY_KEYS = {'armed', 'min', 'max', 'mask', 'cells'}
PASS, FAIL, IND = 'pass', 'fail', 'indeterminate'


class SpecError(Exception):
    pass


def load(p):
    return np.array(Image.open(p).convert('RGBA')).astype(np.int16)


def sha256(p):
    return hashlib.sha256(open(p, 'rb').read()).hexdigest()


def upscale_factor(a):
    """Largest k in 2..8 where every kxk block is a single colour (a k-times upscale)."""
    h, w = a.shape[:2]
    best = 1
    for k in range(2, 9):
        if h % k or w % k:
            continue
        b = a.reshape(h // k, k, w // k, k, 4)
        if (b == b[:, :1, :, :1, :]).all():
            best = k
    return best


def longest_run(row):
    best = cur = 0
    for v in row:
        cur = cur + 1 if v else 0
        best = max(best, cur)
    return best


def width_rule_height(cell, min_width=6):
    """INFO ONLY: height of rows whose longest opaque run >= min_width."""
    rows = [y for y in range(cell.shape[0]) if longest_run(cell[y]) >= min_width]
    return (rows[-1] - rows[0] + 1) if rows else 0


def validate_spec(spec):
    bad = set(spec) - KEYS
    if bad:
        raise SpecError(f'unknown spec keys {sorted(bad)}')
    for k in ('kind', 'size'):
        if k not in spec:
            raise SpecError(f'spec needs "{k}"')
    if spec['kind'] not in ('sheet', 'prop', 'room'):
        raise SpecError('kind must be sheet, prop or room')
    if spec.get('alpha') not in (None, 'hard', 'opaque'):
        raise SpecError('alpha must be "hard" or "opaque"')
    if 'body' in spec:
        b = spec['body']
        if set(b) - BODY_KEYS:
            raise SpecError(f'unknown body keys {sorted(set(b) - BODY_KEYS)}')
        if 'cell' not in spec:
            raise SpecError('body needs cell')
    if ('allowed_cells' in spec) and 'cell' not in spec:
        raise SpecError('allowed_cells needs cell')
    if any(k in spec for k in ('allowed_cells', 'protected', 'opaque_free')) and 'source' not in spec:
        raise SpecError('allowed_cells / protected / opaque_free need source')


def check(img_path, spec, base='.'):
    validate_spec(spec)
    rel = lambda p: p if os.path.isabs(p) else os.path.join(base, p)
    a = load(img_path)
    H, W = a.shape[:2]
    res = []

    def add(name, result, detail, method=None):
        r = {'check': name, 'result': result, 'detail': detail}
        if method:
            r['method'] = method
        res.append(r)

    sw, sh = spec['size']
    add('size', PASS if (W, H) == (sw, sh) else FAIL, f'{W}x{H} (want {sw}x{sh})')
    k = upscale_factor(a)
    add('true 1x', PASS if k == 1 else FAIL,
        'ok' if k == 1 else f'every {k}x{k} block is one colour: a {k}x upscale')
    al = a[..., 3]
    if spec.get('alpha') == 'hard':
        n = int(((al != 0) & (al != 255)).sum())
        add('alpha 0/255', PASS if n == 0 else FAIL, f'{n} partial-alpha px')
    if spec.get('alpha') == 'opaque':
        n = int((al != 255).sum())
        add('fully opaque', PASS if n == 0 else FAIL, f'{n} see-through px')
    if (W, H) != (sw, sh):
        for name in ('palette', 'feet line', 'inside cell', 'body height', 'source'):
            if (name == 'palette' and 'palette' in spec) or (name == 'source' and 'source' in spec) \
               or (name in ('feet line', 'inside cell') and 'cell' in spec) or (name == 'body height' and 'body' in spec):
                add(name, IND, 'not measured: wrong size')
        return res

    if spec.get('palette'):
        pal = {tuple(int(c[i:i + 2], 16) for i in (1, 3, 5)) for c in spec['palette']}
        px = {tuple(p) for p in a[al > 0][:, :3].tolist()}
        off = px - pal
        add('palette', PASS if not off else FAIL, f'{len(off)} colours outside the palette')

    if 'cell' in spec:
        fw, fh = spec['cell']
        if W % fw or H % fh:
            add('grid', FAIL, f'{W}x{H} is not a whole number of {fw}x{fh} cells')
        cols, rows = W // fw, H // fh
        tol = spec.get('feet_tol', 1)
        m = spec.get('edge_margin', 0)
        feet_bad, edge_bad = [], []
        cells = {}
        for r in range(rows):
            for c in range(cols):
                cell = al[r * fh:(r + 1) * fh, c * fw:(c + 1) * fw] > 0
                if cell.any():
                    cells[(c, r)] = cell
        for (c, r), cell in cells.items():
            ys, xs = np.nonzero(cell)
            if 'feet_y' in spec and abs(int(ys.max()) - spec['feet_y']) > tol:
                feet_bad.append(f'c{c}r{r}:y{int(ys.max())}')
            if ys.min() < m or xs.min() < m or ys.max() > fh - 1 - m or xs.max() > fw - 1 - m:
                edge_bad.append(f'c{c}r{r}')
        if 'feet_y' in spec:
            add('feet line', PASS if not feet_bad else FAIL,
                f'{len(cells)} cells ok' if not feet_bad else 'off: ' + ', '.join(feet_bad))
        add('inside cell', PASS if not edge_bad else FAIL,
            'ok' if not edge_bad else 'touches edge: ' + ', '.join(edge_bad))

        b = spec.get('body')
        if b is not None:
            want = [tuple(x) for x in b['cells']] if b.get('cells') else sorted(cells)
            lo, hi = b.get('min', 0), b.get('max', 10 ** 6)
            info = ', '.join(f'c{c}r{r}:{width_rule_height(cells[(c, r)])}' for c, r in want[:4] if (c, r) in cells)
            if 'armed' not in b:
                add('body height', IND, 'spec must say armed true/false', 'none')
            elif b['armed'] and not b.get('mask'):
                add('body height', IND,
                    f'armed character with no body mask: cannot separate body from weapon '
                    f'(width-rule estimate, info only: {info})', 'none')
            else:
                if b['armed']:
                    mk = load(rel(b['mask']))
                    if mk.shape != a.shape:
                        raise SpecError('body mask size differs from image')
                    outside = int(((mk[..., 3] > 0) & (al == 0)).sum())
                    if outside:
                        add('body mask fits art', FAIL, f'{outside} mask px over transparent art')
                    src, method = mk[..., 3] > 0, 'body mask'
                else:
                    src, method = al > 0, 'opaque height (declared unarmed)'
                hs, badl = [], []
                for c, r in want:
                    cell = src[r * fh:(r + 1) * fh, c * fw:(c + 1) * fw]
                    if not cell.any():
                        badl.append(f'c{c}r{r}:empty')
                        continue
                    ys = np.nonzero(cell.any(1))[0]
                    h = int(ys.max() - ys.min() + 1)
                    hs.append(h)
                    if not lo <= h <= hi:
                        badl.append(f'c{c}r{r}:{h}')
                rng = f'{min(hs)}-{max(hs)}' if hs else 'n/a'
                add('body height', PASS if not badl else FAIL,
                    f'want {lo}-{hi}, measured {rng}' + ('' if not badl else '; off: ' + ', '.join(badl)), method)

    if spec.get('source'):
        s = load(rel(spec['source']))
        if s.shape != a.shape:
            add('matches source', FAIL, f'source is {s.shape[1]}x{s.shape[0]}, image {W}x{H}')
        else:
            diff = np.abs(a - s).sum(2) > 0
            if 'allowed_cells' in spec:
                fw, fh = spec['cell']
                mask = np.ones_like(diff)
                for c, r in spec['allowed_cells']:
                    mask[r * fh:(r + 1) * fh, c * fw:(c + 1) * fw] = False
                n = int((diff & mask).sum())
                add('unchanged outside allowed cells', PASS if n == 0 else FAIL,
                    f'{n} px changed outside {spec["allowed_cells"]}')
            for name in ('protected', 'opaque_free'):
                for x0, y0, x1, y1 in spec.get(name, []):
                    n = int(diff[y0:y1 + 1, x0:x1 + 1].sum())
                    add(f'{name} [{x0},{y0},{x1},{y1}] identical', PASS if n == 0 else FAIL, f'{n} px differ')
    for m in spec.get('also_match', []):
        s2 = load(rel(m['source']))
        name = os.path.basename(m['source'])
        if s2.shape != a.shape:
            add(f'matches {name}', FAIL, f'{name} is {s2.shape[1]}x{s2.shape[0]}')
            continue
        d2 = np.abs(a - s2).sum(2) > 0
        for x0, y0, x1, y1 in m['rects']:
            n = int(d2[y0:y1 + 1, x0:x1 + 1].sum())
            add(f'[{x0},{y0},{x1},{y1}] identical to {name}', PASS if n == 0 else FAIL, f'{n} px differ')
    return res


def overall(res):
    rs = {r['result'] for r in res}
    return 'FAIL' if FAIL in rs else 'INDETERMINATE' if IND in rs else 'PASS'


def run(img, spec_path):
    spec = json.load(open(spec_path))
    try:
        res = check(img, spec, os.path.dirname(os.path.abspath(spec_path)))
        verdict = overall(res)
    except SpecError as e:
        res, verdict = [{'check': 'spec', 'result': FAIL, 'detail': str(e)}], 'SPEC ERROR'
    return {'image': img, 'sha256': sha256(img), 'spec': spec, 'result': verdict, 'checks': res,
            'scope': 'technical only; visual approval is separate'}


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(3)
    rec = run(sys.argv[1], sys.argv[2])
    for r in rec['checks']:
        print(f"{r['result'].upper():13} {r['check']}: {r['detail']}" + (f" [{r['method']}]" if r.get('method') else ''))
    print('RESULT:', rec['result'], ' sha256', rec['sha256'][:12])
    if '--json' in sys.argv:
        json.dump(rec, open(sys.argv[sys.argv.index('--json') + 1], 'w'), indent=1)
    sys.exit({'PASS': 0, 'FAIL': 1, 'INDETERMINATE': 2}.get(rec['result'], 3))


if __name__ == '__main__':
    main()
