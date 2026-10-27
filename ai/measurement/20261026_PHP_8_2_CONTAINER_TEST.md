---
title: "PHP 8.2 CONTAINER TEST: master and dev against a production data set, PHP 8.2 up to 8.5"
revision: 1
date_created: 2026-10-26
date_last_review:
---

# PHP 8.2 CONTAINER TEST

Read on 2026-10-26. Never corrected, only superseded by a newer reading.

## Set-up

- Images built from [`../../docs/container/Containerfile`](../../docs/container/Containerfile) on
  `php:<version>-apache` (Debian, Apache 2.4.69) for PHP 8.2, 8.3, 8.4 and 8.5, with GD.
- Engine: Docker 29.4 on OrbStack (macOS, aarch64). Podman was not installed on the test machine;
  the files are engine-neutral (plain `Containerfile`, fully qualified image names, `:Z` volume
  label) but **a run under Podman is still to be done** (NS-GLE-2026W44-hypha-020).
- Code: `master` at f08aa50 and `upstream/dev` at 5dae13a, exported with `git archive`.
- Data: a copy of the De Stadsbron `data/` folder from the local test set (1 330 pages: 1 248
  peer-reviewed articles, 79 text pages, 2 mailing lists, 1 page of the obsolete type `article`;
  98 private; 46 users; 738 MB including images). Theme folder taken from the repository. The
  data stays outside the repository.
- Logged-in runs: a test administrator added to the copy of `hypha.xml` with a generated
  password; real accounts were not used.
- Tools: [`../../docs/container/smoke_test.py`](../../docs/container/smoke_test.py) (anonymous, every
  page in every language plus fixed URLs) and a logged-in variant that also opens `/edit` of
  every page.

## Results

| Code | PHP | Anonymous, 1 333 requests | Logged in, 2 662 requests |
|---|---|---|---|
| master | 8.2 | Every request 500: `Declaration of DOMWrap\Traits\ManipulationTrait::remove($selector = null) must be compatible with DOMElement::remove(): void` | not possible |
| dev | 8.2 | Every request 500: `Couldn't fetch HyphaDomElement` in `HyphaDomElement->appendChildren()` (`system/core/database.php:393`), first hit while writing the header | not possible |
| dev | 8.3 | 1 229 x 200, 103 x 404, 1 x 302, 0 failures | not run |
| dev | 8.4 | 1 229 x 200, 103 x 404, 1 x 302, 0 failures | 82 x 500 |
| dev | 8.5 | same as 8.4 | not run |
| dev + fix of KI-GLE-2026W44-hypha-001 | 8.2 | same as 8.4 | 82 x 500, identical pages |
| dev + fix | 8.4, 8.5 | same as 8.4 | 82 x 500, identical pages |

The 103 responses 404 are the 98 private pages, `data/hypha.xml` and `system/core/base.php`
(direct access to data and code is refused, as intended), and three pages whose stored name
contains quotes, a trailing space or markup (`...trailer'><img src=`), so the URL built from the
name does not resolve back to the page. The 302 is `/settings` sending an anonymous visitor to
the login. `/no-such-page-xyz` (no language prefix) answers 200 with the home page, while
`/nl/no-such-page-xyz` answers 404 as expected; and `/hypha.php`
answers 200 with the public builder form (see SEC-001 in the security review). Mean response time 13-14 ms per page, slowest the home page (360-485 ms) and the
timeline pages (~170 ms).

### Logged-in failures (dev, identical on 8.2 with fix, 8.4 and 8.5)

| Count | Error | Cause |
|---|---|---|
| 42 | `Call to a member function getText() on null`, `peer_reviewed_article.php:461` | The check "has featured image" assumes a `featured_image` element; older articles have none. |
| 28 | `XPath query returned more than one result: //featured_image`, `database.php:76` | Same check; `//featured_image` searches the whole page file, which keeps older versions. |
| 10 | `getText called on node with non-text children: <title>`, `peer_reviewed_article.php:2012` | `getTitle()` fails when a title contains markup (for example `<em>`). |
| 2 | `Class "article" not found`, `pages.php:229` | A page of a datatype that no longer exists. |

Pages affected: 75 article views, 5 article edit views and the 2 views of the `article` page:
editors cannot open 6% of the articles. Anonymous visitors are not affected because the checks
run only for members.

### PHP messages per crawl (dev + fix on 8.2, anonymous plus logged in)

| Count | Message |
|---|---|
| 6 864 | `DOMDocument::loadHTML(): Attribute class redefined` |
| 5 028 | `DOMDocument::loadHTML(): Tag editor invalid` |
| 4 670 | `DOMDocument::loadHTML(): htmlParseEntityRef: expecting ';'` |
| 2 x 4 804 | `Function strftime() is deprecated` (`peer_reviewed_article.php:606`, `:610`) |
| 473 | `DOMElement::setAttribute(): Passing null to parameter #2 ($value) of type string is deprecated` (`document.php:566`) |
| 188 | `htmlParseCharRef: missing semicolon` |
| ~60 | `Implicit conversion from float ... to int loses precision` (`HyphaImage.php:173`) |
| 28 each | `Tag macro invalid`, `Tag source invalid`; 14 `Tag video invalid` |
| 6 | `Using ${var} in strings is deprecated` (`pages.php:746`) |
| ~80 | `ID ... already defined` (content pasted from word processors) |

The "Tag macro invalid in Entity" warning reported on test.destadsbron.nl is this class of
message: libxml's HTML 4 parser does not know `<macro>`. It is harmless for the output but floods
the log (KI-GLE-2026W44-hypha-005).

## Unit test

`tests/HyphaRequestTest.php` on `php:8.2-cli`: 84 assertions, none failed.
