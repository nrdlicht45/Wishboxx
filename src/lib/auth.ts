import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "./db";

export interface User {
  id: number;
  email: string;
  name: string;
  is_admin: number;
  is_guest: number;
}

const COOKIE = "wb_session";
const SESSION_DAYS = 30;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return expected.length === candidate.length && crypto.timingSafeEqual(candidate, expected);
}

export function randomToken(bytes = 24): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

export async function createSession(userId: number) {
  const token = randomToken(32);
  const expires = new Date(Date.now() + SESSION_DAYS * 864e5);
  getDb()
    .prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)")
    .run(token, userId, expires.toISOString());
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires,
    path: "/",
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) getDb().prepare("DELETE FROM sessions WHERE token = ?").run(token);
  jar.delete(COOKIE);
}

export async function getCurrentUser(): Promise<User | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const row = getDb()
    .prepare(
      `SELECT u.id, u.email, u.name, u.is_admin, u.is_guest, s.expires_at FROM sessions s
       JOIN users u ON u.id = s.user_id WHERE s.token = ?`,
    )
    .get(token) as (User & { expires_at: string }) | undefined;
  if (!row || new Date(row.expires_at) < new Date()) return null;
  return { id: row.id, email: row.email, name: row.name, is_admin: row.is_admin, is_guest: row.is_guest };
}

/** Gast-Konto für „Box in 60 Sekunden“ – ohne E-Mail, später per Login-Link sicherbar. */
export async function getOrCreateGuest(name: string): Promise<User> {
  const existing = await getCurrentUser();
  if (existing) return existing;
  const db = getDb();
  const info = db
    .prepare("INSERT INTO users (email, name, password_hash, is_guest) VALUES (?, ?, '', 1)")
    .run(`gast-${randomToken(12)}@wishboxx.invalid`, name || "Gast");
  await createSession(Number(info.lastInsertRowid));
  return (await getCurrentUser())!;
}

const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

/** Erstellt einen Einmal-Login-Link (15 Minuten gültig). Gespeichert wird nur der Hash. */
export function createLoginToken(opts: { email: string; name?: string; guestUserId?: number | null; next?: string }): string {
  const token = randomToken(32);
  getDb()
    .prepare(
      `INSERT INTO login_tokens (token_hash, email, name, guest_user_id, next, expires_at) VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      sha256(token),
      opts.email.toLowerCase(),
      opts.name ?? "",
      opts.guestUserId ?? null,
      opts.next ?? "/dashboard",
      new Date(Date.now() + 15 * 60e3).toISOString(),
    );
  return token;
}

/**
 * Löst einen Login-Link ein: legt das Konto bei Bedarf an, übernimmt Gast-Daten
 * (Boxen und Kinder) und startet die Sitzung. Gibt das Rücksprungziel zurück.
 */
export async function redeemLoginToken(token: string): Promise<string | null> {
  const db = getDb();
  const row = db.prepare("SELECT * FROM login_tokens WHERE token_hash = ?").get(sha256(token)) as
    | { token_hash: string; email: string; name: string; guest_user_id: number | null; next: string; expires_at: string; used: number }
    | undefined;
  if (!row || row.used || new Date(row.expires_at) < new Date()) return null;

  const userId = db.transaction(() => {
    db.prepare("UPDATE login_tokens SET used = 1 WHERE token_hash = ?").run(row.token_hash);
    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(row.email) as { id: number } | undefined;
    const guest = row.guest_user_id
      ? (db.prepare("SELECT id, name FROM users WHERE id = ? AND is_guest = 1").get(row.guest_user_id) as { id: number; name: string } | undefined)
      : undefined;
    const hasAdmin = db.prepare("SELECT 1 FROM users WHERE is_admin = 1").get();
    const adminEmail = (process.env.ADMIN_EMAIL || "").toLowerCase();
    const shouldBeAdmin = adminEmail ? row.email === adminEmail : !hasAdmin;

    if (existing) {
      if (guest) {
        // Gast-Daten ins bestehende Konto übernehmen
        db.prepare("UPDATE recipients SET user_id = ? WHERE user_id = ?").run(existing.id, guest.id);
        db.prepare("UPDATE lists SET user_id = ? WHERE user_id = ?").run(existing.id, guest.id);
        db.prepare("DELETE FROM users WHERE id = ?").run(guest.id);
      }
      return existing.id;
    }
    if (guest) {
      db.prepare("UPDATE users SET email = ?, name = COALESCE(NULLIF(?, ''), name), is_guest = 0, is_admin = ? WHERE id = ?").run(
        row.email, row.name, shouldBeAdmin ? 1 : 0, guest.id,
      );
      return guest.id;
    }
    const name = row.name || row.email.split("@")[0];
    return Number(
      db.prepare("INSERT INTO users (email, name, password_hash, is_admin) VALUES (?, ?, '', ?)").run(row.email, name, shouldBeAdmin ? 1 : 0)
        .lastInsertRowid,
    );
  })();

  await createSession(userId);
  return row.next.startsWith("/") && !row.next.startsWith("//") ? row.next : "/dashboard";
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (!user.is_admin) redirect("/dashboard");
  return user;
}
