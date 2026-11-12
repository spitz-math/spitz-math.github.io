// Builds the Off the Clock bridge MCP server for one signed-in user.
// index.ts wires sign-in; this file is everything the tools do.
import { createMcpHandler, McpServer } from 'npm:@modelcontextprotocol/server@^2.4.0'
import { z } from 'npm:zod@^4.3.6'
import { addAssignment, type Doc, emptyDoc, trackerView, updateAssignment } from './logic.ts'

// Minimal shape of the user-scoped supabase-js client this file uses.
// deno-lint-ignore no-explicit-any
type Db = { from: (table: string) => any }

export const RULES = `Off the Clock bridge: rules for every AI that connects (Claude and ChatGPT).

Who owns what
- Claude: the look (grad-school/ui.css, markup, wording).
- ChatGPT/Codex: Supabase, sign-in, sync and data logic.
- Before changing code, read_board for open work and claimed tasks. When you change something
  the other AI depends on, post a handoff note with what changed and what they must not break.

Never
- Put coursework, dates, names or grades in the GitHub repo. They live only in Kody's private data.
- Add service-role keys or secrets to the repo. config.js holds only the publishable key.
- Change the grad_profiles table, its row-level security, or the revision save guard without Kody's OK.

Data rules
- Academic week runs Wednesday to Tuesday.
- Finished is not submitted. Only mark an assignment submitted when Kody says it is turned in on Brightspace.
- A due date must come from Brightspace or the syllabus. If unsure, leave it empty (the site shows "Due date not verified").
- target and step planDate are Kody's own work plan, separate from the official due date.
- Writes use the revision guard. If the site is open with unsaved edits, it shows a conflict and Kody reloads.`

type Note = {
  id: number; author: string; kind: string; area: string; title: string; body: string;
  status: string; claimed_by: string | null; created_at: string; updated_at: string;
}

const text = (v: unknown) => ({ content: [{ type: 'text' as const, text: typeof v === 'string' ? v : JSON.stringify(v, null, 2) }] })
const fail = (e: unknown) => ({ isError: true, ...text(e instanceof Error ? e.message : String(e)) })

export function bridgeHandler(supabase: Db, userId: string) {
  // ---------- tracker document with the same optimistic revision guard as the site ----------
  async function load(): Promise<{ doc: Doc; revision: number | null }> {
    const { data, error } = await supabase.from('grad_profiles').select('data,revision').eq('user_id', userId).maybeSingle()
    if (error) throw new Error('Could not load the tracker: ' + error.message)
    if (!data) return { doc: emptyDoc(), revision: null }
    const doc = (data.data ?? emptyDoc()) as Doc
    return { doc: { ...doc, courses: doc.courses ?? [], tasks: doc.tasks ?? [] }, revision: data.revision }
  }
  async function change<T>(apply: (doc: Doc) => { doc: Doc; task: T }): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt++) {
      const { doc, revision } = await load()
      const out = apply(doc)
      if (revision === null) {
        const { error } = await supabase.from('grad_profiles').insert({ user_id: userId, data: out.doc })
        if (!error) return out.task
        if (error.code !== '23505') throw new Error('Save failed: ' + error.message)
        continue // someone created the row first; reload and re-apply
      }
      const { data, error } = await supabase.from('grad_profiles').update({ data: out.doc })
        .eq('user_id', userId).eq('revision', revision).select('revision')
      if (error) throw new Error('Save failed: ' + error.message)
      if (data && data.length) return out.task
      // zero rows = someone saved in between; reload and re-apply this one change
    }
    throw new Error('The tracker kept changing while saving. Nothing was saved; try again.')
  }

  const handler = createMcpHandler(() => {
    const server = new McpServer({ name: 'off-the-clock-bridge', version: '0.1.0' })
    const ro = { readOnlyHint: true }

    server.registerTool('project_rules', {
      title: 'Project rules', annotations: ro,
      description: 'Read first. Who owns what in Off the Clock and the data rules every AI must follow.',
    }, () => text(RULES))

    // ---------- handoff board ----------
    server.registerTool('read_board', {
      title: 'Read the handoff board', annotations: ro,
      description: 'Notes, tasks and handoffs between Claude and ChatGPT, newest first. Read before starting work.',
      inputSchema: z.object({
        status: z.enum(['open', 'claimed', 'done', 'all']).default('open').describe('Which notes to show'),
        limit: z.number().int().min(1).max(50).default(20),
      }),
    }, async ({ status, limit }) => {
      let q = supabase.from('bridge_notes').select('*').order('created_at', { ascending: false }).limit(limit)
      if (status === 'open') q = q.in('status', ['open', 'claimed'])
      else if (status !== 'all') q = q.eq('status', status)
      const { data, error } = await q
      return error ? fail(error.message) : text(data as Note[])
    })

    server.registerTool('post_note', {
      title: 'Post to the handoff board',
      description: 'Leave a note for the other AI: a handoff after you change something, a task you want done, or a question for Kody.',
      inputSchema: z.object({
        author: z.enum(['claude', 'chatgpt', 'kody']).describe('Who is writing. Claude writes claude, ChatGPT writes chatgpt.'),
        kind: z.enum(['handoff', 'task', 'question', 'note']).default('note'),
        area: z.enum(['look', 'sync', 'data', 'auth', 'bridge', 'other']).default('other'),
        title: z.string().min(1).max(200),
        body: z.string().max(8000).default('').describe('What changed, files touched, PR link, what the other side must not break'),
      }),
    }, async (n) => {
      const { data, error } = await supabase.from('bridge_notes').insert({ ...n, user_id: userId }).select().single()
      return error ? fail(error.message) : text({ posted: data })
    })

    server.registerTool('update_note', {
      title: 'Claim, reply to or finish a note',
      description: 'Claim a task before working on it, add a reply, or mark it done.',
      inputSchema: z.object({
        id: z.number().int(),
        author: z.enum(['claude', 'chatgpt', 'kody']),
        status: z.enum(['open', 'claimed', 'done']).optional(),
        reply: z.string().max(4000).optional().describe('Appended to the note body with your name and the date'),
      }),
    }, async ({ id, author, status, reply }) => {
      const { data: cur, error: e1 } = await supabase.from('bridge_notes').select('*').eq('id', id).maybeSingle()
      if (e1 || !cur) return fail(e1?.message ?? `No note ${id}`)
      const patch: Partial<Note> = {}
      if (status) { patch.status = status; patch.claimed_by = status === 'claimed' ? author : status === 'open' ? null : cur.claimed_by }
      if (reply) patch.body = `${cur.body}\n\n— ${author}, ${new Date().toISOString().slice(0, 10)}: ${reply}`.slice(0, 8000)
      const { data, error } = await supabase.from('bridge_notes').update(patch).eq('id', id).select().single()
      return error ? fail(error.message) : text({ updated: data })
    })

    // ---------- tracker ----------
    server.registerTool('get_tracker', {
      title: 'Read Kody\'s assignments', annotations: ro,
      description: 'Courses and assignments from Off the Clock with ids, due dates, targets, steps and finished/submitted state. Finished-and-submitted work is hidden unless includeFinished.',
      inputSchema: z.object({
        course: z.string().optional().describe('Course code, name or id to filter'),
        includeFinished: z.boolean().default(false),
      }),
    }, async (q) => {
      try { const { doc } = await load(); return text(trackerView(doc, q)) } catch (e) { return fail(e) }
    })

    server.registerTool('add_assignment', {
      title: 'Add an assignment',
      description: 'Add one assignment to Off the Clock. due must be the official Brightspace/syllabus date or left out. target is Kody\'s own aim-to-finish date. Never adds it as submitted.',
      inputSchema: z.object({
        course: z.string().describe('Course code, name or id, e.g. "EDFR 6388"'),
        title: z.string().min(1).max(250),
        due: z.string().optional().describe('YYYY-MM-DD, official due date only'),
        target: z.string().optional().describe('YYYY-MM-DD, aim to finish by'),
        notes: z.string().max(2500).optional(),
        steps: z.array(z.string().max(180)).max(32).optional().describe('Checklist steps in order'),
        submissionRequired: z.boolean().default(true).describe('false for prep work with nothing to turn in'),
      }),
    }, async (input) => {
      try { const task = await change((d) => addAssignment(d, input)); return text({ added: task }) } catch (e) { return fail(e) }
    })

    server.registerTool('update_assignment', {
      title: 'Update an assignment',
      description: 'Change one assignment by id (from get_tracker): title, dates, notes, add/check/uncheck steps, plan dates for steps. Finished follows the steps. Set markSubmitted only when Kody says it is turned in on Brightspace.',
      inputSchema: z.object({
        id: z.string(),
        title: z.string().max(250).optional(),
        due: z.string().nullable().optional().describe('YYYY-MM-DD, or empty string to clear'),
        target: z.string().nullable().optional(),
        notes: z.string().max(2500).optional().describe('Replaces the notes'),
        appendNotes: z.string().max(2500).optional(),
        addSteps: z.array(z.string().max(180)).max(32).optional(),
        checkSteps: z.array(z.string()).optional().describe('Step ids or step text'),
        uncheckSteps: z.array(z.string()).optional(),
        stepDates: z.record(z.string(), z.string()).optional().describe('{ step id or text: YYYY-MM-DD }'),
        markSubmitted: z.boolean().optional(),
        submissionRequired: z.boolean().optional(),
      }),
    }, async (input) => {
      try { const task = await change((d) => updateAssignment(d, input)); return text({ updated: task }) } catch (e) { return fail(e) }
    })

    return server
  })

  return handler
}
