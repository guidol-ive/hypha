"""Images get an alt text, without a change to the data model (#664)."""
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
def the_image_of_a_teaser_has_the_title_of_the_article_as_alt(base):
    sanne = Client(base).login("sanne")
    title = f"Nieuwe fietsbrug {pages.RUN}"
    pages.article(sanne, title, "published", tag="tag3", featured="<featured_image>5f0c0ffee0b1c.png</featured_image>")
    _, text, _ = Client(base).get("tag/nl/Wonen")
    images = re.findall(r'<img[^>]*class="[^"]*featured_image[^"]*"[^>]*>', text)
    assert images, "no teaser image on the tag index"
    assert any(f'alt="{title}"' in img for img in images), images


@test
def no_image_on_the_tag_index_lacks_an_alt(base):
    _, text, _ = Client(base).get("tag/nl/Wonen")
    missing = [img for img in re.findall(r"<img[^>]*>", text) if " alt=" not in img]
    assert not missing, missing


if __name__ == "__main__":
    sys.exit(run(sys.argv[1]))
