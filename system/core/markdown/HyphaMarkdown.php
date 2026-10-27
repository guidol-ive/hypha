<?php
/*
	Class: HyphaMarkdown
	Markdown of the profile Hypha-Markdown 1.0 to XHTML for the XML store (design sections 10, 13.4 and 13.5).

	Order (design section 13.5): Markdown -> league/commonmark (html_input allow, allow_unsafe_links false) with the Hypha
	extensions -> SVG and MathML from the browser filled in on the SHA-256 of their source -> the filter over everything
	-> interactive blocks inserted as an iframe with srcdoc -> XHTML.

	Diagrams and formulas are drawn in the browser of the author (Pele, Temml) and sent along when the article is
	saved, keyed by the SHA-256 of the diagram text or the LaTeX (decision T8). What is missing becomes the source as
	text, with a message for the checklist.

	Usage:
	(start code)
		hypha_markdownLoad();
		$markdown = new HyphaMarkdown(['language' => 'nl', 'level' => 2, 'frameHosts' => [...]]);
		$xhtml = $markdown->toXhtml($source, ['svg' => [hash => svg], 'math' => [...], 'mathBlock' => [...]]);
		$markdown->messages; // [['code' => 'diagram-without-drawing', ...], ...]
	(end)
*/
	use League\CommonMark\Environment\Environment;
	use League\CommonMark\Event\DocumentParsedEvent;
	use League\CommonMark\Extension\Autolink\AutolinkExtension;
	use League\CommonMark\Extension\CommonMark\CommonMarkCoreExtension;
	use League\CommonMark\Extension\CommonMark\Node\Block\FencedCode;
	use League\CommonMark\Extension\CommonMark\Node\Inline\Image;
	use League\CommonMark\Extension\CommonMark\Node\Inline\Link;
	use League\CommonMark\Extension\DescriptionList\DescriptionListExtension;
	use League\CommonMark\Extension\Footnote\FootnoteExtension;
	use League\CommonMark\Extension\Footnote\Node\Footnote;
	use League\CommonMark\Extension\Footnote\Node\FootnoteBackref;
	use League\CommonMark\Extension\Footnote\Node\FootnoteContainer;
	use League\CommonMark\Extension\Footnote\Node\FootnoteRef;
	use League\CommonMark\Extension\Strikethrough\Strikethrough;
	use League\CommonMark\Extension\Strikethrough\StrikethroughRenderer;
	use League\CommonMark\Extension\Table\TableExtension;
	use League\CommonMark\Extension\TaskList\TaskListExtension;
	use League\CommonMark\MarkdownConverter;
	use League\CommonMark\Node\Block\Paragraph;
	use League\CommonMark\Node\Inline\Text;
	use League\CommonMark\Node\Node;
	use League\CommonMark\Node\StringContainerInterface;
	use League\CommonMark\Util\Xml;

	class HyphaMarkdown {
		const PROFILE = 'hypha-1.0';
		const PLACEMENTS = ['breed', 'in-de-tekst', 'klein-rechts'];
		const CALLOUTS = ['info', 'tip', 'note', 'warning', 'important', 'caution', 'quote'];
		const HIGHLIGHT_LANGUAGES = ['php' => 'php', 'javascript' => 'javascript', 'js' => 'javascript', 'sql' => 'sql', 'python' => 'python', 'py' => 'python',
			'html' => 'xml', 'xml' => 'xml', 'svg' => 'xml', 'css' => 'css', 'json' => 'json', 'yaml' => 'yaml', 'yml' => 'yaml', 'bash' => 'bash', 'sh' => 'bash', 'shell' => 'bash'];

		/** @var list<array{code: string, detail: string}> messages for the checklist, from the last call of toXhtml() */
		public array $messages = [];

		private array $options;
		private array $renders = [];
		private array $interactive = [];
		private string $token = '';
		private ?MarkdownConverter $converter = null;
		private ?\Highlight\Highlighter $highlighter = null;

		/**
		 * @param array $options
		 *   language: language of the article, for page links (default 'nl');
		 *   level: freedom level 1 or 2 (design section 10.1);
		 *   frameHosts: hosts of embedded content (level 2);
		 *   peertubeHosts: PeerTube instances of the list;
		 *   scriptHosts: hosts an interactive block may load scripts from;
		 *   texts: translated texts for the HTML (section names, labels), keyed as in text();
		 *   pageHref: callable(string $page): string, the link of a page (default language/Page_name).
		 */
		public function __construct(array $options = []) {
			$this->options = $options + ['language' => 'nl', 'level' => 2, 'frameHosts' => [], 'peertubeHosts' => [], 'scriptHosts' => [], 'texts' => [], 'pageHref' => null];
		}

		/**
		 * Markdown to XHTML.
		 *
		 * @param array $renders drawings from the browser: svg (diagram), math (inline formula) and mathBlock (formula
		 *        as a block), each keyed by the SHA-256 (hex) of the source
		 */
		public function toXhtml(string $markdown, array $renders = []): string {
			$this->messages = [];
			$this->renders = $renders + ['svg' => [], 'math' => [], 'mathBlock' => []];
			$this->interactive = [];
			$this->token = bin2hex(random_bytes(6));
			$html = $this->toHtml($markdown);
			$filter = new HyphaFilter($this->options['level'] >= 2 ? $this->frameHosts() : []);
			$fragment = $filter->sanitize($html);
			$this->afterFilter($fragment);
			return $filter->toXhtml($fragment);
		}

		/**
		 * Markdown to HTML, before the filter (for the parity test with markdown-it).
		 */
		public function toHtml(string $markdown): string {
			return (string)$this->converter()->convert($this->preprocess($markdown));
		}

		/**
		 * A text of the interface in the HTML, such as the label of the footnotes. Uses the translated texts when given,
		 * else the Dutch default.
		 */
		public function text(string $key, string $default): string {
			return $this->options['texts'][$key] ?? $default;
		}

		public function pageHref(string $page): string {
			if ($this->options['pageHref']) return ($this->options['pageHref'])($page);
			return $this->options['language'] . '/' . preg_replace('/\s+/', '_', trim($page));
		}

		public function message(string $code, string $detail = ''): void {
			$this->messages[] = ['code' => $code, 'detail' => $detail];
		}

		/**
		 * The text of a node and its children, without markup.
		 */
		public static function plainText(Node $node): string {
			$text = '';
			foreach ($node->iterator() as $child) {
				if ($child instanceof Text || $child instanceof StringContainerInterface && !$child instanceof FencedCode) $text .= $child->getLiteral();
				elseif ($child instanceof League\CommonMark\Node\Inline\Newline) $text .= ' ';
			}
			return $text;
		}

		/**
		 * {.class key=value} into ['class' => 'a b', 'key' => 'value'].
		 */
		public static function parseAttributes(string $text): array {
			$attributes = [];
			$classes = [];
			foreach (preg_split('/\s+/', trim($text)) as $part) {
				if ($part === '') continue;
				if ($part[0] === '.') $classes[] = substr($part, 1);
				elseif (str_contains($part, '=')) {
					[$key, $value] = explode('=', $part, 2);
					$attributes[$key] = $value;
				}
			}
			if ($classes) $attributes['class'] = implode(' ', $classes);
			return $attributes;
		}

		private function converter(): MarkdownConverter {
			if ($this->converter) return $this->converter;
			$environment = new Environment([
				'html_input' => 'allow',
				'allow_unsafe_links' => false,
				'max_nesting_level' => 50,
				'footnote' => ['backref_symbol' => '↩'],
			]);
			$environment->addExtension(new CommonMarkCoreExtension());
			$environment->addExtension(new AutolinkExtension());
			$environment->addExtension(new TableExtension());
			$environment->addExtension(new TaskListExtension());
			$environment->addExtension(new FootnoteExtension());
			$environment->addExtension(new DescriptionListExtension());
			$environment->addInlineParser(new HyphaPageLinkParser($this), 200);
			$environment->addInlineParser(new HyphaNoteParser(), 190);
			$environment->addInlineParser(new HyphaMathParser(), 180);
			$environment->addInlineParser(new HyphaImageAttributesParser(), 170);
			$environment->addInlineParser(new HyphaSupSubParser('^'), 160);
			$environment->addInlineParser(new HyphaSupSubParser('~'), 160);
			$environment->addDelimiterProcessor(new HyphaDoubleDelimiterProcessor('='));
			$environment->addDelimiterProcessor(new HyphaDoubleDelimiterProcessor('+'));
			$environment->addDelimiterProcessor(new HyphaDoubleDelimiterProcessor('~'));
			$environment->addBlockStartParser(new HyphaNoteBlockStartParser(), 200);
			$environment->addBlockStartParser(new HyphaMathBlockStartParser(), 190);
			$environment->addBlockStartParser(new HyphaContainerStartParser(), 180);
			$environment->addEventListener(DocumentParsedEvent::class, [new HyphaMarkdownListener($this), 'onDocumentParsed'], -100);
			$renderer = new HyphaMarkdownRenderer($this);
			foreach ([HyphaCallout::class, HyphaFigure::class, HyphaFigureCaption::class, HyphaNoteBlock::class, HyphaNote::class, HyphaMark::class, HyphaInserted::class,
				HyphaSup::class, HyphaSub::class, HyphaMath::class, HyphaMathBlock::class, HyphaToc::class, HyphaEmbed::class, FencedCode::class, Image::class,
				FootnoteContainer::class, Footnote::class, FootnoteRef::class, FootnoteBackref::class] as $class)
				$environment->addRenderer($class, $renderer, 100);
			$environment->addRenderer(Strikethrough::class, new StrikethroughRenderer());
			return $this->converter = new MarkdownConverter($environment);
		}

		//
		// HedgeDoc notation that is easier to rewrite in the source than to parse: the size of an image
		// ![](foto.jpg =200x150) and {%youtube id %}, {%vimeo id %}. Not inside fenced code.
		//
		private function preprocess(string $markdown): string {
			$markdown = str_replace(["\r\n", "\r"], "\n", $markdown);
			$parts = preg_split('/(^[ ]{0,3}(?:`{3,}|~{3,})[^\n]*\n[\s\S]*?(?:^[ ]{0,3}(?:`{3,}|~{3,})[ \t]*$|\z))/m', $markdown, -1, PREG_SPLIT_DELIM_CAPTURE);
			foreach ($parts as $i => $part) {
				if ($i % 2) continue;
				$part = preg_replace('/(!\[[^\]\n]*\]\()([^\s)]+)\s+=(\d*)x(\d*)\)/', '$1$2){width=$3 height=$4}', $part);
				$part = str_replace(['{width= height=', ' height=}'], ['{height=', '}'], $part);
				$part = preg_replace_callback('/^[ ]{0,3}\{%\s*(youtube|vimeo)\s+([\w-]+)\s*%\}[ \t]*$/m', fn ($m) => $m[1] === 'youtube' ? 'https://www.youtube.com/watch?v=' . $m[2] : 'https://vimeo.com/' . $m[2], $part);
				$parts[$i] = $part;
			}
			return implode('', $parts);
		}

		//
		// Formulas: the MathML from the browser, or the LaTeX as code when it is missing.
		//
		public function math(string $tex, bool $block): string {
			$hash = hash('sha256', $tex);
			$mathml = $this->renders[$block ? 'mathBlock' : 'math'][$hash] ?? null;
			if ($mathml === null) {
				$this->message('formula-without-mathml', $tex);
				$code = '<code class="math-tex">' . Xml::escape(($block ? '$$' : '$') . $tex . ($block ? '$$' : '$')) . '</code>';
				return $block ? '<div class="math math-block">' . $code . '</div>' : '<span class="math">' . $code . '</span>';
			}
			return $block ? '<div class="math math-block">' . $mathml . '</div>' : '<span class="math">' . $mathml . '</span>';
		}

		//
		// Fenced code: a diagram, an interactive block (level 2), code in one of the ten languages, or plain code.
		//
		public function fencedCode(FencedCode $node): string {
			$info = trim($node->getInfo() ?? '');
			$language = strtolower(preg_split('/[\s{]/', $info)[0] ?? '');
			$attributes = preg_match('/\{([^}]*)\}\s*$/', $info, $m) ? self::parseAttributes($m[1]) : [];
			$literal = $node->getLiteral();
			$description = $node->data->get('hypha/description', '');
			if ($language === 'mermaid') return $this->diagram($literal, $description, $attributes['class'] ?? '');
			if ($language === 'html' && preg_match('/^html\s+(interactief|interactive)\b/i', $info)) {
				if ($this->options['level'] >= 2 && $description !== '') {
					$this->interactive[] = ['code' => $literal, 'height' => (int)($attributes['hoogte'] ?? $attributes['height'] ?? 0), 'description' => $description];
					return '<div class="hypha-interactief-' . $this->token . '-' . (count($this->interactive) - 1) . '"></div>';
				}
				$this->message($this->options['level'] >= 2 ? 'interactive-without-description' : 'interactive-not-allowed');
			}
			$class = self::HIGHLIGHT_LANGUAGES[$language] ?? null;
			if ($class) {
				try {
					$this->highlighter ??= new \Highlight\Highlighter();
					$result = $this->highlighter->highlight($class, $literal);
					return '<pre class="code"><code class="hljs language-' . Xml::escape($language) . '">' . $result->value . '</code></pre>' . "\n";
				}
				catch (Throwable $e) {
					//
					// Fall through to plain code: highlighting is decoration.
					//
				}
			}
			return '<pre class="code"><code' . ($language !== '' ? ' class="language-' . Xml::escape($language) . '"' : '') . '>' . Xml::escape($literal) . '</code></pre>' . "\n";
		}

		//
		// A diagram: the SVG drawn by Pele in the browser, the description as caption and accessible name, and the
		// Mermaid text in a <details> for readers without images, search engines and AI (design section 12.10).
		//
		private function diagram(string $literal, string $description, string $placement): string {
			$hash = hash('sha256', $literal);
			$svg = $this->renders['svg'][$hash] ?? null;
			$class = 'diagram' . (in_array($placement, self::PLACEMENTS, true) ? ' ' . $placement : '');
			if ($description === '') $this->message('diagram-without-description');
			$caption = $description !== '' ? '<figcaption>' . Xml::escape($description) . '</figcaption>' : '';
			if ($svg === null) {
				$this->message('diagram-without-drawing', $literal);
				return '<figure class="' . $class . '"><pre class="diagram-src">' . Xml::escape($literal) . '</pre>' . $caption . '</figure>' . "\n";
			}
			$details = '<details class="diagram-source"><summary>' . Xml::escape($this->text('diagram-source', 'Tekst van het diagram')) . '</summary><pre>' . Xml::escape($literal) . '</pre></details>';
			return '<figure class="' . $class . '">' . $svg . $caption . $details . '</figure>' . "\n";
		}

		//
		// Level 2: a link alone in a paragraph to a service of the list becomes embedded content.
		//
		public function embed(Paragraph $paragraph): bool {
			if ($this->options['level'] < 2) return false;
			$children = array_values(array_filter(iterator_to_array($paragraph->children(), false), fn ($c) => !($c instanceof Text && trim($c->getLiteral()) === '')));
			if (count($children) !== 1 || !$children[0] instanceof Link || $children[0] instanceof HyphaPageLink) return false;
			$url = $children[0]->getUrl();
			if (self::plainText($children[0]) !== $url) return false;
			$embed = $this->embedSource($url);
			if (!$embed) return false;
			$paragraph->replaceWith(new HyphaEmbed($url, $embed[0], $embed[1]));
			return true;
		}

		/**
		 * The iframe address of a link to a known service, or null.
		 *
		 * @return array{string, string}|null [service, iframe src]
		 */
		public function embedSource(string $url): ?array {
			$u = $url;
			$patterns = [
				['youtube', '~^https?://(?:www\.|m\.)?(?:youtube\.com/watch\?(?:[^#]*&)?v=|youtu\.be/|youtube\.com/shorts/|youtube(?:-nocookie)?\.com/embed/)([\w-]{6,})~i', 'https://www.youtube-nocookie.com/embed/$1'],
				['vimeo', '~^https?://(?:www\.)?vimeo\.com/(?:video/)?(\d+)~i', 'https://player.vimeo.com/video/$1'],
				['vimeo', '~^https?://player\.vimeo\.com/video/(\d+)~i', 'https://player.vimeo.com/video/$1'],
				['openstreetmap', '~^https://www\.openstreetmap\.org/export/embed\.html\?([^#\s]+)~i', 'https://www.openstreetmap.org/export/embed.html?$1'],
				['datawrapper', '~^https://(?:datawrapper\.dwcdn\.net|www\.datawrapper\.de/_)/(\w+)(?:/(\d+))?~i', 'https://datawrapper.dwcdn.net/$1/'],
				['flourish', '~^https://public\.flourish\.studio/visualisation/(\d+)~i', 'https://flo.uri.sh/visualisation/$1/embed'],
				['infogram', '~^https://infogram\.com/([\w-]+)~i', 'https://e.infogram.com/$1'],
				['googlemaps', '~^https://www\.google\.com/maps/embed\?pb=([^#\s]+)~i', 'https://www.google.com/maps/embed?pb=$1'],
				['spotify', '~^https://open\.spotify\.com/(?:embed/)?(track|album|playlist|episode|show)/(\w+)~i', 'https://open.spotify.com/embed/$1/$2'],
				['soundcloud', '~^(https://soundcloud\.com/[\w-]+/[\w-]+)~i', 'https://w.soundcloud.com/player/?url=$1'],
				['mixcloud', '~^https://www\.mixcloud\.com/([\w-]+/[\w-]+)/?~i', 'https://player-widget.mixcloud.com/widget/iframe/?feed=%2F$1%2F'],
				['archive', '~^https://archive\.org/(?:details|embed)/([\w.-]+)~i', 'https://archive.org/embed/$1'],
				['bandcamp', '~^https://bandcamp\.com/EmbeddedPlayer/([\w=/]+)~i', 'https://bandcamp.com/EmbeddedPlayer/$1'],
				['scribd', '~^https://www\.scribd\.com/(?:document|doc|embeds)/(\d+)~i', 'https://www.scribd.com/embeds/$1/content'],
				['documentcloud', '~^https://www\.documentcloud\.org/documents/([\w-]+)~i', 'https://embed.documentcloud.org/documents/$1/'],
			];
			foreach ($patterns as [$service, $pattern, $replacement]) {
				if (!preg_match($pattern, $u, $m)) continue;
				$src = preg_replace($pattern, $replacement, $m[0]);
				$host = strtolower((string)parse_url($src, PHP_URL_HOST));
				return in_array($host, $this->frameHosts(), true) ? [$service, $src] : null;
			}
			//
			// PeerTube: /w/<id> or /videos/watch/<id> on an instance of the list.
			//
			if (preg_match('~^https://([\w.-]+)/(?:w|videos/watch|videos/embed)/([\w-]+)~i', $u, $m) && in_array(strtolower($m[1]), array_map('strtolower', $this->options['peertubeHosts']), true))
				return ['peertube', 'https://' . strtolower($m[1]) . '/videos/embed/' . $m[2]];
			return null;
		}

		public function embedHtml(HyphaEmbed $node): string {
			$title = $this->text('embed-' . $node->service, ucfirst($node->service));
			return '<figure class="embed ' . Xml::escape($node->service) . '"><iframe src="' . Xml::escape($node->src) . '" title="' . Xml::escape($title) . '" width="560" height="315" allow="fullscreen; picture-in-picture" allowfullscreen=""></iframe>'
				. '<figcaption><a href="' . Xml::escape($node->url) . '">' . Xml::escape($node->url) . '</a></figcaption></figure>' . "\n";
		}

		private function frameHosts(): array {
			return array_values(array_unique(array_map('strtolower', array_merge($this->options['frameHosts'], $this->options['peertubeHosts']))));
		}

		//
		// After the filter: the accessible name of diagrams, and the interactive blocks as an iframe with srcdoc and
		// without allow-same-origin (design section 10.1). The code of the author is only in the srcdoc attribute, so
		// it never runs in the page of Hypha.
		//
		private function afterFilter(DOMDocumentFragment $fragment): void {
			$figures = $placeholders = [];
			$walk = function (DOMNode $node) use (&$walk, &$figures, &$placeholders) {
				foreach ($node->childNodes as $child) {
					if (!$child instanceof DOMElement) continue;
					if ($child->localName === 'figure' && preg_match('/\bdiagram\b/', $child->getAttribute('class'))) $figures[] = $child;
					elseif ($child->localName === 'div' && $this->token !== '' && str_starts_with($child->getAttribute('class'), 'hypha-interactief-' . $this->token . '-')) $placeholders[] = $child;
					else $walk($child);
				}
			};
			$walk($fragment);
			foreach ($figures as $figure) {
				$svg = $caption = null;
				foreach ($figure->childNodes as $child) if ($child instanceof DOMElement) {
					if ($child->localName === 'svg') $svg = $child;
					if ($child->localName === 'figcaption') $caption = $child;
				}
				if (!$svg) continue;
				$svg->setAttribute('role', 'img');
				$svg->setAttribute('aria-label', $caption ? trim($caption->textContent) : $this->text('diagram', 'diagram'));
			}
			foreach ($placeholders as $placeholder) {
				$index = (int)substr($placeholder->getAttribute('class'), strlen('hypha-interactief-' . $this->token . '-'));
				$block = $this->interactive[$index] ?? null;
				if (!$block) continue;
				$document = $placeholder->ownerDocument;
				$figure = $document->createElement('figure');
				$figure->setAttribute('class', 'interactief');
				$iframe = $figure->appendChild($document->createElement('iframe'));
				$iframe->setAttribute('sandbox', 'allow-scripts');
				$iframe->setAttribute('title', $block['description']);
				$iframe->setAttribute('loading', 'lazy');
				$iframe->setAttribute('referrerpolicy', 'no-referrer');
				$iframe->setAttribute('height', (string)($block['height'] > 0 ? min($block['height'], 4000) : 400));
				$iframe->setAttribute('srcdoc', $this->srcdoc($block['code']));
				$caption = $figure->appendChild($document->createElement('figcaption'));
				$caption->appendChild($document->createTextNode($block['description']));
				$placeholder->parentNode->replaceChild($figure, $placeholder);
			}
		}

		//
		// The document of an interactive block, with a Content-Security-Policy that only allows scripts from the list.
		//
		public function srcdoc(string $code): string {
			$hosts = implode(' ', array_map(fn ($h) => 'https://' . $h, $this->options['scriptHosts']));
			$csp = "default-src 'none'; script-src 'unsafe-inline' $hosts; style-src 'unsafe-inline' $hosts; img-src data: https:; font-src $hosts; connect-src 'none'; form-action 'none'";
			return '<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="' . htmlspecialchars($csp) . '">'
				. '<style>body{margin:0;font-family:Lato,Helvetica,Arial,sans-serif}</style>' . $code;
		}
	}
