//
// Dialogs and menus of the editor (design steps 3 to 6b): image, diagram with 36 templates, cheat sheet, formula,
// the table menu, the 'Meer' menu, the / menu and the [[ suggestions. Every dialog is a <dialog> with a label, the
// first field gets the focus, Esc closes; lists are a listbox with aria-activedescendant (WCAG 2.1.1, 4.1.2).
//
import * as PM from 'prosemirror';
import DOMPurify from 'dompurify';
import { esc, PLACEMENTS } from './hypha-markdown.js';
import { schema } from './opmaak.js';
import { DIAGRAMS, TOP_DIAGRAMS } from './diagrammen.js';
import { load } from './editor.js';

const $ = (sel, root) => root.querySelector(sel);

export class Dialogs {
	constructor(editor) {
		this.ed = editor;
		this.popup = { open: false, items: [], index: 0 };
	}

	get root() { return this.ed.root; }
	t(k, v) { return this.ed.t(k, v); }

	template() {
		const t = k => esc(this.t(k));
		//
		// Every choice with a small picture, and below them what the chosen one does: a tooltip alone is not seen on a
		// touch screen (found on an iPhone).
		//
		const place = (name, top) => `<div class="place" role="radiogroup" aria-label="${t('placement')}" aria-describedby="${name}Help">` + [...PLACEMENTS, ...(top && this.ed.article ? ['bovenaan'] : [])].map((p, i) =>
			`<label title="${t('placement-' + p + '-help')}"><input type="radio" name="${name}" value="${p}"${i === 0 ? ' checked' : ''}><span class="pic pic-${p}" aria-hidden="true"></span>${t('placement-' + p)}</label>`).join('') + `</div><p class="place-help" id="${name}Help" aria-live="polite"></p>`;
		const close = `<button type="button" class="dlg-close" value="cancel" aria-label="${t('close')}" title="${t('close')}">✕</button>`;
		return `
		<dialog id="mdeImageDlg" aria-labelledby="mdeImageTitle"><form method="dialog">
			<h2><span id="mdeImageTitle">${t('image-insert')}</span>${close}</h2>
			<div class="dlg-grid">
				<div><button type="button" class="dropzone" id="mdeDrop" title="${t('image-choose-help')}"><span><i class="fa fa-upload fa-2x" aria-hidden="true"></i><br>${t('image-choose')}<br><small>${t('image-choose-ios')}</small></span></button>
					<input type="file" id="mdeImageFile" accept="image/png,image/jpeg,image/gif,image/bmp" hidden><div class="small" id="mdeImageInfo" aria-live="polite"></div></div>
				<div>
					<div class="field"><label for="mdeImageAlt">${t('image-alt')} <span class="req" aria-hidden="true">*</span></label><input type="text" id="mdeImageAlt" required aria-required="true"><div class="help">${t('image-alt-help')}</div></div>
					<div class="field"><label for="mdeImageCaption">${t('image-caption')}</label><textarea id="mdeImageCaption" rows="2"></textarea></div>
					<div class="field"><label for="mdeImageCredit">${t('image-credit')}</label><input type="text" id="mdeImageCredit" placeholder="${t('field-image-credit-help')}"></div>
					<div class="field"><b>${t('placement')}</b>${place('mdePlace', true)}</div>
				</div>
			</div>
			<p class="small"><b>${t('image-markdown')}</b></p><div class="mdout" id="mdeImageMd"></div>
			<p class="small" id="mdeImageNeed" aria-live="polite"></p>
			<div class="dlg-actions"><button type="button" class="btn outline danger" id="mdeImageDel" hidden>${t('delete')}</button><button type="button" class="btn grey" value="cancel">${t('cancel')}</button><button type="submit" class="btn primary" id="mdeImageOk" aria-describedby="mdeImageNeed">${t('insert')}</button></div>
		</form></dialog>
		<dialog id="mdeDiagramDlg" aria-labelledby="mdeDiagramTitle"><form method="dialog">
			<h2><span id="mdeDiagramTitle"><i class="fa fa-sitemap" aria-hidden="true"></i> ${t('diagram-title')}</span>${close}</h2>
			<div class="templates"><span id="mdeTopTemplates"></span>
				<button type="button" id="mdeMoreTypes" aria-haspopup="listbox" aria-expanded="false" aria-controls="mdeDpanel">${t('diagram-more')} <i class="fa fa-caret-down" aria-hidden="true"></i></button>
				<div class="dpanel" id="mdeDpanel" hidden><div class="dprev" aria-hidden="true"><div class="dpv" id="mdeDpv"></div><div class="dpd" id="mdeDpd"></div></div><ul class="dlist" id="mdeDlist" role="listbox" aria-label="${t('diagram-types')}" tabindex="0"></ul></div>
			</div>
			<div class="dlg-grid">
				<div><label class="small" for="mdeDiagramSrc"><b>${t('diagram-text')}</b></label><textarea id="mdeDiagramSrc" spellcheck="false" title="${t('diagram-text-help')}"></textarea>
					<div id="mdeDiagramErr" class="diagerr" role="alert" hidden></div>
					<div class="field" style="margin-top:10px"><label for="mdeDiagramAlt">${t('diagram-alt')}</label><input type="text" id="mdeDiagramAlt" title="${t('diagram-alt-help')}"></div>
					<div class="field"><b>${t('placement')}</b>${place('mdeDplace', false)}</div></div>
				<div><div class="small"><b>${t('diagram-reader')}</b> ${t('diagram-last-good')}</div><div id="mdeDiagramView"></div><p class="small">${t('diagram-notation')}</p></div>
			</div>
			<div class="dlg-actions"><button type="button" class="btn outline danger" id="mdeDiagramDel" hidden>${t('delete')}</button><button type="button" class="btn grey" value="cancel">${t('cancel')}</button><button type="submit" class="btn primary" id="mdeDiagramOk">${t('insert')}</button></div>
		</form></dialog>
		<dialog id="mdeIaDlg" aria-labelledby="mdeIaTitle"><form method="dialog">
			<h2><span id="mdeIaTitle"><i class="fa fa-puzzle-piece" aria-hidden="true"></i> ${t('ia-title')}</span>${close}</h2>
			<div class="dlg-grid">
				<div><label class="small" for="mdeIaSrc"><b>${t('ia-code')}</b></label><textarea id="mdeIaSrc" class="code" spellcheck="false" title="${t('ia-code-help')}"></textarea>
					<div class="field" style="margin-top:10px"><label for="mdeIaAlt">${t('ia-alt')} <span class="req" aria-hidden="true">*</span></label><input type="text" id="mdeIaAlt" required aria-required="true" aria-describedby="mdeIaAltHelp"><div class="help" id="mdeIaAltHelp">${t('ia-alt-help')}</div></div>
					<div class="field"><label for="mdeIaHeight">${t('ia-height')}</label><input type="number" id="mdeIaHeight" min="50" max="4000" step="10" inputmode="numeric"></div></div>
				<div><div class="small"><b>${t('ia-preview')}</b></div><iframe id="mdeIaView" class="ia-view" sandbox="allow-scripts" referrerpolicy="no-referrer" title="${t('ia-preview')}"></iframe><p class="small" id="mdeIaHosts"></p></div>
			</div>
			<div class="dlg-actions"><button type="button" class="btn outline danger" id="mdeIaDel" hidden>${t('delete')}</button><button type="button" class="btn grey" value="cancel">${t('cancel')}</button><button type="submit" class="btn primary" id="mdeIaOk">${t('insert')}</button></div>
		</form></dialog>
		<dialog id="mdeLinkDlg" aria-labelledby="mdeLinkTitle"><form method="dialog">
			<h2><span id="mdeLinkTitle"><i class="fa fa-link" aria-hidden="true"></i> ${t('link-title')}</span>${close}</h2>
			<div class="field"><label for="mdeLinkTarget">${t('link-target')}</label><input type="text" id="mdeLinkTarget" autocomplete="off" spellcheck="false" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="mdeLinkList" aria-describedby="mdeLinkHelp"><div class="help" id="mdeLinkHelp">${t('link-target-help')}</div>
				<ul class="linklist" id="mdeLinkList" role="listbox" aria-label="${t('link-pages')}" hidden></ul></div>
			<div class="field"><label for="mdeLinkText">${t('link-text')}</label><input type="text" id="mdeLinkText"></div>
			<div class="dlg-actions"><button type="button" class="btn outline danger" id="mdeLinkDel" hidden>${t('link-remove')}</button><button type="button" class="btn grey" value="cancel">${t('cancel')}</button><button type="submit" class="btn primary" id="mdeLinkOk">${t('insert')}</button></div>
		</form></dialog>
		<dialog id="mdeMathDlg" aria-labelledby="mdeMathTitle"><form method="dialog">
			<h2><span id="mdeMathTitle">${t('math-title')}</span>${close}</h2>
			<div class="field"><label for="mdeMathSrc">${t('math-tex')}</label><textarea id="mdeMathSrc" rows="3" spellcheck="false"></textarea><div class="help">${t('math-help')}</div></div>
			<div id="mdeMathView" aria-live="polite"></div>
			<div class="dlg-actions"><button type="button" class="btn grey" value="cancel">${t('cancel')}</button><button type="submit" class="btn primary">${t('apply')}</button></div>
		</form></dialog>
		<dialog id="mdeHelpDlg" aria-labelledby="mdeHelpTitle"><form method="dialog">
			<h2><span id="mdeHelpTitle">${t('help-title')}</span>${close}</h2>
			<p>${t('help-intro')}</p>
			<table class="cheat">${['heading', 'bold', 'list', 'mark', 'quote', 'callout', 'pagelink', 'link', 'footnote', 'note', 'math', 'code', 'slash', 'front'].map(k => `<tr><td><code>${t('help-' + k + '-md')}</code></td><td>${t('help-' + k)}</td></tr>`).join('')}</table>
			<div class="dlg-actions"><button type="submit" class="btn primary">${t('close')}</button></div>
		</form></dialog>`;
	}

	placeHelp(d) {
		for (const help of d.querySelectorAll('.place-help')) {
			const checked = d.querySelector(`[name=${help.id.replace(/Help$/, '')}]:checked`);
			help.textContent = checked ? this.t('placement-' + checked.value + '-help') : '';
		}
	}

	open(id) {
		const d = $('#' + id, this.root);
		if (!d.placeBound) { d.placeBound = true; d.addEventListener('change', e => { if (e.target.matches('.place input')) this.placeHelp(d); }); }
		setTimeout(() => this.placeHelp(d), 0);
		for (const b of d.querySelectorAll('[value="cancel"]')) b.onclick = () => d.close('cancel');
		d.showModal();
		return d;
	}

	//
	// Image (design step 4): upload through the existing route upload/image, description required (BR-06), caption,
	// credit and placement; 'bovenaan' makes it the image with the excerpt.
	//
	currentImage() {
		if (this.ed.editMode === 'visual') {
			const v = this.ed.activePm();
			const sel = v.state.selection;
			if (sel.node?.type === schema.nodes.figure) return { view: v, pos: sel.from, node: sel.node };
			return {};
		}
		const line = this.ed.cm.state.doc.lineAt(this.ed.cm.state.selection.main.head);
		return /^!\[/.test(line.text) || /^\*.*\*$/.test(line.text.trim()) ? { line } : {};
	}

	openImage(target = {}) {
		const d = this.open('mdeImageDlg');
		const f = id => $('#' + id, d);
		const editing = target.node || target.line;
		let attrs = target.node ? target.node.attrs : null;
		let caption = target.node ? target.node.textContent : '';
		if (target.line) {
			const doc = this.ed.cm.state.doc;
			let first = target.line;
			if (!/^!\[/.test(first.text) && first.number > 1) first = doc.line(first.number - 1);
			const m = /^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)(?:\{\.([\w-]+)[^}]*\})?/.exec(first.text);
			if (m) {
				attrs = { alt: m[1], src: m[2], placement: m[3] || 'breed' };
				const next = first.number < doc.lines ? doc.line(first.number + 1).text.trim() : '';
				caption = /^\*.*\*$/.test(next) ? next.slice(1, -1) : '';
				target.from = first.from;
				target.to = caption ? doc.line(first.number + 1).to : first.to;
			}
		}
		const hero = !!target.hero;
		this.image = { src: hero ? this.ed.fields.image : attrs?.src || '' };
		const [cap, credit] = splitCredit(caption);
		f('mdeImageAlt').value = hero ? this.ed.fields.imageAlt : attrs?.alt || '';
		f('mdeImageCaption').value = hero ? this.ed.fields.imageCaption : cap;
		f('mdeImageCredit').value = hero ? this.ed.fields.imageCredit : credit;
		for (const r of d.querySelectorAll('[name=mdePlace]')) r.checked = r.value === (hero ? 'bovenaan' : attrs?.placement || 'breed');
		$('#mdeImageTitle', d).textContent = this.t(editing ? 'image-edit' : 'image-insert');
		$('#mdeImageOk', d).textContent = this.t(editing ? 'update' : 'insert');
		$('#mdeImageDel', d).hidden = !editing;
		f('mdeImageInfo').textContent = this.image.src ? this.image.src.split('/').pop() : '';
		this.showImage(d, this.image.src ? this.ed.markdownOptions(false).imageSrc(this.image.src) : '');
		const update = () => {
			const alt = f('mdeImageAlt').value.trim();
			const ok = !!this.image.src && !!alt;
			$('#mdeImageOk', d).disabled = !ok;
			f('mdeImageNeed').textContent = !this.image.src ? this.t('image-need-file') : !alt ? this.t('image-need-alt') : '';
			f('mdeImageMd').textContent = this.imageMarkdown(d);
		};
		for (const id of ['mdeImageAlt', 'mdeImageCaption', 'mdeImageCredit']) f(id).oninput = update;
		for (const r of d.querySelectorAll('[name=mdePlace]')) r.onchange = update;
		const file = f('mdeImageFile');
		f('mdeDrop').onclick = () => file.click();
		f('mdeDrop').ondragover = e => e.preventDefault();
		f('mdeDrop').ondrop = e => { e.preventDefault(); if (e.dataTransfer.files[0]) this.upload(e.dataTransfer.files[0], d, update); };
		file.onchange = () => { if (file.files[0]) this.upload(file.files[0], d, update); file.value = ''; };
		if (target.file) this.upload(target.file, d, update);
		$('#mdeImageDel', d).onclick = () => { d.close(); this.removeTarget(target); };
		d.querySelector('form').onsubmit = e => {
			e.preventDefault();
			if ($('#mdeImageOk', d).disabled) return;
			d.close();
			const placement = d.querySelector('[name=mdePlace]:checked').value;
			if (placement === 'bovenaan') {
				Object.assign(this.ed.fields, { image: this.image.src, imageAlt: f('mdeImageAlt').value.trim(), imageCaption: f('mdeImageCaption').value.trim(), imageCredit: f('mdeImageCredit').value.trim() });
				this.ed.renderHead();
				this.ed.loadMarkdownLater();
				this.ed.changed();
				return;
			}
			this.replaceTarget(target, this.imageMarkdown(d));
		};
		update();
		setTimeout(() => (this.image.src ? f('mdeImageAlt') : f('mdeDrop')).focus(), 0);
	}

	imageMarkdown(d) {
		const placement = d.querySelector('[name=mdePlace]:checked').value;
		const alt = $('#mdeImageAlt', d).value.trim().replace(/[[\]]/g, '');
		const caption = [$('#mdeImageCaption', d).value.trim(), $('#mdeImageCredit', d).value.trim()].filter(Boolean).join(' ').replace(/\*/g, '');
		if (placement === 'bovenaan') return `afbeelding: ${this.image.src}`;
		return `![${alt}](${this.image.src || '…'})${placement !== 'breed' ? `{.${placement}}` : ''}` + (caption ? `\n*${caption}*` : '');
	}

	//
	// The chosen photo in the drop zone, so the author sees what goes in; without one the zone invites to choose.
	//
	showImage(d, url) {
		const drop = $('#mdeDrop', d);
		if (!drop.dataset.empty) drop.dataset.empty = drop.innerHTML;
		drop.innerHTML = url ? `<span><img src="${esc(url)}" alt=""><small><i class="fa fa-upload" aria-hidden="true"></i> ${esc(this.t('field-image-other'))}</small></span>` : drop.dataset.empty;
	}

	async upload(file, d, update) {
		const info = $('#mdeImageInfo', d);
		this.showImage(d, URL.createObjectURL(file));
		info.textContent = this.t('image-uploading', { file: file.name });
		const body = new FormData();
		body.append('uploadedfile', file);
		body.append('csrfToken', this.ed.cfg.csrf);
		try {
			const r = await (await fetch(this.ed.cfg.root + 'upload/image', { method: 'POST', body, credentials: 'same-origin' })).json();
			if (r[0]?.error || !r[0]?.thumbUrl) throw new Error(r[0]?.error || 'upload');
			this.image.src = r[0].thumbUrl.replace(this.ed.cfg.root, '').replace(/\?.*$/, '');
			info.textContent = file.name;
			if (!$('#mdeImageAlt', d).value) $('#mdeImageAlt', d).focus();
		}
		catch (e) {
			info.textContent = this.t('image-upload-failed') + (e.message !== 'upload' ? ' ' + e.message : '');
			this.showImage(d, this.image.src ? this.ed.markdownOptions(false).imageSrc(this.image.src) : '');
		}
		update();
	}

	replaceTarget(target, markdown) {
		const ed = this.ed;
		if (target.node && target.view) {
			const parsed = PM.model.Fragment.from(this.parseBlocks(markdown));
			target.view.dispatch(target.view.state.tr.replaceWith(target.pos, target.pos + target.node.nodeSize, parsed).scrollIntoView());
			target.view.focus();
			return;
		}
		if (target.from !== undefined) {
			ed.cm.dispatch({ changes: { from: target.from, to: target.to, insert: markdown } });
			ed.cm.focus();
			return;
		}
		ed.insertBlock(markdown);
	}

	removeTarget(target) {
		//
		// The description before a diagram or an interactive block goes with it.
		//
		if (target.node && target.view) target.view.dispatch(target.view.state.tr.delete(target.noteFrom ?? target.pos, target.pos + target.node.nodeSize));
		else if (target.from !== undefined) this.ed.cm.dispatch({ changes: { from: target.from, to: target.to, insert: '' } });
		this.ed.toast(this.t('deleted'), this.t('undo'), () => this.ed.editMode === 'visual' ? PM.history.undo(target.view.state, target.view.dispatch) : this.ed.undoMarkdown());
	}

	parseBlocks(markdown) {
		return this.ed.markdownToNodes(markdown);
	}

	//
	// Diagram (design steps 6 and 6b): five templates as buttons, 31 in a list with a preview, the Mermaid text left,
	// the drawing right, errors in plain language with the line, a description for screen readers, and placement.
	//
	currentDiagram() {
		if (this.ed.editMode === 'visual') {
			const sel = this.ed.activePm().state.selection;
			return sel.node?.type === schema.nodes.diagram ? { view: this.ed.activePm(), pos: sel.from, node: sel.node } : {};
		}
		const doc = this.ed.cm.state.doc, head = this.ed.cm.state.selection.main.head;
		const text = doc.toString();
		const re = /^```mermaid([^\n]*)\n([\s\S]*?)^```[ \t]*$/gm;
		let m;
		while ((m = re.exec(text))) if (m.index <= head && head <= m.index + m[0].length) {
			const before = text.slice(0, m.index);
			const note = /%%\s*beschrijving:\s*([^\n]*?)\s*%%\s*\n$/.exec(before);
			return { from: note ? m.index - note[0].length : m.index, to: m.index + m[0].length, text: m[2], info: m[1], description: note ? note[1] : '' };
		}
		return {};
	}

	editNode(view, pos, node) {
		if (node.type === schema.nodes.figure) { this.openImage({ view, pos, node }); return true; }
		if (node.type === schema.nodes.diagram) { this.openDiagram({ view, pos, node }); return true; }
		if (node.type === schema.nodes.wikilink) { this.openLink({ view, from: pos, to: pos + node.nodeSize, target: node.attrs.page, text: node.attrs.label, page: true }); return true; }
		if (node.type === schema.nodes.interactive && this.ed.markdownOptions(false).level >= 2) { this.openInteractive({ view, pos, node }); return true; }
		if (node.type === schema.nodes.math_block || node.type === schema.nodes.math_inline) { this.editMath(view, pos); return true; }
		return false;
	}

	openDiagram(target = {}) {
		const d = this.open('mdeDiagramDlg');
		const src = $('#mdeDiagramSrc', d), alt = $('#mdeDiagramAlt', d);
		const editing = !!(target.node || target.text !== undefined);
		let text = target.node ? target.node.attrs.text : target.text;
		let info = target.node ? target.node.attrs.info : target.info || '';
		const description = target.node && target.view ? this.noteBefore(target) : target.description || '';
		const placement = (/\{\.([\w-]+)\}/.exec(info) || [])[1] || 'breed';
		src.value = (text || DIAGRAMS[0].s + '\n').replace(/\n$/, '');
		alt.value = description;
		for (const r of d.querySelectorAll('[name=mdeDplace]')) r.checked = r.value === placement;
		$('#mdeDiagramTitle', d).innerHTML = `<i class="fa fa-sitemap" aria-hidden="true"></i> ${esc(this.t(editing ? 'diagram-edit' : 'diagram-title'))}`;
		$('#mdeDiagramOk', d).textContent = this.t(editing ? 'update' : 'insert');
		$('#mdeDiagramDel', d).hidden = !editing;
		const name = x => this.t('diagram-' + x.key + '-name') === 'diagram-' + x.key + '-name' ? x.nl[0] : this.t('diagram-' + x.key + '-name');
		const descr = x => this.t('diagram-' + x.key + '-desc') === 'diagram-' + x.key + '-desc' ? x.nl[1] : this.t('diagram-' + x.key + '-desc');
		$('#mdeTopTemplates', d).innerHTML = DIAGRAMS.slice(0, TOP_DIAGRAMS).map((x, i) => `<button type="button" data-t="${i}" title="${esc(descr(x))}">${esc(name(x))}</button>`).join('');
		const list = $('#mdeDlist', d);
		const rest = DIAGRAMS.slice(TOP_DIAGRAMS);
		list.innerHTML = rest.map((x, i) => (x.tech && !rest[i - 1]?.tech ? `<li class="dhead" role="presentation">${esc(this.t('diagram-technical'))}</li>` : '') + `<li role="option" id="mdeD${i}" data-t="${i + TOP_DIAGRAMS}"><b>${esc(name(x))}</b> <span>${esc(descr(x))}</span></li>`).join('');
		const use = i => { src.value = DIAGRAMS[i].s; draw(); src.focus(); };
		for (const b of d.querySelectorAll('#mdeTopTemplates [data-t]')) b.onclick = () => use(+b.dataset.t);
		const panel = $('#mdeDpanel', d), more = $('#mdeMoreTypes', d);
		const show = i => {
			const x = DIAGRAMS[i];
			$('#mdeDpd', d).textContent = name(x) + ': ' + descr(x);
			load('pele').then(p => { try { $('#mdeDpv', d).innerHTML = DOMPurify.sanitize(p.render(x.s, { fontSize: 13, responsive: true }).svg, { USE_PROFILES: { svg: true } }); } catch (e) { $('#mdeDpv', d).textContent = ''; } });
			for (const o of list.querySelectorAll('[role=option]')) o.setAttribute('aria-selected', String(+o.dataset.t === i));
			list.setAttribute('aria-activedescendant', 'mdeD' + (i - TOP_DIAGRAMS));
			this.typeIndex = i;
		};
		more.onclick = () => { panel.hidden = !panel.hidden; more.setAttribute('aria-expanded', String(!panel.hidden)); if (!panel.hidden) { show(TOP_DIAGRAMS); list.focus(); } };
		list.onmouseover = e => { const o = e.target.closest('[role=option]'); if (o) show(+o.dataset.t); };
		list.onclick = e => { const o = e.target.closest('[role=option]'); if (o) { use(+o.dataset.t); panel.hidden = true; more.setAttribute('aria-expanded', 'false'); } };
		list.onkeydown = e => {
			if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); show(Math.max(TOP_DIAGRAMS, Math.min(DIAGRAMS.length - 1, this.typeIndex + (e.key === 'ArrowDown' ? 1 : -1)))); }
			else if (e.key === 'Enter') { e.preventDefault(); use(this.typeIndex); panel.hidden = true; more.setAttribute('aria-expanded', 'false'); }
			else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); panel.hidden = true; more.focus(); }
		};
		let timer;
		const draw = () => {
			clearTimeout(timer);
			timer = setTimeout(async () => {
				const pele = await load('pele');
				const err = $('#mdeDiagramErr', d);
				try {
					const svg = pele.render(src.value + '\n', { fontFamily: 'Lato, Helvetica, Arial, sans-serif', fontSize: 15, responsive: true }).svg;
					$('#mdeDiagramView', d).innerHTML = DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true } });
					err.hidden = true;
				}
				catch (e) {
					const message = this.dutchError(e, src.value);
					err.hidden = false;
					err.innerHTML = `<i class="fa fa-exclamation-triangle" aria-hidden="true"></i> ${esc(message.text)}` + (message.fix ? ` <button type="button" class="linkbtn" id="mdeFix">${esc(this.t('diagram-fix'))}</button>` : '');
					$('#mdeFix', d)?.addEventListener('click', () => { const lines = src.value.split('\n'); lines[message.fix - 1] = lines[message.fix - 1].replace(/^(\s*\d{3,4})\s+/, '$1 : '); src.value = lines.join('\n'); draw(); });
				}
			}, 120);
		};
		src.oninput = draw;
		draw();
		$('#mdeDiagramDel', d).onclick = () => { d.close(); this.removeTarget(target); };
		d.querySelector('form').onsubmit = e => {
			e.preventDefault();
			d.close();
			const place = d.querySelector('[name=mdeDplace]:checked').value;
			const md = (alt.value.trim() ? `%% beschrijving: ${alt.value.trim().replace(/%%/g, '%')} %%\n` : '') + '```mermaid' + (place !== 'breed' ? ` {.${place}}` : '') + '\n' + src.value.replace(/\n*$/, '\n') + '```';
			if (target.node && target.noteFrom !== undefined) { target.node = target.view.state.doc.nodeAt(target.pos); const size = target.view.state.doc.nodeAt(target.noteFrom).nodeSize; target.view.dispatch(target.view.state.tr.delete(target.noteFrom, target.noteFrom + size)); target.pos -= size; }
			this.replaceTarget(target, md);
		};
		setTimeout(() => src.focus(), 0);
	}

	//
	// Link (design step 5): one field for a web address or a page of this site, with the pages of the site as you type
	// (private ones with *, and 'nieuwe pagina …'), the text of the link, and removing a link. The same in both views;
	// in Opmaak it also opens when the author types [[.
	//
	currentLink() {
		if (this.ed.editMode === 'markdown') {
			const cm = this.ed.cm, { from, to, head } = cm.state.selection.main, line = cm.state.doc.lineAt(head);
			for (const m of line.text.matchAll(/\[\[([^\]|]+?)(?:\|([^\]]*))?\]\]|\[([^\]]*)\]\(([^)\s]+)\)/g)) {
				const a = line.from + m.index, z = a + m[0].length;
				if (a <= head && head <= z) return { from: a, to: z, target: m[1] ? m[1].trim() : m[4], text: m[1] ? (m[2] || '') : m[3], page: !!m[1] };
			}
			return { from, to, target: '', text: cm.state.sliceDoc(from, to) };
		}
		const v = this.ed.activePm(), sel = v.state.selection;
		if (sel.node?.type === schema.nodes.wikilink) return { view: v, from: sel.from, to: sel.to, target: sel.node.attrs.page, text: sel.node.attrs.label, page: true };
		const $pos = v.state.doc.resolve(sel.from), link = schema.marks.link.isInSet($pos.marks());
		if (link) {
			let from = sel.from, to = sel.from;
			const parent = $pos.parent, start = $pos.start();
			parent.forEach((child, offset) => {
				if (!link.isInSet(child.marks)) return;
				const a = start + offset, z = a + child.nodeSize;
				if (a <= sel.from && sel.from <= z) { from = Math.min(from, a); to = Math.max(to, z); }
			});
			return { view: v, from, to, target: link.attrs.href, text: v.state.doc.textBetween(from, to), mark: true };
		}
		return { view: v, from: sel.from, to: sel.to, target: '', text: v.state.doc.textBetween(sel.from, sel.to) };
	}

	openLink(target = this.currentLink()) {
		const d = this.open('mdeLinkDlg');
		const input = $('#mdeLinkTarget', d), text = $('#mdeLinkText', d), list = $('#mdeLinkList', d);
		const editing = !!(target.page || target.mark || (this.ed.editMode === 'markdown' && target.target));
		input.value = target.target || '';
		text.value = target.text || '';
		$('#mdeLinkDel', d).hidden = !editing;
		$('#mdeLinkOk', d).textContent = this.t(editing ? 'update' : 'insert');
		const isAddress = value => /^(https?:\/\/|mailto:|\/|#)/i.test(value.trim()) || /^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(value.trim());
		let items = [], index = -1;
		const show = () => {
			const q = input.value.trim();
			const lower = q.replace(/[A-Z]+/g, c => c.toLowerCase());
			items = q && isAddress(q) ? [] : (this.ed.cfg.pages || []).filter(([name]) => name.replace(/[A-Z]+/g, c => c.toLowerCase()).includes(lower)).slice(0, 10).map(([name, priv]) => ({ name, label: name + (priv ? ' *' : '') }));
			if (q && !isAddress(q) && !items.some(x => x.name.replace(/[A-Z]+/g, c => c.toLowerCase()) === lower)) items.push({ name: q, label: this.t('page-new', { name: q }) });
			index = -1;
			list.innerHTML = items.map((x, i) => `<li role="option" id="mdeLink${i}" data-i="${i}" aria-selected="false">${esc(x.label)}</li>`).join('');
			list.hidden = !items.length;
			input.setAttribute('aria-expanded', String(!!items.length));
			input.removeAttribute('aria-activedescendant');
		};
		const choose = i => { input.value = items[i].name; list.hidden = true; input.setAttribute('aria-expanded', 'false'); text.focus(); };
		const move = dir => {
			if (!items.length) return;
			index = (index + dir + items.length) % items.length;
			for (const o of list.children) o.setAttribute('aria-selected', String(+o.dataset.i === index));
			input.setAttribute('aria-activedescendant', 'mdeLink' + index);
			list.children[index]?.scrollIntoView({ block: 'nearest' });
		};
		input.oninput = show;
		input.onkeydown = e => {
			if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); move(e.key === 'ArrowDown' ? 1 : -1); }
			else if (e.key === 'Enter' && index >= 0 && !list.hidden) { e.preventDefault(); choose(index); }
		};
		list.onmousedown = e => { e.preventDefault(); const o = e.target.closest('[data-i]'); if (o) choose(+o.dataset.i); };
		show();
		$('#mdeLinkDel', d).onclick = () => { d.close(); this.applyLink(target, null, ''); };
		d.querySelector('form').onsubmit = e => {
			e.preventDefault();
			const value = input.value.trim();
			if (!value) { input.focus(); return; }
			d.close();
			this.applyLink(target, isAddress(value) ? { href: /^[\w-]+(\.[\w-]+)+/.test(value) && !/^https?:/i.test(value) ? 'https://' + value : value } : { page: value }, text.value.trim());
		};
		setTimeout(() => { input.focus(); input.select(); }, 0);
	}

	//
	// Puts the link in the text: a page as [[page|text]] (a wikilink in Opmaak), an address as [text](address) (the link
	// mark); without a link, only the text stays.
	//
	applyLink(target, link, label) {
		if (this.ed.editMode === 'markdown') {
			const cm = this.ed.cm;
			const shown = label || (link?.page ? '' : link?.href) || target.text || '';
			const insert = !link ? (label || target.text || '') : link.page ? `[[${link.page}${label && label !== link.page ? '|' + label : ''}]]` : `[${shown}](${link.href})`;
			cm.dispatch({ changes: { from: target.from, to: target.to, insert }, selection: { anchor: target.from + insert.length } });
			return cm.focus();
		}
		const v = target.view, tr = v.state.tr, s = schema;
		if (target.page || !link || link.page) {
			const content = label || target.text;
			const node = link?.page ? s.nodes.wikilink.create({ page: link.page, anchor: '', label: label && label !== link.page ? label : '' }) : content ? s.text(content) : null;
			if (node) tr.replaceWith(target.from, target.to, node);
			else tr.delete(target.from, target.to);
			if (!link && target.mark) { tr.removeMark(target.from, target.from + (content || '').length, s.marks.link); }
		}
		else {
			const mark = s.marks.link.create({ href: link.href });
			const content = label || target.text || link.href;
			tr.replaceWith(target.from, target.to, s.text(content, [mark]));
		}
		v.dispatch(tr.scrollIntoView());
		v.focus();
	}

	//
	// The description of a diagram or an interactive block: a note %% beschrijving: … %% right before it.
	//
	noteBefore(target) {
		const before = target.pos > 0 ? target.view.state.doc.resolve(target.pos).nodeBefore : null;
		const m = before?.type === schema.nodes.note_block ? /^%%\s*beschrijving:\s*([\s\S]*?)\s*%%$/.exec(before.attrs.source.trim()) : null;
		if (m) target.noteFrom = target.pos - before.nodeSize;
		return m ? m[1] : '';
	}

	//
	// Interactive block of level 2 (design section 10.1, step 9c): code left, the working block right, as the reader
	// gets it (sandbox, Content-Security-Policy), a description (BR-07) and a height.
	//
	currentInteractive() {
		if (this.ed.editMode === 'visual') {
			const v = this.ed.activePm(), sel = v.state.selection;
			return sel.node?.type === schema.nodes.interactive ? { view: v, pos: sel.from, node: sel.node } : {};
		}
		const text = this.ed.cm.state.doc.toString(), head = this.ed.cm.state.selection.main.head;
		const re = /^```(html\s+(?:interactief|interactive)\b[^\n]*)\n([\s\S]*?)^```[ \t]*$/gm;
		let m;
		while ((m = re.exec(text))) if (m.index <= head && head <= m.index + m[0].length) {
			const note = /%%\s*beschrijving:\s*([^\n]*?)\s*%%\s*\n$/.exec(text.slice(0, m.index));
			return { from: note ? m.index - note[0].length : m.index, to: m.index + m[0].length, text: m[2], info: m[1], description: note ? note[1] : '' };
		}
		return {};
	}

	openInteractive(target = {}) {
		const d = this.open('mdeIaDlg');
		const src = $('#mdeIaSrc', d), alt = $('#mdeIaAlt', d), height = $('#mdeIaHeight', d), view = $('#mdeIaView', d);
		const editing = !!(target.node || target.text !== undefined);
		const info = target.node ? target.node.attrs.info : target.info || 'html interactief';
		const description = target.node && target.view ? this.noteBefore(target) : target.description || '';
		const attributes = /\{([^}]*)\}\s*$/.exec(info)?.[1] || '';
		const word = /^html\s+(interactive)\b/i.test(info) ? 'interactive' : 'interactief';
		src.value = (target.node ? target.node.attrs.text : target.text ?? `<button id="knop">${this.t('ia-sample-button')}</button>\n<p id="uit"></p>\n<script>\n  let n = 0;\n  knop.onclick = () => uit.textContent = ++n;\n</script>\n`).replace(/\n$/, '');
		alt.value = description;
		height.value = (/(?:hoogte|height)=(\d+)/.exec(attributes) || [])[1] || '';
		const hosts = this.ed.cfg.settings?.scriptHosts || [];
		$('#mdeIaHosts', d).textContent = hosts.length ? this.t('ia-hosts', { hosts: hosts.join(', ') }) : this.t('ia-hosts-none');
		$('#mdeIaTitle', d).innerHTML = `<i class="fa fa-puzzle-piece" aria-hidden="true"></i> ${esc(this.t(editing ? 'ia-edit' : 'ia-title'))}`;
		$('#mdeIaOk', d).textContent = this.t(editing ? 'update' : 'insert');
		$('#mdeIaDel', d).hidden = !editing;
		let timer;
		const draw = () => {
			clearTimeout(timer);
			timer = setTimeout(() => {
				view.style.height = Math.min(Math.max(+height.value || 400, 50), 600) + 'px';
				//
				// Without a height the block reports its own, as for the reader.
				//
				if (+height.value > 0) view.removeAttribute('data-height'); else view.setAttribute('data-height', 'auto');
				view.srcdoc = this.ed.srcdoc(src.value, !(+height.value > 0));
			}, 400);
		};
		src.oninput = draw;
		height.oninput = draw;
		draw();
		$('#mdeIaDel', d).onclick = () => { d.close(); this.removeTarget(target); };
		d.querySelector('form').onsubmit = e => {
			e.preventDefault();
			if (!alt.value.trim()) { alt.focus(); return; }
			d.close();
			view.srcdoc = '';
			//
			// The height replaces hoogte= or height= in the attributes; other attributes stay as they were.
			//
			let rest = attributes.replace(/\s*(?:hoogte|height)=\d+/g, '').trim();
			if (+height.value > 0) rest = (`hoogte=${Math.round(+height.value)} ` + rest).trim();
			const fence = '`'.repeat(Math.max(3, ...(src.value.match(/`{3,}/g) || []).map(x => x.length + 1)));
			const md = `%% beschrijving: ${alt.value.trim().replace(/%%/g, '%').replace(/\s+/g, ' ')} %%\n${fence}html ${word}${rest ? ` {${rest}}` : ''}\n${src.value.replace(/\n*$/, '\n')}${fence}`;
			if (target.node && target.noteFrom !== undefined) { const size = target.view.state.doc.nodeAt(target.noteFrom).nodeSize; target.view.dispatch(target.view.state.tr.delete(target.noteFrom, target.noteFrom + size)); target.pos -= size; target.node = target.view.state.doc.nodeAt(target.pos); }
			this.replaceTarget(target, md);
		};
		d.addEventListener('close', () => { view.srcdoc = ''; }, { once: true });
		setTimeout(() => src.focus(), 0);
	}

	//
	// Pele reports line and column; the message says what to do, in plain language (design step 6).
	//
	dutchError(e, text) {
		const count = text.replace(/\n+$/, '').split('\n').length;
		const raw = e && (e.line || (String(e.message || '').match(/line (\d+)/i) || [])[1]);
		const line = raw ? Math.min(+raw, count) : null;
		const l = line ? (text.split('\n')[line - 1] || '') : '';
		let hint = this.t('diagram-error-check');
		let fix = null;
		if (e && e.code === 'unsupported-diagram') hint = this.t('diagram-error-unknown');
		else if (/--\s+>|-\s+->/.test(l)) hint = this.t('diagram-error-arrow-space');
		else if (/^\s*timeline/.test(text) && line && /^\s*\d{3,4}\s+[^:]/.test(l)) { hint = this.t('diagram-error-colon'); fix = line; }
		else if (/-->|---/.test(l)) hint = this.t('diagram-error-arrow');
		return { text: (line ? this.t('diagram-error-line', { line }) + ' ' : this.t('diagram-error') + ' ') + hint, fix };
	}

	//
	// Formula: LaTeX in a small dialog with a live preview (Temml); an error shows the message of Temml (BR-46).
	//
	editMath(view, pos) {
		const node = view.state.doc.nodeAt(pos);
		if (!node) return;
		const d = this.open('mdeMathDlg');
		const src = $('#mdeMathSrc', d);
		src.value = node.attrs.tex;
		const show = () => load('temml').then(t => {
			try { $('#mdeMathView', d).innerHTML = t.renderToString(src.value, { displayMode: node.type === schema.nodes.math_block, throwOnError: true }); }
			catch (e) { $('#mdeMathView', d).textContent = this.t('math-error') + ' ' + String(e.message || e).replace(/^Temml parse error: /, ''); }
		});
		src.oninput = show;
		show();
		d.querySelector('form').onsubmit = e => {
			e.preventDefault();
			d.close();
			view.dispatch(view.state.tr.setNodeMarkup(pos, null, { tex: src.value.trim() }));
			view.focus();
		};
		setTimeout(() => src.select(), 0);
	}

	//
	// Table menu (design step 3b): a new table with 2 to 6 columns, align the column of the cursor, add or remove rows
	// and columns, delete the table; the same in both views and on the right mouse button in a cell.
	//
	toggleTableMenu(button, x, y) {
		const menu = $('#mdeTableMenu', this.root);
		if (!menu.hidden && !x) return this.closeMenu(menu, button);
		const inTable = this.ed.editMode === 'visual' ? PM.tables.isInTable(this.ed.activePm().state) : !!this.mdTable();
		const item = (op, label, enabled = true) => `<button type="button" role="menuitem" data-op="${op}"${enabled ? '' : ' disabled aria-disabled="true"'}>${esc(this.t(label))}</button>`;
		menu.innerHTML = `<div class="mh">${esc(this.t('table-new'))}</div><div class="cols">` + [2, 3, 4, 5, 6].map(n => `<button type="button" role="menuitem" data-op="new" data-n="${n}" title="${esc(this.t('table-columns', { n }))}" aria-label="${esc(this.t('table-columns', { n }))}">${tableIcon(n)}<span>${n}</span></button>`).join('') + '</div>'
			+ `<div class="mh">${esc(this.t('table-this'))}</div>` + item('left', 'table-left', inTable) + item('center', 'table-center', inTable) + item('right', 'table-right', inTable)
			+ item('rowAfter', 'table-row-add', inTable) + item('colAfter', 'table-col-add', inTable) + item('rowDel', 'table-row-del', inTable) + item('colDel', 'table-col-del', inTable) + item('tableDel', 'table-del', inTable);
		const r = button.getBoundingClientRect();
		menu.style.left = (x ?? r.left) + 'px';
		menu.style.top = (y ?? r.bottom + 4) + 'px';
		menu.hidden = false;
		button.setAttribute('aria-expanded', 'true');
		menu.onclick = e => { const b = e.target.closest('[data-op]'); if (!b || b.disabled) return; this.closeMenu(menu, button); this.tableOp(b.dataset.op, +b.dataset.n); };
		menu.onkeydown = e => this.menuKeys(e, menu, button);
		setTimeout(() => menu.querySelector('button:not([disabled])').focus(), 0);
		const outside = e => { if (!menu.contains(e.target) && e.target !== button) { this.closeMenu(menu, button, false); document.removeEventListener('mousedown', outside); } };
		document.addEventListener('mousedown', outside);
	}

	menuKeys(e, menu, button) {
		const items = [...menu.querySelectorAll('button:not([disabled])')];
		const i = items.indexOf(document.activeElement);
		if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); items[(i + 1) % items.length].focus(); }
		else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
		else if (e.key === 'Escape') { e.preventDefault(); this.closeMenu(menu, button); }
	}

	closeMenu(menu, button, focus = true) {
		menu.hidden = true;
		button?.setAttribute('aria-expanded', 'false');
		if (focus) button?.focus();
	}

	tableOp(op, n) {
		if (op === 'new') {
			const head = '| ' + Array.from({ length: n }, (x, i) => this.t('table-heading', { n: i + 1 })).join(' | ') + ' |';
			const rule = '|' + Array(n).fill('---').join('|') + '|';
			const row = '| ' + Array(n).fill(' ').join(' | ') + ' |';
			return this.ed.insertBlock([head, rule, row, row].join('\n'));
		}
		if (this.ed.editMode === 'visual') {
			const v = this.ed.activePm(), tb = PM.tables;
			if (!tb.isInTable(v.state)) return;
			const cmd = { rowAfter: tb.addRowAfter, colAfter: tb.addColumnAfter, rowDel: tb.deleteRow, colDel: tb.deleteColumn, tableDel: tb.deleteTable }[op];
			if (cmd) cmd(v.state, v.dispatch);
			else {
				const $cell = tb.selectionCell(v.state);
				const map = tb.TableMap.get($cell.node(-1));
				const col = map.colCount($cell.pos - $cell.start(-1));
				const tableStart = $cell.start(-1);
				let tr = v.state.tr;
				for (let row = 0; row < map.height; row++) {
					const pos = tableStart + map.map[row * map.width + col];
					tr = tr.setNodeMarkup(pos, null, Object.assign({}, tr.doc.nodeAt(pos).attrs, { align: op }));
				}
				v.dispatch(tr);
			}
			return v.focus();
		}
		this.mdTableOp(op);
	}

	//
	// Tables in Markdown: the GFM table around the cursor as rows of cells.
	//
	mdTable() {
		const cm = this.ed.cm, doc = cm.state.doc;
		const line = doc.lineAt(cm.state.selection.main.head);
		if (!/^\s*\|/.test(line.text)) return null;
		let first = line.number, last = line.number;
		while (first > 1 && /^\s*\|/.test(doc.line(first - 1).text)) first--;
		while (last < doc.lines && /^\s*\|/.test(doc.line(last + 1).text)) last++;
		const split = text => text.trim().replace(/^\||\|$/g, '').split(/(?<!\\)\|/).map(c => c.trim());
		const rows = [];
		for (let i = first; i <= last; i++) rows.push(split(doc.line(i).text));
		if (rows.length < 2 || !rows[1].every(c => /^:?-+:?$/.test(c))) return null;
		const head = cm.state.selection.main.head - line.from;
		const col = Math.max(0, (line.text.slice(0, head).match(/(?<!\\)\|/g) || []).length - 1);
		return { first, last, rows, row: line.number - first, col };
	}

	mdTableOp(op) {
		const t = this.mdTable();
		if (!t) return;
		const { rows } = t;
		const width = rows[0].length;
		const align = { left: ':--', center: ':-:', right: '--:' };
		if (align[op]) rows[1][t.col] = align[op];
		if (op === 'rowAfter') rows.splice(Math.max(2, t.row + 1), 0, Array(width).fill(''));
		if (op === 'colAfter') rows.forEach((r, i) => r.splice(t.col + 1, 0, i === 1 ? '---' : ''));
		if (op === 'rowDel' && t.row >= 2) rows.splice(t.row, 1);
		if (op === 'colDel' && width > 1) rows.forEach(r => r.splice(t.col, 1));
		const doc = this.ed.cm.state.doc;
		const from = doc.line(t.first).from, to = doc.line(t.last).to;
		const text = op === 'tableDel' ? '' : rows.map((r, i) => i === 1 ? '|' + r.join('|') + '|' : '| ' + r.join(' | ') + ' |').join('\n');
		this.ed.cm.dispatch({ changes: { from, to, insert: text } });
		this.ed.cm.focus();
	}

	mdTableTab(dir) {
		const t = this.ed.editMode === 'markdown' && this.mdTable();
		if (!t) return false;
		const cm = this.ed.cm, doc = cm.state.doc;
		let row = t.row, col = t.col + dir;
		if (col >= t.rows[0].length) { col = 0; row++; }
		if (col < 0) { col = t.rows[0].length - 1; row--; }
		if (row === 1) row += dir;
		if (row < 0) return true;
		if (row > t.rows.length - 1) {
			const end = doc.line(t.last).to;
			cm.dispatch({ changes: { from: end, insert: '\n| ' + Array(t.rows[0].length).fill('').join(' | ') + ' |' } });
			return this.mdTableTab(dir) || true;
		}
		const line = cm.state.doc.line(t.first + row);
		const bars = [...line.text.matchAll(/(?<!\\)\|/g)].map(m => m.index);
		const pos = line.from + (bars[col] ?? 0) + 2;
		cm.dispatch({ selection: { anchor: Math.min(pos, line.to) } });
		return true;
	}

	toggleMore(button) {
		const menu = $('#mdeMoreMenu', this.root);
		if (!menu.hidden) return this.closeMenu(menu, button);
		menu.innerHTML = (this.ed.moved || []).map(b => `<button type="button" role="menuitem" data-proxy="${b.dataset.act}">${b.querySelector('i')?.outerHTML || ''}<span class="lbl">${esc(b.title)}</span></button>`).join('');
		const r = button.getBoundingClientRect();
		menu.style.left = Math.max(8, r.right - 260) + 'px';
		menu.style.top = r.bottom + 4 + 'px';
		menu.hidden = false;
		//
		// Above the button when there is no room below, as with the toolbar at the bottom of a phone.
		//
		if (r.bottom + 4 + menu.offsetHeight > window.innerHeight) menu.style.top = Math.max(8, r.top - 4 - menu.offsetHeight) + 'px';
		button.setAttribute('aria-expanded', 'true');
		menu.onclick = e => { const b = e.target.closest('[data-proxy]'); if (b) { this.closeMenu(menu, button, false); this.ed.action(b.dataset.proxy, button); } };
		menu.onkeydown = e => this.menuKeys(e, menu, button);
		setTimeout(() => menu.querySelector('button')?.focus(), 0);
	}

	//
	// The / menu at the start of a line and the [[ suggestions (design steps 3 and 5), in the Markdown view.
	//
	slashItems() {
		return [
			['heading', 'header', '### '], ['subheading', 'header', '#### '], ['quote', 'quote-left', '> [!quote]'], ['callout', 'square-o', '> [!info]'], ['warning', 'exclamation-triangle', '> [!warning]'],
			['list', 'list-ul', '- '], ['footnote', 'superscript', '[^1]'], ['table', 'table', '| … |'], ['image', 'picture-o', '![…](…)'], ['diagram', 'sitemap', '```mermaid'],
			['math', 'calculator', '$$ … $$'], ['code', 'code', '```php'], ['rule', 'minus', '---'],
			...(this.ed.markdownOptions(false).level >= 2 ? [['interactive', 'puzzle-piece', '```html interactief']] : []),
		].map(([k, icon, md]) => ({ key: k, icon, md, label: this.t('slash-' + k) }));
	}

	markdownCursor(update) {
		const cm = this.ed.cm, sel = cm.state.selection.main;
		if (!sel.empty) return this.hidePopup();
		const line = cm.state.doc.lineAt(sel.head);
		const before = line.text.slice(0, sel.head - line.from);
		let m;
		if ((m = /^\/(\S*)$/.exec(before))) return this.showPopup('slash', m[1], line.from, sel.head);
		if ((m = /\[\[([^\]|]*)$/.exec(before))) return this.showPopup('page', m[1], sel.head - m[1].length, sel.head);
		this.hidePopup();
	}

	visualCursor(view) { this.ed.lastPm = view; }

	//
	// Beeld and Diagram become Bewerken when the cursor is in an image or a diagram (design step 2b), a moment after
	// the cursor stops, so moving the cursor stays fast.
	//
	updateEditLabels() {
		clearTimeout(this.labelTimer);
		this.labelTimer = setTimeout(() => {
			let changed = false;
			for (const [act, target] of [['image', this.currentImage()], ['diagram', this.currentDiagram()]]) {
				const editing = !!(target.node || target.line || target.text !== undefined);
				for (const b of this.root.querySelectorAll(`.toolbar [data-act="${act}"]`)) {
					if ((b.dataset.editing === '1') === editing) continue;
					b.dataset.editing = editing ? '1' : '';
					const key = 'tb-' + act + (editing ? '-edit' : '');
					b.title = this.t(key + '-help');
					const label = b.querySelector('.lbl');
					if (label) label.textContent = this.t(key);
					changed = true;
				}
			}
			if (changed) this.ed.fitToolbar();
		}, 150);
	}

	showSlash() {
		if (this.ed.editMode !== 'markdown') return;
		const cm = this.ed.cm, line = cm.state.doc.lineAt(cm.state.selection.main.head);
		const insert = line.text.trim() ? '\n/' : '/';
		const at = line.text.trim() ? line.to : line.from;
		cm.dispatch({ changes: { from: at, to: line.text.trim() ? at : line.to, insert }, selection: { anchor: at + insert.length } });
		cm.focus();
	}

	showPopup(kind, query, from, to) {
		const q = query.toLowerCase();
		let items;
		if (kind === 'slash') items = this.slashItems().filter(x => !q || x.label.toLowerCase().includes(q) || x.key.includes(q));
		else items = (this.ed.cfg.pages || []).filter(([name]) => name.toLowerCase().includes(q)).slice(0, 12).map(([name, priv]) => ({ key: name, label: name + (priv ? ' *' : ''), md: '' }));
		if (kind === 'page' && query.trim() && !items.some(x => x.key.toLowerCase() === q)) items.push({ key: query.trim(), label: this.t('page-new', { name: query.trim() }), md: '', create: true });
		if (!items.length) return this.hidePopup();
		this.popup = { open: true, kind, items, index: 0, from, to };
		const box = $('#mdePopup', this.root);
		box.innerHTML = items.map((x, i) => `<div role="option" id="mdeOpt${i}" class="opt${i === 0 ? ' active' : ''}" aria-selected="${i === 0}" data-i="${i}">${x.icon ? `<i class="fa fa-${x.icon}" aria-hidden="true"></i> ` : ''}${esc(x.label)}${x.md ? `<span class="md">${esc(x.md)}</span>` : ''}</div>`).join('');
		box.hidden = false;
		this.placePopup();
		//
		// The list stands at the cursor in the window, so it moves along when the page scrolls (typing scrolls too).
		//
		if (!this.scrollBound) { this.scrollBound = true; window.addEventListener('scroll', () => { if (this.popup.open) this.placePopup(); }, { passive: true }); }
		this.ed.cm.contentDOM.setAttribute('aria-activedescendant', 'mdeOpt0');
		this.ed.cm.contentDOM.setAttribute('aria-controls', 'mdePopup');
		box.onmousedown = e => { e.preventDefault(); const o = e.target.closest('[data-i]'); if (o) this.choose(+o.dataset.i); };
		if (!this.keysBound) {
			this.keysBound = true;
			this.ed.cm.contentDOM.addEventListener('keydown', e => {
				if (!this.popup.open) return;
				if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); e.stopPropagation(); this.move(e.key === 'ArrowDown' ? 1 : -1); }
				else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); e.stopPropagation(); this.choose(this.popup.index); }
				else if (e.key === 'Escape') { e.preventDefault(); this.hidePopup(); }
			}, true);
		}
	}

	//
	// Below the cursor, or above it when there is no room below, as near the bottom of the window.
	//
	placePopup() {
		const box = $('#mdePopup', this.root);
		const coords = this.ed.cm.coordsAtPos(this.popup.to);
		if (!coords) return;
		box.style.left = coords.left + 'px';
		const below = coords.bottom + 4, above = coords.top - 4 - box.offsetHeight;
		box.style.top = (below + box.offsetHeight > window.innerHeight && above >= 0 ? above : below) + 'px';
	}

	move(dir) {
		const p = this.popup;
		p.index = (p.index + dir + p.items.length) % p.items.length;
		for (const o of this.root.querySelectorAll('#mdePopup [data-i]')) { const on = +o.dataset.i === p.index; o.classList.toggle('active', on); o.setAttribute('aria-selected', String(on)); if (on) o.scrollIntoView({ block: 'nearest' }); }
		this.ed.cm.contentDOM.setAttribute('aria-activedescendant', 'mdeOpt' + p.index);
	}

	hidePopup() {
		if (!this.popup.open) return;
		this.popup.open = false;
		$('#mdePopup', this.root).hidden = true;
		this.ed.cm.contentDOM.removeAttribute('aria-activedescendant');
	}

	choose(i) {
		const p = this.popup, item = p.items[i], cm = this.ed.cm;
		this.hidePopup();
		if (p.kind === 'page') {
			const after = cm.state.sliceDoc(p.to, p.to + 2) === ']]' ? '' : ']]';
			cm.dispatch({ changes: { from: p.from, to: p.to, insert: item.key + after }, selection: { anchor: p.from + item.key.length + 2 } });
			return cm.focus();
		}
		cm.dispatch({ changes: { from: p.from, to: p.to, insert: '' } });
		const samples = { heading: '### ', subheading: '#### ', list: '- ', rule: '---\n', footnote: null, code: '```php\n\n```' };
		if (item.key === 'interactive') return this.openInteractive(this.currentInteractive());
		if (['image', 'diagram', 'table'].includes(item.key)) return item.key === 'table' ? this.tableOp('new', 3) : this.ed.action(item.key);
		if (item.key === 'quote' || item.key === 'callout') return this.ed.markdownAction(item.key);
		if (item.key === 'warning') return this.ed.insertBlock('> [!warning] ' + this.t('warning-sample-title') + '\n> ' + this.t('callout-sample'));
		if (item.key === 'math') return this.ed.insertBlock('$$\n\\tfrac{a}{b}\n$$');
		if (item.key === 'footnote') {
			const n = (cm.state.doc.toString().match(/\[\^(\d+)\]:/g) || []).length + 1;
			const pos = cm.state.selection.main.head;
			cm.dispatch({ changes: [{ from: pos, insert: `[^${n}]` }, { from: cm.state.doc.length, insert: `\n\n[^${n}]: ${this.t('footnote-sample')}` }] });
			return cm.focus();
		}
		const text = samples[item.key] ?? '';
		const pos = cm.state.selection.main.head;
		cm.dispatch({ changes: { from: pos, insert: text }, selection: { anchor: pos + (item.key === 'code' ? 7 : text.length) } });
		cm.focus();
	}
}

function tableIcon(n) {
	const w = 6;
	let s = `<svg width="${n * w + 2}" height="14" viewBox="0 0 ${n * w + 2} 14" aria-hidden="true">`;
	for (let i = 0; i < n; i++) s += `<rect x="${1 + i * w}" y="1" width="${w}" height="12" fill="none" stroke="currentColor"/>`;
	return s + '<line x1="1" y1="5" x2="' + (n * w + 1) + '" y2="5" stroke="currentColor"/></svg>';
}

//
// A caption line holds the caption and, at its end, the credit ('Foto Naam' or 'Bron: …').
//
function splitCredit(caption) {
	const m = /^(.*?)\s*((?:Foto|Beeld|Bron|Photo|Image|Source)\b.*)$/.exec(caption || '');
	return m ? [m[1], m[2]] : [caption || '', ''];
}
