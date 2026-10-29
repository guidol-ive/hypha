"""The popup for a new page: Dutch labels with a capital, no instruction, page types in alphabetical order (#654)."""
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hypha import Client, run, test  # noqa: E402


def popup(text):
    script = text[text.index("function newPage()"):]
    script = script[:script.index("\n\t}\n")].replace("\\/", "/").replace('\\"', '"')
    return re.sub(r"\\u([0-9a-f]{4})", lambda m: chr(int(m.group(1), 16)), script)


@test
def the_popup_has_dutch_labels_with_a_capital(base):
    _, text, _ = Client(base).login("lotte").get("nl/Start")
    html = popup(text)
    for label in ("Maak nieuwe pagina", "<th>Soort</th>", "<th>Taal</th>", "Privépagina"):
        assert label in html, label
    assert "kies het juiste paginatype" not in html, "the instruction is still there"


@test
def the_page_types_are_in_alphabetical_order(base):
    _, text, _ = Client(base).login("lotte").get("nl/Start")
    select = re.search(r'id="newPageType"[^>]*>(.*?)</select>', popup(text), re.S).group(1)
    names = [html for html in re.findall(r"<option[^>]*>([^<]*)</option>", select)]
    assert len(names) > 2 and names == sorted(names, key=str.lower), names



@test
def the_popup_on_the_page_index_has_no_page_name(base):
    # On index/nl the popup took nl for the name of a new page, so "Maken" made the page nl/nl (#656).
    _, text, _ = Client(base).login("lotte").get("index/nl")
    field = re.search(r'id="newPagename" value="([^"]*)"', popup(text))
    assert field and field.group(1) == "", f"the popup on index/nl suggests the page name {field.group(1) if field else None!r}"


@test
def the_popup_on_a_missing_page_suggests_its_name(base):
    status, text, _ = Client(base).login("lotte").get("nl/Bestaat_nog_niet")
    field = re.search(r'id="newPagename" value="([^"]*)"', popup(text))
    assert field and field.group(1) == "Bestaat_nog_niet", field.group(1) if field else None

if __name__ == "__main__":
    sys.exit(run(sys.argv[1]))
