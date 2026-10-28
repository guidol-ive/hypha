---
title: "NEXT_STEPS"
revision: 1
date_created: 2026-10-26
date_last_review:
---

# NEXT_STEPS

> Status 2026-10-26. Every row is *proposed by analysis*; no maintainer has committed to them.
> Prio 1 is "before dev goes live on a production site". The maintainer asked to keep pull
> requests to regressions of the PHP 8 upgrade until the sites are live again, so rows with a
> functional change wait. Ids: `NS-GLE-2026W44-hypha-nnn`; the column "Was" keeps the previous id
> when a row is renumbered. The **GitHub** column gives the matching issue(s) on
> PlanBCode/hypha and their state as read on 2026-10-26; "no issue" means none existed then
> (security rows stay private and are not filed). #405-#410 were filed from this review.

| Id | Was | Prio | Task | Source | GitHub (status 2026-10-26) | Blockages / notes |
| --- | --- | --- | --- | --- | --- | --- |
| NS-GLE-2026W44-hypha-001 | | 1 | Fix dev on PHP 8.2: `createFromHtml` returns detached nodes in an array; adjust `HTMLForm::__construct`. Offer as PR against `dev` (now `main`) | KI-GLE-2026W44-hypha-001; patch verified on 8.2, 8.4, 8.5; reported with patch as PlanBCode/hypha#405 (2026-10-26) | #405 (CLOSED 2026-10-26); PR #475 (first #445) MERGED into `main` 2026-10-26 with two maintainer commits (iterable types) | DONE 2026-10-26 |
| NS-GLE-2026W44-hypha-021 | | 1 | Fix the logged-in crashes of 82 pages: scope `featured_image` lookup, `getTitle()` with markup, unknown datatype as notice and 404 | KI-GLE-2026W44-hypha-002, -003, -004 | #406 (CLOSED 2026-10-28), PR #519 MERGED into `main` 2026-10-28 | DONE 2026-10-28 |
| NS-GLE-2026W44-hypha-002 | | 1 | Lock down `hypha.php`: login for every command, refuse empty credentials, allow-list paths, HTTPS and `json_decode` for updates; document removing it from production | SEC-001, -002, -003 | #413, #414, #415 (OPEN, 2026-10-26, patches) | Share the security review privately with the maintainer first |
| NS-GLE-2026W44-hypha-003 | | 1 | Add `isUser()` to `/upload/image`, mailing send and test send, tag commands; JSON response for upload | SEC-004, -005, -009 | #416 (OPEN); #417 (CLOSED 2026-10-26, PR #512 MERGED); #421 (CLOSED 2026-10-28, PR #501 MERGED) | #416 still open |
| NS-GLE-2026W44-hypha-004 | | 1 | Stop the request when a posted command has an invalid CSRF token | SEC-008 | #420 (OPEN, patch) | |
| NS-GLE-2026W44-hypha-005 | | 1 | Configured base URL for links in mail; validate Host; honour a configured reverse proxy | SEC-006; issue #398 | #398 (OPEN, 2026-04-15), PR #477 for the HTTPS/proxy scheme (OPEN, 2026-10-26); SEC-006 = #418 | Needs a setting in `hypha.xml` and the settings page |
| NS-GLE-2026W44-hypha-006 | | 2 | Allow-list HTML sanitiser for editor content; escape member attributes and page names in all views | SEC-007 | #419 (OPEN, patch) | Choose: own allow-list on DOM or a vendored library |
| NS-GLE-2026W44-hypha-007 | | 2 | Medium security items: page type validation, image path traversal, login throttling, token expiry and `hash_equals`, MD5 rehash, header injection, digest escaping, anonymous rate limits | SEC-010 to -018 | #422–#430 (OPEN, patches) | |
| NS-GLE-2026W44-hypha-008 | | 3 | Low items: `javascript:` URLs, security headers and CSP, session timeouts, CSRF token length, theme path checks, information disclosure | SEC-019 to -029 | #431–#441 (OPEN, patches) | CSP needs inline scripts moved |
| NS-GLE-2026W44-hypha-011 | | 1 | Remove the deprecations of 8.1-8.5: `${}`, implicit nullable types, `strftime`, `setAttribute(null)`, float to int, `imagedestroy`, dead `mcrypt`; version guard to 8.2 | KI-GLE-2026W44-hypha-007, -008; [measurement](measurement/20261026_PHP_DEPRECATIONS.md) | #407, #408, #409, #410 (OPEN, 2026-10-26, ours) | `strftime` replacement: intl or own month names |
| NS-GLE-2026W44-hypha-009 | | 2 | CI: GitHub Actions running the unit test, `check_deprecations.sh` and the crawl (anonymous and logged in) on PHP 8.2 and 8.5 against an anonymised data set | CR-02; issues #132, #338 | #132 (OPEN, 2020-08-19), #338 (OPEN, 2020-08-24) | Needs an anonymised data set that is safe to publish |
| NS-GLE-2026W44-hypha-010 | | 2 | Top-level error and exception handler: friendly page with incident code, HTTP 500, log line with URL, user id, page id; DEBUG output for admins only | KI-GLE-2026W44-hypha-011; issues #296, #402; RAS | #296 (OPEN, 2020-03-30), #402 (OPEN, 2026-04-19); example patch with tracing, message codes and audit trail in #444 (OPEN, 2026-10-26); PR #476 against main (OPEN, 2026-10-26); PR #478 for #402 (OPEN, 2026-10-26; overlaps the handler of #476) | |
| NS-GLE-2026W44-hypha-028 | | 2 | Silence libxml parse warnings (`libxml_use_internal_errors`), summarise in DEBUG; fix duplicate `class` attributes produced by Hypha itself | KI-GLE-2026W44-hypha-005 | no issue as of 2026-10-26 | Reduces ~17 000 warnings per crawl |
| NS-GLE-2026W44-hypha-014 | | 2 | Release process: merge dev into master, tag, version number visible to admins, release and upgrade notes, rebase instance branches | CR-07; issues #108, #399 | #108 (OPEN, 2019-01-05), #399 (OPEN, 2026-04-16) | Agreement with the maintainer |
| NS-GLE-2026W44-hypha-012 | | 2 | Backup and restore: document a consistent copy of `data/` while running, a restore drill, retention | RAS availability | no issue as of 2026-10-26 | Hosting dependent |
| NS-GLE-2026W44-hypha-013 | | 2 | Health check (`/health` or CLI) and integrity check of XML on load | RAS | no issue as of 2026-10-26 | |
| NS-GLE-2026W44-hypha-020 | | 2 | Run the container files and tests under Podman (rootless) and correct the documentation where needed | This session: only Docker was available | no issue as of 2026-10-26 | |
| NS-GLE-2026W44-hypha-022 | | 3 | Validate page names on create and rename; repair the three unreachable De Stadsbron pages | KI-GLE-2026W44-hypha-012 | no issue as of 2026-10-26 | Data fix on live as well |
| NS-GLE-2026W44-hypha-023 | | 3 | Make image links relative on save, and repair absolute links to the production host in stored articles | KI-GLE-2026W44-hypha-013 | no issue as of 2026-10-26 | |
| NS-GLE-2026W44-hypha-015 | | 3 | Add a LICENSE file (SimPL 2.0 as stated) and a list of third-party licences | CR-08; issue #89 | #89 (OPEN, 2018-11-28) | Maintainer's decision |
| NS-GLE-2026W44-hypha-024 | | 3 | Mail queue on disk, background sending with retry, SMTP option, plain-text part | CR-12; KI-GLE-2026W44-hypha-014, -015; issues #143, #202, #328, #332 | no issue for sending in the request; #332 (progress counter, done, close suggested 2026-10-26); #143, #202, #328 (all CLOSED) | Functional change, after PHP 8 is live |
| NS-GLE-2026W44-hypha-025 | | 3 | Concurrency: optimistic version check on save, single sender for mailings | SEC-026 | no issue (private security review) | |
| NS-GLE-2026W44-hypha-026 | | 4 | Maintenance mode flag | RAS | no issue as of 2026-10-26 | |
| NS-GLE-2026W44-hypha-027 | | 3 | `noindex` and mail off for non-production instances | Issue #404 | #404 (OPEN, 2026-04-19); PR #479 against main (OPEN, 2026-10-26) | |
| NS-GLE-2026W44-hypha-029 | | 4 | Migration framework on `schemaVersion` | RAS; DATA-003 | no issue as of 2026-10-26 | |
| NS-GLE-2026W44-hypha-030 | | 4 | Admin export of users and subscribers, page integrity report | RAS; GDPR | no issue as of 2026-10-26 | |
| NS-GLE-2026W44-hypha-018 | | 3 | GDPR review: deleted users' data, unsubscribe logging, author identity by id | CR-09; issues #80, #245, #401 | #80 (OPEN, 2018-09-27), #245 (OPEN, 2019-05-09), #401 (OPEN, 2026-04-19) | With the editors |
| NS-GLE-2026W44-hypha-016 | | 4 | Replace WYMeditor and jQuery 1.7.1 as one project | CR-05; SEC-025; editor and media bundles | editor/media bundle, e.g. #96 (OPEN); no single issue | Large; choose editor first |
| NS-GLE-2026W44-hypha-017 | | 3 | Triage the backlog: close the obsolete and stale issues, label the rest. PARTLY DONE 2026-10-26: 12 close suggestions with evidence posted ([list](investigation/open/20261026_CLOSE_CANDIDATES.md)); closing and labelling are the maintainer's | CR-10; issue analysis section 5.1 | comments on #29, #101, #142, #144, #170, #187, #233, #262, #302, #332, #361, #365 (all still OPEN, awaiting the maintainer) | Maintainer's agreement |
| NS-GLE-2026W44-hypha-019 | | 4 | Review the PHP range once a year and at each Debian release | REQ-003 | no issue as of 2026-10-26 | Next: at the next Debian stable release |
| NS-GLE-2026W44-hypha-031 | | 3 | A second reviewer for every PR; onboarding through `ai/` and `docs/` | CR-01 | no issue as of 2026-10-26 | |
| NS-GLE-2026W44-hypha-032 | | 2 | Decide the primary goal: (A) Hypha as platform or (B) the news service, and whether De Stadsbron stays on Hypha | CR-13 | no issue as of 2026-10-26 | Group decision; record in DECISIONS |
| NS-GLE-2026W44-hypha-037 | | 1 | Size Apache `MaxRequestWorkers` / PHP-FPM `pm.max_children` to memory (~100 MB per worker) and document it; done for the container in `docs/container/mpm_prefork.conf` | KI-GLE-2026W44-hypha-020; [measurement](measurement/20261026_SCALABILITY_ROOT_CAUSE.md) | #411 (OPEN, correction comment 2026-10-26) | Operational; 7 req/s flat instead of collapse |
| NS-GLE-2026W44-hypha-034 | | 4 | Take the per-view `hypha.stats` write off the hot path (non-blocking `tryLock`); measured: no throughput effect, optional | KI-GLE-2026W44-hypha-020; [measurement](measurement/20261026_SCALABILITY_DOS.md) | #412 (OPEN, 2026-10-26) | Biggest single win for concurrency |
| NS-GLE-2026W44-hypha-035 | | 2 | Cache the parsed `hypha.xml` (APCu/opcache or a serialised cache invalidated on write) so a page view is not a 282 KB parse | KI-GLE-2026W44-hypha-020 | #411 (OPEN, 2026-10-26) | Measure again after |
| NS-GLE-2026W44-hypha-036 | | 3 | Document and recommend a reverse-proxy cache and per-IP rate limiting; serve static assets without routing through `index.php` where possible | KI-GLE-2026W44-hypha-020; RAS | #411 (OPEN, 2026-10-26) | Operational, per site |
| NS-GLE-2026W44-hypha-038 | | 2 | Fix the comment moderation view (`document()` removed, unlock without lock, no return after not-found) | KI-GLE-2026W44-hypha-023 | #406 (CLOSED 2026-10-28), PR #519 MERGED into `main` 2026-10-28 | DONE 2026-10-28 |
| NS-GLE-2026W44-hypha-039 | | 3 | Fix BMP uploads (`imagecreatefromwbmp` → `imagecreatefrombmp`) or drop BMP from the allowed list | KI-GLE-2026W44-hypha-024 | no issue as of 2026-10-26 | |
| NS-GLE-2026W44-hypha-040 | | 3 | Honeypot that blocks scanners for 5 minutes (hidden trap link, 403, hashed-IP block store) | user request 2026-10-26; relates to #411 | #443 (OPEN, filed with a patch 2026-10-26) | Suggested patch; proxy needs the real client IP (#418) |
| NS-GLE-2026W44-hypha-041 | | DONE 2026-10-26 | Impact labels created by a maintainer and set on #405-#444 (10 High, 13 Medium, 17 Low); use labels, not comments, from now on | [list](reference/GITHUB_ISSUES_FILED_2026W44.md) | no issue as of 2026-10-26 | Triage role cannot create labels |
| NS-GLE-2026W44-hypha-042 | | 2 | Fix the mailing view "Wrong Document" `DOMException` (`importNode()` before inserting) | KI-GLE-2026W44-hypha-025 | #515 (CLOSED 2026-10-26), PR #517 MERGED into `main` 2026-10-26 | DONE 2026-10-26 |
| NS-GLE-2026W44-hypha-043 | | 3 | Replace `$capital++` on a letter by `str_increment()` or `chr(ord() + 1)` in the index page (PHP 8.5 deprecation; also an endless loop after `Z`) | KI-GLE-2026W44-hypha-026 | #514 (OPEN), PR #516 (OPEN) | |
| NS-GLE-2026W44-hypha-044 | | 1 | Send explicit `Cache-Control`/`Vary: Cookie` for generated pages, clean headers for static files, new session at logout | KI-GLE-2026W44-hypha-027 | #470 (OPEN, filed with a patch) | Logout part overlaps PR #490 |
| NS-GLE-2026W44-hypha-045 | | 2 | Reach 100 req/s for anonymous page views: site-data cache (#411 fix 2), including what the #470 headers mean for proxy caching | KI-GLE-2026W44-hypha-020 | #411 (OPEN); design in a comment on #411, PR #518 (draft, tested on 8.2 and 8.5) | |
| NS-GLE-2026W44-hypha-046 | | 2 | Give the re-register pop-up a form (or pass the page form), so `hypha()` can post it | KI-GLE-2026W44-hypha-028 | no issue as of 2026-10-26 | |
| NS-GLE-2026W44-hypha-047 | | 2 | Make a fresh install render (theme or layout missing after `hypha.php` install) | KI-GLE-2026W44-hypha-029 | no issue as of 2026-10-26 | |
| NS-GLE-2026W44-hypha-048 | | 3 | Let `ensureStructure()` only save when it adds something, and drop the unused `sender_name`/`sender_email` | KI-GLE-2026W44-hypha-030 | no issue as of 2026-10-26 | |
| NS-GLE-2026W44-hypha-033 | | 4 | Ideas from the discussion, after PHP 8 is live: drop share buttons on articles, `llms.txt` with Markdown versions, an editorial QA handbook | User discussion | no issue as of 2026-10-26 | Functional; not before the sites are live |
