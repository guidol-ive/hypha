<?php
	//
	// Known bugs of the platform at PHP level: deprecations, the scheme behind a proxy, and the installer that
	// hypha.php builds (#526, #522). Runs in php:<version>-cli against the code at HYPHA_CODE.
	//
	// A deprecation is checked with "php -l" (compile-time deprecations) or by calling the code with an error handler
	// that collects the messages. A deprecation that only exists on a newer PHP version is also checked in the source,
	// so the test is known on every supported version until the code is changed.
	//

	// The output of "php -l" on a file of the code under test.
	function platform_lint(string $file): string {
		exec(escapeshellarg(PHP_BINARY) . ' -d error_reporting=-1 -d display_errors=1 -d log_errors=0 -l ' . escapeshellarg(HYPHA_CODE . '/' . $file) . ' 2>&1', $out);
		return implode("\n", $out);
	}

	// The PHP files under a folder of the code under test.
	function platform_php_files(string $dir): array {
		$files = [];
		$it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator(HYPHA_CODE . '/' . $dir, FilesystemIterator::SKIP_DOTS));
		foreach ($it as $file) if (substr($file->getFilename(), -4) === '.php' && strpos($file->getPathname(), '/vendor/') === false) $files[] = substr($file->getPathname(), strlen(HYPHA_CODE) + 1);
		sort($files);
		return $files;
	}

	known_bug(398, 'getScheme() is https when Apache sets HTTPS=on behind a TLS proxy, also with REQUEST_SCHEME http', function () {
		require_once HYPHA_CODE . '/system/core/language.php';
		require_once HYPHA_CODE . '/system/core/HyphaRequest.php';
		$saved = $_SERVER;
		$_SERVER['HTTPS'] = 'on';
		$_SERVER['REQUEST_SCHEME'] = 'http';
		try {
			$scheme = (new HyphaRequest(null, 'nl/Start'))->getScheme();
		}
		finally {
			$_SERVER = $saved;
		}
		same('https', $scheme, 'getScheme() with HTTPS=on (SetEnv of the virtual host) and REQUEST_SCHEME=http');
	});

	known_bug(407, 'pages.php compiles without the ${var} deprecation', function () {
		$out = platform_lint('system/core/pages.php');
		contains('No syntax errors', $out, 'php -l system/core/pages.php');
		lacks('Deprecated', $out, 'php -l system/core/pages.php on PHP ' . PHP_VERSION);
	});

	known_bug(409, 'no parameter is implicitly nullable', function () {
		$files = ['system/core/events.php', 'system/datatypes/text.php', 'system/datatypes/mailinglist.php', 'system/datatypes/festival.php', 'system/datatypes/peer_reviewed_article.php'];
		//
		// From PHP 8.4 the compiler says so.
		//
		if (PHP_VERSION_ID >= 80400) {
			$found = [];
			foreach ($files as $file) foreach (explode("\n", platform_lint($file)) as $line) if (strpos($line, 'Implicitly marking parameter') !== false) $found[] = trim(preg_replace('/ in \/.*$/', '', $line));
			check(!$found, count($found) . ' deprecations on PHP ' . PHP_VERSION . ': ' . implode(' | ', array_slice($found, 0, 3)));
		}
		//
		// Before PHP 8.4 the compiler is silent: look for a typed parameter with default null and no ? in the source.
		//
		$found = [];
		foreach ($files as $file) {
			preg_match_all('/function\s+(\w+)\s*\(([^)]*)\)/', file_get_contents(HYPHA_CODE . '/' . $file), $functions, PREG_SET_ORDER);
			foreach ($functions as [, $name, $params]) {
				if (preg_match_all('/(?:^|,)\s*([A-Za-z_\\\\][\w\\\\]*)\s+&?(\$\w+)\s*=\s*null\b/i', $params, $m, PREG_SET_ORDER)) {
					foreach ($m as [, $type, $var]) if (strtolower($type) !== 'mixed') $found[] = basename($file) . " $name($type $var = null)";
				}
			}
		}
		check(!$found, count($found) . ' implicitly nullable parameters (deprecated from PHP 8.4; this is PHP ' . PHP_VERSION . '): ' . implode(', ', array_slice($found, 0, 3)));
	});

	known_bug(410, 'no call to mcrypt_create_iv(), removed in PHP 7.2, remains', function () {
		$found = [];
		foreach (platform_php_files('system') as $file) if (preg_match('/\bmcrypt_create_iv\s*\(/', file_get_contents(HYPHA_CODE . '/' . $file))) $found[] = $file;
		check(!$found, 'mcrypt_create_iv() is still called in ' . implode(', ', $found));
	});

	known_bug(558, 'the Mollie client does not call curl_close(), deprecated in PHP 8.5', function () {
		require_once HYPHA_CODE . '/system/mollie/api.php';
		//
		// A request that fails at once (nothing listens on port 9), so no payment provider is contacted.
		//
		$api = new MollieAPI('test_proef');
		$url = new ReflectionProperty('MollieAPI', 'api_url');
		$url->setValue($api, 'http://127.0.0.1:9/v2');
		$messages = [];
		set_error_handler(function ($severity, $message) use (&$messages) { $messages[] = $message; return true; });
		$log = ini_set('error_log', '/dev/null');
		try {
			$result = $api->getPayment('tr_proef');
		}
		finally {
			restore_error_handler();
			ini_set('error_log', $log);
		}
		same(false, $result, 'getPayment() of a request that fails');
		$found = array_values(array_filter($messages, fn ($m) => stripos($m, 'curl_close') !== false));
		check(!$found, count($found) . ' messages on PHP ' . PHP_VERSION . ': ' . implode(' | ', $found));
		//
		// Before PHP 8.5 the call is silent: check the source.
		//
		$calls = preg_match_all('/\bcurl_close\s*\(/', file_get_contents(HYPHA_CODE . '/system/mollie/api.php'));
		check(!$calls, "system/mollie/api.php calls curl_close() $calls times (deprecated from PHP 8.5; this is PHP " . PHP_VERSION . ')');
	});

	//
	// The installer that hypha.php builds: build it from a copy of the code with its own build command, and install it
	// once in a folder with an empty data/ and once in an empty folder. Each step runs PHP's built-in web server, as
	// tests/packaging/run.sh does. The result is kept for the tests of #526 and #522.
	//
	// Runs $callable with PHP warnings ignored (a connection that is not up yet, a page without body).
	function platform_quiet(callable $callable) {
		set_error_handler(fn () => true);
		try { return $callable(); }
		finally { restore_error_handler(); }
	}

	function platform_post(string $url, array $fields, string $cookie = ''): array {
		$context = stream_context_create(['http' => ['method' => 'POST', 'header' => "Content-Type: application/x-www-form-urlencoded\r\n" . ($cookie ? "Cookie: $cookie\r\n" : ''), 'content' => http_build_query($fields), 'ignore_errors' => true, 'timeout' => 60]]);
		[$body, $headers] = platform_quiet(function () use ($url, $context) {
			$body = file_get_contents($url, false, $context);
			// $http_response_header is deprecated from PHP 8.5; its successor exists from 8.4.
			return [$body, function_exists('http_get_last_response_headers') ? (http_get_last_response_headers() ?? []) : (${'http_' . 'response_header'} ?? [])];
		});
		$set = '';
		foreach ($headers as $h) if (stripos($h, 'Set-Cookie:') === 0) $set = trim(explode(';', substr($h, 11))[0]);
		return [$body === false ? '' : $body, $set];
	}

	function platform_serve(string $dir, int $port, callable $callable) {
		$server = proc_open([PHP_BINARY, '-d', 'display_errors=stderr', '-S', "127.0.0.1:$port", '-t', $dir], [0 => ['file', '/dev/null', 'r'], 1 => ['file', '/dev/null', 'w'], 2 => ['file', "$dir.log", 'a']], $pipes, $dir);
		try {
			for ($i = 0; $i < 50 && !platform_quiet(fn () => fsockopen('127.0.0.1', $port)); $i++) usleep(100000);
			return $callable("http://127.0.0.1:$port/");
		}
		finally {
			proc_terminate($server);
			proc_close($server);
		}
	}

	function platform_installer(): array {
		static $result = null;
		if ($result !== null) return $result;
		$work = sys_get_temp_dir() . '/hypha-platform-' . getmypid();
		exec('rm -rf ' . escapeshellarg($work) . ' && mkdir -p ' . escapeshellarg($work) . ' && cp -R ' . escapeshellarg(HYPHA_CODE) . ' ' . escapeshellarg("$work/tree") . ' && rm -f ' . escapeshellarg("$work/tree/data/hypha.xml"), $out, $code);
		if ($code !== 0) throw new RuntimeException('copying the code failed');
		$build = ['command' => 'build', 'username' => 'beheer', 'password' => 'proef-wachtwoord-520', 'build_system/datatypes/text' => 'on', 'build_system/datatypes/peer_reviewed_article' => 'on', 'build_system/languages/nl' => 'on', 'build_system/languages/en' => 'on'];
		$built = platform_serve("$work/tree", 18205, fn ($url) => platform_post($url . 'hypha.php', $build)[0]);
		if (strpos($built, '<?php') !== 0) throw new RuntimeException('the build gave no hypha.php: ' . substr($built, 0, 200));
		$install = ['command' => 'install', 'setupBaseUrl' => 'http://127.0.0.1/', 'setupTitle' => 'Proefsite Eemstad', 'setupDefaultPage' => 'Start', 'setupDefaultLanguage' => 'nl', 'setupEmail' => 'redactie@eemstad.example', 'setupUsername' => 'beheer', 'setupPassword' => 'proef-wachtwoord-520', 'setupFullname' => 'Beheerder Eemstad'];
		foreach (['with' => true, 'without' => false] as $name => $data) {
			mkdir("$work/$name" . ($data ? '/data' : ''), 0777, true);
			file_put_contents("$work/$name/hypha.php", $built);
			platform_serve("$work/$name", 18206, function ($url) use ($install) {
				[, $cookie] = platform_post($url . 'hypha.php', ['command' => 'login', 'username' => 'beheer', 'password' => 'proef-wachtwoord-520']);
				platform_post($url . 'hypha.php', $install, $cookie);
			});
		}
		return $result = ['source' => HYPHA_CODE, 'with' => "$work/with", 'without' => "$work/without"];
	}

	// The files under $dir in the code under test that are missing in the installed copy.
	function platform_missing(string $dir): array {
		$installed = platform_installer()['with'];
		$missing = [];
		if (!is_dir(HYPHA_CODE . "/$dir")) return ["$dir (not in the code)"];
		$it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator(HYPHA_CODE . "/$dir", FilesystemIterator::SKIP_DOTS));
		foreach ($it as $file) {
			$rel = substr($file->getPathname(), strlen(HYPHA_CODE) + 1);
			if (!is_file("$installed/$rel")) $missing[] = $rel;
		}
		sort($missing);
		return $missing;
	}

	known_bug(526, 'the built installer brings the subfolders of system/wymeditor', function () {
		check(is_file(platform_installer()['with'] . '/data/hypha.xml'), 'the installation in a folder with data/ made no data/hypha.xml');
		$missing = array_merge(platform_missing('system/wymeditor/skins'), platform_missing('system/wymeditor/lang'));
		check(!$missing, count($missing) . ' files of system/wymeditor/skins and lang are missing, such as ' . implode(', ', array_slice($missing, 0, 2)));
	});

	known_bug(526, 'the built installer brings system/assets, system/bowser, system/macros and the default theme', function () {
		$report = [];
		foreach (['system/assets', 'system/bowser', 'system/macros', 'data/themes/default'] as $dir) if ($missing = platform_missing($dir)) $report[] = "$dir: " . count($missing);
		check(!$report, 'missing files: ' . implode(', ', $report));
	});

	known_bug(526, 'the built installer installs in a folder without data/', function () {
		$dir = platform_installer()['without'];
		$log = is_file("$dir.log") ? trim(implode(' | ', array_slice(preg_grep('/Warning|Fatal/', file("$dir.log")), 0, 2))) : '';
		check(is_file("$dir/data/hypha.xml"), 'no data/hypha.xml after installing in an empty folder' . ($log ? ": $log" : ''));
	});

	known_bug(522, 'a new site has no image from another host in its footer', function () {
		$xml = file_get_contents(platform_installer()['with'] . '/data/hypha.xml');
		preg_match('/<footer>(.*?)<\/footer>/s', $xml, $m);
		check(isset($m[1]), 'no footer in the new hypha.xml');
		check(!preg_match('/<img[^>]*src="(https?:)?\/\/[^"]*/', $m[1], $img), 'the footer of a new site loads ' . ($img[0] ?? ''));
	});
