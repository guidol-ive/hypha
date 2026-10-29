"""An RSS feed of a page list: a pagelist macro with rss="yes" offers its pages at <language>/<page>/rss (#128)."""
import datetime
import os
import re
import sys
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hypha import Client, run, test  # noqa: E402
import hypha  # noqa: E402

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "bekend"))
import test_paginas as pages  # noqa: E402

#
# Only the helpers of test_paginas.py, not its tests.
#
hypha.TESTS.clear()

#
# The articles of a feed are published on a day of their own in 2027-2034, so the list of this run does not show
# articles of other tests or of an earlier run on the same site. Noon UTC stays on that day in Europe/Amsterdam.
#
FIRST_DAY = datetime.datetime(2027, 1, 1, 12, tzinfo=datetime.timezone.utc)


def day(offset):
    return FIRST_DAY + datetime.timedelta(days=(int(pages.RUN, 16) * 2 + offset) % 2900)


def published(client, name, at, private=False):
    slug = pages.new_page(client, name, kind="peer_reviewed_article", private=private)
    text = pages.article_xml(name, "published").replace('published_at=""', f'published_at="t{int(at.timestamp())}"')
    with open(pages.page_file(slug), "w", encoding="utf-8") as f:
        f.write(text)
    return slug


def fetch(url):
    try:
        with urllib.request.urlopen(url) as response:
            return response.status, response.headers.get("Content-Type"), response.read()
    except urllib.error.HTTPError as error:
        return error.code, error.headers.get("Content-Type"), error.read()


def feed_page(base, offset):
    sanne = Client(base).login("sanne")
    at = day(offset)
    older = published(sanne, f"Brug open {offset} {pages.RUN}", at - datetime.timedelta(hours=2))
    newer = published(sanne, f"Raad besluit {offset} {pages.RUN}", at)
    hidden = published(sanne, f"Nog geheim {offset} {pages.RUN}", at + datetime.timedelta(hours=1), private=True)
    date = at.strftime("%Y-%m-%d")
    macro = (f'<p>Nieuws</p><macro name="pagelist" pagetypes="peer_reviewed_article" date-from="{date}" '
             f'date-until="{date}" sort="title" include-private="yes" rss="yes"></macro>')
    slug = pages.text_page(sanne, f"Nieuws {offset} {pages.RUN}", [macro])
    return slug, older, newer, hidden


@test
def a_page_list_with_rss_is_a_feed_of_its_public_pages_newest_first(base):
    slug, older, newer, hidden = feed_page(base, 0)
    _, text, _ = Client(base).get(f"nl/{slug}")
    link = re.search(r'<link[^>]*type="application/rss\+xml"[^>]*>', text)
    assert link and f'href="{base}/nl/{slug}/rss"' in link.group(0), link.group(0) if link else "no feed link"
    assert newer in text and older in text, "the list on the page is empty"
    status, content_type, body = fetch(f"{base}/nl/{slug}/rss")
    assert status == 200 and content_type.startswith("application/rss+xml"), (status, content_type, body[:300])
    channel = ET.fromstring(body).find("channel")
    assert channel.findtext("link") == f"{base}/nl/{slug}" and channel.findtext("language") == "nl", ET.tostring(channel)
    atom = channel.find("{http://www.w3.org/2005/Atom}link")
    assert atom is not None and atom.get("href") == f"{base}/nl/{slug}/rss" and atom.get("rel") == "self"
    items = channel.findall("item")
    links = [item.findtext("link") for item in items]
    # The list on the page is sorted by title; the feed is newest first.
    assert links == [f"{base}/nl/{newer}", f"{base}/nl/{older}"], links
    first = items[0]
    assert first.findtext("title") == f"Raad besluit 0 {pages.RUN}", first.findtext("title")
    assert first.findtext("guid") == first.findtext("link") and first.find("guid").get("isPermaLink") == "true"
    expected = day(0).astimezone(datetime.timezone.utc)
    published_at = datetime.datetime.strptime(first.findtext("pubDate"), "%a, %d %b %Y %H:%M:%S %z")
    assert published_at == expected, (first.findtext("pubDate"), expected)
    assert first.findtext("description") == "De raad sprak over de brug.", first.findtext("description")


@test
def a_member_gets_no_private_pages_in_the_feed_either(base):
    slug, _, newer, hidden = feed_page(base, 1)
    _, text, _ = Client(base).login("sanne").get(f"nl/{slug}/rss")
    assert newer in text and hidden not in text, "the private article is in the feed of a member"


@test
def a_page_without_a_feed_has_no_rss_view(base):
    status, _, _ = fetch(f"{base}/nl/Start/rss")
    assert status == 404, status
    _, text, _ = Client(base).get("nl/Start")
    assert "application/rss+xml" not in text, "the home page advertises a feed"


if __name__ == "__main__":
    sys.exit(run(sys.argv[1]))
