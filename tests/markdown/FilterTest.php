<?php
	//
	// HyphaFilter (design section 13.5): the 25 attack vectors and allowed HTML of the experiment, the 36 diagrams
	// and the formulas drawn by Pele and Temml, and XHTML that loads in the XML store.
	//
	require_once 'system/core/markdown.php';
	hypha_markdownLoad();

	function filterForTest(): HyphaFilter {
		return new HyphaFilter(hypha_mdeditorDefaults()['frameHosts']);
	}

	foreach (require __DIR__ . '/data/vectors.php' as [$label, $input, $ok]) {
		test("filter: $label", function () use ($input, $ok) {
			$out = filterForTest()->filter($input);
			check($ok($out), 'output: ' . $out);
		});
	}

	test('filter: 36 diagrams stay whole (viewBox, element count, no script)', function () {
		$data = json_decode(file_get_contents('tests/fixtures/tekeningen.json'), true);
		same(36, count($data['diagrams']));
		$filter = filterForTest();
		$broken = [];
		foreach ($data['diagrams'] as $d) {
			$out = $filter->filter($d['svg']);
			$in = new DOMDocument();
			$in->loadXML($d['svg']);
			$after = new DOMDocument();
			$after->loadXML($out);
			$count = fn (DOMDocument $doc) => $doc->getElementsByTagName('*')->length;
			if (!str_contains($out, 'viewBox=') || $count($in) !== $count($after) || stripos($out, '<script') !== false) $broken[] = $d['key'] . ' ' . $count($in) . '/' . $count($after);
		}
		same([], $broken);
	});

	test('filter: formulas from Temml stay whole', function () {
		$data = json_decode(file_get_contents('tests/fixtures/tekeningen.json'), true);
		foreach ($data['formulas'] as $f) {
			foreach (['inline', 'block'] as $kind) {
				$out = filterForTest()->filter($f[$kind]);
				$in = new DOMDocument();
				$in->loadXML($f[$kind]);
				$after = new DOMDocument();
				check($after->loadXML($out), "XML of $kind {$f['tex']}");
				same($in->getElementsByTagName('*')->length, $after->getElementsByTagName('*')->length, "elements of $kind {$f['tex']}");
			}
		}
	});

	test('filter: output is XML that loads into the store', function () {
		$out = filterForTest()->filter('<p>a&nbsp;b<br>c</p><img src="x.jpg" alt="x"><hr><p>d &amp; e</p>');
		$document = new DOMDocument();
		check($document->loadXML('<text>' . $out . '</text>'), $out);
		contains('<br/>', $out);
	});

	test('filter: iframe without hosts (level 1) disappears', function () {
		$out = (new HyphaFilter([]))->filter('<iframe src="https://www.youtube-nocookie.com/embed/abc" title="v"></iframe><p>x</p>');
		lacks('iframe', $out);
		contains('<p>x</p>', $out);
	});

	test('filter: style in HTML is removed, in SVG kept without url()', function () {
		$out = filterForTest()->filter('<p style="color:red">x</p><svg viewBox="0 0 1 1"><rect style="fill:var(--pele-series-1,#007A8F)" width="1" height="1"/></svg>');
		contains('<p>x</p>', $out);
		contains('style="fill:var(--pele-series-1,#007A8F)"', $out);
	});

	test('filter: external link gets rel noopener nofollow, relative link not', function () {
		$out = filterForTest()->filter('<a href="https://www.example.org/">a</a><a href="nl/Raadsnieuws">b</a><a href="//evil.example/">c</a>');
		contains('<a href="https://www.example.org/" rel="noopener nofollow">a</a>', $out);
		contains('<a href="nl/Raadsnieuws">b</a>', $out);
		contains('<a href="//evil.example/" rel="noopener nofollow">c</a>', $out);
	});

	test('filter: vbscript, data and javascript with control characters are refused', function () {
		$out = filterForTest()->filter('<a href="vbscript:x">a</a><a href="java&#09;script:alert(1)">b</a><img src="data:image/svg+xml,&lt;svg onload=alert(1)&gt;">');
		lacks('vbscript', $out);
		lacks('script:', $out);
		lacks('data:', $out);
	});

	//
	// Findings of the review of 2026-10-27.
	//
	foreach (['<svg><![CDATA[</svg><img src=x onerror=alert(1)>]]></svg>', '<math><mi><![CDATA[</math><img src=x onerror=alert(1)>]]></mi></math>', '<svg><desc><![CDATA[</desc><script>alert(1)</script>]]></desc></svg>'] as $i => $payload) {
		test("filter: CDATA in svg or math stays text ($i)", function () use ($payload) {
			$out = filterForTest()->filter($payload);
			lacks('CDATA', $out);
			$html = new DOMDocument();
			$previous = libxml_use_internal_errors(true);
			$html->loadHTML('<?xml encoding="utf-8"?><body>' . $out . '</body>');
			libxml_clear_errors();
			libxml_use_internal_errors($previous);
			same(0, $html->getElementsByTagName('img')->length + $html->getElementsByTagName('script')->length, $out);
		});
	}

	test('filter: an iframe to a host of the list must have the path of its player; allow is fixed', function () {
		$out = filterForTest()->filter('<iframe src="https://www.google.com/url?q=https://evil.example/"></iframe><iframe src="https://archive.org/download/x/a.html"></iframe><iframe src="https://player.vimeo.com/video/1" allow="camera *; microphone *"></iframe>');
		lacks('evil.example', $out);
		lacks('download', $out);
		contains('allow="fullscreen; picture-in-picture"', $out);
		lacks('camera', $out);
	});

	test('filter: \\\\host link is external; image-set in svg style is refused', function () {
		$out = filterForTest()->filter('<a href="\\\\evil.example">a</a><svg><rect style="background:image-set(\'https://evil/x\' 1x)"/></svg>');
		contains('rel="noopener nofollow"', $out);
		lacks('image-set', $out);
	});
