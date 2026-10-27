---
title: "CODING_STANDARDS"
revision: 2
date_created: 2026-10-26
date_last_review: 2026-10-26
---

# Coding standards of Hypha

> Derived on 2026-10-26 from the code as it is on `upstream/dev` (commit 5dae13a) and `master`,
> not imposed from outside. Where the code is inconsistent, the rule follows the majority and
> the newer code (the datatypes `peer_reviewed_article`, `mailinglist`, `festival` and the DOM
> helpers of 2026), and says so. Measured over the 13 939 lines of own PHP in `index.php`,
> `hypha.php`, `system/core`, `system/datatypes` and `system/macros`. Bundled third-party code
> (`system/wymeditor`, `system/php-dom-wrapper` on master, `system/bowser`) is out of scope and
> is never reformatted.

Every rule opens a line with its bold id, so `grep -n '^\*\*' ai/CODING_STANDARDS.md` lists them.
Chapters: GEN (all files), PHP, DT (datatypes and macros), DOM (building HTML), SEC (security),
I18N (texts), DATA (the XML store), JS (browser code), TEST, PR (contributions).

Revision 2 adds the house conventions that differ from common PHP style (PSR-12 and the habits of
most PHP projects). Rules that only restate ordinary PHP practice are left out. Counts were measured
on `upstream/main` 73991af over `index.php`, `hypha.php`, `system/core`, `system/datatypes`,
`system/macros` and `system/languages`.

## GEN, every file

**GEN-001** Indent with one tab per level, never spaces. Measured: 11 882 tab-indented lines
against 2 lines indented with four spaces. Alignment inside a line (the `case [...]` tables of
the datatypes) may use spaces.

**GEN-002** Files are UTF-8 without byte order mark, with LF line endings. No CRLF file exists.

**GEN-003** English for identifiers, comments, commit messages and documentation. User-facing
text is never written in code but taken from the dictionaries (I18N-001).

**GEN-004** Commit messages start with the area in lower case followed by a colon, then an
imperative sentence: `festival: Update to Mollie API v2`, `settings: Fix unadmin in personal
settings editor`, `HyphaDomElement: Add prefix argument to generateId`. One subject per commit.

**GEN-005** No personal data in code, tests, fixtures, documentation or commit messages: no
names, e-mail addresses or content of a real Hypha site.

**GEN-006** After `<?php` the whole file body is indented one tab: classes, functions and
top-level statements start at one tab, not at column 0 (27 of 32 files). The NaturalDocs header
block of a class stays at column 0 above the indented class (`system/datatypes/text.php`). The
files that do not indent (`mailinglist.php`, `peer_reviewed_article.php`, `system/core/macros.php`,
`system/macros/*`) keep their own layout. No file ends with `?>`.

## PHP, the language level

**PHP-001** Code must run unchanged on PHP 8.2 up to and including 8.5 (D-GLE-2026W44-hypha-001).
Use no syntax or function newer than 8.2 (no typed class constants, no `#[\Override]`, no
property hooks, no `array_find`, no asymmetric visibility). Use nothing deprecated in any of
these versions; `docs/container/check_deprecations.sh` must report nothing for changed files.

**PHP-002** No namespaces, no Composer autoloading and no `declare(strict_types=1)`; files are
loaded by `index.php` with `require_once` from `system/core/` and by `hypha_getDataTypes()` from
`system/datatypes/`. A new core file is picked up because it ends in `.php`, so a file in
`system/core/` must have no side effects other than defining functions and classes and
registering callbacks.

**PHP-003** Naming:
- Classes of the core are `PascalCase` with a `Hypha` prefix where they are Hypha concepts
  (`HyphaRequest`, `HyphaSession`, `HyphaDomElement`, `HyphaDatatypePage`) and `PascalCase`
  without prefix for generic helpers (`HTMLDocument`, `HTMLForm`, `Xml`, `RequestContext`).
- Classes of datatypes are named after the datatype in lower case, because the class name is
  stored in `hypha.xml` as the page type: `textpage`, `mailinglist`, `peer_reviewed_article`,
  `festivalpage`. Renaming one breaks every existing site.
- Methods are `camelCase` (422 of 432). Views end in `View`, form handlers in `Action`:
  `editView`, `editAction`, `mailingSendTestAction`.
- Global functions are `camelCase` (`makeButton`, `sendMail`), and carry the prefix `hypha_`
  when they read or write site data (`hypha_getPage`, `hypha_setTitle`; 59 of them). Ten older
  functions are `snake_case` (`image_resize`, `xpath_encode`); leave those names alone.
- Constants of a datatype are grouped by prefix: `FIELD_NAME_*` (XML element and form field
  names), `PATH_*` (URL views), `CMD_*` (posted commands), `STATUS_*`.

**PHP-004** Braces: the opening brace of a function, class, `if`, `foreach` and `switch` is on
the same line (564 of 565 functions). Unlike PSR-12, a control statement with a single short
statement usually has no braces, either on one line (`if (!$version) return null;`, 153 times) or
with the body on the next line (216 times). Guards are chained on one line where that stays
readable: `foreach ($nodes as $node) if (...) $list[] = $node;`. Use braces as soon as the body has
more than one statement, and never omit them when the other branch of an `if`/`else` has them.
`} else {` (73) and `else` on its own line after `}` (67) both occur; follow the file.

**PHP-005** Arrays use the short syntax `[...]` in new code (114 against 42 `array(...)` in
older code). Do not convert old code only for this.

**PHP-006** Type declarations are welcome on new and changed functions (`string`, `?string`,
`HyphaDomElement|null`, union types). A parameter with a default of `null` and a type gets an
explicit nullable type (`?HTMLForm $form = null`), because the implicit form is deprecated in
8.4.

**PHP-007** Global state: `$O_O` (the `RequestContext`) is the entry point for request, user,
session, language and site data. The globals `$hyphaUser`, `$hyphaLanguage`,
`$hyphaContentLanguage` are marked deprecated in `index.php`; they, `$hyphaPage`, `$hyphaHtml`
and `$hyphaXml` are not used in new code (134 `global` statements remain); pass `$O_O` or take it from the page object.

**PHP-008** Errors: throw an exception for a programming error (`LogicException`,
`InvalidArgumentException`, `UnexpectedValueException`); report a user error with
`notify('error', __('key'))` and return `null` or `'reload'` from the action. Never `die()`
outside `hypha.php`. Never suppress with `@` except around functions documented to warn on
expected input (`getimagesize`).

**PHP-009** A lookup in an XML document that may find nothing must handle `null` before calling
a method on the result. `findOneXPath()` returns `null` for no hit and throws for more than one,
so query a node that is unique by construction (an id, or a path below the current version),
not `//name` over a whole page that keeps old versions.

**PHP-010** Comments: NaturalDocs blocks (`Function:`, `Parameters:`, `Section:`) are the
historic format and feed `documentation.txt`; PHPDoc (`/** @param ... @return ... */`) is used
in the newer datatypes. Either is fine; keep the format of the file you are in. Comment why,
not what. A one-line `/** @var HyphaDomElement $mailing */` above an assignment from a DOM lookup
gives the IDE the type (105 times); add one where the type is not obvious.

**PHP-011** String building: older code appends without a space before the operator,
`$html.= '<tr>';` (80 times against 69 with a space) and concatenates without spaces,
`'index/'.$language` (102 against 234 with spaces). Follow the lines around a change; do not
reformat. Double quotes are used for strings with interpolation or with `'` inside, single quotes
otherwise.

**PHP-012** Comparisons: older code compares with `==`/`!=` (218 against 148 strict). Do not change
an existing loose comparison in passing; it can change behaviour (`'0' == ''`, numeric strings).
New comparisons are strict. `mailinglist.php` and `peer_reviewed_article.php` write Yoda conditions
(`if ('' == $senderData['name'])`, 26 of the 43 in the code base); keep that style inside those two
files only.

**PHP-013** Code that runs in the global scope (`index.php`, `loadPage()` and its callers) names its
temporary variables with a leading underscore, `$_file`, `$_node`, `$_cmds` (36 times), so they
cannot clash with the real globals such as `$hyphaPage`. Keep doing that there; elsewhere use
normal names.

**PHP-014** Older classes declare methods without visibility (103 of 387 methods), which makes them
public, and four properties with `var`. New and changed methods state their visibility.

## DT, datatypes and macros

**DT-001** A datatype is a class in `system/datatypes/` that extends `HyphaDatatypePage`; it is
found automatically (`hypha_getDataTypes()` takes every instantiable subclass). It has:
- a constructor that calls `parent::__construct()` and loads its page file with
  `new Xml(<type>, Xml::multiLingualOn|Off, Xml::versionsOn|Off)` and
  `loadFromFile('data/pages/' . $id)`;
- `public static function getDatatypeName()` returning `__('datatype.name.<class>')`;
- `getSortDateTime()`, used by lists and the page index;
- `process(HyphaRequest $request)` as described in DT-002.

**DT-002** `process()` dispatches with one `switch` on an array of view and command, written as a
table whose columns are aligned with spaces (64 `case` lines):
```php
switch ([$request->getView(), $request->getCommand()]) {
	case [null,            null]:           return $this->defaultView($request);
	case [self::PATH_EDIT, null]:           return $this->editView($request);
	case [self::PATH_EDIT, self::CMD_SAVE]: return $this->editAction($request);
}
return '404';
```
A view (`...View`) only renders; an action (`...Action`) handles a posted `CMD_*`.

**DT-003** Views, actions and global commands report their outcome with a small return protocol
handled by `processCommandResult()`: `null` (render the page as built), `'reload'` (redirect to the
same URL with a GET; notifications survive), `'404'`, or `['redirect', $url]`. Do not call
`header('Location: ...')` or `exit` yourself in a view or action. A global command is registered
with `registerCommandCallback('name', 'functionName')` (32 times) and receives the posted
`argument`; a command answered by AJAX (`tagSelect`, `progress`) echoes its fragment and exits.

**DT-004** A datatype writes into fixed slots of the page layout with
`$this->html->writeToElement('<id>', ...)`: `pagename`, `main`, `pageCommands`, `langList`,
`tagList`, `versionList`, `header`, `footer`, `menu`. Command buttons are built with the helpers
`makeActionButton()`, `makeButton()`, `makeAction()` and `makeLink()` (121 times), which produce
the `hypha(...)` call of JS-002; do not write `onclick` handlers by hand.

**DT-005** URL paths of views with a variable part are constants with `[[name]]` placeholders,
`const PATH_MAILS_VIEW_ID = 'mails/[[id]]';`, filled with `hypha_substitute()` after escaping the
values (`mailinglist::substituteSpecial()`).

**DT-006** A macro is a file `system/macros/<name>.php` that defines `class <Name>Macro extends
HyphaMacro` with an `invoke()` method returning the replacement node (or `false`), and ends with
`return <Name>Macro::class;`. Authors use it in page content as `<macro name="<name>" .../>`.

## DOM, building HTML

**DOM-001** HTML is built as a DOM, not by concatenating strings, wherever user data is
involved. Use the helpers of `HyphaDomElement` (`createChild`, `appendText`, `setText`,
`addClass`, `appendHtml` for trusted HTML only) and `HTMLDocument::createForm()`.

**DOM-002** php-dom-wrapper is removed on `dev`. Do not reintroduce its methods (`find`,
`append`, `html`, `text`, `attr`, `create`, `children`, `parent`, `remove`, `replaceWith`). Use
`findXPath`/`findOneXPath`, `getElementById`, and the DOM methods of PHP itself.

**DOM-003** XPath literals built from input go through `xpath_encode()`.

**DOM-004** A node taken from another document is imported with `importNode()` before it is
appended. A list of nodes returned from a helper is an array of detached nodes, not the
`childNodes` of a temporary element (KI-GLE-2026W44-hypha-001 shows why: on PHP 8.2 the nodes
die with their temporary parent).

**DOM-005** Every form is created with `HTMLDocument::createForm()` so it gets its own `<form>`
tag and the CSRF field.

## SEC, security

**SEC-001** Every view and action checks authorisation itself at its start: `isUser()` for
members, `isAdmin()` for administrators, and for anonymous actions an explicit decision in a
comment why anonymous is allowed. Do not rely on a button being hidden.

**SEC-002** Every state-changing request is a POST through `executePostedCommand()` or a
datatype `process()` case with a `CMD_*`, and requires a valid CSRF token.

**SEC-003** Output of user data into HTML is escaped: `setText()`/`appendText()` in the DOM, or
`htmlspecialchars()` when a string is concatenated (80 call sites today). User HTML from the
editor is accepted only after `HTMLForm::validateHtmlField` and is never echoed in an attribute.

**SEC-004** Tokens and codes come from `random_bytes()` (`bin2hex(random_bytes(16))` or more);
never `uniqid()`, `rand()` or `mt_rand()`. Compare secrets with `hash_equals()`.

**SEC-005** Absolute URLs in e-mails are built from the configured site URL, not from
`$_SERVER['HTTP_HOST']`.

**SEC-006** File names from a request are never used as a path. Store uploads under a generated
name (`uniqid()` plus a checked extension, as `HyphaImage` does) and resolve paths with
`realpath()` against the allowed folder (as `serveFile()` does).

## I18N, user-facing text

**I18N-001** Every text a user reads comes from `__('key')`, with the key in both
`system/languages/en.php` and `system/languages/nl.php`, the `$LANG` arrays of the two
interface languages (557 call sites; on 2026-10-26 `en.php` has 470 entries and `nl.php` 465). Parameters are passed
as an array: `__('too-big-file', ['upload-max-filesize' => ...])`.

**I18N-002** Keys are lower case with hyphens and carry the prefix of their datatype: `art-`
(peer-reviewed article, 119 keys), `festival-` (55), `ml-` (mailing list, 42).

**I18N-003** Dates are formatted with `IntlDateFormatter` or `DateTime::format()`, not with
`strftime()` (deprecated since 8.1).

**I18N-004** Placeholders, in dictionary texts and in HTML templates alike, are written
`[[name]]` and filled by `__('key', ['name' => ...])` or `hypha_substitute($string, $vars)` (204
placeholders). Larger HTML templates are heredocs (`<<<EOF`, 18) full of `[[...]]` placeholders,
turned into a form with `$hyphaHtml->createForm(hypha_substitute($html, $vars))`.

**I18N-005** The dictionaries are PHP files with `$LANG = array (`, double-quoted keys and values,
one entry per line, indented like every other file. Datatype names are the exception to the
hyphen rule of I18N-002: `datatype.name.<class>`.

## DATA, the XML store

**DATA-001** Read and change site data only through the `hypha_*` functions and the `Xml`
class. A change is `lockAndReload()`, modify, `saveAndUnlock()`; never write a data file with
`file_put_contents`. `HyphaFile` writes to a temporary file and renames it, so a reader always
sees a complete file.

**DATA-002** Hold the lock as briefly as possible, and never send e-mail or call an outside
service while holding it.

**DATA-003** A change of the structure of `hypha.xml` or a page file raises `schemaVersion` and
comes with a migration that upgrades older files on first load.

## JS, browser code

**JS-001** Browser code is jQuery 1.7.1 style (the bundled version) and ES5 where it is written
inside PHP heredocs, because it must run in every browser the site's visitors use. New code may
use plain DOM APIs instead of jQuery.

**JS-002** Posting a command uses the `hypha(url, cmd, arg, form)` helper of `events.php`, so the
CSRF field and form handling stay in one place.

**JS-003** Browser code that belongs to a PHP feature is written inline: the PHP function calls
`ob_start()`, closes PHP with `?>` at column 0, writes the `<script>`, reopens PHP and hands the
buffer to `$html->writeScript(ob_get_clean())` (23 buffers, 10 scripts). Such functions are hooked
in with `registerPostProcessingFunction()` (12 times). PHP values go into the script through
`<?=json_encode(...)?>`, also translated texts; a bare `<?=__('key')?>` inside JavaScript quotes
breaks on a text with a quote.

## TEST

**TEST-001** A change to request parsing extends `tests/HyphaRequestTest.php`. A change to a
datatype is checked with `docs/container/smoke_test.py` against a copy of a real site's data on
PHP 8.2 and 8.5, and the container log must show no new warning, deprecation or fatal error.

**TEST-002** Test data of a real site stays outside the repository (GEN-005).

## PR, contributions

**PR-001** One subject per pull request, against `main` (`dev` was removed upstream on 2026-10-26). Describe how it was
tested (PHP versions, data set, logged in or anonymous).

**PR-002** Do not mix reformatting with a functional change.

**PR-003** A patch offered in an issue is marked as a suggestion and a starting point, not a
finished fix: the maintainer decides on the final form.
