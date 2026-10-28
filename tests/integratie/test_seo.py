"""Search engines and screen readers: the language of the page and its description (#521)."""
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hypha import Client, run, test  # noqa: E402
import hypha  # noqa: E402

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "bekend"))
import test_paginas as pages  # noqa: E402

#
# Only the helpers of test_paginas.py, not its tests.
#
hypha.TESTS.clear()


def html_lang(text):
    tag = re.search(r"<html[^>]*>", text)
    match = tag and re.search(r'\blang="([^"]*)"', tag.group(0))
    return match.group(1) if match else None


@test
def every_page_has_the_language_of_its_content(base):
    for path in ("nl/Start", "index/nl"):
        _, text, _ = Client(base).get(path)
        assert html_lang(text) == "nl", f"{path}: lang={html_lang(text)!r}"
    _, text, _ = Client(base).login("lotte").get("settings")
    assert html_lang(text), "settings: no lang"



def meta(text, attribute, name):
    match = re.search(r'<meta[^>]*' + attribute + r'="' + re.escape(name) + r'"[^>]*>', text)
    content = match and re.search(r'content="([^"]*)"', match.group(0))
    return content.group(1) if content else None


@test
def a_page_has_a_description_and_open_graph_tags(base):
    _, text, _ = Client(base).get("nl/Start")
    description = meta(text, "name", "description")
    assert description and "Welkom op de proefsite van Eemstad" in description, description
    assert len(description) <= 160, len(description)
    assert meta(text, "property", "og:title") == "Start", meta(text, "property", "og:title")
    assert meta(text, "property", "og:description") == description
    assert meta(text, "property", "og:type") == "website"
    assert meta(text, "property", "og:url").endswith("/nl/Start"), meta(text, "property", "og:url")
    assert meta(text, "property", "og:locale") == "nl"
    assert meta(text, "name", "twitter:card") in ("summary", "summary_large_image")


@test
def the_page_index_has_a_description(base):
    _, text, _ = Client(base).get("index/nl")
    description = meta(text, "name", "description")
    assert description and (description.startswith("Pagina-index") or description.startswith("page-index")), description


@test
def an_edit_view_has_no_description(base):
    _, text, _ = Client(base).login("lotte").get("nl/Start/edit")
    assert not meta(text, "property", "og:title"), "the edit view has Open Graph tags"


@test
def a_page_with_several_images_takes_the_first_for_open_graph(base):
    # The tag index of a real site shows many teasers with an image; one image per page was assumed, and every
    # such page answered 500 (#521).
    sanne = Client(base).login("sanne")
    for n in (1, 2):
        pages.article(sanne, f"Beeld {n} {pages.RUN}", "published", tag="tag4", featured=f"<featured_image>5f0c0ffee0b2{n}.png</featured_image>")
    status, text, _ = Client(base).get("tag/nl/Cultuur")
    assert status == 200, status
    assert len(re.findall(r"<img[^>]*featured_image", text)) >= 2, "fewer than two images on the tag index"
    assert meta(text, "property", "og:image"), "no og:image"

if __name__ == "__main__":
    sys.exit(run(sys.argv[1]))
