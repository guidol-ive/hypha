---
title: "Thema's"
revision: 1
date_created: 2026-10-27
date_last_review:
---

# Thema's

Een **thema** bepaalt hoe de site eruitziet: de indeling van de pagina, de lettertypes en de kleuren. Deze pagina legt uit waar een thema staat, hoe een beheerder het kiest en aanpast, welke CSS-variabelen er zijn, en hoe je de kleuren van diagrammen instelt.

## Waar een thema staat

Elk thema is een map onder `data/themes/`. Hypha levert het thema `default` mee.

| Bestand | Inhoud |
|---|---|
| `hypha.html` | het **sjabloon**: de HTML van elke pagina, met lege elementen die Hypha invult |
| `hypha.css` | de **stijl** van de site |
| `fonts/`, `images/`, `css/` | lettertypes, afbeeldingen en extra stijlen van het thema |

Welk thema actief is, staat in `hypha.xml` in het attribuut `theme`.

## Het sjabloon

Hypha laadt `hypha.html` bij elk verzoek en vult de elementen met deze `id` in:

| `id` | Wat Hypha erin zet |
|---|---|
| `header`, `footer` | de kop en de voet uit **site elementen** |
| `menu` | het menu |
| `login` | de knop om in te loggen |
| `pagename` | de naam van de pagina |
| `langList` | de talen van de pagina |
| `pageCommands` | knoppen als **bewerken** en **vertalen** |
| `main` | de inhoud van de pagina |
| `tagList`, `versionList` | de tags en de lijst met versies |
| `hyphaNotify` | meldingen, zoals „Pagina succesvol bijgewerkt” |
| `popup` | vensters, zoals inloggen en nieuwe pagina |

Daarnaast vult Hypha elk element met de klasse `hyphaCommands` met de knoppen rechtsboven (index, inloggen, nieuwe pagina, instellingen).

> [!warning] Houd de id's
> Haal geen van deze elementen weg uit het sjabloon. Zonder `main` of `popup` werkt de site niet goed meer.

## Een thema kiezen en aanpassen

Alleen een **beheerder** kan dit. Het thema `default` kun je niet wijzigen; maak er eerst een kopie van.

1. Klik op **instellingen** en kies **theme**.
2. Kies onder **kopieer thema** het thema `default`, typ een **naam van nieuwe thema**, bijvoorbeeld `eemstad`, en kies **kopieer thema en activeer het**.
3. Kies in **instellingen** de knop **stijlen** om de CSS te wijzigen, of **markup** om het sjabloon te wijzigen. Kies **opslaan**.
4. Wil je een thema eerst bekijken? Kies het in de lijst en kies **preview theme**. Alleen jij ziet het. Met **activeer preview theme** maak je het voor iedereen actief; met **annuleer preview** ga je terug.

Een thema kun je ook als bestanden in `data/themes/‹naam›/` zetten, bijvoorbeeld met git of een kopie van een andere site.

## CSS-variabelen

Het standaardthema zet de kleuren en lettertypes als CSS-variabelen op `:root`, bovenaan `hypha.css`. Wie een eigen thema maakt, past vaak alleen deze variabelen aan.

| Variabele | Waarvoor |
|---|---|
| `--textfont`, `--headingsfont` | lettertype van de tekst en van de koppen |
| `--primarycolor`, `--secondarycolor` | de twee hoofdkleuren |
| `--textcolor`, `--headingscolor`, `--linkcolor`, `--linkhovercolor` | kleur van tekst, koppen en links |
| `--headerbackground`, `--headerforeground` | achtergrond en tekst van de kop |
| `--menubackground`, `--menuforeground`, `--menulinkhoverback`, `--menulinkactiveback` | het menu |
| `--pagecontainerbackgroundcolor`, `--sidebarbackgroundcolor` | achtergrond van de pagina en de zijbalk |
| `--formheaderback`, `--bordercolor` | formulieren en randen |

Een voorbeeld voor een eigen thema:

```css
:root {
  --primarycolor: #226765;
  --secondarycolor: #0B7285;
  --headingsfont: Lora, Georgia, serif;
}
```

## De nieuwe tekst-editor en het thema

De nieuwe tekst-editor heeft zijn eigen stijl in `system/mdeditor/mdeditor.css`, afgebakend tot het element `.mdeditor`. Hij verandert het thema van de site dus niet. Zijn kleuren zijn ook CSS-variabelen, die een thema kan overschrijven.

De **leesweergave** van een pagina of artikel uit de nieuwe editor gebruikt het thema van de site. De HTML heeft deze klassen:

| HTML | Wat het is |
|---|---|
| `figure.breed`, `figure.in-de-tekst`, `figure.klein-rechts` | een foto met zijn plaatsing, met `figcaption` als bijschrift |
| `aside.callout.info`, `.tip`, `.warning`, `.note`, `.important`, `.caution` | een kader, met `p.callout-title` als titel |
| `blockquote.callout.quote` | een citaat |
| `nav.toc` | de inhoudsopgave van `[TOC]` |
| `section.footnotes` | de voetnoten |
| `code` met klassen `hljs-…` | codemarkering (trefwoorden, tekst, getallen, commentaar) |

> [!info] Nog geen opmaak in het standaardthema
> Het thema `default` heeft voor deze klassen nog geen opmaak. Zonder opmaak staan kaders, foto's met plaatsing en codemarkering er als gewone tekst. Voeg de opmaak toe aan `hypha.css` van je eigen thema. De stijl in `mdeditor.css` kun je als voorbeeld gebruiken.

## De kleuren van diagrammen

Diagrammen worden in de browser van de auteur getekend door Pele en als SVG bewaard. In de SVG staan de kleuren als **CSS-variabelen met een reservekleur**, bijvoorbeeld `var(--pele-accent, #5b7bd5)`. Zet je de variabelen in het thema, dan krijgen alle diagrammen op de site de kleuren van het thema, ook diagrammen die al bestaan.

| Variabele | Waarvoor |
|---|---|
| `--pele-series-1` tot en met `--pele-series-8` | de kleuren van reeksen, zoals balken en taartpunten |
| `--pele-accent` | de kleur van de nadruk |
| `--pele-fg`, `--pele-line`, `--pele-muted` | tekst, lijnen en minder belangrijke tekst |
| `--pele-surface`, `--pele-surface-alt`, `--pele-border` | vlakken en randen van vakjes |
| `--pele-error` | foutmeldingen in een diagram |

De editor gebruikt een rustig palet rond blauwgroen en oranje, dat is gecontroleerd op kleurenblindheid en contrast. Wil je dezelfde kleuren in de leesweergave, neem ze dan over uit `mdeditor.css`:

```css
:root {
  --pele-series-1: #007A8F; --pele-series-2: #9C6410; --pele-series-3: #3A5FA8; --pele-series-4: #3B7F34;
  --pele-series-5: #9E4C76; --pele-series-6: #7D641E; --pele-series-7: #5F656A; --pele-series-8: #8A9096;
  --pele-accent: #0B7285; --pele-fg: #1d2021; --pele-line: #505458; --pele-muted: #5F656A;
  --pele-border: #9AA1A6; --pele-surface: #F2F6F7; --pele-surface-alt: #E3EDEF; --pele-error: #be0709;
}
```

> [!tip] Contrast
> Kies kleuren met een contrast van minstens 4,5 op 1 voor tekst (WCAG 2.1 AA). Witte tekst op een gekleurd vlak moet ook goed leesbaar zijn.

## Meer lezen

1. [Architectuur](01-architectuur.md)
2. [Menu en navigatie](../gebruik/07-menu-en-navigatie.md)
