# Off the Clock — Claude and ChatGPT workflow

## What the bridge shares
GitHub holds source, architecture, decisions, task scope, review findings, and handoffs. Supabase holds private application data. Private Claude and ChatGPT conversations remain separate.

Use repository instructions for stable rules, PROJECT_BRIEF for architecture, STATUS for the latest checkpoint, and an issue/PR for each task's changing work. Do not copy whole conversations into the repo.

## Start a session
1. Open `spitz-math/spitz-math.github.io` in the assistant's coding environment, or provide the exact repository and task PR link to a session with GitHub access.
2. Read AGENTS, CLAUDE, PROJECT_BRIEF, STATUS, and grad-school/README.
3. Fetch the latest remote state. Inspect open PRs and the exact task branch. If the session cannot access the repo, report that limitation before claiming to have inspected or changed it.
4. Restate the requested result and affected paths in the task PR. Check for an existing implementation of the same task.
5. For a new task, branch from current main. For a handed-off task, inspect and continue its existing branch when instructed. Do not overwrite or force-push another session's work.

## Work and review
- Use one implementation owner at a time for a task branch. Independent tasks use separate branches.
- A reviewer reviews the exact PR head commit and records findings against that commit.
- If review requires a fix, the implementer updates the same PR and records the new commit. Previous checks do not prove the new commit passes.
- Record UI-to-data contract changes, migration requirements, and untested paths in the PR.
- Run the appropriate checks. Existing CI is `.github/workflows/smoke.yml`, named Safety check; it is not proof of authenticated Off the Clock behavior.
- Do not trigger paid agent automation, install integrations, or add API credentials as part of a routine handoff.
- Merge and production actions require the owner's authorization. A green check or an assistant's approval alone does not supply it.

## Handoff format
Put this in the task PR body under Agent handoff. Update it when transferring work.

```text
Task / requested result:
Implementation owner / next reviewer:
PR:
Branch:
Head commit:
Base main commit:
Changed paths and behavior:
Decisions and reason:
Checks run, result, and tested commit:
Not tested / known limitations:
Remaining work or blocking question:
Exact next action:
Merge / deployment state:
```

Use synthetic examples for data-related explanations. Never paste private coursework, full profile JSON, tokens, session cookies, or secrets.

## Small prompts for switching assistants

**Start with Claude Code:**
> Open spitz-math/spitz-math.github.io. Read AGENTS.md, CLAUDE.md, docs/off-the-clock/{PROJECT_BRIEF,WORKFLOW,STATUS}.md, and grad-school/README.md. Inspect current main and open PRs. Continue the task in the PR I provide, using its branch and handoff. Preserve the current auth/data contracts. Record checks and the next action. Do not merge or change production configuration.

**Hand Claude's PR to ChatGPT/Codex:**
> Review this Off the Clock PR at its current head commit. Read the shared project docs and handoff first. Check the requested behavior, data preservation, authentication, revision conflicts, and mobile evidence where relevant. Record concrete findings and what you could not test. Do not merge.

**Return fixes to Claude:**
> Read this PR's latest review and head commit. Fix the findings on its existing branch, preserve unrelated changes, rerun relevant checks, and update the handoff with the new tested commit. Do not merge.

## Keep context current
Update PROJECT_BRIEF when architecture or durable requirements change. Update STATUS after a merge or a significant infrastructure checkpoint, identifying the source commit and what still needs verification. Keep detailed per-task history in its PR.

The bridge is validated end to end only after both assistants have read the shared files and completed a real PR handoff. Documentation alone does not prove the other account's connection or permissions.
