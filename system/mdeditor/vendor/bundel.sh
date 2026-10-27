#!/bin/sh
#
# Bundle the browser libraries again (decision T9). Development machine only: needs Node.js; installation does not.
#
# Usage, from the root of the repository: sh system/mdeditor/vendor/bundel.sh
#
set -e
cd "$(dirname "$0")/../../../tools/bundel"
npm ci --no-audit --no-fund
node bundel.mjs
