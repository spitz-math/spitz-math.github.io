"""Shared 1x converter: turn an approved illustration into game-ready pixel art, plus an INFORMATION-ONLY report.

    python3 tools/art_check/to_1x.py original.png out_1x.png --size 48x44 [--colours 16 | --palette '#1a1a1a,#ff7a00,...']
                                       [--outline '#1a1a1a'] [--json report.json]

Same steps as the spitz.dev worker's pixel.ts: box-sample the inner part of each block (soft edges don't smear),
a cell is opaque when at least half of it is, alpha only 0 or 255, then snap to the brief's palette or limit to N
colours, then optionally close the outline. Deterministic: same input, same output, every time.

The report is information for Kody's eye, never a decision. A 1x conversion always needs Kody's approval: it is
not pixel-preserving, and no similarity number can approve or block it. Upload the result with drop_asset and
made_from = the original's asset id, so the approval page shows them side by side.
"""
import argparse, hashlib, json, sys
import numpy as np
from PIL import Image


def to_grid(src, aw, ah):
    h, w = src.shape[:2]; out = np.zeros((ah, aw, 4), np.uint8)
    for y in range(ah):
        y0 = (y * h) // ah; y1 = max(y0 + 1, ((y + 1) * h) // ah)
        iy0 = y0 + (y1 - y0) // 4; iy1 = max(y1 - (y1 - y0) // 4, iy0 + 1)
        for x in range(aw):
            x0 = (x * w) // aw; x1 = max(x0 + 1, ((x + 1) * w) // aw)
            ix0 = x0 + (x1 - x0) // 4; ix1 = max(x1 - (x1 - x0) // 4, ix0 + 1)
            blk = src[iy0:iy1, ix0:ix1].reshape(-1, 4).astype(np.int64)
            op = blk[blk[:, 3] >= 128]
            if len(op) and len(op) * 2 >= len(blk): out[y, x] = [*(op[:, :3].sum(0) // len(op)), 255]
    return out


def hex_rgb(h):
    h = h.strip().lstrip('#'); return [int(h[i:i + 2], 16) for i in (0, 2, 4)] if len(h) == 6 else None


def snap(g, pal):
    p = np.array(pal, np.int64); m = g[..., 3] == 255
    c = g[m][:, :3].astype(np.int64)
    if len(c): g[m, :3] = p[((c[:, None, :] - p[None, :, :]) ** 2).sum(2).argmin(1)]
    return g


def limit(g, k):
    m = g[..., 3] == 255; px = g[m][:, :3].astype(np.float64)
    uniq = np.unique(px, axis=0)
    if len(uniq) <= k: return g
    order = uniq[np.argsort(uniq @ np.array([3, 6, 1]), kind='stable')]
    cent = np.array([order[int(((i + 0.5) * len(order)) // k)] for i in range(k)])
    for _ in range(10):
        lab = ((px[:, None] - cent[None]) ** 2).sum(2).argmin(1)
        cent = np.array([px[lab == j].mean(0) if (lab == j).any() else cent[j] for j in range(k)])
    cent = np.round(cent)
    g[m, :3] = cent[((px[:, None] - cent[None]) ** 2).sum(2).argmin(1)].astype(np.uint8)
    return g


def outline(g, col):
    a = np.pad(g[..., 3], 1); edge = (a[1:-1, :-2] == 0) | (a[1:-1, 2:] == 0) | (a[:-2, 1:-1] == 0) | (a[2:, 1:-1] == 0)
    g[(g[..., 3] == 255) & edge, :3] = col
    return g


def report(src, g):
    """Information only: how the 1x result compares with the original when both are seen at the original's size."""
    h, w = src.shape[:2]
    back = np.asarray(Image.fromarray(g).resize((w, h), Image.NEAREST)).astype(np.int64)
    s = src.astype(np.int64); vis = (s[..., 3] >= 128) | (back[..., 3] >= 128)
    cover = float(((s[..., 3] >= 128) == (back[..., 3] >= 128)).mean())
    diff = float(np.abs(s[..., :3] - back[..., :3])[vis].mean()) if vis.any() else 0.0
    return {'information_only': 'These numbers never approve or block anything. Kody decides by looking.',
            'silhouette_agreement': round(cover, 3), 'mean_colour_difference_0_255': round(diff, 1),
            'colours_used': int(len(np.unique(g[g[..., 3] == 255][:, :3], axis=0)))}


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('original'); ap.add_argument('out'); ap.add_argument('--size', required=True)
    ap.add_argument('--colours', type=int, default=16); ap.add_argument('--palette'); ap.add_argument('--outline'); ap.add_argument('--json')
    a = ap.parse_args(argv)
    aw, ah = (int(v) for v in a.size.lower().split('x'))
    raw = open(a.original, 'rb').read()
    src = np.asarray(Image.open(a.original).convert('RGBA'))
    g = to_grid(src, aw, ah)
    pal = [c for c in (hex_rgb(x) for x in (a.palette or '').split(',') if x.strip()) if c]
    g = snap(g, pal) if len(pal) >= 2 else limit(g, a.colours)
    if a.outline and hex_rgb(a.outline): g = outline(g, hex_rgb(a.outline))
    Image.fromarray(g, 'RGBA').save(a.out, optimize=False)
    rep = {'original': a.original, 'original_sha256': hashlib.sha256(raw).hexdigest(), 'out': a.out,
           'out_sha256': hashlib.sha256(open(a.out, 'rb').read()).hexdigest(), 'size': [aw, ah],
           'converter': 'tools/art_check/to_1x.py', 'needs': "Kody's approval (a 1x conversion is never pixel-preserving)", **report(src, g)}
    print(json.dumps(rep, indent=2))
    if a.json: open(a.json, 'w').write(json.dumps(rep, indent=2))
    return 0


if __name__ == '__main__':
    sys.exit(main())
