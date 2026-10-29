# Site Reference — the tutorial gallery (`build-site`)

`npx playwright-director build-site` turns the recordings (videos, timelines, step screenshots) into a
static Astro site: a home page per language, one page per video, SEO files, and the in-app widget data.
Config: `tutorial-site.config.js` at the project root (`--config=` for another path).

Read this before you edit a site config, add a theme override, or wire tutorials to the app and docs.

---

## 1. Minimal config

```js
/** @type {import('playwright-director/site').SiteConfig} */
export default {
	title: 'My App — Help',
	input: 'tutorials/', // videos in <input>/videos, timelines in <input>/output
	output: 'tutorial-site-dist/',
	baseUrl: 'https://help.myapp.com/', // full URL = SEO on; a path ('/help/') = no absolute URLs
	lang: 'fr,en,ar' // first = default language, served at /; the others at /<lang>/
};
```

`baseUrl` must be a **full URL** to get canonical, hreflang, og:*, VideoObject JSON-LD, `sitemap.xml`,
`robots.txt` (host root only) and `links.json`. A bare path only sets the base path.

## 2. All options

| Option | Default | What it does |
|---|---|---|
| `title` | *required* | Header + `<title>` |
| `logo` | — | Image path, copied to the site |
| `theme` | `'academy'` | `'academy'` (editorial: hero, sections, course sidebar) or `'classic'` (card carousel) |
| `tokens` | theme values | Design tokens → CSS variables (§4). Unknown names fail the build |
| `googleFonts` | theme fonts | `['Manrope:wght@400;600']`; `false` = load none |
| `css` | — | Extra stylesheet, loaded after the theme |
| `overrides` | — | Folder copied over the site `src/` — replaces any page, component or theme file (§4) |
| `appUrl` | — | App origin: resolves `links.app` paths; header button + call-to-action. `{lang}` is replaced |
| `docsUrl` | — | Docs origin for `links.docs` paths; `{lang}` is replaced by the tutorial language |
| `cta` | `true` | Académie "your turn" panel (needs an app link) |
| `themeSwitcher` | — | `{ Académie: '/help/', Classic: '/help/classic/' }` — links between builds |
| `input` / `output` | *required* | Recordings dir / built site dir |
| `timelines` / `videos` | `<input>/output`, `<input>/videos` | Override when `TUTORIAL_OUTPUT_DIR` differs |
| `baseUrl` | *required* | Full URL or path (§1) |
| `cors` | `'*'` | `_headers` Access-Control-Allow-Origin (widget on another origin); `false` = no file |
| `lang` | *required* | One language or a comma list (§6) |
| `strings` | built-in en/fr/ar | UI text overrides per language: `{ fr: { ctaButton: 'Essayer' } }` |
| `primaryColor` / `font` | — | Pre-0.6 spellings of `tokens.primary` / `tokens.fontBody` |
| `tutorials.categories` | from `@feature:` tags | Sections in display order (§3) |
| `tutorials.roles` | — | Académie hero chips, one per reader profile: a click shows only its sections (§3) |
| `tutorials.exclude` / `include` | — | `{ categories, slugs }` — leave tutorials out of the build entirely (§7b) |
| `targets` | — | Named config overrides picked with `--target <name>` (§7b) |
| `tutorials.featured` | first video | Slug of the Académie "start here" video |
| `tutorials.premium` | `[]` | Slugs with a PRO badge |
| `tutorials.links` | test `links` | Per-slug `{ app, docs }`, over the test's |
| `tutorials.ui.heroTitle` | `title` | `*word*` marks emphasis (italic). String or `{ fr, en }` |
| `tutorials.ui.heroSubtitle` | "Video tutorials" | String or per language |
| `tutorials.stepsLayout` | `'text'` | Video page step guide: `'text'` \| `'cards'` \| `'full'` \| `'none'` |
| `tutorials.showStrip` | `true` | Thumbnail strip above the step guide |

## 3. Sections and order

```js
tutorials: {
	featured: 'onboarding',
	premium: ['bank-reconciliation'],
	categories: {
		start: {
			label: { fr: 'Premiers pas', en: 'Getting started' },
			blurb: { fr: 'Créer son compte et sa première facture.', en: 'Account and first invoice.' },
			items: ['onboarding', 'first-invoice'] // slugs, in reading order
		},
		billing: { label: 'Facturation', items: ['credit-note', 'recurring'] }
	}
}
```

- Sections show in key order; videos in `items` order, then unlisted ones in scan order.
- `items` wins over the timeline `@feature:` tag. A slug = the test name without `.<lang>` / `-<variant>`,
  so one entry covers every language and variant (`items`, `premium`, `featured`, `links` alike).
  Recordings named after a translated title still group: languages of one test (same `testFile` + `testTitle`
  + variant) share the site-language recording's slug (else the first language's), whatever their ids.
- Empty sections are dropped. Section stats ("3 videos · ~4 min") are computed.
- **Roles** (Académie hero chips) filter by reader profile, not by section — the side table of contents
  already lists the sections. Keep labels short ("Je suis comptable"); a role lists section ids, an
  unknown id fails the build. No `roles` = no chips.

```js
roles: {
	accountant: { label: { fr: 'Je suis comptable', en: 'I am an accountant' }, sections: ['accounting', 'lecteur'] },
	payroll: { label: { fr: 'Je gère la paie' }, sections: ['payroll'] }
}
```

## 4. Look: tokens → css → overrides

Use the lightest layer that does the job:

1. **`tokens`** — colors, radius, shadow, fonts:
   `primary onPrimary accent bg surface text muted border pro radius shadow shadowHover fontBody fontDisplay`
   → `--pd-*` variables, written as `html:root { … }` so they beat the theme defaults.
   Keep `primary` at 4.5:1 or more against `onPrimary` and `surface` (WCAG AA — the e2e suite runs axe).
2. **`css`** — any rule, loaded last. Target the stable classes (`.video-card`, `.ac-card`,
   `.step-row`, `.video-modal`, …) or set `--pd-*` variables.
3. **`overrides`** — a folder mirroring the site `src/`: `overrides/theme/Home.astro` replaces the
   theme's home page; `overrides/components/VideoLinks.astro` replaces a shared component. Last resort:
   overridden files do not get package updates.

Copy order (later wins): `templates/site` → `templates/themes/<theme>` (as `src/theme/`) → `overrides`
→ generated data (`src/data/*.json`, `styles/user.css`, `public/*`).

## 5. Links to the app and the docs (cross-linking)

Declare them in the test — they are stored in the timeline and need no rebuild of the config:

```ts
const tutorial = new Tutorial(page, {
	title: t('invoice.create'),
	links: { app: '/invoices/new', docs: '/guides/invoices/' }, // paths on appUrl / docsUrl, or full URLs
	// …
});
```

- Video pages show "Open in the app" / "Read the docs" buttons; the Académie call-to-action uses the
  video's app link, else `appUrl`.
- `links.json` (site root, full `baseUrl` only) maps each docs URL to its tutorials
  (`slug, lang, url, title, poster, durationSeconds`), so the docs site can render "watch the video" cards.
- The widget payloads (`embed/<slug>.json`) carry `links` too.

## 6. Languages

- `lang: 'fr,en,ar'`: `/` = fr home, `/en/`, `/ar/` = the others; ar/he/fa/ur pages are RTL.
- Record one spec per language with `TUTORIAL_LANG=xx` (`api.md` §1). Each home lists every tutorial
  once, in its language when recorded, else in its first recorded language — a missing translation
  never hides a tutorial.
- UI strings: built-in en/fr/ar; `strings` adds or overrides keys. A new language starts from English.
  Plurals: a `<key>_<category>` entry (`sectionStats_one`) is picked by `Intl.PluralRules`.

## 7. CLI

```bash
npx playwright-director build-site                     # ./tutorial-site.config.js
npx playwright-director build-site --config=help.js
npx playwright-director build-site --theme=classic     # override config.theme
npx playwright-director build-site --base=/help/       # override baseUrl's path
npx playwright-director build-site --output=dist/help/ # override output
npx playwright-director build-site --only=onboarding   # only these slugs (all languages/variants)
npx playwright-director build-site --target public     # merge targets.public over the config (§7b)
npx playwright-director build-site -y                  # never prompt (CI; automatic without a TTY)
npx playwright-director build-site --dev               # astro dev with live reload, no build
```

Two themes from one config: build twice with `--theme` + `--base` + `--output`, and set
`themeSwitcher` so each build links to the other.

## 7b. Targets, include / exclude — a public and an internal site from one config

```js
export default {
	title: 'Académie', input: 'tutorials/', output: 'tutorials/site/dist/', baseUrl: '/', lang: 'fr',
	tutorials: { categories: { general: { label: 'Général' }, admin: { label: 'Administration' } } },
	targets: {
		public: { output: 'tutorials/site/public/', tutorials: { exclude: { categories: ['admin'] } } }
	}
};
```

```bash
npx playwright-director build-site                  # everything → tutorials/site/dist/
npx playwright-director build-site --target public  # no admin tutorials → tutorials/site/public/
```

- **`targets.<name>`** is deep-merged over the config: objects merge, arrays and plain values replace,
  `null` deletes a key. No `--target` = the main config. An unknown name fails and lists the targets.
  CLI flags (`--output`, `--base`, `--theme`) still win over the target.
- **`tutorials.exclude` / `include`**: `{ categories?: string[], slugs?: string[] }`. `categories` are
  section ids (`tutorials.categories` keys — the section a tutorial is shown in: `items`, else its
  `@feature:` tag); `slugs` are globs on the slug (`*` any, `?` one character), e.g. `['admin-*']`.
  Published = matches `include` (or no `include`) and does not match `exclude`; matching = its
  category is listed or its slug matches. `.<lang>` and `-<variant>` recordings follow their slug.
- An excluded tutorial leaves **no trace**: no page, no `embed/<slug>*.json`, no `embed/index.json`
  entry, no `videos/<slug>*` file, nothing in search, sitemap, `links.json`, counts or durations.
  Sections left empty are hidden; a role whose sections are all hidden is hidden.
- **Removing a section from `categories` (or setting it to `null` in a target) does not unpublish
  it** — its tutorials ship under a detected section, with a warning. Use `exclude.categories`.
- Warnings, not failures: an excluded `featured` (falls back to the first published tutorial), an
  excluded slug in `items` or `premium`. Nothing left to publish fails.
- Build into a fresh `output` folder: files from an earlier, larger build are not deleted.

## 8. Output

| Path | Content |
|---|---|
| `index.html`, `<lang>/index.html` | Home per language |
| `<id>/index.html` | Video page (player + chapters, steps, prev/next, course sidebar) |
| `videos/` | Videos, posters, step screenshots |
| `sitemap.xml`, `robots.txt`, `links.json` | SEO + docs cross-links (full `baseUrl` only) |
| `embed/*.json`, `widget.js`, `client.js` | In-app help widget + headless data API |
| `_headers` | CORS + cache rules (Cloudflare Pages / Netlify) |

## 9. Checklist

- [ ] `baseUrl` is a full URL in production (SEO files and JSON-LD need it)
- [ ] Every recorded slug is in a section's `items` (or has a meaningful `@feature:` tag)
- [ ] `featured` names an existing slug
- [ ] Académie chips: `roles` per reader profile (short labels), never one chip per section
- [ ] Tests that show an app screen set `links.app`; tests with a docs page set `links.docs`
- [ ] Customization uses tokens first, `css` second, `overrides` last
- [ ] `--only` builds are for checking a page — deploy a full build
- [ ] Internal tutorials stay out of a public build with `exclude` in a target, never by deleting their section
