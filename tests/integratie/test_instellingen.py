"""The settings of the text editor at /settings/editor (BR-47, design section 10.1): only an administrator changes
them, lists one per line, host names checked, level 2 per role; an empty form brings back the defaults."""
import os
import sys
import xml.etree.ElementTree as ET

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hypha import Client, run, test  # noqa: E402
from test_artikel import article_xml, fields, new_article  # noqa: E402
import hypha  # noqa: E402

#
# Only the helpers of test_artikel.py, not its tests.
#
hypha.TESTS.clear()

WORK = os.environ.get("HYPHA_WORK", "")


def settings():
    return ET.parse(os.path.join(WORK, "data/hypha.xml")).getroot().find("mdeditor")


def save(client, fields):
    client.get("settings/editor")
    return client.follow(client.post("settings/editor", "mdSaveSettings", "", fields))


@test
def administrator_sees_the_settings_of_the_editor(base):
    beheer = Client(base).login("beheer")
    status, text, _ = beheer.get("settings/editor")
    assert status == 200 and 'name="mdSections"' in text and "Politiek en bestuur" in text, text[:300]


@test
def a_member_cannot_change_them(base):
    sanne = Client(base).login("sanne")
    save(sanne, {"mdSections": "Alleen dit", "mdLevel2": "on", "mdLevel2User": "on", "mdLevel2Admin": "on"})
    node = settings()
    assert node is None or [s.text for s in node.findall("section")] != ["Alleen dit"]


@test
def administrator_saves_lists_hosts_and_level_per_role(base):
    beheer = Client(base).login("beheer")
    save(beheer, {"mdSections": "Sport\nCultuur\n\nSport", "mdStatute": "Feiten gecontroleerd.", "mdFrameHosts": "player.vimeo.com\nniet goed!\nWWW.YOUTUBE-NOCOOKIE.COM",
                  "mdPeertubeHosts": "", "mdScriptHosts": "cdn.jsdelivr.net", "mdLevel2": "on", "mdLevel2Admin": "on"})
    node = settings()
    assert [s.text for s in node.findall("section")] == ["Sport", "Cultuur"]
    assert [s.text for s in node.findall("frameHost")] == ["player.vimeo.com", "www.youtube-nocookie.com"]
    assert node.findall("peertubeHost") == [] and node.get("level2") == "on" and node.get("level2Off") == "user"
    _, text, _ = beheer.get("settings/editor")
    assert "Sport" in text and "Cultuur" in text


@test
def an_empty_form_brings_back_the_defaults(base):
    beheer = Client(base).login("beheer")
    save(beheer, {"mdSections": "", "mdStatute": "", "mdFrameHosts": "", "mdPeertubeHosts": "", "mdScriptHosts": "",
                  "mdLevel2": "on", "mdLevel2User": "on", "mdLevel2Admin": "on"})
    node = settings()
    assert node.findall("section") == [] and node.get("level2Off") == ""
    _, text, _ = beheer.get("settings/editor")
    assert "Politiek en bestuur" in text



@test
def an_article_keeps_its_level_when_a_member_without_level_2_saves_it(base):
    import json
    sanne = Client(base).login("sanne")
    new_article(sanne, "Niveau van het artikel")
    path, name = "nl/niveau-van-het-artikel", "niveau-van-het-artikel"
    block = "%% beschrijving: proef %%\n```html interactief\n<p>Proef</p>\n```\n"

    def post(text):
        status, body, _ = sanne.post(path + "/edit", "md_save", "", {"md_fields": json.dumps(fields(title="Niveau van het artikel", text=text)), "md_renders": "{}", "ajax": "1"})
        return json.loads(body)
    assert post("Eerste versie.\n\n" + block)["ok"]
    beheer = Client(base).login("beheer")
    save(beheer, {"mdLevel2": "on", "mdLevel2Admin": "on"})
    result = post("Tweede versie, het blok blijft.\n\n" + block)
    assert result["ok"], result
    text = ET.tostring(article_xml(name).find("article/content/text"), encoding="unicode")
    assert "<iframe" in text and "Tweede versie" in text, "level 2 lost: " + text[:300]
    result = post("Derde versie.\n\n" + block.replace("Proef", "Anders"))
    assert not result["ok"] and result["errors"], result
    save(beheer, {"mdLevel2": "on", "mdLevel2User": "on", "mdLevel2Admin": "on"})

if __name__ == "__main__":
    sys.exit(run(sys.argv[1]))
