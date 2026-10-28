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
   `tests/bekend/meldingen.ndjson` with the issue that will remove each one.
3. **Browser tests** (`tests/browser/run.sh`) start the same container and run
   `tests/browser/run.mjs` with Playwright on the installed Google Chrome, headless: the unit
   pages in `tests/browser/unit/` and the end-to-end tests in `tests/browser/e2e/`. Run
   `npm install` in `tests/browser/` once.

## 0a. Known bugs: what should work, and what is known not to work yet

Every test is one of two kinds:

1. **Should work**: `test(...)`, `@test`, `t.test(...)`. A failure fails the run.
2. **Known bug**: `known_bug(N, ...)` (PHP), `@known_bug(N)` (Python), `t.knownBug(N, ...)` and
   `knownBug(N, ...)` (browser). It states the behaviour *as it should be*, for the open GitHub issue
   #N, and is expected to fail on an assertion until that issue is solved. The runners print
   - `known #N`: it failed on an assertion, so the bug is still there; the run stays green;
   - `FIXED? #N`: it passed, so the issue is probably solved; the run fails, so someone closes the issue
     and moves the test to the ordinary tests;
   - `FAIL`: it failed in another way (an exception, a crash of the test itself): the test is broken.

   The summary line counts them: `integratie: 12 tests, 0 passed, 0 failed, 11 known bugs, 1 fixed? (#579)`.

The known-bug tests are in `tests/bekend/` and test the code of main, not of this branch:

```bash
sh tests/bekend.sh 8.2                          # against upstream/main, in a separate worktree
sh tests/bekend.sh 8.2 origin/<branch>          # against a pull request: its tests should say FIXED?
sh tests/bekend.sh 8.2 .                        # against this checkout: which bugs it already solves
ONLY=paginas sh tests/bekend.sh 8.5             # one area: test_paginas.py, PaginasTest.php, browser/paginas.mjs
```

The register `tests/bekend/fouten.ndjson` has one JSON object per line, one per test:
`{"issue": 541, "runner": "integratie", "file": "tests/bekend/test_platform.py", "test": "...",
"title": "...", "since": "2026-10-28"}`. `python3 -I tests/bekend/register.py` checks that the code and
the register agree; with `--github` also that every issue is still open. `tests/bekend.sh` runs that
check first, and ends with how often each known PHP message of `tests/bekend/meldingen.ndjson` occurred:
a message of an issue that no longer occurs may mean the issue is solved, or that no test reached it.

The browser tests of WYMeditor (#65, #70, #90) open a new text page, which on this branch opens in the Markdown
editor, so against `.` they fail as broken tests; run them against main. Race tests run several rounds and stop at
the second round with an error; a race that does not show reliably when all areas share one site is not registered
as a known bug, because a pass by luck would report the issue as solved.

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

**Concurrent requests on a macOS bind mount.** With `data/` on a Docker Desktop or OrbStack bind mount,
many requests at once sometimes see a file as missing for a moment while another request replaces it
with `rename()`: `Cannot lock file data/hypha.xml, open failed: … No such file or directory`, or, when
`hypha.xml` is read without a lock, `file_get_contents(data/hypha.xml): Failed to open stream` followed by
a fatal error in `base.php`. On Linux,
and with `data/` on a Docker volume or tmpfs, this does not happen (0 errors in 4,924 requests at 8
clients, measured 2026-10-27), so `tests/bekend/meldingen.ndjson` lists it (as test setup) and
`test_gelijktijdig.py` does not count a round with a failed request. Files on the host may also lag
behind the container; tests that race read the result through Hypha.
