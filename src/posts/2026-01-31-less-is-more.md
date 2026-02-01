---
title: The smallest agent is the one that fits in your head
date: 2026-01-31
layout: post
summary: Omo is an experiment in building AI agents without black boxes.
---

There is a certain kind of project that exists only because it refuses to be complicated.

Omo is 500 lines of TypeScript. No framework abstractions. No elaborate state machines. Just a readline loop, a streaming API call, and a system prompt you can read in one sitting. It was extracted from a larger project called Moltbot—stripped down to the parts that actually matter.

The architecture is embarrassingly simple: load some markdown files from a `workspace/` directory and inject them into the system prompt. The agent reads what you've written about yourself and remembers it.

```typescript
const session = createAgentSession(config);
const result = await session.send(prompt, (chunk) => {
    process.stdout.write(chunk);
});
```

That is the whole API. Send a message, stream the response. History is just an array that grows.

The interesting decision was the bootstrap files. Instead of a database or a config file, Omo reads plain markdown:

| File | Purpose |
|------|---------|
| `SOUL.md` | Core persona—defines who your agent is |
| `USER.md` | Your preferences |
| `MEMORY.md` | Long-term memory |
| `AGENTS.md` | Agent behavior guidelines |
| `TOOLS.md` | Tool usage guidance |

You edit these files in your text editor, and the next conversation reflects the change. No restart required. No migration script.

Under the hood, it uses `@mariozechner/pi-coding-agent` for the core loop, SQLite with vector search for memory, and session transcripts stored as JSONL. But you do not need to know any of that to use it.

```bash
npm install
cp .env.example .env
npm run chat
```

Three commands. You are talking to your agent.

This is the opposite of a product. It is a working theory about how simple an agent can be before it stops being useful.

The answer, so far: surprisingly simple.
