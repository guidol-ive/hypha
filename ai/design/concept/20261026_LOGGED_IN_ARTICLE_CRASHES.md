---
title: "LOGGED-IN ARTICLE CRASHES: guard missing elements so older articles open for members"
revision: 1
date_created: 2026-10-26
date_last_review:
status: concept
estimate: "1 hour including review; verified"
---

# LOGGED-IN ARTICLE CRASHES

## Problem

On every PHP version, a logged-in member hits a fatal error on older peer-reviewed articles
(KI-GLE-2026W44-hypha-002, -003, -004, and a fourth case found while fixing: an empty
`discussions/public` container). On a copy of the De Stadsbron data this was 82 of 1 330 pages
(6%). Anonymous visitors are not affected. Reported as PlanBCode/hypha#406.

## Change

- `has-featured-image` check: read the image from `documentElement->get(FIELD_NAME_FEATURED_IMAGE)`
  (the direct child `editAction` writes) and treat `null` as "no image", instead of
  `findOneXPath('//featured_image')` which is `null` for older articles and throws when an empty
  legacy element exists under `article/context` as well.
- `getTitle()`: use `extractText()` (ignores markup) instead of `getText()` (throws on child
  elements). Same in the edit form.
- `createPageInstance()`: return `null` for an unknown or non-`HyphaDatatypePage` type and log it;
  the callers (`loadPage`, the `pagelist` macro, `tagindex`) skip `null`.
- `defaultView()`: guard an empty `discussions/public` container.

## Verification

Container test of 2026-10-26: logged in as administrator over the 1 330-page data set, before the
patch 82 pages returned 500, after the patch 0, on PHP 8.2 (with #405) and 8.4. The two pages of
the removed `article` type now give 404 with a notice.

## Operation by an AI agent

Apply on a branch from `dev` with `git apply`; run the logged-in crawl on 8.2 and 8.4; open a PR
against `dev`.

## Patch

> **Note:** this patch is a suggestion and a starting point, not a finished fix. The maintainer
> decides on the final form.

```diff
diff -ru a/system/core/pages.php b/system/core/pages.php
--- a/system/core/pages.php
+++ b/system/core/pages.php
@@ -226,6 +226,13 @@
 	*/
 	function createPageInstance(RequestContext $O_O, HyphaDomElement $node) {
 		$type = $node->getAttribute('type');
+		// A page can refer to a datatype that is no longer
+		// installed. Report it instead of failing on the
+		// whole request.
+		if (!class_exists($type, false) || !is_subclass_of($type, HyphaDatatypePage::class)) {
+			error_log('Hypha: page ' . $node->getAttribute('id') . ' has unknown type "' . $type . '"');
+			return null;
+		}
 		return new $type($node, $O_O);
 	}
 
@@ -254,9 +261,8 @@
 			$_node = hypha_getPage($O_O->getContentLanguage(), $_name);
 
 			$isPrivate = $_node && in_array($_node->getAttribute('private'), ['true', '1', 'on']);
-			if ($_node && (!$isPrivate || isUser())) {
-				$hyphaPage = createPageInstance($O_O, $_node);
-
+			$hyphaPage = $_node && (!$isPrivate || isUser()) ? createPageInstance($O_O, $_node) : null;
+			if ($hyphaPage) {
 				// add tag list to all non-system pages
 				$hyphaHtml->writeToElement('tagList', hypha_indexTags($_node, $hyphaPage->language));
 
diff -ru a/system/datatypes/peer_reviewed_article.php b/system/datatypes/peer_reviewed_article.php
--- a/system/datatypes/peer_reviewed_article.php
+++ b/system/datatypes/peer_reviewed_article.php
@@ -332,10 +332,9 @@
 		/** @var HyphaDomElement $discussions */
 		$discussions = $this->xml->findOneXPath(self::FIELD_NAME_DISCUSSION_CONTAINER . '/' . self::FIELD_NAME_DISCUSSION_PUBLIC_CONTAINER);
 
+		// Older articles may lack the public discussion container.
 		$xpath = './/' . self::FIELD_NAME_DISCUSSION_COMMENT . '[@' . self::FIELD_NAME_DISCUSSION_COMMENT_PENDING . '!="1"]';
-		$commentCollection = $discussions->findXPath($xpath);
-
-		$commentCount = $commentCollection->length;
+		$commentCount = $discussions ? $discussions->findXPath($xpath)->length : 0;
 		if ($commentCount > 0) {
 			if ($commentCount == 1) {
 				$commentCountText = __('art-public-comment-count-singular', ['count' => $commentCount]);
@@ -458,7 +457,12 @@
 			'has-featured-image' => [
 				'statuses' => [self::STATUS_DRAFT, self::STATUS_REVIEW, self::STATUS_APPROVED],
 				'checker' => function() {
-					return [$this->xml->findOneXPath('//' . self::FIELD_NAME_FEATURED_IMAGE)->getText() !== "", []];
+					// The featured image is stored directly below the
+					// root (see editAction). Older articles have none,
+					// and many also have an empty legacy element below
+					// article/context, so do not search with //.
+					$featuredImage = $this->xml->documentElement->get(self::FIELD_NAME_FEATURED_IMAGE);
+					return [$featuredImage !== null && $featuredImage->getText() !== "", []];
 				},
 				'level' => self::CHECK_LEVEL_RECOMMENDED,
 			],
@@ -645,7 +649,7 @@
 
 		// create form
 		$formData = [
-			self::FIELD_NAME_TITLE => html_entity_decode(strip_tags($this->xml->findOneXPath('//' . self::FIELD_NAME_TITLE)->getText())),
+			self::FIELD_NAME_TITLE => html_entity_decode(strip_tags($this->xml->findOneXPath('//' . self::FIELD_NAME_TITLE)->extractText())),
 			self::FIELD_NAME_AUTHOR => $this->xml->findOneXPath(self::FIELD_NAME_ARTICLE)->getAttribute(self::FIELD_NAME_AUTHOR),
 			self::FIELD_NAME_TEXT => $this->xml->findOneXPath('//' . self::FIELD_NAME_TEXT)->getInnerHtml(),
 			self::FIELD_NAME_EXCERPT => $this->xml->findOneXPath('//' . self::FIELD_NAME_EXCERPT)->getInnerHtml(),
@@ -2009,7 +2013,9 @@
 	public function getTitle() {
 		$title = $this->xml->findOneXPath('//' . self::FIELD_NAME_TITLE);
 		if ($title instanceof HyphaDomElement) {
-			$title = $title->getText();
+			// Older titles may contain markup (e.g. a <p>), so
+			// ignore it rather than failing.
+			$title = $title->extractText();
 		}
 		if ('' === $title) {
 			$title = showPagename($this->pagename);
diff -ru a/system/datatypes/tagindex.php b/system/datatypes/tagindex.php
--- a/system/datatypes/tagindex.php
+++ b/system/datatypes/tagindex.php
@@ -63,7 +63,9 @@
 			]);
 			$pages = [];
 			foreach ($pageNodes as $node) {
-				$pages[] = createPageInstance($this->O_O, $node);
+				$page = createPageInstance($this->O_O, $node);
+				if ($page)
+					$pages[] = $page;
 			}
 			return $pages;
 		}
diff -ru a/system/macros/pagelist.php b/system/macros/pagelist.php
--- a/system/macros/pagelist.php
+++ b/system/macros/pagelist.php
@@ -187,6 +187,8 @@
 		$pages = [];
 		foreach ($pageNodes as $node) {
 			$page = createPageInstance($this->O_O, $node);
+			if (!$page)
+				continue;
 			if ($dateFrom || $dateUntil) {
 				$datetime = $page->getSortDateTime();
 				if (!$datetime || ($dateFrom && $datetime < $dateFrom) || ($dateUntil && $datetime >= $dateUntil)) {
```
