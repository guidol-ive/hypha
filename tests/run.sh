#!/bin/sh
#
# Run the tests of Hypha on one PHP version, in a container. One command per PHP version (design section 12.13).
#
# Usage, from the root of the repository:
#   sh tests/run.sh 8.2              unit tests (tests/HyphaRequestTest.php and tests/markdown/)
#   sh tests/run.sh 8.2 integratie   also the integration tests against Hypha in a container (tests/integratie/)
#   sh tests/run.sh 8.2 browser      also the browser tests in headless Chromium (tests/browser/, needs Node.js)
#
# The container engine is docker unless ENGINE is set, for example ENGINE=podman.
#
set -e
cd "$(dirname "$0")/.."
V=${1:-8.2}
WHAT=${2:-unit}
ENGINE=${ENGINE:-docker}
status=0
echo "== PHP $V: tests/HyphaRequestTest.php"
$ENGINE run --rm -v "$PWD":/src:ro -w /src php:$V-cli php -d error_reporting=-1 tests/HyphaRequestTest.php | tail -1 || status=1
echo "== PHP $V: tests/markdown"
$ENGINE run --rm -v "$PWD":/src:ro -w /src php:$V-cli php -d memory_limit=1G tests/markdown/run.php || status=1
if [ "$WHAT" = integratie ] || [ "$WHAT" = browser ] || [ "$WHAT" = alles ]; then
	echo "== PHP $V: tests/integratie"
	sh tests/integratie/run.sh "$V" || status=1
fi
if [ "$WHAT" = browser ] || [ "$WHAT" = alles ]; then
	echo "== PHP $V: tests/browser"
	sh tests/browser/run.sh "$V" || status=1
fi
exit $status
