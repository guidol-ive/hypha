"""The user list of a privileged user: a pencil and a bin per user, the rights in the account form (#658)."""
import os
import re
import sys
import xml.etree.ElementTree as ET

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hypha import Client, run, test  # noqa: E402

WORK = os.environ.get("HYPHA_WORK", "")


def rights(username):
    for user in ET.parse(os.path.join(WORK, "data/hypha.xml")).getroot().iter("user"):
        if user.get("username") == username:
            return user.get("rights")
    return None


def save(client, username, chosen):
    _, text, _ = client.get("settings/user/" + username)
    fields = {name: value for name, value in re.findall(r'name="(settings(?:Username|Fullname|Email))"[^>]*value="([^"]*)"', text)}
    fields.update({"settingsPassword1": "", "settingsPassword2": "", "settingsUiLang": "nl", "settingsRights": chosen})
    return client.follow(client.post("settings", "settingsSaveAccount", username, fields))


@test
def the_user_list_has_a_pencil_and_a_bin(base):
    _, text, _ = Client(base).login("beheer").get("settings")
    row = re.search(r"<tr>(?:(?!</tr>).)*>sanne<(?:(?!</tr>).)*</tr>", text, re.S).group(0)
    assert 'href="settings/user/sanne"' in row and "hypha-icon-edit" in row, row
    assert "hypha-icon-remove" in row and "settingsRemove" in row, row
    for old in ("maak geprivilegieerd", "maak standaard", "reincarnate", "bewerken</", 'value="verwijderen"'):
        assert old not in row, old


@test
def the_account_form_of_a_privileged_user_has_the_rights(base):
    _, text, _ = Client(base).login("beheer").get("settings/user/sanne")
    select = re.search(r'<select name="settingsRights".*?</select>', text, re.S)
    assert select, "no field for the rights"
    for label in ("Geprivilegieerde gebruiker", "Standaardgebruiker", "Geen gebruiker"):
        assert label in select.group(0), label
    assert "<th>Rechten:</th>" in text and "<th>Gebruikersnaam:</th>" in text, "labels without a capital"


@test
def a_standard_user_does_not_see_the_rights(base):
    _, text, _ = Client(base).login("sanne").get("settings/user/sanne")
    assert "settingsRights" not in text, "a standard user can choose rights"


@test
def a_privileged_user_changes_the_rights_in_the_account_form(base):
    beheer = Client(base).login("beheer")
    try:
        save(beheer, "joris", "admin")
        assert rights("joris") == "admin", rights("joris")
        save(beheer, "joris", "exmember")
        assert rights("joris") == "exmember", rights("joris")
        save(beheer, "joris", "user")
        assert rights("joris") == "user", rights("joris")
    finally:
        if rights("joris") != "user":
            save(beheer, "joris", "user")


@test
def the_last_privileged_user_cannot_become_no_user(base):
    beheer = Client(base).login("beheer")
    _, text, _ = save(beheer, "beheer", "exmember")
    assert rights("beheer") == "admin", rights("beheer")
    assert "laatste" in text, "no message about the last privileged user"


if __name__ == "__main__":
    sys.exit(run(sys.argv[1]))
