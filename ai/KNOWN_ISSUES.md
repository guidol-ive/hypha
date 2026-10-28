---
title: "KNOWN_ISSUES"
revision: 1
date_created: 2026-10-26
date_last_review:
---

# KNOWN_ISSUES

> Compiled 2026-10-26. "Measured" means reproduced in the container test
> ([`measurement/20261026_PHP_8_2_CONTAINER_TEST.md`](measurement/20261026_PHP_8_2_CONTAINER_TEST.md));
> "analysis" means found by reading code and not run. Security findings are kept apart in
> [`investigation/open/20261026_SECURITY_REVIEW.md`](investigation/open/20261026_SECURITY_REVIEW.md);
> the GitHub backlog in [`investigation/open/20261026_GITHUB_ISSUES.md`](investigation/open/20261026_GITHUB_ISSUES.md).
> Line numbers refer to `upstream/dev` at 5dae13a.
>
> **GitHub** per entry gives the issue on PlanBCode/hypha and its state as read on
> 2026-10-26; "no GitHub issue" means none existed on that date. Issues #405-#410 were filed
> from this review.

## PHP 8 compatibility

- **KI-GLE-2026W44-hypha-001, dev does not run on PHP 8.2 (measured).** Every page fails with
  `Uncaught Error: Couldn't fetch HyphaDomElement` at `system/core/database.php:393`.
  `HyphaDomDocument::createFromHtml()` (`database.php:112-125`) returns
  `$this->importNode($body, true)->childNodes`: the imported `<body>` is a detached node held
  only by a temporary PHP object. On PHP 8.2 the subtree is freed when that object goes, so the
  child objects in the returned list point to freed nodes. On 8.3, 8.4 and 8.5 the same code works
  (measured; the exact change in PHP's DOM extension was not looked up), which suggests
  that test.destadsbron.nl, where dev works, runs PHP 8.3 or newer (not verified). Verified fix, 10 lines:
  detach the children with `removeChild` into a PHP array and return the array; adjust
  `HTMLForm::__construct` (`system/core/document.php:318-322`), which read `->length` and
  `->item(0)` of the result, to `count()` and `[0]`. With the fix, dev passes the same crawl on
  8.2, 8.4 and 8.5. Patch in
  [`design/concept/20261026_PHP82_DETACHED_NODES.md`](design/concept/20261026_PHP82_DETACHED_NODES.md),
  reported with the patch as PlanBCode/hypha#405 (NS-GLE-2026W44-hypha-001). **GitHub:** #405 (CLOSED 2026-10-26, solved by PR #475 in `main`, filed 2026-10-26 with the patch); PR #475 (MERGED into main 2026-10-26); the wider PHP-8 breakage is #399 (OPEN, last activity 2026-04-16).
- **KI-GLE-2026W44-hypha-006, master does not run on any PHP 8 (measured).**
  `system/php-dom-wrapper/Traits/ManipulationTrait.php:163` conflicts with `DOMElement::remove()`.
  Resolved on `dev` by removing the library; master stays broken until dev is merged. **GitHub:** #399 PHP compatibility (OPEN, last activity 2026-04-16).
- **KI-GLE-2026W44-hypha-007, deprecations in the 8.2-8.5 range (measured).** `${var}`
  interpolation (8.2), ten implicitly nullable parameters (8.4), `strftime` (8.1), `null` to
  `setAttribute` (8.1), float to int in `HyphaImage` (8.1), `imagedestroy` (8.5). Details and
  fixes in [`measurement/20261026_PHP_DEPRECATIONS.md`](measurement/20261026_PHP_DEPRECATIONS.md). **GitHub:** filed as #407 (`${var}`), #408 (strftime, setAttribute, float), #409 (nullable params), #410 (imagedestroy), all OPEN 2026-10-26; strftime also relates to #353 (OPEN).
- **KI-GLE-2026W44-hypha-008, stale version guards (analysis).** `index.php:27` and
  `hypha.php:434` check for PHP 5.4; README on dev says 8.2. **GitHub:** no dedicated issue as of 2026-10-26; belongs with the #407-#410 fixes and #399.

## Regressions of the DOM rewrite on dev (measured, all PHP versions)

- **KI-GLE-2026W44-hypha-002, articles without or with several `featured_image` crash for
  members.** The check `has-featured-image` (`system/datatypes/peer_reviewed_article.php:458-463`)
  calls `findOneXPath('//featured_image')->getText()`: null on 42 older articles, an exception on
  28 articles whose file holds several versions. Scope the query to the current article node and
  treat "none" as "no image". **GitHub:** #406 (CLOSED 2026-10-28, solved by PR #519 in `main`, filed 2026-10-26 with the patch in [`design/concept/20261026_LOGGED_IN_ARTICLE_CRASHES.md`](design/concept/20261026_LOGGED_IN_ARTICLE_CRASHES.md)).
- **KI-GLE-2026W44-hypha-003, an article title with markup crashes `getTitle()`.**
  `peer_reviewed_article.php:2008-2012` calls `getText()`, which throws on non-text children
  (10 articles). Use `textContent` or `extractText()`. **GitHub:** #406 (CLOSED 2026-10-28, but this part is not solved in `main` 41482e9: #649 (OPEN, filed 2026-10-28), filed 2026-10-26 with the patch in [`design/concept/20261026_LOGGED_IN_ARTICLE_CRASHES.md`](design/concept/20261026_LOGGED_IN_ARTICLE_CRASHES.md)).
- **KI-GLE-2026W44-hypha-004, a page of a removed datatype is a fatal error.**
  `createPageInstance()` (`system/core/pages.php:229`) instantiates `type` blindly; De Stadsbron
  has one page of type `article`. Show a notice and a 404, or map legacy types. **GitHub:** #406 (CLOSED 2026-10-28, solved by PR #519 in `main`, filed 2026-10-26 with the patch in [`design/concept/20261026_LOGGED_IN_ARTICLE_CRASHES.md`](design/concept/20261026_LOGGED_IN_ARTICLE_CRASHES.md)).
- **KI-GLE-2026W44-hypha-009, mailing-list subscribe and batch add throw `TypeError` (analysis,
  from the security review).** `appendText($address)` at `mailinglist.php:359` and `:417` with a
  non-string. Not reached by the crawl, which does not post. **GitHub:** no GitHub issue as of 2026-10-26 (from the private security review; not filed publicly).
- **KI-GLE-2026W44-hypha-010, `if (...);` in `HTMLForm` (analysis).**
  `system/core/document.php:325` and `:333` read `if ($form->ownerDocument !== $doc);` with a
  stray semicolon, so the node is always imported, also when it already belongs to the document.
  Harmless today (a copy is used), but the intent was different. **GitHub:** no GitHub issue as of 2026-10-26.

## Robustness and logging

- **KI-GLE-2026W44-hypha-005, libxml warnings flood the log (measured).** About 17 000 warnings
  per crawl of 4 000 requests: HTML 5 and custom tags (`macro`, `editor`, `video`, `source`),
  duplicate `class` attributes, unescaped `&` in stored content. This is the "Tag macro invalid
  in Entity" message seen on test.destadsbron.nl. Wrap `loadHTML` in
  `libxml_use_internal_errors(true)` and log a summary per request in DEBUG only. **GitHub:** no dedicated issue as of 2026-10-26 (the "Tag macro invalid" warning was raised on the test site, not tracked).
- **KI-GLE-2026W44-hypha-011, no top-level error handler (analysis, issues #296, #402).** An
  uncaught error leaves a blank page or, with DEBUG, a stack trace; the URL is not logged. **GitHub:** #296 (OPEN, last activity 2020-03-30) and #402 (OPEN, 2026-04-19).
- **KI-GLE-2026W44-hypha-012, page names with quotes or markup cannot be opened (measured).** Three
  De Stadsbron pages; `validatePagename` lets such names through. **GitHub:** no GitHub issue as of 2026-10-26.
- **KI-GLE-2026W44-hypha-013, images link to the production host (reported on the test site).**
  Some images in peer-reviewed articles point to `https://www.destadsbron.nl/...` instead of a
  relative path, so they do not show on a test copy. `removeBaseUrl` on save should have made them
  relative (`system/core/various.php`). **GitHub:** no GitHub issue as of 2026-10-26 (reported on the test site only).
- **KI-GLE-2026W44-hypha-014, the digest is sent in a visitor's request (analysis).**
  `flushDigest()` runs at the end of the page view that passes the interval; a slow mail server
  slows that visitor, an error there is lost. **GitHub:** no dedicated issue as of 2026-10-26.
- **KI-GLE-2026W44-hypha-015, mailings are sent in the browser request (analysis).** A large list can hit `max_execution_time` and stay "sending". **GitHub:** no dedicated issue as of 2026-10-26; #332 only asked for a progress counter, which exists (close suggested 2026-10-26).
- **KI-GLE-2026W44-hypha-016, "invitation pending" never shows (analysis).**
  `settings.php:676` tests `rights == 'invite'`, every other place uses `'invitee'`. **GitHub:** no GitHub issue as of 2026-10-26.
- **KI-GLE-2026W44-hypha-017, `nl.php` lacks five keys of `en.php` (analysis).** 470 against 465
  entries; the missing texts fall back to the key. **GitHub:** no GitHub issue as of 2026-10-26.

## Performance and denial of service

- **KI-GLE-2026W44-hypha-020, a few requests to one dynamic page make the whole site unusable (measured).**
  On one CPU, dynamic pages top out at about 3-7 requests per second and show negative scaling:
  at concurrency 8 the median response time of the home page is over 20 s, and six concurrent
  home-page requests push even a static CSS file from ~5 ms to ~400 ms. Cause (corrected the same day): each Apache/PHP worker needs about 85 MB, mostly
  for the DOM of the 282 KB `hypha.xml`, and Apache's default prefork settings start more workers
  than fit in memory, so the server swaps. With `MaxRequestWorkers` sized to the memory the
  collapse disappears (7-10 req/s flat on 1 CPU / 256 MB). The per-view lock on `data/hypha.stats`
  was measured and is not the bottleneck. No per-IP rate limiting.
  An anonymous resource-exhaustion denial of service: a plain `GET` flood of any page, within one
  visitor's or a crawler's reach, takes the site down for everyone; it recovers when the load
  stops. Measured in
  [`measurement/20261026_SCALABILITY_DOS.md`](measurement/20261026_SCALABILITY_DOS.md) and
  [`measurement/20261026_SCALABILITY_ROOT_CAUSE.md`](measurement/20261026_SCALABILITY_ROOT_CAUSE.md).
  **GitHub:** #411 (resource-exhaustion DoS, OPEN, cause corrected in a comment of 2026-10-26) and #412 (the per-view stats lock, OPEN, measured: no throughput effect); related to SEC-018 in the private security review.

## More dev regressions (found while patching)

- **KI-GLE-2026W44-hypha-023, the comment moderation view crashes for members (measured).**
  `peer_reviewed_article::commentModerateView()` (`system/datatypes/peer_reviewed_article.php:1024`)
  calls `$this->xml->document()`, a php-dom-wrapper method removed on dev, so opening
  `<language>/<article>/comments/<id>` is a fatal error on every PHP version; the not-found branch
  also unlocks without a lock and does not return. A verified patch (`getElementById`, return
  `'404'`) was posted as a comment on #406. **GitHub:** #406 (CLOSED 2026-10-28, solved by PR #519 in `main`).
- **KI-GLE-2026W44-hypha-024, BMP uploads always fail (analysis).** `HyphaImage::importUploadedImage`
  opens a BMP with `imagecreatefromwbmp` (WBMP, a different format), so an upload the UI lists as
  allowed (`jpg, png, gif, bmp`) fails. Use `imagecreatefrombmp`. **GitHub:** no issue as of 2026-10-26.
- **KI-GLE-2026W44-hypha-025, the mailing view fails with "Wrong Document" (measured).** Opening a
  mailing of a mailing list throws a `DOMException` ("Wrong Document Error") at
  `system/datatypes/mailinglist.php:778`: a node of one DOM document is inserted into another
  without `importNode()`. Found while testing the jQuery upgrade (PR #498). **GitHub:** #515 (CLOSED 2026-10-26, solved by PR #517 in `main`,
  filed 2026-10-26), PR #517 (OPEN; `appendImportedChildren()`).
- **KI-GLE-2026W44-hypha-026, PHP 8.5 deprecation in the index page (measured).** `$capital++` on a
  letter in `system/datatypes/index.php:58` and `:65` gives "Increment on non-numeric string is
  deprecated, use str_increment()" on PHP 8.5, 1,352 times per crawl; absent on 8.2. It was missed
  by the deprecation measurement, which crawled on 8.2 only. The same loop never ends for a page
  name starting with a character after `Z` (for example `_`): the index answers HTTP 500 after
  30 s on every PHP version. **GitHub:** #514 (OPEN, filed 2026-10-26), PR #516 (OPEN).
- **KI-GLE-2026W44-hypha-027, generated HTML has no cache headers (measured).** See
  [`docs/technical/REVERSE_PROXY.md`](../docs/technical/REVERSE_PROXY.md), "Caching". **GitHub:**
  #470 (OPEN, filed 2026-10-26 with a patch).
- **KI-GLE-2026W44-hypha-028, the re-register pop-up fails (measured).** `reregister()` in
  `system/core/users.php` builds the pop-up without a `<form>`, so `$(this).closest('form')` is
  empty and `hypha()` throws a JavaScript error; nothing is posted. Same on `main` and with #518.
  **GitHub:** no issue as of 2026-10-26.
- **KI-GLE-2026W44-hypha-029, a fresh install shows HTTP 500 (measured).** After `hypha.php`
  installs into an empty data folder, the home page fails with `Call to a member function
  setAttribute() on null` at `system/core/document.php:67`. **GitHub:** no issue as of 2026-10-26.
- **KI-GLE-2026W44-hypha-030, a mailing list view writes its page file (measured).**
  `mailinglist::ensureStructure()` locks and rewrites the page file on every request, also for
  anonymous visitors, and resets `sender_name`/`sender_email`, which nothing reads (the sender is
  read from `sender-name`/`sender-email`). With #518 this no longer empties the page cache, but the
  write per view remains. **GitHub:** no issue as of 2026-10-26.

## Platform

- **KI-GLE-2026W44-hypha-018, atomic rename fails on Windows (issue #336).** `HyphaFile` renames a
  temporary file over an open one. **GitHub:** #336 (OPEN, last activity 2020-09-07).
- **KI-GLE-2026W44-hypha-019, no LICENSE file (issue #89).** The licence is only in source
  headers. **GitHub:** #89 (OPEN, last activity 2018-11-28).
