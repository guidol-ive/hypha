---
title: "TRACING AND MESSAGE CODES: how Hypha logs, traces and identifies messages, and what it lacks"
revision: 1
date_created: 2026-10-26
date_last_review:
---

# TRACING AND MESSAGE CODES

What Hypha does today on dev 5dae13a, read from the code. Short answer: Hypha has **no tracing
framework and no message-code scheme**. It relies on PHP's own error log, a per-request user
notice mechanism, and i18n dictionary keys as the nearest thing to message identifiers.

## Errors and the log

- **Display.** `index.php:25` sets `display_errors` on only when a file named `DEBUG` exists in
  the web root; `hypha.php:430` does the same for `error_reporting`. In production errors go to
  the PHP error log, not the browser.
- **No handlers.** There is no `set_error_handler`, `set_exception_handler` or
  `register_shutdown_function` anywhere. An uncaught error therefore gives a blank page or a bare
  500, and the request URL, user and page are not logged with it. This is the gap behind issues
  #296/#402 and KI-GLE-2026W44-hypha-011; the RAS note asks for a top-level handler that logs one
  line with an incident code.
- **What is logged.** libxml parse problems are turned into PHP warnings with `trigger_error`
  (`document.php:60`), as are macro failures (`macros.php:162`). These are the ~17 000 warnings
  per crawl of KI-GLE-2026W44-hypha-005. Only `system/mollie/api.php` calls `error_log` directly,
  for failed Mollie calls. There is no correlation id, no structured (NDJSON/JSON) log, no log
  levels and no sink configuration.

## Messages to the user

`notify($type, $message)` (`system/core/events.php:516`) stores a message in the session; it is
rendered into the page on the next view and survives a redirect through
`preserveNotifications()`. `$type` is a plain string (`error`, `success`, …) that becomes a CSS
class. The message text is whatever the caller passes, almost always a translated string.

## Message codes

Hypha has no message codes in the sense of a stable identifier per message (such as the
`itgen*` codes of the Invantive products). The closest equivalent is the **i18n dictionary key**:
`__('csrf-error')`, `__('login-failed')`, `__('page-name-conflict')` and so on, with the key
defined in `system/languages/en.php` and `nl.php`. The key is stable and greppable, but:

- it identifies a *text*, not an *event*, and the same situation sometimes uses different keys;
- it is not shown to the user or written to the log, so a user cannot quote a code for support;
- there is no registry, number range or uniqueness check.

So a key like `page-name-conflict` is the practical handle for "which message is this", but it is
not a message code and was never designed as one.

## Proposal filed

An example implementation is proposed in PlanBCode/hypha#444 (2026-10-26): `system/core/trace.php` with
`hypha_trace()` and `hypha_audit()`, codes `HYP-1001`..`HYP-9001`, a request id shown as incident id
by a top-level exception handler, and an append-only audit trail in `data/hypha.audit`. Tested in
the container; see the issue. Offered as PR #476 against `main` (2026-10-26).

## If a code scheme were wanted

Not planned here; noted for completeness. A light scheme that would fit Hypha: give each `notify`
and each thrown error a short stable code (for example `HYP-0001`), show it to the user next to
the message and write it to the log with the request URL, from a single top-level handler
(NS-GLE-2026W44-hypha-010). That is the smallest step that makes an error a user can see map to a
line a maintainer can find, without adopting a full logging framework.
