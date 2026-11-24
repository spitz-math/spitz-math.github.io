// Pure helpers for the read_reading tool. No Supabase or Deno imports, so they
// can be tested with plain Node (see readings.test.ts). The PDF itself is pulled
// from Kody's private otc-readings bucket and turned into text in tools.ts.
import type { Doc } from './logic.ts'

export const READING_BUCKET = 'otc-readings'
export const MAX_CHARS = 60000

type Reading = { id: string; title: string; path: string; size?: number }

/** Finds one reading on one assignment. `reading` is a reading id or title; left out, the only reading. */
export function findReading(doc: Doc, userId: string, assignmentId: string, reading?: string): { task: { id: string; title: string }; reading: Reading } {
  const task = doc.tasks.find((t) => t.id === assignmentId)
  if (!task) throw new Error(`No assignment with id ${assignmentId}. Use get_tracker for ids.`)
  const list = (task.readings ?? []) as Reading[]
  if (!list.length) throw new Error(`"${task.title}" has no reading PDFs attached. Kody attaches them on the site.`)
  let r: Reading | undefined
  if (reading) {
    const q = reading.trim().toLowerCase()
    r = list.find((x) => x.id === reading) ?? list.find((x) => x.title.toLowerCase() === q) ?? list.find((x) => x.title.toLowerCase().includes(q))
    if (!r) throw new Error(`No reading "${reading}" on "${task.title}". Attached: ${list.map((x) => x.title).join('; ')}`)
  } else if (list.length === 1) r = list[0]
  else throw new Error(`"${task.title}" has ${list.length} readings; pass reading as one of: ${list.map((x) => x.title).join('; ')}`)
  // Files always live under the owner's folder; refuse anything else.
  if (!r.path.startsWith(userId + '/') || r.path.includes('..')) throw new Error('That reading points outside your storage folder.')
  return { task: { id: task.id, title: task.title }, reading: r }
}

/** Joins the asked-for pages, stopping before MAX_CHARS so the reply stays small enough. */
export function pageSlice(pages: string[], fromPage = 1, toPage?: number, maxChars = MAX_CHARS) {
  const total = pages.length
  if (!total) return { totalPages: 0, fromPage: 0, toPage: 0, text: '', nextPage: null as number | null, note: 'No pages found.' }
  const from = Math.min(Math.max(1, Math.floor(fromPage)), total)
  const last = Math.min(Math.max(from, Math.floor(toPage ?? total)), total)
  let text = ''
  let end = from - 1
  for (let p = from; p <= last; p++) {
    const chunk = `--- Page ${p} ---\n${(pages[p - 1] ?? '').trim()}\n\n`
    if (text && text.length + chunk.length > maxChars) break
    text += chunk.length > maxChars ? chunk.slice(0, maxChars) + '\n[page cut short]\n' : chunk
    end = p
  }
  const nextPage = end < last ? end + 1 : null
  const blank = !text.replace(/--- Page \d+ ---/g, '').trim()
  return {
    totalPages: total, fromPage: from, toPage: end, text: text.trimEnd(), nextPage,
    note: blank ? 'No text found. This PDF is probably scanned images; ask Kody to paste or upload the pages instead.'
      : nextPage ? `More pages remain. Call read_reading again with fromPage ${nextPage}.` : '',
  }
}

// ---------- attach_reading ----------
export const MAX_READINGS = 20
export const MAX_PDF_BYTES = 50 * 1024 * 1024

/** True when the bytes look like a PDF (the %PDF- header within the first 1 KB). */
export function isPdf(bytes: Uint8Array): boolean {
  const head = new TextDecoder('latin1').decode(bytes.subarray(0, 1024))
  return head.includes('%PDF-')
}

/** Storage path under the owner's folder, same layout the site uses. */
export function readingPath(userId: string, assignmentId: string, readingId: string, fileName: string): string {
  const safe = fileName.replace(/\.pdf$/i, '').replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^[-.]+/, '').slice(0, 80) || 'reading'
  const folder = assignmentId.replace(/[^A-Za-z0-9_-]+/g, '-').slice(0, 100) || 'assignment'
  return `${userId}/${folder}/${readingId.slice(0, 8)}-${safe}.pdf`
}

/** Checks the assignment can take this PDF before anything is uploaded. Returns the reading already attached with the same content, if any. */
export function checkAttach(doc: Doc, assignmentId: string, sha256: string): { taskTitle: string; existing: Reading | null } {
  const task = doc.tasks.find((t) => t.id === assignmentId)
  if (!task) throw new Error(`No assignment with id ${assignmentId}. Use get_tracker for ids.`)
  const list = (task.readings ?? []) as (Reading & { sha256?: string })[]
  const existing = list.find((r) => r.sha256 && r.sha256 === sha256) ?? null
  if (!existing && list.length >= MAX_READINGS) throw new Error(`"${task.title}" already has ${MAX_READINGS} readings, the most an assignment holds.`)
  return { taskTitle: task.title, existing }
}

/** Adds the uploaded reading to the assignment, keeping everything else. A second title clash gets " (2)", " (3)"… */
export function addReading(doc: Doc, assignmentId: string, r: { id: string; title: string; path: string; size: number; sha256: string }) {
  const { existing } = checkAttach(doc, assignmentId, r.sha256)
  if (existing) throw new Error(`Already attached as "${existing.title}".`)
  const tasks = doc.tasks.map((t) => {
    if (t.id !== assignmentId) return t
    const list = t.readings ?? []
    const base = (r.title.trim() || 'Reading').slice(0, 170)
    let title = base
    for (let n = 2; list.some((x) => x.title.toLowerCase() === title.toLowerCase()); n++) title = `${base} (${n})`
    return { ...t, readings: [...list, { id: r.id, title, path: r.path, size: r.size, sha256: r.sha256 }] }
  })
  const task = tasks.find((t) => t.id === assignmentId)!
  return { doc: { ...doc, tasks }, task: { id: task.id, title: task.title, reading: task.readings!.at(-1)!, readings: task.readings!.length } }
}

// ---------- final work (what Kody turned in) ----------
export type FinalFile = { title: string; path: string; size: number; sha256: string }
export type FinalPatch = { file?: FinalFile; clearFile?: boolean; link?: string; note?: string }

/** Cleans a link: http(s) only, 500 chars. Empty string clears. */
export function cleanLink(v: string): string {
  const u = v.trim().slice(0, 500)
  if (!u) return ''
  if (!/^https?:\/\/[^\s"'<>]+$/i.test(u)) throw new Error('link must be an http(s) URL.')
  return u
}

/** Sets parts of an assignment's final work. Never touches submission, status, steps or dates. Returns the replaced file path to delete after saving. */
export function setFinalWork(doc: Doc, assignmentId: string, p: FinalPatch) {
  const old = doc.tasks.find((t) => t.id === assignmentId)
  if (!old) throw new Error(`No assignment with id ${assignmentId}. Use get_tracker for ids.`)
  const cur = old.finalWork ?? {}
  if (p.file && cur.file?.sha256 && cur.file.sha256 === p.file.sha256) throw new Error(`Already attached as "${cur.file.title}".`)
  const next: NonNullable<typeof old.finalWork> = { ...cur }
  let replaced: string | null = null
  if (p.file || p.clearFile) { replaced = cur.file?.path ?? null; delete next.file }
  if (p.file) next.file = { title: (p.file.title.trim() || 'Final work').slice(0, 180), path: p.file.path, size: p.file.size, sha256: p.file.sha256 }
  if (p.link !== undefined) { const l = cleanLink(p.link); if (l) next.link = l; else delete next.link }
  if (p.note !== undefined) { const n = p.note.trim().slice(0, 500); if (n) next.note = n; else delete next.note }
  const empty = !next.file && !next.link && !next.note
  const tasks = doc.tasks.map((t) => {
    if (t.id !== assignmentId) return t
    const { finalWork: _drop, ...rest } = t
    return empty ? rest : { ...rest, finalWork: next }
  })
  return { doc: { ...doc, tasks }, task: { id: old.id, title: old.title, finalWork: empty ? null : { file: next.file?.title ?? null, link: next.link ?? null, note: next.note ?? null }, replaced } }
}

/** The final-work PDF for reading, checked to be inside the owner's folder. */
export function findFinalFile(doc: Doc, userId: string, assignmentId: string) {
  const task = doc.tasks.find((t) => t.id === assignmentId)
  if (!task) throw new Error(`No assignment with id ${assignmentId}. Use get_tracker for ids.`)
  const f = task.finalWork
  const file = f?.file && f.file.path.startsWith(userId + '/') && !f.file.path.includes('..') ? f.file : null
  return { task: { id: task.id, title: task.title }, file, link: f?.link ?? null, note: f?.note ?? null }
}
