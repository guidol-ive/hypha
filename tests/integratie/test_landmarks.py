"""Landmarks for the header, the content and the footer, and a link to skip to the content (#682)."""
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hypha import Client, run, test  # noqa: E402


def element(text, id):
    tag = re.search(r'<[a-z]+[^>]*\bid="' + id + r'"[^>]*>', text)
    assert tag, f"no element #{id}"
    return tag.group(0)


@test
def the_theme_regions_are_landmarks(base):
    _, text, _ = Client(base).get("nl/Start")
    assert 'role="banner"' in element(text, "header"), element(text, "header")
    assert 'role="contentinfo"' in element(text, "footer"), element(text, "footer")
    page = element(text, "page")
    assert 'role="main"' in page and 'tabindex="-1"' in page, page
    assert len(re.findall(r'role="main"', text)) == 1, "more than one main landmark"


@test
def the_first_link_skips_to_the_content_of_this_page(base):
    _, text, _ = Client(base).get("nl/Start")
    body = re.search(r"<body[^>]*>\s*(<a[^>]*>[^<]*</a>)", text)
    assert body, "the body does not start with a link"
    link = body.group(1)
    # The page has <base href>, so a bare #page would lead to the home page of the site.
    assert 'class="skip-link"' in link and 'href="nl/Start#page"' in link and "Naar de inhoud" in link, link


@test
def the_skip_link_keeps_the_query(base):
    _, text, _ = Client(base).get("nl/Start?login")
    link = re.search(r'<a class="skip-link"[^>]*>', text)
    assert link and 'href="nl/Start?login#page"' in link.group(0), link.group(0) if link else "no skip link"


@test
def the_skip_link_shows_only_with_the_keyboard_focus(base):
    _, css, _ = Client(base).get("system/assets/hypha-core.css")
    assert re.search(r"\.skip-link\s*\{[^}]*left:\s*-10000px", css), "the skip link is not hidden"
    assert re.search(r"\.skip-link:focus\s*\{[^}]*left:\s*8px", css), "the skip link does not show on focus"


if __name__ == "__main__":
    sys.exit(run(sys.argv[1]))
