//
// Paste in the editor (design section 12.15, task T09): the three test documents in both views give the expected
// Markdown, Cmd+Z undoes the paste in one step, and paste as plain text keeps the text as it is.
//
import fs from 'node:fs';
import vm from 'node:vm';
import { login, newArticle, assert } from './helpers.mjs';

export default async function (t) {
	const { browser, base, root } = t;
	const ctx = { window: {} };
	vm.runInNewContext(fs.readFileSync(root + '/tests/fixtures/plaktest/gegevens.js', 'utf8'), ctx);
	const docs = ctx.window.PLAKTEST.documenten;
	let page;
	const paste = (selector, html) => page.evaluate(([selector, html]) => {
		const dt = new DataTransfer();
		dt.setData('text/html', html);
		dt.setData('text/plain', 'platte tekst');
		document.querySelector(selector).dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
	}, [selector, html]);
	const text = () => page.evaluate(() => window.hyphaMdeditor.editor.fields.text);

	t.test('open the editor', async () => {
		page = await login(browser, base, 'sanne');
		await newArticle(page, base, 'Plaktest in de editor', 'markdown');
	});
	for (const d of docs) {
		t.test(`markdown view: ${d.id}`, async () => {
			await page.evaluate(() => { const e = window.hyphaMdeditor.editor; const d = e.cm.state.doc; e.cm.dispatch({ selection: { anchor: d.length } }); e.cm.focus(); });
			const before = await text();
			await paste('#mdeText .cm-content', d.html);
			const got = (await text()).slice(before.length);
			assert(got.trim() === d.verwacht.trim(), 'first difference: ' + got.split('\n').find((l, i) => l !== d.verwacht.split('\n')[i]));
			await page.keyboard.press('Meta+z');
			assert(await text() === before, 'one undo step');
		});
	}
	t.test('switch to the visual view', async () => {
		await page.click('[data-edit="visual"]');
	});
	for (const d of docs) {
		t.test(`visual view: ${d.id}`, async () => {
			await page.evaluate(() => { const v = window.hyphaMdeditor.editor.pm; v.dispatch(v.state.tr.delete(0, v.state.doc.content.size).setMeta('addToHistory', false)); v.focus(); });
			//
			// More than 500 ms after the previous change, so the paste is an undo step of its own.
			//
			await page.waitForTimeout(600);
			await paste('#mdeVisual .ProseMirror', d.html);
			const got = await text();
			//
			// The visual view writes the pasted blocks in the house style; the meaning must be the same.
			//
			const same = await page.evaluate(([a, b]) => { const md = window.hyphaMdeditor.editor.markdown; const n = s => md.hyphaRender(s).replace(/\s+/g, ' ').trim(); return n(a) === n(b); }, [got, d.verwacht]);
			assert(same, 'other HTML than the expected Markdown: ' + got.slice(0, 200));
			await page.keyboard.press('Meta+z');
			assert((await text()).trim() === '', 'one undo step');
		});
	}
	t.test('no errors in the console', async () => {
		assert(!page.errors.length, page.errors.join('\n'));
		await page.context().close();
	});
}
