"""Small HTTP client for the integration tests of Hypha: a session with cookies, the CSRF token of the last page,
login as one of the fictional test users of tests/site/maak-site.php, and a minimal test registry.

Only the Python standard library is used, like docs/container/smoke_test.py.
"""
import http.cookiejar
import json
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

    def request(self, path, data=None, files=None):
        url = self.base + path.lstrip("/")
        headers = {}
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
        req = urllib.request.Request(url, data=body, headers=headers)
        started = time.monotonic()
        try:
            with self.opener.open(req, timeout=60) as response:
                status, text, location = response.status, response.read().decode("utf-8", "replace"), response.headers.get("Location")
        except urllib.error.HTTPError as error:
            status, text, location = error.code, error.read().decode("utf-8", "replace"), error.headers.get("Location")
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
        assert "logout" in self.last, f"login of {username} failed ({status})"
        return self


TESTS = []


def test(function):
    TESTS.append(function)
    return function


def run(base):
    passed = failed = 0
    started = time.monotonic()
    for function in TESTS:
        t = time.monotonic()
        try:
            function(base)
            passed += 1
            print(f"ok    {function.__name__:<70} {(time.monotonic() - t) * 1000:7.0f} ms")
        except Exception as error:  # noqa: BLE001, a test runner reports every failure
            failed += 1
            print(f"FAIL  {function.__name__}\n      {type(error).__name__}: {error}")
            traceback.print_exc(limit=3, file=sys.stdout)
    print(f"\nintegratie: {passed + failed} tests, {passed} passed, {failed} failed, {time.monotonic() - started:.1f} s")
    return 1 if failed else 0
