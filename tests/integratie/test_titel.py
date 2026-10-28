"""The site title is text: a title stored with markup gives its text, and one saved with an ampersand stays text (#521)."""
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hypha import Client, run, test, write_same_length  # noqa: E402

WORK = os.environ.get("HYPHA_WORK", "")


def page_title(text):
    match = re.search(r"<title>(.*?)</title>", text, re.S)
    return match.group(1) if match else None


@test
def a_site_title_stored_with_markup_gives_its_text(base):
    path = os.path.join(WORK, "data/hypha.xml")
    original = open(path, "rb").read()
    text = original.decode("utf-8")
    title = re.search(r"<title>(.*?)</title>", text, re.S).group(1)
    try:
        write_same_length(path, text.replace(f"<title>{title}</title>", f"<title><p>{title}</p></title>", 1).encode("utf-8"))
        _, page, _ = Client(base).get("nl/Start")
        assert page_title(page) == title, page_title(page)
    finally:
        write_same_length(path, original)


@test
def a_site_title_with_an_ampersand_is_saved_as_text(base):
    path = os.path.join(WORK, "data/hypha.xml")
    original = open(path, "rb").read()
    beheer = Client(base).login("beheer")
    _, form, _ = beheer.get("settings/elements")
    header = re.search(r'<editor name="siteHeader">(.*?)</editor>', form, re.S)
    footer = re.search(r'<editor name="siteFooter">(.*?)</editor>', form, re.S)
    try:
        beheer.post("settings", "settingsSaveSiteElements", "", {"siteTitle": "Raad & Daad", "siteHeader": header.group(1) if header else "", "siteFooter": footer.group(1) if footer else ""})
        _, page, _ = Client(base).get("nl/Start")
        assert page_title(page) == "Raad &amp; Daad", page_title(page)
    finally:
        write_same_length(path, original)


if __name__ == "__main__":
    sys.exit(run(sys.argv[1]))
