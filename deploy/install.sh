#!/usr/bin/env bash
# Wishboxx – Installation auf einem frischen Debian/Ubuntu-Server (z.B. Google Cloud e2-micro).
# Aufruf auf dem Server:  sudo bash install.sh
# Kann gefahrlos erneut ausgeführt werden (z.B. um Einstellungen zu ändern).
set -euo pipefail

APP_DIR=/opt/wishboxx
IMAGE_DEFAULT=ghcr.io/nrdlicht45/wishboxx:latest

[ "$(id -u)" -eq 0 ] || { echo "Bitte mit sudo ausführen: sudo bash install.sh"; exit 1; }

ask() { # ask VAR "Frage" "Vorgabe"
  local cur="${!1:-$3}" val
  read -rp "$2 [${cur}]: " val </dev/tty
  printf -v "$1" '%s' "${val:-$cur}"
}

# Vorhandene Einstellungen übernehmen
[ -f "$APP_DIR/.env" ] && set -a && . "$APP_DIR/.env" && set +a

echo "== 1/6 Zeitzone & Auslagerungsspeicher =="
timedatectl set-timezone Europe/Berlin || true
if ! swapon --show | grep -q .; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile >/dev/null && swapon /swapfile
  echo "/swapfile none swap sw 0 0" >> /etc/fstab
  echo "2 GB Swap angelegt (wichtig bei 1 GB RAM)."
fi

echo "== 2/6 Docker =="
if ! command -v docker >/dev/null; then
  apt-get update -qq && apt-get install -y -qq curl ca-certificates >/dev/null
  curl -fsSL https://get.docker.com | sh
fi
systemctl enable --now docker >/dev/null

echo "== 3/6 Einstellungen =="
ask DOMAIN "Domain der App (z.B. wishboxx.duckdns.org)" ""
ask ADMIN_EMAIL "E-Mail des Admins (wird beim Registrieren Admin)" ""
ask ANTHROPIC_API_KEY "Claude API-Key für KI-Ideen & Foto-Erkennung (leer = ohne KI)" ""
ask SMTP_HOST "SMTP-Server für E-Mails (leer = keine Mails)" ""
if [ -n "${SMTP_HOST}" ]; then
  ask SMTP_PORT "SMTP-Port" "587"
  ask SMTP_USER "SMTP-Benutzer" ""
  ask SMTP_PASS "SMTP-Passwort" ""
  ask MAIL_FROM "Absender" "Wishboxx <noreply@${DOMAIN}>"
fi
ask WISHBOXX_IMAGE "Docker-Image" "$IMAGE_DEFAULT"
CRON_SECRET="${CRON_SECRET:-$(openssl rand -hex 24)}"
[ -n "$DOMAIN" ] || { echo "Domain wird benötigt."; exit 1; }

mkdir -p "$APP_DIR/data"
chown 1000:1000 "$APP_DIR/data"   # Benutzer "node" im Container
umask 077
cat > "$APP_DIR/.env" <<EOF
DOMAIN=${DOMAIN}
APP_URL=https://${DOMAIN}
ADMIN_EMAIL=${ADMIN_EMAIL}
ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
AI_MODEL=${AI_MODEL:-claude-opus-5-5}
SMTP_HOST=${SMTP_HOST}
SMTP_PORT=${SMTP_PORT:-587}
SMTP_USER=${SMTP_USER:-}
SMTP_PASS=${SMTP_PASS:-}
MAIL_FROM=${MAIL_FROM:-}
CRON_SECRET=${CRON_SECRET}
WISHBOXX_IMAGE=${WISHBOXX_IMAGE}
TZ=Europe/Berlin
EOF
umask 022

cat > "$APP_DIR/docker-compose.yml" <<'EOF'
services:
  app:
    image: ${WISHBOXX_IMAGE}
    restart: unless-stopped
    env_file: .env
    environment:
      DATABASE_PATH: /data/wishboxx.db
    volumes:
      - ./data:/data
    ports:
      - "127.0.0.1:3000:3000"
    mem_limit: 600m
  caddy:
    image: caddy:2
    restart: unless-stopped
    environment:
      DOMAIN: ${DOMAIN}
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    depends_on: [app]
    mem_limit: 100m
volumes:
  caddy_data:
  caddy_config:
EOF

cat > "$APP_DIR/Caddyfile" <<'EOF'
{$DOMAIN} {
	encode gzip
	reverse_proxy app:3000
	header {
		Strict-Transport-Security "max-age=31536000"
		X-Content-Type-Options nosniff
		Referrer-Policy strict-origin-when-cross-origin
	}
}
EOF

echo "== 4/6 Image laden =="
cd "$APP_DIR"
if ! docker compose pull 2>/dev/null; then
  echo "Das Image ist privat. Bitte GitHub-Benutzername und ein Token mit Recht 'read:packages' angeben"
  echo "(github.com → Settings → Developer settings → Personal access tokens → Tokens (classic))."
  read -rp "GitHub-Benutzer: " GHU </dev/tty
  read -rsp "Token: " GHT </dev/tty; echo
  echo "$GHT" | docker login ghcr.io -u "$GHU" --password-stdin
  docker compose pull
fi

echo "== 5/6 Starten =="
docker compose up -d

echo "== 6/6 Tägliche Aufgaben =="
cat > /etc/cron.d/wishboxx <<EOF
SHELL=/bin/bash
# 08:15 Erinnerungs-Mails an Gäste
15 8 * * * root curl -fsS -H "Authorization: Bearer ${CRON_SECRET}" http://127.0.0.1:3000/api/cron/reminders >> /var/log/wishboxx-cron.log 2>&1
# 03:10 Datenbank-Backup (14 Tage aufbewahrt, unter $APP_DIR/data/backups)
10 3 * * * root cd $APP_DIR && docker compose exec -T app node scripts/backup.mjs /data/backups >> /var/log/wishboxx-cron.log 2>&1
# 04:20 Updates holen (neues Image nach jedem Push) und alte Images aufräumen
20 4 * * * root cd $APP_DIR && docker compose pull -q && docker compose up -d && docker image prune -f >> /var/log/wishboxx-cron.log 2>&1
EOF
chmod 644 /etc/cron.d/wishboxx

echo
echo "✅ Fertig! In 1–2 Minuten erreichbar unter: https://${DOMAIN}"
echo "   Als Erstes mit ${ADMIN_EMAIL:-der Admin-E-Mail} registrieren, dann unter /admin die Partner-IDs eintragen."
echo "   Logs:    cd $APP_DIR && docker compose logs -f"
echo "   Update:  cd $APP_DIR && docker compose pull && docker compose up -d"
