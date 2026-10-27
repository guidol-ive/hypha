//
// Plain ProseMirror with prosemirror-markdown (markdown-it as parser), the lighter alternative to Milkdown.
//
import { schema, defaultMarkdownParser, defaultMarkdownSerializer, MarkdownParser } from 'prosemirror-markdown';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { history } from 'prosemirror-history';
import { keymap } from 'prosemirror-keymap';
import { baseKeymap } from 'prosemirror-commands';
import MarkdownIt from 'markdown-it';
window.makePM = (root, md) => {
	const view = new EditorView(root, { state: EditorState.create({ doc: defaultMarkdownParser.parse(md), plugins: [history(), keymap(baseKeymap)] }) });
	return { view, ser: () => defaultMarkdownSerializer.serialize(view.state.doc) };
};
