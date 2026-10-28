# Installation

Three ways: from git (developers and operators who want updates through git), with the
self-extracting `hypha.php` (shared hosting), or as a container ([CONTAINER.md](CONTAINER.md)).

## From git

```bash
git clone --branch dev https://github.com/PlanBCode/hypha.git /var/www/hypha
```

1. Give the web server user write access to `data/` only, not to the code:
   `chown -R www-data:www-data /var/www/hypha/data`. Do not follow the old advice to
   `chmod -R 777` the whole folder.
2. Set the credentials of the **system user** at the top of `hypha.php` (`$username`, `$password`);
   with the defaults (empty) the installer is open to anyone (security review SEC-002).
3. Open the site in a browser. Because `data/hypha.xml` is missing, `index.php` sends you to
   `hypha.php`. Log in as the system user of step 2 and fill in title, default language, default
   page, the first privileged user and the system e-mail address.
4. Remove `hypha.php` from the web root afterwards, or keep the credentials strong (see
   [OPERATIONS.md](OPERATIONS.md#hardening)).

`git pull` updates the code; `data/` is git-ignored except for the default theme.

## With hypha.php

Download `hypha.php` from hypha.net, write the name and password of the system user into the first lines, upload it
to the web root and open it in a browser. It extracts the files and continues as in step 3 above.
The same script later serves as "system tools" for the system user.

## System user and users of the site

The installation creates two accounts that are **separate**:

| | System user | First privileged user |
|---|---|---|
| Where | `$username` and `$password` at the top of `hypha.php`, in plain text (#642) | `<user rights="admin">` in `data/hypha.xml`, with a password hash |
| Log in | only at `hypha.php` | with the login button of the site |
| For | the installation, and later `hypha.php?maintenance` to update the files of Hypha | the site: settings, theme, menu, users |

The system user cannot log in to the site. After logging in as the system user, the installer asks
separately for the name and password of the first user of the site. Use different passwords for the
two. The kinds of site users are privileged user (`rights="admin"`), standard user (`"user"`),
invited (`"invitee"`) and no user (`"exmember"`). The Dutch user manual,
[Gebruikersbeheer](../handleiding/gebruik/10-gebruikersbeheer.md), also describes how to set a
password by hand in `hypha.xml` when nobody can log in.

## Apache configuration

The repository's `.htaccess` needs mod_rewrite and `AllowOverride FileInfo`:

- every request for `system/...` or `data/...` goes to `index.php`, which serves only theme files,
  assets and editor files and refuses the rest;
- every request that is not an existing file or folder goes to `index.php`;
- `ai/`, `docs/`, `tests/` and the Markdown files in the root (including `README.md`) are refused
  with 403 (added 2026-10-26).
- with mod_headers loaded, it sends the security headers of
  [OPERATIONS.md](OPERATIONS.md#security-headers); without mod_headers they are skipped.

A virtual host, as used for the local test set-up of De Stadsbron:

```apache
<VirtualHost *:8080>
	ServerName www.example.org
	DocumentRoot /var/www/hypha
	DirectoryIndex index.php
	ErrorLog /dev/stderr
	CustomLog /dev/stdout combined
	# When TLS ends at a proxy in front of Apache, tell Hypha the original scheme:
	SetEnv HTTPS on
	<Directory "/var/www/hypha">
		AllowOverride FileInfo Options
		Require all granted
	</Directory>
	# Defence in depth: refuse data/ except the theme files, even if .htaccess is not read.
	<LocationMatch "^/data/(?!themes/)">
		Require all denied
	</LocationMatch>
</VirtualHost>
```

Do not use `<Directory .../data> Require all denied` instead: Apache checks access before the
rewrite of `.htaccess` runs, so the theme style sheet (`data/themes/<name>/hypha.css`) would be
refused as well and the site loses its layout (tested 2026-10-26). The `LocationMatch` above keeps
themes reachable and refuses `data/hypha.xml`, `data/pages/...` and `data/digest` with 403;
uploaded images are served as `images/...` through `index.php` and are not affected. Set `ServerName` and `UseCanonicalName On` so links in
e-mails cannot be steered by a forged Host header (SEC-006).

## Behind NGINX

Most installations have NGINX in front, ending TLS. Configure both sides as in
[REVERSE_PROXY.md](REVERSE_PROXY.md); without it, links are built with `http://`, every visitor
seems to come from the proxy's address, and uploads over 1 MB fail at NGINX.

## Content of an existing site

To move a site, copy its `data/` folder. All internal links are relative or stored by page id. Check
afterwards for images linked with the full address of the old host (KI-GLE-2026W44-hypha-013).
