---
title: "REQUIREMENTS, what Hypha must run on and what it must do"
revision: 1
date_created: 2026-10-26
date_last_review:
---

# REQUIREMENTS

Requirements carry an id `REQ-nnn` so a test, a decision or a pull request can cite them. A
requirement changes only through a decision in [`../DECISIONS.md`](../DECISIONS.md).

## Platform

| Id | Requirement | Source | How verified |
|---|---|---|---|
| REQ-001 | **Hypha must work on PHP 8.2.** It is the lowest supported version. | Agreed by the maintainers on 2026-10-26: Debian oldstable ships 8.2 and php.net gives it security support until 2026-12-31. D-GLE-2026W44-hypha-001. | `docs/container/smoke_test.py` anonymously and logged in against a copy of a production data set, in the `php:8.2-apache` container, with no fatal error and no new warning in the log. |
| REQ-002 | Hypha must also work on PHP 8.3, 8.4 and 8.5 without change. Code uses nothing introduced after 8.2 and nothing deprecated up to 8.5. | Same decision: "works from 8.2 up to and including 8.5"; Debian stable ships 8.4. | Same tests per version; `docs/container/check_deprecations.sh` reports nothing for the changed files. |
| REQ-003 | The supported range moves with php.net: a version is dropped once Debian oldstable no longer ships it and php.net security support has ended. | D-GLE-2026W44-hypha-001, consequences. | Reviewed when a Debian release or a php.net end-of-life date passes (NS-GLE-2026W44-hypha-019). |
| REQ-004 | Web server: Apache 2.4 with mod_php (or PHP-FPM) and mod_rewrite, `AllowOverride FileInfo` for the web root so `.htaccess` applies. | `index.php:28`, `.htaccess`. | Container image. |
| REQ-005 | PHP extensions: dom, libxml, xml, mbstring, gd (jpeg, png, gif), curl (Mollie, festival), openssl, zlib, fileinfo, session. | Inventory of calls on 2026-10-26. | Container image builds them; the smoke test exercises all but curl. |
| REQ-006 | The web server user can write to `data/` and nothing else in the web root. | `hypha.php` installs into `.`, `data/` is the store. | Container runs as `www-data` with only `data/` as a volume. |
| REQ-007 | No database server; all data is in XML files below `data/`. | Design principle "Lightweight", `documentation.txt`. | Architecture. |
| REQ-008 | Outgoing e-mail through PHP `mail()`, so the host needs a working sendmail or an MTA relay. | `system/core/communication.php`. | Not testable in the container without an MTA (test sites cannot send mail). |

## Functional, as built

| Id | Requirement | Where |
|---|---|---|
| REQ-101 | Any member can create, edit, translate and revert pages; every version is kept. | `system/datatypes/text.php` |
| REQ-102 | Pages can be private (members only). | `private` attribute in `hypha.xml` |
| REQ-103 | Articles go through draft, review (three approvals, no blocking review comments), approved, published, retracted. | `system/datatypes/peer_reviewed_article.php`, `APPROVES_NEEDED = 3` |
| REQ-104 | Visitors may comment on published articles after confirming their e-mail address; members moderate comments. | idem |
| REQ-105 | Mailing lists with double opt-in, unsubscribe link in every mailing, and sending of mailings to all confirmed addresses. | `system/datatypes/mailinglist.php` |
| REQ-106 | Members get a periodic digest of changes (interval set by the administrator). | `flushDigest()`, `digestInterval` |
| REQ-107 | Membership by invitation only; administrators manage members, theme, menu and site settings. | `system/datatypes/settings.php` |
| REQ-108 | Content and interface in several languages; interface in English and Dutch. | `system/languages/` |

## Non-functional, wanted but not yet met

These are the gaps listed in
[`../investigation/open/20261026_RELIABILITY_AVAILABILITY_SERVICEABILITY.md`](../investigation/open/20261026_RELIABILITY_AVAILABILITY_SERVICEABILITY.md);
each has a row in [`../NEXT_STEPS.md`](../NEXT_STEPS.md).

| Id | Requirement |
|---|---|
| REQ-201 | An uncaught error shows a friendly page and is logged with the URL, never a blank page or a stack trace. |
| REQ-202 | A logged-in editor can open every existing page; a damaged or legacy page is shown with a warning, not a fatal error. |
| REQ-203 | A backup of `data/` can be made and restored while the site runs, and is tested. |
| REQ-204 | A health endpoint reports whether `data/hypha.xml` is readable and writable. |
| REQ-205 | Security fixes can be released for the supported line within days. |
