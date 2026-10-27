//
// The Markdown editor of Hypha (issue #520; design sections 5 to 9 and 12.16): two views on one Markdown source,
// Opmaak (ProseMirror) and Markdown (CodeMirror 6), with the preview, the checklist and the dialogs of the prototype.
// The page gives the configuration as JSON in #mdeConfig (system/core/mdeditor.php); saving goes to the server as
// fields plus the SVG of the diagrams and the MathML of the formulas, keyed by the SHA-256 of their source.
//
import * as PM from 'prosemirror';
import DOMPurify from 'dompurify';
import { createMarkdown, esc, slug, plainText } from './hypha-markdown.js';
import { schema, parse as pmParse, serialize as pmSerialize } from './opmaak.js';
import { frontText, parseFront, FRONT_RE } from './voorkant.js';
import { HyphaPlakken } from './plakken.js';
import { Dialogs } from './dialogen.js';

const $ = (sel, root = document) => root.querySelector(sel);
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const idle = fn => (window.requestIdleCallback || (f => setTimeout(f, 200)))(fn);

//
// Libraries that are loaded only when an article needs them (design section 12.16, requirement 4).
//
const lazy = {};
export const load = name => lazy[name] ||= import(name).then(m => m.default || m);
//
// CodeMirror only when the Markdown view is used: most authors write in Opmaak (requirement 4, Lighthouse).
//
let CM = null;

//
// SHA-256 for a page over plain http: browsers offer crypto.subtle only in a secure context (https or localhost), and
// the drawings of diagrams and formulas are matched on the server by the SHA-256 of their source (found on an iPhone
// on the local network: no article with a diagram could be saved).
//
export function sha256(bytes) {
	const k = new Uint32Array([0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2]);
	const h = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
	const length = bytes.length, padded = new Uint8Array(((length + 9 + 63) >> 6) << 6);
	padded.set(bytes);
	padded[length] = 0x80;
	const view = new DataView(padded.buffer);
	view.setUint32(padded.length - 8, Math.floor(length / 0x20000000));
	view.setUint32(padded.length - 4, (length << 3) >>> 0);
	const w = new Uint32Array(64), r = (x, n) => (x >>> n) | (x << (32 - n));
	for (let off = 0; off < padded.length; off += 64) {
		for (let i = 0; i < 16; i++) w[i] = view.getUint32(off + i * 4);
		for (let i = 16; i < 64; i++) w[i] = (w[i - 16] + (r(w[i - 15], 7) ^ r(w[i - 15], 18) ^ (w[i - 15] >>> 3)) + w[i - 7] + (r(w[i - 2], 17) ^ r(w[i - 2], 19) ^ (w[i - 2] >>> 10))) >>> 0;
		let [a, b, c, d, e, f, g, hh] = h;
		for (let i = 0; i < 64; i++) {
			const t1 = (hh + (r(e, 6) ^ r(e, 11) ^ r(e, 25)) + ((e & f) ^ (~e & g)) + k[i] + w[i]) >>> 0;
			const t2 = ((r(a, 2) ^ r(a, 13) ^ r(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
			[hh, g, f, e, d, c, b, a] = [g, f, e, (d + t1) >>> 0, c, b, a, (t1 + t2) >>> 0];
		}
		[a, b, c, d, e, f, g, hh].forEach((x, i) => { h[i] = (h[i] + x) >>> 0; });
	}
	const out = new Uint8Array(32);
	h.forEach((x, i) => new DataView(out.buffer).setUint32(i * 4, x));
	return out;
}

//
// Page names are compared without regard to case only for A to Z, as hypha_getPage() on the server does (strtolower).
//
const asciiLower = s => String(s).replace(/[A-Z]+/g, c => c.toLowerCase());

//
// Characters as a reader sees them: an emoji of several code points or a letter with a separate accent counts once.
//
const graphemes = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;
const characters = s => graphemes ? [...graphemes.segment(String(s))].length : [...String(s)].length;

//
// Words for the word count and the reading time: accents (\p{M}) belong to their word, and in Chinese and Japanese,
// which have no spaces, every character counts as a word.
//
const countWords = text => {
	const cjk = (text.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/gu) || []).length;
	return cjk + (text.replace(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/gu, ' ').match(/[\p{L}\p{N}\p{M}’'-]+/gu) || []).length;
};

export class Editor {
	constructor(root, config) {
		this.root = root;
		this.cfg = config;
		this.texts = config.texts || {};
		this.kind = config.kind;
		this.article = config.kind === 'article';
		this.fields = Object.assign({ title: '', author: '', excerpt: '', section: '', tags: [], image: '', imageAlt: '', imageCaption: '', imageCredit: '', method: '', sources: '', text: '', frontmatter: '' }, config.fields);
		this.saved = JSON.stringify(this.fields);
		this.revision = config.page?.revision ?? '';
		const query = new URLSearchParams(location.search).get('mode');
		const pref = config.user?.preferences || {};
		this.editMode = query === 'markdown' || query === 'visual' ? query : (pref.mode || 'visual');
		this.viewMode = 'write';
		this.showAll = false;
		this.split = pref.split || 50;
		this.frontError = null;
		this.diagrams = new Map();
		this.lastDiagram = new Map();
		this.mathErrors = new Set();
		this.pagesByName = new Map((config.pages || []).map(([name, priv]) => [asciiLower(name), priv]));
		this.markdown = createMarkdown(this.markdownOptions(false));
		this.preview = createMarkdown(this.markdownOptions(true));
		this.dialogs = new Dialogs(this);
	}

	t(key, vars) {
		let s = this.texts[key] ?? key;
		if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`[[${k}]]`).join(v);
		return s;
	}

	markdownOptions(preview) {
		const c = this.cfg;
		return {
			language: c.page.language, level: c.settings?.level ?? 2, frameHosts: c.settings?.frameHosts || FRAME_HOSTS, peertubeHosts: c.settings?.peertubeHosts || [],
			texts: { footnotes: this.t('html-footnotes'), 'footnote-back': this.t('html-footnote-back'), toc: this.t('html-toc'), 'diagram-source': this.t('html-diagram-source') },
			decorate: preview,
			pageExists: page => this.pagesByName.has(asciiLower(page)),
			diagram: preview ? (text, description) => this.diagramSvg(text, description) : null,
			math: preview ? (tex, display) => this.mathml(tex, display) : null,
			highlight: preview ? (code, language) => lazy.hljsLoaded ? lazy.hljsLoaded.highlight(code, { language, ignoreIllegals: true }).value : null : null,
			interactive: preview ? (code, height, description) => `<figure class="interactief"><iframe data-mde-own="${this.own}:${this.frames.push(this.srcdoc(code)) - 1}" sandbox="allow-scripts" title="${esc(description)}" loading="lazy" referrerpolicy="no-referrer" height="${Math.min(height || 400, 4000)}"></iframe><figcaption>${esc(description)}</figcaption></figure>` : null,
			imageSrc: src => /^(https?:|\/|data:)/.test(src) ? src : this.cfg.root + src,
		};
	}

	//
	// The document of an interactive block, with the same Content-Security-Policy as HyphaMarkdown::srcdoc() on the server.
	//
	frames = [];

	get own() {
		if (!this.ownToken) this.ownToken = Array.from(crypto.getRandomValues(new Uint8Array(12)), b => b.toString(16).padStart(2, '0')).join('');
		return this.ownToken;
	}

	srcdoc(code) {
		const hosts = (this.cfg.settings?.scriptHosts || []).map(h => 'https://' + h).join(' ');
		const csp = `default-src 'none'; script-src 'unsafe-inline' ${hosts}; style-src 'unsafe-inline' ${hosts}; img-src data: https:; font-src ${hosts}; connect-src 'none'; form-action 'none'`;
		return `<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${esc(csp)}"><style>body{margin:0;font-family:Lato,Helvetica,Arial,sans-serif}</style>` + code;
	}

	//
	// Start: the interface, the two views and the side column.
	//
	async mount() {
		this.root.innerHTML = this.template();
		this.root.classList.add('mde-ready');
		this.bindToolbar();
		this.bindHead();
		this.createVisualViews();
		if (this.editMode === 'markdown') await this.createMarkdownView();
		this.setEditMode(this.editMode, false);
		this.setViewMode('write');
		this.applySplit(this.split);
		this.restoreDraft();
		this.refresh();
		window.addEventListener('beforeunload', e => { if (this.dirty()) { e.preventDefault(); e.returnValue = ''; } });
		document.addEventListener('keydown', e => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); this.save(); } });
		this.fitToolbar();
		new ResizeObserver(() => this.fitToolbar()).observe($('.toolbar', this.root));
		//
		// The bar 'Bewerken als' sticks right below the toolbar, whose height depends on the fonts of the theme.
		//
		const editbar = $('.editbar', this.root);
		if (editbar) new ResizeObserver(() => this.root.style.setProperty('--sticky-top', editbar.offsetHeight + 8 + 'px')).observe(editbar);
		this.followKeyboard();
		this.ready = true;
		this.root.dispatchEvent(new CustomEvent('mde-ready'));
	}

	template() {
		const t = k => esc(this.t(k));
		const tb = (act, icon, label, title, extra = '') => `<button type="button" class="tb" data-act="${act}" title="${t(title)}"${label ? '' : ` aria-label="${t(title)}"`} ${extra}><i class="fa fa-${icon}" aria-hidden="true"></i>${label ? `<span class="lbl">${t(label)}</span>` : ''}</button>`;
		const head = this.article ? `
			<details class="wyshead" id="mdeHead" open>
				<summary class="wh-label" title="${t('head-fold')}"><i class="fa fa-caret-right tw" aria-hidden="true"></i><i class="fa fa-lock" aria-hidden="true"></i> ${t('head')} <span class="hint">– ${t('head-hint')}</span><span class="sumtext" id="mdeSumHead"></span></summary>
				<textarea id="mdeTitle" class="wh-title" rows="1" aria-label="${t('field-title')}" placeholder="${t('field-title')}" title="${t('field-title-help')}"></textarea>
				<div class="count" id="mdeTitleCount" aria-live="polite"></div>
				<div class="wh-row"><label class="wh-key" for="mdeAuthor">${t('field-by')}</label><input type="text" id="mdeAuthor" autocomplete="off" placeholder="${t('field-author')}" title="${t('field-author-help')}"></div>
				<div class="wh-media">
					<div class="wh-img" role="group" aria-label="${t('field-image')}">
						<button type="button" class="wh-thumb" id="mdeHeroBtn" title="${t('field-image-choose')}"><img id="mdeHeroThumb" alt=""><span><i class="fa fa-upload" aria-hidden="true"></i> ${t('field-image-other')}</span></button>
						<div class="wh-imgfields">
							<div class="wh-row"><span class="small" id="mdeHeroName"></span><button type="button" class="linkbtn" id="mdeHeroDel" title="${t('field-image-remove-help')}" style="margin-left:auto">${t('field-image-remove')}</button></div>
							<label class="wh-key" for="mdeHeroAlt">${t('field-image-alt')}</label><input type="text" id="mdeHeroAlt" placeholder="${t('field-image-alt-help')}" title="${t('field-image-alt-help')}">
							<label class="wh-key" for="mdeHeroCap">${t('field-image-caption')}</label><input type="text" id="mdeHeroCap" title="${t('field-image-caption')}">
							<label class="wh-key" for="mdeHeroCredit">${t('field-image-credit')}</label><input type="text" id="mdeHeroCredit" placeholder="${t('field-image-credit-help')}" title="${t('field-image-credit-help')}">
						</div>
					</div>
					<div class="wh-ex">
						<label class="wh-key" for="mdeExcerpt">${t('field-excerpt')}</label>
						<textarea id="mdeExcerpt" class="wh-excerpt" lang="${esc(this.cfg.page.language)}" spellcheck="true" rows="4" placeholder="${t('field-excerpt-help')}" title="${t('field-excerpt-help')}"></textarea>
						<div class="count" id="mdeExcerptCount" aria-live="polite"></div>
					</div>
				</div>
				<div class="tags" id="mdeTagBox"><label class="wh-key" for="mdeSection">${t('field-section')}</label><select id="mdeSection" title="${t('field-section-help')}"></select><span class="wh-key">${t('field-tags')}</span><span id="mdeTagList"></span><select id="mdeTagAdd" aria-label="${t('field-tag-add')}" title="${t('field-tag-add-help')}"></select></div>
			</details>` : `
			<div class="wh-row mde-pagehead">${this.cfg.translate ? `<label class="wh-key" for="mdeLanguage">${t('field-language')}</label><select id="mdeLanguage"></select>` : ''}<label class="wh-key" for="mdeTitle">${t('field-pagename')}</label><input type="text" id="mdeTitle" title="${t('field-pagename-help')}">${this.cfg.translate ? '' : `<label><input type="checkbox" id="mdePrivate"> ${t('field-private')}</label>`}</div>`;
		const foot = this.article ? `
			<div class="wysfoot">
				<details class="fbox" id="mdeFootMethod" open><summary class="wh-label"><i class="fa fa-caret-right tw" aria-hidden="true"></i><i class="fa fa-lock" aria-hidden="true"></i> ${t('field-method')} <span class="hint">(${t('required')})</span><span class="sumtext" id="mdeSumMethod"></span></summary><div class="wf-field" id="mdeMethod" title="${t('field-method-help')}"></div></details>
				<details class="fbox" id="mdeFootSources" open><summary class="wh-label"><i class="fa fa-caret-right tw" aria-hidden="true"></i><i class="fa fa-lock" aria-hidden="true"></i> ${t('field-sources')} <span class="hint">(${t('recommended')})</span><span class="sumtext" id="mdeSumSources"></span></summary><div class="wf-field" id="mdeSources" title="${t('field-sources-help')}"></div></details>
			</div>` : '';
		return `
		<a class="skip" href="#mdeText">${t('skip-to-text')}</a>
		${this.article ? '<div class="steps" id="mdeSteps" role="group" aria-label="' + t('status') + '"></div>' : ''}
		<div class="layout">
			<section>
				<div class="editbar" id="mdeEditbar"><div class="toolbar" role="toolbar" aria-label="${t('toolbar')}">
					${tb('heading', 'header', 'tb-heading', 'tb-heading-help')}<span class="sep"></span>
					${tb('bold', 'bold', '', 'tb-bold')}${tb('italic', 'italic', '', 'tb-italic')}<span class="sep"></span>
					${tb('list', 'list-ul', 'tb-list', 'tb-list-help')}${tb('quote', 'quote-left', 'tb-quote', 'tb-quote-help')}${tb('callout', 'square-o', 'tb-callout', 'tb-callout-help')}
					${tb('table', 'table', 'tb-table', 'tb-table-help', 'aria-haspopup="menu" aria-expanded="false"').replace('</span></button>', '</span> <i class="fa fa-caret-down" aria-hidden="true"></i></button>')}<span class="sep"></span>
					${tb('link', 'link', 'tb-link', 'tb-link-help')}${tb('image', 'picture-o', 'tb-image', 'tb-image-help', 'aria-haspopup="dialog"')}${tb('math', 'calculator', 'tb-math', 'tb-math-help')}${tb('diagram', 'sitemap', 'tb-diagram', 'tb-diagram-help', 'aria-haspopup="dialog"')}
					${tb('slash', 'ellipsis-h', '', 'tb-blocks', 'data-md-only="1"').replace('class="tb"', 'class="tb md-only"')}<span class="sep"></span>
					${this.article ? tb('download', 'download', 'tb-download', 'tb-download-help') + tb('openmd', 'file-text-o', '', 'tb-open') : ''}
					${tb('help', 'question-circle', '', 'tb-help', 'data-md-only="1" aria-haspopup="dialog"').replace('class="tb"', 'class="tb md-only"')}
					<button class="tb tbmore" id="mdeMore" type="button" title="${t('tb-more-help')}" aria-haspopup="menu" aria-expanded="false" hidden><span class="lbl">${t('tb-more')}</span> <i class="fa fa-caret-down" aria-hidden="true"></i></button>
					<div class="modes" role="group" aria-label="${t('view')}">
						<button type="button" data-mode="write" aria-pressed="true" title="${t('view-write-help')}"><i class="fa fa-pencil" aria-hidden="true"></i><span>${t('view-write')}</span></button>
						<button type="button" data-mode="preview" aria-pressed="false" title="${t('view-preview-help')}"><i class="fa fa-eye" aria-hidden="true"></i><span>${t('view-preview')}</span></button>
						<button type="button" data-mode="side" aria-pressed="false" title="${t('view-side-help')}"><i class="fa fa-columns" aria-hidden="true"></i><span>${t('view-side')}</span></button>
					</div>
				</div></div>
				<div class="panes write-only" id="mdePanes" role="region" aria-label="${t(this.article ? 'region-article' : 'region-page')}">
					<div class="editorpane" id="mdeEditorpane">
						<div class="editmodebar"><span>${t('edit-as')}</span>
							<div class="editmode" role="group" aria-label="${t('edit-as-help')}">
								<button type="button" data-edit="visual" aria-pressed="false" title="${t('edit-visual-help')}"><i class="fa fa-font" aria-hidden="true"></i><span>${t('edit-visual')}</span></button>
								<button type="button" data-edit="markdown" aria-pressed="false" title="${t('edit-markdown-help')}"><i class="fa fa-hashtag" aria-hidden="true"></i><span>${t('edit-markdown')}</span></button>
							</div>
						</div>
						<div class="mde-visual">${head}<div class="wys art" id="mdeVisual"></div>${foot}</div>
						<div class="mde-markdown" id="mdeText"></div>
					</div>
					<div class="splitter" id="mdeSplitter" role="separator" tabindex="0" aria-orientation="vertical" aria-controls="mdeEditorpane" aria-label="${t('splitter')}" aria-valuemin="20" aria-valuemax="80" aria-valuenow="50" title="${t('splitter-help')}"></div>
					<div class="previewpane" id="mdePreviewPane">
						<div class="devicebar"><span>${t('preview-as')}</span>
							<button type="button" data-device="desktop" aria-pressed="true" title="${t('device-desktop-help')}"><i class="fa fa-desktop" aria-hidden="true"></i> ${t('device-desktop')}</button>
							<button type="button" data-device="phone" aria-pressed="false" title="${t('device-phone-help')}"><i class="fa fa-mobile" aria-hidden="true"></i> ${t('device-phone')}</button>
							<button type="button" data-device="phone-land" aria-pressed="false" title="${t('device-phone-land-help')}"><i class="fa fa-mobile fa-rotate-90" aria-hidden="true"></i> ${t('device-phone-land')}</button>
						</div>
						<div class="frame" id="mdeFrame"><article class="art" id="mdePreview" lang="${esc(this.cfg.page.language)}"></article></div>
					</div>
				</div>
				<input type="file" id="mdeImport" accept=".md,text/markdown,text/plain" hidden>
			</section>
			<aside class="side">
				<div class="card">
					<div class="cardhead"><h2>${t(this.article ? 'checklist' : 'checklist-page')}</h2><label class="switch" title="${t('show-all-help')}"><span>${t('show-all')}</span><input type="checkbox" role="switch" id="mdeShowAll"><span class="track" aria-hidden="true"></span></label></div>
					<ul class="facts" id="mdeFacts"></ul>
					<ul class="checks" id="mdeChecks"></ul>
					<div class="summary" id="mdeSummary" role="status"></div>
					<div id="mdeTipsBox"><h2 style="margin-top:14px">${t('tips')} <span class="small">(${t('optional')})</span></h2><ul class="checks" id="mdeTips"></ul></div>
				</div>
				<details class="card" id="mdeOutlineBox"><summary><i class="fa fa-caret-right" aria-hidden="true"></i><h2>${t('outline')}</h2></summary><nav class="outline" id="mdeOutline" aria-label="${t('outline')}"></nav></details>
			</aside>
		</div>
		<div class="popup" id="mdePopup" hidden role="listbox" aria-label="${t('suggestions')}"></div>
		<div class="menu" id="mdeTableMenu" role="menu" aria-label="${t('tb-table')}" hidden></div>
		<div class="menu" id="mdeMoreMenu" role="menu" aria-label="${t('tb-more')}" hidden></div>
		<div class="toast" id="mdeToast" role="status" aria-live="polite"></div>
		${this.dialogs.template()}`;
	}

	//
	// The Markdown view: CodeMirror 6, with the Markdown characters dimmed, the Frontmatter on top, the / menu and the
	// [[ suggestions, and paste from word processors.
	//
	async createMarkdownView() {
		if (this.cm) return;
		CM ||= await import('codemirror');
		const { state, view, commands, language, markdown, highlight, search } = CM;
		const dim = language.HighlightStyle.define([
			{ tag: [highlight.tags.processingInstruction, highlight.tags.meta, highlight.tags.contentSeparator], color: 'var(--dim)' },
			{ tag: highlight.tags.heading, fontWeight: '700' },
			{ tag: highlight.tags.strong, fontWeight: '700' },
			{ tag: highlight.tags.emphasis, fontStyle: 'italic' },
			{ tag: highlight.tags.strikethrough, textDecoration: 'line-through' },
			{ tag: highlight.tags.link, color: 'var(--action)' },
			{ tag: highlight.tags.url, color: 'var(--dim)' },
			{ tag: highlight.tags.monospace, fontFamily: 'var(--mono)', fontSize: '0.9em' },
			{ tag: highlight.tags.quote, fontStyle: 'italic' },
		]);
		//
		// The Frontmatter at the top is grey, like Markdown characters.
		//
		const frontDeco = view.ViewPlugin.fromClass(class {
			constructor(v) { this.decorations = this.build(v); }
			update(u) { if (u.docChanged || u.viewportChanged) this.decorations = this.build(u.view); }
			build(v) {
				const m = v.state.doc.sliceString(0, Math.min(v.state.doc.length, 20000)).match(FRONT_RE);
				if (!m) return view.Decoration.none;
				const b = new state.RangeSetBuilder();
				for (let pos = 0; pos < m[0].length;) {
					const line = v.state.doc.lineAt(pos);
					b.add(line.from, line.from, view.Decoration.line({ class: 'cm-front' }));
					pos = line.to + 1;
				}
				return b.finish();
			}
		}, { decorations: v => v.decorations });
		const keys = view.keymap.of([
			{ key: 'Mod-b', run: () => (this.action('bold'), true) },
			{ key: 'Mod-i', run: () => (this.action('italic'), true) },
			{ key: 'Mod-k', run: () => (this.action('link'), true) },
			{ key: 'Mod-s', run: () => (this.save(), true) },
			{ key: 'Tab', run: () => this.dialogs.mdTableTab(1) },
			{ key: 'Shift-Tab', run: () => this.dialogs.mdTableTab(-1) },
			...commands.defaultKeymap, ...commands.historyKeymap, ...search.searchKeymap,
		]);
		this.cm = new view.EditorView({
			parent: $('#mdeText', this.root),
			state: state.EditorState.create({
				doc: this.markdownDocument(),
				extensions: [
					commands.history(), view.drawSelection(), view.highlightActiveLine(), view.EditorView.lineWrapping, keys,
					markdown.markdown({ base: markdown.markdownLanguage }), language.syntaxHighlighting(dim), frontDeco,
					view.EditorView.contentAttributes.of({ lang: this.cfg.page.language, spellcheck: 'true', autocorrect: 'on', autocapitalize: 'sentences', 'aria-label': this.t(this.article ? 'region-article' : 'region-page'), 'aria-multiline': 'true', 'aria-describedby': 'mdeTextHelp' }),
					view.EditorView.updateListener.of(u => { if (u.docChanged) this.onMarkdownChange(); if (u.selectionSet || u.docChanged) { this.dialogs.markdownCursor(u); this.dialogs.updateEditLabels(); this.followCaret(); } }),
					view.EditorView.domEventHandlers({ paste: e => this.pasteIntoMarkdown(e), drop: e => this.dropFile(e) }),
				],
			}),
		});
		const help = document.createElement('p');
		help.className = 'sr';
		help.id = 'mdeTextHelp';
		help.textContent = this.t('text-help');
		$('#mdeText', this.root).appendChild(help);
	}

	markdownDocument() {
		return frontText(this.fields, this.kind) + this.fields.text;
	}

	onMarkdownChange() {
		const doc = this.cm.state.doc.toString();
		const front = parseFront(doc);
		if (front.ok) {
			this.frontError = null;
			const f = front.fields;
			if (this.article) {
				for (const k of ['title', 'author', 'excerpt', 'section', 'image', 'imageAlt', 'imageCaption', 'imageCredit', 'method', 'sources']) this.fields[k] = String(f[k] ?? '');
				this.fields.tags = (f.tags || []).map(String);
				this.fields.frontmatter = front.extra;
				this.unknownFront = front.unknown;
			}
			else if ('title' in f) this.fields.title = String(f.title);
			this.fields.text = front.body;
		}
		else {
			//
			// Broken Frontmatter: the last good values stay; the checklist says which line (BR-38).
			//
			this.frontError = front;
			const m = doc.match(FRONT_RE);
			if (!m && !/^---/.test(doc)) this.fields.text = doc;
		}
		this.changed();
	}

	//
	// The visual view: ProseMirror for the text, and in an article also for bijsluiter and bronnen.
	//
	createVisualViews() {
		const { state, view, keymap, history, commands, schemaList, dropcursor, gapcursor, tables } = PM;
		const marks = schema.marks;
		const plugins = () => [
			history.history(),
			keymap.keymap({
				'Mod-z': history.undo, 'Shift-Mod-z': history.redo, 'Mod-y': history.redo,
				'Mod-b': commands.toggleMark(marks.strong), 'Mod-i': commands.toggleMark(marks.em),
				'Mod-k': () => (this.action('link'), true), 'Mod-s': () => (this.save(), true),
				'Enter': schemaList.splitListItem(schema.nodes.list_item), 'Mod-[': schemaList.liftListItem(schema.nodes.list_item), 'Mod-]': schemaList.sinkListItem(schema.nodes.list_item),
				'Tab': (st, dispatch, v) => tables.goToNextCell(1)(st, dispatch) || (tables.isInTable(st) && tables.addRowAfter(st, dispatch) && tables.goToNextCell(1)(v.state, v.dispatch)), 'Shift-Tab': tables.goToNextCell(-1), 'Shift-Enter': (st, dispatch) => { if (dispatch) dispatch(st.tr.replaceSelectionWith(schema.nodes.hard_break.create()).scrollIntoView()); return true; },
			}),
			keymap.keymap(commands.baseKeymap),
			dropcursor.dropCursor(), gapcursor.gapCursor(), tables.tableEditing(),
		];
		const make = (mount, text, label, field) => {
			const parsed = pmParse(text, this.markdown);
			const v = new view.EditorView(mount, {
				state: state.EditorState.create({ doc: parsed.doc, plugins: plugins() }),
				attributes: { lang: this.cfg.page.language, spellcheck: 'true', 'aria-label': label, 'aria-multiline': 'true', role: 'textbox' },
				nodeViews: this.nodeViews(),
				dispatchTransaction: tr => {
					v.updateState(v.state.apply(tr));
					if (tr.docChanged) { this.fields[field] = pmSerialize(v.state.doc, v.parsed); this.changed(); }
					if (tr.selectionSet || tr.docChanged) { this.dialogs.visualCursor(v); this.dialogs.updateEditLabels(); this.followCaret(); }
				},
				handlePaste: (pv, event) => this.pasteIntoVisual(pv, event),
				handleDrop: (pv, event) => this.dropFile(event),
				handleDoubleClickOn: (pv, pos, node) => this.dialogs.editNode(pv, pos, node),
			});
			v.parsed = parsed;
			v.field = field;
			return v;
		};
		this.pm = make($('#mdeVisual', this.root), this.fields.text, this.t(this.article ? 'region-article' : 'region-page'), 'text');
		this.pmViews = [this.pm];
		if (this.article) {
			this.pmMethod = make($('#mdeMethod', this.root), this.fields.method, this.t('field-method'), 'method');
			this.pmSources = make($('#mdeSources', this.root), this.fields.sources, this.t('field-sources'), 'sources');
			this.pmViews.push(this.pmMethod, this.pmSources);
		}
	}

	//
	// Atoms in the visual view: diagrams and formulas drawn, images and diagrams with buttons to edit and delete
	// (design step 2b, 44 pt), and grey blocks for what is only edited in Markdown.
	//
	nodeViews() {
		const button = (cls, icon, label, fn) => {
			const b = document.createElement('button');
			b.type = 'button';
			b.className = cls;
			b.title = b.ariaLabel = label;
			b.setAttribute('aria-label', label);
			b.innerHTML = `<i class="fa fa-${icon}" aria-hidden="true"></i>`;
			b.addEventListener('mousedown', e => e.preventDefault());
			b.addEventListener('click', e => { e.preventDefault(); fn(); });
			return b;
		};
		const removable = (dom, view, getPos, edit) => {
			if (edit) dom.appendChild(button('figedit', 'pencil', this.t('edit'), () => edit()));
			dom.appendChild(button('figdel', 'times', this.t('delete'), () => {
				const pos = getPos();
				view.dispatch(view.state.tr.delete(pos, pos + view.state.doc.nodeAt(pos).nodeSize));
				this.toast(this.t('deleted'), this.t('undo'), () => PM.history.undo(view.state, view.dispatch));
			}));
		};
		return {
			diagram: (node, view, getPos) => {
				const dom = document.createElement('figure');
				dom.className = 'diagram figx';
				dom.contentEditable = 'false';
				const draw = n => {
					const svg = this.diagramSvg(n.attrs.text, '');
					dom.querySelector('.dv')?.remove();
					const d = document.createElement('div');
					d.className = 'dv';
					d.innerHTML = svg ? DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true } }) : `<pre class="diagram-src">${esc(n.attrs.text)}</pre>`;
					dom.prepend(d);
				};
				let current = node;
				const redraw = () => draw(current);
				draw(node);
				this.atoms.add(redraw);
				removable(dom, view, getPos, () => this.dialogs.openDiagram({ view, pos: getPos(), node: view.state.doc.nodeAt(getPos()) }));
				return { dom, update: n => n.type === node.type && (current = n, draw(n), true), destroy: () => this.atoms.delete(redraw), ignoreMutation: () => true, stopEvent: e => e.type === 'mousedown' && e.target.closest('button') };
			},
			figure: (node, view, getPos) => {
				const dom = document.createElement('figure');
				dom.className = 'figure ' + node.attrs.placement;
				const img = document.createElement('img');
				img.src = this.markdownOptions(false).imageSrc(node.attrs.src);
				img.alt = node.attrs.alt;
				img.contentEditable = 'false';
				const caption = document.createElement('figcaption');
				caption.dataset.ph = this.t('caption-placeholder');
				dom.append(img, caption);
				removable(dom, view, getPos, () => this.dialogs.openImage({ view, pos: getPos(), node: view.state.doc.nodeAt(getPos()) }));
				return { dom, contentDOM: caption, update: n => { if (n.type !== node.type) return false; img.src = this.markdownOptions(false).imageSrc(n.attrs.src); img.alt = n.attrs.alt; dom.className = 'figure ' + n.attrs.placement; return true; }, ignoreMutation: m => !caption.contains(m.target) };
			},
			callout: (node, view, getPos) => this.calloutView(node, view, getPos),
			math_block: (node, view, getPos) => this.mathView(node, true, view, getPos),
			math_inline: (node, view, getPos) => this.mathView(node, false, view, getPos),
			html_block: node => this.rawView(node, 'raw-html'),
			raw: node => this.rawView(node, 'raw-markdown'),
			note_block: node => this.rawView(node, 'raw-note'),
			interactive: (node, view, getPos) => {
				const v = this.rawView(Object.assign({}, node, { attrs: { source: node.attrs.text } }), 'raw-interactive');
				//
				// At level 2 the block opens in its dialog (design section 10.1, rule 5); otherwise it is only shown.
				//
				if (this.markdownOptions(false).level >= 2) removable(v.dom, view, getPos, () => this.dialogs.openInteractive({ view, pos: getPos(), node: view.state.doc.nodeAt(getPos()) }));
				return Object.assign(v, { stopEvent: e => e.type === 'mousedown' && e.target.closest('button') });
			},
			toc: () => this.rawView({ attrs: { source: '[TOC]' } }, 'raw-toc'),
			embed: node => this.rawView({ attrs: { source: node.attrs.url } }, 'raw-embed'),
			note_inline: node => { const s = document.createElement('span'); s.className = 'note-inline'; s.title = node.attrs.source; s.textContent = '%%'; return { dom: s }; },
			html_inline: node => { const s = document.createElement('code'); s.className = 'raw-inline'; s.textContent = node.attrs.source; return { dom: s }; },
			footnote_ref: node => { const s = document.createElement('sup'); s.className = 'footnote-ref'; s.textContent = node.attrs.label; return { dom: s }; },
			wikilink: node => {
				const a = document.createElement('a');
				a.className = 'wikilink' + (this.pagesByName.has(asciiLower(node.attrs.page)) ? '' : ' missing');
				a.title = this.t(this.pagesByName.has(asciiLower(node.attrs.page)) ? 'page-exists' : 'page-missing');
				a.textContent = node.attrs.label || node.attrs.page;
				return { dom: a };
			},
			image: node => { const i = document.createElement('img'); i.src = this.markdownOptions(false).imageSrc(node.attrs.src); i.alt = node.attrs.alt; return { dom: i }; },
		};
	}

	//
	// A kader in the visual view: its title is a field above the text (a citaat has no title).
	//
	calloutView(node, view, getPos) {
		const type = node.attrs.type;
		const dom = document.createElement(type === 'quote' ? 'blockquote' : 'aside');
		dom.className = 'callout ' + type;
		const body = document.createElement('div');
		body.className = 'callout-body';
		let input = null;
		if (type !== 'quote') {
			input = document.createElement('input');
			input.type = 'text';
			input.className = 'callout-title';
			input.value = node.attrs.title;
			const name = this.t('callout-' + type);
			input.placeholder = name === 'callout-' + type ? type : name;
			input.setAttribute('aria-label', this.t('callout-title-prompt'));
			input.addEventListener('input', () => {
				const pos = getPos();
				view.dispatch(view.state.tr.setNodeMarkup(pos, null, Object.assign({}, view.state.doc.nodeAt(pos).attrs, { title: input.value })));
			});
			input.addEventListener('keydown', e => {
				if (e.key !== 'Enter' && e.key !== 'ArrowDown') return;
				e.preventDefault();
				view.dispatch(view.state.tr.setSelection(PM.state.Selection.near(view.state.doc.resolve(getPos() + 1))));
				view.focus();
			});
			dom.append(input);
		}
		dom.append(body);
		return {
			dom, contentDOM: body,
			update: n => { if (n.type !== node.type || n.attrs.type !== type) return false; if (input && input.value !== n.attrs.title && document.activeElement !== input) input.value = n.attrs.title; return true; },
			stopEvent: e => e.target === input,
			ignoreMutation: m => m.target === input,
		};
	}

	mathView(node, block, view, getPos) {
		const dom = document.createElement(block ? 'div' : 'span');
		dom.className = block ? 'math math-block' : 'math';
		dom.contentEditable = 'false';
		const draw = n => { dom.innerHTML = this.mathml(n.attrs.tex, block) ?? `<code class="math-tex">${esc(n.attrs.tex)}</code>`; dom.title = this.mathErrors.has(n.attrs.tex) ? this.t('math-error') : this.t('math-edit'); dom.classList.toggle('math-err', this.mathErrors.has(n.attrs.tex)); };
		let current = node;
		const redraw = () => draw(current);
		draw(node);
		this.atoms.add(redraw);
		dom.addEventListener('dblclick', () => this.dialogs.editMath(view, getPos()));
		return { dom, update: n => n.type === node.type && (current = n, draw(n), true), destroy: () => this.atoms.delete(redraw), ignoreMutation: () => true };
	}

	rawView(node, cls) {
		const dom = document.createElement('div');
		dom.className = 'raw ' + cls;
		dom.contentEditable = 'false';
		dom.innerHTML = `<span class="raw-label">${esc(this.t(cls))}</span><pre>${esc(node.attrs.source)}</pre>`;
		return { dom, ignoreMutation: () => true };
	}

	//
	// Switching between Opmaak and Markdown (BR-75): the source does not change, the cursor keeps its place.
	//
	async switchEditMode(mode) {
		if (mode === 'markdown' && !this.cm) await this.createMarkdownView();
		this.setEditMode(mode);
	}

	setEditMode(mode, keepCaret = true) {
		//
		// With broken Frontmatter the Markdown stays as typed: switching would rebuild it from the last good values.
		//
		if (mode === 'visual' && this.frontError && this.ready) { this.toast(this.t('switch-front-error')); return; }
		const caret = keepCaret && this.ready ? this.captureCaret() : null;
		if (mode === 'visual') this.loadVisual();
		else this.loadMarkdown();
		this.editMode = mode;
		this.root.classList.toggle('mode-visual', mode === 'visual');
		$('.skip', this.root).setAttribute('href', mode === 'visual' ? '#mdeVisual' : '#mdeText');
		this.root.classList.toggle('mode-markdown', mode === 'markdown');
		for (const b of this.root.querySelectorAll('[data-edit]')) b.setAttribute('aria-pressed', String(b.dataset.edit === mode));
		$('.toolbar', this.root).classList.toggle('visual', mode === 'visual');
		$('#mdeEditorpane', this.root).classList.toggle('visual', mode === 'visual');
		$('#mdeEditorpane', this.root).classList.toggle('head-on', mode === 'visual');
		if (caret) this.applyCaret(caret);
		this.fitToolbar();
		this.refresh();
	}

	loadVisual() {
		for (const v of this.pmViews || []) {
			const text = this.fields[v.field];
			if (v.parsed && pmSerialize(v.state.doc, v.parsed) === text) continue;
			v.parsed = pmParse(text, this.markdown);
			v.updateState(PM.state.EditorState.create({ doc: v.parsed.doc, plugins: v.state.plugins }));
		}
		this.renderHead();
	}

	loadMarkdown() {
		if (!this.cm) return;
		const doc = this.markdownDocument();
		if (this.cm.state.doc.toString() !== doc) this.cm.dispatch({ changes: { from: 0, to: this.cm.state.doc.length, insert: doc } });
	}

	//
	// The cursor as block number and offset in the visible text of that block, counted the same in both views.
	//
	captureCaret() {
		const blockStarts = text => { const p = pmParse(text, this.markdown); let line = (p.gaps[0] || []).length; const out = []; p.doc.forEach((n, o, i) => { out.push(line); line += (p.sources.get(n) || '').split('\n').length + (p.gaps[i + 1] || []).length; }); return out; };
		if (this.editMode === 'markdown') {
			const head = this.cm.state.selection.main.head;
			const front = (this.cm.state.doc.toString().match(FRONT_RE) || [''])[0].length;
			if (head < front) return { front: this.cm.state.doc.lineAt(head).text.split(':')[0] };
			const lineNo = this.cm.state.doc.lineAt(head).number - this.cm.state.doc.lineAt(front).number;
			const starts = blockStarts(this.fields.text);
			let index = 0;
			while (index + 1 < starts.length && starts[index + 1] <= lineNo) index++;
			const blockFrom = this.cm.state.doc.line(this.cm.state.doc.lineAt(front).number + starts[index]).from;
			const before = this.cm.state.doc.sliceString(blockFrom, head);
			return { index, visible: this.visibleLength(before) };
		}
		const v = this.pm;
		const { $head } = v.state.selection;
		if (!v.hasFocus() && document.activeElement?.closest('.wyshead')) return { front: { mdeTitle: 'titel', mdeAuthor: 'auteur', mdeExcerpt: 'uittreksel' }[document.activeElement.id] || 'titel' };
		return { index: $head.index(0), visible: $head.depth ? v.state.doc.textBetween($head.start(1), $head.pos, '\n', ' ').length : 0 };
	}

	visibleLength(markdown) {
		return markdown.replace(/^#{1,6} |^\s*[-*+] (\[.\] )?|^\s*\d+[.)] |^> ?(\[![^\]]*\][^\n]*\n?)?|\*\*|__|==|\+\+|~~|`|\[\[|\]\]|!?\[|\]\([^)]*\)/gm, '').length;
	}

	applyCaret(c) {
		requestAnimationFrame(() => {
			if (c.front) {
				if (this.editMode === 'visual') { const id = { titel: 'mdeTitle', auteur: 'mdeAuthor', uittreksel: 'mdeExcerpt', bijsluiter: 'mdeMethod', bronnen: 'mdeSources' }[c.front]; $('#' + (id || 'mdeTitle'), this.root)?.focus(); return; }
				const doc = this.cm.state.doc;
				for (let i = 1; i <= doc.lines; i++) if (doc.line(i).text.startsWith(c.front + ':')) { this.cm.dispatch({ selection: { anchor: doc.line(i).to }, scrollIntoView: true }); break; }
				this.cm.focus();
				return;
			}
			if (this.editMode === 'visual') {
				const v = this.pm;
				const index = Math.min(c.index, v.state.doc.childCount - 1);
				let pos = 0;
				for (let i = 0; i < index; i++) pos += v.state.doc.child(i).nodeSize;
				const node = v.state.doc.child(index);
				let target = pos + 1, count = 0;
				node.descendants((n, p) => { if (count >= c.visible) return false; if (n.isText) { const take = Math.min(n.text.length, c.visible - count); count += take; target = pos + 1 + p + take; } return true; });
				try { v.dispatch(v.state.tr.setSelection(PM.state.Selection.near(v.state.doc.resolve(Math.min(target, v.state.doc.content.size)))).scrollIntoView()); } catch (e) { /* atom at the cursor */ }
				v.focus();
				return;
			}
			const doc = this.cm.state.doc;
			const front = (doc.toString().match(FRONT_RE) || [''])[0].length;
			const p = pmParse(this.fields.text, this.markdown);
			let line = doc.lineAt(front).number + (p.gaps[0] || []).length, i = 0;
			p.doc.forEach((n, o, k) => { if (k < c.index) { line += (p.sources.get(n) || '').split('\n').length + (p.gaps[k + 1] || []).length; } });
			let pos = doc.line(Math.min(line, doc.lines)).from;
			const end = Math.min(doc.length, pos + 5000);
			while (pos < end && this.visibleLength(doc.sliceString(doc.line(Math.min(line, doc.lines)).from, pos)) < c.visible) pos++;
			this.cm.dispatch({ selection: { anchor: pos }, scrollIntoView: true });
			this.cm.focus();
		});
	}

	//
	// The fixed fields of the article head in the visual view.
	//
	bindHead() {
		const on = (id, key, fn) => { const el = $('#' + id, this.root); if (el) el.addEventListener('input', () => { this.fields[key] = el.value; if (fn) fn(); this.changed(); this.loadMarkdownLater(); }); };
		on('mdeTitle', 'title', () => this.autosize());
		on('mdeAuthor', 'author');
		on('mdeExcerpt', 'excerpt', () => this.autosize());
		on('mdeHeroAlt', 'imageAlt');
		on('mdeHeroCap', 'imageCaption');
		on('mdeHeroCredit', 'imageCredit');
		$('#mdeTitle', this.root)?.addEventListener('keydown', e => { if (e.key === 'Enter' && this.article) e.preventDefault(); });
		$('#mdePrivate', this.root)?.addEventListener('change', e => { this.fields.private = e.target.checked; this.changed(); });
		$('#mdeLanguage', this.root)?.addEventListener('change', e => { this.fields.language = e.target.value; this.changed(); });
		$('#mdeSection', this.root)?.addEventListener('change', e => { this.fields.section = e.target.value; this.changed(); this.loadMarkdownLater(); });
		$('#mdeTagAdd', this.root)?.addEventListener('change', e => {
			let v = e.target.value;
			if (v === '__new__') v = (prompt(this.t('tag-new-prompt')) || '').trim();
			if (v && !this.fields.tags.includes(v)) this.fields.tags.push(v);
			e.target.value = '';
			this.renderHead();
			this.changed();
			this.loadMarkdownLater();
		});
		$('#mdeHeroBtn', this.root)?.addEventListener('click', () => this.dialogs.openImage({ hero: true }));
		$('#mdeHeroDel', this.root)?.addEventListener('click', () => { Object.assign(this.fields, { image: '', imageAlt: '', imageCaption: '', imageCredit: '' }); this.renderHead(); this.changed(); this.loadMarkdownLater(); });
		$('#mdeShowAll', this.root).addEventListener('change', e => { this.showAll = e.target.checked; this.renderChecks(); });
		$('#mdeImport', this.root).addEventListener('change', e => { if (e.target.files[0]) this.importFile(e.target.files[0]); e.target.value = ''; });
	}

	loadMarkdownLater() {
		clearTimeout(this.mdTimer);
		this.mdTimer = setTimeout(() => { if (this.editMode === 'markdown') this.loadMarkdown(); }, 50);
	}

	renderHead() {
		const f = this.fields;
		const set = (id, v) => { const el = $('#' + id, this.root); if (el && el.value !== v && document.activeElement !== el) el.value = v ?? ''; };
		set('mdeTitle', f.title);
		if (!this.article) {
			const p = $('#mdePrivate', this.root);
			if (p) p.checked = !!f.private;
			const l = $('#mdeLanguage', this.root);
			if (l && !l.options.length) l.innerHTML = (this.cfg.languages || []).map(x => `<option value="${esc(x)}">${esc(x)}</option>`).join('');
			if (l && !f.language) f.language = l.value;
			return;
		}
		set('mdeAuthor', f.author);
		set('mdeExcerpt', f.excerpt);
		set('mdeHeroAlt', f.imageAlt);
		set('mdeHeroCap', f.imageCaption);
		set('mdeHeroCredit', f.imageCredit);
		const thumb = $('#mdeHeroThumb', this.root);
		thumb.hidden = !f.image;
		if (f.image) thumb.src = this.markdownOptions(false).imageSrc(f.image);
		$('#mdeHeroName', this.root).textContent = f.image ? f.image.split('/').pop() : this.t('field-image-none');
		const sections = this.cfg.settings.sections || [];
		$('#mdeSection', this.root).innerHTML = `<option value="">${esc(this.t('field-section-choose'))}</option>` + sections.map(s => `<option${s === f.section ? ' selected' : ''}>${esc(s)}</option>`).join('') + (f.section && !sections.includes(f.section) ? `<option selected>${esc(f.section)}</option>` : '');
		const known = new Set(this.cfg.tags || []);
		$('#mdeTagList', this.root).innerHTML = f.tags.map((tag, i) => `<span class="tag${known.has(tag) ? '' : ' unknown'}" title="${esc(this.t(known.has(tag) ? 'tag' : 'tag-unknown'))}">${esc(tag)} <button type="button" data-tag="${i}" aria-label="${esc(this.t('tag-remove', { tag }))}" title="${esc(this.t('tag-remove', { tag }))}">✕</button></span>`).join('');
		for (const b of this.root.querySelectorAll('#mdeTagList [data-tag]')) b.addEventListener('click', () => { f.tags.splice(+b.dataset.tag, 1); this.renderHead(); this.changed(); this.loadMarkdownLater(); });
		$('#mdeTagAdd', this.root).innerHTML = `<option value="">${esc(this.t('tag-add'))}</option>` + [...known].filter(x => !f.tags.includes(x)).map(x => `<option>${esc(x)}</option>`).join('') + (this.cfg.user.admin ? `<option value="__new__">${esc(this.t('tag-new'))}</option>` : '');
		this.autosize();
	}

	autosize() {
		for (const id of ['mdeTitle', 'mdeExcerpt']) { const el = $('#' + id, this.root); if (el && el.tagName === 'TEXTAREA') { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }
	}

	//
	// After every change: dirty state, draft in the browser when it is idle, and checklist and preview after a pause
	// (requirement 1: typing stays within 100 ms because the heavy work happens outside the key stroke).
	//
	changed() {
		this.updateChip();
		clearTimeout(this.draftTimer);
		this.draftTimer = setTimeout(() => idle(() => this.storeDraft()), 1000);
		clearTimeout(this.refreshTimer);
		this.refreshTimer = setTimeout(() => this.refresh(), 250);
	}

	dirty() { return JSON.stringify(this.fields) !== this.saved; }

	updateChip() {
		const btn = document.getElementById('mdeSave');
		if (btn) btn.classList.toggle('dirty', this.dirty());
	}

	refresh() {
		if (this.editMode === 'visual') this.renderHead();
		this.renderSummaries();
		this.renderChecks();
		this.renderOutline();
		this.renderSteps();
		if (this.viewMode !== 'write') this.renderPreview();
	}

	//
	// A folded block shows a summary of what is in it (design step 2).
	//
	renderSummaries() {
		const f = this.fields;
		const plain = md => md.replace(/%%[\s\S]*?%%/g, '').replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/\[\^[^\]]*\]/g, '')
			.replace(/^[ \t]*(#{1,6}|>|[-*+]|\d+[.)])[ \t]+/gm, '').replace(/[*_~=^`]+/g, '').replace(/\s+/g, ' ').trim();
		const set = (id, text) => { const el = $('#' + id, this.root); if (el) el.textContent = text ? '– ' + text : ''; };
		if (!this.article) return;
		set('mdeSumHead', [f.section, f.title, f.tags.length ? this.t('summary-tags', { n: f.tags.length }) : '', f.image ? this.t('summary-image') : ''].filter(Boolean).join(' · '));
		set('mdeSumMethod', plain(f.method).slice(0, 120));
		set('mdeSumSources', plain(f.sources).slice(0, 120));
	}

	//
	// A draft per page and per tab: the id of the page stays the same when it is renamed, and two tabs of the same page
	// do not overwrite each other's draft (found by testing two tabs at once).
	//
	draftPrefix() { return 'mde:' + (this.cfg.page.id || this.cfg.page.name) + ':' + (this.cfg.translate ? 'translate:' : this.cfg.page.language + ':'); }

	draftKey() {
		if (!this.tab) {
			try { this.tab = sessionStorage.getItem('mde-tab'); } catch (e) { /* no storage */ }
			if (!this.tab) {
				this.tab = Math.random().toString(36).slice(2, 10);
				try { sessionStorage.setItem('mde-tab', this.tab); } catch (e) { /* no storage */ }
			}
		}
		return this.draftPrefix() + this.tab;
	}

	storeDraft() {
		try {
			if (this.dirty()) localStorage.setItem(this.draftKey(), JSON.stringify({ at: Date.now(), fields: this.fields, base: this.saved, revision: this.revision }));
			else localStorage.removeItem(this.draftKey());
		} catch (e) { /* no storage: work in memory only */ }
	}

	//
	// The newest draft of this page from any tab. A draft made on an older version is offered too, with a warning,
	// instead of being dropped without a word; drafts equal to the saved text or older than 30 days are cleaned up.
	//
	restoreDraft() {
		let found = null;
		try {
			for (let i = localStorage.length - 1; i >= 0; i--) {
				const key = localStorage.key(i);
				if (!key || !key.startsWith(this.draftPrefix())) continue;
				const draft = JSON.parse(localStorage.getItem(key) || 'null');
				if (!draft || JSON.stringify(Object.assign(JSON.parse(this.saved), draft.fields)) === this.saved || Date.now() - draft.at > 30 * 86400000) { localStorage.removeItem(key); continue; }
				if (!found || draft.at > found.draft.at) found = { key, draft };
			}
		} catch (e) { return; }
		if (!found) return;
		const older = found.draft.base !== this.saved;
		this.toast(this.t(older ? 'draft-found-changed' : 'draft-found'), this.t('draft-restore'), () => {
			this.fields = Object.assign(this.fields, found.draft.fields);
			try { if (found.key !== this.draftKey()) localStorage.removeItem(found.key); } catch (e) { /* no storage */ }
			if (this.editMode === 'visual') this.loadVisual(); else this.loadMarkdown();
			this.changed();
		}, older ? 30000 : 12000);
	}

	//
	// Preview in the style of the article page (design step 7 and 9).
	//
	setViewMode(mode) {
		//
		// Side by side needs room: a wide screen, and a page column of the theme that is wide enough.
		//
		if (mode === 'side' && (window.innerWidth < 1024 || this.root.clientWidth < 900)) mode = 'preview';
		this.viewMode = mode;
		const panes = $('#mdePanes', this.root);
		panes.className = 'panes ' + { write: 'write-only', preview: 'preview-only', side: 'side' }[mode];
		this.root.classList.toggle('mode-side', mode === 'side');
		for (const b of this.root.querySelectorAll('[data-mode]')) b.setAttribute('aria-pressed', String(b.dataset.mode === mode));
		if (mode !== 'write') this.renderPreview();
	}

	renderPreview() {
		const f = this.fields;
		const out = $('#mdePreview', this.root);
		this.ensureLibraries(f.text + '\n' + f.method + '\n' + f.sources);
		const body = this.preview.hyphaRender(f.text);
		if (!this.article) {
			out.innerHTML = this.sanitize(`<h1>${esc(f.title)}</h1>` + body);
			this.followCaret();
			return;
		}
		const words = countWords(f.text.replace(/```[\s\S]*?```/g, '').replace(/%%[\s\S]*?%%/g, ''));
		const minutes = Math.max(1, Math.round(words / 220));
		const hero = f.image ? `<figure class="breed"><img src="${esc(this.markdownOptions(false).imageSrc(f.image))}" alt="${esc(f.imageAlt)}"><figcaption>${esc(f.imageCaption)} <i>${esc(f.imageCredit)}</i></figcaption></figure>` : '';
		const status = this.cfg.page.status;
		out.innerHTML = this.sanitize(`<header>${f.section ? `<p class="kicker">${esc(f.section)}</p>` : ''}<h1>${esc(f.title || this.t('untitled'))}</h1>${f.excerpt ? `<p class="intro">${esc(f.excerpt)}</p>` : ''}
			<p class="byline">${esc(this.t('by'))} <span class="author">${esc(f.author)}</span> · ${esc(status === 'published' ? this.t('published') : this.t('not-published'))} · ${esc(this.t('reading-time', { minutes }))}</p></header>
			${hero}<div class="body">${body}</div>
			${f.method.trim() ? `<div class="bijsluiter"><h2>${esc(this.t('field-method'))}</h2>${this.preview.hyphaRender(f.method)}</div>` : ''}
			${f.sources.trim() ? `<div class="bijsluiter"><h2>${esc(this.t('field-sources'))}</h2>${this.preview.hyphaRender(f.sources)}</div>` : ''}`);
		this.followCaret();
	}

	sanitize(html) {
		//
		// The hosts an iframe may point to, as HyphaFilter gets them: none at level 1.
		//
		const o = this.markdownOptions(false);
		const hosts = o.level >= 2 ? [...o.frameHosts, ...o.peertubeHosts].map(h => h.toLowerCase()) : [];
		const clean = DOMPurify.sanitize(html, { ADD_TAGS: ['iframe'], ADD_ATTR: ['srcdoc', 'sandbox', 'allow', 'allowfullscreen', 'target', 'data-page'], FORBID_TAGS: ['style', 'form'], RETURN_DOM_FRAGMENT: false });
		const t = document.createElement('template');
		t.innerHTML = clean;
		for (const f of t.content.querySelectorAll('iframe')) {
			//
			// Only the interactive blocks of the editor get a srcdoc; one written by the author disappears, as in
			// HyphaFilter.
			// The document is added after DOMPurify, which drops an attribute with </style in it.
			//
			const own = (f.getAttribute('data-mde-own') || '').split(':');
			f.removeAttribute('srcdoc');
			if (own[0] === this.own && this.frames[+own[1]] !== undefined) { f.removeAttribute('data-mde-own'); f.setAttribute('srcdoc', this.frames[+own[1]]); f.setAttribute('sandbox', 'allow-scripts'); continue; }
			let host = '';
			try { host = new URL(f.getAttribute('src')).host; } catch (e) { /* no address */ }
			if (!hosts.includes(host)) f.remove();
			else f.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups allow-presentation');
		}
		//
		// An author must not take over the ids of the editor (mde...): those elements would be found first.
		//
		this.frames = [];
		for (const el of t.content.querySelectorAll('[id^="mde"], [id^="MDE"]')) el.removeAttribute('id');
		//
		// A diagram is one image for a screen reader, named after its description, as HyphaMarkdown does it.
		//
		for (const svg of t.content.querySelectorAll('figure.diagram > svg')) {
			svg.setAttribute('role', 'img');
			svg.setAttribute('aria-label', svg.parentNode.querySelector('figcaption')?.textContent.trim() || this.t('html-diagram'));
		}
		for (const a of t.content.querySelectorAll('a[href^="http"]')) { a.classList.add('ext'); a.title = this.t('external-link', { url: a.getAttribute('href') }); a.rel = 'noopener nofollow'; a.target = '_blank'; }
		return t.innerHTML;
	}

	//
	// Pele, Temml and highlight.js only when the article has a diagram, a formula or code (requirement 4).
	//
	ensureLibraries(text) {
		//
		// Not before the browser is idle after opening: on a phone these 400 kB would compete with the editor itself; the
		// diagrams and formulas show their source until then. Each library is asked for once, and everything is drawn
		// again once: dozens of diagrams and formulas each ask while the libraries are on their way.
		//
		const wanted = [['pele', 'peleLoaded', /```mermaid/], ['temml', 'temmlLoaded', /\$/], ['highlight', 'hljsLoaded', /```\w/]]
			.filter(([name, key, pattern]) => pattern.test(text) && !lazy[key] && !this.libraries.has(name));
		if (!wanted.length) return;
		for (const [name] of wanted) this.libraries.add(name);
		this.idle ||= new Promise(done => (window.requestIdleCallback || (f => setTimeout(f, 200)))(done, { timeout: 1500 }));
		Promise.all(wanted.map(([name, key]) => this.idle.then(() => load(name)).then(m => { lazy[key] = m; }))).then(() => {
			this.diagrams.clear();
			this.refresh();
			this.redrawAtoms();
		});
	}

	//
	// Diagrams and formulas in Opmaak drawn again once their library is there. Every view of such a node registers
	// itself in this.atoms: ProseMirror does not call update() for a node with the same attributes, so a new node with
	// the same attributes would not redraw (found when the libraries came to load after the first drawing).
	//
	atoms = new Set();

	libraries = new Set();

	redrawAtoms() {
		for (const redraw of this.atoms) redraw();
	}

	diagramSvg(text, description) {
		const key = text;
		if (this.diagrams.has(key)) return this.diagrams.get(key);
		if (!lazy.peleLoaded) { this.ensureLibraries('```mermaid'); return null; }
		let svg = null;
		try {
			svg = lazy.peleLoaded.render(text, { fontFamily: 'Lato, Helvetica, Arial, sans-serif', fontSize: 15, responsive: true }).svg;
			this.lastDiagram.set(text, svg);
		}
		catch (e) { svg = null; }
		this.diagrams.set(key, svg);
		return svg;
	}

	mathml(tex, display) {
		if (!lazy.temmlLoaded) { this.ensureLibraries('$'); return null; }
		try { this.mathErrors.delete(tex); return lazy.temmlLoaded.renderToString(tex, { displayMode: display, throwOnError: true }); }
		catch (e) { this.mathErrors.add(tex); return null; }
	}

	//
	// The preview follows the block of the cursor.
	//
	followCaret() {
		if (this.viewMode !== 'side') return;
		clearTimeout(this.followTimer);
		this.followTimer = setTimeout(() => {
			const c = this.captureCaret();
			if (c.front) return;
			const blocks = $('#mdePreview .body', this.root)?.children || $('#mdePreview', this.root).children;
			const target = blocks[Math.min(c.index ?? 0, blocks.length - 1)];
			if (target) target.scrollIntoView({ block: 'nearest' });
		}, 120);
	}

	applySplit(pct) {
		pct = Math.max(20, Math.min(80, Math.round(pct)));
		this.split = pct;
		this.root.style.setProperty('--split', pct + '%');
		const s = $('#mdeSplitter', this.root);
		s.setAttribute('aria-valuenow', String(pct));
		s.setAttribute('aria-valuetext', this.t('splitter-value', { text: pct, preview: 100 - pct }));
	}

	//
	// Toolbar and the controls around it.
	//
	bindToolbar() {
		this.root.addEventListener('click', e => {
			const act = e.target.closest('[data-act]');
			if (act && this.root.contains(act)) { e.preventDefault(); this.action(act.dataset.act, act); }
			const edit = e.target.closest('[data-edit]');
			if (edit) this.switchEditMode(edit.dataset.edit);
			const mode = e.target.closest('[data-mode]');
			if (mode) this.setViewMode(mode.dataset.mode);
			const device = e.target.closest('[data-device]');
			if (device) {
				for (const b of this.root.querySelectorAll('[data-device]')) b.setAttribute('aria-pressed', String(b === device));
				$('#mdeFrame', this.root).className = 'frame ' + (device.dataset.device === 'desktop' ? '' : device.dataset.device);
			}
		});
		for (const b of this.root.querySelectorAll('.toolbar [data-act], .modes button, .editmode button')) b.addEventListener('mousedown', e => e.preventDefault());
		//
		// The right mouse button in a table cell opens the table menu (design step 3b).
		//
		this.root.addEventListener('contextmenu', e => {
			if (!e.target.closest('.wys td, .wys th')) return;
			e.preventDefault();
			this.dialogs.toggleTableMenu($('[data-act="table"]', this.root), e.clientX, e.clientY);
		});
		const splitter = $('#mdeSplitter', this.root);
		splitter.addEventListener('pointerdown', e => {
			splitter.setPointerCapture(e.pointerId);
			const box = $('#mdePanes', this.root).getBoundingClientRect();
			const move = ev => this.applySplit((ev.clientX - box.left) / box.width * 100);
			splitter.addEventListener('pointermove', move);
			splitter.addEventListener('pointerup', () => { splitter.removeEventListener('pointermove', move); this.storePreferences({ split: this.split }); }, { once: true });
		});
		splitter.addEventListener('keydown', e => {
			const step = { ArrowLeft: -5, ArrowRight: 5, ArrowUp: 5, ArrowDown: -5 }[e.key];
			if (step) this.applySplit(this.split + step);
			else if (e.key === 'Home') this.applySplit(20);
			else if (e.key === 'End') this.applySplit(80);
			else if (e.key === 'Enter') this.applySplit(50);
			else return;
			e.preventDefault();
			this.storePreferences({ split: this.split });
		});
		splitter.addEventListener('dblclick', () => { this.applySplit(50); this.storePreferences({ split: 50 }); });
		$('#mdeMore', this.root).addEventListener('click', e => this.dialogs.toggleMore(e.currentTarget));
	}

	//
	// The toolbar stays one line: what does not fit moves, in the same order, to 'Meer' (design step 2).
	//
	fitToolbar() {
		const bar = $('.toolbar', this.root);
		if (!bar) return;
		const more = $('#mdeMore', this.root);
		const items = [...bar.querySelectorAll(':scope > .tb[data-act]')].filter(b => !b.dataset.mdOnly || this.editMode === 'markdown');
		for (const b of items) b.classList.remove('moved');
		more.hidden = true;
		const modes = $('.modes', bar);
		modes.classList.remove('compact');
		const fits = () => bar.scrollWidth <= bar.clientWidth + 1;
		//
		// First the view switch shows only its icons (with a tooltip), then buttons move to 'Meer'.
		//
		if (!fits()) modes.classList.add('compact');
		const hidden = [];
		for (let i = items.length - 1; i >= 0 && !fits(); i--) {
			if (items[i].dataset.act === 'help') continue;
			items[i].classList.add('moved');
			hidden.unshift(items[i]);
			more.hidden = false;
		}
		this.moved = hidden;
	}

	//
	// On a phone the toolbar stays right above the on-screen keyboard (design section 12.12). It is fixed to the bottom
	// of the layout viewport, which Safari on iOS does not make smaller for the keyboard, so it follows the visual
	// viewport. Not while zoomed in: then the visual viewport is smaller for another reason.
	//
	followKeyboard() {
		const vv = window.visualViewport;
		if (!vv) return;
		const bar = $('.toolbar', this.root);
		const phone = window.matchMedia('(max-width: 700px)');
		const place = () => {
			const covered = Math.round(window.innerHeight - vv.height - vv.offsetTop);
			const on = phone.matches && vv.scale < 1.01 && covered > 0;
			bar.style.transform = on ? `translateY(${-covered}px)` : '';
			bar.classList.toggle('above-keyboard', on);
		};
		vv.addEventListener('resize', place);
		vv.addEventListener('scroll', place);
		phone.addEventListener('change', place);
		place();
	}

	storePreferences(prefs) {
		this.post(this.cfg.page.language + '/' + this.cfg.page.name, { command: 'mdPreferences', argument: JSON.stringify(prefs) }, true).catch(() => { /* a preference is not worth an error */ });
	}

	action(act, button) {
		const visual = this.editMode === 'visual';
		switch (act) {
			case 'download': return this.download();
			case 'openmd': return $('#mdeImport', this.root).click();
			case 'help': return this.dialogs.open('mdeHelpDlg');
			case 'image': return this.dialogs.openImage(this.dialogs.currentImage());
			case 'diagram': return this.dialogs.openDiagram(this.dialogs.currentDiagram());
			case 'table': return this.dialogs.toggleTableMenu(button || $('[data-act="table"]', this.root));
			case 'slash': return this.dialogs.showSlash(true);
		}
		if (visual) this.visualAction(act); else this.markdownAction(act);
	}

	activePm() {
		return this.pmViews.find(v => v.hasFocus()) || this.lastPm || this.pm;
	}

	visualAction(act) {
		const v = this.activePm();
		const { commands, schemaList } = PM;
		const n = schema.nodes, mk = schema.marks;
		const run = cmd => { cmd(v.state, v.dispatch, v); v.focus(); };
		switch (act) {
			case 'bold': return run(commands.toggleMark(mk.strong));
			case 'italic': return run(commands.toggleMark(mk.em));
			case 'heading': return run(v.state.selection.$from.parent.type === n.heading ? commands.setBlockType(n.paragraph) : commands.setBlockType(n.heading, { level: 3 }));
			case 'list': return run(schemaList.wrapInList(n.bullet_list));
			case 'quote': return this.wrapCallout(v, 'quote', '');
			case 'callout': return this.wrapCallout(v, 'info', this.t('callout-title-sample'));
			case 'math': {
				const node = n.math_inline.create({ tex: '\\tfrac{a}{b}' });
				v.dispatch(v.state.tr.replaceSelectionWith(node));
				return this.dialogs.editMath(v, v.state.selection.from - 1);
			}
			case 'link': {
				const url = prompt(this.t('link-prompt'), 'https://');
				if (!url || url === 'https://') return;
				const { from, to, empty } = v.state.selection;
				const mark = mk.link.create({ href: url.trim() });
				v.dispatch(empty ? v.state.tr.insert(from, schema.text(url.trim(), [mark])) : v.state.tr.addMark(from, to, mark));
				return v.focus();
			}
		}
	}

	//
	// Citaat and kader: selected text goes into the new block; without a selection the block gets a sample text, and
	// the title of a kader is selected afterwards so it can be typed over.
	//
	wrapCallout(v, type, title) {
		const n = schema.nodes;
		const { $from, $to, empty } = v.state.selection;
		if (!empty) {
			const range = $from.blockRange($to);
			const wrapping = range && PM.transform.findWrapping(range, n.callout, { type, title });
			if (wrapping) { v.dispatch(v.state.tr.wrap(range, wrapping).scrollIntoView()); return v.focus(); }
		}
		const block = n.callout.create({ type, title }, n.paragraph.create(null, schema.text(this.t(type === 'quote' ? 'quote-sample' : 'callout-sample'))));
		const end = $from.after(1);
		const tr = v.state.tr.insert(end, block);
		v.dispatch(tr.setSelection(PM.state.TextSelection.create(tr.doc, end + 2)).scrollIntoView());
		//
		// The title of a kader is selected, so typing replaces it.
		//
		const input = type !== 'quote' ? v.nodeDOM(end)?.querySelector('input.callout-title') : null;
		if (input) { input.focus(); input.select(); }
		else v.focus();
	}

	markdownAction(act) {
		const cm = this.cm;
		const sel = cm.state.selection.main;
		const line = cm.state.doc.lineAt(sel.from);
		const wrap = (before, after, sample) => {
			const text = cm.state.sliceDoc(sel.from, sel.to) || sample;
			cm.dispatch({ changes: { from: sel.from, to: sel.to, insert: before + text + after }, selection: { anchor: sel.from + before.length, head: sel.from + before.length + text.length } });
		};
		const prefix = p => cm.dispatch({ changes: { from: line.from, insert: p }, selection: { anchor: sel.head + p.length } });
		switch (act) {
			case 'bold': wrap('**', '**', this.t('sample-bold')); break;
			case 'italic': wrap('*', '*', this.t('sample-italic')); break;
			case 'heading': prefix('### '); break;
			case 'list': prefix('- '); break;
			case 'math': wrap('$', '$', '\\tfrac{a}{b}'); break;
			case 'link': {
				const url = prompt(this.t('link-prompt'), 'https://');
				if (url && url !== 'https://') wrap('[', `](${url.trim()})`, this.t('sample-link'));
				break;
			}
			case 'quote': case 'callout': {
				const head = act === 'quote' ? '> [!quote]' : '> [!info] ' + this.t('callout-title-sample');
				const selected = cm.state.sliceDoc(sel.from, sel.to);
				const body = (selected || this.t(act === 'quote' ? 'quote-sample' : 'callout-sample')).split('\n').map(l => '> ' + l).join('\n');
				const before = sel.from === line.from ? '' : '\n\n';
				const insert = `${before}${head}\n${body}\n\n`;
				cm.dispatch({ changes: { from: sel.from, to: sel.to, insert } });
				if (act === 'callout') { const start = sel.from + before.length + '> [!info] '.length; cm.dispatch({ selection: { anchor: start, head: start + this.t('callout-title-sample').length } }); }
				break;
			}
		}
		cm.focus();
	}

	undoMarkdown() {
		CM.commands.undo(this.cm);
	}

	markdownToNodes(markdown) {
		return pmParse(markdown, this.markdown).doc.content;
	}

	//
	// Insert Markdown of a block at the cursor (both views): after the paragraph that holds the cursor.
	//
	insertBlock(markdown) {
		if (this.editMode === 'markdown') {
			const cm = this.cm;
			const line = cm.state.doc.lineAt(cm.state.selection.main.head);
			const doc = cm.state.doc;
			const atEmpty = line.text.trim() === '';
			const previous = line.number > 1 ? doc.line(line.number - 1).text.trim() : '';
			//
			// A block always gets a blank line before and after, or it would merge with the paragraph next to it.
			//
			const before = atEmpty ? (previous ? '\n' : '') : '\n\n';
			const next = line.number < doc.lines ? doc.line(line.number + 1).text.trim() : '';
			const insert = before + markdown + (next ? '\n\n' : '\n');
			const from = atEmpty ? line.from : line.to;
			const cursor = /^\| /.test(markdown) ? from + before.length + 2 : from + insert.length;
			cm.dispatch({ changes: { from, to: line.to, insert }, selection: { anchor: cursor } });
			cm.focus();
			return;
		}
		const v = this.activePm();
		const slice = pmParse(markdown, this.markdown).doc.content;
		const $pos = v.state.selection.$from;
		const at = $pos.depth ? $pos.after(1) : $pos.pos;
		//
		// The cursor goes into the new block, for a table into the first heading cell (design step 3b).
		//
		const tr = v.state.tr.insert(at, slice);
		tr.setSelection(PM.state.Selection.near(tr.doc.resolve(Math.min(at + 1, tr.doc.content.size))));
		v.dispatch(tr.scrollIntoView());
		v.focus();
	}

	//
	// Paste from Word, Google Docs and LibreOffice (design section 12.15, decision T7): HTML on the clipboard becomes
	// Markdown with plakken.js, in both views; plain text and paste as plain text (⌘⇧V) go in unchanged; one undo step.
	//
	pastedMarkdown(event) {
		const html = event.clipboardData?.getData('text/html');
		if (!html || this.plainPaste) return null;
		const result = HyphaPlakken.toMarkdown(html, { texts: { image: this.t('paste-image'), formula: this.t('paste-formula'), merged: this.t('paste-merged') } });
		for (const note of result.notes) this.toast(note);
		return result.md;
	}

	pastedLink(event, selected) {
		const text = (event.clipboardData?.getData('text/plain') || '').trim();
		return selected && !this.plainPaste && /^https?:\/\/\S+$/.test(text) ? text : null;
	}

	pasteIntoMarkdown(event) {
		const range = this.cm.state.selection.main;
		const url = this.pastedLink(event, !range.empty);
		if (url) {
			event.preventDefault();
			const insert = `[${this.cm.state.sliceDoc(range.from, range.to)}](${url})`;
			this.cm.dispatch({ changes: { from: range.from, to: range.to, insert }, selection: { anchor: range.from + insert.length }, userEvent: 'input.paste' });
			return true;
		}
		const md = this.pastedMarkdown(event);
		if (md === null) return false;
		event.preventDefault();
		const sel = this.cm.state.selection.main;
		const single = !md.trim().includes('\n\n');
		const text = single ? md.trim() : md.replace(/\n*$/, '\n');
		this.cm.dispatch({ changes: { from: sel.from, to: sel.to, insert: text }, selection: { anchor: sel.from + text.length }, userEvent: 'input.paste' });
		return true;
	}

	pasteIntoVisual(view, event) {
		const { from, to, empty } = view.state.selection;
		const url = this.pastedLink(event, !empty);
		if (url) {
			event.preventDefault();
			view.dispatch(view.state.tr.addMark(from, to, schema.marks.link.create({ href: url })).setMeta('paste', true));
			return true;
		}
		const md = this.pastedMarkdown(event);
		if (md === null) return false;
		event.preventDefault();
		const doc = pmParse(md, this.markdown).doc;
		const single = doc.childCount === 1 && doc.firstChild.type === schema.nodes.paragraph;
		const slice = single ? new PM.model.Slice(doc.firstChild.content, 0, 0) : new PM.model.Slice(doc.content, 0, 0);
		view.dispatch(view.state.tr.replaceSelection(slice).scrollIntoView().setMeta('paste', true));
		return true;
	}

	dropFile(event) {
		const file = event.dataTransfer?.files?.[0];
		if (!file) return false;
		event.preventDefault();
		if (/\.md$|^text\/(markdown|plain)/.test(file.name + ' ' + file.type)) this.importFile(file);
		else if (/^image\//.test(file.type)) this.dialogs.openImage({ file });
		return true;
	}

	//
	// Import and export of .md (design section 12.4).
	//
	async importFile(file) {
		const text = await file.text();
		const front = parseFront(text.replace(/\r\n?/g, '\n'));
		if (front.ok && this.article) {
			Object.assign(this.fields, Object.fromEntries(Object.entries(front.fields).filter(([k]) => k in this.fields)));
			this.fields.frontmatter = front.extra.split('\n').filter(l => !/^(status|gepubliceerd|lang):/.test(l)).join('\n');
			this.fields.text = front.body;
		}
		else this.fields.text = front.ok ? front.body : text;
		if (this.editMode === 'visual') this.loadVisual(); else this.loadMarkdown();
		this.changed();
		this.toast(this.t('imported', { file: file.name }));
	}

	download() {
		const extra = [`status: ${this.cfg.page.status}`, `lang: ${this.cfg.page.language}`].join('\n');
		const text = frontText(Object.assign({}, this.fields, { frontmatter: [this.fields.frontmatter, extra].filter(Boolean).join('\n') }), this.kind) + this.fields.text;
		const a = document.createElement('a');
		a.href = URL.createObjectURL(new Blob([text], { type: 'text/markdown;charset=utf-8' }));
		a.download = (this.cfg.page.name || 'artikel') + '.md';
		document.body.appendChild(a);
		a.click();
		setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
	}

	//
	// Saving (requirement 2: under 1 second): the fields as JSON, plus the drawings of diagrams and formulas.
	//
	async renders() {
		const all = [this.fields.text, this.fields.method, this.fields.sources, this.fields.excerpt].join('\n\n');
		const tokens = this.markdown.hyphaParse(all, {});
		const svg = {}, math = {}, mathBlock = {};
		const sha = async s => [...(globalThis.crypto?.subtle ? new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))) : sha256(new TextEncoder().encode(s)))].map(b => b.toString(16).padStart(2, '0')).join('');
		await Promise.all([/```mermaid/.test(all) && load('pele').then(m => { lazy.peleLoaded = m; }), /\$/.test(all) && load('temml').then(m => { lazy.temmlLoaded = m; })].filter(Boolean));
		const walk = async list => {
			for (const t of list) {
				if (t.type === 'fence' && /^mermaid\b/.test(t.info.trim())) { const s = this.diagramSvg(t.content); if (s) svg[await sha(t.content)] = s; }
				if (t.type === 'math_block') { const s = this.mathml(t.content, true); if (s) mathBlock[await sha(t.content)] = s; }
				if (t.type === 'math_inline') { const s = this.mathml(t.content, false); if (s) math[await sha(t.content)] = s; }
				if (t.children) await walk(t.children);
			}
		};
		await walk(tokens);
		return { svg, math, mathBlock };
	}

	async post(path, data, json = false) {
		const body = new URLSearchParams(Object.assign({ csrfToken: this.cfg.csrf }, data));
		const r = await fetch(this.cfg.root + path, { method: 'POST', body, credentials: 'same-origin', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
		if (!json) return r;
		if (r.status === 404) return { missing: true };
		return r.json();
	}

	//
	// Saving. A save asked for while one runs, follows it, so the newest text is always sent (found by testing). Resolves
	// to whether the text is stored.
	//
	save(force = false) {
		if (this.saving) {
			this.saveAgain = { force: force || this.saveAgain?.force };
			return this.saving.then(() => !this.dirty());
		}
		this.saving = this.saveOnce(force).finally(() => {
			this.saving = null;
			const again = this.saveAgain;
			this.saveAgain = null;
			if (again && this.dirty()) return this.save(again.force);
		});
		return this.saving.then(() => !this.dirty());
	}

	async saveOnce(force, moved = false) {
		const started = performance.now();
		this.toast(this.t('saving'));
		try {
			if (this.editMode === 'markdown') this.onMarkdownChange();
			const view = this.cfg.commands.view || 'edit';
			if (this.frontError) { this.toast(this.t('save-front-error')); return; }
			//
			// What is sent is what counts as saved: text typed while the request runs stays unsaved (found in review).
			//
			const snapshot = JSON.stringify(this.fields);
			const fields = this.article ? JSON.parse(snapshot) : { title: this.fields.title, text: this.fields.text, private: !!this.fields.private, language: this.fields.language };
			//
			// Names in NFC, so a label typed with a separate accent is the same tag (the texts stay as typed: the drawings
			// of diagrams and formulas are matched on their exact source).
			//
			for (const k of ['title', 'section', 'author']) if (typeof fields[k] === 'string') fields[k] = fields[k].normalize('NFC');
			if (Array.isArray(fields.tags)) fields.tags = fields.tags.map(tag => String(tag).normalize('NFC'));
			const result = await this.post(`${this.cfg.page.language}/${this.cfg.page.name}/${view}`, { command: this.cfg.commands.save, md_fields: JSON.stringify(fields), md_renders: JSON.stringify(await this.renders()), md_base: String(this.revision ?? ''), md_force: force ? '1' : '', ajax: '1' }, true);
			//
			// Renamed or moved to another language by someone else: find the page by its id and save there once.
			//
			if (result.missing) {
				if (!moved && await this.locate()) return this.saveOnce(force, true);
				this.toast(this.t('page-gone'), null, null, 20000);
				return;
			}
			window.mdeLastSave = { ms: performance.now() - started, server: result.ms };
			if (result.conflict) {
				//
				// Someone else saved since this editor opened the text: the choice is the author's, the draft stays.
				//
				this.toast(this.t('conflict', { name: result.conflict.name || '?', at: result.conflict.at || '' }), this.t('conflict-overwrite'), () => this.save(true), 30000);
				return;
			}
			if (!result.ok) { this.toast((result.errors || []).join(' ') || this.t('save-failed')); return; }
			if (result.revision !== undefined && result.revision !== null) this.revision = result.revision;
			this.saved = snapshot;
			this.storeDraft();
			this.updateChip();
			if (result.checks) { this.cfg.checks = result.checks; this.cfg.checkStatus = result.checkStatus; }
			this.toast(this.t('saved'));
			this.refresh();
			if (result.url && !this.article && result.url !== location.href.replace(/\/(edit|translate).*$/, '')) location.href = result.url;
		}
		catch (e) { this.toast(this.t('save-failed')); }
	}

	//
	// The current address of this page, by its id (command mdLocate). Updates the page and the address bar.
	//
	async locate() {
		if (!this.cfg.page.id) return false;
		let r = null;
		try { r = await this.post(`${this.cfg.page.language}/${this.cfg.page.name}`, { command: 'mdLocate', argument: this.cfg.page.id, ajax: '1' }, true); } catch (e) { return false; }
		if (!r || !r.name) return false;
		const view = this.cfg.commands.view || 'edit';
		const from = `${this.cfg.page.language}/${this.cfg.page.name}`;
		Object.assign(this.cfg.page, { language: r.language, name: r.name });
		try { history.replaceState(null, '', this.cfg.root + r.language + '/' + r.name + '/' + view); } catch (e) { /* not essential */ }
		this.toast(this.t('page-moved', { from, to: r.language + '/' + r.name }), null, null, 8000);
		return true;
	}

	cancel() {
		if (this.dirty() && !confirm(this.t('cancel-confirm'))) return;
		this.saved = JSON.stringify(this.fields);
		try { localStorage.removeItem(this.draftKey()); } catch (e) { /* no storage */ }
		location.href = this.cfg.root + this.cfg.page.language + '/' + this.cfg.page.name;
	}

	//
	// The checklist (design step 7): only what needs attention, red above yellow, alphabetical within each colour;
	// 'toon alles' also shows what is fine. The rules of the server (BR-01 to BR-12) and the advice of the design
	// (BR-100 to BR-106).
	//
	checks() {
		const f = this.fields, t = k => this.t(k);
		const list = [];
		const add = (lvl, key, ok, go) => list.push({ lvl: ok ? 'ok' : lvl, t: t(key + (ok ? '-ok' : '')), go });
		const tokens = this.markdown.hyphaParse(f.text, {});
		const flat = [];
		const walk = l => { for (const x of l) { flat.push(x); if (x.children) walk(x.children); } };
		walk(tokens);
		const images = flat.filter(x => x.type === 'image');
		const diagrams = flat.filter(x => x.type === 'fence' && /^mermaid\b/.test(x.info.trim()));
		const interactive = flat.filter(x => x.type === 'fence' && /^html\s+(interactief|interactive)\b/i.test(x.info.trim()));
		const links = flat.filter(x => x.type === 'wikilink');
		if (this.frontError) list.push({ lvl: 'red', t: this.t('check-front', { line: this.frontError.line, detail: this.frontError.detail || '' }) });
		if (this.article) {
			add('red', 'check-title', !!f.title.trim(), 'mdeTitle');
			add('red', 'check-excerpt', !!f.excerpt.trim(), 'mdeExcerpt');
			add('red', 'check-section', !!f.section, 'mdeSection');
			add('red', 'check-tags', f.tags.length > 0, 'mdeTagAdd');
			const unknown = f.tags.filter(x => !(this.cfg.tags || []).includes(x));
			if (unknown.length) list.push({ lvl: 'red', t: this.t('check-unknown-tags', { tags: unknown.join(', ') }) });
			add('red', 'check-method', !!f.method.trim(), 'mdeMethod');
			add('yellow', 'check-sources', !!f.sources.trim(), 'mdeSources');
			add('yellow', 'check-image', !!f.image, 'mdeHeroBtn');
			if (f.image) add('yellow', 'check-image-alt', !!f.imageAlt.trim(), 'mdeHeroAlt');
		}
		add('red', 'check-text', !!f.text.trim());
		add('yellow', 'check-alt', images.every(x => plainText(x.children).trim()));
		add('yellow', 'check-diagram-alt', diagrams.every(x => x.meta?.description));
		add('red', 'check-interactive-alt', interactive.every(x => x.meta?.description));
		if (lazy.peleLoaded) add('yellow', 'check-diagrams', diagrams.every(x => this.diagramSvg(x.content) !== null));
		if (lazy.temmlLoaded) add('yellow', 'check-math', ![...this.mathErrors].length);
		const missing = links.filter(x => !this.pagesByName.has(asciiLower(x.meta.page)));
		add('yellow', 'check-links', !missing.length);
		return list;
	}

	tips() {
		const f = this.fields, list = [];
		const tip = (key, ok, vars) => list.push({ lvl: ok ? 'ok' : 'yellow', t: this.t(key + (ok ? '-ok' : ''), vars) });
		if (this.article) {
			tip('tip-title-length', characters(f.title) <= 90, { n: characters(f.title) });
			const words = (f.excerpt.match(/\S+/g) || []).length;
			tip('tip-excerpt-length', words <= 60, { n: words });
			const name = this.cfg.page.name;
			if (!this.cfg.page.published && f.title && slug(f.title) !== name.replace(/-\d+$/, '') && slug(f.title) !== name) list.push({ lvl: 'yellow', t: this.t('tip-address'), button: this.t('tip-address-button'), fn: () => this.rename() });
			if ((this.unknownFront || []).length) list.push({ lvl: 'yellow', t: this.t('tip-unknown-front', { keys: this.unknownFront.join(', ') }) });
		}
		const long = (this.fields.text.replace(/```[\s\S]*?```/g, '').match(/[^.!?\n]+[.!?]/g) || []).filter(s => (s.match(/\S+/g) || []).length > 30).length;
		tip('tip-sentences', !long, { n: long });
		return list;
	}

	renderChecks() {
		const order = { red: 0, yellow: 1, ok: 2 };
		const sort = l => l.sort((a, b) => order[a.lvl] - order[b.lvl] || a.t.localeCompare(b.t, this.cfg.interfaceLanguage));
		const item = c => `<li class="${c.lvl}"><i class="fa fa-${{ red: 'times', yellow: 'exclamation-triangle', ok: 'check' }[c.lvl]}" aria-hidden="true"></i><span class="sr">${esc(this.t('check-' + c.lvl))}</span> ${esc(c.t)}${c.go ? ` <button type="button" class="gobtn" data-go="${c.go}">${esc(this.t('fill-in'))} <i class="fa fa-arrow-right" aria-hidden="true"></i></button>` : ''}${c.button ? ` <button type="button" class="gobtn" data-tip="1">${esc(c.button)}</button>` : ''}</li>`;
		const checks = sort(this.checks());
		const shown = checks.filter(c => this.showAll || c.lvl !== 'ok');
		$('#mdeChecks', this.root).innerHTML = shown.map(item).join('');
		const reds = checks.filter(c => c.lvl === 'red').length;
		$('#mdeSummary', this.root).textContent = reds ? this.t('checks-open', { n: reds }) : (this.article ? this.t('checks-done-article') : this.t('checks-done'));
		const tips = sort(this.tips());
		const shownTips = tips.filter(c => this.showAll || c.lvl !== 'ok');
		$('#mdeTipsBox', this.root).hidden = !shownTips.length;
		$('#mdeTips', this.root).innerHTML = shownTips.map(item).join('');
		for (const b of this.root.querySelectorAll('[data-go]')) b.addEventListener('click', () => this.goToField(b.dataset.go));
		for (const b of this.root.querySelectorAll('[data-tip]')) b.addEventListener('click', () => tips.find(x => x.fn)?.fn());
		const f = this.fields;
		const words = countWords(f.text.replace(/```[\s\S]*?```/g, ''));
		const languages = this.cfg.languages || [];
		$('#mdeFacts', this.root).innerHTML = `<li>${esc(this.t('fact-words', { n: words }))}</li><li>${esc(this.t('fact-reading', { n: Math.max(1, Math.round(words / 220)) }))}</li>`
			+ (this.article ? `<li><label for="mdeArticleLanguage">${esc(this.t('field-language'))}</label> <select id="mdeArticleLanguage"${this.cfg.page.published || this.cfg.page.role !== 'author' ? ' disabled' : ''}>${languages.map(l => `<option value="${esc(l)}"${l === this.cfg.page.language ? ' selected' : ''}>${esc(this.t('language-' + l) === 'language-' + l ? l : this.t('language-' + l))}</option>`).join('')}</select></li>` : '');
		$('#mdeArticleLanguage', this.root)?.addEventListener('change', e => this.changeLanguage(e.target.value));
		if (this.article) {
			const count = $('#mdeTitleCount', this.root);
			if (count) count.textContent = this.t('count-chars', { n: characters(f.title) });
			const ex = $('#mdeExcerptCount', this.root);
			if (ex) ex.textContent = this.t('count-words', { n: (f.excerpt.match(/\S+/g) || []).length });
		}
	}

	goToField(id) {
		if (id === 'mdeMethod' || id === 'mdeSources') {
			if (this.editMode === 'markdown') return this.applyCaret({ front: id === 'mdeMethod' ? 'bijsluiter' : 'bronnen' });
			const box = $('#' + id, this.root).closest('details');
			box.open = true;
			return (id === 'mdeMethod' ? this.pmMethod : this.pmSources).focus();
		}
		if (this.editMode === 'markdown') return this.applyCaret({ front: { mdeTitle: 'titel', mdeAuthor: 'auteur', mdeExcerpt: 'uittreksel', mdeSection: 'rubriek', mdeTagAdd: 'tags', mdeHeroBtn: 'afbeelding', mdeHeroAlt: 'beschrijving' }[id] || 'titel' });
		$('#mdeHead', this.root).open = true;
		$('#' + id, this.root)?.focus();
	}

	renderOutline() {
		const tokens = this.markdown.hyphaParse(this.fields.text, {});
		const items = [];
		tokens.forEach((t, i) => {
			if (t.level !== 0) return;
			if (t.type === 'heading_open') items.push([i, +t.tag.slice(1), plainText(tokens[i + 1].children)]);
			else if (t.type === 'callout_open') items.push([i, 5, (t.meta.type === 'quote' ? '❝ ' : '▣ ') + (t.meta.title || this.t('callout-' + t.meta.type))]);
			else if (t.type === 'fence' && /^mermaid/.test(t.info.trim())) items.push([i, 5, '◫ ' + (t.meta?.description || this.t('diagram'))]);
			else if (t.type === 'figure_open') items.push([i, 5, '▧ ' + plainText(tokens[i + 1].children[0].children)]);
		});
		$('#mdeOutline', this.root).innerHTML = items.length ? '<ul>' + items.map(([i, l, text]) => `<li class="l${l}"><button type="button" class="linkbtn" data-line="${tokens[i].map ? tokens[i].map[0] : 0}">${esc(text)}</button></li>`).join('') + '</ul>' : `<p class="small">${esc(this.t('outline-empty'))}</p>`;
		for (const b of this.root.querySelectorAll('[data-line]')) b.addEventListener('click', () => {
			const index = pmParse(this.fields.text, this.markdown);
			let k = 0, line = (index.gaps[0] || []).length;
			index.doc.forEach((n, o, i) => { if (line <= +b.dataset.line) k = i; line += (index.sources.get(n) || '').split('\n').length + (index.gaps[i + 1] || []).length; });
			this.applyCaret({ index: k, visible: 0 });
		});
	}

	//
	// The status bar of the review flow (design step 8): the circle of 'goedgekeurd' partly filled at 1 or 2 of 3.
	//
	renderSteps() {
		const box = $('#mdeSteps', this.root);
		if (!box) return;
		const p = this.cfg.page;
		const steps = ['draft', 'review', 'approved', 'published'];
		const at = p.status === 'retracted' ? 3 : steps.indexOf(p.status);
		const fill = p.status === 'review' ? p.approves / p.approvesNeeded : 0;
		box.innerHTML = steps.map((s, i) => {
			const cls = i < at ? 'done' : i === at ? 'now' : '';
			const partial = s === 'approved' && fill > 0 && fill < 1 ? ` style="--fill:${Math.round(fill * 100)}%" data-partial="1"` : '';
			return `<span class="step ${cls}"${partial}><span class="dot" aria-hidden="true">${i + 1}</span> ${esc(this.t('status-' + s))}${s === 'approved' && p.status === 'review' ? ` <span class="small">(${esc(this.t('approvals', { n: p.approves, need: p.approvesNeeded }))})</span>` : ''}</span>`;
		}).join('<span class="arrow" aria-hidden="true">›</span>')
			+ (p.status === 'draft' && p.role === 'author' ? `<button type="button" class="btn primary small" id="mdeStartReview"${(this.cfg.checkStatus === 'failed' || this.dirty()) ? ` disabled title="${esc(this.t(this.dirty() ? 'start-review-save-first' : 'start-review-not-ready'))}"` : ''}>${esc(this.t('start-review'))}</button>` : '')
			+ (['review', 'approved'].includes(p.status) && p.role === 'author' ? `<button type="button" class="btn grey small" id="mdeRetract" title="${esc(this.t('retract-help'))}">${esc(this.t('retract'))}</button>` : '');
		$('#mdeStartReview', this.root)?.addEventListener('click', () => this.command('status_change_review'));
		$('#mdeRetract', this.root)?.addEventListener('click', () => { if (confirm(this.t('retract-confirm'))) this.command(this.cfg.commands.retract); });
	}

	async command(name, argument = '') {
		if (this.dirty() && !(await this.save())) return;
		await this.post(`${this.cfg.page.language}/${this.cfg.page.name}`, { command: name, argument });
		location.href = this.cfg.root + this.cfg.page.language + '/' + this.cfg.page.name;
	}

	async changeLanguage(language) {
		if (this.dirty() && !(await this.save())) return;
		const r = await this.post(`${this.cfg.page.language}/${this.cfg.page.name}`, { command: this.cfg.commands.language, argument: language });
		location.href = r.url && /\/edit/.test(r.url) ? r.url : this.cfg.root + language + '/' + this.cfg.page.name + '/edit';
	}

	async rename() {
		if (this.dirty() && !(await this.save())) return;
		const r = await this.post(`${this.cfg.page.language}/${this.cfg.page.name}`, { command: this.cfg.commands.rename });
		location.href = r.url || location.href;
	}

	toast(message, action, fn, ms = 2600) {
		const t = $('#mdeToast', this.root);
		t.innerHTML = esc(message) + (action ? ` <button type="button" class="linkbtn">${esc(action)}</button>` : '');
		if (action) t.querySelector('button').addEventListener('click', () => { fn(); t.classList.remove('on'); });
		t.classList.add('on');
		clearTimeout(this.toastTimer);
		this.toastTimer = setTimeout(() => t.classList.remove('on'), ms);
	}
}

//
// The services of level 2 when the page gives none (the defaults of hypha_mdeditorDefaults()).
//
const FRAME_HOSTS = ['www.youtube-nocookie.com', 'player.vimeo.com', 'www.openstreetmap.org', 'datawrapper.dwcdn.net', 'flo.uri.sh', 'e.infogram.com', 'www.google.com', 'open.spotify.com', 'w.soundcloud.com', 'player-widget.mixcloud.com', 'archive.org', 'bandcamp.com', 'www.scribd.com', 'embed.documentcloud.org'];
