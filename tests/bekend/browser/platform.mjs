//
// Known bugs of the platform that need a browser: the JavaScript twin of validatePagename() in the new page popup.
//
import { assert, login } from '../../browser/e2e/helpers.mjs';

export default async function (t) {
	t.knownBug(543, 'the name field of the new page popup keeps letters outside ASCII', async () => {
		const page = await login(t.browser, t.base, 'sanne');
		try {
			const value = await page.evaluate(() => {
				// The field as the popup has it: validatePagename() runs on every key press.
				const field = document.createElement('input');
				document.body.appendChild(field);
				field.value = 'Brasserie Ëenhoorn';
				field.setSelectionRange(field.value.length, field.value.length);
				validatePagename(field);
				return field.value;
			});
			assert(value === 'Brasserie Ëenhoorn', `validatePagename() made ${JSON.stringify(value)} of "Brasserie Ëenhoorn"`);
		}
		finally {
			await page.context().close();
		}
	});
}
