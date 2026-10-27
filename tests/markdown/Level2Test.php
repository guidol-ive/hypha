<?php
	//
	// Freedom level 2 (design section 10.1, BR-41, BR-95, BR-07): embedded content of as many services as possible,
	// and the interactive block in a sandboxed iframe without allow-same-origin.
	//
	require_once 'system/core/markdown.php';
	hypha_markdownLoad();

	$embeds = [
		'youtube' => ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'],
		'youtube short link' => ['https://youtu.be/dQw4w9WgXcQ', 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'],
		'vimeo' => ['https://vimeo.com/76979871', 'https://player.vimeo.com/video/76979871'],
		'openstreetmap' => ['https://www.openstreetmap.org/export/embed.html?bbox=5.3,52.1,5.4,52.2&layer=mapnik', 'https://www.openstreetmap.org/export/embed.html?bbox=5.3,52.1,5.4,52.2&amp;layer=mapnik'],
		'datawrapper' => ['https://datawrapper.dwcdn.net/AbC12/3/', 'https://datawrapper.dwcdn.net/AbC12/'],
		'flourish' => ['https://public.flourish.studio/visualisation/123456/', 'https://flo.uri.sh/visualisation/123456/embed'],
		'infogram' => ['https://infogram.com/begroting-eemstad-1h7z2l8', 'https://e.infogram.com/begroting-eemstad-1h7z2l8'],
		'google maps' => ['https://www.google.com/maps/embed?pb=!1m18abc', 'https://www.google.com/maps/embed?pb=!1m18abc'],
		'spotify' => ['https://open.spotify.com/episode/4rOoJ6Egrf8K2IrywzwOMk', 'https://open.spotify.com/embed/episode/4rOoJ6Egrf8K2IrywzwOMk'],
		'soundcloud' => ['https://soundcloud.com/eemstad/raadsvergadering', 'https://w.soundcloud.com/player/?url=https://soundcloud.com/eemstad/raadsvergadering'],
		'mixcloud' => ['https://www.mixcloud.com/eemstad/uitzending/', 'https://player-widget.mixcloud.com/widget/iframe/?feed=%2Feemstad/uitzending%2F'],
		'internet archive' => ['https://archive.org/details/raad-2006', 'https://archive.org/embed/raad-2006'],
		'bandcamp' => ['https://bandcamp.com/EmbeddedPlayer/album=123/size=large', 'https://bandcamp.com/EmbeddedPlayer/album=123/size=large'],
		'scribd' => ['https://www.scribd.com/document/123456/Begroting', 'https://www.scribd.com/embeds/123456/content'],
		'documentcloud' => ['https://www.documentcloud.org/documents/2096-raadsbesluit', 'https://embed.documentcloud.org/documents/2096-raadsbesluit/'],
		'peertube' => ['https://framatube.org/w/kkGMgK9ZtnKfYAgnEtQxbv', 'https://framatube.org/videos/embed/kkGMgK9ZtnKfYAgnEtQxbv'],
	];
	foreach ($embeds as $service => [$url, $src]) {
		test("level 2: embedded $service", function () use ($url, $src) {
			$out = md($url);
			contains('<iframe src="' . $src . '"', $out);
			contains('sandbox="allow-scripts allow-same-origin allow-popups allow-presentation"', $out);
			contains('loading="lazy"', $out);
			contains('referrerpolicy="strict-origin-when-cross-origin"', $out);
			contains('title="', $out);
		});
	}

	test('level 2: HedgeDoc {%youtube id %}', function () {
		contains('src="https://www.youtube-nocookie.com/embed/abcdefgh"', md('{%youtube abcdefgh %}'));
	});

	test('level 2: a link to an unknown host, or within a sentence, stays a link', function () {
		$out = md("https://evil.example/watch?v=x\n\nKijk op https://www.youtube.com/watch?v=dQw4w9WgXcQ hier.");
		lacks('<iframe', $out);
		contains('<a href="https://evil.example/watch?v=x"', $out);
	});

	test('level 1: no embedded content, the link stays', function () {
		$out = md('https://www.youtube.com/watch?v=dQw4w9WgXcQ', [], ['level' => 1]);
		lacks('<iframe', $out);
		contains('<a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ"', $out);
	});

	test('level 2: interactive block with description becomes a sandboxed srcdoc iframe', function () {
		$source = "%% beschrijving: rekenhulp afvalstoffenheffing %%\n```html interactief {hoogte=420}\n<p id=\"uit\"></p>\n<script>uit.textContent = 'x';</script>\n```\n";
		$out = md($source);
		contains('<figure class="interactief"><iframe sandbox="allow-scripts"', $out);
		lacks('allow-same-origin', $out);
		contains('title="rekenhulp afvalstoffenheffing"', $out);
		contains('height="420"', $out);
		contains('srcdoc="&lt;!doctype html&gt;', $out);
		contains('Content-Security-Policy', $out);
		contains('<figcaption>rekenhulp afvalstoffenheffing</figcaption>', $out);
		lacks('<script', $out);
		$document = new DOMDocument();
		check($document->loadXML('<text>' . $out . '</text>'));
		$iframe = $document->getElementsByTagName('iframe')->item(0);
		contains("<script>uit.textContent = 'x';</script>", $iframe->getAttribute('srcdoc'));
	});

	test('level 2: interactive block without a height reports its height; with one it does not (design 10.1, rule 2)', function () {
		$auto = md("%% beschrijving: kwis %%\n```html interactief\n<p>Vraag</p>\n```\n");
		contains('data-height="auto"', $auto);
		$document = new DOMDocument();
		check($document->loadXML('<text>' . $auto . '</text>'));
		contains('hyphaHeight', $document->getElementsByTagName('iframe')->item(0)->getAttribute('srcdoc'));
		$fixed = md("%% beschrijving: kwis %%\n```html interactief {hoogte=300}\n<p>Vraag</p>\n```\n");
		lacks('data-height', $fixed);
		lacks('hyphaHeight', $fixed);
	});

	test('level 2: interactive block without description is refused (BR-07) and stays code', function () {
		same(['interactive-without-description'], mdMessages("```html interactief\n<b>x</b>\n```"));
		$out = md("```html interactief\n<script>alert(1)</script>\n```");
		lacks('<iframe', $out);
		lacks('<script', $out);
		contains('alert(1)', $out);
	});

	test('level 1: interactive block is not allowed and stays code (BR-95)', function () {
		same(['interactive-not-allowed'], mdMessages("%% beschrijving: x %%\n```html interactief\n<b>x</b>\n```", ['level' => 1]));
	});

	test('level 2: an iframe written by the author must point to the list, with a forced sandbox', function () {
		$out = md('<iframe src="https://player.vimeo.com/video/1" sandbox="allow-same-origin allow-top-navigation" srcdoc="x"></iframe>');
		contains('sandbox="allow-scripts allow-same-origin allow-popups allow-presentation"', $out);
		lacks('allow-top-navigation', $out);
		lacks('srcdoc', $out);
	});

	test('level 2: settings per role (BR-95)', function () {
		$settings = hypha_mdeditorDefaults();
		$settings['level2Off'] = ['user'];
		require_once 'system/core/database.php';
		$doc = new Xml();
		$user = $doc->createElement('user');
		$user->setAttribute('rights', 'user');
		same(1, hypha_mdeditorLevel($user, $settings));
		$user->setAttribute('rights', 'admin');
		same(2, hypha_mdeditorLevel($user, $settings));
		$settings['level2'] = false;
		same(1, hypha_mdeditorLevel($user, $settings));
	});
