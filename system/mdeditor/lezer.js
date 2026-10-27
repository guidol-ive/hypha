//
// Reading view of a Markdown page: an interactive block without a fixed height reports its height with postMessage
// (design section 10.1, rule 2). Only a message from the iframe of such a block counts, and the height stays between
// 50 and 4000 pixels.
//
addEventListener('message', function (event) {
	var height = event.data && event.data.hyphaHeight;
	if (typeof height !== 'number' || !isFinite(height)) return;
	var frames = document.querySelectorAll('figure.interactief iframe[data-height="auto"]');
	for (var i = 0; i < frames.length; i++) if (frames[i].contentWindow === event.source) frames[i].style.height = Math.max(50, Math.min(4000, Math.ceil(height))) + 'px';
});
