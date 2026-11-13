// Builds the Off the Clock bridge MCP server for one signed-in user.
// index.ts wires sign-in; this file is everything the tools do.
import { createMcpHandler, McpServer } from 'npm:@modelcontextprotocol/server@^2.4.0'
import { z } from 'npm:zod@^4.3.6'
import { addAssignment, type Doc, emptyDoc, newId, trackerView, updateAssignment } from './logic.ts'
import { buildBriefing, suggestCatchUp } from './planning.ts'
import { addReading, checkAttach, findFinalFile, findReading, isPdf, setFinalWork, MAX_CHARS, MAX_PDF_BYTES, pageSlice, READING_BUCKET, readingPath } from './readings.ts'
import { extractText, getDocumentProxy } from 'npm:unpdf@^1.0.0'

// Minimal shape of the user-scoped supabase-js client this file uses.
// deno-lint-ignore no-explicit-any
type Db = { from: (table: string) => any; storage: { from: (bucket: string) => any } }

export const RULES = `Off the Clock bridge: rules for every AI that connects (Claude and ChatGPT).

Who does what (Kody's choice, 2026-11-12)
- ChatGPT: Kody's schoolwork. Writing in Kody's voice, reading notes, and keeping the tracker
  current with get_tracker, add_assignment and update_assignment. ChatGPT does not change
  Off the Clock code, Supabase, or the bridge.
- Claude: the Off the Clock site and bridge code (look, data logic, sync, bridge tools, deploys).
  Kody asks Claude directly for site changes.
- The tracker data is the shared ground: what ChatGPT updates, the site and Claude's morning
  brief see. The board is for questions and notes, not code handoffs.

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

// Downloads a PDF from a ChatGPT file link or an https link, capped at 50 MB.
async function fetchPdf(url: string): Promise<Uint8Array> {
  let u: URL
  try { u = new URL(url) } catch { throw new Error('That file link is not a valid URL.') }
  if (u.protocol !== 'https:') throw new Error('Only https file links are supported.')
  const res = await fetch(u, { redirect: 'follow' })
  if (!res.ok || !res.body) throw new Error(`Could not download the file (HTTP ${res.status}). ChatGPT file links expire; attach it again in a new message.`)
  const declared = Number(res.headers.get('content-length') || 0)
  if (declared > MAX_PDF_BYTES) throw new Error('That PDF is over 50 MB.')
  const reader = res.body.getReader()
  const parts: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.length
    if (total > MAX_PDF_BYTES) { await reader.cancel(); throw new Error('That PDF is over 50 MB.') }
    parts.push(value)
  }
  const bytes = new Uint8Array(total)
  let at = 0
  for (const p of parts) { bytes.set(p, at); at += p.length }
  return bytes
}
const sha256Hex = async (b: Uint8Array) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', b as BufferSource))].map((x) => x.toString(16).padStart(2, '0')).join('')

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

  // Text of each page of a PDF in the private readings bucket (downloaded as the user, so storage RLS applies).
  async function pdfPages(path: string): Promise<string[]> {
    const { data, error } = await supabase.storage.from(READING_BUCKET).download(path)
    if (error || !data) throw new Error('Could not open the PDF: ' + (error?.message ?? 'file missing'))
    const pdf = await getDocumentProxy(new Uint8Array(await data.arrayBuffer()))
    const { text: pages } = await extractText(pdf, { mergePages: false })
    return pages as string[]
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

    server.registerTool('get_briefing', {
      title: 'Read daily and weekly academic briefing', annotations: ro,
      description: 'Read-only brief of verified due dates, planned steps, overdue work, and completion metrics. Lead with needsSubmission: finished work requiring submission that is not confirmed submitted, across all dates. Never infer submission from completion. today must be the user-local date YYYY-MM-DD. Academic weeks run Wednesday to Tuesday.',
      inputSchema: z.object({
        today: z.string().describe('User-local calendar date YYYY-MM-DD, not server UTC time'),
      }),
    }, async ({ today }) => {
      try { const { doc } = await load(); return text(buildBriefing(doc, today)) } catch (e) { return fail(e) }
    })

    server.registerTool('suggest_catch_up', {
      title: 'Preview non-destructive catch-up dates', annotations: ro,
      description: 'Proposes new planned step dates for missed work without saving or changing official due dates. Empty to means manual review is needed. Requires explicit update_assignment calls to apply proposals.',
      inputSchema: z.object({
        today: z.string().describe('User-local calendar date YYYY-MM-DD'),
        maxStepsPerDay: z.number().int().min(1).max(20).default(3),
      }),
    }, async ({ today, maxStepsPerDay }) => {
      try { const { doc } = await load(); return text({ suggestions: suggestCatchUp(doc, today, maxStepsPerDay), saved: false }) } catch (e) { return fail(e) }
    })

    server.registerTool('read_reading', {
      title: 'Read a reading PDF', annotations: ro,
      description: `Get the text of a reading PDF Kody attached to an assignment (get_tracker lists each assignment's readings). Returns up to about ${MAX_CHARS} characters at a time; if nextPage is set, call again with fromPage. Scanned PDFs have no text.`,
      inputSchema: z.object({
        assignmentId: z.string().describe('Assignment id from get_tracker'),
        reading: z.string().optional().describe('Reading id or title; can be left out when the assignment has one reading'),
        fromPage: z.number().int().min(1).default(1),
        toPage: z.number().int().min(1).optional(),
      }),
    }, async ({ assignmentId, reading, fromPage, toPage }) => {
      try {
        const { doc } = await load()
        const found = findReading(doc, userId, assignmentId, reading)
        const pages = await pdfPages(found.reading.path)
        return text({ assignment: found.task.title, reading: found.reading.title, ...pageSlice(pages, fromPage, toPage) })
      } catch (e) { return fail(e) }
    })

    server.registerTool('attach_reading', {
      title: 'Attach a reading PDF',
      description: 'Attach a PDF to an assignment (id from get_tracker). In ChatGPT, pass the PDF Kody uploaded in the conversation as file. Otherwise pass url, an https link that downloads the PDF directly. The same PDF is never attached twice. Afterwards it shows in get_tracker and read_reading.',
      inputSchema: z.object({
        assignmentId: z.string().describe('Assignment id from get_tracker'),
        title: z.string().max(170).optional().describe('Reading title, e.g. "Chapter 7 - Motivation". Defaults to the file name.'),
        file: z.object({
          download_url: z.string(),
          file_id: z.string(),
          mime_type: z.string().optional(),
          file_name: z.string().optional(),
        }).optional().describe('The PDF uploaded in this conversation'),
        url: z.string().optional().describe('https link that downloads the PDF, when there is no uploaded file'),
      }),
      _meta: { 'openai/fileParams': ['file'] },
    }, async ({ assignmentId, title, file, url }) => {
      let uploaded: string | null = null
      try {
        const link = file?.download_url || url
        if (!link) throw new Error('Pass the uploaded PDF as file, or an https link as url. (ChatGPT on phones does not pass uploads yet; use the web app or attach it on the site.)')
        const bytes = await fetchPdf(link)
        if (!isPdf(bytes)) throw new Error('That file is not a PDF.')
        const sha256 = await sha256Hex(bytes)
        const { doc } = await load()
        const { taskTitle, existing } = checkAttach(doc, assignmentId, sha256)
        if (existing) return text({ attached: false, note: `Already attached to "${taskTitle}" as "${existing.title}".`, reading: { id: existing.id, title: existing.title } })
        const name = (file?.file_name || decodeURIComponent(new URL(link).pathname.split('/').pop() || '') || 'reading').replace(/\.pdf$/i, '')
        const id = newId()
        const path = readingPath(userId, assignmentId, id, name)
        const { error } = await supabase.storage.from(READING_BUCKET).upload(path, bytes, { contentType: 'application/pdf', upsert: false })
        if (error) throw new Error('Upload failed: ' + error.message)
        uploaded = path
        const out = await change((d) => addReading(d, assignmentId, { id, title: title?.trim() || name, path, size: bytes.length, sha256 }))
        uploaded = null
        return text({ attached: true, assignment: out.title, reading: { id: out.reading.id, title: out.reading.title, size: out.reading.size }, readingsOnAssignment: out.readings })
      } catch (e) {
        // Nothing half-done: remove a file that never made it into the tracker.
        if (uploaded) await supabase.storage.from(READING_BUCKET).remove([uploaded]).catch(() => {})
        return fail(e)
      }
    })

    // ---------- final work: what Kody turned in ----------
    const fileSchema = z.object({
      download_url: z.string(),
      file_id: z.string(),
      mime_type: z.string().optional(),
      file_name: z.string().optional(),
    })

    server.registerTool('attach_final_work', {
      title: 'Save final work',
      description: 'Save what Kody turned in for an assignment (id from get_tracker): the finished PDF (file = the PDF uploaded in this ChatGPT conversation, or fileUrl = an https link that downloads a PDF), a link (e.g. the video), and/or a short note (e.g. a quiz score). A new file replaces the old one. Empty string clears link or note; clearFile removes the file. This NEVER marks the assignment submitted; use update_assignment markSubmitted only when Kody says it is turned in on Brightspace.',
      inputSchema: z.object({
        assignmentId: z.string().describe('Assignment id from get_tracker'),
        title: z.string().max(170).optional().describe('Name for the file. Defaults to the file name.'),
        file: fileSchema.optional().describe('The finished PDF uploaded in this conversation'),
        fileUrl: z.string().optional().describe('https link that downloads the finished PDF, when there is no uploaded file'),
        link: z.string().max(500).optional().describe('http(s) link to the finished work, e.g. the video. Empty string clears it.'),
        note: z.string().max(500).optional().describe('Short note, e.g. "Quiz 3: 18/20". Empty string clears it.'),
        clearFile: z.boolean().optional(),
      }),
      _meta: { 'openai/fileParams': ['file'] },
    }, async ({ assignmentId, title, file, fileUrl, link, note, clearFile }) => {
      let uploaded: string | null = null
      try {
        const src = file?.download_url || fileUrl
        if (!src && link === undefined && note === undefined && !clearFile) throw new Error('Pass file (the uploaded PDF), fileUrl, link, note, or clearFile.')
        let newFile: { title: string; path: string; size: number; sha256: string } | undefined
        if (src) {
          const bytes = await fetchPdf(src)
          if (!isPdf(bytes)) throw new Error('That file is not a PDF. Save it as a PDF first.')
          const sha256 = await sha256Hex(bytes)
          const { doc } = await load()
          const cur = doc.tasks.find((t) => t.id === assignmentId)
          if (!cur) throw new Error(`No assignment with id ${assignmentId}. Use get_tracker for ids.`)
          if (cur.finalWork?.file?.sha256 === sha256) return text({ saved: false, note: `This PDF is already the final work for "${cur.title}".` })
          const name = (file?.file_name || decodeURIComponent(new URL(src).pathname.split('/').pop() || '') || 'final').replace(/\.pdf$/i, '')
          const path = readingPath(userId, assignmentId, newId(), 'final-' + name)
          const { error } = await supabase.storage.from(READING_BUCKET).upload(path, bytes, { contentType: 'application/pdf', upsert: false })
          if (error) throw new Error('Upload failed: ' + error.message)
          uploaded = path
          newFile = { title: title?.trim() || name, path, size: bytes.length, sha256 }
        }
        const out = await change((d) => setFinalWork(d, assignmentId, { file: newFile, clearFile: clearFile && !newFile, link, note }))
        uploaded = null
        if (out.replaced) await supabase.storage.from(READING_BUCKET).remove([out.replaced]).catch(() => {})
        return text({ saved: true, assignment: out.title, finalWork: out.finalWork, submitted: 'unchanged' })
      } catch (e) {
        if (uploaded) await supabase.storage.from(READING_BUCKET).remove([uploaded]).catch(() => {})
        return fail(e)
      }
    })

    server.registerTool('read_final_work', {
      title: 'Read final work', annotations: ro,
      description: `What Kody turned in for an assignment: the link, the note, and the text of the finished PDF (about ${MAX_CHARS} characters per call; if nextPage is set, call again with fromPage). Useful for matching Kody's voice in new writing.`,
      inputSchema: z.object({
        assignmentId: z.string().describe('Assignment id from get_tracker'),
        fromPage: z.number().int().min(1).default(1),
        toPage: z.number().int().min(1).optional(),
      }),
    }, async ({ assignmentId, fromPage, toPage }) => {
      try {
        const { doc } = await load()
        const f = findFinalFile(doc, userId, assignmentId)
        const base = { assignment: f.task.title, link: f.link, note: f.note, file: f.file?.title ?? null }
        if (!f.file) return text({ ...base, text: '', message: f.link || f.note ? 'No finished PDF saved, only the link or note.' : 'No final work saved for this assignment.' })
        const pages = await pdfPages(f.file.path)
        return text({ ...base, ...pageSlice(pages, fromPage, toPage) })
      } catch (e) { return fail(e) }
    })

    // ---------- outlines, video scripts and notes (table otc_docs, owner-only RLS) ----------
    const kinds = z.enum(['outline', 'script', 'notes', 'draft', 'other'])
    const DOC_CHUNK = 60000

    server.registerTool('save_doc', {
      title: 'Save an outline or script',
      description: 'Save a paper outline, video script, notes or draft onto an assignment (id from get_tracker), as text (body), a PDF (file = the PDF Kody uploaded in this ChatGPT conversation, or fileUrl = an https link that downloads a PDF), or both. Kody sees it on the site; a PDF opens when clicked. Leave id out to create a new one; pass id (from list_docs) to update that one (fields left out stay as they are).',
      inputSchema: z.object({
        assignmentId: z.string().describe('Assignment id from get_tracker'),
        kind: kinds.describe('outline, script (video script), notes, draft or other'),
        title: z.string().min(1).max(200),
        body: z.string().max(200000).optional().describe('The full text (Markdown is fine)'),
        file: fileSchema.optional().describe('The PDF version uploaded in this conversation'),
        fileUrl: z.string().optional().describe('https link that downloads the PDF, when there is no uploaded file'),
        author: z.enum(['chatgpt', 'claude']).describe('Who saved it: ChatGPT writes chatgpt, Claude writes claude'),
        id: z.string().optional().describe('Existing doc id to update'),
      }),
      _meta: { 'openai/fileParams': ['file'] },
    }, async ({ assignmentId, kind, title, body, file, fileUrl, author, id }) => {
      let uploaded: string | null = null
      try {
        const { doc } = await load()
        const task = doc.tasks.find((t) => t.id === assignmentId)
        if (!task) throw new Error(`No assignment with id ${assignmentId}. Use get_tracker for ids.`)
        let old: { file_path: string | null; file_sha256: string | null } | null = null
        if (id) {
          const { data: cur, error: e0 } = await supabase.from('otc_docs').select('file_path,file_sha256').eq('id', id).eq('assignment_id', assignmentId).maybeSingle()
          if (e0 || !cur) throw new Error(e0?.message ?? `No doc ${id} on "${task.title}". Use list_docs for ids.`)
          old = { file_path: cur.file_path ?? null, file_sha256: cur.file_sha256 ?? null }
        } else if (body === undefined && !file && !fileUrl) throw new Error('Pass body (text), file (the uploaded PDF), or fileUrl.')
        const row: Record<string, unknown> = { kind, title: title.trim(), author }
        if (body !== undefined) row.body = body
        const src = file?.download_url || fileUrl
        if (src) {
          const bytes = await fetchPdf(src)
          if (!isPdf(bytes)) throw new Error('That file is not a PDF.')
          const sha256 = await sha256Hex(bytes)
          if (old?.file_sha256 !== sha256) {
            const name = (file?.file_name || decodeURIComponent(new URL(src).pathname.split('/').pop() || '') || title).replace(/\.pdf$/i, '')
            const path = readingPath(userId, assignmentId, newId(), 'doc-' + name)
            const { error } = await supabase.storage.from(READING_BUCKET).upload(path, bytes, { contentType: 'application/pdf', upsert: false })
            if (error) throw new Error('Upload failed: ' + error.message)
            uploaded = path
            Object.assign(row, { file_path: path, file_size: bytes.length, file_sha256: sha256 })
          }
        }
        const q = id
          ? supabase.from('otc_docs').update(row).eq('id', id).eq('assignment_id', assignmentId).select('id,kind,title,file_path,updated_at')
          : supabase.from('otc_docs').insert({ ...row, assignment_id: assignmentId, user_id: userId }).select('id,kind,title,file_path,updated_at')
        const { data, error } = await q
        if (error) throw new Error('Save failed: ' + error.message)
        if (!data?.length) throw new Error(`No doc ${id} on "${task.title}". Use list_docs for ids.`)
        if (uploaded && old?.file_path) await supabase.storage.from(READING_BUCKET).remove([old.file_path]).catch(() => {})
        uploaded = null
        return text({ saved: true, assignment: task.title, doc: data[0], pdf: Boolean(row.file_path ?? old?.file_path), chars: body?.length ?? null })
      } catch (e) {
        if (uploaded) await supabase.storage.from(READING_BUCKET).remove([uploaded]).catch(() => {})
        return fail(e)
      }
    })

    server.registerTool('list_docs', {
      title: 'List outlines and scripts', annotations: ro,
      description: 'Outlines, video scripts, notes and drafts saved on assignments (all, or one assignment). Returns ids for read_doc and save_doc.',
      inputSchema: z.object({ assignmentId: z.string().optional() }),
    }, async ({ assignmentId }) => {
      let q = supabase.from('otc_docs').select('id,assignment_id,kind,title,author,file_path,updated_at').order('updated_at', { ascending: false }).limit(200)
      if (assignmentId) q = q.eq('assignment_id', assignmentId)
      const { data, error } = await q
      if (error) return fail(error.message)
      const { doc } = await load().catch(() => ({ doc: emptyDoc() }))
      const titles = new Map(doc.tasks.map((t) => [t.id, t.title]))
      return text((data ?? []).map((d: { assignment_id: string }) => ({ ...d, assignment: titles.get(d.assignment_id) ?? '(deleted assignment)' })))
    })

    server.registerTool('read_doc', {
      title: 'Read an outline or script', annotations: ro,
      description: `Full text of one saved outline, script, notes or draft (id from list_docs); if it is only a PDF, the PDF's text. Returned ${DOC_CHUNK} characters at a time; if nextChar is set, call again with fromChar.`,
      inputSchema: z.object({ id: z.string(), fromChar: z.number().int().min(0).default(0) }),
    }, async ({ id, fromChar }) => {
      const { data, error } = await supabase.from('otc_docs').select('*').eq('id', id).maybeSingle()
      if (error || !data) return fail(error?.message ?? `No doc ${id}. Use list_docs for ids.`)
      let body: string = data.body ?? ''
      let source = 'text'
      if (!body.trim() && data.file_path) {
        if (!String(data.file_path).startsWith(userId + '/')) return fail('That PDF points outside your storage folder.')
        try { body = (await pdfPages(data.file_path)).map((p, i) => `--- Page ${i + 1} ---\n${p.trim()}`).join('\n\n'); source = 'pdf' } catch (e) { return fail(e) }
      }
      const end = Math.min(body.length, fromChar + DOC_CHUNK)
      return text({ id: data.id, assignmentId: data.assignment_id, kind: data.kind, title: data.title, author: data.author, updatedAt: data.updated_at, hasPdf: Boolean(data.file_path), source, totalChars: body.length, fromChar, text: body.slice(fromChar, end), nextChar: end < body.length ? end : null })
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
