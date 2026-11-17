import sys
import os
HERE=os.path.dirname(os.path.abspath(__file__)); GAMES=os.path.normpath(os.path.join(HERE,'..','..'))+'/'; OUT=os.path.join(HERE,'out')+'/'; os.makedirs(OUT,exist_ok=True)
G=GAMES
q=open(G+'questions.js',encoding='utf-8').read()
line=[l for l in q.split('\n') if l.startswith('var FALLBACK=ASSIGN.length?')][0]
q2=q.replace(line,"var FALLBACK='mult';   /* _mult test copy: opens straight into multiplication facts */").replace('ASSIGN=TOPICS.assign.filter(','ASSIGN=[].filter(')
assert q2!=q
s=open(G+'dig_buds.html',encoding='utf-8').read()
for src,body in [('kit.js',open(G+'kit.js',encoding='utf-8').read()),('questions.js',q2),('scorecode.js',open(G+'scorecode.js',encoding='utf-8').read())]:
    tag='<script src="%s"></script>'%src; assert s.count(tag)==1,src
    s=s.replace(tag,'<script>\n'+body.replace('</script','<\\/script')+'\n</script>')
open(OUT+'dig_buds_mult.html','w',encoding='utf-8').write(s); print('wrote',OUT+'dig_buds_mult.html',len(s))
import shutil
for f in ['dig_buds.html','kit.js','questions.js','scorecode.js']: shutil.copy(G+f,OUT+f)   # plain copy for ?set= tests, served from out/
