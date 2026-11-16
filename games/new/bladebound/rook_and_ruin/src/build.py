import sys,os
D=os.path.dirname(os.path.abspath(__file__)); O=D+'/out'; os.makedirs(O,exist_ok=True)
h=open(D+'/head.html',encoding='utf-8').read().replace('/*DIGITS*/',open(D+'/digits.css',encoding='utf-8').read())
g=''.join(open(D+'/'+f,encoding='utf-8').read()+'\n' for f in ['head_part.js','rr.js','audio_part.js','body_part.js']); open(O+'/game.js','w',encoding='utf-8').write(g)
g=''.join(open(D+'/'+f,encoding='utf-8').read()+'\n' for f in ['sprites.js','options.js','v3.js','v4.js','keep.js','rooms_art.js','rr_art.js'])+g
out=h+'<script>\n'+g+'</script>\n</body>\n</html>\n'
open(O+'/rook_and_ruin.html','w',encoding='utf-8').write(out); print(len(out))
import base64, shutil
# fonts and audio: use the copies beside this file when present (project files),
# otherwise the repo's own copies (git keeps one copy: fonts/files/ and games/audio/rook_and_ruin/)
R=os.path.normpath(D+'/../../../../..')
F=D+'/fonts/' if os.path.isdir(D+'/fonts') else R+'/fonts/files/'
AD=D+'/audio/rook_and_ruin' if os.path.isdir(D+'/audio/rook_and_ruin') else R+'/games/audio/rook_and_ruin'
def ff(fam,file,w):
    b=base64.b64encode(open(F+file,'rb').read()).decode()
    return "@font-face{font-family:'%s';font-style:normal;font-weight:%s;font-display:block;src:url(data:font/woff2;base64,%s) format('woff2');}\n"%(fam,w,b)
fonts=ff('Pixelify Sans','pixelifysans-latin-a433b418.woff2','400 700')+ff('Lexend','lexend-latin-45b4c66f.woff2','100 900')
emb=out.replace('<style>\n','<style>\n'+fonts,1)
open(O+'/rook_and_ruin_fonts.html','w',encoding='utf-8').write(emb)
q=open(D+'/questions.js',encoding='utf-8').read()
line=[l for l in q.split('\n') if l.startswith('var FALLBACK=ASSIGN.length?')][0]
q2=q.replace(line,"var FALLBACK='mult';   /* _mult test copy: opens straight into multiplication facts */").replace('ASSIGN=TOPICS.assign.filter(','ASSIGN=[].filter(')
assert q2!=q
m=emb
for src,body in [('kit.js',open(D+'/kit.js',encoding='utf-8').read()),('questions.js',q2),('scorecode.js',open(D+'/scorecode.js',encoding='utf-8').read())]:
    tag='<script src="%s"></script>'%src; assert m.count(tag)==1,src
    m=m.replace(tag,'<script>\n'+body.replace('</script','<\\/script')+'\n</script>')
# the audio pack: the _mult copy opens from Downloads (file://, no fetch), so it carries every file it uses as base64
A=AD+'/'
aud='window.RR_AUD={'+','.join('"%s":"%s"'%(f[:-4],base64.b64encode(open(A+f,'rb').read()).decode()) for f in sorted(os.listdir(A)) if f.endswith('.ogg'))+'};'
t='<script>\n'; k=m.rindex(t); m=m[:k]+'<script>\n'+aud+'\n</script>\n'+m[k:]
open(O+'/rook_and_ruin_mult.html','w',encoding='utf-8').write(m); print('mult',len(m))
shutil.rmtree(O+'/audio',ignore_errors=True); shutil.copytree(AD,O+'/audio/rook_and_ruin')   # site layout: games/audio/rook_and_ruin/*.ogg beside the page
for f in ['kit.js','questions.js','scorecode.js']: shutil.copy(D+'/'+f,O+'/'+f)   # the plain builds load these from beside them, like on the site
# hidden play-test page for the site (games/rook_and_ruin.html): same as the plain build plus noindex.
# At real go-live, drop the noindex line and use out/rook_and_ruin.html instead.
t='<title>Spitz Arcade - Rook &amp; Ruin</title>\n'; assert out.count(t)==1
open(O+'/site_playtest.html','w',encoding='utf-8').write(out.replace(t,t+'<meta name="robots" content="noindex,nofollow">  <!-- play-test page: not on the hub, not in the sitemap -->\n'))
