function absoluteBase(baseUrl) {
    const withSlash = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    const here = typeof location !== 'undefined' ? location.href : undefined;
    return new URL(withSlash, here).href;
}
async function getJson(url, what, base, fetchFn) {
    let res;
    try {
        res = await fetchFn(url);
    }
    catch (error) {
        throw new Error(`[playwright-director] Could not fetch ${url}: network error, or the tutorials host sends no ` +
            `Access-Control-Allow-Origin header for this origin (${error instanceof Error ? error.message : error}).`);
    }
    if (res.status === 404)
        return null;
    if (!res.ok)
        throw new Error(`[playwright-director] ${what}: ${url} answered HTTP ${res.status}.`);
    try {
        return (await res.json());
    }
    catch {
        throw new Error(`[playwright-director] ${what}: ${url} is not JSON — is ${base} the gallery base URL?`);
    }
}
/** All tutorials of the gallery (embed/index.json). */
export async function loadIndex(options) {
    const base = absoluteBase(options.baseUrl);
    const url = `${base}embed/index.json`;
    const index = await getJson(url, 'Index', base, options.fetch ?? fetch);
    if (!index)
        throw new Error(`[playwright-director] No index at ${url} (HTTP 404) — is ${base} the gallery base URL?`);
    return index;
}
/** One tutorial, URLs resolved. Rejects with a message naming the URL and the reason. */
export async function load(slug, options) {
    const base = absoluteBase(options.baseUrl);
    const fetchFn = options.fetch ?? fetch;
    const what = `Tutorial "${slug}"`;
    const candidates = [
        ...(options.lang ? [`${base}embed/${encodeURIComponent(slug)}.${encodeURIComponent(options.lang)}.json`] : []),
        `${base}embed/${encodeURIComponent(slug)}.json`
    ];
    let data = null;
    for (const url of candidates) {
        data = await getJson(url, what, base, fetchFn);
        if (data)
            break;
    }
    if (!data) {
        throw new Error(`[playwright-director] ${what} not found: ${candidates.join(' and ')} answered HTTP 404. ` +
            `Known slugs: ${base}embed/index.json`);
    }
    const abs = (path) => new URL(path, base).href;
    return {
        ...data,
        baseUrl: base,
        video: abs(data.video),
        ...(data.poster ? { poster: abs(data.poster) } : {}),
        page: abs(data.page),
        steps: data.steps.map((s) => (s.image ? { ...s, image: abs(s.image) } : s))
    };
}
/** The chapter playing at `time` seconds — the last step whose `at` is reached. */
export function currentStep(steps, time) {
    let found;
    for (const s of steps)
        if (s.at !== undefined && s.at <= time + 0.25)
            found = s;
    return found;
}
//# sourceMappingURL=client.js.map