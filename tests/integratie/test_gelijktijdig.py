"""Two people or two requests at once (found by the concurrency test of 2026-10-27): no silent overwrite, tags and
text from the same save, a rename by someone else does not break a save, and the status is checked under the lock.

The real races (many requests released together) are in the notes of that test; these cases check the rules
deterministically, one request after the other.
"""
import json
import os
import sys
import threading

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hypha import Client, run, test  # noqa: E402
from test_artikel import STATUTE, article_xml, config, fields, new_article, page_node, save, site  # noqa: E402
import hypha  # noqa: E402

#
# Only the helpers of test_artikel.py, not its tests: those run in their own file.
#
hypha.TESTS.clear()

STATE = {}


def save_with(client, path, f, base=None, force=False):
    extra = {"md_fields": json.dumps(f), "md_renders": json.dumps({}), "ajax": "1"}
    if base is not None:
        extra["md_base"] = str(base)
    if force:
        extra["md_force"] = "1"
    status, text, _ = client.post(path + "/edit", "md_save", "", extra)
    assert status == 200, (status, text[:300])
    return json.loads(text)


def text_fields(title, text):
    return fields(title=title, text=text, tags=["Raadsnieuws"])


@test
def a_save_on_an_older_version_is_refused_with_who_saved(base):
    sanne = Client(base).login("sanne")
    new_article(sanne, "Gelijktijdig bewerken in Eemstad")
    path = "nl/gelijktijdig-bewerken-in-eemstad"
    revision = config(sanne, path + "/edit")["page"]["revision"]
    first = save_with(sanne, path, text_fields("Gelijktijdig bewerken in Eemstad", "Versie van Sanne.\n"), revision)
    assert first["ok"] and first["revision"] == revision + 1, first
    ahmed = Client(base).login("ahmed")
    second = save_with(ahmed, path, text_fields("Gelijktijdig bewerken in Eemstad", "Versie van Ahmed.\n"), revision)
    assert not second["ok"] and second["conflict"]["name"] == "Sanne de Vries", second
    assert "Versie van Sanne." in article_xml("gelijktijdig-bewerken-in-eemstad").find("article/source/text").text
    STATE.update(path=path, revision=first["revision"])


@test
def save_anyway_replaces_the_newer_version(base):
    ahmed = Client(base).login("ahmed")
    result = save_with(ahmed, STATE["path"], text_fields("Gelijktijdig bewerken in Eemstad", "Versie van Ahmed.\n"), STATE["revision"] - 1, force=True)
    assert result["ok"] and result["revision"] == STATE["revision"] + 1, result
    assert "Versie van Ahmed." in article_xml("gelijktijdig-bewerken-in-eemstad").find("article/source/text").text


@test
def the_editor_gets_the_revision_and_the_page_id(base):
    page = config(Client(base).login("sanne"), STATE["path"] + "/edit")["page"]
    assert page["revision"] == STATE["revision"] + 1 and page["id"] == page_node("gelijktijdig-bewerken-in-eemstad").get("id"), page


@test
def tags_and_text_come_from_the_same_save(base):
    #
    # Many saves at once with different tags: afterwards the tags belong to the stored text. Read through Hypha, not
    # from the files on the host, which may lag behind the container (Docker Desktop, see TESTING.md). A round where a
    # request failed is not counted: on a macOS bind mount, rename() is sometimes seen as a missing file.
    #
    path = STATE["path"]
    labels = {"Wonen": "Tekst met wonen.", "Cultuur": "Tekst met cultuur.", "Onderwijs": "Tekst met onderwijs.", "Verkeer": "Tekst met verkeer."}
    clients = {label: Client(base).login(user) for label, user in zip(labels, ["sanne", "ahmed", "lotte", "joris"])}
    reader = Client(base).login("beheer")
    mismatches = counted = 0
    for _ in range(6):
        barrier = threading.Barrier(len(labels))
        failed = []

        def one(label):
            barrier.wait()
            try:
                save_with(clients[label], path, fields(title="Gelijktijdig bewerken in Eemstad", text=labels[label] + "\n", tags=[label]), force=True)
            except AssertionError:
                failed.append(label)
        threads = [threading.Thread(target=one, args=(label,)) for label in labels]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        if failed:
            continue
        counted += 1
        stored = config(reader, path + "/edit")["fields"]
        expected = [label for label, body in labels.items() if body in stored["text"]]
        if sorted(stored["tags"]) != sorted(expected):
            mismatches += 1
    assert counted >= 3, f"only {counted} of 6 rounds without a failed request"
    assert mismatches == 0, f"{mismatches} of {counted} rounds: tags of another save than the text"


@test
def a_save_after_a_rename_by_someone_else_is_found_by_id(base):
    sanne = Client(base).login("sanne")
    new_article(sanne, "Oude titel van het artikel")
    old = "nl/oude-titel-van-het-artikel"
    page_id = config(sanne, old + "/edit")["page"]["id"]
    assert save_with(sanne, old, text_fields("Nieuwe titel van het artikel", "Eerste versie.\n"))["ok"]
    sanne.get(old)
    sanne.follow(sanne.post(old, "md_rename"))
    assert page_node("nieuwe-titel-van-het-artikel") is not None, "not renamed"
    ahmed = Client(base).login("ahmed")
    ahmed.get(old)
    status, text, _ = ahmed.post(old, "mdLocate", page_id, {"ajax": "1"})
    found = json.loads(text)
    assert found == {"ok": True, "language": "nl", "name": "nieuwe-titel-van-het-artikel"}, found


@test
def retracting_to_draft_makes_the_article_private_again(base):
    sanne = Client(base).login("sanne")
    new_article(sanne, "Terugtrekken onder het slot")
    path, name = "nl/terugtrekken-onder-het-slot", "terugtrekken-onder-het-slot"
    assert save(sanne, path, fields(title="Terugtrekken onder het slot"))["ok"]
    sanne.get(path)
    sanne.follow(sanne.post(path, "status_change_review"))
    for user in ["ahmed", "lotte", "joris"]:
        colleague = Client(base).login(user)
        colleague.get(path)
        colleague.follow(colleague.post(path, "approve", "", {"md_statute[]": STATUTE}))
    assert article_xml(name).find("article").get("status") == "approved"
    sanne.get(path)
    sanne.follow(sanne.post(path, "md_retract"))
    assert article_xml(name).find("article").get("status") == "draft"
    assert page_node(name).get("private") == "on", "a retracted draft must be private"


if __name__ == "__main__":
    sys.exit(run(sys.argv[1]))
