---
title: "PHP 8.2 DETACHED NODES: make dev run on PHP 8.2 by returning detached nodes from createFromHtml"
revision: 1
date_created: 2026-10-26
date_last_review:
status: concept
estimate: "1 hour including review; verified"
---

# PHP 8.2 DETACHED NODES

## Problem

On PHP 8.2 every page of `upstream/dev` (5dae13a) fails with `Uncaught Error: Couldn't fetch
HyphaDomElement` (KI-GLE-2026W44-hypha-001). `HyphaDomDocument::createFromHtml()` returns the
`childNodes` of an imported `<body>` that nothing else holds; on 8.2 the nodes are gone by the
time the caller appends them. PHP 8.3, 8.4 and 8.5 are not affected.

## Change

Detach the children of the imported body one by one and return them as a PHP array. Each child
is then owned by its own PHP object. The only caller that used `DOMNodeList` members of the
result, `HTMLForm::__construct`, uses `count()` and `[0]` instead, and both signatures accept an
array. `HyphaDomElement::appendChildren()` already accepts `Traversable|array`.

## Verification

Container test of 2026-10-26 ([`../../measurement/20261026_PHP_8_2_CONTAINER_TEST.md`](../../measurement/20261026_PHP_8_2_CONTAINER_TEST.md)):
with the patch, dev passes the anonymous crawl of 1 333 requests on PHP 8.2, 8.4 and 8.5 with
zero failures, and the logged-in crawl gives the same 82 failures as unpatched dev on 8.4 (those
are KI-GLE-2026W44-hypha-002 to -004, unrelated). Login as administrator works on 8.2.

## Status

Offered as PlanBCode/hypha#475 (first #445 against `dev`) and merged into `main` on 2026-10-26, after a review remark on #405: `createForm()` and
the `HTMLForm` constructor accept any iterable (`Traversable|array`) instead of `DOMNodeList|array`.

## Operation by an AI agent

Apply with `git apply` on a branch from `upstream/dev`, run
`docs/container/smoke_test.py` on 8.2 and 8.5, open a PR against `dev` with this document as
description.

## Patch

> **Note:** this patch is a suggestion and a starting point, not a finished fix. The maintainer
> decides on the final form.

```diff
diff -ru a/system/core/database.php b/system/core/database.php
--- a/system/core/database.php	2026-10-26 10:39:24
+++ b/system/core/database.php	2026-10-26 11:11:31
@@ -120,7 +120,17 @@
 			$body = $newdoc->documentElement->childNodes->item(0);
 			if ($body->tagName != 'body')
 				throw new InvalidArgumentException("First child of parsed HTML is not body, but {$body->tagName}");
-			return $this->importNode($body, true)->childNodes;
+			// Detach the children from the imported body before
+			// returning them. On PHP 8.2 the libxml nodes of a
+			// detached subtree are freed together with the PHP
+			// object of its root, so returning the childNodes of
+			// the temporary body leaves dangling node objects
+			// ("Couldn't fetch HyphaDomElement").
+			$imported = $this->importNode($body, true);
+			$nodes = [];
+			while ($imported->firstChild)
+				$nodes[] = $imported->removeChild($imported->firstChild);
+			return $nodes;
 		}
 	}
 
diff -ru a/system/core/document.php b/system/core/document.php
--- a/system/core/document.php	2026-10-26 10:39:24
+++ b/system/core/document.php	2026-10-26 11:11:52
@@ -223,7 +223,7 @@
 				       string containing either of those.
 			@param $data - Any (POST) data to apply to this form.
 		*/
-		public function createForm(string|HyphaDomElement|DOMNodeList|null $form = null, array $data = []) {
+		public function createForm(string|HyphaDomElement|DOMNodeList|array|null $form = null, array $data = []) {
 			return new HTMLForm($this, $form, $data);
 		}
 
@@ -312,13 +312,13 @@
 			@param $form - The form, either as a string, DOMNodeList or a single HyphaDomNode (will be wrapped in a <form> tag if needed).
 			@param $data - Any (POST) data to apply to this form.
 		*/
-		function __construct(HTMLDocument $doc, string|HyphaDomElement|DOMNodeList|null $form, $data = []) {
+		function __construct(HTMLDocument $doc, string|HyphaDomElement|DOMNodeList|array|null $form, $data = []) {
 			global $O_O;
 
 			if (is_string($form)) {
 				$form = $doc->createFromHtml($form);
-				if ($form->length == 1 && $form->item(0)->tagName == 'form') {
-					$form = $form->item(0);
+				if (count($form) == 1 && $form[0] instanceof HyphaDomElement && $form[0]->tagName == 'form') {
+					$form = $form[0];
 				}
 			}
 
```
