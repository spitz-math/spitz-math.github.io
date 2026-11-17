#!/usr/bin/env node
/* Builds the ChatGPT review brief(s) for the shared files a branch changes (tools/review/review.json).
     node tools/review/brief.js                 diff against origin/main
     node tools/review/brief.js <ref> --pr <url>
   Prints "No ChatGPT review needed." or writes qa-out/review/brief-N.txt (each fits Task Drop's 8000-character brief)
   and prints how to send them. Read-only: it never calls ChatGPT itself; the thread sends each brief with create_task. */
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..', '..');
const CFG = JSON.parse(fs.readFileSync(path.join(__dirname, 'review.json'), 'utf8'));
const argv = process.argv.slice(2), pr = argv.includes('--pr') ? argv[argv.indexOf('--pr') + 1] : '';
const base = argv.find(a => !a.startsWith('--') && a !== pr) || 'origin/main';
const git = a => execSync('git ' + a, { cwd: ROOT, maxBuffer: 64 << 20 }).toString();
const hit = f => Object.keys(CFG.paths).find(p => f === p || f.startsWith(p));

function reviewFiles(ref) { return git(`diff --name-only ${ref}...HEAD`).split('\n').filter(Boolean).filter(hit); }
module.exports = { reviewFiles, hit, CFG };
if (require.main !== module) return;

const files = reviewFiles(base);
if (!files.length) { console.log('No ChatGPT review needed: no shared file changed.'); process.exit(0); }

const LIMIT = 8000, HEAD = 2300;   // room for the instructions; the rest is diff
const head = (part, of) => `Independent code review${of > 1 ? ` (part ${part} of ${of})` : ''}. You are the reviewer: read-only, you did not write this code.
Repo: spitz-math/spitz-arcade (Spitz Arcade: HTML math games for middle schoolers on Chromebooks, plus Checkpoint practice tests). ${pr ? 'PR: ' + pr + '. ' : ''}Commit ${git('rev-parse --short HEAD').trim()} vs ${base}.
These files are shared: one mistake can break every game or every student's saved scores. What each file is for:
${[...new Set(files.map(hit))].map(p => '- ' + p + ': ' + CFG.paths[p]).join('\n')}
Look for: real bugs, broken old data (score codes, saves, ids), anything that passes tests but breaks for students, security (secrets, permissions, untrusted input). Ignore style and naming.

ANSWER IN EXACTLY THIS FORMAT (plain text):
VERDICT: APPROVED | REVISE | BLOCKED
SUMMARY: one or two sentences.
FINDINGS: numbered; each = severity (high/medium/low), file, evidence (quote the line), suggested fix. Zero findings is a valid answer; do not pad.
COVERAGE: what you actually checked.
LIMITATIONS: what you could not check (you only see this diff).
Then hand the task back to KODY's turn.

=== DIFF ===
`;
// one chunk per file where possible; split a long file's diff by hunks; cut a single huge hunk with a note
const chunks = [];
for (const f of files) {
  const d = git(`diff -U2 ${base}...HEAD -- "${f}"`).replace(/^index .*\n/m, '');
  const hunks = d.split(/(?=^@@ )/m), room = LIMIT - HEAD - 200;
  let cur = '';
  for (let h of hunks) {
    if (h.length > room) h = h.slice(0, room - 120) + `\n[... ${h.length - room + 120} more characters of this hunk cut ...]\n`;
    if (cur.length + h.length > room) { chunks.push(cur); cur = `(${f} continued)\n`; }
    cur += h;
  }
  chunks.push(cur);
}
// pack small chunks together
const packed = []; for (const c of chunks) { const last = packed[packed.length - 1]; if (last && last.length + c.length < LIMIT - HEAD - 200) packed[packed.length - 1] += '\n' + c; else packed.push(c); }
const out = path.join(ROOT, 'qa-out', 'review'); fs.mkdirSync(out, { recursive: true });
for (const f of fs.readdirSync(out)) fs.unlinkSync(path.join(out, f));
packed.forEach((c, i) => { const b = head(i + 1, packed.length) + c; fs.writeFileSync(path.join(out, `brief-${i + 1}.txt`), b.slice(0, LIMIT)); });
console.log(`ChatGPT review needed: ${files.join(', ')}`);
console.log(`${packed.length} brief(s) in qa-out/review/ (${packed.map((c, i) => 'brief-' + (i + 1) + '.txt').join(', ')}).`);
if (packed.length > 3) console.log('More than 3 parts: review budget is 3 per PR. Send the parts for the riskiest files and say which were skipped.');
console.log('Send each with Sprite Drop create_task: project "spitz-arcade", turn "chatgpt", title "Review: <PR title> (part N)", refs [the PR].');
