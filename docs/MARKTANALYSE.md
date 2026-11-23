# Marktanalyse & Positionierung – Wishboxx

## 1. Ausgangslage: die Geburtstagskiste im Laden

In vielen Spielwarengeschäften gibt es **Geburtstagskisten** (auch Geschenkekiste/Wunschkiste):
Das Geburtstagskind sucht im Laden Wünsche aus, sie kommen in eine Kiste mit seinem Namen, und
eingeladene Kinder bzw. ihre Eltern kaufen dort ein Geschenk aus der Kiste – meist mit einem
unausgesprochenen Budget von 10–15 €.

**Was gut daran ist:** keine doppelten Geschenke, das Kind bekommt, was es wirklich will, Gäste
müssen nicht raten.

**Was nervt (Pain Points aus Elternsicht):**

| Pain | Wer leidet | Ursache |
|---|---|---|
| Gäste müssen extra in *diesen einen* Laden fahren, mit Öffnungszeiten | Gast-Eltern | rein physische Kiste |
| Gastgeber weiß nicht, wann die Kiste leer ist / was fehlt | Gastgeber-Eltern | keine Rückmeldung |
| Budget ist ein Tabuthema („Was gibt man denn so?“) | alle | wird nicht kommuniziert |
| Teure Herzenswünsche (Fahrrad, Lego-Set) fallen raus | Kind, Eltern | ein Gast = ein Geschenk |
| Einladungen, Rückfragen, Erinnerungen laufen chaotisch über die Kita-/Klassen-WhatsApp-Gruppe | Mütter/Väter | kein zentraler Ort |
| Ideenlosigkeit beim Befüllen, v.a. bei Großeltern & für Ostern/Weihnachten | Eltern | keine Inspiration |
| Nach der Feier: Wer hat was geschenkt? Dankeskarten? | Gastgeber-Eltern | keine Übersicht |
| Doppelte Geschenke zwischen Anlässen (Geburtstag im November, Weihnachten im Dezember) | Eltern, Großeltern | kein „hat schon“-Gedächtnis |

## 2. Wettbewerb

| Lösung | Stärken | Schwächen / Lücken |
|---|---|---|
| **Wishbob** | sehr einfach, kostenlos, ohne Registrierung, Reservieren, Kindergeburtstag explizit genannt | laut Nutzerbewertungen nur eine Liste / keine Abschnitte, generisch (kein Kinderfokus), keine Ideen, kein Budget, keine Gruppengeschenke |
| **GoWish** | große Reichweite, Gäste sehen Reservierungen ohne dass Beschenkter es sieht | generisch für Erwachsene, keine Kinderprofile, keine KI-Eingrenzung nach Alter |
| **WishUpon, Wisebuy, bitte.kaufen, StarSnoopy, My Wishlist Online** | Reservieren ohne Account, teils Secret-Santa/Wichteln | austauschbar, keine Kinder-spezifischen Features |
| **Giftster / Elfster** (US) | Familiengruppen, Wichteln | englisch, kein Geld-Pooling, als „glitchy“ kritisiert |
| **Amazon Wunschliste** | riesige Auswahl | nur Amazon, kein Laden vor Ort, kein Budget-Rahmen, Datenschutz-Bedenken (Adresse) |
| **Physische Kiste im Laden** | haptisch, Kind sucht selbst aus, stärkt lokalen Handel | siehe Pain Points oben |

**Erkenntnis:** Alle digitalen Lösungen sind *generische* Wunschzettel. Niemand bildet das
Geburtstagskisten-Ritual für Kinder ab – inkl. Budget, Gästen ohne Account, lokalem Laden,
Gruppengeschenk und Danke-Liste.

## 3. Positionierung

> **Wishboxx ist die Geburtstagskiste fürs Handy – für Familien mit Kindern.**
> Ein Profil pro Kind, eine Kiste pro Anlass, ein Link für die WhatsApp-Gruppe.

### Differenzierende Features (umgesetzt im MVP)

1. **Kinderprofile statt Einzellisten** – Alter (aus Geburtsdatum), Geschlecht (optional),
   Interessen, **No-Gos** (z.B. „keine Süßigkeiten, kein Plastik“), **„hat schon“**, Größen.
   Einmal pflegen, für alle Anlässe nutzen.
2. **KI-Geschenkideen mit Leitplanken** – berücksichtigen Alter, Budget, No-Gos, „hat schon“ und
   bereits gelistete Wünsche. Datensparsam: Name und Geburtsdatum gehen nie an die KI.
3. **🧒 Kindermodus** – das Kind wischt selbst durch Vorschläge (👍/👎) – das digitale
   Äquivalent zum „durch den Laden gehen und aussuchen“.
4. **Budget-Rahmen für Gäste** – „10–15 €“ steht sichtbar auf der Liste, Filter „passend zum Budget“.
   Löst das Tabuthema elegant.
5. **Gäste ohne Account** – Name eintippen, reservieren, fertig. Eigene Reservierungen bleiben per
   Cookie sichtbar und stornierbar.
6. **Drei Überraschungsstufen** – Gastgeber sieht *nichts* / *nur Status* / *alles*. Nach dem
   Fest-Datum wird automatisch alles sichtbar.
7. **Gruppengeschenke** – mehrere Gäste sagen Beträge zu, Fortschrittsbalken. Geld fließt bewusst
   *außerhalb* der App (bar/PayPal-Hinweis) → keine Zahlungsdienste-Regulierung (ZAG/BaFin).
8. **Hybrid: Online + Laden vor Ort** – Wünsche können als „🏪 liegt im Laden XY“ markiert
   werden. Stärkt den lokalen Handel und erlaubt späteres B2B-Modell mit Spielwarenläden.
9. **WhatsApp-first Teilen** – fertiger Einladungstext inkl. Budget, ein Tap zum Teilen.
10. **Danke-Liste** – wer hat was geschenkt, Dankeskarten abhaken.
11. **Anlass-Kette** – offene Wünsche in die nächste Liste übernehmen (Geburtstag → Weihnachten),
    Erhaltenes landet in „hat schon“ → keine Doppelungen über Anlässe hinweg.

## 4. Monetarisierung

- **Affiliate-Links** (Kern): Partner im Admin-Bereich pflegbar (Amazon PartnerNet per
  `tag`-Parameter, AWIN/Tradedoubler/Belboon per Deeplink-Vorlage). Links werden **erst beim Klick**
  über `/go/:id` umgeschrieben → Partnerwechsel wirkt sofort auf alle Listen, Klicks werden pro
  Partner gezählt. Der Admin sieht zusätzlich „Shops ohne Partner“ als Akquise-Liste.
- **KI-Vorschläge** verlinken auf die Suche des bevorzugten Partners → jeder übernommene Vorschlag
  ist monetarisierbar.
- **Später:** Premium für Läden (eigene digitale Kisten, Click & Collect), Sponsored Ideas,
  Druckvorlagen für Einladungen/Dankeskarten.

## 5. Rechtliches (Checkliste vor Livegang)

- Kennzeichnung von Affiliate-Links (§ 5a UWG) – umgesetzt mit `*` + Footer-Hinweis, `rel="sponsored"`.
- Amazon PartnerNet-Bedingungen: keine Preise cachen/anzeigen ohne PA-API → Preise sind
  Nutzer-Eingaben/Schätzungen; ggf. auf PA-API umstellen.
- DSGVO: Kinderdaten minimal, AV-Vertrag mit KI-Anbieter, Datenschutzerklärung, Löschkonzept.
- Impressum, AGB.

## 6. Roadmap

**Umgesetzt (v0.2):** Erinnerungen an Gäste (E-Mail 7 und 2 Tage vorher + Kalendereintrag), „gekauft“-Häkchen,
Reservierungs-Link für jedes Gerät, Wünsche per Foto mit KI-Produkterkennung.

**Als Nächstes vorgemerkt – Feier-Zusage & Einladungskarte:**
- Gäste sagen auf demselben Link zu/ab („Wir kommen mit 1 Kind“, Allergien, Abholzeit)
- Gastgeber sieht Gästeliste, Zusagen und wer noch kein Geschenk reserviert hat
- Einladungskarte mit QR-Code (PDF zum Ausdrucken für Kita-Fächer + Bild für WhatsApp)
- Ziel: Wishboxx wird das Werkzeug für den ganzen Kindergeburtstag; jede Einladung wirbt neue Eltern

**Vorgemerkte Anpassungen (Backlog):**
- Zeitauswahl der Feier auf Viertelstunden begrenzen (15-Minuten-Schritte statt minütlich)

**Weitere Ideen:**
- Native App für Eltern (React Native/Expo) für App Store & Google Play: Push bei neuen Reservierungen,
  „Teilen → Wishboxx“ auch auf dem iPhone (die installierbare Web-App mit Teilen-Menü auf Android ist umgesetzt)
- Co-Admins (Partner/Oma können Liste mitpflegen)
- Laden-Portal: Spielwarenläden pflegen digitale Kisten, Reservierung → Abholung im Laden
- Produktdaten via Partner-APIs (Bilder, Live-Preise, Verfügbarkeit)

## Quellen

- [Wishbob im App Store](https://apps.apple.com/ch/app/wishbob/id1488915458?l=en-GB)
- [echo24: Geschenkekisten für Kindergeburtstage – praktisch oder lieblos?](https://www.echo24.de/welt/lieblos-geschenkekisten-fuer-kindergeburtstage-praktisch-oder-zr-93975106.html)
- [Wisebuy](https://apps.apple.com/de/app/wisebuy-smarte-wunschliste/id6755180447), [WishUpon](https://apps.apple.com/de/app/wishupon-shopping-wishlist/id1045928392), [bitte.kaufen](https://apps.apple.com/de/app/bitte-kaufen/id1550997406?l=en-GB), [StarSnoopy (appgefahren)](https://www.appgefahren.de/?p=205727), [My Wishlist Online](https://apps.apple.com/us/app/mein-online-wunschzettel/id1414843798)
- [Giftster Reviews](https://justuseapp.com/en/app/478126039/giftster-family-wish-lists/reviews), [Giftster vs. GiftList](https://giftlist.com/blog/giftster-vs-giftlist)
