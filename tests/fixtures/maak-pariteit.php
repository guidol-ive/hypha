<?php
	//
	// Writes tests/fixtures/pariteit.json: the HTML of league/commonmark with the Hypha extensions (before the filter)
	// for the cases in pariteit.php. Run in a PHP container: php tests/fixtures/maak-pariteit.php
	//
	chdir(__DIR__ . '/../..');
	require 'system/core/markdown.php';
	hypha_markdownLoad();
	$settings = hypha_mdeditorDefaults();
	$markdown = new HyphaMarkdown(['frameHosts' => $settings['frameHosts'], 'peertubeHosts' => $settings['peertubeHosts']]);
	$cases = [];
	foreach (require __DIR__ . '/pariteit.php' as $name => $md) $cases[] = ['name' => $name, 'md' => $md, 'html' => $markdown->toHtml($md)];
	file_put_contents(__DIR__ . '/pariteit.json', json_encode(['frameHosts' => $settings['frameHosts'], 'peertubeHosts' => $settings['peertubeHosts'], 'cases' => $cases], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
	echo count($cases), " cases\n";
