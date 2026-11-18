# Self-contained copies for Kody's PC: kit.js, questions.js, scorecode.js and the fonts built in, so the file plays from any folder.
#   python3 pack.py <repo root> <in.html> <out.html>
import sys, re, base64, os
REPO, IN, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
s=open(IN).read()
for f in ['kit.js','questions.js','scorecode.js']:
    tag='<script src="%s"></script>'%f; js=open(REPO+'/games/'+f).read(); assert s.count(tag)==1 and '</script>' not in js, f
    s=s.replace(tag,'<script>\n'+js+'\n</script>')
m=re.search(r'<link href="\.\./fonts/([^"]+)"[^>]*>',s); css=open(REPO+'/fonts/'+m.group(1)).read()
css=re.sub(r'url\(files/([^)]+)\)',lambda k:'url(data:font/woff2;base64,'+base64.b64encode(open(REPO+'/fonts/files/'+k.group(1),'rb').read()).decode()+')',css)
s=s.replace(m.group(0),'<style>\n'+css+'\n</style>')
open(OUT,'w').write(s); print('packed',os.path.basename(OUT),len(s))
