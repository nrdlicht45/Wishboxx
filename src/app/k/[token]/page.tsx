import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { eventIsOver, getItemsWithStatus, getListByToken, isItemTaken, OCCASIONS } from "@/lib/repo";
import { dateDe, euro } from "@/lib/format";
import { ReserveForm } from "@/components/ReserveForm";
import { cancelReservation } from "@/app/actions";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function GuestPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ budget?: string }>;
}) {
  const { token } = await params;
  const { budget } = await searchParams;
  const list = getListByToken(token);
  if (!list) notFound();

  const user = await getCurrentUser();
  const isOwner = user?.id === list.user_id;
  const hideStatus = isOwner && list.reveal_mode === "surprise" && !eventIsOver(list);
  const recipientName = list.recipient_id
    ? (getDb().prepare("SELECT name FROM recipients WHERE id = ?").get(list.recipient_id) as { name: string } | undefined)?.name
    : undefined;

  const myTokens = new Set(((await cookies()).get(`wb_g_${token}`)?.value ?? "").split(".").filter(Boolean));
  const onlyBudget = budget === "1" && list.budget_max != null;
  let items = getItemsWithStatus(list.id);
  if (onlyBudget) items = items.filter((i) => i.is_group_gift || i.price == null || i.price <= list.budget_max! * 1.1);
  // Freie Wünsche zuerst
  items.sort((a, b) => Number(isItemTaken(a)) - Number(isItemTaken(b)));

  const mine = items.flatMap((i) => i.reservations.filter((r) => myTokens.has(r.token)).map((r) => ({ r, i })));

  return (
    <div className="space-y-6">
      <section className="card text-center">
        <div className="text-5xl" aria-hidden>🎁</div>
        <h1 className="mt-2 text-3xl font-extrabold">{list.title}</h1>
        <p className="muted">
          {OCCASIONS[list.occasion]}
          {recipientName && ` von ${recipientName}`}
          {list.event_date && ` · ${dateDe(list.event_date)}`}
        </p>
        {list.description && <p className="mx-auto mt-3 max-w-xl whitespace-pre-line">{list.description}</p>}
        {(list.budget_min || list.budget_max) && (
          <p className="mt-3">
            <span className="chip">
              💶 Wunsch-Budget pro Geschenk: {list.budget_min ? euro(list.budget_min) : ""}
              {list.budget_max ? ` – ${euro(list.budget_max)}` : ""}
            </span>
          </p>
        )}
        {list.shop_name && (
          <p className="mt-3 text-sm">
            🏪 Die Kiste steht auch bei <strong>{list.shop_name}</strong>
            {list.shop_address && ` (${list.shop_address})`}. Mit 🏪 markierte Wünsche gibt es dort.
          </p>
        )}
        <p className="muted mt-3 text-xs">
          So geht&apos;s: Wunsch aussuchen → „Ich schenke das“ → kaufen. Keine Anmeldung nötig.
          {list.reveal_mode !== "full" && " Das Geburtstagskind sieht nicht, wer was schenkt."}
        </p>
      </section>

      {isOwner && (
        <p className="chip">
          Du siehst deine eigene Liste als Gast. {hideStatus && "Überraschungsmodus: Reservierungen werden ausgeblendet."}{" "}
          <Link className="underline" href={`/lists/${list.id}`}>Zur Verwaltung</Link>
        </p>
      )}

      {mine.length > 0 && (
        <section className="card space-y-2">
          <h2 className="font-extrabold">Deine Reservierungen</h2>
          {mine.map(({ r, i }) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span>
                ✓ {i.title} {r.kind === "pledge" && `(${euro(r.amount)})`}
                {i.url && (
                  <>
                    {" · "}
                    <a className="underline" href={`/go/${i.id}`} target="_blank" rel="sponsored nofollow noopener">
                      jetzt kaufen*
                    </a>
                  </>
                )}
              </span>
              <form action={cancelReservation}>
                <input type="hidden" name="list_token" value={token} />
                <input type="hidden" name="token" value={r.token} />
                <button className="muted underline" type="submit">Reservierung aufheben</button>
              </form>
            </div>
          ))}
          {list.payment_hint && mine.some((m) => m.r.kind === "pledge") && (
            <p className="muted text-sm">💸 {list.payment_hint}</p>
          )}
        </section>
      )}

      {list.budget_max != null && (
        <div className="flex gap-2 text-sm">
          <Link href={`/k/${token}`} className={onlyBudget ? "btn-ghost" : "btn"}>Alle Wünsche</Link>
          <Link href={`/k/${token}?budget=1`} className={onlyBudget ? "btn" : "btn-ghost"}>Passend zum Budget</Link>
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-2">
        {items.map((it) => {
          const taken = !hideStatus && isItemTaken(it);
          const remaining = it.is_group_gift && it.price != null ? Math.max(0, it.price - it.pledged_sum) : null;
          return (
            <article key={it.id} className={`card flex flex-col gap-2 ${taken ? "opacity-50" : ""}`}>
              <div className="flex gap-3">
                {it.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.image_url} alt="" className="h-24 w-24 shrink-0 rounded-xl bg-white object-contain" />
                ) : (
                  <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl text-4xl"
                    style={{ background: "var(--color-brand-50)" }} aria-hidden>
                    {it.source === "store" ? "🏪" : "🎁"}
                  </div>
                )}
                <div className="min-w-0">
                  <h2 className="font-extrabold">{it.title}</h2>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {it.priority === 1 && <span className="chip">❤️ Herzenswunsch</span>}
                    {it.source === "store" && <span className="chip">🏪 im Laden</span>}
                    {it.is_group_gift ? <span className="chip">🤝 Gruppengeschenk</span> : null}
                  </div>
                  <p className="mt-1 text-lg font-extrabold">{euro(it.price)}</p>
                </div>
              </div>
              {it.description && <p className="muted text-sm">{it.description}</p>}
              {!hideStatus && !!it.is_group_gift && it.price != null && (
                <div>
                  <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: "var(--line)" }}>
                    <div className="h-full" style={{
                      width: `${Math.min(100, (it.pledged_sum / it.price) * 100)}%`,
                      background: "var(--color-mint-600)",
                    }} />
                  </div>
                  <p className="muted mt-1 text-xs">{euro(it.pledged_sum)} von {euro(it.price)} zugesagt</p>
                </div>
              )}
              {!hideStatus && !it.is_group_gift && it.quantity > 1 && (
                <p className="muted text-xs">{it.quantity - it.reserved_count} von {it.quantity} noch frei</p>
              )}
              <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
                {taken ? (
                  <span className="chip chip-ok">✓ Schon vergeben</span>
                ) : hideStatus ? null : (
                  <ReserveForm listToken={token} itemId={it.id} groupGift={!!it.is_group_gift} remaining={remaining} />
                )}
                {it.url && (
                  <a href={`/go/${it.id}`} target="_blank" rel="sponsored nofollow noopener" className="btn-ghost">
                    Ansehen*
                  </a>
                )}
              </div>
            </article>
          );
        })}
      </section>
      {items.length === 0 && <p className="card muted">Hier gibt es (noch) keine Wünsche.</p>}
    </div>
  );
}
