# Claude Code

Hypha is a third-party open-source project (PlanBCode/hypha). This repository is a fork used to
contribute pull requests upstream. The `ai/` folder follows the layout of the Invantive
workspace (`itgen`, `Invantive.Basics`), but holds only Hypha's own knowledge: nothing of the
Invantive standards is copied in, and nothing in `ai/` or `docs/` may contain personal data.

## Session start

Read these before starting work, and nothing more.

| Read | Why |
|---|---|
| This file | Build, test, run, and where the repository deviates. |
| [`ai/PROJECT.md`](ai/PROJECT.md) | What Hypha is and how it is laid out. |
| [`ai/SESSION_SUMMARY.md`](ai/SESSION_SUMMARY.md) | "Still open" and the latest sessions. |
| The open rows of [`ai/DOCUMENTATION_LOG.md`](ai/DOCUMENTATION_LOG.md) | Documentation owed for a change that shipped. |

## Look up when the task needs it

| Look up | How |
|---|---|
| How something works | `grep -n "^## " ai/ARCHITECTURE.md`, then the section. |
| A decision | `grep -n` on its `D-` id or two keywords in [`ai/DECISIONS.md`](ai/DECISIONS.md). |
| A backlog item | `grep -n` on the `NS-` id or a keyword in [`ai/NEXT_STEPS.md`](ai/NEXT_STEPS.md). |
| A known issue | `grep -n` on the `KI-` id or a keyword in [`ai/KNOWN_ISSUES.md`](ai/KNOWN_ISSUES.md). |
| The PHP version policy | [`ai/reference/REQUIREMENTS.md`](ai/reference/REQUIREMENTS.md). |
| Code style | [`ai/CODING_STANDARDS.md`](ai/CODING_STANDARDS.md); every rule starts with its bold id. |
| Anything else in `ai/` | [`ai/README.md`](ai/README.md), the index. |
| End-user and operator documentation | [`docs/README.md`](docs/README.md). |

## Build / test / run

Hypha has no build step: the PHP files are served as they are by Apache with mod_php and
mod_rewrite. Supported PHP versions are **8.2 up to and including 8.5**
(D-GLE-2026W44-hypha-001).

- **Run (container):** `podman build -t hypha:php8.2 -f docs/container/Containerfile .` and
  `podman run -d -p 8086:8080 -v ./hypha-data:/var/www/html/data:Z hypha:php8.2`. `docker` takes
  the same arguments. `--build-arg PHP_VERSION=8.5` selects another version. Full procedure in
  [`docs/technical/CONTAINER.md`](docs/technical/CONTAINER.md).
- **Smoke test:** `python3 -I docs/container/smoke_test.py http://localhost:8086 hypha-data/hypha.xml`,
  then read the PHP messages from the container log. See
  [`docs/technical/TESTING.md`](docs/technical/TESTING.md).
- **Deprecations:** `sh docs/container/check_deprecations.sh podman` runs `php -l` on 8.2 up to
  8.5 and scans for deprecated functions.
- **Unit test:** only `tests/HyphaRequestTest.php` exists, a self-made runner without PHPUnit
  that prints a table and "asserted 84 tests" (verified on PHP 8.2, 2026-10-26):
  `podman run --rm -v "$PWD":/src:ro -w /src docker.io/library/php:8.2-cli php tests/HyphaRequestTest.php`.

## Branches

Since 2026-10-26 `upstream/main` is the default branch and the target of every pull request.
It started at the last `dev` commit (5dae13a, Hypha's own DOM helpers instead of
php-dom-wrapper); `dev` and `master` were removed upstream, which closed the open pull requests
against `dev` (re-opened against `main`, see
[`ai/reference/GITHUB_ISSUES_FILED_2026W44.md`](ai/reference/GITHUB_ISSUES_FILED_2026W44.md)).
The PHP 8.2 fix (#475) is merged, so `main` runs on PHP 8.2 to 8.5. Instance branches (`koppelting` and others) diverge and are not
merged back regularly.

## Rules particular to this repository

- Follow the style of the surrounding code ([`ai/CODING_STANDARDS.md`](ai/CODING_STANDARDS.md)), even
  where a modern style would differ; the maintainer reviews every pull request by hand.
- Keep a pull request to one subject. Functional changes wait until the PHP 8 migration is live
  (agreed with the maintainer).
- Never put content of a real site (pages, users, e-mail addresses, password hashes) in the
  repository, a test fixture or `ai/`. Test data of De Stadsbron stays outside the repository.
- The security review was filed publicly on 2026-10-26 at the user's decision (the sites were
  offline): #413-#441; see
  [`ai/investigation/open/20261026_SECURITY_REVIEW.md`](ai/investigation/open/20261026_SECURITY_REVIEW.md).
