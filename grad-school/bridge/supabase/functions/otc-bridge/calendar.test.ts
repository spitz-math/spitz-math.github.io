// Run: node --experimental-strip-types --test grad-school/bridge/supabase/functions/otc-bridge/calendar.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { Doc } from './logic.ts'
import { applySync, eventKind, isPageItem, localDate, parseIcs, planSync, similarity } from './calendar.ts'

const ICS = [
  'BEGIN:VCALENDAR', 'VERSION:2.0',
  'BEGIN:VEVENT', 'UID:q3@d2l', 'SUMMARY:Quiz 3 - Due', 'DTSTART:20261118T055900Z', 'LOCATION:EDFR 6388 - Foundations', 'END:VEVENT',
  'BEGIN:VEVENT', 'UID:q3s@d2l', 'SUMMARY:Quiz 3 - Availability Starts', 'DTSTART:20261110T060000Z', 'LOCATION:EDFR 6388 - Foundations', 'END:VEVENT',
  'BEGIN:VEVENT', 'UID:df4@d2l', 'SUMMARY:Discussion Forum 4 (DF4) Video - Due', 'DTSTART;TZID=America/Chicago:20261117T235900', 'LOCATION:EDFR-6388-01', 'END:VEVENT',
  'BEGIN:VEVENT', 'UID:new@d2l', 'SUMMARY:Week 5 Discussion Forum - Due', 'DTSTART:20261125T055900Z', 'LOCATION:EDCI 7355', 'DESCRIPTION:Post two paragraphs\\, then reply.', 'END:VEVENT',
  'BEGIN:VEVENT', 'UID:sum@d2l', 'SUMMARY:Montigue & Jitendra critical', '  summary - Due', 'DTSTART:20261118T055900Z', 'LOCATION:EDCI 7355', 'END:VEVENT',
  'BEGIN:VEVENT', 'UID:old@d2l', 'SUMMARY:Week 1 forum - Due', 'DTSTART:20260901T055900Z', 'LOCATION:EDCI 7355', 'END:VEVENT',
  'END:VCALENDAR',
].join('\r\n')

const doc = (): Doc => ({
  version: 4,
  courses: [{ id: 'one', name: 'EDFR 6388' }, { id: 'two', name: 'EDCI 7355' }],
  tasks: [
    { id: 'q', course: 'one', title: 'Module 4 — Quiz 3', due: '', target: '2026-11-16', status: 'todo', submission: 'unconfirmed', notes: '', checklist: [], submissionRequired: true },
    { id: 'v', course: 'one', title: 'Module 4 DF4 — record and post video', due: '2026-11-16', target: '', status: 'todo', submission: 'unconfirmed', notes: '', checklist: [], submissionRequired: true },
    { id: 'm', course: 'two', title: 'Montigue & Jitendra — 2-page critical summary', due: '2026-11-17', target: '', status: 'todo', submission: 'unconfirmed', notes: '', checklist: [{ id: 's', text: 'Read', done: true, planDate: '' }], submissionRequired: true },
  ],
})

test('parses events, unfolds lines and unescapes text', () => {
  const ev = parseIcs(ICS)
  assert.equal(ev.length, 6)
  assert.equal(ev[4].summary, 'Montigue & Jitendra critical summary - Due')
  assert.equal(ev[3].description, 'Post two paragraphs, then reply.')
})

test('due times convert to the local calendar date', () => {
  assert.equal(localDate('20261118T055900Z', 'America/Chicago'), '2026-11-17') // 11:59 PM Central
  assert.equal(localDate('20261117T235900|America/Chicago', 'America/Chicago'), '2026-11-17')
  assert.equal(localDate('20261118T005900|America/New_York', 'America/Chicago'), '2026-11-17')
  assert.equal(localDate('20261117', 'America/Chicago'), '2026-11-17')
})

test('event kinds and title matching', () => {
  assert.deepEqual(eventKind('Quiz 3 - Due'), { title: 'Quiz 3', kind: 'due' })
  assert.equal(eventKind('Quiz 3 - Availability Starts').kind, 'start')
  assert.ok(similarity('Module 4 — Quiz 3', 'Quiz 3') >= 0.6)
  assert.ok(similarity('Module 4 — Quiz 3', 'Quiz 4') < 0.6)
})

test('plan: fills empty dates, reports changed dates and new items, skips starts and old items', () => {
  const plan = planSync(doc(), parseIcs(ICS), '2026-11-12', 'America/Chicago')
  assert.deepEqual(plan.filled, [{ taskId: 'q', title: 'Module 4 — Quiz 3', due: '2026-11-17' }])
  assert.deepEqual(plan.changed.map((c) => [c.taskId, c.trackerDue, c.brightspaceDue]), [['v', '2026-11-16', '2026-11-17']])
  assert.equal(plan.same, 1)
  assert.deepEqual(plan.newItems.map((n) => [n.title, n.course, n.brightspaceDue]), [['Week 5 Discussion Forum', 'two', '2026-11-24']])
  assert.equal(plan.linked.length, 3)
})

test('apply: links + fills always; changes and adds only when asked; keeps everything else', () => {
  const d = doc()
  const plan = planSync(d, parseIcs(ICS), '2026-11-12', 'America/Chicago')
  const a = applySync(d, plan)
  assert.equal(a.doc.tasks.find((t) => t.id === 'q')!.due, '2026-11-17')
  assert.equal(a.doc.tasks.find((t) => t.id === 'v')!.due, '2026-11-16')
  assert.equal(a.doc.tasks.length, 3)
  assert.deepEqual(a.doc.tasks.find((t) => t.id === 'm')!.checklist, d.tasks[2].checklist)
  assert.equal(a.doc.tasks.find((t) => t.id === 'v')!.lms?.uid, 'df4@d2l')
  const b = applySync(d, plan, { applyChanges: ['df4@d2l'], addNew: 'all' })
  assert.equal(b.doc.tasks.find((t) => t.id === 'v')!.due, '2026-11-17')
  const added = b.doc.tasks.at(-1)!
  assert.equal(added.title, 'Week 5 Discussion Forum'); assert.equal(added.course, 'two'); assert.equal(added.submission, 'unconfirmed'); assert.equal(added.due, '2026-11-24')
  assert.deepEqual(b.task, { linked: 3, filled: 1, changed: 1, added: 1, kept: 0 })
  // Second sync: linked by uid now, nothing new to link.
  const again = planSync(b.doc, parseIcs(ICS), '2026-11-12', 'America/Chicago')
  assert.equal(again.linked.length, 0); assert.equal(again.newItems.length, 0); assert.equal(again.changed.length, 0)
})

test('week and module numbers must agree when both titles have them', () => {
  assert.equal(similarity('Week 4 Discussion Forum — disability', 'Week 5 Discussion Forum'), 0)
  assert.ok(similarity('Week 4 Discussion Forum — disability, minority students and mathematics', 'Week 4 Discussion Forum') >= 0.6)
  assert.ok(similarity('Module 4 DF4 — record and post video', 'Discussion Forum 4 (DF4) Video') >= 0.6)
})

test('real-feed cleanup: chapter abbreviations, module pages, old new items, kept dates', () => {
  assert.ok(similarity('Chapter 6 critical summary', '2-page summary: "Reading and Writing the World with Mathematics" ch. 6') >= 0.6)
  assert.equal(similarity('Chapter 6 critical summary', '2-page summary: ch. 5'), 0)
  for (const t of ['MODULE 4 - Overview', 'MODULE 4 Instructions & Expectations', 'Overview', 'Module Instructions & Expectations']) assert.ok(isPageItem(t), t)
  assert.ok(!isPageItem('Quiz 4')); assert.ok(!isPageItem('Written Report - Multimedia Project'))
  const ics = ICS.replace('END:VCALENDAR', ['BEGIN:VEVENT', 'UID:pg@d2l', 'SUMMARY:MODULE 4 - Overview - Due', 'DTSTART:20261119T055900Z', 'LOCATION:EDFR 6388', 'END:VEVENT',
    'BEGIN:VEVENT', 'UID:past@d2l', 'SUMMARY:Quiz # 2 - Due', 'DTSTART:20261110T055900Z', 'LOCATION:EDFR 6388', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n'))
  const d = doc()
  const plan = planSync(d, parseIcs(ics), '2026-11-12', 'America/Chicago')
  assert.deepEqual(plan.newItems.map((n) => n.title), ['Week 5 Discussion Forum'])
  const k = applySync(d, plan, { keep: ['df4@d2l'] })
  assert.equal(k.task.kept, 1)
  const v = k.doc.tasks.find((t) => t.id === 'v')!
  assert.equal(v.due, '2026-11-16'); assert.deepEqual(v.lms, { uid: 'df4@d2l', keepDue: '2026-11-17' })
  assert.equal(planSync(k.doc, parseIcs(ics), '2026-11-12', 'America/Chicago').changed.length, 0)
})
