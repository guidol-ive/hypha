"""/robots.txt and /sitemap.xml come from their cache, before hypha.xml is read, while no page has changed."""
import os
import stat
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "bekend"))
from hypha import Client, run, test  # noqa: E402
import hypha  # noqa: E402
import test_paginas as pages  # noqa: E402

#
# Only the helpers of test_paginas.py, not its tests.
#
hypha.TESTS.clear()


@test
def robots_txt_and_the_sitemap_do_not_read_hypha_xml_while_the_cache_is_valid(base):
    # The cache is only kept when it was built after the second of the last change.
    time.sleep(1.1)
    client = Client(base)
    _, robots, _ = client.get("robots.txt")
    _, sitemap, _ = client.get("sitemap.xml")
    path = os.path.join(pages.WORK, "data/hypha.xml")
    mode = stat.S_IMODE(os.stat(path).st_mode)
    # Unreadable: a request that reads it leaves a PHP warning, which fails the run.
    os.chmod(path, 0)
    try:
        status_robots, cached_robots, _ = client.get("robots.txt")
        status_sitemap, cached_sitemap, _ = client.get("sitemap.xml")
    finally:
        os.chmod(path, mode)
    assert status_robots == 200 and cached_robots == robots and "Sitemap: " in robots, cached_robots
    assert status_sitemap == 200 and cached_sitemap == sitemap and "/nl/Start</loc>" in sitemap, cached_sitemap[:300]


@test
def robots_txt_keeps_crawlers_away_from_the_honeypot_link(base):
    _, robots, _ = Client(base).get("robots.txt")
    assert "\nDisallow: /bot-trap\n" in robots, robots
    _, text, _ = Client(base).get("nl/Start")
    assert 'href="bot-trap"' in text, "the page has no honeypot link"


@test
def the_sitemap_is_built_again_after_a_change(base):
    time.sleep(1.1)
    client = Client(base)
    client.get("sitemap.xml")
    name = f"Nieuw in de sitemap {pages.RUN}"
    slug = pages.text_page(Client(base).login("sanne"), name, ["<p>Nieuw.</p>"])
    _, sitemap, _ = client.get("sitemap.xml")
    assert f"/nl/{slug}</loc>" in sitemap, "a new page is missing: the cache was not renewed"


if __name__ == "__main__":
    sys.exit(run(sys.argv[1]))
