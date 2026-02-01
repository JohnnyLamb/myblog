---
title: Integrating GSD into the agent API layer
date: 2026-01-30
layout: post
summary: The protocol that makes agents finish what they start.
---

Agents loop. They read files, think about reading more files, then read the same files again. Without structure, they wander.

GSD (Get Shit Done) is a protocol. It gives the agent phases: GATHER, IMPLEMENT, VERIFY, COMPLETE. Each phase has one job. Do the job, update state, move on.

The key insight was XML tasks. Instead of free-form reasoning, the agent generates structured plans:

```xml
<task>
  <name>Create user model</name>
  <action>Write src/models/user.ts with id, email, createdAt fields</action>
  <verify>File exists and exports User type</verify>
  <done>User model created</done>
</task>
```

Each task is atomic. The agent executes one, verifies it worked, then moves to the next. No backtracking, no infinite loops.

The integration required two functions: `planLoop()` generates the XML tasks from requirements. `executeLoop()` runs them sequentially with verification.

The agent now finishes what it starts. That is the whole point of GSD.
