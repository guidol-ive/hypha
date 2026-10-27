#!/bin/sh
# Report PHP deprecations in the Hypha sources for every supported PHP version.
#
# Usage, from the root of the repository, with podman or docker:
#
#   sh docs/container/check_deprecations.sh [podman|docker]
#
# Three checks per version, all in the official php:<version>-cli image:
#   1. "php -l" on every PHP file outside the bundled third-party folders: compile time
#      deprecations such as "${var}" interpolation (8.2) and implicitly nullable parameters (8.4).
#   2. A scan for calls of functions that are deprecated or removed in 8.2 up to 8.5.
#   3. Not here: run time deprecations (dynamic properties, null to non-nullable internal
#      parameters) only show while the code runs; collect them from the container log after
#      smoke_test.py, see docs/technical/TESTING.md.
ENGINE=${1:-podman}
VERSIONS="8.2 8.3 8.4 8.5"
EXCLUDE='./system/wymeditor/*|./system/php-dom-wrapper/*|./system/mollie/*|./system/bowser/*'

for version in $VERSIONS; do
	echo "== PHP $version: php -l"
	$ENGINE run --rm -v "$PWD":/src:ro -w /src "docker.io/library/php:$version-cli" sh -c "
		find . -name '*.php' -not -path './system/wymeditor/*' -not -path './system/php-dom-wrapper/*' \
			-not -path './system/mollie/*' -not -path './system/bowser/*' -not -path './.git/*' \
			| sort | while read f; do php -d error_reporting=-1 -d display_errors=1 -l \"\$f\" 2>&1; done \
			| grep -v '^No syntax errors' | sort | uniq -c"
done

echo "== Calls of functions deprecated or removed in PHP 8.1 up to 8.5"
# 8.1: strftime, gmstrftime, date_sunrise, date_sunset, mhash*, FILTER_SANITIZE_STRING
# 8.2: utf8_encode, utf8_decode
# 8.3: (no functions, but assert_options and U_MULTIPLE_DECIMAL_SEPERATORS)
# 8.4: xml_set_object, md5_file/sha1_file not deprecated; lcg_value, mysqli_ping, session_set_save_handler with more than two arguments
# 8.5: curl_close, imagedestroy, finfo_close, xml_parser_free, socket_set_timeout, key_exists, "backtick" operator
# Removed earlier but still seen in old code: mcrypt_*, each, create_function, money_format
grep -rnE '\b(strftime|gmstrftime|date_sunrise|date_sunset|mhash[a-z_]*|utf8_encode|utf8_decode|assert_options|lcg_value|xml_set_object|curl_close|imagedestroy|finfo_close|xml_parser_free|key_exists|socket_set_timeout|mcrypt_[a-z_]+|each|create_function|money_format)\s*\(|FILTER_SANITIZE_STRING|FILTER_SANITIZE_STRIPPED' \
	--include='*.php' . | grep -vE "^(${EXCLUDE})" | grep -vE '^\./\.git/' || echo "none found"
