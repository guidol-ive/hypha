<?php
//
// Experimental allowlist filter for the HTML of a Markdown article (freedom levels 1 and 2).
// Parses with an HTML5 parser (masterminds/html5), so SVG and MathML keep their case-sensitive names,
// keeps only listed elements and attributes, and serialises to XHTML for the XML storage of Hypha.
//
use Masterminds\HTML5;

class HyphaFilter {
	const HTML = [
		'p' => [], 'br' => [], 'hr' => [], 'h3' => ['id'], 'h4' => ['id'], 'h5' => ['id'], 'h6' => ['id'],
		'strong' => [], 'em' => [], 'b' => [], 'i' => [], 'code' => ['class'], 'pre' => ['class'], 'blockquote' => ['class'],
		'ul' => [], 'ol' => ['start'], 'li' => ['id'], 'a' => ['href', 'title', 'class', 'id', 'rel'], 'img' => ['src', 'alt', 'width', 'height', 'loading', 'class'],
		'table' => [], 'thead' => [], 'tbody' => [], 'tr' => [], 'th' => ['align', 'style'], 'td' => ['align', 'style'],
		'del' => [], 'ins' => [], 'sup' => ['id', 'class'], 'sub' => [], 'mark' => [], 'small' => [], 'kbd' => [], 'abbr' => ['title'],
		'details' => ['open'], 'summary' => [], 'figure' => ['class', 'role', 'aria-label'], 'figcaption' => [], 'aside' => ['class', 'aria-label'],
		'section' => ['class', 'aria-label'], 'span' => ['class'], 'div' => ['class'], 'input' => ['type', 'checked', 'disabled'],
		'iframe' => ['src', 'title', 'width', 'height'],
	];
	const SVG = ['svg', 'g', 'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'text', 'tspan', 'defs', 'marker', 'clipPath', 'linearGradient', 'stop', 'title', 'desc', 'use', 'pattern', 'mask'];
	const SVG_ATTR = ['class', 'id', 'd', 'x', 'y', 'x1', 'x2', 'y1', 'y2', 'cx', 'cy', 'r', 'rx', 'ry', 'width', 'height', 'points', 'viewBox', 'transform', 'fill', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-linecap', 'stroke-linejoin', 'stroke-opacity', 'opacity', 'font-size', 'font-weight', 'font-family', 'font-style', 'text-anchor', 'dominant-baseline', 'style', 'role', 'aria-roledescription', 'aria-label', 'data-id', 'xml:space', 'markerWidth', 'markerHeight', 'refX', 'refY', 'orient', 'offset', 'stop-color', 'clip-path', 'marker-end', 'marker-start', 'dx', 'dy', 'preserveAspectRatio', 'href', 'gradientUnits', 'patternUnits'];
	const MATH = ['math', 'mrow', 'mi', 'mn', 'mo', 'ms', 'mtext', 'mspace', 'msup', 'msub', 'msubsup', 'mfrac', 'msqrt', 'mroot', 'mstyle', 'mtable', 'mtr', 'mtd', 'mover', 'munder', 'munderover', 'mpadded', 'menclose', 'semantics', 'annotation', 'mphantom'];
	const MATH_ATTR = ['display', 'class', 'style', 'mathvariant', 'movablelimits', 'width', 'displaystyle', 'scriptlevel', 'stretchy', 'fence', 'separator', 'lspace', 'rspace', 'accent', 'accentunder', 'columnalign', 'rowspacing', 'columnspacing', 'notation', 'encoding', 'height', 'depth', 'voffset', 'largeop', 'symmetric', 'minsize', 'maxsize'];

	private HTML5 $parser;

	public function __construct(private array $frameHosts) {
		$this->parser = new HTML5(['disable_html_ns' => true]);
	}

	public function filter(string $html): string {
		$frag = $this->parser->loadHTMLFragment($html);
		$this->walk($frag, 'html');
		return $this->parser->saveHTML($frag);
	}

	public function toXhtml(string $html): string {
		$frag = $this->parser->loadHTMLFragment($html);
		$s = '';
		foreach ($frag->childNodes as $c) $s .= $frag->ownerDocument->saveXML($c);
		return $s;
	}

	private function walk(DOMNode $n, string $space): void {
		foreach (iterator_to_array($n->childNodes) as $c) {
			if ($c instanceof DOMText) continue;
			if (!$c instanceof DOMElement) { $n->removeChild($c); continue; }
			$name = $c->localName;
			$inner = $name === 'svg' ? 'svg' : ($name === 'math' ? 'math' : $space);
			if ($space === 'svg' && $name === 'foreignObject') { $n->removeChild($c); continue; }
			$allowed = match ($inner) {
				'svg' => in_array($name, self::SVG, true) ? self::SVG_ATTR : null,
				'math' => in_array($name, self::MATH, true) ? self::MATH_ATTR : null,
				default => self::HTML[$name] ?? null,
			};
			if ($allowed === null) {
				//
				// Drop the element; keep the text of harmless containers, drop the content of dangerous ones.
				//
				if (in_array($name, ['script', 'style', 'iframe', 'object', 'embed', 'template', 'noscript', 'textarea', 'select', 'form', 'macro'], true)) { $n->removeChild($c); continue; }
				$this->walk($c, $inner);
				while ($c->firstChild) $n->insertBefore($c->firstChild, $c);
				$n->removeChild($c);
				continue;
			}
			foreach (iterator_to_array($c->attributes) as $a) {
				$an = $a->nodeName;
				$keep = in_array($an, $allowed, true);
				if ($keep && in_array($an, ['href', 'src'], true)) $keep = $inner === 'svg' ? str_starts_with(trim($a->value), '#') : $this->safeUrl($a->value, $name === 'iframe');
				if ($keep && $an === 'style') $keep = !preg_match('/url\s*\(|expression|@import|javascript:|behavior/i', $a->value);
				if (!$keep) $c->removeAttributeNode($a);
			}
			if ($name === 'iframe') {
				if (!$c->hasAttribute('src')) { $n->removeChild($c); continue; }
				$c->setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups');
				$c->setAttribute('loading', 'lazy');
				$c->setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
			}
			if ($name === 'a' && preg_match('~^https?://~', $c->getAttribute('href'))) $c->setAttribute('rel', 'noopener nofollow');
			$this->walk($c, $inner);
		}
	}

	private function safeUrl(string $url, bool $frame): bool {
		$u = trim(html_entity_decode($url));
		if ($frame) return (bool)preg_match('~^https://([^/]+)/~', $u, $m) && in_array(strtolower($m[1]), $this->frameHosts, true);
		if (preg_match('~^[a-z][a-z0-9+.-]*:~i', $u)) return (bool)preg_match('~^(https?|mailto):~i', $u);
		return true;
	}
}
