---
title: Rolling my own static site generator
date: 2026-02-01
layout: post
summary: A small pipeline I can explain end to end.
---
I did not want a website product. I wanted a publishing pipeline I could understand in one sitting.

The appeal was clarity: every step from Markdown to HTML is visible, and every file exists for a reason. There is no plugin marketplace to maintain, no theme layer to decode, and no magic I cannot explain later.

Pipeline diagram:

```
src/posts/*.md
  -> frontmatter
  -> markdown -> html
  -> layout wrap
  -> docs/posts/<slug>/index.html
```

Tradeoffs I am accepting:

- No plugin ecosystem
- No one-click themes
- No auto-generated tag pages unless I build them
- No CMS integration out of the box

That is fine. The system exists to serve the writing, not the other way around.

Owning the pipeline changes how I write. The code is infrastructure—boring and reliable—and the writing is the only thing that should feel alive.
