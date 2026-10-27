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
		switch (mt_rand(0, 9)) {
			case 0: $words[$k] = '**' . $words[$k] . '**'; break;
			case 1: $words[$k] = '*' . $words[$k] . '*'; break;
			case 2: $words[$k] = '==' . $words[$k] . '=='; break;
			case 3: $words[$k] = '[' . $words[$k] . '](https://www.example.org/' . $k . ')'; break;
			case 4: $words[$k] = '[[' . goudenPick(GOUDEN_TOPICS) . ']]'; break;
			case 5: $words[$k] = '$x^' . $k . '$'; break;
		}
		return implode(' ', $words);
	}

	//
	// The blocks of an article body; $fixtures are the diagrams and formulas of tests/fixtures/tekeningen.json.
	//
	function goudenBody(array $fixtures, int $blocks, array &$renders): string {
		$out = [];
		$notes = 0;
		for ($b = 0; $b < $blocks; $b++) {
			$r = mt_rand(0, 29);
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
	// Item number $n (1-based): its kind and fields. Every item has its own seed, so any part can be made alone.
	//
	function goudenItem(int $n, array $fixtures): array {
		mt_srand(GOUDEN_SEED * 100000 + $n);
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
