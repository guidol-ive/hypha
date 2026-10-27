# Data model

Everything a site holds is under `data/`. Copying this folder copies the site.

| Path | Content |
|---|---|
| `data/hypha.xml` | Site settings, members, page list, tags, menu, header, footer, digest queue |
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

## Writing and locking

Code changes data only through the `Xml` class: `lockAndReload()` takes an exclusive `flock`,
`saveAndUnlock()` writes a temporary file and renames it over the original. Readers do not lock.
Every change to `hypha.xml` rewrites the whole file. See
[`../../ai/ARCHITECTURE.md`](../../ai/ARCHITECTURE.md#storage).

## Personal data

`hypha.xml` and the page files hold names, e-mail addresses and password hashes of members, and
names and e-mail addresses of commenters, subscribers and festival participants. Treat a copy of
`data/` as personal data: do not put it in a repository or a ticket, and anonymise it before using
it as a public test set.
