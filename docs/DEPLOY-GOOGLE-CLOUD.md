# Wishboxx kostenlos auf Google Cloud betreiben

Du brauchst etwa 30 Minuten und einmalig deine Kreditkarte (zur Identitätsprüfung bei Google).
Am Ende läuft Wishboxx unter einer eigenen HTTPS-Adresse, aktualisiert sich nach jedem GitHub-Push
selbst, macht täglich ein Backup und verschickt Erinnerungen.

> **Kosten:** Der e2-micro-Server gehört zur „Always Free“-Stufe von Google – aber nur in den Regionen
> **us-west1, us-central1 oder us-east1** und mit **Standard-Festplatte bis 30 GB**. Die Bedingungen
> können sich ändern – bitte unter cloud.google.com/free prüfen. Lege in Schritt 1 unbedingt ein
> **Budget mit E-Mail-Warnung** an, dann merkst du sofort, falls doch etwas kostet (z.B. die öffentliche IP-Adresse).

---

## Schritt 0 – Image auf GitHub bereitstellen (passiert automatisch)

Bei jedem Push baut GitHub Actions das Docker-Image `ghcr.io/nrdlicht45/wishboxx`.
Prüfe unter **GitHub → Repository → Actions → „Docker-Image“**, dass der Lauf grün ist.

Ist das Repository privat, ist auch das Image privat. Entweder
- unter **GitHub → dein Profil → Packages → wishboxx → Package settings → Change visibility** auf *Public* stellen
  (der Code bleibt privat, nur das fertige Image ist abrufbar), **oder**
- beim Installieren einen GitHub-Token mit dem Recht `read:packages` angeben (das Skript fragt danach).

## Schritt 1 – Google Cloud einrichten

1. <https://console.cloud.google.com> mit deinem Google-Konto öffnen, Bedingungen akzeptieren.
2. Oben **„Projekt auswählen“ → „Neues Projekt“** → Name `wishboxx` → Erstellen.
3. **Abrechnung** aktivieren (Menü ☰ → Abrechnung → Rechnungskonto verknüpfen, Kreditkarte hinterlegen).
4. **Budget-Warnung:** Abrechnung → Budgets & Benachrichtigungen → Budget erstellen → Betrag **1 €**,
   Benachrichtigung bei 50 % / 100 % per E-Mail.

## Schritt 2 – Den Gratis-Server anlegen

Menü ☰ → **Compute Engine → VM-Instanzen** (beim ersten Mal „API aktivieren“ klicken) → **Instanz erstellen**:

| Feld | Wert |
|---|---|
| Name | `wishboxx` |
| Region | **us-central1 (Iowa)** (oder us-west1 / us-east1) |
| Maschinentyp | Reihe **E2** → **e2-micro** |
| Bootlaufwerk → Ändern | **Debian 12**, Typ **Standard nichtflüchtiger Speicher**, Größe **30 GB** |
| Firewall | ✅ HTTP-Traffic zulassen, ✅ HTTPS-Traffic zulassen |

→ **Erstellen**. Nach ca. 1 Minute steht in der Liste eine **externe IP-Adresse** – notieren.

**Feste IP (empfohlen):** Menü → VPC-Netzwerk → IP-Adressen → bei der externen IP der VM
„Zu statischer IP-Adresse hochstufen“. Sonst kann sich die IP nach einem Neustart ändern.

## Schritt 3 – Adresse (Domain) einrichten

**Kostenlos mit DuckDNS:**
1. <https://www.duckdns.org> → mit Google anmelden.
2. Subdomain eintragen, z.B. `wishboxx` → *add domain*.
3. Bei *current ip* die externe IP aus Schritt 2 eintragen → *update ip*.
4. Deine Adresse ist jetzt `wishboxx.duckdns.org`.

**Oder eigene Domain** (z.B. `wishboxx.de` für ca. 1 €/Jahr im ersten Jahr bei einem Domain-Anbieter):
einen **A-Record** auf die externe IP setzen.

## Schritt 4 – Installieren

1. In der VM-Liste beim Server auf **SSH** klicken – ein Terminal öffnet sich im Browser.
2. Das Installationsskript holen. Bei öffentlichem Repository:
   ```bash
   curl -fsSLO https://raw.githubusercontent.com/nrdlicht45/Wishboxx/main/deploy/install.sh
   ```
   (Solange der Code noch nicht in `main` gemergt ist, statt `main` den Branch-Namen
   `claude/geburtstagskisten-wishlist-app-2vq1zf` in die Adresse einsetzen.)
   Bei privatem Repository: auf GitHub die Datei `deploy/install.sh` öffnen → *Raw* → Inhalt kopieren,
   im SSH-Fenster `nano install.sh` eingeben, einfügen, mit `Strg+O`, `Enter`, `Strg+X` speichern.
3. Starten:
   ```bash
   sudo bash install.sh
   ```
4. Das Skript fragt nach:
   - **Domain** – z.B. `wishboxx.duckdns.org`
   - **Admin-E-Mail** – mit dieser E-Mail registrierst du dich danach und bist Admin
   - **Claude API-Key** – optional, für KI-Ideen und Foto-Erkennung (console.anthropic.com)
   - **SMTP** – optional, für Bestätigungs- und Erinnerungs-Mails (z.B. Brevo: smtp-relay.brevo.com, Port 587)

Nach 1–2 Minuten ist Wishboxx unter `https://deine-domain` erreichbar. 🎉

## Schritt 5 – Erste Schritte in der App

1. Mit der Admin-E-Mail registrieren.
2. **/admin** → beim Amazon-Partner deine PartnerNet-ID (z.B. `deinname-21`) eintragen, *aktiv* anhaken, speichern.
3. Mit dem **Link-Tester** prüfen, dass Amazon-Links den `tag=` bekommen.

## Was automatisch passiert

| Wann | Was |
|---|---|
| bei jedem GitHub-Push | neues Image wird gebaut |
| täglich 04:20 | Server holt das neueste Image und startet neu |
| täglich 03:10 | Datenbank-Backup nach `/opt/wishboxx/data/backups` (14 Tage) |
| täglich 08:15 | Erinnerungs-Mails an Gäste |
| immer | HTTPS-Zertifikat wird automatisch erneuert, Absturz → Neustart |

## Nützliche Befehle (im SSH-Fenster)

```bash
cd /opt/wishboxx
sudo docker compose logs -f app          # Live-Log der App
sudo docker compose pull && sudo docker compose up -d   # sofort aktualisieren
sudo bash ~/install.sh                   # Einstellungen ändern (fragt erneut, behält Werte)
sudo cat /var/log/wishboxx-cron.log      # Erinnerungen & Backups prüfen
```

**Backup auf den eigenen Rechner holen:** im SSH-Fenster oben rechts ⚙️ → *Datei herunterladen* →
`/opt/wishboxx/data/backups/wishboxx-JJJJ-MM-TT.db`.

## Grenzen des Gratis-Servers

- 1 GB RAM (plus 2 GB Swap, richtet das Skript ein) – reicht für Testphase und erste hundert Familien.
- Server steht in den USA – Seiten laden ca. 0,1 s langsamer als von einem deutschen Server.
  Für den echten Start ist ein Server in Frankfurt (europe-west3, ca. 7 €/Monat) aus Datenschutzsicht besser.
- Ausgehender Traffic: Das Gratis-Kontingent ist begrenzt (siehe cloud.google.com/free); für Tests unkritisch.
