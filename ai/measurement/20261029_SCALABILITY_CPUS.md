---
title: "SCALABILITY CPUS: throughput on 1, 2 and 8 CPUs in 256 MB, workers per CPU, with and without the page cache"
revision: 1
date_created: 2026-10-29
date_last_review:
---

# SCALABILITY CPUS

Measured on 2026-10-28 and 2026-10-29. Question: does Hypha scale from 1 to 2 to 8 CPUs, and if
not, where is the bottleneck?

## Set-up

- Site: fictional, `tests/site/maak-site.php` followed by `tests/site/maak-grote-site.php`
  (1,000 text pages with 3 versions, 300 articles, 60 users; `hypha.xml` 188 KB).
- Image: `php:8.5-apache` with mod_php prefork and OPcache, the container of
  [`docs/technical/CONTAINER.md`](../../docs/technical/CONTAINER.md); with APCu for the page cache.
- Container: `--memory 256m --memory-swap 256m --cpus 1|2|8`; prefork with
  `StartServers = MinSpareServers = MaxSpareServers = MaxRequestWorkers = N` and
  `MaxConnectionsPerChild 0`.
- Host: Apple M1 with 8 cores, Docker Desktop VM with 8 CPUs and 7.8 GB.
- Load: `ab -k -c N -t 8` in a second container on the same Docker network, limited to 2 CPUs, after
  a 3 s warm-up. Anonymous home page `/nl/Start` unless stated.
- Code:
  - **start**: `0a2cfe0`, the trial branch before the performance work;
  - **trial**: `issue520-compleet-proef`, with the line-level optimisations of #675 and #677 and
    the shared XPath object;
  - **complete**: branch `compleet`, every open pull request merged, including the APCu page cache
    of PR #518.

## 1. Workers matched to CPUs (2 workers on 1 CPU, otherwise 1 per CPU or 2 per CPU)

| CPUs (workers) | start | trial | complete (page cache) |
|---|---|---|---|
| 1 (2) | 115 req/s, 5 × 500 | 211 req/s | 2,179 req/s |
| 2 (4) | 215 req/s, 26 × 500 | 345 req/s | 4,129 req/s |
| 8 (8) | 514 req/s, 195 × 500 | 733 req/s | 6,192 req/s |

The 500s of start come from the page-view counter that rewrote one JSON file on every request
(fixed by #677). The trial and complete branches gave no errors.

## 2. Too many workers per CPU is the bottleneck

Trial branch, 1 CPU, 256 MB:

| Workers | req/s |
|---|---|
| 2 | 211 |
| 4 | 59 |
| 16 | 56 |

With 16 workers the same code gives 34 (start), 56 (trial) and 436 (complete) req/s on 1 CPU,
and the step from 1 to 2 CPUs looks superlinear (start 34 → 104, trial 56 → 205). The cause is the
CPU quota of the container (CFS bandwidth control): with more runnable workers than CPUs, the whole
group runs out of its quota early in every 100 ms period and waits for the next one, and the
workers mostly wait for each other. `nr_throttled` in `cpu.stat` rose with every period. A virtual
server whose CPUs are its own has no quota, but more workers than about twice the cores still only
add waiting and memory.

## 3. The load generator on the host hides the scaling

The first measurement used `hey` on the Mac, through the port forwarding of Docker Desktop, with
16 workers. It gave complete 436 / 1,705 / 2,343 req/s on 1 / 2 / 8 CPUs: only 1.4 times from
2 to 8. From inside Docker the same container gives 2,600-2,700 req/s on 2 CPUs and
6,200-6,300 on 8, the same with a client of 2 or of 4 CPUs. The port forwarding was the limit, not
Hypha.

From 2 to 8 CPUs the matched-worker numbers still grow less than four times (trial 2.1 times,
complete 1.5 times), because the 8 CPUs of the VM are the 8 cores of the Mac, shared with the
load generator (2 CPUs) and Docker itself. On 2 CPUs the container had 66 s of throttling for 44 s
of CPU in 11 s; on 8 CPUs none. A server with 8 cores of its own should do better; not measured.

## 4. Memory in 256 MB

Peak of the cgroup (`memory.peak`), 8 CPUs, 8 s load. Each worker has an RSS of at most 29 MB on
this site, but most of it is shared, so the sum of the RSS (240-940 MB) overstates the use.

| Workers | home page, start → trial | page index, start → trial |
|---|---|---|
| 8 | 75 → 54 MB | 97 → 75 MB |
| 16 | 86 → 115 MB | 132 → 161 MB |
| 32 | 155 → 158 MB | 250 → 254 MB (at the limit) |

No worker was killed for lack of memory (`oom_kill 0`). With 256 MB, 8 to 16 workers fit; 32 only
just, and gave fewer requests than 16 (home page start 419, trial 562 req/s).

## 5. Pages other than the home page

With 16 workers and `hey` on the host (so the absolute numbers are low, see section 3):

| Page | CPUs | start | trial | complete |
|---|---|---|---|---|
| page index `/index/nl` | 1 | 3 req/s | 17 req/s | 18 req/s |
| page index `/index/nl` | 2 | 8 req/s | 50 req/s | 45 req/s |
| page index `/index/nl` | 8 | 50 req/s | 252 req/s | 240 req/s |

The page cache of #518 does not help the index: it is generated per request.

## Conclusions

1. Hypha scales with CPUs, as long as `MaxRequestWorkers` is about one to two per CPU.
2. Without a CDN, 1,000 home pages per second need about 4 to 8 CPUs on the trial branch, or 1 CPU
   with the page cache of #518.
3. Memory is not the limit in 256 MB for a site of this size up to 16 workers.
4. Measure from inside the Docker network, not through Docker Desktop's port forwarding.
