# Hypha documentation

Documentation for the people who use, run and change Hypha. It describes the `dev` branch as of
2026-10-26 (PHP 8.2 up to and including 8.5). Background for developers and AI assistants is in
[`../ai/`](../ai/README.md); the code style in [`../ai/CODING_STANDARDS.md`](../ai/CODING_STANDARDS.md).

This folder is not served by the web server (`.htaccess` refuses it) and is not part of the
container image.

## Functional, for members, editors and administrators

- [functional/README.md](functional/README.md), what Hypha is and its main concepts: members,
  pages, languages, versions, privacy, tags, menu, digest
- [functional/PAGE_TYPES.md](functional/PAGE_TYPES.md), the page types: text page, peer-reviewed
  article, mailing list, festival
- [functional/ADMINISTRATION.md](functional/ADMINISTRATION.md), the settings pages: account,
  members and invitations, site settings, theme, styles, menu, system tools

## Technical, for operators and developers

- [technical/README.md](technical/README.md), overview and requirements
- [technical/INSTALLATION.md](technical/INSTALLATION.md), installing on a web server, with git or
  with the `hypha.php` installer, and the Apache configuration
- [technical/CONTAINER.md](technical/CONTAINER.md), building and running Hypha in a container with
  Podman or Docker, for PHP 8.2 up to 8.5
- [technical/REVERSE_PROXY.md](technical/REVERSE_PROXY.md), Hypha behind NGINX, the usual set-up:
  scheme, host, client address, upload size, timeouts, caching
- [technical/DATA_MODEL.md](technical/DATA_MODEL.md), the files under `data/` and the XML structure
- [technical/OPERATIONS.md](technical/OPERATIONS.md), backup, logs, mail, digest, upgrades,
  hardening
- [technical/TESTING.md](technical/TESTING.md), unit test, smoke test, deprecation check

## Container files

[container/](container/): `Containerfile`, `compose.yaml`, `hypha-vhost.conf`, `php.ini`,
`smoke_test.py`, `check_deprecations.sh`.
