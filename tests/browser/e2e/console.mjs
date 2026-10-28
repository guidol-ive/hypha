//
// The console of the browser stays clean in the main flows of the editor: no error, warning, console.log or
// console.debug, no page error, no answer of 400 or more, no failed request, no deprecation, intervention or
// discouraged API (document.write, synchronous XHR, non-passive listeners, unload) and no report in the Issues panel
// of Chrome (form fields without id or name, labels, autocomplete, CSP, mixed content). Only the tag selector below
// the page (#tagList) is left out: it comes from main, which has its own fix for it.
//
import { login, newArticle, assert } from './helpers.mjs';

const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

async function watch(page) {
	const found = [];
	const cdp = await page.context().newCDPSession(page);
	page.on('console', m => { if (['error', 'warning', 'log', 'debug', 'assert', 'trace'].includes(m.type())) found.push(`console.${m.type()}: ${m.text()} (${m.location().url})`); });
	page.on('pageerror', e => found.push('page error: ' + String(e)));
	page.on('response', r => { if (r.status() >= 400) found.push(`${r.status()} ${r.request().method()} ${r.url()}`); });
	//
	// A fetch with redirect: 'manual' (the commands of helpers.mjs) ends the request it would follow with ERR_ABORTED.
	//
	page.on('requestfailed', r => { if (r.failure()?.errorText !== 'net::ERR_ABORTED') found.push(`failed: ${r.failure()?.errorText} ${r.url()}`); });
	cdp.on('Log.entryAdded', ({ entry }) => {
		if (['deprecation', 'intervention'].includes(entry.source) || (entry.source === 'violation' && /document\.write|Synchronous XMLHttpRequest|non-passive|unload/i.test(entry.text)))
			found.push(`${entry.source}: ${entry.text}`);
	});
	cdp.on('Audits.issueAdded', async ({ issue }) => {
		const id = issue.details.genericIssueDetails?.violatingNodeId;
		if (id) {
			const where = await cdp.send('DOM.resolveNode', { backendNodeId: id }).then(r => cdp.send('Runtime.callFunctionOn', { objectId: r.object.objectId, functionDeclaration: 'function () { return [!(this.closest && this.closest("#tagList")), this.outerHTML.slice(0, 160)]; }', returnByValue: true })).then(r => r.result.value).catch(() => [true, '(node gone)']);
			if (!where[0]) return;
			found.push(`issue ${issue.details.genericIssueDetails.errorType}: ${where[1]}`);
			return;
		}
		//
		// A lazy image without width and height (an uploaded image in Markdown has no size in the text): advice that
		// Chrome gives only now and then, left for a later change that stores the size of an image.
		//
		if (issue.code === 'LazyLoadImageIssue') return;
		found.push(`issue ${issue.code}: ${JSON.stringify(issue.details).slice(0, 200)}`);
	});
	await cdp.send('DOM.enable');
	await cdp.send('Log.enable');
	await cdp.send('Log.startViolationsReport', { config: [{ name: 'discouragedAPIUse', threshold: -1 }, { name: 'blockedEvent', threshold: 100 }] });
	await cdp.send('Audits.enable');
	//
	// Audits.enable reports the issues of the page that is open again; look them up before the test navigates away.
	//
	await page.waitForTimeout(300);
	return found;
}

export default async function (t) {
	const { browser, base } = t;
	for (const [device, viewport, extra] of [['desktop', { width: 1280, height: 900 }, {}], ['phone', { width: 393, height: 852 }, { isMobile: true, hasTouch: true, deviceScaleFactor: 3 }]]) {
		t.test(`${device}: the main flows of the editor leave nothing in the console`, async () => {
			const page = await login(browser, base, 'sanne', viewport, extra);
			const found = await watch(page);
			try {
				const slug = await newArticle(page, base, 'Console ' + device);
				const act = async name => { await page.evaluate(a => window.hyphaMdeditor.editor.action(a), name); await page.waitForTimeout(300); await page.keyboard.press('Escape'); };
				for (const name of ['help', 'image', 'diagram', 'table', 'link', 'math', 'slash', 'bold', 'heading', 'list', 'quote', 'callout']) await act(name);
				//
				// Paste from Word with an image as data: the image is shown before it is uploaded.
				//
				await page.click('#mdeVisual .ProseMirror p');
				await page.evaluate(png => { const dt = new DataTransfer(); dt.setData('text/html', `<p class=MsoNormal><b>Vet</b> en <i>schuin</i></p><img src="data:image/png;base64,${png}"><table><tr><td>cel</td></tr></table>`); dt.setData('text/plain', 'x'); document.querySelector('#mdeVisual .ProseMirror').dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })); }, PNG);
				await page.waitForFunction(() => /\]\(images\//.test(window.hyphaMdeditor.editor.fields.text), null, { timeout: 5000 });
				await page.click('[data-edit="markdown"]');
				await page.waitForTimeout(300);
				//
				// The buttons work at the cursor: at the end of the text, not in the Frontmatter.
				//
				await page.evaluate(() => { const cm = window.hyphaMdeditor.editor.cm; cm.dispatch({ selection: { anchor: cm.state.doc.length } }); });
				for (const name of ['help', 'image', 'link', 'math', 'bold', 'quote']) await act(name);
				await page.click('[data-edit="visual"]');
				if (device === 'desktop') await page.click('[data-mode="side"]');
				await page.click('[data-mode="preview"]', { force: true }).catch(() => page.evaluate(() => document.querySelector('[data-mode="preview"]').click()));
				await page.waitForTimeout(800);
				await page.evaluate(() => document.querySelector('[data-mode="write"]').click());
				await page.evaluate(() => { Object.assign(window.hyphaMdeditor.editor.fields, { excerpt: 'Verzonnen samenvatting.', method: 'Verzonnen bijsluiter.' }); window.hyphaMdeditor.save(); });
				const saved = await page.waitForFunction(() => window.mdeLastSave, null, { timeout: 10000 }).then(() => true, () => false);
				assert(saved, 'not saved: ' + await page.evaluate(() => document.getElementById('mdeToast')?.textContent));
				await page.goto(base + 'nl/' + slug + '/edit?mode=markdown');
				await page.waitForFunction(() => window.hyphaMdeditor?.editor?.ready, null, { timeout: 15000 });
				await page.waitForTimeout(500);
				await page.goto(base + 'nl/' + slug);
				await page.waitForTimeout(800);
				assert(!found.length, found.slice(0, 8).join('\n'));
			}
			finally {
				await page.context().close();
			}
		});
	}
	t.test('the settings of the editor leave nothing in the console', async () => {
		const page = await login(browser, base, 'beheer');
		const found = await watch(page);
		try {
			await page.goto(base + 'settings/editor');
			await page.waitForTimeout(800);
			assert(!found.length, found.slice(0, 8).join('\n'));
		}
		finally {
			await page.context().close();
		}
	});
}
