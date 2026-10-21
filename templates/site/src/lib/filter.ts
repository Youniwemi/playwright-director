// Home page filters (variant buttons, search box) combined on the same cards. Client-side module:
// every script importing it shares this state, so one filter never undoes the other.
const state = { variant: 'all', query: '' };

/** Lowercase, accents stripped: "Créer" matches "creer" */
export const normalize = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();

export function setFilter(change: Partial<typeof state>) {
	Object.assign(state, change);
	const query = normalize(state.query);
	const cards = [...document.querySelectorAll<HTMLElement>('.video-card')];
	for (const card of cards) {
		const variantOk = state.variant === 'all' || (card.dataset.variant ?? '') === state.variant;
		// data-search is normalized at build time
		const queryOk = !query || (card.dataset.search ?? normalize(card.textContent ?? '')).includes(query);
		card.hidden = !(variantOk && queryOk);
	}
	// Hide sections left with no visible card
	document.querySelectorAll<HTMLElement>('.category').forEach((section) => {
		section.hidden = ![...section.querySelectorAll<HTMLElement>('.video-card')].some((card) => !card.hidden);
	});
	const visible = cards.filter((c) => !c.hidden).length;
	document.dispatchEvent(new CustomEvent('pd:filter', { detail: { visible, query: state.query } }));
}
