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
			$started = microtime(true);
			foreach (self::$tests as [$name, $file, $callable]) {
				if ($filters && !array_filter($filters, fn ($f) => stripos($name, $f) !== false || stripos($file, $f) !== false)) continue;
				$t = microtime(true);
				try {
					$callable();
					$passed++;
					printf("ok    %-70s %6.1f ms\n", $name, (microtime(true) - $t) * 1000);
				}
				catch (Throwable $e) {
					$failed++;
					printf("FAIL  %-70s\n      %s: %s\n      at %s:%d\n", $name, get_class($e), $e->getMessage(), basename($e->getFile()), $e->getLine());
				}
			}
			printf("\nPHP %s: %d tests, %d passed, %d failed, %d assertions, %.1f s\n", PHP_VERSION, $passed + $failed, $passed, $failed, self::$assertions, microtime(true) - $started);
			return $failed ? 1 : 0;
		}
	}

	function test(string $name, callable $callable): void {
		$file = basename(debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS, 1)[0]['file']);
		HyphaTest::$tests[] = [$name, $file, $callable];
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
