"""Lantern Peak ROOMS slice build (Celeste-style).  python3 games/src/lantern_peak/rooms/build_rooms.py
Same outputs as build.py but named lantern_peak_rooms*.html.
(orig:  python3 games/src/lantern_peak/build.py

Writes into games/src/lantern_peak/out/ (ignored by git):
  lantern_peak.html        site build: loads kit.js, questions.js, scorecode.js from beside it, fonts from ../fonts/files/
  lantern_peak_mult.html   self-contained test copy (fonts + kit + questions + scorecode inside), opens straight into
                           multiplication facts. Never goes on the site.
  lantern_peak_preview.html self-contained preview with a question-set picker (?set=... still works); for the Artifact preview.
  kit.js questions.js scorecode.js  copies from games/ so out/ can be opened over a local web server like the site.
"""
import os, base64, shutil, re
RD = os.path.dirname(os.path.abspath(__file__)); D = os.path.dirname(RD); G = os.path.normpath(D + '/../..'); R = os.path.normpath(G + '/..')
O = D + '/out'; os.makedirs(O, exist_ok=True)
read = lambda p: open(p, encoding='utf-8').read()
head = read(D + '/head.html')
head = head.replace('The beacon on the peak has gone out. Climb the mountain, answer at each Waystone to learn a new move, and light it again.', 'Climb the mountain one cliff at a time. Every fall sends you back to the start of the room, so try again. Answer at the Waystone to learn the Ember Dash.')
head = head.replace('LR/AD=Run | Space/↑=Jump | ↓=Drop down | 1234=Answer', 'LR/AD=Run | Space=Jump | Shift/X=Dash | 1234=Answer')
assert 'Ember Dash' in head and 'Shift/X=Dash' in head
js = ''.join(read(D + '/' + f) + '\n' for f in ['rooms/rphys.js', 'rooms/rlevel.js', 'art.js', 'art_data.js', 'rooms/rgame.js'])
FONTS = [('Fredoka', 'fredoka-latin-11adc634.woff2', '300 700'), ('Lexend', 'lexend-latin-45b4c66f.woff2', '300 700')]
def face(fam, url, w):
    return "@font-face{font-family:'%s';font-style:normal;font-weight:%s;font-display:swap;src:url(%s) format('woff2');}\n" % (fam, w, url)
site_fonts = '<style>\n' + ''.join(face(f, '../fonts/files/' + n, w) for f, n, w in FONTS) + '</style>'
emb_fonts = '<style>\n' + ''.join(face(f, 'data:font/woff2;base64,' + base64.b64encode(open(R + '/fonts/files/' + n, 'rb').read()).decode(), w) for f, n, w in FONTS) + '</style>'
page = lambda fonts: head.replace('<!--FONTS-->', fonts) + '<script>\n' + js + '</script>\n</body>\n</html>\n'
site = page(site_fonts)
open(O + '/lantern_peak_rooms.html', 'w', encoding='utf-8').write(site)

def inline(html, q):
    for src, body in [('kit.js', read(G + '/kit.js')), ('questions.js', q), ('scorecode.js', read(G + '/scorecode.js'))]:
        tag = '<script src="%s"></script>' % src; assert html.count(tag) == 1, src
        html = html.replace(tag, '<script>\n' + body.replace('</script', '<\\/script') + '\n</script>')
    return html
q = read(G + '/questions.js')
line = [l for l in q.split('\n') if l.startswith('var FALLBACK=ASSIGN.length?')][0]
# file:// can't fetch data/topics.json: no hidden sets, no teacher lock, and no set in the link means multiplication facts
qm = q.replace(line, "var FALLBACK='mult';   /* test copy: opens straight into multiplication facts */").replace('ASSIGN=TOPICS.assign.filter(', 'ASSIGN=[].filter(').replace('var HIDDEN=TOPICS.hidden,', 'var HIDDEN=[],')
assert qm.count("FALLBACK='mult'") == 1 and 'ASSIGN=[].filter(' in qm and 'var HIDDEN=[],' in qm
emb = page(emb_fonts)
open(O + '/lantern_peak_rooms_mult.html', 'w', encoding='utf-8').write(inline(emb, qm))

# preview: same self-contained page plus a small set picker on the start screen (reloads with ?set=)
qp = q.replace(line, "var FALLBACK='mult';").replace('ASSIGN=TOPICS.assign.filter(', 'ASSIGN=[].filter(').replace('var HIDDEN=TOPICS.hidden,', 'var HIDDEN=[],')
picker = ('<div class="lp-links" style="margin:-4px 0 14px"><label style="font:500 24px/1 var(--body);color:var(--muted)">Question set (preview only): '
          '<select id="lp-setpick" style="font:500 24px/1 var(--body);padding:8px 12px;border-radius:12px;background:#F6EEDD;color:#2A1B2E;border:3px solid #2A1B2E"></select></label></div>\n'
          '      <span class="sz-credit"')
prev = emb.replace('      <span class="sz-credit"', picker, 1)
prev = prev.replace('</body>', '<script>(function(){ var s=document.getElementById("lp-setpick"), cur=(/[?&]set=([a-z]+)/.exec(location.search)||[])[1]||"mult";'
                    ' Object.keys(SpitzQ.sets).forEach(function(k){ var o=document.createElement("option"); o.value=k; o.textContent=SpitzQ.sets[k].name; if(k===cur) o.selected=true; s.appendChild(o); });'
                    ' s.addEventListener("change",function(){ location.search="?set="+s.value; }); })();</script>\n</body>', 1)
open(O + '/lantern_peak_rooms_preview.html', 'w', encoding='utf-8').write(inline(prev, qp))
for f in ['kit.js', 'questions.js', 'scorecode.js']: shutil.copy(G + '/' + f, O + '/' + f)
print('built', len(site), 'site bytes;', os.path.getsize(O + '/lantern_peak_rooms_mult.html'), 'mult bytes')
