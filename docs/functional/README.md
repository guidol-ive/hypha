# Hypha, functional overview

Hypha is a website that a group maintains together. Every member can write and change every page
with a familiar text editor, without markup codes. There are few options on purpose: a button
that 10% of the group uses and that scares off the other 90% is considered a bug.

## Who is who

| Role | Can | Becomes one by |
|---|---|---|
| Visitor | Read public pages; comment on published articles (after confirming the e-mail address); subscribe to a mailing list; sign up for a festival | Visiting the site |
| Member (`user`) | Everything a visitor can, plus: read private pages, create, edit, translate and delete pages, review and approve articles, moderate comments, write and send mailings, invite new members | Accepting an invitation |
| Administrator (`admin`) | Everything a member can, plus: make members administrator or remove them, change site settings, theme, styles, menu and site elements, open the system tools | Being made administrator by another administrator; the first one is created at installation |
| Invitee (`invitee`) | Nothing yet; the invitation link lets them choose a user name and password | An invitation by a member |
| Former member (`exmember`) | Nothing; cannot log in. Name stays on earlier work | Leaving ("deactivate account") or removal by an administrator; an administrator can reactivate |

There is no self-registration. A member who forgot the password uses "recover account" in the
login window and receives a link by e-mail.

## Pages

- A page has a name per language, which is also its address: `/nl/home`, `/en/home`. A link to
  another page is stored by the page's id, so renaming does not break links.
- New pages are made with the "new page" button; the type is chosen once (see
  [PAGE_TYPES.md](PAGE_TYPES.md)). The address of a page that does not exist gives "not found";
  a logged-in member gets a button there to create it.
- A page is **public** or **private**. Private pages are visible to members only.
- **Versions.** Every save of a text page keeps the previous version. Members can show the
  differences between two versions and go back to an older one.
- **Languages.** Content can exist in several languages; a member can translate a page. The
  interface itself is available in English and Dutch; each member chooses one.

## Tags and index

Pages can carry tags. `/index/<language>` lists all pages, `/tag/...` the pages with a tag, and the
index also lists uploaded images and files. Pages can show a list of other pages with a
`pagelist` macro (for example the latest articles with a tag).

## Menu, header and footer

The administrator sets the site title, header, footer and menu (links to pages) under settings.
The look is a theme: an HTML template and a style sheet.

## Being kept informed

Members receive a **digest** by e-mail: a summary of what changed since the last one. The interval
is a site setting (six hours after a fresh installation; De Stadsbron uses a week). Members can also subscribe to discussions of an article.

## Privacy

Hypha does not log browsing behaviour. Contact details of members are shown to members only.
E-mail addresses written in public pages are shown as they are (the obfuscation in `index.php`
is switched off). Commenters and subscribers leave a name and an e-mail address, which members
can see.
