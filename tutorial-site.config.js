/**
 * Gallery config for this repo's own demo site, deployed by
 * .github/workflows/deploy-site.yml to GitHub Pages under /gallery/.
 *
 * @type {import('playwright-director/site').SiteConfig}
 */
export default {
	title: 'playwright-director — Demo Gallery',
	input: 'tutorials/',
	output: 'tutorial-site-dist/',
	// Full URL including the /gallery/ path: Astro derives site + base from it,
	// so every asset link works under the GitHub Pages sub-path.
	baseUrl: 'https://youniwemi.github.io/playwright-director/gallery/',
	lang: 'en',
	// The CI deploy builds the gallery twice (deploy-site.yml): Académie here, Classic under /gallery/classic/
	themeSwitcher: {
		Académie: '/playwright-director/gallery/',
		Classic: '/playwright-director/gallery/classic/'
	},
	docsUrl: 'https://github.com/Youniwemi/playwright-director',
	tutorials: {
		featured: 'two-profiles-one-video',
		// "Read the docs" link per video: README sections
		links: {
			'zoom-demo': { docs: '#zooming-on-an-element' },
			'fast-forward-demo': { docs: '#fast-forwarding-long-waits' },
			'two-profiles-one-video': { docs: '#multiple-user-profiles' },
			'mobile-split-demo': { docs: '#variants--record-the-same-tutorial-for-mobile' },
			'overlay-tl': { docs: '#styling' },
			'first-invoice-walkthrough': { docs: '#paces--one-script-three-cuts' },
			'first-invoice-docs': { docs: '#paces--one-script-three-cuts' },
			'first-invoice-social': { docs: '#paces--one-script-three-cuts' }
		},
		// Sections in display order; `items` lists e2e testNames in reading order
		categories: {
			start: {
				label: 'Getting started',
				blurb: 'One test, one narrated video: sessions, scenes and split screens.',
				items: ['two-profiles-one-video', 'split-screen-demo']
			},
			paces: {
				label: 'One script, three cuts',
				blurb: 'The same tutorial recorded as a full walkthrough, a docs snippet and a social demo (TUTORIAL_PACE).',
				items: ['first-invoice-walkthrough', 'first-invoice-docs', 'first-invoice-social']
			},
			camera: {
				label: 'Camera and pacing',
				blurb: 'Zoom on what matters, speed through the waits, hide what is secret.',
				items: ['zoom-demo', 'fast-forward-demo', 'type-blurred-demo']
			},
			overlays: {
				label: 'Step overlays',
				blurb: 'Place the step banner in any corner, per video or per step.',
				items: ['overlay-tl', 'overlay-tr', 'overlay-bl', 'overlay-br', 'overlay-position-override']
			},
			mobile: {
				label: 'Mobile',
				blurb: 'Phone-sized recordings with pinned split scenes.',
				items: ['mobile-split-demo']
			}
		},
		// Hero chips: a click shows only the role's sections
		roles: {
			first: { label: 'My first video', sections: ['start', 'overlays'] },
			polish: { label: 'I polish videos', sections: ['paces', 'camera', 'overlays'] },
			mobile: { label: 'I ship a mobile app', sections: ['mobile'] }
		},
		ui: {
			heroTitle: 'playwright-director *in action*',
			heroSubtitle:
				'Every video below was generated in CI from the Playwright e2e tests of this repository — no screen recording, no editing.'
		}
	}
};
