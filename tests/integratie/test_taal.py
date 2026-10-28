"""Dutch texts of the page index and the logged-in line (#652)."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hypha import Client, run, test  # noqa: E402


@test
def the_page_index_has_a_dutch_heading(base):
    _, text, _ = Client(base).login("lotte").get("index/nl")
    assert "Pagina-index: " in text, "the page index shows no Dutch heading"
    assert "page-index" not in text, "the page index shows the key page-index"


@test
def the_command_bar_says_aangemeld(base):
    _, text, _ = Client(base).login("lotte").get("nl/Start")
    assert "Aangemeld als `lotte`" in text, "no 'Aangemeld als' in the command bar"
    assert "ingelogd" not in text, "'ingelogd' still on the page"


if __name__ == "__main__":
    sys.exit(run(sys.argv[1]))
