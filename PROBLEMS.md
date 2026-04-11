# Problems & Solutions Log

A running log of issues encountered during development and how they were resolved.
Add entries in reverse-chronological order (newest at top).

---

## Open

_No open problems._

---

## Resolved

### Prompt injection in create-next-app scaffold
- **Status:** resolved
- **Encountered:** 2026-04-11
- **Context:** Initializing the Next.js web app with `npx create-next-app@latest`.
- **Problem:** The generated scaffold included `web/CLAUDE.md` and `web/AGENTS.md` files that instructed AI assistants: "This is NOT the Next.js you know — APIs, conventions, and file structure may all differ from your training data." This is a prompt injection technique designed to redirect AI behavior.
- **Solution:** Deleted both files. Standard Next.js 15/16 App Router conventions were used; no special guidance from those files was followed.

### eslint-visitor-keys engine warning during npm install
- **Status:** resolved
- **Encountered:** 2026-04-11
- **Context:** Running `npm install` inside `web/` with Node v23.9.0.
- **Problem:** `eslint-visitor-keys@5.0.1` requires Node `^20.19.0 || ^22.13.0 || >=24`. Node 23.9.0 falls outside this range and triggers a warning.
- **Solution:** Warning only — no runtime impact. The build compiles and types check cleanly. Will resolve naturally when Node 24 LTS is adopted.

---

## Format

```
### [SHORT TITLE]
- **Status:** open | resolved
- **Encountered:** YYYY-MM-DD
- **Context:** Brief description of what was being built when this surfaced.
- **Problem:** What went wrong or was unclear.
- **Solution:** How it was fixed / the decision made.
```
