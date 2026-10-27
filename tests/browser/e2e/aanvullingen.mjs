//
// The leftovers of the review of the editor: summaries of folded blocks, Bewerken in the toolbar, a pasted address
// over selected text, the title of a kader as a field, diagrams as one image and interactive blocks with the
// Content-Security-Policy of the server in the preview.
//
import { login, newArticle, assert } from './helpers.mjs';

export default async function (t) {
	const { browser, base } = t;
	let page;
	const ed = () => page.evaluate(() => window.hyphaMdeditor.editor.fields);
	const setMode = async m => { await page.click(`[data-edit="${m}"]`); await page.waitForTimeout(100); };
	//
	// The text after the Frontmatter; without Frontmatter the editor would not switch to Opmaak.
	//
	const setText = text => page.evaluate(text => { const e = window.hyphaMdeditor.editor; const d = e.cm.state.doc.toString(); const from = d.indexOf('\n---\n', 4) + 5; e.cm.dispatch({ changes: { from, to: d.length, insert: '\n' + text } }); }, text);
	const paste = (selector, plain) => page.evaluate(([selector, plain]) => { const dt = new DataTransfer(); dt.setData('text/plain', plain); document.querySelector(selector).dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })); }, [selector, plain]);

	t.test('open a new article', async () => {
		page = await login(browser, base, 'sanne');
		await newArticle(page, base, 'Proef van de aanvullingen');
		assert(!page.errors.length, page.errors.join('\n'));
	});

	t.test('a folded block shows a summary of what is in it', async () => {
		await page.evaluate(() => { const e = window.hyphaMdeditor.editor; e.fields.method = 'Gesproken met **drie** raadsleden (verzonnen).'; e.changed(); });
		await page.waitForTimeout(400);
		await page.evaluate(() => { document.getElementById('mdeFootMethod').open = false; });
		const text = await page.textContent('#mdeSumMethod');
		assert(text === '– Gesproken met drie raadsleden (verzonnen).', 'summary: ' + text);
		assert(await page.isVisible('#mdeSumMethod'), 'summary visible when folded');
		await page.evaluate(() => { document.getElementById('mdeFootMethod').open = true; });
	});

	t.test('Beeld and Diagram say Bewerken with the cursor in an image or a diagram', async () => {
		await setMode('markdown');
		await setText('Eerste alinea.\n\n```mermaid\npie title Zetels\n  "A" : 3\n  "B" : 2\n```\n\n![Een verzonnen plein](plein.jpg)\n');
		const label = async act => page.evaluate(act => document.querySelector(`.toolbar [data-act="${act}"]`).title, act);
		await page.evaluate(() => { const e = window.hyphaMdeditor.editor; e.cm.dispatch({ selection: { anchor: e.cm.state.doc.toString().indexOf('pie') } }); });
		await page.waitForTimeout(300);
		assert(/bewerken/i.test(await label('diagram')) && !/bewerken/i.test(await label('image')), 'diagram: ' + await label('diagram'));
		await page.evaluate(() => { const e = window.hyphaMdeditor.editor; e.cm.dispatch({ selection: { anchor: e.cm.state.doc.toString().indexOf('![') + 3 } }); });
		await page.waitForTimeout(300);
		assert(/bewerken/i.test(await label('image')) && !/bewerken/i.test(await label('diagram')), 'image: ' + await label('image'));
		await page.evaluate(() => { const e = window.hyphaMdeditor.editor; e.cm.dispatch({ selection: { anchor: 2 } }); });
		await page.waitForTimeout(300);
		assert(!/bewerken/i.test(await label('image')) && !/bewerken/i.test(await label('diagram')), 'back to insert');
	});

	t.test('an address pasted over selected text becomes a link (Markdown view)', async () => {
		await setText('Lees het verslag van de raad.\n');
		await page.evaluate(() => { const e = window.hyphaMdeditor.editor; const i = e.cm.state.doc.toString().indexOf('verslag'); e.cm.dispatch({ selection: { anchor: i, head: i + 7 } }); e.cm.focus(); });
		await paste('#mdeText .cm-content', 'https://example.org/verslag');
		await page.waitForTimeout(100);
		assert((await ed()).text.startsWith('Lees het [verslag](https://example.org/verslag) van de raad.'), 'markdown: ' + (await ed()).text);
	});

	t.test('an address pasted over selected text becomes a link (visual view)', async () => {
		await setText('Lees het verslag van de raad.\n');
		await setMode('visual');
		await page.evaluate(() => { const v = window.hyphaMdeditor.editor.pm; const sel = v.state.selection.constructor; v.dispatch(v.state.tr.setSelection(sel.create(v.state.doc, 10, 17))); v.focus(); });
		await paste('#mdeVisual .ProseMirror', 'https://example.org/verslag');
		await page.waitForTimeout(100);
		assert((await ed()).text.startsWith('Lees het [verslag](https://example.org/verslag) van de raad.'), 'visual: ' + (await ed()).text);
	});

	t.test('a new kader: its title is selected in a field, typing replaces it, no prompt', async () => {
		let prompted = false;
		page.once('dialog', d => { prompted = true; d.dismiss(); });
		await page.evaluate(() => { const v = window.hyphaMdeditor.editor.pm; v.dispatch(v.state.tr.setSelection(v.state.selection.constructor.near(v.state.doc.resolve(3)))); v.focus(); });
		await page.click('.toolbar [data-act="callout"]');
		await page.waitForTimeout(100);
		assert(!prompted, 'a prompt was shown');
		assert(await page.evaluate(() => document.activeElement?.matches('input.callout-title')), 'title field has focus');
		await page.keyboard.type('Zo deden we het');
		await page.keyboard.press('Enter');
		await page.keyboard.type('Extra. ');
		await page.waitForTimeout(100);
		const text = (await ed()).text;
		assert(/> \[!info\] Zo deden we het\n> Extra\. /.test(text), 'kader: ' + text);
	});

	t.test('preview: a diagram is one image named after its description', async () => {
		await setMode('markdown');
		await setText('%% beschrijving: Zetels in de raad %%\n```mermaid\npie title Zetels\n  "A" : 3\n  "B" : 2\n```\n');
		await page.click('[data-mode="preview"]');
		await page.waitForSelector('#mdePreview figure.diagram svg', { timeout: 8000 });
		const svg = await page.evaluate(() => { const s = document.querySelector('#mdePreview figure.diagram > svg'); return [s.getAttribute('role'), s.getAttribute('aria-label')]; });
		assert(svg[0] === 'img' && svg[1] === 'Zetels in de raad', 'svg: ' + svg.join(' '));
	});

	t.test('preview: an interactive block has the Content-Security-Policy; an iframe of the author loses its srcdoc', async () => {
		await setText('%% beschrijving: Een proef %%\n```html interactief {hoogte=120}\n<p>Proef</p>\n```\n\n<iframe srcdoc="<p>eigen</p>"></iframe>\n');
		await page.waitForTimeout(500);
		const frames = await page.evaluate(() => [...document.querySelectorAll('#mdePreview iframe')].map(f => [f.getAttribute('srcdoc') || '', f.getAttribute('sandbox'), f.hasAttribute('data-mde-own')]));
		assert(frames.length >= 1 && frames[0][0].includes('Content-Security-Policy') && frames[0][0].includes("connect-src 'none'") && frames[0][1] === 'allow-scripts' && !frames[0][2], 'interactive: ' + JSON.stringify(frames[0]));
		assert(frames.slice(1).every(f => !f[0]), 'srcdoc of the author: ' + JSON.stringify(frames));
		await page.click('[data-mode="write"]');
	});

	t.test('interactive block: the slash menu opens the dialog; code, description and height become Markdown', async () => {
		await setText('Eerste alinea.\n\n');
		await page.evaluate(() => { const e = window.hyphaMdeditor.editor; e.cm.dispatch({ selection: { anchor: e.cm.state.doc.length } }); e.cm.focus(); });
		await page.keyboard.type('/interactief');
		await page.waitForSelector('#mdePopup:not([hidden])');
		await page.keyboard.press('Enter');
		await page.waitForSelector('#mdeIaDlg[open]');
		await page.waitForFunction(() => (document.getElementById('mdeIaView').srcdoc || '').includes('knop'));
		await page.fill('#mdeIaSrc', '<p id="uit">Proef</p>');
		await page.fill('#mdeIaHeight', '240');
		await page.click('#mdeIaOk');
		assert(await page.evaluate(() => document.getElementById('mdeIaDlg').open), 'closed without a description');
		await page.fill('#mdeIaAlt', 'Een verzonnen proef');
		await page.click('#mdeIaOk');
		await page.waitForTimeout(150);
		const text = (await ed()).text;
		assert(text.includes('%% beschrijving: Een verzonnen proef %%\n```html interactief {hoogte=240}\n<p id="uit">Proef</p>\n```'), 'markdown: ' + text);
	});

	t.test('interactive block: edit in the visual view keeps one description and other attributes', async () => {
		await setText('%% beschrijving: Oud %%\n```html interactief {hoogte=300 .breed}\n<p>Oud</p>\n```\n');
		await setMode('visual');
		await page.click('#mdeVisual .raw-interactive .figedit');
		await page.waitForSelector('#mdeIaDlg[open]');
		assert(await page.inputValue('#mdeIaAlt') === 'Oud' && await page.inputValue('#mdeIaHeight') === '300', 'dialog filled');
		await page.fill('#mdeIaAlt', 'Nieuw');
		await page.fill('#mdeIaSrc', '<p>Nieuw</p>');
		await page.click('#mdeIaOk');
		await page.waitForTimeout(150);
		const text = (await ed()).text;
		assert(/^%% beschrijving: Nieuw %%\n+```html interactief \{hoogte=300 \.breed\}\n<p>Nieuw<\/p>\n```$/.test(text.trim()) && text.split('beschrijving').length === 2, 'markdown: ' + text);
		await setMode('markdown');
	});

	t.test('the / menu stands at the cursor, also when the page is scrolled', async () => {
		await setText(Array.from({ length: 40 }, (_, i) => `Alinea ${i + 1} met wat verzonnen tekst.`).join('\n\n') + '\n');
		await page.evaluate(() => { const e = window.hyphaMdeditor.editor; const i = e.cm.state.doc.toString().indexOf('Alinea 30'); e.cm.dispatch({ changes: { from: i, insert: '\n' }, selection: { anchor: i } }); e.cm.focus(); });
		await page.evaluate(() => { const e = window.hyphaMdeditor.editor; const c = e.cm.coordsAtPos(e.cm.state.selection.main.head); window.scrollBy(0, c.top - window.innerHeight / 2); });
		await page.keyboard.type('/');
		await page.waitForSelector('#mdePopup:not([hidden])');
		const [cursor, popup] = await page.evaluate(() => { const e = window.hyphaMdeditor.editor; return [e.cm.coordsAtPos(e.cm.state.selection.main.head).bottom, document.getElementById('mdePopup').getBoundingClientRect().top]; });
		assert(Math.abs(popup - cursor - 4) < 3, `popup at ${popup}, cursor at ${cursor}`);
		await page.keyboard.press('Escape');
	});

	t.test('over plain http (no crypto.subtle) an article with a diagram is saved with its drawing', async () => {
		const p2 = await login(browser, base, 'sanne');
		await p2.addInitScript(() => Object.defineProperty(globalThis.crypto, 'subtle', { get: () => undefined }));
		await newArticle(p2, base, 'Diagram over http');
		await p2.evaluate(() => { const e = window.hyphaMdeditor.editor; e.fields.text = '%% beschrijving: zetels %%\n```mermaid\npie title Zetels\n  "A" : 3\n  "B" : 2\n```\n'; e.loadVisual(); e.changed(); });
		await p2.waitForFunction(() => document.querySelector('#mdeVisual figure.diagram svg'), null, { timeout: 15000 });
		assert(await p2.evaluate(() => window.hyphaMdeditor.editor.save()), 'not saved: ' + await p2.textContent('#mdeToast'));
		const slug2 = p2.url().replace(/^.*\/nl\/([^/]+)\/edit.*$/, '$1');
		const html = await (await p2.request.get(base + 'nl/' + slug2)).text();
		assert(/<figure class="diagram[^>]*><svg/.test(html), 'no drawing in the stored page');
		await p2.context().close();
	});

	t.test('interactive block without a height: preview and reading view fit its content', async () => {
		const p3 = await login(browser, base, 'sanne');
		await newArticle(p3, base, 'Hoogte vanzelf');
		const text = '%% beschrijving: een hoog blok %%\n```html interactief\n<div style="height:900px;background:#eee">Hoog</div>\n```\n';
		await p3.evaluate(t => { const e = window.hyphaMdeditor.editor; e.fields.text = t; e.loadVisual(); e.changed(); }, text);
		await p3.click('[data-mode="preview"]');
		await p3.waitForFunction(() => { const f = document.querySelector('#mdePreview iframe[data-height="auto"]'); return f && f.getBoundingClientRect().height >= 890; }, null, { timeout: 8000 });
		assert(await p3.evaluate(() => window.hyphaMdeditor.editor.save()), 'save');
		const slug3 = p3.url().replace(/^.*\/nl\/([^/]+)\/edit.*$/, '$1');
		await p3.goto(base + 'nl/' + slug3);
		await p3.waitForFunction(() => { const f = document.querySelector('figure.interactief iframe[data-height="auto"]'); return f && f.getBoundingClientRect().height >= 890; }, null, { timeout: 8000 });
		await p3.context().close();
	});

	t.test('no errors in the console', async () => {
		assert(!page.errors.length, page.errors.join('\n'));
		await page.context().close();
	});
}
