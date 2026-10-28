"""Known bugs in the use of HTTP (RFC 9110)."""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "integratie"))
from hypha import Client, known_bug, run  # noqa: E402


@known_bug(579)
def a_method_that_hypha_does_not_support_gets_405_with_allow(base):
    client = Client(base)
    status, _text, _location = client.request("nl/Start", method="PUT")
    assert status == 405, f"PUT gave {status}"
    assert client.headers.get("Allow"), "no Allow header"


if __name__ == "__main__":
    sys.exit(run(sys.argv[1]))
