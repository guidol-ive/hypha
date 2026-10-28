<?php
	//
	// Runs the PHP known-bug tests (tests/bekend/*Test.php) against the code of another checkout, by default main.
	//
	// Usage: php tests/bekend/run.php <code folder> [filter ...]
	//   The code folder is the root of the Hypha checkout under test; the tests require its system/ files from there.
	//
	error_reporting(E_ALL);
	ini_set('display_errors', '1');
	set_error_handler(function ($severity, $message, $file, $line) {
		throw new ErrorException($message, 0, $severity, $file, $line);
	});
	require_once __DIR__ . '/../markdown/lib.php';
	define('HYPHA_CODE', rtrim($argv[1] ?? '.', '/'));
	chdir(HYPHA_CODE);

	$filters = array_slice($argv, 2);
	$files = glob(__DIR__ . '/*Test.php');
	sort($files);
	foreach ($files as $file) require_once $file;

	exit(HyphaTest::run($filters));
