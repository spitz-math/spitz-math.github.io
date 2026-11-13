// Brightspace calendar sync: pure helpers (no Supabase or Deno imports; tested by calendar.test.ts).
// Brightspace gives each student a private calendar feed (.ics). We read it, match its events to
// Off the Clock assignments, and work out what would change. Official dates come from Brightspace,
// so filling an EMPTY due date is safe; a date that differs from Kody's is only reported unless
// Kody asks to apply it, and new Brightspace items are only reported unless Kody asks to add them.
import type { Doc, Task } from './logic.ts'
import { newId } from './logic.ts'

export type CalEvent = { uid: string; summary: string; start: string; allDay: boolean; location: string; description: string }

/** Parses the VEVENTs of an iCalendar file (line unfolding, text unescaping, UTC/TZID/date-only times). */
export function parseIcs(ics: string): CalEvent[] {
  const lines = ics.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '').split('\n')
  const out: CalEvent[] = []
  let cur: Record<string, { value: string; params: string }> | null = null
  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') { cur = {}; continue }
    if (line === 'END:VEVENT') {
      if (cur && cur.DTSTART) {
        const start = cur.DTSTART
        out.push({
          uid: unesc(cur.UID?.value ?? ''),
          summary: unesc(cur.SUMMARY?.value ?? ''),
          start: start.value + (start.params.includes('TZID=') ? '|' + (start.params.match(/TZID=([^;:]+)/)?.[1] ?? '') : ''),
          allDay: /VALUE=DATE(?!-)/.test(start.params) || /^\d{8}$/.test(start.value),
          location: unesc(cur.LOCATION?.value ?? ''),
          description: unesc(cur.DESCRIPTION?.value ?? ''),
        })
      }
      cur = null; continue
    }
    if (!cur) continue
    const m = line.match(/^([A-Z-]+)((?:;[^:]*)?):(.*)$/)
    if (m && !cur[m[1]]) cur[m[1]] = { value: m[3], params: m[2] }
  }
  return out
}
const unesc = (s: string) => s.replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1').trim()

/** The calendar date (YYYY-MM-DD) of an event start in the user's time zone. */
export function localDate(start: string, timeZone: string): string {
  const [v, tzid] = start.split('|')
  const m = v.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/)
  if (!m) return ''
  const [, y, mo, d, h, mi, s, z] = m
  if (!h) return `${y}-${mo}-${d}`
  if (!z && (!tzid || tzid === timeZone)) return `${y}-${mo}-${d}` // floating or already local
  let utc = Date.UTC(+y, +mo - 1, +d, +h, +mi, +s)
  if (!z && tzid) utc -= offsetMinutes(utc, tzid) * 60000 // wall time in tzid -> UTC
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(utc))
  return parts
}
function offsetMinutes(utc: number, tz: string): number {
  try {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
      .formatToParts(new Date(utc)).map((x) => [x.type, x.value]))
    return (Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - utc) / 60000
  } catch { return 0 }
}

/** Splits a Brightspace event title like "Quiz 3 - Due" into the item title and what the date means. */
export function eventKind(summary: string): { title: string; kind: 'due' | 'end' | 'start' | 'other' } {
  const m = summary.match(/^(.*?)\s*[-–—:]\s*(Due|Due Date|Availability Ends|Ends|End Date|Availability Starts|Starts|Start Date)\s*$/i)
  if (!m) return { title: summary.trim(), kind: 'other' }
  const k = m[2].toLowerCase()
  return { title: m[1].trim(), kind: k.startsWith('due') ? 'due' : /end/.test(k) ? 'end' : 'start' }
}

const ALIAS: Record<string, string> = { ch: 'chapter', chs: 'chapter', chap: 'chapter', chapters: 'chapter' }
const STOP = new Set(['the', 'and', 'of', 'to', 'a', 'in', 'for', 'on', 'due', 'module', 'week', 'with', 'your', 'post'])
/** Words plus "word+number" ids such as quiz3, df4, module4, so Quiz 3 never matches Quiz 4. */
function tokens(s: string): { words: Set<string>; ids: Map<string, string> } {
  const raw = s.toLowerCase().replace(/([a-z])(\d)/g, '$1 $2').replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(Boolean).map((w) => ALIAS[w] ?? w)
  const words = new Set<string>(), ids = new Map<string, string>()
  raw.forEach((w, i) => {
    if (/^\d+$/.test(w)) { const prev = raw[i - 1]; if (prev && /^[a-z]+$/.test(prev)) ids.set(prev, w); return }
    if (w.length > 1 && !STOP.has(w)) words.add(w)
  })
  return { words, ids }
}
/** 0..1: shared words over the shorter title, +0.3 for a shared id (df4), 0 when ids clash (quiz 3 vs quiz 4). */
export function similarity(a: string, b: string): number {
  const A = tokens(a), B = tokens(b)
  for (const [k, v] of A.ids) if (B.ids.has(k) && B.ids.get(k) !== v) return 0
  let sharedId = false
  for (const [k, v] of A.ids) if (B.ids.get(k) === v && k !== 'module' && k !== 'week') sharedId = true
  if (!A.words.size || !B.words.size) return sharedId ? 0.6 : 0
  let both = 0
  for (const w of A.words) if (B.words.has(w)) both++
  return Math.min(1, both / Math.min(A.words.size, B.words.size) + (sharedId ? 0.3 : 0))
}

/** Which course an event belongs to: a course whose code (e.g. "EDFR 6388") appears in the event. */
export function courseFor(doc: Doc, ev: CalEvent): string | null {
  const hay = `${ev.location} ${ev.summary} ${ev.description}`.toUpperCase().replace(/\s+/g, ' ')
  for (const c of doc.courses) {
    const code = c.name.toUpperCase().match(/[A-Z]{2,5}\s?-?\s?\d{4}/)?.[0]
    if (code && hay.replace(/[\s-]/g, '').includes(code.replace(/[\s-]/g, ''))) return c.id
  }
  return null
}

/** Brightspace module pages ("MODULE 4 - Overview", "Instructions & Expectations") are not assignments. */
export function isPageItem(title: string): boolean {
  return /^(module\s*\d*\s*[-–—:]?\s*)?(overview|(module\s+)?instructions?\s*(&|and)\s*expectations)$/i.test(title.trim())
}

export type SyncItem = { uid: string; title: string; course: string | null; brightspaceDue: string }
export type SyncPlan = {
  linked: { taskId: string; title: string; uid: string }[]
  filled: { taskId: string; title: string; due: string }[]
  changed: { taskId: string; title: string; trackerDue: string; brightspaceDue: string; uid: string }[]
  newItems: SyncItem[]
  same: number
}

/** Matches calendar items to assignments and lists what would change. Items from 7 days ago to 60 days ahead are matched; only new items due today or later are listed. A date Kody chose to keep (lms.keepDue) is not reported again. */
export function planSync(doc: Doc, events: CalEvent[], today: string, timeZone: string): SyncPlan {
  // One item per uid-less title: prefer the "Due" event, then "Ends"; ignore "Starts".
  const items = new Map<string, SyncItem & { rank: number }>()
  for (const ev of events) {
    const { title, kind } = eventKind(ev.summary)
    if (kind === 'start' || !title || isPageItem(title)) continue
    const due = localDate(ev.start, timeZone)
    if (!due || due < shift(today, -7) || due > shift(today, 60)) continue
    const course = courseFor(doc, ev)
    const key = `${course ?? ''}|${title.toLowerCase()}`
    const rank = kind === 'due' ? 0 : kind === 'end' ? 1 : 2
    const prev = items.get(key)
    if (!prev || rank < prev.rank) items.set(key, { uid: ev.uid || key, title, course, brightspaceDue: due, rank })
  }
  const plan: SyncPlan = { linked: [], filled: [], changed: [], newItems: [], same: 0 }
  const used = new Set<string>()
  for (const it of [...items.values()].sort((a, b) => a.brightspaceDue.localeCompare(b.brightspaceDue))) {
    let task: Task | undefined = doc.tasks.find((t) => t.lms?.uid === it.uid && !used.has(t.id))
    if (!task) {
      let best = 0
      for (const t of doc.tasks) {
        if (used.has(t.id) || t.lms?.uid || t.submissionRequired === false) continue
        if (it.course && t.course !== it.course) continue
        const s = similarity(t.title, it.title)
        if (s > best) { best = s; task = t }
      }
      if (best < 0.6) task = undefined
      if (task) plan.linked.push({ taskId: task.id, title: task.title, uid: it.uid })
    }
    // New items already past due are almost always old work done before the tracker existed.
    if (!task && it.brightspaceDue < today) continue
    if (!task) { plan.newItems.push({ uid: it.uid, title: it.title, course: it.course, brightspaceDue: it.brightspaceDue }); continue }
    used.add(task.id)
    if (!task.due) plan.filled.push({ taskId: task.id, title: task.title, due: it.brightspaceDue })
    else if (task.due !== it.brightspaceDue && task.lms?.keepDue !== it.brightspaceDue) plan.changed.push({ taskId: task.id, title: task.title, trackerDue: task.due, brightspaceDue: it.brightspaceDue, uid: it.uid })
    else plan.same++
  }
  return plan
}

/** Applies a plan: always links and fills empty due dates; changes dates only for applyChanges uids; adds only addNew uids. */
export function applySync(doc: Doc, plan: SyncPlan, opts: { applyChanges?: string[] | 'all'; addNew?: string[] | 'all'; keep?: string[] | 'all' } = {}) {
  const want = (list: string[] | 'all' | undefined, uid: string) => list === 'all' || (Array.isArray(list) && list.includes(uid))
  const tasks = doc.tasks.map((t) => ({ ...t }))
  const byId = new Map(tasks.map((t) => [t.id, t]))
  const done = { linked: 0, filled: 0, changed: 0, added: 0, kept: 0 }
  for (const l of plan.linked) { const t = byId.get(l.taskId); if (t) { t.lms = { uid: l.uid.slice(0, 300) }; done.linked++ } }
  for (const f of plan.filled) { const t = byId.get(f.taskId); if (t && !t.due) { t.due = f.due; done.filled++ } }
  for (const c of plan.changed) {
    const t = byId.get(c.taskId); if (!t) continue
    if (want(opts.applyChanges, c.uid)) { t.due = c.brightspaceDue; done.changed++ }
    else if (want(opts.keep, c.uid)) { t.lms = { uid: (t.lms?.uid ?? c.uid).slice(0, 300), keepDue: c.brightspaceDue }; done.kept++ }
  }
  for (const n of plan.newItems) {
    if (!want(opts.addNew, n.uid) || !n.course || tasks.length >= 300) continue
    tasks.push({ id: newId(), course: n.course, title: n.title.slice(0, 250), due: n.brightspaceDue, target: '', status: 'todo', submission: 'unconfirmed', notes: 'Added from the Brightspace calendar.', checklist: [], submissionRequired: true, lms: { uid: n.uid.slice(0, 300) } })
    done.added++
  }
  return { doc: { ...doc, tasks }, task: done }
}

function shift(iso: string, days: number): string {
  const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10)
}
