# Page types

The type of a page is chosen when it is created and decides what the page can do. The default
type for new pages is a site setting. The address of a page is `/<language>/<page name>`; a view
or action is added behind it, for example `/nl/home/edit`.

## Text page (`textpage`)

A wiki page.

| Address | What |
|---|---|
| `…/name` | Read the page; members see buttons for edit, translate, versions and delete |
| `…/name/edit` | Edit with the text editor; choose page name and private/public |
| `…/name/translate` | Make a version in another language |
| versions | Choose two versions to see the differences; revert to an older version |

Every save is kept as a version with author and time. Deleting removes the page for everyone.

A new text page can be written in the **Markdown editor** instead of WYMeditor: the dialog for a
new page asks for *Opmaak* (visual) or *Markdown*, and remembers the choice if asked. Both are views
of the same Markdown text; switching does not change it. Versions, compare and revert work as
before; a translation is made in the same editor. See the handbook,
[`../handleiding/gebruik/03-tekstpagina.md`](../handleiding/gebruik/03-tekstpagina.md).

## Peer-reviewed article (`peer_reviewed_article`)

Made for De Stadsbron: an article is published only after review by fellow members.

**Fields:** title, author, excerpt, featured image, text, method ("how was this researched"),
sources, context, tags, publication date.

**Life cycle:**

```
newly created ──save──> draft ──"to review"──> review ──3 approvals, no blocking remarks──> approved ──publish──> published
                                                                                                             └──retract──> retracted
```

- In *draft* and later, Hypha shows **checks**: required (has text, method, sources, excerpt) and
  recommended (featured image, tags). A required check that fails blocks the next step.
- In *review*, members open **review discussions** on the article. A remark can be marked
  *blocking*; it must be resolved before publication. Three members must **approve**
  (`APPROVES_NEEDED = 3`).
- After publication, visitors can join **public discussions**: they give a name and e-mail
  address and confirm the comment through a link in an e-mail. They can subscribe to replies and
  unsubscribe through a link.
- Members **moderate** comments: hide (still visible to members, folded) or delete, and undo
  that; a reason can be given.

| Address | What |
|---|---|
| `…/name` | Read; members see status, checks, approvals and actions |
| `…/name/edit` | Edit the fields |
| `…/name/discussions` | Start or reply to a review or public discussion, close a discussion |
| `…/name/comments` | Moderation view |
| `…/name/comment/<id>/confirm?code=…` | Confirmation link from the commenter's e-mail |
| `…/name/unsubscribe` | Stop e-mails about a discussion |

**Markdown articles.** A new article is written in the Markdown editor (WYMeditor stays for
articles made before). The fields are the same, with a *section* (rubriek) from a list of the site.
The life cycle has these additions:

- **Approve with the statute:** a member who approves ticks every point of the editorial statute
  of the site. The author cannot approve the own article.
- **Take back from review:** the author can move an article in *review* or *approved* back to
  *draft*; the approvals lapse and are kept as lapsed.
- **Withdraw:** the author or an administrator can withdraw a published article with a reason for
  readers. The text is no longer shown: the address shows the title with a notice and the reason,
  the article is left out of page lists and gets `noindex`. The author can edit it again as a
  draft.
- **Language and page name:** the author can change the language; the author or an administrator
  can rename the page.
- The checks gain *has title*, *has section* and *only known tags*.

See the handbook, [`../handleiding/gebruik/04-artikel-schrijven.md`](../handleiding/gebruik/04-artikel-schrijven.md)
and [`../handleiding/gebruik/05-beoordelen-en-publiceren.md`](../handleiding/gebruik/05-beoordelen-en-publiceren.md).

## Mailing list (`mailinglist`)

A newsletter with double opt-in.

- **Visitors** subscribe with their e-mail address and confirm through a link; every mailing has an
  unsubscribe link.
- **Members** edit the description and the welcome text, see the addresses, add addresses in bulk,
  send a reminder to unconfirmed addresses, remove addresses.
- **Mailings** are written in the editor, can be sent as a test to one address first, and are then
  sent to all confirmed addresses; progress is shown while sending. A list can be private.

| Address | What |
|---|---|
| `…/name` | Description and subscribe form |
| `…/name/edit` | Settings of the list (sender name and address, welcome text) |
| `…/name/addresses`, `…/name/add` | Addresses and bulk add |
| `…/name/mails_new`, `…/name/mails_edit/<id>`, `…/name/mails/<id>` | Write, edit and read a mailing |
| `…/name/confirm?code=…`, `…/name/unsubscribe?address=…&code=…` | Links from e-mails |

## Festival (`festivalpage`)

For events such as Koppelting: performers sign up, visitors contribute money, the programme is
published.

| Address | What |
|---|---|
| `…/name`, `…/name/lineup` | The line-up |
| `…/name/timetable` | The timetable |
| `…/name/signup` | Sign-up form for performers (name, e-mail, phone, title, description, website, image) |
| `…/name/confirmation-needed`, `…/name/confirm` | E-mail confirmation of a sign-up |
| `…/name/contribute`, `…/name/pay` | Contribution form and payment through Mollie |
| `…/name/participants`, `…/name/contributions` | Lists for members |
| `…/name/settings` | Festival settings (members), including the Mollie key used for payments |
| `…/name/paymenthook` | Called by Mollie, not by people |

## System pages

| Address | What |
|---|---|
| `/index/<language>` | All pages; also `/index/images` and `/index/files` |
| `/tag/...` | Pages with a tag |
| `/settings/...` | See [ADMINISTRATION.md](ADMINISTRATION.md) |
| `/help/...` | Help texts |
