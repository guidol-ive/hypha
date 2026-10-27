//
// Browser Markdown parsers: CommonMark 0.31.2 conformance, GFM extensions, speed,
// and parity with league/commonmark on the sample articles (preview equals published article).
//
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
import { marked } from 'marked';
import MarkdownIt from 'markdown-it';
import * as commonmark from 'commonmark';

const D = new URL('../data/', import.meta.url);
const spec = JSON.parse(fs.readFileSync(new URL('spec.json', D)));
const gfmTxt = fs.readFileSync(new URL('gfm-spec.txt', D), 'utf8');
const league = JSON.parse(fs.readFileSync(new URL('league-corpus.json', D)));
const { document } = new JSDOM('').window;

const BLOCK = new Set(['p', 'li', 'ul', 'ol', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'pre', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'hr', 'div']);
function canon(html) {
	const t = document.createElement('template'); t.innerHTML = html;
	const walk = (n, pre) => [...n.childNodes].map(c => {
		if (c.nodeType === 3) return (pre ? c.data : c.data.replace(/\s+/g, ' ')).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
		if (c.nodeType !== 1) return '';
		const tag = c.tagName.toLowerCase();
		const a = [...c.attributes].map(x => [x.name, x.value]).sort().map(([k, v]) => ` ${k}="${v.replace(/"/g, '&quot;')}"`).join('');
		let inner = walk(c, pre || tag === 'pre'); if (BLOCK.has(tag)) inner = inner.trim();
		return (BLOCK.has(tag) ? '\n' : '') + `<${tag}${a}>${inner}</${tag}>`;
	}).join('');
	return walk(t.content, false).trim();
}
const cmReader = new commonmark.Parser(), cmWriter = new commonmark.HtmlRenderer();
const md = new MarkdownIt('commonmark'), mdGfm = new MarkdownIt({ html: true, linkify: true });
const cands = {
	'marked 12 (gfm)': s => marked.parse(s, { gfm: true }),
	'marked 12 (pedantic uit, gfm uit)': s => marked.parse(s, { gfm: false }),
	'markdown-it 14 (commonmark)': s => md.render(s),
	'commonmark.js 0.31': s => cmWriter.render(cmReader.parse(s)),
};
const out = { spec: {}, gfm: {}, parity: {}, speed: {} };
for (const [k, f] of Object.entries(cands)) {
	let pass = 0; const bad = {};
	for (const ex of spec) { let g; try { g = f(ex.markdown); } catch { g = ''; } if (canon(g) === canon(ex.html)) pass++; else bad[ex.section] = (bad[ex.section] || 0) + 1; }
	out.spec[k] = { pass, total: spec.length, pct: +(100 * pass / spec.length).toFixed(1), worst: Object.entries(bad).sort((a, b) => b[1] - a[1]).slice(0, 4) };
}
const ext = [...gfmTxt.matchAll(/^`{32} example( [a-z]+)?\n([\s\S]*?)^\.\n([\s\S]*?)^`{32}$/gm)].filter(m => (m[1] || '').trim());
for (const [k, f] of Object.entries({ 'marked 12 (gfm)': cands['marked 12 (gfm)'], 'markdown-it 14 (default, linkify)': s => mdGfm.render(s) })) {
	let pass = 0; for (const m of ext) { const s = m[2].replace(/→/g, '\t'), h = m[3].replace(/→/g, '\t'); let g; try { g = f(s); } catch { g = ''; } if (canon(g) === canon(h)) pass++; }
	out.gfm[k] = { pass, total: ext.length };
}
//
// Parity on the sample articles: block-level differences with league/commonmark.
//
for (const [k, f] of Object.entries({ 'marked 12 (gfm)': cands['marked 12 (gfm)'], 'markdown-it 14 (default)': s => mdGfm.render(s), 'commonmark.js 0.31': cands['commonmark.js 0.31'] })) {
	out.parity[k] = {};
	for (const doc of ['start', 'plaktest']) {
		const a = canon(league[doc]).split('\n'), b = canon(f(fs.readFileSync(new URL(doc + '.md', D), 'utf8'))).split('\n');
		const diff = []; for (let i = 0; i < Math.max(a.length, b.length); i++) if (a[i] !== b[i]) diff.push([a[i], b[i]]);
		out.parity[k][doc] = { blocks: a.length, different: diff.length, first: diff.slice(0, 2).map(([x, y]) => [String(x).slice(0, 110), String(y).slice(0, 110)]) };
	}
}
const long = (fs.readFileSync(new URL('start.md', D), 'utf8') + '\n\n' + fs.readFileSync(new URL('plaktest.md', D), 'utf8') + '\n\n').repeat(11);
for (const [k, f] of Object.entries(cands)) { const t = []; for (let i = 0; i < 9; i++) { const t0 = performance.now(); f(long); t.push(performance.now() - t0); } t.sort((a, b) => a - b); out.speed[k] = +t[4].toFixed(1) + ' ms / 6k woorden'; }
console.log(JSON.stringify(out, null, 1));
