# Testing a change

There is no automated suite in CI yet (NS-GLE-2026W44-hypha-009). The checks below run by hand; the
first three need only a container engine and Python 3, the browser tests also Node.js on the
development machine (never on the server).

## 0. One command per PHP version

```bash
sh tests/run.sh 8.2               # unit tests: tests/HyphaRequestTest.php and tests/markdown/
sh tests/run.sh 8.2 integratie    # plus the integration tests over HTTP (tests/integratie/)
sh tests/run.sh 8.2 browser       # plus the browser tests in headless Chrome (tests/browser/)
```

Replace `8.2` by `8.3`, `8.4` or `8.5`. `ENGINE=podman` uses Podman instead of Docker.

1. **Unit tests** (`tests/markdown/run.php`) run in the official `php:<version>-cli` image. The
   runner is self-made, in the style of `HyphaRequestTest.php`; every PHP warning, notice or
   deprecation fails the test that caused it. It ends with a line such as
   `PHP 8.2.35: 120 tests, 120 passed, 0 failed`.
2. **Integration tests** (`tests/integratie/run.sh`) build the image of
   [`docs/container/Containerfile`](../../docs/container/Containerfile) once per version
   (`hypha-md:php8.2`), start it with this source tree mounted read-only and a fresh fictional
   site made by `tests/site/maak-site.php` (five test users, seven tags, all made up), and run
   `tests/integratie/test_*.py` over HTTP. Afterwards every PHP message in the container log
   fails the run, except the messages that already occur without the editor, listed in
   `tests/integratie/bekende-meldingen.txt`.
3. **Browser tests** (`tests/browser/run.sh`) start the same container and run
   `tests/browser/run.mjs` with Playwright on the installed Google Chrome, headless: the unit
   pages in `tests/browser/unit/` and the end-to-end tests in `tests/browser/e2e/`. Run
   `npm install` in `tests/browser/` once.

## 1. Unit test of request parsing

```bash
podman run --rm -v "$PWD":/src:ro -w /src docker.io/library/php:8.2-cli php tests/HyphaRequestTest.php
```

Prints a table of URLs and their parsed parts, then "asserted 84 tests". A failed assertion is
marked in the table.

## 2. Deprecations

```bash
sh docs/container/check_deprecations.sh podman
```

Runs `php -l` with all errors on for PHP 8.2, 8.3, 8.4 and 8.5, and scans for functions that are
deprecated or removed. A change must not add lines to its output. The state of 2026-10-26 is in
[`../../ai/measurement/20261026_PHP_DEPRECATIONS.md`](../../ai/measurement/20261026_PHP_DEPRECATIONS.md).

## 3. Smoke test against real data

Build and start the container on the lowest and the highest supported PHP version with a **copy**
of a site's data ([CONTAINER.md](CONTAINER.md)), then:

```bash
python3 -I docs/container/smoke_test.py http://localhost:8086 hypha-data/hypha.xml
podman logs hypha 2>&1 | grep 'PHP ' | cut -c40- | sort | uniq -c | sort -rn | head -30
```

The script requests every page in every language, plus the index, settings, `hypha.php` and a few
addresses that must be refused (`data/hypha.xml`, `system/core/base.php`). It exits with 1 if any
request gives a status other than 200, 302, 303, 403 or 404, or contains "Fatal error". Private
pages give 404 to anonymous visitors.

Compare the log with the previous run: no new `Fatal error`, `Uncaught`, `Warning` or `Deprecated`
lines may appear.

### Logged in

Anonymous requests do not reach the member views, which is where the 2026-10 regressions were
(82 failing article pages). To test logged in, add a test administrator to the **copy** of
`hypha.xml` (a `user` element with `rights="admin"` and a `password` made with PHP's
`password_hash`), log in with a POST of `command=login`, `loginUsername`, `loginPassword` and the
`csrfToken` from the form of the home page, keep the session cookie, and request every page and
its `/edit` view. A script for this is a next step (part of NS-GLE-2026W44-hypha-009).

## Data for tests

Use a copy of real data only locally. It contains personal data
([DATA_MODEL.md](DATA_MODEL.md#personal-data)); never commit it or attach it to an issue.
