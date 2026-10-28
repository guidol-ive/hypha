"""Known bugs of the platform: PHP versions and deprecations, HTTP, routing, files and caching.

PHP messages (deprecations, libxml warnings) are read from the log of the container that serves the site: the test
notes the length of `docker logs` (stderr, where Apache and PHP write their errors), does the request and reads what
was added. A deprecation that only exists on a newer PHP version is also checked in the source, so the test is
"known" on every supported version until the code is changed.
"""
import json
import os
import re
import socket
import struct
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
import zlib

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "integratie"))
from hypha import Client, known_bug, run  # noqa: E402

ENGINE = os.environ.get("ENGINE", "docker")
WORK = os.environ.get("HYPHA_WORK", "")
CODE = os.environ.get("HYPHA_CODE", "")
STATE = {}
CSS = "system/assets/hypha-core.css"


#
# The container, its PHP version and its log.
#
def container(base):
    if "container" not in STATE:
        port = urllib.parse.urlparse(base).port
        names = subprocess.run([ENGINE, "ps", "--filter", f"publish={port}", "--format", "{{.Names}}"], capture_output=True, text=True, check=True).stdout.split()
        if len(names) != 1:
            raise RuntimeError(f"expected one container on port {port}, found {names}")
        STATE["container"] = names[0]
    return STATE["container"]


def php_log(base):
    return subprocess.run([ENGINE, "logs", container(base)], capture_output=True, check=True).stderr.decode("utf-8", "replace")


def php_messages(base, action):
    """The PHP messages that the container logs while action() runs."""
    before = len(php_log(base))
    action()
    time.sleep(0.5)
    return [line for line in php_log(base)[before:].splitlines() if " PHP " in line]


def php_version(base):
    if "version" not in STATE:
        STATE["version"] = subprocess.run([ENGINE, "exec", container(base), "php", "-r", "echo PHP_VERSION;"], capture_output=True, text=True, check=True).stdout.strip()
    return STATE["version"]


def php_in_container(base, code):
    """Runs PHP code in the web container (the PHP version and extensions of the site), in the web root. Returns the
    PHP messages that the code raised, collected by an error handler."""
    script = "set_error_handler(function ($no, $message) { $GLOBALS['m'][] = $message; return true; }); $GLOBALS['m'] = [];\n" + code + "\necho json_encode($GLOBALS['m']);"
    out = subprocess.run([ENGINE, "exec", "-w", "/var/www/html", container(base), "php", "-r", script], capture_output=True, text=True)
    if out.returncode != 0:
        raise RuntimeError(f"php in the container failed: {out.stdout[-500:]} {out.stderr[-500:]}")
    return json.loads(out.stdout.strip().splitlines()[-1])


def source(path):
    with open(os.path.join(CODE, path), encoding="utf-8") as f:
        return f.read()


def short(lines):
    return " | ".join(sorted({re.sub(r"^\[[^]]*\] ", "", line)[:150] for line in lines}))[:400]


#
# Fixtures on the fictional site.
#
def png(width, height):
    def chunk(kind, data):
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)
    rows = (b"\x00" + bytes((i * 7) % 256 for i in range(width * 3))) * height
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(rows)) + chunk(b"IEND", b"")


def hypha_xml():
    return ET.parse(os.path.join(WORK, "data/hypha.xml")).getroot()


def page_names(language="nl"):
    return [l.get("name") for l in hypha_xml().findall(f"pageList/page/language[@id='{language}']")]


def page_id(name, language="nl"):
    for page in hypha_xml().findall("pageList/page"):
        for l in page.findall("language"):
            if l.get("id") == language and l.get("name") == name:
                return page.get("id")
    return None


def text_page(client, name, html, private=False):
    """Makes a text page through the editor of main (wymeditor) and saves html in it."""
    client.post("nl/Start", "newPage", name, {"newPageType": "textpage", "newPageLanguage": "nl"})
    pagename = name.replace(" ", "_")
    client.get(f"nl/{pagename}/edit")
    fields = {"textPagename": name, "textContent": html}
    if private:
        fields["textPrivate"] = "on"
    status, text, _ = client.post(f"nl/{pagename}/edit", "edit", "", fields)
    assert status in (200, 302, 303), f"saving text page {name} gave {status}"
    return pagename


ARTICLE = """<?xml version="1.0" encoding="UTF-8"?>
<hypha type="peer_reviewed_article" multiLingual="off" versions="off" schemaVersion="1">
  <article status="published" author="Lotte Bakker" created_at="t1793000000" updated_at="t1793000000" published_at="t1793000000" created_by="u4">
    <content><text><p>Verzonnen artikel over de Eemstadse raad.</p></text><sources/></content>
    <context><title>Proefartikel platform</title><excerpt><p>Kort verslag.</p></excerpt><featured_image/><method/></context>
  </article>
  <discussions><review/><public/></discussions>
  <approves/>
</hypha>
"""


def published_article(base):
    """A published article of the fictional site. On main a new article crashes until it has a title (#525), so the
    page is made through Hypha and its content is written as a fixture."""
    if "article" not in STATE:
        beheer = Client(base).login("beheer")
        beheer.post("nl/Start", "newPage", "Proefartikel platform", {"newPageType": "peer_reviewed_article", "newPageLanguage": "nl"})
        pid = page_id("Proefartikel_platform")
        assert pid, "the article page was not made"
        with open(os.path.join(WORK, "data/pages", pid), "w", encoding="utf-8") as f:
            f.write(ARTICLE)
        STATE["article"] = "nl/Proefartikel_platform"
    return STATE["article"]


#
# #184: data/images is not created on upload.
#
@known_bug(184)
def an_image_upload_creates_data_images_when_it_is_missing(base):
    images = os.path.join(WORK, "data/images")
    aside = images + ".platform"
    os.rename(images, aside)
    try:
        sanne = Client(base).login("sanne")
        status, text, _ = sanne.request("upload/image", {"csrfToken": sanne.csrf}, {"uploadedfile": ("proef.png", png(40, 30), "image/png")})
        answer = json.loads(text) if text.strip().startswith("[") else text[:200]
        assert status == 200 and isinstance(answer, list) and "error" not in answer[0], f"upload without data/images gave {status}: {answer}"
        assert os.path.isdir(images), "data/images was not created"
    finally:
        if os.path.isdir(images):
            for name in os.listdir(aside):
                os.rename(os.path.join(aside, name), os.path.join(images, name))
            os.rmdir(aside)
        else:
            os.rename(aside, images)


#
# #408: PHP 8.1 deprecations (all supported versions).
#
@known_bug(408)
def a_published_article_shows_its_date_without_strftime(base):
    path = published_article(base)
    result = {}
    messages = php_messages(base, lambda: result.update(status=Client(base).get(path)[0]))
    assert result["status"] == 200, f"the published article gave {result['status']}"
    found = [m for m in messages if "strftime" in m]
    assert not found, f"{len(found)} messages: {short(found)}"


@known_bug(408)
def an_empty_file_field_passes_no_null_to_setattribute(base):
    path = published_article(base)
    beheer = Client(base).login("beheer")
    result = {}
    messages = php_messages(base, lambda: result.update(status=beheer.get(path + "/edit")[0]))
    found = [m for m in messages if "Passing null to parameter" in m and "document.php" in m]
    assert not found, f"{len(found)} messages: {short(found)}"
    assert result["status"] == 200, f"the edit view of the article gave {result['status']}"


@known_bug(408)
def a_cropped_image_is_resized_without_float_to_int_conversion(base):
    #
    # HyphaImage::resizeTo() crops to the asked size; with these sizes the source rectangle is not whole pixels.
    #
    with open(os.path.join(WORK, "data/images/platform-crop.png"), "wb") as f:
        f.write(png(301, 203))
    messages = php_in_container(base, "require 'system/core/HyphaImage.php'; (new HyphaImage('platform-crop.png'))->getUrl(70, 50);")
    found = [m for m in messages if "Implicit conversion from float" in m]
    assert not found, f"{len(found)} messages: {short(found)}"


@known_bug(408)
def a_large_upload_is_resized_without_float_to_int_conversion(base):
    #
    # The upload of the editor scales an image larger than 1120 x 800 down; 1500 x 1001 gives 1120 x 747.4.
    #
    sanne = Client(base).login("sanne")
    result = {}
    messages = php_messages(base, lambda: result.update(answer=sanne.request("upload/image", {"csrfToken": sanne.csrf}, {"uploadedfile": ("groot.png", png(1500, 1001), "image/png")})))
    assert result["answer"][0] == 200, f"the upload gave {result['answer'][0]}"
    found = [m for m in messages if "Implicit conversion from float" in m]
    assert not found, f"{len(found)} messages: {short(found)}"


#
# #410: imagedestroy() is deprecated from PHP 8.5.
#
@known_bug(410)
def hyphaimage_does_not_call_imagedestroy(base):
    with open(os.path.join(WORK, "data/images/platform-destroy.png"), "wb") as f:
        f.write(png(64, 48))
    messages = php_in_container(base, "require 'system/core/HyphaImage.php'; (new HyphaImage('platform-destroy.png'))->getUrl(32, 24);")
    found = [m for m in messages if "imagedestroy" in m]
    assert not found, f"{len(found)} messages on PHP {php_version(base)}: {short(found)}"
    #
    # Before PHP 8.5 the call is silent: check the source.
    #
    calls = len(re.findall(r"\bimagedestroy\s*\(", source("system/core/HyphaImage.php")))
    assert not calls, f"system/core/HyphaImage.php calls imagedestroy() {calls} times (deprecated from PHP 8.5; this is PHP {php_version(base)})"


#
# #470: caching headers.
#
@known_bug(470)
def an_anonymous_page_tells_shared_caches_not_to_store_it(base):
    client = Client(base)
    status, _, _ = client.get("nl/Start")
    cache = client.headers.get("Cache-Control") or ""
    vary = client.headers.get("Vary") or ""
    assert status == 200, f"nl/Start gave {status}"
    assert "private" in cache or "no-store" in cache, f"Cache-Control: {cache or '(none)'}, but the page holds a CSRF token of this visitor"
    assert "cookie" in vary.lower(), f"Vary: {vary or '(none)'}, without Cookie"


@known_bug(470)
def a_static_file_has_no_pragma_or_expires_of_the_session(base):
    sanne = Client(base).login("sanne")
    sanne.get("data/themes/default/hypha.css")
    found = {k: sanne.headers.get(k) for k in ("Pragma", "Expires") if sanne.headers.get(k)}
    assert not found, f"data/themes/default/hypha.css for a member has {found} next to Cache-Control: {sanne.headers.get('Cache-Control')}"


@known_bug(470)
def an_image_sets_no_cookie(base):
    with open(os.path.join(WORK, "data/images/platform-koek.png"), "wb") as f:
        f.write(png(8, 8))
    client = Client(base)
    status, _, _ = client.get("images/platform-koek.png")
    assert status == 200, f"images/platform-koek.png gave {status}"
    cookie = client.headers.get("Set-Cookie")
    assert not cookie, f"an image sets a cookie, so a cache does not store it: Set-Cookie: {cookie[:60]}"


@known_bug(470)
def logout_gives_a_new_session_id(base):
    def session(client):
        return {c.name: c.value for c in client.jar if "sess" in c.name.lower() or c.name == "PHPSESSID"}
    sanne = Client(base).login("sanne")
    before = session(sanne)
    assert before, "no session cookie after login"
    sanne.follow(sanne.post("nl/Start", "logout"))
    after = session(sanne)
    same = {k: v for k, v in before.items() if after.get(k) == v}
    assert not same, f"the session id stays the same after logout: {sorted(same)}"


#
# #514: page index ($capital++).
#
@known_bug(514)
def the_page_index_increments_no_letter_string(base):
    status = {}
    messages = php_messages(base, lambda: status.update(code=Client(base).get("index/nl")[0]))
    assert status["code"] == 200, f"index/nl gave {status['code']}"
    found = [m for m in messages if "Increment on non-numeric string" in m]
    assert not found, f"{len(found)} messages: {short(found)}"
    #
    # Before PHP 8.5 the increment is silent: check the source.
    #
    calls = re.findall(r"\$capital\s*\+\+", source("system/datatypes/index.php"))
    assert not calls, f"system/datatypes/index.php increments the letter string $capital {len(calls)} times (deprecated from PHP 8.5; this is PHP {php_version(base)})"


#
# #527: invalid HTML in templates.
#
def loadhtml(messages, text):
    return [m for m in messages if "DOMDocument::loadHTML()" in m and text in m]


@known_bug(527)
def a_page_with_a_tag_has_valid_tag_html(base):
    sanne = Client(base).login("sanne")
    sanne.get("nl/Start")
    sanne.post("nl/Start", "tagSelect", "tag1")
    found = loadhtml(php_messages(base, lambda: Client(base).get("nl/Start")), "Attribute class redefined")
    assert not found, f"{len(found)} messages: {short(found)}"


@known_bug(527)
def a_private_page_has_a_valid_asterisk(base):
    sanne = Client(base).login("sanne")
    path = "nl/" + text_page(sanne, "Besloten platform", "<p>Alleen voor leden.</p>", private=True)
    found = loadhtml(php_messages(base, lambda: sanne.get(path)), "missing semicolon")
    assert not found, f"{len(found)} messages: {short(found)}"


@known_bug(527)
def an_article_has_valid_share_links(base):
    path = published_article(base)
    found = loadhtml(php_messages(base, lambda: Client(base).get(path)), "expecting ';'")
    assert not found, f"{len(found)} messages: {short(found)}"


@known_bug(527)
def the_no_page_notice_for_members_is_valid_html(base):
    sanne = Client(base).login("sanne")
    found = loadhtml(php_messages(base, lambda: sanne.get("nl/Bestaat_niet_platform")), "error parsing attribute name")
    assert not found, f"{len(found)} messages: {short(found)}"


#
# #541: the request path is not percent-decoded.
#
@known_bug(541)
def a_page_with_a_name_outside_ascii_opens(base):
    sanne = Client(base).login("sanne")
    text_page(sanne, "Kroeg platform", '<p><a href="nl/Café_platform">c</a></p>')
    assert "Café_platform" in page_names(), f"the link made no page Café_platform: {page_names()}"
    status, _, _ = Client(base).get("nl/Caf%C3%A9_platform")
    assert status == 200, f"nl/Caf%C3%A9_platform gave {status}"


@known_bug(541)
def a_percent_encoded_link_makes_a_page_with_the_decoded_name(base):
    sanne = Client(base).login("sanne")
    text_page(sanne, "Kroeg twee platform", '<p><a href="nl/Caf%C3%A9_twee_platform">c</a></p>')
    names = [n for n in page_names() if "twee_platform" in n and n != "Kroeg_twee_platform"]
    assert names == ["Café_twee_platform"], f"the percent-encoded link made the page {names}"


@known_bug(541)
def a_tag_with_a_plus_opens(base):
    #
    # Making a tag through Hypha fails on main (#473), so the tag C++ on the page Start is written into hypha.xml.
    #
    path = os.path.join(WORK, "data/hypha.xml")
    with open(path, encoding="utf-8") as f:
        text = f.read()
    if "tagplatform" not in text:
        text = text.replace("</tagList>", '<tag xml:id="tagplatform"><language id="nl" label="C++">Verzonnen tag over programmeren</language></tag></tagList>', 1)
        text = text.replace('<language id="nl" name="Start"/>', '<language id="nl" name="Start"/><tag id="tagplatform"/>', 1)
        with open(path, "w", encoding="utf-8") as f:
            f.write(text)
    #
    # Follow the link of the tag list on the page, as a browser does.
    #
    client = Client(base)
    _, text, _ = client.get("nl/Start")
    hrefs = re.findall(r'href="(tag/nl/C[^"]*)"', text)
    assert hrefs, "the page Start shows no link to the tag C++"
    status, text, _ = client.get(hrefs[0])
    assert status == 200 and "Start" in text, f"the tag link {hrefs[0]} gave {status} without the tagged page Start"


#
# #543: page names lose letters outside ASCII.
#
@known_bug(543)
def a_new_page_keeps_letters_outside_ascii(base):
    sanne = Client(base).login("sanne")
    _, _, location = sanne.post("nl/Start", "newPage", "Brasserie Ëenhoorn", {"newPageType": "textpage", "newPageLanguage": "nl"})
    name = urllib.parse.unquote((location or "").rsplit("/", 2)[-2]) if location else ""
    assert name == "Brasserie_Ëenhoorn", f"the new page is named {name!r} ({location})"


@known_bug(543)
def a_link_with_other_case_outside_ascii_finds_the_existing_page(base):
    sanne = Client(base).login("sanne")
    text_page(sanne, "Gebak platform", '<p><a href="nl/Éclair_platform">a</a> <a href="nl/éclair_platform">b</a></p>')
    names = [n for n in page_names() if n.lower().endswith("clair_platform")]
    assert len(names) == 1, f"two links that differ only in case made {len(names)} pages: {names}"


@known_bug(543)
def the_page_chooser_finds_a_name_outside_ascii_in_other_case(base):
    sanne = Client(base).login("sanne")
    text_page(sanne, "Vogels platform", '<p><a href="nl/Ékster_platform">a</a></p>')
    assert "Ékster_platform" in page_names(), f"the link made no page Ékster_platform: {page_names()}"
    status, text, _ = sanne.get("chooser/nl?term=" + urllib.parse.quote("ékst"))
    assert status == 200 and "Ékster platform" in json.loads(text or "[]"), f"the chooser for ékst gave {status}: {text[:200]}"


#
# #573 and #578: serveFile().
#
@known_bug(573)
def a_whole_file_is_sent_compressed_without_content_range(base):
    client = Client(base)
    status, _, _ = client.request("system/assets/jquery-1.7.1.min.js", headers={"Accept-Encoding": "gzip"})
    assert status == 200, f"jquery gave {status}"
    assert not client.headers.get("Content-Range"), f"a 200 has Content-Range: {client.headers.get('Content-Range')}, so it is not compressed (Content-Encoding: {client.headers.get('Content-Encoding')})"
    assert client.headers.get("Content-Encoding") == "gzip", f"not compressed: Content-Encoding {client.headers.get('Content-Encoding')}"


def whole(base):
    if "css" not in STATE:
        with urllib.request.urlopen(base.rstrip("/") + "/" + CSS, timeout=30) as response:
            STATE["css"] = response.read()
    return STATE["css"]


def ranged(base, value):
    req = urllib.request.Request(base.rstrip("/") + "/" + CSS, headers={"Range": value})
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            return response.status, response.headers, response.read()
    except urllib.error.HTTPError as error:
        return error.code, error.headers, error.read()


@known_bug(578)
def a_range_includes_its_last_byte(base):
    status, headers, body = ranged(base, "bytes=0-9")
    assert status == 206, f"bytes=0-9 gave {status}"
    assert body == whole(base)[:10], f"bytes=0-9 gave {len(body)} bytes (Content-Length {headers.get('Content-Length')}), not 10"


@known_bug(578)
def a_range_past_the_end_is_cut_off_at_the_last_byte(base):
    size = len(whole(base))
    status, headers, body = ranged(base, "bytes=0-99999")
    assert status == 206 and headers.get("Content-Range") == f"bytes 0-{size - 1}/{size}", f"bytes=0-99999 gave {status}, Content-Range: {headers.get('Content-Range')}"
    assert body == whole(base), f"bytes=0-99999 gave {len(body)} of {size} bytes"


@known_bug(578)
def a_range_after_the_end_gets_416(base):
    size = len(whole(base))
    status, headers, _ = ranged(base, f"bytes={size}-{size + 94}")
    assert status == 416, f"bytes={size}-{size + 94} gave {status}, Content-Range: {headers.get('Content-Range')}"
    assert headers.get("Content-Range") == f"bytes */{size}", f"416 with Content-Range: {headers.get('Content-Range')}"


@known_bug(578)
def an_invalid_range_is_ignored(base):
    status, headers, body = ranged(base, "bytes=10-5")
    assert status == 200 and body == whole(base), f"bytes=10-5 gave {status} with {len(body)} bytes, Content-Range: {headers.get('Content-Range')}"


@known_bug(578)
def an_open_and_a_suffix_range_get_206(base):
    data = whole(base)
    size = len(data)
    for value, expected in ((f"bytes={size - 6}-", data[-6:]), ("bytes=-10", data[-10:])):
        status, _, body = ranged(base, value)
        assert status == 206 and body == expected, f"{value} gave {status} with {len(body)} bytes"


@known_bug(578)
def a_directory_gets_404(base):
    client = Client(base)
    status, _, _ = client.get("data/themes/default/")
    assert status == 404, f"data/themes/default/ gave {status}, Content-Type: {client.headers.get('Content-Type')}"


@known_bug(578)
def a_missing_file_gets_a_plain_text_404(base):
    client = Client(base)
    status, _, _ = client.get("system/assets/bestaat-niet-platform.css")
    kind = client.headers.get("Content-Type") or ""
    assert status == 404, f"a missing file gave {status}"
    assert kind.startswith("text/plain"), f"the 404 that repeats the path is sent as {kind}"


#
# #579 (more methods; tests/bekend/test_http.py has PUT) and #580.
#
@known_bug(579)
def delete_gets_405_with_allow(base):
    client = Client(base)
    status, _, _ = client.request("nl/Start", method="DELETE")
    assert status == 405 and client.headers.get("Allow"), f"DELETE gave {status}, Allow: {client.headers.get('Allow')}"


@known_bug(579)
def options_says_which_methods_are_allowed(base):
    client = Client(base)
    status, text, _ = client.request("nl/Start", method="OPTIONS")
    allow = client.headers.get("Allow") or ""
    assert "POST" in allow and "GET" in allow, f"OPTIONS gave {status} with {len(text)} bytes and Allow: {allow or '(none)'}"


@known_bug(579)
def an_unknown_method_gets_501(base):
    client = Client(base)
    status, _, _ = client.request("nl/Start", method="BREW")
    assert status == 501, f"BREW gave {status}"


@known_bug(580)
def login_redirects_with_303_see_other(base):
    client = Client(base)
    client.get("nl/Start")
    status, _, location = client.post("nl/Start", "login", fields={"loginUsername": "sanne", "loginPassword": "proef-wachtwoord-520"})
    assert status == 303, f"POST login gave {status} to {location}"


@known_bug(580)
def logout_redirects_with_303_see_other(base):
    sanne = Client(base).login("sanne")
    status, _, location = sanne.post("nl/Start", "logout")
    assert status == 303, f"POST logout gave {status} to {location}"


#
# #514: a page name after Z makes the page index hang (on every PHP version). Last, because the request keeps one of
# the two Apache workers busy until max_execution_time, and the page is removed afterwards.
#
@known_bug(514)
def the_page_index_answers_with_a_page_name_after_z(base):
    beheer = Client(base).login("beheer")
    beheer.post("nl/Start", "newPage", "_platform", {"newPageType": "textpage", "newPageLanguage": "nl"})
    assert "_platform" in page_names(), f"no page _platform: {page_names()}"
    started = time.monotonic()
    try:
        try:
            with urllib.request.urlopen(base.rstrip("/") + "/index/nl", timeout=8) as response:
                status = response.status
        except urllib.error.HTTPError as error:
            status = error.code
        except (socket.timeout, TimeoutError, urllib.error.URLError) as error:
            if "timed out" not in str(error):
                raise
            status = None
        assert status == 200, f"index/nl with a page _platform: {'no answer after %.0f s' % (time.monotonic() - started) if status is None else status}"
    finally:
        beheer.get("nl/_platform")
        beheer.post("nl/_platform", "delete")



#
# #586: two XPath expressions in document.php miss the @, so every form gets a second csrfToken field.
#
@known_bug(586)
def a_form_has_one_csrf_token_field(base):
    status, text, _ = Client(base).login("beheer").get("nl/Start/edit")
    count = text.count('name="csrfToken"')
    assert count == 1, f"the edit form of a text page has {count} csrfToken fields"


if __name__ == "__main__":
    sys.exit(run(sys.argv[1]))
