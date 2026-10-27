---
title: "DECISIONS"
revision: 1
date_created: 2026-10-26
date_last_review:
---

# DECISIONS

> ADR-style register. Rows dated "pre-2026" were reconstructed on 2026-10-26 from code, comments,
> issues and git history; the original dates and alternatives were not recorded. Add new
> decisions with real dates. A row is one line and never moves, because its id is cited
> elsewhere.

| Id | Date | Problem | Chosen solution | Alternatives | Rationale | Consequences |
| --- | --- | --- | --- | --- | --- | --- |
| D-GLE-2026W44-hypha-001 | 2026-10-26 | Which PHP versions must Hypha support after the PHP 8 upgrade | Support PHP **8.2 up to and including 8.5**; test at least the lowest and the highest; use nothing newer than 8.2 and nothing deprecated in the range (REQ-001, REQ-002) | 8.5 only as baseline (proposed in the user chat because 8.2 leaves php.net security support on 2026-12-31 and 8.3/8.4 soon after); latest Debian stable only (8.4) | Debian stable (8.4) and oldstable (8.2) keep their packages security-maintained; Hypha needs no new language features; a broad range keeps it installable on shared hosting. The concern that 8.2 is short-lived was recorded and the group chose the range | Requirement REQ-001 to REQ-003; every PR is checked on 8.2 and 8.5; the lower bound is raised when Debian oldstable moves on (expected with the next Debian release) |
| D-GLE-2026W44-hypha-002 | 2026 (dev branch) | php-dom-wrapper does not run on PHP 8 and its new versions change the API | Remove the library and replace it with own helpers on `DOMDocument`/`DOMElement` (`HyphaDomAccessors`, `HyphaDomElement`, `HTMLForm`) | Upgrade php-dom-wrapper; patch the bundled copy | The API changes of new versions were judged undesirable; own helpers stay small and under control | Large change to HTML generation and forms; regressions found in logged-in views (KI-GLE-2026W44-hypha-002 to -004) |
| D-GLE-2026W44-hypha-003 | 2026-10-26 | Where to keep AI-session knowledge for this third-party project | An `ai/` folder with the same layout as the Invantive repositories (`PROJECT`, `ARCHITECTURE`, `DECISIONS`, `KNOWN_ISSUES`, `NEXT_STEPS`, `SESSION_SUMMARY`, `DOCUMENTATION_LOG`, `design/`, `investigation/`, `measurement/`, `reference/`, `archive/`, `standard/`), with Hypha content only | Notes outside the repository; wiki | Same habits across workspaces; knowledge travels with the fork | `ai/`, `docs/` and the root `.md` files are refused by `.htaccess` so a git-based install does not publish them |
| D-GLE-2026W44-hypha-004 | 2026-10-26 | How to run and test Hypha reproducibly | Container on the official `php:<version>-apache` image with the PHP version as build argument, data as volume, Podman and Docker both supported | Ubuntu image with distribution PHP (as in the earlier local set-up on Ubuntu 18.04, which cannot go past PHP 7.2); the Docker set-up of the `php-apache-bionic-hypha` repository (also Ubuntu 18.04) | The official images exist for every PHP minor version, so 8.2 to 8.5 are one build argument apart | `docs/container/`; tests depend on a copy of real data kept outside the repository |
| D-GLE-2026W44-hypha-005 | pre-2026 | Data storage | XML files under `data/`, one global `hypha.xml` and one file per page with all versions | MySQL/SQLite | "Lightweight" and "portable": copy a folder to move a site; no database server on cheap hosting | Global lock on `hypha.xml`; whole-file rewrites; no queries; scaling limit around thousands of pages |
| D-GLE-2026W44-hypha-006 | pre-2026 | Distribution | One self-extracting `hypha.php` that is also the maintenance and update tool | Zip download; package manager | "Uploading one fully self contained file" | `hypha.php` stays in the web root with powerful functions (security review SEC-001 to SEC-003) |
| D-GLE-2026W44-hypha-007 | pre-2026 | Membership | Invitation only, every member may edit every page, admins only for layout and members | Open registration; per-page rights | Group work in small trusted groups | A malicious member has wide reach; editor HTML must be sanitised server side |
| D-GLE-2026W44-hypha-008 | pre-2026 | Editorial quality of De Stadsbron | Datatype `peer_reviewed_article` with required checks and three approvals before publication | External CMS with workflow (now discussed again: Ghost) | Shared responsibility for content, no single editor-in-chief | Large, central datatype (2 155 lines) without tests |
