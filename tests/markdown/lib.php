<?php
	//
	// Minimal test framework: test() registers a test, check() and same() assert. A test passes when it runs to the
	// end without a failed assertion, an exception or a PHP message.
	//
	class HyphaTestFailure extends Exception {}

	class HyphaTest {
		public static array $tests = [];
		public static int $assertions = 0;

		public static function run(array $filters): int {
			$failed = 0;
			$passed = 0;
			$known = 0;
			$fixed = [];
			$started = microtime(true);
			foreach (self::$tests as [$name, $file, $callable, $issue]) {
				if ($filters && !array_filter($filters, fn ($f) => stripos($name, $f) !== false || stripos($file, $f) !== false)) continue;
				$t = microtime(true);
				try {
					$callable();
					if ($issue) {
						$fixed[] = $issue;
						printf("FIXED? #%-5d %s: passes, so issue #%d is probably solved\n", $issue, $name, $issue);
					}
					else {
						$passed++;
						printf("ok    %-70s %6.1f ms\n", $name, (microtime(true) - $t) * 1000);
					}
				}
				catch (HyphaTestFailure $e) {
					if ($issue) {
						$known++;
						printf("known #%-5d %s: %s\n", $issue, $name, mb_substr($e->getMessage(), 0, 120));
						continue;
					}
					$failed++;
					printf("FAIL  %-70s\n      %s: %s\n      at %s:%d\n", $name, get_class($e), $e->getMessage(), basename($e->getFile()), $e->getLine());
				}
				catch (Throwable $e) {
					//
					// A known bug fails on an assertion; any other error means the test itself is broken.
					//
					$failed++;
					printf("FAIL  %-70s%s\n      %s: %s\n      at %s:%d\n", $name, $issue ? " (known bug #$issue, but not an assertion)" : '', get_class($e), $e->getMessage(), basename($e->getFile()), $e->getLine());
				}
			}
			$extra = $known || $fixed ? sprintf(', %d known bugs, %d fixed? (%s)', $known, count($fixed), implode(' ', array_map(fn ($n) => "#$n", $fixed))) : '';
			printf("\nPHP %s: %d tests, %d passed, %d failed%s, %d assertions, %.1f s\n", PHP_VERSION, $passed + $failed + $known + count($fixed), $passed, $failed, $extra, self::$assertions, microtime(true) - $started);
			return $failed || $fixed ? 1 : 0;
		}
	}

	function test(string $name, callable $callable): void {
		$file = basename(debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS, 1)[0]['file']);
		HyphaTest::$tests[] = [$name, $file, $callable, 0];
	}

	//
	// A test of a known bug (tests/bekend/fouten.ndjson): it states the behaviour as it should be and is expected to
	// fail on an assertion until issue #$issue is solved. A pass means the issue is probably solved.
	//
	function known_bug(int $issue, string $name, callable $callable): void {
		$file = basename(debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS, 1)[0]['file']);
		HyphaTest::$tests[] = [$name, $file, $callable, $issue];
	}

	function check(bool $condition, string $message = 'condition is false'): void {
		HyphaTest::$assertions++;
		if (!$condition) throw new HyphaTestFailure($message);
	}

	function same($expected, $actual, string $message = ''): void {
		HyphaTest::$assertions++;
		if ($expected !== $actual) throw new HyphaTestFailure(($message ? $message . ': ' : '') . 'expected ' . var_export($expected, true) . ', got ' . var_export($actual, true));
	}

	function contains(string $needle, string $haystack, string $message = ''): void {
		HyphaTest::$assertions++;
		if (strpos($haystack, $needle) === false) throw new HyphaTestFailure(($message ? $message . ': ' : '') . 'missing ' . var_export($needle, true) . ' in ' . var_export(mb_substr($haystack, 0, 600), true));
	}

	function lacks(string $needle, string $haystack, string $message = ''): void {
		HyphaTest::$assertions++;
		if (stripos($haystack, $needle) !== false) throw new HyphaTestFailure(($message ? $message . ': ' : '') . 'unexpected ' . var_export($needle, true) . ' in ' . var_export(mb_substr($haystack, 0, 600), true));
	}

	function throws(callable $callable, string $class = Throwable::class): void {
		HyphaTest::$assertions++;
		try { $callable(); }
		catch (Throwable $e) {
			if ($e instanceof $class) return;
			throw $e;
		}
		throw new HyphaTestFailure("expected $class");
	}
