"""/llms.txt (llmstxt.org): the 10 newest public pages of the site in Markdown for language models and AI agents."""
import os
import re
import time
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "bekend"))
from hypha import Client, run, test  # noqa: E402
import hypha  # noqa: E402
import test_paginas as pages  # noqa: E402
import test_platte_tekst as plain  # noqa: E402

#
# Only the helpers of test_paginas.py and test_platte_tekst.py, not their tests.
#
hypha.TESTS.clear()


def fresh(slug):
    """Marks an article as created now: the articles of test_paginas.py were all created at the same time in 2026."""
    path = pages.page_file(slug)
    text = open(path, encoding="utf-8").read().replace('created_at="t1793000000" created_by', f'created_at="t{int(time.time())}" created_by', 1)
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)
    return slug


def entries(text):
    return re.findall(r"^- \[(.*?)\]\(", text, re.M)


@test
def llms_txt_lists_the_public_pages_and_articles(base):
    sanne = Client(base).login("sanne")
    published = f"Gepubliceerd over de haven {pages.RUN}"
    draft = f"Concept over de haven {pages.RUN}"
    slug = fresh(pages.article(sanne, published, "published"))
    pages.article(sanne, draft, "draft")
    secret = pages.new_page(sanne, f"Geheim_{pages.RUN}", private=True)
    client = Client(base)
    status, text, _ = client.get("llms.txt")
    assert status == 200, status
    assert (client.headers.get("Content-Type") or "").startswith("text/markdown"), client.headers.get("Content-Type")
    assert text.startswith("# "), text[:80]
    assert re.search(r"^> .+", text, re.M), "no summary"
    assert f"[{published}](" in text and f"/nl/{slug})" in text, text[:600]
    assert "De raad sprak over de brug" in text, "no excerpt of the article"
    assert len(entries(text)) <= 10, entries(text)
    assert f"{base}/sitemap.xml" in text, "no link to the sitemap"
    assert draft not in text, "a draft is listed"
    assert secret not in text and secret.replace("_", " ") not in text, "a private page is listed"


@test
def llms_txt_has_a_space_between_the_paragraphs_of_an_excerpt(base):
    fresh(plain.published(Client(base).login("sanne"), f"Avond in het buurthuis {pages.RUN}"))
    _, text, _ = Client(base).get("llms.txt")
    assert plain.PLAIN in text, "the excerpt of the article is glued or missing (#697)"
    assert "\ufeff" not in text and "\u200b" not in text, "a byte-order mark or zero-width space in llms.txt"


@test
def llms_txt_comes_from_a_cache_until_a_page_changes(base):
    time.sleep(1.1)
    _, first, _ = Client(base).get("llms.txt")
    cache = os.path.join(pages.WORK, "data/llms.cache")
    assert os.path.exists(cache), "no cache of llms.txt (#701)"
    _, second, _ = Client(base).get("llms.txt")
    assert second == first, "the cached llms.txt differs"
    title = f"Na de cache {pages.RUN}"
    fresh(pages.article(Client(base).login("sanne"), title, "published"))
    _, third, _ = Client(base).get("llms.txt")
    assert f"[{title}](" in third, "a new article is missing: the cache was not renewed"


@test
def llms_txt_lists_only_the_10_newest_pages(base):
    sanne = Client(base).login("sanne")
    names = [f"Wijk {n} {pages.RUN}" for n in range(11)]
    for name in names:
        pages.text_page(sanne, name, [f"<p>Over {name}.</p>"])
    _, text, _ = Client(base).get("llms.txt")
    listed = entries(text)
    assert len(listed) == 10, listed
    assert all(name in listed for name in names[1:]), listed
    assert names[0] not in listed, "the oldest of the 11 new pages is listed"


if __name__ == "__main__":
    sys.exit(run(sys.argv[1]))
