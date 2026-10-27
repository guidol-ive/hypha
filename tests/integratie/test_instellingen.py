"""The settings of the text editor at /settings/editor (BR-47, design section 10.1): only an administrator changes
them, lists one per line, host names checked, level 2 per role; an empty form brings back the defaults."""
import os
import sys
import xml.etree.ElementTree as ET

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hypha import Client, run, test  # noqa: E402

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


if __name__ == "__main__":
    sys.exit(run(sys.argv[1]))
