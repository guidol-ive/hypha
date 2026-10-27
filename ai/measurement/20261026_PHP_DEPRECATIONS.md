---
title: "PHP DEPRECATIONS: what PHP 8.1 up to 8.5 deprecate that Hypha still uses"
revision: 1
date_created: 2026-10-26
date_last_review:
---

# PHP DEPRECATIONS

Read on 2026-10-26 with [`../../docs/container/check_deprecations.sh`](../../docs/container/check_deprecations.sh)
(`php -l` with all errors on, per version, in `php:<version>-cli`, plus a scan for deprecated
functions) and from the container log of the crawls in
[`20261026_PHP_8_2_CONTAINER_TEST.md`](20261026_PHP_8_2_CONTAINER_TEST.md). Third-party folders
(`system/wymeditor`, `system/php-dom-wrapper`, `system/mollie`, `system/bowser`) were left out of
the `php -l` run.

A deprecation is not an error today, but it becomes one when the feature is removed, which is
how master broke. REQ-002 requires none in the range 8.2 to 8.5.

## Compile time (php -l), dev at 5dae13a

| Deprecated in | Message | Location | Fix |
|---|---|---|---|
| **8.2** | `Using ${var} in strings is deprecated, use {$var} instead` (3x) | `system/core/pages.php:746` (master: `:743`) | `{$var}` |
| 8.4 | Implicitly nullable parameter `$form` | `system/core/events.php:227` `makeAction()`; `system/datatypes/text.php:363`, `mailinglist.php:1405`, `festival.php:1275`, `peer_reviewed_article.php` `makeActionButton()` | `?HTMLForm $form = null` |
| 8.4 | Implicitly nullable parameter `$discussion` | `peer_reviewed_article.php`: `constructDiscussionFieldSuffix`, `createCommentForm`, `discussionRender`, `makeDiscussionActionButton` | `?HyphaDomElement $discussion = null` |

On master the 8.2 item is the same; the 8.4 items are five instead of ten, because master has
fewer typed parameters.

## Run time, seen in the crawl on PHP 8.2

| Deprecated in | Message | Location | Fix |
|---|---|---|---|
| 8.1 | `strftime()` | `peer_reviewed_article.php:606`, `:610` | `IntlDateFormatter` (needs the intl extension) or `DateTime::format` with month names from the dictionary |
| 8.1 | Passing `null` to `DOMElement::setAttribute()` | `system/core/document.php:566` | `?? ''` or skip the attribute |
| 8.1 | Implicit conversion from float to int | `system/core/HyphaImage.php:173` (`imagecopyresampled` arguments) | `(int) round(...)` |

No "Creation of dynamic property" message (the big 8.2 deprecation) appeared in either crawl.
That covers the code paths a crawl reaches (views, edit views); actions such as sending a
mailing, the festival payment and the installer were not exercised, so dynamic properties there
are not ruled out.

## Function scan

| Function | Deprecated | Location | Note |
|---|---|---|---|
| `strftime` | 8.1 | `peer_reviewed_article.php:606`, `:610` | as above |
| `imagedestroy` | 8.5 (no-op since 8.0) | `HyphaImage.php:122`, `:175`, `:176` | remove the calls |
| `mcrypt_create_iv` | removed in 7.2 | `peer_reviewed_article.php:1812`, `mailinglist.php:1283` | dead fallback behind `function_exists('random_bytes')`; remove |
| `utf8_encode`, `utf8_decode` | 8.2 | none | |
| `each`, `create_function`, `money_format` | removed | none | |

## Version guards

`index.php:27` and `hypha.php:434` still refuse only PHP older than 5.4. With REQ-001 they should
refuse older than 8.2, before anything else is loaded, with a readable message.
