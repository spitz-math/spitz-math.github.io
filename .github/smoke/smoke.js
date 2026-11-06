/* Spitz Math safety check (2026-11-06). Runs on every pull request and every update to main (.github/workflows/smoke.yml).
   It serves the site on this machine and opens, in a real Chrome:
   - the launch pad, the arcade hub, the leaderboard and the teacher pages
   - every game in games/ (with multiplication questions), then presses its start button if it has one
   - every Checkpoint test in practice mode, steps through every question and checks each picture shows
   Any script error, missing file (404) or broken picture fails the check, so the update can't reach students broken.
   Run it yourself: node .github/smoke/smoke.js   (needs Playwright; serves the repo folder on port 8199) */
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..'), PORT = 8199, BASE = 'http://localhost:' + PORT;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp',
  '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.txt': 'text/plain', '.xml': 'application/xml' };

function serve() {
  return http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
    const f = path.join(ROOT, p); if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
    fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); return res.end('404'); } res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); res.end(b); });
  }).listen(PORT);
}

(async () => {
  const server = serve(), browser = await chromium.launch(), fails = [];
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 620 }, serviceWorkers: 'block' });
  async function visit(label, url, then) {
    const p = await ctx.newPage(), errs = [];
    p.on('pageerror', e => errs.push('script error: ' + e.message.slice(0, 200)));
    p.on('response', r => { if (r.url().startsWith(BASE) && r.status() >= 400) errs.push('missing file ' + r.status() + ': ' + r.url().slice(BASE.length)); });
    try { await p.goto(BASE + url, { waitUntil: 'load', timeout: 30000 }); await p.waitForTimeout(700); if (then) await then(p, errs); await p.waitForTimeout(300); }
    catch (e) { errs.push('did not finish: ' + String(e.message || e).split('\n')[0].slice(0, 200)); }
    await p.close();
    console.log((errs.length ? 'FAIL ' : 'ok   ') + label); errs.forEach(e => console.log('       ' + e));
    if (errs.length) fails.push(label);
  }

  for (const u of ['/', '/arcade/', '/leaderboard.html', '/teacher.html', '/topics.html', '/stats.html', '/404.html'])
    await visit('page ' + u, u);

  const games = fs.readdirSync(path.join(ROOT, 'games')).filter(f => f.endsWith('.html') && !/leaderboard/.test(f)).sort();
  for (const g of games) await visit('game ' + g, '/games/' + g + '?set=mult', async (p) => {
    const name = await p.$('input[type=text]:visible'); if (name) await name.fill('Test S').catch(() => {});
    const go = await p.$('[id$=-go-start]:visible, [id$=-start] button:visible, button:has-text("Press Start"):visible, button:has-text("Start"):visible');
    if (go) { await go.click({ timeout: 2000 }).catch(() => {}); await p.waitForTimeout(1200); }
  });

  const list = fs.readFileSync(path.join(ROOT, 'checkpoint/tests/index.js'), 'utf8');
  const tests = [...list.matchAll(/id:"([^"]+)"/g)].map(m => m[1]);
  for (const t of tests) await visit('checkpoint ' + t, '/checkpoint/player.html?test=' + t, async (p, errs) => {
    if (await p.$('#stuName:visible')) {
      await p.selectOption('#stuTest', t).catch(() => {});
      await p.fill('#stuName', 'Test S');
      await p.selectOption('#stuPeriod', { index: 1 }).catch(() => {});
      await p.click('#siBtn');
    }
    await p.waitForFunction(() => window.__test && window.__test.ITEMS && window.__test.ITEMS.length, { timeout: 15000 });
    const n = await p.evaluate(() => window.__test.ITEMS.length);
    for (let i = 0; i < n; i++) {
      await p.waitForTimeout(150);
      const broken = await p.evaluate(() => [...document.querySelectorAll('#itemHost img')].filter(im => im.complete && !im.naturalWidth).map(im => im.getAttribute('src')));
      broken.forEach(b => errs.push('picture did not show on question ' + (i + 1) + ': ' + String(b).slice(0, 120)));
      await p.click('#bNext', { timeout: 3000 }).catch(() => {});
      const y = await p.$('#dlgBtns button:visible'); if (y) await y.click().catch(() => {});
    }
  });

  await browser.close(); server.close();
  console.log('\n' + (fails.length ? fails.length + ' problem(s): ' + fails.join(', ') : 'Everything opened with no errors.'));
  process.exit(fails.length ? 1 : 0);
})();
