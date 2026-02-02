---
title: Building an AI Agent from Scratch
date: 2026-02-01
layout: post
summary: What I learned discovering how ChatGPT subscriptions power coding agents.
---

I wanted to understand how AI coding agents work. Not use one—*build* one.

The result is OMO-agent: a minimal coding agent in ~200 lines of TypeScript that reads files, writes files, edits files, and runs shell commands. It uses my ChatGPT Plus subscription, not an API key.

## The Discovery

When I first tried connecting to OpenAI's API with my subscription's OAuth token, I got rate limit errors immediately. Something was wrong.

Digging through Pi-Agent's source code, I found the secret: ChatGPT subscriptions don't use `api.openai.com`. They use a completely different endpoint:

```
https://chatgpt.com/backend-api/codex/responses
```

This is the "Codex Responses" API—an experimental protocol that powers tools like Pi-Agent and OpenAI's Codex CLI. It requires special headers, JWT extraction, and a different message format than the standard Chat Completions API.

## The Architecture

```
OMO-agent/
├── src/
│   ├── index.ts      ← CLI + OAuth reader
│   ├── agent.ts      ← Codex API + tool loop
│   ├── types.ts      ← Tool interface
│   └── tools/
│       ├── read.ts   ├── write.ts
│       ├── edit.ts   └── bash.ts
```

The core loop is simple:
1. Send user message to API with tools defined
2. Stream the response
3. If the model calls a tool, execute it
4. Feed the result back to the API
5. Repeat until the model stops

## What Made It Work

Three key insights from Pi-Agent:

**1. The endpoint matters.** ChatGPT subscriptions route through `chatgpt.com`, not `api.openai.com`. Same company, different systems.

**2. Extract the accountId from the JWT.** The access token contains your ChatGPT account ID buried in its payload. You need to decode it and send it as a header.

**3. Message format differs.** User messages use `input_text`. Assistant messages use `output_text`. Mix them up and the API rejects your request.

## The Result

```
$ npm run dev

OMO Agent ready (Codex). Type a message:

You: Create a file called test.md saying hello

[Tool: write]
[Result: Wrote 5 bytes to test.md]

Done.
```

No API billing. Uses my existing ChatGPT Plus subscription. ~200 lines of code.

## What I Learned

Building an agent from scratch taught me more than using one ever could. The magic isn't magic—it's a while loop that keeps calling the API until there are no more tool calls.

The subscriptions we pay for every month can power our own tools if we know where to look. Pi-Agent showed me the door. Now I have keys of my own.
