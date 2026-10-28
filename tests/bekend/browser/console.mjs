//
// Known bugs that show in the console or the Issues panel of Chrome: form fields without id or name, labels that point
// to no field, fields without autocomplete and an unclosed <select> in a dialog of the editor. Each test reads the
// reports of Chrome itself (Audits.issueAdded and Log.entryAdded) for one page.
//
import { assert, command, login } from '../../browser/e2e/helpers.mjs';

const RUN = Date.now().toString(36);

//
// The reports of Chrome while action runs: Issues panel ([errorType, outerHTML of the field]) and console messages.
//
async function reports(page, action) {
	const issues = [], messages = [];
	const cdp = await page.context().newCDPSession(page);
	cdp.on('Audits.issueAdded', async ({ issue }) => {
		const id = issue.details.genericIssueDetails?.violatingNodeId;
		const html = id ? await cdp.send('DOM.getOuterHTML', { backendNodeId: id }).then(r => r.outerHTML.slice(0, 120), () => '') : '';
		issues.push([issue.details.genericIssueDetails?.errorType || issue.code, html]);
	});
	cdp.on('Log.entryAdded', ({ entry }) => messages.push(entry.text));
	page.on('console', m => messages.push(m.text()));
	await cdp.send('DOM.enable');
	await cdp.send('Log.enable');
	await action();
	await cdp.send('Audits.enable');
	await page.waitForTimeout(800);
	await cdp.detach();
	return { issues, messages };
}

async function newPage(page, base, name, type) {
	await page.goto(base + 'nl/Start');
	const status = await command(page, 'nl/Start', 'newPage', name, { newPageType: type, newPageLanguage: 'nl' });
	if (status !== 0 && status !== 302) throw new Error(`newPage ${name}: ${status}`);
	return name;
}

export default async function (t) {
	t.knownBug(619, 'the tag selector of a member has an id or a name', async () => {
		const page = await login(t.browser, t.base, 'sanne');
		try {
			const { issues } = await reports(page, () => page.goto(t.base + 'nl/Start'));
			const found = issues.filter(([, html]) => html.includes('remainingTags'));
			assert(!found.length, 'Issues panel: ' + found.map(i => i.join(' ')).join('; '));
		}
		finally {
			await page.context().close();
		}
	});

	t.knownBug(620, 'the labels of the editor and festival forms point to a field', async () => {
		const page = await login(t.browser, t.base, 'beheer');
		try {
			//
			// The editor fields of the mailing list stand for those of the article too (both get their id in
			// loadEditor()); the edit view of a new, empty article gives a fatal error on main (#525).
			//
			const list = await newPage(page, t.base, 'Labellijst' + RUN, 'mailinglist');
			const festival = await newPage(page, t.base, 'Labelfeest' + RUN, 'festivalpage');
			const found = [];
			for (const path of [list + '/edit', festival + '/contribute']) {
				const { issues } = await reports(page, () => page.goto(t.base + 'nl/' + path));
				for (const [type, html] of issues) if (/^FormLabelFor/.test(type)) found.push(`${path}: ${type} ${html}`);
			}
			assert(!found.length, found.slice(0, 4).join('; '));
		}
		finally {
			await page.context().close();
		}
	});

	t.knownBug(621, 'login, password, e-mail and name fields say what they hold', async () => {
		const page = await login(t.browser, t.base, 'beheer');
		try {
			const list = await newPage(page, t.base, 'Autolijst' + RUN, 'mailinglist');
			const festival = await newPage(page, t.base, 'Autofeest' + RUN, 'festivalpage');
			const found = [];
			for (const path of ['settings/user/beheer', 'nl/' + list, 'nl/' + festival + '/contribute']) {
				const { issues, messages } = await reports(page, () => page.goto(t.base + path));
				for (const [type, html] of issues) if (type === 'FormInputAssignedAutocompleteValueToIdOrNameAttributeError') found.push(`${path}: ${html}`);
				for (const text of messages) if (/should have autocomplete attributes/.test(text)) found.push(`${path}: ${text.slice(0, 90)}`);
			}
			await page.context().clearCookies();
			const { messages } = await reports(page, async () => { await page.goto(t.base + 'nl/Start'); await page.evaluate(() => login()); await page.waitForSelector('#loginPassword'); });
			for (const text of messages) if (/should have autocomplete attributes/.test(text)) found.push(`login popup: ${text.slice(0, 90)}`);
			assert(!found.length, found.slice(0, 4).join('; '));
		}
		finally {
			await page.context().close();
		}
	});

	t.knownBug(622, 'the image dialog of the text editor closes its <select>', async () => {
		const page = await login(t.browser, t.base, 'sanne');
		try {
			await page.goto(t.base + 'nl/Start/edit');
			await page.waitForSelector('.wym_tools_image a', { state: 'attached' });
			const { messages } = await reports(page, async () => { await page.click('.wym_tools_image a'); await page.waitForTimeout(500); });
			const found = messages.filter(text => /parsed within an open <select>/.test(text));
			assert(!found.length, found[0] || '');
		}
		finally {
			await page.context().close();
		}
	});
}
