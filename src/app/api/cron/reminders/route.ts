import { getDb } from "@/lib/db";
import { sendMail } from "@/lib/mailer";
import { reminderDue, daysUntil } from "@/lib/reminders";
import { appUrl, dateDe } from "@/lib/format";
import { pushToUser, hasPush } from "@/lib/push";
import { ownerSummary } from "@/lib/summary";

/** Erinnerung an die Boxx-Inhaberin: 14, 7 und 2 Tage vor dem Fest. */
const OWNER_STAGES = [
  { stage: 1, daysBefore: 14 },
  { stage: 2, daysBefore: 7 },
  { stage: 3, daysBefore: 2 },
];

async function remindOwners(): Promise<number> {
  const db = getDb();
  const lists = db
    .prepare(
      `SELECT l.id, l.title, l.event_date, l.owner_reminder_stage, l.user_id, u.email, u.is_guest
       FROM lists l JOIN users u ON u.id = l.user_id
       WHERE l.archived = 0 AND l.event_date IS NOT NULL AND l.event_date >= date('now')`,
    )
    .all() as { id: number; title: string; event_date: string; owner_reminder_stage: number; user_id: number; email: string; is_guest: number }[];
  let sent = 0;
  for (const l of lists) {
    const days = daysUntil(l.event_date);
    let due = 0;
    for (const st of OWNER_STAGES) if (days <= st.daysBefore && l.owner_reminder_stage < st.stage) due = st.stage;
    if (!due) continue;
    const when = days === 0 ? "heute" : days === 1 ? "morgen" : `in ${days} Tagen`;
    const summary = ownerSummary(l.id);
    const pushed = await pushToUser(l.user_id, {
      title: `${l.title} ist ${when}`,
      body: `${summary}. Jetzt kurz prüfen?`,
      url: `/lists/${l.id}`,
      tag: `owner-${l.id}`,
    });
    let ok = pushed > 0;
    if (!ok && !hasPush(l.user_id) && !l.is_guest) {
      ok = await sendMail(
        l.email,
        `${l.title} ist ${when} – kurzer Stand`,
        `Hallo!\n\n„${l.title}“ ist ${when} (${dateDe(l.event_date)}).\nStand: ${summary}.\n\nAlles im Blick: ${appUrl()}/lists/${l.id}\n\nDein Wishboxx-Team`,
      );
    }
    if (ok) {
      db.prepare("UPDATE lists SET owner_reminder_stage = ? WHERE id = ?").run(due, l.id);
      sent++;
    }
  }
  return sent;
}

/**
 * Täglich aufrufen (Railway Cron, GitHub Actions o.ä.):
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://…/api/cron/reminders
 * Schickt Gästen, die noch nicht „gekauft“ markiert haben, 7 und 2 Tage vor der Feier eine Erinnerung.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT r.id, r.token, r.guest_name, r.guest_email, r.kind, r.amount, r.purchased, r.reminder_stage,
              i.title AS item_title, l.title AS list_title, l.event_date, l.payment_hint
       FROM reservations r JOIN items i ON i.id = r.item_id JOIN lists l ON l.id = i.list_id
       WHERE r.purchased = 0 AND r.guest_email IS NOT NULL AND l.archived = 0 AND l.event_date >= date('now')`,
    )
    .all() as {
    id: number; token: string; guest_name: string; guest_email: string; kind: string; amount: number | null;
    purchased: number; reminder_stage: number; item_title: string; list_title: string; event_date: string; payment_hint: string;
  }[];

  const update = db.prepare("UPDATE reservations SET reminder_stage = ? WHERE id = ?");
  let sent = 0;
  for (const r of rows) {
    const stage = reminderDue({
      eventDate: r.event_date,
      purchased: !!r.purchased,
      currentStage: r.reminder_stage,
      hasEmail: !!r.guest_email,
    });
    if (!stage) continue;
    const days = daysUntil(r.event_date);
    const when = days === 0 ? "heute" : days === 1 ? "morgen" : `in ${days} Tagen`;
    const ok = await sendMail(
      r.guest_email,
      `Erinnerung: ${r.list_title} ist ${when}`,
      `Hallo ${r.guest_name},\n\n„${r.list_title}“ ist ${when} (${dateDe(r.event_date)}). ` +
        (r.kind === "pledge"
          ? `Du hast ${r.amount?.toFixed(2)} € für „${r.item_title}“ zugesagt.${r.payment_hint ? " " + r.payment_hint : ""}`
          : `Du hast „${r.item_title}“ reserviert.`) +
        `\n\nSchon erledigt? Dann markiere es kurz als gekauft – dann erinnern wir dich nicht mehr:\n${appUrl()}/r/${r.token}\n\nDein Wishboxx-Team`,
    );
    if (ok) {
      update.run(stage, r.id);
      sent++;
    }
  }
  const owners = await remindOwners();
  return Response.json({ checked: rows.length, sent, owners });
}
