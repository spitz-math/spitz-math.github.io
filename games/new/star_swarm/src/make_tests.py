# Self-contained test copies for watching students: old (live) and new, each forced to one question set, own save key.
#   python3 make_tests.py <repo root> <out dir> <tag>     -> star_swarm_old_<set>.html, star_swarm_<tag>_<set>.html
import sys, subprocess, os
REPO, OUT, TAG = sys.argv[1], sys.argv[2], sys.argv[3]
HERE=os.path.dirname(os.path.abspath(__file__)); tmp=os.path.join(OUT,'_tmp.html')
def force(src, st, key):
    s=open(src).read(); a="<script>/* a hub link with an algebra set"; assert s.count(a)==1
    s=s.replace(a,"<script>/* test copy: opens straight into one question set */\nif(!/[?&]set=/.test(location.search)) try{ history.replaceState(null,'',location.pathname+'?set=%s'+location.hash); }catch(e){}</script>\n"%st+a)
    k="var KEY='star_swarm_v1';"; assert s.count(k)==1; s=s.replace(k,"var KEY='%s';"%key); return s
for name, src in (('old', REPO+'/games/star_swarm.html'), (TAG, os.path.join(HERE,'../out/star_swarm.html'))):
    for st in ('mult','slope'):
        open(tmp,'w').write(force(src, st, 'star_swarm_%s_%s_test'%(name,st)))
        subprocess.check_call(['python3',os.path.join(HERE,'pack.py'),REPO,tmp,os.path.join(OUT,'star_swarm_%s_%s.html'%(name,st))])
os.remove(tmp)
