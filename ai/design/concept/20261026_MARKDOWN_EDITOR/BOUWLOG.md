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

## Afwijkingen

Nog geen.
