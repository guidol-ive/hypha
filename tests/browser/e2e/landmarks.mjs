//
// The link to skip to the content (#682): the first Tab shows it, Enter moves to the content of the same page.
//
import { assert } from './helpers.mjs';

export default async function (t) {
	const { browser, base } = t;
	t.test('the first Tab shows the skip link and Enter stays on the page', async () => {
		const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'nl-NL' });
		const page = await context.newPage();
		try {
			await page.goto(base + 'nl/Start');
			const hidden = await page.$eval('.skip-link', a => a.getBoundingClientRect().right);
			assert(hidden < 0, `the skip link is visible before it has the focus (right ${hidden})`);
			await page.keyboard.press('Tab');
			const focused = await page.evaluate(() => ({ cls: document.activeElement.className, left: document.activeElement.getBoundingClientRect().left }));
			assert(focused.cls === 'skip-link' && focused.left >= 0, `the first Tab does not show the skip link: ${JSON.stringify(focused)}`);
			await page.keyboard.press('Enter');
			await page.waitForFunction(() => location.hash === '#page');
			assert(page.url() === base + 'nl/Start#page', `Enter left the page: ${page.url()}`);
		} finally {
			await context.close();
		}
	});
}
