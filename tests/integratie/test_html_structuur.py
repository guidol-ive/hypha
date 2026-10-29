"""Valid HTML structure: no link inside the link of a teaser (#695), and a list of comments holds only its items (#696)."""
import os
import re
import sys
from html.parser import HTMLParser

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hypha import Client, run, test  # noqa: E402
import hypha  # noqa: E402

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "bekend"))
import test_paginas as pages  # noqa: E402

#
# Only the helpers of test_paginas.py, not its tests.
#
hypha.TESTS.clear()

VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"}

COMMENT = ('<discussions><review/><public><discussion xml:id="dstr{run}" blocking="" closed="">'
           '<discussion_comment xml:id="cstr{run}" created_at="t1793100000" pending="0" commenter_name="Lezer uit Eemstad" '
           'commenter_email="lezer@eemstad.example">Goed stuk.</discussion_comment></discussion></public></discussions>')


class Children(HTMLParser):
    """The tags of the direct children of every <ul> inside an element with the given class."""

    def __init__(self, wrapper):
        super().__init__()
        self.wrapper = wrapper
        self.stack = []
        self.lists = []

    def handle_starttag(self, tag, attrs):
        if self.stack and self.stack[-1][0] == "ul" and self.stack[-1][1] is not None:
            self.stack[-1][1].append(tag)
        inside = any(self.wrapper in (c or "").split() for _, _, c in self.stack) or self.wrapper in (dict(attrs).get("class") or "").split()
        children = [] if tag == "ul" and inside else None
        if children is not None:
            self.lists.append(children)
        if tag not in VOID:
            self.stack.append((tag, children, dict(attrs).get("class")))

    def handle_endtag(self, tag):
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i][0] == tag:
                del self.stack[i:]
                break


@test
def a_link_in_the_excerpt_does_not_make_a_link_inside_the_teaser_link(base):
    sanne = Client(base).login("sanne")
    title = f"Brug met bron {pages.RUN}"
    slug = pages.article(sanne, title, "published", tag="tag3")
    path = pages.page_file(slug)
    xml = open(path, encoding="utf-8").read().replace(
        "<excerpt><p>De raad sprak over de brug.</p></excerpt>",
        '<excerpt><p>De raad sprak over de <a href="https://eemstad.example/brug">brug</a>.</p></excerpt>')
    with open(path, "w", encoding="utf-8") as f:
        f.write(xml)
    _, text, _ = Client(base).get("tag/nl/Wonen")
    item = re.search(r'<li[\s>](?:(?!</li>).)*' + re.escape(title) + r'.*?</li>', text, re.S)
    assert item, "the article is not on the tag index"
    assert len(re.findall(r"<a[\s>]", item.group(0))) == 1, item.group(0)
    assert "De raad sprak over de brug." in re.sub(r"<[^>]+>", "", item.group(0)), item.group(0)
    assert 'href="https://eemstad.example/brug"' in open(path, encoding="utf-8").read(), "the stored excerpt lost its link"


@test
def the_list_of_public_comments_holds_only_its_items(base):
    sanne = Client(base).login("sanne")
    slug = pages.article(sanne, f"Reacties in een lijst {pages.RUN}", "published", discussions=COMMENT.format(run=pages.RUN))
    _, text, _ = Client(base).get(f"nl/{slug}")
    parser = Children("public-comment-wrapper")
    parser.feed(text)
    assert parser.lists, "no list of public comments"
    assert all(children and set(children) == {"li"} for children in parser.lists), parser.lists
    assert re.search(r'class="public-comment-wrapper[^"]*">\s*<ul>.*?</ul>\s*<form', text, re.S), "the reply form is not after the list"


if __name__ == "__main__":
    sys.exit(run(sys.argv[1]))
