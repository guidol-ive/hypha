---
title: "Proeven bij het technisch ontwerp van de Markdown-editor"
revision: 1
date_created: 2026-10-27
date_last_review:
---

# Proeven bij het technisch ontwerp

Deze map hoort bij het technisch ontwerp in [§13 van het ontwerp](../../20261026_MARKDOWN_EDITOR.md#13-technisch-ontwerp-proeven-en-keuzes). Alles draait op de ontwikkelmachine; niets ervan hoort op de server.

## Wat er staat

1. `proef-server.php`: de serverproeven (CommonMark en GFM, snelheid, XHTML, filter, YAML, codemarkering, bewaren), met `filter.php` (het filter uit §13.5) en `vectors.php` (de aanvallen);
2. `proef-paginanaam.php`: de paginanaam uit de titel (§13.14);
3. `league-corpus.php`: de voorbeeldartikelen door league/commonmark, voor de vergelijking met de browser;
4. `js/proef-parsers.mjs`: de parsers in de browser tegen de specificatie en tegen league/commonmark;
5. `js/maak-svg.mjs`: de 36 diagramsjablonen van het prototype als SVG en een paar formules als MathML;
6. `js/bundel.mjs` en `js/src/`: de kandidaten gebundeld met esbuild, zoals ze zouden worden meegeleverd;
7. `js/lezer.mjs` en `js/lezer.css`: de leespagina voor Lighthouse;
8. `browser/rt.html`, `rt2.html`, `rt3.html`: heen en terug door Milkdown, Milkdown met instellingen, en ProseMirror, plus typen in CodeMirror 6;
9. `data/`: de drie verzonnen proefteksten;
10. `uitkomsten/`: de uitkomsten als JSON.

## Opnieuw draaien

Nodig: Docker, Node.js en Google Chrome.

```bash
sh draai.sh hypha-combined:php8.2 hypha-lf:php8.4
```

Zonder argumenten gebruikt het script de officiële images `php:8.2-cli` en `php:8.4-cli`. De proeven in de browser draaien daarna met een eenvoudige webserver:

```bash
python3 -m http.server 8767 --bind 127.0.0.1
```

en dan `http://127.0.0.1:8767/browser/rt.html`. De vergelijking met Turndown draait op de plaktestpagina van het prototype; zie §13.9 van het ontwerp.
