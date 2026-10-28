"""An article with review in the new editor, end to end over HTTP (design sections 13.13, 14 and 15).

Every business rule that the server enforces gets a case that must succeed and one that must fail.
"""
import json
import os
import re
import sys
import xml.etree.ElementTree as ET

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hypha import Client, run, test, write_same_length  # noqa: E402

WORK = os.environ.get("HYPHA_WORK", "")
FIXTURES = json.load(open(os.path.join(os.path.dirname(__file__), "../fixtures/tekeningen.json"), encoding="utf-8"))
STATUTE = list(range(5))
TITLE = "Vertrekkend raadslid Bram Hoekstra: twintig jaar strijd voor open bestuur"
SLUG = "vertrekkend-raadslid-bram-hoekstra-twintig-jaar-strijd-voor-open-bestuur"
STATE = {}


def site():
    return ET.parse(os.path.join(WORK, "data/hypha.xml")).getroot()


def page_node(name, language="nl"):
    for page in site().find("pageList"):
        for lang in page.findall("language"):
            if lang.get("name") == name and lang.get("id") == language:
                return page
    return None


def article_xml(name, language="nl"):
    page = page_node(name, language)
    assert page is not None, f"no page {language}/{name}"
    return ET.parse(os.path.join(WORK, "data/pages", page.get("id"))).getroot()


def new_article(client, title):
    status, _, location = client.post("nl/Start", "mdNewArticle", title, {"newPageLanguage": "nl", "mdMode": "markdown"})
    assert status in (302, 303), status
    return location


def config(client, path):
    status, text, _ = client.get(path)
    assert status == 200, status
    match = re.search(r'<script type="application/json" id="mdeConfig">(.*?)</script>', text, re.S)
    assert match, "no editor in " + path
    return json.loads(match.group(1).replace("&quot;", '"').replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">"))


def fields(**extra):
    d = FIXTURES["diagrams"][0]
    text = ("Bram Hoekstra was bibliothecaris in Eemstad-Noord.\n\n### De eerste zetels\n\n> [!info] Open Eemstad\n> Lokale partij.\n\n"
            "Meer in [[Raadsnieuws]].\n\n%% beschrijving: tijdlijn %%\n```mermaid\n" + d["text"] + "```\n")
    f = {"title": TITLE, "author": "Sanne de Vries", "section": "Politiek en bestuur", "tags": ["Raadsnieuws", "Politiek en bestuur"],
         "excerpt": "Twintig jaar vroeg Hoekstra om openbare stukken.", "method": "Sanne de Vries is verslaggever.", "sources": "- Raadsinformatie (voorbeeldbron)",
         "text": text, "image": "", "imageAlt": "", "imageCaption": "", "imageCredit": "", "frontmatter": "robots: noindex"}
    f.update(extra)
    return f


def save(client, path, f, renders=None):
    d = FIXTURES["diagrams"][0]
    renders = renders if renders is not None else {"svg": {d["sha256"]: d["svg"]}}
    status, text, _ = client.post(path + "/edit", "md_save", "", {"md_fields": json.dumps(f), "md_renders": json.dumps(renders), "ajax": "1"})
    assert status == 200, (status, text[:300])
    return json.loads(text)


def command(client, path, name, extra=None):
    client.get(path)
    return client.follow(client.post(path, name, "", extra))


@test
def new_article_gets_page_name_from_title_and_markdown_source(base):
    sanne = Client(base).login("sanne")
    location = new_article(sanne, TITLE)
    assert location.endswith(f"nl/{SLUG}/edit?mode=markdown"), location
    c = config(sanne, f"nl/{SLUG}/edit")
    assert c["fields"]["title"] == TITLE, c["fields"]["title"]
    assert c["page"]["role"] == "author"
    root = article_xml(SLUG)
    article = root.find("article")
    assert article.get("format") == "markdown" and article.find("source") is not None
    assert article.find("source").get("profile") == "hypha-1.0"
    assert page_node(SLUG).get("private") == "on"
    STATE["sanne"] = sanne


@test
def the_editor_page_does_not_wait_for_the_old_scripts_of_hypha(base):
    #
    # jQuery, help.js, the image field and bowser only define functions for later; deferred, they do not hold up the
    # first paint on a phone (Lighthouse).
    #
    status, text, _ = STATE["sanne"].get(f"nl/{SLUG}/edit")
    head = text[:text.find("</head>")]
    # Any version of jQuery: PR #498 brings 3.7.1.
    for name in (r"jquery-[0-9.]+\.min\.js", r"help\.js", r"hypha-preview-image-file-field\.js", r"bowser\.min\.js"):
        tag = re.search(r'<script[^>]*' + name + r'[^>]*>', head)
        assert tag and "defer" in tag.group(0), f"{name} is not deferred on the editor page: {tag.group(0) if tag else 'missing'}"
    status, text, _ = STATE["sanne"].get("nl/Start")
    assert re.search(r'<script[^>]*jquery-[0-9.]+\.min\.js[^>]*>', text) and "defer" not in re.search(r'<script[^>]*jquery-[0-9.]+\.min\.js[^>]*>', text).group(0), "other pages keep jQuery as it was"



@test
def a_script_of_the_theme_in_the_body_keeps_jquery_in_time(base):
    #
    # A theme with its own script at the end of the body (hypha.js with $(...)) ran before the deferred jQuery and
    # failed with "$ is not defined" on the editor page.
    #
    path = os.path.join(WORK, "data/themes/default/hypha.html")
    original = open(path, "rb").read()
    text = original.decode("utf-8")
    write_same_length(path, text.replace("</body>", '<script src="data/themes/default/proef.js"></script></body>', 1).encode("utf-8"))
    try:
        _, page, _ = STATE["sanne"].get(f"nl/{SLUG}/edit")
        tag = re.search(r'<script[^>]*jquery-[0-9.]+\.min\.js[^>]*>', page)
        assert tag and "defer" not in tag.group(0), f"jQuery is deferred while the theme has a script in the body: {tag.group(0) if tag else 'missing'}"
    finally:
        write_same_length(path, original)

@test
def second_article_with_the_same_title_gets_suffix_2(base):
    sanne = STATE["sanne"]
    assert new_article(sanne, TITLE).endswith(f"nl/{SLUG}-2/edit?mode=markdown")


@test
def save_stores_source_and_xhtml_in_one_write(base):
    sanne = STATE["sanne"]
    result = save(sanne, f"nl/{SLUG}", fields(tags=["Raadsnieuws", "Bestaat niet"], image="images/hoekstra.jpg", imageAlt="Hoekstra in de raadszaal", imageCaption="Na twintig jaar.", imageCredit="Foto (naam)"))
    assert result["ok"], result
    assert result["ms"] < 1000, result["ms"]
    article = article_xml(SLUG).find("article")
    assert article.find("context/section").text == "Politiek en bestuur"
    assert "[!info]" in article.find("source/text").text
    text = ET.tostring(article.find("content/text"), encoding="unicode")
    assert "callout info" in text and "viewBox" in text and 'href="hypha:' in text, text[:500]
    image = article_xml(SLUG).find("featured_image")
    assert image.text == "hoekstra.jpg" and image.get("alt") == "Hoekstra in de raadszaal" and image.get("credit") == "Foto (naam)"
    assert article.find("source/frontmatter").text == "robots: noindex"
    assert json.loads(article.find("source").get("unknownTags")) == ["Bestaat niet"]
    tags = [t.get("id") for t in page_node(SLUG).findall("tag")]
    assert tags == ["tag2"], tags
    assert page_node("Raadsnieuws") is not None, "[[Raadsnieuws]] creates the page (BR-63)"


@test
def raw_source_round_trips_in_the_editor(base):
    c = config(STATE["sanne"], f"nl/{SLUG}/edit")
    assert c["fields"]["text"] == fields()["text"]
    assert c["fields"]["tags"] == ["Raadsnieuws", "Bestaat niet"]
    assert c["fields"]["image"] == "images/hoekstra.jpg"


@test
def title_is_required_br05(base):
    result = save(STATE["sanne"], f"nl/{SLUG}", fields(title="  "))
    assert not result["ok"] and result["errors"]


@test
def section_must_be_from_the_list_br47(base):
    result = save(STATE["sanne"], f"nl/{SLUG}", fields(section="Geen rubriek"))
    assert not result["ok"]


@test
def interactive_block_needs_a_description_br07(base):
    result = save(STATE["sanne"], f"nl/{SLUG}", fields(text="```html interactief\n<b>x</b>\n```\n"))
    assert not result["ok"]


@test
def unknown_tag_blocks_start_of_review_br45(base):
    sanne = STATE["sanne"]
    save(sanne, f"nl/{SLUG}", fields(tags=["Raadsnieuws", "Bestaat niet"]))
    command(sanne, f"nl/{SLUG}", "status_change_review")
    assert article_xml(SLUG).find("article").get("status") == "draft"


@test
def admin_may_make_a_new_tag_br98(base):
    beheer = Client(base).login("beheer")
    path = f"nl/{SLUG}-2"
    save(beheer, path, fields(tags=["Nieuwe tag van beheer"]))
    labels = [l.get("label") for l in site().iter("language") if l.get("label")]
    assert "Nieuwe tag van beheer" in labels


@test
def start_review_with_complete_article(base):
    sanne = STATE["sanne"]
    assert save(sanne, f"nl/{SLUG}", fields())["ok"]
    command(sanne, f"nl/{SLUG}", "status_change_review")
    assert article_xml(SLUG).find("article").get("status") == "review"


@test
def author_cannot_approve_br94(base):
    sanne = STATE["sanne"]
    command(sanne, f"nl/{SLUG}", "approve", {"md_statute[]": STATUTE})
    assert len(article_xml(SLUG).find("approves")) == 0
    _, text, _ = sanne.get(f"nl/{SLUG}")
    assert "geef goedkeuring" not in text


@test
def approve_needs_every_point_of_the_statute_br10(base):
    ahmed = Client(base).login("ahmed")
    command(ahmed, f"nl/{SLUG}", "approve", {"md_statute[]": [0, 1]})
    assert len(article_xml(SLUG).find("approves")) == 0
    STATE["ahmed"] = ahmed


@test
def approve_with_statute_and_comment_br67(base):
    ahmed = STATE["ahmed"]
    _, text, _ = ahmed.get(f"nl/{SLUG}")
    assert "mdeApprove" in text and "geef goedkeuring" in text
    command(ahmed, f"nl/{SLUG}", "approve", {"md_statute[]": STATUTE, "md_comment": "Goed onderbouwd."})
    root = article_xml(SLUG)
    approve = root.find("approves/approve")
    assert approve is not None and approve.get("statute"), "approve with statute"
    comments = [d for d in root.find("discussions/review") if d.get("approve") == approve.get("{http://www.w3.org/XML/1998/namespace}id")]
    assert comments and comments[0].find("discussion_comment").text == "Goed onderbouwd.", ET.tostring(root.find("discussions"))[:300]


@test
def three_approvals_make_it_approved_br71(base):
    for name in ("lotte", "joris"):
        command(Client(base).login(name), f"nl/{SLUG}", "approve", {"md_statute[]": STATUTE})
    assert article_xml(SLUG).find("article").get("status") == "approved"


@test
def colleague_cannot_retract_br96(base):
    command(STATE["ahmed"], f"nl/{SLUG}", "md_retract")
    assert article_xml(SLUG).find("article").get("status") == "approved"


@test
def author_retracts_to_draft_approvals_lapse_br76(base):
    sanne = STATE["sanne"]
    command(sanne, f"nl/{SLUG}", "md_retract")
    root = article_xml(SLUG)
    assert root.find("article").get("status") == "draft"
    assert len(root.find("approves")) == 0 and len(root.find("lapsed_approves")) == 3
    assert root.find("discussions/review/discussion") is not None, "comments stay"


@test
def review_again_and_publish_br72(base):
    sanne = STATE["sanne"]
    command(sanne, f"nl/{SLUG}", "status_change_review")
    for name in ("ahmed", "lotte", "joris"):
        command(Client(base).login(name), f"nl/{SLUG}", "approve", {"md_statute[]": STATUTE})
    command(sanne, f"nl/{SLUG}", "status_change_published")
    assert article_xml(SLUG).find("article").get("status") == "published"
    assert page_node(SLUG).get("private") == "off"


@test
def published_article_shows_svg_with_viewbox_to_anonymous_readers(base):
    status, text, _ = Client(base).get(f"nl/{SLUG}")
    assert status == 200
    assert "viewBox=" in text and "callout info" in text and "De eerste zetels" in text


@test
def published_article_has_structured_data_for_search_engines(base):
    import json as _json
    status, text, _ = Client(base).get(f"nl/{SLUG}")
    m = re.search(r'<script type="application/ld\+json">(.*?)</script>', text, re.S)
    assert m, "no JSON-LD"
    data = _json.loads(m.group(1))
    assert data["@type"] == "NewsArticle" and data["headline"] == TITLE and data["inLanguage"] == "nl" and data["datePublished"], data
    #
    # The same date in the byline as <time datetime> (design section 12.10, point 1), around the existing spans.
    #
    m = re.search(r'<div class="published_at"><time datetime="([^"]+)"><span class="date">', text)
    assert m and m.group(1) == data["datePublished"], "no <time> in the byline: " + text[text.find("published_at") - 40:][:300]


@test
def colleague_cannot_withdraw_published_br97(base):
    command(STATE["ahmed"], f"nl/{SLUG}", "md_withdraw", {"md_reason": "x"})
    assert article_xml(SLUG).find("article").get("status") == "published"


@test
def withdraw_needs_a_reason_br11(base):
    command(STATE["sanne"], f"nl/{SLUG}", "md_withdraw", {"md_reason": " "})
    assert article_xml(SLUG).find("article").get("status") == "published"


@test
def withdraw_with_reason_leaves_overviews_br73_br86(base):
    command(STATE["sanne"], f"nl/{SLUG}", "md_withdraw", {"md_reason": "Een jaartal klopte niet."})
    root = article_xml(SLUG)
    assert root.find("article").get("status") == "retracted"
    assert root.find("article/retraction").text == "Een jaartal klopte niet."
    assert page_node(SLUG).get("retracted") == "on"
    status, text, _ = Client(base).get(f"nl/{SLUG}")
    assert status == 200 and "Een jaartal klopte niet." in text and "De eerste zetels" not in text
    assert re.search(r'teruggetrokken op <time datetime="\d{4}-\d\d-\d\dT[^"]+">\d+ \w+ \d{4}</time>\.', text), "no <time> in the notice"
    _, index, _ = Client(base).get("index/nl")
    assert SLUG not in index, "a withdrawn article is still in the index"
    STATE["ahmed"].get(f"nl/{SLUG}")
    _, text, _ = STATE["ahmed"].follow(STATE["ahmed"].post(f"nl/{SLUG}/discussions/review", "discussion_started"))
    assert "reageren kan niet meer" in text, "a withdrawn article takes new discussions"


@test
def author_edits_retracted_article_again_br78(base):
    command(STATE["sanne"], f"nl/{SLUG}", "md_reedit")
    root = article_xml(SLUG)
    assert root.find("article").get("status") == "draft"
    assert root.find("retractions/retraction") is not None
    node = page_node(SLUG)
    assert node.get("retracted") is None and node.get("private") == "on"


@test
def rename_to_title_before_publication(base):
    sanne = STATE["sanne"]
    save(sanne, f"nl/{SLUG}", fields(title="Afscheid van Bram Hoekstra"))
    command(sanne, f"nl/{SLUG}", "md_rename")
    assert page_node("afscheid-van-bram-hoekstra") is not None


@test
def language_change_before_publication_br77(base):
    sanne = STATE["sanne"]
    path = "nl/afscheid-van-bram-hoekstra"
    sanne.get(path)
    sanne.post(path, "md_language", "en")
    assert page_node("afscheid-van-bram-hoekstra", "en") is not None


@test
def review_findings_control_characters_title_csrf_statute_roles(base):
    sanne = Client(base).login("sanne")
    ahmed = Client(base).login("ahmed")
    title = "<img src=x onerror=alert(1)> \x0b titel"
    location = new_article(sanne, title)
    path = location.split("?")[0].replace(base.rstrip("/") + "/", "").removesuffix("/edit")
    status, text, _ = sanne.get(path)
    assert status == 200, status
    assert "<img src=\"x\" onerror" not in text and "&lt;img src=x onerror=alert(1)&gt;" in text, re.findall(r'<h1[^>]*>.*?</h1>', text, re.S)
    assert save(sanne, path, fields(title="Titel", frontmatter="a: b\x0bc", tags=[["x"]], author=["y"]))["ok"]
    root = article_xml(path.split("/")[1])
    assert root.find("article/source/frontmatter").text == "a: bc", root.find("article/source/frontmatter").text
    status, text, _ = sanne.post(path + "/edit", "md_save", "", {"md_fields": json.dumps(fields()), "ajax": "1", "csrfToken": "deadbeef"})
    assert json.loads(text)["ok"] is False, text
    assert save(sanne, path, fields(title="Titel"))["ok"]
    command(sanne, path, "status_change_review")
    for name in ("ahmed", "lotte", "joris"):
        command(Client(base).login(name), path, "approve", {"md_statute[]": [10, 11, 12, 13, 14]})
    assert len(article_xml(path.split("/")[1]).find("approves")) == 0, "statute numbers outside the list"
    ahmed.get(path)
    ahmed.post(path, "md_language", "en")
    assert page_node(path.split("/")[1], "en") is None, "colleague changed the language"
    for name in ("ahmed", "lotte", "joris"):
        command(Client(base).login(name), path, "approve", {"md_statute[]": STATUTE})
    command(ahmed, path, "status_change_published")
    assert article_xml(path.split("/")[1]).find("article").get("status") == "approved", "colleague published or not approved: " + article_xml(path.split("/")[1]).find("article").get("status")


@test
def old_html_article_opens_in_wymeditor(base):
    # An article stored the old way, without format="markdown" and without a source element.
    beheer = Client(base).login("beheer")
    beheer.post("nl/Start", "newPage", "Oud_artikel", {"newPageType": "textpage", "newPageLanguage": "nl"})
    node = page_node("Oud_artikel")
    path = os.path.join(WORK, "data", "hypha.xml")
    text = open(path, encoding="utf-8").read().replace(f'id="{node.get("id")}" type="textpage"', f'id="{node.get("id")}" type="peer_reviewed_article"')
    open(path, "w", encoding="utf-8").write(text)
    old = ('<?xml version="1.0" encoding="UTF-8"?>\n<hypha type="peer_reviewed_article" multiLingual="off" versions="off" schemaVersion="1">'
           '<article status="draft" author="Lotte Bakker" created_by="u4" created_at="t1793000000" updated_at="t1793000000" published_at="">'
           '<content><text><p>Oude tekst&#13;</p><p></p></text><sources/></content><context><title>Oud artikel</title><excerpt><p>Uittreksel</p></excerpt>'
           '<featured_image/><method><p>Bijsluiter</p></method></context></article><discussions><review/><public/></discussions><approves/></hypha>')
    open(os.path.join(WORK, "data/pages", node.get("id")), "w", encoding="utf-8").write(old)
    status, text, _ = beheer.get("nl/Oud_artikel/edit")
    assert status == 200 and "wymeditor" in text and "mdeConfig" not in text
    # Saving through the old editor keeps the XML structure: no format, no source (regression, design 12.13).
    beheer.post("nl/Oud_artikel/edit", "save", "", {"title": "Oud artikel", "author": "Lotte Bakker", "text": "<p>Oude tekst</p>", "excerpt": "<p>Uittreksel</p>", "method": "<p>Bijsluiter</p>", "sources": "", "featured_image": ""})
    article = article_xml("Oud_artikel").find("article")
    assert article.get("format") is None and article.find("source") is None


@test
def author_cannot_approve_old_article_either_br94(base):
    lotte = Client(base).login("lotte")
    path = os.path.join(WORK, "data/pages", page_node("Oud_artikel").get("id"))
    text = open(path, encoding="utf-8").read().replace('status="draft"', 'status="review"')
    open(path, "w", encoding="utf-8").write(text)
    command(lotte, "nl/Oud_artikel", "approve")
    assert len(article_xml("Oud_artikel").find("approves")) == 0
    command(STATE["ahmed"], "nl/Oud_artikel", "approve")
    assert len(article_xml("Oud_artikel").find("approves")) == 1


if __name__ == "__main__":
    sys.exit(run(sys.argv[1]))
