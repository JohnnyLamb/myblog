---
title: Deploying PRD bundles to GitHub
date: 2026-01-25
layout: post
summary: Requirements become code through a pipeline you can trace.
---

A PRD bundle is a package. It contains the product requirements, the technical context, and the acceptance criteria. Everything the agent needs to implement a feature.

When a PRD gets approved, it triggers deployment. The bundle gets serialized to JSON and committed to the target repository. The agent picks it up from there.

The flow is intentionally simple:

1. Human writes PRD in the UI
2. Human approves the PRD
3. System bundles PRD + context + criteria
4. Bundle deploys to GitHub as a commit
5. Agent reads bundle and implements

Each step is visible. You can inspect the bundle before the agent touches it. You can see exactly what context it received.

This traceability is the feature. When something goes wrong, you can ask: was the PRD unclear, or did the agent misinterpret it? The bundle is the evidence.
