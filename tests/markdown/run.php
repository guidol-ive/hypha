<?php
	//
	// Test runner for the Markdown editor, in the style of tests/HyphaRequestTest.php: no Composer, no PHPUnit.
	// Every warning, notice and deprecation fails the test that caused it, so a run on PHP 8.2 up to 8.5 also shows
	// what a newer PHP version complains about.
	//
	// Usage, from the root of the repository: php tests/markdown/run.php [file or name filter ...]
	//
	error_reporting(E_ALL);
	ini_set('display_errors', '1');
	set_error_handler(function ($severity, $message, $file, $line) {
		throw new ErrorException($message, 0, $severity, $file, $line);
	});
	chdir(__DIR__ . '/../..');
	require_once __DIR__ . '/lib.php';

	$filters = array_slice($argv, 1);
	$files = glob(__DIR__ . '/*Test.php');
	sort($files);
	foreach ($files as $file) require_once $file;

	exit(HyphaTest::run($filters));
