#!/bin/sh
#
# Browser tests against Hypha on one PHP version: start the container of the integration tests, keep it running for
# the browser, then remove it. Needs Node.js on the development machine (npm install in tests/browser once).
#
# Usage, from the root of the repository: sh tests/browser/run.sh 8.2 [filter ...]
#
set -e
cd "$(dirname "$0")/../.."
V=${1:-8.2}
shift || true
ENGINE=${ENGINE:-docker}
[ -d tests/browser/node_modules ] || (cd tests/browser && npm install --no-audit --no-fund >/dev/null)
KEEP=1 sh tests/integratie/run.sh "$V" tests/integratie/test_site.py >/dev/null
PORT=$((8150 + $(echo "$V" | cut -d. -f2)))
status=0
node tests/browser/run.mjs "http://127.0.0.1:$PORT" "$@" || status=1
NAME=hypha-md-test-$(echo "$V" | tr -d .)
echo "== PHP messages in the log of $NAME after the browser tests:"
if $ENGINE logs $NAME 2>&1 | grep -E 'PHP (Warning|Notice|Deprecated|Fatal|Parse)|Uncaught' | grep -v -F -f tests/integratie/bekende-meldingen.txt | sort | uniq -c | sort -rn | head -20 | grep .; then status=1; else echo "   none"; fi
$ENGINE rm -f $NAME >/dev/null
exit $status
