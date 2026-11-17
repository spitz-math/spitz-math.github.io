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

import { addReading, checkAttach, isPdf, readingPath } from './readings.ts'
const H = (c: string) => c.repeat(64)

test('isPdf looks for the PDF header', () => {
  assert.equal(isPdf(new TextEncoder().encode('%PDF-1.7\n...')), true)
  assert.equal(isPdf(new TextEncoder().encode('\n\n%PDF-1.4')), true)
  assert.equal(isPdf(new TextEncoder().encode('<html>not a pdf')), false)
})

test('reading paths stay inside the owner folder and are safe', () => {
  assert.equal(readingPath(U, 'a', 'abcdef123456', 'Chapter 7: Motivation!.PDF'), `${U}/a/abcdef12-Chapter-7-Motivation-.pdf`)
  assert.equal(readingPath(U, '../x', 'abcdef12', '../../evil'), `${U}/-x/abcdef12-evil.pdf`)
  assert.equal(readingPath(U, 'a', 'abcdef12', '???'), `${U}/a/abcdef12-reading.pdf`)
})

test('attach adds a reading and keeps steps, dates and other readings', () => {
  const d = doc()
  d.tasks[0].checklist = [{ id: 's1', text: 'Read', done: true, planDate: '2026-11-12' }]
  d.tasks[0].due = '2026-11-17'
  const out = addReading(d, 'a', { id: 'n1', title: 'Chapter 8', path: `${U}/a/n1-ch8.pdf`, size: 10, sha256: H('a') })
  const t = out.doc.tasks[0]
  assert.equal(t.readings!.length, 3)
  assert.equal(t.readings![2].title, 'Chapter 8')
  assert.deepEqual(t.checklist, d.tasks[0].checklist)
  assert.equal(t.due, '2026-11-17')
  assert.equal(out.doc.tasks[1], d.tasks[1])
  assert.equal(out.task.readings, 3)
})

test('same PDF twice is refused; same title gets a number', () => {
  const once = addReading(doc(), 'b', { id: 'n1', title: 'Only', path: `${U}/b/n1.pdf`, size: 1, sha256: H('b') }).doc
  assert.equal(once.tasks[1].readings![1].title, 'Only (2)')
  assert.equal(checkAttach(once, 'b', H('b')).existing?.id, 'n1')
  assert.throws(() => addReading(once, 'b', { id: 'n2', title: 'Again', path: `${U}/b/n2.pdf`, size: 1, sha256: H('b') }), /Already attached as "Only \(2\)"/)
  assert.equal(checkAttach(once, 'b', H('c')).existing, null)
})

test('attach refuses unknown assignments and full lists', () => {
  assert.throws(() => checkAttach(doc(), 'zzz', H('a')), /No assignment/)
  const full = doc()
  full.tasks[2].readings = Array.from({ length: 20 }, (_, i) => ({ id: 'r' + i, title: 'R' + i, path: `${U}/c/${i}.pdf` }))
  assert.throws(() => checkAttach(full, 'c', H('a')), /20 readings/)
})

import { cleanLink, findFinalFile, setFinalWork } from './readings.ts'

test('final work: file, link and note, never touching submission or steps', () => {
  const d = doc(); d.tasks[0].checklist = [{ id: 's', text: 'Write', done: true, planDate: '' }]
  const a = setFinalWork(d, 'a', { file: { title: 'My paper', path: `${U}/a/final-1.pdf`, size: 5, sha256: H('d') }, link: 'https://youtu.be/x', note: 'Quiz 18/20' })
  const t = a.doc.tasks[0]
  assert.deepEqual(t.finalWork, { file: { title: 'My paper', path: `${U}/a/final-1.pdf`, size: 5, sha256: H('d') }, link: 'https://youtu.be/x', note: 'Quiz 18/20' })
  assert.equal(t.submission, 'unconfirmed'); assert.equal(t.status, 'todo'); assert.deepEqual(t.checklist, d.tasks[0].checklist)
  assert.equal(t.readings!.length, 2)
  assert.equal(a.task.replaced, null)
  const b = setFinalWork(a.doc, 'a', { file: { title: 'v2', path: `${U}/a/final-2.pdf`, size: 6, sha256: H('e') } })
  assert.equal(b.task.replaced, `${U}/a/final-1.pdf`); assert.equal(b.doc.tasks[0].finalWork!.link, 'https://youtu.be/x')
  assert.throws(() => setFinalWork(b.doc, 'a', { file: { title: 'same', path: `${U}/a/final-3.pdf`, size: 6, sha256: H('e') } }), /Already attached/)
  const c = setFinalWork(b.doc, 'a', { clearFile: true, link: '', note: '' })
  assert.equal(c.doc.tasks[0].finalWork, undefined); assert.equal(c.task.replaced, `${U}/a/final-2.pdf`); assert.equal(c.task.finalWork, null)
})

test('final work links must be http(s); lookups stay in the owner folder', () => {
  assert.throws(() => cleanLink('javascript:alert(1)'), /http/)
  assert.equal(cleanLink(' https://a.b/c '), 'https://a.b/c')
  assert.throws(() => setFinalWork(doc(), 'zzz', { note: 'x' }), /No assignment/)
  const d = doc(); d.tasks[0].finalWork = { file: { title: 'x', path: 'other/a/f.pdf' }, note: 'n' }
  const f = findFinalFile(d, U, 'a'); assert.equal(f.file, null); assert.equal(f.note, 'n')
})
