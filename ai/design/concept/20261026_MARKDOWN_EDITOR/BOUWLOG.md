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

### T02 Server: Markdown naar XHTML en het filter (2026-10-27)

1. Gebouwd:
   1. `system/vendor/` met league/commonmark 2.10.4 (en zeven afhankelijkheden), masterminds/html5 2.12.0 en scrivo/highlight.php 9.18.1.10 met negen taaldefinities (tien talen: HTML en XML delen `xml`), een classmap-autoloader en `LICENSES/`; gemaakt met `sh tools/vendor/bijwerken.sh` (Composer in een container); 433 PHP-bestanden, 2,7 MB;
   2. `system/core/markdown.php`: laden op aanvraag (`hypha_markdownLoad()`), paginanaam uit de titel, instellingen van de editor met standaardwaarden, vrijheidsniveau per rol;
   3. `system/core/markdown/`: `HyphaMarkdown` (omgeving en volgorde van §13.5), `HyphaMarkdownSyntax` (kader en citaat, `:::`-kaders, paginalink, `==`, `++`, `^`, `~`, notities, figuur met bijschrift en plaatsing, formule, `[TOC]`, kop-id's), `HyphaMarkdownRenderers` en `HyphaFilter`;
   4. `system/mdeditor/diagrammen.js`: de 36 sjablonen uit het prototype als module; `tests/fixtures/maak-tekeningen.mjs` tekent ze met Pele 1.10.1 en een set formules met Temml 0.14.0 tot `tekeningen.json`.
2. Tests en uitkomsten (`php tests/markdown/run.php` in `php:8.2-cli` en `php:8.4-cli`):
   1. filter: 25 van 25 aanvallen afgeweerd, 36 van 36 diagrammen heel (zelfde aantal elementen, `viewBox` aanwezig), alle formules heel, uitvoer laadt als XML;
   2. Markdown: 31 tests, één per uitbreiding met een geval dat slaagt en een dat niet tot het element mag leiden; de zeven titels van §13.14 plus één randgeval; 18.000 woorden ruim binnen 1 seconde;
   3. totaal na T02: 65 van 65 op PHP 8.2.35 en op PHP 8.4.27.

### T03 Server: niveau 2 en HedgeDoc-notatie (2026-10-27)

1. Gebouwd: ingesloten inhoud voor YouTube (via `youtube-nocookie.com`), Vimeo, OpenStreetMap, Datawrapper, Flourish, Infogram, Google Maps, Spotify, SoundCloud, Mixcloud, Internet Archive, Bandcamp, Scribd, DocumentCloud en PeerTube-instanties van de lijst; het interactieve blok als `<iframe sandbox="allow-scripts" srcdoc>` met een Content-Security-Policy in de `srcdoc`; HedgeDoc `:::`, `[TOC]`, `++`, `^`, `~`, `=200x150`, `{%youtube %}`, definitielijsten.
2. Tests en uitkomsten: `tests/markdown/Level2Test.php`, 24 tests (elke dienst, onbekende host, niveau 1, interactief blok met en zonder beschrijving, eigen `<iframe>` van de auteur, niveau per rol); totaal 89 van 89 op PHP 8.2.35 en 8.4.27.

### Review van T02 en T03 (2026-10-27)

1. Een subagent beoordeelde de servercode met 52 eigen aanvalsinvoeren. Verwerkt:
   1. **kritiek**: CDATA in `<svg>` of `<math>` ging ongefilterd door en werd markup zodra Hypha de XHTML als HTML inleest; nu wordt CDATA tekst;
   2. een `<iframe>` naar een host van de lijst moest alleen de host kloppen (`www.google.com/url?q=…`); nu ook het pad van de speler per dienst, en `allow` krijgt een vaste waarde;
   3. `\\host` als externe link, `image-set()` en verwanten in een SVG-stijl;
   4. een `:::`-kader in een citaat sloot niet; een niet gesloten notitie verborg de rest van het artikel (nu: einde bij de eerste lege regel, met een melding);
   5. een kader met opmaak in de titel werd niet herkend; onbekende kadersoorten blijven een citaat (`info`, `tip`, `note`, `warning`, `important`, `caution`, `quote`);
   6. een auteur kon met de klasse van de plaatshouder een interactief blok verdubbelen; de plaatshouder heeft nu per keer een willekeurig teken.
2. Niet verwerkt, met reden: de Nederlandse standaardteksten in `HyphaMarkdown::text()` zijn alleen een terugval voor de tests; in Hypha komen ze uit `system/languages/` (`mdHtmlTexts()`). Geneste `:::`-kaders sluiten bij de eerste `:::`, net als markdown-it-container.
3. Tests: 9 nieuwe; 98 van 98 op PHP 8.2.35 en 8.4.27.
4. Bevinding over de opstelling: Docker Desktop toont een net geschreven bestand soms half aan een container (twee keer een parse-fout die bij de volgende run weg was); bij een onverwachte parse-fout eerst opnieuw draaien.

## Afwijkingen

1. **Enkele tilde is subscript, niet doorhalen.** GFM 0.29 kent `~tekst~` als doorhalen; HedgeDoc als subscript (§10.2). Het ontwerp kiest beide. Gebouwd: `~~tekst~~` is doorhalen, `~tekst~` (zonder spatie erin) subscript, zoals markdown-it met de sub-plug-in. Ontwerp §10 bijgewerkt.
2. **Plaatsing `{.klasse}` met een eigen kleine parser**, niet met de Attributes-extensie van league/commonmark (§13.4.2, punt 5). Die extensie kent ook blokattributen op een eigen regel, die markdown-it niet zo kent; met een eigen parser alleen direct achter een afbeelding of op de regel van een codeblok zijn server en browser gelijk.
3. **Kop-id's beginnen met `kop-`** (`kop-de-eerste-zetels`), omdat Hypha elementen als `main` en `menu` op id zoekt en een tussenkop „Menu” anders botst.
4. **`system/vendor/` is 2,7 MB** in plaats van de geschatte 1,3 MB (§13.12): vooral league/commonmark zelf (1,4 MB met alle extensies).
5. **Temml 0.14.0** zoals in het prototype; highlight.php kent HTML als `xml`, dus tien talen met negen definities.
6. **Ingesloten inhoud krijgt `sandbox="allow-scripts allow-same-origin allow-popups allow-presentation"`**: de spelers van YouTube en Vimeo werken niet zonder hun eigen herkomst. Een `<iframe>` mag alleen naar het pad van de speler van een dienst (§13.5 noemde alleen de host).
