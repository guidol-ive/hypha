<?php
	//
	// The golden dataset (design section 12.13): 10,000 fictional articles and pages, each made again from its number
	// with a fixed seed, so any part of the set can be checked without the rest. Nothing is taken from a real site:
	// names, places and parties come from the lists below, like the sample article about Eemstad.
	//
	// Composition per 10 numbers: 6 Markdown articles, 1 Markdown text page (with versions and a translation), 3 old
	// HTML pages as WYMeditor makes them (two articles, one text page). Every 100th number is an edge case.
	//
	const GOUDEN_SEED = 520;
	const GOUDEN_FIRST = ['Bram', 'Sanne', 'Ahmed', 'Lotte', 'Joris', 'Fatima', 'Pieter', 'Noor', 'Daan', 'Yara', 'Ilse', 'Tim', 'Esra', 'Koen', 'Mila'];
	const GOUDEN_LAST = ['Hoekstra', 'de Vries', 'el Idrissi', 'Bakker', 'Mulder', 'Visser', 'Smit', 'Janssen', 'Dekker', 'van Dam', 'Bos', 'Kaya'];
	const GOUDEN_PLACES = ['Eemstad', 'Eemstad-Noord', 'Oudewaard', 'Lindehoeve', 'Bergeind', 'Molenkamp'];
	const GOUDEN_PARTIES = ['Open Eemstad', 'Groen Eemstad', 'Eemstad Vooruit', 'Lokaal Belang', 'De Brug'];
	const GOUDEN_TOPICS = ['het nieuwe zwembad', 'de fietsroute', 'de begroting', 'de bibliotheek', 'de woningbouw', 'het stadspark', 'de raadsvergadering', 'de wijkraad', 'het afvalbeleid', 'de jeugdzorg'];
	const GOUDEN_WORDS = ['de', 'raad', 'besloot', 'dinsdag', 'over', 'het', 'plan', 'voor', 'een', 'nieuwe', 'wijk', 'met', 'bewoners', 'die', 'al', 'jaren', 'wachten', 'op', 'duidelijkheid', 'wethouder', 'zegt', 'dat', 'kosten', 'hoger', 'uitvallen', 'dan', 'gedacht', 'oppositie', 'vraagt', 'om', 'openheid', 'stukken', 'komen', 'later', 'online', 'inspraak', 'gemeente', 'subsidie', 'college', 'motie', 'aangenomen', 'verworpen', 'onderzoek', 'gaat', 'verder', 'volgend', 'jaar'];
	const GOUDEN_LANGUAGES = ['php' => '<?php echo strtoupper("eemstad");', 'javascript' => 'const raad = 37;', 'sql' => 'SELECT naam FROM partij WHERE zetels > 2;', 'python' => 'def zetels(n): return n * 2', 'html' => '<p class="x">Eemstad</p>', 'css' => '.kader { color: #0B7285; }', 'json' => '{"partij": "Open Eemstad", "zetels": 4}', 'yaml' => 'partij: Open Eemstad', 'bash' => 'echo "$EEMSTAD"', 'xml' => '<raad zetels="37"/>'];

	//
	// Every construct of Hypha-Markdown that the editor knows, including the HedgeDoc notation (design sections 10 and
	// 10.2). goudenUse() records which ones an item holds, so GoudenTest.php can check that the set covers all of them.
	//
	const GOUDEN_INLINE = ['bold', 'italic', 'bold-italic', 'mark', 'link', 'link-title', 'page-link', 'page-link-label', 'page-link-anchor', 'math-inline', 'no-formula-dollars',
		'code-span', 'strikethrough', 'inserted', 'superscript', 'subscript', 'no-subscript-space', 'note-inline', 'autolink-bare', 'autolink-angle', 'hard-break-spaces',
		'hard-break-backslash', 'escape', 'entity', 'inline-html', 'lang-span', 'bdi', 'image-inline', 'reference-link'];
	const GOUDEN_BLOCKS = ['paragraph', 'heading-3', 'callout-quote', 'callout-info', 'figure', 'table-aligned', 'diagram', 'math-block', 'code-language', 'footnote',
		'bullet-list-nested', 'ordered-list', 'hedgedoc-warning', 'note-block', 'details', 'embed-or-removed-html', 'task-list',
		'heading-2', 'heading-4', 'setext-heading', 'thematic-break', 'blockquote', 'blockquote-nested', 'indented-code', 'tilde-fence', 'code-plain',
		'ordered-list-start', 'ordered-list-paren', 'loose-list', 'task-list-nested', 'definition-list', 'callout-tip', 'callout-note', 'callout-warning',
		'callout-important', 'callout-caution', 'callout-no-title', 'callout-long', 'hedgedoc-info', 'hedgedoc-success', 'hedgedoc-danger', 'hedgedoc-tip',
		'hedgedoc-note', 'hedgedoc-nested', 'toc', 'hedgedoc-image-size', 'image-attributes', 'image-title', 'hedgedoc-youtube', 'hedgedoc-vimeo', 'embed-service',
		'embed-peertube', 'interactive', 'interactive-height', 'line-numbers', 'line-numbers-start', 'line-numbers-continue', 'code-wrap', 'math-block-one-line',
		'footnote-named', 'html-block-rtl', 'bdo-block', 'html-comment', 'table-plain', 'table-inline'];
	const GOUDEN_EMBEDS = ['https://www.youtube.com/watch?v=abcDEF12345', 'https://youtu.be/abcDEF12345', 'https://vimeo.com/123456', 'https://www.openstreetmap.org/export/embed.html?bbox=5.1,52.0,5.2,52.1&layer=mapnik',
		'https://datawrapper.dwcdn.net/AbC12/3', 'https://public.flourish.studio/visualisation/1234567', 'https://infogram.com/eemstad-begroting-1h7z2l8',
		'https://www.google.com/maps/embed?pb=!1m18!1m12', 'https://open.spotify.com/episode/4rOoJ6Egrf8K2IrywzwOMk', 'https://soundcloud.com/eemstad/raadsvergadering',
		'https://www.mixcloud.com/eemstad/raad-live/', 'https://archive.org/details/eemstad-1975', 'https://bandcamp.com/EmbeddedPlayer/album=1234567890/size=large',
		'https://www.scribd.com/document/123456789', 'https://www.documentcloud.org/documents/2026-begroting-eemstad'];

	function goudenUse(?string $construct = null): array {
		static $used = [];
		if ($construct === null) { $all = array_keys($used); $used = []; return $all; }
		$used[$construct] = true;
		return [];
	}

	function goudenPick(array $list) { return $list[mt_rand(0, count($list) - 1)]; }
	function goudenName() { return goudenPick(GOUDEN_FIRST) . ' ' . goudenPick(GOUDEN_LAST); }

	function goudenSentence(int $min = 8, int $max = 22): string {
		$n = mt_rand($min, $max);
		$words = [];
		for ($i = 0; $i < $n; $i++) $words[] = goudenPick(GOUDEN_WORDS);
		$s = implode(' ', $words);
		if (mt_rand(0, 4) === 0) $s .= ' in ' . goudenPick(GOUDEN_PLACES);
		if (mt_rand(0, 5) === 0) $s .= ', zegt ' . goudenName();
		return ucfirst($s) . '.';
	}

	function goudenParagraph(): string {
		$sentences = [];
		for ($i = mt_rand(2, 5); $i > 0; $i--) $sentences[] = goudenSentence();
		$p = implode(' ', $sentences);
		//
		// Inline elements: bold, italic, mark, a link, a page link, a formula, a footnote reference.
		//
		$words = explode(' ', $p);
		$k = mt_rand(1, max(1, count($words) - 3));
		$w = $words[$k];
		$construct = mt_rand(0, 2) ? null : goudenPick(GOUDEN_INLINE);
		$after = '';
		switch ($construct) {
			case 'bold': $words[$k] = "**$w**"; break;
			case 'italic': $words[$k] = "*$w*"; break;
			case 'bold-italic': $words[$k] = "***$w***"; break;
			case 'mark': $words[$k] = "==$w=="; break;
			case 'link': $words[$k] = "[$w](https://www.example.org/$k)"; break;
			case 'link-title': $words[$k] = "[$w](https://www.example.org/$k \"Meer over $w\")"; break;
			case 'page-link': $words[$k] = '[[' . goudenPick(GOUDEN_TOPICS) . ']]'; break;
			case 'page-link-label': $words[$k] = '[[' . goudenPick(GOUDEN_TOPICS) . "|$w]]"; break;
			case 'page-link-anchor': $words[$k] = '[[' . goudenPick(GOUDEN_TOPICS) . '#' . goudenPick(['kosten', 'besluit', 'inspraak']) . ']]'; break;
			case 'math-inline': $words[$k] = '$x^' . $k . '$'; break;
			case 'no-formula-dollars': $words[$k] = "$w, van $" . mt_rand(1, 99) . ' tot $' . mt_rand(100, 999); break;
			case 'code-span': $words[$k] = "`$w()`"; break;
			case 'strikethrough': $words[$k] = "~~$w~~"; break;
			case 'inserted': $words[$k] = "++$w++"; break;
			case 'superscript': $words[$k] = '10^' . mt_rand(2, 9) . '^'; break;
			case 'subscript': $words[$k] = 'CO~2~'; break;
			case 'no-subscript-space': $words[$k] = "5 ~ 6 en ~niet $w~"; break;
			case 'note-inline': $words[$k] = "$w %% nog nagaan %%"; break;
			case 'autolink-bare': $words[$k] = "$w https://www.example.org/raad/$k"; break;
			case 'autolink-angle': $words[$k] = "$w <https://www.example.org/stukken/$k>"; break;
			case 'hard-break-spaces': $words[$k] = "$w  \n"; break;
			case 'hard-break-backslash': $words[$k] = "$w\\\n"; break;
			case 'escape': $words[$k] = "\\*$w\\* \\[geen link\\]"; break;
			case 'entity': $words[$k] = "$w &amp; &copy; &#8364;"; break;
			case 'inline-html': $words[$k] = "<kbd>Ctrl</kbd> <abbr title=\"Openbaar Vervoer\">ov</abbr> $w"; break;
			case 'lang-span': $words[$k] = "<span lang=\"en\">city council</span> $w"; break;
			case 'bdi': $words[$k] = "<bdi>مرحبا</bdi> $w"; break;
			case 'image-inline': $words[$k] = "$w ![pictogram](images/gouden-" . mt_rand(1, 50) . '.jpg)'; break;
			case 'reference-link': $words[$k] = "[$w][bron-$k]"; $after = "\n\n[bron-$k]: https://www.example.org/bron/$k"; break;
		}
		if ($construct) goudenUse($construct);
		return implode(' ', $words) . $after;
	}

	//
	// The blocks of an article body; $fixtures are the diagrams and formulas of tests/fixtures/tekeningen.json.
	//
	function goudenBody(array $fixtures, int $blocks, array &$renders): string {
		$out = [];
		$notes = 0;
		$numbered = false;
		for ($b = 0; $b < $blocks; $b++) {
			$r = mt_rand(0, 39);
			if ($r >= 30) {
				$out[] = goudenConstruct(goudenPick(array_slice(GOUDEN_BLOCKS, 17)), $notes, $numbered);
				continue;
			}
			goudenUse(GOUDEN_BLOCKS[$r < 12 ? 0 : ($r < 15 ? 1 : $r - 13)]);
			if ($r < 12) $out[] = goudenParagraph();
			elseif ($r < 15) $out[] = '### ' . ucfirst(goudenPick(GOUDEN_TOPICS));
			elseif ($r === 15) $out[] = "> [!quote] Citaat\n> " . goudenSentence(6, 12);
			elseif ($r === 16) $out[] = '> [!info] ' . ucfirst(goudenPick(GOUDEN_PARTIES)) . "\n> " . goudenSentence();
			elseif ($r === 17) $out[] = '![' . goudenName() . ' in ' . goudenPick(GOUDEN_PLACES) . '](images/gouden-' . mt_rand(1, 50) . '.jpg){.' . goudenPick(['breed', 'in-de-tekst', 'klein-rechts']) . "}\n*" . goudenSentence(4, 8) . ' Foto ' . goudenName() . '*';
			elseif ($r === 18) {
				$rows = ["| Partij | Zetels | Verschil |", "|:--|--:|:-:|"];
				for ($i = mt_rand(2, 5); $i > 0; $i--) $rows[] = '| ' . goudenPick(GOUDEN_PARTIES) . ' | ' . mt_rand(1, 9) . ' | ' . mt_rand(-2, 2) . ' |';
				$out[] = implode("\n", $rows);
			}
			elseif ($r === 19) {
				$d = goudenPick($fixtures['diagrams']);
				$renders['svg'][$d['sha256']] = $d['svg'];
				$out[] = '%% beschrijving: ' . goudenSentence(4, 8) . " %%\n```mermaid" . (mt_rand(0, 1) ? ' {.klein-rechts}' : '') . "\n" . $d['text'] . '```';
			}
			elseif ($r === 20) {
				$f = goudenPick($fixtures['formulas']);
				$renders['mathBlock'][$f['sha256']] = $f['block'];
				$out[] = "$$\n" . $f['tex'] . "\n$$";
			}
			elseif ($r === 21) {
				$language = goudenPick(array_keys(GOUDEN_LANGUAGES));
				$out[] = "```$language\n" . GOUDEN_LANGUAGES[$language] . "\n```";
			}
			elseif ($r === 22) { $notes++; $out[] = goudenSentence() . "[^$notes]"; }
			elseif ($r === 23) $out[] = "- " . goudenSentence(3, 8) . "\n- " . goudenSentence(3, 8) . "\n  - " . goudenSentence(3, 6);
			elseif ($r === 24) $out[] = "1. " . goudenSentence(3, 8) . "\n2. " . goudenSentence(3, 8);
			elseif ($r === 25) $out[] = ":::warning\n" . goudenSentence() . "\n:::";
			elseif ($r === 26) $out[] = '%% notitie voor de redactie: ' . goudenSentence(3, 6) . ' %%';
			elseif ($r === 27) $out[] = "<details><summary>Meer over " . goudenPick(GOUDEN_TOPICS) . "</summary>\n\n" . goudenSentence() . "\n\n</details>";
			elseif ($r === 28) $out[] = goudenPick(['https://www.youtube.com/watch?v=abcDEF12345', 'https://vimeo.com/123456', '<macro name="pagelist" tags="Raadsnieuws"/>', '<script>alert("weg")</script>', '<p onclick="weg()">Klik</p>']);
			else $out[] = "- [ ] " . goudenSentence(3, 6) . "\n- [x] " . goudenSentence(3, 6);
		}
		for ($i = 1; $i <= $notes; $i++) $out[] = "[^$i]: " . goudenSentence(4, 9) . ' (voorbeeldbron)';
		return implode("\n\n", $out) . "\n";
	}

	//
	// One block of the constructs added on 2026-10-28, so the set holds every construct of the editor.
	//
	function goudenConstruct(string $construct, int &$notes, bool &$numbered): string {
		goudenUse($construct);
		$s = fn ($min = 4, $max = 12) => goudenSentence($min, $max);
		$topic = ucfirst(goudenPick(GOUDEN_TOPICS));
		switch ($construct) {
			case 'heading-2': return "## $topic";
			case 'heading-4': return "#### $topic";
			case 'setext-heading': return "$topic\n" . goudenPick(['===', '---']);
			case 'thematic-break': return goudenPick(['---', '***', '___']);
			case 'blockquote': return '> ' . $s();
			case 'blockquote-nested': return '> ' . $s() . "\n>\n>> " . $s();
			case 'indented-code': return '    ' . goudenPick(array_values(GOUDEN_LANGUAGES));
			case 'tilde-fence': return "~~~\n" . goudenPick(array_values(GOUDEN_LANGUAGES)) . "\n~~~";
			case 'code-plain': return "```\n" . $s(3, 6) . "\n```";
			case 'ordered-list-start': $start = mt_rand(2, 9); return "$start. " . $s(3, 8) . "\n" . ($start + 1) . '. ' . $s(3, 8);
			case 'ordered-list-paren': return '1) ' . $s(3, 8) . "\n2) " . $s(3, 8);
			case 'loose-list': return '- ' . $s() . "\n\n  " . $s() . "\n\n- " . $s();
			case 'task-list-nested': return '- [ ] ' . $s(3, 6) . "\n  - [x] " . $s(3, 6);
			case 'definition-list': return "$topic\n: " . $s() . "\n: " . $s(3, 6);
			case 'callout-tip': case 'callout-note': case 'callout-warning': case 'callout-important': case 'callout-caution':
				return '> [!' . substr($construct, 8) . '] ' . $topic . "\n> " . $s();
			case 'callout-no-title': return '> [!' . goudenPick(HyphaMarkdown::CALLOUTS) . "]\n> " . $s();
			case 'callout-long': return '> [!info] ' . $topic . "\n> " . $s() . "\n>\n> - " . $s(3, 6) . "\n> - " . $s(3, 6);
			case 'hedgedoc-info': case 'hedgedoc-success': case 'hedgedoc-danger': case 'hedgedoc-tip': case 'hedgedoc-note':
				return ':::' . substr($construct, 9) . (mt_rand(0, 1) ? ' ' . $topic : '') . "\n" . $s() . "\n:::";
			case 'hedgedoc-nested': return ":::info $topic\n" . $s() . "\n\n- " . $s(3, 6) . "\n- **" . $s(2, 4) . "**\n:::";
			case 'toc': return '[TOC]';
			case 'hedgedoc-image-size':
				return '![' . goudenName() . '](images/gouden-' . mt_rand(1, 50) . '.jpg ' . goudenPick(['=200x150', '=320x', '=x240']) . ')';
			case 'image-attributes':
				return '![' . goudenName() . '](images/gouden-' . mt_rand(1, 50) . '.jpg){.' . goudenPick(['breed', 'in-de-tekst', 'klein-rechts']) . ' width=400 height=300}';
			case 'image-title': return '![' . goudenName() . '](images/gouden-' . mt_rand(1, 50) . '.jpg "' . $topic . '")';
			case 'hedgedoc-youtube': return '{%youtube abcDEF' . mt_rand(10000, 99999) . ' %}';
			case 'hedgedoc-vimeo': return '{%vimeo ' . mt_rand(100000, 999999) . ' %}';
			case 'embed-service': return goudenPick(GOUDEN_EMBEDS);
			case 'embed-peertube': return 'https://' . goudenPick(hypha_mdeditorDefaults()['peertubeHosts']) . goudenPick(['/w/', '/videos/watch/']) . 'kV3x' . mt_rand(1000, 9999);
			case 'interactive': case 'interactive-height':
				return '%% beschrijving: ' . $s(4, 8) . " %%\n```html interactief" . ($construct === 'interactive-height' ? ' {hoogte=' . mt_rand(2, 6) * 100 . '}' : '')
					. "\n<p id=\"teller\">" . mt_rand(1, 37) . " zetels</p>\n<script>document.getElementById('teller').title = 'Eemstad';</script>\n```";
			case 'line-numbers': $numbered = true; return "```javascript=\n" . GOUDEN_LANGUAGES['javascript'] . "\nconsole.log(raad);\n```";
			case 'line-numbers-start': $numbered = true; return "```python=" . mt_rand(10, 200) . "\n" . GOUDEN_LANGUAGES['python'] . "\nprint(zetels(4))\n```";
			case 'line-numbers-continue': return "```sql=+\n" . GOUDEN_LANGUAGES['sql'] . "\n```";
			case 'code-wrap': return "```json!\n" . GOUDEN_LANGUAGES['json'] . "\n```";
			case 'math-block-one-line': return '$$ E = mc^' . mt_rand(2, 3) . ' $$';
			case 'footnote-named': $label = goudenPick(['bron', 'raad', 'notulen']) . mt_rand(1, 999); return $s() . "[^$label]\n\n[^$label]: " . $s(4, 8) . ' (voorbeeldbron)';
			case 'html-block-rtl': return "<div dir=\"rtl\" lang=\"ar\">\n\nمجلس المدينة\n\n</div>";
			case 'bdo-block': return '<p><bdo dir="rtl">' . $topic . '</bdo></p>';
			case 'html-comment': return '<!-- ' . $s(3, 6) . ' -->';
			case 'table-plain': return "| Wijk | Inwoners |\n|---|---|\n| " . goudenPick(GOUDEN_PLACES) . ' | ' . mt_rand(1000, 9000) . ' |';
			case 'table-inline': return "| Partij | Noot |\n|---|---|\n| **" . goudenPick(GOUDEN_PARTIES) . '** | `a \\| b` en [[' . goudenPick(GOUDEN_TOPICS) . ']] |';
		}
		throw new LogicException("unknown construct $construct");
	}

	//
	// Item number $n (1-based): its kind and fields. Every item has its own seed, so any part can be made alone.
	//
	function goudenItem(int $n, array $fixtures): array {
		mt_srand(GOUDEN_SEED * 100000 + $n);
		goudenUse();
		$kinds = ['md-article', 'md-article', 'md-article', 'md-article', 'md-article', 'md-article', 'md-page', 'html-article', 'html-article', 'html-page'];
		$kind = $kinds[$n % 10];
		$renders = ['svg' => [], 'math' => [], 'mathBlock' => []];
		$title = ucfirst(goudenPick(GOUDEN_TOPICS)) . ' in ' . goudenPick(GOUDEN_PLACES) . ' ' . $n;
		$item = ['n' => $n, 'kind' => $kind, 'name' => sprintf('%s-%05d', str_starts_with($kind, 'md-page') || $kind === 'html-page' ? 'pagina' : 'artikel', $n), 'title' => $title,
			'author' => goudenName(), 'status' => goudenPick(['draft', 'draft', 'review', 'approved', 'published', 'published', 'published', 'retracted']), 'tags' => [goudenPick(['Politiek en bestuur', 'Raadsnieuws', 'Wonen', 'Cultuur', 'Onderwijs', 'Natuur en milieu', 'Verkeer'])], 'section' => goudenPick(hypha_mdeditorDefaults()['sections'])];
		$edge = $n % 100 === 0 ? (int)($n / 100) % 8 : -1;
		$blocks = mt_rand(6, 30);
		if ($edge === 0) $blocks = 1400;
		$item['text'] = goudenBody($fixtures, $blocks, $renders);
		$item['excerpt'] = goudenSentence(10, 30);
		$item['method'] = $item['author'] . ' schrijft voor deze verzonnen site. ' . goudenSentence(5, 10);
		$item['sources'] = "- " . goudenSentence(3, 6) . " (voorbeeldbron)\n- " . goudenSentence(3, 6) . ' (voorbeeldbron)';
		//
		// Edge cases: a very long article (about 20,000 words), empty fields, an unknown tag, Unicode and emoji, '-->'
		// in a diagram, a diagram and a formula without a drawing, broken notation.
		//
		if ($edge === 1) { $item['excerpt'] = ''; $item['method'] = ''; $item['sources'] = ''; $item['text'] = ''; }
		if ($edge === 2) $item['tags'][] = 'Bestaat niet ' . $n;
		if ($edge === 3) $item['text'] .= "\nÉén café, één naïeve coöperatie 🚲 — „aanhalingstekens” en ‘enkel’, ĳsbaan, ß, 中文.\n";
		if ($edge === 4) $item['text'] .= "\n```mermaid\nflowchart LR\n    A[Raad] -->|ja| B[Besluit]\n    B --> C[\"--> pijl in tekst\"]\n```\n";
		if ($edge === 5) $item['text'] .= "\n```mermaid\ntimeline\n    2005 zonder dubbele punt\n```\n\n\$\\frac{1}{\$ en \$\\notacommand\$\n";
		if ($edge === 6) $item['text'] .= "\n%% notitie die niet sluit\n\n> [!onzin] geen kader\n\n[[ ]] en ~~~ open fence\n";
		if ($edge === 7) $item['text'] .= "\n<svg><![CDATA[</svg><img src=x onerror=alert(1)>]]></svg>\n";
		$item['renders'] = $renders;
		if ($kind === 'md-page') $item['versions'] = [$item['text'], $item['text'] . "\n" . goudenParagraph() . "\n", goudenBody($fixtures, mt_rand(3, 8), $item['renders'])];
		if (str_starts_with($kind, 'html')) $item['html'] = goudenOldHtml();
		$item['constructs'] = goudenUse();
		return $item;
	}

	//
	// HTML as WYMeditor stores it, with its known quirks: &#13; carriage returns, empty paragraphs, <br/> rows, span
	// with style, and h2 headings.
	//
	function goudenOldHtml(): string {
		$out = [];
		for ($i = mt_rand(3, 10); $i > 0; $i--) {
			$r = mt_rand(0, 6);
			if ($r === 0) $out[] = '<h2>' . htmlspecialchars(ucfirst(goudenPick(GOUDEN_TOPICS))) . '</h2>';
			elseif ($r === 1) $out[] = '<p></p>';
			elseif ($r === 2) $out[] = '<p>' . htmlspecialchars(goudenSentence()) . '&#13;<br/><br/>' . htmlspecialchars(goudenSentence()) . '</p>';
			elseif ($r === 3) $out[] = '<ul><li>' . htmlspecialchars(goudenSentence(3, 6)) . '</li><li>' . htmlspecialchars(goudenSentence(3, 6)) . '</li></ul>';
			elseif ($r === 4) $out[] = '<p><span style="font-weight: bold;">' . htmlspecialchars(goudenSentence(3, 6)) . '</span> ' . htmlspecialchars(goudenSentence()) . '</p>';
			else $out[] = '<p>' . htmlspecialchars(goudenSentence()) . '</p>';
		}
		return implode("\n", $out);
	}

	//
	// The expected XHTML of a Markdown item: text, excerpt, bijsluiter and bronnen, as the server renders them.
	//
	function goudenXhtml(array $item, HyphaMarkdown $markdown): array {
		$out = [];
		$texts = $item['kind'] === 'md-page' ? ['text' => end($item['versions'])] : ['text' => $item['text'], 'excerpt' => $item['excerpt'], 'method' => $item['method'], 'sources' => $item['sources']];
		foreach ($texts as $field => $md) $out[$field] = $markdown->toXhtml($md, $item['renders']);
		return $out;
	}

	function goudenRenderer(): HyphaMarkdown {
		$settings = hypha_mdeditorDefaults();
		return new HyphaMarkdown(['language' => 'nl', 'level' => 2, 'frameHosts' => $settings['frameHosts'], 'peertubeHosts' => $settings['peertubeHosts'], 'scriptHosts' => $settings['scriptHosts']]);
	}

	function goudenFixtures(): array {
		return json_decode(file_get_contents(__DIR__ . '/../fixtures/tekeningen.json'), true);
	}
