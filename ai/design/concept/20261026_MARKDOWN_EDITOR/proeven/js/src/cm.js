//
// CodeMirror 6 with the Markdown language, as the Markdown view of the editor would load it.
//
import { EditorView, keymap, drawSelection, highlightActiveLine } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
window.makeCM = (parent, doc) => new EditorView({
	parent,
	state: EditorState.create({ doc, extensions: [history(), drawSelection(), keymap.of([...defaultKeymap, ...historyKeymap]), markdown(), syntaxHighlighting(defaultHighlightStyle), EditorView.lineWrapping, EditorView.contentAttributes.of({ spellcheck: 'true', lang: 'nl', autocorrect: 'on', autocapitalize: 'sentences' })] })
});
