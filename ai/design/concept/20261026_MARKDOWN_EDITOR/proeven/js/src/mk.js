//
// Milkdown with CommonMark and GFM, for the round-trip test of the visual view.
//
import { Editor, rootCtx, defaultValueCtx, editorViewCtx, serializerCtx } from '@milkdown/kit/core';
import { commonmark } from '@milkdown/kit/preset/commonmark';
import { gfm } from '@milkdown/kit/preset/gfm';
import { history } from '@milkdown/kit/plugin/history';
import { clipboard } from '@milkdown/kit/plugin/clipboard';
window.makeMK = async (root, md) => {
	const editor = await Editor.make().config(ctx => { ctx.set(rootCtx, root); ctx.set(defaultValueCtx, md); }).use(commonmark).use(gfm).use(history).use(clipboard).create();
	const ser = () => editor.action(ctx => ctx.get(serializerCtx)(ctx.get(editorViewCtx).state.doc));
	return { editor, ser, view: () => editor.action(ctx => ctx.get(editorViewCtx)) };
};
