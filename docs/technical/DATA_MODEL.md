# Data model

Everything a site holds is under `data/`. Copying this folder copies the site.

| Path | Content |
|---|---|
| `data/hypha.xml` | Site settings, users, page list, tags, menu, header, footer, digest queue |
| `data/pages/<id>` | One XML file per page: all languages and all versions, and for articles also discussions and approvals |
| `data/images/` | Images uploaded through the editor or forms; `images/org/` keeps originals larger than 1120x800; thumbnails are made on demand |
| `data/files/` | Other uploaded files |
| `data/themes/<name>/` | `hypha.html` (template), `hypha.css`, and theme assets |
| `data/digest` | Queue of changes for the next digest |
| `data/hypha.stats` | Counters |
| `data/css/` | Extra style sheets used by some themes (De Stadsbron) |

Ids of pages, users and tags are `uniqid()` values (13 hexadecimal characters).

## hypha.xml

A fresh installation, with personal values left out:

```xml
<hypha type="project" defaultLanguage="nl" defaultPage="home" email="…"
       digestInterval="21600" schemaVersion="1">
  <title>Test</title>
  <header>Test</header>
  <footer>…</footer>
  <menu>
    <a href="hypha:69dfec633ce2a"/>
  </menu>
  <userList>
    <user id="69dfec633e055" username="…" password="…" fullname="…" email="…" rights="admin"/>
  </userList>
  <pageList>
    <page id="69dfec633ce2a" type="textpage" private="off">
      <language id="nl" name="home"/>
    </page>
  </pageList>
  <digest/>
</hypha>
```

| Element / attribute | Meaning |
|---|---|
| `hypha/@defaultLanguage`, `@defaultInterfaceLanguage`, `@defaultPage`, `@defaultNewPageType` | Site settings |
| `hypha/@email` | Sender and reply-to of system mail |
| `hypha/@digestInterval`, `@lastDigestTime` | Seconds between digests; Unix time of the last one |
| `hypha/@theme` | Folder under `data/themes/` |
| `hypha/@schemaVersion` | Version of this structure, 1 |
| `title`, `header`, `footer`, `menu` | Site elements; links to pages as `hypha:<page id>` |
| `userList/user` | `id`, `username`, `fullname`, `email`, `language`, `password` (bcrypt, or MD5 for very old accounts), `rights` (`admin`, `user`, `invitee`, `exmember`), `key` (pending invitation or recovery) |
| `pageList/page` | `id`, `type` (PHP class of the page type), `private` (`on`/`off`); one `language` child per translation with `id` and `name` (the address) |
| `tagList/tag` | Tags with a label per language; pages refer to tags by id |
| `digest` | Pending digest entries |
| `mdeditor` | Optional settings of the Markdown editor (see below); without it the defaults of `hypha_mdeditorDefaults()` apply |
| `userList/user/@mdeditor` | Preferences of a user for the Markdown editor, as JSON: `mode` (`visual` or `markdown`), `remember`, `split` (20–80) |

The settings of the Markdown editor (`system/core/markdown.php`, `hypha_mdeditorSettings()`). Every
list replaces its default when it has at least one item:

```xml
<mdeditor level2="on" level2Off="user">
  <section>Politiek en bestuur</section>      <!-- sections (rubrieken) an article can have -->
  <statute>Feiten zijn gecontroleerd …</statute> <!-- points of the editorial statute, ticked when approving -->
  <frameHost>player.vimeo.com</frameHost>     <!-- hosts an embedded iframe may point to (level 2) -->
  <peertubeHost>framatube.org</peertubeHost>  <!-- PeerTube instances for embedded video (level 2) -->
  <scriptHost>cdn.jsdelivr.net</scriptHost>   <!-- hosts an interactive block may load scripts and styles from -->
</mdeditor>
```

`level2="off"` turns embedded content and interactive blocks off for the whole site; `level2Off`
is a comma-separated list of roles (`user` for standard users, `admin` for privileged users) for which they are off.

## A page file

```xml
<hypha type="textpage" multiLingual="on" versions="on" schemaVersion="1">
  <language xml:id="nl">
    <version xml:id="…timestamp…" author="…user id…">
      <p>…content…</p>
    </version>
  </language>
</hypha>
```

A peer-reviewed article stores, below the root, `article` (with `title`, `author`, `excerpt`,
`featured_image`, `content/text`, `method`, `sources`, `context`), `discussions/review` and
`discussions/public` (each `discussion` with `discussion_comment` children, moderation status,
blocking flag), `approves/approve`, and status and dates as attributes. A mailing list stores
`addresses` (with confirm and unsubscribe codes) and `mailings`. A festival stores sign-ups,
contributions and payments.

### Pages from the Markdown editor

A text page or article written in the Markdown editor keeps its page type. It has the attribute
`format="markdown"` and an element `source` with the Markdown as the author wrote it, as CDATA.
The XHTML stays where it always was: the server makes it when saving, so readers, search, the
digest and the versions list work as before. A page without `format="markdown"` or without
`source` opens in WYMeditor.

A text page keeps one Markdown version per XHTML version, with the same time stamp. As with the
XHTML, older versions are stored as a difference to the next one:

```xml
<hypha type="textpage" multiLingual="on" versions="on" format="markdown">
  <language xml:id="nl">
    <version xml:id="t1793000500" author="…user id…">…XHTML…</version>
  </language>
  <source format="markdown" profile="hypha-1.0">
    <language id="nl">
      <version at="t1793000500" author="…user id…"><![CDATA[## Over de redactie …]]></version>
    </language>
  </source>
</hypha>
```

An article keeps only its latest state:

```xml
<hypha type="peer_reviewed_article">
  <article format="markdown" status="draft" author="…">
    <content><text>…XHTML…</text><sources>…XHTML…</sources></content>
    <context><title>…</title><section>…</section><excerpt>…XHTML…</excerpt><method>…XHTML…</method></context>
    <source format="markdown" profile="hypha-1.0" unknownTags="…">
      <text><![CDATA[…]]></text><excerpt>…</excerpt><method>…</method><sources>…</sources><frontmatter>…</frontmatter>
    </source>
    <retraction at="t…" by="…user id…">reason for readers</retraction>
  </article>
  <featured_image alt="…" caption="…" credit="…">file name</featured_image>
  <lapsed_approves>…</lapsed_approves>
  …
</hypha>
```

| Element / attribute | Meaning |
|---|---|
| `article/@status` | `draft`, `review`, `approved`, `published`, and for Markdown articles also `retracted` |
| `source/@profile` | Version of the Markdown dialect, `hypha-1.0` |
| `source/@unknownTags` | Tags from imported Frontmatter that the site does not have; kept so nothing is lost |
| `source/frontmatter` | Frontmatter keys that are not fields of the article, kept as written |
| `retraction` | Reason shown to readers of a withdrawn article; `at` and `by` |
| `lapsed_approves` | Approvals that lapsed because the author took the article back from review |
| `article/@md_revision`, `@md_saved_by` | Number of the last save from the editor and the id of who made it, for the version check |
| `featured_image` | Under the root, not in `context`: the existing code reads it there |
| `pageList/page/@retracted` | `on` for a withdrawn article: left out of page lists, and `noindex` for search engines |

Diagrams and formulas are drawn in the browser and sent along as SVG and MathML; the server only
puts them into the XHTML when the hash of their source matches. Everything goes through the
HTML filter of `system/core/markdown/HyphaFilter.php` before it is stored.

## Writing and locking

Code changes data only through the `Xml` class: `lockAndReload()` takes an exclusive `flock`,
`saveAndUnlock()` writes a temporary file and renames it over the original. Readers do not lock.
Every change to `hypha.xml` rewrites the whole file. See
[`../../ai/ARCHITECTURE.md`](../../ai/ARCHITECTURE.md#storage).

### ACID

Hypha has no database and no transactions; the unit of atomic change is one file
(`HyphaFile::write()` in `system/core/database.php`).

| Property | Within one file | Across files |
|---|---|---|
| Atomicity | Yes: the new content goes to `<file>.tmp_for_writing` and `rename()` replaces the file in one step; a failed write leaves the old file | No: each file is written on its own |
| Consistency | Partly: always well-formed as written, but no schema check; one XML-illegal character makes the file unreadable (#539) | No: references between `hypha.xml` (page list, tags, users) and page files are not checked |
| Isolation | Writers are serialised by an exclusive `flock` (re-checked after `rename()`); readers take no lock and see the old or the new file | Partly: the Markdown editor checks a version (below); WYMeditor and the other screens are last-writer-wins |
| Durability | Mostly: no `fsync()` of the file or the directory, so the last write may be lost on power failure or a kernel crash | No |

Consequences for the Markdown editor:

1. The Markdown source and the XHTML of an article (and of a text page version) are in one file and
   written in one `saveAndUnlock()`, so they cannot diverge.
2. Saving an article is two separate atomic writes: the page file, then the tags in `hypha.xml`
   (`mdSaveTags()`). The tags are only set by the save whose text is stored (`article/@md_revision`
   is compared after taking the lock on `hypha.xml`), so text and tags always come from the same
   save. Withdrawing writes the page file, then `@retracted` in the page list. A failure between the
   two leaves the first one done; saving again repairs it. The locks are taken one after the other,
   never nested, so these paths cannot deadlock with each other.
3. Optimistic version check: the editor sends the version it loaded (`md_base`: `article/@md_revision`,
   or the `at` of the newest source version of a text page). When another save came in between, the
   server answers with a conflict (who and when) instead of saving; the author can save anyway
   (`md_force`). Status changes (retract, withdraw, edit again, rename, language) check the status
   again after taking the lock.
4. The page list node is looked up by page id after `lockAndReload()` of `hypha.xml`, so a concurrent
   rename or language change does not break a save; an editor that gets a 404 asks the current
   address with the global command `mdLocate` (page id).
5. Drafts in localStorage are kept per page id and per tab; a draft on an older version is offered
   with a warning.
6. A consistent copy of a whole site needs `data/` copied while nobody writes (see
   [`OPERATIONS.md`](OPERATIONS.md)).

## Personal data

`hypha.xml` and the page files hold names, e-mail addresses and password hashes of users, and
names and e-mail addresses of commenters, subscribers and festival participants. Treat a copy of
`data/` as personal data: do not put it in a repository or a ticket, and anonymise it before using
it as a public test set.
