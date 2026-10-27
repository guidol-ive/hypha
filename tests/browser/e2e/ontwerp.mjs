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

	t.test('Opmaak: ⌘K links selected text to a page of the site, chosen from the list', async () => {
		await setText('Lees het verslag.\n');
		await editor(() => { const v = window.hyphaMdeditor.editor.pm; const sel = v.state.selection.constructor; v.dispatch(v.state.tr.setSelection(sel.create(v.state.doc, 10, 17))); v.focus(); });
		await page.keyboard.press('Meta+k');
		await page.waitForSelector('#mdeLinkDlg[open]');
		assert(await page.inputValue('#mdeLinkText') === 'verslag', 'text not prefilled');
		await page.fill('#mdeLinkTarget', 'Sta');
		await page.waitForSelector('#mdeLinkList li');
		await page.keyboard.press('ArrowDown');
		await page.keyboard.press('Enter');
		assert(await page.inputValue('#mdeLinkTarget') === 'Start', 'page not chosen');
		await page.click('#mdeLinkOk');
		await page.waitForTimeout(150);
		const text = await editor(() => window.hyphaMdeditor.editor.fields.text);
		assert(text.startsWith('Lees het [[Start|verslag]].'), 'text: ' + text);
	});

	t.test('Opmaak: a web address becomes a link, and the link can be removed', async () => {
		await setText('Lees het verslag.\n');
		await editor(() => { const v = window.hyphaMdeditor.editor.pm; const sel = v.state.selection.constructor; v.dispatch(v.state.tr.setSelection(sel.create(v.state.doc, 10, 17))); v.focus(); });
		await page.keyboard.press('Meta+k');
		await page.fill('#mdeLinkTarget', 'example.org/verslag');
		await page.click('#mdeLinkOk');
		await page.waitForTimeout(150);
		assert((await editor(() => window.hyphaMdeditor.editor.fields.text)).startsWith('Lees het [verslag](https://example.org/verslag).'), 'address');
		await editor(() => { const v = window.hyphaMdeditor.editor.pm; v.dispatch(v.state.tr.setSelection(v.state.selection.constructor.near(v.state.doc.resolve(12)))); v.focus(); });
		await page.keyboard.press('Meta+k');
		await page.waitForSelector('#mdeLinkDel:not([hidden])');
		await page.click('#mdeLinkDel');
		await page.waitForTimeout(150);
		assert((await editor(() => window.hyphaMdeditor.editor.fields.text)).startsWith('Lees het verslag.'), 'not removed: ' + await editor(() => window.hyphaMdeditor.editor.fields.text));
	});

	t.test('Opmaak: typing [[ opens the list of pages', async () => {
		await setText('Zie ook \n');
		await editor(() => { const v = window.hyphaMdeditor.editor.pm; v.dispatch(v.state.tr.setSelection(v.state.selection.constructor.near(v.state.doc.resolve(9)))); v.focus(); });
		await page.keyboard.type('[[');
		await page.waitForSelector('#mdeLinkDlg[open]');
		await page.fill('#mdeLinkTarget', 'Nieuwe proefpagina');
		await page.click('#mdeLinkOk');
		await page.waitForTimeout(150);
		const text = await editor(() => window.hyphaMdeditor.editor.fields.text);
		assert(text.includes('[[Nieuwe proefpagina]]') && !text.includes('\\['), 'text: ' + text);
	});

	t.test('Opmaak: Alle blokken inserts a numbered list, a subheading, a footnote, code and a dividing line', async () => {
		await page.setViewportSize({ width: 1440, height: 900 });
		await page.waitForTimeout(200);
		await setText('Eerste alinea.\n');
		const block = async key => {
			await editor(() => { const v = window.hyphaMdeditor.editor.pm; v.dispatch(v.state.tr.setSelection(v.state.selection.constructor.atEnd(v.state.doc))); v.focus(); });
			await page.click('.toolbar [data-act="slash"]');
			await page.waitForSelector('#mdeMoreMenu:not([hidden])');
			await page.click(`#mdeMoreMenu [data-block="${key}"]`);
			await page.waitForTimeout(150);
		};
		await block('olist');
		await block('olist');
		await block('subheading');
		await block('footnote');
		await block('code');
		await block('rule');
		const text = await editor(() => window.hyphaMdeditor.editor.fields.text);
		assert(/^#### Eerste alinea\.\[\^1\]/m.test(text), 'subheading and footnote: ' + text);
		assert(/^\[\^1\]: /m.test(text) && /```php/.test(text) && /^---$/m.test(text), 'footnote, code, rule: ' + text);
	});

	t.test('a large photo is made smaller before the upload', async () => {
		const big = await page.evaluate(async () => {
			const c = document.createElement('canvas');
			c.width = 4000; c.height = 3000;
			const g = c.getContext('2d'), img = g.createImageData(4000, 3000);
			for (let i = 0; i < img.data.length; i++) img.data[i] = (i * 7919) % 251;
			g.putImageData(img, 0, 0);
			const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.98));
			return [...new Uint8Array(await blob.arrayBuffer())];
		});
		assert(big.length > 1500000, 'test photo too small: ' + big.length);
		await editor(() => {
			window.mdeSent = 0;
			const fetch0 = window.fetch;
			window.fetch = (url, init) => { if (String(url).endsWith('upload/image')) window.mdeSent = init.body.get('uploadedfile').size; return fetch0(url, init); };
			window.hyphaMdeditor.editor.dialogs.openImage({});
		});
		await page.setInputFiles('#mdeImageFile', { name: 'telefoon.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(big) });
		await page.waitForFunction(() => window.hyphaMdeditor.editor.dialogs.image.src, null, { timeout: 20000 });
		const sent = await editor(() => window.mdeSent);
		assert(sent > 0 && sent < big.length / 2, `sent ${sent} of ${big.length} bytes`);
		await page.keyboard.press('Escape');
	});

	t.test('what the server does not show is in the checklist after saving, and the freedom level is shown', async () => {
		await setText('Tekst met <span onclick="alert(1)">een knop</span>.\n\n<macro name="pagelist"></macro>\n');
		assert(await editor(() => window.hyphaMdeditor.editor.save()), 'save');
		await page.waitForTimeout(200);
		const checks = await page.textContent('#mdeChecks');
		assert(/Niet getoond op de site: .*onclick=/.test(checks) && checks.includes('<macro>'), 'checklist: ' + checks.slice(0, 300));
		assert(/vrijheidsniveau 2/.test(await page.textContent('#mdeFacts')), 'no level');
		await setText('Gewone tekst.\n');
		assert(await editor(() => window.hyphaMdeditor.editor.save()), 'save 2');
		await page.waitForTimeout(200);
		assert(!/Niet getoond op de site/.test(await page.textContent('#mdeChecks')), 'message stays after a clean save');
	});

	t.test('in review the checklist shows the editorial statute with how many confirmed it', async () => {
		await editor(() => { const e = window.hyphaMdeditor.editor; Object.assign(e.fields, { excerpt: 'Een verzonnen uittreksel.', section: 'Politiek en bestuur', tags: ['Raadsnieuws'], method: 'Verzonnen werkwijze.', sources: '- Verzonnen bron' }); e.fields.text = 'Tekst van het artikel.\n'; e.loadVisual(); e.renderHead(); e.changed(); });
		assert(await editor(() => window.hyphaMdeditor.editor.save()), 'save');
		assert(await page.isHidden('#mdeStatuteBox'), 'statute shown in a draft');
		await command(page, 'nl/' + slug, 'status_change_review');
		await page.goto(base + 'nl/' + slug + '/edit');
		await page.waitForFunction(() => window.hyphaMdeditor?.editor?.ready);
		await page.waitForTimeout(300);
		assert(await page.isVisible('#mdeStatuteBox'), 'no statute in review');
		assert(/bevestigd door 0 van 3/.test(await page.textContent('#mdeStatute')), await page.textContent('#mdeStatute'));
	});

	t.test('no errors in the console', async () => {
		assert(!page.errors.length, page.errors.join('\n'));
		await page.context().close();
	});
}
