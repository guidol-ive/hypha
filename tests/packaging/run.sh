#!/bin/sh
#
# Packaging (task T14): build hypha.php from this tree with its own build command, install it in an empty folder, and
# check that the Markdown editor came along and works: the files of system/mdeditor/, system/vendor/ and
# system/core/markdown/, and Markdown rendered by the installed copy. Runs in the official PHP CLI image with the
# built-in web server; nothing is installed on the host.
#
# Usage, from the root of the repository: sh tests/packaging/run.sh 8.2
#
set -e
cd "$(dirname "$0")/../.."
V=${1:-8.2}
WORK="${HYPHA_TEST_WORK:-/tmp/hypha-md-test}/hypha-php-$V-$(date +%s)"
mkdir -p "$WORK/install"
docker run --rm -v "$PWD":/src:ro -v "$WORK":/work php:$V-cli sh -c '
	set -e
	cp -R /src /work/tree && cd /work/tree && rm -rf data/hypha.xml
	post() { php -r '\''$c = stream_context_create(["http" => ["method" => "POST", "header" => "Content-Type: application/x-www-form-urlencoded\r\n" . (getenv("COOKIE") ? "Cookie: " . getenv("COOKIE") . "\r\n" : ""), "content" => $argv[2], "ignore_errors" => true]]); $b = file_get_contents($argv[1], false, $c); foreach ($http_response_header as $h) if (stripos($h, "Set-Cookie:") === 0) fwrite(STDERR, trim(explode(";", substr($h, 11))[0])); echo $b;'\'' "$1" "$2"; }
	php -S 127.0.0.1:8199 >/dev/null 2>&1 & P=$!; sleep 1
	post http://127.0.0.1:8199/hypha.php "command=build&username=beheer&password=proef-wachtwoord-520&build_system/datatypes/text=on&build_system/datatypes/peer_reviewed_article=on&build_system/languages/nl=on&build_system/languages/en=on" > /work/hypha.php 2>/dev/null
	kill $P
	#
	# The installer of hypha.php needs data/ to exist and does not pack the theme (data/themes/default); both were so
	# before the editor (see BOUWLOG, T14). The test makes the folder, so it can check what the editor needs.
	#
	cp /work/hypha.php /work/install/ && cd /work/install && mkdir data
	php -S 127.0.0.1:8198 >/dev/null 2>&1 & P=$!; sleep 1
	COOKIE=$(post http://127.0.0.1:8198/hypha.php "command=login&username=beheer&password=proef-wachtwoord-520" 2>&1 >/dev/null)
	COOKIE=$COOKIE post http://127.0.0.1:8198/hypha.php "command=install&setupBaseUrl=http://127.0.0.1:8198/&setupTitle=Proef&setupDefaultPage=Start&setupDefaultLanguage=nl&setupEmail=redactie@eemstad.example&setupUsername=beheer&setupPassword=proef-wachtwoord-520&setupFullname=Beheer" >/dev/null 2>\&1
	kill $P
	echo "hypha.php: $(wc -c < /work/hypha.php) bytes"
	for f in system/core/markdown.php system/core/mdeditor.php system/core/markdown_article.php system/core/markdown/HyphaFilter.php system/vendor/autoload.php system/vendor/league/commonmark/src/MarkdownConverter.php system/mdeditor/editor.js system/mdeditor/vendor/codemirror-6.36.8.js system/mdeditor/vendor/LICENSES/README.txt data/hypha.xml; do
		[ -f "$f" ] && echo "ok    $f" || { echo "FAIL  $f missing"; exit 1; }
	done
	php -r "chdir(\"/work/install\"); require \"system/core/markdown.php\"; hypha_markdownLoad(); \$m = new HyphaMarkdown(); echo (strpos(\$m->toXhtml(\"> [!info] Kader\n> tekst\"), \"callout info\") !== false ? \"ok    Markdown renders in the installed copy\" : \"FAIL  render\"), PHP_EOL;"
'
