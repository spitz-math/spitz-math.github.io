/* Look test sheet: one picture of the kit's screens in a game's look, to approve before any gameplay code.
     node games/new/remake_kit/look_sheet.js games/new/remake_kit/looks/example.json out.png
   The look file holds a name, a tagline, font files and the --rk-* variables (see README.md and looks/example.json). */
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../../..'), TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
const lookFile = process.argv[2], out = process.argv[3] || 'look_sheet.png';
if (!lookFile) { console.error('usage: node look_sheet.js <look.json> [out.png]'); process.exit(2); }
const look = JSON.parse(fs.readFileSync(lookFile, 'utf8'));
const STILLS = [['title', 'Title screen'], ['hud', 'HUD during play'], ['card', 'Question card'], ['miss', 'A miss, with the reason'], ['pick', 'Upgrade pick'], ['pause', 'Pause box'], ['end', 'End screen']];

(async () => {
  const server = http.createServer((req, rsp) => { const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0])); if (!f.startsWith(ROOT)) { rsp.writeHead(403); return rsp.end(); }
    fs.readFile(f, (e, b) => { if (e) { rsp.writeHead(404); return rsp.end('404'); } rsp.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); rsp.end(b); }); });
  await new Promise(r => server.listen(0, '127.0.0.1', r)); const base = 'http://127.0.0.1:' + server.address().port + '/games/new/remake_kit/';
  const browser = await require('playwright').chromium.launch(), shots = [], errors = [];
  for (const [still, cap] of STILLS) {
    const pg = await browser.newPage({ viewport: { width: 1366, height: 620 }, deviceScaleFactor: 1 });
    pg.on('pageerror', e => errors.push(still + ': ' + e.message));
    await pg.goto(base + 'demo.html?set=' + encodeURIComponent(look.set || 'slope') + '&still=' + still + '#look=' + encodeURIComponent(JSON.stringify(look)), { waitUntil: 'load' });
    if (still !== 'title') await pg.waitForFunction(s => document.documentElement.getAttribute('data-still') === s, still, { timeout: 8000 }).catch(() => {});
    await pg.waitForTimeout(still === 'end' ? 2600 : 900);
    shots.push([cap, (await pg.screenshot()).toString('base64')]); await pg.close();
  }
  const pg = await browser.newPage({ viewport: { width: 2100, height: 900 }, deviceScaleFactor: 1 });
  await pg.setContent('<style>body{margin:0;padding:28px;background:#11131a;color:#fff;font:700 26px system-ui,sans-serif}h1{margin:0 0 20px;font-size:34px}.g{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}figure{margin:0}img{width:100%;display:block;border:2px solid #333}figcaption{padding:8px 2px 0;font-size:22px;color:#cfd6e6}</style>' +
    '<h1></h1><div class="g">' + shots.map(s => '<figure><img src="data:image/png;base64,' + s[1] + '"><figcaption>' + s[0] + '</figcaption></figure>').join('') + '</div>');
  await pg.evaluate(t => { document.querySelector('h1').textContent = t; }, 'Look test' + (look.title ? ': ' + look.title : '') + ' (Chromebook size)');
  await pg.waitForTimeout(300); await pg.screenshot({ path: out, fullPage: true });
  await browser.close(); server.close();
  console.log(errors.length ? 'page errors: ' + errors.join(' | ') : 'no page errors'); console.log('saved', out); process.exit(errors.length ? 1 : 0);
})();
