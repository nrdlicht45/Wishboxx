import { getDb } from "./db";
import type { AffiliateProvider } from "./affiliate";

export const OCCASIONS: Record<string, string> = {
  birthday: "Geburtstag",
  christmas: "Weihnachten",
  easter: "Ostern",
  school: "Einschulung",
  communion: "Kommunion / Konfirmation",
  baby: "Geburt / Taufe",
  other: "Sonstiges",
};

export const GENDERS: Record<string, string> = {
  none: "keine Angabe",
  girl: "Mädchen",
  boy: "Junge",
  diverse: "divers",
};

/** reveal_mode steuert, was der Listen-Besitzer über Reservierungen sieht. */
export const REVEAL_MODES: Record<string, string> = {
  surprise: "Überraschung – ich sehe bis nach dem Fest nichts",
  status: "Nur Status – ich sehe, dass etwas reserviert ist, aber nicht von wem",
  full: "Alles – ich sehe, wer was schenkt",
};

export interface Recipient {
  id: number;
  user_id: number;
  name: string;
  birthdate: string | null;
  gender: string;
  interests: string;
  avoid: string;
  owned: string;
  sizes: string;
  age_hint: number | null;
}

/** Alter aus Geburtsdatum, sonst die Angabe aus dem Schnellstart. */
export const recipientAge = (r: Pick<Recipient, "birthdate" | "age_hint"> | undefined | null): number | null =>
  r ? ageFromBirthdate(r.birthdate) ?? r.age_hint ?? null : null;

export interface List {
  id: number;
  user_id: number;
  recipient_id: number | null;
  title: string;
  occasion: string;
  event_date: string | null;
  description: string;
  share_token: string;
  reveal_mode: string;
  budget_min: number | null;
  budget_max: number | null;
  shop_name: string;
  shop_address: string;
  payment_hint: string;
  archived: number;
}

export interface Item {
  id: number;
  list_id: number;
  title: string;
  description: string;
  url: string | null;
  image_url: string | null;
  price: number | null;
  quantity: number;
  priority: number;
  source: string;
  is_group_gift: number;
  sort: number;
}

export interface Reservation {
  id: number;
  item_id: number;
  kind: "reserve" | "pledge";
  guest_name: string;
  guest_email: string | null;
  amount: number | null;
  message: string;
  token: string;
  thanked: number;
  purchased: number;
  reminder_stage: number;
  created_at: string;
}

export interface ItemWithStatus extends Item {
  reserved_count: number;
  pledged_sum: number;
  reservations: Reservation[];
}

export function ageFromBirthdate(birthdate: string | null, at = new Date()): number | null {
  if (!birthdate) return null;
  const b = new Date(birthdate);
  if (isNaN(b.getTime())) return null;
  let age = at.getFullYear() - b.getFullYear();
  const m = at.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && at.getDate() < b.getDate())) age--;
  return age;
}

export function eventIsOver(list: Pick<List, "event_date">): boolean {
  if (!list.event_date) return false;
  const end = new Date(list.event_date);
  end.setHours(23, 59, 59);
  return end < new Date();
}

// ---------- Recipients ----------
export function getRecipients(userId: number): Recipient[] {
  return getDb().prepare("SELECT * FROM recipients WHERE user_id = ? ORDER BY name").all(userId) as Recipient[];
}

export function getRecipient(id: number, userId: number): Recipient | undefined {
  return getDb().prepare("SELECT * FROM recipients WHERE id = ? AND user_id = ?").get(id, userId) as
    | Recipient
    | undefined;
}

// ---------- Lists ----------
export function getLists(userId: number) {
  return getDb()
    .prepare(
      `SELECT l.*, r.name AS recipient_name,
        (SELECT COUNT(*) FROM items i WHERE i.list_id = l.id) AS item_count,
        (SELECT COUNT(*) FROM reservations res JOIN items i ON i.id = res.item_id WHERE i.list_id = l.id) AS reservation_count
       FROM lists l LEFT JOIN recipients r ON r.id = l.recipient_id
       WHERE l.user_id = ? ORDER BY l.archived, COALESCE(l.event_date, '9999') , l.id DESC`,
    )
    .all(userId) as (List & { recipient_name: string | null; item_count: number; reservation_count: number })[];
}

export function getList(id: number, userId: number): List | undefined {
  return getDb().prepare("SELECT * FROM lists WHERE id = ? AND user_id = ?").get(id, userId) as List | undefined;
}

export function getListByToken(token: string): List | undefined {
  return getDb().prepare("SELECT * FROM lists WHERE share_token = ? AND archived = 0").get(token) as
    | List
    | undefined;
}

export function getItemsWithStatus(listId: number): ItemWithStatus[] {
  const db = getDb();
  const items = db.prepare("SELECT * FROM items WHERE list_id = ? ORDER BY priority, sort, id").all(listId) as Item[];
  const res = db
    .prepare(
      `SELECT r.* FROM reservations r JOIN items i ON i.id = r.item_id WHERE i.list_id = ? ORDER BY r.created_at`,
    )
    .all(listId) as Reservation[];
  return items.map((it) => {
    const own = res.filter((r) => r.item_id === it.id);
    return {
      ...it,
      reservations: own,
      reserved_count: own.filter((r) => r.kind === "reserve").length,
      pledged_sum: own.filter((r) => r.kind === "pledge").reduce((s, r) => s + (r.amount ?? 0), 0),
    };
  });
}

export function isItemTaken(it: ItemWithStatus): boolean {
  if (it.is_group_gift) return it.price != null && it.pledged_sum >= it.price;
  return it.reserved_count >= it.quantity;
}

// ---------- Affiliate ----------
export function getProviders(): AffiliateProvider[] {
  return getDb().prepare("SELECT * FROM affiliate_providers ORDER BY priority, id").all() as AffiliateProvider[];
}

export function getActiveProviders(): AffiliateProvider[] {
  return getProviders().filter((p) => p.active);
}

export interface ReservationContext {
  reservation: Reservation;
  item: Item;
  list: List;
  recipientName: string | null;
}

/** Reservierung inkl. Wunsch und Liste über den geheimen Gast-Token. */
export function getReservationByToken(token: string): ReservationContext | undefined {
  const db = getDb();
  const reservation = db.prepare("SELECT * FROM reservations WHERE token = ?").get(token) as Reservation | undefined;
  if (!reservation) return undefined;
  const item = db.prepare("SELECT * FROM items WHERE id = ?").get(reservation.item_id) as Item;
  const list = db.prepare("SELECT * FROM lists WHERE id = ?").get(item.list_id) as List;
  const rec = list.recipient_id
    ? (db.prepare("SELECT name FROM recipients WHERE id = ?").get(list.recipient_id) as { name: string } | undefined)
    : undefined;
  return { reservation, item, list, recipientName: rec?.name ?? null };
}

/** Kennzahlen für die Familien-Zentrale (Startseite). */
export function getListStats(listId: number) {
  const items = getItemsWithStatus(listId);
  const res = items.flatMap((i) => i.reservations);
  const groups = items.filter((i) => i.is_group_gift && i.price);
  return {
    items: items.length,
    taken: items.filter((i) => isItemTaken(i)).length,
    reservations: res.length,
    purchased: res.filter((r) => r.purchased).length,
    reminded: res.filter((r) => r.reminder_stage > 0 && !r.purchased).length,
    groups: groups.map((g) => ({ title: g.title, pct: Math.min(100, Math.round((g.pledged_sum / g.price!) * 100)) })),
  };
}
