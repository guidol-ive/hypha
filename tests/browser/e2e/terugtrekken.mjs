//
// Buttons with a confirmation: "trek terug" of an article in review works, without a JavaScript error. The text of the
// confirmation was escaped twice, so the browser read confirm(&quot;…&quot;) (#520).
//
import { login, newArticle, command, assert } from './helpers.mjs';

export default async function (t) {
	const { browser, base } = t;
	t.test('the author retracts an article in review with trek terug', async () => {
		const page = await login(browser, base, 'sanne');
		const slug = await newArticle(page, base, 'Terugtrekken proef');
		await page.evaluate(() => { const e = window.hyphaMdeditor.editor; Object.assign(e.fields, { excerpt: 'Een verzonnen uittreksel.', section: 'Politiek en bestuur', tags: ['Raadsnieuws'], method: 'Verzonnen werkwijze.', sources: '- Verzonnen bron' }); e.fields.text = 'Tekst van het artikel.\n'; e.loadVisual(); e.renderHead(); e.changed(); });
		assert(await page.evaluate(() => window.hyphaMdeditor.editor.save()), 'save');
		await command(page, 'nl/' + slug, 'status_change_review');
		await page.goto(base + 'nl/' + slug);
		const button = page.locator('#pageCommands input[value="Trek terug"]');
		assert(await button.count() === 1, 'no button trek terug');
		page.on('dialog', d => d.accept());
		await Promise.all([page.waitForNavigation(), button.click()]);
		assert(!page.errors.length, page.errors.join('\n'));
		assert(await page.locator('#pageCommands input[value="Trek terug"]').count() === 0, 'the article is still in review');
		await page.context().close();
	});
}
