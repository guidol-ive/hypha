---
title: "DOCUMENTATION_LOG"
revision: 1
date_created: 2026-10-26
date_last_review:
---

# DOCUMENTATION_LOG

One row per functional change and whether the documentation in [`../docs/`](../docs/README.md)
was adjusted for it. An `open` row is documentation owed for a change that already shipped.

| Date | Change | Commit / PR | Documentation | Status |
| --- | --- | --- | --- | --- |
| 2026-10-26 | Baseline: functional and technical documentation written for the state of `dev` at 5dae13a | (this session, not committed) | `docs/functional/`, `docs/technical/` | done |
| 2026 | php-dom-wrapper replaced by own DOM helpers; one `<form>` per form | upstream `dev` | `docs/technical/ARCHITECTURE` points to `ai/ARCHITECTURE.md`; no user-visible change documented | done |
| 2026-10-27 | Markdown editor next to WYMeditor for articles and text pages (issue #520), with review steps (statute, retract, withdraw) | branch `issue520-bouw` (not merged) | `docs/handleiding/` (17 pages), `docs/technical/TESTING.md`, `docs/container/hypha-vhost.conf`, `docs/technical/DATA_MODEL.md` (`format="markdown"`, `source`, `mdeditor` settings), `docs/functional/PAGE_TYPES.md`, `docs/functional/ADMINISTRATION.md` | done |
| 2026-10-27 | Handbook screenshots (38, also of unchanged parts), Unicode check, capacity measurements, ACID | branch `issue520-bouw` (not merged) | `docs/handleiding/afbeeldingen/`, `docs/handleiding/techniek/08-unicode.md`, `06-beheer.md` (capacity), `03-opslag.md` (ACID), `docs/technical/UNICODE.md`, `OPERATIONS.md`, `DATA_MODEL.md` (ACID) | done |
