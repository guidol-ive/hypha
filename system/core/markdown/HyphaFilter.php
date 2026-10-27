<?php
/*
	Class: HyphaFilter
	Allowlist filter for the HTML of an article or page with a Markdown source (design section 13.5, decision T2).

	The HTML is read with an HTML5 parser (masterminds/html5), so SVG and MathML keep their case-sensitive names such as
	viewBox and clipPath; the HTML parser of libxml lowercases them. Only listed elements and attributes stay, per
	namespace. The result is written as XHTML, which loads into the XML store of Hypha.

	Rules:
	1. only elements and attributes of the list stay, per namespace (HTML, SVG, MathML);
	2. href and src only with https, http, mailto or a relative path; in SVG only #... (no external use);
	3. style only in SVG and MathML, and then without url(, expression, @import or javascript:;
	4. script, style, form, object, embed, template, macro and foreignObject disappear with their content;
	5. an iframe only to a host of the list of services, with a forced sandbox, loading="lazy" and a referrer policy;
	   a srcdoc of the author disappears (the interactive block of level 2 is added after this filter);
	6. external links get rel="noopener nofollow".
*/
	use Masterminds\HTML5;

	class HyphaFilter {
		const HTML = [
			'p' => ['class'], 'br' => [], 'hr' => [],
			'h1' => ['id'], 'h2' => ['id'], 'h3' => ['id'], 'h4' => ['id'], 'h5' => ['id'], 'h6' => ['id'],
			'strong' => [], 'em' => [], 'b' => [], 'i' => [], 'u' => [], 's' => [], 'q' => [], 'cite' => [], 'dfn' => [], 'var' => [], 'samp' => [],
			'code' => ['class'], 'pre' => ['class'], 'blockquote' => ['class'],
			'ul' => ['class'], 'ol' => ['start', 'class'], 'li' => ['id', 'class'], 'dl' => [], 'dt' => [], 'dd' => [],
			'a' => ['href', 'title', 'class', 'id', 'rel', 'aria-label'],
			'img' => ['src', 'alt', 'title', 'width', 'height', 'loading', 'class'],
			'table' => [], 'thead' => [], 'tbody' => [], 'tfoot' => [], 'tr' => [], 'th' => ['align', 'colspan', 'rowspan', 'scope'], 'td' => ['align', 'colspan', 'rowspan'], 'caption' => [],
			'del' => [], 'ins' => [], 'sup' => ['id', 'class'], 'sub' => [], 'mark' => [], 'small' => [], 'kbd' => [], 'abbr' => ['title'], 'time' => ['datetime'],
			'details' => ['open', 'class'], 'summary' => [],
			'figure' => ['class', 'role', 'aria-label'], 'figcaption' => [],
			'aside' => ['class', 'aria-label'], 'section' => ['class', 'aria-label'], 'nav' => ['class', 'aria-label'],
			'span' => ['class', 'title'], 'div' => ['class', 'title'],
			'input' => ['type', 'checked', 'disabled'],
			'iframe' => ['src', 'title', 'width', 'height', 'class', 'allow', 'allowfullscreen'],
		];
		const SVG = ['svg', 'g', 'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'text', 'tspan', 'textPath', 'defs', 'marker', 'clipPath', 'linearGradient', 'radialGradient', 'stop', 'title', 'desc', 'use', 'pattern', 'mask', 'symbol', 'a'];
		const SVG_ATTR = ['class', 'id', 'd', 'x', 'y', 'x1', 'x2', 'y1', 'y2', 'cx', 'cy', 'r', 'rx', 'ry', 'fx', 'fy', 'width', 'height', 'points', 'viewBox', 'transform', 'fill', 'fill-opacity', 'fill-rule', 'clip-rule', 'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-dashoffset', 'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit', 'stroke-opacity', 'opacity', 'font-size', 'font-weight', 'font-family', 'font-style', 'text-anchor', 'dominant-baseline', 'alignment-baseline', 'baseline-shift', 'letter-spacing', 'text-decoration', 'style', 'role', 'aria-roledescription', 'aria-label', 'aria-hidden', 'data-id', 'xml:space', 'markerWidth', 'markerHeight', 'markerUnits', 'refX', 'refY', 'orient', 'offset', 'stop-color', 'stop-opacity', 'clip-path', 'mask', 'marker-end', 'marker-start', 'marker-mid', 'dx', 'dy', 'rotate', 'textLength', 'lengthAdjust', 'preserveAspectRatio', 'href', 'xlink:href', 'gradientUnits', 'gradientTransform', 'patternUnits', 'patternTransform', 'vector-effect', 'pathLength', 'startOffset', 'xmlns'];
		const MATH = ['math', 'mrow', 'mi', 'mn', 'mo', 'ms', 'mtext', 'mspace', 'msup', 'msub', 'msubsup', 'mfrac', 'msqrt', 'mroot', 'mstyle', 'mtable', 'mtr', 'mtd', 'mlabeledtr', 'mover', 'munder', 'munderover', 'mmultiscripts', 'mprescripts', 'none', 'mpadded', 'menclose', 'semantics', 'annotation', 'mphantom', 'merror'];
		const MATH_ATTR = ['display', 'class', 'style', 'mathvariant', 'movablelimits', 'width', 'displaystyle', 'scriptlevel', 'stretchy', 'fence', 'separator', 'lspace', 'rspace', 'accent', 'accentunder', 'columnalign', 'rowalign', 'rowspacing', 'columnspacing', 'columnlines', 'rowlines', 'frame', 'notation', 'encoding', 'height', 'depth', 'voffset', 'largeop', 'symmetric', 'minsize', 'maxsize', 'form', 'xmlns', 'linethickness', 'numalign', 'denomalign', 'bevelled', 'mathcolor', 'mathbackground', 'mathsize', 'href'];
		const DROP_WITH_CONTENT = ['script', 'style', 'iframe', 'object', 'embed', 'template', 'noscript', 'textarea', 'select', 'form', 'macro', 'frame', 'frameset', 'applet', 'base', 'link', 'meta', 'title', 'head', 'button', 'svg:foreignObject'];

		private HTML5 $parser;
		private array $frameHosts;

		/**
		 * @param list<string> $frameHosts hosts an iframe may point to (level 2); empty for level 1
		 */
		public function __construct(array $frameHosts = []) {
			$this->parser = new HTML5(['disable_html_ns' => true]);
			$this->frameHosts = array_map('strtolower', $frameHosts);
		}

		/**
		 * Filters HTML and returns the result as a fragment of a DOM document, for further changes before it is written.
		 */
		public function sanitize(string $html): DOMDocumentFragment {
			$fragment = $this->parser->loadHTMLFragment($html);
			$this->walk($fragment, 'html');
			return $fragment;
		}

		/**
		 * Filters HTML and returns XHTML.
		 */
		public function filter(string $html): string {
			return $this->toXhtml($this->sanitize($html));
		}

		/**
		 * Writes the children of a node as XHTML.
		 */
		public function toXhtml(DOMNode $node): string {
			$xhtml = '';
			$document = $node instanceof DOMDocument ? $node : $node->ownerDocument;
			foreach ($node->childNodes as $child) $xhtml .= $document->saveXML($child);
			return $xhtml;
		}

		private function walk(DOMNode $node, string $space): void {
			foreach (iterator_to_array($node->childNodes) as $child) {
				if ($child instanceof DOMText) continue;
				if (!$child instanceof DOMElement) {
					$node->removeChild($child);
					continue;
				}
				$name = $child->localName;
				$inner = $name === 'svg' ? 'svg' : ($name === 'math' ? 'math' : $space);
				if ($space !== 'html' && $inner === $space && strtolower($name) === 'foreignobject') {
					$node->removeChild($child);
					continue;
				}
				$allowed = match ($inner) {
					'svg' => in_array($name, self::SVG, true) ? self::SVG_ATTR : null,
					'math' => in_array($name, self::MATH, true) ? self::MATH_ATTR : null,
					default => self::HTML[$name] ?? null,
				};
				if ($name === 'iframe' && !$this->frameHosts) $allowed = null;
				if ($allowed === null) {
					//
					// Drop the element. A dangerous one goes with its content; of a harmless container the content stays.
					//
					if (in_array(strtolower($name), self::DROP_WITH_CONTENT, true)) {
						$node->removeChild($child);
						continue;
					}
					$this->walk($child, $inner);
					while ($child->firstChild) $node->insertBefore($child->firstChild, $child);
					$node->removeChild($child);
					continue;
				}
				foreach (iterator_to_array($child->attributes) as $attribute) {
					$attributeName = $attribute->nodeName;
					$keep = in_array($attributeName, $allowed, true);
					if ($keep && in_array($attributeName, ['href', 'src', 'xlink:href'], true))
						$keep = $inner === 'html' ? $this->safeUrl($attribute->value, $name === 'iframe') : str_starts_with(trim($attribute->value), '#');
					if ($keep && $attributeName === 'style')
						$keep = !preg_match('/url\s*\(|expression|@import|javascript:|behavior|-moz-binding|\\\\/i', $attribute->value);
					if (!$keep) $child->removeAttributeNode($attribute);
				}
				if ($name === 'iframe' && $inner === 'html') {
					if (!$child->hasAttribute('src')) {
						$node->removeChild($child);
						continue;
					}
					$child->setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups allow-presentation');
					$child->setAttribute('loading', 'lazy');
					$child->setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
					if (!$child->hasAttribute('title')) $child->setAttribute('title', parse_url($child->getAttribute('src'), PHP_URL_HOST));
				}
				if ($name === 'a' && $inner === 'html' && preg_match('~^(https?:)?//~i', trim($child->getAttribute('href')))) $child->setAttribute('rel', 'noopener nofollow');
				$this->walk($child, $inner);
			}
		}

		/**
		 * A link may be https, http, mailto or relative; an iframe only https to a host of the list.
		 */
		private function safeUrl(string $url, bool $frame): bool {
			$u = trim(html_entity_decode($url, ENT_QUOTES | ENT_HTML5, 'UTF-8'));
			$u = preg_replace('/[\x00-\x20\x7f]+/', '', $u);
			if ($frame) return (bool)preg_match('~^https://([^/?#]+)[/?#]~i', $u . '/', $m) && in_array(strtolower($m[1]), $this->frameHosts, true);
			if (preg_match('~^[a-z][a-z0-9+.-]*:~i', $u)) return (bool)preg_match('~^(https?|mailto):~i', $u);
			return true;
		}
	}
