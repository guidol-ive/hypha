"""Known bugs of the mailing list, the festival, the settings, the member list and logging in and out.

Every test makes its own mailing list or festival page with the newPage command and then writes the data of that page
directly into $HYPHA_WORK/data/pages/<id> (addresses, mailings, a configured form), because subscribing itself fails
on main (#440). Mail is captured in $HYPHA_WORK/data/mail.log. PHP messages are read from the log of the container,
whose name is the folder name of $HYPHA_WORK without the trailing time stamp (tests/bekend.sh).
"""
import os
import re
import subprocess
import sys
import threading
import time
import xml.etree.ElementTree as ET

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "integratie"))
from hypha import Client, known_bug, run  # noqa: E402

WORK = os.environ.get("HYPHA_WORK", "")
DATA = os.path.join(WORK, "data")
SITE = os.path.join(DATA, "hypha.xml")


#
# Helpers.
#
def page_id(name):
    for page in ET.parse(SITE).getroot().iter("page"):
        for language in page.findall("language"):
            if language.get("name") == name:
                return page.get("id")
    raise RuntimeError(f"no page {name} in hypha.xml")


def new_page(admin, name, kind):
    """Create a page with the newPage command of the popup 'nieuwe pagina'; returns the answer to that command."""
    admin.get("nl/Start")
    return admin.post(f"nl/{name}/edit", "newPage", name, {"newPageType": kind, "newPageLanguage": "nl"})


def write_page(name, text):
    path = os.path.join(DATA, "pages", page_id(name))
    with open(path, "w", encoding="utf-8") as f:
        f.write('<?xml version="1.0" encoding="UTF-8"?>\n' + text)
    os.chmod(path, 0o666)
    return path


def read_page(name):
    return ET.parse(os.path.join(DATA, "pages", page_id(name))).getroot()


def mailing_list(name, addresses="", mailings=""):
    """A mailing list with a sender, the given <address> and <mailing> elements, made by the administrator."""
    beheer = login(BASE, "beheer")
    status, _, _ = new_page(beheer, name, "mailinglist")
    if status != 302:
        raise RuntimeError(f"newPage mailinglist gave {status}")
    write_page(name, f'<hypha type="mailinglist" multiLingual="on" versions="off" schemaVersion="1" sender-email="redactie@eemstad.example" sender-name="Redactie">'
                     f'<description><p>Verzonnen nieuwsbrief.</p></description><addresses>{addresses}</addresses><mailings>{mailings}</mailings>'
                     f'<email_welcome_text><p>Welkom bij de verzonnen nieuwsbrief.</p></email_welcome_text></hypha>')
    return beheer


SIGNUP_FORM = ('<form xml:id="signup-form"><table>'
               '<tr><td><input required="required" type="text" name="name"/></td></tr>'
               '<tr><td><input required="required" type="email" name="email"/></td></tr>'
               '<tr><td><input type="text" name="phone"/></td></tr>'
               '<tr><td><input type="text" name="amount"/></td></tr>'
               '<tr><td><input type="text" name="attending"/></td></tr></table></form>')


def festival(name, extra=""):
    """A festival made by the administrator; extra is XML added to the page (a configured form, participants)."""
    beheer = login(BASE, "beheer")
    status, _, _ = new_page(beheer, name, "festivalpage")
    if status != 302:
        raise RuntimeError(f"newPage festivalpage gave {status}")
    if extra:
        write_page(name, '<hypha type="festival" multiLingual="on" versions="off" schemaVersion="1">'
                         '<config xml:id="festival-title" value="Buurtfeest Eemstad"/><config xml:id="festival-description" value="Verzonnen feest."/>'
                         + extra + '</hypha>')
    return beheer


def chase(client, path, limit=5):
    """Follow redirects from path; returns the last answer and the addresses visited."""
    seen = [path]
    status, text, location = client.get(path)
    while status in (301, 302, 303) and location and len(seen) <= limit:
        path = location.replace(client.base, "").lstrip("/")
        seen.append(path)
        status, text, location = client.get(path)
    return status, text, seen


def mail_log():
    path = os.path.join(DATA, "mail.log")
    return open(path, encoding="utf-8", errors="replace").read() if os.path.exists(path) else ""


def container():
    return re.sub(r"-\d+$", "", os.path.basename(WORK.rstrip("/")))


def php_messages(action):
    """The PHP messages (warnings, deprecations, errors) that the container logs while action runs."""
    engine = os.environ.get("ENGINE", "docker")

    def log():
        result = subprocess.run([engine, "logs", container()], capture_output=True, text=True, errors="replace", check=True)
        return [line for line in (result.stdout + result.stderr).splitlines() if "PHP " in line]
    before = len(log())
    action()
    time.sleep(0.5)
    return log()[before:]


def login(base, name):
    """Client.login, but a failed login is a broken site (an error), not the known bug."""
    try:
        return Client(base).login(name)
    except AssertionError as error:
        raise RuntimeError(str(error)) from None


def without_notifications(text):
    """The page without the notification box #hyphaNotify, whose messages disappear after ten seconds."""
    return re.sub(r'<div id="hyphaNotify">.*?</div></div>', "", text, flags=re.S)


BASE = ""


#
# #29: after confirming or unsubscribing, the result stays readable on the page.
#
@known_bug(29)
def confirming_a_subscription_shows_the_result_on_the_page_not_only_in_a_passing_notification(base):
    mailing_list("Lijst29a", '<address email="piet@eemstad.example" status="pending" confirm-code="bevestig29" reminded=""/>')
    status, text, seen = chase(Client(base), "nl/Lijst29a/confirm?code=bevestig29")
    assert status == 200, f"confirm ended in {status} after {seen}"
    page = without_notifications(text).lower()
    assert "aangemeld" in page or "bevestigd" in page, "the confirmation is only in #hyphaNotify, which disappears after 10 s"


@known_bug(29)
def unsubscribing_shows_the_result_on_the_page_not_only_in_a_passing_notification(base):
    mailing_list("Lijst29b", '<address email="kees@eemstad.example" status="confirmed" unsubscribe-code="afmeld29" reminded=""/>')
    status, text, seen = chase(Client(base), "nl/Lijst29b/unsubscribe?address=kees@eemstad.example&code=afmeld29")
    assert status == 200, f"unsubscribe ended in {status} after {seen}"
    page = without_notifications(text).lower()
    assert "afgemeld" in page or "uitgeschreven" in page, "the unsubscription is only in #hyphaNotify, which disappears after 10 s"


#
# #80: a removed member keeps name and e-mail address in hypha.xml.
#
@known_bug(80)
def removing_a_member_removes_the_personal_details(base):
    beheer = login(base, "beheer")
    beheer.get("settings")
    status, _, _ = beheer.post("settings", "settingsRemove", "u5")
    if status not in (200, 302):
        raise RuntimeError(f"settingsRemove gave {status}")
    user = next(u for u in ET.parse(SITE).getroot().iter("user") if u.get("id") == "u5")
    if user.get("rights") != "exmember":
        raise RuntimeError(f"rights is {user.get('rights')!r}, the removal did not happen")
    kept = {k: user.get(k) for k in ("fullname", "email") if user.get(k)}
    assert not kept, f"the removed member still has {kept}"


#
# #196: logging out without a home page.
#
@known_bug(196)
def logging_out_in_a_language_without_home_page_lands_on_an_existing_page(base):
    sanne = login(base, "sanne")
    sanne.get("en/Start")
    status, _, location = sanne.post("en/Start", "logout")
    assert status == 302 and location, f"logout gave {status}"
    final, _, seen = chase(sanne, location.replace(sanne.base, ""))
    assert final == 200, f"logout leads to {seen[-1]}, which answers {final}"


@known_bug(196)
def logging_out_works_when_the_default_page_does_not_exist(base):
    sanne = login(base, "sanne")
    sanne.get("settings")
    original = open(SITE, encoding="utf-8").read()
    if 'defaultPage="Start"' not in original:
        raise RuntimeError("hypha.xml has no defaultPage=\"Start\"")
    with open(SITE, "w", encoding="utf-8") as f:
        f.write(original.replace('defaultPage="Start"', 'defaultPage="Bestaatniet"'))
    try:
        status, _, _ = sanne.post("settings", "logout")
        _, text, _ = sanne.get("nl/Start")
    finally:
        current = open(SITE, encoding="utf-8").read()
        with open(SITE, "w", encoding="utf-8") as f:
            f.write(current.replace('defaultPage="Bestaatniet"', 'defaultPage="Start"'))
    assert status != 500, "logout from settings gave 500"
    assert "logout" not in text, "the member is still logged in after logout"


#
# #438: the mailing-list send action checks the status before the lock and the receivers after marking "sending".
#
@known_bug(438)
def sending_to_a_list_without_confirmed_addresses_leaves_the_mailing_a_draft(base):
    mailing_list("Lijst438a", '<address email="piet@eemstad.example" status="pending" confirm-code="c438" reminded=""/>',
                 '<mailing xml:id="m438a" status="draft" subject="Leeg 438"><p>Niemand ontvangt dit.</p></mailing>')
    sanne = login(base, "sanne")
    sanne.get("nl/Lijst438a/mails/m438a")
    sanne.post("nl/Lijst438a/mails/m438a", "send", "")
    mailing = read_page("Lijst438a").find(".//mailing")
    assert mailing.get("status") == "draft", f"the mailing is now {mailing.get('status')!r} and can no longer be edited or sent"


HOLDER = r"""
$f = fopen($argv[1], 'c+');
flock($f, LOCK_EX);
echo "locked\n";
fgets(STDIN);
flock($f, LOCK_UN);
"""


def at_the_same_time(name, requests):
    """Run the requests at the same time: they queue on the lock of the page, which is held inside the container
    until all have started, and are then let go together. Which request gets the lock first is up to the kernel, so
    a race of #438 shows in about half of the rounds, not in every one. Returns the status codes."""
    engine = os.environ.get("ENGINE", "docker")
    holder = subprocess.Popen([engine, "exec", "-i", container(), "php", "-r", HOLDER, "data/pages/" + page_id(name)],
                              stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True)
    if holder.stdout.readline().strip() != "locked":
        raise RuntimeError("could not lock the page in the container")
    statuses = []
    threads = [threading.Thread(target=lambda r=request: statuses.append(r()[0])) for request in requests]
    for thread in threads:
        thread.start()
    time.sleep(1)
    holder.communicate("go\n", timeout=30)
    for thread in threads:
        thread.join(120)
    if len(statuses) != len(requests):
        raise RuntimeError("a request did not finish")
    return statuses


#
# A round shows the race in about half (send) or a third (edit) of the cases on main; the chance that a run with the
# bug passes is below 0.1 % (send, 10 rounds) and 0.5 % (edit, 15 rounds). A round in which a request fails with 500
# does not count: in the container the lock now and then fails with "fopen(data/pages/...): No such file or
# directory" while another request replaces the file.
#
def race_rounds(rounds, round_function):
    counted = tried = 0
    while counted < rounds:
        tried += 1
        if tried > 2 * rounds:
            raise RuntimeError(f"only {counted} of {tried - 1} rounds without a server error")
        if round_function(tried) is not None:
            counted += 1


@known_bug(438)
def members_pressing_send_at_the_same_time_send_the_mailing_once(base):
    members = [login(base, name) for name in ("sanne", "ahmed", "lotte", "beheer")]

    def one(round):
        name, subject = f"Lijst438b{round}", f"Dubbel 438 {round} {time.time()}"
        mailing_list(name, '<address email="kees@eemstad.example" status="confirmed" unsubscribe-code="u438" reminded=""/>',
                     f'<mailing xml:id="m438" status="draft" subject="{subject}"><p>Een keer.</p></mailing>')
        for member in members:
            member.get(f"nl/{name}/mails/m438")
        if 500 in at_the_same_time(name, [lambda m=member: m.post(f"nl/{name}/mails/m438", "send", "") for member in members]):
            return None
        sent = mail_log().count(f"<title>{subject}</title>")
        assert sent == 1, f"round {round}: kees@eemstad.example received the mailing {sent} times"
        return True
    race_rounds(10, one)


@known_bug(438)
def an_edit_at_the_same_time_as_send_does_not_change_the_mailing_being_sent(base):
    sanne, ahmed = login(base, "sanne"), login(base, "ahmed")

    def one(round):
        name, subject = f"Lijst438c{round}", f"Origineel 438 {round} {time.time()}"
        mailing_list(name, '<address email="kees@eemstad.example" status="confirmed" unsubscribe-code="u438c" reminded=""/>',
                     f'<mailing xml:id="m438" status="draft" subject="{subject}"><p>Origineel.</p></mailing>')
        sanne.get(f"nl/{name}/mails/m438")
        ahmed.get(f"nl/{name}/mails_edit/m438")
        if 500 in at_the_same_time(name, [lambda: sanne.post(f"nl/{name}/mails/m438", "send", ""),
                                          lambda: ahmed.post(f"nl/{name}/mails_edit/m438", "save", "", {"subject": "Gewijzigd " + subject, "message": "<p>Gewijzigd.</p>"})]):
            return None
        stored = read_page(name).find(".//mailing").get("subject")
        mailed = re.findall(r"<title>((?:Gewijzigd )?" + re.escape(subject) + ")</title>", mail_log())
        assert mailed == [stored], f"round {round}: mailed {mailed}, but the mailing now says {stored!r}"
        return True
    race_rounds(15, one)


#
# #440: subscribing ends in a TypeError.
#
@known_bug(440)
def a_visitor_subscribes_and_gets_a_confirmation_mail(base):
    mailing_list("Lijst440a")
    visitor = Client(base)
    visitor.get("nl/Lijst440a")
    status, _, _ = visitor.post("nl/Lijst440a", "subscribe", "", {"email": "anna440@eemstad.example"})
    assert status != 500, "subscribe gave 500"
    address = read_page("Lijst440a").find(".//address[@email='anna440@eemstad.example']")
    assert address is not None and address.get("status") == "pending", "no pending address stored"
    assert "anna440@eemstad.example" in mail_log(), "no confirmation mail sent"


@known_bug(440)
def an_administrator_adds_addresses_in_bulk(base):
    beheer = mailing_list("Lijst440b")
    beheer.get("nl/Lijst440b/add")
    status, _, _ = beheer.post("nl/Lijst440b/addresses", "add", "", {"new-addresses": "bram440@eemstad.example\nfemke440@eemstad.example"})
    assert status != 500, "bulk add gave 500"
    stored = {a.get("email"): a.get("status") for a in read_page("Lijst440b").iter("address")}
    assert stored == {"bram440@eemstad.example": "confirmed", "femke440@eemstad.example": "confirmed"}, f"stored: {stored}"


#
# #537: a new festival opens on its edit view, which does not exist.
#
@known_bug(537)
def a_new_festival_opens_on_a_page_that_exists(base):
    beheer = login(base, "beheer")
    status, _, location = new_page(beheer, "Feest537", "festivalpage")
    assert status == 302 and location, f"newPage gave {status}"
    final, _, seen = chase(beheer, location.replace(beheer.base, ""))
    assert final == 200, f"the new festival opens on {seen[-1]}, which answers {final}"


#
# #546: the label of the festival description is a raw key.
#
@known_bug(546)
def festival_settings_label_the_description_in_words(base):
    beheer = festival("Feest546")
    status, text, _ = beheer.get("nl/Feest546/settings")
    assert status == 200, f"settings gave {status}"
    assert "festival-field-festival-description" not in text, "the label is the raw key festival-field-festival-description"


#
# #548: the default sign-up form uses an undefined constant; a single 'attending' value breaks implode().
#
@known_bug(548)
def the_default_signup_form_of_a_new_festival_opens(base):
    festival("Feest548a")
    status, text, _ = Client(base).get("nl/Feest548a/signup")
    assert status == 200, f"the sign-up page gave {status}"
    assert 'name="email"' in text, "no sign-up form"


@known_bug(548)
def a_signup_with_a_single_attending_value_is_stored(base):
    festival("Feest548b", SIGNUP_FORM)
    visitor = Client(base)
    visitor.get("nl/Feest548b/signup")
    status, _, _ = visitor.post("nl/Feest548b/signup", "signup", "", {"name": "Jan", "email": "jan548@eemstad.example", "attending": "zaterdag"})
    assert status != 500, "sign-up with attending=zaterdag gave 500"
    participant = read_page("Feest548b").find(".//participant")
    assert participant is not None and participant.get("attending") == "zaterdag", "the sign-up was not stored"


#
# #550: a failed Mollie call (here: no key, so Mollie refuses or cannot be reached) sends the participant on as if paid.
#
def paid_signup(base, name):
    festival(name, SIGNUP_FORM)
    visitor = Client(base)
    visitor.get(f"nl/{name}/signup")
    status, _, location = visitor.post(f"nl/{name}/signup", "signup", "", {"name": "Jan", "email": "jan550@eemstad.example", "phone": "", "amount": "10"})
    if status != 302 or "/pay/" not in (location or ""):
        raise RuntimeError(f"sign-up with amount gave {status} {location}")
    return visitor, location.replace(visitor.base, "").split("?")[0]


@known_bug(550)
def a_payment_that_cannot_be_started_does_not_continue_as_if_paid(base):
    visitor, pay = paid_signup(base, "Feest550a")
    visitor.get(pay)
    status, _, location = visitor.post(pay, "pay", "")
    assert "/contribute/" not in (location or ""), f"after a failed payment the participant is sent on to {location}"


@known_bug(550)
def a_payment_that_cannot_be_started_logs_no_php_warnings(base):
    visitor, pay = paid_signup(base, "Feest550b")
    messages = php_messages(lambda: (visitor.get(pay), visitor.post(pay, "pay", "")))
    found = [m for m in messages if "festival.php" in m]
    assert not found, f"{len(found)} PHP messages, first: {found[0][-150:] if found else ''}"


@known_bug(550)
def the_payment_hook_without_payment_id_logs_no_php_warning(base):
    festival("Feest550c", SIGNUP_FORM + '<participants><participant xml:id="p550" name="Jan" email="jan550@eemstad.example" key="k550" payment-id="tr_verzonnen"/></participants>')
    answers = []
    messages = php_messages(lambda: answers.append(Client(base).get("nl/Feest550c/paymenthook/p550/k550")))
    assert answers[0][0] == 403, f"the hook without id gave {answers[0][0]}"
    found = [m for m in messages if 'Undefined array key "id"' in m]
    assert not found, found[0][-150:] if found else ""


#
# #551: error branches of GET views return 'reload' and redirect to themselves for ever.
#
def assert_one_redirect_to_a_page(client, path):
    status, _, seen = chase(client, path)
    assert status == 200 and len(seen) <= 3, f"{path}: still {status} after {len(seen) - 1} redirects, last {seen[-1][:90]}"


@known_bug(551)
def an_unknown_or_missing_confirmation_code_shows_a_message(base):
    mailing_list("Lijst551a")
    assert_one_redirect_to_a_page(Client(base), "nl/Lijst551a/confirm?code=onbekend")
    assert_one_redirect_to_a_page(Client(base), "nl/Lijst551a/confirm")


@known_bug(551)
def an_unknown_or_missing_unsubscribe_code_shows_a_message(base):
    mailing_list("Lijst551b")
    assert_one_redirect_to_a_page(Client(base), "nl/Lijst551b/unsubscribe?address=x@eemstad.example&code=onbekend")
    assert_one_redirect_to_a_page(Client(base), "nl/Lijst551b/unsubscribe")


@known_bug(551)
def the_mailing_editor_without_login_asks_to_log_in(base):
    mailing_list("Lijst551c", mailings='<mailing xml:id="m551c" status="draft" subject="Concept"><p>Concept.</p></mailing>')
    assert_one_redirect_to_a_page(Client(base), "nl/Lijst551c/mails_new")
    assert_one_redirect_to_a_page(Client(base), "nl/Lijst551c/mails_edit/m551c")


@known_bug(551)
def editing_a_sent_mailing_shows_a_message(base):
    mailing_list("Lijst551d", mailings='<mailing xml:id="m551d" status="sent" subject="Verstuurd" date="2026-10-01 10:00:00" receivers="1"><p>Al weg.</p></mailing>')
    assert_one_redirect_to_a_page(login(base, "sanne"), "nl/Lijst551d/mails_edit/m551d")


@known_bug(551)
def administrator_actions_on_an_unknown_address_show_a_message(base):
    beheer = mailing_list("Lijst551e")
    assert_one_redirect_to_a_page(beheer, "nl/Lijst551e/remind?email=niemand@eemstad.example")
    assert_one_redirect_to_a_page(beheer, "nl/Lijst551e/delete?email=niemand@eemstad.example")
    assert_one_redirect_to_a_page(beheer, "nl/Lijst551e/unsubscribe_by_admin")


#
# #552: the administrator's unsubscribe takes the old, already unsubscribed element of an address that came back.
#
RESUBSCRIBED = ('<address email="jan@eemstad.example" status="unsubscribed" unsubscribe-code="u1" reminded=""/>'
                '<address email="jan@eemstad.example" status="confirmed" confirm-code="c2" unsubscribe-code="u2" reminded=""/>')


@known_bug(552)
def administrator_unsubscribes_an_address_that_subscribed_again(base):
    beheer = mailing_list("Lijst552a", RESUBSCRIBED)
    beheer.get("nl/Lijst552a/unsubscribe_by_admin?email=jan@eemstad.example")
    statuses = [a.get("status") for a in read_page("Lijst552a").iter("address")]
    assert "confirmed" not in statuses, f"statuses after unsubscribe by admin: {statuses}"


@known_bug(552)
def the_unsubscribe_message_keeps_the_address_as_written(base):
    beheer = mailing_list("Lijst552b", RESUBSCRIBED)
    _, text, _ = chase(beheer, "nl/Lijst552b/unsubscribe_by_admin?email=jan@eemstad.example")
    assert "Jan@eemstad.example" not in text, "the message shows Jan@eemstad.example (ucfirst on the address)"


#
# #555: invitations.
#
def invite(client, addresses):
    client.get("settings/invite")
    return client.post("settings", "settingsInvite", "", {"inviteEmail": addresses, "inviteWelcome": "Welkom."})


def users():
    return list(ET.parse(SITE).getroot().iter("user"))


@known_bug(555)
def inviting_the_address_of_an_existing_account_gives_that_account_no_registration_key(base):
    invite(login(base, "sanne"), "beheer@eemstad.example")
    beheer = next(u for u in users() if u.get("username") == "beheer")
    assert not beheer.get("key"), "the administrator account got a registration key through an invitation by a member"


@known_bug(555)
def invited_addresses_are_stored_without_spaces(base):
    invite(login(base, "sanne"), "nieuw1@eemstad.example, nieuw2@eemstad.example")
    emails = [u.get("email") for u in users() if u.get("rights") == "invitee"]
    assert "nieuw2@eemstad.example" in emails, f"invitees: {emails}"


@known_bug(555)
def an_empty_invitation_adds_no_user(base):
    before = len(users())
    invite(login(base, "sanne"), "")
    added = [(u.get("email"), u.get("rights")) for u in users()[before:]]
    assert not added, f"an empty invitation added {added}"


@known_bug(555)
def the_member_list_shows_an_open_invitation_as_pending(base):
    invite(login(base, "sanne"), "open555@eemstad.example")
    _, text, _ = login(base, "beheer").get("settings")
    row = next((r for r in re.findall(r"<tr>.*?</tr>", text, re.S) if "open555@eemstad.example" in r), "")
    assert row, "the invitee is not in the member list"
    assert "uitnodiging loopt" in row, "the row of the invitee does not say 'uitnodiging loopt'"


#
# #556: fatal errors in the settings, and a menu editor for members that does not save.
#
@known_bug(556)
def the_account_page_of_an_unknown_user_gives_no_server_error(base):
    status, _, _ = login(base, "beheer").get("settings/user/niemand")
    assert status != 500, "settings/user/niemand gave 500"


@known_bug(556)
def a_non_numeric_digest_interval_gives_no_server_error(base):
    beheer = login(base, "beheer")
    beheer.get("settings/hypha")
    status, _, _ = beheer.post("settings", "settingsSaveHyphaSettings", "", {
        "settingsDefaultLanguage": "nl", "settingsDefaultNewPageType": "textpage", "settingsDefaultInterfaceLanguage": "nl",
        "settingsDefaultPage": "Start", "settingsSystemEmail": "redactie@eemstad.example",
        "settingsIntervalDays": "x", "settingsIntervalHours": "6", "settingsIntervalMinutes": "0"})
    assert status != 500, "saving the digest interval with days=x gave 500"


@known_bug(556)
def remind_for_an_unknown_user_gives_no_server_error(base):
    beheer = login(base, "beheer")
    beheer.get("settings")
    status, _, _ = beheer.post("settings", "settingsRemind", "u999")
    assert status != 500, "settingsRemind u999 gave 500"


@known_bug(556)
def making_an_unknown_user_admin_gives_no_server_error(base):
    beheer = login(base, "beheer")
    beheer.get("settings")
    status, _, _ = beheer.post("settings", "settingsAdmin", "u999")
    assert status != 500, "settingsAdmin u999 gave 500"


@known_bug(556)
def saving_the_account_of_a_user_that_no_longer_exists_gives_no_server_error(base):
    beheer = login(base, "beheer")
    beheer.get("settings/user/lotte")
    status, _, _ = beheer.post("settings", "settingsSaveAccount", "niemand", {
        "settingsUsername": "niemand", "settingsFullname": "Niemand", "settingsPassword1": "", "settingsPassword2": "",
        "settingsEmail": "niemand@eemstad.example", "settingsUiLang": "nl"})
    assert status != 500, "settingsSaveAccount niemand gave 500"


@known_bug(556)
def a_member_is_not_offered_a_menu_editor_that_does_not_save(base):
    sanne = login(base, "sanne")
    _, text, _ = sanne.get("settings/menu")
    offered = "settingsSaveMenu" in text
    sanne.post("settings", "settingsSaveMenu", "", {"siteMenu": "<p>Menu van een lid 556</p>"})
    saved = "Menu van een lid 556" in open(SITE, encoding="utf-8").read()
    assert saved or not offered, "a member gets the menu editor with a save button, but the save is dropped"


#
# #557: raw translation keys; the heading of the tag index is hard-coded English.
#
@known_bug(557)
def the_tag_index_heading_is_in_the_language_of_the_site(base):
    status, text, _ = Client(base).get("tag/nl/Wonen")
    assert status == 200, f"tag/nl/Wonen gave {status}"
    assert "Index for tag" not in text, "the heading is the English 'Index for tag:' on a Dutch site"


@known_bug(557)
def a_festival_link_with_a_wrong_key_shows_a_translated_message(base):
    festival("Feest557", SIGNUP_FORM + '<participants><participant xml:id="p557" name="Jan" email="jan557@eemstad.example" key="k557"/></participants>')
    status, text, _ = chase(Client(base), "nl/Feest557/pay/p557/verkeerd")
    assert status == 200, f"the pay page with a wrong key gave {status}"
    assert "invalid-or-no-key" not in text, "the message is the raw key invalid-or-no-key"


#
# #559: PHP messages on incomplete addresses of the tag index and the mailing list, and on optional festival fields.
#
@known_bug(559)
def an_unknown_tag_logs_no_php_warning(base):
    answers = []
    messages = php_messages(lambda: answers.append(Client(base).get("tag/nl/Bestaat%20niet")))
    assert answers[0][0] == 404, f"tag/nl/Bestaat niet gave {answers[0][0]}"
    found = [m for m in messages if "parentNode" in m]
    assert not found, found[0][-150:] if found else ""


@known_bug(559)
def a_tag_index_without_tag_logs_no_deprecation(base):
    answers = []
    messages = php_messages(lambda: answers.append(Client(base).get("tag/nl/")))
    assert answers[0][0] == 404, f"tag/nl/ gave {answers[0][0]}"
    found = [m for m in messages if "Passing null" in m]
    assert not found, f"{len(found)} messages, first: {found[0][-150:] if found else ''}"


@known_bug(559)
def a_mailing_address_without_id_logs_no_deprecation(base):
    mailing_list("Lijst559")
    answers = []
    messages = php_messages(lambda: answers.append(Client(base).get("nl/Lijst559/mails")))
    assert answers[0][0] == 404, f"nl/Lijst559/mails gave {answers[0][0]}"
    found = [m for m in messages if "Passing null" in m]
    assert not found, found[0][-150:] if found else ""


@known_bug(559)
def a_contribution_without_website_logs_no_deprecation(base):
    form = ('<form xml:id="contribution-form"><table>'
            '<tr><td><input required="required" type="text" name="name"/></td></tr>'
            '<tr><td><input required="required" type="text" name="title"/></td></tr>'
            '<tr><td><input type="hidden" name="image"/></td></tr>'
            '<tr><td><input type="text" name="category"/></td></tr></table></form>')
    festival("Feest559", SIGNUP_FORM + form + '<participants><participant xml:id="p559" name="Jan" email="jan559@eemstad.example" key="k559"/></participants>')
    visitor = Client(base)
    visitor.get("nl/Feest559/contribute/p559/k559")
    answers = []
    messages = php_messages(lambda: answers.append(visitor.post("nl/Feest559/contribute/p559/k559", "save", "", {"name": "Jan", "title": "Lezing", "image": "", "category": "lecture"})))
    assert answers[0][0] in (200, 302), f"the contribution gave {answers[0][0]}"
    found = [m for m in messages if "Passing null" in m and "festival.php" in m]
    assert not found, found[0][-150:] if found else ""



#
# #587: renaming a mailing list to a name that another page has.
#
@known_bug(587)
def renaming_a_mailing_list_to_a_taken_name_says_so_and_stays_on_the_list(base):
    mailing_list("Lijst587een")
    beheer = mailing_list("Lijst587twee")
    beheer.get("nl/Lijst587twee/edit")
    status, text, location = beheer.post("nl/Lijst587twee/edit", "save", "", {
        "page_name": "Lijst587een", "sender_name": "Redactie Eemstad", "sender_email": "redactie@eemstad.example",
        "description": "<p>Twee</p>", "email_welcome_text": "<p>Welkom</p>"})
    assert not (location or "").split("?")[0].endswith("/Lijst587een"), f"the editor is sent to the other list: {location}"


#
# #588: a sign-up form without a phone field.
#
@known_bug(588)
def a_signup_without_a_phone_field_logs_no_deprecation(base):
    festival("Feest588", SIGNUP_FORM.replace('<tr><td><input type="text" name="phone"/></td></tr>', ""))
    visitor = Client(base)
    visitor.get("nl/Feest588/signup")
    messages = php_messages(lambda: visitor.post("nl/Feest588/signup", "signup", "", {"name": "Jan", "email": "jan588@eemstad.example"}))
    found = [m for m in messages if "festival.php" in m and "Passing null" in m]
    assert not found, f"the sign-up logs: {found[:1]}"


if __name__ == "__main__":
    BASE = sys.argv[1]
    sys.exit(run(sys.argv[1]))
