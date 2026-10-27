# Hypha, technical overview

Hypha is plain PHP served by Apache: a front controller `index.php`, a framework in
`system/core/`, page types in `system/datatypes/`, and all data as XML files under `data/`. There
is no database, no build step and no package manager. The full description is in
[`../../ai/ARCHITECTURE.md`](../../ai/ARCHITECTURE.md).

## Requirements

| What | Version / setting |
|---|---|
| PHP | **8.2, 8.3, 8.4 or 8.5** (REQ-001, REQ-002 in [`../../ai/reference/REQUIREMENTS.md`](../../ai/reference/REQUIREMENTS.md)) |
| PHP extensions | dom, libxml, xml, mbstring, gd (with jpeg and png), curl, openssl, zlib, fileinfo, session |
| Web server | Apache 2.4 with mod_rewrite, mod_php or PHP-FPM; `AllowOverride FileInfo` for the web root; mod_remoteip when behind a proxy |
| Reverse proxy | Usually NGINX in front, ending TLS; see [REVERSE_PROXY.md](REVERSE_PROXY.md) |
| Mail | A working `mail()` (sendmail or an MTA relay) |
| Disk | Writable `data/` for the web server user; size grows with images (De Stadsbron: 738 MB for 1 330 pages) |

State on 2026-10-26: `master` does not run on PHP 8; `dev` runs on 8.3 to 8.5 and on 8.2 after
the patch in
[`../../ai/design/concept/20261026_PHP82_DETACHED_NODES.md`](../../ai/design/concept/20261026_PHP82_DETACHED_NODES.md).

## Documents

- [INSTALLATION.md](INSTALLATION.md), installing on a server
- [CONTAINER.md](CONTAINER.md), Podman and Docker
- [REVERSE_PROXY.md](REVERSE_PROXY.md), Hypha behind NGINX (the usual set-up)
- [DATA_MODEL.md](DATA_MODEL.md), what is in `data/`
- [OPERATIONS.md](OPERATIONS.md), running a site
- [TESTING.md](TESTING.md), checking a change
