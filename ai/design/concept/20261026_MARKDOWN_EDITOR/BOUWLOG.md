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

### T04 Opslag en datatypes: artikel met review (2026-10-27)

1. Gebouwd:
   1. trait `MarkdownArticle` (`system/core/markdown_article.php`): opslaan in één vergrendelde schrijfactie (XHTML via XML ingelezen, zodat `viewBox` heel blijft; `wikify()` vóór het slot), rubriek, tags met onbekende tags apart, eigenschappen van de afbeelding, onbekende Frontmatter, de reviewstroom (goedkeuren met redactiestatuut en opmerking, terugtrekken naar schets, terugtrekken na publicatie met reden, opnieuw bewerken, taal wijzigen, webadres bijwerken) en de extra checks `has-title`, `has-section`, `known-tags`;
   2. `system/core/mdeditor.php`: het element van de editor met de configuratie als JSON, de bestanden van `system/mdeditor/` met lange cache, het JSON-antwoord, de opdracht `mdNewArticle` (titel → webadres) en de voorkeuren per gebruiker;
   3. wijzigingen in bestaande code: `peer_reviewed_article.php` (`use`, één doorschakeling in `process()`, `format` en bron in `ensureStructure()`, een bestaande titel blijft staan, `array_merge` met `mdChecks()`, BR-94 in `approveAction()` en bij de knop, exacte zoekpaden voor `title`, `method`, `sources`, `excerpt` en `featured_image`), `pages.php` (2 regels: teruggetrokken artikelen uit de overzichten), `index.php` (1 regel: `system/mdeditor/`);
   4. 46 teksten in `system/languages/nl.php` en `en.php` via `tools/teksten.tsv` en `tools/teksten.py`.
2. Tests en uitkomsten: `tests/integratie/test_artikel.py`, 26 tests over HTTP; elke bedrijfsregel die de server afdwingt met een geval dat slaagt en een dat faalt (BR-05, 07, 10, 11, 27, 28, 45, 47, 50, 63, 67, 71, 72, 73, 76, 77, 78, 86, 94 ook voor oude artikelen, 96, 97, 98), regressie met een oud HTML-artikel (opent in WYMeditor, opslaan houdt de structuur). Op PHP 8.2.35 en 8.4.27: 26 van 26 en 3 van 3, geen nieuwe PHP-meldingen; bewaren 10 tot 20 ms.
3. Bevindingen in bestaande code (niet van de editor, wel opgevangen of genoteerd):
   1. `featured_image` wordt gelezen en geschreven als kind van de wortel, maar `ensureStructure()` maakt er ook een lege in `context`; daarna geeft de check `//featured_image` een fatale fout. De check is nu exact; de nieuwe editor schrijft waar de bestaande code leest;
   2. een nieuw artikel via de oude popup zonder titel geeft een fatale fout in `process()` (`writeToElement('pagename', ' ')`); de nieuwe opdracht `mdNewArticle` zet de titel vooraf, dus de nieuwe editor raakt dit niet;
   3. `tags.php` schrijft `class` twee keer, het sterretje van een privépagina mist een `;`, de deellinks een `&amp;`, en `strftime()` is verouderd: allemaal in `bekende-meldingen.txt`.

### T05 Opslag en datatypes: tekstpagina (2026-10-27)

1. Gebouwd: trait `MarkdownPage` (`system/core/markdown_page.php`); in `text.php` een `use`-regel en één doorschakeling in `process()`. Een nieuwe, lege tekstpagina opent in de nieuwe editor. De XHTML staat in de bestaande versiestructuur (versielijst, verschillen, digest en terugzetten blijven werken), de bron in een eigen knooppunt `source/language/version` met hetzelfde tijdstip. Opslaan en tonen lezen de XHTML als XML (`hypha_markdownStoreWikiXhtml()`), omdat `storeWikiContent()` en `writeToElement()` de HTML-parser gebruiken, die `viewBox` kleine letters geeft.
2. Tests en uitkomsten: `tests/integratie/test_tekstpagina.py`, 8 tests (nieuwe pagina, drie versies met gelijke tijdstempels, `viewBox` in de leesweergave, oude versie voor leden, terugzetten van XHTML en bron samen, vertalen, hernoemen en privé, oude tekstpagina blijft in WYMeditor en ongewijzigd). PHP 8.2.35 en 8.4.27: 8 van 8 (en 26 en 3 van T01 en T04), geen nieuwe PHP-meldingen.
3. Gevonden en opgelost: twee talen die in dezelfde seconde worden bewaard, kregen dezelfde `xml:id`; de tijdstempel wordt nu verhoogd tot hij uniek is in het document. (De bestaande `storeWikiContent()` heeft hetzelfde probleem bij vertalen; niet aangepast.)

### T06 Bibliotheken voor de browser (2026-10-27)

1. Gebouwd: `tools/bundel/` (package.json met vaste versies, `bundel.mjs`, ingangen in `src/`) en `system/mdeditor/vendor/bundel.sh`. Per bibliotheek één ES-module met de versie in de naam: `codemirror-6.36.8.js` (203 kB gzip), `prosemirror-1.40.0.js` (83 kB; markdown-it komt via de import map), `markdown-it-14.1.0.js` met voetnoten en definitielijsten (52 kB), `dompurify-3.2.6.js` (8 kB), `highlight-11.11.1.js` met de tien talen (21 kB), `pele-1.10.1.js` (257 kB) en `temml-0.14.0.js` (113 kB) als hun eigen ES-module. Licenties van alle 48 meegebundelde pakketten in `LICENSES/`.
2. Tests en uitkomsten: `tests/browser/unit/vendor.test.html` in headless Chrome: 7 van 7 (elke bundel laadt via de import map en doet zijn basistaak); de licentiecontrole in `bundel.mjs`: 48 pakketten, alle permissief (DOMPurify onder Apache-2.0).
3. CodeMirror is groter dan geschat (203 tegen 178 kB gzip): `@codemirror/lang-markdown` trekt de HTML-, CSS- en JavaScript-talen mee voor ingesloten code. Pele en Temml worden pas geladen als ze nodig zijn.

### Review van T04 en T05 (2026-10-27)

1. Een subagent beoordeelde opslag en reviewstroom met eigen aanvallen over HTTP. Verwerkt:
   1. **kritiek**: een verticale tab (gangbaar na plakken uit Word) in een veld maakte het hele artikelbestand onleesbaar; alle velden gaan nu door `hypha_markdownClean()` (geen ongeldige XML-tekens, geldige UTF-8, alleen tekst; alleen `tags` is een lijst);
   2. **hoog**: de titel kwam als HTML in de kop van de leespagina (bestaande `writeToElement('pagename', …)`); nu als tekst. Dat lost ook de fatale fout bij een nieuw artikel zonder titel op (T04, bevinding 2);
   3. **hoog**: het redactiestatuut liet zich omzeilen met andere nummers; nu moeten precies de punten 0 tot en met n−1 bevestigd zijn, opnieuw gecontroleerd onder het slot (BR-51);
   4. **hoog**: een collega kon de taal en het webadres wijzigen; nu alleen de auteur (taal) of auteur en beheerder (webadres);
   5. een ongeldig CSRF-token hield `md_*`-opdrachten niet tegen (de bestaande `executePostedCommand()` markeert ze alleen); de traits controleren het nu zelf (SEC-002);
   6. een collega kon een goedgekeurd artikel publiceren (bestaand: alleen de knop was verborgen); voor Markdown-artikelen nu geweigerd (BR-72, BR-92);
   7. een niet-bestaande versie gaf een fatale fout; alleen bestaande versies worden gebruikt;
   8. een teruggetrokken artikel krijgt `noindex`.
2. Niet verwerkt, genoteerd als open punt: de site-index (`datatypes/index.php`) toont teruggetrokken artikelen nog bij naam; de reactieroutes blijven open op een teruggetrokken artikel; bij hernoemen of tags wordt `hypha.xml` vóór het artikelbestand geschreven (geen transactie over twee bestanden, zoals overal in Hypha).
3. Tests: één integratietest die al deze gevallen nabootst; 27, 3 en 8 van 27, 3 en 8 op PHP 8.2.35 en 8.4.27, geen nieuwe meldingen; unit 98 van 98.

### T07 (deel 1) Gedeelde markdown-it-plug-ins en de pariteitstest (2026-10-27)

1. Gebouwd: `system/mdeditor/hypha-markdown.js` met dezelfde uitbreidingen als de server (kaders en citaten, `:::`, paginalinks, `==`, `++`, `^`, `~`, notities, figuren met plaatsing en grootte, diagrammen, formules, codemarkering, voetnoten in de HTML van de server, kop-id's, `[TOC]`, ingesloten inhoud, takenlijsten, uitlijning als `align`); `tests/fixtures/pariteit.php` en `maak-pariteit.php` (19 gevallen, waaronder de drie proefteksten).
2. Tests: `tests/browser/unit/pariteit.test.html`: 19 van 19 gelijk na normaliseren (attributen gesorteerd, witruimte samengevoegd, `rel` en de kleurspans van de codemarkering weggelaten).

### T07 (deel 2) ProseMirror-schema en serializer (2026-10-27)

1. Gebouwd: `system/mdeditor/opmaak.js`: een eigen schema voor Hypha-Markdown 1.0 (kaders, figuur met bijschrift, diagram, interactief blok, formule, paginalink, voetnoot, notitie, `[TOC]`, ingesloten inhoud, tabellen met uitlijning, takenlijsten, en een grijs blok „bewerk in Markdown” voor eigen HTML en onbekende bron), de omzetting van de tokens van markdown-it en een eigen serializer (op `MarkdownSerializer` van prosemirror-markdown).
2. Verliesvrij wisselen (BR-75): elk blok op het hoogste niveau onthoudt zijn bron; ProseMirror houdt een ongewijzigd blok als hetzelfde object, dus wat de auteur niet aanraakte, gaat letterlijk terug, met de eigen witregels. Alleen gewijzigde blokken worden opnieuw geschreven, in de huisstijl. Regels die geen blok claimt, worden een eigen blok met hun bron.
3. Tests: `tests/browser/unit/opmaak.test.html`, 42 van 42: heen en terug zonder één verschil voor de drie proefteksten en alle 19 pariteitsgevallen en randgevallen (lege tekst, witregels voor en na); elk blok vers geschreven geeft dezelfde HTML (19 van 19); een gewijzigde alinea in de huisstijl met de rest letterlijk; nieuwe tabel, lijst, kader, figuur, diagram en formule in de huisstijl; platte tekst die op Hypha-syntaxis lijkt, wordt ontsnapt.

## Afwijkingen

1. **Enkele tilde is subscript, niet doorhalen.** GFM 0.29 kent `~tekst~` als doorhalen; HedgeDoc als subscript (§10.2). Het ontwerp kiest beide. Gebouwd: `~~tekst~~` is doorhalen, `~tekst~` (zonder spatie erin) subscript, zoals markdown-it met de sub-plug-in. Ontwerp §10 bijgewerkt.
2. **Plaatsing `{.klasse}` met een eigen kleine parser**, niet met de Attributes-extensie van league/commonmark (§13.4.2, punt 5). Die extensie kent ook blokattributen op een eigen regel, die markdown-it niet zo kent; met een eigen parser alleen direct achter een afbeelding of op de regel van een codeblok zijn server en browser gelijk.
3. **Kop-id's beginnen met `kop-`** (`kop-de-eerste-zetels`), omdat Hypha elementen als `main` en `menu` op id zoekt en een tussenkop „Menu” anders botst.
4. **`system/vendor/` is 2,7 MB** in plaats van de geschatte 1,3 MB (§13.12): vooral league/commonmark zelf (1,4 MB met alle extensies).
5. **Temml 0.14.0** zoals in het prototype; highlight.php kent HTML als `xml`, dus tien talen met negen definities.
7. **De afbeelding bij het uittreksel staat onder de wortel** (`hypha/featured_image`), niet in `article/context` (§14.1): daar leest en schrijft de bestaande code haar.
8. **Doorschakelen in `process()`** in plaats van in `editView()` en `editAction()` (§13.13): de nieuwe opdrachten (terugtrekken, goedkeuren met redactiestatuut, taal, webadres) hebben eigen routes, en zo blijft het bij één regel. In totaal raken de wijzigingen 27 regels van `peer_reviewed_article.php`, 2 van `pages.php` en 1 van `index.php` (het ontwerp schatte zes regels en geen wijziging in `index.php`).
11. **De bron van een tekstpagina staat in `source/language[@id]/version[@at]`**, niet met `xml:id` zoals de inhoud: een `xml:id` moet uniek zijn in het document, en de versie van de bron heeft hetzelfde tijdstip als die van de inhoud. Opslaan gebeurt met een eigen kleine functie in plaats van `storeWikiContent()` (de terugvaloptie van §19).
9. **Een tekstpagina houdt haar paginanaam als titel** (§9: „de paginanaam zoals Hypha hem toont”); het webadres uit de titel (kleine letters, koppeltekens) geldt alleen voor artikelen. Anders zou het menu „over-ons” tonen in plaats van „Over ons”.
10. **Goedkeuren met het redactiestatuut gebeurt in de leesweergave**, waar beoordelaars nu ook goedkeuren, in een venster; de editor toont de status en de knop *trek terug*.
6. **Ingesloten inhoud krijgt `sandbox="allow-scripts allow-same-origin allow-popups allow-presentation"`**: de spelers van YouTube en Vimeo werken niet zonder hun eigen herkomst. Een `<iframe>` mag alleen naar het pad van de speler van een dienst (§13.5 noemde alleen de host).
