# Builds the rebuilt Star Swarm (2026-11-18) from the live game's shared pieces (sound, music, kit hookup, math helpers, the built-in question
# generators) plus the new source in this folder: style.css, markup.html and g1..g4 js.
#   python3 build.py <repo games folder> <out folder>
# Writes star_swarm.html (site candidate: loads kit.js, questions.js, scorecode.js beside it) and star_swarm_mult.html (opens in multiplication).
import os, sys
D=os.path.dirname(os.path.abspath(__file__)); REPO=sys.argv[1]; OUT=sys.argv[2]; os.makedirs(OUT,exist_ok=True)
base=open(D+'/base_star_swarm.html').read()
def once(x,a,b):
    assert x.count(a)==1,(x.count(a),a[:90]); return x.replace(a,b)
head=base[:base.index('<style>')]
scripts=base[base.index("<script>/* a hub link with an algebra set"):base.index('</head>')]
i=base.index('<script src="scorecode.js"></script>'); j=base.index('/* ================= GAME STATE')
shared=base[i:j]
shared=once(shared,"MUS.g.act.gain.setTargetAtTime(gt-lastInput<3?1:0.35,","MUS.g.act.gain.setTargetAtTime(flying()?1:0.35,")
shared=once(shared,"/* ================= MUSIC (synthesized, no audio files) =================","/* one shared noise buffer: making a new one for every pop is wasted work on a slow Chromebook */\n/* ================= MUSIC (synthesized, no audio files) =================")
js=''.join(open(D+'/'+f).read() for f in ['g1_state.js','g2_swarm.js','g3_draw.js','g4_boot.js'])
s=head+'<style>\n'+open(D+'/style.css').read()+'</style>\n'+scripts+'</head>\n<body>\n'+open(D+'/markup.html').read()+'\n'+shared+js+'\n</body>\n</html>\n'
open(OUT+'/star_swarm.html','w').write(s); print('built star_swarm.html',len(s))
m=once(s,"<script>/* a hub link with an algebra set","<script>/* Kody's test copy: open straight into multiplication facts */\nif(!/[?&]set=/.test(location.search)) try{ history.replaceState(null,'',location.pathname+'?set=mult'+location.hash); }catch(e){}</script>\n<script>/* a hub link with an algebra set")
m=once(m,"var KEY='star_swarm_v1';","var KEY='star_swarm_mult_test_v2';")
open(OUT+'/star_swarm_mult.html','w').write(m); print('built star_swarm_mult.html',len(m))
# a copy that plays from games/new/star_swarm/out/ inside the repo (the test runner serves the repo): shared files three folders up
c=s.replace('href="../fonts/','href="../../../../fonts/')
for f in ['kit.js','questions.js','scorecode.js']: c=once(c,'<script src="%s"></script>'%f,'<script src="../../../%s"></script>'%f)
open(OUT+'/star_swarm_candidate.html','w').write(c); print('built star_swarm_candidate.html',len(c))
