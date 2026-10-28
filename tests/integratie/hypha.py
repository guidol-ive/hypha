"""Small HTTP client for the integration tests of Hypha: a session with cookies, the CSRF token of the last page,
login as one of the fictional test users of tests/site/maak-site.php, and a minimal test registry.

Only the Python standard library is used, like docs/container/smoke_test.py.
"""
import http.cookiejar
import json
import os
import re
import sys
import time
import traceback
import urllib.error
import urllib.parse
import urllib.request

PASSWORD = "proef-wachtwoord-520"


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


class Client:
    def __init__(self, base):
        self.base = base.rstrip("/") + "/"
        self.jar = http.cookiejar.CookieJar()
        self.opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.jar), NoRedirect)
        self.csrf = None
        self.last = ""

    def request(self, path, data=None, files=None, method=None, headers=None):
        url = self.base + path.lstrip("/")
        headers = dict(headers or {})
        body = None
        if files:
            boundary = "----hyphatest" + str(int(time.time() * 1000))
            parts = []
            for key, value in (data or {}).items():
                parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{key}"\r\n\r\n{value}\r\n'.encode())
            for key, (name, content, kind) in files.items():
                parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{key}"; filename="{name}"\r\nContent-Type: {kind}\r\n\r\n'.encode() + content + b"\r\n")
            parts.append(f"--{boundary}--\r\n".encode())
            body = b"".join(parts)
            headers["Content-Type"] = "multipart/form-data; boundary=" + boundary
        elif data is not None:
            body = urllib.parse.urlencode(data, doseq=True).encode()
            headers["Content-Type"] = "application/x-www-form-urlencoded"
        req = urllib.request.Request(url, data=body, headers=headers, method=method)
        started = time.monotonic()
        try:
            with self.opener.open(req, timeout=60) as response:
                status, text, location = response.status, response.read().decode("utf-8", "replace"), response.headers.get("Location")
                self.headers = response.headers
        except urllib.error.HTTPError as error:
            status, text, location = error.code, error.read().decode("utf-8", "replace"), error.headers.get("Location")
            self.headers = error.headers
        self.elapsed = time.monotonic() - started
        match = re.search(r'name="csrfToken"[^>]*value="([^"]+)"', text) or re.search(r'value="([^"]+)"[^>]*name="csrfToken"', text)
        if match:
            self.csrf = match.group(1)
        self.last = text
        return status, text, location

    def get(self, path):
        return self.request(path)

    def post(self, path, command, argument="", fields=None, files=None):
        if not self.csrf:
            self.get(path)
        if not self.csrf:
            # A site with the page cache of PR #518 has no token in an anonymous page: fetch it, as hypha() does.
            _, text, _ = self.request("csrf-token", {})
            try:
                self.csrf = json.loads(text)["token"]
            except (ValueError, KeyError, TypeError):
                pass
        data = {"command": command, "argument": argument, "csrfToken": self.csrf}
        data.update(fields or {})
        return self.request(path, data, files)

    def follow(self, result):
        status, text, location = result
        if status in (301, 302, 303) and location:
            return self.get(location.replace(self.base, ""))
        return result

    def login(self, username):
        self.get("nl/Start")
        status, _text, _location = self.post("nl/Start", "login", fields={"loginUsername": username, "loginPassword": PASSWORD})
        self.get("nl/Start")
        #
        # Not an assert: a failed login is a broken test, also inside a known-bug test.
        #
        if "logout" not in self.last:
            raise RuntimeError(f"login of {username} failed ({status})")
        return self



def write_same_length(path, data):
    """Write a file of the work folder that the running site reads.

    Docker Desktop shows the container a changed file a moment later with its old length, which cuts a longer file
    short; so the new content gets exactly the length of the old, with spaces of the indentation taken away or spaces
    added at the end.
    """
    length = os.path.getsize(path)
    while len(data) > length:
        if b"\n  " not in data:
            raise RuntimeError(f"cannot shorten {path}")
        data = data.replace(b"\n  ", b"\n ", 1)
    data += b" " * (length - len(data))
    with open(path, "r+b") as f:
        f.write(data)
        f.truncate()


TESTS = []


def test(function):
    TESTS.append(function)
    return function


def known_bug(issue):
    """A test of a known bug: it states the behaviour as it should be, and is expected to fail on an assertion until
    issue #issue is solved (tests/bekend/fouten.ndjson). A pass means the issue is probably solved; any other error
    means the test itself is broken."""
    def register(function):
        function.known_bug = issue
        TESTS.append(function)
        return function
    return register


def run(base):
    passed = failed = known = 0
    fixed = []
    started = time.monotonic()
    for function in TESTS:
        t = time.monotonic()
        issue = getattr(function, "known_bug", None)
        try:
            function(base)
            if issue:
                fixed.append(issue)
                print(f"FIXED? #{issue:<5} {function.__name__}: passes, so issue #{issue} is probably solved")
            else:
                passed += 1
                print(f"ok    {function.__name__:<70} {(time.monotonic() - t) * 1000:7.0f} ms")
        except AssertionError as error:
            if issue:
                known += 1
                print(f"known #{issue:<5} {function.__name__}: {str(error)[:120]}")
            else:
                failed += 1
                print(f"FAIL  {function.__name__}\n      AssertionError: {error}")
                traceback.print_exc(limit=3, file=sys.stdout)
        except Exception as error:  # noqa: BLE001, a test runner reports every failure
            failed += 1
            print(f"FAIL  {function.__name__}{f' (known bug #{issue}, but not an assertion)' if issue else ''}\n      {type(error).__name__}: {error}")
            traceback.print_exc(limit=3, file=sys.stdout)
    extra = f", {known} known bugs, {len(fixed)} fixed? ({' '.join('#' + str(n) for n in fixed)})" if known or fixed else ""
    print(f"\nintegratie: {passed + failed + known + len(fixed)} tests, {passed} passed, {failed} failed{extra}, {time.monotonic() - started:.1f} s")
    return 1 if failed or fixed else 0
