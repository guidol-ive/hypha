# Unicode in Hypha

Result of a test on 2026-10-27 with a fictional site in the container of `docs/container` (PHP 8.2), on
`main` (d97ab7b) and on the branch with the Markdown editor (#520). The Dutch handbook page
[`../handleiding/techniek/08-unicode.md`](../handleiding/techniek/08-unicode.md) has the same content
for site administrators.

## Summary

| Area | Result |
|---|---|
| Body text, old editor and Markdown editor (Latin with diacritics, NFD, Greek, Cyrillic, Arabic, Hebrew, CJK, emoji with ZWJ and flags, astral, combining marks, zero-width, NBSP, „…” ‘…’) | Pass: stored, reloaded and shown unchanged |
| Versions of text pages (diff/patch split on ASCII space) | Pass for Unicode; diff of CJK is per sentence, NFC vs NFD shows as a change that looks like none |
| Markdown editor fields round trip; control characters and invalid UTF-8 | Pass: `hypha_markdownClean()` scrubs and strips them |
| Control characters / invalid UTF-8 posted to old code (comments, full name) | **Fail**: file not well-formed, article or whole site 500. #539, fix #540 |
| Page names from *new page* and text page rename (`validatePagename()`) | **Fail**: every non-ASCII byte is dropped (`Café` → `Caf`, Greek → `_`). #543 |
| Pages with a non-ASCII name (made through a link) | **Fail**: 404, path not percent-decoded. #541, fix #542 |
| Page index with a name starting after `Z` | **Fail**: hangs 30 s. #514, fix #516 |
| Case-insensitive lookups (`strtolower`) in page chooser, `hypha_getPage()`, user names | ASCII only |
| Article slug in the Markdown editor | Pass for Latin, also without intl (full decomposition table, same as the browser); non-Latin titles become `pagina`, `pagina-2` by choice while non-ASCII page names fail (#541, #543) |
| Heading ids `kop-<slug>` | Pass for Latin; non-Latin headings become `kop-zonder-naam`, `-2`, … |
| `dir` / `lang` / `<bdi>` / `<bdo>` | Kept in both editors (fixed in the Markdown editor filter); no `dir` on `<html>` |
| Tags | Pass, including the tag page; the editor sends labels in NFC and the server compares in NFC when intl is present (fixed) |
| Mail subject | Encoded as one RFC 2047 word without length limit. #544, fix #545; From name not encoded (#428, #495) |
| Title counter, word count, reading time (editor) | Pass (fixed): grapheme clusters with `Intl.Segmenter`; `\p{M}` stays in its word; a CJK character counts as a word |
| `[[link]]` with a no-break space; page lookup case | Pass (fixed): server and preview give the same address; case is compared for A–Z only, as `hypha_getPage()` does |

## Requirements

1. **mbstring** is required (REQ-005); the Markdown editor uses `mb_scrub`, `mb_strtolower`, `mb_substr`, `mb_str_split`. `main` itself does not use it yet.
2. **intl** is optional. With it, `hypha_markdownSlug()` uses `Normalizer`; without it, the table in `hypha_markdownDecompose()`, which covers every letter with a canonical decomposition in U+00C0–U+024F and U+1E00–U+1EFF, so the server slug equals the browser slug (`String.prototype.normalize`). With intl, existing tag labels are also compared in NFC. The official `php` images have no intl.
3. **iconv** is not used.

## Upstream reports (2026-10-27)

1. [#539](https://github.com/PlanBCode/hypha/issues/539) control characters and invalid UTF-8 break `hypha.xml` or a page file; [#540](https://github.com/PlanBCode/hypha/pull/540) cleans `$_POST` in `index.php`.
2. [#541](https://github.com/PlanBCode/hypha/issues/541) request path not percent-decoded; [#542](https://github.com/PlanBCode/hypha/pull/542) `rawurldecode()` per path part.
3. [#543](https://github.com/PlanBCode/hypha/issues/543) `validatePagename()` drops non-ASCII letters; no pull request, depends on #541 and #516.
4. [#544](https://github.com/PlanBCode/hypha/issues/544) over-long encoded subject; [#545](https://github.com/PlanBCode/hypha/pull/545) splits it into words of at most 75 characters.
