//
// Paste from Word, Google Docs and LibreOffice: converts the HTML on the clipboard to Hypha-Markdown.
// Keeps bold, italic, headings 1 to 3, tables, formulas, bulleted and numbered lists and links, and drops
// the rest of the layout (fonts, colours, spacing). Plain JavaScript without dependencies, so the editor
// and the test page (plaktest.html) use the same code.
//
// Usage: HyphaPlakken.toMarkdown(html) → { md, notes, images }.
//   md:     the Markdown;
//   notes:  Dutch messages for the author, for example when an image could not be taken over;
//   images: images that came with the clipboard as data or a web address: { key, src }.
//
(function (global) {
'use strict';

const BLOCKS = new Set(['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'table', 'blockquote', 'pre', 'hr', 'section', 'article', 'header', 'footer', 'center']);
const BLOCK_SEL = [...BLOCKS].join(',');
const DROP = new Set(['head', 'style', 'script', 'title', 'meta', 'link', 'xml', 'template', 'colgroup', 'col', 'o:p', 'sdfield', 'noscript', 'button', 'input', 'select', 'textarea']);
const NOTE_IMAGE = 'Een afbeelding is niet overgenomen; voeg haar toe met Beeld….';
const NOTE_FORMULA = 'Een formule kwam alleen als plaatje mee en is niet overgenomen; typ haar opnieuw met Formule.';
const NOTE_MERGED = 'Een tabel had samengevoegde cellen; die zijn gesplitst.';

const nameOf = n => n.nodeName.toLowerCase();
const styleOf = el => (el.getAttribute && el.getAttribute('style') || '').toLowerCase();
function prop(st, name) {
	const m = new RegExp('(?:^|;)\\s*' + name + '\\s*:\\s*([^;]+)').exec(st);
	return m ? m[1].trim().replace(/\s*!important$/, '') : '';
}

//
// Word puts the fallback picture of an equation between <![if !msEquation]> and <![endif]>. The HTML parser
// keeps the content of such a block, so it is removed here, including the blocks nested in it. The equation
// itself (OMML) is in a conditional comment, which becomes an <x-omml> element.
//
function preclean(html) {
	html = html.replace(/<!--\[if gte msEquation 12\]>([\s\S]*?)<!\[endif\]-->/g, '<x-omml>$1</x-omml>');
	let out = '', i = 0, m;
	const start = /<!\[if !msEquation\]>/g;
	while ((m = start.exec(html))) {
		out += html.slice(i, m.index);
		const tok = /<!\[if [^\]]*\]>|<!\[endif\]>/g;
		tok.lastIndex = start.lastIndex;
		let depth = 1, t = null;
		while (depth && (t = tok.exec(html))) depth += t[0] === '<![endif]>' ? -1 : 1;
		i = t ? tok.lastIndex : html.length;
		start.lastIndex = i;
	}
	return out + html.slice(i);
}

//
// Bold and italic come from elements (b, strong, i, em) and from styles (Google Docs and LibreOffice use
// font-weight and font-style on a span). A style wins over the element: Google Docs wraps everything in
// <b style="font-weight:normal">, which is not bold.
//
function flags(el, f) {
	const t = nameOf(el), st = styleOf(el);
	let b = f.b, i = f.i;
	if (t === 'b' || t === 'strong') b = true;
	if (t === 'i' || t === 'em') i = true;
	const fw = prop(st, 'font-weight');
	if (fw) b = fw === 'bold' || fw === 'bolder' || +fw >= 600;
	const fs = prop(st, 'font-style');
	if (fs) i = fs === 'italic' || fs === 'oblique';
	if (f.heading) b = false;
	return { ...f, b, i };
}
function dropped(el) {
	const t = nameOf(el), st = styleOf(el);
	if (DROP.has(t) || /^(v|w):/.test(t)) return true;
	if (prop(st, 'display') === 'none' || /mso-hide\s*:\s*all/.test(st)) return true;
	if (/mso-element\s*:\s*(comment|footnote|endnote|header|footer)/.test(st)) return true;
	if (/^(header|footer)$/i.test(el.getAttribute('title') || '')) return true;
	if (/MsoCommentReference/.test(el.getAttribute('class') || '')) return true;
	return false;
}
const isListMarker = el => /mso-list\s*:\s*ignore/.test(styleOf(el));

//
// Markdown escapes for plain text: characters that would otherwise become layout, a link or a formula.
//
const escText = s => s.replace(/([\\`*_\[\]<>$|])/g, '\\$1');
const escLineStart = s => s.replace(/^(#{1,6}(?=\s)|>|[-+](?=\s)|=+\s*$)/, '\\$1').replace(/^(\d+)([.)])(?=\s)/, '$1\\$2');

//
// OMML (Word equations) to LaTeX, for the constructions in the acceptance criteria: fractions, powers and
// indices, roots, sums and integrals with limits, brackets, functions, accents, matrices, Greek letters
// and the usual operators.
//
const SYM = {
	'α': '\\alpha', 'β': '\\beta', 'γ': '\\gamma', 'δ': '\\delta', 'ε': '\\varepsilon', 'ϵ': '\\epsilon', 'ζ': '\\zeta', 'η': '\\eta',
	'θ': '\\theta', 'ι': '\\iota', 'κ': '\\kappa', 'λ': '\\lambda', 'μ': '\\mu', 'ν': '\\nu', 'ξ': '\\xi', 'π': '\\pi', 'ρ': '\\rho',
	'σ': '\\sigma', 'τ': '\\tau', 'υ': '\\upsilon', 'φ': '\\varphi', 'ϕ': '\\phi', 'χ': '\\chi', 'ψ': '\\psi', 'ω': '\\omega',
	'Γ': '\\Gamma', 'Δ': '\\Delta', 'Θ': '\\Theta', 'Λ': '\\Lambda', 'Ξ': '\\Xi', 'Π': '\\Pi', 'Σ': '\\Sigma', 'Υ': '\\Upsilon',
	'Φ': '\\Phi', 'Ψ': '\\Psi', 'Ω': '\\Omega',
	'≈': '\\approx', '≤': '\\le', '≥': '\\ge', '≠': '\\ne', '×': '\\times', '·': '\\cdot', '⋅': '\\cdot', '±': '\\pm', '∓': '\\mp',
	'∞': '\\infty', '→': '\\to', '←': '\\leftarrow', '⇒': '\\Rightarrow', '⇔': '\\Leftrightarrow', '∈': '\\in', '∉': '\\notin',
	'⊂': '\\subset', '⊆': '\\subseteq', '∪': '\\cup', '∩': '\\cap', '∂': '\\partial', '∇': '\\nabla', '…': '\\ldots', '⋯': '\\cdots',
	'°': '^\\circ', '∑': '\\sum', '∏': '\\prod', '∫': '\\int', '√': '\\surd', '∀': '\\forall', '∃': '\\exists', '¬': '\\neg',
	'∧': '\\land', '∨': '\\lor', '≡': '\\equiv', '∝': '\\propto', '∘': '\\circ', '÷': '\\div', '−': '-', '′': "'", '%': '\\%',
	'#': '\\#', '&': '\\&', '{': '\\{', '}': '\\}', '$': '\\$', '_': '\\_', '\u00a0': ' '
};
const NARY = { '∑': '\\sum', '∏': '\\prod', '∐': '\\coprod', '∫': '\\int', '∬': '\\iint', '∭': '\\iiint', '∮': '\\oint', '⋃': '\\bigcup', '⋂': '\\bigcap' };
const ACC = { '\u0302': '\\hat', '^': '\\hat', '\u0303': '\\tilde', '~': '\\tilde', '\u0307': '\\dot', '\u0308': '\\ddot', '\u20d7': '\\vec', '\u0305': '\\bar', '¯': '\\bar', '\u0301': '\\acute', '\u0300': '\\grave' };
const FUNCS = new Set(['sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'log', 'ln', 'lg', 'exp', 'lim', 'max', 'min', 'sup', 'inf', 'det', 'arcsin', 'arccos', 'arctan', 'sinh', 'cosh', 'tanh']);
const DELIM = { '(': '(', ')': ')', '[': '[', ']': ']', '{': '\\{', '}': '\\}', '|': '|', '‖': '\\|', '⟨': '\\langle', '⟩': '\\rangle', '⌊': '\\lfloor', '⌋': '\\rfloor', '⌈': '\\lceil', '⌉': '\\rceil', '': '.' };

const kid = (el, nm) => [...el.children].find(c => nameOf(c) === nm);
//
// A property such as <m:chr m:val="∑"/>. The HTML parser does not know self-closing elements, so a property
// can end up inside the one before it; below the first step the search therefore goes through all descendants.
//
function mval(el, path) {
	let e = kid(el, path[0]);
	for (const p of path.slice(1)) e = e && [...e.getElementsByTagName('*')].find(c => nameOf(c) === p);
	return e ? (e.getAttribute('m:val') ?? e.getAttribute('val')) : null;
}
const grp = s => (s.length === 1 || /^\\[a-zA-Z]+$/.test(s)) ? s : `{${s}}`;
function texText(s, plain) {
	const t = s.replace(/[\u00a0]/g, ' ');
	if (plain && /^[A-Za-z]{2,}$/.test(t)) return FUNCS.has(t) ? `\\${t} ` : `\\text{${t}}`;
	return [...t].map(c => SYM[c] ? SYM[c] + (/^\\[a-zA-Z]+$/.test(SYM[c]) ? ' ' : '') : c).join('');
}
function omml(node) {
	let out = '';
	for (const n of node.childNodes) {
		if (n.nodeType !== 1) continue;
		const t = nameOf(n);
		if (!t.startsWith('m:')) { out += omml(n); continue; }
		const sub = nm => { const c = kid(n, nm); return c ? omml(c).trim() : ''; };
		switch (t) {
			case 'm:r': {
				const plain = mval(n, ['m:rpr', 'm:sty']) === 'p' || !!kid(kid(n, 'm:rpr') || n, 'm:nor');
				const txt = [...n.childNodes].filter(c => !/pr$/.test(nameOf(c))).map(c => c.textContent).join('');
				out += texText(txt, plain);
				break;
			}
			case 'm:f': out += mval(n, ['m:fpr', 'm:type']) === 'lin' ? `${grp(sub('m:num'))}/${grp(sub('m:den'))}` : `\\frac{${sub('m:num')}}{${sub('m:den')}}`; break;
			case 'm:ssup': out += `${grp(sub('m:e'))}^${grp(sub('m:sup'))}`; break;
			case 'm:ssub': out += `${grp(sub('m:e'))}_${grp(sub('m:sub'))}`; break;
			case 'm:ssubsup': out += `${grp(sub('m:e'))}_${grp(sub('m:sub'))}^${grp(sub('m:sup'))}`; break;
			case 'm:spre': out += `{}_${grp(sub('m:sub'))}^${grp(sub('m:sup'))}${sub('m:e')}`; break;
			case 'm:rad': { const d = mval(n, ['m:radpr', 'm:deghide']); const deg = sub('m:deg'); out += (d === '1' || d === 'on' || !deg) ? `\\sqrt{${sub('m:e')}}` : `\\sqrt[${deg}]{${sub('m:e')}}`; break; }
			case 'm:nary': {
				const chr = mval(n, ['m:narypr', 'm:chr']) ?? '∫', lo = sub('m:sub'), hi = sub('m:sup');
				out += (NARY[chr] || chr) + (lo ? `_${grp(lo)}` : '') + (hi ? `^${grp(hi)}` : '') + ' ' + sub('m:e') + ' ';
				break;
			}
			case 'm:d': {
				const beg = mval(n, ['m:dpr', 'm:begchr']) ?? '(', end = mval(n, ['m:dpr', 'm:endchr']) ?? ')', sep = mval(n, ['m:dpr', 'm:sepchr']) ?? '|';
				const parts = [...n.children].filter(c => nameOf(c) === 'm:e').map(c => omml(c).trim());
				const l = DELIM[beg] ?? beg, r = DELIM[end] ?? end;
				out += (beg === '(' && end === ')' && !/\\(frac|begin|sum|int|prod)/.test(parts.join(''))) ? `(${parts.join(sep)})` : `\\left${l}${parts.join(` ${DELIM[sep] ?? sep} `)}\\right${r}`;
				break;
			}
			case 'm:func': { const fn = sub('m:fname').trim(); out += (/^[a-z]+$/.test(fn) ? (FUNCS.has(fn) ? `\\${fn}` : `\\operatorname{${fn}}`) : fn.replace(/\\text\{(\w+)\}/, '\\operatorname{$1}')) + ' ' + grp(sub('m:e')); break; }
			case 'm:acc': { const c = mval(n, ['m:accpr', 'm:chr']) ?? '\u0302'; out += `${ACC[c] || '\\hat'}{${sub('m:e')}}`; break; }
			case 'm:bar': out += (mval(n, ['m:barpr', 'm:pos']) === 'top' ? '\\overline' : '\\underline') + `{${sub('m:e')}}`; break;
			case 'm:limlow': { const e = sub('m:e'), lim = sub('m:lim'); out += /^\\lim\s*$|^\\text\{lim\}$|^lim$/.test(e) ? `\\lim_${grp(lim)} ` : `\\underset{${lim}}{${e}}`; break; }
			case 'm:limupp': out += `\\overset{${sub('m:lim')}}{${sub('m:e')}}`; break;
			case 'm:m': out += '\\begin{matrix} ' + [...n.children].filter(c => nameOf(c) === 'm:mr').map(r => [...r.children].filter(c => nameOf(c) === 'm:e').map(c => omml(c).trim()).join(' & ')).join(' \\\\ ') + ' \\end{matrix}'; break;
			case 'm:eqarr': out += '\\begin{gathered} ' + [...n.children].filter(c => nameOf(c) === 'm:e').map(c => omml(c).trim()).join(' \\\\ ') + ' \\end{gathered}'; break;
			case 'm:t': out += texText(n.textContent, false); break;
			default:
				if (/pr$/.test(t)) break;
				out += omml(n);
		}
	}
	return out;
}
const tidyTex = s => s.replace(/\s+/g, ' ').replace(/ ([}^_)\]]|$)/g, '$1').replace(/([{(\[]) /g, '$1').trim();
const isDisplayOmml = el => !!el.querySelector && [...el.getElementsByTagName('*')].some(c => nameOf(c) === 'm:omathpara');

//
// Inline content as segments: text with its bold and italic flags, or raw Markdown (links, formulas,
// images, line breaks). Rendering the segments puts the ** and * around runs, with spaces outside the markers.
//
function inlineNode(n, f, segs, ctx) {
	if (n.nodeType === 3) { segs.push({ k: 'text', s: n.nodeValue.replace(/[ \t\r\n\u00a0]+/g, ' '), b: f.b, i: f.i }); return; }
	if (n.nodeType !== 1 || dropped(n) || isListMarker(n)) return;
	const t = nameOf(n);
	if (t === 'x-omml') {
		const tex = tidyTex(omml(n));
		if (tex) segs.push({ k: 'raw', s: `$${tex}$` });
		return;
	}
	if (t === 'br') { segs.push({ k: 'br' }); return; }
	if (t === 'img') { image(n, segs, ctx); return; }
	if (t === 'a' && n.getAttribute('href')) {
		const href = n.getAttribute('href');
		const inner = [];
		for (const c of n.childNodes) inlineNode(c, flags(n, f), inner, ctx);
		const text = render(inner);
		if (!text) return;
		if (/^(https?:|mailto:)/i.test(href)) segs.push({ k: 'raw', s: `[${text}](${href.replace(/[ ()]/g, c => encodeURIComponent(c))})` });
		else segs.push({ k: 'raw', s: text });
		return;
	}
	const g = flags(n, f);
	for (const c of n.childNodes) inlineNode(c, g, segs, ctx);
}
function image(n, segs, ctx) {
	const src = n.getAttribute('src') || '';
	//
	// LibreOffice gives a formula (a Math object) as a picture named Object1, Object2, …
	//
	if (/^Object\d+$/.test(n.getAttribute('name') || '')) { segs.push({ k: 'raw', s: '$\\text{formule niet overgenomen}$' }); ctx.notes.add(NOTE_FORMULA); return; }
	const alt = escText((n.getAttribute('alt') || '').replace(/\s+/g, ' ').trim());
	if (/^data:image\//i.test(src)) {
		const ext = (/^data:image\/(png|jpe?g|gif|webp)/i.exec(src) || [0, 'png'])[1].replace('jpeg', 'jpg');
		const key = `beeld/geplakt-${++ctx.imageNo}.${ext}`;
		ctx.images.push({ key, src });
		segs.push({ k: 'raw', s: `![${alt}](${key})` });
	} else if (/^https:/i.test(src)) {
		ctx.images.push({ key: src, src });
		segs.push({ k: 'raw', s: `![${alt}](${src})` });
	} else ctx.notes.add(NOTE_IMAGE);
}
function render(segs) {
	let out = '', ws = '';
	const cur = { b: false, i: false };
	const closing = to => { let s = ''; if (cur.i && (!to.i || cur.b !== to.b)) { s += '*'; cur.i = false; } if (cur.b && !to.b) { s += '**'; cur.b = false; } return s; };
	const opening = to => { let s = ''; if (to.b && !cur.b) { s += '**'; cur.b = true; } if (to.i && !cur.i) { s += '*'; cur.i = true; } return s; };
	const none = { b: false, i: false };
	for (const g of segs) {
		if (g.k === 'br') { out += closing(none) + '\\\n'; ws = ''; continue; }
		if (g.k === 'raw') { out += closing(none) + ws + g.s; ws = ''; continue; }
		const m = /^( *)([\s\S]*?)( *)$/.exec(g.s);
		if (!m[2]) { ws += m[1] + m[3]; continue; }
		const cl = closing(g);
		out += cl + (ws || m[1] ? ' ' : '') + opening(g) + escText(m[2]);
		ws = m[3];
	}
	out += closing(none);
	return out.replace(/^(\\\n| )+/, '').replace(/(\\\n| )+$/, '').replace(/ +(\\\n)/g, '$1').replace(/ {2,}/g, ' ');
}

//
// Block structure. Inline content directly in a container (as in the wrapper of Google Docs) is gathered
// into a paragraph until the next block.
//
function blocks(node, f, out, ctx) {
	let pending = [];
	const flush = () => { const md = render(pending); if (md) out.push({ type: 'p', md }); pending = []; };
	for (const n of node.childNodes) {
		if (n.nodeType === 3) { if (n.nodeValue.trim() || pending.length) inlineNode(n, f, pending, ctx); continue; }
		if (n.nodeType !== 1 || dropped(n)) continue;
		const t = nameOf(n);
		if (t === 'br') { if (pending.some(s => s.k !== 'text' || s.s.trim())) pending.push({ k: 'br' }); continue; }
		const block = BLOCKS.has(t), hasBlock = !!n.querySelector(BLOCK_SEL);
		if (!block && !hasBlock) { inlineNode(n, f, pending, ctx); continue; }
		flush();
		const g = flags(n, f);
		if (/^h[1-6]$/.test(t)) {
			const md = inline(n, { ...g, heading: true }, ctx);
			if (md) out.push({ type: 'h', level: { 1: 3, 2: 4, 3: 5 }[t[1]] || 6, md: md.replace(/\\\n/g, ' ') });
		} else if (t === 'ul' || t === 'ol') listItems(n, 0, g, out, ctx);
		else if (t === 'li') listItems({ childNodes: [n], nodeName: 'UL', getAttribute: () => null }, 0, g, out, ctx);
		else if (t === 'table') table(n, g, out, ctx);
		else if (t === 'pre') out.push({ type: 'code', md: n.textContent.replace(/\n$/, '') });
		else if (t === 'hr') out.push({ type: 'hr' });
		else if ((t === 'p' || t === 'div') && !hasBlock) paragraph(n, g, out, ctx);
		else blocks(n, g, out, ctx);
	}
	flush();
}
function inline(el, f, ctx) {
	const segs = [];
	for (const c of el.childNodes) inlineNode(c, f, segs, ctx);
	return render(segs);
}
function paragraph(n, f, out, ctx) {
	//
	// Word: a list item is a paragraph with mso-list:l0 level2 lfo1 and a marker in a span with mso-list:Ignore.
	//
	const ml = prop(styleOf(n), 'mso-list');
	const lv = /level(\d+)/.exec(ml);
	if (lv && !/^(none|ignore)$/.test(ml)) {
		const mk = [...n.getElementsByTagName('*')].find(isListMarker);
		const marker = mk ? mk.textContent.replace(/[\s\u00a0]+/g, '') : '';
		const ordered = /^\(?([0-9]+|[a-zA-Z]|[ivxlcdmIVXLCDM]+)[.)]$/.test(marker);
		const num = /^\(?(\d+)[.)]$/.exec(marker);
		const md = inline(n, f, ctx);
		if (md) out.push({ type: 'li', level: +lv[1] - 1, ordered, num: num ? +num[1] : null, md });
		return;
	}
	//
	// A paragraph with only a Word equation in display mode (m:oMathPara) becomes a $$ block.
	//
	const eqs = [...n.getElementsByTagName('x-omml')];
	if (eqs.length === 1 && isDisplayOmml(eqs[0]) && !n.querySelector('img')) {
		const rest = n.textContent.replace(eqs[0].textContent, '').replace(/[\s\u00a0]+/g, '');
		const tex = tidyTex(omml(eqs[0]));
		if (!rest && tex) { out.push({ type: 'math', md: tex }); return; }
	}
	const md = inline(n, f, ctx);
	if (md) out.push({ type: 'p', md });
}
//
// Lists from <ul> and <ol>, nested in the usual way, or the way LibreOffice (<ul><ul><li>) and Google Docs
// (a <ul> next to the <li>, and aria-level) do it.
//
function listItems(list, level, f, out, ctx) {
	const ordered = nameOf(list) === 'ol';
	let first = true;
	const start = list.getAttribute('start');
	for (const c of list.childNodes) {
		if (c.nodeType !== 1 || dropped(c)) continue;
		const t = nameOf(c);
		if (t === 'ul' || t === 'ol') { listItems(c, level + 1, f, out, ctx); continue; }
		if (t !== 'li') continue;
		const aria = +c.getAttribute('aria-level');
		const lvl = aria ? aria - 1 : level;
		const lst = prop(styleOf(c), 'list-style-type');
		const ord = lst ? !/^(disc|circle|square|none)$/.test(lst) : ordered;
		const segs = [], nested = [];
		const g = flags(c, f);
		for (const k of c.childNodes) {
			if (k.nodeType === 1 && (nameOf(k) === 'ul' || nameOf(k) === 'ol')) { nested.push(k); continue; }
			if (k.nodeType === 1 && BLOCKS.has(nameOf(k))) {
				if (segs.length) segs.push({ k: 'br' });
				for (const x of k.childNodes) inlineNode(x, flags(k, g), segs, ctx);
			} else inlineNode(k, g, segs, ctx);
		}
		const md = render(segs);
		const num = first && ord ? (+c.getAttribute('value') || +start || null) : (+c.getAttribute('value') || null);
		if (md) out.push({ type: 'li', level: lvl, ordered: ord, num, md, fromStart: first });
		first = false;
		for (const k of nested) listItems(k, lvl + 1, g, out, ctx);
	}
}
function table(n, f, out, ctx) {
	const rows = [], align = [];
	for (const tr of n.querySelectorAll('tr')) {
		if (tr.closest('table') !== n) continue;
		const row = [];
		for (const cell of tr.children) {
			if (!/^t[hd]$/.test(nameOf(cell))) continue;
			const parts = [];
			const sub = [];
			blocks(cell, flags(cell, f), sub, ctx);
			for (const b of sub) parts.push(b.md || '');
			const al = (cell.getAttribute('align') || prop(styleOf(cell), 'text-align') || [...cell.querySelectorAll('p,div')].map(p => p.getAttribute('align') || prop(styleOf(p), 'text-align')).find(Boolean) || '').toLowerCase();
			if (rows.length && align[row.length] === undefined) align[row.length] = al;
			row.push(parts.join(' ').replace(/\\\n/g, ' ').replace(/\n/g, ' ').trim());
			const span = +cell.getAttribute('colspan') || 1;
			if (span > 1) { ctx.notes.add(NOTE_MERGED); for (let k = 1; k < span; k++) row.push(''); }
		}
		if (row.length) rows.push(row);
	}
	if (rows.length) out.push({ type: 'table', rows, align });
}

//
// Blocks to Markdown text. A nested list item is indented to the text of its parent: two spaces under '-',
// three under '1.'.
//
function toText(list) {
	const parts = [];
	let i = 0;
	while (i < list.length) {
		const b = list[i];
		if (b.type === 'li') {
			const lines = [], stack = [];
			let prevType = null;
			while (i < list.length && list[i].type === 'li') {
				const it = list[i++];
				const L = Math.min(it.level, stack.length);
				stack.length = Math.min(stack.length, L + 1);
				let s = stack[L];
				if (!s || s.ordered !== it.ordered) { s = { ordered: it.ordered, n: it.ordered ? (it.num || 1) : 0 }; stack[L] = s; }
				else if (it.ordered) s.n = s.n + 1;
				//
				// An ordered list that starts at a number other than 1 cannot follow another list directly:
				// CommonMark would read it as text of the item before. A blank line keeps them apart.
				//
				if (L === 0 && lines.length && it.ordered !== prevType) lines.push('');
				prevType = L === 0 ? it.ordered : prevType;
				const marker = it.ordered ? `${s.n}.` : '-';
				const indent = stack.slice(0, L).reduce((w, x) => w + x.w, 0);
				s.w = marker.length + 1;
				lines.push(' '.repeat(indent) + marker + ' ' + it.md.replace(/\\\n/g, '\\\n' + ' '.repeat(indent + s.w)));
			}
			parts.push(lines.join('\n'));
			continue;
		}
		i++;
		if (b.type === 'p') parts.push(escLineStart(b.md));
		else if (b.type === 'h') parts.push('#'.repeat(b.level) + ' ' + b.md);
		else if (b.type === 'math') parts.push('$$\n' + b.md + '\n$$');
		else if (b.type === 'code') parts.push('```\n' + b.md + '\n```');
		else if (b.type === 'hr') parts.push('---');
		else if (b.type === 'table') {
			const w = Math.max(...b.rows.map(r => r.length));
			const line = r => '| ' + Array.from({ length: w }, (x, k) => r[k] || '').join(' | ') + ' |';
			const sep = '| ' + Array.from({ length: w }, (x, k) => ({ right: '---:', center: ':---:' }[b.align[k]] || '---')).join(' | ') + ' |';
			parts.push([line(b.rows[0]), sep, ...b.rows.slice(1).map(line)].join('\n'));
		}
	}
	return parts.join('\n\n');
}

function toMarkdown(html, opts = {}) {
	const doc = new DOMParser().parseFromString(preclean(html), 'text/html');
	const ctx = { notes: new Set(), images: [], imageNo: opts.imageNo || 0 };
	const out = [];
	blocks(doc.body, { b: false, i: false }, out, ctx);
	return { md: toText(out), notes: [...ctx.notes], images: ctx.images };
}

global.HyphaPlakken = { toMarkdown, ommlToTex: el => tidyTex(omml(el)) };
})(typeof window !== 'undefined' ? window : globalThis);
