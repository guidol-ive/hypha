"""The PHP messages that already occur on main (tests/bekend/meldingen.ndjson), each with the issue that will remove it.

Usage: python3 -I tests/bekend/meldingen.py
    Prints the messages, one per line, for grep -F -f in the run scripts.
"""
import json
import os

FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "meldingen.ndjson")


def messages():
    with open(FILE, encoding="utf-8") as f:
        return [json.loads(line) for line in f if line.strip()]


if __name__ == "__main__":
    for item in messages():
        print(item["message"])
