"""/llms.txt (llmstxt.org): the public pages of the site in Markdown for language models and AI agents."""
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "bekend"))
from hypha import Client, run, test  # noqa: E402
import hypha  # noqa: E402
import test_paginas as pages  # noqa: E402

#
# Only the helpers of test_paginas.py, not its tests.
#
hypha.TESTS.clear()


@test
def llms_txt_lists_the_public_pages_and_articles(base):
    sanne = Client(base).login("sanne")
    published = f"Gepubliceerd over de haven {pages.RUN}"
    draft = f"Concept over de haven {pages.RUN}"
    slug = pages.article(sanne, published, "published")
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
    assert "[Start](" in text, "the default page is missing"
    assert draft not in text, "a draft is listed"
    assert secret not in text and secret.replace("_", " ") not in text, "a private page is listed"


if __name__ == "__main__":
    sys.exit(run(sys.argv[1]))
