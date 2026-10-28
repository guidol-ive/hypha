---
title: "Tekens en talen (Unicode)"
revision: 3
date_created: 2026-10-27
date_last_review:
---

# Tekens en talen (Unicode)

Deze pagina beschrijft hoe goed Hypha omgaat met letters met accenten, andere schriften, emoji en speciale tekens. Ze is gebaseerd op een test op 27 oktober 2026 met een verzonnen proefsite in de container van `docs/container` (PHP 8.2), zowel op `main` van Hypha als op de versie met de nieuwe tekst-editor (issue [#520](https://github.com/PlanBCode/hypha/issues/520)).

Kort gezegd: **tekst** in pagina's en artikelen komt overal goed door, in elk schrift. **Namen van pagina's** en een paar tellers en zoekfuncties werken alleen goed met gewone letters zonder accent (ASCII). Twee fouten konden een pagina of de hele site onleesbaar maken; daarvoor staat een oplossing klaar.

## Wat is getest

Elke proef gebruikte verzonnen tekst, onder andere:

1. Nederlandse, Franse en Duitse letters: `Café Ëenhoorn naïef façade`, `Straße Größe Äpfel`, `Garçon élève œuvre`;
2. dezelfde letter op twee manieren geschreven: `é` als één teken (NFC) en als `e` plus een los accent (NFD);
3. Grieks (`Αθήνα`), Russisch (`Москва`), Arabisch (`القاهرة`), Hebreeuws (`שלום`) en Japans (`東京都の図書館`);
4. emoji, ook samengestelde (`👩‍👩‍👧`) en vlaggen (`🇳🇱`), en tekens buiten het basisbereik (`𝔘𝔫𝔦`);
5. losse accenttekens (`Z̤̈`), tekens zonder breedte (U+200B, U+200D, U+FEFF) en de harde spatie (`10 km`);
6. typografische aanhalingstekens: `„Hallo”` en `‘wereld’`;
7. kapotte invoer: een verticale tab (U+000B, die Word bij Shift+Enter invoegt) en bytes die geen geldige UTF-8 zijn.

## Wat goed werkt

1. **Tekst van pagina's en artikelen.** Alle tekens hierboven worden in de XML-bestanden bewaard, na opnieuw laden onveranderd teruggelezen en goed getoond, in de oude editor (WYMeditor) én in de nieuwe tekst-editor.
2. **Versies.** Een oudere versie van een tekstpagina komt met alle tekens terug. Het verschil tussen twee versies wordt per woord getoond.
3. **De nieuwe tekst-editor** bewaart titel, auteur, tekst, uittreksel, bijsluiter en bronnen precies zoals ze zijn ingetypt. Hij haalt verticale tabs en andere verboden tekens weg voordat hij opslaat, en repareert kapotte UTF-8.
4. **Webadres van een nieuw artikel.** Accenten verdwijnen netjes: `Café „De Kroon” in Eemstad` wordt `cafe-de-kroon-in-eemstad`, `Straße & Größe 50%` wordt `strasse-en-grosse-50-procent`. Dezelfde titel in NFC en NFD geeft hetzelfde adres; het tweede artikel krijgt `-2`.
5. **Tags** met accenten, Grieks of Japans werken, ook de tagpagina `tag/nl/…`.
6. **Volledige namen** van gebruikers mogen accenten, andere schriften en emoji bevatten.
7. **E-mail.** Een onderwerp met letters buiten ASCII wordt gecodeerd (RFC 2047), zodat strenge mailservers het accepteren. De tekst van de mail is UTF-8.
8. **Pagina's** worden met `charset=utf-8` naar de browser gestuurd.

## Wat niet goed werkt

1. **Een verticale tab of kapotte UTF-8 kon de site breken.** Een reactie van een bezoeker met zo'n teken maakte het artikel onleesbaar (foutmelding 500 voor iedereen). Een gebruiker kon met zo'n teken in zijn volledige naam de hele site onleesbaar maken. Gemeld als [#539](https://github.com/PlanBCode/hypha/issues/539), oplossing in [#540](https://github.com/PlanBCode/hypha/pull/540).
2. **Paginanamen verliezen letters.** Bij een nieuwe pagina houdt Hypha alleen letters zonder accent over: `Café de Kroon` wordt `Caf_de_Kroon`, `Straße` wordt `Strae`, een Griekse naam wordt `_` en een Japanse naam wordt geweigerd. `Été` en `été` worden allebei `t`. Dat geldt ook voor de titel van een tekstpagina in de nieuwe tekst-editor. Gemeld als [#543](https://github.com/PlanBCode/hypha/issues/543).
3. **Pagina's met een naam buiten ASCII geven 404.** Een link als `[[Café de Kroon]]` maakt wel een pagina `Café_de_Kroon` aan, maar wie op de link klikt, krijgt „niet gevonden”. Gemeld als [#541](https://github.com/PlanBCode/hypha/issues/541), oplossing in [#542](https://github.com/PlanBCode/hypha/pull/542).
4. **De paginalijst (index) hangt** zodra er een pagina is waarvan de naam begint met een teken na de Z, zoals `É`, `Α` of `_`. Na 30 seconden volgt een foutmelding. Bekend als [#514](https://github.com/PlanBCode/hypha/issues/514), oplossing in [#516](https://github.com/PlanBCode/hypha/pull/516).
5. **Zoeken zonder hoofdletters werkt alleen voor ASCII.** In de keuzelijst van pagina's vindt `écl` de pagina `Éclair` niet. Hetzelfde geldt voor het opzoeken van pagina's en gebruikersnamen.
6. **Lange onderwerpen van e-mails** werden één gecodeerd woord van honderden tekens; de norm staat er 75 toe. Gemeld als [#544](https://github.com/PlanBCode/hypha/issues/544), oplossing in [#545](https://github.com/PlanBCode/hypha/pull/545). De naam van de afzender wordt niet gecodeerd; dat lost [#495](https://github.com/PlanBCode/hypha/pull/495) op.
7. **Rechts-naar-links.** Arabische en Hebreeuwse tekst wordt goed getoond, maar Hypha zet geen `dir` op de pagina. In beide editors kun je een stuk tekst zelf markeren met HTML, bijvoorbeeld `<p dir="rtl" lang="ar">…</p>` of `<bdi>…</bdi>`.
8. **Titels in een ander schrift** krijgen in de nieuwe tekst-editor geen leesbaar adres: een Griekse, Arabische of Japanse titel wordt `pagina`, `pagina-2`, enzovoort. Koppen in zo'n schrift krijgen het anker `kop-zonder-naam`, `kop-zonder-naam-2`. Dat is een bewuste keuze zolang paginanamen buiten ASCII niet werken (punt 2 en 3).

## Hersteld in de nieuwe tekst-editor

Deze punten kwamen uit dezelfde test en zijn in de nieuwe tekst-editor opgelost:

1. Het HTML-filter laat `dir`, `lang`, `<bdi>` en `<bdo>` staan, zodat je tekst van rechts naar links kunt markeren.
2. De teller van de titel telt tekens zoals een lezer ze ziet: `👩‍👩‍👧` en `🇳🇱` tellen elk als 1. De woordenteller en de leestijd houden een los accent bij zijn woord, en tellen in Chinees en Japans elk teken als een woord.
3. Titel, rubriek, auteur en tags worden als NFC opgeslagen. Een tag die je met een los accent intypt, is dezelfde tag. Op een server met intl geldt dat ook voor tags die er al stonden.
4. Webadressen en ankers zijn op de server en in de browser gelijk, ook zonder intl: de tabel om accenten weg te halen kent nu alle Latijnse letters, ook die van het Vietnamees (`Nguyễn Thị` wordt `nguyen-thi`).
5. Een link met een harde spatie, zoals `[[10 km]]`, wijst op de server en in het voorbeeld naar hetzelfde adres (`10_km`).
6. Een pagina met dezelfde naam in andere hoofdletters, zoals `[[ÉCLAIR proef]]` naast `Éclair_proef`, ziet de editor nu net als de server als een andere pagina.

## Advies

1. Gebruik voor **paginanamen** voorlopig gewone letters zonder accent, en zet de echte naam met accenten in de titel of de tekst.
2. Plak tekst uit Word bij voorkeur via de nieuwe tekst-editor; die haalt verboden tekens weg. Installeer de oplossing van [#540](https://github.com/PlanBCode/hypha/pull/540) zodra die is samengevoegd.
3. Krijgt een pagina of de hele site een foutmelding 500 na een reactie of een nieuwe naam, zoek dan in `data/hypha.xml` of `data/pages/<id>` naar een teken onder de spatie (bijvoorbeeld met `grep -P '[\x00-\x08\x0B\x0C\x0E-\x1F]'`) en haal het weg. Maak eerst een back-up.
4. Maak geen links naar pagina's met accenten in de naam zolang [#542](https://github.com/PlanBCode/hypha/pull/542) en [#516](https://github.com/PlanBCode/hypha/pull/516) niet zijn samengevoegd: zulke pagina's zijn onbereikbaar en laten de paginalijst hangen.
5. Zet in een artikel in het Arabisch of Hebreeuws de alinea's in HTML met `dir="rtl"` en `lang`, bijvoorbeeld `<p dir="rtl" lang="ar">…</p>`.
6. Maak als geprivilegieerde gebruiker geen tags aan die alleen in accent verschillen van een bestaande tag.

## Wat de server nodig heeft

1. **mbstring** is nodig: de nieuwe tekst-editor gebruikt het voor kleine letters, het repareren van UTF-8 en het inkorten van tekst. De officiële PHP-containers hebben het al.
2. **intl** is niet nodig. Zonder intl gebruikt Hypha een eigen tabel om accenten weg te halen uit webadressen; die geeft hetzelfde resultaat als de browser. Met intl worden ook bestaande tags in NFC vergeleken. De officiële containers hebben geen intl; zet het aan met `docker-php-ext-install intl`.
3. **iconv** wordt niet gebruikt.
4. De webserver moet pagina's als UTF-8 versturen; Hypha zet dat zelf in de kop van elke pagina.

## Meer lezen

1. [Installatie](02-installatie.md)
2. [Opslag: hypha.xml en de map data](03-opslag.md)
3. [Beveiliging](07-beveiliging.md)
4. De Engelstalige samenvatting: [`docs/technical/UNICODE.md`](../../technical/UNICODE.md)
