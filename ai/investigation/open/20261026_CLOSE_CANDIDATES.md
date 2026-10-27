---
title: "CLOSE CANDIDATES: open issues of PlanBCode/hypha that can probably be closed, with evidence"
revision: 1
date_created: 2026-10-26
date_last_review:
state: open
---

> On 2026-10-26 the 12 high-confidence candidates got a comment on GitHub suggesting the
> maintainer close them (#29, #101, #142, #144, #170, #187, #233, #262, #302, #332, #361, #365).
> The medium-confidence ones (#37, #55, #56, #57, #175, #196) were not posted. For #302 the comment
> adds that the runtime version guards still say PHP 5.4.

# Hypha: open issues that can probably be closed

*Read-only analysis of PlanBCode/hypha, 2026-10-26. Code checked on upstream/master (478ebd9) and upstream/dev (5dae13a; master is an ancestor of dev). Every candidate issue was re-fetched with `gh issue view` today: all still OPEN with no new comments. Issues #405-#412 were excluded by request. Nothing was posted to GitHub.*

**Counts:** DUPLICATE high: 1, FIXED_DEV high: 1, FIXED_MASTER high: 10, FIXED_MASTER medium: 2, OBSOLETE medium: 2, SUPPORT_OR_QUESTION medium: 2. Total 18 (12 high, 6 medium).

## 1. Summary

| Issue | Title | Category | Confidence | Reason |
|---|---|---|---|---|
| #29 | mailinglist buggies and things | DUPLICATE | high | Same four bullet points as open issue #75; thread already said it can be closed here. |
| #101 | Feature request: moderate comments | FIXED_MASTER | high | Post-moderation (hide/delete with reason) of article comments merged in PR #354. |
| #142 | Make clear what status of a page is in the index by class | FIXED_MASTER | high | Index items carry an is-private / is-public class (plus type_<datatype>). |
| #144 | Use CRLF line endings for mail headers | FIXED_MASTER | high | All mail headers are built with \r\n (since 2016, the only mail() call). |
| #170 | Improve mailinglist test email | FIXED_MASTER | high | Test mail now has the view-online and (dummy) unsubscribe links and a subject prefix. |
| #187 | Login and logout drop the language from the URL | FIXED_MASTER | high | Commit 1b9abca explicitly fixes the missing language in the login/logout path. |
| #233 | Renaming a page does not check for uniqueness | FIXED_MASTER | high | Rename conflict check fixed in 4835db8 (wrong language attribute was used). |
| #262 | Digest message of member removal is incomprehensible | FIXED_MASTER | high | Digest message now uses username and full name instead of the user id. |
| #302 | Increase minimal PHP version? | FIXED_DEV | high | dev README bumps the minimum to PHP 8.2. |
| #332 | Count down for mailinglist | FIXED_MASTER | high | Send progress indicator (sent/total) and leave-page warning merged in PR #357. |
| #361 | Shorten long comments and add 'Read more...' | FIXED_MASTER | high | Implemented in PR #366 (commit 917b165). |
| #365 | Index link uses interface language instead of content language | FIXED_MASTER | high | Index command link now uses the content language (was interface language). |
| #37 | Review info in the top of the article page | OBSOLETE | medium | The review-info element no longer exists after the 2019 article rewrite. |
| #55 | Koppelting: pagina bestaat niet | OBSOLETE | medium | Report about a 2018 festival page on a live site; the participants view now exists for logged-in users. |
| #56 | MeetjeStad: kaarten | SUPPORT_OR_QUESTION | medium | 2018 help request for one site, not a code change; no reply in thread. |
| #57 | Meetjestad: verhalen | SUPPORT_OR_QUESTION | medium | 2018 help request for one site, not a code change; no reply in thread. |
| #175 | Further improve theming support | FIXED_MASTER | medium | Two checklist items done; the other two were explicitly moved out of scope in the thread. |
| #196 | cannot log out when there is no home page | FIXED_MASTER | medium | Logout now falls back to the default page in the default language; not runtime-tested. |

## 2. Candidates

### #29 mailinglist buggies and things

- **Category:** DUPLICATE
- **Confidence:** high

**Evidence**

- Other issue: **#75** "mailingmodule: opmaak en inhoud aanmeldingsbericht" (state: OPEN). The four bullets of #29 (mail to one domain not arriving, unclear confirmation, unclear how to send to the list, unclear unsubscribe result) and the follow-up remark about the invite not arriving are repeated verbatim in the body of #75.
- Thread: a contributor wrote on 2018-07-02 "Overgebracht naar hypha-improvements. Kan hier gesloten worden." ("moved, can be closed here"); a contributor wrote on 2019-01-31 "I think most of this is fixed or at least improved", asking the reporter to double-check; no reply since.

**Draft comment**

> Suggestion for the maintainer: this issue can probably be closed. Its content is repeated word for word in #75 (still open), and earlier in this thread it was already noted that it can be closed here. Evidence: compare the body of #75 with this issue; comment of 2018-07-02 in this thread. If I missed something, please leave it open.

### #101 Feature request: moderate comments

- **Category:** FIXED_MASTER
- **Confidence:** high

**Evidence**

- Ask: "moderate comments"; plan in thread (2020-10-20): post-moderation that hides comments (expandable) and records a reason (off-topic, spam, violates policy, duplicate, other).
- Commits: `afca188` (2020-10-26) "peer_reviewed_article: Allow comments to be hidden", `b24b38e` (2020-10-29) "peer_reviewed_article: Allow comments to be deleted too", merged via PR #354 (`b1715ae`, 2020-11-17). `git branch -r --contains` lists upstream/master and upstream/dev.
- Code, upstream/master `system/datatypes/peer_reviewed_article.php:105-112`:
  `const MODERATE_REASONS = [ 'inappropriate', 'violation', 'offtopic', 'duplicate', 'spam', 'other', ];`
- Rendering, same file `:1536-1546`: hidden comments are wrapped in `<details>` with a "comment is hidden" summary plus the reason; deleted ones get a placeholder. Moderation view/actions at `:166-169` (`commentModerateView`, `CMD_COMMENT_MODERATE_HIDE`, `..._DELETE`, `CMD_COMMENT_UNMODERATE`). Same code on upstream/dev (`MODERATE_REASONS` at line 103).

**Draft comment**

> Suggestion for the maintainer: this issue can probably be closed. Comment moderation as planned in this thread (hide with a reason, expandable for readers; delete; unmoderate) is implemented for article comments. Evidence: commits afca188 "peer_reviewed_article: Allow comments to be hidden" and b24b38e "peer_reviewed_article: Allow comments to be deleted too" (PR #354), on master; see system/datatypes/peer_reviewed_article.php:105-112 (MODERATE_REASONS) and :1536-1546 on master. If I missed something, please leave it open.

### #142 Make clear what status of a page is in the index by class

- **Category:** FIXED_MASTER
- **Confidence:** high

**Evidence**

- Ask: "Please add the status as a class in the index items" (instead of the asterisk).
- Commit: `63a6503` (2019-03-02) "Adds CSS class to index item indicating public or private state", merged via PR #282 (`3a1dadb`, 2020-01-06). On upstream/master and upstream/dev.
- Code, upstream/master `system/datatypes/index.php:70` (identical on upstream/dev:70):
  `$htmlList[] = '<div class="index-item type_'.$pageListDatatype[$pagename].' '.($privatePos ? 'is-private' : 'is-public').'">...`
- The thread noted the generic index only knows private/public and suggested combining a page-type class with "private" to show "unpublished" for articles; both classes (`type_peer_reviewed_article` + `is-private`) are now present, so a theme can do exactly that.

**Draft comment**

> Suggestion for the maintainer: this issue can probably be closed. Index items now get an is-private or is-public class, next to a type_<datatype> class, so a theme can style unpublished articles (type_peer_reviewed_article + is-private) as suggested in this thread. Evidence: commit 63a6503 "Adds CSS class to index item indicating public or private state" (PR #282), on master; system/datatypes/index.php:70 on master. If I missed something, please leave it open.

### #144 Use CRLF line endings for mail headers

- **Category:** FIXED_MASTER
- **Confidence:** high

**Evidence**

- Ask: "Use CRLF line endings for mail headers" ("I think we use newlines now").
- Commit: `4255092` (2016-03-02) "Use \r\n for e-mail headers" (already before this issue was filed); later rewritten in `378bb05` (2017-12-05) "Updated sendMail to be more flexible", still CRLF. On upstream/master and upstream/dev.
- Code, upstream/master `system/core/communication.php:30-34` (identical on upstream/dev):
  `$headers = 'MIME-Version: 1.0' . "\r\n";`
  `$headers .= 'Content-type: text/html; charset=utf-8' . "\r\n";`
  `$headers .= 'From: ' . $senderName . ' <' . $senderEmail . '>' . "\r\n";`
- `git grep -n "mail(" upstream/master -- system` shows `communication.php:66` as the only call to PHP `mail()`, so all outgoing mail uses these headers. The related To-header problem (#143) is closed.

**Draft comment**

> Suggestion for the maintainer: this issue can probably be closed. sendMail() already builds every header line with \r\n, and it is the only place that calls mail(). Evidence: system/core/communication.php:30-34 on master (introduced in commit 4255092 "Use \r\n for e-mail headers", 2016). If I missed something, please leave it open.

### #170 Improve mailinglist test email

- **Category:** FIXED_MASTER
- **Confidence:** high

**Evidence**

- Ask: include the "view online" and unsubscribe links in the test mail (with a dummy unsubscribe url) and mark it as a test, e.g. with a subject prefix.
- Commit: `d8995d3` (2019-12-26) "mailinglist: Updated to new standard", merged via PR #277 (`4507cd0`, 2019-12-29). On upstream/master and upstream/dev.
- Code, upstream/master `system/datatypes/mailinglist.php:1214-1223` (`mailingSendTestAction`):
  `$code = 'this-is-your-unsubscribe-code';`
  `$message = '<p><a href="' . $linkToMailing . '">' . __('ml-if-unreadable-use-link') . '</a></p>';` ... `__('ml-unsubscribe')` ...
  `$subject = __('ml-test-mail-subject-prefix') . ' - ';`
- This matches the real send at `:1169-1171`. `en.php:359`: `"ml-test-mail-subject-prefix" => "newsletter test, please check!"`.

**Draft comment**

> Suggestion for the maintainer: this issue can probably be closed. The test mail now contains the same view-online and unsubscribe links as the real mailing (with a dummy unsubscribe code) and its subject is prefixed with "newsletter test, please check!". Evidence: commit d8995d3 "mailinglist: Updated to new standard" (PR #277), on master; system/datatypes/mailinglist.php:1214-1223 on master. If I missed something, please leave it open.

### #187 Login and logout drop the language from the URL

- **Category:** FIXED_MASTER
- **Confidence:** high

**Evidence**

- Ask: login and logout drop the language from the url, so you do not return to the page you were on.
- Commit: `1b9abca` (2019-05-14) "Fixed redirect path when logging in or out" with message "The path set when logging in or out did not contain the language. This fixes that problem." On upstream/master and upstream/dev.
- Code, upstream/master:
  - `system/core/users.php:126` (login form posts to the current path incl. language): `$currentUrlPath = $O_O->getRequest()->getRelativeUrlPath(false);`
  - `index.php:140` (logout link): `makeAction($hyphaRequest->getRelativeUrlPath(false),'logout','')`
  - `system/core/users.php:66` (logout redirect to `<language>/<page>`): `return ['redirect', $O_O->getRequest()->getRootUrl() . $hyphaQuery];`
- Note: the last comment in the thread (2019-06-18, "is also working on this") is after this commit; I found no later related commit.

**Draft comment**

> Suggestion for the maintainer: this issue can probably be closed. Login and logout now use the current path including the language, and logout redirects to <language>/<page>. Evidence: commit 1b9abca "Fixed redirect path when logging in or out" (2019-05-14), on master; system/core/users.php:126 and :66, index.php:140 on master. If I missed something, please leave it open.

### #233 Renaming a page does not check for uniqueness

- **Category:** FIXED_MASTER
- **Confidence:** high

**Evidence**

- Ask: renaming page1 to an existing name page2 must not create two pages with the same name.
- Commit: `4835db8` (2019-11-18) "savePage: Properly detect page name conflicts" ("this used a non-existing language attribute, so it would never find any existing pages with the same name. This fixes this by using the passed language instead."). On upstream/master and upstream/dev.
- Code, upstream/master `system/core/base.php:615-618` (`hypha_setPage`):
  `$try = hypha_getPage($language, $name);`
  `if (!$try || $try===$page) $lang->setAttribute('name', $name);`
  `else return __('page-name-conflict');`
- `hypha_setPage` is the only code that renames a page (`git grep "setAttribute('name'"` on master); text pages show the error via `savePage()` in `system/datatypes/text.php:300-327`. New pages are checked in `hypha_addPage` (`base.php:579`, `'page-exists'`).

**Draft comment**

> Suggestion for the maintainer: this issue can probably be closed. The rename path now detects an existing page with the same name in that language and returns a page-name-conflict error. Evidence: commit 4835db8 "savePage: Properly detect page name conflicts" (2019-11-18), on master; system/core/base.php:615-618 on master. If I missed something, please leave it open.

### #262 Digest message of member removal is incomprehensible

- **Category:** FIXED_MASTER
- **Confidence:** high

**Evidence**

- Ask: the digest says "... heeft de volgende persoon uit de projectteamlijst verwijderd: 5be920210a68b" (an id) instead of the user's name.
- Commit: `055e844` (2020-01-20) "settings: Fix leaving the project" (adds `hypha_retireUser()`; "The messages sent and added to the digest are a bit improved and now use variable substitution"), merged via PR #288 (`88ee7c4`, 2020-02-17). On upstream/master and upstream/dev.
- Code, upstream/master `system/core/base.php:494`:
  `$msg = __('admin-removed-user', ['admin' => ..., 'username' => $user->getAttribute('username'), 'fullname' => $user->getAttribute('fullname')]);`
  `system/languages/nl.php:129`: `"admin-removed-user" => "[[admin]] heeft de gebruiker [[username]] ([[fullname]]) uit de projectteamlijst verwijderd"`.
- Admin removal calls it: `system/datatypes/settings.php:748` `hypha_retireUser($userId, /* by_admin */ true);` The old id-based string no longer exists in the code.

**Draft comment**

> Suggestion for the maintainer: this issue can probably be closed. When an admin removes a member, the digest now says "<admin> heeft de gebruiker <username> (<full name>) uit de projectteamlijst verwijderd" instead of showing the user id. Evidence: commit 055e844 "settings: Fix leaving the project" (PR #288), on master; system/core/base.php:494 and system/languages/nl.php:129 on master. If I missed something, please leave it open.

### #302 Increase minimal PHP version?

- **Category:** FIXED_DEV
- **Confidence:** high

**Evidence**

- Ask: raise the documented minimum PHP version (then 5.6) to allow newer language features.
- Commit: `5dae13a` (2026-10-26) "README: Bump minimum required version to 8.2" ("raises the minimum version to the 8.2 shipped by Debian oldstable ... opening up the way to maybe use some newer PHP features"). Only on upstream/dev (`git branch -r --contains` lists upstream/dev only; upstream/master README.md:23 still says 5.6).
- Code, upstream/dev `README.md:23-25`: "Hypha needs Apache running, with php version 8.2 or above (older versions might also work, but any changes to the code should not require a higher PHP version)."
- The php-dom-wrapper update mentioned in the thread is moot: php-dom-wrapper was removed on dev in `37fc888` (2026-10-25).

**Draft comment**

> Suggestion for the maintainer: this issue can probably be closed. The documented minimum PHP version has been raised to 8.2. Evidence: commit 5dae13a "README: Bump minimum required version to 8.2" on dev; README.md:23-25 on dev. It can be closed once dev is merged into master. If I missed something, please leave it open.

### #332 Count down for mailinglist

- **Category:** FIXED_MASTER
- **Confidence:** high

**Evidence**

- Ask: a counter while a mailing is being sent, so the user knows when it is safe to leave the page.
- Commits: `2314370` (2020-12-04) "mailinglist: Display progress for send", `c71e973` (2021-01-21) "Add css changes for mailing progress ui", merged via PR #357 (`5f92bc7`, 2021-01-27; PR body references #332). On upstream/master and upstream/dev.
- Code, upstream/master `system/datatypes/mailinglist.php`:
  - `:810` `spanProgressIndicator.innerHTML = "0/'.$num.'";` and `:834` updates it to `progress + "/" + total`;
  - `:839` polls `CMD_PROGRESS` every `PROGRESS_UPDATE_INTERVAL_MS` (1000 ms);
  - `:840` `window.onbeforeunload = function(){return '...ml-sure-to-close...';};` (warns before leaving), cleared on completion (`:829`);
  - server side `mailingProgressAction` at `:1233`, progress stored per mail at `:1176`.
- (A stale `@todo ... implement progress bar` docblock remains at `:1109`.)

**Draft comment**

> Suggestion for the maintainer: this issue can probably be closed. Sending a mailing now shows a live "sent/total" counter and warns before leaving the page until sending is complete. Evidence: commit 2314370 "mailinglist: Display progress for send" (PR #357), on master; system/datatypes/mailinglist.php:810-840 and :1233 on master. If I missed something, please leave it open.

### #361 Shorten long comments and add 'Read more...'

- **Category:** FIXED_MASTER
- **Confidence:** high

**Evidence**

- Ask: for long comments, cut the text and add a "read more" link that shows the whole text.
- Commit: `917b165` (2020-12-30) "Shorten long comments and add Read more... (#366)"; PR #366 body links this issue. On upstream/master and upstream/dev.
- Code, upstream/master `system/datatypes/peer_reviewed_article.php:133-134`:
  `const MAX_COMMENT_LENGTH = 100 * 6; // Roughly hundred words`
  `const MIN_COMMENT_STUB_LENGTH = self::MAX_COMMENT_LENGTH * 0.7;`
  and `:1459-1464`: `if (strlen($commentText) > self::MAX_COMMENT_LENGTH) { ... <a class="comment-read-more" onclick="...`
- Same on upstream/dev (`:131-132`, `:1441-1446`).

**Draft comment**

> Suggestion for the maintainer: this issue can probably be closed. Comments longer than about 100 words are cut to a stub with a "Read more..." link that expands the full text. Evidence: commit 917b165 "Shorten long comments and add Read more... (#366)", on master; system/datatypes/peer_reviewed_article.php:133-134 and :1459-1464 on master. If I missed something, please leave it open.

### #365 Index link uses interface language instead of content language

- **Category:** FIXED_MASTER
- **Confidence:** high

**Evidence**

- Ask: the index link uses the interface language; it should use the language of the page you came from.
- Commit: `c2420c5` (2025-06-10) "Use icons for command links". Its diff replaces `'<a class="index" href="index/'.$hyphaLanguage.'">'` (`$hyphaLanguage` = interface language, `index.php:101`) by the content language. On upstream/master and upstream/dev.
- Code, upstream/master `index.php:131` (same line on upstream/dev):
  `$_cmds[] = makeLink(__('index-icon'), makeAction('index/'.$hyphaContentLanguage, '', ''), 'index', __('index'));`
  with `index.php:111` `$hyphaContentLanguage = $O_O->getContentLanguage();` (the language from the page url, `RequestContext.php:112-113`).

**Draft comment**

> Suggestion for the maintainer: this issue can probably be closed. The index link is now built from the content language of the current page instead of the interface language. Evidence: commit c2420c5 "Use icons for command links" (2025), on master; index.php:131 on master. If I missed something, please leave it open.

### #37 Review info in the top of the article page

- **Category:** OBSOLETE
- **Confidence:** medium

**Evidence**

- Ask: change the markup of `<div class="review-info">` to wrap status/approves/blocks in spans.
- The span markup was implemented in `1fbcb5e` ("Added peer reviewed article"), and the whole review-info element was later removed in `28a2c58` (2019-06-20) "peer_reviewed_article: Updated to new standard" (on upstream/master and upstream/dev).
- `git grep -n review-info upstream/master` and `upstream/dev` return nothing. Review state is now shown via the review checklist (`peer_reviewed_article.php` `runChecks`, `:559-584` on master).
- Medium because the maintainer may want an equivalent status line back.

**Draft comment**

> Suggestion for the maintainer: this issue can probably be closed. The review-info element it refers to no longer exists; it was removed in the article rewrite (commit 28a2c58 "peer_reviewed_article: Updated to new standard", 2019), and review state is now shown through the review checklist. Evidence: git grep review-info on master and dev finds nothing. If I missed something, please leave it open.

### #55 Koppelting: pagina bestaat niet

- **Category:** OBSOLETE
- **Confidence:** medium

**Evidence**

- Ask: koppelting.org/en/festival2018/participants does not exist although linked from the festival page.
- Current festival datatype (upstream/master `system/datatypes/festival.php:32`, `:115`, `:135`, `:200-201`) has a `participants` view, shown as a button only to logged-in users, and `participantsView()` returns a login error for visitors.
- This was a site-specific report about the 2018 festival; the page and event are long gone.
- Medium: I could not verify what caused the 2018 report.

**Draft comment**

> Suggestion for the maintainer: this issue can probably be closed. It is a site-specific report about the 2018 festival page; the festival datatype now has a participants view that is only linked for logged-in users. Evidence: system/datatypes/festival.php:115 and :135 on master. If I missed something, please leave it open.

### #56 MeetjeStad: kaarten

- **Category:** SUPPORT_OR_QUESTION
- **Confidence:** medium

**Evidence**

- Body: request for help/instructions to place maps in Hypha for meetjestad.nl (2018-08-21). No comments.
- Not a code change; no answer in the thread, hence medium.

**Draft comment**

> Suggestion for the maintainer: this issue can probably be closed. It is a 2018 request for help with one website rather than a change to Hypha, with no follow-up since. If I missed something, please leave it open.

### #57 Meetjestad: verhalen

- **Category:** SUPPORT_OR_QUESTION
- **Confidence:** medium

**Evidence**

- Body: request for help/instructions to migrate the stories for MeetjeStad (2018-08-21). No comments.
- Not a code change; no answer in the thread, hence medium.

**Draft comment**

> Suggestion for the maintainer: this issue can probably be closed. It is a 2018 request for help migrating content for one website rather than a change to Hypha, with no follow-up since. If I missed something, please leave it open.

### #175 Further improve theming support

- **Category:** FIXED_MASTER
- **Confidence:** medium

**Evidence**

- Checklist: [x] create themes via web interface (`d5a01d0`, 2019-06-22 "Themes can be copied through the web interface"); [x] preview a theme per session (`3b6c014`, 2019-01-21 "Adds option to preview a theme"; `system/core/RequestContext.php:234-250` `getPreviewThemeName`/`setPreviewThemeName` on master). Both merged via PR #225 (`a282e33`, 2019-06-25), on upstream/master and upstream/dev.
- The two unchecked items were descoped by the implementing contributor: 2019-01-19 "I've decided to keep the default theme where it is ... this can be done in the scope of an other issue" (see #93), and 2019-01-21 "I'm also going to leave this out of the scope for this one" (merge settings pages, covered by #49). Also `6421e16` (2019-01-19) "Remove option to edit the default theme".
- Medium because the maintainer never confirmed the reduced scope.

**Draft comment**

> Suggestion for the maintainer: this issue can probably be closed. Creating themes via the web interface and previewing a theme per session are implemented; the other two items were moved out of scope in this thread (default theme location: #93; merging settings pages: #49). Evidence: commits d5a01d0 and 3b6c014 (PR #225), on master; system/core/RequestContext.php:234-250 on master. If I missed something, please leave it open.

### #196 cannot log out when there is no home page

- **Category:** FIXED_MASTER
- **Confidence:** medium

**Evidence**

- Ask: after switching to a language without a home page, you cannot log out.
- Commit: `1b9abca` (2019-05-14) "Fixed redirect path when logging in or out" rewrote `logout()`. On upstream/master and upstream/dev.
- Code, upstream/master `system/core/users.php:56-60`: if the current page is private/missing, it looks up the default page in the current language and otherwise falls back: `if ($page) $hyphaQuery = $language.'/'.$page->getAttribute('name'); else $hyphaQuery = hypha_getDefaultLanguage().'/'.hypha_getDefaultPage();`
- Medium because I did not reproduce the original scenario on a running instance.

**Draft comment**

> Suggestion for the maintainer: this issue can probably be closed. logout() now falls back to the default page in the default language when there is no home page in the current language. Evidence: commit 1b9abca "Fixed redirect path when logging in or out", on master; system/core/users.php:56-60 on master. I did not test this on a running site. If I missed something, please leave it open.

## 3. Looked at closely, not proposed

| Issue | Title | Why not |
|---|---|---|
| #399 | PHP compatibility | Root cause (php-dom-wrapper) removed on dev in 37fc888, but dev still fails on PHP 8.2 per #405 (filed today). Revisit once dev is merged and #405 is fixed. |
| #263 | Apply xpath encoding where needed | dev has its own xpath_encode (b3e7b5d) and most queries use it, but the issue asks for a full audit; e.g. peer_reviewed_article.php:2072 on dev still interpolates $userId unencoded. Not provably complete. |
| #81 | Insert body classes | hypha_setBodyClass adds type_, is_logged_in, is_home, lang_, tag_ classes, but the requested published/not-published class is missing. Partly done. |
| #61 | Make clear what the content type is in the index | Index items have a type_<datatype> class (fcc6e63), but the default theme does not make it visible and step 2 (#117) is open. Partly done. |
| #359 | Refactor to use multiple <form> tags | Main part done on dev (17c475c 'Give each form its own form tag'), but the related native-submit-button/browser-validation part is not, and discussion field suffixes remain. Partly done, dev only. |
| #71 | Disable usage of <h1> | H1 is commented out of the editor style menu (75b2242), but festival.php:987 on dev still generates <h1> day headings and h1 can be typed in HTML mode. Partly done. |
| #14 | Make possible to change language of page | New-page popup has a language dropdown (the fallback ask), but changing the language of an existing page is not possible. Partly done. |
| #298 | Minimal tag-based index | Minimal version done (PR #301), but several 'later improvements' (pagination, sort date, visitor sorting) are unchecked and not all tracked elsewhere. |
| #184 | Images directory is not created automatically? | Upload failure now shows an error, but data/images is still not auto-created for git installs (only hypha.php installer creates it). Partly done. |
| #122 | Feature request: upload video/audio | Embedding audio/video (PR #371) and byte-range serving (PR #372) exist, but uploading video/audio through the editor does not. Partly done. |
| #126 | Enable placement of base64 images | Paste handler (#345) now pastes text only, which avoids base64 images on paste, but images are dropped rather than stored; drag-and-drop not verified. |
| #212 | Newsletter missing standard header and footer | Footer with unsubscribe link exists (also in test mail), header/logo suggestion not decided. |
| #139 | Include plaintext part in e-mails | Two of four bullets moved to #143/#144; plaintext part still not implemented. |
| #138 | Autosuggest excerpt | First part struck through (dup of closed #113); autosuggest itself not implemented. |
| #321 | Make chance of deleting the home page as little as possible | One checklist item done; #322 still open. |
| #240 | Automatic Facebook/Twitter posts | Share links were added (PR #244), but automatic posting to the organisation's accounts is not. |
| #336 | File permission problems on Windows | DOMWrap part gone, but the Windows rename-over-open-file problem in HyphaFile is not addressed. |
| #237 | Notifications about page changes have wrong link | addBaseUrl is still the regex version (various.php:44-47 on dev); not fixed (same for #190). |
| #247 | Force https | No force-https mechanism in .htaccess or PHP on dev. |
| #398 | Scheme calculation behind SSL reverse proxy | getScheme() on dev (HyphaRequest.php:147-154) still prefers REQUEST_SCHEME. |
| #296 | Handle exceptions at top level? | No try/catch or exception handler in index.php on dev (same for #402). |
| #402 | Add general error handler | Same as #296: not implemented on dev. |
| #275 | Proper error message when extensions are missing | No extension_loaded checks on dev. |
| #326 | Do not recommend 777 | README.md:42 on dev still says chmod -R 777. |
| #96 | Jquery version does not receive patches | Still jquery-1.7.1 on dev (only moved to local hosting in PR #300). |
| #236 | Line endings changed after save | hypha_setCss/hypha_setHtml write the posted text as-is; no normalisation. |
| #270 | Limit scope of lookups in article | be597ae on dev narrows some xpath queries, but the id-based lookups mentioned in the issue are not scoped. |
| #9 | Wish: start new instance | Thread says discussion continues here; no decision. |
| #10 | Wish: email to hypha instance | Thread says discussion continues here; no decision. |
| #12 | Class table.section versus tag section | class="section" still used in many places on dev. |
| #65 | The editor does not show the status | No evidence either way in the code; would need testing in the editor. |
| #180 | Changing welcome message: strange behaviour | Possibly same as closed #189, but never confirmed; could not reproduce without a running site. |
| #109 | Fix auto-focus on login username | focus() call exists since 2016; whether the CSS problem persists needs a browser test. |
| #289 | Tagging: Edit tags in edit view | Tag list is written for all non-system page views (pages.php:261 on dev), but whether it is usable in the edit view needs a runtime check. |
| #397 | Docker Compose boot files | Informational post by the same contributor; left to them. |
| #403 | Data model | Informational post by the same contributor; left to them. |
| #400 | hypha.xml containing multiple entities versus ACID | Question by the same contributor, unanswered. |

All other open issues (#28, #41, #44, #49, #62, #64, #67-#70, #72-#80, #82, #83, #86, #88-#90, #93, #98, #108, #115-#117, #119-#121, #123, #127-#137, #148, #152, #176, #181, #190, #191, #203, #204, #211, #222, #230, #238, #241, #242, #245, #264, #267, #274, #285, #295, #309, #310, #315, #322, #324, #334, #335, #338, #347, #348, #353, #362, #363, #367, #374-#379, #384, #386-#393, #401, #404) were read and are still open work or wishes; spot checks on dev found no implementation (e.g. no sitemap/og:/robots/rss code, no svg upload, no target=_blank, upload size not checked client side).
