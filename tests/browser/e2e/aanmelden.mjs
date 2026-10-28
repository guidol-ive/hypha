//
// The login popup of a visitor: 'heraanmelden' (recover account) sends its form, with the CSRF token of the page
// (#643).
//
import { assert } from './helpers.mjs';

export default async function (t) {
	const { browser, base } = t;
	t.test('recover account sends the name and answers on the page', async () => {
		const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'nl-NL' });
		const page = await context.newPage();
		const errors = [];
		page.on('pageerror', e => errors.push(String(e)));
		try {
			await page.goto(base + 'nl/Start');
			await page.evaluate(() => login());
			await page.click('#popup .forgot-password a');
			await page.fill('#searchLogin', 'onbekende-proefnaam');
			await Promise.all([page.waitForNavigation(), page.click('#popup input[type=submit]')]);
			assert(errors.length === 0, errors.join('; '));
			// With the limits of #493 the answer is the same for a known and an unknown name.
			const body = await page.textContent('body');
			assert(body.includes('geen gebruiker of e-mailadres gevonden') || body.includes('herstelemail is verstuurd'), 'no answer on the page');
		} finally {
			await context.close();
		}
	});
}
