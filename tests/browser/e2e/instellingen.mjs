//
// The text areas of the settings fit the column of the theme, also in a narrow window (#660).
//
import { login, assert } from './helpers.mjs';

export default async function (t) {
	const { browser, base } = t;
	t.test('the text areas of markup, styles and the editor settings fit the column', async () => {
		const page = await login(browser, base, 'beheer', { width: 480, height: 900 });
		for (const path of ['settings/markup', 'settings/styles', 'settings/editor']) {
			await page.goto(base + path);
			// settings/editor only exists with the editor of #520.
			if (path === 'settings/editor' && !(await page.$('#mdSections'))) continue;
			const wide = await page.evaluate(() => {
				const page = document.documentElement;
				return page.scrollWidth > page.clientWidth + 1 ? [`the page is ${page.scrollWidth} px wide in a window of ${page.clientWidth} px`] : [];
			});
			assert(!wide.length, `${path}: ${wide.join(', ')}`);
		}
		await page.context().close();
	});
}
