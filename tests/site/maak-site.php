<?php
	//
	// Create the data/ folder of a fictional test site: a home page, five users and the tags and sections of the
	// prototype. Every name is made up (the town of Eemstad does not exist). The password of every test user is
	// HYPHA_TEST_PASSWORD below; the site only ever runs locally in a container.
	//
	// Usage: php tests/site/maak-site.php <target folder>
	//
	const HYPHA_TEST_PASSWORD = 'proef-wachtwoord-520';
	const HYPHA_TEST_USERS = [
		// username, full name, rights
		['beheer', 'Beheerder Eemstad', 'admin'],
		['sanne', 'Sanne de Vries', 'user'],
		['ahmed', 'Ahmed el Idrissi', 'user'],
		['lotte', 'Lotte Bakker', 'user'],
		['joris', 'Joris Mulder', 'user'],
	];
	const HYPHA_TEST_TAGS = ['Politiek en bestuur', 'Raadsnieuws', 'Wonen', 'Cultuur', 'Onderwijs', 'Natuur en milieu', 'Verkeer'];

	function makeTestSite(string $target, int $seed = 520): array {
		mt_srand($seed);
		foreach (['', '/pages', '/images', '/themes'] as $dir) if (!is_dir($target . $dir)) mkdir($target . $dir, 0775, true);
		if (!is_dir($target . '/themes/default')) exec('cp -R ' . escapeshellarg(__DIR__ . '/../../data/themes/default') . ' ' . escapeshellarg($target . '/themes/'));

		$time = 1793000000;
		$homeId = 'home00000001';
		$home = new DOMDocument('1.0', 'UTF-8');
		$root = $home->appendChild($home->createElement('hypha'));
		foreach (['type' => 'textpage', 'multiLingual' => 'on', 'versions' => 'on', 'schemaVersion' => '1'] as $k => $v) $root->setAttribute($k, $v);
		$language = $root->appendChild($home->createElement('language'));
		$language->setAttribute('xml:id', 'nl');
		$version = $language->appendChild($home->createElement('version'));
		$version->setAttribute('xml:id', 't' . $time);
		$version->setAttribute('author', '');
		$p = $version->appendChild($home->createElement('p'));
		$p->appendChild($home->createTextNode('Welkom op de proefsite van Eemstad.'));
		$home->save($target . '/pages/' . $homeId);

		$xml = new DOMDocument('1.0', 'UTF-8');
		$xml->formatOutput = true;
		$hypha = $xml->appendChild($xml->createElement('hypha'));
		foreach (['type' => 'project', 'defaultLanguage' => 'nl', 'defaultPage' => 'Start', 'email' => 'redactie@eemstad.example', 'digestInterval' => '21600', 'schemaVersion' => '1'] as $k => $v) $hypha->setAttribute($k, $v);
		$hypha->appendChild($xml->createElement('title', 'Proefsite Eemstad'));
		$hypha->appendChild($xml->createElement('header', 'Proefsite Eemstad'));
		$hypha->appendChild($xml->createElement('footer', 'Verzonnen proefsite.'));
		$menu = $hypha->appendChild($xml->createElement('menu'));
		$a = $menu->appendChild($xml->createElement('a'));
		$a->setAttribute('href', 'hypha:' . $homeId);
		$users = $hypha->appendChild($xml->createElement('userList'));
		$ids = [];
		foreach (HYPHA_TEST_USERS as $i => [$username, $fullname, $rights]) {
			$user = $users->appendChild($xml->createElement('user'));
			$ids[$username] = 'u' . ($i + 1);
			foreach (['id' => $ids[$username], 'username' => $username, 'password' => password_hash(HYPHA_TEST_PASSWORD, PASSWORD_DEFAULT, ['cost' => 4]), 'fullname' => $fullname, 'email' => $username . '@eemstad.example', 'rights' => $rights] as $k => $v) $user->setAttribute($k, $v);
		}
		$pages = $hypha->appendChild($xml->createElement('pageList'));
		$page = $pages->appendChild($xml->createElement('page'));
		foreach (['id' => $homeId, 'type' => 'textpage', 'private' => 'off'] as $k => $v) $page->setAttribute($k, $v);
		$lang = $page->appendChild($xml->createElement('language'));
		$lang->setAttribute('id', 'nl');
		$lang->setAttribute('name', 'Start');
		$tagList = $hypha->appendChild($xml->createElement('tagList'));
		$tagIds = [];
		foreach (HYPHA_TEST_TAGS as $i => $label) {
			$tag = $tagList->appendChild($xml->createElement('tag'));
			$tagIds[$label] = 'tag' . ($i + 1);
			$tag->setAttribute('xml:id', $tagIds[$label]);
			$l = $tag->appendChild($xml->createElement('language', 'Verzonnen tag ' . $label));
			$l->setAttribute('id', 'nl');
			$l->setAttribute('label', $label);
		}
		$hypha->appendChild($xml->createElement('digest'));
		$xml->save($target . '/hypha.xml');
		return ['users' => $ids, 'tags' => $tagIds, 'home' => $homeId];
	}

	if (PHP_SAPI === 'cli' && realpath($argv[0] ?? '') === realpath(__FILE__)) {
		if (count($argv) < 2) { fwrite(STDERR, "usage: php tests/site/maak-site.php <target folder>\n"); exit(2); }
		echo json_encode(makeTestSite($argv[1])), "\n";
	}
