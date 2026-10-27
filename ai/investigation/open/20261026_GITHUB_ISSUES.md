---
title: "GITHUB ISSUES: all open and closed issues of PlanBCode/hypha, in bundles, with problems and continuity risks"
revision: 1
date_created: 2026-10-26
date_last_review:
state: open
---

# Hypha: analysis of GitHub issues and pull requests

> Written by a sub-agent from the issue data and a static reading of the code. The points it
> could not check without running PHP 8.2 (dynamic properties, null arguments) were checked later
> the same day in the container: see [`../../measurement/20261026_PHP_DEPRECATIONS.md`](../../measurement/20261026_PHP_DEPRECATIONS.md)
> and [`../../measurement/20261026_PHP_8_2_CONTAINER_TEST.md`](../../measurement/20261026_PHP_8_2_CONTAINER_TEST.md).
> Its suggestion to run CI on 8.2 and 8.3 is superseded by D-GLE-2026W44-hypha-001 (8.2 and 8.5).

*Repository: PlanBCode/hypha. Data snapshot: 259 issues (open and closed, with comments) and 145 pull requests, retrieved October 2026. Code cross-checks against the upstream `dev` branch (php-dom-wrapper removed, PHP 8.2+ target) unless stated otherwise. No personal names or handles are used; people are referred to by role. Statements marked "inference" are interpretations rather than directly observed facts.*

## Executive summary

- Hypha is a small, mature-but-stalled CMS. Issue and PR activity peaked in 2018-2020, collapsed in 2021 and was essentially zero from 2022 to 2025. 2026 activity consists of eight new issues from a single reporter (a hosting/operations role at De Stadsbron) and the DOM-library replacement on `dev` by the maintainer.
- 150 of 259 issues (58%) are open; the median open issue is 7.8 years old. Most open issues are enhancement wishes from 2018-2020, not outstanding defects.
- The best-served functionality is the peer-reviewed article workflow used by De Stadsbron (30 of 42 issues closed). The least-served areas are tests/code quality, i18n, media uploads, navigation/SEO and the editor.
- The main continuity risks are: effectively a single active developer, no automated tests or CI, an end-of-life front-end stack (jQuery 1.7.1 + WYMeditor 1.1.1), a single global XML file as database, recurring breakage on PHP upgrades, and a licence that is stated only in source headers.

## 1. Statistics

### 1.1 Issues: state and labels

| Metric | Value |
|---|---:|
| Total issues | 259 |
| Open | 150 (58%) |
| Closed | 109 (42%) |
| Median time to close (closed issues) | 74 days |
| Issues without any label | 101 (39%); 53 of them open |

Labelling was practised in 2018-2019 and then largely abandoned: unlabelled share is 26% for 2018, 24% for 2019, 71% for 2020, 83% for 2021 and 100% for 2026.

| Label | Total | Open |
|---|---:|---:|
| Value: Users | 94 | 55 |
| Level: Easy | 73 | 36 |
| Type: Enhancement | 58 | 44 |
| Usecase: De Stadsbron | 56 | 21 |
| Type: Bug | 33 | 12 |
| Value: Visitors | 29 | 15 |
| Level: Moderate | 29 | 23 |
| Value: Coders | 21 | 17 |
| Pagetype: Peer reviewed article | 17 | 6 |
| Component: Wymeditor | 15 | 12 |
| Component: User interface | 13 | 5 |
| Status: Needs discussion | 13 | 5 |
| Pagetype: Mailinglist | 11 | 7 |
| Level: Difficult | 11 | 9 |
| Usecase: MeetjeStad | 9 | 7 |
| Help wanted | 8 | 6 |
| Usecase: Koppelting | 3 | 2 |
| Pagetype: Text | 3 | 1 |
| Pagetype: Festival | 2 | 2 |
| Privacy GDPR AVG | 2 | 2 |
| Status: Needs review | 1 | 0 |
| Value: Security | 1 | 1 |

Observations: 36 open issues are labelled "Level: Easy", i.e. there is a sizeable backlog of low-hanging fruit. Bugs are a minority (33 labelled, 12 open); the backlog is dominated by enhancements. Only one issue carries the security label.

### 1.2 Activity per year

| Year | Issues created | Issues closed | Of created, still open | Distinct issue authors | Issue comments | PRs created | PRs merged | Commits on `dev` | Distinct commit author identities* |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2017 | 0 | 0 | 0 | 0 | 0 | 2 | 2 | 62 | 5 |
| 2018 | 137 | 47 | 69 | 4 | 196 | 31 | 17 | 86 | 9 |
| 2019 | 55 | 25 | 31 | 5 | 99 | 57 | 45 | 188 | 11 |
| 2020 | 41 | 33 | 27 | 6 | 110 | 46 | 40 | 234 | 4 |
| 2021 | 18 | 3 | 15 | 4 | 6 | 6 | 5 | 34 | 2 |
| 2022 | 0 | 1 | 0 | 0 | 1 | 2 | 1 | 3 | 2 |
| 2023 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 2024 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 2025 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 11 | 1 |
| 2026 | 8 | 0 | 8 | 1 | 3 | 1 | 0 | 57 | 1 |

\* Distinct commit e-mail identities; one person may use several, so this is an upper bound. The 2025 commits are on `master` features merged into `dev` (festival/Mollie v2, mailing list bulk-add); the 2026 commits are the php-dom-wrapper removal.

Trend: a clear lifecycle of build-up (2017-2018), peak (2019-2020: most PRs and commits), sharp decline (2021) and dormancy (2022-2025). The 2026 revival is reactive, triggered by the hosting move to a new PHP version, and carried by one developer. No issue has been closed since 2022.

### 1.3 Age of open issues

| Age | Open issues |
|---|---:|
| < 1 year | 8 |
| 1-3 years | 0 |
| 3-5 years | 9 |
| 5-8 years | 95 |
| > 8 years | 38 |

Median age 7.8 years; oldest 8.7 years. 133 of 150 open issues (89%) are older than five years.

### 1.4 Pull requests

| Metric | Value |
|---|---:|
| Total PRs | 145 |
| Merged | 110 (76%) |
| Closed without merge | 30 (21%) |
| Open | 5 |

Open PRs: #396 (http to https links, 2026), #395 (contribution information in README, 2022), #370 (WIP datatable for index, 2021), #344 (image captions for #119, 2020), #341 (festival translations, 2020). Four of five open PRs are older than four years, indicating that external contributions are no longer being reviewed.

### 1.5 Bus-factor indicators (counts only)

| Indicator | Value |
|---|---:|
| Distinct issue authors (all time) | 7 |
| Share of issues by the top issue author | 46% (119 of 259) |
| Share of issues by the top two issue authors | 69% |
| Distinct issue commenters (all time) | 9 |
| Distinct PR authors (all time) | 10 |
| Share of PRs by the top PR author | 34% (49 of 145) |
| Share of PRs by the top two PR authors | 59% |
| Distinct people who merged PRs | 7 |
| Share of merges by the top merger | approx. 76% |
| Distinct code contributors (GitHub contributor statistics) | 9 |
| Share of commits by the top code contributor | approx. 75% (509 of 676) |
| Distinct commit author identities on `dev` since 2022 | 2 (1 since 2025) |
| Repository stars / forks | 5 / 9 |

Interpretation: the effective bus factor is **1**. One developer authored about three quarters of all commits, performed about three quarters of all merges and is the only active committer since 2025. Requirements input came from a similarly small group (seven issue authors in total).


## 2. Thematic bundles

All 259 issues are assigned to exactly one bundle (primary theme). The "Note" column contains short verification results against `src-dev`; tags used: **[STILL]** verified or highly likely still applicable in dev, **[FIXED-DEV?]** looks fixed/obsolete in dev (verify, then close), **[PHP8.2]** relevant for PHP 8.2 compatibility. Issues without a note were not verified in code.

| Bundle | Total | Open | Closed |
|---|---:|---:|---:|
| Peer-reviewed article and comment workflow | 42 | 12 | 30 |
| Mailing list and newsletter | 19 | 10 | 9 |
| E-mail delivery and notifications | 11 | 7 | 4 |
| Rich-text editor (WYMeditor) | 19 | 13 | 6 |
| Images, media and uploads | 13 | 11 | 2 |
| Users, authentication and sessions | 14 | 7 | 7 |
| Security and privacy (GDPR) | 6 | 4 | 2 |
| Installation, upgrade, hosting and PHP compatibility | 25 | 14 | 11 |
| Data model, storage, URLs and links | 20 | 11 | 9 |
| Languages and localisation | 8 | 7 | 1 |
| Theming, user interface and usability | 30 | 13 | 17 |
| Index, navigation, tags, macros, search and SEO | 23 | 19 | 4 |
| Festival, events and new modules | 9 | 9 | 0 |
| Code quality, dependencies, testing and documentation tooling | 11 | 10 | 1 |
| Project governance, licensing and contribution | 7 | 1 | 6 |
| Instance support requests | 2 | 2 | 0 |

### 2.1 Peer-reviewed article and comment workflow (42 issues, 12 open)

**Description.** The core De Stadsbron workflow: draft, review, approvals/blocking comments, publication, co-authors, reader comments with e-mail confirmation, moderation, notifications.

| # | Title | State | Created | Note |
|---:|---|---|---|---|
| #37 | Review info in the top of the article page | open | 2018-04 |  |
| #40 | article page link does not work | closed | 2018-04 |  |
| #42 | article review comments confusing | closed | 2018-04 |  |
| #59 | Possibility to add extra author | closed | 2018-09 |  |
| #60 | Send notifications when guests add comments | closed | 2018-09 |  |
| #72 | Define date/time of publication | open | 2018-09 |  |
| #77 | Confusing names of fields in comments | closed | 2018-09 |  |
| #99 | Adding comment too difficult | closed | 2018-10 |  |
| #101 | Feature request: moderate comments | open | 2018-11 |  |
| #102 | Preserve line endings in peer review comments | closed | 2018-11 |  |
| #103 | Video plaatsen in artikel lukt niet | closed | 2018-11 |  |
| #105 | Chraracter "<" cannot be used in comments. | closed | 2018-11 |  |
| #106 | Again: comments that are placed "by accident" | closed | 2018-11 |  |
| #113 | Change order of editors on article edit page | closed | 2018-11 |  |
| #124 | Improve notification when an article changed status | closed | 2018-11 |  |
| #136 | Feature request: inline comments | open | 2018-11 |  |
| #138 | Autosuggest excerpt in peer reviewed article | open | 2018-11 |  |
| #155 | Wish to be able to override publication cycle | closed | 2018-12 |  |
| #161 | no review comment fields wanted in draft | closed | 2018-12 |  |
| #194 | comment confirmation broken | closed | 2019-01 |  |
| #198 | Comment that has not been approved by sender produces empty div. | closed | 2019-01 |  |
| #199 | Comment structure | closed | 2019-01 |  |
| #200 | Comment on comment failure: resubmit name and email | closed | 2019-01 |  |
| #201 | Notify (non-logged in) visitors of followup comments | closed | 2019-01 |  |
| #217 | Inline style in textarea hinders styling | closed | 2019-02 |  |
| #241 | Revision not available in articles? | open | 2019-04 |  |
| #246 | Button for adding comment does not work | closed | 2019-05 |  |
| #253 | text in confirmation request comments is unclear | closed | 2019-06 |  |
| #266 | Spelling errors in help text | closed | 2019-09 |  |
| #268 | Store publication date in each new page/article/instance of content type | closed | 2019-10 |  |
| #270 | Limit scope of lookups in article (to prevent potential corruption) | open | 2019-11 |  |
| #303 | Mark displayed excerpt as such | closed | 2020-05 |  |
| #304 | Automatic completeness of articles before starting review | closed | 2020-05 |  |
| #318 | Article: Only admins can resolve blocking comments | closed | 2020-05 |  |
| #333 | publication of peer reviewed article only by author | closed | 2020-08 |  |
| #334 | Add marketing section to peer reviewed article | open | 2020-08 |  |
| #347 | Make datatypes more configurable | open | 2020-10 |  |
| #355 | Render links in article comments | closed | 2020-11 |  |
| #361 | Shorten long comments and add 'Read more...' | open | 2020-12 |  |
| #362 | Move rules for comments from info button to page | open | 2020-12 |  |
| #380 | Link in comment not interpreted right. | closed | 2021-05 |  |
| #386 | Generic peer review mechanism | open | 2021-12 |  |

**What remains open.** Comment moderation (#101), scheduled publication (#72), revisions for articles (#241), configurable review count (#347), generic review mechanism (#386), inline comments (#136), comment UX (#361, #362), id-scoped lookups (#270).

**Assessment.** The most actively used and best-served bundle (30 of 42 closed). The remaining items are the "next level" of editorial tooling. #270 (lookups not scoped to section, risk of corruption) and #241 (no revisions for articles) are the most important from a data-integrity point of view. peer_reviewed_article.php is the largest file (2,134 lines), which concentrates risk.

### 2.2 Mailing list and newsletter (19 issues, 10 open)

**Description.** Mailing-list datatype: subscribing/confirmation, composing and sending newsletters, test sends, header/footer, reminders, unsubscribe logging.

| # | Title | State | Created | Note |
|---:|---|---|---|---|
| #3 | Mailinglist lacks compose view | closed | 2018-01 |  |
| #25 | Add mailing list gives error 500 | closed | 2018-03 |  |
| #29 | mailinglist buggies and things | open | 2018-03 |  |
| #62 | Feature: Automatically send reminder mail for unconfirmed mailinglist subscriptions | open | 2018-09 |  |
| #75 | mailingmodule: opmaak en inhoud aanmeldingsbericht | open | 2018-09 |  |
| #76 | Add mailing list gives error 500 | closed | 2018-09 |  |
| #116 | newsletter template | open | 2018-11 |  |
| #140 | send test newsletter to a few email addresses | closed | 2018-11 |  |
| #141 | are you sure? check when sending newsletter | closed | 2018-11 |  |
| #156 | confirm subscription newsletter | closed | 2018-12 |  |
| #170 | Improve mailinglist test email | open | 2018-12 |  |
| #179 | De-wikify links to images in mail from mailinglist | closed | 2019-01 |  |
| #180 | Changing welcome message to users of mailing list: strange behaviour | open | 2019-01 |  |
| #189 | Issue when omitting mailing list contents | closed | 2019-01 |  |
| #212 | Newsletter missing standard header and footer | open | 2019-02 |  |
| #245 | Unsubscribing is not logged | open | 2019-05 |  |
| #267 | automise/simplify newsletter | open | 2019-10 |  |
| #269 | Add "(TEST)" in newsletter title when sent in testmode | closed | 2019-10 |  |
| #332 | Count down for mailinglist | open | 2020-08 |  |

**What remains open.** Reminder for unconfirmed subscriptions (#62), header/footer (#212), newsletter template/automation (#116, #267), unsubscribe logging (#245), welcome-message edit bug (#180), send progress (#332).

**Assessment.** Used by De Stadsbron, MeetjeStad and Koppelting. Sending is synchronous in the browser request (#332), which does not scale with list size (inference from issue text and mailinglist.php:825-836). Newsletter production is reported as time-consuming (#267).

### 2.3 E-mail delivery and notifications (11 issues, 7 open)

**Description.** Technical quality of outgoing mail (headers, encoding, wrapping, plain-text part) and notification/digest content.

| # | Title | State | Created | Note |
|---:|---|---|---|---|
| #84 | Check delete message in digest | closed | 2018-10 |  |
| #139 | Include plaintext part in (generated) e-mails | open | 2018-11 | [STILL] Mail is sent as text/html only (system/core/communication.php:31). |
| #143 | Remove duplicate To: header from generated mails | closed | 2018-11 |  |
| #144 | Use CRLF line endings for mail headers | open | 2018-11 | [FIXED-DEV?] Mail headers already use CRLF (system/core/communication.php:30-34). Candidate to close. |
| #176 | Send notification e-mails (for articles and other things) more selectively | open | 2019-01 |  |
| #181 | Notification emails use current user's language, not recipient language | open | 2019-01 |  |
| #191 | Improve word-wrapping of e-mails | open | 2019-01 |  |
| #202 | Encode special characters in e-mail subjects | closed | 2019-01 |  |
| #237 | Notifications about page changes have wrong link | open | 2019-04 |  |
| #262 | Digest message of member removal is incomprehensible | open | 2019-07 |  |
| #328 | Email delivery fails if subject contains special characters | closed | 2020-05 |  |

**What remains open.** Plain-text part (#139), selective notifications (#176), recipient language (#181), wrapping (#191), wrong links in change notifications (#237), digest wording (#262). #144 appears fixed.

**Assessment.** Mail is sent via PHP `mail()` with HTML only (system/core/communication.php:22-70). No SPF/DKIM-aware transport, no queue, no plain-text alternative: deliverability risk for a news site.

### 2.4 Rich-text editor (WYMeditor) (19 issues, 13 open)

**Description.** Bugs and wishes around the bundled WYMeditor 1.1.1 rich-text editor: tables, blockquotes, headings, paste-from-Word, links, alignment, styling of its popups.

| # | Title | State | Created | Note |
|---:|---|---|---|---|
| #30 | H1 only once on each page | closed | 2018-03 |  |
| #46 | Image does not show in editor when revisiting the edit page | closed | 2018-04 |  |
| #47 | Adding a table via the editor does not work | closed | 2018-04 |  |
| #48 | The editor does not show the status | closed | 2018-04 |  |
| #64 | adding a table via the editor does not work | open | 2018-09 | WYMeditor dialog bug; tied to bundled WYMeditor 1.1.1. |
| #65 | The editor does not show the status | open | 2018-09 | Duplicate of closed #48; WYMeditor limitation. |
| #66 | copy/paste from word without superfluous code | closed | 2018-09 |  |
| #67 | styling of wymeditor popups | open | 2018-09 |  |
| #69 | Restyling the Wym editor | open | 2018-09 |  |
| #70 | unable to quit a blockquote without using the code screen | open | 2018-09 |  |
| #71 | Disable usage of <h1> in any page-type. | open | 2018-09 |  |
| #90 | Clicking the "link" button in wymeditor with no text selected does nothing | open | 2018-10 |  |
| #98 | Secure/reduced editor for comments | open | 2018-10 |  |
| #118 | impossible to add links in fields "bijsluiter" and "bronnen" | closed | 2018-11 |  |
| #230 | Enable wymeditor alignment and image float plugins | open | 2019-03 |  |
| #285 | Tag <figure> cannot be used | open | 2020-01 |  |
| #348 | Improve copy-paste handling in Wymeditor | open | 2020-10 |  |
| #378 | Add support for target="_blank" attribute in WYMeditor | open | 2021-03 |  |
| #379 | wymeditor: Automatically generate link when pasting URL | open | 2021-04 |  |

**What remains open.** Mostly UX wishes and editor bugs that cannot be fixed without patching or replacing WYMeditor (#64, #65, #70, #90, #285, #348, #378, #379).

**Assessment.** Structural problem: the editor is an unmaintained jQuery-1.x-era component (inference: WYMeditor has had no release in many years). Each open issue is a symptom; individually fixing them is poor value. A decision to replace the editor (e.g. a modern, framework-free editor) would close or obsolete most of this bundle at once, but is a large change for a one-person project.

### 2.5 Images, media and uploads (13 issues, 11 open)

**Description.** Image upload dialogue, resizing, captions/attribution, video/audio, file and SVG uploads, client-side size validation.

| # | Title | State | Created | Note |
|---:|---|---|---|---|
| #39 | article add image | closed | 2018-04 |  |
| #68 | check scaling of images after fix of rescale at upload time | open | 2018-09 |  |
| #119 | implement caption and meta-information for images | open | 2018-11 |  |
| #121 | Image rights | open | 2018-11 |  |
| #122 | Feature request: upload video/audio | open | 2018-11 |  |
| #123 | Feature request: upload file | open | 2018-11 |  |
| #126 | Enable placement of base64 images | open | 2018-11 |  |
| #184 | Images directory is not created automatically? | open | 2019-01 | [STILL, probable] data/images/ is git-ignored and only created by the installer (hypha.php:220); upload code only creates data/images/org/ (system/core/pages.php:320). |
| #204 | Image upload dialogue | open | 2019-01 |  |
| #234 | Uploading invalid image does not show error | closed | 2019-03 |  |
| #242 | Request to be able to upload .svg images | open | 2019-04 | [STILL] Upload whitelist excludes SVG (system/core/pages.php:313). Note: SVG is an XSS vector; consider keeping it excluded. |
| #309 | Insert image in wymeditor fails for Safari | open | 2020-05 | Safari-specific WYMeditor upload issue; not verified. |
| #315 | Validate upload size on client side. | open | 2020-05 |  |

**What remains open.** Almost the whole bundle is open: captions (#119, with an unmerged PR), file datatype (#123), video/audio (#122), SVG (#242), base64 images (#126), upload dialogue (#204).

**Assessment.** Feature gap rather than defect. Upload handling is duplicated (system/core/pages.php:300-330 and system/core/HyphaImage.php:73-140). #184 is a real robustness bug for git-based installs.

### 2.6 Users, authentication and sessions (14 issues, 7 open)

**Description.** Login/logout, registration/invitation, leaving a project, session expiry, user identity references.

| # | Title | State | Created | Note |
|---:|---|---|---|---|
| #28 | Remove "new page" & login page popups? | open | 2018-03 |  |
| #35 | Logout gives error 500 | closed | 2018-04 |  |
| #36 | fix 'unknown registration request' message | closed | 2018-04 |  |
| #41 | this page does not exist | open | 2018-04 |  |
| #74 | improve attention for login and message popups | open | 2018-09 |  |
| #109 | Fix auto-focus on login username | open | 2018-11 |  |
| #110 | fix 'unknown registration request' message | closed | 2018-11 |  |
| #164 | Unclear message when creating account after invitation | closed | 2018-12 |  |
| #187 | Login and logout drop the language from the URL | open | 2019-01 |  |
| #196 | cannot log out when there is no home page | open | 2019-01 |  |
| #261 | Leave project doesn't work | closed | 2019-07 |  |
| #287 | Leaving the project is not possible | closed | 2020-01 |  |
| #305 | Cancel button on reset login prompt does not work | closed | 2020-05 |  |
| #401 | User ID for author instead or additional to username | open | 2026-04 | [STILL] Article stores `author` as username/full name (system/datatypes/peer_reviewed_article.php:57,649) while approvals use user ids. |

**What remains open.** Session-expiry message (#41), login popup (#28, #74), autofocus (#109), language lost at login/logout (#187), logout without home page (#196), author stored by name (#401).

**Assessment.** Basic but functional; password hashing uses `password_hash()` with legacy md5 verification retained (system/core/crypto.php:15-22). No account lockout or 2FA (inference: none found). #401 is a data-model issue with GDPR impact.

### 2.7 Security and privacy (GDPR) (6 issues, 4 open)

**Description.** Injection hardening, server-side sanitising, HTTPS, external resources, retention of personal data, social-media integration.

| # | Title | State | Created | Note |
|---:|---|---|---|---|
| #19 | Open source logo is called from elsewhere | closed | 2018-03 |  |
| #80 | After deleting person as user | open | 2018-09 | [STILL] `hypha_retireUser()` only sets rights="exmember"; name/e-mail retained (system/core/base.php:495-508). GDPR relevance. |
| #240 | Request/discussion: automatic FaceBook/Twitter posts from pages | open | 2019-04 |  |
| #247 | Force https | open | 2019-05 | [STILL] No HTTPS redirect in .htaccess; usually solvable at web-server level. |
| #263 | Apply xpath encoding where needed | open | 2019-07 | [FIXED-DEV?] `xpath_encode()` (system/core/various.php:168, own implementation since the DOM-wrapper removal) is used in pages.php, tags.php, document.php. A final audit would allow closing. |
| #358 | Forbid script tags in wymeditor-editable fields | closed | 2020-12 |  |

**What remains open.** User deletion keeps personal data (#80), social auto-posting discussion (#240), force HTTPS (#247), xpath encoding (#263, largely addressed).

**Assessment.** Only 6 issues and a single "Value: Security" label: security has not been tracked systematically. #358 (server-side script stripping) was closed, which is positive. GDPR obligations (#80, #245, #401) remain open for a platform holding subscriber and reader data.

### 2.8 Installation, upgrade, hosting and PHP compatibility (25 issues, 14 open)

**Description.** Self-extracting installer (hypha.php), git installs, permissions, Apache/.htaccess, PHP version support, Windows, Docker, reverse proxies, error reporting, test environments.

| # | Title | State | Created | Note |
|---:|---|---|---|---|
| #4 | Hypha fails on php 5.4 | closed | 2018-01 | Historic PHP 5.4 incompatibility. |
| #11 | Missing installation instructions | closed | 2018-01 |  |
| #33 | Teach/explain putting website on server | closed | 2018-03 |  |
| #92 | Review building self-contained hypha.php | closed | 2018-10 |  |
| #93 | Limit write permissions to data subdirectory | open | 2018-10 | [STILL] README still says `chmod -R 777 .` (whole tree). |
| #94 | Installing from git shows only the English language | closed | 2018-10 |  |
| #95 | No styling after merge | closed | 2018-10 |  |
| #104 | Branch searchfunctie broken | closed | 2018-11 |  |
| #108 | Upgrade path from git | open | 2018-11 |  |
| #148 | Check and/or give insight into PHP configuration | open | 2018-11 |  |
| #249 | Port appended twice to baseUrl | closed | 2019-06 |  |
| #275 | Give proper error message when extensions are missing | open | 2019-11 | [STILL][PHP8.2] No extension check (no `extension_loaded` anywhere); a missing dom/xml extension still gives a cryptic fatal error. |
| #296 | Handle exceptions at top level? | open | 2020-03 | [STILL] No `set_exception_handler`/`set_error_handler` in core; duplicate of #402. |
| #302 | Increase minimal PHP version? | open | 2020-04 | [FIXED-DEV?][PHP8.2] README in dev now requires PHP 8.2, but runtime guards still check 5.4 (index.php:27, hypha.php:434). Update guards, then close. |
| #306 | Install new hypha fails (probably because of empty lang dropdown) | closed | 2020-05 |  |
| #312 | PHP 7.4 crash? | closed | 2020-05 |  |
| #326 | Do not recommend making data dir 777/world-writable | open | 2020-05 | [STILL] README still recommends world-writable permissions. |
| #327 | Remove php_flags from .htaccess | closed | 2020-05 |  |
| #336 | File permission problems on Windows | open | 2020-08 | [STILL] Caused by write-to-temp-then-rename while the original is open (system/core/database.php:1015-1045); Windows refuses this. Design limitation. |
| #384 | Smooth installation procedure | open | 2021-12 |  |
| #397 | Docker Compose boot files | open | 2026-04 |  |
| #398 | Suggestion change scheme calculation to enable use behind SSL reverse proxy | open | 2026-04 | [STILL][PHP8.2-era hosting] `getScheme()`/`isSecure()` ignore X-Forwarded-Proto (system/core/HyphaRequest.php:147-166). |
| #399 | PHP compatibility | open | 2026-04 | [FIXED-DEV?][PHP8.2] php-dom-wrapper removed in dev; close once dev is released to master. |
| #402 | Add general error handler instead of relying on browser handling | open | 2026-04 | [STILL][PHP8.2] Same as #296; no top-level error handler, which made diagnosing the PHP 8 failure (#399) harder. |
| #404 | Add "test mode" to project to avoid Google Search traffic begin redirected to test environments and improving page rank | open | 2026-04 | [STILL] No robots/noindex logic found in core. |

**What remains open.** PHP minimum (#302) and PHP 8 (#399) are addressed in dev; still open: upgrade path (#108), PHP config insight (#148), extension check (#275), error handling (#296/#402), permissions (#93/#326), Windows (#336), Docker docs (#397), reverse proxy (#398), test-mode/noindex (#404), installer UX (#384).

**Assessment.** This is where the recent crisis came from. History shows recurring breakage on each PHP upgrade (#4 PHP 5.4, #312 PHP 7.4, #399 PHP 7.4/8.x). There is no documented release or upgrade procedure (#108, and the question in #399 about release branches).

### 2.9 Data model, storage, URLs and links (20 issues, 11 open)

**Description.** Flat-file XML store (hypha.xml + one file per page), locking, page identity (names vs ids), renaming, wikified internal links, URL parsing, deletion.

| # | Title | State | Created | Note |
|---:|---|---|---|---|
| #15 | Delete page | closed | 2018-01 |  |
| #27 | Renaming a page does not redirect to new url | closed | 2018-03 |  |
| #38 | private/public switch is broken | closed | 2018-04 |  |
| #78 | fix titel artikel vs pagename in index vs pagename in page | open | 2018-09 |  |
| #88 | Idea: Mark pages as deleted rather than really deleting them | open | 2018-10 |  |
| #91 | Wikifying of links no longer works | closed | 2018-10 |  |
| #125 | internal page links don't work anymore when porting a hypha site to another server | closed | 2018-11 |  |
| #173 | Title ending in dot (.) produces "difficult" link | closed | 2019-01 |  |
| #186 | Internal links always show pagename | closed | 2019-01 |  |
| #190 | Improve addBaseUrl | open | 2019-01 | [STILL] `addBaseUrl()` is still a regex (system/core/various.php:44-47). |
| #193 | Index lost when adding new language | closed | 2019-01 |  |
| #203 | Handle urldecoding of path components in HyphaRequest? | open | 2019-01 |  |
| #233 | Renaming a page does not check for uniqueness | open | 2019-03 | [FIXED-DEV?] `hypha_setPage()` now returns `page-name-conflict` on duplicate names (system/core/base.php:620-625). Verify and close. |
| #265 | Running out of disk space causes dataloss | closed | 2019-07 |  |
| #274 | Rethink parsing and generation of urls | open | 2019-11 |  |
| #295 | Refactor use of `ensureStructure` to reduce locking | open | 2020-03 | [STILL] `ensureStructure()` called on each request (system/datatypes/mailinglist.php:107, system/datatypes/peer_reviewed_article.php:151); mailinglist variant takes the lock (mailinglist.php:151). |
| #321 | Make chance of deleting the home page as little as possible | open | 2020-05 |  |
| #322 | Make "default page" setting an id | open | 2020-05 | [STILL] Default page stored by name, not id (system/core/base.php:163). |
| #400 | hypha.xml containing multiple entities / tables versus ACID | open | 2026-04 | [STILL] Single hypha.xml holds users, pages index, menu, tags; whole file locked per write (system/core/database.php:895-930). |
| #403 | Data model | open | 2026-04 |  |

**What remains open.** Single-file contention/ACID (#400), data-model documentation (#403), default page by name (#322), accidental home-page deletion (#321), ensureStructure locking (#295), soft delete (#88), URL rethink (#274), addBaseUrl (#190), title vs pagename (#78), url-decoding (#203).

**Assessment.** Data-loss on full disk (#265) was fixed with atomic temp-file + rename (system/core/database.php:1015-1045), but that broke Windows (#336). The central hypha.xml is a global lock and a single point of corruption (#400). Names are used as keys in several places (#322, #401), making renames fragile.

### 2.10 Languages and localisation (8 issues, 7 open)

**Description.** Content vs interface language, language selection, translations of pages, date formatting.

| # | Title | State | Created | Note |
|---:|---|---|---|---|
| #14 | Make possible to change language of page | open | 2018-01 |  |
| #50 | Language switch when number of languages is 1? | closed | 2018-05 |  |
| #129 | Language: preselect which languages users can choose from | open | 2018-11 |  |
| #137 | Feature request: list selection mechanism for settings | open | 2018-11 |  |
| #310 | Language issues on system pages & pagelist macro | open | 2020-05 |  |
| #353 | Use PHP intl extension (ICU) for localization? | open | 2020-10 | [STILL][PHP8.2] `strftime()` still used (system/datatypes/peer_reviewed_article.php:606,610); deprecated since PHP 8.1, removal planned for PHP 9. |
| #363 | new page title seems to be initialized with default language instead | open | 2020-12 |  |
| #365 | Index link uses interface language instead of content language | open | 2020-12 |  |

**What remains open.** Almost all open: language per page (#14), language subset (#129, #137), system pages (#310), intl/ICU (#353), wrong defaults (#363, #365).

**Assessment.** Low effort per item but long neglected. #353 has become a PHP 8.x compatibility item because `strftime()` is deprecated.

### 2.11 Theming, user interface and usability (30 issues, 13 open)

**Description.** Themes, CSS, templates, popups, messages, confirmations, help texts, body classes, inline styles, settings pages.

| # | Title | State | Created | Note |
|---:|---|---|---|---|
| #13 | Idea: use lightweight CSS framework | closed | 2018-01 |  |
| #18 | Proposal: develop possibility to choose between themes | closed | 2018-03 |  |
| #24 | Add chosen icons to theme | closed | 2018-03 |  |
| #26 | Better UI for Hypha | closed | 2018-03 |  |
| #31 | Implement breadcrumb in mockup | closed | 2018-03 |  |
| #32 | Implement article in mockup | closed | 2018-03 |  |
| #44 | HTML skeleton for breadcrumb | open | 2018-04 |  |
| #45 | CSS variables do not work in older browsers | closed | 2018-04 |  |
| #49 | Design for CSS settings page | open | 2018-05 |  |
| #58 | @import lijkt niet te werken | closed | 2018-08 |  |
| #73 | System messages: sender, content (text) and styling | open | 2018-09 |  |
| #79 | During editting page: make jumping away more difficult | open | 2018-09 | [STILL] No unsaved-changes guard for the editor; `onbeforeunload` only used while sending mail (system/datatypes/mailinglist.php:836). |
| #81 | Insert body classes to accommodate styling | open | 2018-09 | [FIXED-DEV?] `hypha_setBodyClass()` already adds is_home, is_logged_in, is_admin, type_*, lang_* (system/core/base.php:647ff). Verify and close. |
| #82 | Timeout off when DEBUG = TRUE | open | 2018-10 |  |
| #83 | All actions that change/delete something must be safe | open | 2018-10 |  |
| #86 | Idea: use more than one .html template | open | 2018-10 |  |
| #107 | Explain page types | closed | 2018-11 |  |
| #111 | change "name" label to "page title" or "article title" in make new page window | closed | 2018-11 |  |
| #112 | add explanations tooltip or information button, and something comparable for mobile use | closed | 2018-11 |  |
| #146 | New page dialog includes "settings" pagetype | closed | 2018-11 |  |
| #151 | Feature: Make default page type configurable | closed | 2018-11 |  |
| #152 | Datatype icons | open | 2018-11 |  |
| #175 | Further improve theming support | open | 2019-01 |  |
| #207 | Textarea for CSS and for hypha.html show wrong font | closed | 2019-02 |  |
| #222 | Scope of theme | open | 2019-03 |  |
| #231 | Numbers are being encoded as telephone numbers | closed | 2019-03 |  |
| #236 | When using the internal editor, all line endings are changed after save. | open | 2019-03 |  |
| #238 | Inline styling is wrong | open | 2019-04 |  |
| #286 | Create possibility to use Matomo analytics | closed | 2020-01 |  |
| #323 | Allow multiple hyphaCommands blocks | closed | 2020-05 |  |

**What remains open.** Theming completion (#175, #222, #49), inline styles (#238), confirmations for destructive actions (#83), unsaved-changes guard (#79), multiple templates (#86), datatype icons (#152), system messages (#73).

**Assessment.** Largely cosmetic, with the exception of safety items #79/#83 (loss of work and accidental deletion, see also #321). #81 looks already implemented.

### 2.12 Index, navigation, tags, macros, search and SEO (23 issues, 19 open)

**Description.** Index page, tags and tag indexes, macros, menu structure, RSS, sitemap, Open Graph, search, sidebar widgets.

| # | Title | State | Created | Note |
|---:|---|---|---|---|
| #61 | Make clear what the content type is in the index | open | 2018-09 |  |
| #87 | Feature: Implement macros to be called from HTML / page contents | closed | 2018-10 |  |
| #114 | Feature request: tagging mechanism | closed | 2018-11 |  |
| #115 | Possibility to add author and date to index | open | 2018-11 |  |
| #117 | Improved indexing mechanism | open | 2018-11 |  |
| #120 | Improve menu structure | open | 2018-11 |  |
| #127 | Feature request: datatype tag-container | open | 2018-11 |  |
| #128 | Feature request: RSS feed | open | 2018-11 |  |
| #142 | Make clear what status of a page is in the index by class | open | 2018-11 | Partly done: index items carry `type_*` and `is-private`/`is-public` classes (system/datatypes/index.php:70) but no status class. |
| #174 | Create index page that support sorting and highlighting | closed | 2019-01 |  |
| #289 | Tagging: Edit tags in edit view | open | 2020-02 |  |
| #298 | Minimal tag-based index | open | 2020-04 |  |
| #367 | Further improve macros and implement more macros | open | 2020-12 |  |
| #374 | Add tags as meta keywords | open | 2021-02 | [STILL] No meta-keywords generation found in core. |
| #375 | Autogenerate sitemap.xml | open | 2021-02 | [STILL] No sitemap code found. |
| #376 | Add og:description and og:image | open | 2021-02 | [STILL] No og:* meta tags found in core. |
| #377 | Make tags hierarchical | open | 2021-02 |  |
| #381 | Feature request: write tags as classes in body | closed | 2021-05 |  |
| #389 | Add sidebar | open | 2021-12 |  |
| #390 | Search function stage 1 | open | 2021-12 |  |
| #391 | Search function stage 2 | open | 2021-12 |  |
| #392 | Read more widget for sidebar | open | 2021-12 |  |
| #393 | Activity log widget for sidebar | open | 2021-12 |  |

**What remains open.** Tagging basics and macros are implemented (#87, #114, #381 closed); open are the richer layer: hierarchical tags (#377), menu structure (#120), RSS (#128), sitemap/OG/keywords (#374-#376), search (#390, #391), sidebar widgets (#389, #392, #393).

**Assessment.** The 2021 batch (#386-#393) is a roadmap expressed as issues by one contributor and was never started. SEO items (#375, #376) are cheap and relevant for a news site.

### 2.13 Festival, events and new modules (9 issues, 9 open)

**Description.** Festival datatype (with Mollie payments), event/calendar datatypes, generic new-module ideas (lists, units of information, instance spawning, mail-in commands).

| # | Title | State | Created | Note |
|---:|---|---|---|---|
| #9 | Wish: start new instance of hypha from other application | open | 2018-01 | Out-of-scope wish (2018); candidate to close. |
| #10 | Wish: email to hypha instance and respond according to keywords in subject | open | 2018-01 | Out-of-scope wish (2018); candidate to close. |
| #55 | Koppelting: pagina bestaat niet | open | 2018-08 | Instance support ticket from 2018; candidate to close as stale. |
| #131 | Feature request: datatype event | open | 2018-11 |  |
| #133 | Refactor datatype festival | open | 2018-11 |  |
| #134 | Feature request: Calendar | open | 2018-11 |  |
| #335 | Update and refactor festival datatype | open | 2020-08 |  |
| #387 | Community maintained list | open | 2021-12 |  |
| #388 | Create Basic Unit of Information (and think of a good name for it) | open | 2021-12 |  |

**What remains open.** Everything is open; no item in this bundle has ever been closed via issues (the festival work happened through PRs, e.g. Mollie API v2 on master in 2025).

**Assessment.** Mostly speculative feature ideas. The festival datatype (system/datatypes/festival.php, 1,296 lines) handles payments through an own Mollie client (system/mollie/api.php), which carries a maintenance and security burden.

### 2.14 Code quality, dependencies, testing and documentation tooling (11 issues, 10 open)

**Description.** Coding style, naming, form generation, directory layout, automated tests and static analysis, documentation generation, client-side dependencies.

| # | Title | State | Created | Note |
|---:|---|---|---|---|
| #12 | Class table.section versus tag section | open | 2018-01 | [STILL] `table class="section"` still in system/core/pages.php:148, system/core/users.php:184. |
| #23 | Restructure directories | open | 2018-03 |  |
| #96 | Jquery version does not receive patches | open | 2018-10 | [STILL] jQuery 1.7.1 still loaded (index.php:76, system/assets/jquery-1.7.1.min.js). End-of-life since many years. |
| #130 | Code cleanup | open | 2018-11 | Partly obsolete: the DOMWrap remark no longer applies in dev (php-dom-wrapper removed); PSR/naming items remain. |
| #132 | Automatic testing | open | 2018-11 | [STILL] Only one test file (tests/HyphaRequestTest.php, 217 lines). |
| #135 | Converge to one coding style for datatypes | closed | 2018-11 |  |
| #211 | Automate documentation generation | open | 2019-02 |  |
| #264 | Further simplify form generation | open | 2019-07 |  |
| #324 | More consistent naming | open | 2020-05 |  |
| #338 | Automated code and style checks | open | 2020-08 |  |
| #359 | Refactor to use multiple <form> tags | open | 2020-12 |  |

**What remains open.** Ten of eleven open: tests (#132), static analysis (#338), naming (#324), form refactor (#264, #359), directory restructure (#23), docs automation (#211), jQuery (#96).

**Assessment.** The weakest area for continuity: there is effectively no automated test coverage and no CI, so the invasive DOM-library replacement in dev has no safety net beyond manual testing.

### 2.15 Project governance, licensing and contribution (7 issues, 1 open)

**Description.** Repository access requests, onboarding of contributors, licence choice, end-user manual.

| # | Title | State | Created | Note |
|---:|---|---|---|---|
| #34 | Please allow me to commit in the repo... | closed | 2018-03 |  |
| #51 | Please grant me access for committing to this repo. | closed | 2018-05 |  |
| #52 | mag ik ook bijdragen? | closed | 2018-05 |  |
| #54 | Toevoegen nieuw teamlid | closed | 2018-08 |  |
| #63 | Please allow me to categorize GIT issues in this repo | closed | 2018-09 |  |
| #89 | Pick license & clarify third-party licenses | open | 2018-10 | [STILL] No LICENSE file in repository root of dev. |
| #385 | Friendly manual | closed | 2021-12 |  |

**What remains open.** Only the licence (#89) is open, but it is fundamental.

**Assessment.** Access requests were handled quickly in 2018. The licence is only stated in source headers (Simple Public License 2.0) and the third-party licences are not listed (#89), which leaves doubt for reuse and for a hand-over of maintenance.

### 2.16 Instance support requests (2 issues, 2 open)

**Description.** Help requests from a specific site rather than code changes.

| # | Title | State | Created | Note |
|---:|---|---|---|---|
| #56 | MeetjeStad: kaarten | open | 2018-08 | Support/help request, not a code issue; candidate to close. |
| #57 | Meetjestad: verhalen | open | 2018-08 | Support/help request, not a code issue; candidate to close. |

**What remains open.** Both open since 2018.

**Assessment.** Not actionable as code; close and point to a support channel.

## 3. Major functional and technical problems

1. **Breakage on every PHP upgrade.** Fatal incompatibilities recur at each PHP step: PHP 5.4 (#4), PHP 7.4 white screen (#312), PHP 7.4/8.x fatal error in php-dom-wrapper (#399). The last one made the production site unrunnable after the hosting move. `dev` removes php-dom-wrapper, but this has not yet been released to `master`, and runtime version guards still say PHP 5.4 (index.php:27, hypha.php:434).
2. **Outdated, unmaintained front-end stack.** jQuery 1.7.1 (index.php:76; #96 open since 2018) and WYMeditor 1.1.1 (system/wymeditor/jquery.wymeditor.js) underlie 19 editor issues and 13 media/upload issues, 24 of which are open. Most editor bugs (#64, #65, #70, #90, #309, #348) cannot reasonably be fixed inside the current editor.
3. **Single-file XML database.** `data/hypha.xml` holds users, page index, menu, tags and settings; every write locks and rewrites the whole file (system/core/database.php:895-930, 1015-1045). Consequences seen in issues: data loss on full disk (#265, fixed via atomic rename), Windows incompatibility of that fix (#336), lock contention via `ensureStructure()` on each request (#295), and an explicit ACID concern (#400).
4. **Identity by name instead of id.** Default page (#322, base.php:163), article author (#401, peer_reviewed_article.php:57/649), page names used as URLs (#27, #78, #173, #233). Renames and deletions are therefore fragile (#321: the home page was accidentally deleted by a senior editor).
5. **E-mail is fragile.** Newsletters and notifications go through PHP `mail()` as HTML-only messages (system/core/communication.php:22-70); several deliverability problems have occurred (#143, #202, #328) and remain partly open (#139, #144 fixed, #191). Newsletter sending is synchronous in the browser (#332).
6. **No error handling layer.** Uncaught exceptions give a blank page or HTTP 500 (#296, #402); missing PHP extensions give cryptic errors (#275). This greatly lengthened diagnosis of the PHP 8 incident (inference from #399 discussion).
7. **Missing editorial safety nets.** No revisions for articles (#241), no unsaved-changes warning (#79), no confirmation for destructive actions (#83), no soft-delete (#88), no comment moderation tooling (#101).
8. **Deployment and operations gaps.** No upgrade path (#108), no Docker/container documentation in the repository (#397), no reverse-proxy awareness (#398), no protection against search engines indexing test instances (#404), world-writable permission advice in the README (#93, #326).

## 4. Continuity risks

| # | Risk | Severity | Evidence |
|---|---|---|---|
| R1 | **Bus factor of one.** One developer wrote ~75% of commits, did ~76% of merges and is the only committer since 2025. Seven issue authors in total; four of five open PRs unreviewed for 4+ years. | High | Section 1.5; open PRs #341, #344, #370, #395; #399 discussion (fix depended entirely on one person's local work in progress). |
| R2 | **No automated tests or CI.** One test file covering request parsing only. The invasive DOM rewrite on `dev` (replacing php-dom-wrapper throughout) has no regression suite. | High | tests/HyphaRequestTest.php (217 lines); #132, #338 open since 2018/2020. |
| R3 | **PHP version churn.** Each PHP upgrade has broken Hypha. Remaining PHP 8.x hazards in dev: `strftime()` deprecated since 8.1 (system/datatypes/peer_reviewed_article.php:606, 610; #353); `"${var}"` string interpolation deprecated in 8.2 (system/core/pages.php:746); stale version guards (index.php:27, hypha.php:434). Dynamic-property deprecations (8.2) could not be checked without a PHP runtime (not verified). | High | #4, #312, #399, #302, #353. |
| R4 | **End-of-life front-end dependencies.** jQuery 1.7.1 (released 2011) with known XSS-class vulnerabilities in old jQuery versions (general knowledge, not verified per CVE here); WYMeditor 1.1.1 with no upstream maintenance (inference). Both are vendored, so no automated security updates. | High | index.php:76; system/assets/jquery-1.7.1.min.js; system/wymeditor/jquery.wymeditor.js (VERSION "1.1.1"); system/core/editor.php:28-35; #96 and 12 open WYMeditor-labelled issues. |
| R5 | **Flat XML storage, global lock and scalability.** All shared state in one XML file, fully rewritten under an exclusive lock on each change; atomic rename incompatible with Windows. Fine for small sites, but a single corrupt write takes the whole site down (as happened to Koppelting, #265). No backup/export tooling found in issues. | Medium | system/core/database.php:895-930, 1015-1045; #265, #295, #336, #400, #403. |
| R6 | **Licence not formalised.** The source headers state the Simple Public License 2.0 (`index.php`, `hypha.php`, `documentation.txt`), but there is no LICENSE file and the licences of the bundled third-party code are not listed; #89 ("Pick license & clarify third-party licenses") open since 2018. This leaves room for doubt with reuse, forks and a hand-over to new maintainers. (Corrected on review: the earlier draft said there was no licence at all.) | Medium | #89; headers of `index.php:2`, `hypha.php:28-29`. |
| R7 | **Security posture not tracked.** One security-labelled issue; legacy md5 password hashes still accepted without forced rehash (system/core/crypto.php:21-22); xpath injection largely mitigated by `xpath_encode()` (system/core/various.php:168); no HTTPS enforcement (#247); own Mollie payment client (system/mollie/api.php) to maintain. No security policy or disclosure channel (inference: none found in repo). | Medium | #263, #358, #247; code locations cited. |
| R8 | **GDPR compliance gaps.** Deleted users keep name/e-mail (system/core/base.php:495-508; #80); unsubscribe handling/logging unclear (#245); author identity stored by name in page files (#401). Relevant for a news site with reader comments and newsletters. | Medium | #80, #245, #401, #240. |
| R9 | **Branch and release management.** No tagged releases or release branches; work has diverged across `master`, `dev` and instance branches (e.g. `koppelting`, `combined`, plus about 20 feature branches). The question how to release the PHP 8 fix was raised in #399 without a documented answer. | Medium | #399 comments; branch list; #108. |
| R10 | **Backlog no longer triaged.** 89% of open issues older than five years; labelling abandoned after 2019; no issue closed since 2022. Real defects are hidden among speculative wishes. | Medium | Sections 1.1-1.3. |
| R11 | **Operational knowledge concentrated and undocumented.** Installation relies on a self-extracting `hypha.php`; Docker setup only exists as an issue text (#397); data model only documented in an issue (#403). | Medium | #384, #385, #397, #403, README.md. |
| R12 | **Concentrated, large datatype modules.** peer_reviewed_article.php (2,134 lines), mailinglist.php (1,440), festival.php (1,296) carry the main use cases with no tests and mixed coding styles. | Low | #135, #264, #324, #359; file sizes in system/datatypes/. |

## 5. Open issues: obsolete candidates and PHP 8.2 relevance

Verification was done by targeted code search in `src-dev`; no PHP runtime was available, so nothing was executed. "Looks fixed" means the code now contains the behaviour the issue asks for; a functional check is still advisable before closing.


### 5.1 Open issues that look obsolete or already fixed in dev

| # | Title | Evidence |
|---:|---|---|
| #81 | Insert body classes to accommodate styling | `hypha_setBodyClass()` already adds is_home, is_logged_in, is_admin, type_*, lang_* (system/core/base.php:647ff). Verify and close. |
| #144 | Use CRLF line endings for mail headers | Mail headers already use CRLF (system/core/communication.php:30-34). Candidate to close. |
| #233 | Renaming a page does not check for uniqueness | `hypha_setPage()` now returns `page-name-conflict` on duplicate names (system/core/base.php:620-625). Verify and close. |
| #263 | Apply xpath encoding where needed | `xpath_encode()` (system/core/various.php:168, own implementation since the DOM-wrapper removal) is used in pages.php, tags.php, document.php. A final audit would allow closing. |
| #302 | Increase minimal PHP version? | README in dev now requires PHP 8.2, but runtime guards still check 5.4 (index.php:27, hypha.php:434). Update guards, then close. |
| #399 | PHP compatibility | php-dom-wrapper removed in dev; close once dev is released to master. |

Additional close candidates on non-technical grounds (stale or out of scope, inference): #9, #10, #55, #56, #57, #65 (duplicate of closed #48).

### 5.2 Open issues relevant to PHP 8.2 compatibility or modern hosting

| # | Title | Evidence |
|---:|---|---|
| #275 | Give proper error message when extensions are missing | [STILL][PHP8.2] No extension check (no `extension_loaded` anywhere); a missing dom/xml extension still gives a cryptic fatal error. |
| #302 | Increase minimal PHP version? | [FIXED-DEV?][PHP8.2] README in dev now requires PHP 8.2, but runtime guards still check 5.4 (index.php:27, hypha.php:434). Update guards, then close. |
| #353 | Use PHP intl extension (ICU) for localization? | [STILL][PHP8.2] `strftime()` still used (system/datatypes/peer_reviewed_article.php:606,610); deprecated since PHP 8.1, removal planned for PHP 9. |
| #398 | Suggestion change scheme calculation to enable use behind SSL reverse proxy | [STILL][PHP8.2-era hosting] `getScheme()`/`isSecure()` ignore X-Forwarded-Proto (system/core/HyphaRequest.php:147-166). |
| #399 | PHP compatibility | [FIXED-DEV?][PHP8.2] php-dom-wrapper removed in dev; close once dev is released to master. |
| #402 | Add general error handler instead of relying on browser handling | [STILL][PHP8.2] Same as #296; no top-level error handler, which made diagnosing the PHP 8 failure (#399) harder. |

### 5.3 PHP 8.2 findings in dev not covered by any issue

| Location | Finding | Impact |
|---|---|---|
| system/core/pages.php:746 | `"pageList/page${pageFilters}..."` uses `${var}` interpolation, deprecated in PHP 8.2. | Deprecation notice now; error in a future major version. Trivial fix: `{$var}`. |
| index.php:27, hypha.php:434 | Runtime guard checks for PHP >= 5.4 while README requires 8.2. | Misleading; on an old PHP the site fails with a fatal error instead of a clear message. |
| system/core/crypto.php:8-12 | `function_exists('password_hash')` fallback to md5 is dead code on PHP 8. | Harmless, but legacy md5 verification (lines 21-22) remains reachable for old accounts. |
| system/datatypes/peer_reviewed_article.php:606, 610 | `strftime()` (see #353). | Deprecated since PHP 8.1; emits notices on 8.2. |

Not checked (would require running PHP 8.2 with `E_ALL`): dynamic properties on classes, passing `null` to non-nullable internal function parameters (8.1), and return-type deprecation notices on classes extending DOM classes. These are the most likely remaining sources of deprecation warnings after the DOM-wrapper removal (inference).

## 6. Suggested priorities (brief)

1. Release `dev` (PHP 8.2) to `master` with a tag, and fix the small PHP 8.x items in 5.3 first.
2. Add a minimal smoke-test suite (render each datatype, save/load XML, send mail in debug mode) and run it in CI on PHP 8.2 and 8.3 (#132, #338).
3. Choose and add a licence (#89).
4. Triage the backlog: close the obsolete/stale issues in 5.1, label the 2020-2026 issues, and separate "roadmap ideas" from defects.
5. Plan the replacement of jQuery 1.7.1/WYMeditor as one project instead of fixing editor issues individually (#96 plus the editor bundle).
6. Address the GDPR items (#80, #245, #401) and add a top-level error handler (#296/#402).

## Method

- Issue and PR data from the provided JSON exports; PR author/merger counts, contributor counts, branch list and commit counts per year from the GitHub API. All counts are aggregated; no names or handles are reported.
- Each issue was assigned to exactly one bundle by reading title and body excerpt; borderline cases were assigned to their primary theme.
- Code checks were targeted `grep`/read operations on the `dev` snapshot; line numbers refer to that snapshot.
