/* Readability check (text size and contrast), part of the Safety check.
   Opens the site pages, every game's start screen and the Checkpoint player in Chrome, and measures every piece of
   on-page text (not text drawn on a game canvas, which the browser can't read back):
   - size: smaller than 11px fails (our bar since PR #183; Chromebook screens at arm's length)
   - contrast: below 4.5:1 fails (3:1 for large text, 24px+ or 18.7px+ bold), the WCAG AA rule Impeccable uses
   Problems that already existed when this check started are listed in readability-baseline.json: they are reported
   as "known" and don't fail the check, so only NEW problems turn it red. When one is fixed, the report says so and
   it can be dropped from the list with --update-baseline.
   Run it yourself:  node tools/qa/readability.js                 (needs Playwright; serves the repo on port 8198)
                     node tools/qa/readability.js --update-baseline   (rewrites the known list from today's results)
                     node tools/qa/readability.js /teacher.html      (only these pages) */
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..'), PORT = 8198, BASE = 'http://localhost:' + PORT;
const BASELINE = path.join(__dirname, 'readability-baseline.json');
const MIN_PX = 11, AA = 4.5, AA_LARGE = 3;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp',
  '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.txt': 'text/plain' };

function serve() {
  return http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
    const f = path.join(ROOT, p); if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
    fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); return res.end('404'); } res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); res.end(b); });
  }).listen(PORT);
}

function pages() {
  const site = ['/', '/arcade/', '/leaderboard.html', '/teacher.html', '/topics.html', '/stats.html', '/404.html', '/checkpoint/player.html'];
  const games = fs.readdirSync(path.join(ROOT, 'games')).filter(f => f.endsWith('.html') && !/leaderboard/.test(f)).sort().map(g => '/games/' + g);
  return site.concat(games);
}

/* Runs inside the page: every element with its own visible text, its size and its text colour, and where the text sits. */
function collect() {
  const parse = s => { const m = String(s).match(/rgba?\(([^)]+)\)/); if (!m) return null; const v = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return [v[0], v[1], v[2], v.length > 3 ? v[3] : 1]; };
  const path = el => { const p = []; for (let e = el; e && e !== document.body && p.length < 4; e = e.parentElement) {
    let s = e.tagName.toLowerCase(); if (e.id) { p.unshift(s + '#' + e.id); break; } const c = [...e.classList].slice(0, 2).join('.'); if (c) s += '.' + c; p.unshift(s); } return p.join(' > '); };
  const out = [];
  for (const el of document.body.querySelectorAll('*')) {
    if (/^(SCRIPT|STYLE|NOSCRIPT|CANVAS|OPTION|TEMPLATE)$/i.test(el.tagName) || el.closest('svg')) continue;
    const nodes = [...el.childNodes].filter(n => n.nodeType === 3 && /[A-Za-z0-9]/.test(n.textContent));
    if (!nodes.length) continue;
    if (el.closest('[aria-hidden="true"],[hidden]') || el.disabled || el.closest('button:disabled')) continue;
    const cs = getComputedStyle(el);
    if (!el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
    const rects = [];
    nodes.forEach(n => { const r = document.createRange(); r.selectNodeContents(n);
      [...r.getClientRects()].forEach(q => { if (q.width >= 2 && q.height >= 2) rects.push([q.left + scrollX, q.top + scrollY, q.width, q.height]); }); });
    if (!rects.length) continue;
    /* text hidden under something else (a start screen over the game's top bar) isn't seen, so it isn't judged */
    const vis = rects.filter(([x, y, w, h]) => { const cx = x - scrollX + w / 2, cy = y - scrollY + h / 2;
      if (cx < 0 || cy < 0 || cx >= innerWidth || cy >= innerHeight) return true;
      const hit = document.elementFromPoint(cx, cy); return !hit || hit === el || el.contains(hit) || hit.contains(el); });
    if (!vis.length) continue;
    let op = 1; for (let e = el; e; e = e.parentElement) op *= +getComputedStyle(e).opacity;
    const fg = parse(cs.color);
    out.push({ key: path(el), text: nodes.map(n => n.textContent).join('').replace(/\s+/g, ' ').trim().slice(0, 50), px: parseFloat(cs.fontSize),
      bold: +cs.fontWeight >= 700, fg: fg ? [fg[0], fg[1], fg[2], fg[3] * op] : null, clip: /text/.test(cs.webkitBackgroundClip || cs.backgroundClip), rects });
  }
  return out;
}

/* Runs inside the page, on a screenshot taken with all text hidden: the typical colour behind each text (median by brightness). */
async function behind(arg) {
  const img = new Image(); img.src = 'data:image/png;base64,' + arg.png; await img.decode();
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0);
  return arg.items.map(it => {
    const px = [];
    for (const [x, y, w, h] of it.rects) {
      const X = Math.max(0, Math.floor(x)), Y = Math.max(0, Math.floor(y)), W = Math.min(c.width - X, Math.ceil(w)), H = Math.min(c.height - Y, Math.ceil(h));
      if (W < 1 || H < 1) continue;
      const d = g.getImageData(X, Y, W, H).data, step = Math.max(1, Math.floor(W * H / 400));
      for (let i = 0; i < W * H; i += step) px.push([d[i * 4], d[i * 4 + 1], d[i * 4 + 2]]);
    }
    if (!px.length) return null;
    px.sort((a, b) => (a[0] * 2 + a[1] * 7 + a[2]) - (b[0] * 2 + b[1] * 7 + b[2]));
    return px[px.length >> 1];
  });
}

const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

/* hides all text; :is(#a#a#a#a, *) matches everything but outranks any page rule, even one marked !important */
const HIDE = [':is(#qa#qa#qa#qa,*)', ':is(#qa#qa#qa#qa,*)::before', ':is(#qa#qa#qa#qa,*)::after'].join(',') +
  '{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important;-webkit-text-stroke:0!important;caret-color:transparent!important}';

async function measure(p) {
  /* make the window as tall as the page, so one screenshot holds everything and nothing moves between measuring and the photo */
  const tall = await p.evaluate(() => Math.min(4000, Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)));
  if (tall > 620) { await p.setViewportSize({ width: 1366, height: tall }); await p.waitForTimeout(300); }
  const items = await p.evaluate(collect), rows = [], seen = new Set();
  const add = r => { const k = r.key; if (!seen.has(k)) { seen.add(k); rows.push(r); } };
  items.forEach(it => { if (it.px < MIN_PX - 0.01) add({ key: it.key + ' | size', rule: 'size', got: it.px.toFixed(1) + 'px', need: MIN_PX + 'px', text: it.text }); });
  /* contrast: hide all text, photograph the page, read the colour that was behind each text */
  const judged = items.filter(it => it.fg && it.fg[3] > 0.05 && !it.clip);
  const style = await p.addStyleTag({ content: HIDE });
  await p.waitForTimeout(80);
  const png = (await p.screenshot({ animations: 'disabled' })).toString('base64');
  await style.evaluate(s => s.remove());
  const bgs = await p.evaluate(behind, { png, items: judged.map(it => ({ rects: it.rects })) });
  judged.forEach((it, i) => {
    const bg = bgs[i]; if (!bg) return;
    const a = it.fg[3], fg = [0, 1, 2].map(j => it.fg[j] * a + bg[j] * (1 - a));
    const r = ratio(fg, bg), large = it.px >= 24 || (it.bold && it.px >= 18.66), need = large ? AA_LARGE : AA;
    if (r < need - 0.005) add({ key: it.key + ' | contrast', rule: 'contrast', got: r.toFixed(2) + ':1', need: need + ':1', text: it.text });
  });
  if (process.env.QA_DEBUG) console.error(p.url(), 'texts', items.length, 'judged', judged.length, 'worst', judged.map((it, i) => bgs[i] && ratio(it.fg, bgs[i])).filter(Boolean).sort((a, b) => a - b).slice(0, 3).map(x => x.toFixed(2)).join(' '));
  return rows;
}

(async () => {
  const argv = process.argv.slice(2), update = argv.includes('--update-baseline');
  const only = argv.filter(a => a.startsWith('/'));
  const list = only.length ? only : pages();
  const { chromium } = require('playwright');
  const server = serve(), browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 620 }, serviceWorkers: 'block', reducedMotion: 'reduce' });
  const found = {}, broke = [];
  for (const u of list) {
    const p = await ctx.newPage();
    try {
      await p.goto(BASE + u + (u.startsWith('/games/') ? '?set=mult' : ''), { waitUntil: 'load', timeout: 30000 });
      await p.waitForTimeout(900);   // fonts and fade-ins settle
      found[u] = await measure(p);
    } catch (e) { broke.push(u + ': ' + String(e.message || e).split('\n')[0].slice(0, 160)); }
    await p.close();
  }
  await browser.close(); server.close();

  let base = {}; try { base = JSON.parse(fs.readFileSync(BASELINE, 'utf8')); } catch (e) {}
  if (update) {
    const out = {}; for (const [u, rows] of Object.entries(found)) if (rows.length) out[u] = rows.map(r => r.key).sort();
    if (only.length) Object.entries(base).forEach(([u, k]) => { if (!(u in found)) out[u] = k; });
    fs.writeFileSync(BASELINE, JSON.stringify(out, null, 1) + '\n');
    console.log('Known list rewritten: ' + Object.values(out).flat().length + ' known problem(s) on ' + Object.keys(out).length + ' page(s).');
    return;
  }

  const fresh = [], fixed = []; let known = 0;
  for (const [u, rows] of Object.entries(found)) {
    const k = new Set(base[u] || []);
    rows.forEach(r => k.has(r.key) ? known++ : fresh.push({ page: u, ...r }));
    const now = new Set(rows.map(r => r.key)); (base[u] || []).forEach(b => { if (!now.has(b)) fixed.push(u + '  ' + b); });
  }
  const lines = ['## Readability (text size and contrast)', ''];
  lines.push(fresh.length ? `**${fresh.length} new problem(s).** Text must be at least ${MIN_PX}px and reach ${AA}:1 contrast (${AA_LARGE}:1 when large).` : 'No new text size or contrast problems.');
  lines.push('', `Checked ${Object.keys(found).length} page(s). ${known} known problem(s) from before this check started are not counted (tools/qa/readability-baseline.json). Text drawn on a game canvas is not checked.`, '');
  if (fresh.length) { lines.push('| Page | Where | Rule | Got | Needs | Text |', '|---|---|---|---|---|---|');
    fresh.forEach(f => lines.push(`| ${f.page} | \`${f.key.split(' | ')[0]}\` | ${f.rule} | ${f.got} | ${f.need} | ${f.text.replace(/\|/g, '/')} |`)); lines.push(''); }
  if (fixed.length) lines.push(`${fixed.length} known problem(s) are fixed now; run with --update-baseline to drop them from the list.`, '');
  if (broke.length) lines.push('**Could not check:** ' + broke.join('; '), '');
  const md = lines.join('\n'); console.log(md);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + '\n');
  process.exit(fresh.length || broke.length ? 1 : 0);
})();
