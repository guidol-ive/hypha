"""The number of comments above an article is an element, not text that shows '<div ...>' (comment count)."""
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

COMMENT = ('<discussions><review/><public><discussion xml:id="dtel{run}" blocking="" closed="">'
           '<discussion_comment xml:id="ctel{run}" created_at="t1793100000" pending="0" commenter_name="Lezer uit Eemstad" '
           'commenter_email="lezer@eemstad.example">Goed stuk.</discussion_comment></discussion></public></discussions>')


@test
def the_comment_count_is_an_element_above_the_title(base):
    sanne = Client(base).login("sanne")
    slug = pages.article(sanne, f"Reacties op de brug {pages.RUN}", "published", discussions=COMMENT.format(run=pages.RUN))
    _, text, _ = Client(base).get(f"nl/{slug}")
    assert "&lt;div" not in text, re.findall(r".{60}&lt;div.{60}", text)
    count = re.search(r'<div class="number_of_comments">([^<]*)</div>', text)
    assert count and count.group(1) == "1 reactie", count.group(0) if count else "no comment count"


if __name__ == "__main__":
    sys.exit(run(sys.argv[1]))
