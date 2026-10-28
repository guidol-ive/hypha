//
// hypha-core.css is read by the browser as a whole: a merge that lost a brace or the start of a comment made the
// browser skip the rules after it, without any test failing.
//
import { assert } from './helpers.mjs';

export default async function (t) {
	const { browser, base } = t;
	t.test('the browser reads every rule of hypha-core.css', async () => {
		const page = await browser.newPage();
		try {
			await page.goto(base + 'nl/Start');
			const selectors = await page.evaluate(() => {
				const sheet = [...document.styleSheets].find(s => (s.href || '').includes('hypha-core.css'));
				return sheet ? [...sheet.cssRules].map(r => r.selectorText || '') : null;
			});
			assert(selectors, 'hypha-core.css is not loaded');
			for (const wanted of ['.hypha-icon', '.hypha-icon-remove', 'textarea', 'textarea.hypha-code', 'table.hypha-fit label', 'img.featured_image', 'a:has(> .hypha-icon)', '.login-wrapper label[for="searchLogin"]'])
				assert(selectors.includes(wanted), `the browser does not know the rule ${wanted}: ${selectors.join(' | ')}`);
		} finally {
			await page.close();
		}
	});
}
