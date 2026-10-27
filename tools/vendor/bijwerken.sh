#!/bin/sh
#
# Install or update the PHP libraries of the Markdown editor in system/vendor/.
# Runs on the development machine only, with Composer in a container; nothing of this runs at installation.
#
# Usage, from the root of the repository: sh tools/vendor/bijwerken.sh [update]
#
set -e
cd "$(dirname "$0")/../.."
docker run --rm -v "$PWD":/app -w /app/tools/vendor composer:2 ${1:-install} --no-dev --no-interaction --no-progress
V=system/vendor
#
# highlight.php: keep only the ten languages of the design (section 10.1); the rest can be copied in later.
#
for f in $V/scrivo/highlight.php/Highlight/languages/*.json; do
	case "$(basename "$f" .json)" in
		php|javascript|sql|python|xml|css|json|yaml|bash) ;;
		*) rm "$f" ;;
	esac
done
rm -rf $V/scrivo/highlight.php/styles $V/scrivo/highlight.php/README.md $V/scrivo/highlight.php/CONTRIBUTING.md $V/scrivo/highlight.php/AUTHORS.txt
find $V -name '*.md' ! -iname 'license*' -delete
find $V -name '.*' -type f -delete
#
# The licence texts, one file per package. nette/schema and nette/utils are triple licensed (BSD-3, GPL-2.0, GPL-3.0);
# Hypha uses them under BSD-3, as recorded in LICENSES/README.txt.
#
mkdir -p $V/LICENSES
for l in $(find $V -maxdepth 3 -iname 'license*' -type f ! -path "$V/LICENSES/*"); do
	p=$(echo "$l" | cut -d/ -f3-4)
	cp "$l" "$V/LICENSES/$(echo "$p" | tr / _).txt"
done
cat > $V/LICENSES/README.txt <<'TXT'
Licences of the PHP libraries in system/vendor/, used by the Markdown editor of Hypha.

league/commonmark          BSD-3-Clause
league/config              BSD-3-Clause
dflydev/dot-access-data    MIT
nette/schema               BSD-3-Clause (chosen from BSD-3-Clause, GPL-2.0-only, GPL-3.0-only)
nette/utils                BSD-3-Clause (chosen from BSD-3-Clause, GPL-2.0-only, GPL-3.0-only)
psr/event-dispatcher       MIT
symfony/deprecation-contracts MIT
symfony/polyfill-php80     MIT
masterminds/html5          MIT
scrivo/highlight.php       BSD-3-Clause
composer (autoloader)      MIT
TXT
echo "system/vendor: $(find $V -name '*.php' | wc -l) PHP files, $(du -sh $V | cut -f1)"
