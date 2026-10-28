"""The mail of an article with review, received by an SMTP server (design section 14: status changes by mail).

tests/integratie/run.sh points sendmail_path of the container to tests/integratie/sendmail.php, which hands every
message of mail() over SMTP to the server that this file runs on the host, on HYPHA_SMTP_PORT. The tests check what a
member really gets: one message per member, a readable subject in UTF-8, the sender of the site, HTML in UTF-8, lines
within the limit of RFC 5322 and a full link to the article.
"""
import email
import email.header
import email.policy
import json
import os
import re
import socketserver
import sys
import threading
import time
import xml.etree.ElementTree as ET

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hypha import Client, run, test  # noqa: E402

WORK = os.environ.get("HYPHA_WORK", "")
SMTP_PORT = int(os.environ.get("HYPHA_SMTP_PORT", "8162"))
STATUTE = list(range(5))
RECEIVED = []


class Smtp(socketserver.StreamRequestHandler):
    """Just enough SMTP (RFC 5321) for sendmail.php: EHLO, MAIL, RCPT, DATA and QUIT."""

    def reply(self, line):
        self.wfile.write((line + "\r\n").encode())

    def handle(self):
        self.reply("220 hypha-test")
        sender, recipients = "", []
        while True:
            line = self.rfile.readline().decode("utf-8", "replace").rstrip("\r\n")
            verb = line[:4].upper()
            if verb in ("EHLO", "HELO"):
                self.reply("250 hypha-test")
            elif verb == "MAIL":
                sender, recipients = line[10:].strip("<>"), []
                self.reply("250 ok")
            elif verb == "RCPT":
                recipients.append(line[8:].strip("<>"))
                self.reply("250 ok")
            elif verb == "DATA":
                self.reply("354 end with .")
                data = b""
                while True:
                    chunk = self.rfile.readline()
                    if chunk in (b".\r\n", b".\n", b""):
                        break
                    data += chunk[1:] if chunk.startswith(b"..") else chunk
                RECEIVED.append({"sender": sender, "recipients": recipients, "raw": data})
                self.reply("250 queued")
            elif verb == "QUIT" or not line:
                self.reply("221 bye")
                return
            else:
                self.reply("502 not implemented")


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


def members():
    """The e-mail addresses of the members of the test site."""
    users = ET.parse(os.path.join(WORK, "data/hypha.xml")).getroot().find("userList")
    return sorted(u.get("email") for u in users if u.get("rights") in ("user", "admin") and u.get("email"))


def mails_after(action, count, timeout=10):
    """Runs action and returns the messages received for it, once count of them have arrived."""
    start = len(RECEIVED)
    action()
    deadline = time.time() + timeout
    while time.time() < deadline and len(RECEIVED) - start < count:
        time.sleep(0.1)
    return RECEIVED[start:]


def subject(message):
    return str(email.header.make_header(email.header.decode_header(message["Subject"])))


def new_article(client, title):
    status, _, location = client.post("nl/Start", "mdNewArticle", title, {"newPageLanguage": "nl", "mdMode": "markdown"})
    assert status in (302, 303), status
    return re.sub(r"^https?://[^/]+/", "", location).replace("/edit", "").split("?")[0]


def save(client, path, title):
    f = {"title": title, "author": "Sanne de Vries", "section": "Politiek en bestuur", "tags": ["Raadsnieuws"],
         "excerpt": "Een proef van de mail.", "method": "Sanne de Vries is verslaggever.", "sources": "- Raadsinformatie (voorbeeldbron)",
         "text": "Een proef van de mail bij een statuswijziging.", "image": "", "imageAlt": "", "imageCaption": "", "imageCredit": ""}
    status, text, _ = client.post(path + "/edit", "md_save", "", {"md_fields": json.dumps(f), "md_renders": "{}", "ajax": "1"})
    assert status == 200 and json.loads(text)["ok"], (status, text[:300])


def command(client, path, name, extra=None):
    client.get(path)
    return client.follow(client.post(path, name, "", extra))


def check(messages, base, path, title, words):
    """Every member gets one message with a readable subject, the site as sender, HTML in UTF-8 and a full link."""
    addresses = sorted(a for m in messages for a in m["recipients"])
    assert addresses == members(), f"recipients {addresses}, expected one message for each member {members()}"
    for m in messages:
        message = email.message_from_bytes(m["raw"], policy=email.policy.compat32)
        assert m["sender"] == "redactie@eemstad.example", f"envelope sender {m['sender']}"
        text = subject(message)
        assert text.startswith("Proefsite Eemstad: ") and title in text and all(w in text for w in words), f"subject {text!r}"
        assert "redactie@eemstad.example" in message["From"] and "Proefsite Eemstad" in str(email.header.make_header(email.header.decode_header(message["From"]))), f"From {message['From']}"
        assert "text/html" in message["Content-Type"] and "utf-8" in message["Content-Type"].lower(), f"Content-Type {message['Content-Type']}"
        body = message.get_payload(decode=True).decode("utf-8")
        assert title in body, "the body does not have the title in UTF-8"
        assert base.rstrip("/") + "/" + path in body, f"the body has no full link to {path}"
        assert max(len(line) for line in m["raw"].split(b"\r\n")) <= 998, "a line is longer than 998 octets (RFC 5322)"


SERVER = Server(("127.0.0.1", SMTP_PORT), Smtp)
threading.Thread(target=SERVER.serve_forever, daemon=True).start()
TITLE = "Café aan de Eem: één proef van de mail " + time.strftime("%H%M%S")
STATE = {}


@test
def starting_the_review_mails_every_member(base):
    sanne = Client(base).login("sanne")
    path = new_article(sanne, TITLE)
    save(sanne, path, TITLE)
    STATE.update(sanne=sanne, path=path)
    messages = mails_after(lambda: command(sanne, path, "status_change_review"), len(members()))
    check(messages, base, path, TITLE, ["review"])


@test
def the_third_approval_mails_every_member_the_new_status(base):
    path = STATE["path"]
    for name in ("lotte", "joris"):
        command(Client(base).login(name), path, "approve", {"md_statute[]": STATUTE})
    messages = mails_after(lambda: command(Client(base).login("beheer"), path, "approve", {"md_statute[]": STATUTE}), len(members()))
    check(messages, base, path, TITLE, ["goedgekeurd"])


@test
def taking_an_approved_article_back_to_draft_mails_its_reviewers(base):
    path = STATE["path"]
    reviewers = ["beheer@eemstad.example", "joris@eemstad.example", "lotte@eemstad.example"]
    messages = mails_after(lambda: command(STATE["sanne"], path, "md_retract"), len(reviewers))
    assert sorted(a for m in messages for a in m["recipients"]) == reviewers, f"recipients {[m['recipients'] for m in messages]}, expected the three reviewers (BR-85)"
    for m in messages:
        message = email.message_from_bytes(m["raw"], policy=email.policy.compat32)
        assert subject(message) == f"Proefsite Eemstad: Terug naar schets: '{TITLE}'", f"subject {subject(message)!r}"
        body = message.get_payload(decode=True).decode("utf-8")
        assert "Sanne de Vries" in body and "goedkeuring is vervallen" in body and base.rstrip("/") + "/" + path in body, body[:300]


@test
def review_again_and_publish_mails_every_member(base):
    path = STATE["path"]
    sanne = STATE["sanne"]
    command(sanne, path, "status_change_review")
    for name in ("lotte", "joris", "beheer"):
        command(Client(base).login(name), path, "approve", {"md_statute[]": STATUTE})
    messages = mails_after(lambda: command(sanne, path, "status_change_published"), len(members()))
    check(messages, base, path, TITLE, ["gepubliceerd"])


@test
def withdrawing_a_published_article_sends_no_mail(base):
    #
    # BR-86 asks for a notice to readers on the page, not for mail.
    #
    messages = mails_after(lambda: command(STATE["sanne"], STATE["path"], "md_withdraw", {"md_reason": "Een jaartal klopte niet."}), 1, timeout=3)
    assert not messages, f"withdrawing sent {len(messages)} messages"

if __name__ == "__main__":
    sys.exit(run(sys.argv[1]))
