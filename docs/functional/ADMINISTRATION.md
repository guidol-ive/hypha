# Administration

Everything under `/settings` requires a login. Most parts require the administrator role.

## For every member

| Part | Address | What |
|---|---|---|
| Overview | `/settings` | Own account, list of members, buttons for the parts below |
| Own account | `/settings/user/<id>` | Full name, e-mail address, interface language, password |
| Invite | `/settings/invite` | Invite somebody by e-mail with a personal welcome text; the invitation link leads to registration |
| Leave | `/settings/quit` | Deactivate the own account with a message to all members; only an administrator can reactivate it |

An invitation creates an *invitee* with a key. The link `/settings/register/<key>` lets the
invitee choose a user name and password. A member can resend the invitation.

## For administrators

| Part | Address | What |
|---|---|---|
| Members | `/settings` | Make a member administrator or not, remove (becomes former member), reactivate |
| Hypha settings | `/settings/hypha` | Default content language, default interface language, default page (the home page), default type for new pages, system e-mail address (sender and reply-to of system mail), digest interval (days, hours, minutes) |
| Site elements | `/settings/elements` | Title, header and footer |
| Menu | `/settings/menu` | Links in the menu |
| Theme | `/settings/theme` | Choose a theme, preview it, copy a theme to make an own one |
| Markup | `/settings/markup` | The HTML template of the theme |
| Styles | `/settings/styles` | The style sheet of the theme |
| System tools | `hypha.php?maintenance` | Separate maintenance script with its own login (see below) |
| Markdown editor | element `mdeditor` in `data/hypha.xml` | Sections (rubrieken), the editorial statute, embedded content and interactive blocks (level 2) on or off per role, and the allowed hosts. There is no settings screen yet: edit `hypha.xml` while the site is quiet. See [`../technical/DATA_MODEL.md`](../technical/DATA_MODEL.md#hypha-xml) |

## System tools (`hypha.php`)

`hypha.php` is the installer and maintenance script. With the maintenance credentials written at
the top of the file it can list Hypha's files, fetch newer versions from hypha.net, add or remove
page types, and build a new installer.

**Advice:** the security review of 2026-10 found that this script is a risk when it stays on a
public site. Until it is hardened, remove `hypha.php` from the web root after installation, or
make sure its credentials are set and strong. See
[`../technical/OPERATIONS.md`](../technical/OPERATIONS.md#hardening).
