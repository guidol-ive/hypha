//
// Screenshots for the handbook (docs/handleiding/afbeeldingen/): the new editor and the parts of Hypha that did not
// change, on the fictional test site of tests/site/maak-site.php with fictional texts and drawn images only.
//
// Usage, from the root of the repository: sh tests/browser/schermafdrukken.sh [8.4]
//
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { login, PASSWORD } from './e2e/helpers.mjs';

const base = process.argv[2].replace(/\/?$/, '/');
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const out = path.join(root, 'docs/handleiding/afbeeldingen');
fs.mkdirSync(out, { recursive: true });
//
// Only the test site: every other host fails to resolve, so a theme cannot load anything from elsewhere.
//
const browser = await chromium.launch({ channel: 'chrome', args: ['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1'] });
const DESKTOP = { width: 1280, height: 860 };
const made = [];

async function shot(page, name, options = {}) {
	await page.waitForTimeout(options.wait ?? 400);
	const file = path.join(out, name + '.png');
	if (options.element) await page.locator(options.element).first().screenshot({ path: file });
	else await page.screenshot({ path: file, fullPage: !!options.full, clip: options.clip });
	made.push(name);
	console.log('  ' + name + '.png');
}

//
// A command of Hypha with repeated fields (md_statute[]), posted from the page with its CSRF token.
//
async function command(page, pagePath, cmd, fields = []) {
	return page.evaluate(async ([pagePath, cmd, fields]) => {
		const body = new URLSearchParams({ command: cmd, argument: '', csrfToken: document.querySelector('input[name=csrfToken]').value });
		for (const [k, v] of fields) body.append(k, v);
		return (await fetch(pagePath, { method: 'POST', body, redirect: 'manual' })).status;
	}, [pagePath, cmd, fields]);
}

//
// Drawn, fictional photos: no picture of a real place or person.
//
async function drawing(kind) {
	const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
	const scenes = {
		plein: `<rect width="1200" height="800" fill="#cfe3ea"/><rect y="520" width="1200" height="280" fill="#b9b2a5"/>
			${[0, 1, 2, 3, 4, 5].map(i => `<rect x="${40 + i * 190}" y="${220 + (i % 3) * 30}" width="170" height="${300 - (i % 3) * 30}" fill="${['#9c6b4f', '#c49a6c', '#7d8c8f', '#b5654a', '#a68a64', '#8a7d72'][i]}"/>
			${[0, 1, 2].map(r => [0, 1, 2].map(c => `<rect x="${60 + i * 190 + c * 50}" y="${250 + (i % 3) * 30 + r * 70}" width="30" height="44" fill="#e8eef0"/>`).join('')).join('')}`).join('')}
			<rect x="520" y="140" width="160" height="380" fill="#6e5a4a"/><polygon points="520,140 600,60 680,140" fill="#4f4136"/><circle cx="600" cy="200" r="34" fill="#f2efe6"/>
			<circle cx="1040" cy="120" r="60" fill="#f6d77a"/>`,
		raadszaal: `<rect width="1200" height="800" fill="#e9e2d4"/><rect y="600" width="1200" height="200" fill="#8c6f56"/>
			${[0, 1, 2, 3, 4].map(r => `<path d="M ${150 + r * 30} ${560 - r * 70} Q 600 ${640 - r * 70} ${1050 - r * 30} ${560 - r * 70}" stroke="#5b4636" stroke-width="26" fill="none"/>`).join('')}
			<rect x="520" y="90" width="160" height="120" fill="#c7b9a0"/><rect x="545" y="110" width="110" height="80" fill="#0b7285"/>`,
	};
	await page.setContent(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800">${scenes[kind]}</svg>`);
	const buffer = await page.screenshot({ type: 'jpeg', quality: 80 });
	await page.close();
	return buffer;
}

const ready = page => page.waitForFunction(() => window.hyphaMdeditor?.editor?.ready, null, { timeout: 15000 });
const editor = (page, fn, arg) => page.evaluate(fn, arg);
const slugOf = title => title.toLowerCase().normalize('NFD').replace(/\p{Mn}/gu, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const ARTICLE = fs.readFileSync(path.join(root, 'tests/markdown/data/start.md'), 'utf8').replace(/!\[[^\]]*\]\(beeld\/[^)]*\)\{[^}]*\}\n\*[^\n]*\*\n/, '');
const METHOD = 'Gesprek met Bram Hoekstra in de bibliotheek van Eemstad-Noord, en de raadsstukken van 2005 tot 2026 (verzonnen voorbeeld).';
const SOURCES = '1. Raadsinformatie gemeente Eemstad, 2006–2026 (voorbeeldbron).\n2. Verkiezingsuitslagen Eemstad, Kiesraad (voorbeeldbron).';

console.log('Screenshots in ' + path.relative(root, out) + ':');

//
// 1. Parts of Hypha that did not change.
//
{
	const context = await browser.newContext({ viewport: DESKTOP, locale: 'nl-NL' });
	const page = await context.newPage();
	await page.goto(base + 'nl/Start');
	await shot(page, 'start-bezoeker');
	await page.evaluate(() => login());
	await page.waitForSelector('#loginUsername', { state: 'visible' });
	await page.fill('#loginUsername', 'sanne');
	await shot(page, 'inloggen');
	await context.close();
}
{
	const page = await login(browser, base, 'beheer', DESKTOP);
	await shot(page, 'start-lid');
	for (const [address, name] of [['settings', 'instellingen'], ['settings/hypha', 'instellingen-hypha'], ['settings/menu', 'instellingen-menu'], ['settings/theme', 'instellingen-thema'], ['settings/elements', 'instellingen-elementen'], ['settings/invite', 'uitnodigen']]) {
		await page.goto(base + address);
		await shot(page, name);
	}
	await page.goto(base + 'nl/Start/edit');
	await page.waitForTimeout(1500);
	await shot(page, 'tekstpagina-wymeditor');
	//
	// Other page types, made through the popup 'nieuwe pagina' as an administrator would.
	//
	for (const [type, name, file] of [['mailinglist', 'Nieuwsbrief Eemstad', 'mailinglijst'], ['festivalpage', 'Buurtfeest Eemstad-Noord', 'festival']]) {
		await page.goto(base + 'nl/Start');
		await page.evaluate(() => newPage());
		if (!(await page.locator(`#newPageType option[value="${type}"]`).count())) { console.log('  (no page type ' + type + ')'); continue; }
		await page.selectOption('#newPageType', type);
		await page.fill('#newPagename', name);
		await Promise.all([page.waitForLoadState('load'), page.click('#newPageSubmit')]);
		await page.waitForTimeout(800);
		//
		// A festival has no view 'edit' (PlanBCode/hypha#537): its settings instead.
		//
		if (type === 'festivalpage') await page.goto(page.url().replace(/\/edit.*$/, '/settings'));
		await shot(page, file);
	}
	await page.context().close();
}

//
// 2. A text page in the new editor, with two versions.
//
{
	const page = await login(browser, base, 'sanne', DESKTOP);
	await page.evaluate(() => newPage());
	await page.selectOption('#newPageType', 'textpage');
	await page.fill('#newPagename', 'Over de redactie');
	await shot(page, 'nieuwe-tekstpagina');
	await page.selectOption('#newPageType', 'peer_reviewed_article');
	await page.fill('#newPagename', 'Bram Hoekstra neemt afscheid van de raad');
	await shot(page, 'nieuw-artikel');
	await page.selectOption('#newPageType', 'textpage');
	await page.fill('#newPagename', 'Over de redactie');
	await page.locator('[name=mdMode][value=visual]').check().catch(() => {});
	await Promise.all([page.waitForURL(/edit/), page.click('#newPageSubmit')]);
	await ready(page);
	const save = async () => { await page.click('#mdeSave'); await page.waitForTimeout(1200); };
	await editor(page, text => { const e = window.hyphaMdeditor.editor; e.fields.text = text; e.loadVisual(); e.changed(); }, '## Wie we zijn\n\nDe redactie van de proefsite Eemstad bestaat uit vrijwilligers uit de wijken. Iedereen kan meeschrijven.\n\n## Hoe we werken\n\n1. Een artikel wordt gelezen door drie collega’s.\n2. We noemen altijd onze bronnen.\n3. Fouten herstellen we zichtbaar.\n');
	await shot(page, 'tekstpagina-editor');
	await save();
	await editor(page, () => { const e = window.hyphaMdeditor.editor; e.fields.text += '\n## Contact\n\nMail de redactie via het formulier op de site.\n'; e.loadVisual(); e.changed(); });
	await save();
	await page.goto(base + 'nl/over-de-redactie');
	await page.goto(page.url().replace(/\/edit.*$/, ''));
	await shot(page, 'tekstpagina');
	await page.context().close();
}

//
// 3. An article in the new editor: both views, side by side, the dialogs, the menus and a phone.
//
const TITLE = 'Bram Hoekstra neemt afscheid van de raad';
let slug;
{
	const page = await login(browser, base, 'sanne', { width: 1440, height: 900 });
	await page.evaluate(() => newPage());
	await page.selectOption('#newPageType', 'peer_reviewed_article');
	await page.fill('#newPagename', TITLE);
	await page.locator('[name=mdMode][value=visual]').check().catch(() => {});
	await Promise.all([page.waitForURL(/edit/), page.click('#newPageSubmit')]);
	await ready(page);
	slug = page.url().replace(/^.*\/nl\/([^/]+)\/edit.*$/, '$1');
	await editor(page, ([text, method, sources]) => {
		const e = window.hyphaMdeditor.editor;
		Object.assign(e.fields, { excerpt: 'Na twintig jaar in de gemeenteraad stopt Bram Hoekstra. Een gesprek over stukken lezen, één jaar wethouderschap en wat hij gaat doen.', section: 'Politiek en bestuur', tags: ['Raadsnieuws', 'Politiek en bestuur'], text, method, sources });
		e.loadVisual(); e.renderHead(); e.changed();
	}, [ARTICLE, METHOD, SOURCES]);
	//
	// The photo at the top, through the image dialog.
	//
	await editor(page, () => window.hyphaMdeditor.editor.dialogs.openImage({ hero: true }));
	await page.setInputFiles('#mdeImageFile', { name: 'markt-eemstad.jpg', mimeType: 'image/jpeg', buffer: await drawing('plein') });
	await page.waitForTimeout(1500);
	await page.fill('#mdeImageAlt', 'Getekend marktplein met oude gevels en het stadhuis in het midden');
	await page.fill('#mdeImageCaption', 'De markt van Eemstad, met het stadhuis.');
	await page.fill('#mdeImageCredit', 'Tekening: redactie');
	await page.locator('[name=mdePlace][value=bovenaan]').check();
	await shot(page, 'dialoog-beeld');
	await page.click('#mdeImageOk');
	await page.waitForTimeout(500);
	//
	// A second image in the text, after the paragraph about the wethouder.
	//
	await editor(page, () => { const e = window.hyphaMdeditor.editor; const v = e.pm; let at = 0; v.state.doc.forEach((n, pos) => { if (!at && n.textContent.startsWith('In 2014')) at = pos + n.nodeSize - 1; }); v.dispatch(v.state.tr.setSelection(v.state.selection.constructor.near(v.state.doc.resolve(at)))); v.focus(); });
	await editor(page, () => window.hyphaMdeditor.editor.dialogs.openImage({}));
	await page.setInputFiles('#mdeImageFile', { name: 'raadszaal-eemstad.jpg', mimeType: 'image/jpeg', buffer: await drawing('raadszaal') });
	await page.waitForTimeout(1500);
	await page.fill('#mdeImageAlt', 'Getekende raadszaal met rijen banken in een halve cirkel');
	await page.fill('#mdeImageCaption', 'De raadszaal van Eemstad.');
	await page.fill('#mdeImageCredit', 'Tekening: redactie');
	await page.locator('[name=mdePlace][value=in-de-tekst]').check().catch(() => {});
	await page.click('#mdeImageOk');
	await page.waitForTimeout(800);
	await page.evaluate(() => window.scrollTo(0, 0));
	await shot(page, 'artikel-opmaak');
	await page.click('[data-edit="markdown"]');
	await page.waitForSelector('#mdeText .cm-content');
	await editor(page, () => { const e = window.hyphaMdeditor.editor; e.cm.dispatch({ selection: { anchor: 0 }, scrollIntoView: true }); window.scrollTo(0, 0); });
	await shot(page, 'artikel-markdown');
	await page.click('[data-mode="side"]');
	await page.waitForSelector('#mdePreview .body');
	await editor(page, () => { const e = window.hyphaMdeditor.editor; const i = e.cm.state.doc.toString().indexOf('### Een nieuwe generatie'); e.cm.dispatch({ selection: { anchor: i }, scrollIntoView: true }); e.cm.focus(); });
	await shot(page, 'artikel-voorbeeld', { wait: 1500 });
	await page.click('[data-mode="write"]');
	//
	// The / menu and the [[ suggestions in the Markdown view.
	//
	await editor(page, () => { const e = window.hyphaMdeditor.editor; const i = e.cm.state.doc.toString().indexOf('### Wat nu?'); e.cm.dispatch({ changes: { from: i, insert: '\n' }, selection: { anchor: i }, scrollIntoView: true }); e.cm.focus(); });
	await page.evaluate(() => window.scrollBy(0, 420));
	await page.keyboard.type('/');
	await page.waitForSelector('#mdePopup:not([hidden])');
	await shot(page, 'menu-slash');
	await page.keyboard.press('Escape');
	await page.keyboard.press('Backspace');
	await page.keyboard.type('Zie ook [[Ra');
	await page.waitForSelector('#mdePopup:not([hidden])');
	await shot(page, 'suggesties-paginas');
	await page.keyboard.press('Escape');
	await editor(page, () => { const e = window.hyphaMdeditor.editor; const d = e.cm.state.doc.toString(); const i = d.indexOf('Zie ook [[Ra'); e.cm.dispatch({ changes: { from: i - 1, to: i + 'Zie ook [[Ra'.length } }); });
	//
	// Dialogs: diagram (the time line of the article), interactive block, formula, cheat sheet, and the table menu.
	//
	await editor(page, () => { const e = window.hyphaMdeditor.editor; e.cm.dispatch({ selection: { anchor: e.cm.state.doc.toString().indexOf('timeline') } }); e.cm.focus(); });
	await page.waitForTimeout(300);
	await editor(page, () => window.hyphaMdeditor.editor.action('diagram'));
	await page.waitForSelector('#mdeDiagramView svg');
	await shot(page, 'dialoog-diagram', { wait: 800 });
	await page.click('#mdeMoreTypes');
	await shot(page, 'dialoog-diagram-soorten', { wait: 800 });
	await page.keyboard.press('Escape');
	await page.keyboard.press('Escape');
	await editor(page, () => window.hyphaMdeditor.editor.dialogs.openInteractive({ text: '<label>Aantal personen in huis <input id="n" type="number" value="2" min="1" max="6"></label>\n<p id="uit" style="font-size:28px"></p>\n<script>\n  const tarief = { 1: 312, 2: 389 };\n  const reken = () => uit.textContent = "€ " + (tarief[n.value] ?? 425) + " per jaar";\n  n.oninput = reken; reken();\n</script>', info: 'html interactief {hoogte=180}', description: 'Rekenhulp: wat betaal je aan afvalstoffenheffing in 2027 (verzonnen tarieven)?' }));
	await shot(page, 'dialoog-interactief', { wait: 1200 });
	await page.keyboard.press('Escape');
	await editor(page, () => window.hyphaMdeditor.editor.dialogs.open('mdeHelpDlg'));
	await shot(page, 'spiekbriefje');
	await page.keyboard.press('Escape');
	await page.click('[data-edit="visual"]');
	await page.waitForTimeout(300);
	await editor(page, () => { const e = window.hyphaMdeditor.editor; const v = e.pm; let at = 0; v.state.doc.forEach((n, pos) => { if (!at && n.textContent.startsWith('Bij de verkiezingen van 2018')) at = pos + 3; }); v.dispatch(v.state.tr.setSelection(v.state.selection.constructor.near(v.state.doc.resolve(at))).scrollIntoView()); v.focus(); });
	await editor(page, () => window.hyphaMdeditor.editor.action('math'));
	await page.waitForSelector('#mdeMathDlg[open]', { timeout: 3000 }).catch(() => {});
	await shot(page, 'dialoog-formule');
	await page.keyboard.press('Escape');
	await editor(page, () => window.hyphaMdeditor.editor.undoVisual?.());
	await editor(page, () => window.hyphaMdeditor.editor.dialogs.toggleTableMenu(document.querySelector('[data-act="table"]')));
	await shot(page, 'menu-tabel');
	await page.keyboard.press('Escape');
	//
	// Remove what the formula button added, then save; the checklist shows what is missing before review.
	//
	await editor(page, ([text]) => { const e = window.hyphaMdeditor.editor; e.fields.text = text.replace(/(### Wethouder voor één jaar[\s\S]*?\[\^1\]\n)/, '$1\n![Getekende raadszaal met rijen banken in een halve cirkel](raadszaal-eemstad.jpg){.in-de-tekst}\n*De raadszaal van Eemstad. Tekening: redactie*\n'); e.loadVisual(); e.changed(); }, [ARTICLE]);
	await page.click('#mdeSave');
	await page.waitForTimeout(1500);
	await page.evaluate(() => window.scrollTo(0, 0));
	await shot(page, 'checklist', { element: '#mdeditor .side, #mdeditor aside.side, #mdeChecks' });
	await page.context().close();
}
{
	//
	// The editor on a phone (iPhone 15, 393 x 852 pt), and the same with the keyboard open is not possible headless.
	//
	const page = await login(browser, base, 'sanne', { width: 393, height: 852 }, { isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
	await page.goto(base + 'nl/' + slug + '/edit');
	await ready(page);
	await shot(page, 'artikel-telefoon');
	await page.context().close();
}

//
// 4. Review and publication: the article page in review, approving with the statute, published, withdrawn.
//
{
	const sanne = await login(browser, base, 'sanne', DESKTOP);
	await sanne.goto(base + 'nl/' + slug);
	await shot(sanne, 'artikel-schets');
	console.log('  review: ' + await command(sanne, 'nl/' + slug, 'status_change_review'));
	const ahmed = await login(browser, base, 'ahmed', DESKTOP);
	await ahmed.goto(base + 'nl/' + slug);
	await shot(ahmed, 'artikel-in-beoordeling');
	await ahmed.evaluate(() => { const d = document.getElementById('mdeApprove'); if (d) d.hidden = false; });
	for (const box of (await ahmed.locator('#mdeApprove input[type=checkbox]').all()).slice(0, 3)) await box.check();
	await ahmed.fill('#mdeApproveComment', 'Goed onderbouwd; de bronnen kloppen.').catch(() => {});
	await shot(ahmed, 'goedkeuren', { element: '#mdeApprove' });
	await ahmed.context().close();
	for (const name of ['ahmed', 'lotte', 'joris']) {
		const p = await login(browser, base, name, DESKTOP);
		await p.goto(base + 'nl/' + slug);
		console.log('  approve ' + name + ': ' + await command(p, 'nl/' + slug, 'approve', [0, 1, 2, 3, 4].map(i => ['md_statute[]', String(i)])));
		await p.context().close();
	}
	await sanne.goto(base + 'nl/' + slug);
	await shot(sanne, 'artikel-goedgekeurd');
	console.log('  publish: ' + await command(sanne, 'nl/' + slug, 'status_change_published'));
	await sanne.context().close();

	const reader = await browser.newContext({ viewport: DESKTOP, locale: 'nl-NL' });
	const page = await reader.newPage();
	await page.goto(base + 'nl/' + slug);
	await shot(page, 'artikel-lezer', { wait: 1000 });
	await reader.close();
	const phone = await browser.newContext({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: 'nl-NL' });
	const pp = await phone.newPage();
	await pp.goto(base + 'nl/' + slug);
	await shot(pp, 'artikel-lezer-telefoon', { wait: 1000 });
	await phone.close();

	//
	// A second article to withdraw, so the published one stays as it is.
	//
	const s2 = await login(browser, base, 'sanne', DESKTOP);
	const title2 = 'Wijkbudget Eemstad-Noord bijna op';
	await s2.evaluate(() => newPage());
	await s2.selectOption('#newPageType', 'peer_reviewed_article');
	await s2.fill('#newPagename', title2);
	await Promise.all([s2.waitForURL(/edit/), s2.click('#newPageSubmit')]);
	await ready(s2);
	const slug2 = s2.url().replace(/^.*\/nl\/([^/]+)\/edit.*$/, '$1');
	await editor(s2, ([method, sources]) => { const e = window.hyphaMdeditor.editor; Object.assign(e.fields, { excerpt: 'Het budget dat bewoners zelf verdelen, is na acht maanden bijna op (verzonnen voorbeeld).', section: 'Wonen en wijken', tags: ['Wonen'], text: 'Het wijkbudget van Eemstad-Noord is na acht maanden bijna op. Bewoners kozen vooral voor groen en speelplekken.\n\n### Wat er nog kan\n\nVoor de rest van het jaar is nog € 4.000 over.\n', method, sources }); e.loadVisual(); e.renderHead(); e.changed(); }, [METHOD, SOURCES]);
	await s2.click('#mdeSave');
	await s2.waitForTimeout(1200);
	await command(s2, 'nl/' + slug2, 'status_change_review');
	for (const name of ['ahmed', 'lotte', 'joris']) {
		const p = await login(browser, base, name, DESKTOP);
		await p.goto(base + 'nl/' + slug2);
		await command(p, 'nl/' + slug2, 'approve', [0, 1, 2, 3, 4].map(i => ['md_statute[]', String(i)]));
		await p.context().close();
	}
	await s2.goto(base + 'nl/' + slug2);
	await command(s2, 'nl/' + slug2, 'status_change_published');
	await s2.goto(base + 'nl/' + slug2);
	await s2.evaluate(() => { const d = document.getElementById('mdeWithdraw'); if (d) d.hidden = false; });
	await s2.fill('#mdeWithdraw textarea', 'Het bedrag dat over is, klopte niet: het is € 2.400.').catch(() => {});
	await shot(s2, 'terugtrekken', { element: '#mdeWithdraw' }).catch(e => console.log('  (no withdraw dialog: ' + e.message.split('\n')[0] + ')'));
	console.log('  withdraw: ' + await command(s2, 'nl/' + slug2, 'md_withdraw', [['md_reason', 'Het bedrag dat over was, klopte niet: het was € 2.400.']]));
	await s2.context().close();
	const r2 = await browser.newContext({ viewport: DESKTOP, locale: 'nl-NL' });
	const rp = await r2.newPage();
	await rp.goto(base + 'nl/' + slug2);
	await shot(rp, 'artikel-teruggetrokken');
	await r2.close();
}

await browser.close();
console.log(`${made.length} screenshots`);
void PASSWORD;
void slugOf;
