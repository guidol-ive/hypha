<?php
	//
	// The runner itself: a passing test, and a PHP message that must turn into a failure.
	//
	test('runner: passes', function () {
		same(2, 1 + 1);
	});

	test('runner: a PHP warning fails the test', function () {
		throws(function () { $a = []; return $a['missing']; }, ErrorException::class);
	});
