// Run: node --experimental-strip-types --test grad-school/bridge/supabase/functions/otc-bridge/logic.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { addAssignment, type Doc, trackerView, updateAssignment } from './logic.ts'

const base = (): Doc => ({
  version: 4,
  courses: [
    { id: 'one', name: 'EDFR 6388', description: 'Foundations', instructor: 'Dr. A' },
    { id: 'two', name: 'EDCI 7355', description: 'Math Ed', instructor: 'Dr. B' },
  ],
  tasks: [],
  weekCalendar: { anchorStart: '2026-11-11', anchorNumber: 4 },
  prefs: { colorByClass: true },
})

test('add keeps other fields and never submits', () => {
  const { doc, task } = addAssignment(base(), { course: 'edci 7355', title: 'Summary', due: '2026-11-17', steps: ['Read', 'Write'] })
  assert.equal(task.course, 'two')
  assert.equal(task.submission, 'unconfirmed')
  assert.equal(task.status, 'todo')
  assert.equal(task.checklist.length, 2)
  assert.deepEqual(doc.weekCalendar, { anchorStart: '2026-11-11', anchorNumber: 4 })
  assert.deepEqual(doc.prefs, { colorByClass: true })
})

test('bad dates and unknown courses are refused', () => {
  assert.throws(() => addAssignment(base(), { course: 'one', title: 'x', due: 'next tuesday' }), /date/)
  assert.throws(() => addAssignment(base(), { course: 'BIO 101', title: 'x' }), /No course/)
})

test('checking every step finishes but does not submit', () => {
  const a = addAssignment(base(), { course: 'one', title: 'Paper', steps: ['Draft', 'Revise'] })
  const b = updateAssignment(a.doc, { id: a.task.id, checkSteps: ['draft'] })
  assert.equal(b.task.status, 'inprogress')
  const c = updateAssignment(b.doc, { id: a.task.id, checkSteps: ['Revise'] })
  assert.equal(c.task.status, 'done')
  assert.equal(c.task.submission, 'unconfirmed')
  const d = updateAssignment(c.doc, { id: a.task.id, markSubmitted: true })
  assert.equal(d.task.submission, 'submitted')
})

test('step plan dates, clearing due, and the tracker view', () => {
  const a = addAssignment(base(), { course: 'one', title: 'Post', due: '2026-11-13', steps: ['Reply'] })
  const b = updateAssignment(a.doc, { id: a.task.id, due: '', stepDates: { Reply: '2026-11-12' } })
  assert.equal(b.task.due, '')
  assert.equal(b.task.checklist[0].planDate, '2026-11-12')
  const v = trackerView(b.doc)
  assert.equal(v.assignments[0].due, 'not verified')
  assert.equal(v.assignments[0].course, 'EDFR 6388')
  const done = updateAssignment(b.doc, { id: a.task.id, checkSteps: ['Reply'], markSubmitted: true })
  assert.equal(trackerView(done.doc).assignments.length, 0)
  assert.equal(trackerView(done.doc, { includeFinished: true }).assignments.length, 1)
})

test('update does not mutate the original document', () => {
  const a = addAssignment(base(), { course: 'one', title: 'Paper', steps: ['Draft'] })
  updateAssignment(a.doc, { id: a.task.id, checkSteps: ['Draft'] })
  assert.equal(a.doc.tasks[0].checklist[0].done, false)
})
