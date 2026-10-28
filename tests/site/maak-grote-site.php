<?php
	/*
		Makes the fictional test site of maak-site.php as large as a real site, for load tests (#411): many users,
		text pages with versions and published articles with tags, excerpt and a featured image. All names and texts
		are made up. Run it after maak-site.php on the same folder.

		Usage: php tests/site/maak-grote-site.php <data folder> [text pages] [articles] [users]
	*/
	if (count($argv) < 2) { fwrite(STDERR, "usage: php tests/site/maak-grote-site.php <data folder> [text pages] [articles] [users]\n"); exit(2); }
	$target = rtrim($argv[1], '/');
	$textPages = (int)($argv[2] ?? 1000);
	$articles = (int)($argv[3] ?? 300);
	$userCount = (int)($argv[4] ?? 60);
	mt_srand(411);
	$time = 1793000000;
	$words = explode(' ', 'gemeente raad wethouder brug wijk school fiets parkeren woning bibliotheek markt park water dijk station bus plein haven sport cultuur subsidie begroting motie vergadering buurt bewoners ondernemers zorg jeugd verkeer natuur energie zon wind');
	$sentence = function (int $n) use ($words): string {
		$out = [];
		for ($i = 0; $i < $n; $i++) $out[] = $words[mt_rand(0, count($words) - 1)];
		return ucfirst(implode(' ', $out)) . '.';
	};

	$xml = new DOMDocument();
	$xml->preserveWhiteSpace = false;
	$xml->formatOutput = true;
	$xml->load($target . '/hypha.xml');
	$xpath = new DOMXPath($xml);
	$userList = $xpath->query('/hypha/userList')->item(0);
	$pageList = $xpath->query('/hypha/pageList')->item(0);
	$tags = [];
	foreach ($xpath->query('/hypha/tagList/tag') as $tag) $tags[] = $tag->getAttribute('xml:id');

	for ($i = 1; $i <= $userCount; $i++) {
		$user = $userList->appendChild($xml->createElement('user'));
		foreach (['id' => 'g' . $i, 'username' => 'gebruiker' . $i, 'password' => '$2y$04$abcdefghijklmnopqrstuuJ2bK5cVHiH0VqYyWkVfXq2m7v9d3E2a', 'fullname' => 'Verzonnen Gebruiker ' . $i, 'email' => 'gebruiker' . $i . '@eemstad.example', 'rights' => 'user'] as $k => $v) $user->setAttribute($k, $v);
	}

	// Text pages, each with three versions.
	for ($i = 1; $i <= $textPages; $i++) {
		$id = sprintf('tp%010d', $i);
		$name = 'Pagina_' . $i . '_' . ucfirst($words[$i % count($words)]);
		$page = new DOMDocument('1.0', 'UTF-8');
		$root = $page->appendChild($page->createElement('hypha'));
		foreach (['type' => 'textpage', 'multiLingual' => 'on', 'versions' => 'on', 'schemaVersion' => '1'] as $k => $v) $root->setAttribute($k, $v);
		$language = $root->appendChild($page->createElement('language'));
		$language->setAttribute('xml:id', 'nl');
		for ($v = 0; $v < 3; $v++) {
			$version = $language->appendChild($page->createElement('version'));
			$version->setAttribute('xml:id', 't' . ($time + $i * 10 + $v));
			$version->setAttribute('author', 'g' . (1 + $i % $userCount));
			for ($p = 0; $p < 4; $p++) $version->appendChild($page->createElement('p', $sentence(18)));
		}
		$page->save($target . '/pages/' . $id);
		$node = $pageList->appendChild($xml->createElement('page'));
		foreach (['id' => $id, 'type' => 'textpage', 'private' => $i % 10 ? 'off' : 'on'] as $k => $v) $node->setAttribute($k, $v);
		$lang = $node->appendChild($xml->createElement('language'));
		$lang->setAttribute('id', 'nl');
		$lang->setAttribute('name', $name);
	}

	// A few drawn images, shared by the articles: plain colours, no photo of a real place or person.
	$images = [];
	for ($n = 0; $n < 5; $n++) {
		$file = sprintf('beeld%02d0000000.png', $n);
		$im = imagecreatetruecolor(1600, 900);
		imagefill($im, 0, 0, imagecolorallocate($im, 40 + $n * 40, 120, 160 - $n * 20));
		for ($r = 0; $r < 40; $r++) imagefilledrectangle($im, mt_rand(0, 1500), mt_rand(0, 800), mt_rand(0, 1600), mt_rand(0, 900), imagecolorallocate($im, mt_rand(0, 255), mt_rand(0, 255), mt_rand(0, 255)));
		imagepng($im, $target . '/images/' . $file);
		$images[] = $file;
	}

	// Published articles with tags, excerpt and featured image.
	for ($i = 1; $i <= $articles; $i++) {
		$id = sprintf('ar%010d', $i);
		$title = 'Artikel ' . $i . ' over de ' . $words[$i % count($words)];
		$slug = 'artikel-' . $i . '-over-de-' . $words[$i % count($words)];
		$text = '';
		for ($p = 0; $p < 8; $p++) $text .= '<p>' . htmlspecialchars($sentence(25)) . '</p>';
		$excerpt = htmlspecialchars($sentence(20));
		$article = '<?xml version="1.0" encoding="UTF-8"?>' . "\n"
			. '<hypha type="peer_reviewed_article" multiLingual="off" versions="off" schemaVersion="1">'
			. '<article status="published" author="Verzonnen Auteur ' . $i . '" created_at="t' . ($time + $i) . '" created_by="g' . (1 + $i % $userCount) . '" updated_at="t' . ($time + $i) . '" published_at="t' . ($time + $i * 60) . '">'
			. '<content><text>' . $text . '</text><sources><p>Verzonnen bron.</p></sources></content>'
			. '<context><title>' . htmlspecialchars($title) . '</title><excerpt><p>' . $excerpt . '</p></excerpt><method><p>Verzonnen werkwijze.</p></method></context>'
			. '</article><discussions><review/><public/></discussions><approves/>'
			. '<featured_image>' . $images[$i % count($images)] . '</featured_image></hypha>';
		file_put_contents($target . '/pages/' . $id, $article);
		$node = $pageList->appendChild($xml->createElement('page'));
		foreach (['id' => $id, 'type' => 'peer_reviewed_article', 'private' => 'off'] as $k => $v) $node->setAttribute($k, $v);
		$lang = $node->appendChild($xml->createElement('language'));
		$lang->setAttribute('id', 'nl');
		$lang->setAttribute('name', $slug);
		foreach ([$tags[$i % count($tags)], $tags[($i * 3) % count($tags)]] as $tagId) {
			$t = $node->appendChild($xml->createElement('tag'));
			$t->setAttribute('id', $tagId);
		}
	}

	$xml->save($target . '/hypha.xml');
	printf("%d users, %d text pages, %d articles; hypha.xml %d KB\n", $userCount, $textPages, $articles, filesize($target . '/hypha.xml') / 1024);
