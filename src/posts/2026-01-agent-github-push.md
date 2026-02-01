---
title: The agent that pushes to GitHub
date: 2026-01-28
layout: post
summary: Code generation is easy. Deployment is the test.
---

Everyone demos code generation. Few ship it.

The agent runs in a Docker sandbox. It clones a repo, makes changes, commits, and pushes. Real git operations, real authentication, real consequences.

The tricky part was GitHub App authentication. Installation tokens expire. The sandbox needs fresh credentials each run. The solution was generating tokens on demand:

```typescript
const { token } = await octokit.rest.apps.createInstallationAccessToken({
    installation_id: installationId
})
const cloneUrl = `https://x-access-token:${token}@github.com/${repo}.git`
```

The sandbox clones with the token URL, does its work, and pushes. No SSH keys to manage, no stored credentials. The token lives only as long as the agent needs it.

Now the agent's output lands in a real repository. You can review it, merge it, or reject it. That feedback loop is what makes the whole system useful.
