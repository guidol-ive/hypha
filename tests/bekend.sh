#!/bin/sh
#
# Known bugs: the tests in tests/bekend state the behaviour as it should be for every open bug on GitHub that can be
# tested, and are expected to fail until the bug is solved. Run them against a version of Hypha, by default main:
# "known" means the bug is still there, "FIXED?" that the issue can probably be closed (the run then fails), "FAIL"
# that a test is broken. The register is tests/bekend/fouten.ndjson.
#
# Usage, from the root of the repository: sh tests/bekend.sh 8.2 [git ref or folder, default upstream/main] [filter ...]
#   A ref is checked out in a separate worktree; a folder (for example .) is used as it is. The fictional test site
#   and the tests always come from this checkout.
#   ONLY=<area> runs only tests/bekend/test_<area>.py, <Area>Test.php and browser/<area>.mjs; PORT and NAME choose
#   the port and container name, so several runs can go at the same time.
#
set -e
cd "$(dirname "$0")/.."
V=${1:-8.2}
REF=${2:-upstream/main}
shift 2 2>/dev/null || shift $#
ENGINE=${ENGINE:-docker}
export PYTHONDONTWRITEBYTECODE=1
PORT=${PORT:-$((8180 + $(echo "$V" | cut -d. -f2)))}
NAME=${NAME:-hypha-bekend-$(echo "$V" | tr -d .)}
ONLY=${ONLY:-}
BASE="${HYPHA_TEST_WORK:-/tmp/hypha-md-test}"
if [ -d "$REF" ]; then
	CODE=$(cd "$REF" && pwd)
else
	SHA=$(git rev-parse --short "$REF")
	CODE="$BASE/code-$SHA"
	[ -d "$CODE" ] || git worktree add --detach "$CODE" "$SHA" >/dev/null 2>&1
fi
echo "== known bugs on PHP $V against $REF ($CODE)"
python3 -I tests/bekend/register.py || exit 1
#
# A fresh fictional site; mail goes to data/mail.log (a wrapper that ignores the -f argument of mail()).
#
WORK="$BASE/$NAME-$(date +%s)"
rm -rf "$BASE"/$NAME-* 2>/dev/null || true
mkdir -p "$WORK/data/themes" && cp -R data/themes/default "$WORK/data/themes/"
$ENGINE run --rm -v "$PWD":/src:ro -v "$WORK":/work -w /src php:$V-cli php tests/site/maak-site.php /work/data >/dev/null
printf '#!/bin/sh\ncat >> /var/www/html/data/mail.log\n' > "$WORK/mailcat" && chmod a+rx "$WORK/mailcat"
printf 'sendmail_path = "/usr/local/bin/mailcat"\n' > "$WORK/mail.ini"
chmod -R a+rwX "$WORK"
if ! $ENGINE image inspect hypha-md:php$V >/dev/null 2>&1; then
	$ENGINE build -q --build-arg PHP_VERSION=$V -t hypha-md:php$V -f docs/container/Containerfile . >/dev/null
fi
$ENGINE rm -f $NAME >/dev/null 2>&1 || true
$ENGINE run -d --name $NAME -p 127.0.0.1:$PORT:8080 --memory 256m -v "$CODE":/var/www/html:ro -v "$WORK/data":/var/www/html/data \
	-v "$WORK/mailcat":/usr/local/bin/mailcat:ro -v "$WORK/mail.ini":/usr/local/etc/php/conf.d/zz-mail.ini:ro hypha-md:php$V >/dev/null
for i in $(seq 1 50); do [ "$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:$PORT/nl/Start")" = 200 ] && break; sleep 0.2; done
status=0
echo "== PHP"
$ENGINE run --rm -v "$PWD":/src:ro -v "$CODE":/code:ro -w /src php:$V-cli php tests/bekend/run.php /code ${ONLY:+"$ONLY"} "$@" | grep -v '^ok ' || status=1
echo "== HTTP"
for t in tests/bekend/test_${ONLY:-*}.py; do
	[ -f "$t" ] || continue
	HYPHA_WORK="$WORK" HYPHA_CODE="$CODE" python3 -I "$t" "http://127.0.0.1:$PORT" "$@" || status=1
done
if ls tests/bekend/browser/${ONLY:-*}.mjs >/dev/null 2>&1; then
	echo "== browser"
	[ -d tests/browser/node_modules ] || (cd tests/browser && npm install --no-audit --no-fund >/dev/null)
	E2E=tests/bekend/browser node tests/browser/run.mjs "http://127.0.0.1:$PORT" ${ONLY:+"$ONLY"} "$@" || status=1
fi
#
# The known PHP messages of main, each with its issue: a message that no longer occurs may mean the issue is solved
# (or that no test reached that code). Only reported.
#
echo "== known PHP messages (tests/bekend/meldingen.ndjson)"
$ENGINE logs $NAME > "$WORK/php.log" 2>&1 || true
python3 -I - "$WORK/php.log" <<'PY'
import json, sys
log = open(sys.argv[1], encoding="utf-8", errors="replace").read()
for line in open("tests/bekend/meldingen.ndjson", encoding="utf-8"):
    m = json.loads(line)
    n = log.count(m["message"])
    print(f"   {n:6d}  {('#' + str(m['issue'])) if m.get('issue') else '-':6}  {m['message'][:90]}")
PY
[ -n "$KEEP" ] || $ENGINE rm -f $NAME >/dev/null
exit $status
