#!/bin/sh
#
# Integration tests: start Hypha on one PHP version in a container (the image of docs/container/Containerfile, with
# the source tree of this repository mounted read-only), with a fresh fictional test site, run the tests in
# tests/integratie/test_*.py over HTTP, and fail on any PHP message in the log of the container.
#
# Usage, from the root of the repository: sh tests/integratie/run.sh 8.2 [test file ...]
#
set -e
cd "$(dirname "$0")/../.."
KNOWN=$(mktemp) && python3 -I tests/bekend/meldingen.py > "$KNOWN"
V=${1:-8.2}
shift || true
ENGINE=${ENGINE:-docker}
PORT=$((8150 + $(echo "$V" | cut -d. -f2)))
SMTP_PORT=$((8160 + $(echo "$V" | cut -d. -f2)))
NAME=hypha-md-test-$(echo "$V" | tr -d .)
#
# Outside the repository: a folder below the mounted source tree cannot be mounted a second time for writing.
#
# A new folder per run: Docker Desktop may keep showing the old contents of a folder that was removed and made again.
#
WORK="${HYPHA_TEST_WORK:-/tmp/hypha-md-test}/php$V-$(date +%s)"
rm -rf "${HYPHA_TEST_WORK:-/tmp/hypha-md-test}"/php$V-* 2>/dev/null || true
if ! $ENGINE image inspect hypha-md:php$V >/dev/null 2>&1; then
	$ENGINE build -q --build-arg PHP_VERSION=$V -t hypha-md:php$V -f docs/container/Containerfile . >/dev/null
fi
$ENGINE rm -f $NAME >/dev/null 2>&1 || true
rm -rf "$WORK" && mkdir -p "$WORK/data/themes" && cp -R data/themes/default "$WORK/data/themes/"
$ENGINE run --rm -v "$PWD":/src:ro -v "$WORK":/work -w /src php:$V-cli php tests/site/maak-site.php /work/data >/dev/null
#
# Mail goes over SMTP to the server of tests/integratie/test_mail.py on the host (tests/integratie/sendmail.php).
#
printf 'sendmail_path = "php /var/www/html/tests/integratie/sendmail.php host.docker.internal %s"\n' $SMTP_PORT > "$WORK/mail.ini"
chmod -R a+rwX "$WORK"
$ENGINE run -d --name $NAME -p 127.0.0.1:$PORT:8080 --memory 256m -v "$PWD":/var/www/html:ro -v "$WORK/data":/var/www/html/data -v "$WORK/mail.ini":/usr/local/etc/php/conf.d/zzz-hypha-mail.ini:ro hypha-md:php$V >/dev/null
for i in $(seq 1 50); do [ "$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:$PORT/nl/Start")" = 200 ] && break; sleep 0.2; done
status=0
for t in ${@:-tests/integratie/test_*.py}; do
	HYPHA_WORK="$WORK" HYPHA_SMTP_PORT=$SMTP_PORT python3 -I "$t" "http://127.0.0.1:$PORT" || status=1
done
#
# Messages that already occur on the main branch without the editor are listed in tests/bekend/meldingen.ndjson and only
# counted; any other PHP message fails the run.
#
echo "== PHP messages in the log of $NAME (known ones: $($ENGINE logs $NAME 2>&1 | grep -c -F -f "$KNOWN" || true)):"
if $ENGINE logs $NAME 2>&1 | grep -E 'PHP (Warning|Notice|Deprecated|Fatal|Parse)|Uncaught' | grep -v -F -f "$KNOWN" | sort | uniq -c | sort -rn | head -20 | grep .; then
	status=1
else
	echo "   none"
fi
[ -n "$KEEP" ] || $ENGINE rm -f $NAME >/dev/null
exit $status
