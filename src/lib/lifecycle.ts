import { getDb } from "./db";
import { getItemsWithStatus, type List } from "./repo";
import { ARCHIVE_AFTER_DAYS, CLOSE_AFTER_DAYS, daysSince } from "./yearly";
import { pushToUser, hasPush } from "./push";
import { sendMail } from "./mailer";
import { appUrl } from "./format";

/** Offene Wünsche (ohne Reservierung) → Merkzettel des Kindes, aus der Boxx entfernen. */
export function moveOpenToMemo(listId: number, recipientId: number): number {
  const open = getItemsWithStatus(listId).filter((i) => i.reservations.length === 0);
  const db = getDb();
  const ins = db.prepare("INSERT INTO memos (recipient_id, title, url, from_item) VALUES (?, ?, ?, ?)");
  const del = db.prepare("DELETE FROM items WHERE id = ?");
  db.transaction(() =>
    open.forEach((i) => {
      ins.run(recipientId, i.title, i.url, "offen geblieben");
      del.run(i.id);
    }),
  )();
  return open.length;
}

async function notifyOwner(list: List & { email: string; is_guest: number }, title: string, body: string, url: string) {
  const pushed = await pushToUser(list.user_id, { title, body, url, tag: `after-${list.id}` });
  if (pushed > 0) return true;
  if (hasPush(list.user_id) || list.is_guest) return false;
  return sendMail(list.email, title, `Hallo!\n\n${body}\n\n${appUrl()}${url}\n\nDein Wishboxx-Team`);
}

/**
 * Nach dem Fest (täglich):
 *  Tag 1: „Wie war's? N Wünsche offen – verschieben oder merken?“
 *  Tag 3: Gäste-Link schließt (passiert automatisch über das Datum)
 *  Tag 27: Vorwarnung „in 3 Tagen archiviert“
 *  Tag 30: offene Wünsche → Merkzettel, Boxx archivieren
 */
export async function afterEventJob(): Promise<{ reminded: number; warned: number; archived: number }> {
  const db = getDb();
  const lists = db
    .prepare(
      `SELECT l.*, u.email, u.is_guest FROM lists l JOIN users u ON u.id = l.user_id
       WHERE l.archived = 0 AND l.event_date IS NOT NULL AND l.event_date < date('now')`,
    )
    .all() as (List & { email: string; is_guest: number })[];
  const out = { reminded: 0, warned: 0, archived: 0 };
  for (const l of lists) {
    const since = daysSince(l.event_date)!;
    const open = getItemsWithStatus(l.id).filter((i) => i.reservations.length === 0).length;
    const memoText = l.recipient_id ? "auf den Merkzettel fürs nächste Mal" : "in eine andere Boxx";

    if (since >= ARCHIVE_AFTER_DAYS) {
      if (l.recipient_id) moveOpenToMemo(l.id, l.recipient_id);
      db.prepare("UPDATE lists SET archived = 1, after_stage = 3 WHERE id = ?").run(l.id);
      out.archived++;
      continue;
    }
    if (since >= ARCHIVE_AFTER_DAYS - 3 && l.after_stage < 2) {
      const ok = await notifyOwner(
        l,
        `${l.title}: wird in 3 Tagen archiviert`,
        open
          ? `${open} ${open === 1 ? "Wunsch ist" : "Wünsche sind"} noch offen. Wenn du nichts tust, landen sie automatisch ${memoText} – oder du verschiebst sie jetzt.`
          : "Alles erledigt – die Boxx wandert bald ins Archiv. Danke-Liste schon abgehakt?",
        `/lists/${l.id}#offen`,
      );
      if (ok) {
        db.prepare("UPDATE lists SET after_stage = 2 WHERE id = ?").run(l.id);
        out.warned++;
      }
      continue;
    }
    if (since >= 1 && l.after_stage < 1) {
      const ok = await notifyOwner(
        l,
        `Wie war ${l.title}?`,
        (open
          ? `${open} ${open === 1 ? "Wunsch ist" : "Wünsche sind"} offen geblieben – mit einem Tipp ${memoText} oder in Weihnachten & Co. verschieben. `
          : "Alle Wünsche wurden erfüllt! ") + `Die Danke-Liste ist fertig. Der Gäste-Link schließt in ${Math.max(0, CLOSE_AFTER_DAYS - since)} ${CLOSE_AFTER_DAYS - since === 1 ? "Tag" : "Tagen"}.`,
        `/lists/${l.id}#offen`,
      );
      if (ok) {
        db.prepare("UPDATE lists SET after_stage = 1 WHERE id = ?").run(l.id);
        out.reminded++;
      }
    }
  }
  return out;
}
