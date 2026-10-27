<?php
/*
	Module: HyphaMarkdownSyntax
	The parsing half of the Hypha extensions to league/commonmark (design section 13.4.2): nodes, block and inline
	parsers, delimiter processors and the listener that rearranges the parsed document. The same extensions exist as
	markdown-it plug-ins in the browser (system/mdeditor/hypha-markdown.js); the parity test keeps them equal.

	1. callout and quote: a block quote that starts with [!type] title;
	2. page link: [[Page]], [[Page|text]], [[Page#anchor]];
	3. mark ==text==, inserted ++text++, superscript ^text^, subscript ~text~;
	4. note: %% ... %%, left out of the HTML; '%% beschrijving: ... %%' right above a diagram or an interactive block
	   is its description;
	5. figure: an image alone in a paragraph, with an italic line below it as caption, and {.placement} behind it;
	6. formula: $...$ and $$...$$ (the rules of pandoc);
	7. HedgeDoc: :::type ... ::: boxes and [TOC];
	8. heading ids, so a reader can link to a section.
*/
	use League\CommonMark\Delimiter\DelimiterInterface;
	use League\CommonMark\Delimiter\Processor\DelimiterProcessorInterface;
	use League\CommonMark\Event\DocumentParsedEvent;
	use League\CommonMark\Extension\CommonMark\Node\Block\BlockQuote;
	use League\CommonMark\Extension\CommonMark\Node\Block\FencedCode;
	use League\CommonMark\Extension\CommonMark\Node\Block\Heading;
	use League\CommonMark\Extension\CommonMark\Node\Inline\Code;
	use League\CommonMark\Extension\CommonMark\Node\Inline\Emphasis;
	use League\CommonMark\Extension\CommonMark\Node\Inline\Image;
	use League\CommonMark\Extension\CommonMark\Node\Inline\Link;
	use League\CommonMark\Node\Block\AbstractBlock;
	use League\CommonMark\Node\Block\Document;
	use League\CommonMark\Node\Block\Paragraph;
	use League\CommonMark\Node\Inline\AbstractInline;
	use League\CommonMark\Node\Inline\AbstractStringContainer;
	use League\CommonMark\Node\Inline\Newline;
	use League\CommonMark\Node\Inline\Text;
	use League\CommonMark\Node\Node;
	use League\CommonMark\Parser\Block\AbstractBlockContinueParser;
	use League\CommonMark\Parser\Block\BlockContinue;
	use League\CommonMark\Parser\Block\BlockContinueParserInterface;
	use League\CommonMark\Parser\Block\BlockStart;
	use League\CommonMark\Parser\Block\BlockStartParserInterface;
	use League\CommonMark\Parser\Cursor;
	use League\CommonMark\Parser\Inline\InlineParserInterface;
	use League\CommonMark\Parser\Inline\InlineParserMatch;
	use League\CommonMark\Parser\InlineParserContext;
	use League\CommonMark\Parser\MarkdownParserStateInterface;

	//
	// Nodes.
	//
	class HyphaCallout extends AbstractBlock {
		public function __construct(public string $type, public string $title) { parent::__construct(); }
	}
	class HyphaFigure extends AbstractBlock {
		public function __construct(public string $placement) { parent::__construct(); }
	}
	class HyphaFigureCaption extends AbstractBlock {}
	class HyphaNoteBlock extends AbstractBlock {
		public function __construct(public string $text = '') { parent::__construct(); }
	}
	class HyphaMathBlock extends AbstractBlock {
		public function __construct(public string $tex = '') { parent::__construct(); }
	}
	class HyphaToc extends AbstractBlock {}
	class HyphaEmbed extends AbstractBlock {
		public function __construct(public string $url, public string $service, public string $src) { parent::__construct(); }
	}
	class HyphaPageLink extends Link {
		public function __construct(string $url, public string $page) { parent::__construct($url); }
	}
	class HyphaMark extends AbstractInline {}
	class HyphaInserted extends AbstractInline {}
	class HyphaSup extends AbstractInline {}
	class HyphaSub extends AbstractInline {}
	class HyphaNote extends AbstractInline {}
	class HyphaMath extends AbstractInline {
		public function __construct(public string $tex) { parent::__construct(); }
	}

	//
	// [[Page]], [[Page|text]] and [[Page#anchor]]. The link points to language/Page_name; wikify_html() turns that into
	// the page id when the article is stored, so a renamed page keeps working (design section 13.4.2, BR-63).
	//
	class HyphaPageLinkParser implements InlineParserInterface {
		public function __construct(private HyphaMarkdown $markdown) {}

		public function getMatchDefinition(): InlineParserMatch {
			return InlineParserMatch::regex('\[\[([^\[\]\|\n#]+)(#[^\[\]\|\n]*)?(?:\|([^\[\]\n]+))?\]\]');
		}

		public function parse(InlineParserContext $context): bool {
			[$page, $anchor, $label] = array_pad($context->getSubMatches(), 3, '');
			$page = trim($page);
			if ($page === '') return false;
			$context->getCursor()->advanceBy($context->getFullMatchLength());
			$link = new HyphaPageLink($this->markdown->pageHref($page) . ($anchor ?? ''), $page);
			$link->appendChild(new Text(trim((string)$label) !== '' ? trim($label) : $page));
			$context->getContainer()->appendChild($link);
			return true;
		}
	}

	//
	// ^sup^ and ~sub~ as in HedgeDoc and markdown-it-sup/-sub: no white space inside, no nesting.
	//
	class HyphaSupSubParser implements InlineParserInterface {
		public function __construct(private string $char) {}

		public function getMatchDefinition(): InlineParserMatch {
			$c = preg_quote($this->char, '/');
			return InlineParserMatch::regex($c . '(?!' . $c . ')((?:\\\\[ ' . $c . ']|[^\s' . $c . '\\\\]|\\\\(?![ ' . $c . ']))+)' . $c . '(?!' . $c . ')');
		}

		public function parse(InlineParserContext $context): bool {
			$cursor = $context->getCursor();
			//
			// A tilde right after another tilde is part of ~~strikethrough~~.
			//
			if ($cursor->peek(-1) === $this->char) return false;
			$inner = preg_replace('/\\\\([ ' . preg_quote($this->char, '/') . '])/', '$1', $context->getSubMatches()[0]);
			$cursor->advanceBy($context->getFullMatchLength());
			$node = $this->char === '^' ? new HyphaSup() : new HyphaSub();
			$node->appendChild(new Text($inner));
			$context->getContainer()->appendChild($node);
			return true;
		}
	}

	//
	// ==mark==, ++inserted++ and ~~strikethrough~~: exactly two characters on both sides, like markdown-it.
	//
	class HyphaDoubleDelimiterProcessor implements DelimiterProcessorInterface {
		public function __construct(private string $char) {}
		public function getOpeningCharacter(): string { return $this->char; }
		public function getClosingCharacter(): string { return $this->char; }
		public function getMinLength(): int { return 2; }

		public function getDelimiterUse(DelimiterInterface $opener, DelimiterInterface $closer): int {
			return $opener->getLength() === 2 && $closer->getLength() === 2 ? 2 : 0;
		}

		public function process(AbstractStringContainer $opener, AbstractStringContainer $closer, int $delimiterUse): void {
			$node = match ($this->char) {
				'=' => new HyphaMark(),
				'+' => new HyphaInserted(),
				default => new League\CommonMark\Extension\Strikethrough\Strikethrough('~~'),
			};
			$tmp = $opener->next();
			while ($tmp !== null && $tmp !== $closer) {
				$next = $tmp->next();
				$node->appendChild($tmp);
				$tmp = $next;
			}
			$opener->insertAfter($node);
		}
	}

	//
	// %% note %% inside a paragraph: kept in the source, left out of the HTML.
	//
	class HyphaNoteParser implements InlineParserInterface {
		public function getMatchDefinition(): InlineParserMatch {
			return InlineParserMatch::regex('%%[\s\S]*?%%');
		}

		public function parse(InlineParserContext $context): bool {
			$context->getCursor()->advanceBy($context->getFullMatchLength());
			$context->getContainer()->appendChild(new HyphaNote());
			return true;
		}
	}

	//
	// $...$ in a sentence, with the rules of pandoc: no space after the opening $, no space before the closing $, and
	// no digit right after it; so 'from $10 to $20' is no formula. A formula holds no backtick, so it never runs into
	// a code span.
	//
	class HyphaMathParser implements InlineParserInterface {
		public function getMatchDefinition(): InlineParserMatch {
			return InlineParserMatch::regex('\$(?![\s$])((?:\\\\\$|[^$\n`])*?[^\s\\\\$`])\$(?![\d$])');
		}

		public function parse(InlineParserContext $context): bool {
			$cursor = $context->getCursor();
			if ($cursor->peek(-1) === '$') return false;
			$cursor->advanceBy($context->getFullMatchLength());
			$context->getContainer()->appendChild(new HyphaMath($context->getSubMatches()[0]));
			return true;
		}
	}

	//
	// {.placement width=200 height=150} right behind an image. Elsewhere the braces stay text.
	//
	class HyphaImageAttributesParser implements InlineParserInterface {
		public function getMatchDefinition(): InlineParserMatch {
			return InlineParserMatch::regex('\{\s*((?:\.[\w-]+|[\w-]+=[\w%.-]+)(?:\s+(?:\.[\w-]+|[\w-]+=[\w%.-]+))*)\s*\}');
		}

		public function parse(InlineParserContext $context): bool {
			$previous = $context->getContainer()->lastChild();
			if (!$previous instanceof Image) return false;
			$context->getCursor()->advanceBy($context->getFullMatchLength());
			foreach (HyphaMarkdown::parseAttributes($context->getSubMatches()[0]) as $key => $value) {
				if ($key === 'class') $previous->data->set('hypha/placement', $value);
				else $previous->data->set('attributes/' . $key, $value);
			}
			return true;
		}
	}

	//
	// Block parsers: %% note %% on lines of its own, $$ formula $$, and :::type ... ::: of HedgeDoc.
	//
	class HyphaNoteBlockStartParser implements BlockStartParserInterface {
		public function tryStart(Cursor $cursor, MarkdownParserStateInterface $parserState): ?BlockStart {
			if ($cursor->isIndented()) return BlockStart::none();
			$rest = substr($cursor->getLine(), $cursor->getNextNonSpacePosition());
			if (!str_starts_with($rest, '%%')) return BlockStart::none();
			//
			// A note that closes on its first line is a block only if nothing follows the closing %%.
			//
			$close = strpos($rest, '%%', 2);
			if ($close !== false && trim(substr($rest, $close + 2)) !== '') return BlockStart::none();
			$cursor->advanceToEnd();
			return BlockStart::of(new HyphaNoteBlockParser($rest, $close !== false))->at($cursor);
		}
	}

	class HyphaNoteBlockParser extends AbstractBlockContinueParser {
		private HyphaNoteBlock $block;
		private array $lines;

		public function __construct(string $first, private bool $closed) {
			$this->block = new HyphaNoteBlock();
			$this->lines = [$first];
		}
		public function getBlock(): HyphaNoteBlock { return $this->block; }

		public function tryContinue(Cursor $cursor, BlockContinueParserInterface $activeBlockParser): ?BlockContinue {
			if ($this->closed) return BlockContinue::none();
			$line = $cursor->getRemainder();
			$this->lines[] = $line;
			if (strpos($line, '%%') !== false) $this->closed = true;
			$cursor->advanceToEnd();
			return BlockContinue::at($cursor);
		}

		public function addLine(string $line): void {}

		public function closeBlock(): void {
			$text = implode("\n", $this->lines);
			$this->block->text = trim(preg_replace('/^%%|%%\s*$/', '', trim($text)));
		}
	}

	class HyphaMathBlockStartParser implements BlockStartParserInterface {
		public function tryStart(Cursor $cursor, MarkdownParserStateInterface $parserState): ?BlockStart {
			if ($cursor->isIndented()) return BlockStart::none();
			$rest = substr($cursor->getLine(), $cursor->getNextNonSpacePosition());
			if (!str_starts_with($rest, '$$')) return BlockStart::none();
			$after = substr($rest, 2);
			//
			// $$ tex $$ on one line, or $$ alone (or with the start of the formula) on the first line.
			//
			if (preg_match('/^(.*\S)?\s*\$\$\s*$/', $after, $m) && trim($after) !== '') {
				$cursor->advanceToEnd();
				return BlockStart::of(new HyphaMathBlockParser(trim($m[1] ?? ''), true))->at($cursor);
			}
			if (str_contains($after, '$')) return BlockStart::none();
			$cursor->advanceToEnd();
			return BlockStart::of(new HyphaMathBlockParser(trim($after), false))->at($cursor);
		}
	}

	class HyphaMathBlockParser extends AbstractBlockContinueParser {
		private HyphaMathBlock $block;
		private array $lines = [];

		public function __construct(string $first, private bool $closed) {
			$this->block = new HyphaMathBlock();
			if ($first !== '') $this->lines[] = $first;
		}
		public function getBlock(): HyphaMathBlock { return $this->block; }

		public function tryContinue(Cursor $cursor, BlockContinueParserInterface $activeBlockParser): ?BlockContinue {
			if ($this->closed) return BlockContinue::none();
			$line = $cursor->getRemainder();
			if (preg_match('/^(.*?)\s*\$\$\s*$/', $line, $m)) {
				if (trim($m[1]) !== '') $this->lines[] = $m[1];
				$this->closed = true;
			}
			else $this->lines[] = $line;
			$cursor->advanceToEnd();
			return BlockContinue::at($cursor);
		}

		public function closeBlock(): void {
			$this->block->tex = trim(implode("\n", $this->lines));
		}
	}

	class HyphaContainerStartParser implements BlockStartParserInterface {
		public function tryStart(Cursor $cursor, MarkdownParserStateInterface $parserState): ?BlockStart {
			if ($cursor->isIndented()) return BlockStart::none();
			$match = $cursor->match('/^[ \t]*:::[ \t]*(info|success|warning|danger|tip|note)\b[ \t]*(.*)$/i');
			if ($match === null) return BlockStart::none();
			preg_match('/:::[ \t]*(\w+)[ \t]*(.*)$/', $match, $m);
			return BlockStart::of(new HyphaContainerParser(strtolower($m[1]), trim($m[2])))->at($cursor);
		}
	}

	class HyphaContainerParser extends AbstractBlockContinueParser {
		private HyphaCallout $block;
		private bool $finished = false;

		public function __construct(string $type, string $title) {
			$map = ['success' => 'tip', 'danger' => 'warning'];
			$this->block = new HyphaCallout($map[$type] ?? $type, $title);
			$this->block->data->set('hypha/hedgedoc', true);
		}
		public function getBlock(): HyphaCallout { return $this->block; }
		public function isContainer(): bool { return true; }
		public function canContain(AbstractBlock $childBlock): bool { return true; }

		public function tryContinue(Cursor $cursor, BlockContinueParserInterface $activeBlockParser): ?BlockContinue {
			if ($this->finished) return BlockContinue::none();
			if (!$cursor->isIndented() && preg_match('/^[ \t]*:::[ \t]*$/', $cursor->getLine())) {
				$cursor->advanceToEnd();
				return BlockContinue::finished();
			}
			return BlockContinue::at($cursor);
		}
	}

	//
	// After parsing: callouts from block quotes, figures from images alone in a paragraph, descriptions of diagrams,
	// the table of contents, embedded content and heading ids.
	//
	class HyphaMarkdownListener {
		public function __construct(private HyphaMarkdown $markdown) {}

		public function onDocumentParsed(DocumentParsedEvent $event): void {
			$document = $event->getDocument();
			$quotes = $paragraphs = $notes = $headings = [];
			foreach ($document->iterator() as $node) {
				if ($node instanceof BlockQuote) $quotes[] = $node;
				elseif ($node instanceof Paragraph) $paragraphs[] = $node;
				elseif ($node instanceof HyphaNoteBlock) $notes[] = $node;
				elseif ($node instanceof Heading) $headings[] = $node;
			}
			foreach ($quotes as $quote) $this->callout($quote);
			foreach ($notes as $note) $this->description($note);
			$ids = [];
			$toc = [];
			foreach ($headings as $heading) {
				$text = HyphaMarkdown::plainText($heading);
				$id = 'kop-' . (hypha_markdownSlug($text, 60) ?: 'zonder-naam');
				for ($n = 2, $base = $id; isset($ids[$id]); $n++) $id = $base . '-' . $n;
				$ids[$id] = true;
				$heading->data->set('attributes/id', $id);
				$toc[] = [$heading->getLevel(), $id, $text];
			}
			foreach ($paragraphs as $paragraph) {
				if ($paragraph->parent() === null) continue;
				if (!$this->figure($paragraph) && !$this->toc($paragraph, $toc)) $this->markdown->embed($paragraph);
			}
		}

		//
		// > [!type] Title
		// > body
		//
		private function callout(BlockQuote $quote): void {
			$first = $quote->firstChild();
			if (!$first instanceof Paragraph) return;
			$line = '';
			$nodes = [];
			foreach ($first->children() as $child) {
				if ($child instanceof Newline) break;
				if (!$child instanceof Text) return;
				$line .= $child->getLiteral();
				$nodes[] = $child;
			}
			if (!preg_match('/^\[!([A-Za-z][\w-]*)\][ \t]*(.*)$/', $line, $m)) return;
			foreach ($nodes as $node) $node->detach();
			if ($first->firstChild() instanceof Newline) $first->firstChild()->detach();
			if ($first->firstChild() === null) $first->detach();
			$callout = new HyphaCallout(strtolower($m[1]), trim($m[2]));
			while ($quote->firstChild()) $callout->appendChild($quote->firstChild());
			$quote->replaceWith($callout);
		}

		//
		// %% beschrijving: ... %% right above a diagram or an interactive block.
		//
		private function description(HyphaNoteBlock $note): void {
			$next = $note->next();
			if (!$next instanceof FencedCode) return;
			if (preg_match('/^(?:beschrijving|description)\s*:\s*(.+)$/is', $note->text, $m)) $next->data->set('hypha/description', trim(preg_replace('/\s+/', ' ', $m[1])));
		}

		//
		// ![alt](src){.placement}
		// *caption*
		//
		private function figure(Paragraph $paragraph): bool {
			$children = [];
			foreach ($paragraph->children() as $child) {
				if ($child instanceof HyphaNote) continue;
				if ($child instanceof Text && trim($child->getLiteral()) === '') continue;
				$children[] = $child;
			}
			if (!$children || !$children[0] instanceof Image) return false;
			$caption = null;
			if (count($children) === 3 && $children[1] instanceof Newline && $children[2] instanceof Emphasis) $caption = $children[2];
			elseif (count($children) !== 1) return false;
			$image = $children[0];
			$figure = new HyphaFigure($image->data->get('hypha/placement', 'breed'));
			$figure->appendChild($image);
			if ($caption) {
				$figureCaption = new HyphaFigureCaption();
				while ($caption->firstChild()) $figureCaption->appendChild($caption->firstChild());
				$figure->appendChild($figureCaption);
			}
			$paragraph->replaceWith($figure);
			return true;
		}

		private function toc(Paragraph $paragraph, array $headings): bool {
			if (trim(HyphaMarkdown::plainText($paragraph)) !== '[TOC]') return false;
			$toc = new HyphaToc();
			$toc->data->set('hypha/headings', $headings);
			$paragraph->replaceWith($toc);
			return true;
		}
	}
