<?php
	//
	// HyphaMarkdown: Markdown of the profile Hypha-Markdown 1.0 to XHTML (design sections 10 and 13.4), one test per
	// extension, with a case that must work and a case that must not turn into the element.
	//
	require_once 'system/core/markdown.php';
	hypha_markdownLoad();

	function md(string $markdown, array $renders = [], array $options = []): string {
		$markdown_ = new HyphaMarkdown($options + ['frameHosts' => hypha_mdeditorDefaults()['frameHosts'], 'peertubeHosts' => ['framatube.org'], 'scriptHosts' => ['cdn.jsdelivr.net']]);
		return $markdown_->toXhtml($markdown, $renders);
	}

	function mdMessages(string $markdown, array $options = []): array {
		$markdown_ = new HyphaMarkdown($options);
		$markdown_->toXhtml($markdown);
		return array_column($markdown_->messages, 'code');
	}

	function tekeningen(): array {
		static $data = null;
		return $data ??= json_decode(file_get_contents('tests/fixtures/tekeningen.json'), true);
	}

	test('markdown: the three test texts give XHTML that loads as XML', function () {
		foreach (['start', 'kenmerken', 'plaktest'] as $name) {
			$out = md(file_get_contents("tests/markdown/data/$name.md"));
			$document = new DOMDocument();
			check($document->loadXML('<text>' . $out . '</text>'), $name);
		}
	});

	test('markdown: CommonMark basics', function () {
		$out = md("### Kop\n\n**vet** *schuin* `code` [link](https://www.example.org)\n\n- a\n- b\n\n1. een\n2. twee\n\n> citaat\n\n---");
		foreach (['<h3 id="kop-kop">Kop</h3>', '<strong>vet</strong>', '<em>schuin</em>', '<code>code</code>', '<ul>', '<ol>', '<blockquote>', '<hr/>'] as $s) contains($s, $out);
	});

	test('markdown: GFM table with alignment, strikethrough, task list, autolink', function () {
		$out = md("| a | b | c |\n|:--|:-:|--:|\n| 1 | 2 | 3 |\n\n~~weg~~ en www.example.org\n\n- [ ] open\n- [x] klaar");
		foreach (['<th align="left">a</th>', '<td align="center">2</td>', '<td align="right">3</td>', '<del>weg</del>', 'href="http://www.example.org"', 'type="checkbox"', 'checked=""'] as $s) contains($s, $out);
	});

	test('markdown: callout info with title, quote without', function () {
		$out = md("> [!info] Open Eemstad in het kort\n> Lokale partij.\n\n> [!quote] Citaat\n> Een uitspraak");
		contains('<aside class="callout info" aria-label="Open Eemstad in het kort"><p class="callout-title">Open Eemstad in het kort</p>', $out);
		contains('<p>Lokale partij.</p>', $out);
		contains('<blockquote class="callout quote">', $out);
		contains('<p>Een uitspraak</p>', $out);
		lacks('[!quote]', $out);
	});

	test('markdown: callout without title gets the type as accessible name; a plain quote stays a quote', function () {
		$out = md("> [!warning]\n> Let op.\n\n> [geen callout]\n> tekst");
		contains('<aside class="callout warning" aria-label="warning">', $out);
		contains('<blockquote>', $out);
		contains('[geen callout]', $out);
	});

	test('markdown: HedgeDoc boxes :::info and :::danger', function () {
		$out = md(":::info\nUitleg met **vet**.\n:::\n\n:::danger\nGevaar\n:::");
		contains('<aside class="callout info" aria-label="info">', $out);
		contains('<strong>vet</strong>', $out);
		contains('<aside class="callout warning"', $out);
	});

	test('markdown: page links [[Page]], [[Page|text]], [[Page#anchor]]', function () {
		$out = md('Zie [[Raadsnieuws]], [[Raadsnieuws|de reeks]] en [[Open bestuur#kop-geschiedenis]].');
		contains('<a href="nl/Raadsnieuws">Raadsnieuws</a>', $out);
		contains('<a href="nl/Raadsnieuws">de reeks</a>', $out);
		contains('<a href="nl/Open_bestuur#kop-geschiedenis">Open bestuur</a>', $out);
	});

	test('markdown: page link in code stays text; [[ ]] empty is no link', function () {
		$out = md('`[[Raadsnieuws]]` en [[ ]]');
		contains('<code>[[Raadsnieuws]]</code>', $out);
		lacks('<a ', $out);
	});

	test('markdown: page link in English article', function () {
		contains('<a href="en/City_council">City council</a>', md('[[City council]]', [], ['language' => 'en']));
	});

	test('markdown: ==mark==, ++ins++, ^sup^, ~sub~', function () {
		$out = md('==rijp== ++nieuw++ 10^3^ H~2~O');
		foreach (['<mark>rijp</mark>', '<ins>nieuw</ins>', '10<sup>3</sup>', 'H<sub>2</sub>O'] as $s) contains($s, $out);
	});

	test('markdown: a == b, ~ and ^ with spaces stay text', function () {
		$out = md('a == b, 5 ~ 6 en x ^ y en ~niet sub~');
		lacks('<mark>', $out);
		lacks('<sub>', $out);
		lacks('<sup>', $out);
	});

	test('markdown: notes %% %% are left out, inline and as a block', function () {
		$out = md("Tekst %% geheim %% verder.\n\n%% een notitie\nover twee regels %%\n\nNa.");
		lacks('geheim', $out);
		lacks('notitie', $out);
		contains('<p>Tekst  verder.</p>', $out);
		contains('<p>Na.</p>', $out);
	});

	test('markdown: figure with caption and placement, image alone without caption', function () {
		$out = md("![Bram Hoekstra](beeld/a.jpg){.klein-rechts}\n*Bijschrift met **vet**. Foto X*\n\n![Raadszaal](beeld/b.jpg)");
		contains('<figure class="klein-rechts"><img src="beeld/a.jpg" alt="Bram Hoekstra" loading="lazy"/>', $out);
		contains('<figcaption>Bijschrift met <strong>vet</strong>. Foto X</figcaption>', $out);
		contains('<figure class="breed"><img src="beeld/b.jpg" alt="Raadszaal" loading="lazy"/></figure>', $out);
	});

	test('markdown: an image within a sentence is no figure', function () {
		$out = md('Tekst ![icoon](i.png) tekst.');
		lacks('<figure', $out);
		contains('<img src="i.png" alt="icoon" loading="lazy"/>', $out);
	});

	test('markdown: HedgeDoc image size =200x150', function () {
		contains('<img src="foto.jpg" alt="x" width="200" height="150" loading="lazy"/>', md('![x](foto.jpg =200x150)'));
	});

	test('markdown: diagram with SVG from the browser, description and placement', function () {
		$d = tekeningen()['diagrams'][0];
		$source = "%% beschrijving: tijdlijn van Eemstad %%\n```mermaid {.klein-rechts}\n" . $d['text'] . "```\n";
		$out = md($source, ['svg' => [$d['sha256'] => $d['svg']]]);
		contains('<figure class="diagram klein-rechts"><svg', $out);
		contains('role="img"', $out);
		contains('aria-label="tijdlijn van Eemstad"', $out);
		contains('<figcaption>tijdlijn van Eemstad</figcaption>', $out);
		contains('<details class="diagram-source">', $out);
		lacks('beschrijving', $out);
	});

	test('markdown: diagram without SVG becomes its text, with a message; without description too', function () {
		$codes = mdMessages("```mermaid\npie title A\n  \"x\" : 1\n```");
		same(['diagram-without-description', 'diagram-without-drawing'], $codes);
		contains('<pre class="diagram-src">', md("```mermaid\npie\n```"));
	});

	test('markdown: SVG of another diagram is not used (key is the SHA-256 of the text)', function () {
		$d = tekeningen()['diagrams'][0];
		$out = md("```mermaid\ntimeline\n    2005 : iets anders\n```", ['svg' => [$d['sha256'] => $d['svg']]]);
		lacks('<svg', $out);
	});

	test('markdown: formulas inline and as a block with MathML from the browser', function () {
		$f = tekeningen()['formulas'][0];
		$out = md('Zo: $' . $f['tex'] . "$ klaar.\n\n$$\n" . $f['tex'] . "\n$$", ['math' => [$f['sha256'] => $f['inline']], 'mathBlock' => [$f['sha256'] => $f['block']]]);
		contains('<span class="math"><math', $out);
		contains('<div class="math math-block"><math', $out);
		contains('display="block"', $out);
	});

	test('markdown: amounts with $ are no formula; $ in code neither', function () {
		$codes = mdMessages('Van $10 tot $20, en `$x$` en \$y$ en $ a$.');
		same([], $codes);
	});

	test('markdown: formula without MathML stays LaTeX as code', function () {
		$out = md('$a^2$');
		contains('<span class="math"><code class="math-tex">$a^2$</code></span>', $out);
	});

	test('markdown: one-line block formula $$ x $$', function () {
		$f = tekeningen()['formulas'][6];
		contains('<div class="math math-block"><math', md('$$ ' . $f['tex'] . ' $$', ['mathBlock' => [$f['sha256'] => $f['block']]]));
	});

	test('markdown: code highlighting in the ten languages, unknown language plain', function () {
		foreach (['php' => '<?php echo 1;', 'javascript' => 'let a = 1;', 'sql' => 'SELECT 1;', 'python' => 'def a(): pass', 'html' => '<p>x</p>', 'css' => 'a { color: red; }', 'json' => '{"a": 1}', 'yaml' => 'a: 1', 'bash' => 'echo $A', 'xml' => '<a/>'] as $language => $code) {
			$out = md("```$language\n$code\n```");
			contains('<code class="hljs language-' . $language . '">', $out, $language);
			contains('<span class="hljs-', $out, $language);
		}
		$out = md("```cobol\nDISPLAY 'X'.\n```");
		contains('<code class="language-cobol">', $out);
		lacks('hljs', $out);
	});

	test('markdown: footnotes as a section with a label', function () {
		$out = md("Tekst.[^1] En meer.[^bron]\n\n[^1]: Eerste.\n[^bron]: Tweede.");
		contains('<sup class="footnote-ref"><a href="#fn-1" id="fnref-1">1</a></sup>', $out);
		contains('<sup class="footnote-ref"><a href="#fn-bron" id="fnref-bron">2</a></sup>', $out);
		contains('<section class="footnotes" aria-label="Voetnoten">', $out);
		contains('<li id="fn-bron">', $out);
		contains('class="footnote-backref"', $out);
	});

	test('markdown: heading ids are stable and unique', function () {
		$out = md("### De eerste zetels\n\n### De eerste zetels\n\n#### Café „De Zwaan”");
		contains('<h3 id="kop-de-eerste-zetels">', $out);
		contains('<h3 id="kop-de-eerste-zetels-2">', $out);
		contains('<h4 id="kop-cafe-de-zwaan">', $out);
	});

	test('markdown: [TOC] gives a table of contents of the headings', function () {
		$out = md("[TOC]\n\n### Een\n\n#### Twee");
		contains('<nav class="toc" aria-label="Inhoud"><ol><li class="toc-3"><a href="#kop-een">Een</a></li><li class="toc-4"><a href="#kop-twee">Twee</a></li></ol></nav>', $out);
	});

	test('markdown: own HTML of level 1 stays, macros and scripts go (decision 17)', function () {
		$out = md("<details><summary>Meer</summary>\n\nUitklap.\n\n</details>\n\n<kbd>⌘</kbd> <abbr title=\"Wet open overheid\">Woo</abbr>\n\n<macro name=\"pagelist\" tags=\"x\"/>\n\n<script>alert(1)</script>\n\n<p onclick=\"x()\">p</p>");
		contains('<details><summary>Meer</summary>', $out);
		contains('<kbd>⌘</kbd>', $out);
		contains('<abbr title="Wet open overheid">Woo</abbr>', $out);
		lacks('macro', $out);
		lacks('alert', $out);
		lacks('onclick', $out);
	});

	test('markdown: javascript: link of Markdown is not a link', function () {
		lacks('javascript', md('[x](javascript:alert(1)) ![y](javascript:alert(2))'));
	});

	test('markdown: definition list (HedgeDoc)', function () {
		$out = md("Woo\n: Wet open overheid");
		contains('<dl>', $out);
		contains('<dt>Woo</dt>', $out);
	});

	test('markdown: page name and slug of the design (section 13.14)', function () {
		$taken = ['raadsvergadering-van-27-oktober'];
		$exists = fn ($n) => in_array($n, $taken, true);
		$cases = [
			'Vertrekkend raadslid Bram Hoekstra: twintig jaar strijd voor open bestuur' => 'vertrekkend-raadslid-bram-hoekstra-twintig-jaar-strijd-voor-open-bestuur',
			'Café „De Zwaan” krijgt geen vergunning' => 'cafe-de-zwaan-krijgt-geen-vergunning',
			'Coöperatie en ruïne: één naïeve vraag' => 'cooperatie-en-ruine-een-naieve-vraag',
			'Raadsvergadering van 27 oktober' => 'raadsvergadering-van-27-oktober-2',
			'50% minder geld voor de Ĳsbaan & het zwembad – € 2,4 miljoen' => '50-procent-minder-geld-voor-de-ijsbaan-en-het-zwembad-euro-2-4-miljoen',
			'Wat?!' => 'wat',
			'Een heel lange titel die veel langer is dan tachtig tekens en daarom op een woordgrens wordt afgekort voor het adres' => 'een-heel-lange-titel-die-veel-langer-is-dan-tachtig-tekens-en-daarom-op-een',
			'!!!' => 'pagina',
		];
		foreach ($cases as $title => $expected) same($expected, hypha_markdownPageName($title, $exists), $title);
		//
		// The existing page name check of Hypha leaves the result unchanged (BR-37).
		//
		$validate = function ($name) { $name = preg_replace('/\s+/', ' ', $name); $name = preg_replace('/^\s|\s$|[^\s\d\w\-_]/i', '', $name); return preg_replace('/\s/', '_', $name); };
		foreach ($cases as $title => $expected) same($expected, $validate($expected));
	});

	test('markdown: slug of Vietnamese and other Latin letters, the same with and without intl (Unicode check)', function () {
		$cases = ['Ṭanṭā en Hạ Long' => 'tanta-en-ha-long', 'Nguyễn Thị Minh Khai' => 'nguyen-thi-minh-khai', 'Žižkov Ångström Øre' => 'zizkov-angstrom-ore', "Cafe\u{0301} in NFD" => 'cafe-in-nfd'];
		foreach ($cases as $title => $expected) {
			same($expected, hypha_markdownSlug($title), $title);
			//
			// The table alone, as on a server without intl (Ø is one of the letters the slug replaces before).
			//
			if (!str_contains($title, 'Ø')) same($expected, trim(preg_replace('/[^a-z0-9]+/', '-', mb_strtolower(preg_replace('/\p{Mn}+/u', '', hypha_markdownDecompose($title)))), '-'), 'table: ' . $title);
		}
	});

	test('markdown: a [[link]] with a no-break space gets the address of the preview (Unicode check)', function () {
		contains('href="nl/10_km"', md("Zie [[10\u{00A0}km]]."));
	});

	test('markdown: HedgeDoc code block with line numbers keeps its language (javascript=101)', function () {
		contains('class="hljs language-javascript"', md("```javascript=101\nvar a = 1;\n```\n"));
	});

	test('markdown: HedgeDoc line numbers: = starts at 1, =101 at 101, =+ goes on, without = none', function () {
		contains('<pre class="code numbered"><span class="line-numbers" aria-hidden="true">101' . "\n" . '102</span><code class="hljs language-javascript">', md("```javascript=101\nvar a = 1;\nvar b = 2;\n```\n"));
		$html = md("```=\neen\ntwee\n```\n\n```sh=+\ndrie\n```\n\n```text\nvier\n```\n");
		contains('aria-hidden="true">1' . "\n" . '2</span><code>een', $html);
		contains('aria-hidden="true">3</span><code class="hljs language-sh">', $html);
		contains('<pre class="code"><code class="language-text">vier', $html);
		contains('<pre class="code"><code class="hljs language-javascript"/>', md("```javascript=\n```\n"));
	});

	test('markdown: an uploaded photo gets its size and loads lazily (design 12.16)', function () {
		$dir = sys_get_temp_dir() . '/hypha-md-img-' . getmypid();
		@mkdir($dir . '/data/images', 0777, true);
		//
		// A PNG of 3 by 2 pixels, made by hand: the PHP containers have no GD.
		//
		$chunk = fn ($type, $data) => pack('N', strlen($data)) . $type . $data . pack('N', crc32($type . $data));
		$png = "\x89PNG\r\n\x1a\n" . $chunk('IHDR', pack('NNCCCCC', 3, 2, 8, 2, 0, 0, 0)) . $chunk('IDAT', gzcompress(str_repeat("\0" . str_repeat("\xff", 9), 2))) . $chunk('IEND', '');
		file_put_contents($dir . '/data/images/proef.png', $png);
		$back = getcwd();
		chdir($dir);
		try { $out = md("![Proef](images/proef.png)\n"); }
		finally { chdir($back); }
		contains('width="3" height="2" loading="lazy"', $out);
	});

	test('markdown: 18,000 words in well under a second', function () {
		$long = str_repeat(file_get_contents('tests/markdown/data/start.md') . "\n\n" . file_get_contents('tests/markdown/data/plaktest.md') . "\n\n", 35);
		$t = microtime(true);
		md($long);
		$ms = (microtime(true) - $t) * 1000;
		check($ms < 1000, "took $ms ms");
	});

	test('markdown: ::: box inside a block quote closes', function () {
		$out = md("> :::info\n> inside\n> :::\n> after");
		contains('<p>inside</p>', $out);
		check(strpos($out, 'after') > strpos($out, '</aside>'), $out);
	});

	test('markdown: an unclosed note ends at the first blank line, with a message', function () {
		$out = md("%% open note\n\n### Kop\n\nnog hier");
		contains('<h3 id="kop-kop">Kop</h3>', $out);
		contains('nog hier', $out);
		same(['note-not-closed'], mdMessages("%% open\n\nx"));
	});

	test('markdown: callout with markup in its title; unknown callout type stays a quote', function () {
		$out = md("> [!note] Titel met *nadruk*\n> body\n\n> [!onzin] x");
		contains('<aside class="callout note" aria-label="Titel met nadruk">', $out);
		contains('<blockquote>', $out);
	});

	test('markdown: an author cannot trigger an interactive block with the placeholder class', function () {
		$source = "<div class=\"hypha-interactief-0\"></div>\n\n%% beschrijving: x %%\n```html interactief\n<b>x</b>\n```\n";
		same(1, substr_count(md($source), '<iframe'));
	});
