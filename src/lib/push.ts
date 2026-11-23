import * as webpush from "web-push";
import { getDb } from "./db";
import { appUrl } from "./format";

/**
 * Web Push für Boxx-Inhaber. Die VAPID-Schlüssel erzeugt die App beim ersten Bedarf selbst
 * und speichert sie in der Datenbank – keine Einrichtung nötig (oder per VAPID_* Umgebungsvariablen).
 */
function vapid(): { publicKey: string; privateKey: string } {
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    return { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
  }
  const db = getDb();
  const row = db.prepare("SELECT value FROM settings WHERE key = 'vapid'").get() as { value: string } | undefined;
  if (row) return JSON.parse(row.value);
  const keys = webpush.generateVAPIDKeys();
  db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES ('vapid', ?)").run(JSON.stringify(keys));
  return JSON.parse((db.prepare("SELECT value FROM settings WHERE key = 'vapid'").get() as { value: string }).value);
}

export function vapidPublicKey(): string {
  return vapid().publicKey;
}

export function hasPush(userId: number): boolean {
  return !!getDb().prepare("SELECT 1 FROM push_subscriptions WHERE user_id = ?").get(userId);
}

export interface PushPayload {
  title: string;
  body: string;
  url: string;
  tag?: string;
}

/** Schickt eine Push-Nachricht an alle Geräte eines Nutzers. Abgelaufene Abos werden entfernt. */
export async function pushToUser(userId: number, payload: PushPayload): Promise<number> {
  const db = getDb();
  const subs = db.prepare("SELECT * FROM push_subscriptions WHERE user_id = ?").all(userId) as {
    id: number; endpoint: string; p256dh: string; auth: string;
  }[];
  if (!subs.length) return 0;
  const { publicKey, privateKey } = vapid();
  const subject = process.env.VAPID_SUBJECT || (process.env.MAIL_FROM?.match(/<(.+)>/)?.[1] ? `mailto:${process.env.MAIL_FROM.match(/<(.+)>/)![1]}` : appUrl());
  let sent = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify({ ...payload, url: payload.url.startsWith("http") ? payload.url : appUrl() + payload.url }),
        { vapidDetails: { subject, publicKey, privateKey }, TTL: 60 * 60 * 24 },
      );
      sent++;
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) db.prepare("DELETE FROM push_subscriptions WHERE id = ?").run(s.id);
      else console.error("Push fehlgeschlagen", status ?? err);
    }
  }
  return sent;
}
