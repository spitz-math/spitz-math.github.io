"""Prove the art in the game is the art Kody approved: same pixels, nothing changed in transfer.

    python3 tools/art_check/same_pixels.py approved.png <game file or folder> [--sha256 <approved sha>]

approved.png is the file fetched from Sprite Drop (get_asset). If --sha256 is given, its bytes must match first.
The target can be a PNG, a folder of PNGs, or an .html/.js file with embedded data:image/png;base64 pictures.
Every picture found is decoded to RGBA and compared pixel for pixel with the approved one.

Prints SAME (exit 0) and where the matching picture is, or DIFFERENT (exit 1) with the closest candidate and
how many pixels differ. PNG bytes may differ (re-saving, compression); only pixels count.
"""
import base64, hashlib, io, os, re, sys
from PIL import Image
import numpy as np


def rgba(data):
    a = np.asarray(Image.open(io.BytesIO(data)).convert('RGBA'))
    a = a.copy(); a[a[..., 3] == 0] = 0  # fully transparent pixels are the same whatever colour they carry
    return a


def candidates(target):
    if os.path.isdir(target):
        for root, _, files in os.walk(target):
            for f in sorted(files):
                if f.lower().endswith('.png'):
                    p = os.path.join(root, f); yield p, open(p, 'rb').read()
    elif target.lower().endswith('.png'):
        yield target, open(target, 'rb').read()
    else:
        text = open(target, encoding='utf-8', errors='replace').read()
        for i, m in enumerate(re.finditer(r'data:image/png;base64,([A-Za-z0-9+/=]+)', text)):
            line = text.count('\n', 0, m.start()) + 1
            yield f'{target}:{line} (embedded #{i + 1})', base64.b64decode(m.group(1))


def main(argv):
    if len(argv) < 3:
        print(__doc__); return 2
    src, target = argv[1], argv[2]
    raw = open(src, 'rb').read()
    if '--sha256' in argv:
        want = argv[argv.index('--sha256') + 1].lower(); got = hashlib.sha256(raw).hexdigest()
        if got != want:
            print(f'DIFFERENT: {src} is not the approved file (sha256 {got[:12]}, approved {want[:12]})'); return 1
    ref = rgba(raw); best = None
    for where, data in candidates(target):
        try: img = rgba(data)
        except Exception: continue
        if img.shape != ref.shape:
            if best is None: best = (where, f'size {img.shape[1]}x{img.shape[0]} vs {ref.shape[1]}x{ref.shape[0]}', None)
            continue
        diff = int(np.any(img != ref, axis=2).sum())
        if diff == 0:
            print(f'SAME: {where} has exactly the approved pixels ({ref.shape[1]}x{ref.shape[0]}, sha256 of approved file {hashlib.sha256(raw).hexdigest()[:12]})')
            return 0
        if best is None or best[2] is None or diff < best[2]: best = (where, f'{diff} pixels differ', diff)
    print('DIFFERENT: no picture in the target has the approved pixels' + (f'; closest: {best[0]} ({best[1]})' if best else '; no PNG found'))
    return 1


if __name__ == '__main__':
    sys.exit(main(sys.argv))
