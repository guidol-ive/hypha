"""Keep the texts of the Markdown editor in system/languages/nl.php and en.php (I18N-001, I18N-005).

The texts are in tools/teksten.tsv: key, Dutch, English, separated by tabs. This script writes them as one block,
between the marker comments, at the end of the $LANG array of both dictionaries. Development machine only.

Usage: python3 -I tools/teksten.py
"""
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
START = "\t\t// Markdown editor (issue #520), kept with tools/teksten.py\n"
END = "\t\t// End of the Markdown editor\n"


def php(value):
    return '"' + value.replace("\\", "\\\\").replace('"', '\\"').replace("$", "\\$") + '"'


rows = []
for line in (ROOT / "tools/teksten.tsv").read_text(encoding="utf-8").splitlines():
    if not line.strip() or line.startswith("#"):
        continue
    key, nl, en = line.split("\t")
    rows.append((key, nl, en))
keys = [r[0] for r in rows]
assert len(keys) == len(set(keys)), "double key"
for column, language in ((1, "nl"), (2, "en")):
    path = ROOT / f"system/languages/{language}.php"
    text = path.read_text(encoding="utf-8")
    text = re.sub(re.escape(START) + r"[\s\S]*?" + re.escape(END), "", text)
    existing = set(re.findall(r'^\s*"([^"]+)"\s*=>', text, re.M))
    clash = existing & set(keys)
    assert not clash, f"keys already in {language}.php: {sorted(clash)}"
    block = START + "".join(f"\t\t{php(r[0])} => {php(r[column])},\n" for r in rows) + END
    index = text.rindex("\t);")
    text = text[:index] + block + text[index:]
    path.write_text(text, encoding="utf-8")
print(f"{len(rows)} texts in nl.php and en.php")
