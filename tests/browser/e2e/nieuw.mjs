//
// Step 1 of the design: a new article from its title in the popup 'nieuwe pagina', with the address shown below the
// title and the choice how to write; other page types keep the page name as before.
//
import { login, assert } from './helpers.mjs';

export default async function (t) {
	const { browser, base } = t;
	let page;
	t.test('the popup asks for the title of an article and shows the address', async () => {
		page = await login(browser, base, 'ahmed');
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
}
