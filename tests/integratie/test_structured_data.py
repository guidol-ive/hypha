"""Structured data for search engines: a NewsArticle in JSON-LD on a published article (#521)."""
import json
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

COMMENT = ('<discussions><review/><public><discussion xml:id="dld{run}" blocking="" closed="">'
           '<discussion_comment xml:id="cld{run}" created_at="t1793100000" pending="0" commenter_name="Lezer uit Eemstad" '
           'commenter_email="lezer@eemstad.example">Goed stuk, &lt;/script&gt; en al.</discussion_comment>'
           '</discussion></public></discussions>')


def json_ld(text):
    blocks = re.findall(r'<script type="application/ld\+json">(.*?)</script>', text, re.S)
    return [json.loads(block) for block in blocks]


def published(client, name, title, **xml):
    slug = pages.new_page(client, name, kind="peer_reviewed_article")
    text = pages.article_xml(title, "published", **xml).replace('updated_at="t1793000000" published_at=""', 'updated_at="t1793200000" published_at="t1793100000"')
    with open(pages.page_file(slug), "w", encoding="utf-8") as f:
        f.write(text)
    return slug


@test
def a_published_article_describes_itself_as_a_news_article(base):
    sanne = Client(base).login("sanne")
    title = f"Brug & raad </script> {pages.RUN}"
    slug = published(sanne, f"Brug en raad {pages.RUN}", title, discussions=COMMENT.format(run=pages.RUN))
    _, text, _ = Client(base).get(f"nl/{slug}")
    blocks = json_ld(text)
    assert len(blocks) == 1, f"{len(blocks)} JSON-LD blocks"
    data = blocks[0]
    assert data["@context"] == "https://schema.org" and data["@type"] == "NewsArticle", data
    assert data["headline"] == title, data["headline"]
    assert data["url"] == f"{base}/nl/{slug}" and data["mainEntityOfPage"] == data["url"], (data["url"], base, slug)
    assert data["inLanguage"] == "nl", data
    assert data["description"] == "De raad sprak over de brug.", data.get("description")
    assert data["author"] == {"@type": "Person", "name": "Sanne de Vries"}, data.get("author")
    assert data["datePublished"].startswith("2026-10-27T"), data.get("datePublished")
    assert data["dateModified"] > data["datePublished"], data
    assert data["publisher"]["@type"] == "Organization" and data["publisher"]["url"] == base + "/", data["publisher"]
    assert data["commentCount"] == 1, data["commentCount"]
    assert "</script>" not in re.search(r'<script type="application/ld\+json">(.*?)</script>', text, re.S).group(1)


@test
def an_article_that_is_not_published_has_no_structured_data(base):
    sanne = Client(base).login("sanne")
    slug = pages.article(sanne, f"Concept over de brug {pages.RUN}", "draft")
    _, text, _ = sanne.get(f"nl/{slug}")
    assert not json_ld(text), "a draft has JSON-LD"


@test
def a_text_page_has_no_structured_data(base):
    _, text, _ = Client(base).get("nl/Start")
    assert not json_ld(text), "the home page has JSON-LD"


if __name__ == "__main__":
    sys.exit(run(sys.argv[1]))
