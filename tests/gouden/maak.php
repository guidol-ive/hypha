<?php
	//
	// Makes the golden dataset (design section 12.13).
	//
	// Usage, in a PHP container from the root of the repository:
	//   php tests/gouden/maak.php manifest [count]      write tests/gouden/manifest.tsv (in git)
	//   php tests/gouden/maak.php data <folder> [count]  write a data/ folder of a site with all items, to run Hypha on
	//
	// The manifest has per item: number, kind, page name and the SHA-256 of the expected XHTML of every field. The data
	// folder is not in git (about 150 MB for 10,000 items); it is made again from the seed.
	//
	error_reporting(E_ALL);
	set_error_handler(function ($s, $m, $f, $l) { throw new ErrorException($m, 0, $s, $f, $l); });
	chdir(__DIR__ . '/../..');
	require 'system/core/markdown.php';
	hypha_markdownLoad();
	require __DIR__ . '/gouden.php';
	require __DIR__ . '/../site/maak-site.php';

	$what = $argv[1] ?? 'manifest';
	$fixtures = goudenFixtures();
	$markdown = goudenRenderer();

	if ($what === 'manifest') {
		$count = (int)($argv[2] ?? 10000);
		$lines = ["# n\tkind\tname\tfield=sha256 ..."];
		$started = microtime(true);
		for ($n = 1; $n <= $count; $n++) {
			$item = goudenItem($n, $fixtures);
			$fields = [];
			if (str_starts_with($item['kind'], 'md')) foreach (goudenXhtml($item, $markdown) as $field => $xhtml) $fields[] = $field . '=' . hash('sha256', $xhtml);
			else $fields[] = 'html=' . hash('sha256', $item['html']);
			$lines[] = "$n\t{$item['kind']}\t{$item['name']}\t" . implode(' ', $fields);
		}
		file_put_contents(__DIR__ . '/manifest.tsv', implode("\n", $lines) . "\n");
		printf("%d items in %.1f s\n", $count, microtime(true) - $started);
		exit(0);
	}

	//
	// A data folder: the test site of tests/site/maak-site.php plus every item as a page, stored the way Hypha and the
	// editor store them (format="markdown" with source and XHTML, or the old HTML).
	//
	$target = $argv[2] ?? null;
	$count = (int)($argv[3] ?? 10000);
	if (!$target) { fwrite(STDERR, "usage: php tests/gouden/maak.php data <folder> [count]\n"); exit(2); }
	$site = makeTestSite($target);
	$hypha = new DOMDocument();
	$hypha->preserveWhiteSpace = false;
	$hypha->load($target . '/hypha.xml');
	$pageList = $hypha->getElementsByTagName('pageList')->item(0);
	$time = 1793000000;
	$cdata = 'hypha_markdownSetCdata';
	$xhtml = function (DOMElement $node, string $markup) { if (trim($markup) === '') return; $f = $node->ownerDocument->createDocumentFragment(); if (!$f->appendXML($markup)) throw new RuntimeException('no XML'); $node->appendChild($f); };
	for ($n = 1; $n <= $count; $n++) {
		$item = goudenItem($n, $fixtures);
		$id = sprintf('gold%08d', $n);
		$article = !str_ends_with($item['kind'], 'page');
		//
		// Withdrawing exists only for Markdown articles; an old article with that status is published.
		//
		if ($item['kind'] === 'html-article' && $item['status'] === 'retracted') $item['status'] = 'published';
		$page = $pageList->appendChild($hypha->createElement('page'));
		$page->setAttribute('id', $id);
		$page->setAttribute('type', $article ? 'peer_reviewed_article' : 'textpage');
		$page->setAttribute('private', $article && $item['status'] !== 'published' && $item['status'] !== 'retracted' ? 'on' : 'off');
		if ($item['status'] === 'retracted' && $article) $page->setAttribute('retracted', 'on');
		$language = $page->appendChild($hypha->createElement('language'));
		$language->setAttribute('id', 'nl');
		$language->setAttribute('name', $item['name']);
		foreach ($item['tags'] as $label) if (isset($site['tags'][$label])) $page->appendChild($hypha->createElement('tag'))->setAttribute('id', $site['tags'][$label]);

		$doc = new DOMDocument('1.0', 'UTF-8');
		$root = $doc->appendChild($doc->createElement('hypha'));
		$root->setAttribute('type', $article ? 'peer_reviewed_article' : 'textpage');
		$root->setAttribute('multiLingual', $article ? 'off' : 'on');
		$root->setAttribute('versions', $article ? 'off' : 'on');
		$root->setAttribute('schemaVersion', '1');
		if ($article) {
			$a = $root->appendChild($doc->createElement('article'));
			foreach (['status' => $item['status'], 'author' => $item['author'], 'created_by' => 'u2', 'created_at' => 't' . ($time + $n), 'updated_at' => 't' . ($time + $n), 'published_at' => in_array($item['status'], ['published', 'retracted'], true) ? 't' . ($time + $n) : ''] as $k => $v) $a->setAttribute($k, $v);
			$content = $a->appendChild($doc->createElement('content'));
			$context = $a->appendChild($doc->createElement('context'));
			$text = $content->appendChild($doc->createElement('text'));
			$sources = $content->appendChild($doc->createElement('sources'));
			$context->appendChild($doc->createElement('title'))->appendChild($doc->createTextNode($item['title']));
			$excerpt = $context->appendChild($doc->createElement('excerpt'));
			$method = $context->appendChild($doc->createElement('method'));
			if ($item['kind'] === 'md-article') {
				$a->setAttribute('format', 'markdown');
				$context->appendChild($doc->createElement('section'))->appendChild($doc->createTextNode($item['section']));
				$rendered = goudenXhtml($item, $markdown);
				foreach (['text' => $text, 'sources' => $sources, 'excerpt' => $excerpt, 'method' => $method] as $field => $node) $xhtml($node, $rendered[$field]);
				$source = $a->appendChild($doc->createElement('source'));
				$source->setAttribute('format', 'markdown');
				$source->setAttribute('profile', 'hypha-1.0');
				foreach (['text', 'excerpt', 'method', 'sources'] as $field) $cdata($source->appendChild($doc->createElement($field)), $item[$field]);
				if ($item['status'] === 'retracted') $a->appendChild($doc->createElement('retraction', 'Een feit klopte niet (verzonnen).'))->setAttribute('at', 't' . ($time + $n + 50));
			}
			else {
				$xhtml($text, $item['html']);
				$xhtml($excerpt, '<p>' . htmlspecialchars($item['excerpt']) . '</p>');
				$xhtml($method, '<p>' . htmlspecialchars($item['method']) . '</p>');
			}
			$discussions = $root->appendChild($doc->createElement('discussions'));
			$review = $discussions->appendChild($doc->createElement('review'));
			$discussions->appendChild($doc->createElement('public'));
			$approves = $root->appendChild($doc->createElement('approves'));
			if (in_array($item['status'], ['review', 'approved', 'published', 'retracted'], true)) {
				$d = $review->appendChild($doc->createElement('discussion'));
				foreach (['xml:id' => 'd' . $n, 'user' => 'u3', 'blocking' => $item['status'] === 'review' ? '1' : '', 'block_resolved' => '', 'closed' => ''] as $k => $v) $d->setAttribute($k, $v);
				$c = $d->appendChild($doc->createElement('discussion_comment', 'Graag een bron bij de cijfers (verzonnen opmerking).'));
				$c->setAttribute('xml:id', 'c' . $n);
				$c->setAttribute('user', 'u3');
				$c->setAttribute('created_at', 't' . ($time + $n + 10));
			}
			if (in_array($item['status'], ['approved', 'published', 'retracted'], true)) foreach (['u3', 'u4', 'u5'] as $k => $u) { $ap = $approves->appendChild($doc->createElement('approve')); $ap->setAttribute('user', $u); $ap->setAttribute('created_at', 't' . ($time + $n + 20 + $k)); }
		}
		else {
			$lang = $root->appendChild($doc->createElement('language'));
			$lang->setAttribute('xml:id', 'nl');
			if ($item['kind'] === 'md-page') {
				$root->setAttribute('format', 'markdown');
				$source = $root->appendChild($doc->createElement('source'));
				$source->setAttribute('format', 'markdown');
				$source->setAttribute('profile', 'hypha-1.0');
				$sourceLanguage = $source->appendChild($doc->createElement('language'));
				$sourceLanguage->setAttribute('id', 'nl');
				//
				// Versions: the newest in full, the older ones as a diff to the next, with the same time stamps for source
				// and XHTML, as MarkdownPage stores them.
				//
				$versions = $item['versions'];
				$rendered = array_map(fn ($md) => $markdown->toXhtml($md, $item['renders']), $versions);
				$serialised = [];
				foreach ($rendered as $k => $markup) { $tmp = new DOMDocument(); $e = $tmp->appendChild($tmp->createElement('v')); $xhtml($e, $markup); $s = ''; foreach ($e->childNodes as $c) $s .= $tmp->saveXML($c); $serialised[$k] = $s; }
				$last = count($versions) - 1;
				foreach ($versions as $k => $md) {
					$at = 't' . ($time + $n * 10 + $k);
					$v = $lang->appendChild($doc->createElement('version'));
					$v->setAttribute('xml:id', $at);
					$v->setAttribute('author', 'sanne');
					$sv = $sourceLanguage->appendChild($doc->createElement('version'));
					$sv->setAttribute('at', $at);
					$sv->setAttribute('author', 'sanne');
					if ($k === $last) { $xhtml($v, $rendered[$k]); $cdata($sv, $md); }
					else { $v->appendChild($doc->createTextNode(diffGolden($serialised[$k + 1], $serialised[$k]))); $cdata($sv, diffGolden($versions[$k + 1], $md)); }
				}
			}
			else {
				$v = $lang->appendChild($doc->createElement('version'));
				$v->setAttribute('xml:id', 't' . ($time + $n));
				$v->setAttribute('author', '');
				$xhtml($v, $item['html']);
			}
		}
		$doc->save($target . '/pages/' . $id);
	}
	$hypha->formatOutput = true;
	$hypha->save($target . '/hypha.xml');
	echo "$count items in $target\n";

	//
	// The diff of system/core/database.php, without loading the core of Hypha.
	//
	function diffGolden($source, $target) {
		$s = explode(' ', $source);
		$t = explode(' ', $target);
		$copy = [];
		$insert = [];
		$diff = '';
		while ($t) {
			$pos = 0;
			while (isset($s[$pos])) if ($s[$pos] == $t[0]) {
				$offset = $pos;
				$length = 0;
				while (isset($t[$length]) && isset($s[$offset + $length]) && ($s[$offset + $length] == $t[$length])) $length++;
				if (!isset($copy['length']) || $length > $copy['length']) $copy = ['offset' => $offset, 'length' => $length];
				$pos += $length;
			}
			else $pos++;
			if ($copy) {
				if (strlen(implode(' ', $insert))) { $diff .= '@@+' . str_replace('@', '@@*', implode(' ', $insert)); $insert = []; }
				$diff .= '@@=' . $copy['offset'] . ',' . $copy['length'];
				for ($i = 0; $i < $copy['length']; $i++) array_shift($t);
				$copy = [];
			}
			else $insert[] = array_shift($t);
		}
		if ($insert) $diff .= '@@+' . str_replace('@', '@@*', implode(' ', $insert));
		return $diff;
	}
