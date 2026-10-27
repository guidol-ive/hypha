//
// The fixed Frontmatter of an article in the Markdown view (design section 9, BR-38): titel, auteur, uittreksel and
// rubriek on one line each, tags as a list, the four properties of the image with the excerpt, and bijsluiter and
// bronnen as blocks of several lines. The names are part of the format (Hypha-Markdown 1.0), so they stay Dutch in
// every interface language. Properties Hypha does not know are kept below the fixed ones.
//
export const FRONT_RE = /^---[ \t]*\n[\s\S]*?\n---[ \t]*(\n|$)/;

export function yamlString(v) {
	v = String(v ?? '');
	return /[:#\[\]{},'"\n&*!|>%@`]|^\s|\s$|^$|^-/.test(v) ? JSON.stringify(v) : v;
}

function yamlBlock(key, v) {
	v = String(v || '').replace(/\s+$/, '');
	return v ? [`${key}: |`, ...v.split('\n').map(l => l ? '  ' + l : '')] : [`${key}: ""`];
}

//
// The Frontmatter of an article (kind 'article') or a text page (kind 'page': only the title).
//
export function frontText(f, kind = 'article') {
	if (kind !== 'article') return ['---', `titel: ${yamlString(f.title)}`, '---', '', ''].join('\n');
	return ['---', `titel: ${yamlString(f.title)}`, `auteur: ${yamlString(f.author)}`, `uittreksel: ${yamlString(f.excerpt)}`, `rubriek: ${yamlString(f.section)}`, 'tags:',
		...(f.tags || []).map(t => `  - ${yamlString(t)}`),
		`afbeelding: ${yamlString(f.image)}`, `beschrijving: ${yamlString(f.imageAlt)}`, `bijschrift: ${yamlString(f.imageCaption)}`, `fotograaf: ${yamlString(f.imageCredit)}`,
		...yamlBlock('bijsluiter', f.method), ...yamlBlock('bronnen', f.sources),
		...(f.frontmatter ? f.frontmatter.split('\n') : []), '---', '', ''].join('\n');
}

function unquote(v) {
	v = v.trim();
	if (/^".*"$/.test(v)) { try { return JSON.parse(v); } catch (e) { return v.slice(1, -1); } }
	return v.replace(/^'(.*)'$/, '$1').replace(/''/g, "'");
}

const KEYS = { titel: 'title', auteur: 'author', uittreksel: 'excerpt', rubriek: 'section', tags: 'tags', afbeelding: 'image', beschrijving: 'imageAlt', bijschrift: 'imageCaption', fotograaf: 'imageCredit', bijsluiter: 'method', bronnen: 'sources' };

//
// Reads the Frontmatter back. Returns { ok, fields, extra, body, line, reason }: on an error the line number and the
// reason, so the checklist can say what to fix while the last good values stay (BR-38, soft while typing).
// HedgeDoc names (title, tags, description, lang, robots) are accepted: title and tags fill the fixed fields.
//
export function parseFront(text) {
	const m = text.match(/^---[ \t]*\n([\s\S]*?)\n---[ \t]*(\n|$)/);
	if (!m) return { ok: false, body: text, line: 1, reason: 'front-fence' };
	const props = {}, order = [];
	let list = null, block = null, n = 1;
	const extra = [];
	for (const line of m[1].split('\n')) {
		n++;
		let k;
		if (block && (/^ {2}/.test(line) || !line.trim())) { props[block].push(line.replace(/^ {2}/, '')); if (!KEYS[block]) extra.push(line); continue; }
		if (block) { props[block] = props[block].join('\n').replace(/\s+$/, ''); block = null; }
		if ((k = line.match(/^\s+-\s*(.*)$/)) && list) { props[list].push(unquote(k[1])); if (!KEYS[list] && list !== 'title') extra.push(line); continue; }
		if ((k = line.match(/^([\w-]+):\s*(.*)$/))) {
			const key = k[1], val = k[2].trim();
			order.push(key);
			if (!KEYS[key] && key !== 'title') extra.push(line);
			if (val === '|' || val === '|-' || val === '>') { props[key] = []; block = key; list = null; }
			else if (val === '') { props[key] = []; list = key; }
			else if (/^\[.*\]$/.test(val)) { props[key] = val.slice(1, -1).split(',').map(unquote).filter(Boolean); list = null; }
			else { props[key] = unquote(val); list = null; }
			continue;
		}
		if (line.trim()) return { ok: false, body: text.slice(m[0].length).replace(/^\n/, ''), line: n, reason: 'front-line', detail: line.trim() };
	}
	if (block) props[block] = props[block].join('\n').replace(/\s+$/, '');
	const fields = {};
	for (const [dutch, key] of Object.entries(KEYS)) if (dutch in props) fields[key] = props[dutch];
	if (!('title' in fields) && 'title' in props) fields.title = props.title;
	if (fields.tags && !Array.isArray(fields.tags)) fields.tags = String(fields.tags).split(',').map(s => s.trim()).filter(Boolean);
	return { ok: true, fields, extra: extra.join('\n'), unknown: order.filter(k => !KEYS[k] && k !== 'title'), body: text.slice(m[0].length).replace(/^\n/, '') };
}
