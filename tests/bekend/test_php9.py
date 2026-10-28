"""Known bugs for PHP 8.6 and PHP 9.0: code that works on PHP 8.2 up to 8.6 with a warning or a deprecation, but stops
with an Error or TypeError on PHP 9.0.

PHP 9.0 is not released and no image exists; the accepted RFCs say what changes:
- https://wiki.php.net/rfc/undefined_variable_error_promotion and
  https://wiki.php.net/rfc/undefined_property_error_promotion: reading an undefined variable or property throws an
  Error (today a warning).
- https://wiki.php.net/rfc/deprecate_null_to_scalar_internal_arg: null for a non-nullable parameter of an internal
  function throws a TypeError (today a deprecation, since 8.1).

So each test checks for today's warning or deprecation, or for its visible effect. The PHP messages are taken from the
web container with php_in_container() (the PHP CLI of the web image, which logs on every version) where possible: on
PHP 8.6 RC the apache2handler no longer writes PHP messages with error_log = /dev/stderr to the container log.
"""
import json
import os
import re
import subprocess
import sys
import time
import urllib.parse
import xml.etree.ElementTree as ET

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "integratie"))
sys.path.insert(0, os.environ.get("HYPHA_INTEGRATIE", ""))
from hypha import Client, known_bug, run  # noqa: E402

ENGINE = os.environ.get("ENGINE", "docker")
WORK = os.environ.get("HYPHA_WORK", "")
CODE = os.environ.get("HYPHA_CODE", "")
STATE = {}


#
# The container, its PHP version and its log (as in test_platform.py).
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
    """Runs PHP code in the web container, in the web root. Returns the PHP messages that the code raised and what it
    printed on its last line before them."""
    script = "set_error_handler(function ($no, $message) { $GLOBALS['m'][] = $message; return true; }); $GLOBALS['m'] = []; $GLOBALS['out'] = '';\n" + code + "\necho \"\\n\", json_encode([$GLOBALS['m'], $GLOBALS['out']]);"
    out = subprocess.run([ENGINE, "exec", "-w", "/var/www/html", container(base), "php", "-r", script], capture_output=True, text=True)
    if out.returncode != 0:
        raise RuntimeError(f"php in the container failed: {out.stdout[-500:]} {out.stderr[-500:]}")
    return json.loads(out.stdout.strip().splitlines()[-1])


def short(lines):
    return " | ".join(sorted({re.sub(r"^\[[^]]*\] ", "", line)[:150] for line in lines}))[:400]


def page_id(name, language="nl"):
    for page in ET.parse(os.path.join(WORK, "data/hypha.xml")).getroot().findall("pageList/page"):
        for l in page.findall("language"):
            if l.get("id") == language and l.get("name") == name:
                return page.get("id")
    return None


#
# #599: PHP 9.0: reads of undefined variables and properties become errors.
#
@known_bug(599)
def a_digest_mail_names_its_period_with_a_short_digest_interval(base):
    #
    # An interval of a minute or less (settings: 0 days, 0 hours, 1 minute) sends the digest less than 61 seconds
    # after the last one; flushDigest() then reads $s without setting it.
    #
    path = os.path.join(WORK, "data/hypha.xml")
    with open(path, encoding="utf-8") as f:
        xml = f.read()
    xml = re.sub(r' (digestInterval|lastDigestTime)="[^"]*"', "", xml, count=2)
    xml = xml.replace("<hypha ", f'<hypha digestInterval="0" lastDigestTime="{int(time.time()) - 5}" ', 1)
    with open(path, "w", encoding="utf-8") as f:
        f.write(xml)
    with open(os.path.join(WORK, "data/digest"), "w", encoding="utf-8") as f:
        f.write('<div>28-10-26, 10:00 Proefwijziging voor de samenvatting</div>\n')
    mail = os.path.join(WORK, "data/mail.log")
    before = os.path.getsize(mail) if os.path.exists(mail) else 0
    result = {}
    messages = php_messages(base, lambda: result.update(status=Client(base).get("nl/Start")[0]))
    with open(mail, encoding="utf-8", errors="replace") as f:
        f.seek(before)
        sent = f.read()
    assert result["status"] == 200, f"nl/Start gave {result['status']}"
    heading = re.search(r'<div style="font-size: 14pt;"><b>[^<]*</b>: ([^<]*)</div>', sent)
    assert heading, "no digest mail was sent"
    found = [m for m in messages if "Undefined variable $s" in m]
    assert not found and not heading.group(1).endswith(" "), f"the digest mail says '{heading.group(1)}' without a period; {len(found)} messages: {short(found)}"


@known_bug(599)
def requirelock_names_the_file_without_reading_an_undefined_property(base):
    messages, out = php_in_container(base, "require 'system/core/database.php'; $xml = new Xml('textpage', Xml::multiLingualOn, Xml::versionsOn); $xml->loadFromFile('data/pages/home00000001'); try { $xml->requireLock(); } catch (LogicException $e) { $GLOBALS['out'] = $e->getMessage(); }")
    found = [m for m in messages if "Undefined property" in m]
    assert not found, f"{len(found)} messages on PHP {php_version(base)}: {short(found)}"
    assert "data/pages/home00000001" in out, f"the exception says '{out}' instead of naming the file"


@known_bug(599)
def the_installer_data_function_reads_no_undefined_variable(base):
    #
    # hypha.php runs code at load time, so only its function data() is taken out and run.
    #
    messages, out = php_in_container(base, "preg_match('/\\n\\tfunction data\\(\\$name\\) \\{.*?\\n\\t\\}\\n/s', file_get_contents('hypha.php'), $m); eval($m[0]); $GLOBALS['out'] = var_export(data('system/no-such-file.php'), true);")
    found = [m for m in messages if "Undefined variable" in m]
    assert not found, f"data() of hypha.php for a file that is not packed: {len(found)} messages on PHP {php_version(base)}: {short(found)}"


#
# #600: PHP 9.0: null for a string parameter of an internal function becomes a TypeError.
#
ARTICLE = """<?xml version="1.0" encoding="UTF-8"?>
<hypha type="peer_reviewed_article" multiLingual="off" versions="off" schemaVersion="1">
  <article status="draft" author="Lotte Bakker" created_at="t1793000000" updated_at="t1793000000" created_by="u4">
    <content><text><p>Verzonnen artikel over de Eemstadse raad.</p></text><sources/></content>
    <context><title>Concept php9</title><excerpt><p>Kort verslag.</p></excerpt><method/></context>
  </article>
  <featured_image/>
  <discussions><review/><public/></discussions>
  <approves/>
</hypha>
"""


@known_bug(600)
def an_article_saved_without_title_author_or_image_field_passes_no_null_to_the_dom(base):
    beheer = Client(base).login("beheer")
    beheer.post("nl/Start", "newPage", "Concept php9", {"newPageType": "peer_reviewed_article", "newPageLanguage": "nl"})
    pid = page_id("Concept_php9")
    assert pid, "the article page was not made"
    with open(os.path.join(WORK, "data/pages", pid), "w", encoding="utf-8") as f:
        f.write(ARTICLE)
    beheer.get("nl/Concept_php9/edit")
    #
    # A post without the fields title, author, featured_image and file_shadow_featured_image (as a client other
    # than the edit form of the browser sends it).
    #
    result = {}
    messages = php_messages(base, lambda: result.update(answer=beheer.post("nl/Concept_php9/edit", "save", "", {"text": "<p>Nieuwe tekst</p>", "excerpt": "<p>Uittreksel</p>", "method": "", "sources": ""})))
    assert result["answer"][0] in (200, 302, 303), f"saving the article gave {result['answer'][0]}"
    #
    # The stored values are the same with and without the fix (null becomes ""), so only the log shows the fault: run
    # this test on PHP 8.2 up to 8.5, whose web container logs deprecations.
    #
    found = [m for m in messages if "Passing null to parameter" in m]
    assert not found, f"{len(found)} messages on PHP {php_version(base)}: {short(found)}"


if __name__ == "__main__":
    sys.exit(run(sys.argv[1]))
