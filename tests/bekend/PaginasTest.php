<?php
	//
	// Known bugs of pages at PHP level: the diff and patch of the versions of a text page (#571). Runs in
	// php:<version>-cli against the code at HYPHA_CODE.
	//
	// A PHP warning is part of the bug here, so the tests collect the warnings instead of letting the runner turn the
	// first one into a failure of the test itself.
	//

	// Calls $callable and returns [its result, the warnings and notices it gave].
	function paginas_with_warnings(callable $callable): array {
		$warnings = [];
		set_error_handler(function ($severity, $message) use (&$warnings) {
			$warnings[] = $message;
			return true;
		});
		try {
			$result = $callable();
		}
		finally {
			restore_error_handler();
		}
		return [$result, $warnings];
	}

	known_bug(571, 'patch() gives back older text with @@ in it, as diff() stored it', function () {
		require_once HYPHA_CODE . '/system/core/database.php';
		$newer = '<p>Een andere tekst.</p>';
		$older = [
			'<p>Schrijf @@=2,3 niet zo.</p>',
			'<p>Typ @@+tekst voor een voorbeeld.</p>',
			"<pre><code>@@ -1,3 +1,4 @@\n regel een\n+regel twee</code></pre>",
			'<p>Een woord a@@b hier.</p>',
		];
		$wrong = [];
		foreach ($older as $text) {
			try {
				[$back, $warnings] = paginas_with_warnings(fn () => patch($newer, diff($newer, $text)));
			}
			catch (Throwable $e) {
				[$back, $warnings] = [get_class($e), [$e->getMessage()]];
			}
			if ($back !== $text || $warnings) $wrong[] = var_export($text, true) . ' -> ' . var_export($back, true) . ($warnings ? ' (' . $warnings[0] . ')' : '');
		}
		check(!$wrong, 'older versions read back differently: ' . implode('; ', $wrong));
	});

	known_bug(571, 'diff() does not read past the end of the older text', function () {
		require_once HYPHA_CODE . '/system/core/database.php';
		[$diff, $warnings] = paginas_with_warnings(fn () => diff('<p>De raad vergadert</p>', '<p>De raad vergadert</p> <p>Morgen weer.</p>'));
		check(!$warnings, 'diff() of a text that grew at the end warns: ' . implode('; ', array_unique($warnings)));
	});
