"""Plain text of HTML: a space between paragraphs and no byte-order mark in descriptions (#697); the first teaser image loads at once (#698)."""
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "bekend"))
from hypha import Client, run, test  # noqa: E402
import hypha  # noqa: E402
import test_paginas as pages  # noqa: E402
from test_seo import meta  # noqa: E402
from test_toegankelijkheid import png  # noqa: E402

#
# Only the helpers, not the tests of the other files.
#
hypha.TESTS.clear()

EXCERPT = "<excerpt><p>Wanneer? Donderdag</p><p>﻿Waar? Het​ buurthuis<br/>Hoe laat? 20:00</p></excerpt>"
PLAIN = "Wanneer? Donderdag Waar? Het buurthuis Hoe laat? 20:00"


def published(client, title, **xml):
    slug = pages.new_page(client, title, kind="peer_reviewed_article")
    text = pages.article_xml(title, "published", **xml).replace(
        "<excerpt><p>De raad sprak over de brug.</p></excerpt>", EXCERPT).replace(
        'updated_at="t1793000000" published_at=""', 'updated_at="t1793200000" published_at="t1793100000"')
    with open(pages.page_file(slug), "w", encoding="utf-8") as f:
        f.write(text)
    return slug


@test
def the_description_of_an_article_has_a_space_between_its_paragraphs(base):
    slug = published(Client(base).login("sanne"), f"Avond in het buurthuis {pages.RUN}")
    _, text, _ = Client(base).get(f"nl/{slug}")
    assert meta(text, "name", "description") == PLAIN, meta(text, "name", "description")
    blocks = re.findall(r'<script type="application/ld\+json">(.*?)</script>', text, re.S)
    assert blocks and json.loads(blocks[0])["description"] == PLAIN, blocks


@test
def the_description_of_a_text_page_has_a_space_between_its_paragraphs(base):
    slug = pages.text_page(Client(base).login("sanne"), f"Buurthuis {pages.RUN}", ["<h2>Open avond</h2><p>Wanneer? Donderdag</p><ul><li>koffie</li><li>thee</li></ul>"])
    _, text, _ = Client(base).get(f"nl/{slug}")
    description = meta(text, "name", "description")
    assert description and "Open avond Wanneer? Donderdag koffie thee" in description, description


@test
def the_first_teaser_image_of_a_tag_index_loads_at_once(base):
    sanne = Client(base).login("sanne")
    for n in range(2):
        name = f"teaser{n}{pages.RUN}.png"
        png(os.path.join(pages.WORK, "data/images", name), 800, 450)
        pages.article(sanne, f"Teaser {n} {pages.RUN}", "published", tag="tag3", featured=f"<featured_image>{name}</featured_image>")
    _, text, _ = Client(base).get("tag/nl/Wonen")
    main = text[text.index('id="main"'):]
    images = re.findall(r"<img[^>]*>", main)
    assert len(images) >= 2, images
    assert 'loading="lazy"' not in images[0], f"the first image waits until it comes into view: {images[0]}"
    assert 'loading="lazy"' in images[1], images[1]


if __name__ == "__main__":
    sys.exit(run(sys.argv[1]))
