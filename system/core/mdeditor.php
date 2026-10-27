<?php
/*
	Module: mdeditor
	The Markdown editor in the page (design sections 8, 12.11 and 13.12): the editor element in the edit view of an
	article or text page, its JavaScript modules and import map, the files of system/mdeditor/ with a long cache, the
	new article that takes its page name from the title, and the preferences of the user.

	The editor itself is plain JavaScript in system/mdeditor/ (ES modules, no build step at installation); the libraries
	are bundled once on the development machine into system/mdeditor/vendor/, one file per library with the version in
	its name. WYMeditor (system/core/editor.php) is not touched.
*/

	/*
		Function: hypha_mdeditorRender
		Writes the editor into the page: a placeholder with the configuration as JSON, the save and cancel buttons, and the
		post-processing that loads the modules.

		Parameters:
		$page - the article or text page
		$config - fields, settings and state for the editor
	*/
	function hypha_mdeditorRender(HyphaDatatypePage $page, array $config) {
		global $O_O;
		$main = $page->html->getElementById('main');
		$user = $O_O->getUser();
		$config += [
			'root' => $O_O->getRequest()->getRootUrl(),
			'interfaceLanguage' => $O_O->getInterfaceLanguage(),
			'user' => ['name' => $user->getAttribute('fullname'), 'admin' => isAdmin(), 'preferences' => hypha_mdeditorPreferences($user)],
			'pages' => hypha_mdeditorPageNames($page->language),
			'texts' => hypha_mdeditorTexts(),
			'csrf' => $O_O->getOrGenerateCsrfToken(),
		];
		$wrapper = $main->createChild('div');
		$wrapper->setAttribute('id', 'mdeditor');
		$wrapper->setAttribute('class', 'mdeditor');
		$noscript = $wrapper->createChild('p');
		$noscript->setAttribute('class', 'mde-loading');
		$noscript->setText(__('mde-loading'));
		$script = $wrapper->createChild('script');
		$script->setAttribute('type', 'application/json');
		$script->setAttribute('id', 'mdeConfig');
		$script->appendText(json_encode($config, JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP));

		$commands = $page->html->getElementById('pageCommands');
		$cancel = $config['kind'] === 'article' ? __('art-cancel') : __('cancel');
		$save = $config['kind'] === 'article' ? __('art-save') : __('save');
		$commands->appendChild(makeButton($cancel, 'window.hyphaMdeditor ? hyphaMdeditor.cancel() : (window.location = ' . htmlspecialchars(json_encode($page->language . '/' . $page->pagename)) . ');', 'mdeCancel'));
		$commands->appendChild(makeButton($save, 'window.hyphaMdeditor && hyphaMdeditor.save();', 'mdeSave', 'editButton'));
		static $registered = false;
		if (!$registered) registerPostProcessingFunction('hypha_mdeditorPostProcess');
		$registered = true;
		return null;
	}

	/*
		Function: hypha_mdeditorPostProcess
		Loads the editor into the head of the page: style sheet, import map, preloaded modules, and the start module.
		The editor is not public, so it gets noindex (design section 13.15).
	*/
	function hypha_mdeditorPostProcess($html) {
		$head = $html->findOneXPath('head');
		//
		// Only once: the import map must come before the module that uses it.
		//
		if ($head->findXPath('script[@type="importmap"]')->length) return;
		$version = hypha_mdeditorVersion();
		$meta = $head->createChild('meta');
		$meta->setAttribute('name', 'robots');
		$meta->setAttribute('content', 'noindex');
		$viewport = $html->findOneXPath('head/meta[@name="viewport"]');
		if ($viewport) $viewport->setAttribute('content', 'width=device-width, initial-scale=1, viewport-fit=cover');
		$html->linkStyle('system/mdeditor/mdeditor.css?v=' . $version);
		global $hyphaUrl;
		//
		// The addresses of an import map must be absolute or start with /, ./ or ../; a bare path is refused.
		//
		$imports = [];
		foreach (hypha_mdeditorVendorFiles() as $name => $file) $imports[$name] = $hyphaUrl . 'system/mdeditor/vendor/' . $file;
		$map = $head->createChild('script');
		$map->setAttribute('type', 'importmap');
		$map->appendText(json_encode(['imports' => $imports], JSON_UNESCAPED_SLASHES));
		foreach (['codemirror', 'prosemirror', 'markdown-it'] as $name) if (isset($imports[$name])) {
			$link = $head->createChild('link');
			$link->setAttribute('rel', 'modulepreload');
			$link->setAttribute('href', $imports[$name]);
		}
		$start = $head->createChild('script');
		$start->setAttribute('type', 'module');
		$start->setAttribute('src', 'system/mdeditor/start.js?v=' . $version);
	}

	/*
		Function: hypha_mdeditorVendorFiles
		The bundled libraries in system/mdeditor/vendor/, by import name: codemirror-6.x.js is 'codemirror'.
	*/
	function hypha_mdeditorVendorFiles(): array {
		static $files = null;
		if ($files !== null) return $files;
		$files = [];
		foreach (glob(__DIR__ . '/../mdeditor/vendor/*.js') ?: [] as $path) {
			$file = basename($path);
			if (preg_match('/^(.+?)-\d+(?:\.\d+)*\.(?:min\.)?js$/', $file, $m)) $files[$m[1]] = $file;
		}
		return $files;
	}

	/*
		Function: hypha_mdeditorVersion
		A short hash of the own modules of the editor, for the ?v= in their address, so a browser keeps them a year and
		still gets a new version right away (design section 12.16, requirement 4).
	*/
	function hypha_mdeditorVersion(): string {
		static $version = null;
		if ($version !== null) return $version;
		$stamp = '';
		foreach (glob(__DIR__ . '/../mdeditor/*.{js,css}', GLOB_BRACE) ?: [] as $path) $stamp .= basename($path) . filemtime($path) . filesize($path);
		return $version = substr(hash('sha256', $stamp), 0, 10);
	}

	/*
		Function: hypha_mdeditorServe
		Serves a file of system/mdeditor/. Files with a version in their name or address are kept a year by the browser
		(Cache-Control immutable); the rest is checked again each time. Called by index.php for system/mdeditor/.

		Parameters:
		$query - the requested path, relative to the root of Hypha
	*/
	function hypha_mdeditorServe(string $query) {
		while (ob_get_level() > 0) ob_end_clean();
		$root = realpath(__DIR__ . '/../mdeditor');
		$path = realpath(__DIR__ . '/../../' . preg_replace('/[?#].*$/', '', $query));
		$types = ['js' => 'text/javascript; charset=utf-8', 'css' => 'text/css; charset=utf-8', 'json' => 'application/json', 'svg' => 'image/svg+xml', 'woff2' => 'font/woff2', 'txt' => 'text/plain; charset=utf-8'];
		$extension = $path ? strtolower(pathinfo($path, PATHINFO_EXTENSION)) : '';
		if (!$path || !$root || !str_starts_with($path, $root . DIRECTORY_SEPARATOR) || !is_file($path) || !isset($types[$extension])) {
			http_response_code(404);
			exit;
		}
		$versioned = isset($_GET['v']) || preg_match('/-\d+(\.\d+)+\.(min\.)?js$/', $path);
		header('Content-Type: ' . $types[$extension]);
		header('Content-Length: ' . filesize($path));
		header('X-Content-Type-Options: nosniff');
		header('Cache-Control: ' . ($versioned ? 'public, max-age=31536000, immutable' : 'no-cache'));
		header_remove('Pragma');
		header_remove('Expires');
		readfile($path);
		exit;
	}

	/*
		Function: hypha_mdeditorJson
		Answers a request of the editor with JSON and stops (DT-003: a command answered by AJAX echoes and exits).
	*/
	function hypha_mdeditorJson(array $data) {
		while (ob_get_level() > 0) ob_end_clean();
		header('Content-Type: application/json; charset=utf-8');
		header('Cache-Control: no-store');
		echo json_encode($data, JSON_UNESCAPED_UNICODE);
		exit;
	}

	/*
		Function: hypha_mdeditorTexts
		All texts of the editor (keys starting with mde-) in the language of the interface (I18N-001).
	*/
	function hypha_mdeditorTexts(): array {
		global $O_O;
		$texts = [];
		$dictionary = $O_O->getDictionary() ?: [];
		$fallback = Language::getDictionaryByLanguage('en') ?: [];
		foreach ($fallback + $dictionary as $key => $value) if (str_starts_with($key, 'mde-')) $texts[substr($key, 4)] = $dictionary[$key] ?? $value;
		return $texts;
	}

	/*
		Function: hypha_mdeditorPageNames
		The pages of the site in a language, for the [[ suggestions (design step 5): name and whether the page is private.
	*/
	function hypha_mdeditorPageNames(string $language): array {
		$pages = [];
		foreach (hypha_getPageList() as $page) foreach ($page->findXPath('language') as $node) {
			if ($node->getAttribute('id') !== $language) continue;
			$pages[] = [showPagename($node->getAttribute('name')), $page->getAttribute('private') === 'on'];
		}
		usort($pages, fn ($a, $b) => strnatcasecmp($a[0], $b[0]));
		return $pages;
	}

	/*
		Function: hypha_mdeditorPreferences
		The preferences of a user (decision 22): the usual way of writing (visual or markdown), whether to ask again,
		and the split of 'Naast elkaar'. Kept as JSON in the attribute mdeditor of the user in hypha.xml.
	*/
	function hypha_mdeditorPreferences(?HyphaDomElement $user): array {
		$defaults = ['mode' => 'visual', 'remember' => false, 'split' => 50];
		if (!$user) return $defaults;
		$stored = json_decode($user->getAttribute('mdeditor') ?: '{}', true);
		return array_merge($defaults, is_array($stored) ? array_intersect_key($stored, $defaults) : []);
	}

	/*
		Function: hypha_mdeditorSetPreferences
		Command mdPreferences (AJAX): stores the preferences of the logged-in user. The argument is JSON.
	*/
	registerCommandCallback('mdPreferences', 'hypha_mdeditorSetPreferences');
	function hypha_mdeditorSetPreferences($argument) {
		global $hyphaXml, $O_O;
		if (!isUser()) hypha_mdeditorJson(['ok' => false]);
		$new = json_decode((string)$argument, true);
		if (!is_array($new)) hypha_mdeditorJson(['ok' => false]);
		$hyphaXml->lockAndReload();
		$user = hypha_getUserById($O_O->getUser()->getAttribute('id'));
		$preferences = hypha_mdeditorPreferences($user);
		if (isset($new['mode']) && in_array($new['mode'], ['visual', 'markdown'], true)) $preferences['mode'] = $new['mode'];
		if (isset($new['remember'])) $preferences['remember'] = (bool)$new['remember'];
		if (isset($new['split'])) $preferences['split'] = max(20, min(80, (int)$new['split']));
		$user->setAttribute('mdeditor', json_encode($preferences));
		$hyphaXml->saveAndUnlock();
		hypha_mdeditorJson(['ok' => true, 'preferences' => $preferences]);
	}

	/*
		Function: hypha_mdeditorNewArticle
		Command mdNewArticle: a new article with review from its title (design step 1, section 13.14, BR-27, BR-28). The
		page name follows from the title and is unique within the language; the title is kept as typed. The article is
		private until it is published (BR-23). An optional .md file of the author is opened in the editor afterwards.

		Parameters:
		$title - the title of the article
	*/
	registerCommandCallback('mdNewArticle', 'hypha_mdeditorNewArticle');
	function hypha_mdeditorNewArticle($title) {
		global $O_O, $hyphaXml;
		if (!isUser()) return 'reload';
		$title = trim(preg_replace('/\s+/u', ' ', hypha_markdownClean($title)));
		$language = $O_O->getRequest()->getPostValue('newPageLanguage', $O_O->getContentLanguage());
		if ($title === '' || !in_array($language, hypha_mdeditorLanguages(), true)) {
			notify('error', __('mde-error-title'));
			return 'reload';
		}
		$hyphaXml->lockAndReload();
		$name = hypha_markdownPageName($title, fn ($n) => (bool)hypha_getPage($language, $n));
		$error = hypha_addPage('peer_reviewed_article', $language, $name, 'on');
		$page = $error ? null : hypha_getPage($language, $name);
		$hyphaXml->saveAndUnlock();
		if (!$page) {
			notify('error', $error ?: __('server-error'));
			return 'reload';
		}
		//
		// The title is stored before the first view; ensureStructure() keeps a title that is there (BR-22 changed).
		//
		$xml = new Xml('peer_reviewed_article', Xml::multiLingualOff, Xml::versionsOff);
		$xml->loadFromFile('data/pages/' . $page->getAttribute('id'));
		$xml->lockAndReload();
		$xml->documentElement->getOrCreate('article')->getOrCreate('context')->getOrCreate('title')->setText($title);
		$xml->saveAndUnlock();
		$mode = $O_O->getRequest()->getPostValue('mdMode');
		if (in_array($mode, ['visual', 'markdown'], true) && $O_O->getRequest()->getPostValue('mdRemember') !== null) {
			$hyphaXml->lockAndReload();
			$user = hypha_getUserById($O_O->getUser()->getAttribute('id'));
			$preferences = hypha_mdeditorPreferences($user);
			$preferences['mode'] = $mode;
			$preferences['remember'] = true;
			$user->setAttribute('mdeditor', json_encode($preferences));
			$hyphaXml->saveAndUnlock();
		}
		$query = in_array($mode, ['visual', 'markdown'], true) ? '?mode=' . $mode : '';
		return ['redirect', $O_O->getRequest()->getRootUrl() . $language . '/' . $name . '/edit' . $query];
	}

	/*
		Function: hypha_mdeditorNewPagePopup
		Step 1 of the design: in the existing popup 'nieuwe pagina', an article with review asks for its title instead
		of a page name, shows the address that follows from it (BR-27), and asks once how the author usually writes
		(BR-25, decision 22). The popup of pages.php is not changed: this script wraps its newPage() and changes the form
		only while the page type is peer_reviewed_article. The server makes the page name again (mdNewArticle), so
		the preview here is only a preview.
	*/
	registerPostProcessingFunction('hypha_mdeditorNewPagePopup');
	function hypha_mdeditorNewPagePopup($html) {
		global $O_O;
		if (!isUser()) return;
		$preferences = hypha_mdeditorPreferences($O_O->getUser());
		$texts = [];
		foreach (['title', 'address', 'question', 'visual', 'visual-help', 'markdown', 'markdown-help', 'remember', 'pagename'] as $key) $texts[$key] = __('mde-new-' . $key);
		ob_start();
?>
<script>
	(function () {
		var texts = <?=json_encode($texts, JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP)?>;
		var preferences = <?=json_encode($preferences)?>;
		function slug(text) {
			var words = { 'ß': 'ss', 'æ': 'ae', 'Æ': 'ae', 'ø': 'o', 'Ø': 'o', 'œ': 'oe', 'Œ': 'oe', 'ĳ': 'ij', 'Ĳ': 'ij', '€': ' euro ', '&': ' en ', '’': '', "'": '', '%': ' procent ' };
			var s = String(text).replace(/[ßæÆøØœŒĳĲ€&’'%]/g, function (c) { return words[c]; });
			s = s.normalize('NFD').replace(/[̀-ͯ]+/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
			if (s.length > 80) { var cut = s.slice(0, 81).lastIndexOf('-'); s = s.slice(0, cut > 0 ? cut : 80).replace(/-+$/, ''); }
			return s;
		}
		function setup() {
			var type = document.getElementById('newPageType'), name = document.getElementById('newPagename'), submit = document.getElementById('newPageSubmit');
			if (!type || !name || !submit || type.getAttribute('data-mde')) return;
			type.setAttribute('data-mde', '1');
			var row = name.closest('tr'), label = row.querySelector('th');
			var originalLabel = label.textContent, originalKeyup = name.getAttribute('onkeyup'), originalBlur = name.getAttribute('onblur'), originalClick = submit.getAttribute('onclick');
			var extra = document.createElement('tr');
			extra.innerHTML = '<td></td><td><p class="mde-address" aria-live="polite"></p>'
				+ (preferences.remember ? '' : '<fieldset class="mde-modes"><legend></legend><label><input type="radio" name="mdMode" value="visual" checked> <b></b> <span></span></label><br><label><input type="radio" name="mdMode" value="markdown"> <b></b> <span></span></label><br><label><input type="checkbox" name="mdRemember"> <span></span></label></fieldset>')
				+ '</td>';
			row.parentNode.insertBefore(extra, row.nextSibling);
			var address = extra.querySelector('.mde-address');
			if (!preferences.remember) {
				extra.querySelector('legend').textContent = texts.question;
				var labels = extra.querySelectorAll('label');
				labels[0].querySelector('b').textContent = texts.visual; labels[0].querySelector('span').textContent = texts['visual-help'];
				labels[1].querySelector('b').textContent = texts.markdown; labels[1].querySelector('span').textContent = texts['markdown-help'];
				labels[2].querySelector('span').textContent = texts.remember;
				if (preferences.mode === 'markdown') labels[1].querySelector('input').checked = true;
			}
			function update() {
				var article = type.value === 'peer_reviewed_article';
				extra.style.display = article ? '' : 'none';
				label.textContent = article ? texts.title : originalLabel;
				if (article) {
					name.removeAttribute('onkeyup');
					name.removeAttribute('onblur');
					var s = slug(name.value);
					address.textContent = s ? texts.address.replace('[[address]]', s) : '';
					submit.disabled = !s;
					submit.onclick = function () {
						hypha(<?=json_encode($O_O->getContentLanguage())?> + '/' + (slug(name.value) || 'nieuw'), 'mdNewArticle', name.value, $(this).closest('form'));
						return false;
					};
				}
				else {
					name.setAttribute('onkeyup', originalKeyup);
					name.setAttribute('onblur', originalBlur);
					submit.onclick = null;
					submit.setAttribute('onclick', originalClick);
				}
			}
			type.addEventListener('change', update);
			name.addEventListener('input', update);
			update();
		}
		document.addEventListener('DOMContentLoaded', function () {
			if (typeof window.newPage !== 'function') return;
			var original = window.newPage;
			window.newPage = function () { original.apply(this, arguments); setup(); };
		});
	})();
</script>
<?php
		$html->writeScript(ob_get_clean());
	}
