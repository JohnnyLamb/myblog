
---

title: Rolling my own static site generator

date: 2026-02-01

layout: post

summary: A small, explicit pipeline that I can understand end‑to‑end.

---

  

I didn’t want a website product. I wanted a publishing pipeline I could understand in one sitting.

  

The appeal wasn’t novelty. It was clarity: every step from Markdown to HTML is visible, and every file exists for a reason. There’s no plugin ecosystem to manage, no theme layer to

decode, and no “magic” I can’t explain later.

  

## The shape of the system

  

The generator is deliberately small:

  

- Load Markdown from `src/`

- Parse frontmatter

- Convert Markdown → HTML

- Wrap with layouts

- Write clean URLs to `docs/`

  

That’s the whole pipeline. When it breaks, it breaks in one of five obvious places.

  

## Pipeline diagram

  

  

src/posts/*.md

|

v

[frontmatter]

|

v

[markdown -> html]

|

v

[layout wrap]

|

v

docs/posts/<slug>/index.html

  

  

## Tradeoffs

  

I’m choosing simplicity, and that means giving up a few conveniences:

  

- No plugin marketplace

- No “just add a theme” shortcuts

- No automatic tag pages unless I build them

- No CMS integration out of the box

  

I’m fine with that. The system exists to serve the writing, not the other way around.

  

## Why it matters

  

Owning the publishing stack changes how you write. It removes friction, and it makes the site feel like a tool rather than a product. The code is infrastructure—boring and reliable

—and the writing is the only thing that should ever feel alive.

  

---

  

If you want to follow this path, start by making the smallest thing that works. Then stop.