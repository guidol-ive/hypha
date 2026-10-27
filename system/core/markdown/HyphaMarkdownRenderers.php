<?php
/*
	Module: HyphaMarkdownRenderers
	The rendering half of the Hypha extensions to league/commonmark: the HTML of callouts, figures, diagrams, formulas,
	code, footnotes and the other Hypha elements. The markdown-it plug-ins in the browser write the same HTML, so the
	preview in the editor equals the published article (parity test, design section 13.4.2).
*/
	use League\CommonMark\Extension\CommonMark\Node\Block\FencedCode;
	use League\CommonMark\Extension\CommonMark\Node\Inline\Image;
	use League\CommonMark\Extension\Footnote\Node\Footnote;
	use League\CommonMark\Extension\Footnote\Node\FootnoteBackref;
	use League\CommonMark\Extension\Footnote\Node\FootnoteContainer;
	use League\CommonMark\Extension\Footnote\Node\FootnoteRef;
	use League\CommonMark\Node\Node;
	use League\CommonMark\Renderer\ChildNodeRendererInterface;
	use League\CommonMark\Renderer\NodeRendererInterface;
	use League\CommonMark\Util\HtmlElement;
	use League\CommonMark\Util\Xml;

	class HyphaMarkdownRenderer implements NodeRendererInterface {
		public function __construct(private HyphaMarkdown $markdown) {}

		public function render(Node $node, ChildNodeRendererInterface $childRenderer) {
			$md = $this->markdown;
			$children = fn () => $childRenderer->renderNodes($node->children());
			$esc = fn ($s) => Xml::escape((string)$s);
			switch (true) {
				case $node instanceof HyphaCallout:
					if ($node->type === 'quote') return new HtmlElement('blockquote', ['class' => 'callout quote'], "\n" . $children() . "\n");
					$title = $node->title !== '' ? $node->title : $md->text('callout-' . $node->type, $node->type);
					return '<aside class="callout ' . $esc($node->type) . '" aria-label="' . $esc($title) . '">' . ($node->title !== '' ? '<p class="callout-title">' . $esc($node->title) . '</p>' : '') . "\n" . $children() . "\n</aside>";
				case $node instanceof HyphaFigure:
					return '<figure class="' . $esc($node->placement) . '">' . $children() . '</figure>';
				case $node instanceof HyphaFigureCaption:
					return '<figcaption>' . $children() . '</figcaption>';
				case $node instanceof HyphaNoteBlock:
				case $node instanceof HyphaNote:
					return '';
				case $node instanceof HyphaMark:
					return '<mark>' . $children() . '</mark>';
				case $node instanceof HyphaInserted:
					return '<ins>' . $children() . '</ins>';
				case $node instanceof HyphaSup:
					return '<sup>' . $children() . '</sup>';
				case $node instanceof HyphaSub:
					return '<sub>' . $children() . '</sub>';
				case $node instanceof HyphaMath:
					return $md->math($node->tex, false);
				case $node instanceof HyphaMathBlock:
					return $md->math($node->tex, true);
				case $node instanceof HyphaToc:
					$items = '';
					foreach ($node->data->get('hypha/headings', []) as [$level, $id, $text])
						if ($level >= 2 && $level <= 4) $items .= '<li class="toc-' . $level . '"><a href="#' . $esc($id) . '">' . $esc($text) . '</a></li>';
					return '<nav class="toc" aria-label="' . $esc($md->text('toc', 'Inhoud')) . '"><ol>' . $items . '</ol></nav>';
				case $node instanceof HyphaEmbed:
					return $md->embedHtml($node);
				case $node instanceof FencedCode:
					return $md->fencedCode($node);
				case $node instanceof Image:
					$attributes = ['src' => $node->getUrl(), 'alt' => HyphaMarkdown::plainText($node)];
					if ($node->getTitle()) $attributes['title'] = $node->getTitle();
					foreach (['width', 'height'] as $key) if ($node->data->has('attributes/' . $key)) $attributes[$key] = $node->data->get('attributes/' . $key);
					return new HtmlElement('img', $attributes, '', true);
				case $node instanceof FootnoteContainer:
					return '<section class="footnotes" aria-label="' . $esc($md->text('footnotes', 'Voetnoten')) . '"><ol>' . "\n" . $children() . "\n</ol></section>";
				case $node instanceof Footnote:
					return '<li id="fn-' . $esc(mb_strtolower($node->getReference()->getLabel(), 'UTF-8')) . '">' . $children() . '</li>';
				case $node instanceof FootnoteRef:
					$label = $esc(mb_strtolower($node->getReference()->getLabel(), 'UTF-8'));
					return '<sup class="footnote-ref"><a href="#fn-' . $label . '" id="fnref-' . $label . '">' . $esc($node->getReference()->getTitle()) . '</a></sup>';
				case $node instanceof FootnoteBackref:
					$label = $esc(mb_strtolower($node->getReference()->getLabel(), 'UTF-8'));
					return ' <a href="#fnref-' . $label . '" class="footnote-backref" aria-label="' . $esc($md->text('footnote-back', 'Terug naar de tekst')) . '">↩</a>';
			}
			throw new InvalidArgumentException('No Hypha renderer for ' . get_class($node));
		}
	}
