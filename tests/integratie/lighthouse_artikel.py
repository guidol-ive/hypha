"""Makes a published article with the sample text (diagram, formula, callouts) on a running test site, for Lighthouse
(task T12), and prints its address. Usage: python3 -I tests/integratie/lighthouse_artikel.py <base url>"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hypha import Client  # noqa: E402
from test_artikel import FIXTURES, command, fields, save  # noqa: E402

base = sys.argv[1]
sanne = Client(base).login("sanne")
title = "Lighthouse proef " + str(os.getpid())
_, _, location = sanne.post("nl/Start", "mdNewArticle", title, {"newPageLanguage": "nl"})
path = location.split("?")[0].replace(base.rstrip("/") + "/", "").removesuffix("/edit")
text = open(os.path.join(os.path.dirname(__file__), "../markdown/data/start.md"), encoding="utf-8").read()
f = FIXTURES["formulas"][7]
d = FIXTURES["diagrams"][0]
text = text.replace("![Bram Hoekstra in de raadszaal](beeld/hoekstra-raadszaal.jpg){.in-de-tekst}\n*Bram Hoekstra tijdens zijn laatste raadsvergadering. Foto (naam fotograaf)*\n\n", "")
result = save(sanne, path, fields(title=title, text=text), {"svg": {d["sha256"]: d["svg"]}, "math": {f["sha256"]: f["inline"]}})
assert result["ok"], result
command(sanne, path, "status_change_review")
for name in ("ahmed", "lotte", "joris"):
    command(Client(base).login(name), path, "approve", {"md_statute[]": list(range(5))})
command(sanne, path, "status_change_published")
print(base.rstrip("/") + "/" + path)
