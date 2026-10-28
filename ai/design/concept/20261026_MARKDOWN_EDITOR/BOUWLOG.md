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

### Naar 100%: e-mail, iPhone en de laatste merge (2026-10-28, middag)

1. **`main` gemerged** (a019475, met de fixes van #421, #440, #525, #527, #548 en #554). Twee conflicten: in `serveFile()` blijven de voorwaarde voor `Content-Range` van #573 en de CORS-kopregels van `main` allebei staan; in de paginakop van een artikel blijft de `(string)` van deze branch.
2. **E-mail via een echte SMTP-server.** `tests/integratie/sendmail.php` vervangt sendmail in de testcontainer en geeft elk bericht van `mail()` over SMTP door aan een server die `tests/integratie/test_mail.py` op de host draait. Getest: start beoordeling, derde goedkeuring, publiceren (elk lid één bericht, onderwerp in UTF-8 met de site ervoor, afzender van de site, HTML in UTF-8, regels binnen 998 tekens, volledige link) en terug naar schets.
   - Fout van Hypha gevonden en verholpen: het onderwerp en de tekst van een statusmail noemden de status bij zijn sleutel (`Status 'approved' voor …`); nu de naam in de taal van de site (`goedgekeurd`).
   - Eigen fout gevonden en verholpen: terug naar schets (BR-85) stuurde geen bericht, omdat de statusmail van Hypha de status schets overslaat. Nu krijgen de beoordelaars van wie de goedkeuring vervalt een eigen bericht.
   - Terugtrekken van een gepubliceerd artikel (BR-86) stuurt bewust geen mail; dat staat nu ook in een test.
3. **iPhone (iOS 27, Safari, simulator).** Autocorrectie en woordsuggesties werken in Opmaak (ProseMirror) en in Markdown (CodeMirror): „tset” wordt „test”, een getikte suggestie komt in de tekst, en het model klopt (de checklist telt de woorden, Markdown toont dezelfde tekst). Twee fouten gevonden en verholpen:
   - de regel met de cursor viel onder de vaste balk „Bewerken als”; ProseMirror en CodeMirror houden nu marges aan ter hoogte van de vaste balken, en de pagina krijgt dezelfde `scroll-padding` voor het scrollen door de browser zelf;
   - na wisselen naar Markdown met open toetsenbord stond de checklist in beeld in plaats van de cursor; de cursor komt nu na de focus in het midden van het venster.
   Nieuwe test op telefoonformaat: de cursor staat tussen de balk „Bewerken als” en de werkbalk, in Opmaak en na wisselen naar Markdown.
4. **Artikelkop zonder foto**: „foto kiezen” in plaats van „andere foto”, en geen „weghalen” zolang er geen foto is.
5. **Lighthouse op de telefoon** (editor, ingelogd, Lighthouse 13.4.1, telefoonprofiel met traag 4G, PHP 8.2): van 84–86 naar 94 voor prestaties, in drie metingen achter elkaar (toegankelijkheid 97, goede werkwijzen 100, CLS 0,004). Wat gedaan is:
   1. op de pagina van de editor laden jQuery, `help.js`, het afbeeldingsveld en `bowser` met `defer`: ze definiëren alleen functies voor later klikken; jQuery alleen hield de eerste weergave 1,4 s op. Het inline-script van `bowser.php` controleert nu eerst of `bowser` er al is. Test: `test_artikel.py`, en andere pagina's houden jQuery zoals het was;
   2. het standaardthema laadt Dosis met `font-display: swap`: de titel (het grootste element) wachtte op het lettertype.
   Geprobeerd en teruggedraaid: de css van de editor in de pagina zelf zetten. Dat gaf 95 én 88 in twee metingen, kost de cache en kan de volgorde van de css veranderen. Wat 95 nog tegenhoudt: de vijf stylesheets van Hypha, het thema en de editor in de kop.

### Ontwerpcontrole en wat daaruit gebouwd is (2026-10-28, nacht)

Een subagent legde het ontwerp punt voor punt naast de code en vond 20 gaten (verslag in de notitiemap van de sessie, `ontwerp-check/RAPPORT.md`). Gebouwd, elk met een test:

1. **Link in Opmaak** (stap 5): één linkvenster in beide weergaven, met de pagina's van de site (privé met `*`, *nieuwe pagina …*), de tekst van de link en *link weghalen*; ⌘K, de knop *Link* en `[[` in Opmaak openen het. Vervangt de `prompt()`.
2. **Alle blokken in Opmaak** (stap 3): de items van het `/`-menu als menu in Opmaak (subkop, genummerde lijst, voetnoot met het volgende nummer, code, scheidingslijn, waarschuwing, interactief blok); een lijstknop haalt een alinea weer uit de lijst; de knop blijft op de werkbalk.
3. **Plakken** (§12.15): wat niet overgenomen is, blijft in de checklist tot *gezien*; plaatjes die als data meekomen (Word, LibreOffice) worden geüpload in plaats van als kapotte naam achtergelaten; ⌘⇧V plakt platte tekst ook in Safari.
4. **Wat de server niet toont** (§10.1): `HyphaFilter` houdt bij wat het van de auteur weghaalt (`<script>`, `<macro>`, `onclick=` …) en de checklist meldt het na opslaan, net als een diagram zonder tekening; het vrijheidsniveau staat bij de feiten. Gecontroleerd dat de eigen markup van de editor geen meldingen geeft (2.000 gouden items: alleen de bewust kwaadaardige voorbeelden).
5. **Rood in de Markdown-weergave** (BR-46, BR-63): links naar een ontbrekende pagina en foute formules.
6. **Redactiestatuut in de checklist** tijdens de beoordeling, met „bevestigd door n van 3” (stap 8).
7. **Schrijfwijze onthouden** bij wisselen; **export** met de status in woorden, `gepubliceerd` en `:::`-kaders als `> [!info]` (§9, §10.2); **liggende telefoon** in het voorbeeld verkleind (stap 7); **naast elkaar** scrolt het voorbeeld mee (iPad, §18.2-7).
8. **Foto's** met `width`, `height` (uit het bestand) en `loading="lazy"` (§12.16-3); gouden manifest en pariteitsdata opnieuw gemaakt, en gecontroleerd dat zonder `loading` de oude manifest byte voor byte terugkomt. Grote foto's worden in de browser verkleind tot 2400 px voor de upload. HedgeDoc-code met regelnummers (`javascript=101`) krijgt kleuren.
9. **Teruggetrokken artikel** ook niet in de index, en geen nieuwe discussies of reacties (BR-86).
10. **JSON-LD `NewsArticle`** in de leesweergave van een gepubliceerd artikel (§12.10-2).
11. **Popup nieuwe pagina** toont het echte adres met `-2` (stap 1-2), via de opdracht `mdNewName`.
12. **Instellingenscherm** `/settings/editor` voor rubrieken, redactiestatuut, niveau 2 per rol en diensten (BR-47); twee regels in `settings.php`.
13. **Niveau hoort bij het artikel** (§10.1): een lid zonder niveau 2 kan een artikel met niveau-2-onderdelen bewerken zonder dat die verdwijnen, maar ze niet wijzigen.

Upstream: #577 (afronden bij het verkleinen van een upload, deel van #408), ook in deze branch. Niet gebouwd en waarom:

1. **Het opgemerkte tekstdeel markeren** bij een beoordelingsopmerking (stap 8-2): bestaat ook in de huidige Hypha niet, en vraagt een wijziging in de bestaande discussies (L).
2. **Opmerkingen bij vervallen goedkeuringen doorstrepen** (stap 8-4): de bestaande weergave van discussies kent geen koppeling naar de goedkeuring; vraagt een wijziging in bestaande code.
3. ~~**`<time datetime>` in de byline**~~: gebouwd op 28 oktober, zie „Datum als `<time>`”.
4. **Kaarten met miniatuur** in de popup (stap 1-3), **afkortingen** en **typografische aanhalingstekens** (optioneel), ~~**regelnummers** in code~~ (gebouwd op 28 oktober), **beheerderscontrole in `tags.php`** (BR-98, aanbevolen; de editor controleert het zelf al) en een omschrijving bij een nieuwe tag.
5. **Donkere modus en Dynamic Type** (HIG-aandachtspunten): het thema van de site is licht; een donkere editor in een lichte pagina zou vreemd staan.

### Datum als `<time>` (2026-10-28, ochtend)

1. Gebouwd volgens §12.10, punt 1, naast de bestaande code: na `defaultView()` zet `mdTimeInByline()` de spans met datum en tijd van een Markdown-artikel in een `<time datetime="…">`, binnen de bestaande `div.published_at`. Een thema dat die div opmaakt, ziet geen verschil. `peer_reviewed_article.php` is niet gewijzigd.
2. De melding bij een teruggetrokken artikel zet alleen de datum in `<time>`. De zin eromheen komt uit het taalbestand.
3. De `datetime` is gelijk aan `datePublished` in de JSON-LD.
4. Tests: `test_artikel.py` (de byline en de melding).

### Bekende fouten als tests (2026-10-28)

1. **Twee soorten tests.** Naast „moet werken” (`test`) is er nu „bekende fout” (`known_bug(N)` in PHP en Python, `knownBug(N)` in de browser). Zo'n test beschrijft het gedrag zoals het hoort, voor het open issue #N, en faalt op een bewering zolang de fout bestaat (`known #N`, de run blijft groen). Slaagt hij, dan meldt de runner `FIXED? #N` en faalt de run: het issue kan dicht en de test wordt een gewone test. Elke andere fout (een uitzondering, een mislukte login, een crash van de test zelf) is een echte `FAIL`.
2. **Register** `tests/bekend/fouten.ndjson`: één JSON-object per regel en per test (issue, runner, bestand, test, titel, sinds). `tests/bekend/register.py` controleert dat code en register overeenkomen, met `--github` ook dat elk issue nog open is. De bekende PHP-meldingen van main staan nu in `tests/bekend/meldingen.ndjson`, elk met het issue dat ze weghaalt (was `tests/integratie/bekende-meldingen.txt`).
3. **`sh tests/bekend.sh <versie> [ref]`** draait de tests tegen main (standaard, in een eigen worktree), tegen een PR-branch of tegen deze checkout (`.`), op een verzonnen site waarvan de mail in `data/mail.log` belandt.
4. **Inhoud**: 181 tests voor 80 van de 93 open bugs op GitHub (stand 28 oktober: alle open issues van het type Bug), geschreven door vijf subagents per gebied (beveiliging 20, inhoud 39, lijsten 44, pagina's 32, platform 45, plus 1 voor #579). Op main geven alle 181 `known` op PHP 8.2 en 8.5. Elke pull request met een fix maakt zijn eigen tests `FIXED?`; zes PR-branches op de oude basis van `dev` draaien niet op 8.2 en zijn getest door hun diff op main toe te passen.
5. **Niet als test**: #55 (geen code), #336 (Windows), #411 (belasting op een grote site), #64 (niet na te bootsen in Chrome), #263 (een reviewtaak), #309 (alleen Safari); en zeven die op main al werken: #109, #144, #180, #187, #233, #262, #365.
6. **Tegen deze branch** slaan om: delen van #406, #408, #420, #525, #571, #573, #575 en #578. De browsertests van WYMeditor horen bij main: in deze branch opent een nieuwe tekstpagina in de nieuwe editor.
7. **Onderweg gevonden, nog niet gemeld**: reacties modereren geeft op main een fatale fout (`Xml::document()`, `peer_reviewed_article.php:1024`); `document.php` mist twee keer een `@` in een XPath (dubbel csrfToken-veld); hernoemen van een mailinglijst naar een bestaande naam gebeurt stil niet; `mailinglist::ensureStructure()` schrijft bij elk verzoek; `festival-field-attending` ontbreekt in de taalbestanden; een vervalste `Host` gaf na een verzoek aan `hypha.php` een 500.

### Gouden dataset met alle constructies (2026-10-28)

1. `tests/gouden/gouden.php` kent nu elke constructie van de editor, ook die van HedgeDoc: 29 in de tekst (`GOUDEN_INLINE`, zoals `***beide***`, `++ingevoegd++`, `^sup^`, `~sub~`, `[[pagina|tekst]]`, `[[pagina#kop]]`, `%% notitie %%` in een zin, autolinks, harde regeleinden, escapes, entiteiten, `<bdi>`, `lang`, verwijzingslinks, „$10 tot $20” als geen formule) en 66 blokken (`GOUDEN_BLOCKS`, onder meer h2 en h4, setext, scheidingslijn, gewoon en genest citaat, ingesprongen code, `~~~`, lijsten met start en `)`, losse lijsten, definitielijsten, alle kadertypes met en zonder titel, HedgeDoc `:::info/success/danger/tip/note` ook genest, `[TOC]`, beeldmaten `=200x150` en `{width= height=}`, `{%youtube %}` en `{%vimeo %}`, alle ingesloten diensten en PeerTube, interactieve blokken met en zonder hoogte, regelnummers `=`, `=101`, `=+` en `!`, formule op één regel, voetnoot met naam, rtl, `<bdo>`, HTML-commentaar, tabellen).
2. `goudenUse()` legt per item vast welke constructies erin zitten. `GoudenTest.php` controleert dat de snelle selectie van 500 items ze allemaal bevat (de zeldzaamste komt 32 keer voor). Het gat „geen interactieve blokken” is daarmee dicht.
3. Het manifest is opnieuw gemaakt: 9.962 van de 10.000 items veranderen, omdat de nieuwe verdeling van `mt_rand` elk item anders samenstelt. Per constructie is de XHTML met de hand bekeken.
4. Gevonden: een kader `important` of `caution` zonder titel kreeg het Engelse type als `aria-label`; `mde-html-callout-important` en `-caution` toegevoegd en doorgegeven.
5. **Correctie**: `tests/run.sh` gaf `HYPHA_GOUDEN` niet door aan de container, zodat eerdere rondes met `HYPHA_GOUDEN=alle` toch maar 500 items controleerden. Hersteld (`-e HYPHA_GOUDEN`); nu alle 10.000 items gelijk aan het manifest op 8.2, 8.3, 8.4 en 8.5. De gouden dataset als site (`gouden.sh`) liep wel altijd over alle 10.000 pagina's: 0 fouten.

### Regelnummers in code (2026-10-28, ochtend)

1. Gebouwd volgens §10.2 en stap 14, zoals in HedgeDoc: met ```` ```javascript= ```` beginnen de nummers bij 1, met `=101` bij 101, en met `=+` gaan ze verder na het vorige genummerde blok. Zonder `=` krijgt een blok geen nummers.
2. Server en browser schrijven dezelfde HTML (`HyphaMarkdown::pre()` en `pre()` in `hypha-markdown.js`): `<pre class="code numbered">` met een `<span class="line-numbers" aria-hidden="true">` vóór de `<code>`. Een schermlezer leest de nummers niet voor, en de css (`lezer.css`, `mdeditor.css`) houdt ze buiten de selectie, zodat wie kopieert alleen de code krijgt. HyphaFilter laat daarvoor `aria-hidden` toe op `<span>`.
3. Tests: `MarkdownTest.php` (=, =101, =+, zonder =, leeg blok) en een pariteitsgeval `hedgedoc-line-numbers`. De gouden dataset heeft geen genummerde code, dus het manifest blijft gelijk.
4. Handleiding: `04-artikel-schrijven.md`, stap 4, punt 6.

### Hoogte van het interactieve blok (2026-10-28, nacht)

1. Gebouwd volgens §10.1, regel 2: een interactief blok zonder `{hoogte=…}` meldt zijn hoogte met `postMessage` (`HyphaMarkdown::REPORT_HEIGHT` in de `srcdoc`, het iframe krijgt `data-height="auto"`); `system/mdeditor/lezer.js` in de leesweergave en `followHeights()` in het voorbeeld en de dialoog luisteren alleen naar dat ene iframe en houden de hoogte tussen 50 en 4000 px. Met een vaste hoogte gebeurt er niets.
2. Tests: `Level2Test` (met en zonder hoogte), `aanvullingen.mjs` (voorbeeld en leesweergave passen zich aan een blok van 900 px aan). De gouden dataset heeft geen interactieve blokken; dat is een gat in de dekking.
3. Handleiding: uitleg over het interactieve blok in `04-artikel-schrijven.md`.
4. Beeldvenster: de gekozen foto staat nu in het uploadvak (meteen bij het kiezen, nog voor de upload klaar is), met „andere foto” eronder; de opmaak daarvoor stond al in het prototype, de code vulde het vak niet.
5. Schermafdrukken van de handleiding opnieuw gemaakt (plaatjes bij de plaatsing, *Meer* op de telefoon).

### Telefoon en http (2026-10-27, nacht)

1. **Lighthouse op de telefoon** (editor, ingelogd, traag 4G): van 69–77 naar 85–88 voor prestaties (toegankelijkheid 95, goede werkwijzen 100, CLS 0); op de computer 99 / 95 / 100. Wat gedaan is:
   1. **compressie**: `serveFile()` van Hypha stuurde altijd `Content-Range`, waardoor Apache thema-css en jQuery nooit comprimeerde (jQuery 94 → 33 kB, thema-css 20 → 4,9 kB); upstream #573 / PR #574, in deze branch opgenomen (Afwijkingen 17);
   2. **Fork Awesome** van de editor alleen als het thema het niet zelf laadt;
   3. **Pele, Temml en highlight.js** pas als de browser na het openen rust heeft; diagrammen en formules tonen tot dan hun bron.
   Wat niet lukte: css van de editor zonder blokkeren laden (gaf verspringen, CLS 0,3; teruggedraaid). Wat de 95 nog tegenhoudt: jQuery, `help.js`, `bowser` en de css van Hypha en het thema in de kop van elke pagina.
2. **Gevonden en hersteld**: na het laden van de bibliotheken werden diagrammen en formules in Opmaak niet opnieuw getekend (`redrawAtoms()` maakte een knooppunt met dezelfde eigenschappen, en ProseMirror roept dan `update()` niet aan); de weergaven melden zich nu aan in `this.atoms`. Op een trage verbinding bestond die fout al. Daarnaast vroegen tientallen diagrammen elk de bibliotheken aan en tekende elk verzoek alles opnieuw; nu één keer per bibliotheek.
3. **Over http geen artikel met diagram of formule op te slaan** (gevonden door de gebruiker op een iPhone via het LAN): `crypto.subtle` bestaat alleen op https of localhost. Nu een eigen SHA-256 als terugval (gelijk aan die van Node op lege, lange, emoji- en blokgrensteksten). Test: `aanvullingen.mjs`, opslaan zonder `crypto.subtle`.
4. **Oudere versies met `@@`** verloren tekst: upstream #571 / PR #572, in deze branch opgenomen (Afwijkingen 16).
5. **Bevindingen van de gebruiker op een iPhone** (LAN-instantie, 28 oktober 2026, nacht):
   1. de werkbalk stond ver boven het toetsenbord: iOS verandert `window.innerHeight` als Safari zijn balken verbergt; de plek wordt nu gemeten vanaf de bovenkant (`visualViewport.offsetTop + height`);
   2. de keuzes voor plaatsing (*breed*, *in de tekst*, …) hadden alleen een tooltip, die je op een aanraakscherm niet ziet: nu een plaatje per keuze (de lege `.pic` had geen opmaak) en een regel uitleg onder de keuzes;
   3. „tags” stond los van zijn veld aan het eind van een regel: een label blijft nu bij zijn veld;
   4. *textpage* en *mailinglist* onvertaald in het venster *nieuwe pagina*: bestaande code, upstream #575 / PR #576, in deze branch opgenomen.
   5. in het voorbeeld op de telefoon was er geen zichtbare weg terug naar schrijven (alleen een potloodje): in het voorbeeld verdwijnen de opmaakknoppen en staan *Schrijven* en *Voorbeeld* met hun woord;
   6. op de telefoon ontbraken link, beeld, diagram, formule, tabel en kader: knoppen die niet passen gaan naar *Meer*, maar dat menu was op de telefoon verborgen. Nu drie puntjes, het menu klapt omhoog open, en elke regel toont pictogram en beschrijving. Test: `toegankelijkheid.mjs`.

### Gelijktijdig werken (2026-10-27, avond)

Een subagent liet tot 32 verzoeken tegelijk los op een proefsite (Docker-volume, zodat `flock` werkt als op Linux) en opende hetzelfde artikel in twee tabbladen. Bron en XHTML liepen nooit uit elkaar en er was geen deadlock, maar in de editorcode zaten acht fouten. Hersteld:

1. **Verloren wijzigingen** (30 van 30 bij twee schrijvers): de editor stuurt de versie mee die hij opende (`article/@md_revision`, bij een tekstpagina het `at` van de nieuwste bronversie); de server weigert een opslag op een oudere versie en meldt wie en wanneer opsloeg; de auteur kiest *Toch opslaan*.
2. **Tags van een andere schrijver dan de tekst** (3 van 30): eerst de tekst, dan de tags, en alleen door de opslag waarvan de tekst bewaard is.
3. **HTTP 500 bij opslaan terwijl een ander hernoemt** (24 van 30): de pagina wordt na het herladen van `hypha.xml` op id gezocht, niet op naam; een editor die 404 krijgt, vraagt het nieuwe adres met de opdracht `mdLocate` en slaat daar op.
4. **Status vóór het slot gecontroleerd** (terugtrekken tegen publiceren gaf een publieke schets): terugtrekken, intrekken, opnieuw bewerken, hernoemen en taal wijzigen controleren de status opnieuw onder het slot; terugtrekken maakt het artikel weer privé en wist de publicatiedatum.
5. **Een opslag tijdens een opslag viel weg**: die volgt nu op de lopende; *start beoordeling*, taal en adres gaan niet door als opslaan mislukt.
6. **Eén concept voor alle tabbladen**: per pagina-id en per tabblad.
7. **Een concept op een oudere versie verdween zonder melding**: het wordt aangeboden, met een waarschuwing.
8. **Na hernoemen door een ander gaf elke opslag 404**: zie punt 3; het concept staat onder het pagina-id en blijft dus vindbaar.

Tests: `tests/integratie/test_gelijktijdig.py` (6) en `tests/browser/e2e/gelijktijdig.mjs` (5), groen op 8.2 tot en met 8.5. Op de macOS-bindmount ziet een container bij veel gelijktijdige `rename()` soms heel even geen bestand (`Cannot lock file …, open failed`); dat is een eigenschap van de testopzet (0 fouten op een tmpfs), staat in `bekende-meldingen.txt` en in `docs/technical/TESTING.md`, en een ronde met zo'n fout telt niet mee. Upstream gemeld: #560 / PR #561 (TypeError bij gelijktijdig hernoemen of verwijderen), #569 / PR #570 (statuswijziging vóór het slot gecontroleerd), en een opmerking bij #528 (dubbele `xml:id` bij drie opslagen in dezelfde seconde in WYMeditor). Documentatie: ACID in `03-opslag.md` en `DATA_MODEL.md` bijgewerkt, vraag in `04-artikel-schrijven.md`.

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
10. **Console van de browser** (controle door een subagent, als bezoeker, lid en beheerder, desktop en telefoon, met de Issues van Chrome): een geplakte afbeelding vroeg `beeld/geplakt-…` op vóór de upload klaar was (404), nu uit de geplakte data; het titelveld van een kader kreeg een id. Nieuwe test `tests/browser/e2e/console.mjs` faalt op elke fout, waarschuwing, `console.log`, 4xx/5xx en Issue in de hoofdstromen van de editor. De meldingen die uit `main` komen (tagkeuze, labels, autocomplete, `</select>` in de beeldupload van WYMeditor) zijn daar op eigen branches verholpen. De werkbalk op de telefoon bleef in Chrome 124 niet onderaan bij een gescrolde pagina: geen CSS-container meer op `.mdeditor`, maar de klassen `narrow` en `compact` uit `followWidth()`.



### Wat klaar en getest is

Alle tests zijn opnieuw gedraaid op PHP 8.2.35, 8.3.36, 8.4.27 en 8.5.12 (`sh tests/run.sh <versie> browser`, `sh tests/packaging/run.sh <versie>`, `HYPHA_GOUDEN=alle`), in containers op deze machine, met Chrome headless voor de browser.

| Onderdeel | 8.2 | 8.3 | 8.4 | 8.5 |
|---|---|---|---|---|
| `HyphaRequestTest.php` (bestaand) | 84 | 84 | 84 | 84 |
| unit (`tests/markdown/`): filter, Markdown, niveau 2, 500 gouden items | 105 van 105 | 105 van 105 | 105 van 105 | 105 van 105 |
| gouden manifest, alle 10.000 items | 10.000 | 10.000 | 10.000 | 10.000 |
| integratie over HTTP: proefsite, artikel en reviewstroom, tekstpagina, gelijktijdig werken, instellingen | 51 van 51 | 51 van 51 | 51 van 51 | 51 van 51 |
| browser: unit-pagina's en end-to-end (zie hieronder) | 181 van 181 | 181 van 181 | 181 van 181 | 181 van 181 |
| packaging: `hypha.php` bouwen en installeren | 11 van 11 | 11 van 11 | 11 van 11 | 11 van 11 |
| gouden dataset als site, 10.000 pagina's | 0 fouten | 0 fouten | 0 fouten | 0 fouten |
| nieuwe PHP-meldingen in het logboek | geen | geen | geen | geen (na `mail()`, zie hieronder) |

De browsertests: bibliotheken 7, pariteit met league/commonmark 19, Opmaak heen en terug 42, plaktest 28, editor 14, aanvullingen 14, gelijktijdig 5, ontwerp 18, plakken in de editor 9, nieuwe pagina 4, toegankelijkheid 14 (axe 0 overtredingen in 10 toestanden, aanraakvlakken ≥ 44 pt, werkbalk boven het toetsenbord), prestaties 6; samen 181 (inclusief de runner-proef). Laatste ronde op alle vier versies na de avondwijzigingen (zie „Verder gebouwd”).

Gebouwd volgens het ontwerp, per onderdeel van §18.2: 4 (server en filter), 5 (Markdown-weergave op CodeMirror 6), 6 (Opmaak op ProseMirror met eigen schema en serializer, verliesvrij wisselen), 7, 7a, 7b, 7c (artikelscherm, vaste velden, cursor bij wisselen, tabellen), 8 (beelddialoog met upload, `[[`-suggesties), 9 (diagrammen met 36 sjablonen), 9a–9e (niveau 1 en 2, HedgeDoc, interactief blok in de server, reviewstroom met redactiestatuut, terugtrekken), 10 (import en export van `.md`), 11 (regressie met oude artikelen en tekstpagina's), 12 (WCAG met axe, HIG-aanraakvlakken, teksten in nl en en), 13 en 19 (`hypha.php`, Docker), 14 en 15 (codemarkering en wiskunde), 16 (handleiding, 17 pagina's), 17 en 18 (gouden dataset, unit- en integratietests), 20 (plakken), 21 (prestaties en Lighthouse), 22 (tekstpagina's met versies, vertalen en terugzetten).

### Wat niet af is, en waarom

1. **Lighthouse ≥ 95 overal** (bijgewerkt 2026-10-28: de editor op de telefoon haalt nu 94, zie „Naar 100%”): een gepubliceerd artikel haalt met het standaardthema 96–100 / 94 / 100 / 91; met het advies `#0B7285` voor links (en `#5F656A` voor knoppen) en een `robots.txt` van de site 97–100 / 98 / 100 / 100. Beide zijn keuzes van het thema en de site, niet van de editor (standaardkeuze a). De editor op de telefoon haalt 69 voor prestaties (traag 4G met ruim 400 kB code); op de computer 96.
2. Punten 2 tot en met 5 van de eerste versie van deze lijst (interactief blok, reviewpunten, gouden site op 8.3 en 8.5, documentatie) zijn af; zie „Verder gebouwd”.
3. **Twee schrijvers tegelijk** in de oude editor en de andere schermen: daar wint nog de laatste die opslaat; de nieuwe editor waarschuwt (zie „Gelijktijdig werken”). Publiceren tegelijk met goedkeuren of terugtrekken hangt ook af van upstream #570 (`updateToNewStatus()` controleert vóór het slot).
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
13. #548–#559 met PR #562–#568: twaalf fouten in de oudere paginatypes (festival, mailinglijst, index, tagindex, instellingen), gevonden door een subagent die elk scherm als bezoeker, lid en beheerder doorliep op PHP 8.2, 8.4 en 8.5; onder andere een fatale fout bij aanmelden voor een festival (#548), HTML uit aanmeldingen in het programma (#549), een eindeloze doorverwijzing bij een ongeldige link van de mailinglijst (#551), niet-unieke gebruikersnamen (#554) en ontbrekende vertalingen (#557). Overzicht in `ai/reference/GITHUB_ISSUES_FILED_2026W44.md`;
14. #560 / PR #561 en #569 / PR #570: fouten bij gelijktijdig werken (zie „Gelijktijdig werken”);
15. #571 / PR #572: een oudere versie van een pagina verliest tekst met `@@` (ook in deze branch opgenomen, zie Afwijkingen 16);
16. #573 / PR #574: bestanden van Hypha en het thema werden nooit gecomprimeerd (ook in deze branch opgenomen, zie Afwijkingen 17);
17. #575 / PR #576: *textpage* en *mailinglist* onvertaald in het venster *nieuwe pagina* (ook in deze branch opgenomen, zie Afwijkingen 18).

Alle issues hebben passende labels (type, niveau, impact, paginatype, onderdeel, waarde); de pull requests het label *Status: Needs review*.

Al eerder gemeld en daarom niet opnieuw: CSRF-controle stopt datatype-opdrachten niet (#420), stored XSS (#419), `strftime()` (#408), impliciet nullable parameters (#409), `${var}` (#407), `//featured_image` (#406). De branch `issue520-bouw` zelf is niet gepusht.

### Wat alleen met de hand kan

1. Een echte **iPhone en iPad**: dicteren en de vergrootloep in CodeMirror 6 en ProseMirror, en de leesweergave binnen 250 ms via wifi op een iPhone 16. Autocorrectie en woordsuggesties in beide weergaven zijn in de simulator getest (iOS 27, Safari) en werken; zie „Naar 100%”. De simulator kan niet dicteren en meet geen echte snelheid.
2. **Echte klembord-HTML** uit Word (Windows en macOS) en Google Docs: de testdocumenten zijn nagebouwd; alleen LibreOffice is een echte export. Ook de vorm van een formule uit Google Docs.
3. **VoiceOver en NVDA** met beide weergaven; axe vindt niet alles.
4. Een **gebruikerstest** met twee à drie auteurs.
5. De **e-mail** bij statuswijzigingen bij een echte ontvanger: SPF, DKIM en spamfilters. Wat Hypha verstuurt, is over SMTP getest (`tests/integratie/test_mail.py`); de aflevering zelf hangt af van de mailserver van de site.

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
16. **`system/core/database.php` gewijzigd** (19 regels): `diff()` schrijft een `@` in ingevoegde tekst als `@@*`, zodat een oudere versie met `@@` in de tekst heel blijft, en leest niet meer voorbij het einde van de bron. Dezelfde wijziging als upstream PR #572 (issue #571); hier opgenomen omdat de Markdown-versies van tekstpagina's dezelfde diff gebruiken (een codeblok met een diff heeft `@@`). Oude diffs blijven leesbaar. Test: `an_older_version_with_at_signs_comes_back_whole`.
17. **`serveFile()` in `system/core/database.php`** stuurt `Content-Range` alleen nog bij een `Range`-verzoek, zodat Apache de bestanden van Hypha en het thema comprimeert (upstream #573 / PR #574).
18. **`getDatatypeName()` in `text.php` en `mailinglist.php`** en de Nederlandse naam *mailinglijst* (upstream #575 / PR #576), opgenomen omdat het venster *nieuwe pagina* deel is van stap 1 van de editor.
