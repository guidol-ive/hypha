<?php
//
// Technical design experiments for the Markdown editor, server side.
// Runs on PHP 8.2 and 8.4 inside the Hypha containers. Prints one JSON document with all measurements.
//
// Usage: php proef-server.php [section ...]
//
declare(strict_types=1);
require __DIR__ . '/php/vendor/autoload.php';

use League\CommonMark\CommonMarkConverter;
use League\CommonMark\Environment\Environment;
use League\CommonMark\Extension\CommonMark\CommonMarkCoreExtension;
use League\CommonMark\Extension\GithubFlavoredMarkdownExtension;
use League\CommonMark\Extension\Footnote\FootnoteExtension;
use League\CommonMark\Extension\Attributes\AttributesExtension;
use League\CommonMark\Extension\FrontMatter\FrontMatterExtension;
use League\CommonMark\MarkdownConverter;
use Symfony\Component\HtmlSanitizer\HtmlSanitizer;
use Symfony\Component\HtmlSanitizer\HtmlSanitizerConfig;

$sections = array_slice($argv, 1) ?: ['spec', 'gfm', 'speed', 'xhtml', 'filter', 'yaml', 'highlight', 'save'];
$out = ['php' => PHP_VERSION];

//
// Count notices and deprecations per library while it runs.
//
$notices = [];
$current = 'none';
set_error_handler(function (int $no, string $msg, string $file, int $line) use (&$notices, &$current) {
	$key = $current . ': ' . preg_replace('~^.*/vendor/~', '', $file) . ':' . $line . ' ' . substr($msg, 0, 120);
	$notices[$key] = ($notices[$key] ?? 0) + 1;
	return true;
});

//
// Canonical form of an HTML fragment, so two renderings can be compared like the CommonMark test suite does.
//
function canon(string $html): string {
	$d = new DOMDocument();
	libxml_use_internal_errors(true);
	$d->loadHTML('<?xml encoding="utf-8"?><body>' . $html . '</body>', LIBXML_NOERROR | LIBXML_NOWARNING);
	libxml_clear_errors();
	$body = $d->getElementsByTagName('body')->item(0);
	return $body ? trim(canonNode($body, false)) : '';
}
function canonNode(DOMNode $n, bool $pre): string {
	$s = '';
	foreach ($n->childNodes as $c) {
		if ($c instanceof DOMText) {
			$t = $c->data;
			if (!$pre) $t = preg_replace('/\s+/u', ' ', $t);
			$s .= htmlspecialchars($t, ENT_NOQUOTES);
		} elseif ($c instanceof DOMElement) {
			$attrs = [];
			foreach ($c->attributes as $a) $attrs[$a->name] = $a->value;
			ksort($attrs);
			$a = '';
			foreach ($attrs as $k => $v) $a .= ' ' . $k . '="' . htmlspecialchars($v) . '"';
			$inner = canonNode($c, $pre || $c->tagName === 'pre');
			$block = in_array($c->tagName, ['p', 'li', 'ul', 'ol', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'pre', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'hr', 'div']);
			if ($block) $inner = trim($inner);
			$s .= ($block ? "\n" : '') . '<' . $c->tagName . $a . '>' . $inner . '</' . $c->tagName . '>';
		}
	}
	return $s;
}

function median(array $a): float { sort($a); return $a[intdiv(count($a), 2)]; }

function league(): MarkdownConverter {
	$env = new Environment(['html_input' => 'allow', 'allow_unsafe_links' => false]);
	$env->addExtension(new CommonMarkCoreExtension());
	$env->addExtension(new GithubFlavoredMarkdownExtension());
	$env->addExtension(new FootnoteExtension());
	$env->addExtension(new AttributesExtension());
	$env->addExtension(new FrontMatterExtension());
	return new MarkdownConverter($env);
}

$renderers = [
	'league/commonmark' => function () { $c = new CommonMarkConverter(['html_input' => 'allow']); return fn ($md) => (string)$c->convert($md); },
	'parsedown' => function () { $p = new Parsedown(); return fn ($md) => $p->text($md); },
	'parsedown-extra' => function () { $p = new ParsedownExtra(); return fn ($md) => $p->text($md); },
	'michelf/markdown-extra' => function () { return fn ($md) => \Michelf\MarkdownExtra::defaultTransform($md); },
];

//
// 1. CommonMark 0.31.2 specification: 652 examples.
//
if (in_array('spec', $sections)) {
	$spec = json_decode(file_get_contents(__DIR__ . '/data/spec.json'), true);
	foreach ($renderers as $name => $make) {
		$current = $name;
		$r = $make(); $pass = 0; $bySection = [];
		foreach ($spec as $ex) {
			try { $got = $r($ex['markdown']); } catch (Throwable $e) { $got = 'EXC'; }
			$ok = canon($got) === canon($ex['html']);
			$pass += $ok ? 1 : 0;
			if (!$ok) $bySection[$ex['section']] = ($bySection[$ex['section']] ?? 0) + 1;
		}
		arsort($bySection);
		$out['spec'][$name] = ['pass' => $pass, 'total' => count($spec), 'pct' => round(100 * $pass / count($spec), 1), 'worst' => array_slice($bySection, 0, 5, true)];
	}
}

//
// 2. GitHub Flavored Markdown extensions (tables, strikethrough, autolinks, task lists, tag filter).
//
if (in_array('gfm', $sections)) {
	$txt = file_get_contents(__DIR__ . '/data/gfm-spec.txt');
	preg_match_all('/^`{32} example( [a-z]+)?\n([\s\S]*?)^\.\n([\s\S]*?)^`{32}$/m', $txt, $m, PREG_SET_ORDER);
	$ext = array_values(array_filter($m, fn ($x) => trim($x[1]) !== ''));
	$current = 'league gfm';
	$c = new League\CommonMark\GithubFlavoredMarkdownConverter(['html_input' => 'allow']);
	$cands = ['league/commonmark (GFM)' => fn ($md) => (string)$c->convert($md), 'parsedown-extra' => fn ($md) => (new ParsedownExtra())->text($md), 'michelf/markdown-extra' => fn ($md) => \Michelf\MarkdownExtra::defaultTransform($md)];
	foreach ($cands as $name => $r) {
		$current = $name; $pass = 0;
		foreach ($ext as $x) {
			$md = str_replace('→', "\t", $x[2]); $html = str_replace('→', "\t", $x[3]);
			try { $got = $r($md); } catch (Throwable $e) { $got = ''; }
			$pass += canon($got) === canon($html) ? 1 : 0;
		}
		$out['gfm'][$name] = ['pass' => $pass, 'total' => count($ext)];
	}
}

$start = file_get_contents(__DIR__ . '/data/start.md');
$plak = file_get_contents(__DIR__ . '/data/plaktest.md');
$long6 = str_repeat($start . "\n\n" . $plak . "\n\n", 11);
$long20 = str_repeat($start . "\n\n" . $plak . "\n\n", 35);
$out['corpus'] = ['words_6k' => str_word_count($long6), 'words_20k' => str_word_count($long20)];

//
// 3. Speed and memory: the full Hypha environment of league/commonmark versus the small parsers.
//
if (in_array('speed', $sections)) {
	$current = 'league full';
	$full = league();
	$cands = ['league/commonmark (Hypha-omgeving)' => fn ($md) => (string)$full->convert($md)];
	foreach ($renderers as $name => $make) $cands[$name] = $make();
	foreach ($cands as $name => $r) {
		$current = $name;
		foreach (['6k' => $long6, '20k' => $long20] as $size => $doc) {
			$t = [];
			for ($i = 0; $i < 7; $i++) { $t0 = hrtime(true); $r($doc); $t[] = (hrtime(true) - $t0) / 1e6; }
			$out['speed'][$name][$size . '_ms'] = round(median($t), 1);
		}
	}
	$out['speed']['peak_mb'] = round(memory_get_peak_usage(true) / 1048576, 1);
}

//
// 4. Is the output well-formed XHTML that Hypha can store in its XML?
//
if (in_array('xhtml', $sections)) {
	$current = 'xhtml';
	$full = league();
	foreach (['start' => $start, 'plaktest' => $plak] as $k => $md) {
		$html = (string)$full->convert($md);
		libxml_use_internal_errors(true);
		$d = new DOMDocument();
		$ok = $d->loadXML('<div>' . $html . '</div>');
		$errs = array_map(fn ($e) => trim($e->message) . ' @' . $e->line, libxml_get_errors());
		libxml_clear_errors();
		$out['xhtml'][$k] = ['loadXML' => $ok, 'errors' => array_slice($errs, 0, 4), 'bytes' => strlen($html)];
	}
}

//
// 5. HTML filter: attack vectors, allowed HTML, Pele SVG and Temml MathML.
//
require __DIR__ . '/filter.php';
if (in_array('filter', $sections)) {
	$vectors = require __DIR__ . '/vectors.php';
	$svgs = glob(__DIR__ . '/data/svg/*.svg');
	$math = file_get_contents(__DIR__ . '/data/math.html');

	$cfg = (new HtmlSanitizerConfig())
		->allowSafeElements()
		->allowElement('details')->allowElement('summary')->allowElement('kbd')->allowElement('abbr', ['title'])->allowElement('mark')
		->allowElement('span', ['class'])->allowElement('div', ['class'])
		->allowElement('figure', ['class'])->allowElement('figcaption')
		->allowElement('iframe', ['src', 'title', 'sandbox', 'loading', 'referrerpolicy', 'width', 'height'])
		->allowElement('svg', '*')->allowElement('g', '*')->allowElement('path', '*')->allowElement('rect', '*')->allowElement('text', '*')->allowElement('tspan', '*')
		->allowElement('math', '*')->allowElement('mi', '*')->allowElement('mn', '*')->allowElement('mo', '*')->allowElement('mfrac', '*')->allowElement('mrow', '*')
		->allowLinkSchemes(['https', 'http', 'mailto'])
		->allowMediaHosts(['www.youtube-nocookie.com', 'player.vimeo.com', 'www.openstreetmap.org', 'datawrapper.dwcdn.net']);
	$symfony = new HtmlSanitizer($cfg);
	$own = new HyphaFilter(['www.youtube-nocookie.com', 'player.vimeo.com', 'www.openstreetmap.org', 'datawrapper.dwcdn.net']);
	$tagfilter = new League\CommonMark\GithubFlavoredMarkdownConverter(['html_input' => 'allow', 'allow_unsafe_links' => false]);

	$cands = [
		'GFM tagfilter alleen' => fn ($h) => (string)$tagfilter->convert($h),
		'symfony/html-sanitizer' => fn ($h) => $symfony->sanitize($h),
		'eigen filter (masterminds/html5 + allowlist)' => fn ($h) => $own->filter($h),
	];
	foreach ($cands as $name => $f) {
		$current = $name;
		$res = ['vectors_ok' => 0, 'vectors_total' => count($vectors), 'failed' => []];
		foreach ($vectors as $v) {
			[$label, $in, $check] = $v;
			try { $got = $f($in); } catch (Throwable $e) { $got = 'EXC ' . $e->getMessage(); }
			if ($check($got)) $res['vectors_ok']++; else $res['failed'][] = $label . ' => ' . substr($got, 0, 140);
		}
		//
		// SVG must survive with its case-sensitive attributes (viewBox) and style variables.
		//
		$svgOk = 0; $svgBytesIn = 0; $svgBytesOut = 0; $t = 0;
		foreach ($svgs as $file) {
			$in = file_get_contents($file);
			$t0 = hrtime(true); $got = $f($in); $t += hrtime(true) - $t0;
			$svgBytesIn += strlen($in); $svgBytesOut += strlen($got);
			if (str_contains($got, 'viewBox=') && str_contains($got, '<text') && strlen($got) > 0.9 * strlen($in)) $svgOk++;
		}
		$res['svg_kept'] = $svgOk . ' / ' . count($svgs);
		$res['svg_ms_total'] = round($t / 1e6, 1);
		$gotMath = $f($math);
		$res['mathml_kept'] = substr_count($gotMath, '<mfrac') . ' / ' . substr_count($math, '<mfrac') . ' mfrac, ' . substr_count($gotMath, '<math') . ' / ' . substr_count($math, '<math') . ' math';
		$out['filter'][$name] = $res;
	}
}

//
// 6. Front matter with symfony/yaml: the fixed properties, a broken one, and speed.
//
if (in_array('yaml', $sections)) {
	$current = 'yaml';
	$fm = "titel: \"Vertrekkend raadslid Bram Hoekstra: twintig jaar strijd voor open bestuur\"\nauteur: Sanne de Vries\nuittreksel: \"Twintig jaar lang vroeg Bram Hoekstra om openbare stukken.\"\ntags:\n  - Politiek en bestuur\n  - Raadsnieuws\nafbeelding: beeld/hoekstra.jpg\nbeschrijving: Bram Hoekstra in de raadszaal\nbijschrift: Bram Hoekstra na twintig jaar.\nfotograaf: Foto (naam fotograaf)\nbijsluiter: |\n  Sanne de Vries is politiek verslaggever.\n\n  Tweede alinea.\nbronnen: |\n  - Raadsinformatie gemeente Eemstad\nrobots: noindex\n";
	$t = [];
	for ($i = 0; $i < 200; $i++) { $t0 = hrtime(true); $y = Symfony\Component\Yaml\Yaml::parse($fm); $t[] = (hrtime(true) - $t0) / 1e6; }
	$broken = "titel: \"Kop zonder einde\nauteur: Sanne\n";
	try { Symfony\Component\Yaml\Yaml::parse($broken); $err = 'geen fout'; } catch (Throwable $e) { $err = $e->getMessage(); }
	$ambiguous = Symfony\Component\Yaml\Yaml::parse("titel: Nee\nuittreksel: 2026\ntags: ja\n");
	$out['yaml'] = ['keys' => array_keys($y), 'bijsluiter_lines' => substr_count($y['bijsluiter'], "\n"), 'ms' => round(median($t), 3), 'broken' => $err, 'types' => array_map('gettype', $ambiguous)];
}

//
// 7. Code highlighting with highlight.php: same class names as highlight.js, speed and notices.
//
if (in_array('highlight', $sections)) {
	$current = 'highlight.php';
	$hl = new \Highlight\Highlighter();
	$code = str_repeat("<?php\nfunction som(array \$a): int {\n\treturn array_sum(\$a); // optellen\n}\n", 25);
	$t = [];
	for ($i = 0; $i < 7; $i++) { $t0 = hrtime(true); $r = $hl->highlight('php', $code); $t[] = (hrtime(true) - $t0) / 1e6; }
	preg_match_all('/class="(hljs-[a-z]+)/', $r->value, $m);
	$out['highlight'] = ['lines' => 100, 'ms' => round(median($t), 2), 'classes' => array_values(array_unique($m[1])), 'languages' => count($hl->listRegisteredLanguages())];
}

//
// 8. Saving: render all four fields, filter, and write the article XML, for the long articles.
//
if (in_array('save', $sections)) {
	$current = 'save';
	$full = league();
	$own = $own ?? new HyphaFilter([]);
	foreach (['6k' => $long6, '20k' => $long20] as $size => $doc) {
		$t = [];
		for ($i = 0; $i < 7; $i++) {
			$t0 = hrtime(true);
			$x = new DOMDocument('1.0', 'UTF-8');
			$x->loadXML('<article format="markdown"><content><text/><sources/></content><context><excerpt/><method/></context><source format="markdown" profile="hypha-1.0"><text/></source></article>');
			$html = $own->filter((string)$full->convert($doc));
			$frag = $x->createDocumentFragment();
			$frag->appendXML($own->toXhtml($html));
			$x->getElementsByTagName('text')->item(0)->appendChild($frag);
			$x->getElementsByTagName('text')->item(1)->appendChild($x->createCDATASection($doc));
			file_put_contents('/tmp/proef-artikel.xml', $x->saveXML());
			$t[] = (hrtime(true) - $t0) / 1e6;
		}
		$out['save'][$size . '_ms'] = round(median($t), 1);
		clearstatcache();
		$out['save'][$size . '_xml_kb'] = round(filesize('/tmp/proef-artikel.xml') / 1024);
	}
}

$out['notices'] = $notices;
echo json_encode($out, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), "\n";
