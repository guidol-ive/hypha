---
title: "RELIABILITY, AVAILABILITY, SERVICEABILITY: what Hypha lacks to run unattended and to be fixed quickly"
revision: 1
date_created: 2026-10-26
date_last_review:
state: open
---

# RELIABILITY, AVAILABILITY, SERVICEABILITY

What is missing, judged against what a small community site needs: keep working without an
expert at hand (reliability), stay reachable and recoverable (availability), and let a second
person find and fix a fault quickly (serviceability). Each gap has a row in
[`../../NEXT_STEPS.md`](../../NEXT_STEPS.md); the column "NS" gives the last number of
`NS-GLE-2026W44-hypha-0nn`.

## Reliability

| Gap | Today | Wanted | NS |
|---|---|---|---|
| Runs on the supported PHP range | dev fails on 8.2; master on every 8.x | 8.2 up to 8.5, proven per change | 001, 011 |
| Pages that fail for editors | 82 of 1 333 De Stadsbron pages give a fatal error when logged in | A damaged or legacy page opens with a warning | 021 |
| Regression tests | One unit test; no CI | Crawl and smoke test on 8.2 and 8.5 for every PR, on an anonymised data set | 009 |
| Input validation | Page names with quotes or markup are accepted and become unreachable | Validation on create and rename, a repair script for existing names | 022 |
| Data integrity | A failed or partial write is prevented by rename, but no check on load; no schema validation | Check well-formedness and required elements on load; refuse to save a document that lost its root content | 013 |
| Mail | `mail()` without queue or retry; digest and newsletters in a visitor's request | Queue on disk, background sender, retry, SMTP option, plain-text part | 024 |
| Concurrency | Global lock on `hypha.xml`; lost updates possible in datatypes (SEC-026) | Short critical sections, optimistic check on page version when saving | 025 |
| Throughput / DoS | A few concurrent requests to any dynamic page make the whole site unusable (KI-020, [measurement](../../measurement/20261026_SCALABILITY_DOS.md)); per-view stats write serialises traffic; no cache or rate limit | Stats off the hot path, cache parsed `hypha.xml`, reverse-proxy cache and per-IP rate limit | 034, 035, 036 |
| Dependencies | jQuery 1.7.1, WYMeditor 1.1.1, own Mollie client | Maintained editor, update policy for vendored code | 016 |

## Availability

| Gap | Today | Wanted | NS |
|---|---|---|---|
| Backup and restore | Not provided; depends on the hosting | Documented and tested procedure: consistent copy of `data/` while running, restore drill | 012 |
| Health check | None | `/health` (or a CLI script) that reports PHP version, extensions, `data/` readable and writable, `hypha.xml` parsable | 013 |
| Error page | Blank page or stack trace (DEBUG) | Friendly error page with an incident code; HTTP 500; details only in the log | 010 |
| Graceful degradation | A missing datatype class or element stops the whole page | Unknown datatype shown as "unsupported page type"; checks that fail are skipped with a warning | 021 |
| Maintenance mode | None; updates by replacing files while the site runs | A flag that shows a maintenance page to visitors while the store is migrated | 026 |
| Test instances | Test copies get indexed and can send mail | `noindex` and mail disabled on non-production instances (issue #404) | 027 |
| Reverse proxy and TLS | Scheme detection via `HTTPS`/`REQUEST_SCHEME` only (issue #398); Host header trusted (SEC-006) | Configured base URL; honour `X-Forwarded-Proto` from a configured proxy | 005 |

## Serviceability

| Gap | Today | Wanted | NS |
|---|---|---|---|
| Logging | PHP log only; ~17 000 libxml warnings per crawl drown real errors; no request URL with an error | Quiet libxml parsing; one log line per error with URL, user id, page id and incident code | 010, 028 |
| Diagnostics | `DEBUG` file shows errors to every visitor | Debug output only for administrators, or only in the log | 010 |
| Version information | No version number or release tag | Version and git commit visible to administrators and in the health check | 014 |
| Installation and upgrade | Self-extracting `hypha.php` with risky update function; git install undocumented until now | Container image and documented git install (done 2026-10-26), upgrade notes per release, `hypha.php` not needed on production | 002, 014 |
| Data migration | `schemaVersion` exists but no migration framework | Versioned migrations run once at load, logged | 029 |
| Documentation | NaturalDocs comments, `documentation.txt`, README | `docs/` (functional, technical, container) and `ai/` (done 2026-10-26); kept current per change | DOCUMENTATION_LOG |
| Admin tooling | Users and settings in the UI; no export | Export of users and subscribers (GDPR access requests), page integrity report | 018, 030 |
| Knowledge spread | One developer | Second reviewer per PR, recorded decisions, onboarding through `ai/` | 031 |
