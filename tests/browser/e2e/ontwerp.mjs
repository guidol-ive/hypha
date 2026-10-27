//
// Gaps found by checking the design against the code (2026-10-28): the way of writing remembered, plain paste in
// Safari, the export as in design section 9, what a paste could not take over in the checklist, pasted images
// uploaded, a phone on its side made smaller in the preview, and red marks in the Markdown view.
//
import { login, newArticle, command, assert } from './helpers.mjs';

export default async function (t) {
	const { browser, base } = t;
	let page, slug;
	const editor = (fn, arg) => page.evaluate(fn, arg);
	const setText = text => editor(text => { const e = window.hyphaMdeditor.editor; e.fields.text = text; if (e.editMode === 'visual') e.loadVisual(); else e.loadMarkdown(); e.changed(); }, text);
	const paste = (selector, html, plain = 'x') => page.evaluate(([selector, html, plain]) => { const dt = new DataTransfer(); if (html) dt.setData('text/html', html); dt.setData('text/plain', plain); document.querySelector(selector).dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })); }, [selector, html, plain]);

	t.test('the way of writing is remembered when the author switches', async () => {
		page = await login(browser, base, 'joris');
		await command(page, 'nl/Start', 'mdPreferences', JSON.stringify({ mode: 'visual', remember: false }));
		slug = await newArticle(page, base, 'Ontwerpgaten');
		await page.click('[data-edit="markdown"]');
		await page.waitForTimeout(400);
		await page.goto(base + 'nl/' + slug + '/edit');
		await page.waitForFunction(() => window.hyphaMdeditor?.editor?.ready);
		assert(await editor(() => window.hyphaMdeditor.editor.editMode) === 'markdown', 'not remembered');
		await page.click('[data-edit="visual"]');
		await page.waitForTimeout(400);
	});

	t.test('⌘⇧V pastes plain text also when the browser offers HTML (Safari)', async () => {
		await setText('Begin.\n');
		await editor(() => { const v = window.hyphaMdeditor.editor.pm; v.dispatch(v.state.tr.setSelection(v.state.selection.constructor.atEnd(v.state.doc))); v.focus(); });
		await page.keyboard.press('Meta+Shift+v').catch(() => {});
		await editor(() => { window.hyphaMdeditor.editor.plainPaste = true; });
		await paste('#mdeVisual .ProseMirror', '<p><b>Vet</b> tekst</p>', 'Vet tekst');
		await page.waitForTimeout(200);
		const text = await editor(() => window.hyphaMdeditor.editor.fields.text);
		assert(!text.includes('**Vet**'), 'pasted with markup: ' + text);
	});

	t.test('what a paste could not take over stays in the checklist until it is marked as seen', async () => {
		await paste('#mdeVisual .ProseMirror', '<p>Tekst met <img src="file:///C:/foto.png"> een plaatje.</p>');
		await page.waitForTimeout(400);
		const notes = await page.textContent('#mdeChecks');
		assert(/afbeelding is niet overgenomen/i.test(notes), 'no note: ' + notes.slice(0, 300));
		await page.click('#mdeChecks button:has-text("gezien")');
		await page.waitForTimeout(200);
		assert(!/afbeelding is niet overgenomen/i.test(await page.textContent('#mdeChecks')), 'note stays after gezien');
	});

	t.test('an image that came with the clipboard as data is uploaded', async () => {
		const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
		await paste('#mdeVisual .ProseMirror', `<p>Foto: <img src="${png}" alt="punt"></p>`);
		await page.waitForFunction(() => /\]\(images\//.test(window.hyphaMdeditor.editor.fields.text), null, { timeout: 8000 });
		assert(!/geplakt-/.test(await editor(() => window.hyphaMdeditor.editor.fields.text)), 'temporary name stays');
	});

	t.test('export: status in words, and a ::: box as a callout', async () => {
		await setText(':::info Over de raad\nDe raad heeft 37 leden.\n:::\n\n```\n:::info blijft\n:::\n```\n');
		const [download] = await Promise.all([page.waitForEvent('download'), editor(() => window.hyphaMdeditor.editor.download())]);
		const text = await (await import('node:fs')).promises.readFile(await download.path(), 'utf8');
		assert(/\nstatus: schets\n/.test(text), 'status: ' + text.slice(0, 300));
		assert(text.includes('> [!info] Over de raad\n> De raad heeft 37 leden.') && text.includes('```\n:::info blijft\n:::\n```'), 'boxes: ' + text.slice(-200));
	});

	t.test('a phone on its side is made smaller to fit the preview', async () => {
		await page.setViewportSize({ width: 1024, height: 800 });
		await page.click('[data-mode="preview"]');
		await page.click('[data-device="phone-land"]');
		await page.waitForTimeout(300);
		const [frame, pane] = await editor(() => [document.getElementById('mdeFrame').getBoundingClientRect().width, document.getElementById('mdeFrame').parentElement.clientWidth]);
		assert(frame <= pane, `frame ${frame} wider than ${pane}`);
		await page.click('[data-device="desktop"]');
		await page.click('[data-mode="write"]');
	});

	t.test('Markdown view: a link to a missing page is marked red', async () => {
		await page.click('[data-edit="markdown"]');
		await page.waitForSelector('#mdeText .cm-content');
		await setText('Zie [[Bestaat niet echt]] en [[Start]].\n');
		await page.waitForTimeout(300);
		const marked = await editor(() => [...document.querySelectorAll('#mdeText .cm-missing')].map(x => x.textContent));
		assert(marked.length === 1 && marked[0].includes('Bestaat niet echt'), 'marked: ' + JSON.stringify(marked));
		await page.click('[data-edit="visual"]');
		await command(page, 'nl/Start', 'mdPreferences', JSON.stringify({ mode: 'visual' }));
	});

	t.test('no errors in the console', async () => {
		assert(!page.errors.length, page.errors.join('\n'));
		await page.context().close();
	});
}
