# Multilingual sites in Hypha

What multilingualism means in Hypha: what the code and the documentation intend, and what `main`
(d97ab7b) actually does. Read from the code of `main`, `README.md`, `documentation.txt`, the
dictionaries in `system/languages/`, `ai/ARCHITECTURE.md`, `docs/functional/` and the handbook
(`docs/handleiding/`). The actual behaviour was checked on 2026-10-28 with `curl -i` against a
fictional site in the container of `docs/container` (PHP 8.2 and 8.5), default language `nl`,
with English translations made through the translate view.

Every section separates two things:

- **Intended**: documented, or evident from the design of the code (names, comments, dictionary
  keys, the shape of the data).
- **Actual**: what `main` does. A difference is marked with the issue that reports it.

## Summary

| Topic | Intended | Actual on `main` |
|---|---|---|
| Interface language vs content language | Two separate languages | Separate; the interface falls back on the content language |
| Content language | From the URL, else the default language | As intended; system pages always get the default language (#310) |
| Interface language | Account, then browser, then default | Account, first two letters of `Accept-Language`, content language, default (#593) |
| URL | `/<language>/<page name>[/<view>]` | As intended; any other path without a language shows the home page with 200 (#604) |
| Translations | One page, one name per language, linked by page id | As intended for text pages; translating into an existing language overwrites it (#612); other page types have one language |
| Home page per language | The default page in each language (logout code, handbook) | Only in the default language; `/en` gives 404 (#605) |
| Page without the requested language | 404; links in content go to another language | As intended; tag index shows or crashes on other languages (#310) |
| Language list | Translations of the current page | Only on text pages and the page index |
| Index and tags per language | `index/<language>`, `tag/<language>/<label>` | Index works; tag index lists pages in the default language (#310) |
| Mail and digest | In the recipient's language (#181) | In the language of whoever triggers it; some texts in English (#607) |
| Search engines | (not designed) | No `<html lang>` (#521), no `hreflang` (#606), no `Vary` (#593), no canonical (#521) |

## 1. Two languages

1. **Intended.** Hypha distinguishes the **content language**, the language a page is written in,
   from the **interface language**, the language of buttons, labels and messages. The handbook
   (`docs/handleiding/gebruik/01-wat-is-hypha.md`, "Talen") names both; `base.php` documents
   `$hyphaContentLanguage` as "the language of the content that is served, not to be mistaken for
   the user interface language". `RequestContext` has `getContentLanguage()` and
   `getInterfaceLanguage()`.
2. **Content languages** are all 2-letter codes of `system/languages/languages.json` (ISO 639-1,
   139 codes). A site "uses" a language as soon as one page has a translation in it
   (`hypha_getUsedContentLanguages()`); there is no list of site languages to configure (#129 asks
   for one).
3. **Interface languages** are the dictionaries in `system/languages/*.php`: `en` and `nl`.
4. **Settings** (`/settings/hypha`): `defaultLanguage` (content) and `defaultInterfaceLanguage`; if
   the latter is empty, the first dictionary found is used.

## 2. How the content language is chosen

1. **Intended and actual.** `getContentLanguage()` returns the language of the URL
   (`HyphaRequest::getLanguage()`), else the default language. Nothing else: not the account, not
   `Accept-Language`, not a cookie.
2. A URL language is accepted when it is any code of `languages.json`, also one the site does not
   use (`/fr/Start` is a normal 404, not a redirect).
3. **System pages** (`index`, `tag`, `settings`, `help`, ...) have no language in the first segment,
   so their content language is always the default language. `index/<language>` and
   `tag/<language>/<label>` read the language from their own argument but do not set it as the
   content language. **Actual** consequences: `index/en` shows English page names under a Dutch
   interface with body class `lang_nl`, and its index button points to `index/nl`; the tag index
   renders every page in the default language (#310). The *new page* dialog on a system page
   proposes the default language (#363).

## 3. How the interface language is chosen

1. **Intended.** The member's own choice ("bedieningstaal" in the account), else the browser, else
   the site default. The handbook (`07-menu-en-navigatie.md`) says an administrator sets the default
   interface language "for visitors".
2. **Actual** order in `RequestContext::getInterfaceLanguage()`: the `language` attribute of the
   logged-in user; the first two letters of `Accept-Language`; the content language; the default
   interface language. The first that has a dictionary wins.
3. **Actual** deviations: quality values and further languages in `Accept-Language` are ignored,
   and no `Vary: Accept-Language` is sent although the HTML depends on it (#593, fix #598).
4. Because the content language comes before the default, a visitor without a usable
   `Accept-Language` (such as a crawler) reading `/en/Home` gets an English interface, and on
   `/nl/Start` a Dutch one. A visitor with `Accept-Language: en` on a Dutch page gets Dutch content
   with an English interface: by design, but it mixes two languages on one page.
5. The help popups (`help/<subject>/<language>`) use the interface language. The WYMeditor loads
   its own interface texts in the **content** language (`system/core/editor.php:26`), so an editor
   for a page in a language without a WYMeditor translation requests a missing script.

## 4. URL structure

1. **Intended** (`HyphaRequest`, `index.php` stage 3, `docs/functional/PAGE_TYPES.md`):
   `/<language>/<page name>[/<view>[/<arguments>]]`, for example `/nl/Over_ons/edit`. A first
   segment that is not a language may be a system page: `index`, `tag`, `settings`, `upload`,
   `images`, `files`, `chooser`, `help`.
2. `/` and `/<language>` show the default page. The unit test `tests/HyphaRequestTest.php` also
   accepts `/<type>/<name>` without a language (`festival/festival`, `text/system`): the first
   segment is dropped and the page is looked up in the default language.
3. **Actual** deviations:
   1. Any other path without a language (`/robots.txt`, `/favicon.ico`, `/anything`) shows the
      home page with 200, and `/foo/Over_ons` shows `nl/Over_ons` (#604, fix #608).
   2. `/en` gives 404 when the home page is called differently in English (#605, fix #609).
   3. Page names are looked up case-insensitively for A-Z, so `/nl/start` and `/nl/Start` are the
      same page under two URLs; there is no canonical URL (#521).
   4. The path is not percent-decoded, so page names outside ASCII give 404 (#541, fix #542).

## 5. Pages and translations

1. **Storage.** `hypha.xml` has one `page` per page with its id, type and `private` flag, and one
   `language` child per translation: `<language id="en" name="Home"/>`. The translations are linked
   by being children of the same `page`, so by the page id; each has its own name and so its own
   URL. A text page file (`data/pages/<id>`) has one `<language xml:id="..">` per translation with
   its own versions.
2. **Multilingual and single-language page types.** The `Xml` constructor takes
   `Xml::multiLingualOn|Off`:
   1. `textpage`: multilingual, with a *translate* view (`<page>/translate`) that adds a language
      with its own name and content. This is the only page type a member can translate.
   2. `mailinglist` and `festivalpage`: their file is marked multilingual, but they have no translate
      view; in practice one language.
   3. `peer_reviewed_article`: single-language (`multiLingualOff`); the author can change the
      language of the article (`PAGE_TYPES.md`).
3. **Links in content** are stored as `hypha:<page id>` (`wikify_link()`), so a link points to a
   page, not a translation. When the page is shown, `dewikify_link()` picks the translation in the
   current content language, else the default language, else any language; a link to another
   language gets the class `otherLanguageLink` and the title "this page only exists in another
   language" (in the interface language). The menu is content and follows the same rule
   (handbook, `07-menu-en-navigatie.md`).
4. **Actual** deviations: the translate view offers languages that already have a translation and
   then silently renames and replaces that translation, so its old address gives 404; it stores
   any posted language code, also one no URL can reach (#612, fix #613; #129 covers the dropdown);
   a translation saved in the same second as another version gets a duplicate id (#528, fix #534).

## 6. What a visitor, a member and a search engine get

1. **Anonymous visitor.** Content in the language of the URL (default language on `/`); interface
   as in section 3; public pages only. A private page gives 404 with "log in to view".
2. **Member.** The same content; interface in the language of the account. Members also see private
   pages, the translate button, the version list and the *new page* dialog, which proposes the
   current content language.
3. **Search engine.** Exactly what an anonymous visitor without `Accept-Language` gets. **Actual**:
   there is nothing that tells it the language or the relation between translations: no
   `<html lang>` (#521), no `Content-Language`, no `<link rel="alternate" hreflang>` (#606,
   fix #610), no canonical URL (#521), no `Vary: Accept-Language` (#593), no sitemap (#375) or
   robots.txt (#523; today `/robots.txt` is the home page as HTML, #604). The `<title>` is the site
   title on every page (#521). Body classes `lang_<code>` exist for themes, not for crawlers.

## 7. A page without a version in the requested language

1. **Intended and actual for a URL.** `/<language>/<name>` that does not exist in that language is
   404 with "This page doesn't exist" (members get a *create* button). There is no redirect to
   another translation, also not when the same page exists in that language under another name
   (`/en/Start` while the English name is `Home`).
2. **Intended for links.** A link in content to a page without the current language goes to another
   language, marked as such (section 5.3).
3. **Actual for lists.** The page index only lists pages that have the requested language. The tag
   index and the `pagelist` macro instantiate every page in the content language; the tag index
   then shows the default-language version, and a tagged page without that language ends in a fatal
   error (500) (#310). The `pagelist` macro refuses a `languages=` filter other than the current
   language for that reason.
4. **Actual for the root.** `/en` gives 404 although the home page has an English translation
   (#605, fix #609).

## 8. The language list

1. **Intended** (`documentation.txt`: "langList - a list of available translations of the selected
   page"; handbook: "Naast de naam van een pagina staan de talen waarin ze bestaat"). The theme has
   a `<div id="langList"/>` next to the page name.
2. **Actual** (`hypha_indexLanguages()`): it lists every language used anywhere on the site,
   sorted; the current language is marked `selected`; a language in which this page exists links to
   that translation; another language is shown `disabled`. On the page index it links to
   `index/<language>`.
3. It is filled only by the default view of a text page and by the page index; articles, mailing
   lists, festivals, the tag index and the views `edit`/`translate` have none. The links carry no
   `hreflang` (#606) and the names are neither escaped nor percent-encoded (#419, #541).

## 9. The page index and tags per language

1. **Page index.** `/index/<language>` lists the pages that have that language, alphabetically,
   with the name in that language; `/index` uses the content language. The index button in the
   header links to `index/<content language>` (#365, solved). **Actual**: the title is the raw key
   `page-index` (#557); a language that no page uses gives an empty index with 200 (#604); the
   interface and body class are those of the default language (#310); a name starting after `Z`
   hangs the index (#514).
2. **Tags.** A tag has a label and description per language (`tagList/tag/language`). On a page,
   only tags with a label in the page's language are shown, and they link to
   `tag/<language>/<label>`. A new tag gets a label in the current content language only; there is
   no interface to translate a tag. **Actual**: the tag index heading is hard-coded English (#557),
   it lists the default-language version of every tagged page and crashes on a page without that
   language (#310), and labels with `+` cannot be opened (#541).

## 10. Site elements: title, header, footer, menu

1. The site title, header, footer, menu, theme and CSS are one per site, not per language. On an
   English page the header and footer are those written for the site (for example in Dutch). The
   menu links follow the content language (section 5.3), but their custom link texts do not.
2. This is a limitation of the design, not a defect: a translated header or footer would need a
   language child per element in `hypha.xml`.

## 11. Mail and digest

1. **Intended.** Mails to a member in that member's interface language (#181 asks for it).
2. **Actual.** Every mail is built with `__()` in the interface language of the request that sends
   it: the member who acts, or, for the digest, whoever happens to trigger the "poor man's cron" in
   `index.php` (possibly an anonymous visitor with `Accept-Language`). All members get the same
   text (#181).
3. The digest section of a text page had English texts and listed every translation under the name
   in the current content language (#607, fix #611).
4. Since commit ea667b7 (2019) editing or translating a text page no longer writes to the digest;
   only revert and delete do. The keys `changed-page` and `translated-page` are still in the
   dictionaries, which suggests that this was not intended (not reported).

## 12. Reports

Existing issues that cover multilingual behaviour:

1. #593 (fix #598): `Accept-Language` quality values and `Vary`.
2. #521: `<html lang>`, canonical URL, title, meta description.
3. #310: content language of system pages, tag index, `pagelist`.
4. #363: *new page* from a system page proposes the default language.
5. #181: mail in the language of the sender, not the recipient.
6. #129, #137: choose the site languages; translate dropdown offers existing translations.
7. #14: change the language of a page.
8. #557 (fix #568), #575 (fix #576): untranslated keys.
9. #541 (fix #542), #543: page names outside ASCII.
10. #528 (fix #534): duplicate version id after a translation in the same second.
11. #375, #523: sitemap and robots.txt.
12. #187 and #365: solved on `main`.

Filed on 2026-10-28 from this review:

1. #604 (fix #608): addresses that do not exist answer 200 with the home page.
2. #605 (fix #609): `/en` gives 404 although the home page has an English translation.
3. #606 (fix #610): translations are not linked with `hreflang`.
4. #607 (fix #611): hard-coded English in the language selector, the image and file index and the
   text page digest.
5. #612 (fix #613): a translation into a language the page already has replaces and renames that
   translation; unknown language codes are stored.

The known-bug tests are `tests/bekend/test_i18n.py`.
