"""Known bugs of the site icon: /favicon.ico and /apple-touch-icon.png, and the icon links in the head of a page.

Browsers request /favicon.ico on the first visit and iOS requests /apple-touch-icon.png; both should get an image from
the active theme, not the home page as HTML.
"""
import os
import re
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "integratie"))
from hypha import Client, known_bug, run  # noqa: E402


@known_bug(616)
def the_site_icon_is_an_image(base):
    client = Client(base)
    found = {}
    for path, kind in [("favicon.ico", "image/vnd.microsoft.icon"), ("apple-touch-icon.png", "image/png")]:
        status, _, _ = client.get(path)
        found[path] = (status, client.headers.get("Content-Type", ""), kind)
    wrong = {path: f"{status} {got}" for path, (status, got, kind) in found.items() if status != 200 or got.split(";")[0].strip() != kind}
    assert not wrong, f"the site icons answered {wrong}, an image of the active theme expected"


@known_bug(616)
def a_page_links_the_site_icon(base):
    status, text, _ = Client(base).get("nl/Start")
    head = re.search(r"<head>.*?</head>", text, re.S)
    assert status == 200 and head, f"nl/Start gave {status} without a head"
    rels = re.findall(r'<link[^>]*\brel="([^"]*icon[^"]*)"', head.group(0))
    assert "icon" in rels, f"the head of nl/Start links no icon (rel found: {rels})"


if __name__ == "__main__":
    sys.exit(run(sys.argv[1]))
