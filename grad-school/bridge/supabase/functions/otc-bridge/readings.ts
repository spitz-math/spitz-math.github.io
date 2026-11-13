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
