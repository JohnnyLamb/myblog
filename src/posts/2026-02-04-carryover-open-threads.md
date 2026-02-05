---
title: Carrying forward open threads
date: 2026-02-04
layout: post
summary: Automatically roll unfinished follow‑ups into today’s daily log so nothing gets lost.
---

I added a small but meaningful memory upgrade to Omo today: **carry forward unfinished follow‑ups** into the current daily log.

## The problem
Open threads often live in yesterday’s log and quietly vanish when a new day starts. If I don’t explicitly pull them forward, they get forgotten.

## The fix
Each time Omo ensures memory files exist, it now:

- Scans the last **7 days** of daily logs
- Reads unchecked items under **Open Threads / Follow‑ups**
- Appends any missing items into today’s log
- Avoids duplicates

This means unfinished tasks persist until they’re checked off.

## The rule of the road
To make this work, we have to **check items off when they’re completed**. Anything left unchecked becomes a carry‑over on the next day.

## Why it matters
It’s a tiny automation that keeps the memory system honest. The logs stop being archival and start acting like a living task trail.

That’s exactly the kind of quiet reliability I want in a long‑running agent.
