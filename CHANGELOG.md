# Changelog

## 0.6.2

### Added

- **Every config language gets its pages** — with `lang: 'fr,en,ar'`, a
  tutorial not recorded in en/ar still gets `/en/…` and `/ar/…` pages (and
  homes): UI in the page language, the default-language video, a "This video
  is in French." note. They appear in the language switchers, hreflang and the
  sitemap; JSON-LD `inLanguage` stays the recording's language.
- **`tutorials.paths`** — page path per slug and language
  (`{ look: { en: 'your-look' } }`), to keep existing URLs.

### Changed

- The language switchers list languages in config `lang` order.
- Footer "Built with playwright-director" links to the project site.
- Overrides: the video page route is now `pages/[...slug].astro` (was
  `[slug].astro`) — rename an overridden copy.

## 0.6.1

### Changed

- **Role chips** — the Académie hero chips now come from `tutorials.roles`
  (`{ id: { label, sections } }`): one chip per reader profile ("Je suis
  comptable"), a click shows only that profile's sections, "All" resets. They
  combine with search and the variant filter.

### Migration

- The 0.6.0 section chips are gone (they repeated the table of contents).
  Add `tutorials.roles` to get chips back.

## 0.6.0

### Added

1. **Académie theme** (new default) — hero with search and section chips, a
   featured "start here" video, side table of contents, numbered cards
   (thumbnail = quick view, title = page), video page with a course sidebar
   and a "your turn" call-to-action. The quick-view dialog takes the video's
   aspect ratio.
2. **Theme system** — `theme: 'academy' | 'classic'` (`build-site --theme`),
   built from shared components. Customize with `tokens` (`--pd-*`), `css`,
   `overrides` (folder copied over the site `src/`) and `googleFonts`.
   `themeSwitcher` links builds of the same gallery.
3. **Sections** — `categories.<id>.items` sets the reading order, `blurb`,
   `featured`, `premium` (PRO badge); computed stats ("3 videos · ~4 min").
4. **App and docs links** — test option `links: { app, docs }` or config
   `tutorials.links`, resolved on `appUrl` / `docsUrl` (`{lang}` replaced).
5. **SEO** (full `baseUrl`) — VideoObject JSON-LD with chapter `Clip`s,
   canonical, hreflang, Open Graph; `sitemap.xml`, `robots.txt`, `links.json`.
6. **CLI** — `build-site --output=<dir>` and `--dev` (astro dev, live reload).
7. **Demo** — the GitHub Pages gallery is built in both themes, with docs links.
8. **Tests** — `e2e/site.spec.ts`: both themes, fr + ar, no overflow at
   375 / 1280 px, search, chapter seek and `?t=`, axe.

### Fixed

- RTL: prev/next arrows were mirrored twice (`‹ ›` are already
  bidi-mirrored); the course sidebar chevron pointed sideways.
- Contrast (WCAG AA): Classic primary `#6366f1` → `#4f46e5` (4.46:1 → 6.3:1 on
  white; also the widget fallback accent); Académie section counts.

### Migration

- The default look changes to Académie. Set `theme: 'classic'` to keep the
  previous one. `primaryColor` / `font` still work (= `tokens.primary` /
  `tokens.fontBody`).
- Classic's default primary is now `#4f46e5`: set `tokens.primary` to keep
  the old color.

## 0.5.0

### Added

1. **Monorepo / bun workspace** — `build-site` resolves astro from
   playwright-director itself; the consuming app needs no `astro` dependency.
   Proven with bun, pnpm and npm on `tests/fixtures/workspace`
   (`PD_WORKSPACE_TEST=1 npm test`). Site config `timelines` / `videos` point
   at non-default output dirs.
2. **Headless data API** — `import { load, loadIndex } from 'playwright-director/client'`
   or `PlaywrightDirector.load()` from `widget.js`. Payloads carry
   `schemaVersion: 1`; JSON Schema in `schemas/embed-v1.schema.json`. Clear
   errors for 404 (lists the index URL) and CORS/network failures.
3. **Per-language tutorials** — `TUTORIAL_LANG=xx` records a spec per language
   (outputs suffixed `.<lang>`). Gallery groups languages by slug, writes
   `embed/<slug>.<lang>.json` (+ `embed/<slug>.json` = default language).
4. **i18n** — site chrome in en/fr/ar (override with `strings` in the config),
   one home page per language (`/`, `/en/`, `/ar/`), RTL pages; widget strings
   in en/fr/ar, chosen from `data-tutorial-lang` or `<html lang>`.
5. **Theming** — the widget reads `--pd-accent`, `--pd-surface`, `--pd-text`,
   `--pd-muted`, `--pd-border`, `--pd-radius`, `--pd-font`, `--pd-focus-ring`
   defined by the app.
6. **Accessible widget** — native modal `<dialog>` (focus trap, Esc, focus
   return), chapter list with `aria-current`, arrow/Home/End keys, 44px
   targets. `e2e/widget.spec.ts` runs axe on fr and ar.
7. **Chapters** — every step has `at` (seconds), `key`, a human `title`;
   tutorials have `durationSeconds` and a recorded `poster`. Clicking a step
   on the site or in the widget seeks the video.
8. **Deploy** — `_headers` (CORS + cache) generated for Cloudflare Pages /
   Netlify (`cors: false` disables it); `baseUrl` may be a bare path;
   `build-site --base=/help/`.
9. **Voice cache** — clips live in `tutorials/.cache/voice`
   (`TUTORIAL_VOICE_DIR`), served to the page with `page.route`; nothing is
   written to `static/` anymore. Clips from the old `static/audio/tutorial-voice/`
   are adopted once.
10. **CLI** — `build-site -y` (never prompts; automatic without a TTY),
    `build-site --only=<slug,...>`. README documents re-recording one tutorial
    (`npx playwright test -g`) and the `tutorial-transcript apply` round-trip.
    macOS Arabic voice is now `Majed`.

### Deferred

- **Site theming beyond `primaryColor` / `font`** — `--pd-*` variables cover
  the widget, which is what apps embed; no demand yet for a full site theme.
- **`serve` command with Range support** — any static server does it
  (`npx http-server <output>`); not worth a new command and dependency.

### Migration

- Remove `astro` from your app's devDependencies.
- Delete `static/audio/tutorial-voice/` once a run has adopted the clips;
  add `tutorials/.cache/` to `.gitignore`.
- Drop any hand-written `_headers`: the build writes one.
- Embed payload steps now have `at`, `key` and a human `title`; read
  `schemaVersion` before relying on fields.
