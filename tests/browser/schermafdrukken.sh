#!/bin/sh
#
# Screenshots for the handbook: start Hypha on the fictional test site in a container, make the screenshots in
# docs/handleiding/afbeeldingen/, then remove the container.
#
# Usage, from the root of the repository: sh tests/browser/schermafdrukken.sh [8.4]
#
set -e
cd "$(dirname "$0")/../.."
V=${1:-8.4}
ENGINE=${ENGINE:-docker}
[ -d tests/browser/node_modules ] || (cd tests/browser && npm install --no-audit --no-fund >/dev/null)
KEEP=1 sh tests/integratie/run.sh "$V" tests/integratie/test_site.py >/dev/null
PORT=$((8150 + $(echo "$V" | cut -d. -f2)))
#
# With HYPHA_THEME=<data folder of a site> the theme destadsbron of that site is used: only the theme folder and the
# style sheets in data/css, without the files of the theme and without the statistics script, so no page view leaves
# this machine. The theme is not in the repository; the site content is never read.
#
if [ -n "$HYPHA_THEME" ]; then
	WORK=$(ls -dt /tmp/hypha-md-test/php$V-* | head -1)
	mkdir -p "$WORK/data/themes/destadsbron" "$WORK/data/css"
	(cd "$HYPHA_THEME/themes/destadsbron" && tar cf - --exclude ./files .) | (cd "$WORK/data/themes/destadsbron" && tar xf -)
	cp "$HYPHA_THEME"/css/*.css "$WORK/data/css/"
	perl -0pi -e 's/<!-- Matomo -->.*?<!-- End Matomo Code -->//s' "$WORK/data/themes/destadsbron/hypha.html"
	perl -0pi -e 's/<hypha type="project"/<hypha type="project" theme="destadsbron"/' "$WORK/data/hypha.xml"
	chmod -R a+rwX "$WORK/data"
fi
status=0
node tests/browser/schermafdrukken.mjs "http://127.0.0.1:$PORT" || status=1
$ENGINE rm -f hypha-md-test-$(echo "$V" | tr -d .) >/dev/null
exit $status
