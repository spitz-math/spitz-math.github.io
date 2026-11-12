// Pure, read-only planning projections for Off the Clock.
// Never writes task state, changes official due dates, or implies submission.
// These functions can be reused by bridge tools, daily briefings, and the UI.
import type { Doc, Task, Step } from './logic.ts'

const DAY = 86_400_000
const iso = (d: Date) => d.toISOString().slice(0, 10)
function atUtc(date: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || iso(new Date(date + 'T00:00:00Z')) !== date)
    throw new Error('Expected a valid YYYY-MM-DD date')
  return Date.parse(date + 'T00:00:00Z')
}
const plus = (date: string, days: number): string => iso(new Date(atUtc(date) + days * DAY))
const diff = (a: string, b: string): number => (atUtc(a) - atUtc(b)) / DAY

/** Academic weeks run Wednesday through Tuesday, independent of calendar locale. */
export function academicWeek(today: string): { start: string; end: string } {
  const weekday = new Date(atUtc(today)).getUTCDay()
  const daysSinceWednesday = (weekday + 4) % 7
  const start = plus(today, -daysSinceWednesday)
  return { start, end: plus(start, 6) }
}

export type PlannedStep = {
  taskId: string; course: string; title: string; stepId: string;
  text: string; planDate: string; due: string; target: string;
}
export type Deadline = {
  taskId: string; course: string; title: string;
  due: string; target: string; status: Task['status']; submitted: boolean;
}
export type Briefing = {
  today: string; week: { start: string; end: string };
  dueThisWeek: Deadline[]; overdueAssignments: Deadline[];
  todaySteps: PlannedStep[]; overdueSteps: PlannedStep[];
  upcomingSteps: PlannedStep[];
  progress: { assignmentsTotal: number; finished: number; submitted: number; stepsTotal: number; stepsDone: number };
}
function outstanding(t: Task): boolean {
  return !(t.status === 'done' && (t.submission === 'submitted' || !t.submissionRequired))
}
function deadline(t: Task, course: string): Deadline {
  return { taskId: t.id, course, title: t.title, due: t.due, target: t.target,
    status: t.status, submitted: t.submission === 'submitted' }
}
function planned(t: Task, s: Step, course: string): PlannedStep {
  return { taskId: t.id, course, title: t.title, stepId: s.id, text: s.text,
    planDate: s.planDate, due: t.due, target: t.target }
}
/** Read-only snapshot; dates represent LOCAL calendar days supplied by the caller, not server UTC 'today'. */
export function buildBriefing(doc: Doc, today: string): Briefing {
  atUtc(today)
  const week = academicWeek(today)
  const courses = Object.fromEntries(doc.courses.map(c => [c.id, c.name]))
  const active = doc.tasks.filter(outstanding)
  const named = (t: Task) => courses[t.course] ?? t.course
  const dueThisWeek = active.filter(t => t.due && t.due >= week.start && t.due <= week.end)
    .map(t => deadline(t, named(t))).sort((a, b) => a.due.localeCompare(b.due))
  const overdueAssignments = active.filter(t => t.due && t.due < today)
    .map(t => deadline(t, named(t))).sort((a, b) => a.due.localeCompare(b.due))
  const steps = active.flatMap(t => t.checklist.filter(s => !s.done && s.planDate)
    .map(s => planned(t, s, named(t))))
  const sorted = (items: PlannedStep[]) => items.sort((a, b) =>
    a.planDate.localeCompare(b.planDate) || a.title.localeCompare(b.title))
  return {
    today, week, dueThisWeek, overdueAssignments,
    todaySteps: sorted(steps.filter(s => s.planDate === today)),
    overdueSteps: sorted(steps.filter(s => s.planDate < today)),
    upcomingSteps: sorted(steps.filter(s => s.planDate > today && s.planDate <= week.end)),
    progress: {
      assignmentsTotal: doc.tasks.length,
      finished: doc.tasks.filter(t => t.status === 'done').length,
      submitted: doc.tasks.filter(t => t.submission === 'submitted').length,
      stepsTotal: doc.tasks.reduce((n, t) => n + t.checklist.length, 0),
      stepsDone: doc.tasks.reduce((n, t) => n + t.checklist.filter(s => s.done).length, 0),
    },
  }
}
export type RescheduleSuggestion = {
  taskId: string; stepId: string; text: string; from: string; to: string; reason: string;
}
/** Suggest revised plan dates ONLY. Never touches official due, target, finished or submitted. */
export function suggestCatchUp(doc: Doc, today: string, maxStepsPerDay = 3): RescheduleSuggestion[] {
  atUtc(today)
  if (!Number.isInteger(maxStepsPerDay) || maxStepsPerDay < 1 || maxStepsPerDay > 20)
    throw new Error('maxStepsPerDay must be between 1 and 20')
  const occupancy = new Map<string, number>()
  const active = doc.tasks.filter(outstanding)
  for (const t of active) for (const s of t.checklist) {
    if (!s.done && s.planDate >= today)
      occupancy.set(s.planDate, (occupancy.get(s.planDate) ?? 0) + 1)
  }
  const late = active.flatMap(t => t.checklist.filter(s => !s.done && s.planDate && s.planDate < today)
    .map(s => ({ t, s }))).sort((a, b) => a.s.planDate.localeCompare(b.s.planDate))
  return late.map(({ t, s }) => {
    let candidate = today
    // 28-day horizon: disclose unplaced work, never silently push beyond due date.
    for (let d = 0; d < 28; d++, candidate = plus(candidate, 1)) {
      if (t.due && candidate > t.due) break
      if ((occupancy.get(candidate) ?? 0) < maxStepsPerDay) {
        occupancy.set(candidate, (occupancy.get(candidate) ?? 0) + 1)
        return { taskId: t.id, stepId: s.id, text: s.text, from: s.planDate,
          to: candidate, reason: 'Missed planned step; proposed available slot' }
      }
    }
    return { taskId: t.id, stepId: s.id, text: s.text, from: s.planDate,
      to: '', reason: 'No available slot before the verified due date within 28 days; manual review needed' }
  })
}
