#!/bin/sh
#
# Integration test on the golden dataset (design section 12.13): make the data folder of all items with
# tests/gouden/maak.php, start Hypha on it, request every page (anonymous and as a member, the edit view of a sample),
# and fail on any status other than expected or any new PHP message in the log.
#
# Usage, from the root of the repository: sh tests/integratie/gouden.sh 8.2 [count, default 10000] [sample of members]
#
set -e
cd "$(dirname "$0")/../.."
V=${1:-8.2}
COUNT=${2:-10000}
ENGINE=${ENGINE:-docker}
PORT=$((8170 + $(echo "$V" | cut -d. -f2)))
NAME=hypha-md-gold-$(echo "$V" | tr -d .)
WORK="${HYPHA_TEST_WORK:-/tmp/hypha-md-test}/gold$V-$(date +%s)"
rm -rf "${HYPHA_TEST_WORK:-/tmp/hypha-md-test}"/gold$V-* 2>/dev/null || true
mkdir -p "$WORK/data/themes" && cp -R data/themes/default "$WORK/data/themes/"
$ENGINE run --rm -v "$PWD":/src:ro -v "$WORK":/work -w /src php:$V-cli php -d memory_limit=2G tests/gouden/maak.php data /work/data "$COUNT"
chmod -R a+rwX "$WORK"
$ENGINE rm -f $NAME >/dev/null 2>&1 || true
$ENGINE run -d --name $NAME -p 127.0.0.1:$PORT:8080 --memory 256m -v "$PWD":/var/www/html:ro -v "$WORK/data":/var/www/html/data hypha-md:php$V >/dev/null
for i in $(seq 1 100); do [ "$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:$PORT/nl/Start")" = 200 ] && break; sleep 0.3; done
status=0
HYPHA_WORK="$WORK" python3 -I tests/integratie/gouden.py "http://127.0.0.1:$PORT" "$WORK/data/hypha.xml" ${3:-200} || status=1
echo "== PHP messages in the log of $NAME (known ones: $($ENGINE logs $NAME 2>&1 | grep -c -F -f tests/integratie/bekende-meldingen.txt || true)):"
if $ENGINE logs $NAME 2>&1 | grep -E 'PHP (Warning|Notice|Deprecated|Fatal|Parse)|Uncaught' | grep -v -F -f tests/integratie/bekende-meldingen.txt | sort | uniq -c | sort -rn | head -20 | grep .; then status=1; else echo "   none"; fi
[ -n "$KEEP" ] || $ENGINE rm -f $NAME >/dev/null
exit $status
