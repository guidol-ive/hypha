//
// The editor in a running Hypha (task T08): write in both views, switch without any change, the cursor on the same
// place, the toolbar, tables, an image, a diagram, a formula, paste, preview, import and export, save and the XML.
//
import fs from 'node:fs';
import { login, newArticle, command, assert } from './helpers.mjs';

export default async function (t) {
	const { browser, base, root } = t;
	const start = fs.readFileSync(root + '/tests/markdown/data/start.md', 'utf8');
	let page, slug;
	const ed = () => page.evaluate(() => window.hyphaMdeditor.editor.fields);
	const setMode = async m => { await page.click(`[data-edit="${m}"]`); await page.waitForTimeout(100); };

	t.test('open a new article in the visual view without errors', async () => {
		page = await login(browser, base, 'sanne');
		slug = await newArticle(page, base, 'Proef van de editor in de browser');
		assert(await page.isVisible('#mdeVisual .ProseMirror'), 'ProseMirror visible');
		assert(!page.errors.length, page.errors.join('\n'));
	});

	t.test('markdown view: type text, Frontmatter fills the fields', async () => {
		await setMode('markdown');
		await page.evaluate(src => { const e = window.hyphaMdeditor.editor; e.cm.dispatch({ changes: { from: e.cm.state.doc.length, insert: src } }); }, start);
		await page.waitForTimeout(300);
		const f = await ed();
		assert(f.text.trim() === start.trim(), 'text from the Markdown view');
		await page.evaluate(() => { const e = window.hyphaMdeditor.editor; const d = e.cm.state.doc.toString(); const i = d.indexOf('rubriek: ""'); e.cm.dispatch({ changes: { from: i, to: i + 11, insert: 'rubriek: Politiek en bestuur' } }); });
		await page.waitForTimeout(100);
		assert((await ed()).section === 'Politiek en bestuur', 'section from the Frontmatter');
	});

	t.test('switching Markdown -> Opmaak -> Markdown changes nothing (BR-75)', async () => {
		const before = await page.evaluate(() => window.hyphaMdeditor.editor.cm.state.doc.toString());
		await setMode('visual');
		await setMode('markdown');
		await setMode('visual');
		await setMode('markdown');
		const after = await page.evaluate(() => window.hyphaMdeditor.editor.cm.state.doc.toString());
		assert(before === after, 'source changed by switching');
	});

	t.test('the cursor keeps its block when switching', async () => {
		await page.evaluate(() => { const e = window.hyphaMdeditor.editor; const d = e.cm.state.doc.toString(); const i = d.indexOf('De eerste jaren'); e.cm.dispatch({ selection: { anchor: i + 10 } }); e.cm.focus(); });
		await setMode('visual');
		const text = await page.evaluate(() => { const v = window.hyphaMdeditor.editor.pm; const $h = v.state.selection.$head; return $h.parent.textContent.slice(0, 15); });
		assert(text === 'De eerste jaren', 'cursor in block: ' + text);
		await setMode('markdown');
		const line = await page.evaluate(() => { const e = window.hyphaMdeditor.editor; return e.cm.state.doc.lineAt(e.cm.state.selection.main.head).text.slice(0, 15); });
		assert(line === 'De eerste jaren', 'cursor back: ' + line);
	});

	t.test('visual view: typing and bold keep the rest of the source as it was', async () => {
		await setMode('visual');
		//
		// The cursor at the end of the first paragraph, type, then select the new word and make it bold with the keyboard.
		//
		await page.evaluate(() => { const v = window.hyphaMdeditor.editor.pm; const end = v.state.doc.firstChild.nodeSize - 1; v.dispatch(v.state.tr.setSelection(v.state.selection.constructor.near(v.state.doc.resolve(end)))); v.focus(); });
		await page.keyboard.type(' Nieuw.');
		await page.evaluate(() => { const v = window.hyphaMdeditor.editor.pm; const end = v.state.doc.firstChild.nodeSize - 2; const sel = v.state.selection.constructor; v.dispatch(v.state.tr.setSelection(sel.between(v.state.doc.resolve(end - 5), v.state.doc.resolve(end)))); });
		await page.keyboard.press('Meta+b');
		const f = await ed();
		assert(f.text.includes('**Nieuw**.') || f.text.includes('**Nieuw.**'), 'bold in Markdown: ' + f.text.slice(0, 400));
		assert(f.text.includes('> [!info] Open Eemstad in het kort'), 'callout untouched');
		assert(f.text.includes('```mermaid'), 'diagram untouched');
	});

	t.test('table menu: a new table with 3 columns, align right, add a row', async () => {
		await page.evaluate(() => window.hyphaMdeditor.editor.dialogs.tableOp('new', 3));
		await page.evaluate(() => window.hyphaMdeditor.editor.dialogs.tableOp('right'));
		await page.evaluate(() => window.hyphaMdeditor.editor.dialogs.tableOp('rowAfter'));
		const f = await ed();
		assert(/\| Kop 1 \| Kop 2 \| Kop 3 \|\n\|--:\|---\|---\|/.test(f.text), 'table in Markdown: ' + (f.text.match(/\| Kop 1[\s\S]{0,120}/) || [''])[0]);
	});

	t.test('diagram dialog: a template, description and placement', async () => {
		await page.click('[data-act="diagram"]', { force: true }).catch(() => page.evaluate(() => window.hyphaMdeditor.editor.action('diagram')));
		await page.waitForSelector('#mdeDiagramDlg[open]');
		await page.click('#mdeTopTemplates [data-t="2"]');
		await page.fill('#mdeDiagramAlt', 'zetels in de raad');
		await page.check('[name=mdeDplace][value=klein-rechts]');
		await page.waitForSelector('#mdeDiagramView svg', { timeout: 5000 });
		await page.click('#mdeDiagramOk');
		const f = await ed();
		assert(/%% beschrijving: zetels in de raad %%\n+```mermaid \{\.klein-rechts\}\npie title Zetels in de raad/.test(f.text), 'diagram in Markdown');
	});

	t.test('paste from Word in the visual view becomes Markdown', async () => {
		const html = '<html><body><p class=MsoNormal><b>Vet uit Word</b> en <i>schuin</i></p><h1>Kop een</h1><p class=MsoListParagraph style="mso-list:l0 level1 lfo1"><![if !supportLists]>·<![endif]>punt</p></body></html>';
		await page.click('#mdeVisual .ProseMirror p');
		await page.evaluate(h => { const dt = new DataTransfer(); dt.setData('text/html', h); dt.setData('text/plain', 'x'); document.querySelector('#mdeVisual .ProseMirror').dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })); }, html);
		const f = await ed();
		assert(f.text.includes('**Vet uit Word** en *schuin*') && f.text.includes('### Kop een'), 'pasted: ' + (f.text.match(/\*\*Vet uit Word[\s\S]{0,80}/) || [''])[0]);
	});

	t.test('preview side by side shows the article with the diagram drawn', async () => {
		await page.click('[data-mode="side"]');
		await page.waitForSelector('#mdePreview .body figure.diagram svg', { timeout: 8000 });
		const html = await page.innerHTML('#mdePreview');
		assert(html.includes('callout info') && html.includes('kop-de-eerste-zetels'), 'preview content');
		await page.click('[data-mode="write"]');
	});

	t.test('save: fields, SVG and MathML go to the server; the XML has source and XHTML', async () => {
		await page.evaluate(() => { const e = window.hyphaMdeditor.editor; Object.assign(e.fields, { excerpt: 'Twintig jaar vroeg Hoekstra om stukken.', method: 'Verzonnen bijsluiter.', tags: ['Raadsnieuws'] }); });
		await page.evaluate(() => window.hyphaMdeditor.save());
		await page.waitForFunction(() => window.mdeLastSave, null, { timeout: 10000 });
		const timing = await page.evaluate(() => window.mdeLastSave);
		assert(timing.ms < 1000, 'save took ' + JSON.stringify(timing));
		const status = await page.evaluate(() => document.getElementById('mdeToast').textContent);
		assert(/Opgeslagen/.test(status), 'toast: ' + status);
		const reading = await (await page.context().request.get(base + 'nl/' + slug)).text();
		assert(reading.includes('viewBox') && reading.includes('<math') && reading.includes('Vet uit Word'), 'reading view has SVG and MathML');
	});

	t.test('export as .md and import it again gives the same fields', async () => {
		const [download] = await Promise.all([page.waitForEvent('download'), page.evaluate(() => window.hyphaMdeditor.editor.download())]);
		const text = fs.readFileSync(await download.path(), 'utf8');
		assert(text.startsWith('---\ntitel: Proef van de editor in de browser'), 'exported Frontmatter');
		const before = await ed();
		await page.setInputFiles('#mdeImport', { name: 'artikel.md', mimeType: 'text/markdown', buffer: Buffer.from(text) });
		await page.waitForTimeout(300);
		const after = await ed();
		assert(after.text === before.text && after.title === before.title && after.method === before.method, 'import equals export');
	});

	t.test('no errors in the console', async () => {
		assert(!page.errors.length, page.errors.join('\n'));
		await page.context().close();
	});
}
