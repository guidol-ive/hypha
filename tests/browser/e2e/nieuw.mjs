//
// Step 1 of the design: a new article from its title in the popup 'nieuwe pagina', with the address shown below the
// title and the choice how to write; other page types keep the page name as before.
//
import { login, command, assert } from './helpers.mjs';

export default async function (t) {
	const { browser, base } = t;
	let page;
	t.test('the popup asks for the title of an article and shows the address', async () => {
		page = await login(browser, base, 'lotte');
		//
		// Start without a remembered choice, also when the test ran before on this site.
		//
		await command(page, 'nl/Start', 'mdPreferences', JSON.stringify({ remember: false }));
		await page.reload();
		await page.evaluate(() => newPage());
		await page.selectOption('#newPageType', 'peer_reviewed_article');
		await page.fill('#newPagename', 'Café „De Zwaan” krijgt geen vergunning');
		const address = await page.textContent('.mde-address');
		assert(address.includes('cafe-de-zwaan-krijgt-geen-vergunning'), address);
		assert(await page.isVisible('[name=mdMode][value=markdown]'), 'choice of the way of writing');
	});
	t.test('create opens the editor with the title and the chosen view', async () => {
		await page.check('[name=mdMode][value=markdown]');
		await page.check('[name=mdRemember]');
		await Promise.all([page.waitForURL(/cafe-de-zwaan-krijgt-geen-vergunning(-\d+)?\/edit/), page.click('#newPageSubmit')]);
		await page.waitForFunction(() => window.hyphaMdeditor?.editor?.ready);
		const state = await page.evaluate(() => ({ title: window.hyphaMdeditor.editor.fields.title, mode: window.hyphaMdeditor.editor.editMode }));
		assert(state.title === 'Café „De Zwaan” krijgt geen vergunning' && state.mode === 'markdown', JSON.stringify(state));
	});
	t.test('the choice is remembered: the next popup does not ask again', async () => {
		await page.goto(base + 'nl/Start');
		await page.evaluate(() => newPage());
		await page.selectOption('#newPageType', 'peer_reviewed_article');
		assert(!(await page.isVisible('[name=mdMode]')), 'asked again');
	});
	t.test('a text page keeps its page name', async () => {
		await page.selectOption('#newPageType', 'textpage');
		await page.fill('#newPagename', 'Over de raad');
		assert(!(await page.isVisible('.mde-address')), 'address shown for a text page');
		assert(!page.errors.length, page.errors.join('\n'));
		await page.context().close();
	});
	//
	// The standard way of a member: from the page index, a new article with a title, then the editor (#656).
	//
	t.test('an article made from the page index opens in the editor with its title', async () => {
		const p = await login(browser, base, 'lotte');
		await p.goto(base + 'index/nl');
		await p.evaluate(() => newPage());
		await p.selectOption('#newPageType', 'peer_reviewed_article');
		assert(await p.inputValue('#newPagename') === '', 'the popup fills in a name on the page index');
		const title = 'Nieuwe fietsbrug over de Eem ' + Date.now().toString(36);
		await p.fill('#newPagename', title);
		await Promise.all([p.waitForURL(/\/nl\/nieuwe-fietsbrug-over-de-eem-[a-z0-9]+(-\d+)?\/edit/), p.click('#newPageSubmit')]);
		await p.waitForFunction(() => window.hyphaMdeditor?.editor?.ready);
		const state = await p.evaluate(() => window.hyphaMdeditor.editor.fields.title);
		assert(state === title, `title in the editor: ${state}`);
		assert(!p.errors.length, p.errors.join('\n'));
		await p.context().close();
	});
}
