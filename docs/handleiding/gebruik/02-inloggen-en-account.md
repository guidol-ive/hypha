---
title: "Inloggen en je account"
revision: 3
date_created: 2026-10-27
date_last_review:
---

# Inloggen en je account

Om pagina's te maken en te bewerken, heb je een account nodig. Deze pagina legt uit hoe je gebruiker wordt, hoe je inlogt, wat je doet als je je wachtwoord kwijt bent, en hoe je je gegevens wijzigt.

## Gebruiker worden met een uitnodiging

Zelf een account aanmaken kan niet. Een gebruiker van de site nodigt je uit. Het diagram laat zien hoe dat gaat, met Sanne als nieuwe gebruiker en Joost als standaardgebruiker die haar uitnodigt.

```mermaid
sequenceDiagram
    actor Joost as Joost (standaardgebruiker)
    participant Hypha
    actor Sanne as Sanne (nieuw)
    Joost->>Hypha: instellingen, uitnodigen: e-mailadres en bericht
    Hypha-->>Sanne: e-mail met een persoonlijke link
    Hypha-->>Joost: melding: Sanne is uitgenodigd
    Sanne->>Hypha: opent de link
    Hypha-->>Sanne: aanmeldformulier
    Sanne->>Hypha: gebruikersnaam, volledige naam, wachtwoord, bedieningstaal
    Hypha-->>Sanne: registratie gelukt, je kunt nu inloggen
    Hypha-->>Joost: in de samenvatting: Sanne neemt deel aan het project
```

### Iemand uitnodigen

![Het scherm om iemand uit te nodigen](../afbeeldingen/uitnodigen.png)

1. Log in en klik rechtsboven op **instellingen** (het tandwiel).
2. Klik in de **projectledenlijst** op **uitnodigen**.
3. Vul het **e-mailadres** in, bijvoorbeeld `sanne.devries@eemstad.example`. Meer adressen scheid je met een komma.
4. Pas het **bericht** aan als je wilt, en kies **versturen**.

Zolang de genodigde zich niet heeft aangemeld, staat ze in de projectledenlijst als genodigde. Een geprivilegieerde gebruiker kan haar met **herinneren** nog een keer de link sturen.

### Je aanmelden

1. Open de link uit de e-mail met de uitnodiging.
2. Kies een **gebruikersnaam**. Gebruik alleen letters en cijfers.
3. Vul je **volledige naam** in. Die zien andere gebruikers, bijvoorbeeld bij je artikelen.
4. Kies een **wachtwoord** en typ het nog een keer bij **bevestig wachtwoord**.
5. Kies je **bedieningstaal**: de taal van de knoppen en meldingen.
6. Kies **versturen**. Je bent nu standaardgebruiker en kunt inloggen.

> [!warning] De link is persoonlijk
> Stuur de link uit de uitnodiging niet door. Wie de link heeft, kan het account aanmaken.

## Inloggen en uitloggen

![Het venster om in te loggen, met gebruikersnaam en wachtwoord](../afbeeldingen/inloggen.png)

![De startpagina na het inloggen, met rechtsboven de knoppen voor gebruikers en „Aangemeld als”](../afbeeldingen/start-lid.png)

1. Klik rechtsboven op het pictogram om in te loggen.
2. Vul je **gebruikersnaam** en **wachtwoord** in en kies **inloggen**.
3. Je blijft op dezelfde pagina. Je ziet nu knoppen als **bewerken**, **nieuwe pagina** en **instellingen**.
4. Uitloggen doe je met het pictogram rechtsboven. Was je op een privépagina, dan ga je naar de startpagina.

## Wachtwoord of gebruikersnaam vergeten

1. Klik op inloggen en daarna op **heraanmelden**, onder de knoppen.
2. Vul je **gebruikersnaam of e-mailadres** in en kies **versturen**.
3. Je krijgt een e-mail met een link. Open die link.
4. Je ziet hetzelfde formulier als bij het aanmelden. Kies een nieuw wachtwoord en kies **versturen**.

> [!tip] Geen e-mail gekregen?
> Kijk in je map met ongewenste e-mail. Staat de e-mail er niet, vraag dan een geprivilegieerde gebruiker om hulp. Die kan in de projectledenlijst je e-mailadres controleren en een nieuw wachtwoord instellen.

## Je gegevens wijzigen

![Het scherm instellingen met je eigen gegevens en de lijst van gebruikers](../afbeeldingen/instellingen.png)

1. Klik rechtsboven op **instellingen**.
2. Onder **persoonlijke instellingen** zie je je gebruikersnaam, volledige naam, e-mailadres en bedieningstaal.
3. Kies **bewerken**.
4. Wijzig wat je wilt. Laat je de velden voor het wachtwoord leeg, dan blijft je wachtwoord hetzelfde.
5. Kies **opslaan**.

## Stoppen als gebruiker

1. Klik op **instellingen** en daarna op **account deactiveren**.
2. Schrijf eventueel een bericht. Hypha stuurt het naar de andere gebruikers.
3. Kies **versturen** en bevestig. Je wordt uitgelogd.

Je account blijft bestaan, maar je bent dan *geen gebruiker* meer; je pagina's en artikelen blijven staan. Alleen een geprivilegieerde gebruiker kan je account weer actief maken.

## Voor geprivilegieerde gebruikers

In de projectledenlijst heeft een geprivilegieerde gebruiker per gebruiker extra knoppen:

| Knop | Wat het doet |
|---|---|
| bewerken | de gegevens van de gebruiker wijzigen |
| verwijderen | de gebruiker wordt *geen gebruiker* en kan niet meer inloggen |
| herinneren | de uitnodiging nog een keer sturen (alleen bij een genodigde) |
| maak geprivilegieerd | een standaardgebruiker wordt geprivilegieerde gebruiker |
| maak standaard | een geprivilegieerde gebruiker wordt standaardgebruiker; de laatste geprivilegieerde gebruiker kan dat niet |
| weer actief maken | iemand die *geen gebruiker* was, wordt weer standaardgebruiker |

Gebruikers beheren en met de hand een wachtwoord instellen staat in [Gebruikersbeheer](10-gebruikersbeheer.md).

Meer over rollen en beveiliging staat in [Beveiliging](../techniek/07-beveiliging.md).

## Meer lezen

1. [Wat is Hypha?](01-wat-is-hypha.md)
2. [Veelgestelde vragen](09-vragen.md)
