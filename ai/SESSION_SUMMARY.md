---
title: "SESSION_SUMMARY"
revision: 1
date_created: 2026-10-26
date_last_review:
---

# SESSION_SUMMARY

## Still open

- dev does not run on PHP 8.2 (KI-GLE-2026W44-hypha-001); a verified patch is in
  `ai/design/concept/20261026_PHP82_DETACHED_NODES.md` and is to be offered to the maintainer (NS-GLE-2026W44-hypha-001).
- 82 De Stadsbron pages fail for logged-in members on dev (NS-GLE-2026W44-hypha-021).
- The security review is to be shared privately with the maintainer before anything of it is
  pushed to a public branch.
- The container files were tested with Docker only; Podman still to be run
  (NS-GLE-2026W44-hypha-020).
- Load test on one CPU: dynamic pages do ~3-7 req/s with negative scaling; a few concurrent
  requests to any page make the whole site unusable (KI-020). Caused by a per-view stats write
  lock and an uncached 282 KB `hypha.xml` parse per request.
- Filed six GitHub issues #405-#410 (PHP 8.2 fix, logged-in crashes, four deprecations), each
  with a verified patch where one applies. KNOWN_ISSUES and NEXT_STEPS now carry the GitHub
  issue and its last-known status per entry.
- Filed the full security review publicly (the sites are offline): #413-#441 (SEC-001..029),
  each with a suggested patch marked as a starting point; all patches verified apart and, bar the
  three that conflict in `users.php`, together on dev+#405+#406 (anonymous and logged-in crawl,
  `php -l` on 8.2 and 8.5, no new errors). Credential scan clean: #442. Honeypot feature with a
  tested patch: #443. Two more dev regressions found and patched: moderation view `document()`
  crash (comment on #406, KI-023) and BMP uploads (KI-024).
- Measured the DoS cause: it is worker memory (~85 MB each), not the stats lock; a worker cap
  gives flat ~7-10 req/s. Corrected #411, added the stats patch to #412, capped workers in
  `docs/container`.
- NS-017 triage: posted 12 close suggestions with evidence (#29, #101, #142, #144, #170, #187,
  #233, #262, #302, #332, #361, #365).
- Added `ai/reference/TRACING_AND_MESSAGE_CODES.md`: Hypha has no tracing framework and no message
  codes; i18n keys are the nearest handle.
- Opened PRs #445 (#405), #446 (#444), #447 (#398), #448 (#402), #449 (#404) against dev from the fork, each tested on PHP 8.2 and 8.5.
- `dev` and `master` were removed upstream at about 16:27 UTC and `main` became the default
  branch at the same commit; GitHub closed all 27 open PRs. Re-opened against `main` as
  #475-#501 ("Replaces #old"), plus new PRs #502-#510 (#422, #423, #413-#415, #407-#410). #475
  (PHP 8.2 fix) was merged into `main` at 17:02 UTC; every other branch still merges cleanly.
  Full list: `ai/reference/GITHUB_ISSUES_FILED_2026W44.md`.
- New PRs tested on 8.2 and 8.5 against `dev` (= the old `main`): #500 CSRF failure stops the
  request (#420), #501 tag commands need login, and `tagNew` no longer crashes (#421), #502 page
  type validation (#422), #503 image names and unreadable images (#423), #504-#506 `hypha.php`
  (#413-#415), #507-#510 deprecations (#407-#410).
- Cache headers checked behind NGINX: #470; documented in `docs/technical/REVERSE_PROXY.md`.
  Found: mailing view "Wrong Document" (KI-025) and a PHP 8.5 `$capital++` deprecation
  (KI-026), both without an issue yet.
- PRs #511 (#416), #512 (#417), #513 (#412, stats `tryLock`: no throughput gain, small
  undercount under parallel load). Filed #514 (index `$capital++`: PHP 8.5 deprecation and an
  endless loop after `Z`) with PR #516, and #515 (mailing view "Wrong Document") with PR #517.
  Final check: all 41 issues where a PR was asked have one live PR.
- #411 fix 2: the design (comment on #411, translated to English) and draft PR #518 (APCu page
  cache, CSRF token out of anonymous HTML). Tested on 8.2 and 8.5 with and without APCu, in a
  browser too; fixed four problems in a second commit (cache emptied by mailing list views, double
  submit while fetching the token, view counts stuck in memory, `hypha.php` without
  `data/cache`). PR #519 for #406 (logged-in crawl 82 → 0 failures). New: KI-028 to KI-030.
- Nothing of this session is committed.

## 2026-10-28, trial site, fixes from use and SEO

- The trial branch `issue520-compleet-proef` (bouw plus the needed PRs) runs at the trial site; `haal_hypha.ksh`
  and a `docker-compose.yaml` (outside the repository) fetch and start it. The checklist on #520 lists every PR.
- Issues and PRs against `main` from using the trial site: #636/#637 installation mode, #638/#639 `//host`
  URLs, #640/#641 images of an older address, #643/#644 recover account, #645/#646 icons and login without
  JavaScript, #647/#648 button order, #650/#651 names of the kinds of account, #652/#653 Pagina-index and
  Aangemeld, #654/#655 new page popup, #656/#657 page name on the page index, #658/#659 user list, #660/#661
  text areas, #664/#665 alt texts, #667/#668 buttons without JavaScript, #521 with #662 (`lang`), #663
  (description, Open Graph) and #666 (site title as text). #642: plain-text password of the system user.
- After the merges into `main` (41482e9): #649 for the two crashes of #406 that remain, #586 reopened
  (`input[@name=csrfToken]` without quotes), known-bug register and `ai/` notes updated.
- In bouw only (#520): jQuery is deferred only without a theme script in the body; a confirmation of a button
  was escaped twice (trek terug, delete); photo fields only with a photo; sections sorted.
- Tests that change a file the site reads use `write_same_length()`: Docker Desktop shows the container a
  changed file a moment later with its old length.
- Documentation: `docs/handleiding/gebruik/10-gebruikersbeheer.md` (kinds of users, setting a password by
  hand in `hypha.xml`), and system user, privileged user, standard user and no user throughout `docs/`.

## 2026-10-26, audit for PHP 8.2

- Created `ai/` in the layout of the Invantive repositories, `ai/CODING_STANDARDS.md` derived from the
  code, `CLAUDE.md`, and `docs/` with functional and technical documentation and container files
  (`docs/container/`: Containerfile, compose, vhost, php.ini, smoke test, deprecation check).
- Recorded the requirement PHP 8.2 up to 8.5 (REQ-001/002, D-GLE-2026W44-hypha-001).
- Analysed all 259 issues and 145 PRs into 16 bundles with continuity risks.
- Ran master and dev on PHP 8.2 to 8.5 against a copy of De Stadsbron data: master fails on all,
  dev fails on 8.2 and works on 8.3+; found and fixed the 8.2 cause; logged in, 82 pages fail on
  every version.
- Static security review: 29 findings, 2 critical, 5 high.
- Added `.htaccess` rules so `ai/`, `docs/` and the root Markdown files are not served.
