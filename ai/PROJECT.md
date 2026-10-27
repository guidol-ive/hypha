---
title: "PROJECT"
revision: 1
date_created: 2026-10-26
date_last_review:
---

# PROJECT

> Generated 2026-10-26 by Claude Code from the code, the GitHub issues and pull requests of
> PlanBCode/hypha, a container test on PHP 8.2 to 8.5 and a discussion among the users of the
> De Stadsbron site. Verify statements against the code before relying on them.

## Purpose

Hypha is a lightweight CMS for small communities and project groups: a website that members can
edit together without learning curve, self-hosted, without database and without proprietary
code. Its design principle is community empowerment: keep the organisational overhead of a
group small and shared, so that nobody becomes indispensable ("specialise in content,
generalise in process"). Every button used by 10% of a community that scares off 90% is a bug.

Homepage: hypha.net. Source: github.com/PlanBCode/hypha. Licence: Simple Public License 2.0 as
stated in the headers of `index.php`, `hypha.php` and `documentation.txt`; the repository has
no `LICENSE` file (issue #89).

## Known installations

| Installation | Uses | Branch |
|---|---|---|
| De Stadsbron (local news, Amersfoort) | Peer-reviewed articles with editorial review, public comments, mailing list, tags | `dev` on test.destadsbron.nl since 2026-10; production still on the old PHP |
| Koppelting | Event site with festival module, video registration with the unconference kit | `koppelting` |
| MeetjeStad | Citizen science project site | (not verified) |
| hypha.net | Project homepage and installer source | (not verified) |

## Shape of the codebase

About 14 000 lines of own PHP, no dependencies managed by a package manager, third-party
JavaScript vendored in `system/`. See [`ARCHITECTURE.md`](ARCHITECTURE.md).

| Path | What |
|---|---|
| `index.php` | Front controller |
| `hypha.php` | Installer, maintenance and builder |
| `system/core/` | Framework |
| `system/datatypes/` | Page types and system pages |
| `system/languages/` | Interface texts en/nl |
| `system/wymeditor/`, `system/assets/`, `system/bowser/` | Third-party browser code |
| `system/mollie/` | Payments client for the festival module |
| `data/themes/default/` | Default theme; the rest of `data/` is site content and git-ignored |
| `tests/` | One test file |
| `docs/` | Functional and technical documentation and container files (added 2026-10-26) |
| `ai/` | This knowledge base (added 2026-10-26) |

## People and process

One volunteer developer has written about three quarters of the commits and is the only
committer since 2025; ten people have authored pull requests in ten years. Decisions are taken
in a chat group of the De Stadsbron users and in GitHub issues. Pull requests are welcome; the
maintainer asked to keep them focused on regressions of the PHP 8 upgrade until the sites are
live again.

## History

| Year | Commits on dev | What happened |
|---|---|---|
| 2016-2018 | 258 | Initial development, datatypes, languages |
| 2019-2020 | 424 | De Stadsbron: peer-reviewed article, mailing list, festival; most issues |
| 2021-2022 | 27 | Maintenance slows down |
| 2023-2024 | 0 | Dormant |
| 2025-2026 | 68 | Mollie v2, PHP 7.2 baseline, then the PHP 8 crisis: hosting moved to a new PHP, php-dom-wrapper does not run on PHP 8, sites went offline; `dev` replaces the library |

## Status on 2026-10-26

- `master` does not start on any PHP 8 version.
- `dev` runs on PHP 8.3, 8.4 and 8.5; on 8.2 it fails on every page until KI-GLE-2026W44-hypha-001
  is fixed. Logged-in, 6% of the De Stadsbron pages fail (KI-GLE-2026W44-hypha-002 to -004).
- 29 security findings, two critical, in `hypha.php`
  ([`investigation/open/20261026_SECURITY_REVIEW.md`](investigation/open/20261026_SECURITY_REVIEW.md)).
- 150 of 259 issues open, median age 7.8 years
  ([`investigation/open/20261026_GITHUB_ISSUES.md`](investigation/open/20261026_GITHUB_ISSUES.md)).

## Strategic question

The De Stadsbron users discuss whether to keep investing in Hypha or to move the news site to
Ghost (closest to the original requirements: review process and newsletter) or Hugo. The
initiator's position: Hypha serves more sites than De Stadsbron, the PHP problem was overdue
maintenance rather than a flaw of the design, and an alternative CMS that meets the requirements
does not exist. Another member's position: first pay off the technical debt, then judge Hypha
functionally; choose a primary goal, (A) develop Hypha as an open-source platform or (B) run a
news service, because both at once does not fit the available people. See
[`investigation/open/20261026_CONTINUITY_RISKS.md`](investigation/open/20261026_CONTINUITY_RISKS.md).
