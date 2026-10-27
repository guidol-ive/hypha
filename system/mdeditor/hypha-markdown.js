//
// Hypha-Markdown 1.0 in the browser: markdown-it with the Hypha plug-ins (design sections 10 and 13.8, decision T6).
// The same extensions as league/commonmark on the server (system/core/markdown/), with the same HTML, so the preview
// equals the published article. The parity test (tests/browser/unit/pariteit.test.html) compares both.
//
// The tokens of these plug-ins are also the input of the visual view (opmaak.js), so every extension is written
// once for the preview and for ProseMirror.
//
import MarkdownIt, { footnote, deflist } from 'markdown-it';

export const PLACEMENTS = ['breed', 'in-de-tekst', 'klein-rechts'];
export const CALLOUTS = ['info', 'tip', 'note', 'warning', 'important', 'caution', 'quote'];
const HEDGEDOC = { info: 'info', success: 'tip', warning: 'warning', danger: 'warning', tip: 'tip', note: 'note' };
export const HIGHLIGHT = { php: 'php', javascript: 'javascript', js: 'javascript', sql: 'sql', python: 'python', py: 'python', html: 'xml', xml: 'xml', svg: 'xml', css: 'css', json: 'json', yaml: 'yaml', yml: 'yaml', bash: 'bash', sh: 'bash', shell: 'bash' };

export const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

//
// The slug of a heading or title, as hypha_markdownSlug() in system/core/markdown.php.
//
export function slug(text, max = 80) {
	const words = { 'ß': 'ss', 'æ': 'ae', 'Æ': 'ae', 'ø': 'o', 'Ø': 'o', 'œ': 'oe', 'Œ': 'oe', 'ĳ': 'ij', 'Ĳ': 'ij', 'ł': 'l', 'Ł': 'l', 'đ': 'd', 'Đ': 'd', '€': ' euro ', '&': ' en ', '’': '', "'": '', '%': ' procent ' };
	let s = String(text).replace(/[ßæÆøØœŒĳĲłŁđĐ€&’'%]/g, c => words[c]);
	s = s.normalize('NFD').replace(/\p{Mn}+/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
	if (s.length > max) {
		const cut = s.slice(0, max + 1).lastIndexOf('-');
		s = s.slice(0, cut > 0 ? cut : max).replace(/-+$/, '');
	}
	return s;
}

export function parseAttributes(text) {
	const attributes = {}, classes = [];
	for (const part of String(text).trim().split(/\s+/)) {
		if (!part) continue;
		if (part[0] === '.') classes.push(part.slice(1));
		else if (part.includes('=')) { const i = part.indexOf('='); attributes[part.slice(0, i)] = part.slice(i + 1); }
	}
	if (classes.length) attributes.class = classes.join(' ');
	return attributes;
}

//
// HedgeDoc notation that is rewritten in the source, outside fenced code, as on the server: ![](foto.jpg =200x150)
// and {%youtube id %}.
//
export function preprocess(md) {
	md = String(md).replace(/\r\n?/g, '\n');
	return md.split(/(^ {0,3}(?:`{3,}|~{3,})[^\n]*\n[\s\S]*?(?:^ {0,3}(?:`{3,}|~{3,})[ \t]*$|(?![\s\S])))/m).map((part, i) => {
		if (i % 2) return part;
		part = part.replace(/(!\[[^\]\n]*\]\()([^\s)]+)\s+=(\d*)x(\d*)\)/g, '$1$2){width=$3 height=$4}').replace('{width= height=', '{height=').replace(' height=}', '}');
		return part.replace(/^ {0,3}\{%\s*(youtube|vimeo)\s+([\w-]+)\s*%\}[ \t]*$/gm, (a, s, id) => s === 'youtube' ? 'https://www.youtube.com/watch?v=' + id : 'https://vimeo.com/' + id);
	}).join('');
}

//
// Level 2: the iframe address of a link to a service of the list, as HyphaMarkdown::embedSource().
//
const EMBEDS = [
	['youtube', /^https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/watch\?(?:[^#]*&)?v=|youtu\.be\/|youtube\.com\/shorts\/|youtube(?:-nocookie)?\.com\/embed\/)([\w-]{6,})/i, m => `https://www.youtube-nocookie.com/embed/${m[1]}`],
	['vimeo', /^https?:\/\/(?:www\.)?vimeo\.com\/(?:video\/)?(\d+)/i, m => `https://player.vimeo.com/video/${m[1]}`],
	['vimeo', /^https?:\/\/player\.vimeo\.com\/video\/(\d+)/i, m => `https://player.vimeo.com/video/${m[1]}`],
	['openstreetmap', /^https:\/\/www\.openstreetmap\.org\/export\/embed\.html\?([^#\s]+)/i, m => `https://www.openstreetmap.org/export/embed.html?${m[1]}`],
	['datawrapper', /^https:\/\/(?:datawrapper\.dwcdn\.net|www\.datawrapper\.de\/_)\/(\w+)(?:\/(\d+))?/i, m => `https://datawrapper.dwcdn.net/${m[1]}/`],
	['flourish', /^https:\/\/public\.flourish\.studio\/visualisation\/(\d+)/i, m => `https://flo.uri.sh/visualisation/${m[1]}/embed`],
	['infogram', /^https:\/\/infogram\.com\/([\w-]+)/i, m => `https://e.infogram.com/${m[1]}`],
	['googlemaps', /^https:\/\/www\.google\.com\/maps\/embed\?pb=([^#\s]+)/i, m => `https://www.google.com/maps/embed?pb=${m[1]}`],
	['spotify', /^https:\/\/open\.spotify\.com\/(?:embed\/)?(track|album|playlist|episode|show)\/(\w+)/i, m => `https://open.spotify.com/embed/${m[1]}/${m[2]}`],
	['soundcloud', /^(https:\/\/soundcloud\.com\/[\w-]+\/[\w-]+)/i, m => `https://w.soundcloud.com/player/?url=${m[1]}`],
	['mixcloud', /^https:\/\/www\.mixcloud\.com\/([\w-]+\/[\w-]+)\/?/i, m => `https://player-widget.mixcloud.com/widget/iframe/?feed=%2F${m[1]}%2F`],
	['archive', /^https:\/\/archive\.org\/(?:details|embed)\/([\w.-]+)/i, m => `https://archive.org/embed/${m[1]}`],
	['bandcamp', /^https:\/\/bandcamp\.com\/EmbeddedPlayer\/([\w=/]+)/i, m => `https://bandcamp.com/EmbeddedPlayer/${m[1]}`],
	['scribd', /^https:\/\/www\.scribd\.com\/(?:document|doc|embeds)\/(\d+)/i, m => `https://www.scribd.com/embeds/${m[1]}/content`],
	['documentcloud', /^https:\/\/www\.documentcloud\.org\/documents\/([\w-]+)/i, m => `https://embed.documentcloud.org/documents/${m[1]}/`],
];
export function embedSource(url, frameHosts, peertubeHosts = []) {
	for (const [service, pattern, make] of EMBEDS) {
		const m = pattern.exec(url);
		if (!m) continue;
		const src = make(m);
		return frameHosts.includes(new URL(src).host) ? [service, src] : null;
	}
	const m = /^https:\/\/([\w.-]+)\/(?:w|videos\/watch|videos\/embed)\/([\w-]+)/i.exec(url);
	if (m && peertubeHosts.map(h => h.toLowerCase()).includes(m[1].toLowerCase())) return ['peertube', `https://${m[1].toLowerCase()}/videos/embed/${m[2]}`];
	return null;
}

//
// Plain text of inline tokens.
//
export function plainText(tokens) {
	let s = '';
	for (const t of tokens || []) {
		if (t.type === 'text' || t.type === 'code_inline') s += t.content;
		else if (t.type === 'softbreak' || t.type === 'hardbreak') s += ' ';
		else if (t.type === 'image') s += plainText(t.children);
		else if (t.type === 'wikilink') s += t.content;
		else if (t.type === 'math_inline') s += t.content;
	}
	return s;
}

//
// Inline rules.
//
function wikilinkRule(state, silent) {
	if (state.src.charCodeAt(state.pos) !== 0x5B || state.src.charCodeAt(state.pos + 1) !== 0x5B) return false;
	const m = /^\[\[([^[\]|\n#]+)(#[^[\]|\n]*)?(?:\|([^[\]\n]+))?\]\]/.exec(state.src.slice(state.pos));
	if (!m || !m[1].trim()) return false;
	if (!silent) {
		const t = state.push('wikilink', '', 0);
		t.meta = { page: m[1].trim(), anchor: m[2] || '', label: m[3] ? m[3].trim() : '' };
		t.content = t.meta.label || t.meta.page;
		t.markup = m[0];
	}
	state.pos += m[0].length;
	return true;
}

function supSubRule(char, type) {
	const code = char.charCodeAt(0);
	const e = char === '^' ? '\\^' : char;
	const re = new RegExp(`^${e}(?!${e})((?:\\\\[ ${e}]|[^\\s${e}\\\\]|\\\\(?![ ${e}]))+)${e}(?!${e})`);
	return function (state, silent) {
		if (state.src.charCodeAt(state.pos) !== code) return false;
		if (state.pos > 0 && state.src.charCodeAt(state.pos - 1) === code) return false;
		const m = re.exec(state.src.slice(state.pos));
		if (!m) return false;
		if (!silent) {
			const t = state.push(type, '', 0);
			t.content = m[1].replace(new RegExp(`\\\\([ ${e}])`, 'g'), '$1');
			t.markup = char;
		}
		state.pos += m[0].length;
		return true;
	};
}

function noteInlineRule(state, silent) {
	if (state.src.charCodeAt(state.pos) !== 0x25 || state.src.charCodeAt(state.pos + 1) !== 0x25) return false;
	const end = state.src.indexOf('%%', state.pos + 2);
	if (end < 0) return false;
	if (!silent) {
		const t = state.push('note_inline', '', 0);
		t.content = state.src.slice(state.pos, end + 2);
	}
	state.pos = end + 2;
	return true;
}

const MATH_INLINE = /^\$(?![\s$])((?:\\\$|[^$\n`])*?[^\s\\$`])\$(?![\d$])/;
function mathInlineRule(state, silent) {
	if (state.src.charCodeAt(state.pos) !== 0x24) return false;
	if (state.pos > 0 && state.src.charCodeAt(state.pos - 1) === 0x24) return false;
	const m = MATH_INLINE.exec(state.src.slice(state.pos));
	if (!m) return false;
	if (!silent) {
		const t = state.push('math_inline', 'math', 0);
		t.content = m[1];
		t.markup = '$';
	}
	state.pos += m[0].length;
	return true;
}

function imageAttributesRule(state, silent) {
	if (state.src.charCodeAt(state.pos) !== 0x7B) return false;
	const last = state.tokens[state.tokens.length - 1];
	if (!last || last.type !== 'image') return false;
	const m = /^\{\s*((?:\.[\w-]+|[\w-]+=[\w%.-]+)(?:\s+(?:\.[\w-]+|[\w-]+=[\w%.-]+))*)\s*\}/.exec(state.src.slice(state.pos));
	if (!m) return false;
	if (!silent) {
		const a = parseAttributes(m[1]);
		last.meta = Object.assign(last.meta || {}, { attributes: m[0] });
		if (a.class) last.meta.placement = a.class;
		for (const k of ['width', 'height']) if (a[k]) last.attrSet(k, a[k]);
	}
	state.pos += m[0].length;
	return true;
}

//
// ==mark== and ++inserted++: delimiter pairs of exactly two characters, as ~~strikethrough~~ in markdown-it.
//
function doubleDelimiter(md, char, name, tag) {
	const code = char.charCodeAt(0);
	function tokenize(state, silent) {
		const start = state.pos;
		if (silent || state.src.charCodeAt(start) !== code) return false;
		const scanned = state.scanDelims(state.pos, true);
		let len = scanned.length;
		if (len < 2) return false;
		if (len % 2) { const t = state.push('text', '', 0); t.content = char; len--; }
		for (let i = 0; i < len; i += 2) {
			const t = state.push('text', '', 0);
			t.content = char + char;
			state.delimiters.push({ marker: code, length: 0, token: state.tokens.length - 1, end: -1, open: scanned.can_open, close: scanned.can_close });
		}
		state.pos += scanned.length;
		return true;
	}
	function postProcess(state, delimiters) {
		const loneMarkers = [];
		for (const startDelim of delimiters) {
			if (startDelim.marker !== code || startDelim.end === -1) continue;
			const endDelim = delimiters[startDelim.end];
			let t = state.tokens[startDelim.token];
			t.type = name + '_open'; t.tag = tag; t.nesting = 1; t.markup = char + char; t.content = '';
			t = state.tokens[endDelim.token];
			t.type = name + '_close'; t.tag = tag; t.nesting = -1; t.markup = char + char; t.content = '';
			if (state.tokens[endDelim.token - 1].type === 'text' && state.tokens[endDelim.token - 1].content === char) loneMarkers.push(endDelim.token - 1);
		}
		while (loneMarkers.length) {
			const i = loneMarkers.pop();
			let j = i + 1;
			while (j < state.tokens.length && state.tokens[j].type === name + '_close') j++;
			j--;
			if (i !== j) { const token = state.tokens[j]; state.tokens[j] = state.tokens[i]; state.tokens[i] = token; }
		}
	}
	md.inline.ruler.before('emphasis', name, tokenize);
	md.inline.ruler2.before('emphasis', name, state => {
		postProcess(state, state.delimiters);
		for (const meta of state.tokens_meta) if (meta && meta.delimiters) postProcess(state, meta.delimiters);
	});
}

//
// Block rules: %% notes %%, $$ formulas $$ and :::type boxes of HedgeDoc.
//
function noteBlockRule(state, startLine, endLine, silent) {
	const pos = state.bMarks[startLine] + state.tShift[startLine];
	if (state.sCount[startLine] - state.blkIndent >= 4) return false;
	const first = state.src.slice(pos, state.eMarks[startLine]);
	if (!first.startsWith('%%')) return false;
	const close = first.indexOf('%%', 2);
	if (close >= 0 && first.slice(close + 2).trim() !== '') return false;
	if (silent) return true;
	const lines = [first];
	let line = startLine + 1, closed = close >= 0, unclosed = false;
	while (!closed && line < endLine) {
		const text = state.src.slice(state.bMarks[line] + state.tShift[line], state.eMarks[line]);
		if (text.trim() === '' || state.sCount[line] < state.blkIndent) { unclosed = true; break; }
		lines.push(text);
		line++;
		if (text.includes('%%')) closed = true;
	}
	if (!closed && line >= endLine) unclosed = true;
	const t = state.push('note_block', '', 0);
	t.content = lines.join('\n');
	t.meta = { text: lines.join('\n').trim().replace(/^%%|%%\s*$/g, '').trim(), unclosed };
	t.map = [startLine, line];
	state.line = line;
	return true;
}

function mathBlockRule(state, startLine, endLine, silent) {
	const pos = state.bMarks[startLine] + state.tShift[startLine];
	if (state.sCount[startLine] - state.blkIndent >= 4) return false;
	const first = state.src.slice(pos, state.eMarks[startLine]);
	if (!first.startsWith('$$')) return false;
	const after = first.slice(2);
	const one = /^(.*\S)?\s*\$\$\s*$/.exec(after);
	let tex = [], line = startLine + 1;
	if (one && after.trim() !== '') tex.push((one[1] || '').trim());
	else {
		if (after.includes('$')) return false;
		if (after.trim()) tex.push(after.trim());
		let closed = false;
		while (line < endLine) {
			const text = state.src.slice(state.bMarks[line] + state.tShift[line], state.eMarks[line]);
			line++;
			const m = /^(.*?)\s*\$\$\s*$/.exec(text);
			if (m) { if (m[1].trim()) tex.push(m[1]); closed = true; break; }
			tex.push(text);
		}
		if (!closed && silent) return false;
	}
	if (silent) return true;
	const t = state.push('math_block', 'math', 0);
	t.content = tex.join('\n').trim();
	t.markup = '$$';
	t.map = [startLine, line];
	state.line = line;
	return true;
}

function containerRule(state, startLine, endLine, silent) {
	if (state.sCount[startLine] - state.blkIndent >= 4) return false;
	const first = state.src.slice(state.bMarks[startLine] + state.tShift[startLine], state.eMarks[startLine]);
	const m = /^:::[ \t]*(info|success|warning|danger|tip|note)\b[ \t]*(.*)$/i.exec(first);
	if (!m) return false;
	if (silent) return true;
	let line = startLine + 1, closed = false;
	while (line < endLine) {
		const text = state.src.slice(state.bMarks[line] + state.tShift[line], state.eMarks[line]);
		if (state.sCount[line] < state.blkIndent) break;
		if (/^:::[ \t]*$/.test(text) && state.sCount[line] - state.blkIndent < 4) { closed = true; break; }
		line++;
	}
	const oldParent = state.parentType, oldLineMax = state.lineMax;
	state.parentType = 'container';
	state.lineMax = line;
	const open = state.push('callout_open', 'aside', 1);
	open.meta = { type: HEDGEDOC[m[1].toLowerCase()], title: m[2].trim(), hedgedoc: true, marker: m[1] };
	open.map = [startLine, closed ? line + 1 : line];
	state.md.block.tokenize(state, startLine + 1, line);
	const close = state.push('callout_close', 'aside', -1);
	close.meta = open.meta;
	state.parentType = oldParent;
	state.lineMax = oldLineMax;
	state.line = closed ? line + 1 : line;
	return true;
}

//
// Core rules after inline parsing: callouts, task lists, figures, descriptions, headings, [TOC] and embeds.
//
function calloutsRule(state) {
	const tokens = state.tokens;
	for (let i = 0; i < tokens.length; i++) {
		if (tokens[i].type !== 'blockquote_open' || tokens[i + 1]?.type !== 'paragraph_open') continue;
		const inline = tokens[i + 2];
		const children = inline.children;
		let end = children.findIndex(c => c.type === 'softbreak' || c.type === 'hardbreak');
		if (end < 0) end = children.length;
		const line = plainText(children.slice(0, end));
		const m = new RegExp(`^\\[!(${CALLOUTS.join('|')})\\][ \\t]*(.*)$`, 'i').exec(line);
		if (!m || children[0]?.type !== 'text' || !/^\[![A-Za-z]+\]/.test(children[0].content)) continue;
		children.splice(0, end + (end < children.length ? 1 : 0));
		inline.content = inline.content.replace(/^[^\n]*\n?/, '');
		let depth = 0, j = i;
		for (; j < tokens.length; j++) {
			if (tokens[j].type === 'blockquote_open') depth++;
			if (tokens[j].type === 'blockquote_close' && --depth === 0) break;
		}
		const meta = { type: m[1].toLowerCase(), title: m[2].trim() };
		Object.assign(tokens[i], { type: 'callout_open', tag: m[1].toLowerCase() === 'quote' ? 'blockquote' : 'aside', meta });
		Object.assign(tokens[j], { type: 'callout_close', tag: tokens[i].tag, meta });
		if (!children.length) tokens.splice(i + 1, 3);
	}
}

function taskListRule(state) {
	const tokens = state.tokens;
	for (let i = 2; i < tokens.length; i++) {
		if (tokens[i].type !== 'inline' || tokens[i - 1].type !== 'paragraph_open' || tokens[i - 2].type !== 'list_item_open') continue;
		const first = tokens[i].children[0];
		const m = first && first.type === 'text' && /^\[([ xX])\][ \t]/.exec(first.content);
		if (!m) continue;
		first.content = first.content.slice(m[0].length);
		const box = new state.Token('task_checkbox', 'input', 0);
		box.meta = { checked: m[1] !== ' ' };
		tokens[i].children.unshift(box);
		tokens[i - 2].meta = Object.assign(tokens[i - 2].meta || {}, { task: m[1] !== ' ' });
	}
}

function figuresRule(state) {
	const tokens = state.tokens;
	for (let i = 0; i < tokens.length - 2; i++) {
		if (tokens[i].type !== 'paragraph_open' || tokens[i + 2].type !== 'paragraph_close') continue;
		const children = tokens[i + 1].children.filter(c => c.type !== 'note_inline' && !(c.type === 'text' && c.content.trim() === ''));
		if (!children.length || children[0].type !== 'image') continue;
		let caption = null;
		const all = tokens[i + 1].children;
		if (children.length > 1) {
			if (children[1].type !== 'softbreak' || children[2]?.type !== 'em_open' || children[children.length - 1].type !== 'em_close') continue;
			//
			// Exactly one emphasis around the whole second line: every em_open after the first is nested.
			//
			let depth = 0, ok = true;
			for (let k = 2; k < children.length; k++) {
				if (children[k].type === 'em_open') depth++;
				if (children[k].type === 'em_close') { depth--; if (depth === 0 && k !== children.length - 1) ok = false; }
			}
			if (!ok) continue;
			caption = children.slice(3, -1);
		}
		const image = children[0];
		const placement = PLACEMENTS.includes(image.meta?.placement) ? image.meta.placement : (image.meta?.placement || 'breed');
		const open = new state.Token('figure_open', 'figure', 1);
		open.meta = { placement, caption: !!caption, markup: tokens[i + 1].content };
		open.map = tokens[i].map;
		const imageInline = new state.Token('inline', '', 0);
		imageInline.children = [image];
		imageInline.content = '';
		const replacement = [open, imageInline];
		if (caption) {
			const capOpen = new state.Token('figcaption_open', 'figcaption', 1);
			const capInline = new state.Token('inline', '', 0);
			capInline.children = caption;
			capInline.content = '';
			replacement.push(capOpen, capInline, new state.Token('figcaption_close', 'figcaption', -1));
		}
		const close = new state.Token('figure_close', 'figure', -1);
		replacement.push(close);
		open.meta.notes = all.filter(c => c.type === 'note_inline').map(c => c.content);
		tokens.splice(i, 3, ...replacement);
	}
}

function descriptionsRule(state) {
	const tokens = state.tokens;
	for (let i = 0; i < tokens.length - 1; i++) {
		if (tokens[i].type !== 'note_block' || tokens[i + 1].type !== 'fence') continue;
		const m = /^(?:beschrijving|description)\s*:\s*([\s\S]+)$/i.exec(tokens[i].meta.text);
		if (m) tokens[i + 1].meta = Object.assign(tokens[i + 1].meta || {}, { description: m[1].replace(/\s+/g, ' ').trim() });
	}
}

function headingsRule(state) {
	const ids = new Set();
	const headings = [];
	for (let i = 0; i < state.tokens.length; i++) {
		const t = state.tokens[i];
		if (t.type !== 'heading_open') continue;
		const text = plainText(state.tokens[i + 1].children);
		let id = 'kop-' + (slug(text, 60) || 'zonder-naam');
		for (let n = 2, base = id; ids.has(id); n++) id = base + '-' + n;
		ids.add(id);
		t.attrSet('id', id);
		headings.push([+t.tag.slice(1), id, text]);
	}
	state.env.headings = headings;
}

function tocAndEmbedRule(options) {
	return function (state) {
		const tokens = state.tokens;
		for (let i = 0; i < tokens.length - 2; i++) {
			if (tokens[i].type !== 'paragraph_open' || tokens[i + 2].type !== 'paragraph_close' || tokens[i].hidden) continue;
			const inline = tokens[i + 1];
			if (inline.content.trim() === '[TOC]') {
				const t = new state.Token('toc', 'nav', 0);
				t.map = tokens[i].map;
				tokens.splice(i, 3, t);
				continue;
			}
			if (options.level < 2) continue;
			const c = inline.children.filter(x => !(x.type === 'text' && x.content.trim() === ''));
			if (c.length !== 3 || c[0].type !== 'link_open' || c[2].type !== 'link_close' || c[1].type !== 'text') continue;
			const url = c[0].attrGet('href');
			if (c[1].content !== url && 'http://' + c[1].content !== url) continue;
			const embed = embedSource(url, options.frameHosts, options.peertubeHosts);
			if (!embed) continue;
			const t = new state.Token('embed', 'iframe', 0);
			t.meta = { url, service: embed[0], src: embed[1] };
			t.map = tokens[i].map;
			tokens.splice(i, 3, t);
		}
	};
}

//
// The markdown-it instance with the Hypha plug-ins.
//
// Options:
//   language: language of the article, for page links;
//   level: freedom level 1 or 2;
//   frameHosts, peertubeHosts: services of embedded content (level 2);
//   texts: translated texts in the HTML (footnotes, toc, diagram-source, diagram);
//   pageHref(page): the link of a page; pageExists(page): mark missing pages (preview only);
//   diagram(text): SVG or null; math(tex, display): MathML or null; highlight(code, language): HTML or null;
//   interactive(code, height, description): HTML of an interactive block in the preview, or null.
//
export function createMarkdown(options = {}) {
	const o = Object.assign({ language: 'nl', level: 2, frameHosts: [], peertubeHosts: [], texts: {}, decorate: false }, options);
	const text = (k, d) => o.texts[k] ?? d;
	const md = MarkdownIt({ html: true, linkify: true, typographer: false });
	md.use(footnote).use(deflist);
	md.linkify.set({ fuzzyEmail: false });
	md.inline.ruler.before('link', 'wikilink', wikilinkRule);
	md.inline.ruler.before('emphasis', 'note_inline', noteInlineRule);
	md.inline.ruler.before('escape', 'math_inline', mathInlineRule);
	md.inline.ruler.before('emphasis', 'image_attributes', imageAttributesRule);
	md.inline.ruler.before('strikethrough', 'sub', supSubRule('~', 'sub'));
	md.inline.ruler.before('emphasis', 'sup', supSubRule('^', 'sup'));
	doubleDelimiter(md, '=', 'mark', 'mark');
	doubleDelimiter(md, '+', 'ins', 'ins');
	md.block.ruler.before('paragraph', 'note_block', noteBlockRule, { alt: ['paragraph', 'reference', 'blockquote', 'list'] });
	md.block.ruler.before('fence', 'math_block', mathBlockRule, { alt: ['paragraph', 'reference', 'blockquote', 'list'] });
	md.block.ruler.before('fence', 'container', containerRule, { alt: ['paragraph', 'reference', 'blockquote', 'list'] });
	md.core.ruler.after('inline', 'callouts', calloutsRule);
	md.core.ruler.after('callouts', 'task_list', taskListRule);
	md.core.ruler.after('task_list', 'figures', figuresRule);
	md.core.ruler.after('figures', 'descriptions', descriptionsRule);
	md.core.ruler.after('descriptions', 'headings', headingsRule);
	md.core.ruler.after('headings', 'toc_embed', tocAndEmbedRule(o));
	const pageHref = page => o.pageHref ? o.pageHref(page) : o.language + '/' + page.trim().replace(/\s+/g, '_');
	const r = md.renderer.rules;

	r.callout_open = (tokens, i) => {
		const m = tokens[i].meta;
		if (m.type === 'quote') return '<blockquote class="callout quote">\n';
		const title = m.title || text('callout-' + m.type, m.type);
		return `<aside class="callout ${esc(m.type)}" aria-label="${esc(title)}">` + (m.title ? `<p class="callout-title">${esc(m.title)}</p>` : '') + '\n';
	};
	r.callout_close = (tokens, i) => tokens[i].meta.type === 'quote' ? '</blockquote>\n' : '</aside>\n';
	r.wikilink = (tokens, i) => {
		const m = tokens[i].meta;
		const missing = o.decorate && o.pageExists && !o.pageExists(m.page);
		return `<a href="${esc(pageHref(m.page) + m.anchor)}"${o.decorate ? ` class="wikilink${missing ? ' missing' : ''}" data-page="${esc(m.page)}"` : ''}>${esc(tokens[i].content)}</a>`;
	};
	r.sup = (tokens, i) => `<sup>${esc(tokens[i].content)}</sup>`;
	r.sub = (tokens, i) => `<sub>${esc(tokens[i].content)}</sub>`;
	r.note_inline = () => '';
	r.note_block = () => '';
	r.task_checkbox = (tokens, i) => `<input${tokens[i].meta.checked ? ' checked=""' : ''} disabled="" type="checkbox"> `;
	r.math_inline = (tokens, i) => math(tokens[i].content, false);
	r.math_block = (tokens, i) => math(tokens[i].content, true) + '\n';
	function math(tex, block) {
		const mathml = o.math ? o.math(tex, block) : null;
		const inner = mathml ?? `<code class="math-tex">${esc((block ? '$$' : '$') + tex + (block ? '$$' : '$'))}</code>`;
		return block ? `<div class="math math-block">${inner}</div>` : `<span class="math">${inner}</span>`;
	}
	r.figure_open = (tokens, i) => `<figure class="${esc(tokens[i].meta.placement)}">`;
	r.figure_close = () => '</figure>\n';
	r.figcaption_open = () => '<figcaption>';
	r.figcaption_close = () => '</figcaption>';
	r.image = (tokens, i, opts, env, self) => {
		const t = tokens[i];
		let s = `<img src="${esc(o.imageSrc ? o.imageSrc(t.attrGet('src')) : t.attrGet('src'))}" alt="${esc(plainText(t.children))}"`;
		if (t.attrGet('title')) s += ` title="${esc(t.attrGet('title'))}"`;
		for (const k of ['width', 'height']) if (t.attrGet(k)) s += ` ${k}="${esc(t.attrGet(k))}"`;
		return s + ' loading="lazy">';
	};
	r.toc = (tokens, i, opts, env) => `<nav class="toc" aria-label="${esc(text('toc', 'Inhoud'))}"><ol>` + (env.headings || []).filter(h => h[0] >= 2 && h[0] <= 4).map(h => `<li class="toc-${h[0]}"><a href="#${esc(h[1])}">${esc(h[2])}</a></li>`).join('') + '</ol></nav>\n';
	r.embed = (tokens, i) => {
		const m = tokens[i].meta;
		return `<figure class="embed ${esc(m.service)}"><iframe src="${esc(m.src)}" title="${esc(text('embed-' + m.service, m.service[0].toUpperCase() + m.service.slice(1)))}" width="560" height="315" allow="fullscreen; picture-in-picture" allowfullscreen=""></iframe><figcaption><a href="${esc(m.url)}">${esc(m.url)}</a></figcaption></figure>\n`;
	};
	r.fence = (tokens, i) => {
		const t = tokens[i];
		const info = t.info.trim();
		const lang = (info.split(/[\s{=!]/)[0] || '').toLowerCase();
		const attributes = /\{([^}]*)\}\s*$/.exec(info) ? parseAttributes(/\{([^}]*)\}\s*$/.exec(info)[1]) : {};
		const description = t.meta?.description || '';
		if (lang === 'mermaid') {
			const place = PLACEMENTS.includes(attributes.class) ? ' ' + attributes.class : '';
			const caption = description ? `<figcaption>${esc(description)}</figcaption>` : '';
			const svg = o.diagram ? o.diagram(t.content, description) : null;
			if (svg == null) return `<figure class="diagram${place}"><pre class="diagram-src">${esc(t.content)}</pre>${caption}</figure>\n`;
			return `<figure class="diagram${place}">${svg}${caption}<details class="diagram-source"><summary>${esc(text('diagram-source', 'Tekst van het diagram'))}</summary><pre>${esc(t.content)}</pre></details></figure>\n`;
		}
		if (lang === 'html' && /^html\s+(interactief|interactive)\b/i.test(info) && o.level >= 2 && description) {
			const html = o.interactive ? o.interactive(t.content, +(attributes.hoogte || attributes.height || 0), description) : null;
			if (html != null) return html;
			return `<div class="hypha-interactief"></div>\n`;
		}
		const hl = HIGHLIGHT[lang];
		if (hl && o.highlight) {
			const html = o.highlight(t.content, hl);
			if (html != null) return `<pre class="code"><code class="hljs language-${esc(lang)}">${html}</code></pre>\n`;
		}
		return `<pre class="code"><code${lang ? ` class="language-${esc(lang)}"` : ''}>${esc(t.content)}</code></pre>\n`;
	};
	//
	// Tables: the alignment as the attribute align, as league/commonmark writes it (no style attribute in HTML).
	//
	r.s_open = () => '<del>';
	r.s_close = () => '</del>';
	for (const cell of ['th_open', 'td_open']) r[cell] = (tokens, i) => {
		const style = tokens[i].attrGet('style');
		const align = style && /text-align:(\w+)/.exec(style);
		return `<${tokens[i].tag}${align ? ` align="${align[1]}"` : ''}>`;
	};
	//
	// Footnotes in the HTML of league/commonmark with the Hypha renderers.
	//
	const label = (tokens, i, env) => String(env.footnotes.list[tokens[i].meta.id].label ?? tokens[i].meta.id + 1).toLowerCase();
	r.footnote_ref = (tokens, i, opts, env) => { const l = esc(label(tokens, i, env)); return `<sup class="footnote-ref"><a href="#fn-${l}" id="fnref-${l}">${tokens[i].meta.id + 1}</a></sup>`; };
	r.footnote_block_open = () => `<section class="footnotes" aria-label="${esc(text('footnotes', 'Voetnoten'))}"><ol>\n`;
	r.footnote_block_close = () => '</ol></section>\n';
	r.footnote_open = (tokens, i, opts, env) => `<li id="fn-${esc(label(tokens, i, env))}">`;
	r.footnote_close = () => '</li>\n';
	r.footnote_anchor = (tokens, i, opts, env) => ` <a href="#fnref-${esc(label(tokens, i, env))}" class="footnote-backref" aria-label="${esc(text('footnote-back', 'Terug naar de tekst'))}">↩</a>`;

	const render = md.render.bind(md);
	md.hyphaRender = (src, env = {}) => render(preprocess(src), env);
	md.hyphaParse = (src, env = {}) => md.parse(preprocess(src), env);
	return md;
}
