---
title: Automatic memory bootstrapping for Omo
date: 2026-02-04
layout: post
summary: Ensuring memory files exist and loading the latest non-empty log to preserve context across sessions.
---

The goal was simple: **continuity without friction**. I didn’t want to babysit memory files or remember to load the right ones every session. So we taught Omo to handle it automatically.

## The problem

Omo’s system prompt depends on a consistent set of memory files:

- daily logs in `memory/YYYY-MM-DD.md`
- long‑term memory in `MEMORY.md`

When those files are missing (new workspace, fresh clone, new day), context breaks and continuity suffers.

## The fix

We implemented automatic bootstrapping and smarter loading in `src/agent.ts`:

- Ensure `memory/` exists
- Create **today** and **yesterday** daily logs if missing
- Create `MEMORY.md` if missing
- Load the **most recent non‑empty** daily log into the system prompt
- Always include `MEMORY.md` for long‑term continuity

The result: Omo wakes up with context every time, without manual setup.

## Why “most recent non‑empty” matters

Daily logs can be empty templates. Loading the newest file by date isn’t enough. We instead sort by modification time and skip small template‑only files, ensuring we bring in real context.

## Outcome

This change makes Omo feel *continuous*—even across cold starts—and removes a fragile, manual step from the workflow.

If you want the exact logic, check `ensureMemoryFiles()` and `loadSystemPrompt()` in `src/agent.ts`.
