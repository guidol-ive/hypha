//
// Buttons without JavaScript (#667): a button that opens a page is a link, a button with a command posts its form.
//
import { login, assert } from './helpers.mjs';

export default async function (t) {
	const { browser, base } = t;
	t.test('without JavaScript the settings open and a form is saved', async () => {
		const withScript = await login(browser, base, 'beheer');
		const state = await withScript.context().storageState();
		await withScript.context().close();
		const context = await browser.newContext({ javaScriptEnabled: false, storageState: state, locale: 'nl-NL' });
		const page = await context.newPage();
		try {
			await page.goto(base + 'settings');
			const link = page.locator('#pageCommands a.button[href="settings/hypha"]');
			assert(await link.count() === 1, 'Projectinstellingen is no link');
			await Promise.all([page.waitForURL(/settings\/hypha$/), link.click()]);
			const field = page.locator('input[name="settingsSystemEmail"]');
			const old = await field.inputValue();
			await field.fill('redactie-zonder-js@eemstad.example');
			const save = page.locator('button[type="submit"][name^="hyphaCommand["]').last();
			assert(await save.count() === 1, 'no submit button for save');
			await Promise.all([page.waitForLoadState('load'), save.click()]);
			await page.goto(base + 'settings/hypha');
			assert(await field.inputValue() === 'redactie-zonder-js@eemstad.example', 'not saved without JavaScript: ' + await field.inputValue());
			await field.fill(old);
			await Promise.all([page.waitForLoadState('load'), save.click()]);
		} finally {
			await context.close();
		}
	});
}
