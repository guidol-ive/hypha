---
title: "SCALABILITY AND DENIAL OF SERVICE: throughput of dev on one CPU, and how a few requests make the site unusable"
revision: 1
date_created: 2026-10-26
date_last_review:
---

# SCALABILITY AND DENIAL OF SERVICE

> **Superseded on the cause** by [`20261026_SCALABILITY_ROOT_CAUSE.md`](20261026_SCALABILITY_ROOT_CAUSE.md):
> the collapse comes from Apache starting more ~85 MB workers than fit in memory, not from the
> stats lock. The numbers below stand; the "Why" and "What would help" sections do not.

Read on 2026-10-26. Never corrected, only superseded by a newer reading. This is a load test of
Hypha's own `dev` branch in a local container; nothing outside the test machine was touched.

## Set-up

- Image `hypha-final:php8.2` (dev + the PHP 8.2 patch of #405/#406), run with `--cpus 1
  --memory 256m`, a realistic small VPS. PHP 8.2.35, Apache mod_php.
- A copy of the De Stadsbron data (1 330 pages). No other load on the host.
- Load generated from the same machine with a Python thread pool (standard library), each level
  for 5 seconds. Measured: requests per second and median / p95 latency.

## Single request, by page kind

| Page | Status | Median |
|---|---|---|
| Home page `/` | 200 | 291 ms |
| `/settings` (redirect to login) | 200 | 241 ms |
| Timeline `/nl/tijdlijn` | 200 | 203 ms |
| A normal article | 200 | 186 ms |
| Index `/index/nl` | 200 | 75 ms |
| Missing page (404) | 404 | 13 ms |
| Static CSS (theme) | 200 | 5 ms |
| Uploaded image | 200 | 6 ms |

Every dynamic page costs 75–290 ms of CPU; static files cost ~5 ms. The home page is the
heaviest because it parses the whole 282 KB `hypha.xml` and renders the default page.

## Throughput under concurrency (home page)

| Concurrency | Throughput | p50 | p95 |
|---|---|---|---|
| 1 | 3.4 req/s | 292 ms | 366 ms |
| 2 | 1.6 req/s | 789 ms | 54 s |
| 4 | 1.6 req/s | 4.5 s | 8 s |
| 8 | 2.0 req/s | 22 s | 24 s |
| 16 | 4.0 req/s | 9 s | 18 s |
| 32 | 7.2 req/s | 15 s | 27 s |

This is **negative scaling**: more concurrency gives less throughput and far worse latency than a
single client. The dynamic request rate never rises much above a handful per second, while
latency climbs into tens of seconds. Static files, by contrast, scale normally (~200 req/s at
concurrency 1, ~100 req/s and 0.3 s at concurrency 32).

## One page makes the rest unusable

While six concurrent clients requested only the home page, the latency of an unrelated **static**
CSS file rose from ~5 ms to a median of 398 ms and up to 1 s, and a different dynamic page did not
return within the window. So load on one ordinary page degrades the whole site, including static
assets. When the load stopped, the site recovered immediately (idle home page back to 0.32 s).

## Why

1. **Every dynamic request re-parses `hypha.xml`** (282 KB here) and, for an article, the page
   file. There is no cache, so each page view is 75–290 ms of CPU. One CPU therefore caps the
   whole site at roughly 3–7 dynamic requests per second regardless of concurrency.
2. **Every anonymous page view takes an exclusive lock** on `data/hypha.stats`:
   `loadPage()` (`system/core/pages.php:265`) calls `hypha_incrementStats()`
   (`system/core/base.php:779-792`), which does `lockAndRead()` … `writeAndUnlock()`. All
   anonymous dynamic traffic serialises on this one file lock, which turns concurrency into
   contention and explains the negative scaling.
3. No per-IP rate limiting and no cache in front, so nothing dampens a burst.

(The logged-in figures in this test collapsed even harder, but that is a test artefact: the test
reused one session cookie, and PHP serialises requests that share a session on the session file
lock. Real visitors have separate sessions. The anonymous figures above are the real signal.)

## Denial-of-service assessment

- **Maximum useful throughput** of dynamic pages on one CPU: about 3–7 requests per second, and
  only a few before latency passes one second.
- **Cost to the attacker is tiny.** A plain `GET` of any dynamic page (the home page will do)
  costs the server ~250 ms of CPU and a global lock. Six to eight concurrent connections — one
  script, no special payload, well within one visitor's browser opening tabs or a search-engine
  crawler — are enough to push site-wide latency to tens of seconds, so the site is effectively
  down for everyone, including readers of static pages.
- **No authentication or unusual request is needed**, so this is reachable by any anonymous
  visitor. It is a resource-exhaustion denial of service, related to SEC-018 in the security
  review and to risk CR-06 (single XML store). Filed as PlanBCode/hypha#411 (and #412 for the
  stats lock).

## What would help (next steps)

- Drop the per-view write to `hypha.stats` on the hot path, or make it lock-free / sampled / a
  simple append (NS-GLE-2026W44-hypha-034; filed as PlanBCode/hypha#412).
- Cache the parsed `hypha.xml` (opcache/APCu or a serialised cache invalidated on write) so a page
  view is not a full parse (NS-GLE-2026W44-hypha-035; part of PlanBCode/hypha#411).
- Put a cache and per-IP rate limiting in front (reverse proxy); serve static assets directly,
  not through `index.php` where possible (NS-GLE-2026W44-hypha-036; part of PlanBCode/hypha#411).
- Measure again after each change with the same method.

Figures are from one machine on one day and are relative, not absolute; a production server with
more CPUs scales the numbers up but not the shape (the lock and the per-request parse remain).
