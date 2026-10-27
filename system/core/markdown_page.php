<?php
/*
	Trait: MarkdownPage
	The Markdown editor for a text page (textpage), next to the existing code (design sections 13.13 and 18.2, part 22;
	decision 19). A text page with format="markdown" on its root and a <source> element opens in the new editor; a new,
	still empty text page does too (BR-28). Every other text page goes to WYMeditor as before.

	A text page has versions and translations. The XHTML is stored in the existing language/version structure, so the
	version list, differences, digest and revert keep working; the Markdown source has its own versioned node per
	language, with the same time stamp as the version of the XHTML:
	(start code)
	<hypha type="textpage" multiLingual="on" versions="on" format="markdown">
		<language xml:id="nl"><version xml:id="t1793000500" author="sanne">XHTML</version><version xml:id="t1793000000">diff</version></language>
		<source format="markdown" profile="hypha-1.0">
			<language id="nl"><version at="t1793000500" author="sanne">CDATA, the newest in full</version><version at="t1793000000">CDATA, diff</version></language>
		</source>
	</hypha>
	(end)

	storeWikiContent() and writeToElement() read XHTML with the HTML parser of libxml, which lowercases viewBox and the
	other case-sensitive names of SVG; this trait reads and writes the XHTML of a Markdown page as XML instead.
*/
	trait MarkdownPage {
		const MD_CMD_SAVE = 'md_save';

		/** @var array SVG and MathML from the browser for the save in progress */
		protected array $mdRenders = [];

		/**
		 * Whether this page has a Markdown source; a page without any content yet is new and gets one (BR-28).
		 */
		public function isMarkdown(): bool {
			$root = $this->xml->documentElement;
			if ($root->getAttribute('format') === 'markdown' && $root->get('source')) return true;
			return $this->mdIsEmpty();
		}

		protected function mdIsEmpty(): bool {
			return $this->xml->documentElement->findXPath('language/version')->length === 0 && !$this->xml->documentElement->get('source');
		}

		protected function mdProcess(HyphaRequest $request) {
			if (!$this->isMarkdown()) return false;
			if ($request->getCommand() !== null && !$this->O_O->validCsrfToken()) {
				if ($request->getPostValue('ajax') === '1') hypha_mdeditorJson(['ok' => false, 'errors' => [__('csrf-error')]]);
				notify('error', __('csrf-error'));
				return ['redirect', $this->constructFullPath($this->pagename)];
			}
			switch ([$request->getView(), $request->getCommand()]) {
				case [null,                 null]:                return $this->mdDefaultView($request);
				case [null,                 self::CMD_REVERT]:    return $this->mdRevertAction($request);
				case [self::PATH_REVERT,    self::CMD_REVERT]:    return $this->mdRevertAction($request);
				case [self::PATH_EDIT,      null]:                return $this->mdEditView($request, false);
				case [self::PATH_EDIT,      self::MD_CMD_SAVE]:   return $this->mdSaveAction($request, false);
				case [self::PATH_TRANSLATE, null]:                return $this->mdEditView($request, true);
				case [self::PATH_TRANSLATE, self::MD_CMD_SAVE]:   return $this->mdSaveAction($request, true);
			}
			return false;
		}

		/**
		 * The Markdown of a language at a version (time stamp 't...'), or the newest when the version is empty.
		 */
		public function mdSource(string $language, string $version = ''): string {
			$node = $this->xml->documentElement->get('source');
			if (!$node) return '';
			$languageNode = $node->findOneXPath('language[@id=' . xpath_encode($language) . ']');
			if (!$languageNode) return '';
			$versions = [];
			foreach ($languageNode->findXPath('version') as $v) $versions[$v->getAttribute('at')] = $v->textContent;
			if (!$versions) return '';
			krsort($versions);
			$content = reset($versions);
			if ($version !== '') {
				while (key($versions) > $version && ($diff = next($versions)) !== false) $content = patch($content, $diff);
			}
			return $content;
		}

		/**
		 * The XHTML of a language at a version, as XML text.
		 */
		protected function mdContent(string $language, string $version = ''): string {
			return getWikiContent($this->xml->documentElement, $language, $version) ?? '';
		}

		/**
		 * Stores a new version of the page in a language: the XHTML in the existing version structure and the Markdown in
		 * the source, with the same time stamp. Needs the lock on the page.
		 */
		protected function mdStoreVersion(string $language, string $markdown, string $xhtml, string $author): void {
			$this->xml->requireLock();
			$root = $this->xml->documentElement;
			$root->setAttribute('format', 'markdown');
			$timestamp = hypha_markdownStoreWikiXhtml($root, $language, $xhtml, $author);
			$source = $root->getOrCreate('source');
			$source->setAttribute('format', 'markdown');
			$source->setAttribute('profile', 'hypha-1.0');
			$languageNode = $source->findOneXPath('language[@id=' . xpath_encode($language) . ']');
			if (!$languageNode) {
				$languageNode = $source->createChild('language');
				$languageNode->setAttribute('id', $language);
			}
			$current = null;
			foreach ($languageNode->findXPath('version') as $v) if (!$current || $v->getAttribute('at') > $current->getAttribute('at')) $current = $v;
			if ($current && $current->textContent === $markdown) return;
			$at = 't' . ($timestamp ?? time());
			if ($current && $current->getAttribute('at') >= $at) $at = 't' . ((int)ltrim($current->getAttribute('at'), 't') + 1);
			$new = $languageNode->createChild('version');
			$new->setAttribute('at', $at);
			$new->setAttribute('author', $author);
			hypha_markdownSetCdata($new, $markdown);
			if ($current) hypha_markdownSetCdata($current, diff($markdown, $current->textContent));
		}

		protected function mdRender(string $markdown, string $language): array {
			$settings = hypha_mdeditorSettings();
			hypha_markdownLoad();
			$renderer = new HyphaMarkdown(['language' => $language, 'level' => hypha_mdeditorLevel($this->O_O->getUser(), $settings), 'frameHosts' => $settings['frameHosts'], 'peertubeHosts' => $settings['peertubeHosts'], 'scriptHosts' => $settings['scriptHosts'], 'texts' => $this->mdHtmlTexts()]);
			return [$renderer, $renderer->toXhtml($markdown, $this->mdRenders)];
		}

		protected function mdHtmlTexts(): array {
			$texts = [];
			foreach (['footnotes', 'footnote-back', 'toc', 'diagram-source', 'diagram', 'callout-info', 'callout-tip', 'callout-warning', 'callout-note'] as $key) $texts[$key] = __('mde-html-' . $key);
			return $texts;
		}

		/**
		 * Saves a version (edit) or a new language (translate) of the page.
		 *
		 * @param array $fields text (Markdown), title (the page name as shown), private, language (translate only)
		 * @return array{errors: list<string>, messages: list<array>, pagename?: string, language?: string}
		 */
		public function mdSavePage(array $fields, array $renders, bool $translate): array {
			$fields = hypha_markdownCleanFields($fields);
			$language = $translate ? (string)($fields['language'] ?? '') : $this->language;
			$pagename = validatePagename(trim((string)($fields['title'] ?? '')));
			if ($pagename === '') return ['errors' => ['no-page-name'], 'messages' => []];
			if ($translate && (!in_array($language, hypha_mdeditorLanguages(), true) || $language === $this->language)) return ['errors' => ['mde-error-language'], 'messages' => []];
			$markdown = str_replace(["\r\n", "\r"], "\n", (string)($fields['text'] ?? ''));
			$this->mdRenders = $renders;
			[$renderer, $xhtml] = $this->mdRender($markdown, $language);
			foreach ($renderer->messages as $message) if ($message['code'] === 'interactive-without-description') return ['errors' => ['mde-error-interactive-description'], 'messages' => $renderer->messages];
			$scratch = new Xml();
			$nodes = hypha_markdownWikify($scratch, $xhtml);
			$xhtml = '';
			foreach ($nodes as $node) $xhtml .= $scratch->saveXML($node);

			$private = $translate ? $this->privateFlag : !empty($fields['private']);
			if ($pagename !== $this->pagename || $language !== $this->language || $private !== $this->privateFlag) {
				global $hyphaXml;
				$hyphaXml->lockAndReload();
				$this->replacePageListNode(hypha_getPage($this->language, $this->pagename));
				$error = hypha_setPage($this->pageListNode, $language, $pagename, $private ? 'on' : 'off');
				$hyphaXml->saveAndUnlock();
				if ($error) return ['errors' => [$error], 'messages' => $renderer->messages, 'raw' => true];
			}
			$this->xml->lockAndReload();
			$this->mdStoreVersion($language, $markdown, $xhtml, $this->O_O->getUser()->getAttribute('username'));
			$this->xml->saveAndUnlock();
			return ['errors' => [], 'messages' => $renderer->messages, 'pagename' => $pagename, 'language' => $language];
		}

		/**
		 * Reading view: the XHTML read as XML, so diagrams keep their case-sensitive names; older versions for members.
		 */
		protected function mdDefaultView(HyphaRequest $request) {
			if ($this->mdIsEmpty() && isUser()) return ['redirect', $this->constructFullPath($this->pagename . '/' . self::PATH_EDIT)];
			$this->html->writeToElement('langList', hypha_indexLanguages($this->pageListNode, $this->language));
			$version = isUser() ? $this->mdVersion($request) : '';
			$main = $this->html->getElementById('main');
			$scratch = new Xml();
			foreach (hypha_markdownWikify($scratch, $this->mdContent($this->language, $version), false) as $node) $main->appendChild($this->html->importNode($node, true));
			if (isUser()) {
				$this->html->writeToElement('versionList', versionSelector($this, $this->xml));
				$commands = $this->html->getElementById('pageCommands');
				if ($version) $commands->appendChild($this->makeActionButton(__('revert'), self::PATH_REVERT, self::CMD_REVERT));
				else {
					$commands->appendChild($this->makeActionButton(__('edit'), self::PATH_EDIT));
					$commands->appendChild($this->makeActionButton(__('translate'), self::PATH_TRANSLATE));
					if (isAdmin()) {
						$path = $this->language . '/' . $this->pagename;
						$commands->appendChild(makeButton(__('delete'), 'if(confirm(' . htmlspecialchars(json_encode(__('sure-to-delete'))) . '))' . makeAction($path, self::CMD_DELETE, '')));
					}
				}
			}
			return null;
		}

		/**
		 * Revert: the XHTML and the Markdown of the chosen version become a new version, together.
		 */
		protected function mdRevertAction(HyphaRequest $request) {
			if (!isUser()) {
				notify('error', __('login-to-perform-action'));
				return ['redirect', $this->constructFullPath($this->pagename)];
			}
			$version = $this->mdVersion($request);
			if ($version !== '') $this->mdRevert($version);
			notify('success', ucfirst(__('page-successfully-updated')));
			return ['redirect', $this->constructFullPath($this->pagename)];
		}

		/**
		 * The posted version, only if it is one of the versions of this language; otherwise '' (the newest).
		 */
		protected function mdVersion(HyphaRequest $request): string {
			$version = hypha_markdownClean($request->getPostValue(self::FIELD_NAME_VERSION));
			if ($version === '') return '';
			$language = getLangNode($this->xml->documentElement, $this->language);
			foreach ($language->findXPath('version') as $node) if ($node->getAttribute('xml:id') === $version) return $version;
			return '';
		}

		public function mdRevert(string $version): void {
			$user = $this->O_O->getUser();
			$markdown = $this->mdSource($this->language, $version);
			$xhtml = $this->mdContent($this->language, $version);
			$this->xml->lockAndReload();
			$this->mdStoreVersion($this->language, $markdown, $xhtml, $user->getAttribute('username'));
			$this->xml->saveAndUnlock();
			writeToDigest($user->getAttribute('fullname') . __('reverted-page') . '<a href="' . $this->language . '/' . $this->pagename . '">' . $this->language . '/' . $this->pagename . '</a>', 'page update', $this->pageListNode->getAttribute('id'));
		}

		protected function mdEditView(HyphaRequest $request, bool $translate) {
			if (!isUser()) {
				notify('error', __('login-to-perform-action'));
				return ['redirect', $this->constructFullPath($this->pagename)];
			}
			$config = [
				'kind' => 'page',
				'translate' => $translate,
				'fields' => ['title' => showPagename($this->pagename), 'text' => $this->mdSource($this->language), 'private' => $this->privateFlag, 'language' => $translate ? '' : $this->language],
				'page' => ['language' => $this->language, 'name' => $this->pagename, 'private' => $this->privateFlag, 'role' => isAdmin() ? 'admin' : 'author'],
				'settings' => ['level' => hypha_mdeditorLevel($this->O_O->getUser(), hypha_mdeditorSettings())],
				'languages' => array_values(array_diff(hypha_mdeditorLanguages(), $translate ? [$this->language] : [])),
				'commands' => ['save' => self::MD_CMD_SAVE, 'view' => $translate ? self::PATH_TRANSLATE : self::PATH_EDIT],
			];
			return hypha_mdeditorRender($this, $config);
		}

		protected function mdSaveAction(HyphaRequest $request, bool $translate) {
			if (!isUser()) {
				notify('error', __('login-to-perform-action'));
				return ['redirect', $this->constructFullPath($this->pagename)];
			}
			$post = $request->getPostData();
			$fields = json_decode((string)($post['md_fields'] ?? ''), true);
			$renders = json_decode((string)($post['md_renders'] ?? ''), true);
			$result = $this->mdSavePage(is_array($fields) ? $fields : [], is_array($renders) ? $renders : [], $translate);
			$errors = array_map(fn ($e) => empty($result['raw']) ? __($e) : $e, $result['errors']);
			$url = $result['errors'] ? null : $this->constructFullPath($result['pagename'], $result['language']);
			if (($post['ajax'] ?? '') === '1') hypha_mdeditorJson(['ok' => !$errors, 'errors' => $errors, 'messages' => $result['messages'], 'url' => $url]);
			foreach ($errors as $error) notify('error', $error);
			if ($errors) return ['redirect', $this->constructFullPath($this->pagename)];
			notify('success', ucfirst(__('page-successfully-updated')));
			return ['redirect', $url];
		}
	}
