/**
 * playwright-director — embeddable in-app tutorial widget.
 *
 * Hosted at the root of the generated gallery site. A consuming app loads it
 * with a single script tag and marks any element with data-tutorial="<slug>":
 *
 *   <script src="https://tutorials.example.com/widget.js" defer></script>
 *   <button data-tutorial="create-account">How does this work?</button>
 *
 * Clicking the element opens a native modal <dialog> with the tutorial video
 * and its chapters, fetched from <site>/embed/<slug>.json by the headless
 * client served next to this file (client.js).
 *
 * Programmatic API (window.PlaywrightDirector):
 *   open(slug, { lang })  → built-in dialog
 *   close()
 *   load(slug, { lang })  → Promise<TutorialData>, no UI (absolute URLs, steps with `at` seconds)
 *   strings[lang]         → UI dictionaries (en/fr/ar built in), editable
 *
 * Language: options.lang, else the trigger's data-tutorial-lang, else
 * <html lang>. It picks the tutorial language (falls back to the default one)
 * and the UI strings; ar/he/fa/ur render right-to-left.
 *
 * Theming: CSS custom properties on the host element, e.g.
 *   .playwright-director-widget { --pd-accent: #16a34a; --pd-radius: 4px; }
 * (--pd-accent, --pd-surface, --pd-text, --pd-muted, --pd-border, --pd-radius,
 * --pd-font, --pd-focus-ring). Page rules win over the site's defaults.
 */
(function () {
	'use strict';

	if (window.PlaywrightDirector) return; // loaded twice — keep the first instance

	// The site base is wherever this script is served from.
	var script = document.currentScript || document.querySelector('script[src*="widget.js"]');
	var BASE = script && script.src ? script.src.replace(/widget\.js(\?.*)?$/, '') : '/';

	// UI strings (same texts as src/site/strings.ts — a unit test keeps them in sync).
	// Add a language from the page: PlaywrightDirector.strings.es = { close: 'Cerrar', … }
	var STRINGS = {
		en: {
			close: 'Close', tutorial: 'Tutorial', loading: 'Loading…', unavailable: 'Tutorial unavailable',
			steps: 'Steps', step: 'Step {n}', playFrom: 'Play from {time}', screenshot: 'Screenshot',
			openFull: 'Open full tutorial', duration: 'Duration'
		},
		fr: {
			close: 'Fermer', tutorial: 'Tutoriel', loading: 'Chargement…', unavailable: 'Tutoriel indisponible',
			steps: 'Étapes', step: 'Étape {n}', playFrom: 'Lire à partir de {time}', screenshot: 'Capture d’écran',
			openFull: 'Ouvrir le tutoriel complet', duration: 'Durée'
		},
		ar: {
			close: 'إغلاق', tutorial: 'درس', loading: 'جارٍ التحميل…', unavailable: 'الدرس غير متاح',
			steps: 'الخطوات', step: 'الخطوة {n}', playFrom: 'تشغيل من {time}', screenshot: 'لقطة الشاشة',
			openFull: 'فتح الدرس كاملاً', duration: 'المدة'
		}
	};
	var RTL_LANGS = ['ar', 'he', 'fa', 'ur'];

	function primary(lang) {
		return String(lang || 'en').toLowerCase().split('-')[0];
	}

	function tr(lang, key, vars) {
		var dict = STRINGS[primary(lang)] || STRINGS.en || {};
		var s = dict[key] || (STRINGS.en || {})[key] || key;
		return s.replace(/\{(\w+)\}/g, function (m, name) {
			return vars && name in vars ? String(vars[name]) : m;
		});
	}

	function mmss(sec) {
		var s = Math.floor(sec);
		return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
	}

	// Data comes from the headless client served next to this file (one implementation
	// for widget and bundling apps: `playwright-director/client`).
	var cache = {};
	var client = null;
	function load(slug, options) {
		var lang = (options && options.lang) || '';
		var key = slug + '|' + lang;
		if (cache[key]) return cache[key];
		if (!client) {
			client = import(BASE + 'client.js');
			client.catch(function () { client = null; });
		}
		cache[key] = client.then(function (c) {
			return c.load(slug, { baseUrl: BASE, lang: lang || undefined });
		});
		cache[key].catch(function () { delete cache[key]; });
		return cache[key];
	}

	var CSS = [
		// `all: initial` isolates the widget; font-family is re-inherited so it uses the app's font.
		':host { all: initial; font-family: inherit; --pd-accent: var(--playwright-director-accent, #6366f1); --pd-surface: #fff;',
		'  --pd-text: #0f172a; --pd-muted: #64748b; --pd-border: #e2e8f0; --pd-radius: 12px;',
		'  --pd-focus-ring: 0 0 0 3px color-mix(in srgb, var(--pd-accent) 45%, transparent); }',
		'* { box-sizing: border-box; margin: 0; padding: 0; }',
		'dialog { margin: auto; border: 0; padding: 0; background: var(--pd-surface); color: var(--pd-text);',
		'  border-radius: var(--pd-radius); width: min(720px, calc(100% - 2rem)); max-height: 92vh;',
		'  font-family: var(--pd-font, inherit); font-size: 16px; line-height: 1.5; overflow: hidden;',
		'  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.35); }',
		'dialog[open] { display: flex; flex-direction: column; }',
		'dialog::backdrop { background: rgba(15, 23, 42, 0.55); }',
		':focus-visible { outline: none; box-shadow: var(--pd-focus-ring); }',
		'.head { display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 0.5rem 0.5rem 1.25rem;',
		'  border-bottom: 1px solid var(--pd-border); }',
		'[dir="rtl"] .head { padding: 0.5rem 1.25rem 0.5rem 0.5rem; }',
		'.head h2 { font-size: 1.05rem; font-weight: 700; flex: 1; min-width: 0; }',
		'.duration { flex-shrink: 0; color: var(--pd-muted); font-size: 0.85rem; font-variant-numeric: tabular-nums; }',
		'button { font: inherit; color: inherit; }',
		'.close { flex-shrink: 0; width: 44px; height: 44px; border: 0; background: none; cursor: pointer;',
		'  font-size: 1.5rem; line-height: 1; color: var(--pd-muted); border-radius: calc(var(--pd-radius) / 2); }',
		'.close:hover { background: color-mix(in srgb, var(--pd-text) 6%, transparent); color: var(--pd-text); }',
		'.body { overflow-y: auto; padding: 1.25rem; }',
		'video { width: 100%; display: block; border-radius: calc(var(--pd-radius) * 0.66); background: #000; margin-bottom: 1rem; }',
		'.desc { color: var(--pd-muted); font-size: 0.92rem; margin-bottom: 1rem; }',
		'.steps-title { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--pd-muted);',
		'  margin-bottom: 0.5rem; }',
		'ol { list-style: none; display: flex; flex-direction: column; gap: 0.5rem; }',
		'.step { border: 1px solid var(--pd-border); border-radius: calc(var(--pd-radius) * 0.66); overflow: hidden; }',
		'.step-row { display: flex; align-items: stretch; }',
		'.chapter { flex: 1; min-width: 0; min-height: 44px; display: flex; align-items: flex-start; gap: 0.75rem;',
		'  padding: 0.7rem 0.9rem; border: 0; background: none; text-align: start; cursor: pointer; }',
		'.chapter:disabled { cursor: default; }',
		'.chapter:not(:disabled):hover { background: color-mix(in srgb, var(--pd-accent) 6%, transparent); }',
		'.chapter[aria-current="step"] { background: color-mix(in srgb, var(--pd-accent) 10%, transparent); }',
		'.step:has(.chapter[aria-current="step"]) { border-color: var(--pd-accent); }',
		'.num { flex-shrink: 0; width: 1.6rem; height: 1.6rem; display: flex; align-items: center;',
		'  justify-content: center; border-radius: 50%; background: var(--pd-accent);',
		'  color: #fff; font-weight: 700; font-size: 0.8rem; }',
		'.copy { flex: 1; min-width: 0; }',
		'.step-title { display: block; font-weight: 600; font-size: 0.95rem; }',
		'.step-text { display: block; color: var(--pd-muted); font-size: 0.88rem; margin-top: 0.15rem; }',
		'.time { flex-shrink: 0; align-self: center; color: var(--pd-accent); font-size: 0.85rem;',
		'  font-variant-numeric: tabular-nums; }',
		'.shot-toggle { flex-shrink: 0; width: 44px; border: 0; border-inline-start: 1px solid var(--pd-border);',
		'  background: none; cursor: pointer; color: var(--pd-muted); }',
		'.shot-toggle[aria-expanded="true"] span { display: inline-block; transform: rotate(180deg); }',
		'.shot { padding: 0 0.9rem 0.9rem; }',
		'.shot[hidden] { display: none; }',
		'.shot img { width: 100%; display: block; border-radius: calc(var(--pd-radius) / 2); border: 1px solid var(--pd-border); }',
		'.context { color: var(--pd-muted); font-style: italic; font-size: 0.88rem;',
		'  border-inline-start: 3px solid var(--pd-accent); padding-inline-start: 0.75rem; }',
		'.foot { padding: 0.5rem 1.25rem; border-top: 1px solid var(--pd-border); text-align: end; }',
		'.foot a { display: inline-flex; align-items: center; min-height: 44px; color: var(--pd-accent);',
		'  font-size: 0.9rem; font-weight: 600; text-decoration: none; border-radius: 4px; }',
		'.foot a:hover { text-decoration: underline; }',
		'.state { padding: 2.5rem 1.5rem; text-align: center; color: var(--pd-muted); font-size: 0.92rem; }'
	].join('\n');

	var host = null;
	var root = null;
	var themeStyle = null;
	var dialog = null;
	var lastFocus = null;
	var seq = 0; // bumped on every open/close so a stale fetch can't fill a dismissed dialog

	function el(tag, className, text) {
		var node = document.createElement(tag);
		if (className) node.className = className;
		if (text) node.textContent = text;
		return node;
	}

	function ensureHost() {
		if (host) return;
		host = el('div', 'playwright-director-widget');
		root = host.attachShadow({ mode: 'open' });
		var style = document.createElement('style');
		style.textContent = CSS;
		root.appendChild(style);
		// Payload accent: a second :host rule, so it beats the default above
		// while page rules on .playwright-director-widget still win.
		themeStyle = document.createElement('style');
		root.appendChild(themeStyle);
		document.body.appendChild(host);
	}

	function close() {
		seq++;
		if (dialog && dialog.open) dialog.close(); // → 'close' event does the cleanup
	}

	function onClosed() {
		var video = dialog && dialog.querySelector('video');
		if (video) video.pause();
		if (dialog) dialog.remove();
		dialog = null;
		document.body.style.overflow = '';
		if (lastFocus && lastFocus.focus) lastFocus.focus();
		lastFocus = null;
	}

	/** Opens (or reuses) the modal dialog and returns its parts, emptied. */
	function renderShell(lang, title) {
		ensureHost();
		if (!dialog) {
			lastFocus = document.activeElement;
			dialog = document.createElement('dialog');
			dialog.setAttribute('aria-labelledby', 'pd-title');
			dialog.addEventListener('close', onClosed);
			// A click on the backdrop lands on the dialog element itself.
			dialog.addEventListener('click', function (e) {
				if (e.target === dialog) close();
			});
			root.appendChild(dialog);
			dialog.showModal();
			document.body.style.overflow = 'hidden';
		}
		dialog.textContent = '';
		dialog.setAttribute('lang', primary(lang));
		dialog.setAttribute('dir', RTL_LANGS.indexOf(primary(lang)) !== -1 ? 'rtl' : 'ltr');

		var head = el('header', 'head');
		var h = el('h2', null, title || tr(lang, 'tutorial'));
		h.id = 'pd-title';
		h.setAttribute('dir', 'auto');
		var closeBtn = el('button', 'close', '×');
		closeBtn.type = 'button';
		closeBtn.setAttribute('aria-label', tr(lang, 'close'));
		closeBtn.addEventListener('click', close);
		head.appendChild(h);
		head.appendChild(closeBtn);
		dialog.appendChild(head);
		closeBtn.focus();
		return { head: head, closeBtn: closeBtn };
	}

	function renderTutorial(data, lang) {
		var shell = renderShell(lang, data.title);
		// The site's primaryColor is the default accent; page rules on the host still win.
		if (data.accent && /^[#a-zA-Z0-9(),.%\s-]+$/.test(data.accent)) {
			themeStyle.textContent = ':host { --pd-accent: var(--playwright-director-accent, ' + data.accent + '); }';
		}

		if (data.duration) {
			var dur = el('span', 'duration', data.duration);
			dur.setAttribute('aria-label', tr(lang, 'duration') + ' ' + data.duration);
			shell.head.insertBefore(dur, shell.closeBtn);
		}

		var body = el('div', 'body');
		var video = document.createElement('video');
		video.controls = true;
		video.preload = 'metadata';
		video.src = data.video;
		video.setAttribute('aria-label', data.title);
		if (data.poster) video.poster = data.poster;
		body.appendChild(video);

		if (data.description) {
			var desc = el('p', 'desc', data.description);
			desc.setAttribute('dir', 'auto');
			desc.setAttribute('lang', data.lang);
			body.appendChild(desc);
		}

		var chapters = [];
		if (data.steps && data.steps.length) {
			var title = el('h3', 'steps-title', tr(lang, 'steps'));
			title.id = 'pd-steps';
			body.appendChild(title);
			var list = el('ol');
			list.setAttribute('aria-labelledby', 'pd-steps');
			list.setAttribute('lang', data.lang);
			data.steps.forEach(function (s) {
				var li = el('li');
				if (s.context) {
					li.className = 'context';
					li.textContent = s.text || '';
					li.setAttribute('dir', 'auto');
					list.appendChild(li);
					return;
				}
				li.className = 'step';
				var row = el('div', 'step-row');
				var chapter = el('button', 'chapter');
				chapter.type = 'button';
				if (s.num !== undefined) {
					var num = el('span', 'num', String(s.num));
					num.setAttribute('aria-hidden', 'true');
					chapter.appendChild(num);
				}
				var copy = el('span', 'copy');
				copy.setAttribute('dir', 'auto');
				if (s.num !== undefined) {
					var label = el('span', null, tr(lang, 'step', { n: s.num }) + (s.title ? ': ' : ''));
					label.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)';
					copy.appendChild(label);
				}
				if (s.title) copy.appendChild(el('span', 'step-title', s.title));
				if (s.text) copy.appendChild(el('span', 'step-text', s.text));
				chapter.appendChild(copy);
				if (s.at !== undefined) {
					var time = el('span', 'time', mmss(s.at));
					time.setAttribute('aria-label', tr(lang, 'playFrom', { time: mmss(s.at) }));
					chapter.appendChild(time);
					chapter.addEventListener('click', function () {
						video.currentTime = s.at;
						video.play().catch(function () {});
					});
					chapters.push({ at: s.at, button: chapter });
				} else {
					chapter.disabled = true;
				}
				row.appendChild(chapter);
				li.appendChild(row);

				if (s.image) {
					var shot = el('div', 'shot');
					shot.hidden = true;
					shot.id = 'pd-shot-' + (s.num || chapters.length);
					var img = document.createElement('img');
					img.loading = 'lazy';
					img.src = s.image;
					img.alt = s.title || tr(lang, 'step', { n: s.num });
					shot.appendChild(img);
					var toggle = el('button', 'shot-toggle');
					toggle.type = 'button';
					toggle.setAttribute('aria-expanded', 'false');
					toggle.setAttribute('aria-controls', shot.id);
					toggle.setAttribute('aria-label', tr(lang, 'screenshot') + (s.num !== undefined ? ' — ' + tr(lang, 'step', { n: s.num }) : ''));
					var chevron = el('span', null, '▾');
					chevron.setAttribute('aria-hidden', 'true');
					toggle.appendChild(chevron);
					toggle.addEventListener('click', function () {
						shot.hidden = !shot.hidden;
						toggle.setAttribute('aria-expanded', String(!shot.hidden));
					});
					row.appendChild(toggle);
					li.appendChild(shot);
				}
				list.appendChild(li);
			});
			body.appendChild(list);

			// Arrow keys move between chapters (Enter/Space seeks); Home/End jump to the ends.
			list.addEventListener('keydown', function (e) {
				var buttons = chapters.map(function (c) { return c.button; });
				var i = buttons.indexOf(root.activeElement);
				if (i === -1) return;
				var next = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: buttons.length - 1 }[e.key];
				if (next === undefined || !buttons[next]) return;
				e.preventDefault();
				buttons[next].focus();
			});

			video.addEventListener('timeupdate', function () {
				var current = null;
				chapters.forEach(function (c) {
					if (c.at <= video.currentTime + 0.25) current = c;
				});
				chapters.forEach(function (c) {
					if (c === current) c.button.setAttribute('aria-current', 'step');
					else c.button.removeAttribute('aria-current');
				});
			});
		}
		dialog.appendChild(body);

		var foot = el('footer', 'foot');
		var link = document.createElement('a');
		link.href = data.page;
		link.target = '_blank';
		link.rel = 'noopener';
		link.textContent = tr(lang, 'openFull') + ' ↗';
		foot.appendChild(link);
		dialog.appendChild(foot);
	}

	function open(slug, options) {
		var lang = (options && options.lang) || document.documentElement.lang || 'en';
		var my = ++seq;
		renderShell(lang, '');
		var loading = el('div', 'state', tr(lang, 'loading'));
		loading.setAttribute('role', 'status');
		dialog.setAttribute('aria-busy', 'true');
		dialog.appendChild(loading);
		load(slug, { lang: primary(lang) }).then(
			function (data) {
				if (my !== seq || !dialog) return;
				dialog.removeAttribute('aria-busy');
				renderTutorial(data, lang);
			},
			function (err) {
				if (my !== seq || !dialog) return;
				if (window.console) console.error(err);
				dialog.removeAttribute('aria-busy');
				renderShell(lang, tr(lang, 'unavailable'));
				var msg = el('div', 'state', (err && err.message) || String(err));
				msg.setAttribute('role', 'alert');
				dialog.appendChild(msg);
			}
		);
	}

	// Event delegation: works for elements added after load, any framework.
	document.addEventListener('click', function (e) {
		if (!e.target || !e.target.closest) return;
		var trigger = e.target.closest('[data-tutorial]');
		if (!trigger) return;
		e.preventDefault();
		open(trigger.getAttribute('data-tutorial'), { lang: trigger.getAttribute('data-tutorial-lang') || undefined });
	});

	window.PlaywrightDirector = { open: open, close: close, load: load, base: BASE, strings: STRINGS };
})();
