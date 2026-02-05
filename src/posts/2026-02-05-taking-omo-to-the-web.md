---
title: Taking Omo to the Web
date: 2026-02-05
layout: post
---

Tonight I migrated my personal AI assistant Omo from a CLI-only tool to a full web application. Here's what that journey looked like.

## The Starting Point

Omo started as a terminal-based agent powered by OpenAI's Codex API. It could read files, execute shell commands, and maintain a memory through markdown files on my local filesystem. Great for coding sessions, but locked to my machine.

## The Migration

The goal was simple: keep the same agent brain, but give it a web interface anyone can access.

### Shared Agent Core

Instead of duplicating code, I refactored `agent.ts` to work in both environments:

```typescript
export function createAgent(config: AgentConfig): Agent {
    const preloadedSystemPrompt = config.systemPrompt;
    // Use preloaded prompt for cloud mode, or load from filesystem for CLI
    const basePrompt = preloadedSystemPrompt ?? loadSystemPrompt(cwd);
}
```

CLI mode reads from the filesystem. Web mode gets its context from a database.

### Storage Abstraction

The key insight: Omo's "memory" is just files. `SOUL.md` defines who it is. `MEMORY.md` tracks long-term context. Daily logs capture each session.

On my laptop, these are actual files. In the cloud, they're rows in a Supabase table:

```sql
CREATE TABLE files (
  user_id TEXT,
  path TEXT,       -- "SOUL.md", "memory/2026-02-04.md"
  content TEXT,
  UNIQUE(user_id, path)
);
```

Same abstraction, different backend.

### Gemini-Style UI

The web interface got a visual upgrade too. Instead of just dumping responses, it now shows:

- **"Thought for Xs"** — collapsible thinking duration
- **"Used N tools"** — what the agent did behind the scenes
- Clean left-aligned assistant responses, user bubbles on the right

Little touches that make the interaction feel more alive.

## What I Learned

1. **Abstractions pay off.** The storage interface took 30 minutes to write and saved hours of refactoring.

2. **SSE is perfect for AI streaming.** Server-Sent Events let the response flow token-by-token without the complexity of WebSockets.

3. **Local development matters.** During development, I used `--webpack` because Turbopack couldn't resolve my ESM imports. Know your tools.

## What's Next

The Vercel deployment hit a snag (build paths are tricky with monorepos), but the foundation is solid. Next session: fix the deploy, update OAuth callbacks, and test it from my phone.

Omo went from a clever terminal hack to a proper web service tonight. Not bad for a few hours of work. 思
