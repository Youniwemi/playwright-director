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
- Empty sections are dropped. Section stats ("3 videos · ~4 min") are computed.

## 4. Look: tokens → css → overrides

Use the lightest layer that does the job:

1. **`tokens`** — colors, radius, shadow, fonts:
   `primary onPrimary accent bg surface text muted border pro radius shadow shadowHover fontBody fontDisplay`
   → `--pd-*` variables, written as `html:root { … }` so they beat the theme defaults.
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
npx playwright-director build-site -y                  # never prompt (CI; automatic without a TTY)
```

Two themes from one config: build twice with `--theme` + `--base` + `--output`, and set
`themeSwitcher` so each build links to the other.

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
- [ ] Tests that show an app screen set `links.app`; tests with a docs page set `links.docs`
- [ ] Customization uses tokens first, `css` second, `overrides` last
- [ ] `--only` builds are for checking a page — deploy a full build
