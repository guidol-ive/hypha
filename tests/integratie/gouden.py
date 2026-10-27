"""Every page of the golden dataset over HTTP: anonymous (public pages 200, private ones 404, withdrawn articles 200
with their notice) and as a member (every page 200), the edit view of a sample (new editor for Markdown, WYMeditor for
old HTML), and the time of each request (median and slowest)."""
import os
import statistics
import sys
import time
import xml.etree.ElementTree as ET

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hypha import Client  # noqa: E402


def main(base, hypha_xml, sample):
    pages = [(p.get("id"), p.get("type"), p.get("private"), p.get("retracted"), p.find("language").get("name")) for p in ET.parse(hypha_xml).getroot().find("pageList")]
    pages = [p for p in pages if p[0].startswith("gold")]
    anonymous, member = Client(base), Client(base).login("joris")
    failed, times = [], []
    for i, (pid, kind, private, retracted, name) in enumerate(pages):
        t = time.monotonic()
        status, text, _ = anonymous.get("nl/" + name)
        times.append(time.monotonic() - t)
        expected = 404 if private == "on" else 200
        if status != expected or "Fatal error" in text or (retracted == "on" and 'class="retracted"' not in text):
            failed.append(f"anonymous {name}: {status}")
        if i % max(1, len(pages) // sample) == 0:
            status, text, _ = member.get("nl/" + name)
            if status != 200 or "Fatal error" in text:
                failed.append(f"member {name}: {status}")
            status, text, _ = member.get("nl/" + name + "/edit")
            markdown = "mdeConfig" in text
            old = name.startswith(("artikel", "pagina")) and int(name.split("-")[1]) % 10 >= 7
            if retracted != "on" and (status != 200 or markdown == old):
                failed.append(f"edit {name}: {status} {'new' if markdown else 'old'} editor")
    print(f"gouden: {len(pages)} pages, {len(failed)} failed; anonymous median {statistics.median(times) * 1000:.0f} ms, slowest {max(times) * 1000:.0f} ms")
    for f in failed[:20]:
        print("FAIL  " + f)
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 200))
