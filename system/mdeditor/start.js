//
// Start of the Markdown editor: reads the configuration that the page carries in #mdeConfig, starts the editor in
// #mdeditor and offers it as window.hyphaMdeditor to the save and cancel buttons of Hypha (system/core/mdeditor.php).
// The libraries come through the import map of the page, with their version in the name, so a browser keeps them.
//
import { Editor } from './editor.js';

const root = document.getElementById('mdeditor');
const data = document.getElementById('mdeConfig');
if (root && data) {
	const config = JSON.parse(data.textContent);
	const editor = new Editor(root, config);
	window.hyphaMdeditor = {
		save: () => editor.save(),
		cancel: () => editor.cancel(),
		editor,
	};
	editor.mount();
	window.mdeOpened = performance.now();
}
