# Administration

Everything under `/settings` requires a login. Most parts require a privileged user.

## For every user

| Part | Address | What |
|---|---|---|
| Overview | `/settings` | Own account, list of users, buttons for the parts below |
| Own account | `/settings/user/<id>` | Full name, e-mail address, interface language, password |
| Invite | `/settings/invite` | Invite somebody by e-mail with a personal welcome text; the invitation link leads to registration |
| Leave | `/settings/quit` | Deactivate the own account with a message to all users; only a privileged user can make it active again |

An invitation creates an *invitee* with a key. The link `/settings/register/<key>` lets the
invitee choose a user name and password. A user can resend the invitation.

## For privileged users

| Part | Address | What |
|---|---|---|
| Users | `/settings` | Make a user privileged or standard, remove (becomes no user), make active again |
| Hypha settings | `/settings/hypha` | Default content language, default interface language, default page (the home page), default type for new pages, system e-mail address (sender and reply-to of system mail), digest interval (days, hours, minutes) |
| Site elements | `/settings/elements` | Title, header and footer |
| Menu | `/settings/menu` | Links in the menu |
| Theme | `/settings/theme` | Choose a theme, preview it, copy a theme to make an own one |
| Markup | `/settings/markup` | The HTML template of the theme |
| Styles | `/settings/styles` | The style sheet of the theme |
| System tools | `hypha.php?maintenance` | Separate maintenance script with its own login, the system user (see below) |
| Text editor | `/settings/editor` | Sections (rubrieken), the editorial statute, embedded content and interactive blocks (level 2) on or off per role, and the allowed hosts, one per line; an empty field gives the default list. Stored as the element `mdeditor` in `data/hypha.xml`, see [`../technical/DATA_MODEL.md`](../technical/DATA_MODEL.md#hypha-xml) |

## System tools (`hypha.php`)

`hypha.php` is the installer and maintenance script. With the user name and password of the system
user, written at the top of the file, it can list Hypha's files, fetch newer versions from
hypha.net, add or remove page types, and build a new installer.

**Advice:** the security review of 2026-10 found that this script is a risk when it stays on a
public site. Until it is hardened, remove `hypha.php` from the web root after installation, or
make sure the system user's password is set and strong. See
[`../technical/OPERATIONS.md`](../technical/OPERATIONS.md#hardening).
