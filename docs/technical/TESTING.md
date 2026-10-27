# Testing a change

There is no automated suite in CI yet (NS-GLE-2026W44-hypha-009). Three checks can be run by hand;
all three need only a container engine and Python 3.

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
