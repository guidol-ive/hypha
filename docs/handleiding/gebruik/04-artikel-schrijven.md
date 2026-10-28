---
title: "Een artikel schrijven"
revision: 9
date_created: 2026-10-27
date_last_review:
---

# Een artikel schrijven

Een *artikel met review* is een lang stuk dat pas verschijnt als drie collega's het hebben goedgekeurd. Deze pagina legt uit hoe je zo'n artikel maakt en schrijft. Hoe het daarna verder gaat, staat in [Een artikel beoordelen en publiceren](05-beoordelen-en-publiceren.md).

> [!info] Nieuw met de tekst-editor
> Deze pagina beschrijft de **nieuwe tekst-editor** voor artikelen, die in ontwikkeling is (issue [#520](https://github.com/PlanBCode/hypha/issues/520)). Artikelen die al bestaan, openen in de vertrouwde opmaakeditor; zie [Oudere artikelen](#oudere-artikelen) onderaan.

## Wat je nodig hebt

1. Een account als **gebruiker** van de site. Je wordt gebruiker via een uitnodiging van een andere gebruiker.
2. Je bent **ingelogd**.
3. De tekst van je artikel, of een idee om mee te beginnen.

## Het schrijfproces in het kort

Het diagram laat de stappen zien, van een nieuwe pagina tot een artikel dat klaar is voor beoordeling.

```mermaid
flowchart LR
    a[Nieuwe pagina] --> b[Artikelkop invullen]
    b --> c[Tekst schrijven]
    c --> d[Beeld, citaat, kader, tabel, diagram]
    d --> e[Bijsluiter en bronnen]
    e --> f[Voorbeeld en checklist]
    f -->|alles in orde| g([Start beoordeling])
    f -->|nog iets te doen| c
```

## Stap voor stap

### 1. Een nieuw artikel maken

![Het venster nieuwe pagina voor een artikel: titel, webadres en de keuze hoe je schrijft](../afbeeldingen/nieuw-artikel.png)

1. Klik op **nieuwe pagina**. Het venster **Maak Nieuwe Pagina** opent.
2. Kies bij **Soort** de soort **artikel met review**. Het veld **Paginanaam** heet nu **Titel**.
3. Typ de **Titel** van het artikel. Het webadres volgt er vanzelf uit: de woorden in kleine letters, met streepjes ertussen en zonder accenten, bijvoorbeeld `/nl/vertrekkend-raadslid-bram-hoekstra-twintig-jaar-strijd-voor-open-bestuur`. Je ziet het adres meteen onder de titel. Bestaat het al, dan komt er `-2` achter.
4. Een nieuw artikel opent **altijd in de nieuwe tekst-editor**. Kies bij **Hoe wil je meestal schrijven?** voor **Opmaak** of **Markdown**. Vink **Onthoud keuze** aan, dan vraagt Hypha het niet meer.
5. Kies **maken**. Het artikel heeft nu de status *schets* en is alleen zichtbaar voor ingelogde gebruikers. Het webadres ligt nu vast; verander je de titel later flink, dan stelt de checklist voor het adres bij te werken, zolang het artikel nog niet gepubliceerd is. Met **annuleren**, links van **maken**, sluit je het venster zonder artikel.

### 2. Kiezen hoe je schrijft

Boven het tekstkader staat de schakelaar **Bewerken als**:

![Hetzelfde artikel in de weergave Markdown, met bovenaan de vaste velden als Frontmatter](../afbeeldingen/artikel-markdown.png)

1. **Opmaak**: je schrijft zoals in Word. Vet is vet, een tussenkop is groot, een foto zie je meteen.
2. **Markdown**: je schrijft met eenvoudige tekens, zoals `###` voor een tussenkop en `**vet**` voor vet. De tekens staan grijs, zodat ze niet afleiden. De knop **(?)** opent een spiekbriefje.

Je kunt altijd wisselen; er gaat niets verloren en de cursor blijft op dezelfde plek. De editor begint in **Opmaak**. Je keuze wordt onthouden. Naast elkaar kan alleen als er genoeg ruimte is: een scherm van minstens 1024 pixels breed, en een thema dat de pagina breed genoeg maakt. Het thema van De Stadsbron heeft een smalle kolom; daar toont deze knop het voorbeeld in plaats van de tekst.

Rechts in de werkbalk kies je wat je ziet:

1. **Schrijven**: alleen de tekst;
2. **Voorbeeld**: het artikel zoals de lezer het ziet;
3. **Naast elkaar**: tekst en voorbeeld naast elkaar, over de hele breedte van het scherm. Het voorbeeld scrolt mee met de plek waar je typt. Sleep de streep tussen tekst en voorbeeld om de ruimte anders te verdelen; met de pijltjestoetsen kan het ook, en dubbelklikken zet de streep terug in het midden. Je keuze wordt onthouden.

### 3. De artikelkop invullen

Bovenaan staat de **artikelkop** met vaste velden. Ze horen bij elk artikel:

![De artikelkop in Opmaak: titel, auteur, foto bovenaan en uittreksel](../afbeeldingen/artikel-opmaak.png)

| Veld | Wat je invult | Verplicht |
|---|---|---|
| titel | de kop van het artikel, liefst korter dan 90 tekens | ja |
| auteur | je naam, zoals die boven het artikel komt | ja |
| uittreksel | twee à drie zinnen die lezers naar het artikel trekken (de *ankeiler*) | ja |
| rubriek | de rubriek waar het artikel onder valt, één uit de lijst van de site | ja |
| tags | één of meer onderwerpen uit de vaste lijst van de site | ja |
| afbeelding | een foto bij het uittreksel, met beschrijving, bijschrift en fotograaf | aangeraden |

1. De **rubriek** en de tags kies je uit een lijst. Een artikel heeft precies één rubriek en één of meer tags. Een nieuwe tag kan alleen een geprivilegieerde gebruiker maken; vraag het de redactie als je er een mist.
2. De **beschrijving** van een foto is voor wie de foto niet kan zien, bijvoorbeeld met voorleessoftware. Beschrijf wat er op de foto staat.
3. Zonder foto staat er alleen de knop **Foto kiezen**. Pas als er een foto is, zie je de velden voor beschrijving, bijschrift en fotograaf, en de knop **Foto vervangen**.
4. De rubrieken staan op alfabet.
5. De velden voor titel en uittreksel worden vanzelf zo hoog als hun tekst.

Op de pagina van het artikel ziet de lezer het **uittreksel** vet als inleiding. Daaronder staat de **foto** over de hele breedte, met bijschrift en fotograaf. Dan volgt de tekst.

Het uittreksel is ook de beschrijving voor zoekmachines. Deelt iemand een link naar het artikel, bijvoorbeeld op sociale media, dan toont de voorvertoning de titel, het uittreksel en de foto.

In Markdown staan dezelfde velden als *Frontmatter* bovenaan de tekst, tussen twee regels `---`:

```markdown
---
titel: "Vertrekkend raadslid Bram Hoekstra: twintig jaar strijd voor open bestuur"
auteur: Sanne de Vries
uittreksel: "Twintig jaar lang vroeg Bram Hoekstra in de raad van Eemstad om openbare stukken en debatten."
rubriek: Politiek en bestuur
tags:
  - Raadsnieuws
afbeelding: beeld/hoekstra.jpg
beschrijving: Bram Hoekstra in de raadszaal van Eemstad
bijschrift: Bram Hoekstra na twintig jaar in de raad van Eemstad.
fotograaf: Foto (naam fotograaf)
---
```

### 4. De tekst schrijven

![Het menu Alle blokken in Opmaak](../afbeeldingen/menu-blokken.png)

![Het menu dat opent als je / typt aan het begin van een regel](../afbeeldingen/menu-slash.png)

![Het spiekbriefje met de Markdown-tekens](../afbeeldingen/spiekbriefje.png)

1. Schrijf gewoon. Een lege regel begint een nieuwe alinea.
2. Een **tussenkop** maak je met de knop **Tussenkop**, of in Markdown met `### ` aan het begin van de regel.
3. Alles wat je kunt invoegen staat onder de knop **Alle blokken** (het plusje in de werkbalk): subkop, opsomming en genummerde lijst, citaat, kader, voetnoot, tabel, beeld, diagram, formule, code, scheidingslijn en interactief blok. In Markdown kun je ook aan het begin van een lege regel een **/** typen.
4. Een link naar een andere pagina van de site maak je met `[[` gevolgd door de naam; de editor stelt pagina's voor.
5. Een **voetnoot** maak je met `[^1]` in de tekst en `[^1]: Bron of uitleg` onderaan.
6. **Code met regelnummers**: zet in Markdown `=` achter de taal van een codeblok, zoals in HedgeDoc. Met ```` ```javascript= ```` beginnen de nummers bij 1, met ```` ```javascript=101 ```` bij 101, en met ```` ```javascript=+ ```` gaan ze verder na het vorige genummerde blok. Wie de code kopieert, krijgt de nummers niet mee.

> [!tip] Plakken uit Word, Google Docs of LibreOffice
> Plak gerust tekst uit Word, Google Docs of LibreOffice. De editor neemt vet, schuin, koppen, tabellen, formules, lijsten en links over en laat de rest weg, zodat de opmaak niet verspringt. Kop 1 wordt een tussenkop. Foto's gaan niet altijd mee: voeg ze dan toe met **Beeld…**; de checklist herinnert je eraan. Wil je alleen de tekst, zonder opmaak? Plak dan met ⌘⇧V (Ctrl+Shift+V). Wat niet meekwam, zoals een plaatje zonder bestand of een formule als plaatje, blijft in de checklist staan tot je op **gezien** klikt. Foto's die als bestand meekomen, uploadt de editor zelf.

### 5. Beeld, citaat, kader, tabel en diagram toevoegen

![Het venster om een diagram te maken, met links de tekst en rechts het diagram zoals de lezer het ziet](../afbeeldingen/dialoog-diagram.png)

![De lijst met meer soorten diagrammen](../afbeeldingen/dialoog-diagram-soorten.png)

![Het venster om een formule te maken](../afbeeldingen/dialoog-formule.png)

![Het menu van de tabel](../afbeeldingen/menu-tabel.png)

![Het venster van een interactief blok: links de code, rechts het werkende blok](../afbeeldingen/dialoog-interactief.png)

| Wat | Knop | Waarvoor |
|---|---|---|
| foto | **Beeld…** | een foto met beschrijving, bijschrift, fotograaf en plaatsing (breed, in de tekst, klein rechts) |
| citaat | **Citaat** | een uitspraak die je wilt laten opvallen; selecteer eerst de tekst, dan komt die in het citaat |
| kader | **Kader** | achtergrond of uitleg naast het verhaal, met een eigen titel |
| tabel | **Tabel ▾** | cijfers of een overzicht; kies het aantal kolommen, gebruik Tab om naar de volgende cel te gaan |
| diagram | **Diagram…** | een tijdlijn, staafdiagram, stroomschema en meer; onder **Technisch** ook soorten als klassen, architectuur en versiebeheer; kies een voorbeeld en pas de tekst aan |
| formule | **Formule** | een formule in LaTeX-notatie, zoals `$\tfrac{4}{37}$` |

**Interactief blok.** Een rekenhulp, een kwis of een grafiek die reageert op de lezer, maak je met een interactief blok. Typ `/` aan het begin van een regel en kies **Interactief blok**, of kies **bewerken** bij een bestaand blok in Opmaak.

1. Links schrijf je HTML, CSS en JavaScript; rechts zie je meteen hoe het werkt voor de lezer.
2. Een **beschrijving** is verplicht. Voorleessoftware leest die voor, en lezers zonder JavaScript en zoekmachines zien die tekst in plaats van het blok.
3. Laat je de **hoogte** leeg, dan past het blok zich aan zijn inhoud aan. Een vaste hoogte vul je in pixels in.
4. Het blok draait afgeschermd: het kan niet bij de pagina, cookies, formulieren of het internet. Scripts en stijlen van buiten mogen alleen van de diensten die een geprivilegieerde gebruiker heeft ingesteld.
5. Een interactief blok kan alleen wie vrijheidsniveau 2 heeft; zie [Beheer](../techniek/06-beheer.md#instellingen-van-de-tekst-editor).

Een foto of diagram **bewerk** je met het potlood of een dubbelklik, en **verwijder** je met het kruisje. Daarna kun je het verwijderen nog ongedaan maken.

Een diagram is gewone tekst. Zo ziet een tijdlijn eruit:

````markdown
```mermaid
timeline
    title Bram Hoekstra in de raad van Eemstad
    2005 : Open Eemstad opgericht
    2006 : twee zetels
    2014 : een jaar wethouder
    2026 : afscheid
```
````

Geef elk diagram een korte **beschrijving voor voorlezen**, bijvoorbeeld „tijdlijn van Bram Hoekstra in de gemeenteraad, van 2005 tot 2026”.

### 6. Bijsluiter en bronnen

Onderaan het artikel staan twee vaste blokken:

1. **Bijsluiter** (verplicht): hoe je het onderwerp hebt onderzocht. Bijvoorbeeld met wie je hebt gesproken en welke stukken je hebt gelezen.
2. **Bronnen** (aangeraden): de documenten, websites en gesprekken waarop het artikel steunt.

In Markdown staan ze in de Frontmatter, als `bijsluiter:` en `bronnen:`.

### 7. Controleren met de checklist

Rechts staat de **beoordelingschecklist**. Ze toont alleen wat nog aandacht vraagt; met **toon alles** zie je ook wat in orde is.

![De beoordelingschecklist naast de editor](../afbeeldingen/checklist.png)

![Het voorbeeld van het artikel zoals de lezer het straks ziet](../afbeeldingen/artikel-voorbeeld.png)

| Controle | Soort |
|---|---|
| heeft artikelinhoud | verplicht |
| heeft een uittreksel | verplicht |
| heeft een bijsluiter | verplicht |
| heeft één of meer tags | verplicht |
| heeft één of meer bronnen | aangeraden |
| heeft een afbeelding bij het uittreksel | aangeraden |

Daarnaast geeft de checklist tips, bijvoorbeeld bij zinnen langer dan 30 woorden, een foto zonder beschrijving of een formule die niet klopt. Een tip houdt je niet tegen.

Zo lang een verplichte controle niet in orde is, kun je de beoordeling niet starten.

### 8. Opslaan en de beoordeling starten

1. Kies **opslaan** (of ⌘/Ctrl+S). Tot je opslaat, bewaart de browser je werk, zodat je niets kwijtraakt als het venster sluit.
2. Is alles in orde, kies dan **start beoordeling**. Het artikel gaat naar de status *in beoordeling* en de gebruikers krijgen bericht.

Verder lezen: [Een artikel beoordelen en publiceren](05-beoordelen-en-publiceren.md).

## Op een telefoon of tablet

De editor werkt op iPhone, iPad en Android. De schermen hieronder komen van een iPhone (iOS 27, Safari) en een Android-telefoon (Android 15, Chrome).

| | iPhone | Android |
|---|---|---|
| **Een artikel lezen** | ![Een artikel gelezen op een iPhone](../afbeeldingen/ios-artikel-lezen.png) | ![Een artikel gelezen op een Android-telefoon](../afbeeldingen/android-artikel-lezen.png) |
| **Een reactie geven** | ![Een reactie typen onder een artikel op een iPhone](../afbeeldingen/ios-reactie-toevoegen.png) | ![Een reactie typen onder een artikel op een Android-telefoon](../afbeeldingen/android-reactie-toevoegen.png) |
| **Een artikel bewerken** | ![De editor op een iPhone, met de werkbalk boven het toetsenbord](../afbeeldingen/ios-artikel-bewerken.png) | ![De editor op een Android-telefoon, met de werkbalk onderaan](../afbeeldingen/android-artikel-bewerken.png) |

1. De werkbalk staat onderaan het scherm. Zodra het toetsenbord opent, schuift hij erboven. Elke knop is groot genoeg om met een vinger te raken.
2. Autocorrectie, woordsuggesties en dicteren werken, in Opmaak en in Markdown.
3. Op een smal scherm wissel je met het potlood en het oog tussen **Schrijven** en **Voorbeeld**, in plaats van ze naast elkaar te zien.

## Oudere artikelen

Artikelen die zijn gemaakt vóór de nieuwe tekst-editor, zijn opgeslagen als HTML. Ze openen in de oude **opmaakeditor** (WYMeditor), met vier losse velden voor uittreksel, artikel, bijsluiter en bronnen. Ze worden niet omgezet. Alles op deze pagina over de checklist en de beoordeling geldt ook voor hen.

## Veelgestelde vragen

1. **Kan ik een artikel als `.md`-bestand opslaan?** Ja: met **Meer ▾ → download als .md**. Een `.md`-bestand kun je ook openen in de editor.
2. **Wie ziet mijn artikel?** Zolang het niet is gepubliceerd, alleen de ingelogde gebruikers van de site.
3. **Moet ik Markdown kennen?** Nee. In **Opmaak** werkt alles met knoppen. Markdown leer je terloops, als je wilt.
4. **„… heeft deze tekst opgeslagen nadat jij hem opende.”** Iemand anders heeft het artikel opgeslagen terwijl jij het open had. Je eigen wijzigingen zijn niet weg: ze staan nog in de editor. Kies **Toch opslaan** om de versie van de ander te vervangen, of open het artikel opnieuw in een tweede tabblad en neem over wat je nodig hebt.
