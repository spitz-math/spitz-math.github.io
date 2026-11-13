// Run: node --experimental-strip-types --test grad-school/bridge/supabase/functions/otc-bridge/readings.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { Doc } from './logic.ts'
import { findReading, pageSlice } from './readings.ts'

const U = 'user-1'
const doc = (): Doc => ({
  version: 4, courses: [],
  tasks: [
    { id: 'a', course: 'c', title: 'Chapter 7', due: '', target: '', status: 'todo', submission: 'unconfirmed', notes: '', checklist: [], submissionRequired: true,
      readings: [{ id: 'r1', title: 'Chapter 7 Motivation', path: `${U}/a/x-ch7.pdf` }, { id: 'r2', title: 'Rubric', path: `${U}/a/y-rubric.pdf` }] },
    { id: 'b', course: 'c', title: 'One reading', due: '', target: '', status: 'todo', submission: 'unconfirmed', notes: '', checklist: [], submissionRequired: true,
      readings: [{ id: 'r3', title: 'Only', path: `${U}/b/z.pdf` }] },
    { id: 'c', course: 'c', title: 'None', due: '', target: '', status: 'todo', submission: 'unconfirmed', notes: '', checklist: [], submissionRequired: true },
    { id: 'd', course: 'c', title: 'Bad path', due: '', target: '', status: 'todo', submission: 'unconfirmed', notes: '', checklist: [], submissionRequired: true,
      readings: [{ id: 'r4', title: 'Other', path: `someone-else/d/z.pdf` }] },
  ],
})

test('finds a reading by id, exact title or part of a title', () => {
  assert.equal(findReading(doc(), U, 'a', 'r2').reading.title, 'Rubric')
  assert.equal(findReading(doc(), U, 'a', 'rubric').reading.id, 'r2')
  assert.equal(findReading(doc(), U, 'a', 'motivation').reading.id, 'r1')
  assert.equal(findReading(doc(), U, 'b').reading.id, 'r3')
})

test('asks which reading when there are several, and explains when none', () => {
  assert.throws(() => findReading(doc(), U, 'a'), /2 readings/)
  assert.throws(() => findReading(doc(), U, 'c'), /no reading PDFs/)
  assert.throws(() => findReading(doc(), U, 'zzz'), /No assignment/)
  assert.throws(() => findReading(doc(), U, 'a', 'syllabus'), /No reading "syllabus"/)
})

test('refuses paths outside the owner folder', () => {
  assert.throws(() => findReading(doc(), U, 'd'), /outside/)
})

test('pages are sliced and capped with a next page', () => {
  const pages = ['one', 'two', 'x'.repeat(50), 'four']
  const all = pageSlice(pages)
  assert.equal(all.totalPages, 4); assert.equal(all.nextPage, null); assert.match(all.text, /--- Page 4 ---\nfour/)
  const capped = pageSlice(pages, 1, undefined, 60)
  assert.equal(capped.toPage, 2); assert.equal(capped.nextPage, 3); assert.match(capped.note, /fromPage 3/)
  const mid = pageSlice(pages, 2, 2)
  assert.equal(mid.fromPage, 2); assert.equal(mid.toPage, 2); assert.equal(mid.nextPage, null)
  assert.equal(pageSlice(pages, 99).fromPage, 4)
  assert.match(pageSlice(['', ' ']).note, /scanned/)
})
