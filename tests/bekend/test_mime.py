"""Known bugs in the media types (MIME) of answers, uploads and outgoing mail, and in Accept-Language.

Mail is captured in $HYPHA_WORK/data/mail.log; test files for the theme are written into $HYPHA_WORK/data/themes
(tests/bekend.sh).
"""
import json
import os
import re
import struct
import sys
import time
import xml.etree.ElementTree as ET

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "integratie"))
from hypha import Client, known_bug, run  # noqa: E402

WORK = os.environ.get("HYPHA_WORK", "")
DATA = os.path.join(WORK, "data")


#
# Helpers.
#
def login(base, name):
    """Client.login, but a failed login is a broken site (an error), not the known bug."""
    try:
        return Client(base).login(name)
    except AssertionError as error:
        raise RuntimeError(str(error)) from None


def content_type(client, path, headers=None):
    status, _text, _location = client.request(path, headers=headers)
    if status != 200:
        raise RuntimeError(f"{path} gave {status}")
    return (client.headers.get("Content-Type") or "").split(";")[0].strip().lower()


def theme_file(name, content):
    """A file in the default theme of the test site, served by serveFile()."""
    path = os.path.join(DATA, "themes", "default", name)
    with open(path, "wb") as f:
        f.write(content)
    os.chmod(path, 0o666)
    return "data/themes/default/" + name


def page_id(name):
    for page in ET.parse(os.path.join(DATA, "hypha.xml")).getroot().iter("page"):
        for language in page.findall("language"):
            if language.get("name") == name:
                return page.get("id")
    raise RuntimeError(f"no page {name} in hypha.xml")


def mail_messages():
    """The messages in data/mail.log as (headers, body) bytes; a message starts at its To: line."""
    path = os.path.join(DATA, "mail.log")
    log = open(path, "rb").read() if os.path.exists(path) else b""
    messages = []
    for chunk in re.split(rb"(?m)^(?=To: )", log):
        if chunk.strip():
            head, _, body = chunk.replace(b"\r\n", b"\n").partition(b"\n\n")
            messages.append((head, body))
    return messages


#
# serveFile(): the type comes from the extension for text and font formats (RFC 9239, RFC 8081, RFC 7763).
#
@known_bug(589)
def theme_and_system_files_get_the_registered_type_of_their_extension(base):
    client = Client(base)
    wrong = []
    for path, expected in [("system/assets/help.js", "text/javascript"),
                           ("data/themes/default/fonts/dosis-v7-latin-700.ttf", "font/ttf"),
                           (theme_file("mime-logo.svg", b'<!-- logo -->\n<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8"/></svg>\n'), "image/svg+xml"),
                           (theme_file("mime-module.mjs", b"/* module */\nexport const answer = 42;\n"), "text/javascript"),
                           (theme_file("mime-notes.md", "# Kop\n\nTekst met een é.\n".encode()), "text/markdown")]:
        got = content_type(client, path)
        if got != expected:
            wrong.append(f"{path}: {got}, not {expected}")
    assert not wrong, "; ".join(wrong)


#
# sendMail(): an 8-bit UTF-8 body needs a Content-Transfer-Encoding (RFC 2045, section 6).
#
@known_bug(590)
def a_mail_with_non_ascii_text_declares_a_content_transfer_encoding(base):
    beheer = login(base, "beheer")
    name, subject = "Lijstmime", f"Mime proef {int(time.time() * 1000)}"
    beheer.get("nl/Start")
    status, _, _ = beheer.post(f"nl/{name}/edit", "newPage", name, {"newPageType": "mailinglist", "newPageLanguage": "nl"})
    if status != 302:
        raise RuntimeError(f"newPage mailinglist gave {status}")
    path = os.path.join(DATA, "pages", page_id(name))
    with open(path, "w", encoding="utf-8") as f:
        f.write('<?xml version="1.0" encoding="UTF-8"?>\n<hypha type="mailinglist" multiLingual="on" versions="off" schemaVersion="1" '
                'sender-email="redactie@eemstad.example" sender-name="Redactie"><description><p>Verzonnen nieuwsbrief.</p></description>'
                f'<addresses/><mailings><mailing xml:id="mmime" status="draft" subject="{subject}"><p>Café Zoë in Αθήνα.</p></mailing></mailings>'
                '<email_welcome_text><p>Welkom.</p></email_welcome_text></hypha>')
    os.chmod(path, 0o666)
    beheer.get(f"nl/{name}/mails/mmime")
    beheer.post(f"nl/{name}/mails/mmime", "test_send", "kees@eemstad.example")
    found = [(head, body) for head, body in mail_messages() if subject.encode() in head]
    if not found:
        raise RuntimeError("the test mail is not in data/mail.log")
    head, body = found[-1]
    match = re.search(rb"(?mi)^Content-Transfer-Encoding:\s*(\S+)", head)
    encoding = match.group(1).decode().lower() if match else "7bit (none given)"
    if encoding in ("quoted-printable", "base64"):
        assert all(byte < 128 for byte in body), f"Content-Transfer-Encoding {encoding}, but the body has 8-bit bytes"
    else:
        assert encoding == "8bit" or all(byte < 128 for byte in body), f"the body has 8-bit bytes, Content-Transfer-Encoding is {encoding}"
    longest = max(len(line) for line in body.split(b"\n"))
    assert longest <= 998, f"a body line has {longest} characters (RFC 5322 allows 998)"


#
# Data answers: JSON is application/json (RFC 8259), the hypha.php file server is not HTML.
#
@known_bug(591)
def the_page_chooser_answers_json_as_application_json(base):
    client = Client(base)
    status, text, _ = client.request("chooser/nl?term=s")
    assert status == 200, f"chooser gave {status}"
    kind = (client.headers.get("Content-Type") or "").split(";")[0].strip().lower()
    assert kind == "application/json", f"chooser answers {kind}"
    assert isinstance(json.loads(text), list), "chooser does not answer a JSON list"


@known_bug(591)
def the_hypha_php_file_index_is_not_sent_as_html(base):
    client = Client(base)
    kind = content_type(client, "hypha.php?file=index")
    assert kind != "text/html", "hypha.php?file=index (serialized PHP) is sent as text/html"


#
# upload/image: the type of an image is that of its content, not of its name.
#
@known_bug(592)
def an_uploaded_image_is_kept_only_as_a_type_a_browser_shows_under_its_own_extension(base):
    sanne = login(base, "sanne")
    tiff = (b"II*\x00" + struct.pack("<I", 8) + struct.pack("<H", 2) + struct.pack("<HHII", 256, 3, 1, 4)
            + struct.pack("<HHII", 257, 3, 1, 3) + struct.pack("<I", 0) + b"\x00" * 12)
    _status, text, _ = sanne.request("upload/image", data={}, files={"uploadedfile": ("kaart.png", tiff, "image/png")})
    answer = json.loads(text)[0]
    if "error" in answer:
        return
    url = answer["thumbUrl"].replace(sanne.base, "")
    kind = content_type(Client(base), url)
    expected = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "gif": "image/gif", "bmp": "image/bmp"}.get(url.rsplit(".", 1)[-1])
    assert kind == expected, f"a TIFF called kaart.png is accepted as {url} and served as {kind}"


#
# Accept-Language (RFC 9110, sections 12.5.4 and 12.5.5).
#
@known_bug(593)
def the_interface_language_follows_the_quality_values_of_accept_language(base):
    client = Client(base)
    wrong = []
    for header, expected in [("fr-FR,en;q=0.8", "login"), ("nl;q=0.1,en;q=0.9", "login"), ("en-GB;q=0,nl", "inloggen")]:
        _status, text, _ = client.request("nl/Start", headers={"Accept-Language": header})
        got = "login" if 'title="login"' in text else "inloggen" if 'title="inloggen"' in text else "?"
        if got != expected:
            wrong.append(f"{header!r} gave {got}")
    assert not wrong, "; ".join(wrong)


@known_bug(593)
def a_page_whose_language_follows_accept_language_says_so_in_vary(base):
    client = Client(base)
    client.request("nl/Start", headers={"Accept-Language": "en"})
    vary = [v.strip().lower() for v in ",".join(client.headers.get_all("Vary") or []).split(",")]
    assert "accept-language" in vary or "*" in vary, f"Vary is {vary}"


if __name__ == "__main__":
    sys.exit(run(sys.argv[1]))
