# 🎁 Wishboxx – die digitale Geburtstagskiste

Wunschlisten-App für Familien mit Kindern: Das Geburtstagskind „packt“ seine Kiste, Gäste suchen
sich per Link ein Geschenk aus und reservieren es – ohne Account. Dazu KI-Geschenkideen, die nach
Alter, Geschlecht, Interessen und No-Gos eingegrenzt sind, Gruppengeschenke, Danke-Liste und
automatische Affiliate-Monetarisierung.

➡️ Warum es Wishboxx gibt und was es anders macht als Wishbob & Co.: [docs/MARKTANALYSE.md](docs/MARKTANALYSE.md)

## Features

**Für Eltern**
- Mehrere Kinder-/Personenprofile (Alter, Interessen, No-Gos, „hat schon“, Größen)
- Mehrere Listen je Anlass: Geburtstag, Weihnachten, Ostern, Einschulung, Kommunion …
- Wünsche per Produktlink (Titel/Bild/Preis werden automatisch geladen), als „liegt im Laden“ oder aus KI-Vorschlägen
- ✨ KI-Ideen (Claude) mit Leitplanken + 🧒 Kindermodus zum Wischen
- Budget-Rahmen pro Geschenk, Gruppengeschenke mit Fortschrittsbalken
- Überraschungsmodus in 3 Stufen, WhatsApp-Teilen mit fertigem Einladungstext
- Danke-Liste, „Erhaltenes → hat schon“, offene Wünsche in nächste Liste übernehmen

**Für Gäste**
- Kein Account, keine App: Link öffnen → „Ich schenke das“ → Name → fertig
- Filter „passend zum Budget“, eigene Reservierungen stornierbar

**Für den Betreiber (Admin)**
- Affiliate-Partner verwalten (Domains, `?tag=`-Parameter oder Deeplink-Vorlage mit `{url}`, Priorität)
- Automatisches Umschreiben aller Produktlinks beim Klick (`/go/:id`) inkl. Klick-Tracking
- KI-Vorschläge verlinken auf die Suche des bevorzugten Partners (`{query}`-Vorlage)
- Statistik, „Shops ohne Partner“, Link-Tester

## Tech-Stack

Next.js 15 (App Router, Server Actions) · React 19 · TypeScript · Tailwind CSS 4 · SQLite (better-sqlite3) · Anthropic SDK (Claude)

## Schnellstart

```bash
npm install
cp .env.example .env.local   # optional ANTHROPIC_API_KEY und ADMIN_EMAIL setzen
npm run dev                  # http://localhost:3000
```

- Der **erste registrierte Nutzer** wird Admin (oder der mit `ADMIN_EMAIL`).
- Unter **/admin** die Partner-ID beim Amazon-Partner eintragen und „aktiv“ setzen.
- Ohne `ANTHROPIC_API_KEY` liefert ein eingebauter Katalog regelbasierte Vorschläge.

```bash
npm test        # Unit-Tests (Affiliate-Engine, Metadaten, Katalog)
npm run lint    # TypeScript-Check
npm run build   # Produktions-Build
```

## Architektur

```
src/
  lib/
    db.ts           SQLite-Schema + Default-Partner
    auth.ts         E-Mail/Passwort (scrypt), Session-Cookies
    affiliate.ts    Partner-Matching & Link-Umschreibung (rein, getestet)
    suggestions.ts  KI-Vorschläge via Claude (structured output) + Fallback
    catalog.ts      regelbasierter Ideenkatalog
    metadata.ts     Open-Graph-Parser mit SSRF-Schutz
    repo.ts         Datenzugriff & Domain-Logik
  app/
    actions.ts      alle Server Actions
    dashboard, recipients, lists/[id], lists/[id]/ideas   Eltern-Bereich
    k/[token]       öffentliche Gäste-Ansicht
    go/[itemId]     Affiliate-Redirect
    admin           Betreiber-Bereich
```

## Datenschutz

An die KI werden nur Alter, Geschlecht, Interessen, No-Gos, „hat schon“ und Listentitel
übermittelt – nie Namen oder Geburtsdaten. Gäste-Listen sind per `noindex` vor Suchmaschinen
geschützt; der Link kann jederzeit zurückgesetzt werden.
