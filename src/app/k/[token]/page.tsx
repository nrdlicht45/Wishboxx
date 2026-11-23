import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { eventIsOver, getItemsWithStatus, getListByToken, isItemTaken, OCCASIONS } from "@/lib/repo";
import { dateDe, euro } from "@/lib/format";
import { ReserveForm } from "@/components/ReserveForm";
import { RsvpForm, type ExistingRsvp } from "@/components/RsvpForm";
import { cancelReservation, togglePurchased } from "@/app/actions";
import { Icon, IconBubble } from "@/components/Icon";

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const list = getListByToken((await params).token);
  const title = list ? `${list.title} – such dir ein Geschenk aus` : "Wishboxx";
  const description = list
    ? `${OCCASIONS[list.occasion]}${list.event_date ? ` am ${dateDe(list.event_date)}` : ""}. Wunsch aussuchen, reservieren, fertig – ganz ohne Anmeldung.`
    : undefined;
  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: { title, description, type: "website", siteName: "Wishboxx", locale: "de_DE" },
    twitter: { card: "summary_large_image", title, description },
  };
}

const FILTERS = [
  { key: "", label: "Alle" },
  { key: "budget", label: "Im Budget" },
  { key: "store", label: "Im Laden" },
  { key: "group", label: "Gemeinsam" },
] as const;


export default async function GuestPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ f?: string; budget?: string }>;
}) {
  const { token } = await params;
  const sp = await searchParams;
  const filter = sp.f ?? (sp.budget === "1" ? "budget" : "");
  const list = getListByToken(token);
  if (!list) notFound();

  const user = await getCurrentUser();
  const isOwner = user?.id === list.user_id;
  const hideStatus = isOwner && list.reveal_mode === "surprise" && !eventIsOver(list);
  const recipientName = list.recipient_id
    ? (getDb().prepare("SELECT name FROM recipients WHERE id = ?").get(list.recipient_id) as { name: string } | undefined)?.name
    : undefined;

  const jar = await cookies();
  const rememberedName = jar.get("wb_guest_name")?.value ?? "";
  const childName = recipientName ?? "Das Geburtstagskind";
  const privacyHint =
    list.reveal_mode === "full"
      ? "Nur die Familie sieht deinen Namen – für die Danke-Liste. Andere Gäste sehen ihn nicht."
      : `Nur für die Danke-Liste der Familie. Andere Gäste sehen deinen Namen nicht${list.reveal_mode === "surprise" ? `, und ${childName} erfährt erst nach dem Fest, wer was schenkt` : ""}.`;
  const rsvpToken = jar.get(`wb_r_${token}`)?.value;
  const myRsvp = rsvpToken
    ? (getDb().prepare("SELECT guest_name, status, kids, other_gift, message FROM rsvps WHERE token = ? AND list_id = ?").get(rsvpToken, list.id) as ExistingRsvp | undefined) ?? null
    : null;
  const myTokens = new Set((jar.get(`wb_g_${token}`)?.value ?? "").split(".").filter(Boolean));
  const all = getItemsWithStatus(list.id);
  const visibleFilters = FILTERS.filter(
    (f) =>
      f.key === "" ||
      (f.key === "budget" && list.budget_max != null) ||
      (f.key === "store" && all.some((i) => i.source === "store")) ||
      (f.key === "group" && all.some((i) => i.is_group_gift)),
  );
  let items = all;
  if (filter === "budget" && list.budget_max != null)
    items = items.filter((i) => i.is_group_gift || i.price == null || i.price <= list.budget_max! * 1.1);
  if (filter === "store") items = items.filter((i) => i.source === "store");
  if (filter === "group") items = items.filter((i) => i.is_group_gift);
  // Freie Wünsche zuerst
  items = [...items].sort((a, b) => Number(isItemTaken(a)) - Number(isItemTaken(b)));

  const myRes = (it: (typeof items)[number]) => it.reservations.find((r) => myTokens.has(r.token));
  const mine = all.flatMap((i) => i.reservations.filter((r) => myTokens.has(r.token)).map((r) => ({ r, i })));
  const budget =
    list.budget_min || list.budget_max
      ? `${list.budget_min ? euro(list.budget_min).replace(",00", "") : ""}${list.budget_max ? "–" + euro(list.budget_max).replace(",00", "") : ""}`
      : null;

  return (
    <div className="space-y-6">
      <section className="flex flex-col items-center gap-4 py-4 text-center">
        <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold"
          style={{ background: "color-mix(in srgb, var(--card) 70%, transparent)" }}>
          <Icon name="gift" size={16} /> {OCCASIONS[list.occasion]}{list.event_date && ` · ${dateDe(list.event_date)}`}
          {list.event_time && ` · ${list.event_time} Uhr`}
        </span>
        <h1 className="max-w-2xl text-3xl leading-tight sm:text-5xl">
          {recipientName ? <>{list.title} – </> : null}
          <span className="g">such dir ein Geschenk aus.</span>
        </h1>
        {!recipientName && <p className="display text-lg">{list.title}</p>}
        {list.description && <p className="muted max-w-xl whitespace-pre-line">{list.description}</p>}
        <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm font-medium">
          {budget && <span className="inline-flex items-center gap-2"><span className="dot" />ca. {budget} pro Geschenk</span>}
          <span className="inline-flex items-center gap-2"><span className="dot" />ohne Anmeldung</span>
          {list.reveal_mode !== "full" && <span className="inline-flex items-center gap-2"><span className="dot" />bleibt eine Überraschung</span>}
        </div>
        {list.location && (
          <p className="inline-flex items-center gap-2 text-sm"><Icon name="home" size={16} /> {list.location}</p>
        )}
        {list.shop_name && (
          <p className="max-w-md text-sm">
            <Icon name="store" size={16} className="mr-1 inline align-[-3px]" />
            Die Boxx steht auch bei <strong>{list.shop_name}</strong>
            {list.shop_address && <span className="muted"> ({list.shop_address})</span>}
          </p>
        )}
        {visibleFilters.length > 1 && (
          <nav className="tabs max-w-full overflow-x-auto" aria-label="Wünsche filtern">
            {visibleFilters.map((f) => (
              <Link key={f.key} href={f.key ? `/k/${token}?f=${f.key}` : `/k/${token}`} className="tab"
                aria-current={filter === f.key ? "page" : undefined}>
                {f.label}
              </Link>
            ))}
          </nav>
        )}
      </section>

      {isOwner && (
        <p className="chip">
          Du siehst deine eigene Liste als Gast. {hideStatus && "Überraschungsmodus: Reservierungen werden ausgeblendet."}{" "}
          <Link className="underline" href={`/lists/${list.id}`}>Zur Verwaltung</Link>
        </p>
      )}

      {!isOwner && (
        <section className="card space-y-3" aria-labelledby="rsvp-h">
          <h2 id="rsvp-h" className="text-lg">Kommt ihr{list.occasion === "birthday" ? " zur Feier" : ""}?</h2>
          <RsvpForm listToken={token} existing={myRsvp} defaultName={rememberedName} childName={recipientName ?? "das Kind"} />
        </section>
      )}

      {mine.length > 0 && (
        <section className="card space-y-3">
          <h2 className="text-lg">Deine Reservierungen</h2>
          {mine.map(({ r, i }) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 border-t pt-3 text-sm first:border-0 first:pt-0"
              style={{ borderColor: "var(--line)" }}>
              <span className="flex items-center gap-3">
                <IconBubble name={r.purchased ? "check" : "bag"} size={36} />
                <span>
                  <strong>{i.title}</strong> {r.kind === "pledge" && `(${euro(r.amount)})`}
                  <span className="block muted">{r.purchased ? "gekauft" : "noch nicht gekauft"}</span>
                </span>
              </span>
              <span className="flex flex-wrap items-center gap-2">
                {i.url && !r.purchased && r.kind === "reserve" && (
                  <a className="btn" href={`/go/${i.id}`} target="_blank" rel="sponsored nofollow noopener">Kaufen*</a>
                )}
                <form action={togglePurchased}>
                  <input type="hidden" name="token" value={r.token} />
                  <button className={r.purchased ? "chip chip-ok" : "btn-ghost"} type="submit">
                    <Icon name="check" size={16} /> {r.purchased ? "gekauft" : "Gekauft"}
                  </button>
                </form>
                {list.event_date && (
                  <a className="btn-ghost" href={`/r/${r.token}/ics`} aria-label="Kalender-Erinnerung speichern">
                    <Icon name="calendar" />
                  </a>
                )}
                <Link className="muted underline" href={`/r/${r.token}`}>verwalten</Link>
                <form action={cancelReservation}>
                  <input type="hidden" name="list_token" value={token} />
                  <input type="hidden" name="token" value={r.token} />
                  <button className="muted underline" type="submit">aufheben</button>
                </form>
              </span>
            </div>
          ))}
          {list.payment_hint && mine.some((m) => m.r.kind === "pledge") && (
            <p className="muted inline-flex items-center gap-2 text-sm"><Icon name="wallet" /> {list.payment_hint}</p>
          )}
        </section>
      )}

      <section className="grid gap-4 sm:grid-cols-2">
        {items.map((it) => {
          const taken = !hideStatus && isItemTaken(it);
          const mineR = myRes(it);
          const remaining = it.is_group_gift && it.price != null ? Math.max(0, it.price - it.pledged_sum) : null;
          const pledgers = it.reservations.filter((r) => r.kind === "pledge");
          return (
            <article key={it.id} className={`card flex flex-col gap-3 ${taken && !mineR ? "opacity-55" : ""}`}>
              <div className="flex gap-4">
                {it.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.image_url} alt="" className="h-24 w-24 shrink-0 rounded-[1.1rem] bg-white object-contain" />
                ) : (
                  <span className="thumb" style={{ width: 96, height: 96 }}>
                    <Icon name={it.source === "store" ? "store" : "gift"} size={34} />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <h2 className="text-base leading-snug" style={{ fontFamily: "var(--font-sans)", fontWeight: 700 }}>{it.title}</h2>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {it.priority === 1 && <span className="chip chip-pink"><Icon name="heart" size={13} /> Herzenswunsch</span>}
                    {it.source === "store" && <span className="chip"><Icon name="store" size={13} /> im Laden</span>}
                    {it.is_group_gift ? <span className="chip"><Icon name="users" size={13} /> Gemeinsam</span> : null}
                  </div>
                  {it.price != null && <p className="display mt-2 text-lg">{euro(it.price)}</p>}
                </div>
              </div>
              {it.description && <p className="muted text-sm">{it.description}</p>}
              {!hideStatus && !!it.is_group_gift && it.price != null && (
                <div className="space-y-2">
                  <p className="text-sm muted">
                    {pledgers.length > 0 && `${pledgers.length} ${pledgers.length === 1 ? "Gast macht" : "Gäste machen"} mit · `}
                    {euro(it.pledged_sum)} von {euro(it.price)} gesammelt
                  </p>
                  <div className="progress"><div style={{ width: `${Math.min(100, (it.pledged_sum / it.price) * 100)}%` }} /></div>
                </div>
              )}
              {!hideStatus && !it.is_group_gift && it.quantity > 1 && (
                <p className="muted text-xs">{it.quantity - it.reserved_count} von {it.quantity} noch frei</p>
              )}
              <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
                {mineR && (
                  <>
                    <span className="chip chip-ok"><Icon name="check" size={13} /> Von dir {it.is_group_gift ? "unterstützt" : "reserviert"}</span>
                    {list.event_date && <a className="btn-ghost" href={`/r/${mineR.token}/ics`}><Icon name="calendar" /> Erinnerung</a>}
                    <Link className="btn-ghost" href={`/r/${mineR.token}`}>Verwalten</Link>
                  </>
                )}
                {!mineR && taken && <span className="chip chip-ok"><Icon name="check" size={13} /> Schon vergeben</span>}
                {!taken && !hideStatus && !(mineR && !it.is_group_gift) && (
                  <ReserveForm listToken={token} itemId={it.id} groupGift={!!it.is_group_gift} remaining={remaining} hasDate={!!list.event_date}
                    defaultName={rememberedName} privacyHint={privacyHint} />
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
