import { Icon, IconBubble } from "@/components/Icon";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getReservationByToken } from "@/lib/repo";
import { daysUntil } from "@/lib/reminders";
import { dateDe, euro } from "@/lib/format";
import { SubmitButton } from "@/components/SubmitButton";
import { cancelReservationByToken, togglePurchased } from "@/app/actions";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/** Verwaltung einer einzelnen Reservierung – erreichbar über den Link aus der Bestätigungs-Mail. */
export default async function ReservationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ctx = getReservationByToken(token);
  if (!ctx) notFound();
  const { reservation: r, item, list, recipientName } = ctx;
  const days = list.event_date ? daysUntil(list.event_date) : null;

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <section className="card space-y-3 text-center">
        <span className="mx-auto"><IconBubble name={r.purchased ? "check" : "bag"} size={64} /></span>
        <h1 className="text-2xl">{item.title}</h1>
        <p className="muted">
          für {list.title}
          {recipientName && ` (${recipientName})`}
          {list.event_date && ` · ${dateDe(list.event_date)}`}
        </p>
        {days != null && days >= 0 && (
          <p className="chip">{days === 0 ? "Heute ist die Feier!" : `Noch ${days} ${days === 1 ? "Tag" : "Tage"} bis zur Feier`}</p>
        )}
        <p className="text-sm">
          Reserviert von <strong>{r.guest_name}</strong>
          {r.kind === "pledge" && <> · Zusage {euro(r.amount)}</>}
        </p>
        {r.kind === "pledge" && list.payment_hint && <p className="muted text-sm">{list.payment_hint}</p>}
      </section>

      <section className="card flex flex-wrap justify-center gap-2">
        {item.url && r.kind === "reserve" && (
          <a className="btn" href={`/go/${item.id}`} target="_blank" rel="sponsored nofollow noopener">Jetzt kaufen*</a>
        )}
        {item.source === "store" && list.shop_name && (
          <p className="w-full text-center text-sm">Erhältlich bei {list.shop_name} {list.shop_address && `(${list.shop_address})`}</p>
        )}
        <form action={togglePurchased}>
          <input type="hidden" name="token" value={r.token} />
          <SubmitButton className={r.purchased ? "btn-ghost" : "btn"}>
            {r.purchased ? "✓ Gekauft (rückgängig)" : r.kind === "pledge" ? "Betrag ist bezahlt ✓" : "Ich habe es gekauft ✓"}
          </SubmitButton>
        </form>
        {list.event_date && (
          <a className="btn-ghost" href={`/r/${r.token}/ics`}><Icon name="calendar" /> In Kalender speichern</a>
        )}
      </section>

      <div className="flex justify-between text-sm">
        <Link className="underline" href={`/k/${list.share_token}`}>← zur ganzen Wunschliste</Link>
        <form action={cancelReservationByToken}>
          <input type="hidden" name="token" value={r.token} />
          <button type="submit" className="muted underline">Reservierung aufheben</button>
        </form>
      </div>
      <p className="muted text-center text-xs">Speichere dir diesen Link – damit verwaltest du deine Reservierung auf jedem Gerät.</p>
    </div>
  );
}
