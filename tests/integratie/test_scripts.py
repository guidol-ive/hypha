"""The JavaScript that is the same on every page is in a cached file; the tag functions only for members (#683)."""
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hypha import Client, run, test  # noqa: E402


def inline(text):
    return "".join(re.findall(r"<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>", text, re.S))


@test
def a_page_links_the_shared_javascript_instead_of_writing_it(base):
    _, text, _ = Client(base).get("nl/Start")
    assert re.search(r'<script[^>]*src="system/assets/hypha\.js"', text), "hypha.js is not linked"
    code = inline(text)
    for name in ("hypha", "ajax", "notify", "notifyTimer"):
        assert f"function {name}(" not in code, f"{name}() is still inline"


@test
def the_shared_javascript_is_cached_and_complete(base):
    client = Client(base)
    status, js, _ = client.get("system/assets/hypha.js")
    assert status == 200, status
    assert "public" in (client.headers.get("Cache-Control") or ""), client.headers.get("Cache-Control")
    for name in ("hypha", "ajax", "notify", "notifyTimer"):
        assert f"function {name}(" in js, f"{name}() is missing from hypha.js"
    assert "<?" not in js and "new ActiveXObject" not in js, "PHP or the Internet Explorer 6 fallback in hypha.js"


@test
def only_a_member_gets_the_tag_functions(base):
    _, text, _ = Client(base).get("nl/Start")
    assert "function selectTag(" not in inline(text), "a visitor gets the tag functions"
    _, text, _ = Client(base).login("sanne").get("nl/Start")
    assert "function selectTag(" in inline(text), "a member does not get the tag functions"


if __name__ == "__main__":
    sys.exit(run(sys.argv[1]))
