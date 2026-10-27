<?php
//
// Attack vectors and allowed HTML for the filter (design section 13.2, from the experiment): [label, input, check].
//
//
// Only markup can do harm: look for the bad strings inside tags, not in escaped text.
//
$no = fn (string ...$bad) => fn (string $o) => !array_filter($bad, fn ($b) => preg_match_all('/<[^>]*>/', $o, $m) && stripos(implode(' ', $m[0]), $b) !== false);
$has = fn (string ...$good) => fn (string $o) => !array_filter($good, fn ($g) => stripos($o, $g) === false);
return [
	['script', '<p>a</p><script>alert(1)</script>', $no('<script', 'alert')],
	['img onerror', '<img src="x.jpg" onerror="alert(1)">', $no('onerror')],
	['a javascript:', '<a href="javascript:alert(1)">x</a>', $no('javascript:')],
	['a javascript: entity', '<a href="jav&#x61;script:alert(1)">x</a>', $no('script:')],
	['iframe onbekende host', '<iframe src="https://evil.example/x"></iframe>', $no('evil.example')],
	['iframe youtube-nocookie', '<iframe src="https://www.youtube-nocookie.com/embed/abc" title="Video"></iframe>', $has('youtube-nocookie.com/embed/abc', 'sandbox')],
	['iframe srcdoc van auteur', '<iframe srcdoc="<script>alert(1)</script>" sandbox="allow-scripts"></iframe>', $no('srcdoc', 'alert')],
	['svg script', '<svg><script>alert(1)</script></svg>', $no('<script', 'alert')],
	['svg onload', '<svg onload="alert(1)"><rect width="1" height="1"/></svg>', $no('onload')],
	['svg foreignObject', '<svg><foreignObject><iframe src="https://evil.example"></iframe></foreignObject></svg>', $no('foreignobject', 'evil.example')],
	['svg a javascript:', '<svg><a href="javascript:alert(1)"><text>x</text></a></svg>', $no('javascript:')],
	['svg use extern', '<svg><use href="https://evil.example/x.svg#a"/></svg>', $no('evil.example')],
	['style met url()', '<svg><rect style="fill:url(javascript:alert(1))"/></svg>', $no('javascript:', 'url(')],
	['style-element', '<style>body{display:none}</style><p>x</p>', $no('<style', 'display:none')],
	['form', '<form action="https://evil.example"><input name="w"></form>', $no('<form', 'evil.example')],
	['object', '<object data="x.swf"></object>', $no('<object')],
	['data: in link', '<a href="data:text/html,<script>alert(1)</script>">x</a>', $no('data:')],
	['macro (niveau 3, niet gebouwd)', '<macro name="pagelist" tags="Raadsnieuws"/><p>na</p>', $no('<macro')],
	['onclick op span', '<span class="x" onclick="a()">t</span>', fn ($o) => stripos($o, 'onclick') === false && stripos($o, '<span class="x">t</span>') !== false],
	['details en summary blijven', '<details><summary>Meer</summary>tekst</details>', $has('<details>', '<summary>Meer</summary>')],
	['kbd, abbr, sub blijven', '<kbd>⌘</kbd> <abbr title="Woo">Woo</abbr> H<sub>2</sub>O', $has('<kbd>⌘</kbd>', '<abbr title="Woo">', '<sub>2</sub>')],
	['externe link houdt href', '<a href="https://www.example.org/x">x</a>', $has('href="https://www.example.org/x"')],
	['relatieve link blijft', '<a href="nl/Raadsnieuws">x</a>', $has('href="nl/Raadsnieuws"')],
	['mathml blijft', '<math><mfrac><mi>a</mi><mn>2</mn></mfrac></math>', $has('<math', '<mfrac>', '<mi>a</mi>')],
	['svg viewBox blijft', '<svg viewBox="0 0 10 10"><rect width="5" height="5"/></svg>', $has('viewBox="0 0 10 10"')],
];
