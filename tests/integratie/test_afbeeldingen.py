"""Images in the text of a page get their size, async decoding and lazy loading below the first (#681)."""
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "bekend"))
from hypha import Client, run, test  # noqa: E402
import hypha  # noqa: E402
import test_paginas as pages  # noqa: E402
from test_toegankelijkheid import png  # noqa: E402

#
# Only the helpers of test_paginas.py and test_toegankelijkheid.py, not their tests.
#
hypha.TESTS.clear()


def image(text, name):
    tag = re.search(r'<img[^>]*' + re.escape(name) + r'[^>]*>', text)
    assert tag, f"no image {name}"
    return tag.group(0)


@test
def images_in_a_text_get_their_size_and_load_lazily_below_the_first(base):
    names = [f"{kind}{pages.RUN}.png" for kind in ("boven", "onder", "vast")]
    for name, (width, height) in zip(names, ((800, 450), (640, 480), (300, 200))):
        png(os.path.join(pages.WORK, "data/images", name), width, height)
    sanne = Client(base).login("sanne")
    content = (f'<p><img src="images/{names[0]}" alt="De brug"/></p><p>De raad vergaderde over de brug.</p>'
               f'<p><img src="images/{names[1]}" alt="De raad"/></p><p><img src="images/{names[2]}" alt="Het plein" width="150"/></p>')
    slug = pages.text_page(sanne, f"Brug in beeld {pages.RUN}", [content])
    _, text, _ = Client(base).get(f"nl/{slug}")
    first, second, fixed = (image(text, name) for name in names)
    assert 'width="800"' in first and 'height="450"' in first, first
    assert "loading=" not in first, f"the first image waits until it comes into view: {first}"
    assert 'width="640"' in second and 'height="480"' in second and 'loading="lazy"' in second, second
    assert 'width="150"' in fixed and "height=" not in fixed, f"a size set in the text is kept: {fixed}"
    for tag in (first, second, fixed):
        assert 'decoding="async"' in tag, tag


@test
def the_core_style_keeps_the_proportions_of_a_sized_image(base):
    _, css, _ = Client(base).get("system/assets/hypha-core.css")
    assert re.search(r"img\[width\]\[height\]\s*\{\s*height:\s*auto;", css), "no height: auto for sized images"


if __name__ == "__main__":
    sys.exit(run(sys.argv[1]))
