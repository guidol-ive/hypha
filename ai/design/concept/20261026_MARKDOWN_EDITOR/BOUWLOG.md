---
title: "Bouwlogboek van de Markdown-editor (issue #520)"
revision: 1
date_created: 2026-10-27
date_last_review:
---

# Bouwlogboek van de Markdown-editor

Per afgeronde taak uit [BOUWPLAN.md](BOUWPLAN.md): datum, wat er is gebouwd, welke tests draaiden met hun echte uitkomst, en open punten. Bewuste afwijkingen van het ontwerp staan onder [Afwijkingen](#afwijkingen).

## Taken

### T00 Plan (2026-10-27)

1. Branch `issue520-bouw` gemaakt vanaf `issue520-ontwerp` (f5435ec).
2. Ontwerp, coderingsrichtlijnen, proeven en prototype gelezen; bouwplan geschreven.
3. Bevindingen bij het lezen van de bestaande code, die de bouw raken:
   1. `peer_reviewed_article` zoekt `method`, `sources` en `excerpt` met `//naam`; met een `source`-element dat dezelfde kindnamen heeft, vindt `findOneXPath()` er twee en gooit een uitzondering (PHP-009). Die drie zoekpaden worden exact (`article/context/method` enzovoort);
   2. `index.php` serveert alleen `system/wymeditor`, `system/bowser` en `system/assets`; voor `system/mdeditor` is één regel in `index.php` nodig;
   3. `storeWikiContent()` zet inhoud via de HTML-parser van libxml; CDATA overleeft dat niet. De bron van een tekstpagina krijgt daarom een eigen kleine opslagfunctie met dezelfde versieopbouw en hetzelfde tijdstip (de terugvaloptie uit §19).

### T01 Testopstelling (2026-10-27)

1. Gebouwd:
   1. `tests/run.sh <versie> [integratie|browser]`: één opdracht per PHP-versie;
   2. `tests/markdown/run.php` en `lib.php`: eigen runner zonder Composer en PHPUnit; elke PHP-melding laat de test falen;
   3. `tests/site/maak-site.php`: een verzonnen proefsite (vijf gebruikers, zeven tags, „Eemstad”);
   4. `tests/integratie/run.sh` en `hypha.py`: Hypha in het image van `docs/container/Containerfile` (`hypha-md:php8.x`) met de bron alleen-lezen erin, tests over HTTP, en daarna het logboek: elke PHP-melding faalt, behalve de meldingen die zonder de editor al bestaan (`bekende-meldingen.txt`);
   5. `tests/browser/run.mjs` en `run.sh`: Playwright op de geïnstalleerde Google Chrome, headless; unit-pagina's en end-to-end-tests;
   6. `docs/technical/TESTING.md` bijgewerkt.
2. Tests en uitkomsten:
   1. `sh tests/run.sh 8.2` en `8.4`: „asserted 84 tests” en 2 van 2 runnertests (waarvan één die een PHP-waarschuwing moet opvangen);
   2. `sh tests/integratie/run.sh` op 8.2, 8.4 en 8.5: 3 van 3, geen nieuwe PHP-meldingen;
   3. `sh tests/browser/run.sh 8.2`: 1 van 1.
3. Bevindingen:
   1. de bestaande code geeft op PHP 8.4 en 8.5 negen keer „Implicitly marking parameter … as nullable is deprecated” en op alle versies „Using ${var} in strings” in `pages.php`; die staan in `bekende-meldingen.txt` en zijn niet van de editor;
   2. Docker Desktop toonde soms de oude inhoud van een map die was weggehaald en opnieuw gemaakt; de proefsite krijgt daarom per run een nieuwe map in `/tmp/hypha-md-test/`.

## Afwijkingen

Nog geen.
