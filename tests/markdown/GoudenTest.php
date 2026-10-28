<?php
	//
	// The golden dataset (design section 12.13): every item made again from its seed must give exactly the XHTML of
	// the manifest. A quick selection of 500 items by default; all 10,000 with HYPHA_GOUDEN=alle (each delivery and PHP
	// version). A changed outcome needs an explanation in the commit (design section 19): run maak.php manifest again
	// only after checking why.
	//
	require_once 'system/core/markdown.php';
	hypha_markdownLoad();
	require_once __DIR__ . '/../gouden/gouden.php';

	test('golden dataset: the XHTML of the items equals the manifest', function () {
		$all = getenv('HYPHA_GOUDEN') === 'alle';
		$fixtures = goudenFixtures();
		$markdown = goudenRenderer();
		$checked = $differ = 0;
		$first = '';
		foreach (file(__DIR__ . '/../gouden/manifest.tsv', FILE_IGNORE_NEW_LINES) as $line) {
			if ($line === '' || $line[0] === '#') continue;
			[$n, $kind, $name, $fields] = explode("\t", $line);
			if (!$all && (int)$n % 20 !== 0) continue;
			$item = goudenItem((int)$n, $fixtures);
			$got = [];
			if (str_starts_with($kind, 'md')) foreach (goudenXhtml($item, $markdown) as $field => $xhtml) $got[] = $field . '=' . hash('sha256', $xhtml);
			else $got[] = 'html=' . hash('sha256', $item['html']);
			$checked++;
			if (implode(' ', $got) !== $fields) { $differ++; $first = $first ?: "$n $kind"; }
		}
		printf("      %d items checked against the manifest\n", $checked);
		same(0, $differ, "items with other XHTML, first: $first");
	});

	test('golden dataset: the quick selection holds every construct of the editor, HedgeDoc included', function () {
		$fixtures = goudenFixtures();
		$seen = [];
		for ($n = 20; $n <= 10000; $n += 20) foreach (goudenItem($n, $fixtures)['constructs'] as $construct) $seen[$construct] = true;
		same([], array_values(array_diff(array_merge(GOUDEN_INLINE, GOUDEN_BLOCKS), array_keys($seen))), 'constructs missing from the golden dataset');
	});
