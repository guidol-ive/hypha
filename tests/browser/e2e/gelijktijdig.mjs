//
// Two tabs or two people at once in the editor (found by the concurrency test of 2026-10-27): a save on an older
// version asks before it overwrites, a save during a save follows it, every tab keeps its own draft, a draft on an older
// version is offered with a warning, and a save after a rename by someone else lands on the new address.
//
import { login, newArticle, command, assert } from './helpers.mjs';

export default async function (t) {
	const { browser, base } = t;
	let a, b, slug;
	const editor = (page, fn, arg) => page.evaluate(fn, arg);
	const typeInto = (page, text) => editor(page, text => { const e = window.hyphaMdeditor.editor; e.fields.text = text; e.loadVisual(); e.changed(); }, text);
	const save = page => editor(page, () => window.hyphaMdeditor.editor.save());
	const toast = page => page.textContent('#mdeToast');
	const open = async (page, path) => { await page.goto(base + path + (path.endsWith('/edit') ? '?mode=visual' : '')); await page.waitForFunction(() => window.hyphaMdeditor?.editor?.ready, null, { timeout: 15000 }); };

	t.test('two tabs: the second save on an older version is refused with who saved, and can be forced', async () => {
		a = await login(browser, base, 'sanne');
		slug = await newArticle(a, base, 'Twee tabbladen');
		b = await a.context().newPage();
		b.errors = [];
		await open(b, 'nl/' + slug + '/edit');
		await typeInto(a, 'Tekst uit tab A.\n');
		assert(await save(a), 'save in tab A');
		await typeInto(b, 'Tekst uit tab B.\n');
		assert(!(await save(b)), 'tab B saved over tab A without asking');
		assert(/Sanne de Vries/.test(await toast(b)), 'toast: ' + await toast(b));
		await b.click('#mdeToast button');
		await b.waitForFunction(() => !window.hyphaMdeditor.editor.dirty());
		await open(a, 'nl/' + slug + '/edit');
		assert((await editor(a, () => window.hyphaMdeditor.editor.fields.text)).includes('Tekst uit tab B.'), 'forced save not stored');
	});

	t.test('a save asked for during a save follows it, so the newest text is stored', async () => {
		await open(b, 'nl/' + slug + '/edit');
		const [first, second] = await editor(b, async () => {
			const e = window.hyphaMdeditor.editor;
			e.fields.text = 'Eerste.\n'; e.changed();
			const one = e.save();
			e.fields.text = 'Tweede.\n'; e.changed();
			const two = e.save();
			return [await one, await two];
		});
		assert(first && second, `results ${first} ${second}`);
		await open(a, 'nl/' + slug + '/edit');
		assert((await editor(a, () => window.hyphaMdeditor.editor.fields.text)).includes('Tweede.'), 'the second text is not stored');
	});

	t.test('every tab keeps its own draft, and a draft on an older version is offered with a warning', async () => {
		await open(a, 'nl/' + slug + '/edit');
		await open(b, 'nl/' + slug + '/edit');
		await typeInto(a, 'Concept van tab A.\n');
		await typeInto(b, 'Concept van tab B.\n');
		await editor(a, () => window.hyphaMdeditor.editor.storeDraft());
		await editor(b, () => window.hyphaMdeditor.editor.storeDraft());
		const drafts = await editor(a, () => Object.keys(localStorage).filter(k => k.startsWith('mde:')).map(k => JSON.parse(localStorage.getItem(k)).fields.text));
		assert(drafts.some(x => x.includes('tab A')) && drafts.some(x => x.includes('tab B')), 'drafts: ' + JSON.stringify(drafts));
		//
		// Someone else saves; tab A's draft is now on an older version.
		//
		const ahmed = await login(browser, base, 'ahmed');
		await open(ahmed, 'nl/' + slug + '/edit');
		await typeInto(ahmed, 'Tekst van Ahmed.\n');
		assert(await save(ahmed), 'save by ahmed');
		await ahmed.context().close();
		await b.close();
		await open(a, 'nl/' + slug + '/edit');
		await a.waitForFunction(() => /intussen/.test(document.getElementById('mdeToast').textContent), null, { timeout: 5000 });
		await a.click('#mdeToast button');
		assert(/Concept van tab/.test(await editor(a, () => window.hyphaMdeditor.editor.fields.text)), 'draft not restored');
	});

	t.test('a save after a rename by someone else finds the page by its id', async () => {
		await editor(a, () => { const e = window.hyphaMdeditor.editor; e.saved = JSON.stringify(e.fields); });
		await open(a, 'nl/' + slug + '/edit');
		//
		// The author changes the title in another window and updates the address.
		//
		const other = await login(browser, base, 'sanne');
		await open(other, 'nl/' + slug + '/edit');
		await editor(other, () => { const e = window.hyphaMdeditor.editor; e.fields.title = 'Hernoemd artikel ' + e.cfg.page.name.slice(-6); e.changed(); });
		assert(await save(other), 'save of the new title');
		const newName = await editor(other, () => 'hernoemd-artikel-' + window.hyphaMdeditor.editor.cfg.page.name.slice(-6));
		await command(other, 'nl/' + slug, 'md_rename');
		await other.context().close();
		await typeInto(a, 'Na het hernoemen.\n');
		assert(!(await save(a)), 'the older version was overwritten without asking');
		assert(await editor(a, () => window.hyphaMdeditor.editor.cfg.page.name) === newName, 'not moved to ' + newName);
		await a.click('#mdeToast button');
		await a.waitForFunction(() => !window.hyphaMdeditor.editor.dirty());
		assert(a.url().includes('/' + newName + '/edit'), 'address bar: ' + a.url());
	});

	t.test('no errors in the console', async () => {
		assert(!a.errors.length, a.errors.join('\n'));
		await a.context().close();
	});
}
