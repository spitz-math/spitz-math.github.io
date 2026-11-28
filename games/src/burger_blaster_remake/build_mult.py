# Build Kody's self-contained _mult test copy from a built v-file.
# usage: build_mult.py <built.html> <out_mult.html> [repo_games_dir]
import sys
src, out = sys.argv[1], sys.argv[2]
REPO = sys.argv[3] if len(sys.argv) > 3 else '/home/user/spitz-arcade/games/'
def once(x, a, b):
    assert x.count(a) == 1, (x.count(a), a[:90]); return x.replace(a, b)
m = open(src).read()
for a, b in [("var KEY='burger_blaster_v2';", "var KEY='burger_blaster_v2_mult';"),
             ("var set=SpitzQ.sets.slope,", "var set=SpitzQ.sets.mult,"),
             ("return { set:'slope',", "return { set:'mult',"),
             ('<span class="sz-setname">Slope-intercept form.</span>', '<span class="sz-setname">Multiplication facts.</span>')]:
    m = once(m, a, b)
OPEN = "<script>/* test copy: no hidden sets, no assigned lock */\nwindow.SpitzTopics={hidden:[],off:{},assign:[],suggest:{sets:[],note:''},bonus:25,updated:''};</script>\n"
GO = "<script>/* Kody's test copy: open straight into multiplication facts */\nif(!/[?&]set=/.test(location.search)) try{ history.replaceState(null,'',location.pathname+'?set=mult'+location.hash); }catch(e){}</script>\n"
q = open(REPO + 'questions.js').read(); c = open(REPO + 'scorecode.js').read(); k = open(REPO + 'kit.js').read()
for js in (q, c, k): assert '</script>' not in js
m = once(m, '<script src="questions.js"></script>', GO + OPEN + '<script>\n' + q + '\n</script>')
m = once(m, '<script src="scorecode.js"></script>', '<script>\n' + c + '\n</script>')
m = once(m, '<script src="kit.js"></script>', '<script>\n' + k + '\n</script>')
m = m.replace('href="../fonts/bangers-inter-0413fc.css"', 'href="https://fonts.googleapis.com/css2?family=Bangers&family=Inter:wght@500;600;700;800&display=swap"')
assert 'src="' not in ''.join(l for l in m.split('\n') if '<script src=' in l)
open(out, 'w').write(m); print('built', out, len(m))
