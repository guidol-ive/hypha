"""The fictional test site runs: home page anonymous and logged in, and refused files."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hypha import Client, run, test  # noqa: E402


@test
def home_anonymous(base):
    status, text, _ = Client(base).get("nl/Start")
    assert status == 200, status
    assert "proefsite van Eemstad" in text


@test
def login_as_author(base):
    client = Client(base).login("sanne")
    assert "Sanne de Vries" in client.last or "logout" in client.last


@test
def data_is_refused(base):
    status, _, _ = Client(base).get("data/hypha.xml")
    assert status in (403, 404), status


if __name__ == "__main__":
    sys.exit(run(sys.argv[1]))
