<?php
/*
	Module: markdown

	Helpers of the Markdown editor (issue #520) that every request may need, without loading any library: the page name
	from a title, the settings of the editor, and the loader of the Markdown renderer. The renderer itself, its
	extensions and the HTML filter are in system/core/markdown/ and system/vendor/; they are loaded only when an article
	or page with a Markdown source is saved, by hypha_markdownLoad().

	See also: ai/design/concept/20261026_MARKDOWN_EDITOR.md, sections 13 and 14.
*/

	/*
		Function: hypha_markdownLoad
		Loads the PHP libraries in system/vendor/ and the Markdown renderer and filter of Hypha. Safe to call more than once.
	*/
	function hypha_markdownLoad() {
		static $loaded = false;
		if ($loaded) return;
		$root = dirname(__DIR__);
		require_once $root . '/vendor/autoload.php';
		foreach (['HyphaFilter', 'HyphaMarkdownSyntax', 'HyphaMarkdownRenderers', 'HyphaMarkdown'] as $file)
			require_once $root . '/core/markdown/' . $file . '.php';
		$loaded = true;
	}

	/*
		Function: hypha_markdownSlug
		Turns a text into lower case words joined by hyphens, without accents (design section 13.14, BR-27).
		Symbols become words first: & is 'en', % is 'procent', € is 'euro' (the Dutch words, as in the design).

		Parameters:
		$text - the title or heading
		$max - the maximum length; a longer result is cut at a word boundary

		Returns:
		The slug, possibly empty.
	*/
	function hypha_markdownSlug(string $text, int $max = 80): string {
		$s = strtr($text, ['ß' => 'ss', 'æ' => 'ae', 'Æ' => 'ae', 'ø' => 'o', 'Ø' => 'o', 'œ' => 'oe', 'Œ' => 'oe', 'ĳ' => 'ij', 'Ĳ' => 'ij', 'ł' => 'l', 'Ł' => 'l', 'đ' => 'd', 'Đ' => 'd', '€' => ' euro ', '&' => ' en ', '’' => '', "'" => '', '%' => ' procent ']);
		if (class_exists('Normalizer')) $s = preg_replace('/\p{Mn}+/u', '', Normalizer::normalize($s, Normalizer::FORM_D));
		else $s = preg_replace('/\p{Mn}+/u', '', hypha_markdownDecompose($s));
		$s = trim(preg_replace('/[^a-z0-9]+/', '-', mb_strtolower($s, 'UTF-8')), '-');
		if (strlen($s) > $max) $s = rtrim(substr($s, 0, strrpos(substr($s, 0, $max + 1), '-') ?: $max), '-');
		return $s;
	}

	/*
		Function: hypha_markdownDecompose
		Splits the accented Latin letters into a base letter and a combining mark, for PHP without the intl extension
		(the official containers have none). iconv with //TRANSLIT is not used: its result depends on the C library and
		the locale (musl gives '?' for every accented letter), and the slug must be the same everywhere, also in the
		browser, which uses String.prototype.normalize('NFD').
	*/
	function hypha_markdownDecompose(string $s): string {
		static $map = null;
		if ($map === null) {
			$map = [];
			$bases = ['A' => 'ÀÁÂÃÄÅĀĂĄǍ', 'a' => 'àáâãäåāăąǎ', 'C' => 'ÇĆĈĊČ', 'c' => 'çćĉċč', 'D' => 'Ď', 'd' => 'ď', 'E' => 'ÈÉÊËĒĔĖĘĚ', 'e' => 'èéêëēĕėęě',
				'G' => 'ĜĞĠĢ', 'g' => 'ĝğġģ', 'H' => 'Ĥ', 'h' => 'ĥ', 'I' => 'ÌÍÎÏĨĪĬĮİǏ', 'i' => 'ìíîïĩīĭįǐ', 'J' => 'Ĵ', 'j' => 'ĵ', 'K' => 'Ķ', 'k' => 'ķ',
				'L' => 'ĹĻĽ', 'l' => 'ĺļľ', 'N' => 'ÑŃŅŇ', 'n' => 'ñńņň', 'O' => 'ÒÓÔÕÖŌŎŐǑ', 'o' => 'òóôõöōŏőǒ', 'R' => 'ŔŖŘ', 'r' => 'ŕŗř',
				'S' => 'ŚŜŞŠȘ', 's' => 'śŝşšș', 'T' => 'ŢŤȚ', 't' => 'ţťț', 'U' => 'ÙÚÛÜŨŪŬŮŰŲǓ', 'u' => 'ùúûüũūŭůűųǔ', 'W' => 'Ŵ', 'w' => 'ŵ',
				'Y' => 'ÝŶŸ', 'y' => 'ýÿŷ', 'Z' => 'ŹŻŽ', 'z' => 'źżž'];
			foreach ($bases as $base => $letters) foreach (mb_str_split($letters) as $letter) $map[$letter] = $base . "\u{0301}";
		}
		return strtr($s, $map);
	}

	/*
		Function: hypha_markdownPageName
		The page name of a new article or text page, from its title (design section 13.14): the slug of the title,
		made unique within the language by adding -2, -3, ... (BR-50).

		Parameters:
		$title - the title
		$exists - callable that tells whether a page name is taken
	*/
	function hypha_markdownPageName(string $title, callable $exists): string {
		$s = hypha_markdownSlug($title);
		if ($s === '') $s = 'pagina';
		$name = $s;
		for ($n = 2; $exists($name); $n++) $name = $s . '-' . $n;
		return $name;
	}

	/*
		Function: hypha_mdeditorDefaults
		The settings of the editor when a site has not set them (design: BR-26, BR-47, BR-10, section 13.5). The sections
		and the editorial statute are the fictional examples of the prototype; every site sets its own.
	*/
	function hypha_mdeditorDefaults(): array {
		return [
			'sections' => ['Politiek en bestuur', 'Wonen en wijken', 'Verkeer en vervoer', 'Natuur en milieu', 'Onderwijs', 'Zorg en welzijn', 'Cultuur', 'Economie en werk', 'Sport', 'Geschiedenis', 'Opinie'],
			'statute' => [
				'Feiten in het artikel zijn gecontroleerd met ten minste één betrouwbare bron.',
				'Wie in het artikel wordt beschuldigd of bekritiseerd, heeft kunnen reageren.',
				'Belangen van de auteur bij het onderwerp zijn vermeld in de bijsluiter.',
				'Citaten zijn juist weergegeven en de geciteerde persoon weet dat hij wordt geciteerd.',
				'Er staan geen persoonsgegevens in die niet nodig zijn voor het verhaal.',
			],
			'frameHosts' => ['www.youtube-nocookie.com', 'player.vimeo.com', 'www.openstreetmap.org', 'datawrapper.dwcdn.net', 'flo.uri.sh', 'e.infogram.com', 'www.google.com', 'open.spotify.com', 'w.soundcloud.com', 'player-widget.mixcloud.com', 'archive.org', 'bandcamp.com', 'www.scribd.com', 'embed.documentcloud.org'],
			'peertubeHosts' => ['framatube.org', 'tube.tchncs.de'],
			'scriptHosts' => ['cdnjs.cloudflare.com', 'cdn.jsdelivr.net'],
			'level2' => true,
			'level2Off' => [],
		];
	}

	/*
		Function: hypha_mdeditorSettings
		The settings of the editor of this site: the element <mdeditor> in hypha.xml, with the defaults for what it lacks.

		<mdeditor level2="on" level2Off="user">
			<section>Politiek en bestuur</section> ...
			<statute>Feiten zijn gecontroleerd ...</statute> ...
			<frameHost>player.vimeo.com</frameHost> ...
			<scriptHost>cdn.jsdelivr.net</scriptHost> ...
		</mdeditor>
	*/
	function hypha_mdeditorSettings(): array {
		global $hyphaXml;
		$settings = hypha_mdeditorDefaults();
		$node = $hyphaXml ? $hyphaXml->findOneXPath('/hypha/mdeditor') : null;
		if (!$node) return $settings;
		foreach (['section' => 'sections', 'statute' => 'statute', 'frameHost' => 'frameHosts', 'peertubeHost' => 'peertubeHosts', 'scriptHost' => 'scriptHosts'] as $tag => $key) {
			$list = [];
			foreach ($node->findXPath($tag) as $item) if (trim($item->textContent) !== '') $list[] = trim($item->textContent);
			if ($list) $settings[$key] = $list;
		}
		if ($node->hasAttribute('level2')) $settings['level2'] = $node->getAttribute('level2') !== 'off';
		if ($node->hasAttribute('level2Off')) $settings['level2Off'] = array_values(array_filter(array_map('trim', explode(',', $node->getAttribute('level2Off')))));
		return $settings;
	}

	/*
		Function: hypha_mdeditorLevel
		The freedom level of the current user (design section 10.1, BR-95): 2 unless an administrator turned level 2 off
		for the whole site or for the role of the user ('user' or 'admin').
	*/
	function hypha_mdeditorLevel(?HyphaDomElement $user, array $settings): int {
		if (!$settings['level2']) return 1;
		$role = $user ? $user->getAttribute('rights') : '';
		return in_array($role, $settings['level2Off'], true) ? 1 : 2;
	}
