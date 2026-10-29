# Hypha in a container

The files in [`../container/`](../container/) build an image on the official `php:<version>-apache`
image (Debian, Apache 2.4 with mod_php). They work with **Podman** and **Docker**; every command
below works with `docker` in place of `podman`. The PHP version is a build argument, so the
supported range 8.2 up to 8.5 is tested with the same files.

Verified on 2026-10-26 with Docker 29.4 on macOS for PHP 8.2, 8.3, 8.4 and 8.5. A run under Podman
is still to be done (NS-GLE-2026W44-hypha-020); the files use only portable features (a plain
`Containerfile`, fully qualified image names, a non-root port, the `:Z` volume label for SELinux).

## What is in the image

| File | Role |
|---|---|
| `Containerfile` | `php:${PHP_VERSION}-apache` + GD (jpeg, png, freetype) + APCu (the cache of anonymous pages, #411) + mod_rewrite and mod_headers; listens on 8080 and runs as `www-data`; copies the source to `/var/www/html` and leaves out `.git`, `ai/` and `docs/`; `data/` is a volume |
| `hypha-vhost.conf` | Virtual host on 8080 with `AllowOverride FileInfo Options`, logs to stdout/stderr, the same five security headers as `.htaccess` (see [OPERATIONS.md](OPERATIONS.md#security-headers)), `data/` refused except themes |
| `mpm_prefork.conf` | Caps Apache at 2 workers for a 256 MB container; each worker needs about 85 MB. Raise `MaxRequestWorkers` to about (memory for Apache) / 100 MB on a larger host |
| `php.ini` | Errors to the log (`/dev/stderr`), never to the browser; upload limits 16/20 MB; session hardening; time zone Europe/Amsterdam; APCu with 32 MB shared memory. A thread-safe (ZTS) PHP, such as the official 8.6 release candidates, cannot open `/dev/stderr` from mod_php (it resolves the path, and `/dev/stderr` is a pipe), and dropped every deprecation, notice and warning; the `Containerfile` then sets `error_log = /tmp/php-error.log` and its command follows that file into the container log (checked 2026-10-28 on 8.2, 8.5 and 8.6.0RC4) |
| `compose.yaml` | One service, port 8086, data in `./hypha-data`, 256 MB memory |
| `smoke_test.py` | Requests every page of a site anonymously and reports status codes |
| `check_deprecations.sh` | `php -l` and a deprecated-function scan on PHP 8.2 up to 8.5 |

Not in the image: an MTA. The container cannot send mail unless `sendmail_path` is pointed at a
relay (for example msmtp to the hosting's SMTP server).

## Build

From the root of the repository (the build context must contain the source):

```bash
podman build -t localhost/hypha:php8.2 -f docs/container/Containerfile .
```

Another PHP version:

```bash
podman build --build-arg PHP_VERSION=8.5 -t localhost/hypha:php8.5 -f docs/container/Containerfile .
```

## Run with a fresh site

The volume replaces `data/` of the image, so put the default theme in it first:

```bash
mkdir -p hypha-data/themes && cp -R data/themes/default hypha-data/themes/
```

Before building, set the user name and password of the system user in `hypha.php` (see
[INSTALLATION.md](INSTALLATION.md)); then:

```bash
podman run -d --name hypha -p 8086:8080 -v ./hypha-data:/var/www/html/data:Z localhost/hypha:php8.2
```

Open http://localhost:8086/, which leads to the installer.

## Run with the data of an existing site

Copy the `data/` folder of the site into `hypha-data/` (it must contain `hypha.xml`, `pages/`,
`images/`, `files/` and the folder of the theme named in `hypha.xml`, attribute `theme`) and run
the same command. Use a copy: Hypha writes to the data (statistics, digest time, sessions do not).
On Podman rootless, files must be readable by the user `www-data` inside the container; with
`--userns=keep-id` or `podman unshare chown -R 33:33 hypha-data` this is solved.

## Compose

```bash
podman compose -f docs/container/compose.yaml up -d --build
```

`compose.yaml` resolves `./hypha-data` relative to `docs/container/`.

## Logs

```bash
podman logs -f hypha
podman logs hypha 2>&1 | grep 'PHP ' | cut -c40- | sort | uniq -c | sort -rn | head
```

To see errors in the browser, create a file `DEBUG` in the web root of the container:
`podman exec hypha touch /var/www/html/DEBUG` (only for local testing; remove it afterwards).

## Behind NGINX

This is the usual set-up. Uncomment `SetEnv HTTPS on`, `RemoteIPHeader` and
`RemoteIPInternalProxy` in `hypha-vhost.conf` (the image enables `mod_remoteip`), and configure
NGINX as in [REVERSE_PROXY.md](REVERSE_PROXY.md): pass `Host` and `X-Real-IP`, raise
`client_max_body_size` to 20m, and do not cache responses for logged-in users.

## Compared with earlier set-ups

The earlier local set-up (`Dockerfile` on Ubuntu 18.04 with distribution PHP, the code mounted
read-only from a git clone of the `koppelting` branch, the data mounted read-write) and the
`php-apache-bionic-hypha` repository (also Ubuntu 18.04, Apache bound to port 80 with
`setcap`) are tied to PHP 7.2, the PHP of Ubuntu 18.04; Ubuntu 24.04 failed with that set-up because
master does not run on PHP 8. The official PHP images give every minor version, which is why
they were chosen (D-GLE-2026W44-hypha-004). Mounting the code from a git clone instead of copying
it into the image still works for development:

```bash
podman run -d --name hypha-dev -p 8086:8080 \
	-v ./:/var/www/html:ro,Z -v ./hypha-data:/var/www/html/data:Z localhost/hypha:php8.2
```
