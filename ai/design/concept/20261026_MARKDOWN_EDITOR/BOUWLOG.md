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

### T08 (deel 1) De editor in Hypha (2026-10-27)

1. Gebouwd in `system/mdeditor/`: `start.js` (start uit `#mdeConfig`), `editor.js` (beide weergaven, artikelkop, bijsluiter en bronnen als eigen ProseMirror-vakken, voorbeeld met Pele, Temml en highlight.js pas als ze nodig zijn, checklist met alleen problemen en *toon alles*, extra tips, structuur, statusbalk met deels gevuld rondje, *start beoordeling* en *trek terug*, taalkeuze, webadres bijwerken, concept in de browser, opslaan met SVG en MathML per SHA-256, plakken, `.md` importeren en exporteren, versleepbare scheiding, werkbalk op één regel met *Meer*), `dialogen.js` (beeld met upload, diagram met 36 sjablonen en Nederlandse foutmeldingen, formule, spiekbriefje, tabelmenu ook op de rechtermuisknop, `/`-menu en `[[`-suggesties), `voorkant.js` (Frontmatter), `plakken.js` (uit het prototype, als module), `mdeditor.css` (de CSS van het prototype, afgebakend tot `.mdeditor`, plus de nieuwe onderdelen); ruim 400 teksten in beide talen.
2. Tests en uitkomsten: `tests/browser/e2e/editor.mjs` tegen Hypha op PHP 8.2 in de container: 12 van 12 (nieuw artikel zonder fouten, Frontmatter vult de velden, wisselen zonder verschil, cursor in hetzelfde blok, vet in Opmaak met de rest letterlijk, tabelmenu, diagramdialoog, plakken uit Word, voorbeeld met getekend diagram, opslaan in 139 ms met SVG en MathML in de leesweergave, export en import gelijk, geen fouten in de console).
3. Gevonden en opgelost in de container: met twee Apache-werkers hielden open keep-alive-verbindingen de werkers vast; elk bestand van een pagina wachtte 7 tot 14 seconden. `KeepAlive Off` in `docs/container/hypha-vhost.conf`; daarna laadt de pagina in 0,12 s.

### T09 Plakken uit Word, Google Docs en LibreOffice (2026-10-27)

1. Gebouwd: `plakken.js` uit het prototype als module (meldingen nu uit de taalbestanden), in de plakhaak van CodeMirror en van ProseMirror; de klembord-HTML van het prototype als `tests/fixtures/plaktest/gegevens.js`.
2. Tests en uitkomsten:
   1. `tests/browser/unit/plaktest.test.html`: 28 van 28 (3 documenten letter voor letter, 24 losse gevallen waaronder zes OMML-formules, en snelheid: het Word-document veertig keer in 84 ms, eis 1 s);
   2. `tests/browser/e2e/plakken.mjs` in de editor op PHP 8.2: 9 van 9: de drie documenten in Markdown letter voor letter, in Opmaak met dezelfde betekenis (de huisstijl), en ⌘Z maakt het plakken in één stap ongedaan.
3. Opgelost: een lege tekst gaf een fout bij het zoeken van het blok van de cursor.
4. Alleen met de hand: plakken uit de echte programma's (de documenten van Word en Google Docs zijn nagebouwd, dat van LibreOffice is een echte export).

### T14 Packaging, Docker en Compose (2026-10-27)

1. Gebouwd: `hypha.php` neemt `system/core/markdown/`, `system/mdeditor/` en `system/vendor/` mee (3 regels in `isAllowedFile()`); `index()` daalt nu eerst af in een map, want een submap van een toegestane map (zoals `system/mdeditor/vendor/`) werd als bestand gezien. Het image van `docs/container/Containerfile` neemt de nieuwe mappen vanzelf mee; `KeepAlive Off` in de vhost (zie T08). Compose is ongewijzigd.
2. Tests en uitkomsten: `sh tests/packaging/run.sh 8.2` en `8.4`: `hypha.php` gebouwd met zijn eigen build-opdracht (2,7 MB), geïnstalleerd in een lege map, alle bestanden van de editor aanwezig en de geïnstalleerde kopie zet Markdown om: 11 van 11 op beide versies. De images `hypha-md:php8.2` tot en met `php8.5` zijn met de nieuwe vhost gebouwd.
3. Bevinding in bestaande code: de installatie met `hypha.php` faalt zonder map `data/` en pakt het standaardthema niet in (`data/themes/default/`); de test maakt de map zelf. Niet opgelost (buiten deze issue).

### Stap 1: nieuwe pagina (2026-10-27)

1. Gebouwd: in `system/core/mdeditor.php` een script dat `newPage()` van `pages.php` omwikkelt: bij het type *artikel met review* vraagt de popup de titel, toont het webadres eronder, en vraagt eenmalig *Opmaak* of *Markdown* met „onthoud mijn keuze” (BR-25, besluit 22); andere types houden de paginanaam. `pages.php` zelf is niet gewijzigd.

### T15 Handleiding (2026-10-27)

1. Gebouwd: de twaalf ontbrekende pagina's van §17.4 in `docs/handleiding/` (gebruik 01, 02, 03, 06, 07, 08, 09; techniek 03 tot en met 07), geschreven door een subagent op B1 met Frontmatter en de Mermaid-diagrammen van de tabel; `index.md` bijgewerkt; `techniek/01-architectuur.md` beschrijft nu de trait in plaats van een apart paginatype.
2. Tests en uitkomsten: alle 26 Mermaid-blokken tekenen met Pele 1.10.1 (controle van de subagent, met een opzettelijk kapot blok als tegenproef); eigen controle: 17 pagina's, alle met Frontmatter, geen ongenummerde lijsten buiten codeblokken, alle relatieve links bestaan.
3. Bevindingen van de subagent voor later: het standaardthema heeft geen opmaak voor kaders, plaatsing van figuren, codekleuren en de diagramkleuren in de leesweergave; een paar knoppen van Hypha hebben geen Nederlandse tekst („reincarnate”, „theme”).

### Review van de editor (T08, 2026-10-27)

1. Een subagent beoordeelde de JavaScript met eigen proeven in de browser. Verwerkt:
   1. **kritiek**: de editor startte niet bij een tweede bezoek: `HTMLDocument` sorteert `<head>`, waardoor de import map na de module kwam; zodra de modules in de cache staan, faalt het laden. Import map en start staan nu in de body. Ook de time-outs bij de toegankelijkheidstest kwamen hiervandaan;
   2. **dataverlies**: tekst die tijdens het opslaan werd getypt, gold als opgeslagen (het concept werd gewist); nu geldt alleen wat is verstuurd als opgeslagen;
   3. **dataverlies**: met kapotte Frontmatter bouwde wisselen de Markdown opnieuw op uit de oude waarden; nu weigert de editor wisselen en opslaan tot de vaste velden kloppen, met een melding;
   4. een weggehaalde vaste eigenschap wordt nu leeg; een ingevoegd blok krijgt altijd een witregel ervoor en erna (anders werd `---` onder een alinea een kop); een nieuwe tabel in Markdown zet de cursor in de eerste kopcel; Tab in de laatste cel van een tabel in Opmaak voegt een rij toe; id's van de editor in de HTML van een auteur worden in het voorbeeld weggehaald; de link *Naar de tekst* wijst naar de actieve weergave; *bovenaan* alleen bij artikelen; *ongedaan maken* werkt ook in Markdown; *Naast elkaar* vanaf 1024 pt.
2. Niet verwerkt (open punten): de samenvatting van een dichtgevouwen blok blijft leeg; de werkbalkknop heet niet *Beeld bewerken* of *Diagram bewerken* als de cursor in een foto of diagram staat; een webadres plakken over geselecteerde tekst maakt nog geen link; de titel van een kader wordt in Opmaak met een invoervenster gevraagd in plaats van geselecteerd; geen werkbalk boven het schermtoetsenbord via `visualViewport`; het diagram in het voorbeeld heeft geen `role="img"`; de `srcdoc` van een interactief blok in het voorbeeld heeft geen CSP; het voorbeeld laat op niveau 1 ook HTML zien die de server weghaalt.
3. Tests na de herstelling, op PHP 8.4 in de container: editor 14 van 14 (nieuw: drie keer opnieuw openen met de cache warm, en kapotte Frontmatter), toegankelijkheid 11 van 11 (axe-core 4.10.2: 0 overtredingen in 9 toestanden; aanraakvlakken ≥ 44 pt op 393 pt breed, geen horizontaal scrollen), plakken 9 van 9, nieuwe pagina 4 van 4.

### T11 Gouden dataset en integratietests (2026-10-27)

1. Gebouwd: `tests/gouden/gouden.php` (generator, vaste seed per item, zodat elk deel los te maken is: 6.000 Markdown-artikelen, 1.000 Markdown-tekstpagina's met drie versies, 2.000 oude HTML-artikelen en 1.000 oude tekstpagina's zoals WYMeditor ze maakt, alle statussen, en per honderd een randgeval: 20.000 woorden, lege velden, onbekende tag, Unicode en emoji, `-->` in een diagram, kapotte notatie, een CDATA-aanval), `tests/gouden/maak.php` (manifest of `data/`-map), `tests/gouden/manifest.tsv` (SHA-256 van de verwachte XHTML per veld, in git), `tests/markdown/GoudenTest.php` en `tests/integratie/gouden.sh` en `gouden.py`.
2. Tests en uitkomsten:
   1. manifest: 500 van 500 op PHP 8.2.35 en 8.4.27 (snelle selectie), 10.000 van 10.000 op 8.4.27 (dezelfde uitkomst als de generator op 8.2: de XHTML is gelijk over de versies);
   2. integratie op de hele set (10.000 pagina's anoniem, 500 als lid, 500 bewerkschermen): 0 fouten op PHP 8.2 en 8.4, geen nieuwe PHP-meldingen; mediaan 43 en 45 ms per pagina, langzaamste 1,7 s (het artikel van 20.000 woorden); `hypha.xml` met 10.000 pagina's.
3. Het manifest is gemaakt met de code van nu; de uitkomsten zijn steekproefsgewijs nagekeken, niet alle 10.000.

### T12 Prestaties en Lighthouse (2026-10-27)

1. Gebouwd: `lezer.css` en `hypha_mdeditorReader()` voor de leesweergave van Markdown-pagina's (`lang`, `meta description`, opmaak van kaders, figuren, diagrammen, formules en code, `role="main"`, namen voor de deelknoppen); in de editor: CodeMirror pas laden bij de Markdown-weergave, hoogte vooraf reserveren (geen verspringen), de dubbele tagkeuze van Hypha weg uit het bewerkscherm.
2. Uitkomsten (`tests/browser/e2e/prestaties.mjs`, Chrome op de ontwikkelmachine, PHP 8.4 in de container, artikel van 19.636 woorden):
   1. typen (eis 1, 100 ms): Opmaak mediaan 25,9 / p95 33 / hoogste 44,9 ms; Markdown 25,5 / 32,7 / 33,8 ms; met *Naast elkaar* 25,8 / 33,8 / 34,6 ms (500 aanslagen elk);
   2. bewaren (eis 2, 1 s): 138 ms, waarvan 106 ms op de server; een gewoon artikel 139 ms;
   3. editor de tweede keer openen (eis 4, 3 s): 155 tot 173 ms (tien keer);
   4. plakken van tien pagina's (eis 5, 1 s): 84 ms (T09);
   5. leesweergave via wifi op een iPhone 16 (eis 3, 250 ms): niet te meten zonder toestel; Lighthouse-LCP op de computer 0,5 s (desktop-preset);
   6. Lighthouse 13.4.1, gepubliceerd artikel, standaardthema, anoniem: telefoon 96 / 94 / 100 / 91, computer 100 / 94 / 100 / 91 (prestaties, toegankelijkheid, goede werkwijzen, SEO). Wat ontbreekt: het contrast van de rode links en grijze knoppen van het thema, de kopvolgorde h1 → h3 (bewust, §13.15) en een `robots.txt` van de site;
   7. met het advies van het ontwerp in een kopie van het thema (links `#0B7285`, knoppen `#5F656A`): telefoon 97 / 98 / 100 / 91, computer 100 / 98 / 100 / 91; met een `robots.txt` (alleen tijdelijk in de proef) wordt SEO 100;
   8. Lighthouse op de editor (ingelogd, zonder SEO): computer 96 / 95 / 100, telefoon 69 / 95 / 100. Op de telefoon rekent Lighthouse met traag 4G: de ruim 400 kB code van de editor haalt 95 daar niet. De eis „95 voor de editor” is op de telefoon dus niet gehaald.
3. Gevonden in de testopstelling: een reeks ontbrekende afbeeldingen (404-pagina's van Hypha) houdt de twee Apache-werkers bezet en vertraagt de volgende pagina met seconden; voor de meting is de voorbeeldfoto uit het lange artikel gehaald.

### Verder gebouwd (2026-10-27, avond)

Na het eindverslag, op verzoek „bouw verder”:

1. **Punten uit de review van de editor**: samenvatting van dichtgevouwen blokken; *Beeld bewerken…* en *Diagram bewerken…* in de werkbalk als de cursor erin staat; een webadres geplakt over geselecteerde tekst wordt een link (beide weergaven); de titel van een kader is een veld in Opmaak, geselecteerd na invoegen (geen `prompt()` meer); diagrammen in het voorbeeld als één afbeelding (`role="img"`, `aria-label`); het voorbeeld van een interactief blok met dezelfde Content-Security-Policy als de server, en een `srcdoc` van de auteur valt weg zoals in HyphaFilter; op niveau 1 geen iframes in het voorbeeld. Gevonden en hersteld: een nieuw kader zonder selectie gaf een `RangeError` (twee transacties door elkaar).
2. **Dialoog van het interactieve blok** (ontwerp 9c): code links, het werkende blok rechts met sandbox en CSP, verplichte beschrijving, hoogte; via het /-menu (niveau 2) en de knop *bewerken* in Opmaak. Verwijderen in de dialoog haalt de beschrijving mee weg (ook bij diagrammen).
3. **Werkbalk boven het schermtoetsenbord** op de telefoon met `visualViewport` (§12.12); getest met een nagebootst toetsenbord.
4. **Documentatie**: `docs/technical/DATA_MODEL.md` (`format="markdown"`, `source`, `mdeditor`, ACID), `docs/functional/PAGE_TYPES.md`, `ADMINISTRATION.md`; regel in `ai/DOCUMENTATION_LOG.md` gesloten.
5. **Schermafdrukken in de handleiding**: 38 stuks van de verzonnen proefsite, ook van de delen van Hypha die niet veranderd zijn, met `tests/browser/schermafdrukken.sh`. Op verzoek in het thema van De Stadsbron: alleen de themamap en `data/css` uit een lokale sitemap (`HYPHA_THEME`), zonder de bestanden van het thema en zonder het statistiekscript; de browser kan alleen de proefsite bereiken. Het thema staat niet in git.
6. **De editor in een smal thema** (gevonden met de schermafdrukken): Fork Awesome zit nu bij de editor (het thema van De Stadsbron laadt het niet; zonder die letter waren alle knoppen leeg); de indeling volgt de breedte van de editor (container queries); de balk *Bewerken als* plakt op de echte hoogte van de werkbalk; *naast elkaar* alleen als er ruimte is; het tekstvak van de diagramdialoog heeft zijn maat; het /-menu had geen opmaak (css-klassen klopten niet met de code), stond verkeerd als de pagina gescrold was en opent nu boven de cursor als er onder geen ruimte is.
7. **Unicode** (controle door een subagent, `docs/handleiding/techniek/08-unicode.md`, `docs/technical/UNICODE.md`): in de editor hersteld: `dir`, `lang`, `<bdi>` en `<bdo>` door het filter; slug zonder intl gelijk aan de browser (volledige tabel van Latijnse letters); `[[link]]` met harde spatie; titel, rubriek, auteur en tags in NFC; titelteller in grafeemclusters; woorden met losse accenten en CJK; hoofdletters van paginanamen zoals de server; ongeldige UTF-8 in `md_fields`; meta-beschrijving op een grafeemgrens. Bewust niet: een titel in een ander schrift geeft `pagina` (paginanamen buiten ASCII werken niet in Hypha, #541, #543).
8. **Capaciteit** (meting door een subagent, `06-beheer.md` *Specificaties en capaciteit*, `OPERATIONS.md`): schijf, CPU per verzoek, geheugen per werker en doorvoer bij 100 tot 50.000 pagina's en tot 10.000 leden.
9. **Gouden dataset als site op 8.3 en 8.5**: 10.000 pagina's, 0 fouten (mediaan 44 en 45 ms).



### Wat klaar en getest is

Alle tests zijn opnieuw gedraaid op PHP 8.2.35, 8.3.36, 8.4.27 en 8.5.12 (`sh tests/run.sh <versie> browser`, `sh tests/packaging/run.sh <versie>`, `HYPHA_GOUDEN=alle`), in containers op deze machine, met Chrome headless voor de browser.

| Onderdeel | 8.2 | 8.3 | 8.4 | 8.5 |
|---|---|---|---|---|
| `HyphaRequestTest.php` (bestaand) | 84 | 84 | 84 | 84 |
| unit (`tests/markdown/`): filter, Markdown, niveau 2, 500 gouden items | 102 van 102 | 102 van 102 | 102 van 102 | 102 van 102 |
| gouden manifest, alle 10.000 items | 10.000 | 10.000 | 10.000 | 10.000 |
| integratie over HTTP: proefsite, artikel en reviewstroom, tekstpagina | 38 van 38 | 38 van 38 | 38 van 38 | 38 van 38 |
| browser: unit-pagina's en end-to-end (zie hieronder) | 155 van 155 | 155 van 155 | 155 van 155 | 155 van 155 |
| packaging: `hypha.php` bouwen en installeren | 11 van 11 | 11 van 11 | 11 van 11 | 11 van 11 |
| gouden dataset als site, 10.000 pagina's | 0 fouten | 0 fouten | 0 fouten | 0 fouten |
| nieuwe PHP-meldingen in het logboek | geen | geen | geen | geen (na `mail()`, zie hieronder) |

De browsertests: bibliotheken 7, pariteit met league/commonmark 19, Opmaak heen en terug 42, plaktest 28, editor 14, aanvullingen 12, plakken in de editor 9, nieuwe pagina 4, toegankelijkheid 13 (axe 0 overtredingen in 10 toestanden, aanraakvlakken ≥ 44 pt, werkbalk boven het toetsenbord), prestaties 6; samen 155 (inclusief de runner-proef). Laatste ronde op alle vier versies na de avondwijzigingen (zie „Verder gebouwd”).

Gebouwd volgens het ontwerp, per onderdeel van §18.2: 4 (server en filter), 5 (Markdown-weergave op CodeMirror 6), 6 (Opmaak op ProseMirror met eigen schema en serializer, verliesvrij wisselen), 7, 7a, 7b, 7c (artikelscherm, vaste velden, cursor bij wisselen, tabellen), 8 (beelddialoog met upload, `[[`-suggesties), 9 (diagrammen met 36 sjablonen), 9a–9e (niveau 1 en 2, HedgeDoc, interactief blok in de server, reviewstroom met redactiestatuut, terugtrekken), 10 (import en export van `.md`), 11 (regressie met oude artikelen en tekstpagina's), 12 (WCAG met axe, HIG-aanraakvlakken, teksten in nl en en), 13 en 19 (`hypha.php`, Docker), 14 en 15 (codemarkering en wiskunde), 16 (handleiding, 17 pagina's), 17 en 18 (gouden dataset, unit- en integratietests), 20 (plakken), 21 (prestaties en Lighthouse), 22 (tekstpagina's met versies, vertalen en terugzetten).

### Wat niet af is, en waarom

1. **Lighthouse ≥ 95 overal**: een gepubliceerd artikel haalt met het standaardthema 96–100 / 94 / 100 / 91; met het advies `#0B7285` voor links (en `#5F656A` voor knoppen) en een `robots.txt` van de site 97–100 / 98 / 100 / 100. Beide zijn keuzes van het thema en de site, niet van de editor (standaardkeuze a). De editor op de telefoon haalt 69 voor prestaties (traag 4G met ruim 400 kB code); op de computer 96.
2. Punten 2 tot en met 5 van de eerste versie van deze lijst (interactief blok, reviewpunten, gouden site op 8.3 en 8.5, documentatie) zijn af; zie „Verder gebouwd”.
3. **Twee schrijvers tegelijk**: de laatste die opslaat, wint, zonder waarschuwing (geen versiecontrole); zie de ACID-tabel in `docs/technical/DATA_MODEL.md`. Een subagent onderzoekt gelijktijdig werken en de oude paginatypes; de uitkomst volgt.
4. **Bestaande problemen gevonden, niet opgelost** (buiten deze issue): `hypha.php` installeert niet zonder map `data/` en pakt het standaardthema niet in; een nieuw artikel via de oude popup zonder titel gaf een fatale fout (nu opgelost door de titel als tekst te schrijven); `strftime()` en enkele HTML-fouten in de sjablonen van Hypha (`bekende-meldingen.txt`); op PHP 8.5 meldt `mail()` een fout als de container geen sendmail heeft.

### Gemelde fouten buiten deze issue

Fouten in bestaande code die bij de bouw zijn gevonden, staan als issue met een pull request op PlanBCode/hypha (elk op een eigen branch vanaf `main`, nagebootst op `main` en verholpen met de wijziging, in de container op PHP 8.2):

1. #525 / PR #531: de titel van een artikel komt als HTML in de kop van de pagina, en een nieuw artikel zonder titel geeft een fatale fout;
2. #526 / PR #532: `hypha.php` pakt submappen, `system/assets`, `system/bowser`, `system/macros` en het standaardthema niet in, en installeert niet zonder `data/`;
3. #527 / PR #533: ongeldige HTML in vier sjablonen geeft op bijna elke pagina een PHP-waarschuwing;
4. #528 / PR #534: een vertaling in dezelfde seconde krijgt dezelfde `xml:id`;
5. #529 / PR #535: elk lid kan een goedgekeurd artikel publiceren door de opdracht te posten;
6. #530 / PR #536: een onbekend versienummer geeft een fatale fout;
7. #537 / PR #538: een nieuwe festivalpagina opent op „Page not found”;
8. #546 / PR #547: het label van de festivalbeschrijving ontbreekt;
9. #539 / PR #540: een stuurteken of ongeldige UTF-8 in een reactie of naam maakt een artikel of de hele site onleesbaar;
10. #541 / PR #542: het pad van een verzoek wordt niet ontcijferd (pagina's buiten ASCII geven 404);
11. #543: `validatePagename()` laat letters buiten ASCII weg (geen pull request: hangt af van #541 en #516);
12. #544 / PR #545: een lang onderwerp van een e-mail wordt één te lang gecodeerd woord.
13. #548–#559 met PR #562–#568: twaalf fouten in de oudere paginatypes (festival, mailinglijst, index, tagindex, instellingen), gevonden door een subagent die elk scherm als bezoeker, lid en beheerder doorliep op PHP 8.2, 8.4 en 8.5; onder andere een fatale fout bij aanmelden voor een festival (#548), HTML uit aanmeldingen in het programma (#549), een eindeloze doorverwijzing bij een ongeldige link van de mailinglijst (#551), niet-unieke gebruikersnamen (#554) en ontbrekende vertalingen (#557). Overzicht in `ai/reference/GITHUB_ISSUES_FILED_2026W44.md`.

Alle issues hebben passende labels (type, niveau, impact, paginatype, onderdeel, waarde); de pull requests het label *Status: Needs review*.

Al eerder gemeld en daarom niet opnieuw: CSRF-controle stopt datatype-opdrachten niet (#420), stored XSS (#419), `strftime()` (#408), impliciet nullable parameters (#409), `${var}` (#407), `//featured_image` (#406). De branch `issue520-bouw` zelf is niet gepusht.

### Wat alleen met de hand kan

1. Een echte **iPhone en iPad**: autocorrectie, woordsuggesties, dicteren en de vergrootloep in CodeMirror 6 en ProseMirror (het grootste risico, §13.16), de leesweergave binnen 250 ms via wifi op een iPhone 16, en Safari in het algemeen (alle tests hier draaiden in Chrome).
2. **Echte klembord-HTML** uit Word (Windows en macOS) en Google Docs: de testdocumenten zijn nagebouwd; alleen LibreOffice is een echte export. Ook de vorm van een formule uit Google Docs.
3. **VoiceOver en NVDA** met beide weergaven; axe vindt niet alles.
4. Een **gebruikerstest** met twee à drie auteurs.
5. De **e-mail** bij statuswijzigingen met een echte mailserver.

## Afwijkingen

Bewuste afwijkingen van het ontwerp, met de reden. Het ontwerp is op deze punten bijgewerkt (§22).

1. **Enkele tilde is subscript, niet doorhalen.** GFM 0.29 kent `~tekst~` als doorhalen; HedgeDoc als subscript (§10.2). Het ontwerp kiest beide. Gebouwd: `~~tekst~~` is doorhalen, `~tekst~` (zonder spatie erin) subscript, zoals markdown-it met de sub-plug-in. Ontwerp §10 bijgewerkt.
2. **Plaatsing `{.klasse}` met een eigen kleine parser**, niet met de Attributes-extensie van league/commonmark (§13.4.2, punt 5). Die extensie kent ook blokattributen op een eigen regel, die markdown-it niet zo kent; met een eigen parser alleen direct achter een afbeelding of op de regel van een codeblok zijn server en browser gelijk.
3. **Kop-id's beginnen met `kop-`** (`kop-de-eerste-zetels`), omdat Hypha elementen als `main` en `menu` op id zoekt en een tussenkop „Menu” anders botst.
4. **`system/vendor/` is 2,7 MB** in plaats van de geschatte 1,3 MB (§13.12): vooral league/commonmark zelf (1,4 MB met alle extensies).
5. **Temml 0.14.0** zoals in het prototype; highlight.php kent HTML als `xml`, dus tien talen met negen definities.
6. **Ingesloten inhoud krijgt `sandbox="allow-scripts allow-same-origin allow-popups allow-presentation"`**: de spelers van YouTube en Vimeo werken niet zonder hun eigen herkomst. Een `<iframe>` mag alleen naar het pad van de speler van een dienst (§13.5 noemde alleen de host).
7. **De afbeelding bij het uittreksel staat onder de wortel** (`hypha/featured_image`), niet in `article/context` (§14.1): daar leest en schrijft de bestaande code haar.
8. **Doorschakelen in `process()`** in plaats van in `editView()` en `editAction()` (§13.13): de nieuwe opdrachten (terugtrekken, goedkeuren met redactiestatuut, taal, webadres) hebben eigen routes, en zo blijft het bij één regel. In totaal raken de wijzigingen 27 regels van `peer_reviewed_article.php`, 2 van `pages.php` en 1 van `index.php` (het ontwerp schatte zes regels en geen wijziging in `index.php`).
9. **Een tekstpagina houdt haar paginanaam als titel** (§9: „de paginanaam zoals Hypha hem toont”); het webadres uit de titel (kleine letters, koppeltekens) geldt alleen voor artikelen. Anders zou het menu „over-ons” tonen in plaats van „Over ons”.
10. **Goedkeuren met het redactiestatuut gebeurt in de leesweergave**, waar beoordelaars nu ook goedkeuren, in een venster; de editor toont de status en de knop *trek terug*.
11. **De bron van een tekstpagina staat in `source/language[@id]/version[@at]`**, niet met `xml:id` zoals de inhoud: een `xml:id` moet uniek zijn in het document, en de versie van de bron heeft hetzelfde tijdstip als die van de inhoud. Opslaan gebeurt met een eigen kleine functie in plaats van `storeWikiContent()` (de terugvaloptie van §19).
12. **Een `.md`-bestand openen in de popup van stap 1** is niet gebouwd; openen en slepen kan in de werkbalk van de editor, direct na het aanmaken.
13. **Fork Awesome zit bij de editor** (`system/mdeditor/vendor/fork-awesome-1.2.0.*`, uit het standaardthema), want niet elk thema laadt het (§2 nam aan dat het thema van De Stadsbron dat doet).
14. **Naast elkaar alleen met ruimte**: ook de kolom van het thema moet minstens 900 px breed zijn; in het thema van De Stadsbron (720 px) toont de knop het voorbeeld.
15. **Een titel of kop in een ander schrift dan Latijn** geeft het adres `pagina` en het anker `kop-zonder-naam`, zolang paginanamen buiten ASCII in Hypha niet werken.
