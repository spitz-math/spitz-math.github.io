// Run: node --experimental-strip-types --test grad-school/bridge/supabase/functions/otc-bridge/planning.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { Doc } from './logic.ts'
import { academicWeek, buildBriefing, suggestCatchUp } from './planning.ts'

const doc = (): Doc => ({
  version: 4, courses: [{ id: 'a', name: 'Course A' }],
  tasks: [
    { id: 'one', course: 'a', title: 'Paper', due: '2026-11-17', target: '2026-11-14',
      status: 'inprogress', submission: 'unconfirmed', submissionRequired: true, notes: '',
      checklist: [
        { id: 'old', text: 'Read', done: false, planDate: '2026-11-11' },
        { id: 'today', text: 'Draft', done: false, planDate: '2026-11-12' },
        { id: 'done', text: 'Outline', done: true, planDate: '2026-11-11' },
      ] },
    { id: 'two', course: 'a', title: 'Submitted', due: '2026-11-13', target: '',
      status: 'done', submission: 'submitted', submissionRequired: true, notes: '', checklist: [] },
    { id: 'three', course: 'a', title: 'Overdue', due: '2026-11-10', target: '',
      status: 'todo', submission: 'unconfirmed', submissionRequired: true, notes: '', checklist: [] },
  ],
})
test('academic week runs Wednesday to Tuesday across months and years', () => {
  assert.deepEqual(academicWeek('2026-11-12'), { start: '2026-11-11', end: '2026-11-17' })
  assert.deepEqual(academicWeek('2027-01-01'), { start: '2026-12-30', end: '2027-01-05' })
})
test('briefing separates due dates, late steps, completion and submission', () => {
  const b = buildBriefing(doc(), '2026-11-12')
  assert.deepEqual(b.dueThisWeek.map(x => x.taskId), ['one'])
  assert.deepEqual(b.overdueAssignments.map(x => x.taskId), ['three'])
  assert.deepEqual(b.overdueSteps.map(x => x.stepId), ['old'])
  assert.deepEqual(b.todaySteps.map(x => x.stepId), ['today'])
  assert.deepEqual(b.progress, { assignmentsTotal: 3, finished: 1, submitted: 1, stepsTotal: 3, stepsDone: 1 })
})
test('catch-up suggestions never mutate original or verified due date', () => {
  const original = doc(), before = JSON.stringify(original)
  const suggestions = suggestCatchUp(original, '2026-11-12', 2)
  assert.deepEqual(suggestions.map(x => [x.stepId, x.to]), [['old', '2026-11-12']])
  assert.equal(JSON.stringify(original), before)
  assert.equal(original.tasks[0].due, '2026-11-17')
})
test('no room before due date reports manual review instead of silently missing deadline', () => {
  const original = doc()
  original.tasks[0].due = '2026-11-11'
  assert.equal(suggestCatchUp(original, '2026-11-12')[0].to, '')
})
test('invalid input rejected', () => {
  assert.throws(() => academicWeek('2026-02-30'))
  assert.throws(() => suggestCatchUp(doc(), '2026-11-12', 0))
})
