"""Known bugs in content: escaping, XSS, uploads, mail content and headers, notifications.

Each test states the behaviour as it should be. The fixtures (pages, an article, a festival) are made over HTTP where
Hypha has a screen for it; an article and the programme of a festival have none on main, so those are written into
the data folder of the fictional site ($HYPHA_WORK/data), as tests/integratie/test_artikel.py does. Mail is read from
$HYPHA_WORK/data/mail.log. A failing setup step raises RuntimeError, so it shows as FAIL and never as a known bug.
"""
import base64
import email.utils
import html
import os
import re
import struct
import sys
import time
import zlib

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "integratie"))
from hypha import Client, known_bug, run, test  # noqa: E402

WORK = os.environ.get("HYPHA_WORK", "")
DATA = os.path.join(WORK, "data")
HYPHA_XML = os.path.join(DATA, "hypha.xml")
COUNTER = [0]


def uniq(prefix):
    COUNTER[0] += 1
    return f"{prefix}{int(time.time()) % 100000}{COUNTER[0]}"


def setup(condition, message):
    if not condition:
        raise RuntimeError("setup: " + message)


#
# Files of the site.
#
def read(path):
    with open(path, encoding="utf-8", errors="replace") as f:
        return f.read()


def write(path, text):
    """Replace a file at once, and give the container a moment to see it: a file written in place can be read half
    by the server through the shared folder of the container."""
    data = text if isinstance(text, bytes) else text.encode("utf-8")
    time.sleep(0.2)
    temporary = path + ".proef"
    with open(temporary, "wb") as f:
        f.write(data)
        f.flush()
        os.fsync(f.fileno())
    os.chmod(temporary, 0o666)
    os.replace(temporary, path)
    time.sleep(0.3)


def page_id(name, kind=None):
    match = re.search(r'<page id="(\w+)" type="(\w+)"[^>]*>\s*<language id="nl" name="' + re.escape(name) + '"', read(HYPHA_XML))
    setup(match and (kind is None or match.group(2) == kind), f"page {name} not in hypha.xml")
    return match.group(1)


def page_file(name):
    return os.path.join(DATA, "pages", page_id(name))


def set_user_attribute(user_id, attribute, value):
    """Set an attribute of a user in hypha.xml, or remove it with value None; returns the old value (None when absent),
    so a test can restore the fictional user exactly."""
    text = read(HYPHA_XML)
    match = re.search(r'<user id="' + user_id + r'"[^>]*/>', text)
    setup(match, f"user {user_id} not in hypha.xml")
    tag = match.group(0)
    old = re.search(r'\s' + attribute + r'="([^"]*)"', tag)
    old = html.unescape(old.group(1)) if old else None
    if value is None:
        write(HYPHA_XML, text.replace(tag, re.sub(r'\s' + attribute + r'="[^"]*"', "", tag)))
        return old
    escaped = value.replace("&", "&amp;").replace('"', "&quot;").replace("<", "&lt;").replace(">", "&gt;")
    if re.search(r'\s' + attribute + '="', tag):
        new = re.sub(r'(\s' + attribute + r'=")[^"]*(")', lambda m: m.group(1) + escaped + m.group(2), tag)
    else:
        new = tag[:-2] + f' {attribute}="{escaped}"/>'
    write(HYPHA_XML, text.replace(tag, new))
    return old


def digest():
    path = os.path.join(DATA, "digest")
    return read(path) if os.path.exists(path) else ""


def force_digest():
    """Make the next request send the digest: put the last digest time far in the past."""
    text = read(HYPHA_XML)
    if re.search(r'<hypha [^>]*lastDigestTime="', text):
        text = re.sub(r'(<hypha [^>]*lastDigestTime=")\d*(")', r"\g<1>1\g<2>", text, count=1)
    else:
        text = text.replace('<hypha type="project"', '<hypha type="project" lastDigestTime="1"', 1)
    write(HYPHA_XML, text)


#
# Mail: every message that mail() gave to sendmail, appended to mail.log.
#
def mails():
    path = os.path.join(DATA, "mail.log")
    if not os.path.exists(path):
        return []
    with open(path, "rb") as f:
        raw = f.read().decode("utf-8", "replace")
    return [m for m in re.split(r"(?m)^(?=To: )", raw) if m.startswith("To: ")]


def headers_of(message):
    return message.split("\r\n\r\n", 1)[0].split("\r\n")


def header(message, name):
    """The value of a header, with folded lines joined."""
    value = None
    for line in headers_of(message):
        if line.lower().startswith(name.lower() + ":"):
            value = line.split(":", 1)[1].strip()
        elif value is not None and line[:1] in (" ", "\t"):
            value += line
        elif value is not None:
            break
    return value


def body_of(message):
    return message.split("\r\n\r\n", 1)[1] if "\r\n\r\n" in message else ""


def new_mails(before, to=None, wait=0):
    """The mails since mails()[before], to one address. Hypha can still be sending when the answer has arrived (the
    digest is sent at the end of the request), so wait up to `wait` seconds for the first one."""
    deadline = time.monotonic() + wait
    while True:
        found = [m for m in mails()[before:] if to is None or m.startswith("To: " + to)]
        if found or time.monotonic() >= deadline:
            return found
        time.sleep(0.2)


#
# Images.
#
def png(width=2, height=2):
    def chunk(kind, data):
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xffffffff)
    raw = b"".join(b"\x00" + b"\xcc\x44\x22" * width for _ in range(height))
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(raw)) + chunk(b"IEND", b"")


GIF = base64.b64decode("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7")


#
# Pages.
#
def new_page(client, name, kind):
    status, _text, location = client.post("nl/Start", "newPage", name, {"newPageType": kind, "newPageLanguage": "nl"})
    setup(status == 302 and location and location.endswith("/edit"), f"newPage {name} ({kind}) gave {status} {location}")
    return "nl/" + name


def text_page(client, content, name=None):
    name = name or uniq("Proefpagina_")
    path = new_page(client, name, "textpage")
    save_text(client, path, name, content)
    return path


def save_text(client, path, name, content):
    client.get(path + "/edit")
    status, _text, location = client.post(path + "/edit", "edit", "", {"textPagename": name, "textContent": content})
    setup(status == 302, f"saving {path} gave {status}")


def mailing_list(client, sender_name="Redactie Eemstad", sender_email="lijst@eemstad.example"):
    name = uniq("Lijst_")
    path = new_page(client, name, "mailinglist")
    client.get(path + "/edit")
    status, _text, _location = client.post(path + "/edit", "save", "", {
        "page_name": name, "sender_name": sender_name, "sender_email": sender_email,
        "description": "<p>Nieuwsbrief van de proefsite.</p>", "email_welcome_text": "<p>Welkom bij de nieuwsbrief.</p>"})
    setup(status == 302, f"saving mailing list {name} gave {status}")
    return path


def mailing(client, path, subject):
    client.get(path + "/mails_new")
    status, _text, location = client.post(path + "/mails_new", "save", "", {"subject": subject, "message": "<p>Inhoud van de nieuwsbrief.</p>"})
    setup(status == 302 and location and "/mails_edit/" in location, f"new mailing gave {status} {location}")
    return location.split("?")[0].rsplit("/", 1)[1]


def test_mail(client, path, mailing_id, to):
    status, _text, _location = client.post(f"{path}/mails/{mailing_id}", "test_send", to)
    setup(status == 302, f"test mail gave {status}")


def subscribe(client, path, address):
    client.get(path)
    return client.post(path, "subscribe", "", {"email": address})


def add_address(path, address, status):
    """An address in the list, written into the page file: subscribing and adding addresses fail on main with a
    TypeError (#440), so the list is filled the way an older Hypha stored it."""
    file = page_file(path.split("/", 1)[1])
    code = "proefcode" + uniq("")
    element = f'<address email="{address}" status="{status}" confirm-code="{code}" unsubscribe-code="{code}" reminded=""/>'
    text = read(file)
    setup("<addresses/>" in text or "<addresses>" in text, "no addresses element in the mailing list")
    write(file, text.replace("<addresses/>", f"<addresses>{element}</addresses>", 1) if "<addresses/>" in text else text.replace("<addresses>", "<addresses>" + element, 1))


def address_status(path, address):
    match = re.search(r'<address [^>]*email="' + re.escape(address) + r'"[^>]*>', read(page_file(path.split("/", 1)[1])))
    if not match:
        return None
    return re.search(r'status="(\w+)"', match.group(0)).group(1)


def article(client, title="Proefartikel"):
    """A published peer-reviewed article with public comments. There is no screen on main to make one without a
    title (#525), so the page is made as a text page and its file is written as an article."""
    name = uniq("Artikel_")
    new_page(client, name, "textpage")
    pid = page_id(name, "textpage")
    write(HYPHA_XML, read(HYPHA_XML).replace(f'id="{pid}" type="textpage"', f'id="{pid}" type="peer_reviewed_article"'))
    write(os.path.join(DATA, "pages", pid), (
        '<?xml version="1.0" encoding="UTF-8"?>\n<hypha type="peer_reviewed_article" multiLingual="off" versions="off" schemaVersion="1">'
        '<article status="published" author="Lotte Bakker" created_by="u4" created_at="t1793000000" updated_at="t1793000000" published_at="t1793000000">'
        f'<content><text><p>Tekst van het proefartikel.</p></text><sources/></content><context><title>{title}</title><excerpt><p>Kort</p></excerpt>'
        '<featured_image/><method><p>Methode</p></method></context></article><discussions><review/><public/></discussions><approves/></hypha>'))
    return "nl/" + name


def anonymous_comment(base, path, text, name="Bezoeker Eemstad", address="bezoeker@eemstad.example"):
    anon = Client(base)
    anon.get(path)
    return anon.post(path + "/discussions/public", "discussion_started", "", {
        "discussion_comment/new_public": text, "commenter_name/new_public": name, "commenter_email/new_public": address})


def festival(client):
    name = uniq("Festival_")
    path = new_page(client, name, "festivalpage")
    client.get(path + "/settings")
    status, _text, _location = client.post(path + "/settings", "save", "", {"title": "Proeffestival Eemstad", "description": "Verzonnen festival."})
    setup(status == 302, f"festival settings gave {status}")
    return path


def contribute(client, path, title="Lezing over de Eem", website="", image="", files=None):
    client.get(path + "/contribute")
    fields = {"name": "Lotte Bakker", "title": title, "description": "Over de rivier.", "website": website,
              "category": "lecture", "notes": "", "image": image, "file_shadow_image": image,
              "motivation": "Past bij het thema van het festival."}
    if files:
        fields.update({"command": "save", "argument": "", "csrfToken": client.csrf})
        status, _text, location = client.request(path + "/contribute", fields, files)
    else:
        status, _text, location = client.post(path + "/contribute", "save", "", fields)
    setup(status == 302 and location and "/lineup" in location, f"contribution gave {status} {location}")


def schedule(path, day="Zaterdag", location="Grote zaal"):
    """Give every contribution of a festival an event on one day and location (there is no screen for this)."""
    file = page_file(path.split("/", 1)[1])
    text = read(file)
    esc = lambda s: s.replace("&", "&amp;").replace('"', "&quot;").replace("<", "&lt;").replace(">", "&gt;")  # noqa: E731
    text = re.sub(r"(<contribution [^>]*>)", r'\1<event day="dag1" location="plek1" begin="11:00" end="12:30"/>', text)
    config = (f'<config xml:id="days"><day xml:id="dag1" display="{esc(day)}" begin="10:00" end="14:00"/></config>'
              f'<config xml:id="locations"><location xml:id="plek1" display="{esc(location)}"/></config>')
    text = re.sub(r'<config xml:id="days"\s*/>|<config xml:id="locations"\s*/>', "", text)
    write(file, text.replace("</hypha>", config + "</hypha>"))


def login(base, name):
    """Client.login asserts; a failed login is a broken setup here, not a known bug."""
    try:
        return Client(base).login(name)
    except AssertionError as error:
        raise RuntimeError(f"setup: {error}") from None


# ---------------------------------------------------------------------------------------------------------------
# #416 upload/image: login required, no markup from the file name in the answer.
# ---------------------------------------------------------------------------------------------------------------
@known_bug(416)
def an_anonymous_visitor_cannot_upload_an_image(base):
    client = Client(base)
    status, text, _ = client.request("upload/image", {}, {"uploadedfile": ("proef.png", png(), "image/png")})
    assert status == 403, f"anonymous upload gave {status}: {text[:120]}"
    assert "downloadUrl" not in text, f"anonymous upload was stored: {text[:120]}"


@known_bug(416)
def the_upload_answer_has_no_markup_from_the_file_name(base):
    client = login(base, "sanne")
    status, text, _ = client.request("upload/image", {}, {"uploadedfile": ("proef<img src=x onerror=proef416()>.png", png(), "image/png")})
    if status != 200:
        raise RuntimeError(f"setup: upload by a member gave {status}")
    assert "<img" not in text, f"the answer contains markup: {text[:160]}"


# ---------------------------------------------------------------------------------------------------------------
# #581 upload/image answers errors with 200 OK, and an image above upload_max_filesize ends in a fatal error.
# ---------------------------------------------------------------------------------------------------------------
@known_bug(581)
def an_upload_that_is_not_an_image_gets_415(base):
    client = login(base, "sanne")
    status, text, _ = client.request("upload/image", {}, {"uploadedfile": ("proef.txt", b"geen afbeelding\n", "text/plain")})
    assert status == 415, f"a text file gave {status}: {text[:100]}"


@known_bug(581)
def an_image_above_upload_max_filesize_gets_413(base):
    client = login(base, "sanne")
    status, text, _ = client.request("upload/image", {}, {"uploadedfile": ("groot.png", png() + b"\0" * 17_000_000, "image/png")})
    assert status == 413, f"an image of 17 MB gave {status}: {text[:100]!r}"


@known_bug(581)
def an_upload_above_post_max_size_gets_413(base):
    client = login(base, "sanne")
    status, text, _ = client.request("upload/image", {}, {"uploadedfile": ("groter.png", png() + b"\0" * 21_000_000, "image/png")})
    assert status == 413, f"an upload of 21 MB gave {status}: {text[:100]!r}"


@known_bug(581)
def an_unknown_upload_type_gets_404(base):
    status, text, _ = login(base, "sanne").request("upload/other", {}, {"uploadedfile": ("proef.png", png(), "image/png")})
    assert status == 404, f"upload/other gave {status}: {text[:100]!r}"


# ---------------------------------------------------------------------------------------------------------------
# #423 image names from forms are used as paths; thumbnails crash on images that GD cannot read.
# ---------------------------------------------------------------------------------------------------------------
@known_bug(423)
def an_image_name_with_a_path_stays_inside_data_images(base):
    name = uniq("buiten")
    with open(os.path.join(DATA, name + ".png"), "wb") as f:
        f.write(png(20, 20))
    lotte = login(base, "lotte")
    path = festival(lotte)
    contribute(lotte, path, image=f"../{name}.png")
    status, text, _ = Client(base).get(path + "/lineup")
    outside = [f for f in os.listdir(DATA) if f.startswith(name + "_")]
    assert not outside, f"a thumbnail was written outside data/images: data/{outside[0]} (lineup {status})"
    assert "images/../" not in text, "the lineup links to an image outside data/images"


# Was filed as a known bug of #423; fixed in main by b8db4c9 (HyphaImage), retested on 2026-10-28.
@test
def a_gif_image_gets_a_thumbnail_in_the_lineup(base):
    lotte = login(base, "lotte")
    path = festival(lotte)
    contribute(lotte, path, files={"image_upload": ("proef.gif", GIF, "image/gif")})
    setup(re.search(r'image="\w+\.gif"', read(page_file(path.split("/", 1)[1]))), "the GIF was not stored")
    status, _text, _ = Client(base).get(path + "/lineup")
    assert status == 200, f"the lineup with a GIF image gave {status}"


# Was filed as a known bug of #423; fixed in main by b8db4c9 (HyphaImage), retested on 2026-10-28.
@test
def an_unreadable_image_does_not_break_the_lineup(base):
    name = uniq("kapot") + ".jpg"
    write(os.path.join(DATA, "images", name), "geen afbeelding\n")
    lotte = login(base, "lotte")
    path = festival(lotte)
    contribute(lotte, path, image=name)
    status, _text, _ = Client(base).get(path + "/lineup")
    assert status == 200, f"the lineup with an unreadable image gave {status}"


# ---------------------------------------------------------------------------------------------------------------
# #428 mail header injection through the sender name of a mailing list.
# ---------------------------------------------------------------------------------------------------------------
@known_bug(428)
def a_line_break_in_the_sender_name_adds_no_mail_header(base):
    sanne = login(base, "sanne")
    path = mailing_list(sanne, sender_name="Redactie\r\nBcc: extra428@elders.example")
    before = len(mails())
    test_mail(sanne, path, mailing(sanne, path, "Proef 428"), "sanne@eemstad.example")
    sent = new_mails(before, "sanne@eemstad.example")
    setup(sent, "no test mail in mail.log")
    lines = headers_of(sent[0])
    assert not any(line.lower().startswith("bcc:") for line in lines), f"the mail has an extra header: {[line for line in lines if line.lower().startswith('bcc:')]}"


@known_bug(428)
def a_comma_in_the_sender_name_adds_no_sender_address(base):
    sanne = login(base, "sanne")
    path = mailing_list(sanne, sender_name="Redactie <nep428@elders.example>, Eemstad")
    before = len(mails())
    test_mail(sanne, path, mailing(sanne, path, "Proef 428 komma"), "sanne@eemstad.example")
    sent = new_mails(before, "sanne@eemstad.example")
    setup(sent, "no test mail in mail.log")
    sender = header(sent[0], "From")
    addresses = [a for _n, a in email.utils.getaddresses([sender]) if a]
    assert addresses == ["lijst@eemstad.example"], f"From: {sender} has the addresses {addresses}"


# ---------------------------------------------------------------------------------------------------------------
# #429 unescaped values in the digest mail and in the <title> of every mail.
# ---------------------------------------------------------------------------------------------------------------
@known_bug(429)
def the_digest_shows_an_anonymous_commenter_name_as_text(base):
    path = article(login(base, "beheer"))
    anonymous_comment(base, path, "Een reactie.", name='Bezoeker <b class="proef429a">vet</b>')
    comment = re.search(r'<discussion_comment xml:id="(\w+)"', read(page_file(path.split("/", 1)[1])))
    setup(comment, "the comment was not stored")
    sanne = login(base, "sanne")
    sanne.get(path)
    status, _text, _ = sanne.post(f"{path}/comments/{comment.group(1)}", "hide", "", {"reason": "spam"})
    setup(status == 302, f"hiding the comment gave {status}")
    setup("proef429a" in digest(), "no digest entry for the hidden comment")
    assert '<b class="proef429a">' not in digest(), "the digest has the name as markup: " + re.search(r"[^\n]*proef429a[^\n]*", digest()).group(0)[:160]


@known_bug(429)
def the_digest_shows_the_payment_hook_url_as_text(base):
    path = festival(login(base, "lotte"))
    status, _text, _ = Client(base).get(path + '/paymenthook/onbekend/sleutel?id=<b>proef429b</b>')
    setup(status == 403, f"the payment hook gave {status}")
    setup("proef429b" in digest(), "no digest entry for the payment hook")
    assert "<b>proef429b</b>" not in digest(), "the digest has the request url as markup: " + re.search(r"[^\n]*proef429b[^\n]*", digest()).group(0)[:160]


@known_bug(429)
def the_digest_shows_a_member_full_name_as_text(base):
    ahmed = login(base, "ahmed")
    set_user_attribute("u3", "fullname", 'Ahmed <b class="proef429c">el</b> Idrissi')
    try:
        ahmed.get("settings/invite")
        ahmed.post("settings/invite", "settingsInvite", "", {"inviteEmail": uniq("genodigde") + "@eemstad.example", "inviteWelcome": "Welkom"})
        setup("proef429c" in digest(), "no digest entry for the invitation")
        assert '<b class="proef429c">' not in digest(), "the digest has the full name as markup: " + re.search(r"[^\n]*proef429c[^\n]*", digest()).group(0)[:160]
    finally:
        set_user_attribute("u3", "fullname", "Ahmed el Idrissi")


@known_bug(429)
def the_mail_title_shows_the_subject_as_text(base):
    path = article(login(base, "beheer"))
    before = len(mails())
    anonymous_comment(base, path, "Een reactie.", name='Bezoeker <b class="proef429d">vet</b>')
    confirm = re.search(r'href="(http[^"]+/confirm\?code=\w+)"', "".join(new_mails(before)).replace("\r\n", " "))
    setup(confirm, "no confirmation mail with a link")
    before = len(mails())
    Client(base).get(confirm.group(1).replace(base.rstrip("/") + "/", ""))
    sent = new_mails(before, "sanne@eemstad.example", wait=5)
    setup(sent, "no new-comment mail to the members")
    title = re.search(r"<title>(.*?)</title>", sent[0], re.S).group(1)
    assert "<b" not in title, f"the <title> of the mail has markup: {title}"


# ---------------------------------------------------------------------------------------------------------------
# #430 the anonymous subscription form sends a confirmation mail on every submission.
# ---------------------------------------------------------------------------------------------------------------
@known_bug(430)
def a_pending_address_gets_one_confirmation_mail_per_quarter_of_an_hour(base):
    path = mailing_list(login(base, "sanne"))
    address = uniq("vloed") + "@elders.example"
    add_address(path, address, "pending")
    before = len(mails())
    for _ in range(3):
        status, _text, _ = subscribe(Client(base), path, address)
        setup(status == 302, f"subscription gave {status}")
    count = len(new_mails(before, address))
    assert count == 1, f"three subscriptions of a pending address within a few seconds sent {count} confirmation mails"


# ---------------------------------------------------------------------------------------------------------------
# #431 the website of a festival contribution is linked whatever its scheme.
# ---------------------------------------------------------------------------------------------------------------
@known_bug(431)
def a_contribution_website_with_another_scheme_is_no_link(base):
    lotte = login(base, "lotte")
    path = festival(lotte)
    contribute(lotte, path, website="javascript:proef431()")
    _status, text, _ = Client(base).get(path + "/lineup")
    setup("proef431" in text, "the website is not in the lineup")
    assert 'href="javascript:proef431' not in text, "the lineup links to javascript:proef431()"


# ---------------------------------------------------------------------------------------------------------------
# #544 a long non-ASCII subject is one encoded word longer than RFC 2047 allows.
# ---------------------------------------------------------------------------------------------------------------
@known_bug(544)
def a_long_non_ascii_subject_has_encoded_words_of_at_most_75_characters(base):
    sanne = login(base, "sanne")
    path = mailing_list(sanne)
    subject = "Nieuw artikel „Zoë’s café in Αθήνα” met een heel lange titel over de Eem en de stad"
    before = len(mails())
    test_mail(sanne, path, mailing(sanne, path, subject), "sanne@eemstad.example")
    sent = new_mails(before, "sanne@eemstad.example")
    setup(sent, "no test mail in mail.log")
    words = re.findall(r"=\?[^?]+\?[BbQq]\?[^?]*\?=", header(sent[0], "Subject") or "")
    setup(words, "the subject is not encoded")
    longest = max(len(w) for w in words)
    assert longest <= 75, f"an encoded word of {longest} characters (RFC 2047: at most 75)"


# ---------------------------------------------------------------------------------------------------------------
# #549 the festival timetable shows the title, day and location of a contribution as HTML.
# ---------------------------------------------------------------------------------------------------------------
def timetable(base, title="Lezing", day="Zaterdag", location="Grote zaal"):
    lotte = login(base, "lotte")
    path = festival(lotte)
    contribute(lotte, path, title=title)
    schedule(path, day, location)
    status, text, _ = Client(base).get(path + "/timetable")
    setup(status == 200, f"the timetable gave {status}")
    return text


@known_bug(549)
def the_timetable_shows_a_contribution_title_as_text(base):
    text = timetable(base, title='Lezing <b class="proef549a">vet</b>')
    setup("proef549a" in text, "the title is not in the timetable")
    assert '<b class="proef549a">' not in text, "the timetable has the title as markup"


@known_bug(549)
def the_timetable_shows_a_day_as_text(base):
    text = timetable(base, day='Zaterdag <b class="proef549b">vet</b>')
    setup("proef549b" in text, "the day is not in the timetable")
    assert '<b class="proef549b">' not in text, "the timetable has the day as markup"


@known_bug(549)
def the_timetable_shows_a_location_as_text(base):
    text = timetable(base, location='Zaal <b class="proef549c">vet</b>')
    setup("proef549c" in text, "the location is not in the timetable")
    assert '<b class="proef549c">' not in text, "the timetable has the location as markup"


# ---------------------------------------------------------------------------------------------------------------
# #553 address actions of a mailing list are GET links without CSRF token; mailing progress needs no login.
# ---------------------------------------------------------------------------------------------------------------
@known_bug(553)
def opening_the_delete_link_does_not_remove_a_pending_address(base):
    path = mailing_list(login(base, "sanne"))
    address = uniq("wacht") + "@eemstad.example"
    add_address(path, address, "pending")
    setup(address_status(path, address) == "pending", "the address is not pending")
    login(base, "beheer").get(f"{path}/delete?email={address}")
    assert address_status(path, address) == "pending", f"a GET of the delete link removed the address (now {address_status(path, address)})"


@known_bug(553)
def opening_the_unsubscribe_link_does_not_unsubscribe_an_address(base):
    beheer = login(base, "beheer")
    path = mailing_list(beheer)
    address = uniq("lid") + "@eemstad.example"
    add_address(path, address, "confirmed")
    setup(address_status(path, address) == "confirmed", "the address is not confirmed")
    beheer.get(f"{path}/unsubscribe_by_admin?email={address}")
    assert address_status(path, address) == "confirmed", f"a GET of the unsubscribe link changed the address to {address_status(path, address)}"


@known_bug(553)
def opening_the_remind_link_sends_no_mail(base):
    path = mailing_list(login(base, "sanne"))
    address = uniq("herinner") + "@eemstad.example"
    add_address(path, address, "pending")
    before = len(mails())
    login(base, "beheer").get(f"{path}/remind?email={address}")
    count = len(new_mails(before, address))
    assert count == 0, f"a GET of the remind link sent {count} mail"


@known_bug(553)
def the_progress_of_a_mailing_needs_a_login(base):
    sanne = login(base, "sanne")
    path = mailing_list(sanne)
    mailing_id = mailing(sanne, path, "Concept 553")
    anon = Client(base)
    anon.get(path)
    status, text, _ = anon.post(f"{path}/mails/{mailing_id}", "progress")
    assert '"status"' not in text, f"an anonymous visitor gets the progress ({status}): {text[:100]}"


# ---------------------------------------------------------------------------------------------------------------
# #554 user names are not unique.
# ---------------------------------------------------------------------------------------------------------------
# Was a known bug of #554; fixed in main by #566, retested on 2026-10-28.
@test
def a_member_cannot_rename_to_the_user_name_of_another_member(base):
    lotte = login(base, "lotte")
    try:
        lotte.get("settings/user/lotte")
        lotte.post("settings", "settingsSaveAccount", "lotte", {"settingsUsername": "joris", "settingsFullname": "Lotte Bakker",
                                                                  "settingsEmail": "lotte@eemstad.example", "settingsUiLang": "nl",
                                                                  "settingsPassword1": "", "settingsPassword2": ""})
        count = read(HYPHA_XML).count('username="joris"')
        assert count == 1, f"hypha.xml has {count} users named joris"
    finally:
        set_user_attribute("u4", "username", "lotte")


# Was a known bug of #554; fixed in main by #566, retested on 2026-10-28.
@test
def an_invitee_cannot_register_with_the_user_name_of_a_member(base):
    address = uniq("nieuw") + "@eemstad.example"
    beheer = login(base, "beheer")
    beheer.get("settings/invite")
    beheer.post("settings/invite", "settingsInvite", "", {"inviteEmail": address, "inviteWelcome": "Welkom"})
    match = re.search(r'<user id="(\w+)"[^>]*email="' + re.escape(address) + r'"[^>]*key="([^"]+)"', read(HYPHA_XML)) or \
        re.search(r'<user id="(\w+)"[^>]*key="([^"]+)"[^>]*email="' + re.escape(address) + '"', read(HYPHA_XML))
    setup(match, "no invitation in hypha.xml")
    user_id, key = match.groups()
    try:
        anon = Client(base)
        anon.get("settings/register/" + key)
        anon.post("settings/register", "settingsRegister", key, {"settingsUsername": "beheer", "settingsFullname": "Nieuw lid",
                                                                 "settingsEmail": address, "settingsUiLang": "nl",
                                                                 "settingsPassword1": "proef-wachtwoord-554", "settingsPassword2": "proef-wachtwoord-554"})
        count = read(HYPHA_XML).count('username="beheer"')
        assert count == 1, f"hypha.xml has {count} users named beheer"
    finally:
        set_user_attribute(user_id, "username", "")


# ---------------------------------------------------------------------------------------------------------------
# #181 notification mails use the language of the request, not of the recipient.
# ---------------------------------------------------------------------------------------------------------------
def revert_for_digest(client):
    """A text page with two versions, reverted to the first: the only digest entry with a 'view changes' link."""
    name = uniq("Herstel_")
    path = text_page(client, "<p>Eerste versie.</p>", name)
    time.sleep(1.1)
    save_text(client, path, name, "<p>Tweede versie.</p>")
    versions = re.findall(r'<version xml:id="(t\d+)"', read(page_file(name)))
    setup(len(versions) >= 2, f"the page has versions {versions}")
    status, _text, _ = client.post(path, "revert", "", {"version": min(versions)})
    setup(status == 302, f"revert gave {status}")
    pid = page_id(name)
    setup(f'href="#{pid}"' in digest(), "no 'view changes' entry in the digest")
    return pid


@known_bug(181)
def the_digest_is_in_the_language_of_the_recipient(base):
    revert_for_digest(login(base, "ahmed"))
    old = set_user_attribute("u2", "language", "en")
    try:
        before = len(mails())
        force_digest()
        Client(base).get("nl/Start")
        sent = new_mails(before, "sanne@eemstad.example", wait=10)
        setup(sent, "no digest mail to sanne")
        setup("samenvatting" in body_of(sent[0]) or "summary" in body_of(sent[0]), "the mail to sanne is not a digest")
        assert "hypha summary" in body_of(sent[0]), "the digest to a member with English as interface language is in Dutch"
    finally:
        set_user_attribute("u2", "language", old)


# ---------------------------------------------------------------------------------------------------------------
# #237 the 'view changes' links of the digest point to the site instead of the anchor in the mail.
# ---------------------------------------------------------------------------------------------------------------
@known_bug(237)
def view_changes_in_the_digest_links_to_the_anchor_in_the_mail(base):
    pid = revert_for_digest(login(base, "ahmed"))
    before = len(mails())
    force_digest()
    Client(base).get("nl/Start")
    sent = new_mails(before, "beheer@eemstad.example", wait=10)
    setup(sent and f'name="{pid}"' in sent[0], "no digest mail with the changes of the page")
    links = re.findall(r'href="([^"]*#' + pid + ')"', sent[0])
    setup(links, "no 'view changes' link in the digest mail")
    assert links == ["#" + pid], f"'view changes' links to {links[0]}, not to the anchor #{pid} in the mail"


# ---------------------------------------------------------------------------------------------------------------
# #419 stored XSS by members through editor HTML, user attributes and page names.
# ---------------------------------------------------------------------------------------------------------------
@known_bug(419)
def an_event_handler_attribute_in_editor_html_is_not_stored(base):
    path = text_page(login(base, "sanne"), '<p><a href="https://eemstad.example/" onmouseover="proef419a()">Link</a></p>')
    _status, text, _ = Client(base).get(path)
    setup("Link</a>" in text, "the link is not on the page")
    assert "proef419a" not in text, "the page has the event handler: " + re.search(r"<a [^>]*proef419a[^>]*>", text).group(0)


@known_bug(419)
def a_javascript_link_in_editor_html_is_not_stored(base):
    path = text_page(login(base, "sanne"), '<p><a href="javascript:proef419b()">Link</a></p>')
    _status, text, _ = Client(base).get(path)
    setup("Link</a>" in text, "the link is not on the page")
    assert "javascript:proef419b" not in text, "the page links to javascript:proef419b()"


@known_bug(419)
def an_editor_link_creates_no_page_with_markup_in_its_name(base):
    text_page(login(base, "sanne"), '<p><a href="nl/Proef&lt;b class=&quot;proef419c&quot;&gt;vet">Nieuwe pagina</a></p>')
    names = re.findall(r'name="([^"]*proef419c[^"]*)"', read(HYPHA_XML))
    assert not any("&lt;" in n or "&quot;" in n for n in names), f"a page was made with the name {names[0]}"


def markup_page(nl_name, en_name=None):
    """A text page whose stored name has markup characters (as an editor link can make, see above), written into
    hypha.xml; with en_name also in English."""
    pid = uniq("markup")
    esc = lambda n: n.replace("&", "&amp;").replace('"', "&quot;").replace("<", "&lt;").replace(">", "&gt;")  # noqa: E731
    languages = f'<language id="nl" name="{esc(nl_name)}"/>' + (f'<language id="en" name="{esc(en_name)}"/>' if en_name else "")
    write(HYPHA_XML, read(HYPHA_XML).replace("</pageList>", f'<page id="{pid}" type="textpage" private="off">{languages}</page></pageList>', 1))
    version = '<version xml:id="t179300000{}" author=""><p>Proef.</p></version>'
    write(os.path.join(DATA, "pages", pid), '<?xml version="1.0" encoding="UTF-8"?>\n<hypha type="textpage" multiLingual="on" versions="on" schemaVersion="1">'
          f'<language xml:id="nl">{version.format(0)}</language>' + (f'<language xml:id="en">{version.format(1)}</language>' if en_name else "") + "</hypha>")


@known_bug(419)
def the_page_index_shows_a_page_name_as_text(base):
    markup_page(uniq("Proef") + "<b>proef419d</b>")
    status, text, _ = Client(base).get("index/nl")
    setup(status == 200 and "proef419d" in text, f"the page is not in the index ({status})")
    assert "<b>proef419d</b></a>" not in text, "the page index has the page name as markup: " + re.search(r"<a [^>]*>[^<]*<b>proef419d</b></a>", text).group(0)


@known_bug(419)
def the_language_links_show_a_page_name_as_text(base):
    name = uniq("Talen")
    markup_page(name, 'Engels" onmouseover="proef419f()')
    status, text, _ = Client(base).get("nl/" + name)
    setup(status == 200 and "proef419f" in text, f"the page with an English version gave {status}")
    assert 'onmouseover="proef419f()"' not in text, "the language link has an event handler: " + re.search(r'<a [^>]*proef419f[^>]*>', text).group(0)


@known_bug(419)
def the_member_list_shows_a_full_name_as_text(base):
    joris = login(base, "joris")
    try:
        joris.get("settings/user/joris")
        joris.post("settings", "settingsSaveAccount", "joris", {"settingsUsername": "joris", "settingsFullname": 'Joris <b class="proef419e">Mulder</b>',
                                                                "settingsEmail": "joris@eemstad.example", "settingsUiLang": "nl",
                                                                "settingsPassword1": "", "settingsPassword2": ""})
        setup("proef419e" in read(HYPHA_XML), "the full name was not saved")
        _status, text, _ = login(base, "beheer").get("settings")
        setup("proef419e" in text, "the full name is not in the member list")
        assert '<b class="proef419e">' not in text, "the member list has the full name as markup"
    finally:
        set_user_attribute("u5", "fullname", "Joris Mulder")


@known_bug(419)
def a_user_name_with_markup_characters_is_refused(base):
    joris = login(base, "joris")
    try:
        joris.get("settings/user/joris")
        joris.post("settings", "settingsSaveAccount", "joris", {"settingsUsername": 'joris"<b>', "settingsFullname": "Joris Mulder",
                                                                "settingsEmail": "joris@eemstad.example", "settingsUiLang": "nl",
                                                                "settingsPassword1": "", "settingsPassword2": ""})
        stored = re.search(r'<user id="u5"[^>]*username="([^"]*)"', read(HYPHA_XML)).group(1)
        assert stored == "joris", f"the user name was changed to {stored}"
    finally:
        set_user_attribute("u5", "username", "joris")


# ---------------------------------------------------------------------------------------------------------------
# #539 a control character or invalid UTF-8 makes an article or the whole site unreadable. Last, since on main
# these break the site; every test repairs what it broke.
# ---------------------------------------------------------------------------------------------------------------
@known_bug(539)
def a_vertical_tab_in_a_comment_keeps_the_article_readable(base):
    path = article(login(base, "beheer"))
    file = page_file(path.split("/", 1)[1])
    anonymous_comment(base, path, "Mooi\x0bstuk")
    try:
        status, _text, _ = Client(base).get(path)
        assert status == 200, f"the article gave {status} after a comment with a vertical tab"
    finally:
        repair(file, b"\x0b", b" ")


def repair(path, wrong, right):
    with open(path, "rb") as f:
        raw = f.read()
    if wrong in raw:
        write(path, raw.replace(wrong, right))


def save_full_name(base, full_name):
    lotte = login(base, "lotte")
    lotte.get("settings/user/lotte")
    lotte.post("settings", "settingsSaveAccount", "lotte", {"settingsUsername": "lotte", "settingsFullname": full_name,
                                                              "settingsEmail": "lotte@eemstad.example", "settingsUiLang": "nl",
                                                              "settingsPassword1": "", "settingsPassword2": ""})


@known_bug(539)
def a_vertical_tab_in_a_full_name_keeps_the_site_readable(base):
    save_full_name(base, "Lotte\x0bBakker")
    try:
        status, _text, _ = Client(base).get("nl/Start")
        assert status == 200, f"the home page gave {status} after a full name with a vertical tab"
    finally:
        repair(HYPHA_XML, b"\x0b", b" ")
        set_user_attribute("u4", "fullname", "Lotte Bakker")


@known_bug(539)
def invalid_utf8_in_a_full_name_keeps_the_site_readable(base):
    save_full_name(base, "Lotte \udcffBakker".encode("utf-8", "surrogateescape"))
    try:
        status, _text, _ = Client(base).get("nl/Start")
        assert status == 200, f"the home page gave {status} after a full name with a byte that is not UTF-8"
    finally:
        repair(HYPHA_XML, b"Lotte \xffBakker", b"Lotte Bakker")
        set_user_attribute("u4", "fullname", "Lotte Bakker")


@known_bug(628)
def the_heading_of_the_comments_comes_before_the_comments(base):
    path = article(Client(base).login("beheer"))
    status, text, _ = Client(base).get(path)
    setup(status == 200, f"the article gave {status}")
    block = re.search(r'<div class="public-comments-wrapper">(.*?)<form', text, re.S)
    setup(block, "the article has no block of public comments")
    assert block.group(1).lstrip().startswith("<h2>"), f"the comments block starts with {block.group(1).strip()[:60]!r}, not with its heading"


@known_bug(629)
def the_motivation_field_of_a_contribution_has_dutch_texts(base):
    beheer = Client(base).login("beheer")
    path = festival(beheer)
    status, text, _ = beheer.get(path + "/contribute")
    setup(status == 200, f"the contribution form gave {status}")
    #
    # A key that is missing in the dictionary is shown as the key itself (Language::translate()).
    #
    assert "festival-field-contribution-motivation" not in text, "the Dutch contribution form shows the key festival-field-contribution-motivation"
    contribute(beheer, path)
    status, text, _ = beheer.get(path + "/contributions")
    setup(status == 200 and "Past bij het thema" in text, f"the list of contributions gave {status} without the motivation")
    assert "motivation:" not in text, "the list of contributions shows the bare key 'motivation:'"


if __name__ == "__main__":
    sys.exit(run(sys.argv[1]))
