"""Known bugs of the preferred url of a page (#521, technical SEO): one url per page, a canonical link and a 301.

The preferred url of a page is <language>/<page name>, the form that the menu, the index and the tags link to. The root
(/) and the root of a language (/nl, /nl/) are the home page under another url, so they redirect with a 301 to the home
page in that language; every page tells search engines its preferred url with <link rel="canonical">.

The fictional test site of tests/site/maak-site.php has one language (nl) and the home page nl/Start. The tests add an
English translation of the home page through the translate view, under a name of their own.
"""
import os
import re
import sys
import urllib.parse

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "integratie"))
from hypha import Client, known_bug, run  # noqa: E402

WORK = os.environ.get("HYPHA_WORK", "")
EN_HOME = "Eemstad_home"
EN_TEXT = "Welcome to the test site of Eemstad (canonical)."


def english_home(base):
    """Makes sure the home page nl/Start has an English translation; returns its English name."""
    status, text, _ = Client(base).get("nl/Start")
    match = re.search(r'href="en/([^"]+)"', text)
    if match:
        return match.group(1)
    beheer = Client(base).login("beheer")
    beheer.post("nl/Start/translate", "translate", fields={"textLanguage": "en", "textPagename": EN_HOME, "textContent": f"<p>{EN_TEXT}</p>"})
    status, text, _ = Client(base).get("nl/Start")
    match = re.search(r'href="en/([^"]+)"', text)
    #
    # Not an assert: without the translation the tests below test nothing.
    #
    if not match:
        raise RuntimeError(f"could not add an English translation of nl/Start ({status})")
    return match.group(1)


ARTICLE = """<?xml version="1.0" encoding="UTF-8"?>
<hypha type="peer_reviewed_article" multiLingual="off" versions="off" schemaVersion="1">
  <article status="draft" author="Sanne" created_at="t1793000000" created_by="u2" updated_at="t1793000000" published_at="">
    <content><text><p>De raad van Eemstad vergaderde over de brug.</p></text><sources><p>Verzonnen.</p></sources></content>
    <context><title>Canoniek artikel</title><excerpt><p>De brug.</p></excerpt><method><p>Verslag.</p></method></context>
  </article>
  <discussions><review/><public/></discussions>
  <approves/>
  <featured_image></featured_image>
</hypha>
"""


def page_id(name, language="nl"):
    """The id of a page in data/hypha.xml of the work folder ($HYPHA_WORK)."""
    with open(os.path.join(WORK, "data/hypha.xml"), encoding="utf-8") as f:
        site = f.read()
    for page in re.finditer(r'<page id="([^"]+)"[^>]*>(.*?)</page>', site, re.S):
        if re.search(rf'<language id="{language}" name="{re.escape(name)}"', page.group(2)):
            return page.group(1)
    #
    # Not an assert: without the page the test tests nothing.
    #
    raise RuntimeError(f"page {language}/{name} not found in {WORK}/data/hypha.xml")


def canonical(text):
    """The href of every <link rel="canonical"> in the page."""
    return re.findall(r'<link rel="canonical" href="([^"]*)"', text)


def new_page(client, name, kind):
    """A new Dutch page of the test itself; returns its name in the url."""
    status, _, location = client.post("nl/Start", "newPage", name, {"newPageType": kind, "newPageLanguage": "nl"})
    #
    # Not an assert: without the page the test tests nothing.
    #
    if status != 302 or not location:
        raise RuntimeError(f"new page {name}: {status}")
    return name.replace(" ", "_")


@known_bug(521)
def the_root_and_the_language_root_redirect_to_the_home_page(base):
    name = english_home(base)
    root = base.rstrip("/") + "/"
    client = Client(base)
    expected = {
        "": root + "nl/Start",
        "?utm_source=test": root + "nl/Start?utm_source=test",
        "nl": root + "nl/Start",
        "nl/": root + "nl/Start",
        "en": root + "en/" + name,
        "en/": root + "en/" + name,
    }
    found = {}
    for path, url in expected.items():
        status, _, location = client.get(path)
        found[path] = (status, location)
    assert all(found[p] == (301, u) for p, u in expected.items()), f"expected a 301 to the home page in its language, got {found}"
    for path in ["nl/Start", "en/" + name]:
        status, _, location = client.get(path)
        assert status == 200, f"the preferred url {path} gave {status} {location} (a redirect loop?)"


@known_bug(521)
def a_post_to_the_language_root_is_handled_there_and_its_reload_keeps_the_notification(base):
    root = base.rstrip("/") + "/"
    client = Client(base)
    client.get("nl/Start")
    status, _, location = client.post("nl", "login", fields={"loginUsername": "nobody", "loginPassword": "wrong"})
    #
    # Commands are posted to the url of the page: the post itself is handled at /nl and reloads it (302, with the
    # request uri as location), never 301.
    #
    path = urllib.parse.urlsplit(location or "").path
    assert status == 302 and path.endswith("/nl") and "notify=" in location, f"a failed login posted to /nl gave {status} {location}, a reload of /nl expected"
    status, _, second = client.get(location.replace(root, "").lstrip("/"))
    assert status == 301 and second == root + "nl/Start?" + location.split("?", 1)[1], f"the reload {location} gave {status} {second}, a 301 to nl/Start with the same query expected"
    status, text, _ = client.get(second.replace(root, ""))
    assert status == 200 and 'class="error"' in text, f"after the 301 the notification of the failed login is gone ({status})"


@known_bug(521)
def every_page_has_a_canonical_link_to_its_preferred_url(base):
    name = english_home(base)
    root = base.rstrip("/") + "/"
    client = Client(base)
    expected = {
        "nl/Start": root + "nl/Start",
        "nl/start": root + "nl/Start",
        "nl/Start?utm_source=test": root + "nl/Start",
        "index.php": root + "nl/Start",
        "en/" + name: root + "en/" + name,
    }
    found = {}
    for path in expected:
        status, text, _ = client.get(path)
        found[path] = canonical(text)
    assert all(found[p] == [u] for p, u in expected.items()), f"canonical links {found}, expected {expected}"
    sanne = Client(base).login("sanne")
    text_name = new_page(sanne, "Canoniek tekst", "textpage")
    article_name = new_page(sanne, "Canoniek artikel", "peer_reviewed_article")
    #
    # A new article cannot be shown before it has content (#525); write its XML as Hypha stores it.
    #
    with open(os.path.join(WORK, "data/pages", page_id(article_name)), "w", encoding="utf-8") as f:
        f.write(ARTICLE)
    for path in [f"nl/{text_name}", f"nl/{article_name}"]:
        status, text, _ = sanne.get(path)
        assert status == 200 and canonical(text) == [root + path], f"{path} ({status}) has canonical links {canonical(text)}, expected {root + path}"


@known_bug(521)
def views_and_missing_pages_have_no_canonical_link(base):
    root = base.rstrip("/") + "/"
    status, text, _ = Client(base).get("nl/Start")
    assert canonical(text) == [root + "nl/Start"], f"nl/Start has canonical links {canonical(text)}"
    status, text, _ = Client(base).get("nl/Geen_pagina_canoniek")
    assert status == 404 and not canonical(text), f"a missing page ({status}) has canonical links {canonical(text)}"
    status, text, _ = Client(base).login("beheer").get("nl/Start/edit")
    assert status == 200 and not canonical(text), f"the edit view ({status}) has canonical links {canonical(text)}"


if __name__ == "__main__":
    sys.exit(run(sys.argv[1]))
