"""Images get an alt text, without a change to the data model (#664)."""
import os
import re
import struct
import sys
import zlib
import xml.etree.ElementTree as ET

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "bekend"))
from hypha import Client, run, test, write_same_length  # noqa: E402
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
    # Also with a slash at the end of the address, as a link from elsewhere often has.
    _, text, _ = Client(base).get(f"nl/{slug}/")
    assert '<div class="mde-intro">' in text and "mde-lead" in text, "no intro or photo with a slash at the end"


def png(path, width, height):
    """A plain PNG of the given size, without a library."""
    def chunk(kind, data):
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xffffffff)
    rows = b"".join(b"\x00" + bytes([40, 120, 160]) * width for _ in range(height))
    with open(path, "wb") as f:
        f.write(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0))
                + chunk(b"IDAT", zlib.compress(rows, 9)) + chunk(b"IEND", b""))


@test
def a_teaser_loads_a_smaller_image_with_its_size_when_it_comes_into_view(base):
    # The front page loaded the originals of the teaser images, up to 2.8 MB each, 14 MB in all (#672).
    name = f"groot{pages.RUN}.png"
    png(os.path.join(pages.WORK, "data/images", name), 1600, 900)
    sanne = Client(base).login("sanne")
    pages.article(sanne, f"Groot beeld {pages.RUN}", "published", tag="tag5", featured=f"<featured_image>{name}</featured_image>")
    _, text, _ = Client(base).get("tag/nl/Onderwijs")
    img = re.search(r'<img[^>]*featured_image[^>]*>', text)
    assert img, "no teaser image"
    tag = img.group(0)
    src = re.search(r'src="([^"]*)"', tag).group(1)
    assert src.endswith("_800w.jpg"), tag
    assert 'width="800"' in tag and 'height="450"' in tag and 'loading="lazy"' in tag, tag
    status, _, _ = Client(base).get(src)
    assert status == 200, f"{src}: {status}"


@test
def a_link_with_only_an_image_gets_its_name_from_the_title_of_the_image(base):
    # <a href="…mastodon…"><img title="Volg de Stadsbron op Mastodon!" alt=""></a> had no name for screen readers (#664).
    beheer = Client(base).login("beheer")
    path = os.path.join(pages.WORK, "data/hypha.xml")
    original = open(path, "rb").read()
    root = ET.parse(path).getroot()
    try:
        beheer.get("settings")
        footer = '<p><a href="https://social.example/@eemstad"><img src="images/volg.png" title="Volg Eemstad" alt=""/></a></p>'
        beheer.post("settings", "settingsSaveSiteElements", "", {"siteTitle": root.findtext("title"), "siteHeader": "<p>Eemstad</p>", "siteFooter": footer})
        _, text, _ = Client(base).get("nl/Start")
        img = re.search(r'<img[^>]*volg\.png[^>]*>', text)
        assert img and 'alt="Volg Eemstad"' in img.group(0), img.group(0) if img else "no image"
    finally:
        write_same_length(path, original)

if __name__ == "__main__":
    sys.exit(run(sys.argv[1]))
