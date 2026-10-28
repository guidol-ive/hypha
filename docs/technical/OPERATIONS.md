# Operations

How to keep a Hypha site running. Gaps are listed in
[`../../ai/investigation/open/20261026_RELIABILITY_AVAILABILITY_SERVICEABILITY.md`](../../ai/investigation/open/20261026_RELIABILITY_AVAILABILITY_SERVICEABILITY.md).

## Backup and restore

Hypha has no backup function. Copy `data/`:

```bash
tar -czf hypha-data-$(date +%Y%m%d).tar.gz -C /var/www/hypha data
```

A copy taken while the site runs is consistent per file, because every file is replaced
atomically; across files (a new page file and its entry in `hypha.xml`) a change in progress can
be half in the copy. For a fully consistent copy, take it at a quiet moment or from a file system
snapshot. Restore by stopping writes, replacing `data/` and checking ownership. Test a restore in
a container ([CONTAINER.md](CONTAINER.md)) now and then.

## Logs

- PHP errors go to the PHP error log (in the container: the container log). Expect many
  `DOMDocument::loadHTML()` warnings about tags such as `macro` and `video`; they are harmless
  (KI-GLE-2026W44-hypha-005). Look for `Fatal error` and `Uncaught`.
- A file named `DEBUG` in the web root shows errors to every visitor. Use it only on a test site.

## Mail

Hypha sends with PHP `mail()`. The host needs sendmail or a relay. Mail goes out in the web
request: the digest during the first page view after the interval has passed, mailings while the
user who pressed "send" waits. A test site should not send mail; point `sendmail_path` to
`/bin/true` or a catch-all there.

## Digest

The digest is triggered by visitors, not by cron. On a site with few visitors it is late; when
the mail server is slow, that visitor waits. Change the interval under `/settings/hypha`.

## Upgrading

1. Back up `data/`.
2. Update the code (`git pull`, or new files from a release).
3. Run [TESTING.md](TESTING.md)'s smoke test against a copy of the data on the target PHP version
   before switching production.
4. Switch, then watch the log for fatal errors.

There are no release tags yet (NS-GLE-2026W44-hypha-014); upgrade to a known commit and write it
down.

## PHP versions

Supported: 8.2 up to 8.5. Check the version before a hosting change with
`php -v` and the extension list in [README.md](README.md). PHP 8.2 leaves php.net security support
on 2026-12-31; Debian oldstable keeps patching its package.

## Capacity and resource use

Hypha parses the whole `data/hypha.xml` (users, page list, tags) on every request; each page is a
file in `data/pages/`. Page count and user count therefore set memory and CPU per request.

Measured 2026-10-27 on fictional sites made with `tests/gouden/maak.php`: PHP 8.4.27 with OPcache,
Apache 2.4 mod_php prefork, the container of [CONTAINER.md](CONTAINER.md); Apple M1 (8 cores),
OrbStack VM with 8 CPUs and 7.8 GB; other tests ran at the same time. A spot check on PHP 8.2.35
gave the same numbers within 10%. "Derived" means computed from the measurements, not measured.

| Pages | `hypha.xml` | `data/` on disk | Worker RSS, plain views | Worker RSS after index/tag page |
|---|---|---|---|---|
| 100 | 17 kB | 2.9 MB | 26 MB | 26 MB |
| 1,000 | 154 kB | 14 MB | 28 MB | 32-35 MB |
| 10,000 | 1.5 MB | 126 MB | 47 MB | 98-103 MB |
| 50,000 | 7.6 MB | 625 MB | 133 MB | 400-420 MB |

Median CPU time per request (ms; wall time is about 1 ms more):

| Request | 100 | 1,000 | 10,000 | 50,000 |
|---|---|---|---|---|
| article, anonymous | 3 | 6 | 23 | 104 |
| text page / home page, anonymous | 3 | 8-9 | 51-52 | 256-258 |
| 404 | 2 | 7 | 53 | 262 |
| article, logged in | 4 | 10 | 57 | 290 |
| login (POST) | 2 | 4 | 19 | 88 |
| editor (`/edit`) | 5 | 23 | 194 | 964 |
| save article (POST) | 6 | 15 | 113 | 508 |
| tag page `/tag/nl/...` | 2 | 19 | 205 | 1,182 (1 GB container) |
| index `/index/nl` | 5 | 40 | 377 | 1,895 |

Throughput of an anonymous article view at the shipped cap (2 workers, 256 MB), req/s at 1/2/4/8
concurrent clients: 1,000 pages on 1 CPU 123/132/133/132; 10,000 pages on 1 CPU 25/23/23/21, on
2 CPUs 25/46/40/40; 10,000 pages with 8 workers, 1 GB, 8 CPUs 25/44/81/84.

1. Disk: a Markdown article is about 14 kB (one third source, two thirds XHTML, so about 1.5 times
   an HTML page with the same text, derived); a Markdown text page with 3 versions 16.5 kB. A
   text-page version costs about 0.2 kB for a small edit and 2.4 kB for a new 4 kB text; articles
   keep no versions. `hypha.xml` grows about 150 bytes per page and 185 bytes per user.
2. Users cost about as much as pages per byte of `hypha.xml`: 10,000 users on a 1,000-page site
   add about 17 ms to every request, 45 ms to a save and 20 MB to each worker; up to 1,000 users
   there is no measurable effect.
3. CPU grows linearly: per 1,000 pages about 2 ms for an article view, 5 ms for a text page or the
   home page, 38 ms for the index. The index passes 1 s at about 25,000 pages and the editor at
   about 50,000 (derived); plain page views stay under 0.3 s at 50,000.
4. Memory per worker (derived): **30 MB + 7.5 MB per 1,000 pages + 2 MB per 1,000 users**, plus
   about 25 MB for Apache. Workers keep their peak until they are recycled
   (`MaxConnectionsPerChild 500`), so size with the post-index column. Workers that fit:
   1,000 pages 6/12/25, 10,000 pages 2/4/8, 50,000 pages 0/1/2 in 256 MB/512 MB/1 GB.
5. `memory_limit` does not protect: the libxml DOM of `hypha.xml` is not counted by PHP
   (`memory_get_peak_usage` at most 19 MB while the worker held 420 MB). Only the container or
   cgroup limit stops a worker, by killing it. Measured: a tag page at 50,000 pages in 256 MB, and
   8 workers at 10,000 pages in 256 MB under load, were OOM-killed; 4 workers in 512 MB and 8 in
   1 GB were fine.
6. Throughput is about CPUs divided by CPU time per request, capped by the workers; more workers
   than about twice the cores does not help. Derived: one core serves about 200 readers who open a
   page every 10 seconds at 10,000 pages, over 1,000 at 1,000 pages. An editor (open plus save,
   0.3 s CPU at 10,000 pages) is cheap: ten editors saving every minute use about 5% of a core.
7. Set `MaxRequestWorkers` (prefork) or `pm.max_children` (PHP-FPM) to the memory for the web
   server divided by the worker size above. With too many workers the server swaps or the
   container kills workers and the site stops responding for everyone; capped, extra requests
   queue. See also [`../../ai/measurement/20261026_SCALABILITY_DOS.md`](../../ai/measurement/20261026_SCALABILITY_DOS.md)
   (a real site of 1,330 pages on `dev` measured 85 MB per worker).

## Behind NGINX

Check after every change of the proxy: links use `https://`, the access log shows real client
addresses, uploads up to 16 MB pass, and pages of logged-in users are not cached. See
[REVERSE_PROXY.md](REVERSE_PROXY.md).

## Hardening

Until the findings of the security review are fixed (NS-GLE-2026W44-hypha-002 to -008):

- Remove `hypha.php` from the web root after installation, or at least give the system user in it
  a long, unique user name and password. Never leave them empty.
- Deny `data/` except `data/themes/` in the Apache configuration as well as in `.htaccess` (see
  [INSTALLATION.md](INSTALLATION.md#apache-configuration); a plain `<Directory>` deny breaks
  the theme).
- Set `ServerName` and `UseCanonicalName On`, so e-mail links cannot be redirected by a forged
  Host header.
- Serve only over HTTPS; add `Strict-Transport-Security` at the proxy.
- Give the web server user write access to `data/` only.
- Keep `DEBUG` absent on production.
- Add rate limiting for `POST` requests at the proxy if spam or login guessing appears.
