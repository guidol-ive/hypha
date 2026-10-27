//
// Milkdown configured for Hypha: '-' for lists, '---' for rules, and the math plugin.
//
import { Editor, rootCtx, defaultValueCtx, editorViewCtx, serializerCtx, remarkStringifyOptionsCtx } from '@milkdown/kit/core';
import { commonmark } from '@milkdown/kit/preset/commonmark';
import { gfm } from '@milkdown/kit/preset/gfm';
import { history } from '@milkdown/kit/plugin/history';
import { math } from '@milkdown/plugin-math';
window.makeMK2 = async (root, md) => {
	const editor = await Editor.make().config(ctx => {
		ctx.set(rootCtx, root); ctx.set(defaultValueCtx, md);
		ctx.update(remarkStringifyOptionsCtx, o => ({ ...o, bullet: '-', rule: '-', fences: true, incrementListMarker: true }));
	}).use(commonmark).use(gfm).use(history).use(math).create();
	return { editor, ser: () => editor.action(ctx => ctx.get(serializerCtx)(ctx.get(editorViewCtx).state.doc)) };
};
