<?php
	//
	// Known bugs of the older page types that show up as raw translation keys (#557): every literal __('key') of a
	// datatype must be in both dictionaries, system/languages/en.php and nl.php, otherwise the screen shows the key.
	//
	function lijsten_missing_keys(string $datatype, array $except = []): array {
		$en = (function () { include HYPHA_CODE . '/system/languages/en.php'; return $LANG; })();
		$nl = (function () { include HYPHA_CODE . '/system/languages/nl.php'; return $LANG; })();
		preg_match_all("/__\\('([^']+)'\\s*[,)]/", file_get_contents(HYPHA_CODE . '/system/datatypes/' . $datatype . '.php'), $m);
		$missing = [];
		foreach (array_unique($m[1]) as $key) {
			if (in_array($key, $except, true)) continue;
			if (!isset($en[$key])) $missing[] = "en:$key";
			if (!isset($nl[$key])) $missing[] = "nl:$key";
		}
		return $missing;
	}

	function lijsten_check_keys(string $datatype, array $except = []): void {
		$missing = lijsten_missing_keys($datatype, $except);
		check(!$missing, count($missing) . " keys of $datatype.php missing: " . implode(' ', $missing));
	}

	known_bug(557, 'every text of the festival is in both dictionaries', function () {
		// festival-field-festival-description is #546; festival-field-attending is passed to the default sign-up
		// form but that form has no [[attending]], so it is never shown.
		lijsten_check_keys('festival', ['festival-field-festival-description', 'festival-field-attending']);
	});

	known_bug(557, 'every text of the mailing list is in both dictionaries', function () {
		lijsten_check_keys('mailinglist');
	});

	known_bug(557, 'every text of the page, image and file index is in both dictionaries', function () {
		lijsten_check_keys('index');
	});

	known_bug(557, 'every text of the settings is in both dictionaries', function () {
		lijsten_check_keys('settings');
	});
