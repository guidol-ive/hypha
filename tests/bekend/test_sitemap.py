"""Known bugs for search engines: /sitemap.xml and /robots.txt.

The fictional test site of tests/site/maak-site.php has one Dutch home page in the menu. The tests add an English
translation of it, a public page with a translation, a private page, a published and a draft article. The articles
have no screen on main to make one without a title (#525), so they are made as text pages and their files are written
as articles in the data folder of the fictional site ($HYPHA_WORK/data), as tests/bekend/test_inhoud.py does. A
failing setup step raises RuntimeError, so it shows as FAIL and never as a known bug.
"""
import os
import re
import sys
import time
import xml.etree.ElementTree as ElementTree

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "integratie"))
sys.path.insert(0, os.environ.get("HYPHA_INTEGRATIE", ""))
from hypha import Client, known_bug, run  # noqa: E402

WORK = os.environ.get("HYPHA_WORK", "")
DATA = os.path.join(WORK, "data")
HYPHA_XML = os.path.join(DATA, "hypha.xml")
NS = "{http://www.sitemaps.org/schemas/sitemap/0.9}"
EN_HOME = "Eemstad_home"


def setup(condition, message):
    if not condition:
        raise RuntimeError("setup: " + message)


def read(path):
    with open(path, encoding="utf-8", errors="replace") as f:
        return f.read()


def write(path, text):
    """Replace a file at once, as Hypha does, and give the container a moment to see it."""
    time.sleep(0.2)
    temporary = path + ".proef"
    with open(temporary, "w", encoding="utf-8") as f:
        f.write(text)
    os.chmod(temporary, 0o666)
    os.replace(temporary, path)
    time.sleep(0.3)


def page_id(name):
    match = re.search(r'<page id="(\w+)" type="(\w+)"[^>]*>\s*<language id="nl" name="' + re.escape(name) + '"', read(HYPHA_XML))
    setup(match, f"page {name} not in hypha.xml")
    return match.group(1)


def text_page(beheer, name, private=False):
    fields = {"newPageType": "textpage", "newPageLanguage": "nl"}
    if private:
        fields["newPagePrivate"] = "on"
    beheer.post(f"nl/{name}", "newPage", name, fields)
    edit = {"textPagename": name, "textContent": "<p>Tekst van de proefpagina.</p>"}
    if private:
        edit["textPrivate"] = "on"
    beheer.post(f"nl/{name}/edit", "edit", fields=edit)
    status, _, _ = beheer.get(f"nl/{name}")
    setup(status == 200, f"nl/{name} gave {status}")


def article(beheer, name, status):
    text_page(beheer, name)
    pid = page_id(name)
    write(HYPHA_XML, read(HYPHA_XML).replace(f'id="{pid}" type="textpage"', f'id="{pid}" type="peer_reviewed_article"'))
    published = ' published_at="t1793000000"' if status == "published" else ""
    write(os.path.join(DATA, "pages", pid), (
        '<?xml version="1.0" encoding="UTF-8"?>\n<hypha type="peer_reviewed_article" multiLingual="off" versions="off" schemaVersion="1">'
        f'<article status="{status}" author="Lotte Bakker" created_by="u4" created_at="t1793000000" updated_at="t1793000100"{published}>'
        f'<content><text><p>Tekst van het proefartikel.</p></text><sources/></content><context><title>{name}</title><excerpt><p>Kort</p></excerpt>'
        '<featured_image/><method><p>Methode</p></method></context></article><discussions><review/><public/></discussions><approves/></hypha>'))


def site(base):
    """The pages of the tests; returns the English name of the home page."""
    setup(WORK, "HYPHA_WORK is not set")
    beheer = Client(base).login("beheer")
    status, text, _ = Client(base).get("nl/Start")
    if f'href="en/{EN_HOME}"' not in text:
        time.sleep(1.1)
        beheer.post("nl/Start/translate", "translate", fields={"textLanguage": "en", "textPagename": EN_HOME, "textContent": "<p>Welcome.</p>"})
    if "Openbaar_sitemap" not in read(HYPHA_XML):
        text_page(beheer, "Openbaar_sitemap")
        #
        # A translation in the same second as the first version gets the same version id (#528).
        #
        time.sleep(1.1)
        beheer.post("nl/Openbaar_sitemap/translate", "translate", fields={"textLanguage": "en", "textPagename": "Public_sitemap", "textContent": "<p>Public.</p>"})
        text_page(beheer, "Prive_sitemap", private=True)
        article(beheer, "Artikel_sitemap", "published")
        article(beheer, "Concept_sitemap", "draft")
    for path in [f"en/{EN_HOME}", "en/Public_sitemap"]:
        status, _, _ = Client(base).get(path)
        setup(status == 200, f"{path} gave {status}")
    status, _, _ = Client(base).get("nl/Prive_sitemap")
    setup(status == 404, f"the private page nl/Prive_sitemap gave {status} to an anonymous visitor")
    return EN_HOME


@known_bug(375)
def the_sitemap_lists_every_public_language_version_and_nothing_else(base):
    site(base)
    client = Client(base)
    status, text, _ = client.get("sitemap.xml")
    kind = client.headers.get("Content-Type", "")
    assert status == 200 and kind.startswith("application/xml"), f"/sitemap.xml gave {status} {kind}, an XML sitemap expected"
    try:
        root = ElementTree.fromstring(text.encode("utf-8"))
    except ElementTree.ParseError as error:
        raise AssertionError(f"/sitemap.xml is no XML: {error}")
    assert root.tag == NS + "urlset", f"/sitemap.xml has root {root.tag}, a urlset expected"
    prefix = base.rstrip("/") + "/"
    urls = {}
    for url in root.findall(NS + "url"):
        loc = url.findtext(NS + "loc")
        urls[loc[len(prefix):] if loc.startswith(prefix) else loc] = (url.findtext(NS + "priority"), url.findtext(NS + "lastmod"))
    for path in ["nl/Start", f"en/{EN_HOME}", "nl/Openbaar_sitemap", "en/Public_sitemap", "nl/Artikel_sitemap"]:
        assert path in urls, f"{path} is not in the sitemap: {sorted(urls)}"
    for path in ["nl/Prive_sitemap", "nl/Concept_sitemap"]:
        assert path not in urls, f"{path} (private or draft) is in the sitemap"
    assert not [p for p in urls if not re.match(r"^[a-z]{2}/", p)], f"the sitemap lists addresses without a language: {sorted(urls)}"
    assert urls["nl/Start"][0] == "0.8" and urls[f"en/{EN_HOME}"][0] == "0.8", f"the home page has priority {urls['nl/Start'][0]}, 0.8 expected"
    assert urls["nl/Openbaar_sitemap"][0] == "0.6", f"a page outside the menu has priority {urls['nl/Openbaar_sitemap'][0]}, 0.6 expected"
    assert urls["nl/Artikel_sitemap"][1] == "2026-10-26T07:35:00Z", f"the article has lastmod {urls['nl/Artikel_sitemap'][1]}, its updated_at expected"
    assert all(re.match(r"^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$", m or "") for p, (_, m) in urls.items() if p != "nl/Artikel_sitemap"), f"a lastmod is not in UTC: {urls}"


@known_bug(375)
def robots_txt_names_the_sitemap(base):
    client = Client(base)
    status, text, _ = client.get("robots.txt")
    kind = client.headers.get("Content-Type", "")
    assert status == 200 and kind.startswith("text/plain"), f"/robots.txt gave {status} {kind}, plain text expected"
    assert re.search(r"^Sitemap: " + re.escape(base.rstrip("/") + "/sitemap.xml") + r"\s*$", text, re.M), f"/robots.txt has no Sitemap line: {text[:200]!r}"


if __name__ == "__main__":
    sys.exit(run(sys.argv[1]))
