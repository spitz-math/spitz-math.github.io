# Claude Code — SpitzMath Frontend Guide

## Scope
Build **Off the Clock** in `grad-school/` as an extension of the established SpitzMath site. Read `docs/off-the-clock/PROJECT_BRIEF.md` first.

## Design ownership
You own visual architecture, interactions, typography, animation and responsive design. The owner has explicitly rejected generic AI-generated productivity dashboards. **Inspect the actual source** of `arcade/index.html`, `checkpoint/dash.html`, `checkpoint/teacher/`, and `teacher.css` before designing. Identify existing typefaces, spacing, component shapes, feedback and interaction conventions, then create a purposeful interface reflecting those patterns. Do not substitute generic cards, charts, or decorative neon outlines.

## Collaboration
- Work on a `feature/` branch; submit a pull request with screenshots at desktop and 375px mobile widths.
- Include specific UI-to-backend contract: fields, events, authentication states, persistence, error states and expected Supabase integration.
- Let ChatGPT/Codex implement/review Supabase and sync code; don't change database access policies without approval.
- Keep the existing Arcade, Checkpoint and student tools untouched. Do not edit unrelated files or the homepage.
- Never commit coursework, private account details, access tokens, API secret keys or real OTPs to this public repo.
- Do not merge to `main`; the owner approves aesthetics and production deployment.
