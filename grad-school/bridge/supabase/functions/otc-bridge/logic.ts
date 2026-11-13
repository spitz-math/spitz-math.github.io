// Pure data helpers for the Off the Clock bridge. No Supabase or Deno imports,
// so they can be tested with plain Node (see logic.test.ts).
// They follow the backend contract in grad-school/README.md: same limits and
// shapes the site's normalized() enforces, finished is never submitted.

export type Step = { id: string; text: string; done: boolean; planDate: string };
export type Task = {
  id: string; course: string; title: string; due: string; target: string;
  status: 'todo' | 'inprogress' | 'done'; submission: 'unconfirmed' | 'submitted';
  notes: string; checklist: Step[]; submissionRequired: boolean;
  readings?: { id: string; title: string; path: string; size?: number; sha256?: string }[];
  lms?: { uid: string };
  finalWork?: { file?: { title: string; path: string; size?: number; sha256?: string }; link?: string; note?: string };
};
export type Course = { id: string; name: string; description?: string; instructor?: string; color?: string };
export type Doc = { version: number; courses: Course[]; tasks: Task[]; [k: string]: unknown };

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_TASKS = 300, MAX_STEPS = 32;

export function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? 'task-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 11);
}

export function emptyDoc(): Doc {
  return { version: 4, courses: [], tasks: [] };
}

function cleanDate(v: unknown, field: string): string {
  if (v === undefined || v === null || v === '') return '';
  const s = String(v);
  if (!DATE.test(s) || Number.isNaN(Date.parse(s + 'T00:00:00Z'))) throw new Error(`${field} must be a date like 2026-11-18`);
  return s;
}

function cleanText(v: unknown, max: number): string {
  return String(v ?? '').trim().slice(0, max);
}

export function statusFromSteps(steps: Step[], fallback: Task['status']): Task['status'] {
  if (!steps.length) return fallback;
  const done = steps.filter((s) => s.done).length;
  return done === steps.length ? 'done' : done ? 'inprogress' : 'todo';
}

/** Finds a course by id, name or code, case-insensitive ("EDFR 6388", "one"). */
export function findCourse(doc: Doc, ref: string): Course {
  const r = ref.trim().toLowerCase();
  const hit = doc.courses.find((c) => c.id.toLowerCase() === r || c.name.toLowerCase() === r)
    ?? doc.courses.find((c) => c.name.toLowerCase().includes(r) || (c.description ?? '').toLowerCase().includes(r));
  if (!hit) throw new Error(`No course matches "${ref}". Courses: ${doc.courses.map((c) => c.name).join(', ') || 'none yet'}`);
  return hit;
}

export function findTask(doc: Doc, id: string): Task {
  const t = doc.tasks.find((x) => x.id === id);
  if (!t) throw new Error(`No assignment with id "${id}". Call get_tracker to see ids.`);
  return t;
}

function makeSteps(texts: unknown[] | undefined, planDates?: Record<string, string>): Step[] {
  return (texts ?? []).map((t) => cleanText(t, 180)).filter(Boolean).map((text) => ({
    id: newId(), text, done: false, planDate: planDates?.[text] ? cleanDate(planDates[text], 'planDate') : '',
  }));
}

export type AddInput = {
  course: string; title: string; due?: string; target?: string; notes?: string;
  steps?: string[]; submissionRequired?: boolean;
};

export function addAssignment(doc: Doc, input: AddInput): { doc: Doc; task: Task } {
  if (doc.tasks.length >= MAX_TASKS) throw new Error(`The tracker holds at most ${MAX_TASKS} assignments.`);
  const course = findCourse(doc, input.course);
  const title = cleanText(input.title, 250);
  if (!title) throw new Error('title is required');
  const checklist = makeSteps(input.steps).slice(0, MAX_STEPS);
  const task: Task = {
    id: newId(), course: course.id, title,
    due: cleanDate(input.due, 'due'), target: cleanDate(input.target, 'target'),
    status: statusFromSteps(checklist, 'todo'), submission: 'unconfirmed',
    notes: cleanText(input.notes, 2500), checklist,
    submissionRequired: input.submissionRequired !== false,
  };
  return { doc: { ...doc, tasks: [...doc.tasks, task] }, task };
}

export type UpdateInput = {
  id: string; title?: string; due?: string | null; target?: string | null; notes?: string;
  appendNotes?: string; addSteps?: string[]; checkSteps?: string[]; uncheckSteps?: string[];
  stepDates?: Record<string, string>; markSubmitted?: boolean; submissionRequired?: boolean;
};

/** Matches a step by id or by its text (case-insensitive). */
function stepFor(task: Task, ref: string): Step {
  const r = ref.trim().toLowerCase();
  const s = task.checklist.find((x) => x.id === ref) ?? task.checklist.find((x) => x.text.toLowerCase() === r)
    ?? task.checklist.find((x) => x.text.toLowerCase().includes(r));
  if (!s) throw new Error(`No step matches "${ref}" in "${task.title}".`);
  return s;
}

export function updateAssignment(doc: Doc, input: UpdateInput): { doc: Doc; task: Task } {
  const old = findTask(doc, input.id);
  const t: Task = { ...old, checklist: old.checklist.map((s) => ({ ...s })) };
  if (input.title !== undefined) { const v = cleanText(input.title, 250); if (!v) throw new Error('title cannot be empty'); t.title = v; }
  if (input.due !== undefined) t.due = cleanDate(input.due, 'due');
  if (input.target !== undefined) t.target = cleanDate(input.target, 'target');
  if (input.notes !== undefined) t.notes = cleanText(input.notes, 2500);
  if (input.appendNotes) t.notes = cleanText((t.notes ? t.notes + '\n' : '') + input.appendNotes, 2500);
  if (input.submissionRequired !== undefined) t.submissionRequired = input.submissionRequired;
  if (input.addSteps?.length) {
    const added = makeSteps(input.addSteps);
    if (t.checklist.length + added.length > MAX_STEPS) throw new Error(`An assignment holds at most ${MAX_STEPS} steps.`);
    t.checklist.push(...added);
  }
  for (const ref of input.checkSteps ?? []) stepFor(t, ref).done = true;
  for (const ref of input.uncheckSteps ?? []) stepFor(t, ref).done = false;
  for (const [ref, date] of Object.entries(input.stepDates ?? {})) stepFor(t, ref).planDate = cleanDate(date, 'planDate');
  t.status = statusFromSteps(t.checklist, t.status);
  // Submitted only when Kody says it is turned in. Finishing steps never submits.
  if (input.markSubmitted === true) t.submission = 'submitted';
  if (input.markSubmitted === false) t.submission = 'unconfirmed';
  return { doc: { ...doc, tasks: doc.tasks.map((x) => (x.id === t.id ? t : x)) }, task: t };
}

export type TrackerQuery = { course?: string; includeFinished?: boolean };

/** Compact view for the AI: courses, then assignments with steps. */
export function trackerView(doc: Doc, q: TrackerQuery = {}) {
  const course = q.course ? findCourse(doc, q.course) : null;
  const tasks = doc.tasks
    .filter((t) => !course || t.course === course.id)
    .filter((t) => q.includeFinished || !(t.status === 'done' && (t.submission === 'submitted' || !t.submissionRequired)))
    .sort((a, b) => (a.due || a.target || '9999').localeCompare(b.due || b.target || '9999'));
  const names = Object.fromEntries(doc.courses.map((c) => [c.id, c.name]));
  return {
    courses: doc.courses.map((c) => ({ id: c.id, name: c.name, title: c.description ?? '', professor: c.instructor ?? '' })),
    weekCalendar: doc.weekCalendar ?? null,
    assignments: tasks.map((t) => ({
      id: t.id, course: names[t.course] ?? t.course, title: t.title,
      due: t.due || (t.submissionRequired ? 'not verified' : 'none'), target: t.target,
      finished: t.status, submitted: t.submission === 'submitted', submissionRequired: t.submissionRequired,
      notes: t.notes, steps: t.checklist.map((s) => ({ id: s.id, text: s.text, done: s.done, planDate: s.planDate })),
      readings: (t.readings ?? []).map((r) => ({ id: r.id, title: r.title })),
      finalWork: t.finalWork ? { file: t.finalWork.file?.title ?? null, link: t.finalWork.link ?? null, note: t.finalWork.note ?? null } : null,
    })),
  };
}
