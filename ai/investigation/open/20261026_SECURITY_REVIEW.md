---
title: "SECURITY REVIEW: white-box review of dev and master, with the points to address"
revision: 1
date_created: 2026-10-26
date_last_review:
state: open
confidentiality: "Do not publish before the Critical and High findings are fixed or coordinated with the maintainer"
---

# SECURITY REVIEW

> **Handling (updated 2026-10-26).** The maintainer’s contributor decided to file these publicly
> because the affected sites were taken offline. All findings are now GitHub issues (see below).
> Until then this was kept private.

Scope: `upstream/dev` at 5dae13a (primary, about to go live) and `master` at f08aa50. Method: a
static, white-box reading of all own PHP (`index.php`, `hypha.php`, `system/core`,
`system/datatypes`, `system/macros`, `system/mollie`) and of how third-party JavaScript is served;
dynamic checks only where the container test touched the same paths. Findings marked
**(re-read)** were checked a second time in the code for this document; the others come from one
reading and should be confirmed when fixing. Exploit descriptions are kept conceptual.

## Executive summary

The request core has good foundations: bcrypt hashes, a new session id at login, HttpOnly and
SameSite=Strict cookies, a CSRF token on commands, consistent XPath escaping, atomic locked file
writes, contained static file serving and error display off by default.

The serious weaknesses are concentrated in three places:

1. **`hypha.php`**, the installer and maintenance script that stays in the web root. Its build
   function reads files for anyone, a git-based install has empty maintenance credentials, and
   maintenance can delete and write files and fetch code over plain HTTP into `unserialize()`.
   Together these allow takeover of a site.
2. **Missing authorisation** on a few endpoints that anonymous visitors can reach: the editor's
   image upload, sending (test) mailings, and tag changes.
3. **Trust in members and in the request**: HTML from the editor is only checked for `<script>`,
   some admin views print member data unescaped, and links in password and invitation e-mails
   are built from the `Host` header.

Quick wins with the most effect: remove or lock `hypha.php` on production sites, add the missing
`isUser()` checks, stop processing a request after a failed CSRF check, build mail links from a
configured site URL, and use an allow-list HTML sanitiser.


## GitHub issues

Filed publicly on 2026-10-26 (the sites were offline), each with the suggested patch marked as a starting point:

- SEC-001 → PlanBCode/hypha#413
- SEC-002 → PlanBCode/hypha#414
- SEC-003 → PlanBCode/hypha#415
- SEC-004 → PlanBCode/hypha#416
- SEC-005 → PlanBCode/hypha#417
- SEC-006 → PlanBCode/hypha#418
- SEC-007 → PlanBCode/hypha#419
- SEC-008 → PlanBCode/hypha#420
- SEC-009 → PlanBCode/hypha#421
- SEC-010 → PlanBCode/hypha#422
- SEC-011 → PlanBCode/hypha#423
- SEC-012 → PlanBCode/hypha#424
- SEC-013 → PlanBCode/hypha#425
- SEC-014 → PlanBCode/hypha#426
- SEC-015 → PlanBCode/hypha#427
- SEC-016 → PlanBCode/hypha#428
- SEC-017 → PlanBCode/hypha#429
- SEC-018 → PlanBCode/hypha#430
- SEC-019 → PlanBCode/hypha#431
- SEC-020 → PlanBCode/hypha#432
- SEC-021 → PlanBCode/hypha#433
- SEC-022 → PlanBCode/hypha#434
- SEC-023 → PlanBCode/hypha#435
- SEC-024 → PlanBCode/hypha#436
- SEC-025 → PlanBCode/hypha#437
- SEC-026 → PlanBCode/hypha#438
- SEC-027 → PlanBCode/hypha#439
- SEC-028 → PlanBCode/hypha#440
- SEC-029 → PlanBCode/hypha#441
- Credential scan (clean) → #442. Honeypot feature → #443.

## Findings

| Id | Title | Severity | Also master |
|---|---|---|---|
| SEC-001 | `hypha.php` build command reads arbitrary `*.php` files without login, including itself with the maintenance credentials | Critical | Yes |
| SEC-002 | `hypha.php` ships with empty maintenance credentials and accepts them: maintenance and installer open to anyone on a git install | Critical | Yes |
| SEC-003 | `hypha.php` maintenance deletes and writes files at any path, has no CSRF protection, and updates over plain HTTP into `unserialize()` | High | Yes |
| SEC-004 | Image upload endpoint `/upload/image` without login; file name reflected in a `text/html` response | High | Yes |
| SEC-005 | Mailing list "send" and "send test" without authorisation: open mail relay | High | Yes |
| SEC-006 | Password recovery and invitation links built from the `Host` header: account takeover | High | Yes |
| SEC-007 | Stored XSS by any member: only `<script>` is refused, member attributes printed unescaped in admin views | High | Yes |
| SEC-008 | Failed CSRF check does not stop datatype commands | Medium | Yes |
| SEC-009 | Tag commands without authorisation | Medium | Yes |
| SEC-010 | Unvalidated page type is stored and instantiated | Medium | Yes |
| SEC-011 | Path traversal in festival image fields and thumbnail generation; thumbnail crash | Medium | Yes |
| SEC-012 | No brute-force limit on login; user enumeration and unlimited mails via account recovery | Medium | Yes |
| SEC-013 | Recovery, invitation and festival tokens without expiry, invitation key from `uniqid(rand())`, loose `==` compare | Medium | Yes |
| SEC-014 | Legacy unsalted MD5 hashes accepted with `==` and never upgraded | Medium | Yes |
| SEC-015 | Protection of `data/` relies only on `.htaccess`; README advises `chmod -R 777` | Medium | Yes |
| SEC-016 | Mail header injection via mailing-list sender name | Medium | Yes |
| SEC-017 | Anonymous HTML injection into digest e-mails | Medium | Yes |
| SEC-018 | Anonymous resource exhaustion and mail bombing (comments, sign-ups, subscriptions, uploads) | Medium | Yes |
| SEC-019 | Festival "website" field accepts `javascript:` URLs | Low | Yes |
| SEC-020 | No security headers (CSP, frame-ancestors, nosniff, Referrer-Policy, HSTS) | Low | Yes |
| SEC-021 | Session lifecycle: logout does not destroy the session, no idle or absolute timeout | Low | Yes |
| SEC-022 | CSRF token of 64 bits, compared without `hash_equals` | Low | Yes |
| SEC-023 | Admin-only path traversal in theme name and theme copy | Low | Yes |
| SEC-024 | Information disclosure: public file index of `hypha.php`, DEBUG mode, `X-Mailer` | Low | Yes |
| SEC-025 | Outdated JavaScript: jQuery 1.7.1, WYMeditor 1.1.1 with underscore 1.4.4 and lodash 2.4.2, Bowser 1.x | Low | Yes |
| SEC-026 | Concurrency: duplicate mailing sends, stuck "sending", lost updates | Low | Yes |
| SEC-027 | Open-redirect edge cases (installer `setupBaseUrl`, reload to `REQUEST_URI`) | Info | Yes |
| SEC-028 | Dev only: mailing-list subscribe throws `TypeError` (KI-GLE-2026W44-hypha-009) | Info | No |
| SEC-029 | Dead and legacy code (`preg_replace /e` remnants, commented `unserialize`, `header()` without `exit`) | Info | Partly |

## Details and recommendations

### SEC-001 build command without login (re-read)
`hypha.php:461` runs `buildzip()` before any login check. `buildzip()` (`hypha.php:101-127`) turns
every POST field named `build_<x>` into a file name `<x>.php` and embeds that file in the download.
`hypha.php` itself holds `$username` and `$password` in clear text at lines 9-10. The page also
answers anonymously with the builder form (`/hypha.php` returned 200 in the container test).
**Fix:** require the maintenance login for every command; only offer files from the fixed list of
`isAllowedFile()`; never embed `hypha.php` with its credentials. Better: do not keep `hypha.php` on
a production site at all (move it out of the web root after installing).

### SEC-002 empty maintenance credentials (re-read)
`$username = ''; $password = '';` at `hypha.php:9-10` and the comparison at `:454` accept an empty
user name and password. On a git install that is the default. With `data/hypha.xml` present this
opens maintenance (SEC-003); without it, the installer, which creates a new administrator.
**Fix:** refuse to log in while either value is empty; let the installer require a password set at
install time; store a hash, not the password.

### SEC-003 maintenance file operations and update channel
`tools()` (`hypha.php:136-152`) writes or deletes the file named in the `argument` field without
path check and without CSRF token. Updates are fetched from `http://www.hypha.net/hypha.php`
(`:440`), and the index is read with `unserialize()`. **Fix:** HTTPS with certificate check,
`json_decode` instead of `unserialize`, an allow-list of paths, a CSRF token, and preferably no
remote update function on production sites.

### SEC-004 image upload without login (re-read)
`system/core/pages.php:306-345` handles `/upload/image` for any visitor. Files are checked with
`getimagesize` and an extension list and stored under a generated name, which is good, but the
response echoes the original name. **Fix:** `if (!isUser()) return '403'` at the start; return JSON
with `Content-Type: application/json` and without the original name.

### SEC-005 mailing send without authorisation (re-read)
`mailingSendAction` and `mailingSendTestAction` (`system/datatypes/mailinglist.php:1113`, `:1193`)
are dispatched from `process()` (`:126-127`) without `isUser()`. The test send mails a published
mailing to an address chosen by the poster. **Fix:** `isUser()` at the start of both, as the other
actions of the datatype do.

### SEC-006 Host header in mail links (re-read)
`HyphaRequest::getHost()` returns `$_SERVER['HTTP_HOST']` (`system/core/HyphaRequest.php:156`);
`getRootUrl()` builds on it and is used in the recovery mail (`system/core/users.php:208`) and the
invitation (`system/datatypes/settings.php:126`). A request with a forged Host header makes the
site mail a link to another host. **Fix:** a configured base URL in `hypha.xml`, or Apache
`UseCanonicalName On` with a fixed `ServerName`; validate the Host header against it.

### SEC-007 stored XSS by members
`HTMLForm::validateHtmlField` (`system/core/document.php:735-753`) only rejects `<script>`.
Event-handler attributes and `javascript:` URLs pass. `settings.php` prints user name, full name
and e-mail unescaped in several views; page names are printed unescaped in
`system/datatypes/index.php:70` and `system/core/base.php:815` (the container test found a page
name containing `'><img src=` on De Stadsbron). A member can thus run script in an
administrator's browser. **Fix:** an allow-list sanitiser for editor HTML (elements and attributes
the editor produces, URL schemes http, https, mailto, relative), `htmlspecialchars` on every
printed attribute, and a check on page names.

### SEC-008 CSRF failure does not stop processing (re-read)
`executePostedCommand()` (`system/core/events.php:277-296`) returns after a failed token check, but
`index.php:126` still calls `$hyphaPage->process()`, which dispatches datatype commands from the
same POST. Today only SameSite=Strict prevents abuse. **Fix:** end the request (HTTP 400) when a POST
carries a command and the token is invalid.

### SEC-009 to SEC-018
- **SEC-009** `tagSelect`, `tagDeselect`, `tagNew` (`system/core/tags.php:177-258`): add `isUser()`.
- **SEC-010** `newPageType` (`pages.php:376`, instantiated at `:229`): accept only keys of
  `hypha_getDataTypes()`.
- **SEC-011** festival `image` and `file_shadow_*` (`HyphaImage.php:53-70`, `:148-177`): resolve
  with `realpath` below `data/images`; handle a failed `imagecreatefrom*` instead of passing
  `false` to `imagesx`.
- **SEC-012** login and recovery: a delay or counter per account and per IP, the same answer
  whether or not the account exists, a limit on recovery mails.
- **SEC-013** tokens from `bin2hex(random_bytes(16))`, an expiry date, `hash_equals`.
- **SEC-014** after a successful MD5 login, re-hash with `password_hash`; compare with
  `hash_equals`; ask for the old password when changing it.
- **SEC-015** deny `data/` except `data/themes/` in the Apache configuration as well
  (`<LocationMatch "^/data/(?!themes/)">`; a `<Directory>` deny also blocks the theme CSS, tested), keep code outside writable folders, replace `chmod -R 777` in the README by write
  access for the web server user on `data/` only.
- **SEC-016** strip CR and LF from every header value; validate the sender address.
- **SEC-017** escape anonymous input before it goes into the digest.
- **SEC-018** rate limits and size limits on anonymous forms; a confirmation step before mail.

### SEC-019 to SEC-029
Low and informational items; fix with the surrounding code. SEC-020: the container vhost in
`docs/container/hypha-vhost.conf` already sends `X-Content-Type-Options`, `Referrer-Policy` and
`X-Frame-Options`; a CSP needs the inline scripts of `events.php` moved out first. SEC-025: replacing
WYMeditor is a project of its own (issue bundle "editor").

## What is done well

- `password_hash` (bcrypt) for new passwords; session id regenerated at login.
- Session cookie HttpOnly, SameSite=Strict, Secure on HTTPS, path-limited.
- CSRF token from a CSPRNG, required for registered commands.
- `xpath_encode()` used consistently; no XPath injection found.
- `HyphaFile`: `flock` plus temporary file and rename.
- `serveFile()` confines paths with `realpath`; direct requests for `data/hypha.xml` and
  `system/core/*.php` give 404 (measured).
- Uploaded images are decoded by GD and stored under generated names.
- The Mollie webhook fetches the payment status from Mollie instead of trusting the request.
- Mailing-list and article codes use `random_bytes`.
- Error display off unless a `DEBUG` file exists; PHP 8 libxml defaults prevent XXE.

## Next steps

Rows NS-GLE-2026W44-hypha-002 to -008 in [`../../NEXT_STEPS.md`](../../NEXT_STEPS.md).
