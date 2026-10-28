//
// The title and excerpt of the article head follow their text, also when the width changes: measured while narrow,
// the excerpt stayed 770 px high in a wide window (#520).
//
import { login, newArticle, assert } from './helpers.mjs';

export default async function (t) {
	const { browser, base } = t;
	t.test('the excerpt shrinks to its text when its column gets wider', async () => {
		const page = await login(browser, base, 'lotte');
		await newArticle(page, base, 'Kop proef');
		// Measured while the column of the excerpt is very narrow, as while the editor is being built.
		const narrow = await page.evaluate(() => { const e = window.hyphaMdeditor.editor; const column = document.querySelector('.wh-ex'); column.style.maxWidth = '30px'; e.fields.excerpt = 'Volgens een verzonnen krant regelde de raad een verzonnen kandidaat.'; e.renderHead(); const h = document.getElementById('mdeExcerpt').getBoundingClientRect().height; column.style.maxWidth = ''; return h; });
		await page.waitForTimeout(300);
		const [height, needed] = await page.evaluate(() => { const el = document.getElementById('mdeExcerpt'); const h = el.getBoundingClientRect().height; el.style.height = 'auto'; const n = el.scrollHeight; return [h, n]; });
		assert(height <= needed + 4, `excerpt ${Math.round(height)} px high at full width, its text needs ${needed} px (narrow: ${Math.round(narrow)} px)`);
		assert(!page.errors.length, page.errors.join('\n'));
		await page.context().close();
	});
}
