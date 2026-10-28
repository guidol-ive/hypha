"""One name for each kind of account (#650): privileged user, standard user, no user; system user for hypha.php."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hypha import Client, run, test  # noqa: E402


@test
def the_account_form_names_the_privileged_user(base):
    _, text, _ = Client(base).login("beheer").get("settings/user/sanne")
    assert "Geprivilegieerde gebruiker" in text, "no privileged user in the rights of the account form"
    assert "ontadmin" not in text and ">admin<" not in text, "old name admin in the account form"


@test
def the_last_privileged_user_cannot_become_a_standard_user(base):
    beheer = Client(base).login("beheer")
    _, text, _ = beheer.follow(beheer.post("settings", "settingsUnadmin", "beheer"))
    assert "laatste geprivilegieerde gebruiker" in text, "no message that this is the last privileged user"


if __name__ == "__main__":
    sys.exit(run(sys.argv[1]))
