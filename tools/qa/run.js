#!/usr/bin/env node
/* spitz.dev QA runner: one command for every app.
     node tools/qa/run.js rook_and_ruin                 baseline + scenarios for one app (quick lane)
     node tools/qa/run.js rook_and_ruin --lane full     + the board-size viewport and the app's own full suite
     node tools/qa/run.js --changed origin/main         only the apps whose files changed since that ref
     node tools/qa/run.js --all                         every app in apps.json
   Lanes: quick (baseline at Chromebook size, scenarios, app's own quick suite) | full (+ 1920x1080, full suite).
   Output: qa-out/<app>/results.json, qa-out/<app>/summary.md, screenshots, and qa-out/summary.md for everything.
   Every result is one of: pass, fail, flaky (passed only on retry), unsupported (the app has no such thing, and the adapter says why)
   or unimplemented (nothing tests it yet). Untested is never reported as passed: the headline names the gaps.
   Exit codes: 0 nothing failed, 1 a test failed (or, with --strict, something is untested), 2 the runner itself broke. */
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

/* Changed pages that no adapter covers: a game page, the hub, Checkpoint... They get the Safety check only, and the report says so. */
function uncovered(files) {
  const covered = f => CFG.apps.some(a => a.paths.some(p => f === p || f.startsWith(p)));
  return [...new Set((files || []).filter(f => /\.html$/.test(f) && !covered(f) && !/^(tools|\.github)\//.test(f)))];
}

/* The app's own suite (e.g. Rook & Ruin's run_tests.sh): each PASS/FAIL line becomes a test in the same report. */
async function ownSuite(run, app) {
  const cmd = app.suite && app.suite[lane]; if (!cmd || argv.includes('--no-suite')) return;
  await run.test(`${app.name} own suite (${lane})`, async (r) => {
    r.cap('own suite');
    const t0 = Date.now(); const p = spawnSync('bash', ['-c', cmd], { cwd: ROOT, encoding: 'utf8', timeout: 25 * 60 * 1000 });
    const out = (p.stdout || '') + (p.stderr || '');
    const lines = out.split('\n'), pass = lines.filter(l => /^PASS /.test(l)).map(l => l.slice(5)), fail = lines.filter(l => /^FAIL /.test(l)).map(l => l.slice(5));
    r.note(`${pass.length} passed: ${pass.join(', ')}`);
    lines.filter(l => /^BOT /.test(l)).forEach(l => r.note(l));
    // a failed own test gets one rerun on its own (app.suite.one); passing then makes the whole test "flaky", never a plain pass
    for (const f of fail) {
      const i = lines.indexOf('FAIL ' + f), tail = lines.slice(i + 1, i + 6), errs = tail.find(l => /errors \[/.test(l));
      const first = (errs ? errs.slice(errs.indexOf('errors [')) : tail.join(' ')).slice(0, 300) || 'failed';
      let again = null;
      if (app.suite.one) { const q = spawnSync('bash', ['-c', app.suite.one.replace('{test}', f)], { cwd: ROOT, encoding: 'utf8', timeout: 10 * 60 * 1000 });
        again = (((q.stdout || '') + (q.stderr || '')).match(/errors \[.*\]/g) || ['no result']).pop(); }
      if (again === 'errors []') r.flaky(`own test ${f} failed once (${first}), passed on its rerun`);
      else r.check(`own test ${f}`, 'errors []', again ? first + '; rerun: ' + again : first);
    }
    r.check('own suite finished', 0, p.status === null ? 'timed out' : fail.length ? 0 : p.status);   // failed tests are reported one by one above
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
    if (app.tier >= 2 && (A.scenarios || []).length) for (const s of A.scenarios) { await run.test(s.name, r => { r.cap('scenario: ' + s.name); return s.run(r); }); }
    else run.cover('game-specific scenarios', 'unimplemented', app.tier >= 2 ? 'tier 2 but no scenarios written' : 'tier ' + app.tier + ': only the shared baseline so far');
  } finally { await run.close(); }
  await ownSuite(run, app);
  return run.write();
}

(async () => {
  let apps, why = 'asked for by name', files = [];
  if (flag('--changed')) ({ apps, why, files } = changedApps(flag('--changed')));
  else if (argv.includes('--all')) { apps = CFG.apps; why = 'all apps'; }
  else { const ids = argv.filter(a => !a.startsWith('--') && a !== lane); apps = CFG.apps.filter(a => ids.includes(a.id));
    const unknown = ids.filter(id => !CFG.apps.some(a => a.id === id)); if (unknown.length) { console.error('Unknown app: ' + unknown.join(', ') + '. Known: ' + CFG.apps.map(a => a.id).join(', ')); process.exit(2); } }
  /* --plan: only say what would run (CI uses it to skip installing Chrome when nothing needs playing) */
  if (argv.includes('--plan')) { const ids = apps.map(a => a.id).join(' ');
    console.log(`Would play: ${ids || 'nothing'} (${why})`); if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `apps=${ids}\n`); process.exit(0); }
  fs.mkdirSync(path.join(ROOT, 'qa-out'), { recursive: true });
  console.log(`QA ${lane} lane: ${apps.map(a => a.id).join(', ') || 'nothing to run'} (${why})`);
  let code = 0, gaps = 0, flaky = 0; const parts = [`## Gameplay checks (${lane} lane)`, `Apps run: ${apps.map(a => a.name).join(', ') || 'none'} (${why}).`, ''];
  for (const [i, app] of apps.entries()) {
    try { code = Math.max(code, await runApp(app, i));
      const res = JSON.parse(fs.readFileSync(path.join(ROOT, 'qa-out', app.id, 'results.json'), 'utf8')); gaps += res.unimplemented || 0; flaky += res.flaky || 0;
      parts.push(fs.readFileSync(path.join(ROOT, 'qa-out', app.id, 'summary.md'), 'utf8')); }
    catch (e) { code = 2; parts.push(`### ${app.name}: the test runner broke`, '```', String(e.stack || e).slice(0, 1500), '```'); console.error(e); }
  }
  const bare = uncovered(files);
  if (bare.length) { gaps += bare.length; parts.push('### Changed pages with no gameplay tests yet', 'These get the Safety check only (loads, starts, no errors). Untested, not passed:', ...bare.map(f => '- `' + f + '`'), ''); }
  if (!apps.length && !bare.length) parts.push('No page with gameplay tests was changed, so there was nothing to play. The Safety check still applies.');
  if (argv.includes('--strict') && gaps && code === 0) code = 1;
  if (flaky) parts.splice(1, 0, `**${flaky} test(s) only passed on a second try (flaky).** They count as warnings, not passes: see the rows marked flaky.`);
  parts.splice(1, 0, code === 2 ? '**The test runner itself broke.**' : code === 1 && !gaps ? '**A gameplay check failed.**'
    : code === 1 ? `**A gameplay check failed** (or --strict and ${gaps} untested).` : gaps ? `**Nothing failed, but ${gaps} thing(s) are not tested yet** (listed below as "not tested yet").` : '**Everything that ran passed, and nothing is untested.**');
  const md = parts.join('\n');
  fs.writeFileSync(path.join(ROOT, 'qa-out', 'summary.md'), md);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + '\n');
  console.log(!apps.length && code === 0 && !gaps ? '\nNothing to play for this change.' : code === 0 && gaps ? `\nNothing failed. ${gaps} thing(s) not tested yet (see qa-out/summary.md).` : code === 0 ? '\nAll gameplay checks passed.' : code === 1 ? '\nA gameplay check failed. See qa-out/summary.md.' : '\nThe test runner itself broke. See qa-out/summary.md.');
  process.exit(code);
})().catch(e => { console.error(e); process.exit(2); });
