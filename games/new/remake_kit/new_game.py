#!/usr/bin/env python3
"""Start a remake from the kit's starter game.

    python3 games/new/remake_kit/new_game.py shift_racer sr --title "Shift Racer"
    python3 games/new/remake_kit/new_game.py shift_racer sr --title "Shift Racer" --out /mnt/project-files/games/remake/shift_racer_v2/src

Copies demo.html (Gem Run) to <out>/game.html with the demo-only parts removed, the id prefix changed from dm to yours,
its own save key and its own name. Everything is already wired: stage, save and reload, title, HUD, question card, upgrade pick,
pause, Shift+R, M and N, sound and feel hooks, best today, idle nudge, end screen, and the __G test hooks.
Replace the Gem Run parts (CFG, fresh, step, draw and the card rewards) with the real game.

Then:  python3 games/new/remake_kit/build_mult.py <out>/game.html <out>/<name>_v1_mult.html   makes Kody's self-contained test copy.
The prefix must be two lower-case letters no other game uses (scorecode.js and kit.js find screens by it)."""
import argparse, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
GAMES = os.path.normpath(os.path.join(HERE, '..', '..'))
TAKEN = 'dm bb bl sw jm fb rr dn rc hc sr sp hb rb mg bk pb sk sn gf bs fc pr ds'.split()   # prefixes seen in live games; the check below reads the real files too


def used_prefixes():
    out = set()
    for f in os.listdir(GAMES):
        if f.endswith('.html'):
            m = re.search(r'id="([a-z]{2})-start"', open(os.path.join(GAMES, f), encoding='utf8', errors='replace').read())
            if m: out.add(m.group(1))
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('name', help='snake_case game name, e.g. shift_racer')
    ap.add_argument('prefix', help='two lower-case letters for ids, e.g. sr')
    ap.add_argument('--title', help='the game\'s name on screen, e.g. "Shift Racer"')
    ap.add_argument('--out', help='folder to write game.html into (default games/new/<name>_remake)')
    ap.add_argument('--same-prefix', action='store_true', help='allow a prefix a live game already uses (when this remake replaces that game)')
    a = ap.parse_args()
    if not re.fullmatch(r'[a-z][a-z0-9_]+', a.name): sys.exit('name must be snake_case')
    if not re.fullmatch(r'[a-z]{2}', a.prefix): sys.exit('prefix must be two lower-case letters')
    live = used_prefixes()
    if a.prefix == 'dm' or (a.prefix in live and not a.same_prefix):
        sys.exit('prefix "%s" is already used by a live game (%s). Pick another, or pass --same-prefix if this remake replaces that game.' % (a.prefix, ', '.join(sorted(live))))
    out = os.path.abspath(a.out or os.path.join(GAMES, 'new', a.name + '_remake'))
    dest = os.path.join(out, 'game.html')
    if os.path.exists(dest): sys.exit(dest + ' already exists; not overwriting')
    title = a.title or a.name.replace('_', ' ').title()
    words = title.split(' ')
    name_html = (' '.join(words[:-1]) + ' <b>' + words[-1] + '</b>') if len(words) > 1 else title

    s = open(os.path.join(HERE, 'demo.html'), encoding='utf8').read()
    s, n1 = re.subn(r'[ \t]*/\* <demo-only>.*?/\* </demo-only> \*/\n', '', s, flags=re.S)
    s, n2 = re.subn(r'[ \t]*<!-- demo-only -->.*?<!-- /demo-only -->\n', '', s, flags=re.S)
    s, n3 = re.subn(r'/\* ---- a game\'s own look.*?</style>', "/* ---- this game's look: set the --rk-* variables here (README.md lists them; looks/example.json is a worked example) ---- */\n:root{ }\n</style>", s, flags=re.S)
    s, n4 = re.subn(r'<!-- A demo of .*?-->\n', '<!-- %s remake, started from the remake kit starter (games/new/remake_kit). Replace the Gem Run parts with the real game. -->\n' % title, s, flags=re.S)
    assert n1 == 2 and n2 == 1 and n3 == 1 and n4 == 1, ('starter markers moved', n1, n2, n3, n4)
    p = a.prefix
    s = re.sub(r"\bdm-", p + '-', s)                       # ids and classes
    s = s.replace("forGame('dm')", "forGame('%s')" % p).replace("pre:'dm'", "pre:'%s'" % p)
    s = s.replace("remake_kit_demo_v2", a.name + '_v1')
    s = s.replace("var NAME='Gem <b>Run</b>'", "var NAME='%s'" % name_html.replace("'", "\\'"))
    s = s.replace('<title>Spitz Arcade - Remake Kit demo</title>', '<title>Spitz Arcade - %s</title>' % title)
    s = s.replace('aria-label="Gem Run. ', 'aria-label="%s. ' % title)
    s = s.replace("code:'DEMO-CODE-HERE' });", "code:'' });   /* at go-live: pass gameId to RK.end and drop this */")
    assert "'dm'" not in s and 'dm-' not in s, 'a dm prefix is left'
    # paths to the shared files and the kit, from wherever the game lives
    kit_rel = os.path.relpath(HERE, out).replace(os.sep, '/')
    games_rel = os.path.relpath(GAMES, out).replace(os.sep, '/')
    root_rel = os.path.relpath(os.path.dirname(GAMES), out).replace(os.sep, '/')
    s = s.replace('src="../../kit.js"', 'src="%s/kit.js"' % games_rel).replace('src="../../questions.js"', 'src="%s/questions.js"' % games_rel).replace('src="../../scorecode.js"', 'src="%s/scorecode.js"' % games_rel)
    s = s.replace('src="remake_kit.js"', 'src="%s/remake_kit.js"' % kit_rel).replace('href="spitz_digits.css"', 'href="%s/spitz_digits.css"' % kit_rel)
    s = s.replace('href="../../../fonts/', 'href="%s/fonts/' % root_rel).replace("hub:'../../../arcade/'", "hub:'%s/arcade/'" % root_rel)
    os.makedirs(out, exist_ok=True)
    open(dest, 'w', encoding='utf8').write(s)
    print('wrote', dest)
    print('next: replace the Gem Run parts, then')
    print('  python3 %s %s %s' % (os.path.join(HERE, 'build_mult.py'), dest, os.path.join(out, a.name + '_v1_mult.html')))


if __name__ == '__main__':
    main()
