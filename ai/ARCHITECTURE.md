---
title: "ARCHITECTURE"
revision: 1
date_created: 2026-10-26
date_last_review:
---

# ARCHITECTURE

> Written 2026-10-26 by Claude Code from reading `upstream/dev` (5dae13a) and `master`
> (f08aa50) and from running both in a container on PHP 8.2 up to 8.5 against a copy of a
> production data set. Line numbers refer to `upstream/dev` unless stated. Verify against the
> code before relying on a detail.

## Overview

Hypha is a flat-file CMS in plain PHP without framework, database or build step. One front
controller (`index.php`) handles every request; site data lives in XML files under `data/`; HTML
is produced by loading the theme template into a PHP `DOMDocument` and filling it in; the
browser side is jQuery 1.7.1 plus the WYMeditor rich-text editor.

```
browser ──HTTP──> Apache + mod_rewrite (.htaccess: everything except existing files -> index.php;
                  system/ and data/ always -> index.php)
                     │
                     ▼
                  index.php ── stage 1: DEBUG switch, PHP/mod_rewrite checks
                     │       ── stage 2: require system/core/*.php, HyphaRequest, RequestContext ($O_O),
                     │                   hypha_getDataTypes() loads system/datatypes/*.php
                     │       ── stage 3: serve static files under data/themes, system/assets,
                     │                   system/wymeditor, system/bowser (serveFile)
                     │       ── stage 4: load theme HTML into HTMLDocument, header/footer/menu
                     │       ── stage 5: user and language from the session
                     │       ── stage 6: executePostedCommand (global commands), loadPage,
                     │                   page->process(request) (datatype views and commands)
                     │       ── stage 7: post-processing functions, digest "poor man's cron", output
                     ▼
                  data/hypha.xml        site settings, users, page list, tags, digest queue
                  data/pages/<id>       one XML file per page, all languages and versions
                  data/images/, files/  uploads; data/themes/<name>/ templates and CSS
```

## Layers and folders

| Folder | Role | Size (lines, dev) |
|---|---|---|
| `index.php` | Front controller, seven stages, documented inline in NaturalDocs | 168 |
| `hypha.php` | Installer, maintenance tool, file server for other installs and builder of a self-extracting `hypha.php`; runs outside `index.php` | 521 |
| `system/core/` | Framework: request, session, context, DOM, XML store, pages, users, events, mail, tags, macros, language, images, editor | ~5 400 |
| `system/datatypes/` | Page types (`text`, `peer_reviewed_article`, `mailinglist`, `festival`) and system pages (`settings`, `index`, `tagindex`) | ~6 300 |
| `system/macros/` | `<macro>` elements expanded in page content (`now`, `pagelist`) | 257 |
| `system/languages/` | Interface dictionaries `en.php`, `nl.php`, and the list of content languages `languages.json` | |
| `system/assets/` | jQuery 1.7.1, `help.js`, core CSS | |
| `system/wymeditor/` | WYMeditor 1.1.1 with plug-ins and skins (third party) | |
| `system/bowser/` | Browser detection, to warn for unsupported browsers (third party) | |
| `system/mollie/` | Own minimal client of the Mollie payments API v2, used by `festival` | |
| `system/php-dom-wrapper/` | **master only.** jQuery-like DOM library; does not load on PHP 8 (fatal on `DOMElement::remove()` signature). Removed on `dev`. | |
| `data/` | The site: `hypha.xml`, `pages/`, `images/`, `files/`, `themes/`, `digest`, `hypha.stats` | |
| `tests/` | One self-made test of `HyphaRequest` | 217 |

## Request handling

`HyphaRequest` (`system/core/HyphaRequest.php`) splits the URL path relative to the install
root into language, page name, view and arguments: `/nl/home/edit` is language `nl`, page
`home`, view `edit`. A first segment that is not a language may be a system page: `settings`,
`index`, `tag`, `upload`, `images`, `files`, `chooser`, `help`. POST data carries `command` and
`argument`; the posted command selects the action.

`RequestContext` (`$O_O`) holds the request, the session (`HyphaSession`, PHP sessions with
explicit lock and reload), the current user from `$_SESSION['hyphaLogin']`, the content and
interface language, the theme and the CSRF token.

Two dispatch mechanisms exist side by side:

1. **Global commands** registered with `registerCommandCallback('name', callable)` (login,
   logout, settings commands, tag commands). `executePostedCommand()` validates the CSRF token
   and calls the callback. It runs both before and after `loadPage()`.
2. **Datatype commands**: `HyphaDatatypePage::process(HyphaRequest)` matches
   `[view, command]` in a `switch` and calls a `...View` or `...Action` method. A view returns
   nothing (it writes into `$hyphaHtml`), an action returns `'reload'`, a URL to redirect to,
   `'404'` or `null`.

The result of a command is handled by `processCommandResult()`: redirect, 404 or nothing.
Notifications are kept in the session across a redirect (`notify()`).

## Pages and datatypes

`hypha.xml` has a `pageList` with one `page` element per page: id, type (the PHP class name),
`private` flag and one `language` child per translation with the page name in that language.
`loadPage()` finds the entry for the requested language and name, `createPageInstance()`
instantiates the class named by `type`, and the instance loads `data/pages/<id>`.

| Datatype class | Purpose | Main views |
|---|---|---|
| `textpage` | Wiki page with versions per language, diff, revert, translate | view, edit, translate, revert |
| `peer_reviewed_article` | Article with editorial review: checks, approvals, review and public discussions, comment moderation, subscriptions to discussions | view, edit, discussions, comments, comment confirm, unsubscribe |
| `mailinglist` | Subscribers with double opt-in, mailings with send and test send, batch add | view, edit, addresses, mails, mails_new, mails_edit, confirm, unsubscribe, remind |
| `festivalpage` | Sign-up of performers, contributions with Mollie payment, line-up and timetable | lineup, signup, contribute, pay, paymenthook, participants, timetable, settings |
| `settingspage` (system) | Account, invitation, registration, users, site settings, theme, styles, menu, site elements | settings/... |
| `indexpage`, `tagindexpage` (system) | List of pages, images, files; pages per tag | index/..., tag/... |

`HyphaDatatypePage` defines the contract: `getTitle`, `renderSingleLine`, `renderExcerpt`,
`getSortDateTime`, `deletePage`. A new datatype is a file in `system/datatypes/` with an
instantiable subclass of `HyphaDatatypePage` and a static `getDatatypeName()`:
`hypha_getDataTypes()` (`system/core/base.php:833`) includes every file of the folder and
registers every such class it finds, which makes it appear in the "new page" dialog. A page
whose stored `type` names a class that no longer exists (De Stadsbron has one of type `article`)
ends in a fatal error (KI-GLE-2026W44-hypha-004).

## Storage

All persistent data is XML. `Xml` (`system/core/database.php`) extends `HyphaDomDocument`
(itself a `DOMDocument` with `HyphaDomElement` registered as node class) and is backed by
`HyphaFile`:

- `lockAndReload()` opens the file with `c+`, takes `flock(LOCK_EX)`, retries if the file was
  replaced meanwhile, and reloads the content.
- `saveAndUnlock()` writes the whole document to a temporary file and renames it over the
  original, then releases the lock. Readers do not lock: a rename is atomic on POSIX, so they
  see either the old or the new complete file. On Windows the rename over an open file fails
  (issue #336).
- `hypha.xml` is one global lock: every change of any setting, user, tag or page-list entry
  rewrites the whole file (282 KB for De Stadsbron with 1 330 pages and 46 users).
- Page files keep every version of every language (`versions="on"`): the text datatype stores
  `<version>` elements with a timestamp and author; an article keeps its discussions and
  approvals in the same file.

Images uploaded through the editor go to `data/images/` (originals over 1120x800 to
`data/images/org/`); thumbnails are generated on demand by `HyphaImage::resizeTo` with GD. Files
go to `data/files/`. `data/digest` queues changes for the members' digest; `hypha.stats` keeps
counters.

## HTML generation

`HTMLDocument` loads the theme's `hypha.html` and offers `writeToElement(id, html)`,
`linkScript`, `linkStyle`, `createForm`. Content is parsed with `DOMDocument::loadHTML` (via
`HyphaDomDocument::createFromHtml`) and imported into the page document. Post-processing
functions registered with `registerPostProcessingFunction` run just before output: link
rewriting (`dewikify`: internal links stored as `hypha:` page ids become URLs), notifications,
the event handler script, dumps in DEBUG mode.

On `master` this was done through php-dom-wrapper (`find`, `append`, `html`). On `dev` it is
replaced by `HyphaDomAccessors` (`findXPath`, `findOneXPath`) and `HyphaDomElement`
(`createChild`, `appendText`, `appendHtml`, `getInnerHtml`, `setText`, `addClass`) plus
`HTMLForm`, which wraps every form in its own `<form>` tag and adds the CSRF field.

`loadHTML` is libxml's HTML 4 parser: it warns about HTML 5 elements (`video`, `source`), about
custom elements (`macro`, `editor`) and about sloppy markup in stored content. These warnings
end up in the PHP log on every page view (ten thousands per crawl of De Stadsbron, see
[`measurement/20261026_PHP_8_2_CONTAINER_TEST.md`](measurement/20261026_PHP_8_2_CONTAINER_TEST.md)).

## Users, sessions and security mechanisms

- Users are `user` elements in `hypha.xml` with id, username, full name, e-mail, language,
  bcrypt password hash (`password_hash`, legacy MD5 accepted) and rights `admin`, `user`,
  `invitee` or `exmember`. Membership is by invitation with a key; there is no self-registration.
- Login regenerates the session id and the CSRF token. Session cookie: HttpOnly, SameSite
  Strict, Secure on HTTPS, path limited to the site.
- CSRF: double-submit token, 16 hex characters in a cookie (`hyphaCsrfToken(Secure|Insecure)`),
  compared with the posted `csrfToken`.
- Access to `data/` and `system/` goes through `index.php` (`.htaccess`), which serves only
  theme and asset files (`serveFile` with `realpath` containment) and checks privacy of pages.
- Error display is off unless a file `DEBUG` exists in the web root.

The weaknesses are in
[`investigation/open/20261026_SECURITY_REVIEW.md`](investigation/open/20261026_SECURITY_REVIEW.md).

## E-mail and scheduled work

`sendMail()` (`system/core/communication.php`) builds an HTML message with a Base64 encoded
subject and calls PHP `mail()`. There is no queue and no retry. Periodic work is a "poor man's
cron": at the end of every page view, if `digestInterval` (21 600 s, six hours, after installation; a week on De Stadsbron) has passed
since `lastDigestTime`, `flushDigest()` mails the queued changes to all members during that
visitor's request. Mailings of a mailing list are sent in the request of the member who presses
"send", one `mail()` per address, with progress kept in the page file.

## Installation and distribution

`hypha.php` carries every system file gzip+base64 encoded. Dropped on a server and opened in a
browser, it asks for maintenance credentials (set at the top of the file), extracts the files and
creates `data/hypha.xml` with the first administrator. Admins reach it again from settings as
"system tools" to fetch newer files from `www.hypha.net/hypha.php` (over plain HTTP) or remove
datatypes; anyone can use it to build a new installer with a chosen set of datatypes.
Installing from git skips the extraction: index.php redirects to `hypha.php` when `data/hypha.xml`
is missing.

## Deployment behind NGINX

In practice Hypha runs behind NGINX, which ends TLS and passes plain HTTP to Apache. Parts of
Hypha depend on knowing that: the scheme for absolute URLs (`HyphaRequest::getScheme()`,
`SetEnv HTTPS on`, PR #477), the host for mail links (#418), and the client address
(`REMOTE_ADDR`) for the login throttle (#493), the honeypot (#480) and the audit trail (#476),
which needs `mod_remoteip`. NGINX also limits uploads to 1 MB by default and may cache responses.
See [`../docs/technical/REVERSE_PROXY.md`](../docs/technical/REVERSE_PROXY.md).

## Container (new, 2026-10-26)

`docs/container/` holds a `Containerfile` on the official `php:<version>-apache` image (Debian),
a vhost on port 8080, a `php.ini` that logs to stderr, a `compose.yaml` and the smoke test. The
same files work with Podman and Docker. Data is a volume on `/var/www/html/data`. See
[`../docs/technical/CONTAINER.md`](../docs/technical/CONTAINER.md).

## Differences master vs dev that matter

| Area | master (f08aa50) | dev (5dae13a) |
|---|---|---|
| PHP | Fatal on every request on PHP 8.x (php-dom-wrapper) | Runs on 8.3 to 8.5; on 8.2 fatal on every page (KI-GLE-2026W44-hypha-001), fixed by a 10-line change |
| DOM | php-dom-wrapper | Own helpers |
| Forms | One default form per page, CSRF injected by post-processing | One `<form>` per `HTMLForm`, CSRF field per form |
| Logged-in article view | Not testable (does not start) | 82 of 1 333 pages fail with a fatal error (KI-GLE-2026W44-hypha-002 to -004) |
