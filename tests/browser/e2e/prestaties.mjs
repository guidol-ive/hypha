//
// Performance (design section 12.16, task T12) on the development machine: typing in both views of a long article
// (about 18,000 words), 500 key strokes each, from the key to the next frame (requirement 1: within 100 ms), also with
// 'Naast elkaar'; saving the long article (requirement 2: within 1 s); opening the editor the second time
// (requirement 4: within 3 s). Real keys through the browser, measured in the page with requestAnimationFrame.
//
import fs from 'node:fs';
import { login, newArticle, assert } from './helpers.mjs';

export default async function (t) {
	const { browser, base, root } = t;
	//
	// Without the sample photo: it does not exist on the test site, and 35 requests for it would keep the two Apache
	// workers of the container busy with 404 pages.
	//
	const sample = fs.readFileSync(root + '/tests/markdown/data/start.md', 'utf8').replace(/^!\[.*\n\*.*\*\n/m, '');
	const long = Array(35).fill(sample + '\n\n' + fs.readFileSync(root + '/tests/markdown/data/plaktest.md', 'utf8')).join('\n\n');
	let page;
	const out = {};
	const typing = async (label, selector) => {
		await page.evaluate(() => {
			window.mdeKeys = [];
			document.addEventListener('keydown', () => { const t0 = performance.now(); requestAnimationFrame(() => requestAnimationFrame(() => window.mdeKeys.push(performance.now() - t0))); }, { capture: true });
		});
		await page.click(selector);
		await page.keyboard.type('Een zin om de snelheid te meten bij typen. '.repeat(12).slice(0, 500), { delay: 15 });
		await page.waitForTimeout(400);
		const keys = await page.evaluate(() => window.mdeKeys.slice().sort((a, b) => a - b));
		out[label] = { n: keys.length, median: +keys[Math.floor(keys.length / 2)].toFixed(1), p95: +keys[Math.floor(keys.length * 0.95)].toFixed(1), max: +keys[keys.length - 1].toFixed(1) };
		assert(keys.length >= 500 && keys[keys.length - 1] < 100, label + ': ' + JSON.stringify(out[label]));
	};
	t.test('open a long article (about 18,000 words)', async () => {
		page = await login(browser, base, 'sanne');
		await newArticle(page, base, 'Lang artikel voor de snelheid');
		await page.evaluate(src => { const e = window.hyphaMdeditor.editor; e.fields.text = src; e.loadVisual(); e.refresh(); }, long);
		out.words = await page.evaluate(() => window.hyphaMdeditor.editor.fields.text.split(/\s+/).length);
	});
	t.test('typing in Opmaak: every key within 100 ms', () => typing('opmaak', '#mdeVisual .ProseMirror p'));
	t.test('typing in Markdown: every key within 100 ms', async () => { await page.click('[data-edit="markdown"]'); await page.waitForTimeout(500); await typing('markdown', '#mdeText .cm-content'); });
	t.test('typing in Markdown with Naast elkaar: every key within 100 ms', async () => { await page.setViewportSize({ width: 1440, height: 900 }); await page.click('[data-mode="side"]'); await page.waitForTimeout(1500); await typing('naast-elkaar', '#mdeText .cm-content'); });
	t.test('saving the long article within 1 second', async () => {
		await page.evaluate(() => { window.mdeLastSave = null; return window.hyphaMdeditor.save(); });
		await page.waitForFunction(() => window.mdeLastSave, null, { timeout: 15000 });
		out.save = await page.evaluate(() => window.mdeLastSave);
		assert(out.save.ms < 1000, JSON.stringify(out.save));
	});
	t.test('opening the second time within 3 seconds', async () => {
		const times = [];
		//
		// As after a click on 'bewerken' in the reading view: a new page in the same browser, with the files in its cache.
		//
		const url = page.url();
		await page.goto(url.replace(/\/edit.*$/, ''));
		for (let i = 0; i < 10; i++) {
			const t0 = Date.now();
			//
			// Until the editor is ready to type in (requirement 4), not until every image of the article has loaded.
			//
			await page.goto(url, { waitUntil: 'commit' });
			await page.waitForFunction(() => window.hyphaMdeditor?.editor?.ready, null, { timeout: 10000 });
			times.push(Date.now() - t0);
			await page.goto(url.replace(/\/edit.*$/, ''));
		}
		out.open = times;
		fs.writeFileSync('/tmp/hypha-md-prestaties.json', JSON.stringify(out, null, 1));
		assert(Math.max(...times) < 3000, times.join(', '));
		await page.context().close();
	});
}
