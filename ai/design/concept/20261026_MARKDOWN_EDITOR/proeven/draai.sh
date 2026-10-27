#!/bin/sh
#
# Run the experiments of the technical design again, on the development machine.
# Needs Docker (images with PHP 8.2 and 8.4), Node.js and Google Chrome. Nothing of this runs on the server.
#
# Usage: sh draai.sh [php82-image] [php84-image]
#
set -e
cd "$(dirname "$0")"
PHP82=${1:-php:8.2-cli}
PHP84=${2:-php:8.4-cli}
#
# Test data that is not in git: the CommonMark and GFM specifications, Pele and Temml.
#
mkdir -p data
[ -f data/spec.json ] || curl -sL -o data/spec.json https://spec.commonmark.org/0.31.2/spec.json
[ -f data/gfm-spec.txt ] || curl -sL -o data/gfm-spec.txt https://raw.githubusercontent.com/github/cmark-gfm/master/test/spec.txt
[ -f data/pele.global.js ] || curl -sL -o data/pele.global.js https://cdn.jsdelivr.net/npm/pele@1.10.1/dist/pele.global.js
[ -f data/temml.min.js ] || curl -sL -o data/temml.min.js https://cdn.jsdelivr.net/npm/temml@0.14.0/dist/temml.min.js
#
# PHP libraries with Composer in a container, then the server experiments on PHP 8.2 and 8.4.
#
mkdir -p php && cp composer.json php/
docker run --rm -v "$PWD/php":/app -w /app composer:2 install --no-dev --no-interaction --no-progress
(cd js && npm install --no-audit --no-fund && node maak-svg.mjs && node bundel.mjs)
docker run --rm -v "$PWD":/to -w /to "$PHP82" php -d memory_limit=512M proef-server.php > uitkomsten/result-php8.2.json
docker run --rm -v "$PWD":/to -w /to "$PHP84" php -d memory_limit=512M proef-server.php > uitkomsten/result-php8.4.json
docker run --rm -v "$PWD":/to -w /to "$PHP82" php league-corpus.php
docker run --rm -v "$PWD":/to -w /to "$PHP82" php proef-paginanaam.php > uitkomsten/result-paginanaam.json
(cd js && node proef-parsers.mjs > ../uitkomsten/result-parsers.json)
#
# The browser pages (browser/rt.html, rt2.html, rt3.html) and the plaktest comparison run in a browser;
# serve this folder with: python3 -m http.server 8767 --bind 127.0.0.1
#
echo "Klaar. Open http://127.0.0.1:8767/browser/rt.html voor de proeven in de browser."
