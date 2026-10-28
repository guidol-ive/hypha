"""Known bugs of pages: text pages and their versions, articles and their review, page names, the theme editor and
two requests at the same moment.

Every test states the behaviour as it should be and fails on an assertion while its issue is open. A problem in the
preparation (a page that cannot be made, a file that is not there) raises RuntimeError, so it shows as FAIL and not
as a known bug.

Older articles are made by writing their XML into data/pages of the work folder ($HYPHA_WORK), the way an older
version of Hypha left them; a few tests also add to data/hypha.xml there, between two requests.
"""
import collections
import html
import json
import os
import re
import sys
import threading
import time
import xml.etree.ElementTree as ET

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "integratie"))
from hypha import Client, known_bug, run, test  # noqa: E402

WORK = os.environ.get("HYPHA_WORK", "")
XMLID = "{http://www.w3.org/XML/1998/namespace}id"
#
# A suffix that keeps the page names of this run apart from those of an earlier run on the same site.
#
RUN = format(int(time.time()) % 1000000, "x")


def need(condition, message):
    """A precondition of the test itself: not met means the test is broken, not that the bug is there."""
    if not condition:
        raise RuntimeError(message)


def site_text():
    with open(os.path.join(WORK, "data/hypha.xml"), encoding="utf-8") as f:
        return f.read()


def write_site(text):
    #
    # In place, not with rename(): on a macOS bind mount the container sometimes sees a renamed file as missing.
    #
    with open(os.path.join(WORK, "data/hypha.xml"), "w", encoding="utf-8") as f:
        f.write(text)


def page_id(name, language="nl"):
    for _ in range(20):
        for page in ET.fromstring(site_text().encode()).find("pageList"):
            for lang in page.findall("language"):
                if lang.get("name") == name and lang.get("id") == language:
                    return page.get("id")
        time.sleep(0.1)
    raise RuntimeError(f"no page {language}/{name} in hypha.xml")


def page_file(name, language="nl"):
    return os.path.join(WORK, "data/pages", page_id(name, language))


def read_page(name, language="nl"):
    with open(page_file(name, language), encoding="utf-8") as f:
        return f.read()


def new_page(client, name, kind="textpage", language="nl", private=False):
    fields = {"newPageType": kind, "newPageLanguage": language}
    if private:
        fields["newPagePrivate"] = "on"
    status, _text, location = client.post("nl/Start", "newPage", name, fields)
    need(status == 302 and location, f"new page {name}: {status}")
    return name.replace(" ", "_")


def save_text(client, path, name, content):
    client.get(path + "/edit")
    status, text, location = client.post(path + "/edit", "edit", "", {"textPagename": name, "textContent": content})
    return status, text, location


def text_page(client, name, versions, language="nl"):
    """A text page with the given versions (HTML), saved one after the other."""
    slug = new_page(client, name, language=language)
    for content in versions:
        status, _, _ = save_text(client, f"{language}/{slug}", name, content)
        need(status == 302, f"save of {slug}: {status}")
    return slug


def version_ids(client, path):
    """The ids of the older versions in the version list of a member."""
    status, text, _ = client.get(path)
    need(status == 200, f"{path}: {status}")
    match = re.search(r'<select class="version".*?</select>', text, re.S)
    need(match, f"no version list on {path}")
    return re.findall(r'<option value="(t\d+)"', match.group(0))


def article_xml(title, status, created_by="u2", featured="<featured_image></featured_image>", context_extra="",
                discussions="<discussions><review/><public/></discussions>", approves=3, title_xml=None):
    """The XML of an article as Hypha stores it; title is text, title_xml raw markup."""
    title_node = title_xml if title_xml is not None else "<title>" + html.escape(title, quote=False) + "</title>"
    approve = "".join(f'<approve user="u{n}" created_at="t1793000000"/>' for n in range(3, 3 + approves))
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<hypha type="peer_reviewed_article" multiLingual="off" versions="off" schemaVersion="1">
  <article status="{status}" author="Sanne de Vries" created_at="t1793000000" created_by="{created_by}" updated_at="t1793000000" published_at="">
    <content><text><p>De raad van Eemstad vergaderde over de nieuwe brug.</p></text><sources><p>Raadsinformatie (verzonnen).</p></sources></content>
    <context>{title_node}<excerpt><p>De raad sprak over de brug.</p></excerpt>{context_extra}<method><p>Verslag van de vergadering.</p></method></context>
  </article>
  {discussions}
  <approves>{approve}</approves>
  {featured}
</hypha>
'''


def article(client, title, status, private=False, tag=None, **xml):
    """A new article page whose stored XML is replaced by the given state, as an older Hypha left it."""
    slug = new_page(client, title, kind="peer_reviewed_article", private=private)
    if tag:
        status_code, _, _ = client.post(f"nl/{slug}", "tagSelect", tag)
        need(status_code == 200, f"tag on {slug}: {status_code}")
    with open(page_file(slug), "w", encoding="utf-8") as f:
        f.write(article_xml(title, status, **xml))
    return slug


def discussions(suffix):
    """A review discussion and a public discussion, each with one comment."""
    return (f'<discussions><review><discussion xml:id="drev{suffix}" user="u3" blocking="" closed="">'
            f'<discussion_comment xml:id="crev{suffix}" user="u3" created_at="t1793000000">Graag nog een bron.</discussion_comment>'
            f'</discussion></review><public><discussion xml:id="dpub{suffix}" blocking="" closed="">'
            f'<discussion_comment xml:id="cpub{suffix}" created_at="t1793000000" commenter_name="Lezer uit Eemstad" '
            f'commenter_email="lezer@eemstad.example">Goed stuk over de brug.</discussion_comment></discussion></public></discussions>')


def heading(text):
    match = re.search(r'<h1[^>]*id="pagename"[^>]*>(.*?)</h1>', text, re.S)
    need(match, "no <h1 id=\"pagename\">")
    return match.group(1)


def new_page_form(text):
    """The form of the popup 'new page', which the page holds as a JSON string in a script."""
    match = re.search(r'\bform = (".*?");\s*\n', text)
    need(match, "no popup 'new page' in the page")
    return json.loads(match.group(1))


def option_text(form, select, value):
    match = re.search(r'<select[^>]*id="' + select + r'".*?</select>', form, re.S)
    need(match, f"no select {select}")
    option = re.search(r'<option value="' + value + r'"[^>]*>([^<]*)</option>', match.group(0))
    need(option, f"no option {value} in {select}")
    return html.unescape(option.group(1))


def wait_for(check, seconds=3.0):
    """Polls a host file until check() holds; the container may write it a moment before the host sees it."""
    end = time.monotonic() + seconds
    while True:
        value = check()
        if value or time.monotonic() > end:
            return value
        time.sleep(0.1)


def together(*calls):
    """Runs the calls in threads released at the same moment; returns their results in order."""
    barrier = threading.Barrier(len(calls))
    results = [None] * len(calls)

    def one(i, call):
        barrier.wait()
        try:
            results[i] = call()
        except Exception as error:  # noqa: BLE001, reported to the test as a result
            results[i] = error
    threads = [threading.Thread(target=one, args=(i, call)) for i, call in enumerate(calls)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    for result in results:
        if isinstance(result, Exception):
            raise RuntimeError(f"request failed: {result!r}")
    return results


#
# Text pages: versions (#528, #530, #571)
#
@known_bug(528)
def a_translation_saved_in_the_same_second_gets_its_own_version_id(base):
    sanne = Client(base).login("sanne")
    duplicates = []
    for n in range(3):
        name = f"Vertaald {RUN} {n}"
        slug = new_page(sanne, name)
        sanne.get(f"nl/{slug}/translate")
        save_text(sanne, f"nl/{slug}", name, "<p>Nederlandse tekst.</p>")
        status, _, _ = sanne.post(f"nl/{slug}/translate", "translate", "", {"textLanguage": "en", "textPagename": f"Translated {RUN} {n}", "textContent": "<p>English text.</p>"})
        need(status == 302, f"translation of {slug}: {status}")
        stored = wait_for(lambda: (lambda t: t if 'xml:id="en"' in t else None)(read_page(slug)))
        need(stored, f"no English version stored for {slug}")
        ids = re.findall(r'<version xml:id="(t\d+)"', stored)
        duplicates += [i for i, c in collections.Counter(ids).items() if c > 1]
    assert not duplicates, f"the same version id in two languages of a page: {duplicates}"


@known_bug(528)
def three_saves_in_one_second_show_the_newest_text_and_not_a_diff(base):
    sanne = Client(base).login("sanne")
    shown = []
    for n in range(3):
        name = f"Snel bewaard {RUN} {n}"
        slug = new_page(sanne, name)
        sanne.get(f"nl/{slug}/edit")
        while time.time() % 1 > 0.3:
            time.sleep(0.02)
        for v in (1, 2, 3):
            status, _, _ = sanne.post(f"nl/{slug}/edit", "edit", "", {"textPagename": name, "textContent": f"<p>Versie {v} van de pagina.</p>"})
            need(status == 302, f"save {v} of {slug}: {status}")
        status, text, _ = Client(base).get(f"nl/{slug}")
        need(status == 200, f"nl/{slug}: {status}")
        main = re.search(r'id="main".*', text, re.S).group(0)
        if "Versie 3 van de pagina." not in main or "@@" in main:
            shown.append(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", main))[:80])
    assert not shown, f"reading view after three saves in one second shows a diff instead of version 3: {shown}"


@known_bug(530)
def an_unknown_version_number_does_not_give_a_server_error(base):
    sanne = Client(base).login("sanne")
    slug = text_page(sanne, f"Onbekende versie {RUN}", ["<p>Eerste versie.</p>", "<p>Tweede versie.</p>"])
    statuses = {}
    for version in ("t0", "-5"):
        sanne.get(f"nl/{slug}")
        statuses[version], _, _ = sanne.post(f"nl/{slug}", "", "", {"version": version})
    assert all(s != 500 for s in statuses.values()), f"view with an unknown version: {statuses}"


@known_bug(530)
def revert_to_an_unknown_version_does_not_give_a_server_error(base):
    sanne = Client(base).login("sanne")
    slug = text_page(sanne, f"Onbekend terugzetten {RUN}", ["<p>Eerste versie.</p>", "<p>Tweede versie.</p>"])
    sanne.get(f"nl/{slug}")
    status, _, _ = sanne.post(f"nl/{slug}/revert", "revert", "", {"version": "t0"})
    assert status != 500, f"revert to version t0 gave {status}"


@known_bug(571)
def an_older_version_keeps_text_that_contains_two_at_signs(base):
    sanne = Client(base).login("sanne")
    slug = text_page(sanne, f"Apenstaartjes {RUN}", ["<p>Schrijf @@=2,3 niet zo.</p>", "<p>Een andere tekst.</p>"])
    older = version_ids(sanne, f"nl/{slug}")
    need(len(older) == 1, f"expected one older version, found {older}")
    sanne.get(f"nl/{slug}")
    status, text, _ = sanne.post(f"nl/{slug}", "", "", {"version": older[0]})
    assert status == 200, f"the older version with 'Schrijf @@=2,3 niet zo.' gives {status}"
    main = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", re.search(r'id="main".*', text, re.S).group(0)))
    assert "Schrijf @@=2,3 niet zo." in main, f"older version shows {main[:60]!r} instead of 'Schrijf @@=2,3 niet zo.'"


#
# Page names and languages (#310, #363, #575)
#
@known_bug(310)
def the_tag_index_of_a_language_shows_the_pages_in_that_language(base):
    beheer = Client(base).login("beheer")
    name = f"Housing in Eemstad {RUN}"
    slug = text_page(beheer, name, ["<p>About housing in Eemstad.</p>"], language="en")
    status, _, _ = beheer.post(f"en/{slug}", "tagSelect", "tag3")
    need(status == 200, f"tag on en/{slug}: {status}")
    label = f"Housing{RUN}"
    text = site_text()
    tag = re.search(r'(<tag xml:id="tag3">.*?)(</tag>)', text, re.S)
    need(tag, "no tag3 in hypha.xml")
    write_site(text[:tag.end(1)] + f'<language id="en" label="{label}">Made-up tag on housing</language>' + text[tag.end(1):])
    status, text, _ = Client(base).get(f"tag/en/{label}")
    for _ in range(20):
        if status != 404:
            break
        time.sleep(0.1)
        status, text, _ = Client(base).get(f"tag/en/{label}")
    need(status != 404, "the English label of the tag is not seen by Hypha")
    assert status == 200, f"tag/en/{label} gave {status}"
    assert f'href="en/{slug}"' in text, f"the English page is not in the tag index of en"


@known_bug(363)
def the_new_page_popup_on_the_english_index_proposes_english(base):
    sanne = Client(base).login("sanne")
    text_page(sanne, f"English page {RUN}", ["<p>An English page.</p>"], language="en")
    status, text, _ = sanne.get("index/en")
    need(status == 200, f"index/en: {status}")
    form = new_page_form(text)
    select = re.search(r'<select[^>]*id="newPageLanguage".*?</select>', form, re.S).group(0)
    selected = re.findall(r'<option value="([a-z]+)" selected', select)
    assert selected == ["en"], f"the language of a new page on index/en is {selected}, not en"


@known_bug(575)
def the_new_page_popup_names_the_text_page_type_in_dutch(base):
    status, text, _ = Client(base).login("sanne").get("nl/Start")
    shown = option_text(new_page_form(text), "newPageType", "textpage")
    assert shown == "webpagina", f"type textpage is shown as {shown!r}"


@known_bug(575)
def the_new_page_popup_names_the_mailing_list_type_in_english(base):
    #
    # The language of the user goes before Accept-Language, and Hypha stores one at login or in the settings; so
    # the test sets English for sanne itself and puts back what was there.
    #
    original = site_text()
    tag = re.search(r'<user id="u2"[^>]*/>', original).group(0)
    english = re.sub(r'\slanguage="[^"]*"', "", tag)[:-2] + ' language="en"/>'
    write_site(original.replace(tag, english))
    try:
        sanne = Client(base).login("sanne")
        status, text, _ = sanne.request("nl/Start", headers={"Accept-Language": "en"})
        need('lang="en"' in text or "log out" in text.lower() or "logged in as" in text.lower(), "interface is not English")
        shown = option_text(new_page_form(text), "newPageType", "mailinglist")
    finally:
        now = site_text()
        write_site(now.replace(re.search(r'<user id="u2"[^>]*/>', now).group(0), tag))
    assert shown == "mailing list", f"type mailinglist is shown as {shown!r} in English"


@known_bug(575)
def the_new_page_popup_names_the_mailing_list_type_in_dutch(base):
    status, text, _ = Client(base).login("sanne").get("nl/Start")
    shown = option_text(new_page_form(text), "newPageType", "mailinglist")
    assert shown != "mailinglist", f"type mailinglist is shown as {shown!r} in Dutch, the name of the class"


#
# Articles (#270, #406, #525, #529)
#
@known_bug(406)
def an_article_saved_once_opens_for_members(base):
    sanne = Client(base).login("sanne")
    slug = new_page(sanne, f"Opgeslagen artikel {RUN}", kind="peer_reviewed_article", private=True)
    status, _, _ = sanne.get(f"nl/{slug}/edit")
    need(status == 200, f"edit of a new article: {status}")
    fields = {"title": f"Opgeslagen artikel {RUN}", "author": "Sanne de Vries", "excerpt": "<p>Kort.</p>", "featured_image": "",
              "text": "<p>Tekst over de brug.</p>", "method": "<p>Verslag.</p>", "sources": "<p>Raadsinformatie.</p>"}
    status, _, _ = sanne.post(f"nl/{slug}/edit", "save", "", fields)
    need(status == 302, f"save of the article: {status}")
    status, _, _ = sanne.get(f"nl/{slug}")
    assert status == 200, f"a member opening the article after one save gets {status}"


@known_bug(406)
def an_older_article_without_featured_image_opens_for_members(base):
    sanne = Client(base).login("sanne")
    slug = article(sanne, f"Zonder afbeelding {RUN}", "draft", private=True, featured="")
    status, _, _ = sanne.get(f"nl/{slug}")
    assert status == 200, f"a member opening an article without featured_image gets {status}"


@known_bug(406)
def an_older_article_with_markup_in_its_title_opens_for_members(base):
    sanne = Client(base).login("sanne")
    slug = article(sanne, f"Titel met opmaak {RUN}", "draft", private=True, title_xml=f"<title><p>Titel met opmaak {RUN}</p></title>")
    status, _, _ = sanne.get(f"nl/{slug}")
    assert status == 200, f"a member opening an article whose title holds a <p> gets {status}"


@known_bug(406)
def an_older_article_without_public_discussions_opens_for_members(base):
    sanne = Client(base).login("sanne")
    slug = article(sanne, f"Zonder discussies {RUN}", "draft", private=True, discussions="<discussions/>")
    status, _, _ = sanne.get(f"nl/{slug}")
    assert status == 200, f"a member opening an article with an empty <discussions/> gets {status}"


def unknown_type_page(name, tag):
    """A page whose stored type is a datatype that no longer exists (article), with a tag."""
    page = f"unk{RUN}"
    with open(os.path.join(WORK, "data/pages", page), "w", encoding="utf-8") as f:
        f.write('<?xml version="1.0" encoding="UTF-8"?>\n<hypha type="article"><article><title>Oud</title></article></hypha>\n')
    text = site_text()
    node = f'<page id="{page}" type="article" private="off"><language id="nl" name="{name}"/><tag id="{tag}"/></page>'
    need("</pageList>" in text, "no </pageList> in hypha.xml")
    write_site(text.replace("</pageList>", node + "</pageList>", 1))
    return page


def remove_unknown_type_page(page):
    text = site_text()
    write_site(re.sub(r'<page id="' + page + r'" type="article".*?</page>', "", text, flags=re.S))
    os.remove(os.path.join(WORK, "data/pages", page))


@known_bug(406)
def a_page_of_an_unknown_type_gives_404_and_not_a_server_error(base):
    name = f"Oud_type_{RUN}"
    page = unknown_type_page(name, "tag5")
    try:
        sanne = Client(base).login("sanne")
        status, _, _ = sanne.get(f"nl/{name}")
        for _ in range(20):
            if status != 404 or "no-page" not in sanne.last:
                break
            time.sleep(0.1)
            status, _, _ = sanne.get(f"nl/{name}")
        assert status == 404, f"a page of the removed type 'article' gives {status}"
    finally:
        remove_unknown_type_page(page)


@known_bug(406)
def the_tag_index_still_shows_when_a_page_has_an_unknown_type(base):
    beheer = Client(base).login("beheer")
    slug = text_page(beheer, f"Natuur in Eemstad {RUN}", ["<p>Over het Eemstadse bos.</p>"])
    status, _, _ = beheer.post(f"nl/{slug}", "tagSelect", "tag6")
    need(status == 200, f"tag on {slug}: {status}")
    page = unknown_type_page(f"Oud_getagd_{RUN}", "tag6")
    try:
        need(wait_for(lambda: f'id="{page}"' in site_text()), "page of unknown type not in hypha.xml")
        status, text, _ = Client(base).get("tag/nl/Natuur%20en%20milieu")
        assert status == 200, f"tag/nl/Natuur en milieu with a page of unknown type gives {status}"
        assert f'href="nl/{slug}"' in text, "the text page with the tag is not listed"
    finally:
        remove_unknown_type_page(page)


@known_bug(406)
def a_member_opens_the_moderation_view_of_a_comment(base):
    sanne = Client(base).login("sanne")
    suffix = f"m{RUN}"
    slug = article(sanne, f"Moderatie {RUN}", "published", discussions=discussions(suffix))
    status, text, _ = sanne.get(f"nl/{slug}/comments/cpub{suffix}")
    assert status == 200, f"moderation view of an existing comment gives {status}"
    assert 'name="reason"' in text, "no field for the reason of moderation"


@known_bug(406)
def the_moderation_view_of_an_unknown_comment_gives_404(base):
    sanne = Client(base).login("sanne")
    suffix = f"u{RUN}"
    slug = article(sanne, f"Moderatie onbekend {RUN}", "published", discussions=discussions(suffix))
    status, _, _ = sanne.get(f"nl/{slug}/comments/bestaatniet")
    assert status == 404, f"moderation view of an unknown comment id gives {status}"


@known_bug(270)
def a_comment_cannot_be_added_inside_another_comment(base):
    sanne = Client(base).login("sanne")
    suffix = f"n{RUN}"
    slug = article(sanne, f"Reactie in reactie {RUN}", "published", discussions=discussions(suffix))
    ahmed = Client(base).login("ahmed")
    ahmed.get(f"nl/{slug}")
    target = f"cpub{suffix}"
    ahmed.post(f"nl/{slug}/discussions/{target}/comment", "comment", "", {f"discussion_comment/{target}": "Een reactie op de verkeerde plek."})
    time.sleep(0.3)
    stored = ET.fromstring(read_page(slug).encode())
    comment = next(e for e in stored.iter("discussion_comment") if e.get(XMLID) == target)
    assert len(comment) == 0, f"a comment was stored inside comment {target}: {[c.tag for c in comment]}"


@known_bug(270)
def a_visitor_cannot_comment_in_the_review_discussion_of_a_published_article(base):
    sanne = Client(base).login("sanne")
    suffix = f"r{RUN}"
    slug = article(sanne, f"Reactie in review {RUN}", "published", discussions=discussions(suffix))
    visitor = Client(base)
    status, _, _ = visitor.get(f"nl/{slug}")
    need(status == 200, f"published article for a visitor: {status}")
    target = f"drev{suffix}"
    visitor.post(f"nl/{slug}/discussions/{target}/comment", "comment", "", {
        f"discussion_comment/{target}": "Reactie van een bezoeker.", f"commenter_name/{target}": "Bezoeker",
        f"commenter_email/{target}": "bezoeker@eemstad.example"})
    time.sleep(0.3)
    stored = ET.fromstring(read_page(slug).encode())
    review = stored.find("discussions/review")
    comments = [c.text for c in review.iter("discussion_comment")]
    assert comments == ["Graag nog een bron."], f"the review discussion now holds {comments}"


# Was a known bug of #525; fixed in main by #531, retested on 2026-10-28.
@test
def the_title_of_an_article_is_shown_as_text_in_the_heading(base):
    sanne = Client(base).login("sanne")
    slug = article(sanne, f"Titel als tekst {RUN}", "published")
    path = page_file(slug)
    with open(path, encoding="utf-8") as f:
        stored = f.read()
    with open(path, "w", encoding="utf-8") as f:
        f.write(re.sub(r"<title>.*?</title>", "<title>&lt;img src=x onerror=alert(1)&gt;</title>", stored, count=1))
    status, text, _ = Client(base).get(f"nl/{slug}")
    need(status == 200, f"published article: {status}")
    h1 = heading(text)
    assert "<img" not in h1, f"the title became markup in the heading: {h1.strip()[:80]}"


# Was a known bug of #525; fixed in main by #531, retested on 2026-10-28.
@test
def a_new_public_article_opens_without_a_server_error(base):
    sanne = Client(base).login("sanne")
    status, _, location = sanne.post("nl/Start", "newPage", f"Nieuw openbaar {RUN}", {"newPageType": "peer_reviewed_article", "newPageLanguage": "nl"})
    need(status == 302 and location, f"new article: {status}")
    status, _, _ = sanne.follow((status, "", location))
    assert status == 200, f"the first view of a new public article gives {status}"


@known_bug(529)
def only_the_author_or_an_administrator_can_publish_an_article(base):
    sanne = Client(base).login("sanne")
    slug = article(sanne, f"Alleen de auteur {RUN}", "approved", private=True, tag="tag3")
    ahmed = Client(base).login("ahmed")
    status, _, _ = ahmed.get(f"nl/{slug}")
    need(status == 200, f"approved article for a colleague: {status}")
    ahmed.post(f"nl/{slug}", "status_change_published")
    time.sleep(0.3)
    stored = re.search(r'<article status="([a-z ]+)"', read_page(slug)).group(1)
    assert stored == "approved", f"a colleague who is not the author published the article (status {stored})"


#
# Two requests at the same moment (#560, #569)
#
# A long text for a save: cleaning it takes the save some milliseconds between reading hypha.xml and locking it.
LONG = "".join(f"<p>Alinea {i} over de raad van Eemstad en de nieuwe brug.</p>" for i in range(2000))


def mails_about(title):
    try:
        with open(os.path.join(WORK, "data/mail.log"), encoding="utf-8", errors="replace") as f:
            log = f.read()
    except FileNotFoundError:
        return []
    return re.findall(r"^To: (\S+)\nSubject: [^\n]*Status 'published' voor '" + re.escape(title) + "'", log, re.M)


@known_bug(569)
def publishing_twice_at_the_same_moment_sends_the_status_mail_once(base):
    #
    # The author (two tabs, or a double click) and an administrator (two tabs) publish at the same moment; with four
    # requests at once two of them overlap in most rounds.
    #
    sanne = Client(base).login("sanne")
    publishers = [Client(base).login(user) for user in ("sanne", "sanne", "beheer", "beheer")]
    titles = []
    for n in range(8):
        title = f"Dubbel gepubliceerd {RUN} {n}"
        slug = article(sanne, title, "approved", private=True, tag="tag3")
        for client in publishers:
            status, _, _ = client.get(f"nl/{slug}")
            need(status == 200, f"approved article: {status}")
        statuses = together(*[lambda c=c: c.post(f"nl/{slug}", "status_change_published")[0] for c in publishers])
        #
        # A round where a request failed is not counted: on a macOS bind mount a page that another request is
        # writing is sometimes seen as missing (see test_gelijktijdig.py).
        #
        if all(s == 302 for s in statuses):
            titles.append(title)
    need(len(titles) >= 4, f"only {len(titles)} of 8 rounds without a failed request")
    need(wait_for(lambda: all(mails_about(t) for t in titles)), "no status mail for every article")
    time.sleep(0.3)
    doubled = []
    for n, title in enumerate(titles):
        mails = mails_about(title)
        if len(mails) != len(set(mails)):
            doubled.append(f"{len(mails)} mails to {len(set(mails))} members")
    assert not doubled, f"publishing at the same moment sent the status mail more than once: {doubled}"


#
# Not a known-bug test either: two renames of a page at the same moment (#560) failed in most rounds on main when run
# alone, but passed by luck on six of forty rebased pull request branches that do not touch this code, so it would
# report #560 as solved. #560 has no automated known-bug test for now; the race is described in the issue.
#


#
# Not a known-bug test: renaming a page while it is deleted (#560) gives a 500 in most rounds when run alone, but
# hardly ever with the other tests on the same site, so it passed by luck and reported #560 as fixed. The two
# renames at the same moment above show the same bug reliably.
#


#
# The theme editor (#236). Last, since it switches the site to a copy of the default theme; the default theme is
# active again afterwards.
#
def edit_theme_file(base, view, field, command):
    beheer = Client(base).login("beheer")
    theme = f"eemstad{RUN}{view}"
    status, _, _ = beheer.post("settings/theme", "settingsCopyThemeAndActivate", "", {"srcTheme": "default", "dstTheme": theme})
    need(status in (200, 302), f"copy theme: {status}")
    try:
        status, text, _ = beheer.get(f"settings/{view}")
        match = re.search(r'<textarea[^>]*name="' + field + r'"[^>]*>(.*?)</textarea>', text, re.S)
        need(match, f"no {field} on settings/{view}")
        original = html.unescape(match.group(1))
        need("\r" not in original and "\n" in original, f"the {field} of the copied theme already has CR or no lines")
        #
        # As a browser sends a textarea: every line ending as CR LF (HTML, form submission).
        #
        status, _, _ = beheer.post(f"settings/{view}", command, "", {field: original.replace("\n", "\r\n")})
        need(status in (200, 302), f"save of {field}: {status}")
        status, text, _ = beheer.get(f"settings/{view}")
        saved = html.unescape(re.search(r'<textarea[^>]*name="' + field + r'"[^>]*>(.*?)</textarea>', text, re.S).group(1))
        return original, saved
    finally:
        beheer.post("settings/theme", "settingsSaveTheme", "", {"editTheme": "default"})


@known_bug(236)
def saving_the_html_of_a_theme_keeps_its_line_endings(base):
    original, saved = edit_theme_file(base, "markup", "editHtml", "settingsSaveMarkup")
    assert "\r\n" not in saved, f"hypha.html now has {saved.count(chr(13))} CR LF line endings instead of LF"


@known_bug(236)
def saving_the_stylesheet_of_a_theme_keeps_its_line_endings(base):
    original, saved = edit_theme_file(base, "styles", "editCss", "settingsSaveStyles")
    assert "\r\n" not in saved, f"hypha.css now has {saved.count(chr(13))} CR LF line endings instead of LF"


if __name__ == "__main__":
    sys.exit(run(sys.argv[1]))
