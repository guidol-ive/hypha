//
// Known bugs of the old editor of text pages (WYMeditor) that need a browser: the state of the buttons, leaving a
// quote, and the link button without a selection.
//
import { assert, command, login } from '../../browser/e2e/helpers.mjs';

const RUN = Date.now().toString(36);

// A new text page, opened in the WYMeditor; returns the page and the frame of the editor.
async function editor(t, name) {
	const page = await login(t.browser, t.base, 'sanne');
	await command(page, 'nl/Start', 'newPage', name, { newPageType: 'textpage', newPageLanguage: 'nl' });
	await page.goto(t.base + 'nl/' + name.replace(/ /g, '_') + '/edit');
	await page.waitForFunction(() => window.jQuery?.wymeditors?.(0)?.iframeInitialized, null, { timeout: 15000 });
	return [page, page.frameLocator('.wym_iframe iframe')];
}

// What the italic button looks like: its markup and the computed style of the button and its list item.
async function italicButton(page) {
	await page.mouse.move(1200, 10);
	await page.waitForTimeout(200);
	return page.evaluate(() => {
		const li = document.querySelector('.wym_tools_emphasis'), a = li.querySelector('a');
		const style = e => { const s = getComputedStyle(e); return [s.backgroundColor, s.backgroundPosition, s.borderStyle, s.borderColor, s.color, s.boxShadow, s.outlineStyle, s.opacity].join(' '); };
		return li.outerHTML + ' | ' + style(a) + ' | ' + style(li);
	});
}

export default async function (t) {
	t.knownBug(65, 'the italic button shows as pressed while the cursor is in italic text', async () => {
		const [page, frame] = await editor(t, `Cursief ${RUN}`);
		try {
			await page.evaluate(() => jQuery.wymeditors(0).html('<p>Gewone tekst en <em>schuine tekst</em> in een zin.</p>'));
			await frame.locator('em').click();
			const where = await frame.locator('body').evaluate(b => b.ownerDocument.getSelection().anchorNode?.parentNode?.nodeName);
			if (where !== 'EM') throw new Error('the cursor is not in the italic text but in ' + where);
			const inItalic = await italicButton(page);
			await frame.locator('p').click({ position: { x: 5, y: 5 } });
			const inPlain = await italicButton(page);
			assert(inItalic !== inPlain, `the italic button looks the same in italic and in plain text: ${inPlain}`);
		}
		finally {
			await page.context().close();
		}
	});

	t.knownBug(70, 'choosing Paragraph for a line in a quote takes that line out of the quote', async () => {
		const [page, frame] = await editor(t, `Citaat ${RUN}`);
		try {
			await page.evaluate(() => jQuery.wymeditors(0).html('<blockquote><p>Citaat van de raad.</p></blockquote>'));
			await frame.locator('blockquote p').click();
			await page.keyboard.press('End');
			await page.keyboard.press('Enter');
			await page.keyboard.type('Daarna gewone tekst.');
			if (!await frame.locator('blockquote').evaluate(q => q.textContent.includes('Daarna gewone tekst.'))) throw new Error('the new line is not in the quote to begin with');
			await page.hover('.wym_containers h2');
			await page.click('.wym_containers_p a');
			const body = await frame.locator('body').evaluate(b => b.innerHTML);
			const inQuote = await frame.locator('body').evaluate(b => [...b.querySelectorAll('blockquote')].some(q => q.textContent.includes('Daarna gewone tekst.')));
			assert(!inQuote, `the line stays in the quote after choosing Paragraph: ${body.replace(/<br class="wym[^>]*>/g, '')}`);
		}
		finally {
			await page.context().close();
		}
	});

	t.knownBug(90, 'the link button without selected text tells the user what to do', async () => {
		const [page, frame] = await editor(t, `Link ${RUN}`);
		try {
			await page.evaluate(() => jQuery.wymeditors(0).html('<p>Een zin zonder link.</p>'));
			await frame.locator('p').click();
			await page.keyboard.press('End');
			const reactions = [];
			page.on('dialog', d => { reactions.push('dialog ' + d.message()); d.dismiss().catch(() => {}); });
			page.on('popup', p => reactions.push('popup ' + p.url()));
			const before = await page.evaluate(() => document.body.innerText);
			await page.click('.wym_tools_link a');
			await page.waitForTimeout(1000);
			const after = await page.evaluate(() => document.body.innerText);
			if (after !== before) reactions.push('new text on the page');
			if (await page.locator('.wym_dialog').count()) reactions.push('link dialog');
			assert(reactions.length > 0, 'clicking the link button with no text selected does nothing: no message, no dialog');
		}
		finally {
			await page.context().close();
		}
	});
}
