# Off the Clock — shared project brief

## Purpose
A private graduate-school workspace at https://spitzmath.com/grad-school/ that gives trustworthy answers to what needs work, what is due, what is submitted, and whether today's work is finished.

## Current architecture
- Public source: `spitz-math/spitz-math.github.io`; production branch: `main`; static GitHub Pages client in `grad-school/`.
- Client: `index.html`, `ui.css`, and browser-safe `config.js`. No framework migration is part of this bridge.
- Supabase project: `pkonclmfrpozizmmtnrv`.
- Primary login: GitHub OAuth; optional email Magic Link fallback. Preserve the working flow.
- Private storage: `public.grad_profiles(user_id, data, revision, updated_at)`. Owner RLS and optimistic revision matching protect updates.
- For exact current data shape and behavior, read `grad-school/README.md`, `schema.sql`, and the client. Repository schema describes intended configuration; it is not proof of live database state.

## Existing behavior to preserve
- Assignment editing, course settings, notes, search/filter, and JSON backup import/export.
- Independent preparation status and confirmed Brightspace submission.
- Independent verified due dates, personal work targets, and per-step planned dates.
- Linked assignment checklists, daily planner cards, Mission preview, and Wednesday–Tuesday course weeks.
- Private week-number anchors; no personal schedule hardcoded into public source.
- Cloud persistence, explicit save failures, and conflict handling that protects unsaved work.

## Collaboration
Both assistants use the same source, task PR, and handoff format. Claude normally leads frontend/design; ChatGPT/Codex normally leads integration and review. The owner can assign either assistant any task.

Read `WORKFLOW.md` for operating steps and `STATUS.md` for the latest recorded checkpoint. Neither file synchronizes private chat histories or grants access to either account.

## Acceptance
Changes preserve owner-only data access, independent finished/submitted states, truthful unknown deadlines, revision-protected writes, and backup round-tripping. UI changes need desktop and phone evidence. Code changes need relevant checks and the existing Safety check. Owner authorization governs merging and production changes.

No coursework, personal completion records, private account details, or secrets belong in this public repo.
