"""Security headers on every response (#432): the basic three, Cross-Origin-Opener-Policy and a first CSP."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hypha import Client, run, test  # noqa: E402


@test
def a_page_has_the_security_headers(base):
    client = Client(base)
    status, _, _ = client.get("nl/Start")
    assert status == 200, status
    headers = client.headers
    assert headers.get("X-Content-Type-Options") == "nosniff", headers.get("X-Content-Type-Options")
    assert headers.get("Referrer-Policy") == "strict-origin-when-cross-origin", headers.get("Referrer-Policy")
    assert headers.get("Cross-Origin-Opener-Policy") == "same-origin", headers.get("Cross-Origin-Opener-Policy")
    csp = headers.get("Content-Security-Policy") or ""
    assert "frame-ancestors 'self'" in csp and "object-src 'none'" in csp, csp


if __name__ == "__main__":
    sys.exit(run(sys.argv[1]))
