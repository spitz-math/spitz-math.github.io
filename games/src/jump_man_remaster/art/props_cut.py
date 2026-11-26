"""Cut the approved props sheet d27e32c2 into pieces. The sheet has a soft dark haze behind the props, and some
pixels inside the props are partly see-through, so: solid = alpha >= 250, then everything the outside can't reach
(flood fill from the crop edge through non-solid pixels) is made solid too. Returns {name: RGBA image}."""
import base64, io, os
from collections import deque
from PIL import Image, ImageDraw
BOXES = {'stone': (60, 358, 322, 780), 'stonelit': (362, 346, 632, 782), 'lantern': (682, 372, 978, 782), 'post': (1036, 356, 1222, 778), 'gem': (1250, 490, 1500, 780)}
# the gem is see-through inside (its alpha is unusable), so it is cut by its diamond outline instead (sheet coordinates)
GEM_POLY = [(1370, 500), (1490, 622), (1370, 782), (1254, 625)]
def cut(here):
    im = Image.open(io.BytesIO(base64.b64decode(open(os.path.join(here, 'props_d27e32c2.b64')).read()))).convert('RGBA')
    out = {}
    for name, box in BOXES.items():
        p = im.crop(box); w, h = p.size; px = p.load()
        if name == 'gem':
            m = Image.new('L', (w, h), 0); ImageDraw.Draw(m).polygon([(x - box[0], y - box[1]) for x, y in GEM_POLY], fill=255)
            for y in range(h):
                for x in range(w):
                    r, g, b, a = px[x, y]; px[x, y] = (r, g, b, 255) if m.getpixel((x, y)) else (0, 0, 0, 0)
            out[name] = p.crop(p.getbbox()); continue
        solid = [[px[x, y][3] >= 250 for x in range(w)] for y in range(h)]
        outside = [[False] * w for _ in range(h)]; q = deque()
        for x in range(w):
            for y in (0, h - 1): q.append((x, y))
        for y in range(h):
            for x in (0, w - 1): q.append((x, y))
        while q:
            x, y = q.popleft()
            if not (0 <= x < w and 0 <= y < h) or outside[y][x] or solid[y][x]: continue
            outside[y][x] = True; q.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
        for y in range(h):
            for x in range(w):
                r, g, b, a = px[x, y]
                px[x, y] = (0, 0, 0, 0) if outside[y][x] else (r, g, b, 255)
        out[name] = p.crop(p.getbbox())
    return out
