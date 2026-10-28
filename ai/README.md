---
title: "ai/, the knowledge of Hypha which has to survive a session"
revision: 1
date_created: 2026-10-26
date_last_review:
---

# ai/, the knowledge of Hypha which has to survive a session

This is the index of the folder. It follows the layout used in the Invantive repositories, but
Hypha is a third-party project, so only Hypha's own knowledge is kept here. Every document carries
frontmatter saying what it is about, when it was written and when it was last reviewed. English,
no personal data, one subject per document, and an existing document updated rather than a second
one added beside it. The session protocol is in [`../CLAUDE.md`](../CLAUDE.md), the code style in
[`CODING_STANDARDS.md`](CODING_STANDARDS.md), the documentation for users and operators in
[`../docs/`](../docs/README.md).

Start with [PROJECT.md](PROJECT.md).

The folder is not served by the web server: `.htaccess` refuses `ai/` and `docs/`, and the
container image leaves them out.

## Session protocol

- [PROJECT.md](PROJECT.md), what Hypha is, who uses it, and where it stands
- [ARCHITECTURE.md](ARCHITECTURE.md), how it works
- [DECISIONS.md](DECISIONS.md), every decision with its date, alternatives and rationale
- [KNOWN_ISSUES.md](KNOWN_ISSUES.md), open imperfections, so they are not found a second time
- [NEXT_STEPS.md](NEXT_STEPS.md), the shortest useful next moves
- [SESSION_SUMMARY.md](SESSION_SUMMARY.md), the state at the end of the last session
- [DOCUMENTATION_LOG.md](DOCUMENTATION_LOG.md), one row per functional change and whether `docs/` was adjusted

## Reference

- [reference/REQUIREMENTS.md](reference/REQUIREMENTS.md), the platform requirement PHP 8.2 up to 8.5 and the functional and non-functional requirements
- [reference/GITHUB_ISSUES_FILED_2026W44.md](reference/GITHUB_ISSUES_FILED_2026W44.md), the issues #405-#444 filed from this review, with type, labels and impact
- [reference/TRACING_AND_MESSAGE_CODES.md](reference/TRACING_AND_MESSAGE_CODES.md), how Hypha logs, traces and identifies messages, and what it lacks

## Standards

Empty. Hypha's code style is in [`CODING_STANDARDS.md`](CODING_STANDARDS.md).

## Designs

A proposed change with its reasoning, by state: `concept`, `implemented`, `rejected`, `obsoleted`.

- [design/concept/20261026_PHP82_DETACHED_NODES.md](design/concept/20261026_PHP82_DETACHED_NODES.md), make dev run on PHP 8.2; verified patch (#405)
- [design/concept/20261026_LOGGED_IN_ARTICLE_CRASHES.md](design/concept/20261026_LOGGED_IN_ARTICLE_CRASHES.md), fix the 82 logged-in article crashes; verified patch (#406)
- [design/concept/20261026_MARKDOWN_EDITOR.md](design/concept/20261026_MARKDOWN_EDITOR.md), a Markdown editor beside WYMeditor for long articles: author process, mock-ups in the De Stadsbron style, technical options on PHP 8.2 and a clickable prototype (in Dutch)

## Measurements

Numbers read on a day. Never corrected, only superseded by a newer reading.

- [measurement/20261026_PHP_8_2_CONTAINER_TEST.md](measurement/20261026_PHP_8_2_CONTAINER_TEST.md), master and dev against a production data set on PHP 8.2 up to 8.5
- [measurement/20261026_PHP_DEPRECATIONS.md](measurement/20261026_PHP_DEPRECATIONS.md), what PHP 8.1 up to 8.5 deprecate that Hypha still uses
- [measurement/20261026_SCALABILITY_DOS.md](measurement/20261026_SCALABILITY_DOS.md), throughput on one CPU and how a few requests make the site unusable (cause superseded)
- [measurement/20261026_SCALABILITY_ROOT_CAUSE.md](measurement/20261026_SCALABILITY_ROOT_CAUSE.md), the cause is worker memory, not the stats lock; throughput with the stats patch and with a worker cap
- [measurement/20261029_SCALABILITY_CPUS.md](measurement/20261029_SCALABILITY_CPUS.md), throughput on 1, 2 and 8 CPUs in 256 MB; one to two workers per CPU; with and without the page cache

## Investigations

A question being chased, with a state. Named for the day the chase began.

- [investigation/open/20261026_GITHUB_ISSUES.md](investigation/open/20261026_GITHUB_ISSUES.md), all 259 issues and 145 PRs in 16 bundles, major problems, continuity risks
- [investigation/open/20261026_CONTINUITY_RISKS.md](investigation/open/20261026_CONTINUITY_RISKS.md), the big risks for continuity and the choices they ask for, including the user discussion
- [investigation/open/20261026_RELIABILITY_AVAILABILITY_SERVICEABILITY.md](investigation/open/20261026_RELIABILITY_AVAILABILITY_SERVICEABILITY.md), what is missing to run unattended and to be serviced by a second person
- [investigation/open/20261026_CLOSE_CANDIDATES.md](investigation/open/20261026_CLOSE_CANDIDATES.md), open issues that can probably be closed, with evidence; 12 posted as suggestions
- [investigation/open/20261026_SECURITY_REVIEW.md](investigation/open/20261026_SECURITY_REVIEW.md), 29 findings with recommendations; **not for public branches yet**

## Archive

Session summaries moved out of `SESSION_SUMMARY.md` once it grows large. Empty.
