"""Logging in without JavaScript, and the icons of the command bar without an icon font of the theme (#645)."""
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hypha import PASSWORD, Client, run, test  # noqa: E402


def commands(text):
    return re.search(r'<div class="hyphaCommands[^"]*">(.*?)</div>', text, re.S).group(1)


@test
def the_login_link_opens_a_page_and_not_javascript(base):
    _, text, _ = Client(base).get("nl/Start")
    bar = commands(text)
    assert 'href="nl/Start?login"' in bar, bar
    assert 'href="index/nl"' in bar, bar
    assert "javascript:" not in bar, bar


@test
def the_command_bar_has_icons_of_hypha_itself(base):
    _, text, _ = Client(base).get("nl/Start")
    bar = commands(text)
    assert 'class="hypha-icon hypha-icon-login"' in bar and 'class="hypha-icon hypha-icon-index"' in bar, bar
    assert 'class="fa ' not in bar, bar
    _, css, _ = Client(base).get("system/assets/hypha-core.css")
    for name in ("index", "login", "logout", "new-page", "settings", "edit"):
        assert ".hypha-icon-" + name + " {" in css, name


@test
def the_page_with_login_shows_the_form_that_posts_itself(base):
    _, text, _ = Client(base).get("nl/Start?login")
    form = re.search(r'<div id="popup"[^>]*>.*?</form>', text, re.S)
    assert form, "no login form in the popup"
    form = form.group(0)
    assert 'style="display:block"' in form, form[:200]
    assert 'action="nl/Start?login"' in form and 'name="command" value="login"' in form, form
    assert 'name="csrfToken"' in form and "onclick" not in form, form


@test
def a_member_logs_in_with_the_form_alone(base):
    client = Client(base)
    _, text, _ = client.get("nl/Start?login")
    fields = dict(re.findall(r'<input[^>]*name="(command|csrfToken)"[^>]*value="([^"]*)"', text))
    fields.update({"loginUsername": "lotte", "loginPassword": PASSWORD})
    status, _, location = client.request("nl/Start?login", fields)
    assert status == 302 and location.endswith("nl/Start?login"), (status, location)
    _, text, _ = client.get("nl/Start?login")
    assert "Lotte" in text or "lotte" in text, "not logged in"
    assert "loginPassword" not in re.search(r'<div id="popup".*?</div>', text, re.S).group(0), "form shown after login"


@test
def a_wrong_password_shows_the_form_again(base):
    client = Client(base)
    _, text, _ = client.get("nl/Start?login")
    fields = dict(re.findall(r'<input[^>]*name="(command|csrfToken)"[^>]*value="([^"]*)"', text))
    fields.update({"loginUsername": "lotte", "loginPassword": "verkeerd"})
    status, _, location = client.request("nl/Start?login", fields)
    _, text, _ = client.get(location.split("/", 3)[-1] if location.startswith("http") else location)
    assert 'id="loginPassword"' in text, "no login form after a wrong password"


if __name__ == "__main__":
    sys.exit(run(sys.argv[1]))
