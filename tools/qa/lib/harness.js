/* spitz.dev QA harness: the shared pieces every app's tests use.
   - serve(): serves the repo folder on localhost (like .github/smoke/smoke.js)
   - session(): one Chromium page with error, 404 and console capture
   - a test list where every check records what / expected / actual, so a failure reads like a sentence
   - results.json + summary.md per app in qa-out/<app>/
   Nothing here names a game: game knowledge lives in tools/qa/adapters/<app>.js. */
const http = require('http'), fs = require('fs'), path = require('path');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp',
  '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav',
  '.txt': 'text/plain', '.xml': 'application/xml', '.webmanifest': 'application/manifest+json' };

const VIEWPORTS = { chromebook: { width: 1366, height: 620 }, board: { width: 1920, height: 1080 }, phone: { width: 390, height: 844 } };

function serve(port) {
  return new Promise(res => {
    const s = http.createServer((req, rsp) => {
      let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
      const f = path.join(ROOT, p); if (!f.startsWith(ROOT)) { rsp.writeHead(403); return rsp.end(); }
      fs.readFile(f, (e, b) => { if (e) { rsp.writeHead(404); return rsp.end('404'); } rsp.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); rsp.end(b); });
    }).listen(port, () => res(s));
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
const short = v => { const s = typeof v === 'string' ? v : JSON.stringify(v); return s && s.length > 160 ? s.slice(0, 157) + '...' : s; };

class Run {
  constructor(app, lane, opts = {}) {
    this.app = app; this.lane = lane; this.port = opts.port || 8211; this.base = 'http://localhost:' + this.port;
    this.out = path.join(ROOT, 'qa-out', app.id); fs.mkdirSync(this.out, { recursive: true });
    this.tests = []; this.coverage = []; this.started = Date.now();
  }
  async open() { this.server = await serve(this.port); this.browser = await require('playwright').chromium.launch(); }   // loaded here, so a run with nothing to play needs no Chrome
  async close() { await this.browser.close().catch(() => {}); this.server.close(); }

  /* A fresh page that records script errors, missing files and console errors for the current test. */
  async page(viewport = 'chromebook', cpu = 1) {
    const ctx = await this.browser.newContext({ viewport: VIEWPORTS[viewport] || viewport, serviceWorkers: 'block' });
    const pg = await ctx.newPage(); const log = this.cur ? this.cur.log : [];
    pg.on('pageerror', e => log.push('script error: ' + String(e.message || e).split('\n')[0].slice(0, 200)));
    pg.on('console', m => { if (m.type() === 'error' && !/ERR_TUNNEL|net::ERR|Failed to load resource/.test(m.text())) log.push('console error: ' + m.text().slice(0, 200)); });
    pg.on('response', r => { if (r.url().startsWith(this.base) && r.status() >= 400) log.push('missing file ' + r.status() + ': ' + r.url().slice(this.base.length)); });
    if (cpu > 1) { const c = await ctx.newCDPSession(pg); await c.send('Emulation.setCPUThrottlingRate', { rate: cpu }); }
    pg.qaUrl = u => this.base + '/' + u.replace(/^\//, '');
    return pg;
  }

  /* One test: a name, then checks. A thrown error or a page error fails the test with the log attached. */
  async test(name, fn, { retry = 1 } = {}) {
    let attempt = 0, t;
    while (true) {
      t = { name, status: 'pass', checks: [], shots: [], log: [], cover: [], ms: 0, attempts: attempt + 1 };
      this.cur = t; const t0 = Date.now();
      try { await fn(this); } catch (e) { t.checks.push({ what: 'test finished without crashing', ok: false, expected: 'no error', actual: String(e.message || e).split('\n')[0].slice(0, 300) }); }
      if (t.log.some(l => /^script error/.test(l))) t.checks.push({ what: 'no script errors on the page', ok: false, expected: 'none', actual: t.log.filter(l => /^script error/.test(l)).length + ' error(s)' });
      t.ms = Date.now() - t0;
      if (t.checks.some(c => !c.ok)) t.status = 'fail';
      if (t.status === 'pass' || attempt >= retry) break;
      attempt++;
    }
    if (t.status === 'pass' && t.attempts > 1) t.status = 'flaky';
    // coverage per capability: a capability with checks is pass/fail (flaky if the test only passed on retry);
    // one that was never checked must have been marked unsupported or unimplemented, so a gap can't read as a pass
    const caps = [...new Set(t.checks.filter(c => c.cap).map(c => c.cap))];
    for (const cap of caps) { const bad = t.checks.some(c => c.cap === cap && !c.ok);
      t.cover.push({ cap, status: bad ? 'fail' : t.status === 'flaky' ? 'flaky' : 'pass' }); }
    this.coverage.push(...t.cover.map(c => ({ test: name, ...c })));
    this.tests.push(t); this.cur = null;
    console.log((t.status === 'pass' ? 'PASS ' : t.status === 'flaky' ? 'FLAKY' : 'FAIL ') + ' ' + name + '  (' + (t.ms / 1000).toFixed(1) + ' s)');
    t.checks.filter(c => !c.ok).forEach(c => console.log('       ' + c.what + ': expected ' + short(c.expected) + ', got ' + short(c.actual)));
    return t;
  }

  /* check('hearts reset after restart', 5, actual) or check('coins went down', true, cond, {coins}) */
  check(what, expected, actual) {
    const ok = typeof expected === 'function' ? !!expected(actual) : JSON.stringify(expected) === JSON.stringify(actual);
    this.cur.checks.push({ what, ok, cap: this.cur.cap, expected: typeof expected === 'function' ? (expected.label || 'see test') : expected, actual });
    return ok;
  }
  note(text) { this.cur.log.push('note: ' + text); }
  /* which capability the next checks belong to (start, question, movement...) */
  cap(name) { this.cur.cap = name; }
  /* a capability this test did not check: 'unsupported' (the app has no such thing, adapter says why) or 'unimplemented' (no test written yet) */
  cover(cap, status, why) { const c = { cap, status, why }; if (this.cur) this.cur.cover.push(c); else this.coverage.push({ test: '(app)', ...c }); }
  async shot(pg, name) {
    const f = this.app.id + '_' + name.replace(/[^a-z0-9_-]+/gi, '_') + '.png';
    await pg.screenshot({ path: path.join(this.out, f) }).catch(() => {}); this.cur.shots.push(f); return f;
  }

  /* results.json (machine) + summary.md (people). Returns the exit code: 0 pass, 1 a test failed. */
  write(extra = {}) {
    const fail = this.tests.filter(t => t.status === 'fail').length, flaky = this.tests.filter(t => t.status === 'flaky').length;
    const cov = s => this.coverage.filter(c => c.status === s), gaps = cov('unimplemented');
    const res = { app: this.app.id, name: this.app.name, lane: this.lane, tier: this.app.tier, commit: process.env.GITHUB_SHA || git('rev-parse HEAD'),
      when: new Date().toISOString(), seconds: Math.round((Date.now() - this.started) / 1000), passed: this.tests.length - fail, failed: fail, flaky,
      coverage: this.coverage, unsupported: cov('unsupported').length, unimplemented: gaps.length, tests: this.tests, ...extra };
    fs.writeFileSync(path.join(this.out, 'results.json'), JSON.stringify(res, null, 1));
    const L = [];
    L.push(`### ${this.app.name}: ${fail ? 'FAILED' : gaps.length ? 'passed what is tested, ' + gaps.length + ' not tested yet' : 'passed'} (${this.lane} lane, tier ${this.app.tier})`);
    L.push(`${res.passed} of ${this.tests.length} tests passed${flaky ? `, ${flaky} only on retry (flaky)` : ''} in ${res.seconds} s. Commit \`${String(res.commit).slice(0, 7)}\`.`);
    if (extra.fps) L.push(`Speed at ${extra.fps.cpu}x CPU slowdown: ${extra.fps.fps} fps.`);
    L.push('', '| Test | Result | Details |', '| --- | --- | --- |');
    for (const t of this.tests) {
      const bad = t.checks.filter(c => !c.ok);
      const det = bad.length ? bad.map(c => `**${c.what}**: expected ${short(c.expected)}, got ${short(c.actual)}`).join('<br>') : t.checks.length + ' checks';
      L.push(`| ${t.name} | ${t.status === 'pass' ? 'pass' : t.status === 'flaky' ? 'flaky (passed on retry)' : '**FAIL**'} | ${det.replace(/\|/g, '\\|')} |`);
    }
    if (this.coverage.length) {
      const label = { pass: 'pass', flaky: 'flaky (passed on retry)', fail: '**FAIL**', unsupported: 'unsupported (game has none)', unimplemented: '**not tested yet**' };
      L.push('', '| What is covered | Result | Why |', '| --- | --- | --- |');
      for (const c of this.coverage) L.push(`| ${c.cap}${/\((board|phone)\)$/.test(c.test) ? ' at ' + c.test.match(/\((\w+)\)$/)[1] + ' size' : ''} | ${label[c.status] || c.status} | ${(c.why || '').replace(/\|/g, '\\|')} |`);
    }
    const logs = this.tests.filter(t => t.status !== 'pass' && t.log.length);
    if (logs.length) { L.push('', '<details><summary>Page logs from failed tests</summary>', ''); logs.forEach(t => { L.push(`**${t.name}**`, '```', ...t.log.slice(0, 20), '```'); }); L.push('</details>'); }
    const shots = this.tests.flatMap(t => t.shots); if (shots.length) L.push('', `Screenshots (${shots.length}) are in the \`qa-results\` artifact, folder \`${this.app.id}\`: ` + shots.slice(0, 12).map(s => '`' + s + '`').join(', '));
    fs.writeFileSync(path.join(this.out, 'summary.md'), L.join('\n') + '\n');
    return fail ? 1 : 0;
  }
}

function git(args) { try { return require('child_process').execSync('git ' + args, { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch (e) { return 'unknown'; } }

module.exports = { Run, ROOT, VIEWPORTS, sleep, git };
