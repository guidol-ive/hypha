"""A text page in the new editor: versions, differences, translation and revert (design part 22, decision 19)."""
import json
import os
import re
import sys
import time
import xml.etree.ElementTree as ET

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hypha import Client, run, test  # noqa: E402
from hypha import TESTS  # noqa: E402
from test_artikel import FIXTURES, WORK, config, page_node  # noqa: E402

TESTS.clear()

STATE = {}
XMLID = "{http://www.w3.org/XML/1998/namespace}id"


def page_xml(name, language="nl"):
    return ET.parse(os.path.join(WORK, "data/pages", page_node(name, language).get("id"))).getroot()


def save(client, path, view, f, renders=None):
    status, text, _ = client.post(f"{path}/{view}", "md_save", "", {"md_fields": json.dumps(f), "md_renders": json.dumps(renders or {}), "ajax": "1"})
    assert status == 200, (status, text[:300])
    return json.loads(text)


def text_of(version):
    d = FIXTURES["diagrams"][2]
    return f"Versie {version} van de pagina over de raad.\n\n%% beschrijving: zetels %%\n```mermaid\n{d['text']}```\n"


@test
def new_text_page_opens_in_the_new_editor(base):
    sanne = Client(base).login("sanne")
    status, _, location = sanne.post("nl/Start", "newPage", "Over de raad", {"newPageType": "textpage", "newPageLanguage": "nl"})
    assert location.endswith("nl/Over_de_raad/edit"), location
    c = config(sanne, "nl/Over_de_raad/edit")
    assert c["kind"] == "page" and c["fields"]["title"] == "Over de raad" and c["fields"]["text"] == ""
    STATE["sanne"] = sanne


@test
def three_versions_with_the_same_time_stamp_for_source_and_xhtml(base):
    sanne = STATE["sanne"]
    d = FIXTURES["diagrams"][2]
    for v in (1, 2, 3):
        r = save(sanne, "nl/Over_de_raad", "edit", {"title": "Over de raad", "text": text_of(v), "private": False}, {"svg": {d["sha256"]: d["svg"]}})
        assert r["ok"], r
    root = page_xml("Over_de_raad")
    assert root.get("format") == "markdown"
    content = [v.get(XMLID) for v in root.find("language").findall("version")]
    source = [v.get("at") for v in root.find("source/language").findall("version")]
    assert len(content) == 3 and content == source, (content, source)
    STATE["versions"] = sorted(content)


@test
def reading_view_keeps_svg_names(base):
    status, text, _ = Client(base).get("nl/Over_de_raad")
    assert status == 200 and "Versie 3" in text and "viewBox=" in text


@test
def older_version_for_members(base):
    sanne = STATE["sanne"]
    sanne.get("nl/Over_de_raad")
    _, text, _ = sanne.post("nl/Over_de_raad", "", "", {"version": STATE["versions"][0]})
    assert "Versie 1" in text and "Versie 3" not in text, text[:200]


@test
def revert_brings_back_xhtml_and_markdown_together(base):
    sanne = STATE["sanne"]
    sanne.get("nl/Over_de_raad")
    sanne.post("nl/Over_de_raad/revert", "revert", "", {"version": STATE["versions"][0]})
    root = page_xml("Over_de_raad")
    assert len(root.find("language").findall("version")) == 4
    assert config(sanne, "nl/Over_de_raad/edit")["fields"]["text"] == text_of(1)
    _, text, _ = Client(base).get("nl/Over_de_raad")
    assert "Versie 1" in text


@test
def translate_to_english(base):
    sanne = STATE["sanne"]
    c = config(sanne, "nl/Over_de_raad/translate")
    assert c["translate"] and "nl" not in c["languages"]
    r = save(sanne, "nl/Over_de_raad", "translate", {"title": "About the council", "language": "en", "text": "Version 1 in English."})
    assert r["ok"] and r["url"].endswith("en/About_the_council"), r
    status, text, _ = Client(base).get("en/About_the_council")
    assert status == 200 and "Version 1 in English." in text
    assert "Versie 1" in Client(base).get("nl/Over_de_raad")[1]


@test
def rename_and_private_through_the_editor(base):
    sanne = STATE["sanne"]
    r = save(sanne, "nl/Over_de_raad", "edit", {"title": "De raad", "text": text_of(5), "private": True})
    assert r["ok"] and r["url"].endswith("nl/De_raad"), r
    assert page_node("De_raad").get("private") == "on"
    assert Client(base).get("nl/De_raad")[0] == 404


@test
def old_text_page_stays_in_wymeditor_and_unchanged(base):
    beheer = Client(base).login("beheer")
    before = open(os.path.join(WORK, "data/pages/home00000001"), encoding="utf-8").read()
    status, text, _ = beheer.get("nl/Start/edit")
    assert status == 200 and "wymeditor" in text and "mdeConfig" not in text
    assert open(os.path.join(WORK, "data/pages/home00000001"), encoding="utf-8").read() == before


if __name__ == "__main__":
    sys.exit(run(sys.argv[1]))
