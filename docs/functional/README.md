# Hypha, functional overview

Hypha is a website that a group maintains together. Every user can write and change every page
with a familiar text editor, without markup codes. There are few options on purpose: a button
that 10% of the group uses and that scares off the other 90% is considered a bug.

## Who is who

| Role | Can | Becomes one by |
|---|---|---|
| Visitor | Read public pages; comment on published articles (after confirming the e-mail address); subscribe to a mailing list; sign up for a festival | Visiting the site |
| Standard user (`user`) | Everything a visitor can, plus: read private pages, create, edit, translate and delete pages, review and approve articles, moderate comments, write and send mailings, invite new users | Accepting an invitation |
| Privileged user (`admin`) | Everything a standard user can, plus: make users privileged or standard or remove them, change site settings, theme, styles, menu and site elements, open the system tools | Being made privileged by another privileged user; the first one is created at installation |
| Invitee (`invitee`) | Nothing yet; the invitation link lets them choose a user name and password | An invitation by a user |
| No user (`exmember`) | Nothing; cannot log in. Name stays on earlier work | Leaving ("deactivate account") or removal by a privileged user; a privileged user can make the account active again |

The system user, with the user name and password at the top of `hypha.php`, is a separate account
for installation and the system tools; the system tools ask for it. It cannot log in to the site.

There is no self-registration. A user who forgot the password uses "recover account" in the
login window and receives a link by e-mail.

## Pages

- A page has a name per language, which is also its address: `/nl/home`, `/en/home`. A link to
  another page is stored by the page's id, so renaming does not break links.
- New pages are made with the "new page" button; the type is chosen once (see
  [PAGE_TYPES.md](PAGE_TYPES.md)). The address of a page that does not exist gives "not found";
  a logged-in user gets a button there to create it.
- A page is **public** or **private**. Private pages are visible to logged-in users only.
- **Versions.** Every save of a text page keeps the previous version. Users can show the
  differences between two versions and go back to an older one.
- **Languages.** Content can exist in several languages; a user can translate a page. The
  interface itself is available in English and Dutch; each user chooses one.

## Tags and index

Pages can carry tags. `/index/<language>` lists all pages, `/tag/...` the pages with a tag, and the
index also lists uploaded images and files. Pages can show a list of other pages with a
`pagelist` macro (for example the latest articles with a tag).

## Menu, header and footer

A privileged user sets the site title, header, footer and menu (links to pages) under settings.
The look is a theme: an HTML template and a style sheet.

## Being kept informed

Users receive a **digest** by e-mail: a summary of what changed since the last one. The interval
is a site setting (six hours after a fresh installation; De Stadsbron uses a week). Users can also subscribe to discussions of an article.

## Privacy

Hypha does not log browsing behaviour. Contact details of users are shown to logged-in users only.
E-mail addresses written in public pages are shown as they are (the obfuscation in `index.php`
is switched off). Commenters and subscribers leave a name and an e-mail address, which logged-in users
can see.
