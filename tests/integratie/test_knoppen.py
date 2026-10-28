"""One order for the buttons of a form: cancel first, the main action last (#647)."""
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hypha import Client, run, test  # noqa: E402


def order(text, first, last):
    commands = re.search(r'id="pageCommands"[^>]*>(.*?)</div>', text, re.S)
    assert commands, "no pageCommands"
    commands = commands.group(1)
    assert first in commands and last in commands, commands[:400]
    return commands.index(first) < commands.index(last)


@test
def editing_a_text_page_shows_cancel_before_save(base):
    _, text, _ = Client(base).login("beheer").get("nl/Start/edit")
    assert order(text, "annuleren", "opslaan"), "save comes before cancel"


@test
def the_settings_show_cancel_before_save(base):
    _, text, _ = Client(base).login("beheer").get("settings/hypha")
    assert order(text, "annuleren", "opslaan"), "save comes before cancel"


if __name__ == "__main__":
    sys.exit(run(sys.argv[1]))
