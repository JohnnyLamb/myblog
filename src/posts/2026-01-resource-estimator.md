---
title: Building a back-of-the-envelope estimator
date: 2026-01-31
layout: post
summary: Sometimes copying what works is the right move.
---

I needed a resource estimator for system design calculations. Instead of inventing something, I studied what already worked.

System Design School has a clean tool for this. Two columns: educational content on the left, calculator on the right. Reference tables at the bottom. No magic, just useful.

The implementation took three files:

```
src/lib/estimator/calculations.ts   # Pure math
src/components/estimator/           # React component
src/app/tools/estimator/            # Route + layout
```

The calculations file exports pure functions. No state, no side effects. Easy to test, easy to trust.

```typescript
export function calculateEstimates(inputs: EstimatorInputs): EstimatorOutputs {
    const secondsPerDay = inputs.precisionMode ? 86_400 : 100_000
    const readsPerSecond = (inputs.dau * inputs.readsPerUser) / secondsPerDay
    // ...
}
```

The component handles inputs and renders outputs. The reference tables for image sizes, video bitrates, and storage latency are just static data. No API calls, no loading states.

The hardest part was the layout. I wanted the tool to live at `/tools/estimator` but still show the same sidebar as the dashboard. That meant duplicating the layout logic, which felt wrong until I realized: consistency for the user matters more than DRY for the developer.

The whole thing works offline. You can reason about it by reading the code. That is the feature.
