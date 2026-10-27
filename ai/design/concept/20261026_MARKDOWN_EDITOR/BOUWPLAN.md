---
title: "Bouwplan van de Markdown-editor (issue #520)"
revision: 1
date_created: 2026-10-27
date_last_review:
---

# Bouwplan van de Markdown-editor

Dit plan zet de 22 onderdelen van de begroting ([§18.2 van het ontwerp](../20261026_MARKDOWN_EDITOR.md#182-begroting)) om in taken, in een volgorde die de afhankelijkheden volgt. Onderdeel 1 (functioneel ontwerp) en 2 (technisch ontwerp met proeven) zijn klaar op branch `issue520-ontwerp`; onderdeel 3 (technisch prototype) valt samen met de eerste bouwtaken, want de proeven en het klikbare prototype zijn de referentie. Wat er per taak is gebeurd, staat in [BOUWLOG.md](BOUWLOG.md).

Werkwijze:

1. elke werksessie, en elke keer na een samenvatting van het gesprek, begint met dit plan, het logboek en `git log`; het werk gaat verder bij de eerste taak die niet klaar is;
2. een taak is klaar als haar tests slagen op PHP 8.2 en 8.4; aan het eind draait alles op 8.2 tot en met 8.5;
3. na elke taak één commit op `issue520-bouw` met plan, logboek en code samen; er wordt niets gepusht;
4. bij elke grotere taak beoordeelt een subagent de code op fouten en afwijkingen van het ontwerp;
5. alle testdata is verzonnen; er komt niets van een echte site in de repository.

## Taken

| # | Taak | Onderdelen (§18.2) | Hangt af van |
|---|---|---|---|
| T01 | Testopstelling | 18, 19 (deels) | – |
| T02 | Server: Markdown naar XHTML en het filter | 4, 9a (server), 14, 15 (server) | T01 |
| T03 | Server: niveau 2 en HedgeDoc-notatie | 9a, 9b, 9c (server) | T02 |
| T04 | Opslag en datatypes: artikel met review | 7a (server), 9d, 9e, 11 | T02 |
| T05 | Opslag en datatypes: tekstpagina | 22, 11 | T04 |
| T06 | Bibliotheken voor de browser bundelen | 3, 5, 6 (vendor) | – |
| T07 | Gedeelde markdown-it-plug-ins, ProseMirror-schema en serializer | 6, 14, 15 (browser) | T06 |
| T08 | Editor: de interface van het prototype op CodeMirror en ProseMirror | 5, 7, 7a, 7b, 7c, 8, 9 | T04, T07 |
| T09 | Plakken uit Word, Google Docs en LibreOffice | 20 | T08 |
| T10 | Reviewstroom in de editor, import en export van `.md`, niveau 2 in de editor | 9c, 9d, 9e, 10 | T08 |
| T11 | Gouden dataset en integratietests | 17, 18 | T05, T08 |
| T12 | Prestaties en Lighthouse | 21 | T08, T11 |
| T13 | Toegankelijkheid en Apple HIG | 12 | T08 |
| T14 | Packaging: `hypha.php`, Docker en Compose | 13, 19 | T02, T06 |
| T15 | Handleiding | 16 | T08, T10 |
| T16 | Oplevering: alles opnieuw op 8.2 tot en met 8.5, eindverslag, ontwerp bijwerken | – | alle |

## T01 Testopstelling

1. Containers op PHP 8.2, 8.3, 8.4 en 8.5: de CLI-images (`php:8.x-cli`) voor unit tests en het image uit `docs/container/Containerfile` voor integratietests.
2. Een PHP-testrunner in de stijl van `tests/HyphaRequestTest.php` (zonder Composer en PHPUnit): `tests/markdown/run.php` met één regel per test en een eindtelling.
3. Browsertests op de ontwikkelmachine: headless Chromium (Playwright), axe-core en Lighthouse; testpagina's in gewoon JavaScript.
4. Eén opdracht per PHP-versie: `sh tests/run.sh 8.2`.

**Klaar als**: `sh tests/run.sh 8.2` en `sh tests/run.sh 8.4` draaien de (dan nog lege) PHP-suite en de bestaande `HyphaRequestTest.php` en melden de uitkomst; de browserrunner opent een testpagina en meldt het aantal geslaagde tests; `docs/technical/TESTING.md` beschrijft het.
**Tests**: de runner zelf, met één geslaagde en één bewust falende proeftest; `HyphaRequestTest.php` geeft „asserted 84 tests”.

## T02 Server: Markdown naar XHTML en het filter

1. `system/vendor/` met league/commonmark, masterminds/html5 en scrivo/highlight.php (tien talen), een classmap-autoloader en `LICENSES/`, gemaakt met Composer in een container (`system/vendor/bijwerken.sh`).
2. `system/core/markdown/`: `HyphaMarkdown` (omgeving met CommonMark, GFM, voetnoten, attributen) en de Hypha-uitbreidingen: kader en citaat, `[[Pagina]]`, `==…==`, `%% … %%`, figuur met bijschrift en plaatsing, diagram (SVG op SHA-256), formule (MathML op SHA-256), codemarkering.
3. `HyphaFilter` op masterminds/html5 met de allowlist per naamruimte en uitvoer als XHTML.
4. Laden pas als het nodig is (`hypha_markdownLoad()`), zodat een gewone pagina niets extra laadt.

**Klaar als**: Markdown met alle onderdelen van Hypha-Markdown 1.0 niveau 1 geeft welgevormde XHTML die in de XML van Hypha laadt.
**Tests**: de 25 aanvallen uit `proeven/vectors.php` (25 van 25), de 36 diagrammen door het filter (36 van 36 heel), `start.md` en `kenmerken.md` als XHTML zonder fout, een unit test per uitbreiding (slaagt en faalt), geen meldingen op PHP 8.2 en 8.4.

## T03 Server: niveau 2 en HedgeDoc-notatie

1. Ingesloten inhoud: een losse link naar een dienst van de lijst wordt een `<iframe>` met `sandbox`, `loading="lazy"`, `referrerpolicy` en titel; de lijst is instelbaar.
2. Interactief blok ` ```html interactief {hoogte=…} `: na het filter een `<iframe sandbox="allow-scripts" srcdoc="…">` met de beschrijving als titel; zonder beschrijving geweigerd (BR-07).
3. Niveau 2 per rol uit te zetten (BR-95): dan blijven de blokken als code staan.
4. HedgeDoc: `:::info … :::`, `[TOC]`, `++ins++`, `^sup^`, `~sub~`, afbeeldingsgrootte `=200x200`, `{%youtube id %}`.

**Klaar als**: elk element van §10.1 en §10.2 dat het ontwerp in niveau 1 of 2 noemt, geeft de beschreven XHTML.
**Tests**: per dienst één link, een onbekende host blijft een link, interactief blok met en zonder beschrijving, niveau 2 uit, elk HedgeDoc-element.

## T04 Opslag en datatypes: artikel met review

1. Trait `MarkdownArticle` in `system/core/markdown_article.php`; in `peer_reviewed_article.php` een `use`-regel, de doorschakeling in `editView()` en `editAction()`, en `format="markdown"` met een leeg `source`-element in `ensureStructure()`.
2. Opslaan in één vergrendelde schrijfactie: XHTML in de bestaande elementen, bron in `article/source` (CDATA), rubriek in `context/section`, de eigenschappen van de afbeelding als attributen, tags in `hypha.xml`, onbekende Frontmatter in `source/frontmatter`.
3. Paginanaam uit de titel (§13.14) bij een nieuw artikel; tip in de checklist als de titel flink veranderd is.
4. Reviewstroom: de auteur keurt niet goed (BR-44, BR-94, voor alle artikelen), goedkeuren met redactiestatuut en opmerking (BR-10, BR-67), terugtrekken naar schets door de auteur (BR-76, BR-85), terugtrekken van een gepubliceerd artikel met reden (BR-11, BR-73, BR-86), opnieuw bewerken (BR-78), taal wijzigen vóór publicatie (BR-77), alleen een beheerder maakt een tag (BR-98).
5. Rubrieken, redactiestatuut, lijst met diensten en niveau 2 per rol als instellingen van de site, met de verzonnen lijst uit het prototype als standaard.

**Klaar als**: een artikel is via HTTP te maken, op te slaan, te beoordelen, goed te keuren, te publiceren en terug te trekken; oude artikelen gaan ongewijzigd naar WYMeditor.
**Tests**: elke bedrijfsregel uit §15 met een geval dat slaagt en een dat faalt (PHP-unit tests op de traits met een tijdelijke `data/`-map), de paginanaam met de zeven testtitels, een integratietest van de hele stroom in de container.

## T05 Opslag en datatypes: tekstpagina

1. Trait `MarkdownPage` in `system/core/markdown_page.php`; in `text.php` een `use`-regel en de doorschakeling in bewerken, opslaan, vertalen en terugzetten.
2. De bron per taal en per versie in een eigen knooppunt `source`, met hetzelfde tijdstip als de versie van de inhoud; terugzetten zet beide terug.

**Klaar als**: een tekstpagina met Markdown-bron krijgt versies, verschillen, vertalingen en terugzetten zoals een gewone tekstpagina.
**Tests**: drie versies opslaan en elke versie van bron en XHTML terugvinden, terugzetten, vertalen, een oude tekstpagina ongewijzigd.

## T06 Bibliotheken voor de browser bundelen

1. `system/mdeditor/vendor/bundel.sh` bundelt met esbuild (alleen op de ontwikkelmachine) per bibliotheek één ES-module met de versie in de naam: CodeMirror 6 met Markdown, ProseMirror met prosemirror-markdown en prosemirror-tables, markdown-it met plug-ins, DOMPurify; Pele, Temml en highlight.js als hun eigen distributiebestand.
2. Licentieteksten in `system/mdeditor/vendor/LICENSES/`.

**Klaar als**: een testpagina laadt elke bundel via een import map zonder fout.
**Tests**: laadtest in headless Chromium; controle dat elke licentie MIT, BSD, ISC of Apache-2.0 is.

## T07 Gedeelde markdown-it-plug-ins, ProseMirror-schema en serializer

1. markdown-it-plug-ins voor alle Hypha-uitbreidingen (dezelfde als in T02 en T03), gebruikt door het voorbeeld en de Opmaak-weergave.
2. Een eigen ProseMirror-schema (tabellen, doorhalen, taken, voetnoten, kaders, figuur, diagram, formule, paginalink, blok „HTML (bewerk in Markdown)”) en een eigen serializer.
3. Pariteitstest met league/commonmark.

**Klaar als**: heen en terug door Opmaak verandert de bron niet, voor de drie proefteksten en een testset met alle syntaxis.
**Tests**: heen-en-terugtest (0 verschillen op `start.md`, `plaktest.md`, `kenmerken.md` en de testset), pariteitstest (0 verschillen na normaliseren op dezelfde teksten).

## T08 Editor: de interface van het prototype

1. `system/core/mdeditor.php`: het element `<mdeditor>`, de import map, de teksten uit `system/languages/` en het serveren van de bestanden met lange cache.
2. `system/mdeditor/`: de hele interface van het prototype (werkbalk op één regel met *Meer*, schakelaar Opmaak | Markdown, Schrijven | Voorbeeld | Naast elkaar met versleepbare scheiding, artikelkop, bijsluiter en bronnen, checklist, structuur, spiekbriefje, `/`-menu, `[[`-suggesties, tabellen, beeld- en diagramdialoog met 36 sjablonen, formules, code, cursor bij wisselen, concept in de browser), op CodeMirror 6 en ProseMirror.
3. Nieuwe pagina: titel in plaats van paginanaam, webadres eronder, keuze van de schrijfwijze met „onthoud mijn keuze”.

**Klaar als**: alle stappen 1 tot en met 9 van §8 zijn in een draaiende Hypha te doorlopen.
**Tests**: browsertests in headless Chromium: artikel schrijven in beide weergaven, wisselen zonder verschil, cursor op dezelfde plek, tabelmenu, beeld uploaden, diagram invoegen, opslaan en de XML vergelijken met de verwachte uitkomst.

## T09 Plakken

1. `plakken.js` uit het prototype als module, in de plakhaak van CodeMirror en in `transformPastedHTML` van ProseMirror; ⌘Z maakt het plakken in één stap ongedaan; plakken als platte tekst.

**Klaar als**: de plaktest van het prototype slaagt volledig en plakken in beide weergaven geeft dezelfde Markdown.
**Tests**: de plaktest (alle documenten en losse gevallen), plakken in de editor in beide weergaven via een nagebootste plak, tien pagina's binnen 1 seconde.

## T10 Reviewstroom in de editor, import en export, niveau 2

1. Statusbalk met deels gevuld rondje, venster *geef goedkeuring…* met redactiestatuut en opmerking, *trek terug* en *trek terug…* met reden, taalkeuze in de checklist.
2. Downloaden als `.md` en een `.md`-bestand openen of erheen slepen.
3. Interactief blok: dialoog met codevenster en voorbeeld; ingesloten inhoud in het voorbeeld.

**Klaar als**: de reviewstroom is in de browser te doorlopen met drie testgebruikers; een geëxporteerd `.md`-bestand opent weer zonder verschil.
**Tests**: browsertest van de stroom, export en import heen en terug.

## T11 Gouden dataset en integratietests

1. Generator met vaste seed (`tests/gouden/maak.php`) voor 10.000 verzonnen artikelen en tekstpagina's (6.000 Markdown-artikelen, 1.000 Markdown-tekstpagina's, 3.000 oude HTML-pagina's, alle statussen, randgevallen), als `data/`-map; manifest met per artikel de SHA-256 van de verwachte XHTML in git.
2. Integratietests in de container op PHP 8.2 tot en met 8.5: elke pagina anoniem en als lid, de reviewstroom via HTTP, regressie met oude HTML-artikelen, tijd en geheugen.

**Klaar als**: de manifestcontrole en de integratietests slagen op alle vier versies.
**Tests**: manifestcontrole (10.000 van 10.000), integratietest per versie zonder nieuwe PHP-meldingen in het logboek.

## T12 Prestaties en Lighthouse

1. Leespagina van een Markdown-artikel: `lang`, `meta description`, beelden met maten en `loading="lazy"`; scripts zo veel mogelijk met `defer`.
2. Metingen: typen (500 aanslagen), bewaren, editor openen (tweede keer), plakken, Lighthouse op telefoon en computer.

**Klaar als**: elke eis van §12.16 die op de ontwikkelmachine te meten is, is gehaald of met reden in het logboek gezet.
**Tests**: meetscript in headless Chromium en Lighthouse, met de uitkomsten in het logboek; Lighthouse met het standaardthema en het advies `#0B7285` voor de linkkleur.

## T13 Toegankelijkheid en Apple HIG

1. axe-core in alle toestanden van de editor (Markdown, Opmaak, checklist met *toon alles*, suggesties, beeld-, diagram-, goedkeurings- en hulpvenster).
2. Controle op aanraakvlakken van 44 pt, 320 px breed, toetsenbord, focus.

**Klaar als**: axe meldt 0 overtredingen in elke toestand.
**Tests**: axe-runner in headless Chromium; meting van de aanraakvlakken in touch-emulatie.

## T14 Packaging, Docker en Compose

1. `hypha.php` neemt `system/mdeditor`, `system/vendor` en `system/core/markdown` mee.
2. Image en Compose met de nieuwe editor op PHP 8.2 tot en met 8.5.

**Klaar als**: een site geïnstalleerd met de gebouwde `hypha.php` heeft een werkende editor; het image bouwt en draait op de vier versies.
**Tests**: `hypha.php` bouwen, uitpakken in een lege map en de rooktest; image bouwen en rooktest per versie.

## T15 Handleiding

1. Alle pagina's uit §17.4 in `docs/handleiding/`, met Frontmatter en Mermaid-diagrammen, taalniveau B1.

**Klaar als**: alle 17 pagina's bestaan en elk Mermaid-diagram tekent zonder fout.
**Tests**: controle op Frontmatter en links; elk Mermaid-blok door Pele.

## T16 Oplevering

1. Alle tests opnieuw op PHP 8.2, 8.3, 8.4 en 8.5 en in de browser.
2. Eindverslag in `BOUWLOG.md`: wat klaar en getest is, wat niet af is en waarom, wat alleen met de hand kan.
3. Ontwerp en handleiding bijwerken waar de bouw ze heeft veranderd; de afgeleide kopie in `~/t` bijwerken.

**Klaar als**: het eindverslag staat er en de uitkomsten zijn echte uitkomsten.
