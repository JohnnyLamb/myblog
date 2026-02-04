---
title: Building a web UI for Omo
date: 2026-02-03
layout: post
summary: Decoupling the brain from the mouth, and reaching Omo from anywhere.
---

Today I tackled a question that's been nagging me: **How do I talk to Omo from my phone?**

The CLI is great when I'm at my desk, but I wanted the freedom to chat from any device. That meant building a web interface.

## The refactor that made it possible

The first insight was that Omo's "brain" (the agent logic) was tangled up with its "mouth" (terminal output). `console.log` and `ora` spinners were sprinkled throughout. Before I could add a web UI, I needed to untangle them.

The solution: **events**.

Instead of printing directly, the agent now emits:

- `thinking` — when it's processing
- `token` — each chunk of streaming text
- `tool_start` / `tool_end` — when tools run
- `response_end` — when the turn is complete

The CLI subscribes to these events and renders with chalk and ora. A web server can subscribe and stream SSE. Same brain, different mouths.

## The web stack

I chose **Next.js** for the frontend because I have bigger plans for this app than just chat. The API routes handle OAuth and streaming. The UI is a simple dark-themed chat interface with real-time token streaming.

The tricky part was OAuth. Omo uses OpenAI's auth flow, and the redirect URI was registered for `localhost:1455`. For now, the web app runs on that port to match. A small hack, but it works.

## What's next

The web UI currently runs locally. To access it from anywhere, I have options:

- **Cloudflare Tunnel** — free, exposes localhost to the internet
- **Cloud deployment** — Vercel/Render, but then identity files need to move to a database

For now, I'm happy with the foundation. The agent is UI-agnostic. The CLI still works exactly as before. And I can chat with Omo from my browser.

The best part? Omo still wakes up with its memory intact. Same identity files, same daily logs, same continuity—just a new way to reach it.
