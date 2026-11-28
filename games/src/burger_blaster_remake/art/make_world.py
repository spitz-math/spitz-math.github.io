"""v10: block tiles (Sprite Drop ef404fd0, task 42d0910b) + rooftop backdrop (f30fd86b, task a025d6f0), both approved by Kody.
usage: python3 make_world.py blocks.png backdrop.png OUTDIR
writes OUTDIR/blocks.webp.b64 (2 rows x 5 tiles, 136 px cells: wood, glass, stone, tnt, rock; row 2 cracked)
       OUTDIR/backdrop.webp.b64 (1664x936, ledge top at y=846 = GY)"""
import sys, io, base64
from PIL import Image
blk, bd, out = sys.argv[1:4]
B = Image.open(blk).convert('RGBA'); C = 136
boxes = [[(49,236,269,272),(342,236,270,272),(635,236,270,271),(928,235,267,273),(1215,234,273,279)],
         [(48,565,271,278),(342,568,269,275),(635,568,270,275),(928,567,267,276),(1213,567,277,281)]]
A = Image.new('RGBA', (C*5, C*2), (0,0,0,0))
for r, row in enumerate(boxes):
    for i, (x, y, w, h) in enumerate(row):
        t = B.crop((x-2, y-2, x+w+2, y+h+2)); t = t.crop(t.getbbox()).resize((C, C), Image.LANCZOS); A.paste(t, (i*C, r*C))
buf = io.BytesIO(); A.save(buf, 'WEBP', lossless=True); open(out+'/blocks.webp.b64','w').write(base64.b64encode(buf.getvalue()).decode()); A.save(out+'/blocks_preview.png')
D = Image.open(bd).convert('RGB'); k = 1664/1536; y0 = 810 - 846/k
D = D.crop((0, round(y0), 1536, round(y0 + 936/k))).resize((1664, 936), Image.LANCZOS)
buf = io.BytesIO(); D.save(buf, 'WEBP', quality=86, method=6); open(out+'/backdrop.webp.b64','w').write(base64.b64encode(buf.getvalue()).decode()); D.save(out+'/backdrop_preview.jpg', quality=80)
print('blocks', A.size, 'backdrop', D.size, len(buf.getvalue()))
