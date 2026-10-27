//
// The visual view ('Opmaak') on ProseMirror (design section 13.7, decision T5): an own schema for Hypha-Markdown 1.0,
// the markdown-it tokens of hypha-markdown.js turned into a ProseMirror document, and an own serializer back to
// Markdown.
//
// Nothing is lost when switching (BR-75): every top-level block remembers the Markdown it came from. ProseMirror keeps
// an unchanged node as the same object, so a block the author did not touch is written back exactly as it was, with
// its own blank lines; only changed blocks are serialised, in the house style (lists with -, tables without padding,
// $$ on lines of their own). Source the view does not know (a definition list, a footnote over several lines) becomes
// a grey block 'bewerk in Markdown' with its source, and goes back unchanged.
//
import { model, markdown as pmMarkdown, tables } from 'prosemirror';
import { plainText, PLACEMENTS } from './hypha-markdown.js';

const { Schema, Fragment } = model;
const { MarkdownSerializer } = pmMarkdown;

//
// Attributes as one data attribute, so an atom survives copy and paste inside the editor (parseDOM reads it back).
//
const dataAttrs = node => ({ 'data-hypha': JSON.stringify(node.attrs) });
const fromData = dom => { try { return JSON.parse(dom.getAttribute('data-hypha') || '{}'); } catch (e) { return {}; } };
const atom = (group, tag, cls, attrs, extra = {}) => Object.assign({
	group, atom: true, selectable: true, draggable: group === 'block', attrs,
	toDOM: node => [tag, Object.assign({ class: cls, contenteditable: 'false' }, dataAttrs(node))],
	parseDOM: [{ tag: `${tag}.${cls.split(' ')[0]}`, getAttrs: fromData }],
}, extra, group === 'inline' ? { inline: true } : {});

const cellAlign = { default: null, getFromDOM: dom => dom.getAttribute('align') || null, setDOMAttr: (value, attrs) => { if (value) attrs.align = value; } };

export const schema = new Schema({
	nodes: Object.assign({
		doc: { content: 'block+' },
		paragraph: { group: 'block', content: 'inline*', toDOM: () => ['p', 0], parseDOM: [{ tag: 'p' }] },
		heading: { group: 'block', content: 'inline*', defining: true, attrs: { level: { default: 3 } },
			toDOM: n => ['h' + n.attrs.level, 0], parseDOM: [1, 2, 3, 4, 5, 6].map(l => ({ tag: 'h' + l, attrs: { level: l } })) },
		blockquote: { group: 'block', content: 'block+', defining: true, toDOM: () => ['blockquote', 0], parseDOM: [{ tag: 'blockquote:not(.callout)' }] },
		callout: { group: 'block', content: 'block+', defining: true, attrs: { type: { default: 'info' }, title: { default: '' }, hedgedoc: { default: false }, marker: { default: '' } },
			toDOM: n => [n.attrs.type === 'quote' ? 'blockquote' : 'aside', Object.assign({ class: 'callout ' + n.attrs.type }, dataAttrs(n)), ['div', { class: 'callout-body' }, 0]],
			parseDOM: [{ tag: 'aside.callout', getAttrs: fromData, contentElement: '.callout-body' }, { tag: 'blockquote.callout', getAttrs: fromData, contentElement: '.callout-body' }] },
		bullet_list: { group: 'block', content: 'list_item+', attrs: { tight: { default: true }, marker: { default: '-' } }, toDOM: () => ['ul', 0], parseDOM: [{ tag: 'ul' }] },
		ordered_list: { group: 'block', content: 'list_item+', attrs: { order: { default: 1 }, tight: { default: true }, marker: { default: '.' } },
			toDOM: n => ['ol', n.attrs.order === 1 ? {} : { start: n.attrs.order }, 0], parseDOM: [{ tag: 'ol', getAttrs: d => ({ order: +(d.getAttribute('start') || 1) }) }] },
		list_item: { content: 'paragraph block*', defining: true, attrs: { checked: { default: null } },
			toDOM: n => ['li', n.attrs.checked === null ? {} : { class: 'task', 'data-checked': String(n.attrs.checked) }, 0],
			parseDOM: [{ tag: 'li', getAttrs: d => ({ checked: d.hasAttribute('data-checked') ? d.getAttribute('data-checked') === 'true' : null }) }] },
		code_block: { group: 'block', content: 'text*', marks: '', code: true, defining: true, attrs: { info: { default: '' }, fence: { default: '```' } },
			toDOM: n => ['pre', Object.assign({ class: 'code' }, dataAttrs(n)), ['code', 0]], parseDOM: [{ tag: 'pre', preserveWhitespace: 'full', getAttrs: fromData }] },
		horizontal_rule: { group: 'block', attrs: { markup: { default: '---' } }, toDOM: () => ['hr'], parseDOM: [{ tag: 'hr' }] },
		figure: { group: 'block', content: 'inline*', defining: true, draggable: true,
			attrs: { src: { default: '' }, alt: { default: '' }, title: { default: '' }, width: { default: '' }, height: { default: '' }, placement: { default: 'breed' }, explicit: { default: false }, caption: { default: false } },
			toDOM: n => ['figure', Object.assign({ class: 'figure ' + n.attrs.placement }, dataAttrs(n)), ['img', { src: n.attrs.src, alt: n.attrs.alt, contenteditable: 'false' }], ['figcaption', 0]],
			parseDOM: [{ tag: 'figure.figure', getAttrs: fromData, contentElement: 'figcaption' }] },
		diagram: atom('block', 'figure', 'diagram', { info: { default: 'mermaid' }, text: { default: '' }, fence: { default: '```' } }),
		interactive: atom('block', 'div', 'interactive', { info: { default: 'html interactief' }, text: { default: '' }, fence: { default: '```' } }),
		math_block: atom('block', 'div', 'math math-block', { tex: { default: '' } }),
		html_block: atom('block', 'div', 'raw html', { source: { default: '' } }),
		note_block: atom('block', 'div', 'raw note', { source: { default: '' } }),
		raw: atom('block', 'div', 'raw markdown', { source: { default: '' } }),
		toc: atom('block', 'nav', 'toc', { source: { default: '[TOC]' } }),
		embed: atom('block', 'figure', 'embed', { url: { default: '' }, service: { default: '' }, src: { default: '' } }),
		footnote_def: { group: 'block', content: 'inline*', attrs: { label: { default: '1' } },
			toDOM: n => ['div', Object.assign({ class: 'footnote-def' }, dataAttrs(n)), ['span', { class: 'footnote-label', contenteditable: 'false' }, n.attrs.label], ['span', { class: 'footnote-text' }, 0]],
			parseDOM: [{ tag: 'div.footnote-def', getAttrs: fromData, contentElement: '.footnote-text' }] },
		text: { group: 'inline' },
		image: atom('inline', 'img', 'image', { src: { default: '' }, alt: { default: '' }, title: { default: '' }, width: { default: '' }, height: { default: '' }, attributes: { default: '' } },
			{ toDOM: n => ['img', Object.assign({ class: 'image', src: n.attrs.src, alt: n.attrs.alt }, dataAttrs(n))] }),
		hard_break: { inline: true, group: 'inline', selectable: false, attrs: { markup: { default: '\\' } }, toDOM: () => ['br'], parseDOM: [{ tag: 'br' }] },
		wikilink: atom('inline', 'a', 'wikilink', { page: { default: '' }, anchor: { default: '' }, label: { default: '' } }),
		math_inline: atom('inline', 'span', 'math', { tex: { default: '' } }),
		note_inline: atom('inline', 'span', 'note', { source: { default: '' } }),
		footnote_ref: atom('inline', 'sup', 'footnote-ref', { label: { default: '1' } }),
		html_inline: atom('inline', 'span', 'raw-inline', { source: { default: '' } }),
	}, tables.tableNodes({ tableGroup: 'block', cellContent: 'inline*', cellAttributes: { align: cellAlign } })),
	marks: {
		link: { attrs: { href: {}, title: { default: '' }, auto: { default: false } }, inclusive: false,
			toDOM: m => ['a', { href: m.attrs.href, title: m.attrs.title || null, class: /^https?:/i.test(m.attrs.href) ? 'ext' : null }], parseDOM: [{ tag: 'a[href]:not(.wikilink)', getAttrs: d => ({ href: d.getAttribute('href'), title: d.getAttribute('title') || '' }) }] },
		em: { toDOM: () => ['em'], parseDOM: [{ tag: 'em' }, { tag: 'i' }] },
		strong: { toDOM: () => ['strong'], parseDOM: [{ tag: 'strong' }, { tag: 'b', getAttrs: d => d.style.fontWeight !== 'normal' && null }] },
		code: { toDOM: () => ['code'], parseDOM: [{ tag: 'code' }] },
		del: { toDOM: () => ['del'], parseDOM: [{ tag: 'del' }, { tag: 's' }] },
		mark: { toDOM: () => ['mark'], parseDOM: [{ tag: 'mark' }] },
		ins: { toDOM: () => ['ins'], parseDOM: [{ tag: 'ins' }] },
		sup: { excludes: 'sub', toDOM: () => ['sup'], parseDOM: [{ tag: 'sup:not(.footnote-ref)' }] },
		sub: { excludes: 'sup', toDOM: () => ['sub'], parseDOM: [{ tag: 'sub' }] },
	},
});

//
// Tokens to a document.
//
const s = schema.nodes, m = schema.marks;

function inlineNodes(children, marks = []) {
	const out = [];
	const stack = [...marks];
	const push = node => out.push(node.mark(node.marks.concat(stack.filter(x => !x.isInSet(node.marks)))));
	const text = t => { if (t) push(schema.text(t)); };
	for (const t of children || []) {
		switch (t.type) {
			case 'text': text(t.content); break;
			case 'softbreak': text(' '); break;
			case 'hardbreak': push(s.hard_break.create({ markup: t.markup === '\\' ? '\\' : '  ' })); break;
			case 'code_inline': push(schema.text(t.content, [m.code.create()])); break;
			case 'strong_open': stack.push(m.strong.create()); break;
			case 'em_open': stack.push(m.em.create()); break;
			case 's_open': stack.push(m.del.create()); break;
			case 'mark_open': stack.push(m.mark.create()); break;
			case 'ins_open': stack.push(m.ins.create()); break;
			case 'link_open': stack.push(m.link.create({ href: t.attrGet('href'), title: t.attrGet('title') || '', auto: t.markup === 'linkify' || t.markup === 'autolink' })); break;
			case 'strong_close': case 'em_close': case 's_close': case 'mark_close': case 'ins_close': case 'link_close': stack.pop(); break;
			case 'sup': push(schema.text(t.content, [m.sup.create()])); break;
			case 'sub': push(schema.text(t.content, [m.sub.create()])); break;
			case 'image': push(s.image.create({ src: t.attrGet('src'), alt: plainText(t.children), title: t.attrGet('title') || '', width: t.attrGet('width') || '', height: t.attrGet('height') || '', attributes: t.meta?.attributes || '' })); break;
			case 'wikilink': push(s.wikilink.create(t.meta)); break;
			case 'math_inline': push(s.math_inline.create({ tex: t.content })); break;
			case 'note_inline': push(s.note_inline.create({ source: t.content })); break;
			case 'footnote_ref': push(s.footnote_ref.create({ label: t.meta.label ?? String(t.meta.id + 1) })); break;
			case 'html_inline': push(s.html_inline.create({ source: t.content })); break;
			case 'task_checkbox': break;
			default: if (t.content) text(t.content);
		}
	}
	return out;
}

//
// One block and its closing token: returns [node, next index].
//
function block(tokens, i, env) {
	const t = tokens[i];
	const close = type => { let depth = 0; for (let j = i; j < tokens.length; j++) { if (tokens[j].type === t.type) depth++; if (tokens[j].type === type && --depth === 0) return j; } return tokens.length - 1; };
	const blocks = (from, to) => { const out = []; for (let j = from; j < to;) { const [node, next] = block(tokens, j, env); if (node) out.push(node); j = next; } return out; };
	switch (t.type) {
		case 'paragraph_open': return [s.paragraph.create(null, inlineNodes(tokens[i + 1].children)), i + 3];
		case 'heading_open': return [s.heading.create({ level: +t.tag.slice(1) }, inlineNodes(tokens[i + 1].children)), i + 3];
		case 'blockquote_open': { const j = close('blockquote_close'); return [s.blockquote.create(null, blocks(i + 1, j).length ? blocks(i + 1, j) : [s.paragraph.create()]), j + 1]; }
		case 'callout_open': { const j = close('callout_close'); const inner = blocks(i + 1, j); return [s.callout.create(t.meta, inner.length ? inner : [s.paragraph.create()]), j + 1]; }
		case 'bullet_list_open': case 'ordered_list_open': {
			const j = close(t.type.replace('_open', '_close'));
			const items = [];
			let tight = true;
			for (let k = i + 1; k < j;) {
				const end = (() => { let depth = 0; for (let x = k; x < j; x++) { if (tokens[x].type === 'list_item_open') depth++; if (tokens[x].type === 'list_item_close' && --depth === 0) return x; } return j; })();
				for (let x = k + 1; x < end; x++) if (tokens[x].type === 'paragraph_open' && !tokens[x].hidden) tight = false;
				let content = blocks(k + 1, end);
				if (!content.length || content[0].type !== s.paragraph) content = [s.paragraph.create(), ...content];
				items.push(s.list_item.create({ checked: tokens[k].meta?.task ?? null }, content));
				k = end + 1;
			}
			const type = t.type === 'bullet_list_open' ? s.bullet_list : s.ordered_list;
			const attrs = t.type === 'bullet_list_open' ? { tight, marker: t.markup || '-' } : { tight, order: +(t.attrGet('start') || 1), marker: t.markup || '.' };
			return [type.create(attrs, items), j + 1];
		}
		case 'fence': {
			const lang = (t.info.trim().split(/[\s{]/)[0] || '').toLowerCase();
			if (lang === 'mermaid') return [s.diagram.create({ info: t.info.trim(), text: t.content, fence: t.markup }), i + 1];
			if (lang === 'html' && /^html\s+(interactief|interactive)\b/i.test(t.info.trim())) return [s.interactive.create({ info: t.info.trim(), text: t.content, fence: t.markup }), i + 1];
			return [s.code_block.create({ info: t.info.trim(), fence: t.markup }, t.content.replace(/\n$/, '') ? schema.text(t.content.replace(/\n$/, '')) : null), i + 1];
		}
		case 'code_block': return [s.code_block.create({ info: '', fence: 'indent' }, t.content.replace(/\n$/, '') ? schema.text(t.content.replace(/\n$/, '')) : null), i + 1];
		case 'math_block': return [s.math_block.create({ tex: t.content }), i + 1];
		case 'hr': return [s.horizontal_rule.create({ markup: t.markup }), i + 1];
		case 'html_block': return [s.html_block.create({ source: t.content.replace(/\n$/, '') }), i + 1];
		case 'note_block': return [s.note_block.create({ source: t.content }), i + 1];
		case 'toc': return [s.toc.create(), i + 1];
		case 'embed': return [s.embed.create(t.meta), i + 1];
		case 'figure_open': {
			const image = tokens[i + 1].children[0];
			const hasCaption = tokens[i + 2].type === 'figcaption_open';
			const placement = image.meta?.placement || 'breed';
			const attrs = { src: image.attrGet('src'), alt: plainText(image.children), title: image.attrGet('title') || '', width: image.attrGet('width') || '', height: image.attrGet('height') || '', placement, explicit: !!image.meta?.placement, caption: hasCaption };
			const caption = hasCaption ? inlineNodes(tokens[i + 3].children) : [];
			const j = (() => { for (let k = i; k < tokens.length; k++) if (tokens[k].type === 'figure_close') return k; return tokens.length - 1; })();
			return [s.figure.create(attrs, caption), j + 1];
		}
		case 'table_open': {
			const j = close('table_close');
			const rows = [];
			for (let k = i; k < j; k++) {
				if (tokens[k].type !== 'tr_open') continue;
				const cells = [];
				for (let x = k + 1; tokens[x].type !== 'tr_close'; x++) {
					if (tokens[x].type !== 'th_open' && tokens[x].type !== 'td_open') continue;
					const align = (/text-align:(\w+)/.exec(tokens[x].attrGet('style') || '') || [])[1] || null;
					const type = tokens[x].type === 'th_open' ? s.table_header : s.table_cell;
					cells.push(type.create({ align }, inlineNodes(tokens[x + 1].children)));
				}
				rows.push(s.table_row.create(null, cells));
			}
			return [s.table.create(null, rows), j + 1];
		}
		default:
			return [null, i + 1];
	}
}

//
// The source of the article as top-level blocks: each with its line range from markdown-it, and the lines no block
// claims (footnote definitions, definition lists) as raw blocks of their own.
//
export function parse(source, md) {
	const env = {};
	const tokens = md.hyphaParse(source, env);
	const lines = source.replace(/\r\n?/g, '\n').split('\n');
	const spans = [];
	for (let i = 0; i < tokens.length;) {
		const t = tokens[i];
		if (t.level !== 0 || !t.map) { i++; continue; }
		let j = i;
		if (t.nesting === 1) { let depth = 0; for (; j < tokens.length; j++) { depth += tokens[j].nesting; if (depth === 0) break; } }
		else if (t.type === 'paragraph_open') j = i + 2;
		spans.push({ from: t.map[0], to: t.map[1], tokens: [i, j + 1] });
		i = j + 1;
	}
	//
	// Fill the gaps between the claimed ranges with raw blocks; blank lines stay separators.
	//
	const blocks = [];
	let line = 0;
	const unclaimed = (from, to) => {
		let start = null;
		for (let k = from; k <= to; k++) {
			const blank = k === to || lines[k].trim() === '';
			if (!blank && start === null) start = k;
			if (blank && start !== null) { blocks.push({ from: start, to: k, raw: true }); start = null; }
		}
	};
	for (const span of spans) {
		if (span.from < line) continue;
		unclaimed(line, span.from);
		blocks.push(span);
		line = span.to;
	}
	unclaimed(line, lines.length);
	blocks.sort((a, b) => a.from - b.from);

	const nodes = [], sources = new WeakMap(), gaps = [];
	let previousEnd = 0;
	for (const b of blocks) {
		let to = b.to;
		while (to > b.from + 1 && lines[to - 1].trim() === '') to--;
		const text = lines.slice(b.from, to).join('\n');
		let node = null;
		if (b.raw) {
			const fn = /^\[\^([^\]\s]+)\]:[ \t]?(.*)$/.exec(text);
			node = fn && !text.includes('\n') ? s.footnote_def.create({ label: fn[1] }, inlineNodes(md.parseInline(fn[2], env)[0]?.children)) : s.raw.create({ source: text });
		}
		else node = block(tokens, b.tokens[0], env)[0] || s.raw.create({ source: text });
		gaps.push(lines.slice(previousEnd, b.from));
		previousEnd = to;
		sources.set(node, text);
		nodes.push(node);
	}
	const tail = lines.slice(previousEnd);
	const empty = !nodes.length;
	if (empty) nodes.push(s.paragraph.create());
	return { doc: s.doc.create(null, nodes), sources, gaps, tail, empty };
}

//
// Changed blocks back to Markdown, in the house style.
//
function escapeText(state, text) {
	let out = state.esc(text, state.atBlockStart);
	//
	// Hypha syntax that plain text must not turn into: ==, ++, %%, [[ and a formula between two dollars.
	//
	out = out.replace(/==/g, '\\==').replace(/\+\+/g, '\\++').replace(/%%/g, '%\\%').replace(/\[\[/g, '\\[[');
	if ((out.match(/\$/g) || []).length > 1) out = out.replace(/(?<!\\)\$/g, '\\$');
	if ((out.match(/[~^]/g) || []).length > 1) out = out.replace(/(?<!\\)([~^])/g, '\\$1');
	return out;
}

const atomSource = (state, node) => { state.write(node.attrs.source); state.closeBlock(node); };
const fenced = (state, node, text) => {
	const fence = node.attrs.fence && node.attrs.fence !== 'indent' ? node.attrs.fence : '```';
	state.write(fence + node.attrs.info + '\n');
	state.text(text.replace(/\n?$/, '\n'), false);
	state.write(fence);
	state.closeBlock(node);
};

export const serializer = new MarkdownSerializer({
	paragraph: (state, node) => { state.renderInline(node); state.closeBlock(node); },
	heading: (state, node) => { state.write('#'.repeat(node.attrs.level) + ' '); state.renderInline(node, false); state.closeBlock(node); },
	blockquote: (state, node) => { state.wrapBlock('> ', null, node, () => state.renderContent(node)); },
	callout: (state, node) => {
		const a = node.attrs;
		if (a.hedgedoc) {
			state.write(':::' + (a.marker || a.type) + (a.title ? ' ' + a.title : '') + '\n');
			state.renderContent(node);
			state.ensureNewLine();
			state.write(':::');
			state.closeBlock(node);
			return;
		}
		state.wrapBlock('> ', null, node, () => {
			state.write(`[!${a.type}]` + (a.title ? ' ' + a.title : ''));
			state.ensureNewLine();
			state.renderContent(node);
		});
	},
	bullet_list: (state, node) => state.renderList(node, '  ', () => '- '),
	ordered_list: (state, node) => {
		const start = node.attrs.order;
		state.renderList(node, '   ', i => `${start + i}. `);
	},
	list_item: (state, node) => {
		if (node.attrs.checked !== null) state.write(node.attrs.checked ? '[x] ' : '[ ] ');
		state.renderContent(node);
	},
	code_block: (state, node) => {
		if (node.attrs.fence === 'indent') { state.wrapBlock('    ', null, node, () => state.text(node.textContent, false)); return; }
		fenced(state, node, node.textContent);
	},
	diagram: (state, node) => fenced(state, node, node.attrs.text),
	interactive: (state, node) => fenced(state, node, node.attrs.text),
	math_block: (state, node) => { state.write('$$\n' + node.attrs.tex + '\n$$'); state.closeBlock(node); },
	horizontal_rule: (state, node) => { state.write(node.attrs.markup || '---'); state.closeBlock(node); },
	html_block: atomSource, note_block: atomSource, raw: atomSource, toc: atomSource,
	embed: (state, node) => { state.write(node.attrs.url); state.closeBlock(node); },
	figure: (state, node) => {
		const a = node.attrs;
		const extras = [];
		if (a.placement && (a.explicit || a.placement !== 'breed')) extras.push('.' + a.placement);
		if (a.width) extras.push('width=' + a.width);
		if (a.height) extras.push('height=' + a.height);
		state.write(`![${state.esc(a.alt)}](${a.src}${a.title ? ` "${a.title.replace(/"/g, '\\"')}"` : ''})` + (extras.length ? `{${extras.join(' ')}}` : ''));
		if (node.childCount) { state.write('\n*'); state.renderInline(node, false); state.write('*'); }
		state.closeBlock(node);
	},
	footnote_def: (state, node) => { state.write(`[^${node.attrs.label}]: `); state.renderInline(node, false); state.closeBlock(node); },
	table: (state, node) => {
		const rows = [];
		node.forEach(row => { const cells = []; row.forEach(cell => cells.push(cell)); rows.push(cells); });
		const cellText = cell => serializeInline(cell).replace(/\|/g, '\\|').replace(/\n/g, ' ');
		const line = cells => '| ' + cells.map(cellText).join(' | ') + ' |';
		const align = { left: ':--', center: ':-:', right: '--:' };
		state.write(line(rows[0]) + '\n');
		state.write('|' + rows[0].map(c => align[c.attrs.align] || '---').join('|') + '|');
		for (const r of rows.slice(1)) state.write('\n' + line(r));
		state.closeBlock(node);
	},
	table_row: () => {}, table_header: () => {}, table_cell: () => {},
	text: (state, node) => state.text(escapeText(state, node.text), false),
	hard_break: (state, node, parent, index) => {
		for (let i = index + 1; i < parent.childCount; i++) if (parent.child(i).type !== node.type) { state.write(node.attrs.markup === '  ' ? '  \n' : '\\\n'); return; }
	},
	image: (state, node) => state.write(`![${state.esc(node.attrs.alt)}](${node.attrs.src}${node.attrs.title ? ` "${node.attrs.title}"` : ''})${node.attrs.attributes || ''}`),
	wikilink: (state, node) => state.write(`[[${node.attrs.page}${node.attrs.anchor}${node.attrs.label ? '|' + node.attrs.label : ''}]]`),
	math_inline: (state, node) => state.write('$' + node.attrs.tex + '$'),
	note_inline: (state, node) => state.write(node.attrs.source),
	footnote_ref: (state, node) => state.write(`[^${node.attrs.label}]`),
	html_inline: (state, node) => state.write(node.attrs.source),
}, {
	em: { open: '*', close: '*', mixable: true, expelEnclosingWhitespace: true },
	strong: { open: '**', close: '**', mixable: true, expelEnclosingWhitespace: true },
	del: { open: '~~', close: '~~', mixable: true, expelEnclosingWhitespace: true },
	mark: { open: '==', close: '==', mixable: true, expelEnclosingWhitespace: true },
	ins: { open: '++', close: '++', mixable: true, expelEnclosingWhitespace: true },
	sup: { open: '^', close: '^' },
	sub: { open: '~', close: '~' },
	code: { open: (state, mark, parent, index) => backticks(parent.child(index).text, true), close: (state, mark, parent, index) => backticks(parent.child(index - 1).text, false), escape: false },
	link: {
		open: (state, mark, parent, index) => mark.attrs.auto && autoLink(mark, parent, index) ? '' : '[',
		close: (state, mark, parent, index) => mark.attrs.auto && autoLink(mark, parent, index, -1) ? '' : `](${mark.attrs.href}${mark.attrs.title ? ` "${mark.attrs.title.replace(/"/g, '\\"')}"` : ''})`,
		mixable: false,
	},
}, { tightLists: true, hardBreakNodeName: 'hard_break', strict: false });

function autoLink(mark, parent, index, side = 1) {
	const child = parent.child(side === 1 ? index : index - 1);
	return child.isText && (child.text === mark.attrs.href || 'http://' + child.text === mark.attrs.href);
}
function backticks(text, open) {
	const longest = Math.max(0, ...(text.match(/`+/g) || []).map(x => x.length));
	const ticks = '`'.repeat(longest + 1);
	const pad = /^`|`$/.test(text) ? ' ' : '';
	return open ? ticks + pad : pad + ticks;
}

export function serializeInline(node) {
	return serializer.serialize(s.doc.create(null, [s.paragraph.create(null, node.content)])).replace(/\n+$/, '');
}

//
// The document back to Markdown: unchanged blocks as they were, changed blocks serialised, and between two unchanged
// neighbours the original lines (usually one blank line).
//
export function serialize(doc, parsed) {
	if (doc.childCount === 1 && doc.firstChild.type === s.paragraph && !doc.firstChild.childCount && (!parsed || parsed.empty)) return parsed ? parsed.tail.join('\n') : '';
	const sources = parsed ? parsed.sources : new WeakMap();
	const original = parsed ? Array.from({ length: parsed.doc.childCount }, (x, i) => parsed.doc.child(i)) : [];
	const between = lines => '\n' + (lines.length ? lines.join('\n') + '\n' : '');
	let out = '', previous = -2;
	doc.forEach((node, offset, index) => {
		const known = sources.has(node);
		const at = known ? original.indexOf(node) : -1;
		const text = known ? sources.get(node) : serializer.serialize(s.doc.create(null, [node])).replace(/\n+$/, '');
		if (index === 0) out += at === 0 && parsed.gaps[0].length ? parsed.gaps[0].join('\n') + '\n' : '';
		else out += at >= 0 && at === previous + 1 ? between(parsed.gaps[at]) : '\n\n';
		out += text;
		previous = at;
	});
	const last = original.length - 1;
	out += parsed && last >= 0 && previous === last ? (parsed.tail.length ? '\n' + parsed.tail.join('\n') : '') : '\n';
	return out;
}
