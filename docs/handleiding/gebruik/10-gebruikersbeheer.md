---
title: "Gebruikersbeheer"
revision: 1
date_created: 2026-10-28
date_last_review:
---

# Gebruikersbeheer

Deze pagina legt uit welke soorten gebruikers Hypha kent, wat een geprivilegieerde gebruiker met andere gebruikers kan doen, en hoe je met de hand een wachtwoord instelt als niemand meer kan inloggen.

## Soorten gebruikers

Hypha kent twee soorten accounts, die los van elkaar staan:

1. de **systeemgebruiker** van `hypha.php`, voor installatie en onderhoud;
2. de **gebruikers van de site**, in `data/hypha.xml`.

Met de systeemgebruiker kun je **niet** op de site inloggen, en met een gebruiker van de site kun je niet in `hypha.php`.

| Soort | Waar | Wat hij kan |
|---|---|---|
| systeemgebruiker | `$username` en `$password` bovenin `hypha.php` | de site installeren, en via `hypha.php?maintenance` de bestanden van Hypha bijwerken |
| geprivilegieerde gebruiker | `rights="admin"` in `hypha.xml` | alles van een standaardgebruiker, plus de instellingen, het thema, het menu, kop en voet, pagina's verwijderen, nieuwe tags, en andere gebruikers beheren |
| standaardgebruiker | `rights="user"` | pagina's en artikelen maken en bewerken, anderen uitnodigen |
| genodigde | `rights="invitee"` | nog niets: heeft een uitnodiging gekregen en zich nog niet aangemeld |
| geen gebruiker | `rights="exmember"` | niets meer: het account is gedeactiveerd |

Bij de installatie maak je de systeemgebruiker en de **eerste geprivilegieerde gebruiker** apart aan. Zie [Installatie](../techniek/02-installatie.md#systeemgebruiker-en-gebruikers-van-de-site).

## Gebruikers beheren op de site

Een geprivilegieerde gebruiker beheert de andere gebruikers via **Instellingen**, in de lijst van gebruikers. Per gebruiker staan daar knoppen:

| Knop | Wat er gebeurt |
|---|---|
| **bewerken** | naam, e-mailadres, taal of wachtwoord van de gebruiker wijzigen |
| **maak geprivilegieerd** | een standaardgebruiker wordt geprivilegieerde gebruiker |
| **maak standaard** | een geprivilegieerde gebruiker wordt standaardgebruiker; de laatste geprivilegieerde gebruiker kan dat niet |
| **verwijderen** | de gebruiker wordt *geen gebruiker*: hij kan niet meer inloggen, maar zijn pagina's blijven |
| **weer actief maken** | iemand die *geen gebruiker* was, wordt weer standaardgebruiker |
| **herinneren** | een genodigde krijgt de uitnodiging nog een keer |

Hoe je iemand uitnodigt, staat in [Inloggen en je account](02-inloggen-en-account.md).

## Wachtwoord vergeten

Wie zijn wachtwoord kwijt is, kiest in het venster om in te loggen **heraanmelden** en vult zijn gebruikersnaam of e-mailadres in. Hypha stuurt dan een e-mail met een link om een nieuw wachtwoord te kiezen. Dat werkt alleen als de site e-mail kan versturen.

Een geprivilegieerde gebruiker kan ook het wachtwoord van een ander wijzigen met **bewerken**.

## Met de hand een wachtwoord instellen in hypha.xml

Soms kan niemand meer inloggen: het wachtwoord van de enige geprivilegieerde gebruiker is kwijt, en de site kan geen e-mail versturen. Wie toegang heeft tot de server, stelt dan met de hand een wachtwoord in. Het wachtwoord staat niet zelf in `hypha.xml`, maar als **hash** in het attribuut `password` van de gebruiker.

> [!warning] Werk op een kopie
> Maak eerst een kopie van `data/hypha.xml`. Een fout in het bestand maakt de hele site onbruikbaar. Doe het op een rustig moment: Hypha schrijft in hetzelfde bestand als iemand iets opslaat.

1. Maak een kopie van het bestand:

   ```bash
   cp data/hypha.xml data/hypha.xml.kopie
   ```

2. Maak een hash van het nieuwe wachtwoord. PHP vraagt het wachtwoord, zodat het niet in de geschiedenis van je shell komt:

   ```bash
   php -r 'echo password_hash(readline("Nieuw wachtwoord: "), PASSWORD_DEFAULT), "\n";'
   ```

   Draait Hypha in een container, doe het dan in de container:

   ```bash
   docker exec -it hypha php -r 'echo password_hash(readline("Nieuw wachtwoord: "), PASSWORD_DEFAULT), "\n";'
   ```

   De uitkomst begint met `$2y$` en is 60 tekens lang.

3. Open `data/hypha.xml` in een teksteditor en zoek de gebruiker op zijn `username`. Vervang de waarde van `password` door de hash. Laat de andere attributen staan:

   ```xml
   <user id="5f0c0ffee0b1a" username="sanne" password="$2y$10$…de nieuwe hash…" fullname="Sanne de Vries" email="sanne@eemstad.example" rights="admin"/>
   ```

   Heeft geen enkele gebruiker meer `rights="admin"`, zet dat dan bij deze gebruiker.

4. Controleer dat het bestand nog geldige XML is:

   ```bash
   xmllint --noout data/hypha.xml
   ```

   Geeft dit een fout, zet dan de kopie terug.

5. Log in op de site met de gebruikersnaam en het nieuwe wachtwoord, en verwijder daarna de kopie: daarin staan de hashes van alle wachtwoorden.

## Het wachtwoord van de systeemgebruiker

Het wachtwoord van de systeemgebruiker staat **leesbaar** bovenin `hypha.php`:

```php
$username = 'onderhoud';
$password = 'een lang en uniek wachtwoord';
```

Je wijzigt het door die regel aan te passen. Gebruik een ander wachtwoord dan voor de site, en haal `hypha.php` na de installatie weg, of houd het wachtwoord lang en uniek (zie [Beveiliging](../techniek/07-beveiliging.md)). Dat dit wachtwoord leesbaar in het bestand staat, is een bekend zwak punt: issue [PlanBCode/hypha#642](https://github.com/PlanBCode/hypha/issues/642).
