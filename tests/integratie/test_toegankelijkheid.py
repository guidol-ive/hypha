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



@test
def the_article_page_shows_the_intro_and_the_photo(base):
    # The excerpt and the featured image only showed in the box for the front page, for logged-in users (#520).
    sanne = Client(base).login("sanne")
    title = f"Brug met foto {pages.RUN}"
    slug = pages.article(sanne, title, "published", featured='<featured_image alt="De nieuwe brug" caption="De brug bij nacht" credit="Verzonnen Fotograaf">5f0c0ffee0b30.png</featured_image>')
    # An article of the new editor: format="markdown" with a source.
    path = pages.page_file(slug)
    xml = open(path, encoding="utf-8").read()
    xml = xml.replace('<article status=', '<article format="markdown" status=', 1).replace(
        "</context>", '</context><source format="markdown" profile="hypha-1.0"><text>De raad vergaderde over de nieuwe brug.</text>'
        "<excerpt>De raad sprak over de brug.</excerpt><method/><sources/><frontmatter/></source>", 1)
    open(path, "w", encoding="utf-8").write(xml)
    _, text, _ = Client(base).get(f"nl/{slug}")
    intro = re.search(r'<div class="mde-intro">(.*?)</div>', text, re.S)
    assert intro and "De raad sprak over de brug" in intro.group(1), "no intro on the article page"
    figure = re.search(r'<figure class="breed mde-lead">(.*?)</figure>', text, re.S)
    assert figure, "no photo on the article page"
    assert 'alt="De nieuwe brug"' in figure.group(1) and "De brug bij nacht" in figure.group(1) and "<i>Verzonnen Fotograaf</i>" in figure.group(1), figure.group(1)
    assert text.index("mde-intro") < text.index('class="article"'), "the intro is not above the text"

if __name__ == "__main__":
    sys.exit(run(sys.argv[1]))
