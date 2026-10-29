---
name: tutorialize
description: Transform a Playwright E2E test into a narrated tutorial video. Load before writing or reviewing any tutorial.step(), tutorial.context(), or tutorial.complete() call. Covers persona analysis, storytelling arc, choreography rules, and the playwright-director API.
---

# /tutorialize — Tutorial Design Skill

Turn a Playwright test into a tutorial that **teaches**, not just demonstrates.

Three reference files support this skill:
- [`references/storytelling.md`](references/storytelling.md) — Persona analysis, emotional arc, narration voice, pacing decisions
- [`references/api.md`](references/api.md) — `playwright-director` API, timing model, technical rules, checklist
- [`references/site.md`](references/site.md) — Gallery site (`build-site`): config, themes, sections, role chips, build targets + include/exclude, tokens/css/overrides, app + docs links, languages, SEO

**Read the first two before tutorializing.** Storytelling comes first — it drives every API decision.
Read `site.md` when you touch `tutorial-site.config.js`, a site override, or the test's `links`.

## Process

### 1. Understand (read `storytelling.md`)
- **Who** is watching? (role, expertise, emotional state)
- **What** are they trying to accomplish? (goal, not feature)
- **What** do they already know? (skip the obvious, explain the surprising)
- **How many profiles** does the story need? One is the default. Reach for a
  second scene only when the lesson is the handoff between two people —
  see `storytelling.md` §8 and `api.md` §10.

### 2. Design the arc
```
Navigate to first screen (before any tutorial call)
  ↓
CONTEXT (goal): "Here's what we'll accomplish"
  ↓
STEP (no-op): Describe what's on screen
  ↓
STEPS: Grouped by concept, do/explain narration
  ↓
CONTEXT (clarification): Only if a complex section needs framing
  ↓
MORE STEPS...
  ↓
COMPLETE: Celebrate the outcome, suggest what's next
```

### 3. Implement (read `api.md`)
- Use the Tutorial API: `context()`, `step()`, `complete()`
- Follow timing rules, blank-screen prevention, navigation handling
- Direct attention sparingly: `zoom()` (optionally `blur`) on the 1–3 moments
  the viewer must not miss (`storytelling.md` §9, `api.md` §13); secrets go
  through `typeBlurred()`
- Fast-forward the dead time: wrap slow generations or repetitive chores in
  `fastForward(speed, …)` inside their step (`storytelling.md` §10, `api.md` §14)
- Apply the polish checklist before submitting

### 4. Verify
- Test passes without `TUTORIAL_MODE` (plain E2E)
- Test passes with `TUTORIAL_MODE=true` (video generation)
- Watch the generated video — does it feel human?
- Narration texts also become the gallery site's step-by-step guide
  (`npx playwright-director build-site`) — even `skipVoice` steps show their
  text there, so write every step text to read well on the page too.
- Each step's first sentence is its chapter title (gallery + in-app widget,
  click = seek); for other locales, re-record with `TUTORIAL_LANG=xx` and let
  the app follow `tutorial.lang` (`api.md` §1).
- Set `links: { app, docs }` when the tutorial shows an app screen or has a
  docs page, and add the slug to a section's `items` in the site config
  (`site.md` §3, §5).
