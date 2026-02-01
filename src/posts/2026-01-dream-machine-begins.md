---
title: Dream Machine begins
date: 2026-01-20
layout: post
summary: Building the infrastructure for AI-assisted development.
---

Dream Machine started as a question: what if you could describe what you want and have an agent build it?

Not a chatbot that suggests code. Not an autocomplete that guesses your next line. A system that takes requirements, reasons about them, and produces working software.

The initial commit was infrastructure. Next.js for the UI. Prisma for the database. Docker for sandboxing. GitHub Apps for authentication.

Each choice was about control. Next.js because it runs anywhere. Prisma because migrations are explicit. Docker because agents need isolation. GitHub Apps because installation-level access beats personal tokens.

Phase 4 was making the pieces talk to each other. The UI creates PRDs. The backend packages them. The sandbox runs agents. GitHub receives the output.

The dream is simple: describe the machine you want, then watch it get built. The infrastructure is what makes that possible.
