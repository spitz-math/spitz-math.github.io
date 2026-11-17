#!/usr/bin/env node
/* spitz.dev QA runner: one command for every app.
     node tools/qa/run.js rook_and_ruin                 baseline + scenarios for one app (quick lane)
     node tools/qa/run.js rook_and_ruin --lane full     + the board-size viewport and the app's own full suite
     node tools/qa/run.js --changed origin/main         only the apps whose files changed since that ref
     node tools/qa/run.js --all                         every app in apps.json
   Lanes: quick (baseline at Chromebook size, scenarios, app's own quick suite) | full (+ 1920x1080, full suite).
   Output: qa-out/<app>/results.json, qa-out/<app>/summary.md, screenshots, and qa-out/summary.md for everything.
   Exit codes: 0 all passed, 1 a test failed, 2 the runner itself broke (so "game broken" and "test broken" look different). */
const fs = require('fs'), path = require('path'), { execSync, spawnSync } = require('child_process');
const { Run, ROOT, git } = require('./lib/harness');
const { tier1 } = require('./lib/tier1');

const CFG = JSON.parse(fs.readFileSync(path.join(__dirname, 'apps.json'), 'utf8'));
const argv = process.argv.slice(2), flag = n => { const i = argv.indexOf(n); return i >= 0 ? (argv[i + 1] || true) : null; };
const lane = flag('--lane') || 'quick';

/* Which apps a change touches: an app's own paths, or every app when a shared file changed. */
function changedApps(ref) {
  let files = [];
  try { files = execSync(`git diff --name-only ${ref}...HEAD`, { cwd: ROOT }).toString().split('\n').filter(Boolean); }
  catch (e) { console.log(`Could not diff against ${ref}; running every app.`); return { apps: CFG.apps, why: 'diff failed' }; }
  const hit = (f, prefixes) => prefixes.some(p => f === p || f.startsWith(p));
  const shared = files.filter(f => hit(f, CFG.shared));
  if (shared.length) return { apps: CFG.apps, why: 'shared files changed: ' + shared.slice(0, 5).join(', '), files };
  const apps = CFG.apps.filter(a => files.some(f => hit(f, a.paths)));
  return { apps, why: apps.length ? 'app files changed' : 'no app with tests was touched', files };
}

/* The app's own suite (e.g. Rook & Ruin's run_tests.sh): each PASS/FAIL line becomes a test in the same report. */
async function ownSuite(run, app) {
  const cmd = app.suite && app.suite[lane]; if (!cmd || argv.includes('--no-suite')) return;
  await run.test(`${app.name} own suite (${lane})`, async (r) => {
    const t0 = Date.now(); const p = spawnSync('bash', ['-c', cmd], { cwd: ROOT, encoding: 'utf8', timeout: 25 * 60 * 1000 });
    const out = (p.stdout || '') + (p.stderr || '');
    const lines = out.split('\n'), pass = lines.filter(l => /^PASS /.test(l)).map(l => l.slice(5)), fail = lines.filter(l => /^FAIL /.test(l)).map(l => l.slice(5));
    r.note(`${pass.length} passed: ${pass.join(', ')}`);
    lines.filter(l => /^BOT /.test(l)).forEach(l => r.note(l));
    fail.forEach(f => { const i = lines.indexOf('FAIL ' + f); r.check(`own test ${f}`, 'errors []', lines.slice(i + 1, i + 4).join(' ').slice(0, 300) || 'failed'); });
    r.check('own suite finished', 0, p.status === null ? 'timed out' : p.status);
    r.check('own suite ran tests', true, pass.length + fail.length > 0);
    r.note('took ' + Math.round((Date.now() - t0) / 1000) + ' s');
  }, { retry: 0 });
}

async function runApp(app, i) {
  const A = require(path.join(__dirname, app.adapter));
  const run = new Run(app, lane, { port: 8211 + i });
  await run.open();
  try {
    if (app.tier >= 1) { await tier1(run, A, 'chromebook'); if (lane === 'full') await tier1(run, A, 'board'); }
    if (app.tier >= 2) for (const s of A.scenarios || []) await run.test(s.name, r => s.run(r));
  } finally { await run.close(); }
  await ownSuite(run, app);
  return run.write();
}

(async () => {
  let apps, why = 'asked for by name';
  if (flag('--changed')) ({ apps, why } = changedApps(flag('--changed')));
  else if (argv.includes('--all')) { apps = CFG.apps; why = 'all apps'; }
  else { const ids = argv.filter(a => !a.startsWith('--') && a !== lane); apps = CFG.apps.filter(a => ids.includes(a.id));
    const unknown = ids.filter(id => !CFG.apps.some(a => a.id === id)); if (unknown.length) { console.error('Unknown app: ' + unknown.join(', ') + '. Known: ' + CFG.apps.map(a => a.id).join(', ')); process.exit(2); } }
  fs.mkdirSync(path.join(ROOT, 'qa-out'), { recursive: true });
  console.log(`QA ${lane} lane: ${apps.map(a => a.id).join(', ') || 'nothing to run'} (${why})`);
  let code = 0; const parts = [`## Gameplay checks (${lane} lane)`, `Apps run: ${apps.map(a => a.name).join(', ') || 'none'} (${why}).`, ''];
  for (const [i, app] of apps.entries()) {
    try { code = Math.max(code, await runApp(app, i)); parts.push(fs.readFileSync(path.join(ROOT, 'qa-out', app.id, 'summary.md'), 'utf8')); }
    catch (e) { code = 2; parts.push(`### ${app.name}: the test runner broke`, '```', String(e.stack || e).slice(0, 1500), '```'); console.error(e); }
  }
  if (!apps.length) parts.push('No app with gameplay tests was changed, so only the Safety check applies.');
  const md = parts.join('\n');
  fs.writeFileSync(path.join(ROOT, 'qa-out', 'summary.md'), md);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + '\n');
  console.log(code === 0 ? '\nAll gameplay checks passed.' : code === 1 ? '\nA gameplay check failed. See qa-out/summary.md.' : '\nThe test runner itself broke. See qa-out/summary.md.');
  process.exit(code);
})().catch(e => { console.error(e); process.exit(2); });
