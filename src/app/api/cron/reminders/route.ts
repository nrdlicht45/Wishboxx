import { getDb } from "@/lib/db";
import { sendMail } from "@/lib/mailer";
import { reminderDue, daysUntil } from "@/lib/reminders";
import { appUrl, dateDe } from "@/lib/format";

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
  return Response.json({ checked: rows.length, sent });
}
