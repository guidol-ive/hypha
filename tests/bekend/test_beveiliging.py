"""Known security bugs of Hypha (area beveiliging): the installer/maintenance script hypha.php, login, sessions,
CSRF, keys and configuration. Every test states the behaviour as it should be and fails on an assertion until the
matching open issue of PlanBCode/hypha is solved. See tests/bekend/fouten-beveiliging.ndjson.
"""
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "integratie"))
from hypha import Client, known_bug, run, test  # noqa: E402

WORK = os.environ.get("HYPHA_WORK", "")
MAILLOG = os.path.join(WORK, "data", "mail.log")
HYPHAXML = os.path.join(WORK, "data", "hypha.xml")


def write_hypha_xml(text):
    #
    # Replace data/hypha.xml atomically, so the running server never reads a half-written file (a bind mount can
    # otherwise show the truncated state during a plain write).
    #
    tmp = HYPHAXML + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        f.write(text)
    os.replace(tmp, HYPHAXML)


def cookie(client, name):
    for c in client.jar:
        if c.name == name:
            return c.value
    return None


def last_register_key():
    """The key of the most recent settings/register/<key> link that reached the captured mail."""
    text = open(MAILLOG, encoding="utf-8", errors="replace").read() if os.path.exists(MAILLOG) else ""
    keys = re.findall(r"settings/register/([^\"<\s/]+)", text)
    return keys[-1] if keys else None


def last_recovery_host():
    """The host of the most recent recovery/register link in the captured mail."""
    text = open(MAILLOG, encoding="utf-8", errors="replace").read() if os.path.exists(MAILLOG) else ""
    hosts = re.findall(r'href="https?://([^/"]+)/settings/register/', text)
    return hosts[-1] if hosts else None


# ---------------------------------------------------------------------------
# Mails built from the client Host header instead of a configured site address (#418). This test configures a site
# address in data/hypha.xml and reads the captured mail, so it runs before the hypha.php tests below, which leave the
# site unable to serve a page after the attribute is added.
# ---------------------------------------------------------------------------


@known_bug(418)
def a_recovery_mail_link_uses_the_configured_site_address(base):
    #
    # Absolute links in recovery mails are built from the request host instead of a configured site address. With a
    # site address set in hypha.xml, the mail must use it, so a request on another host name cannot steer the link.
    #
    xml = open(HYPHAXML, encoding="utf-8").read()
    if "baseUrl=" not in xml:
        write_hypha_xml(xml.replace("<hypha ", '<hypha baseUrl="https://echt.eemstad.example/" ', 1))
    try:
        client = Client(base)
        for _ in range(20):
            client.get("nl/Start")
            if client.csrf:
                break
            time.sleep(0.1)
        client.request("nl/Start", {"command": "reregister", "argument": "joris", "csrfToken": client.csrf})
        host = last_recovery_host()
        assert host == "echt.eemstad.example", f"recovery link host is {host!r}, not the configured site address"
    finally:
        write_hypha_xml(open(HYPHAXML, encoding="utf-8").read().replace(' baseUrl="https://echt.eemstad.example/"', "", 1))


# ---------------------------------------------------------------------------
# hypha.php: the installer / maintenance / builder script in the web root.
# ---------------------------------------------------------------------------


@known_bug(413)
def the_builder_does_not_embed_the_hypha_php_source(base):
    #
    # The build command turns every build_<name> field into <name>.php and embeds that file. A crafted field
    # (build_hypha) must not be able to embed hypha.php, which holds the maintenance credentials in clear text.
    #
    client = Client(base)
    status, text, _ = client.request("hypha.php", {"command": "build", "build_hypha": "on"})
    assert status == 200, f"build request gave {status}"
    assert "case 'hypha.php':" not in text, "the downloaded script embeds hypha.php (credentials leak)"


@known_bug(414)
def an_empty_maintenance_login_is_refused(base):
    #
    # hypha.php ships with an empty superuser name and password. A login with empty values must not be accepted,
    # otherwise anyone opens the maintenance tools on a git checkout.
    #
    client = Client(base)
    status, text, _ = client.request("hypha.php?maintenance", {"command": "login", "username": "", "password": ""})
    assert "hypha superuser login" in text, f"empty credentials opened the maintenance tools ({status})"


@known_bug(415)
def the_maintenance_form_carries_a_csrf_token(base):
    #
    # The maintenance tools add and remove files but carry no CSRF token, so another site can drive them through a
    # logged-in superuser. The form must contain a token field.
    #
    client = Client(base)
    client.request("hypha.php?maintenance", {"command": "login", "username": "", "password": ""})
    status, text, _ = client.request("hypha.php?maintenance")
    assert 'name="token"' in text, f"the maintenance form has no CSRF token field ({status})"


# ---------------------------------------------------------------------------
# Mails: key strength (#425).
# ---------------------------------------------------------------------------


@known_bug(425)
def a_recovery_key_is_unguessable(base):
    #
    # Recovery keys have only 64 bits (16 hex characters). They should be 128 bits (32 hex characters) from a
    # cryptographic random source.
    #
    client = Client(base)
    client.get("nl/Start")
    client.request("nl/Start", {"command": "reregister", "argument": "lotte", "csrfToken": client.csrf})
    key = last_register_key()
    assert key and re.fullmatch(r"[0-9a-f]{32}", key), f"recovery key {key!r} is not 128 bits of hex"


@known_bug(425)
def an_invitation_key_is_unguessable(base):
    #
    # Invitation keys come from uniqid(rand(), true), which is derived from the clock and a weak random number.
    # They should be 128 bits (32 hex characters) from a cryptographic random source.
    #
    beheer = Client(base).login("beheer")
    beheer.get("settings/invite")
    beheer.follow(beheer.post("settings", "settingsInvite", "", {"inviteEmail": "nieuwe-deelnemer-425@eemstad.example", "inviteWelcome": "Welkom"}))
    key = last_register_key()
    assert key and re.fullmatch(r"[0-9a-f]{32}", key), f"invitation key {key!r} is not 128 bits of hex"


# ---------------------------------------------------------------------------
# CSRF (#420, #434) and authorisation (#421, #422).
# ---------------------------------------------------------------------------


@known_bug(420)
def an_invalid_csrf_token_stops_a_datatype_save(base):
    #
    # A failed CSRF check shows an error but does not stop the request, so datatype commands (saving a page) still
    # run. A save with a wrong token must leave the page unchanged.
    #
    sanne = Client(base).login("sanne")
    sanne.post("nl/Start", "newPage", "Csrf proef", {"newPageType": "textpage", "newPageLanguage": "nl"})
    sanne.get("nl/Csrf_proef/edit")
    sanne.post("nl/Csrf_proef/edit", "edit", "", {"textPagename": "Csrf proef", "textContent": "GEWIJZIGD zonder geldig token.", "textPrivate": "", "csrfToken": "ongeldig-token"})
    _, text, _ = Client(base).get("nl/Csrf_proef")
    assert "GEWIJZIGD" not in text, "a page save with an invalid CSRF token still changed the page"


# Was a known bug of #421; fixed in main by #501, retested on 2026-10-28.
@test
def an_anonymous_visitor_cannot_tag_a_page(base):
    #
    # tagSelect adds a tag to a page but does not check login, so an anonymous visitor can change the tagging of any
    # page. It must be refused with 403.
    #
    client = Client(base)
    client.get("nl/Start")
    status, _, _ = client.request("nl/Start", {"command": "tagSelect", "argument": "tag1", "csrfToken": client.csrf})
    assert status == 403, f"anonymous tagSelect gave {status}, not 403"


# Was a known bug of #421; fixed in main by #501, retested on 2026-10-28.
@test
def an_anonymous_visitor_cannot_create_a_tag(base):
    #
    # tagNew creates a site-wide tag but does not check login. It must be refused with 403.
    #
    client = Client(base)
    client.get("nl/Start")
    status, _, _ = client.request("nl/Start", {"command": "tagNew", "argument": json.dumps({"name": "AnoniemeTag", "description": "x"}), "csrfToken": client.csrf})
    assert status == 403, f"anonymous tagNew gave {status}, not 403"


@known_bug(422)
def a_page_with_an_unknown_type_does_not_break(base):
    #
    # The type of a new page is stored and later instantiated as a class without validation, so a bogus type turns
    # every visit of the page into a fatal error. Creating such a page must not lead to a server error.
    #
    sanne = Client(base).login("sanne")
    sanne.post("nl/Start", "newPage", "Onbekend type proef", {"newPageType": "DOMDocument", "newPageLanguage": "nl"})
    status, _, _ = Client(base).get("nl/Onbekend_type_proef")
    assert status != 500, "a page created with an unknown type crashes with HTTP 500"


@known_bug(434)
def the_csrf_token_has_128_bits(base):
    #
    # The CSRF token is only 64 bits (16 hex characters). It should be 128 bits (32 hex characters).
    #
    sanne = Client(base).login("sanne")
    sanne.get("nl/Start")
    token = sanne.csrf or cookie(sanne, "hyphaCsrfTokenInsecure")
    assert token and re.fullmatch(r"[0-9a-f]{32}", token), f"CSRF token {token!r} is not 128 bits of hex"


# ---------------------------------------------------------------------------
# Login, recovery and sessions (#424, #426, #433).
# ---------------------------------------------------------------------------


@known_bug(424)
def login_is_throttled_after_repeated_failures(base):
    #
    # The login command has no limit, counter or lockout, so passwords can be guessed without end. After a number of
    # failures the next attempt must be refused with a throttle message.
    #
    client = Client(base)
    text = ""
    for _ in range(12):
        client.get("nl/Start")
        _, text, _ = client.follow(client.post("nl/Start", "login", fields={"loginUsername": "sanne", "loginPassword": "fout-wachtwoord"}))
    assert "te veel mislukte" in text, "login is never throttled after many failed attempts"


@known_bug(424)
def account_recovery_answers_the_same_for_known_and_unknown(base):
    #
    # Account recovery answers differently for an existing and an unknown name, which reveals which accounts exist.
    # The answer must be the same in both cases.
    #
    a = Client(base)
    a.get("nl/Start")
    known_status, _, _ = a.request("nl/Start", {"command": "reregister", "argument": "ahmed", "csrfToken": a.csrf})
    b = Client(base)
    b.get("nl/Start")
    unknown_status, _, _ = b.request("nl/Start", {"command": "reregister", "argument": "bestaat-echt-niet-424", "csrfToken": b.csrf})
    assert known_status == unknown_status, f"recovery answers {known_status} for a known and {unknown_status} for an unknown name"


@known_bug(426)
def changing_the_own_email_needs_the_current_password(base):
    #
    # A logged-in user can change the e-mail address (and password) of their own account without entering the
    # current password, so a stolen session takes the account over. The change must need the current password.
    #
    sanne = Client(base).login("sanne")
    sanne.get("settings/user/sanne")
    fields = {"settingsUsername": "sanne", "settingsFullname": "Sanne de Vries", "settingsEmail": "aanvaller-426@evil.example", "settingsUiLang": "nl", "settingsPassword1": "", "settingsPassword2": ""}
    try:
        sanne.follow(sanne.post("settings/user/sanne", "settingsSaveAccount", "sanne", fields))
        xml = open(HYPHAXML, encoding="utf-8").read()
        m = re.search(r'<user id="u2"[^>]*email="([^"]*)"', xml)
        assert m, "could not find user sanne in hypha.xml"
        assert m.group(1) == "sanne@eemstad.example", f"e-mail was changed to {m.group(1)!r} without the current password"
    finally:
        back = dict(fields, settingsEmail="sanne@eemstad.example")
        sanne.follow(sanne.post("settings/user/sanne", "settingsSaveAccount", "sanne", back))


@known_bug(433)
def logging_out_changes_the_session_id(base):
    #
    # Logout only removes the login flag; it keeps the session id and the CSRF token, so a leaked session cookie
    # stays valid. The session id must change at logout.
    #
    sanne = Client(base).login("sanne")
    sanne.get("nl/Start")
    before = cookie(sanne, "hyphaSessionInsecure")
    sanne.follow(sanne.post("nl/Start", "logout"))
    after = cookie(sanne, "hyphaSessionInsecure")
    assert before and after and before != after, f"session id unchanged at logout ({before!r})"


# ---------------------------------------------------------------------------
# Configuration: themes (#435), information disclosure (#436), redirects (#439).
# ---------------------------------------------------------------------------


@known_bug(435)
def an_unknown_theme_name_is_not_stored(base):
    #
    # Saving the theme selection stores any posted name without checking that the theme exists, so the theme files
    # can be pointed outside data/themes. An unknown name must not be stored.
    #
    bad = "../../../buiten-themes"
    beheer = Client(base).login("beheer")
    beheer.get("settings/theme")
    try:
        beheer.follow(beheer.post("settings/theme", "settingsSaveTheme", "", {"editTheme": bad}))
        xml = open(HYPHAXML, encoding="utf-8").read()
        m = re.search(r'<hypha\b[^>]*\btheme="([^"]*)"', xml)
        stored = m.group(1) if m else ""
        assert stored != bad, f"an unknown theme name {stored!r} was stored"
    finally:
        # An unknown theme breaks every page render (the template file is not found), so the HTTP route cannot
        # undo it; reset the stored name on disk directly.
        write_hypha_xml(open(HYPHAXML, encoding="utf-8").read().replace(' theme="' + bad + '"', ' theme="default"'))


@known_bug(436)
def the_file_index_of_hypha_php_is_not_public(base):
    #
    # hypha.php?file=index gives every visitor the list of installed system files and their modification times,
    # which fingerprints the site. It must not be served to anonymous visitors.
    #
    client = Client(base)
    status, text, _ = client.request("hypha.php?file=index")
    assert "system/core/" not in text, f"hypha.php discloses its file index to anyone ({status})"


@known_bug(436)
def outgoing_mail_hides_the_php_version(base):
    #
    # Every mail carries an X-Mailer: PHP/<version> header, telling the recipient the exact PHP version. It should
    # not be sent.
    #
    client = Client(base)
    client.get("nl/Start")
    client.request("nl/Start", {"command": "reregister", "argument": "ahmed", "csrfToken": client.csrf})
    text = open(MAILLOG, encoding="utf-8", errors="replace").read() if os.path.exists(MAILLOG) else ""
    assert "X-Mailer: PHP/" not in text, "outgoing mail carries an X-Mailer header with the PHP version"


@known_bug(439)
def the_reload_after_a_command_stays_on_this_host(base):
    #
    # After a command that reloads, Hypha redirects to REQUEST_URI. A path that starts with // is read by browsers
    # as another host, so the leading slashes must be collapsed to one.
    #
    client = Client(base)
    client.get("nl/Start")
    data = urllib.parse.urlencode({"command": "login", "csrfToken": client.csrf, "loginUsername": "sanne", "loginPassword": "fout"}).encode()
    req = urllib.request.Request(base.rstrip("/") + "//aanvaller.example/nl/Start", data=data, headers={"Content-Type": "application/x-www-form-urlencoded"})
    try:
        with client.opener.open(req, timeout=60) as response:
            location = response.headers.get("Location")
    except urllib.error.HTTPError as error:
        location = error.headers.get("Location")
    assert location is not None, "no redirect after the command"
    assert not location.startswith("//") and not re.match(r"https?://", location), f"redirect goes to another host: {location!r}"


if __name__ == "__main__":
    sys.exit(run(sys.argv[1]))
