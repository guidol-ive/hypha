---
title: "SCALABILITY ROOT CAUSE: worker memory, not the stats lock; throughput with the stats patch and with a worker cap"
revision: 1
date_created: 2026-10-26
date_last_review:
---

# SCALABILITY ROOT CAUSE

Read on 2026-10-26, later the same day as
[`20261026_SCALABILITY_DOS.md`](20261026_SCALABILITY_DOS.md), which it supersedes on the cause.
Same set-up: `php:8.2-apache`, `--cpus 1`, dev 5dae13a + the #405 fix, a copy of the De Stadsbron
data, anonymous home page, 8 s per concurrency level.

## 1. The stats lock does not limit throughput

Three images that differ only in `hypha_incrementStats()`, all 256 MB and Apache's default prefork
settings:

| Concurrency | unpatched | stats patch (non-blocking `tryLock`, #412) | no stats at all |
|---|---|---|---|
| 1 | 3.2 req/s, p50 330 ms | 3.4 req/s, p50 306 ms | 3.4 req/s, p50 310 ms |
| 2 | 3.1 req/s, p50 686 ms | 2.8 req/s, p50 792 ms | 3.0 req/s, p50 717 ms |
| 4 | 1.2 req/s, p50 3.5 s | 1.6 req/s, p50 2.7 s | 1.5 req/s, p50 3.3 s |
| 8 | 1.5 req/s, p50 8.5 s | 1.4 req/s, p50 7.5 s | 1.6 req/s, p50 7.2 s |
| 16 | 3.0 req/s, p50 26 s | 2.9 req/s, p50 20 s | 3.2 req/s, p50 8.4 s |
| 32 | 4.5 req/s, p50 66 s | 4.6 req/s, p50 56 s | 4.8 req/s, p50 90 s (timeouts) |

All three collapse the same way. The patch is in PlanBCode/hypha#412 (comment of 2026-10-26).

## 2. Each worker needs about 85 MB

With `--memory 1g` and default prefork: 7.1 req/s at concurrency 1 (p50 142 ms), 2.5 req/s at 4,
2.2 req/s at 8; memory rose to 830 MB; the Apache workers had 84-87 MB RSS each, mostly the DOM of
the 282 KB `hypha.xml` and the page. At 256 MB only about three fit, so the defaults push the
container into swap.

## 3. Capping the workers removes the collapse

256 MB, default otherwise, with `MaxRequestWorkers 2` (see
[`../../docs/container/mpm_prefork.conf`](../../docs/container/mpm_prefork.conf)):

| Concurrency | Throughput | p50 | p95 | Errors |
|---|---|---|---|---|
| 1 | 7.0 req/s | 142 ms | 161 ms | 0 |
| 2 | 6.9 req/s | 301 ms | 367 ms | 1 |
| 4 | 6.9 req/s | 600 ms | 719 ms | 0 |
| 8 | 7.8 req/s | 1.2 s | 1.2 s | 2 |
| 16 | 8.5 req/s | 2.4 s | 2.5 s | 0 |
| 32 | 10.5 req/s | 4.8 s | 4.8 s | 0 |

Memory stayed at 167 MB. Extra load queues and latency grows linearly instead of collapsing.

## Conclusion

The capacity limit of a small installation is memory per worker times Apache's worker count.
First fix: size `MaxRequestWorkers` (or `pm.max_children`) to the memory. Second: lower the memory
and CPU per request by not building a full DOM of `hypha.xml` for every view (cache). The stats
lock is optional. Posted as a correction in PlanBCode/hypha#411.
