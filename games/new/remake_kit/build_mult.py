#!/usr/bin/env python3
"""Build Kody's self-contained _mult test copy from a kit game page.

    python3 games/new/remake_kit/build_mult.py <game.html> <out_mult.html> [--set mult]

One file that runs from Downloads with no internet: every local script, style sheet and font is built in.
It opens straight into multiplication facts (or --set), with no hidden sets and no assigned lock, like every other _mult copy.
Never put a _mult copy on the site."""
import argparse, base64, os, re, sys

OPEN = "<script>/* test copy: no hidden sets, no assigned lock */\nwindow.SpitzTopics={hidden:[],off:{},assign:[],suggest:{sets:[],note:''},bonus:25,updated:''};</script>\n"
GO = "<script>/* Kody's test copy: open straight into %s */\nif(!/[?&]set=/.test(location.search)) try{ history.replaceState(null,'',location.pathname+'?set=%s'+location.hash); }catch(e){}</script>\n"
MIME = {'.woff2': 'font/woff2', '.woff': 'font/woff', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg'}


def css_inline(path):
    """a style sheet with its url(...) files (fonts) turned into data URIs"""
    base = os.path.dirname(path)
    css = open(path, encoding='utf8').read()
    def one(m):
        u = m.group(1).strip('\'"')
        if u.startswith(('data:', 'http:', 'https:')): return m.group(0)
        f = os.path.normpath(os.path.join(base, u.split('?')[0].split('#')[0]))
        return 'url(data:%s;base64,%s)' % (MIME.get(os.path.splitext(f)[1], 'application/octet-stream'), base64.b64encode(open(f, 'rb').read()).decode())
    return re.sub(r'url\(([^)]+)\)', one, css)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('src'); ap.add_argument('out'); ap.add_argument('--set', default='mult')
    a = ap.parse_args()
    if not re.search(r'_(mult|test|candidate)', os.path.basename(a.out)) and a.set == 'mult': sys.exit('name the copy *_mult.html (the test hooks and Kody\'s folder go by that name)')
    base = os.path.dirname(os.path.abspath(a.src))
    s = open(a.src, encoding='utf8').read()
    seen_q = [False]

    def script(m):
        f = os.path.normpath(os.path.join(base, m.group(1)))
        js = open(f, encoding='utf8').read()
        assert '</script>' not in js, f + ' holds a closing script tag'
        pre = ''
        if os.path.basename(f) == 'questions.js': seen_q[0] = True; pre = GO % (a.set, a.set) + OPEN
        return pre + '<script>/* ' + os.path.basename(f) + ' */\n' + js + '\n</script>'
    s = re.sub(r'<script src="([^"]+)"></script>', script, s)

    def link(m):
        href = re.search(r'href="([^"]+)"', m.group(0)).group(1)
        if href.startswith(('http:', 'https:')): return m.group(0)
        return '<style>/* ' + os.path.basename(href) + ' */\n' + css_inline(os.path.normpath(os.path.join(base, href))) + '\n</style>'
    s = re.sub(r'<link[^>]+rel="stylesheet"[^>]*>|<link[^>]+href="[^"]+\.css"[^>]*>', link, s)

    assert seen_q[0], 'the page does not load questions.js'
    left = re.findall(r'<script src=|<link[^>]+href="(?!https?:)[^"]+\.css"', s)
    assert not left, 'something local is still linked: %r' % left
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    open(a.out, 'w', encoding='utf8').write(s)
    print('built', a.out, '%.1f MB' % (len(s.encode()) / 1e6))


if __name__ == '__main__':
    main()
