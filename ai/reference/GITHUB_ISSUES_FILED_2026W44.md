---
title: "GITHUB ISSUES FILED 2026W44: the issues filed from this review, with type, labels and impact"
revision: 2
date_created: 2026-10-26
date_last_review:
---

# GITHUB ISSUES FILED 2026W44

Issues #405-#444 on PlanBCode/hypha, filed from this review on 2026-10-26 by a contributor with the **triage** role. Labels and type follow the example the user set on #443: native type `Bug`/`Feature`/`Task`; labels `Type: Bug`/`Type: Enhancement`, `Value: ...` (`Value: Security` for security), and `Level: Easy` (<4 h) / `Moderate` (<16 h) / `Difficult` (structural, needs discussion).

**Impact** is a label since 2026-10-26, when a maintainer created `Impact: Low`, `Impact: Medium` and `Impact: High`. Every issue below has exactly one. Earlier the same day it was posted as a comment on each issue; those comments were then shortened to one line pointing to the label. Definitions:

- Impact: Low - Minor or cosmetic effect, or few users hit; easy workaround or none needed.
- Impact: Medium - Noticeable harm to some users or one key function; a workaround exists.
- Impact: High - Many installs or users hit hard: core use blocked, data loss or acute security risk.

Totals: 10 High, 13 Medium, 17 Low. Use the labels from now on, not comments (NS-GLE-2026W44-hypha-041, done).

| Issue | Type | Labels | Impact | Title |
|---|---|---|---|---|
| #405 | Bug | Type: Bug, Level: Easy, Value: Coders | High | dev fails on PHP 8.2: "Couldn't fetch HyphaDomElement" on every page (patch included) |
| #406 | Bug | Type: Bug, Level: Moderate, Value: Users | High | Logged-in article view crashes on older articles (featured image, title markup, unknown type, empty discussion) — patch included |
| #407 | Bug | Type: Bug, Level: Easy, Value: Coders | Low | PHP 8.2 deprecation: ${var} string interpolation in pages.php |
| #408 | Bug | Type: Bug, Level: Easy, Value: Coders | Low | PHP 8.1 deprecations: strftime(), null to setAttribute(), implicit float-to-int |
| #409 | Bug | Type: Bug, Level: Easy, Value: Coders | Low | PHP 8.4 deprecation: ten implicitly nullable parameters |
| #410 | Bug | Type: Bug, Level: Easy, Value: Coders | Low | PHP 8.5 deprecation: imagedestroy() (and dead mcrypt_create_iv fallback) |
| #411 | Bug | Type: Bug, Level: Difficult, Value: Security | High | Light concurrent load makes the whole site unusable (resource-exhaustion DoS) |
| #412 | Task | Type: Enhancement, Level: Easy, Value: Coders | Low | hypha_incrementStats() takes an exclusive file lock on every anonymous page view |
| #413 | Bug | Type: Bug, Level: Easy, Value: Security | High | Security: hypha.php builder embeds any readable PHP file, including hypha.php with the maintenance credentials |
| #414 | Bug | Type: Bug, Level: Easy, Value: Security | High | Security: hypha.php accepts an empty maintenance user name and password |
| #415 | Bug | Type: Bug, Level: Moderate, Value: Security | High | Security: hypha.php maintenance writes and deletes files at any path, has no CSRF protection and updates over plain HTTP |
| #416 | Bug | Type: Bug, Level: Easy, Value: Security | High | Security: image upload endpoint accepts uploads without login and reflects the file name in an HTML response |
| #417 | Bug | Type: Bug, Level: Easy, Value: Security | High | Security: mailing list send and test send do not require login |
| #418 | Bug | Type: Bug, Level: Moderate, Value: Security | High | Security: Links in recovery and invitation mails are built from the client-supplied Host header |
| #419 | Bug | Type: Bug, Level: Difficult, Value: Security | High | Security: stored XSS by members through editor HTML, user attributes and page names |
| #420 | Bug | Type: Bug, Level: Easy, Value: Security | Medium | Security: failed CSRF check does not stop datatype commands |
| #421 | Bug | Type: Bug, Level: Easy, Value: Security | Medium | Security: tag commands can be executed without login |
| #422 | Bug | Type: Bug, Level: Easy, Value: Security | Medium | Security: page type of a new page is stored and instantiated without validation |
| #423 | Bug | Type: Bug, Level: Moderate, Value: Security | Medium | Security: image file names from forms are used as paths; thumbnail generation crashes on unreadable images |
| #424 | Bug | Type: Bug, Level: Moderate, Value: Security | Medium | Security: No limit on login attempts; account recovery reveals registered accounts and sends unlimited mails |
| #425 | Bug | Type: Bug, Level: Moderate, Value: Security | Medium | Security: Registration, recovery and festival keys never expire, invitation keys are predictable, keys compared with == |
| #426 | Bug | Type: Bug, Level: Moderate, Value: Security | Medium | Security: Legacy unsalted MD5 password hashes compared with == and never upgraded; password change without current password |
| #427 | Bug | Type: Bug, Level: Easy, Value: Security | Medium | Security: protection of data/ relies only on .htaccess; README advises chmod -R 777 |
| #428 | Bug | Type: Bug, Level: Easy, Value: Security | Medium | Security: mail header injection through the mailing-list sender name |
| #429 | Bug | Type: Bug, Level: Moderate, Value: Security | Medium | Security: unescaped anonymous and member input in the digest e-mail |
| #430 | Bug | Type: Bug, Level: Easy, Value: Security | Medium | Security: anonymous forms allow resource exhaustion and mail flooding |
| #431 | Bug | Type: Bug, Level: Easy, Value: Security | Low | Security: festival contribution website is linked whatever its URL scheme |
| #432 | Feature | Type: Enhancement, Level: Easy, Value: Security | Low | Security: no security headers (nosniff, Referrer-Policy, frame protection, CSP) |
| #433 | Bug | Type: Bug, Level: Moderate, Value: Security | Low | Security: Logout keeps the session id, and logins have no idle or absolute timeout |
| #434 | Bug | Type: Bug, Level: Easy, Value: Security | Low | Security: CSRF token has only 64 bits and is not compared in constant time |
| #435 | Bug | Type: Bug, Level: Easy, Value: Security | Low | Security: theme name is not confined to data/themes |
| #436 | Bug | Type: Bug, Level: Easy, Value: Security | Low | Security: information disclosure through the hypha.php file index, DEBUG mode and the X-Mailer header |
| #437 | Task | Type: Enhancement, Level: Difficult, Value: Security | Low | Security: outdated bundled JavaScript (jQuery 1.7.1, WYMeditor 1.1.1 with underscore 1.4.4 and lodash 2.4.2, Bowser 1.x) |
| #438 | Bug | Type: Bug, Level: Moderate, Value: Security | Low | Security: mailing list can send a mailing twice, get stuck in "sending", or change a mailing while it is sent |
| #439 | Bug | Type: Bug, Level: Easy, Value: Security | Low | Security: open redirect edge cases in the installer and in the reload after a command |
| #440 | Bug | Type: Bug, Level: Easy, Value: Security | Medium | Security: mailing-list subscribe and batch add fail with TypeError on dev (appendText with an element) |
| #441 | Task | Type: Enhancement, Level: Easy, Value: Security | Low | Security: remove dead legacy code (preg_replace /e, commented unserialize scheduler) and stop after the installer redirect |
| #442 | Task | Type: Enhancement, Level: Easy, Value: Security | Low | Security: no committed credentials found; add a secret scanner to CI to keep it that way |
| #443 | Feature | Type: Enhancement, Level: Moderate, Value: Security | Low | Add a honeypot that blocks scanners for five minutes |
| #444 | Feature | Type: Enhancement, Level: Moderate, Value: Coders, Value: Security | Medium | Add structured tracing with message codes and an audit trail (example patch) |

## Older issues labelled on 2026-10-26

Issues #397-#404 were filed earlier (April 2026) and had no labels or type. They got the same scheme:

| Issue | Type | Labels |
|---|---|---|
| #397 Docker Compose boot files | Task | Type: Enhancement, Value: Coders, Level: Easy, Impact: Low |
| #398 Scheme calculation behind an SSL reverse proxy | Bug | Type: Bug, Value: Coders, Level: Easy, Impact: Medium |
| #399 PHP compatibility | Bug | Type: Bug, Value: Coders, Level: Difficult, Impact: High, Usecase: De Stadsbron |
| #400 hypha.xml with multiple entities versus ACID | Task | Type: Question, Value: Coders, Level: Difficult, Impact: Medium |
| #401 User ID for author instead of user name | Feature | Type: Enhancement, Value: Coders, Privacy GDPR AVG, Level: Moderate, Impact: Medium |
| #402 General error handler | Feature | Type: Enhancement, Value: Coders, Level: Easy, Impact: Medium |
| #403 Data model | Task | Type: Enhancement, Value: Coders, Level: Easy, Impact: Low |
| #404 Test mode against indexing of test sites | Feature | Type: Enhancement, Value: Visitors, Level: Easy, Impact: Medium, Usecase: De Stadsbron |

## Pull requests opened on 2026-10-26

All from branches in the contributor's fork, each with the labels of its issue plus `Status: Needs review`, tested in the container on PHP 8.5, and on PHP 8.2 together with the fix of #405.

**History.** The first 27 were opened against `dev` (#445-#473). At about 16:27 UTC a maintainer removed `dev` and made `main` the default branch at the same commit (5dae13a); GitHub then closed every PR against `dev` automatically. They were opened again against `main` as #475-#501, each starting with "Replaces #old", and references between PRs were renumbered. #475 (the PHP 8.2 fix, #405) was merged into `main` at 17:02 UTC with two small maintainer commits (`iterable` type declarations, `is_iterable` polyfill removed). All other branches still merge cleanly onto that `main` (checked 2026-10-26).

| PR | Was | Fixes | Branch | Title | State |
|---|---|---|---|---|---|
| #475 | #445 | #405 | `php82-createfromhtml-detached-nodes` | createFromHtml: Return detached nodes so dev runs on PHP 8.2 | MERGED |
| #476 | #446 | #444 | `tracing-message-codes-audit` | trace: Add structured tracing with message codes and an audit trail | OPEN |
| #477 | #447 | #398 | `proxy-https-scheme` | HyphaRequest: Check HTTPS before REQUEST_SCHEME in getScheme() | OPEN |
| #478 | #448 | #402 | `general-error-handler` | index: Show an error page instead of an empty 500 | OPEN |
| #479 | #449 | #404 | `allow-index-test-mode` | settings: Add option to keep a site out of search engines | OPEN |
| #480 | #450 | #443 | `honeypot-scanner-trap` | honeypot: Block scanners for five minutes | OPEN |
| #481 | #451 | #440 | `mailinglist-subscribe-appendchild` | mailinglist: Append new addresses as elements, not as text | OPEN |
| #482 | #452 | #441 | `remove-dead-legacy-code` | Remove dead legacy code and stop after the installer redirect | OPEN |
| #483 | #454 | #438 | `mailing-send-race` | mailinglist: Check the mailing status under the lock before sending | OPEN |
| #484 | #455 | #439 | `redirect-edge-cases` | Close open-redirect edge cases in the installer and the reload | OPEN |
| #485 | #456 | #434 | `csrf-token-hardening` | RequestContext: Use a 128-bit CSRF token compared in constant time | OPEN |
| #486 | #457 | #435 | `theme-path-confinement` | settings: Only accept an existing theme name | OPEN |
| #487 | #458 | #436 | `info-disclosure` | Reduce information disclosure in hypha.php and outgoing mail | OPEN |
| #488 | #459 | #431 | `festival-website-scheme` | festival: Only link a contributor's website when it is http(s) | OPEN |
| #489 | #460 | #432 | `security-headers` | htaccess: Send basic security headers | OPEN |
| #490 | #461 | #433 | `session-lifecycle` | Renew the session at logout and end idle or old logins | OPEN |
| #491 | #462 | #426 | `legacy-md5-hashes` | Retire legacy MD5 password hashes and ask for the current password | OPEN |
| #492 | #463 | #425 | `token-expiry` | Expire invitation and recovery keys, and make keys unguessable | OPEN |
| #493 | #464 | #424 | `login-throttling` | users: Limit login attempts and recovery mails, and stop account enumeration | OPEN |
| #494 | #465 | #427 | `data-folder-protection` | Stop Hypha when data/ can be downloaded, and fix the README advice | OPEN |
| #495 | #466 | #428 | `mail-header-injection` | communication: Sanitise the sender name and address of outgoing mail | OPEN |
| #496 | #467 | #429 | `digest-escaping` | Escape user-supplied values in the digest mail | OPEN |
| #497 | #468 | #430 | `anonymous-mail-flood` | mailinglist: Send at most one confirmation mail per 15 minutes | OPEN |
| #498 | #469 | #96 | `jquery-upgrade` | jquery: Upgrade from 1.7.1 to 3.7.1 | OPEN |
| #499 | #471 | #418 | `configured-base-url` | Add a configurable site address and stop trusting the Host header | OPEN |
| #500 | #472 | #420 | `csrf-stop-processing` | Stop the request when the CSRF token is invalid | OPEN |
| #501 | #473 | #421 | `tag-commands-auth` | Require login for tag commands and fix creating a tag | OPEN |
| #502 | - | #422 | `new-page-type-validation` | Only accept known datatypes as the type of a new page | OPEN |
| #503 | - | #423 | `image-name-confinement` | Keep image names inside data/images and survive unreadable images | OPEN |
| #504 | - | #413 | `builder-file-allowlist` | hypha.php: Only embed shareable system files in the builder | OPEN |
| #505 | - | #414 | `maintenance-empty-credentials` | hypha.php: Refuse login while the superuser values are empty | OPEN |
| #506 | - | #415 | `maintenance-path-csrf-https` | hypha.php: Confine maintenance to system files, add a token, use HTTPS | OPEN |
| #507 | - | #407 | `deprecation-string-interpolation` | pages: Use {$var} instead of ${var} in a string (deprecated in PHP 8.2) | OPEN |
| #508 | - | #408 | `deprecation-php81` | Fix PHP 8.1 deprecations: strftime(), null to setAttribute(), float to int | OPEN |
| #509 | - | #409 | `deprecation-implicit-nullable` | Mark parameters with a null default explicitly nullable (deprecated in PHP 8.4) | OPEN |
| #510 | - | #410 | `deprecation-imagedestroy` | Remove imagedestroy() (deprecated in PHP 8.5) and the mcrypt fallback | OPEN |
| #511 | - | #416 | `image-upload-login` | upload/image: Require login and escape markup in the JSON answer | OPEN |
| #512 | - | #417 | `mailing-send-login` | mailinglist: Require login to send a mailing or a test mail | OPEN |
| #513 | - | #412 | `stats-without-lock` | hypha_incrementStats: Skip the view instead of waiting for the lock (no throughput gain) | OPEN |
| #516 | - | #514 | `index-letter-increment` | index: Step through the letters without $capital++ | OPEN |
| #517 | - | #515 | `mailing-view-import` | mailinglist: Import the mailing's nodes when viewing it | OPEN |

Checked on 2026-10-26 for every issue where a PR was asked (41 issues): each has exactly one live PR from the fork (#475 merged, the rest open against `main` with labels), the PRs that GitHub closed are replaced, and no open PR of someone else references the issue.

Added later on 2026-10-26:

| PR | Was | Fixes | Branch | Title | State |
|---|---|---|---|---|---|
| #518 | - | #411 | `site-data-cache-411` | core: Cache anonymous page views and site data in APCu (fix 2); tested on 8.2 and 8.5 with and without APCu, four problems fixed in a second commit | OPEN (draft) |
| #519 | - | #406 | `logged-in-article-crashes` | Stop logged-in article views and the moderation view from crashing (logged-in crawl 82 → 0 failures) | OPEN |

## Filed during the build of the Markdown editor (#520), 2026-10-27

Bugs in existing code found while building, testing and documenting the editor on branch `issue520-bouw`; each reproduced on `main` (d97ab7b) with a fictional site, labels set per the rules above, pull requests labelled `Status: Needs review`.

| Issue | PR | Area | Title |
|---|---|---|---|
| #525 | #531 | article | Article title is parsed as HTML in the page heading, and a new article without title crashes |
| #526 | #532 | hypha.php | The built installer misses subfolders, assets, macros and the default theme, and fails without data/ |
| #527 | #533 | templates | Invalid HTML in four templates gives a PHP warning on almost every page |
| #528 | #534 | versions | Translation saved in the same second gets the same xml:id as a version of another language |
| #529 | #535 | article | Any member can publish an approved article by posting the command |
| #530 | #536 | text page | Unknown version number gives a fatal error on a text page |
| #537 | #538 | festival | A new festival page opens on 'Page not found' |
| #539 | #540 | input | A control character or invalid UTF-8 in a comment or full name makes the article or the whole site unreadable |
| #541 | #542 | routing | Request path not percent-decoded: pages with a non-ASCII name give 404 |
| #543 | - | page names | `validatePagename()` drops non-ASCII letters |
| #544 | #545 | mail | Over-long encoded mail subject |
| #546 | #547 | festival | Festival settings show the raw key festival-field-festival-description |
| #548 | #562 | festival | Festival sign-up fails with a fatal error: undefined constant FIELD_NAME_ATTENDING |
| #549 | #563 | festival | Security: festival timetable shows a contribution's title, day and location as HTML |
| #550 | - | festival | A failed Mollie call logs warnings and sends the participant on as if paid |
| #551 | #564 | mailing list | An invalid confirm or unsubscribe link and other GET errors end in an endless redirect |
| #552 | #565 | mailing list | 'unsubscribe' by an administrator does nothing for an address that subscribed again |
| #553 | - | mailing list | Security: address actions are GET links without CSRF token; mailing progress needs no login |
| #554 | #566 | users | Security: user names are not unique, so a member can take another member's name |
| #555 | - | users | Invitations: an existing account gets a registration link; unchecked input creates broken invitees |
| #556 | - | settings | Fatal errors on an unknown user or a non-numeric digest interval; members get a menu editor that does not save |
| #557 | #568 | languages | Raw translation keys on the festival, mailing list, index, tag index and settings pages |
| #558 | #567 | festival | PHP 8.5 deprecation: curl_close() in the Mollie API client |
| #559 | - | warnings | PHP warnings on incomplete tag index and mailing list addresses |

