<?php
/*
	Trait: MarkdownArticle
	The Markdown editor for an article with review (peer_reviewed_article), next to the existing code (design sections
	12.11, 13.13 and 14, decision T10). The class keeps its page type; an article with <article format="markdown"> and a
	<source> element opens in the new editor, every other article goes to WYMeditor as before.

	The trait is in system/core/, because index.php loads that folder before the datatypes; a trait in
	system/datatypes/ would be loaded after the class that uses it (hypha_getDataTypes() goes alphabetically).

	Storage (design section 14):
	(start code)
	<article format="markdown" status="draft" author="..." ...>
		<content><text>XHTML</text><sources>XHTML</sources></content>
		<context><title/><section/><excerpt>XHTML</excerpt><method>XHTML</method></context>
		<source format="markdown" profile="hypha-1.0" unknownTags="..."><text>CDATA</text><excerpt/><method/><sources/><frontmatter/></source>
		<retraction at="t..." by="u...">reason</retraction>
	</article>
	<featured_image alt="" caption="" credit="">file</featured_image>
	(end)
*/
	trait MarkdownArticle {
		//
		// Commands of the new editor and of the review flow of Markdown articles (constants in a trait need PHP 8.2).
		//
		const MD_CMD_SAVE = 'md_save';
		const MD_CMD_RETRACT = 'md_retract';
		const MD_CMD_WITHDRAW = 'md_withdraw';
		const MD_CMD_REEDIT = 'md_reedit';
		const MD_CMD_LANGUAGE = 'md_language';
		const MD_CMD_RENAME = 'md_rename';
		const MD_FIELDS = ['text', 'excerpt', 'method', 'sources'];
		const MD_STATUS_RETRACTED = 'retracted';

		/**
		 * Whether this article has a Markdown source (design section 14.4): the attribute format="markdown" and a source
		 * element. With the attribute but without the element, Hypha falls back to the HTML and WYMeditor.
		 */
		public function isMarkdown(): bool {
			$article = $this->xml->findOneXPath('article');
			return $article && $article->getAttribute('format') === 'markdown' && $this->xml->findOneXPath('article/source') !== null;
		}

		/**
		 * Called from ensureStructure() for a new article (BR-28, decision 18): every new article has a Markdown source.
		 */
		protected function mdInitialise(): void {
			$this->xml->requireLock();
			$article = $this->xml->findOneXPath('article');
			$article->setAttribute('format', 'markdown');
			$source = $article->getOrCreate('source');
			$source->setAttribute('format', 'markdown');
			$source->setAttribute('profile', 'hypha-1.0');
			foreach (self::MD_FIELDS as $field) $source->getOrCreate($field);
			$article->findOneXPath('context')->getOrCreate('section');
		}

		/**
		 * The routes of a Markdown article. Returns false when the request is not one of them, so process() goes on.
		 */
		protected function mdProcess(HyphaRequest $request) {
			if (!$this->isMarkdown()) return false;
			//
			// A posted command needs a valid CSRF token (SEC-002); executePostedCommand() only marks a bad one as handled.
			//
			if ($request->getCommand() !== null && !$this->O_O->validCsrfToken()) {
				if ($request->getPostValue('ajax') === '1') hypha_mdeditorJson(['ok' => false, 'errors' => [__('csrf-error')]]);
				notify('error', __('csrf-error'));
				return $this->mdRedirect();
			}
			//
			// Only the author or an administrator publishes (BR-72, BR-92); the existing action only hides the button.
			//
			if ($request->getCommand() === self::CMD_STATUS_CHANGE_PUBLISHED && !in_array($this->mdRole(), ['author', 'admin'], true)) {
				notify('error', __('mde-error-only-author-or-admin'));
				return $this->mdRedirect();
			}
			//
			// A withdrawn article takes no new discussions or reactions (BR-86): it has left the site.
			//
			if ($this->getStatus() === self::MD_STATUS_RETRACTED && in_array($request->getView(), [self::PATH_DISCUSSIONS, self::PATH_COMMENT], true)) {
				notify('error', __('mde-retracted-closed'));
				return $this->mdRedirect();
			}
			switch ([$request->getView(), $request->getCommand()]) {
				case [null,            null]:                  return $this->mdDefaultView($request);
				case [self::PATH_EDIT, null]:                  return $this->mdEditView($request);
				case [self::PATH_EDIT, self::CMD_SAVE]:        return $this->mdSaveAction($request);
				case [self::PATH_EDIT, self::MD_CMD_SAVE]:     return $this->mdSaveAction($request);
				case [null,            self::CMD_APPROVE]:     return $this->mdApproveAction($request);
				case [null,            self::MD_CMD_RETRACT]:  return $this->mdRetractAction($request);
				case [null,            self::MD_CMD_WITHDRAW]: return $this->mdWithdrawAction($request);
				case [null,            self::MD_CMD_REEDIT]:   return $this->mdReeditAction($request);
				case [null,            self::MD_CMD_LANGUAGE]: return $this->mdLanguageAction($request);
				case [null,            self::MD_CMD_RENAME]:   return $this->mdRenameAction($request);
			}
			return false;
		}

		/**
		 * The fields of the article as the editor needs them: Markdown sources and plain values.
		 */
		public function mdFields(): array {
			$article = $this->xml->findOneXPath('article');
			$image = $this->xml->documentElement->get(self::FIELD_NAME_FEATURED_IMAGE);
			$section = $this->xml->findOneXPath('article/context/section');
			$fields = [
				'title' => $this->getTitle(),
				'author' => $article->getAttribute(self::FIELD_NAME_AUTHOR),
				'section' => $section ? trim($section->textContent) : '',
				'tags' => [],
				'image' => $image && trim($image->textContent) !== '' ? HyphaImage::ROOT_URL . trim($image->textContent) : '',
				'imageAlt' => $image ? $image->getAttribute('alt') : '',
				'imageCaption' => $image ? $image->getAttribute('caption') : '',
				'imageCredit' => $image ? $image->getAttribute('credit') : '',
				'frontmatter' => $this->mdSourceText('frontmatter'),
			];
			foreach (self::MD_FIELDS as $field) $fields[$field] = $this->mdSourceText($field);
			foreach (HyphaTags::tagsForPageListNode($this->pageListNode) as $tag) {
				$language = $tag->getLanguageNode($this->language);
				if ($language) $fields['tags'][] = $language->getAttribute('label');
			}
			$unknown = $this->xml->findOneXPath('article/source')->getAttribute('unknownTags');
			if ($unknown !== '') $fields['tags'] = array_merge($fields['tags'], json_decode($unknown, true) ?: []);
			return $fields;
		}

		protected function mdSourceText(string $field): string {
			$node = $this->xml->findOneXPath('article/source/' . $field);
			return $node ? $node->textContent : '';
		}

		/**
		 * Saves the article from the fields of the editor, in one locked write (design section 14.3, BR-66, BR-84).
		 * The XHTML is always rendered again from the Markdown.
		 *
		 * @param array $fields text, excerpt, method, sources (Markdown); title, author, section, tags (list of labels),
		 *        image, imageAlt, imageCaption, imageCredit, frontmatter (unknown properties, kept as they are)
		 * @param array $renders SVG and MathML from the browser (see HyphaMarkdown::toXhtml())
		 * @return array{errors: list<string>, messages: list<array>} errors stop the save; messages are for the checklist
		 */
		public function mdSave(array $fields, array $renders, ?string $base = null, bool $force = false): array {
			$fields = hypha_markdownCleanFields($fields);
			$settings = hypha_mdeditorSettings();
			$user = $this->O_O->getUser();
			$errors = [];
			$title = trim((string)($fields['title'] ?? ''));
			$section = trim((string)($fields['section'] ?? ''));
			if ($title === '') $errors[] = 'mde-error-title';
			$source = $this->xml->findOneXPath('article/source');
			$old = implode("\n", array_map(fn ($f) => $this->mdSourceText($f), self::MD_FIELDS));
			$new = implode("\n", array_map(fn ($f) => (string)($fields[$f] ?? ''), self::MD_FIELDS));
			$level = hypha_markdownSaveLevel(hypha_mdeditorLevel($user, $settings), $source ? $source->getAttribute('level') : '', $old, $new);
			if ($level === null) $errors[] = 'mde-error-level2';
			if ($section !== '' && !in_array($section, $settings['sections'], true)) $errors[] = 'mde-error-section';

			//
			// Render outside the lock: wikify may create pages for links to pages that do not exist yet (BR-63).
			//
			hypha_markdownLoad();
			$markdown = new HyphaMarkdown([
				'language' => $this->language,
				'level' => $level ?? 1,
				'frameHosts' => $settings['frameHosts'],
				'peertubeHosts' => $settings['peertubeHosts'],
				'scriptHosts' => $settings['scriptHosts'],
				'texts' => $this->mdHtmlTexts(),
			]);
			$xhtml = [];
			$messages = [];
			foreach (self::MD_FIELDS as $field) {
				$xhtml[$field] = $markdown->toXhtml((string)($fields[$field] ?? ''), $renders);
				foreach ($markdown->messages as $message) $messages[] = $message + ['field' => $field];
			}
			foreach ($messages as $message) if ($message['code'] === 'interactive-without-description') $errors[] = 'mde-error-interactive-description';
			if ($errors) return ['errors' => array_values(array_unique($errors)), 'messages' => $messages];
			$scratch = new Xml();
			$nodes = [];
			foreach ($xhtml as $field => $html) $nodes[$field] = hypha_markdownWikify($scratch, $html);

			$labels = array_values(array_filter(array_map('trim', (array)($fields['tags'] ?? []))));
			$unknown = $this->mdUnknownTags($labels);

			$image = trim((string)($fields['image'] ?? ''));
			if (str_starts_with($image, HyphaImage::ROOT_URL)) $image = substr($image, strlen(HyphaImage::ROOT_URL));
			if ($image !== '' && !preg_match('/^[\w.-]+$/', $image)) $image = '';

			$this->xml->lockAndReload();
			$article = $this->xml->findOneXPath('article');
			//
			// Someone else saved since the editor loaded this article: no silent overwrite, unless the author chooses it.
			//
			$revision = (int)$article->getAttribute('md_revision');
			if (!$force && $base !== null && $base !== '' && (int)$base !== $revision) {
				$this->xml->unlock();
				return ['errors' => [], 'messages' => $messages, 'conflict' => $this->mdSavedBy($article), 'revision' => $revision];
			}
			$revision++;
			$article->setAttribute('md_revision', (string)$revision);
			$article->setAttribute('md_saved_by', $user ? $user->getAttribute('id') : '');
			$article->setAttribute(self::FIELD_NAME_AUTHOR, trim((string)($fields['author'] ?? '')));
			$article->setAttribute(self::FIELD_NAME_UPDATED_AT, 't' . time());
			$this->xml->findOneXPath('article/context/title')->setText($title);
			$article->findOneXPath('context')->getOrCreate('section')->setText($section);
			$targets = ['text' => 'article/content/text', 'sources' => 'article/content/sources', 'excerpt' => 'article/context/excerpt', 'method' => 'article/context/method'];
			foreach ($targets as $field => $path) hypha_markdownReplaceChildren($this->xml->findOneXPath($path), $nodes[$field]);
			//
			// Where the existing code reads it (renderExcerptBody): a child of the root, not article/context.
			//
			$featured = $this->xml->documentElement->getOrCreate(self::FIELD_NAME_FEATURED_IMAGE);
			$featured->setText($image);
			foreach (['alt' => 'imageAlt', 'caption' => 'imageCaption', 'credit' => 'imageCredit'] as $attribute => $key) {
				$value = trim((string)($fields[$key] ?? ''));
				if ($value === '') $featured->removeAttribute($attribute);
				else $featured->setAttribute($attribute, $value);
			}
			$source = $this->xml->findOneXPath('article/source');
			foreach (self::MD_FIELDS as $field) hypha_markdownSetCdata($source->getOrCreate($field), str_replace(["\r\n", "\r"], "\n", (string)($fields[$field] ?? '')));
			$frontmatter = trim(str_replace(["\r\n", "\r"], "\n", (string)($fields['frontmatter'] ?? '')));
			if ($frontmatter !== '') hypha_markdownSetCdata($source->getOrCreate('frontmatter'), $frontmatter);
			elseif ($node = $source->findOneXPath('frontmatter')) $source->removeChild($node);
			$source->setAttribute('level', (string)$level);
			if ($unknown) $source->setAttribute('unknownTags', json_encode($unknown, JSON_UNESCAPED_UNICODE));
			else $source->removeAttribute('unknownTags');
			$this->xml->saveAndUnlock();
			//
			// The tags after the text, and only by the save whose text is stored: with two saves at once the tags and the
			// text come from the same person (two files cannot be written in one step, see DATA_MODEL.md, ACID).
			//
			$this->mdSaveTags($labels, $revision);
			return ['errors' => [], 'messages' => $messages, 'revision' => $revision];
		}

		/**
		 * Structured data of a published article for search engines (design section 12.10, point 2): schema.org
		 * NewsArticle as JSON-LD in the head, with title, description, author, dates, section, tags, language, image
		 * and address. Data only, not in an editor field, so BR-33 (no script in content) stays true.
		 */
		protected function mdStructuredData(): void {
			global $hyphaUrl;
			$fields = $this->mdFields();
			$article = $this->xml->findOneXPath('article');
			$time = fn ($attribute) => ($t = (int)ltrim($article->getAttribute($attribute), 't')) ? date('c', $t) : null;
			$plain = fn ($markdown) => trim(preg_replace('/\s+/u', ' ', strip_tags($this->getExcerpt() ? $this->getExcerpt()->textContent : $markdown)));
			$data = array_filter([
				'@context' => 'https://schema.org',
				'@type' => 'NewsArticle',
				'headline' => $fields['title'],
				'description' => mb_substr($plain($fields['excerpt']), 0, 300),
				'author' => $fields['author'] !== '' ? ['@type' => 'Person', 'name' => $fields['author']] : null,
				'datePublished' => $time(self::FIELD_NAME_PUBLISHED_AT),
				'dateModified' => $time(self::FIELD_NAME_UPDATED_AT),
				'articleSection' => $fields['section'] ?: null,
				'keywords' => $fields['tags'] ? implode(', ', $fields['tags']) : null,
				'inLanguage' => $this->language,
				'image' => $fields['image'] !== '' ? $hyphaUrl . $fields['image'] : null,
				'mainEntityOfPage' => $hyphaUrl . $this->language . '/' . $this->pagename,
			], fn ($v) => $v !== null && $v !== '');
			$head = $this->html->findOneXPath('head');
			if (!$head || $head->findXPath('script[@type="application/ld+json"]')->length) return;
			$script = $head->createChild('script');
			$script->setAttribute('type', 'application/ld+json');
			$script->appendChild($this->html->createTextNode(json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG)));
		}

		/**
		 * Who saved the article last and when, for the message about a conflict.
		 */
		protected function mdSavedBy(DOMElement $article): array {
			$user = hypha_getUserById($article->getAttribute('md_saved_by'));
			return ['name' => $user ? $user->getAttribute('fullname') : '', 'at' => hypha_markdownDate((int)ltrim($article->getAttribute(self::FIELD_NAME_UPDATED_AT), 't'), $this->language, true)];
		}

		/**
		 * The labels that are not a tag of the site; for an administrator none, because saving makes them (BR-98).
		 */
		protected function mdUnknownTags(array $labels): array {
			global $hyphaXml;
			if (isAdmin()) return [];
			$nfc = fn (string $s) => class_exists('Normalizer') ? (Normalizer::normalize($s, Normalizer::FORM_C) ?: $s) : $s;
			$known = [];
			foreach ($hyphaXml->findXPath('tagList/tag/language[@id=' . xpath_encode($this->language) . ']') as $node) $known[$nfc($node->getAttribute('label'))] = true;
			return array_values(array_filter(array_unique(array_map($nfc, $labels)), fn ($label) => !isset($known[$label])));
		}

		/**
		 * Looks the page up again in hypha.xml after lockAndReload(), by its id: another request may have renamed it or
		 * changed its language meanwhile. Unlocks hypha.xml and returns false when the page is gone.
		 */
		protected function mdLockPageList(): bool {
			global $hyphaXml;
			$hyphaXml->lockAndReload();
			$node = hypha_getPageById($this->pageListNode->getAttribute('id'));
			if (!$node) {
				$hyphaXml->unlock();
				return false;
			}
			$this->replacePageListNode($node);
			return true;
		}

		/**
		 * The status as stored now, read without a lock: hypha.xml is locked by the caller, and locking the page file too
		 * would take the locks in the opposite order of ensureStructure() (page file, then hypha.xml).
		 */
		protected function mdStoredStatus(): string {
			$doc = new DOMDocument();
			if (!@$doc->loadXML((string)$this->xml->file->read())) return '';
			$article = $doc->getElementsByTagName('article')->item(0);
			return $article ? $article->getAttribute(self::FIELD_NAME_STATUS) : '';
		}

		/**
		 * Sets the tags of the page in hypha.xml from labels (BR-45, BR-62, BR-98). A label that is not a tag of the site
		 * becomes a new tag only when an administrator saves; otherwise it is kept as unknown, which blocks the start of the
		 * review (check known-tags).
		 *
		 * @return array{unknown: list<string>}
		 */
		protected function mdSaveTags(array $labels, int $revision): array {
			global $hyphaXml;
			if (!$this->mdLockPageList()) return ['unknown' => []];
			//
			// A later save already stored its text: its own tags follow, these are not set.
			//
			$doc = new DOMDocument();
			$stored = @$doc->loadXML((string)$this->xml->file->read()) ? (int)$doc->getElementsByTagName('article')->item(0)?->getAttribute('md_revision') : $revision;
			if ($stored !== $revision) {
				$hyphaXml->unlock();
				return ['unknown' => []];
			}
			$ids = [];
			$unknown = [];
			//
			// The same label typed composed (é) or decomposed (e + ´) is one tag; the browser sends NFC, and with intl
			// the labels already in hypha.xml are compared in NFC too.
			//
			$nfc = fn (string $s) => class_exists('Normalizer') ? (Normalizer::normalize($s, Normalizer::FORM_C) ?: $s) : $s;
			foreach (array_unique(array_map($nfc, $labels)) as $label) {
				$node = $hyphaXml->findOneXPath('tagList/tag/language[@id=' . xpath_encode($this->language) . ' and @label=' . xpath_encode($label) . ']');
				if (!$node && class_exists('Normalizer')) foreach ($hyphaXml->findXPath('tagList/tag/language[@id=' . xpath_encode($this->language) . ']') as $candidate) if ($nfc($candidate->getAttribute('label')) === $label) { $node = $candidate; break; }
				if ($node) $ids[] = $node->parentNode->getId();
				elseif (isAdmin()) {
					$tagList = $hyphaXml->documentElement->getOrCreate('tagList');
					$tag = $tagList->createChild('tag');
					$tag->generateId();
					$language = $tag->createChild('language');
					$language->setAttribute('id', $this->language);
					$language->setAttribute('label', $label);
					$ids[] = $tag->getId();
				}
				else $unknown[] = $label;
			}
			foreach (iterator_to_array($this->pageListNode->findXPath('tag')) as $old) $this->pageListNode->removeChild($old);
			foreach ($ids as $id) $this->pageListNode->createChild('tag')->setAttribute('id', $id);
			$hyphaXml->saveAndUnlock();
			return ['unknown' => $unknown];
		}

		/**
		 * Texts in the HTML of an article (footnotes, table of contents, diagram source), in the language of the article.
		 */
		protected function mdHtmlTexts(): array {
			$texts = [];
			foreach (['footnotes', 'footnote-back', 'toc', 'diagram-source', 'diagram', 'callout-info', 'callout-tip', 'callout-warning', 'callout-note'] as $key) $texts[$key] = __('mde-html-' . $key);
			return $texts;
		}

		/**
		 * Extra checks of a Markdown article, added to getChecks() (BR-05, BR-12, BR-45).
		 */
		protected function mdChecks(): array {
			if (!$this->isMarkdown()) return [];
			$statuses = [self::STATUS_DRAFT, self::STATUS_REVIEW, self::STATUS_APPROVED];
			return [
				'has-title' => ['statuses' => $statuses, 'level' => self::CHECK_LEVEL_REQUIRED, 'checker' => function () {
					return [trim($this->xml->findOneXPath('article/context/title')->textContent) !== '', []];
				}],
				'has-section' => ['statuses' => $statuses, 'level' => self::CHECK_LEVEL_REQUIRED, 'checker' => function () {
					$section = $this->xml->findOneXPath('article/context/section');
					return [$section && trim($section->textContent) !== '', []];
				}],
				'known-tags' => ['statuses' => $statuses, 'level' => self::CHECK_LEVEL_REQUIRED, 'checker' => function () {
					$unknown = json_decode($this->xml->findOneXPath('article/source')->getAttribute('unknownTags') ?: '[]', true) ?: [];
					return [!$unknown, ['tags' => implode(', ', $unknown)]];
				}],
			];
		}

		/**
		 * The role of the current user for this article: author (the maker), admin, colleague, or none.
		 */
		protected function mdRole(): string {
			if (!isUser()) return 'none';
			$id = $this->O_O->getUser()->getAttribute('id');
			if ($this->hasUserCreated($id)) return 'author';
			return isAdmin() ? 'admin' : 'colleague';
		}

		protected function mdRedirect(): array {
			return ['redirect', $this->constructFullPath($this->pagename)];
		}

		/**
		 * Reading view: the existing view, with the review buttons of the new editor; a retracted article shows its title
		 * and a notice with date and reason instead of the text (BR-86).
		 */
		protected function mdDefaultView(HyphaRequest $request) {
			$article = $this->xml->findOneXPath('article');
			if ($this->getStatus() === self::MD_STATUS_RETRACTED) {
				hypha_mdeditorReader($this->language, '');
				//
				// The address keeps working, but search engines drop the page (BR-86).
				//
				$robots = $this->html->findOneXPath('head')->createChild('meta');
				$robots->setAttribute('name', 'robots');
				$robots->setAttribute('content', 'noindex');
				$main = $this->html->getElementById('main');
				$main->appendChild($this->mdRetractionNotice($main));
				if (isUser()) {
					$commands = $this->html->getElementById('pageCommands');
					if ($this->mdRole() === 'author') $commands->appendChild($this->makeActionButton(__('mde-reedit'), null, self::MD_CMD_REEDIT));
					if (isAdmin()) $commands->appendChild(makeButton(__('delete'), 'if(confirm(' . htmlspecialchars(json_encode(__('sure-to-delete'))) . '))' . makeAction($this->language . '/' . $this->pagename, self::CMD_DELETE, '')));
				}
				return null;
			}
			$result = $this->defaultView($request);
			hypha_mdeditorReader($this->language, $this->getExcerpt() ? $this->getExcerpt()->textContent : '');
			if ($this->getStatus() === self::STATUS_PUBLISHED) $this->mdStructuredData();
			if (!isUser()) return $result;
			$status = $this->getStatus();
			$role = $this->mdRole();
			$commands = $this->html->getElementById('pageCommands');
			$commandsAtEnd = $this->html->getElementById('pageEndCommands');
			//
			// Approving goes through the dialog with the editorial statute (BR-10); the author never approves (BR-94).
			//
			foreach ([$commands, $commandsAtEnd] as $container) {
				if (!$container) continue;
				foreach (iterator_to_array($container->childNodes) as $button)
					if ($button instanceof DOMElement && str_contains($button->getAttribute('onclick'), "'" . self::CMD_APPROVE . "'")) $container->removeChild($button);
			}
			if ($status === self::STATUS_REVIEW && $role !== 'author' && !$this->hasUserApproved($this->O_O->getUser()->getAttribute('id')) && $commandsAtEnd) {
				$commandsAtEnd->appendChild(makeButton(__('mde-approve-dialog'), "document.getElementById('mdeApprove').hidden=false;document.getElementById('mdeApprove').querySelector('input,textarea').focus();"));
				$this->html->getElementById('main')->appendChild($this->mdApproveDialog());
			}
			if (in_array($status, [self::STATUS_REVIEW, self::STATUS_APPROVED], true) && $role === 'author')
				$commands->appendChild(makeButton(__('mde-retract'), 'if(confirm(' . htmlspecialchars(json_encode(__('mde-retract-confirm'))) . '))' . makeAction($this->language . '/' . $this->pagename, self::MD_CMD_RETRACT, '')));
			if ($status === self::STATUS_PUBLISHED && in_array($role, ['author', 'admin'], true)) {
				$commands->appendChild(makeButton(__('mde-withdraw-dialog'), "document.getElementById('mdeWithdraw').hidden=false;document.getElementById('mdeWithdraw').querySelector('textarea').focus();"));
				$this->html->getElementById('main')->appendChild($this->mdWithdrawDialog());
			}
			return $result;
		}

		protected function mdRetractionNotice(HyphaDomElement $parent): HyphaDomElement {
			$retraction = $this->xml->findOneXPath('article/retraction');
			$notice = $this->html->createElement('p');
			$notice->setAttribute('class', 'retracted');
			$notice->setAttribute('role', 'note');
			$at = $retraction ? (int)ltrim($retraction->getAttribute('at'), 't') : time();
			$date = hypha_markdownDate($at, $this->language);
			$strong = $notice->createChild('strong');
			$strong->setText(__('mde-retracted-on', ['date' => $date]));
			$notice->appendText(' ' . ($retraction ? trim($retraction->textContent) : ''));
			return $notice;
		}

		protected function mdApproveDialog(): HyphaDomElement {
			$settings = hypha_mdeditorSettings();
			$items = '';
			foreach ($settings['statute'] as $i => $point) $items .= '<li><label><input type="checkbox" name="md_statute[]" value="' . $i . '" onchange="mdeApproveCheck(this.form)"/> ' . htmlspecialchars($point) . '</label></li>';
			$html = '<div class="mde-dialog" id="mdeApprove" hidden="hidden" role="dialog" aria-modal="true" aria-labelledby="mdeApproveTitle">'
				. '<h2 id="mdeApproveTitle">' . htmlspecialchars(__('mde-approve-title')) . '</h2><p>' . htmlspecialchars(__('mde-approve-intro')) . '</p><ol class="mde-statute">' . $items . '</ol>'
				. '<label for="mdeApproveComment">' . htmlspecialchars(__('mde-approve-comment')) . '</label><textarea id="mdeApproveComment" name="md_comment" rows="3"></textarea>'
				. '<p class="mde-dialog-buttons"><input type="button" class="button" value="' . htmlspecialchars(__('cancel')) . '" onclick="document.getElementById(\'mdeApprove\').hidden=true;"/> '
				. '<input type="button" class="button editButton" disabled="disabled" value="' . htmlspecialchars(__('art-approve')) . '" title="' . htmlspecialchars(__('mde-approve-why-disabled')) . '" onclick="' . htmlspecialchars(makeAction($this->language . '/' . $this->pagename, self::CMD_APPROVE, '', null, 'null')) . '"/></p></div>';
			$form = $this->html->createForm($html);
			ob_start();
?>
<script>
	function mdeApproveCheck(form) {
		var boxes = form.querySelectorAll('input[name="md_statute[]"]');
		var all = Array.prototype.every.call(boxes, function (b) { return b.checked; });
		var button = form.querySelector('.editButton');
		button.disabled = !all;
		button.title = all ? '' : <?=json_encode(__('mde-approve-why-disabled'))?>;
	}
</script>
<?php
			$this->html->writeScript(ob_get_clean());
			$wrapper = $this->html->createElement('div');
			$form->appendTo($wrapper);
			//
			// The approve button posts the form it is in, so the confirmed points and the comment go along.
			//
			$button = $wrapper->findOneXPath('.//input[contains(@class, "editButton")]');
			$button->setAttribute('onclick', str_replace("document.getElementById('" . $this->html->getDefaultForm()->getId() . "')", 'this.form', $button->getAttribute('onclick')));
			return $wrapper;
		}

		protected function mdWithdrawDialog(): HyphaDomElement {
			$html = '<div class="mde-dialog" id="mdeWithdraw" hidden="hidden" role="dialog" aria-modal="true" aria-labelledby="mdeWithdrawTitle">'
				. '<h2 id="mdeWithdrawTitle">' . htmlspecialchars(__('mde-withdraw-title')) . '</h2><p>' . htmlspecialchars(__('mde-withdraw-intro')) . '</p>'
				. '<label for="mdeWithdrawReason">' . htmlspecialchars(__('mde-withdraw-reason')) . '</label><textarea id="mdeWithdrawReason" name="md_reason" rows="3" required="required" oninput="this.form.querySelector(\'.editButton\').disabled = this.value.trim() === \'\';"></textarea>'
				. '<p class="mde-dialog-buttons"><input type="button" class="button" value="' . htmlspecialchars(__('cancel')) . '" onclick="document.getElementById(\'mdeWithdraw\').hidden=true;"/> '
				. '<input type="button" class="button editButton" disabled="disabled" value="' . htmlspecialchars(__('mde-withdraw')) . '" onclick="hypha(' . htmlspecialchars(json_encode($this->language . '/' . $this->pagename)) . ', ' . htmlspecialchars(json_encode(self::MD_CMD_WITHDRAW)) . ', \'\', this.form);"/></p></div>';
			$form = $this->html->createForm($html);
			$wrapper = $this->html->createElement('div');
			$form->appendTo($wrapper);
			return $wrapper;
		}

		/**
		 * Approve with the editorial statute and an optional comment (BR-10, BR-44, BR-51, BR-67, BR-94).
		 */
		protected function mdApproveAction(HyphaRequest $request) {
			if (!isUser()) {
				notify('error', __('login-to-perform-action'));
				return $this->mdRedirect();
			}
			$statute = $request->getPostValue('md_statute', []);
			$error = $this->mdApprove(is_array($statute) ? $statute : [], hypha_markdownClean($request->getPostValue('md_comment', '')));
			notify($error ? 'error' : 'success', $error ? __($error) : ucfirst(__('art-successfully-updated')));
			return $this->mdRedirect();
		}

		/**
		 * @return string|null the language key of the error, or null
		 */
		public function mdApprove(array $confirmed, string $comment): ?string {
			$userId = $this->O_O->getUser()->getAttribute('id');
			if ($this->getStatus() !== self::STATUS_REVIEW) return 'art-unsupported-status-change';
			if ($this->hasUserCreated($userId)) return 'mde-error-author-approves';
			$statute = hypha_mdeditorSettings()['statute'];
			$points = array_values(array_unique(array_map('intval', array_filter($confirmed, 'is_numeric'))));
			sort($points);
			if (!$statute || $points !== range(0, count($statute) - 1)) return 'mde-error-statute';
			$this->xml->lockAndReload();
			//
			// Again under the lock: a second post must not add a second approval (BR-51).
			//
			if ($this->hasUserApproved($userId) || $this->getStatus() !== self::STATUS_REVIEW) {
				$this->xml->unlock();
				return null;
			}
			$approve = $this->xml->createElement(self::FIELD_NAME_APPROVE);
			$this->xml->findOneXPath(self::FIELD_NAME_APPROVE_CONTAINER)->appendChild($approve);
			$approve->setAttribute(self::FIELD_NAME_USER, $userId);
			$approve->setAttribute(self::FIELD_NAME_CREATED_AT, 't' . time());
			$approve->setAttribute('statute', substr(hash('sha256', implode("\n", $statute)), 0, 12));
			$approve->generateId();
			if (trim($comment) !== '') {
				$discussion = $this->xml->findOneXPath(self::FIELD_NAME_DISCUSSION_CONTAINER . '/' . self::FIELD_NAME_DISCUSSION_REVIEW_CONTAINER)->createChild(self::FIELD_NAME_DISCUSSION);
				$discussion->generateId();
				$discussion->setAttribute(self::FIELD_NAME_USER, $userId);
				$discussion->setAttribute(self::FIELD_NAME_DISCUSSION_BLOCKING, false);
				$discussion->setAttribute(self::FIELD_NAME_DISCUSSION_CLOSED, false);
				$discussion->setAttribute('approve', $approve->getId());
				$item = $discussion->createChild(self::FIELD_NAME_DISCUSSION_COMMENT);
				$item->generateId();
				$item->setText(trim($comment));
				$item->setAttribute(self::FIELD_NAME_USER, $userId);
				$item->setAttribute(self::FIELD_NAME_CREATED_AT, 't' . time());
			}
			$this->xml->saveAndUnlock();
			if ($this->canBeSetAsApproved()) $this->updateToNewStatus(self::STATUS_APPROVED);
			return null;
		}

		/**
		 * The author takes an article in review or approved back to draft (BR-76, BR-85, BR-96): the approvals lapse,
		 * the comments stay.
		 */
		protected function mdRetractAction(HyphaRequest $request) {
			$error = isUser() ? $this->mdRetract() : 'login-to-perform-action';
			notify($error ? 'error' : 'success', $error ? __($error) : __('mde-retracted-to-draft'));
			return $this->mdRedirect();
		}

		public function mdRetract(): ?string {
			if ($this->mdRole() !== 'author') return 'mde-error-only-author';
			if (!in_array($this->getStatus(), [self::STATUS_REVIEW, self::STATUS_APPROVED], true)) return 'art-unsupported-status-change';
			$this->xml->lockAndReload();
			//
			// Again under the lock: the article may have been published meanwhile (found by testing two requests at once).
			//
			if (!in_array($this->getStatus(), [self::STATUS_REVIEW, self::STATUS_APPROVED], true)) {
				$this->xml->unlock();
				return 'art-unsupported-status-change';
			}
			$this->xml->findOneXPath('article')->setAttribute(self::FIELD_NAME_STATUS, self::STATUS_DRAFT);
			$this->xml->findOneXPath('article')->setAttribute(self::FIELD_NAME_PUBLISHED_AT, '');
			$approves = $this->xml->findOneXPath(self::FIELD_NAME_APPROVE_CONTAINER);
			$lapsed = $this->xml->documentElement->getOrCreate('lapsed_approves');
			foreach (iterator_to_array($approves->childNodes) as $approve) {
				if ($approve instanceof DOMElement) $approve->setAttribute('lapsed_at', 't' . time());
				$lapsed->appendChild($approve);
			}
			$this->xml->saveAndUnlock();
			$this->mdSetPrivate();
			$this->sendStatusChangeMail();
			return null;
		}

		/**
		 * The author or an administrator retracts a published article, with a reason that readers see (BR-11, BR-73,
		 * BR-86, BR-97). The text stays stored; the page leaves the overviews.
		 */
		protected function mdWithdrawAction(HyphaRequest $request) {
			$error = isUser() ? $this->mdWithdraw(hypha_markdownClean($request->getPostValue('md_reason', ''))) : 'login-to-perform-action';
			notify($error ? 'error' : 'success', $error ? __($error) : __('mde-withdrawn'));
			return $this->mdRedirect();
		}

		public function mdWithdraw(string $reason): ?string {
			if (!in_array($this->mdRole(), ['author', 'admin'], true)) return 'mde-error-only-author-or-admin';
			if ($this->getStatus() !== self::STATUS_PUBLISHED) return 'art-unsupported-status-change';
			if (trim($reason) === '') return 'mde-error-reason';
			$this->xml->lockAndReload();
			if ($this->getStatus() !== self::STATUS_PUBLISHED) {
				$this->xml->unlock();
				return 'art-unsupported-status-change';
			}
			$article = $this->xml->findOneXPath('article');
			$article->setAttribute(self::FIELD_NAME_STATUS, self::MD_STATUS_RETRACTED);
			foreach (iterator_to_array($article->findXPath('retraction')) as $old) $article->removeChild($old);
			$retraction = $article->createChild('retraction');
			$retraction->setAttribute('at', 't' . time());
			$retraction->setAttribute('by', $this->O_O->getUser()->getAttribute('id'));
			$retraction->setText(trim($reason));
			$this->xml->saveAndUnlock();
			$this->mdSetRetractedFlag(true);
			return null;
		}

		/**
		 * The author edits a retracted article again: back to draft, to be reviewed and published again (BR-78). The
		 * reason stays in the history.
		 */
		protected function mdReeditAction(HyphaRequest $request) {
			$error = isUser() ? $this->mdReedit() : 'login-to-perform-action';
			notify($error ? 'error' : 'success', $error ? __($error) : __('mde-retracted-to-draft'));
			return $error ? $this->mdRedirect() : ['redirect', $this->constructFullPath($this->pagename . '/' . self::PATH_EDIT)];
		}

		public function mdReedit(): ?string {
			if ($this->mdRole() !== 'author') return 'mde-error-only-author';
			if ($this->getStatus() !== self::MD_STATUS_RETRACTED) return 'art-unsupported-status-change';
			$this->xml->lockAndReload();
			if ($this->getStatus() !== self::MD_STATUS_RETRACTED) {
				$this->xml->unlock();
				return 'art-unsupported-status-change';
			}
			$article = $this->xml->findOneXPath('article');
			$article->setAttribute(self::FIELD_NAME_STATUS, self::STATUS_DRAFT);
			$article->setAttribute(self::FIELD_NAME_PUBLISHED_AT, '');
			$history = $this->xml->documentElement->getOrCreate('retractions');
			foreach (iterator_to_array($article->findXPath('retraction')) as $retraction) $history->appendChild($retraction);
			$approves = $this->xml->findOneXPath(self::FIELD_NAME_APPROVE_CONTAINER);
			$lapsed = $this->xml->documentElement->getOrCreate('lapsed_approves');
			foreach (iterator_to_array($approves->childNodes) as $approve) $lapsed->appendChild($approve);
			$this->xml->saveAndUnlock();
			$this->mdSetRetractedFlag(false);
			$this->mdSetPrivate();
			return null;
		}

		/**
		 * A draft is private until it is published (BR-23).
		 */
		protected function mdSetPrivate(): void {
			global $hyphaXml;
			if (!$this->mdLockPageList()) return;
			$this->pageListNode->setAttribute('private', 'on');
			$this->privateFlag = true;
			$hyphaXml->saveAndUnlock();
		}

		/**
		 * A retracted article leaves the overviews: hypha_findPages() skips pages with retracted="on" in hypha.xml.
		 */
		protected function mdSetRetractedFlag(bool $retracted): void {
			global $hyphaXml;
			if (!$this->mdLockPageList()) return;
			if ($retracted) $this->pageListNode->setAttribute('retracted', 'on');
			else $this->pageListNode->removeAttribute('retracted');
			$hyphaXml->saveAndUnlock();
		}

		/**
		 * The language of the article, before publication only, if the new language and page name are free (BR-43,
		 * BR-50, BR-77).
		 */
		protected function mdLanguageAction(HyphaRequest $request) {
			$language = hypha_markdownClean($request->getPostValue('argument', ''));
			$error = isUser() ? $this->mdChangeLanguage($language) : 'login-to-perform-action';
			if ($error) {
				notify('error', __($error));
				return $this->mdRedirect();
			}
			return ['redirect', $this->constructFullPath($this->pagename . '/' . self::PATH_EDIT, $language)];
		}

		public function mdChangeLanguage(string $language): ?string {
			if ($this->mdRole() !== 'author') return 'mde-error-only-author';
			if (!in_array($this->getStatus(), [self::STATUS_DRAFT, self::STATUS_REVIEW, self::STATUS_APPROVED], true)) return 'mde-error-language-published';
			if (!in_array($language, hypha_mdeditorLanguages(), true)) return 'mde-error-language';
			if ($language === $this->language) return null;
			global $hyphaXml;
			if (!$this->mdLockPageList()) return 'mde-error-page-gone';
			$this->pagename = hypha_pageGetLanguage($this->pageListNode, $this->language)?->getAttribute('name') ?: $this->pagename;
			if (hypha_getPage($language, $this->pagename) || !in_array($this->mdStoredStatus(), [self::STATUS_DRAFT, self::STATUS_REVIEW, self::STATUS_APPROVED], true)) {
				$hyphaXml->unlock();
				return 'page-name-conflict';
			}
			foreach ($this->pageListNode->findXPath('language') as $node) if ($node->getAttribute('id') === $this->language) $node->setAttribute('id', $language);
			$hyphaXml->saveAndUnlock();
			$this->language = $language;
			return null;
		}

		/**
		 * Update the web address to the title, before publication only (design section 13.14).
		 */
		protected function mdRenameAction(HyphaRequest $request) {
			$name = isUser() ? $this->mdRename() : null;
			if ($name === null) {
				notify('error', __('art-unsupported-status-change'));
				return $this->mdRedirect();
			}
			notify('success', __('mde-renamed'));
			return ['redirect', $this->constructFullPath($name . '/' . self::PATH_EDIT)];
		}

		public function mdRename(): ?string {
			if (!in_array($this->mdRole(), ['author', 'admin'], true)) return null;
			if ($this->getStatus() === self::STATUS_PUBLISHED || $this->getStatus() === self::MD_STATUS_RETRACTED) return null;
			global $hyphaXml;
			if (!$this->mdLockPageList()) return null;
			if (in_array($this->mdStoredStatus(), [self::STATUS_PUBLISHED, self::MD_STATUS_RETRACTED], true)) {
				$hyphaXml->unlock();
				return null;
			}
			$own = $this->pageListNode;
			$name = hypha_markdownPageName($this->getTitle(), function ($n) use ($own) {
				$page = hypha_getPage($this->language, $n);
				return $page && $page !== $own && $page->getAttribute('id') !== $own->getAttribute('id');
			});
			$error = hypha_setPage($this->pageListNode, $this->language, $name, $this->privateFlag ? 'on' : 'off');
			$hyphaXml->saveAndUnlock();
			if ($error) return null;
			$this->pagename = $name;
			return $name;
		}

		/**
		 * The editor (design section 8). The <mdeditor> element is replaced by the editor in system/core/mdeditor.php.
		 */
		protected function mdEditView(HyphaRequest $request) {
			if (!isUser()) {
				notify('error', __('login-to-perform-action'));
				return $this->mdRedirect();
			}
			list($checkStatus, $checks) = $this->runChecks();
			$settings = hypha_mdeditorSettings();
			$approves = $this->xml->findOneXPath(self::FIELD_NAME_APPROVE_CONTAINER)->getElementsByTagName(self::FIELD_NAME_APPROVE)->length;
			$config = [
				'kind' => 'article',
				'fields' => $this->mdFields(),
				'page' => ['language' => $this->language, 'name' => $this->pagename, 'private' => $this->privateFlag, 'status' => $this->getStatus(), 'approves' => $approves, 'approvesNeeded' => self::APPROVES_NEEDED, 'role' => $this->mdRole(), 'published' => $this->getStatus() === self::STATUS_PUBLISHED, 'id' => $this->pageListNode->getAttribute('id'), 'revision' => (int)$this->xml->findOneXPath('article')->getAttribute('md_revision'), 'publishedAt' => ($published = (int)ltrim($this->xml->findOneXPath('article')->getAttribute(self::FIELD_NAME_PUBLISHED_AT), 't')) ? date('Y-m-d', $published) : ''],
				'checks' => array_map(fn ($c) => ['status' => $c['status'], 'label' => $c['label']], $checks),
				'checkStatus' => $checkStatus,
				'settings' => ['sections' => $settings['sections'], 'statute' => $settings['statute'], 'level' => hypha_mdeditorLevel($this->O_O->getUser(), $settings), 'scriptHosts' => $settings['scriptHosts'], 'frameHosts' => $settings['frameHosts'], 'peertubeHosts' => $settings['peertubeHosts']],
				'tags' => hypha_mdeditorTagLabels($this->language),
				'languages' => hypha_mdeditorLanguages(),
				'commands' => ['save' => self::MD_CMD_SAVE, 'retract' => self::MD_CMD_RETRACT, 'language' => self::MD_CMD_LANGUAGE, 'rename' => self::MD_CMD_RENAME],
			];
			return hypha_mdeditorRender($this, $config);
		}

		/**
		 * Save from the editor. Answers JSON to the editor (fetch with ajax=1), or redirects after a plain form post.
		 */
		protected function mdSaveAction(HyphaRequest $request) {
			if (!isUser()) {
				notify('error', __('login-to-perform-action'));
				return $this->mdRedirect();
			}
			$started = microtime(true);
			$post = $request->getPostData();
			$fields = json_decode((string)($post['md_fields'] ?? ''), true, 512, JSON_INVALID_UTF8_SUBSTITUTE);
			$renders = json_decode((string)($post['md_renders'] ?? ''), true);
			if (!is_array($fields)) $fields = [];
			if (!is_array($renders)) $renders = [];
			$result = $this->mdSave($fields, $renders, isset($post['md_base']) ? (string)$post['md_base'] : null, ($post['md_force'] ?? '') === '1');
			if (($post['ajax'] ?? '') === '1') {
				list($checkStatus, $checks) = $this->runChecks();
				hypha_mdeditorJson([
					'ok' => !$result['errors'] && empty($result['conflict']),
					'conflict' => $result['conflict'] ?? null,
					'revision' => $result['revision'] ?? null,
					'errors' => array_map(fn ($e) => __($e), $result['errors']),
					'messages' => $result['messages'],
					'checks' => array_map(fn ($c) => ['status' => $c['status'], 'label' => $c['label']], $checks),
					'checkStatus' => $checkStatus,
					'ms' => round((microtime(true) - $started) * 1000),
				]);
			}
			if (!empty($result['conflict'])) notify('error', __('mde-conflict', ['name' => $result['conflict']['name'], 'at' => $result['conflict']['at']]));
			elseif ($result['errors']) foreach ($result['errors'] as $error) notify('error', __($error));
			else notify('success', ucfirst(__('art-successfully-updated')));
			return $this->mdRedirect();
		}
	}
