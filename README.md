# myblog

A small, explicit static site pipeline.

## Structure

```
src/
  _data/          Site config (ignored from output)
  _layouts/       Layouts (ignored from output)
  _includes/      Partials (optional)
  posts/          Posts (clean URLs)
  assets/         Static files copied as-is
  index.html      Home page
  about.md        Example page
html/             Build output
build.js          Generator
```

## Commands

- Build once: `npm run build`
- Dev watch + serve: `npm run dev`
- Serve existing output: `npm run serve`

## Content rules

- `{{key}}` templating with dotted paths (e.g. `{{site.title}}`)
- `{{> partial}}` includes load from `src/_includes/partial.html`
- `_`-prefixed files/dirs are ignored for output but can be used for layouts/includes/data
- Posts are any files under `src/posts/` and compile to `/posts/<slug>/`
- `permalink` in frontmatter overrides output path
 - Site metadata lives in `src/_data/site.json`

## Frontmatter

```
---
title: Example
layout: base
date: 2026-01-15
permalink: /custom-path/
---
```

## Notes

Use `--clean` when you delete source files to avoid stale output in `html/`.
