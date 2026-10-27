//
// Accessibility (design section 12.9, task T13): axe-core with the rules of WCAG 2.0 and 2.1, level A and AA, in every
// state of the editor; and the hit areas of 44 x 44 pt on a touch screen (Apple HIG, design section 12.12).
//
import fs from 'node:fs';
import { login, newArticle, assert } from './helpers.mjs';

export default async function (t) {
	const { browser, base, root } = t;
	const axe = fs.readFileSync(root + '/tests/browser/node_modules/axe-core/axe.min.js', 'utf8');
	const start = fs.readFileSync(root + '/tests/markdown/data/start.md', 'utf8');
	let page;
	const results = {};
	const check = async (state, include = '#mdeditor') => {
		await page.addScriptTag({ content: axe }).catch(() => {});
		const r = await page.evaluate(async include => {
			const res = await axe.run({ include: [include] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } });
			return { violations: res.violations.map(v => `${v.id} (${v.nodes.length}): ${v.nodes[0].target.join(' ')} – ${v.help}`), passes: res.passes.length };
		}, include);
		results[state] = r;
		assert(!r.violations.length, state + ': ' + r.violations.join('\n'));
	};
	t.test('open the editor with the sample article', async () => {
		page = await login(browser, base, 'sanne');
		await newArticle(page, base, 'Toegankelijkheid van de editor');
		await page.evaluate(src => { const e = window.hyphaMdeditor.editor; e.fields.text = src; e.fields.excerpt = 'Intro.'; e.loadVisual(); e.refresh(); }, start);
		await page.waitForTimeout(500);
	});
	t.test('axe: visual view', () => check('opmaak'));
	t.test('axe: checklist with show all', async () => { await page.click('#mdeShowAll', { force: true }); await page.waitForTimeout(100); await check('checklist'); });
	t.test('axe: Markdown view', async () => { await page.click('[data-edit="markdown"]'); await page.waitForTimeout(200); await check('markdown'); });
	t.test('axe: [[ suggestions open', async () => {
		await page.evaluate(() => { const e = window.hyphaMdeditor.editor; const end = e.cm.state.doc.length; e.cm.dispatch({ changes: { from: end, insert: '\n\n[[Ra' }, selection: { anchor: end + 6 } }); e.cm.focus(); });
		await page.waitForSelector('#mdePopup:not([hidden])');
		await check('suggesties');
		await page.keyboard.press('Escape');
	});
	t.test('axe: side by side with preview', async () => { await page.click('[data-mode="side"]'); await page.waitForTimeout(800); await check('naast-elkaar'); await page.click('[data-mode="write"]'); });
	for (const [name, open] of [['beeld', () => window.hyphaMdeditor.editor.dialogs.openImage({})], ['diagram', () => window.hyphaMdeditor.editor.dialogs.openDiagram({})], ['spiekbriefje', () => window.hyphaMdeditor.editor.dialogs.open('mdeHelpDlg')], ['interactief blok', () => window.hyphaMdeditor.editor.dialogs.openInteractive({})], ['link', () => window.hyphaMdeditor.editor.dialogs.openLink()]]) {
		t.test(`axe: dialog ${name}`, async () => {
			await page.evaluate(open);
			await page.waitForTimeout(600);
			await check(name, 'dialog[open]');
			await page.keyboard.press('Escape');
		});
	}
	t.test('axe: table menu', async () => {
		await page.evaluate(() => window.hyphaMdeditor.editor.dialogs.toggleTableMenu(document.querySelector('[data-act="table"]')));
		await check('tabelmenu', '#mdeTableMenu');
		await page.keyboard.press('Escape');
		fs.writeFileSync('/tmp/hypha-md-axe.json', JSON.stringify(results, null, 1));
		await page.context().close();
	});
	t.test('touch (iPhone 15, 393 x 852 pt): every control of the toolbar and the switches is at least 44 x 44', async () => {
		const tp = await login(browser, base, 'sanne', { width: 393, height: 852 }, { isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
		await newArticle(tp, base, 'Telefoon');
		const small = await tp.evaluate(() => [...document.querySelectorAll('#mdeditor .toolbar button:not(.moved):not([hidden]), #mdeditor .editmode button, #mdeditor .modes button, #mdeditor .gobtn, .figdel, .figedit')]
			.filter(b => b.offsetParent).map(b => { const r = b.getBoundingClientRect(); return [b.title || b.textContent.trim(), Math.round(r.width), Math.round(r.height)]; }).filter(([, w, h]) => w < 44 || h < 44));
		assert(!small.length, JSON.stringify(small));
		const overflow = await tp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
		assert(overflow <= 0, 'horizontal scroll of ' + overflow + ' px at 393 pt');
		await tp.context().close();
	});
	t.test('iPhone: every action can be reached through Meer, and the preview shows the way back to writing', async () => {
		const tp = await login(browser, base, 'sanne', { width: 393, height: 852 }, { isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
		await newArticle(tp, base, 'Telefoon meer');
		assert(await tp.isVisible('#mdeMore'), 'no Meer on a phone');
		await tp.click('#mdeMore');
		const items = await tp.evaluate(() => [...document.querySelectorAll('#mdeMoreMenu [data-proxy]')].map(b => b.dataset.proxy));
		for (const act of ['link', 'image', 'diagram', 'math', 'table']) assert(items.includes(act), `${act} not in Meer: ${items}`);
		const menu = await tp.locator('#mdeMoreMenu').boundingBox();
		assert(menu.y + menu.height <= 852, 'menu below the screen');
		await tp.keyboard.press('Escape');
		await tp.click('[data-mode="preview"]');
		assert(await tp.isVisible('[data-mode="write"] span') && (await tp.textContent('[data-mode="write"] span')).trim().length > 0, 'no word on the way back');
		assert(!(await tp.isVisible('.toolbar [data-act="bold"]')), 'formatting buttons in the preview');
		await tp.context().close();
	});
	t.test('iPhone: the toolbar moves along with the on-screen keyboard and back (design section 12.12)', async () => {
		//
		// A browser without a real keyboard: a visual viewport of 852 pt that becomes 516 pt, as with the keyboard of iOS.
		//
		const extra = { isMobile: true, hasTouch: true, deviceScaleFactor: 3 };
		const tp = await login(browser, base, 'sanne', { width: 393, height: 852 }, extra);
		await tp.addInitScript(() => {
			const vv = new EventTarget();
			Object.assign(vv, { height: window.innerHeight, width: window.innerWidth, offsetTop: 0, offsetLeft: 0, scale: 1, pageTop: 0, pageLeft: 0 });
			Object.defineProperty(window, 'visualViewport', { get: () => vv });
			window.mdeKeyboard = h => { vv.height = window.innerHeight - h; vv.dispatchEvent(new Event('resize')); };
		});
		await newArticle(tp, base, 'Toetsenbord');
		const bottom = () => tp.evaluate(() => Math.round(document.querySelector('#mdeditor .toolbar').getBoundingClientRect().bottom));
		const before = await bottom();
		await tp.evaluate(() => window.mdeKeyboard(336));
		const above = await bottom();
		assert(before === 852 && above === 852 - 336, `toolbar bottom ${before} -> ${above}`);
		await tp.evaluate(() => window.mdeKeyboard(0));
		assert(await bottom() === 852, 'toolbar back at the bottom');
		await tp.context().close();
	});
}
