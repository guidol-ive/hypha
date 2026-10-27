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
member who pressed "send" waits. A test site should not send mail; point `sendmail_path` to
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

## Capacity

Each Apache/PHP worker of Hypha needs about 85 MB, mostly for the DOM of `hypha.xml`. Set
`MaxRequestWorkers` (prefork) or `pm.max_children` (PHP-FPM) to roughly the memory available to
the web server divided by 100 MB. With Apache's defaults, a handful of concurrent visitors on a
small server starts more workers than fit in memory, the server swaps and the site stops
responding for everyone. Capped, extra requests wait in the queue and throughput stays flat:
measured 2026-10-26 on 1 CPU and 256 MB, about 7 requests per second at any concurrency instead
of 1.2 at 4 clients. See
[`../../ai/measurement/20261026_SCALABILITY_DOS.md`](../../ai/measurement/20261026_SCALABILITY_DOS.md).

## Behind NGINX

Check after every change of the proxy: links use `https://`, the access log shows real client
addresses, uploads up to 16 MB pass, and pages of logged-in members are not cached. See
[REVERSE_PROXY.md](REVERSE_PROXY.md).

## Hardening

Until the findings of the security review are fixed (NS-GLE-2026W44-hypha-002 to -008):

- Remove `hypha.php` from the web root after installation, or at least set long, unique
  maintenance credentials in it. Never leave them empty.
- Deny `data/` except `data/themes/` in the Apache configuration as well as in `.htaccess` (see
  [INSTALLATION.md](INSTALLATION.md#apache-configuration); a plain `<Directory>` deny breaks
  the theme).
- Set `ServerName` and `UseCanonicalName On`, so e-mail links cannot be redirected by a forged
  Host header.
- Serve only over HTTPS; add `Strict-Transport-Security` at the proxy.
- Give the web server user write access to `data/` only.
- Keep `DEBUG` absent on production.
- Add rate limiting for `POST` requests at the proxy if spam or login guessing appears.
