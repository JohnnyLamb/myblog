# Posting workflow

1) Create a new markdown file in `src/posts/`  
Name format: `YYYY-MM-DD-your-slug.md`

Example:
```
src/posts/2026-02-01-owning-your-tools.md
```

2) Add frontmatter + content:
```
---
title: Owning your tools
date: 2026-02-01
layout: post
---
Your post content here.
```

3) Build and preview locally:
```
npm run build
npm run serve
```
Open http://localhost:8080

4) Publish:
```
git add src/posts/2026-02-01-owning-your-tools.md
git commit -m "Add post: Owning your tools"
git push
```

GitHub Pages will pick up `docs/` after you run `npm run build`.
So usually you do:
```
npm run build
git add docs src/posts/2026-02-01-owning-your-tools.md
git commit -m "Add post: Owning your tools"
git push
```
