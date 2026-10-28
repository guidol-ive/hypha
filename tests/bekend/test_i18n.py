"""Known bugs of multilingual sites: language roots, addresses that do not exist, hreflang and untranslated texts.

The fictional test site of tests/site/maak-site.php has one language (nl). The tests add an English translation of the
home page through the translate view, under a name of their own, so the site has two content languages.
"""
import os
import re
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "integratie"))
from hypha import Client, known_bug, run  # noqa: E402

EN_HOME = "Eemstad_home"
EN_TEXT = "Welcome to the test site of Eemstad (i18n)."


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


@known_bug(604)
def a_path_without_language_that_is_no_page_gives_404(base):
    client = Client(base)
    #
    # The root shows the home page, directly or after the 301 to the preferred URL of #521 (PR #614).
    #
    for path in ["", "?utm_source=test", "index.php"]:
        status, _, _ = client.follow(client.get(path))
        assert status == 200, f"/{path} gave {status}, the home page expected"
    found = {}
    for path in ["robots.txt", "favicon.ico", "wp-login.php", "Geen_pagina_i18n"]:
        status, text, _ = client.get(path)
        found[path] = status
    assert all(s == 404 for s in found.values()), f"paths without a language answered {found}, 404 expected (they show the home page)"


@known_bug(604)
def the_page_index_of_a_language_without_pages_gives_404(base):
    status, text, _ = Client(base).get("index/fr")
    assert status == 404, f"index/fr (no French page exists) gave {status} with an empty list"


@known_bug(605)
def the_root_of_a_second_language_shows_the_translated_home_page(base):
    name = english_home(base)
    client = Client(base)
    for path in ["en", "en/"]:
        status, text, _ = client.follow(client.get(path))
        assert status == 200, f"/{path} gave {status}, the English home page en/{name} expected"
        assert re.search(r'<body[^>]*class="[^"]*\bis_home\b', text), f"/{path} has no body class is_home"


@known_bug(605)
def logout_on_a_private_page_in_a_second_language_lands_on_a_page(base):
    english_home(base)
    sanne = Client(base).login("sanne")
    sanne.post("en/Private_i18n", "newPage", "Private_i18n", {"newPageType": "textpage", "newPageLanguage": "en", "newPagePrivate": "on"})
    sanne.post("en/Private_i18n/edit", "edit", fields={"textPagename": "Private i18n", "textPrivate": "on", "textContent": "<p>For members only.</p>"})
    sanne.get("en/Private_i18n")
    status, text, location = sanne.follow(sanne.post("en/Private_i18n", "logout"))
    assert status == 200, f"logout on en/Private_i18n ended in {status}"


@known_bug(606)
def a_translated_page_links_its_translations_with_hreflang(base):
    name = english_home(base)
    status, text, _ = Client(base).get("nl/Start")
    links = {m.group(1): m.group(2) for m in re.finditer(r'<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"', text)}
    root = base.rstrip("/") + "/"
    assert links.get("en") == root + "en/" + name, f"no hreflang=en link to en/{name}: {links}"
    assert links.get("nl") == root + "nl/Start", f"no hreflang=nl link to the page itself: {links}"
    assert links.get("x-default") == root + "nl/Start", f"no hreflang=x-default link: {links}"


@known_bug(607)
def the_language_groups_of_the_translate_dialog_are_translated(base):
    status, text, _ = Client(base).login("beheer").get("nl/Start/translate")
    groups = re.findall(r'<optgroup label="([^"]*)"', text)
    assert groups and not set(groups) & {"in use", "add new"}, f"the language groups of the Dutch translate view are {groups}"


@known_bug(607)
def the_image_index_says_not_implemented_in_the_interface_language(base):
    status, text, _ = Client(base).get("index/images")
    assert "not yet implemented" not in text, "index/images says 'image index is not yet implemented' in English on a Dutch interface"


def dutch_page(base, name):
    """A Dutch text page of the test itself; returns a client of beheer."""
    beheer = Client(base).login("beheer")
    beheer.post(f"nl/{name}", "newPage", name, {"newPageType": "textpage", "newPageLanguage": "nl"})
    beheer.post(f"nl/{name}/edit", "edit", fields={"textPagename": name, "textContent": "<p>Nederlandse tekst.</p>"})
    return beheer


@known_bug(612)
def translating_into_an_existing_language_keeps_that_translation(base):
    beheer = dutch_page(base, "Vertaal_i18n")
    beheer.post("nl/Vertaal_i18n/translate", "translate", fields={"textLanguage": "en", "textPagename": "Translate_i18n", "textContent": "<p>First English text.</p>"})
    status, text, _ = Client(base).get("en/Translate_i18n")
    #
    # Not an assert: without the first translation the test tests nothing.
    #
    if status != 200:
        raise RuntimeError(f"the first translation en/Translate_i18n gave {status}")
    beheer.post("nl/Vertaal_i18n/translate", "translate", fields={"textLanguage": "en", "textPagename": "Second_i18n", "textContent": "<p>Second English text.</p>"})
    status, text, _ = Client(base).get("en/Translate_i18n")
    assert status == 200 and "First English text." in text, f"a second translation into en renamed or replaced the first one (en/Translate_i18n gave {status})"


@known_bug(612)
def translating_into_an_unknown_language_code_is_refused(base):
    beheer = dutch_page(base, "Taalcode_i18n")
    beheer.post("nl/Taalcode_i18n/translate", "translate", fields={"textLanguage": "qq", "textPagename": "Code_i18n", "textContent": "<p>Text.</p>"})
    status, text, _ = Client(base).get("nl/Taalcode_i18n")
    assert ">qq<" not in text, "a translation into the unknown language code qq was stored (it shows in the language list)"


if __name__ == "__main__":
    sys.exit(run(sys.argv[1]))
