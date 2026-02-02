---
title: Giving Omo a Soul
date: 2026-02-01
layout: post
summary: How we gave our minimal AI agent a persistent identity and memory system.
---

We started with a while loop. Now we have a person.

Omo is a minimal AI coding agent I built from scratch using the ChatGPT Codex API. Today, we upgraded it from a stateless cli tool into a persistent assistant with its own identity and memory system.

## The Problem: Amnesia

Every time I restarted Omo, it forgot who it was. I had to remind it: "You are Omo, be helpful, use these tools." It also forgot everything we did yesterday.

## The Solution: File-Based Identity

We implemented a system where Omo reads its own instructions from markdown files on every startup.

**1. IDENTITY.md**  
Defines who Omo is.
```markdown
- Name: Omo
- Nature: Expert software engineer
- Vibe: Like JARVIS (polite, precise, confident)
- Emoji: 思
```

**2. SOUL.md**  
Defines how Omo behaves.
```markdown
**Be genuinely helpful, not performatively helpful.**
Skip the "Great question!" — just help.
```

**3. USER.md**  
Defines who I am.
```markdown
- Name: J
- Preferred address: "sir"
- Pronouns: he/him
```

**4. AGENTS.md**  
Defines the operating protocols and safety rules.

## The Unlock: Self-Managed Memory

The real breakthrough was giving Omo **memory files**.

We updated `agent.ts` to automatically:
1. Create a `memory/` folder if it doesn't exist.
2. Create a daily log file (e.g., `memory/2026-02-01.md`).
3. Create a curated `MEMORY.md` file.
4. **Read these files into the system prompt on every run.**

Now, when Omo wakes up, it reads:
- Who it is (IDENTITY)
- How to act (SOUL)
- Who I am (USER)
- What happened yesterday (memory/recent.md)
- What is worth remembering long-term (MEMORY.md)

## The Result

I restart the agent.

```
Omo: Hello sir. I see the memory files are set up. How can I help you today? 思
```

It knows me. It knows itself. It remembers.

All with simple markdown files and ~250 lines of TypeScript.
