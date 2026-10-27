---
title: "CONTINUITY RISKS: the big problems and risks for the continuity of Hypha, and the choices they ask for"
revision: 1
date_created: 2026-10-26
date_last_review:
state: open
---

# CONTINUITY RISKS

Sources: the issue analysis
([`20261026_GITHUB_ISSUES.md`](20261026_GITHUB_ISSUES.md)), the security review
([`20261026_SECURITY_REVIEW.md`](20261026_SECURITY_REVIEW.md)), the container test
([`../../measurement/20261026_PHP_8_2_CONTAINER_TEST.md`](../../measurement/20261026_PHP_8_2_CONTAINER_TEST.md))
and a discussion among the users of De Stadsbron between April and October 2026. People are named
by role only.

## The question behind the risks

The users of De Stadsbron discussed whether Hypha should remain the platform. Positions taken:

- **Choose a primary goal.** Either (A) develop and promote Hypha as an open-source platform, or
  (B) run a news service. Doing both with the people available is not realistic, and (A) without
  traction in (B) leads to mission drift.
- **Alternatives looked at briefly:** Ghost (review process and newsletter built in, relational
  database, conversion with the current content is the simplest) and Hugo (no database, no review
  process, no newsletter, conversion needs much cleaning). Both are open source and adaptable; both
  would allow fast progress in the short term.
- **Hypha's reason to exist is community empowerment:** keep the organisational overhead small and
  shared so nobody becomes indispensable; "specialise in content, generalise in process". This
  proved its worth twice, when core funding fell away and when a competing news platform started:
  De Stadsbron could continue at a lower pace with minimal overhead.
- **Hypha is used beyond De Stadsbron** (Koppelting, with ongoing work on the video registration
  with the unconference kit), so investment continues regardless, but is not visible to De
  Stadsbron.
- **The PHP crisis was overdue maintenance**, not a flaw of the design, combined with a library
  (php-dom-wrapper) whose new versions require undesired API changes. Replacing it was planned
  anyway.
- **First pay off the technical debt, then judge Hypha functionally** (a member who did a security
  scan earlier and found considerable risk). AI-assisted refactoring, stress and regression tests
  were offered, as was a move to another language; the maintainer prefers to finish the DOM
  replacement and have it reviewed and tested.
- **PHP version policy:** one member advised 8.5 as baseline because 8.2 and 8.3 are near or past
  the end of their support; the group chose 8.2 to 8.5 for Debian stable/oldstable compatibility
  (D-GLE-2026W44-hypha-001).
- **Smaller ideas raised:** drop share buttons on articles (hardly anybody uses them); offer an
  `llms.txt` with Markdown versions of pages; add an editorial QA handbook ("how do I structure an
  article") checked by a second person.

This document does not take the decision; it lists what any decision has to weigh.

## Risks

| Id | Risk | Severity | Evidence | Mitigation (next step) |
|---|---|---|---|---|
| CR-01 | **Bus factor of one.** One developer wrote ~75% of commits and is the only committer since 2025; the PHP 8 fix depended on that person's local work. | High | Issue analysis R1; git history | Document (this `ai/` and `docs/`), review PRs by a second person, a test suite anybody can run (NS-…-009, -010) |
| CR-02 | **No automated tests or CI.** One test file; the DOM rewrite touched almost every view. The container crawl found 82 failing logged-in pages that a manual test had not. | High | Measurement; issue analysis R2 | Smoke and crawl test in CI on 8.2 and 8.5 with an anonymised data set (NS-…-009) |
| CR-03 | **Every PHP upgrade breaks Hypha.** 5.4, 7.4 and 8.x all did; dev still fails on 8.2 and has deprecations up to 8.5. | High | KI-…-001, -007; issues #4, #312, #399 | Fix KI-…-001; deprecation check per PR; review the range yearly (NS-…-001, -011, -019) |
| CR-04 | **Critical security weaknesses** in `hypha.php` and missing authorisation; the site runs public with reader comments and mailing lists. | High | Security review SEC-001 to SEC-007 | Fix before dev goes live (NS-…-002 to -008) |
| CR-05 | **End-of-life browser stack.** jQuery 1.7.1 (2011) and WYMeditor 1.1.1, vendored, with 24 open editor and media issues. | High | Issue analysis R4; SEC-025 | One project to replace the editor (NS-…-016) |
| CR-06 | **Single XML file as database.** Whole-file rewrite and global lock; corrupt write takes the site down (happened to Koppelting); no backup tooling. | Medium | ARCHITECTURE "Storage"; #265, #336 | Backup and restore procedure, health check, integrity check on load (NS-…-012, -013) |
| CR-07 | **No release process.** No tags, divergent instance branches (`koppelting`, `combined`, ~20 feature branches), `master` broken on PHP 8. | Medium | Branch list; #108, #399 | Merge dev to master with a tag, release notes, instance branches rebased (NS-…-014) |
| CR-08 | **Licence not formalised.** Only in source headers; third-party licences not listed. | Medium | #89 | Add LICENSE and a third-party list (NS-…-015) |
| CR-09 | **GDPR gaps** for a site with reader comments and newsletters: deleted users keep name and e-mail, unsubscribes not logged, authors identified by name. | Medium | #80, #245, #401 | Privacy review with the editors (NS-…-018) |
| CR-10 | **Backlog no longer triaged.** 89% of open issues older than five years; real defects hidden among wishes. | Medium | Issue analysis | Close the obsolete list, label the rest (NS-…-017) |
| CR-11 | **Operational knowledge undocumented.** Installation through a self-extracting script, Docker only as an issue text, data model only in an issue. | Medium | #397, #403 | `docs/` (done 2026-10-26), keep it current |
| CR-12 | **Mail delivery is fragile.** `mail()` without queue or retry, HTML only, newsletter sent in the browser request. | Medium | KI-…-014, -015; #143, #202, #328, #332 | Queue and send in the background, SMTP option (NS-…-024) |
| CR-13 | **Strategic ambiguity** between goals (A) and (B) spreads the few hands. | Medium | Discussion | A decision by the group, recorded in DECISIONS |

`NS-…` stands for `NS-GLE-2026W44-hypha-`, `KI-…` for `KI-GLE-2026W44-hypha-`; rows in
[`../../NEXT_STEPS.md`](../../NEXT_STEPS.md) and [`../../KNOWN_ISSUES.md`](../../KNOWN_ISSUES.md).

## Bundles of issues that matter most for continuity

From the 16 bundles of the issue analysis, four carry most of the risk:

1. **Installation, upgrade, hosting, PHP** (25 issues, 14 open): upgrade path, extension check,
   error handler, reverse proxy, noindex for test sites.
2. **Editor and media** (32 issues, 24 open): all tied to WYMeditor and jQuery 1.7.1.
3. **Data model and storage** (20 issues, 11 open): global lock, identity by name, data loss.
4. **Code quality, tests, tooling** (11 issues, 10 open): no tests, no CI, no style check.

The best-served bundle is the peer-reviewed article workflow (42 issues, 30 closed), which is the
core of De Stadsbron, but it is also where the dev regressions are.
