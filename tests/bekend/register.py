"""The register of known-bug tests (tests/bekend/fouten.ndjson): one JSON object per line, one line per test.

    {"issue": 541, "runner": "integratie", "file": "tests/bekend/test_routering.py", "test": "...",
     "title": "short description of the expected behaviour", "since": "2026-10-28"}

A known-bug test states the behaviour as it should be and fails on an assertion until its issue is solved; then it
passes ("FIXED?") and the run fails, so the issue can be closed and the test moved to the ordinary tests.

Usage: python3 -I tests/bekend/register.py [--github]
    Checks that every known_bug / knownBug in tests/bekend is in the register and the other way round; with --github
    also that every issue is still open on PlanBCode/hypha.
"""
import glob
import json
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
REGISTER = os.path.join(ROOT, "fouten.ndjson")
RUNNERS = {"integratie", "php", "browser"}
FIELDS = {"issue", "runner", "file", "test", "title", "since"}


def entries():
    #
    # fouten.ndjson, plus fouten-<area>.ndjson while tests of several areas are written at the same time.
    #
    items = []
    for path in sorted(glob.glob(os.path.join(ROOT, "fouten*.ndjson"))):
        with open(path, encoding="utf-8") as f:
            items += [json.loads(line) for line in f if line.strip()]
    return items


def declared():
    """(issue, runner, file, test) for every known-bug test in the code."""
    found = set()
    repo = os.path.dirname(os.path.dirname(ROOT))
    for path in sorted(p for p in glob.glob(os.path.join(ROOT, "**", "*.*"), recursive=True) if p.endswith((".py", ".php", ".mjs"))):
        rel = os.path.relpath(path, repo)
        text = open(path, encoding="utf-8").read()
        if path.endswith(".py"):
            for m in re.finditer(r"@known_bug\((\d+)\)\s*\ndef (\w+)", text):
                found.add((int(m.group(1)), "integratie", rel, m.group(2)))
        elif path.endswith(".php"):
            for m in re.finditer(r"known_bug\((\d+),\s*'((?:[^'\\]|\\.)*)'", text):
                found.add((int(m.group(1)), "php", rel, m.group(2).replace("\\'", "'")))
        elif path.endswith(".mjs"):
            for m in re.finditer(r"knownBug\((\d+),\s*'((?:[^'\\]|\\.)*)'", text):
                found.add((int(m.group(1)), "browser", rel, m.group(2).replace("\\'", "'")))
    return found


def check(github=False):
    problems = []
    items = entries()
    for i, e in enumerate(items, 1):
        if set(e) - FIELDS - {"note"} or not FIELDS <= set(e):
            problems.append(f"line {i}: fields {sorted(e)}, expected {sorted(FIELDS)} (and optionally note)")
        if e.get("runner") not in RUNNERS:
            problems.append(f"line {i}: unknown runner {e.get('runner')}")
    registered = {(e["issue"], e["runner"], e["file"], e["test"]) for e in items}
    code = declared()
    for missing in sorted(code - registered):
        problems.append(f"not in the register: #{missing[0]} {missing[2]} {missing[3]}")
    for missing in sorted(registered - code):
        problems.append(f"in the register but not in the code: #{missing[0]} {missing[2]} {missing[3]}")
    if github:
        for issue in sorted({e["issue"] for e in items}):
            state = subprocess.run(["gh", "issue", "view", str(issue), "-R", "PlanBCode/hypha", "--json", "state", "-q", ".state"], capture_output=True, text=True).stdout.strip()
            if state != "OPEN":
                problems.append(f"#{issue} is {state or 'unknown'} on GitHub: move its tests to the ordinary tests or remove them")
    issues = sorted({e["issue"] for e in items})
    print(f"register: {len(items)} known-bug tests for {len(issues)} issues" + ("" if not problems else f", {len(problems)} problems"))
    for p in problems:
        print("   " + p)
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(check("--github" in sys.argv))
