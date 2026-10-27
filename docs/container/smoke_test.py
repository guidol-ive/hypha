#!/usr/bin/env python3
"""Anonymous smoke test of a running Hypha site.

Requests every page in data/hypha.xml in every language it has, plus a few fixed URLs, and
reports the HTTP status of each. Combine it with the PHP log of the container to find the
warnings and fatal errors behind a status 500:

    python3 -I docs/container/smoke_test.py http://localhost:8086 hypha-data/hypha.xml
    podman logs hypha 2>&1 | grep 'PHP ' | cut -c40- | sort | uniq -c | sort -rn

Only the Python standard library is used. Nothing is written to the site: every request is a
GET without a session cookie.
"""
import collections
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

FIXED_PATHS = ["", "index/nl", "index/en", "settings", "hypha.php", "data/hypha.xml",
               "system/core/base.php", "system/assets/help.js", "no-such-page-xyz"]


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


def fetch(opener, url):
    started = time.monotonic()
    try:
        with opener.open(url, timeout=60) as response:
            body = response.read()
            status = response.status
    except urllib.error.HTTPError as error:
        body = error.read()
        status = error.code
    except Exception as error:  # noqa: BLE001, a smoke test reports every failure
        return ("ERR " + type(error).__name__, 0, time.monotonic() - started, b"")
    return (status, len(body), time.monotonic() - started, body)


def main():
    if len(sys.argv) != 3:
        sys.exit("usage: smoke_test.py <base url> <path to hypha.xml>")
    base = sys.argv[1].rstrip("/") + "/"
    root = ET.parse(sys.argv[2]).getroot()
    paths = list(FIXED_PATHS)
    private = set()
    for page in root.find("pageList"):
        for language in page.findall("language"):
            path = language.get("id") + "/" + urllib.parse.quote(language.get("name"))
            paths.append(path)
            if page.get("private") == "on":
                private.add(path)

    opener = urllib.request.build_opener(NoRedirect)
    statuses = collections.Counter()
    failures = []
    slowest = []
    for number, path in enumerate(paths, 1):
        status, size, seconds, body = fetch(opener, base + path)
        statuses[status] += 1
        slowest.append((seconds, path))
        if status not in (200, 302, 303, 403, 404) or b"Fatal error" in body:
            failures.append((status, path))
        if number % 200 == 0:
            print(f"... {number}/{len(paths)}", file=sys.stderr)

    print(f"Requests: {len(paths)} ({len(private)} private pages)")
    for status, count in sorted(statuses.items(), key=lambda item: str(item[0])):
        print(f"  status {status}: {count}")
    print(f"Failures: {len(failures)}")
    for status, path in failures[:50]:
        print(f"  {status} /{path}")
    slowest.sort(reverse=True)
    total = sum(seconds for seconds, _ in slowest)
    print(f"Total time {total:.1f} s, mean {total / len(paths) * 1000:.0f} ms per request")
    for seconds, path in slowest[:5]:
        print(f"  {seconds * 1000:.0f} ms /{path}")
    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()
