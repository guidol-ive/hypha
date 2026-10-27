//
// Helpers of the end-to-end tests: log in as a fictional test user and post a Hypha command from the page itself
// (with the CSRF token of the page), as the buttons of Hypha do.
//
export const PASSWORD = 'proef-wachtwoord-520';

export async function login(browser, base, username, viewport = { width: 1280, height: 900 }) {
	const context = await browser.newContext({ viewport, locale: 'nl-NL' });
	const page = await context.newPage();
	page.errors = [];
	page.on('pageerror', e => page.errors.push(String(e)));
	page.on('console', m => { if (m.type() === 'error' && !m.text().startsWith('Failed to load resource')) page.errors.push(m.text()); });
	await page.goto(base + 'nl/Start');
	await command(page, 'nl/Start', 'login', '', { loginUsername: username, loginPassword: PASSWORD });
	await page.goto(base + 'nl/Start');
	return page;
}

export async function command(page, path, cmd, argument = '', fields = {}) {
	return page.evaluate(async ([path, cmd, argument, fields]) => {
		const body = new URLSearchParams(Object.assign({ command: cmd, argument, csrfToken: document.querySelector('input[name=csrfToken]').value }, fields));
		const r = await fetch(path, { method: 'POST', body, redirect: 'manual' });
		return r.status;
	}, [path, cmd, argument, fields]);
}

export async function newArticle(page, base, title, mode = 'visual') {
	title = title + ' ' + Date.now().toString(36);
	await command(page, 'nl/Start', 'mdNewArticle', title, { newPageLanguage: 'nl', mdMode: mode });
	const slug = title.toLowerCase().normalize('NFD').replace(/\p{Mn}/gu, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
	await page.goto(base + 'nl/' + slug + '/edit?mode=' + mode);
	await page.waitForFunction(() => window.hyphaMdeditor?.editor?.ready, null, { timeout: 15000 });
	return slug;
}

export function assert(condition, message) { if (!condition) throw new Error(message); }
