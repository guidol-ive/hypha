<?php
//
// Page name from the article title: lower case words joined by hyphens, accents removed, at most 80 characters,
// cut at a word boundary, and unique within the language (BR-50) by adding -2, -3, ...
//
function hyphaSlug(string $title, callable $exists, int $max = 80): string {
	$s = strtr($title, ['ß' => 'ss', 'æ' => 'ae', 'Æ' => 'ae', 'ø' => 'o', 'Ø' => 'o', 'œ' => 'oe', 'Œ' => 'oe', 'ĳ' => 'ij', 'Ĳ' => 'ij', '€' => ' euro ', '&' => ' en ', '’' => '', "'" => '', '%' => ' procent ']);
	if (class_exists('Normalizer')) $s = preg_replace('/\p{Mn}+/u', '', Normalizer::normalize($s, Normalizer::FORM_D));
	else $s = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $s);
	$s = trim(preg_replace('/[^a-z0-9]+/', '-', strtolower($s)), '-');
	if (strlen($s) > $max) $s = rtrim(substr($s, 0, strrpos(substr($s, 0, $max + 1), '-') ?: $max), '-');
	if ($s === '') $s = 'artikel';
	$name = $s;
	for ($n = 2; $exists($name); $n++) $name = $s . '-' . $n;
	return $name;
}
$taken = ['raadsvergadering-van-27-oktober'];
$exists = fn ($n) => in_array($n, $taken, true);
$cases = [
	'Vertrekkend raadslid Bram Hoekstra: twintig jaar strijd voor open bestuur',
	'Café „De Zwaan” krijgt geen vergunning',
	'Coöperatie en ruïne: één naïeve vraag',
	'Raadsvergadering van 27 oktober',
	'50% minder geld voor de Ĳsbaan & het zwembad – € 2,4 miljoen',
	'Wat?!',
	'Een heel lange titel die veel langer is dan tachtig tekens en daarom op een woordgrens wordt afgekort voor het adres',
];
$out = ['php' => PHP_VERSION, 'intl' => class_exists('Normalizer'), 'resultaat' => []];
foreach ($cases as $c) $out['resultaat'][$c] = hyphaSlug($c, $exists);
//
// The existing page name check of Hypha must leave the result unchanged.
//
function validatePagename($name) { $name = preg_replace('/\s+/', ' ', $name); $name = preg_replace('/^\s|\s$|[^\s\d\w\-_]/i', '', $name); return preg_replace('/\s/', '_', $name); }
$out['ongewijzigd_door_validatePagename'] = count(array_filter($out['resultaat'], fn ($s) => validatePagename($s) === $s)) . ' / ' . count($cases);
echo json_encode($out, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), "\n";
