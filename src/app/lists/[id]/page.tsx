import { Icon, IconBubble } from "@/components/Icon";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import {
  eventIsOver,
  getItemsWithStatus,
  getList,
  getLists,
  getRecipient,
  isItemTaken,
  nextVolume,
  nextYearTitle,
  OCCASIONS,
  plusOneYear,
} from "@/lib/repo";
import { appUrl, dateDe, euro } from "@/lib/format";
import { ShareBox } from "@/components/ShareBox";
import { SubmitButton } from "@/components/SubmitButton";
import { PhotoWish } from "@/components/PhotoWish";
import { LoginLinkForm } from "@/components/LoginLinkForm";
import {
  addMemo,
  archiveList,
  packAgain,
  releaseReservation,
  smartAdd,
  copyOpenItems,
  deleteItem,
  markReceivedAsOwned,
  regenerateShareLink,
  toggleThanked,
  updateItem,
} from "@/app/actions";

const PRIO: Record<number, string> = { 1: "Herzenswunsch", 2: "Normal", 3: "Wäre nett" };

export default async function ListPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ neu?: string }>;
}) {
  const { neu } = await searchParams;
  const user = await requireUser();
  const list = getList(Number((await params).id), user.id);
  if (!list) notFound();
  const items = getItemsWithStatus(list.id);
  const recipient = list.recipient_id ? getRecipient(list.recipient_id, user.id) : undefined;
  const over = eventIsOver(list);
  const showStatus = list.reveal_mode !== "surprise" || over;
  const showNames = list.reveal_mode === "full" || over;
  const otherLists = getLists(user.id).filter((l) => l.id !== list.id && !l.archived);
  const shareUrl = `${appUrl()}/k/${list.share_token}`;
  const budget =
    list.budget_min || list.budget_max
      ? ` Budget pro Geschenk: ${list.budget_min ? euro(list.budget_min) : ""}${list.budget_max ? " – " + euro(list.budget_max) : ""}.`
      : "";
  const shareText = `🎁 ${list.title}${list.event_date ? ` am ${dateDe(list.event_date)}` : ""}! Hier ist die Wunsch-Boxx – einfach ein Geschenk aussuchen und reservieren, ganz ohne Anmeldung.${budget}`;
  const allReservations = items.flatMap((i) => i.reservations.map((r) => ({ ...r, itemTitle: i.title })));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl">{list.title}</h1>
          <p className="muted">
            {OCCASIONS[list.occasion]}
            {recipient && ` · für ${recipient.name}`}
            {list.event_date && ` · ${dateDe(list.event_date)}`}
            {list.archived ? " · archiviert" : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a className="btn" href={`https://wa.me/?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`} target="_blank" rel="noopener">
            <Icon name="share" /> Teilen
          </a>
          <Link href={`/lists/${list.id}/edit`} className="btn-ghost">Bearbeiten</Link>
          <form action={archiveList}>
            <input type="hidden" name="id" value={list.id} />
            <input type="hidden" name="archived" value={list.archived ? "0" : "1"} />
            <button className="btn-ghost" type="submit">{list.archived ? "Reaktivieren" : "Archivieren"}</button>
          </form>
        </div>
      </div>

      {neu && (
        <div className="banner space-y-1">
          <p className="display text-xl">{items.length} Wünsche sind schon eingepackt.</p>
          <p className="text-sm opacity-95">Tippe bei allem, was nicht passt, auf das ✕ – und teile die Boxx dann oben über „Teilen“.</p>
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-xl">Wünsche ({items.length})</h2>
        {items.length === 0 && (
          <div className="card muted text-sm">
            Noch leer. Füge einen Link ein oder hol dir <Link className="underline" href={`/lists/${list.id}/ideas`}>KI-Ideen</Link>.
          </div>
        )}
        {items.map((it) => {
          const taken = isItemTaken(it);
          return (
            <article key={it.id} className="card relative flex gap-4">
              <form action={deleteItem} className="absolute right-3 top-3">
                <input type="hidden" name="id" value={it.id} />
                <input type="hidden" name="list_id" value={list.id} />
                <button type="submit" aria-label={`„${it.title}“ entfernen`}
                  className="flex h-11 w-11 items-center justify-center rounded-full muted hover:bg-[var(--bubble)]">
                  <span aria-hidden className="text-lg leading-none">✕</span>
                </button>
              </form>
              {it.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={it.image_url} alt="" className="h-20 w-20 shrink-0 rounded-xl object-contain bg-white" />
              ) : (
                <span className="thumb" style={{ width: 80, height: 80 }}>
                  <Icon name={it.source === "store" ? "store" : it.source === "photo" ? "camera" : "gift"} size={30} />
                </span>
              )}
              <div className="min-w-0 flex-1 space-y-1 pr-10">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold">{it.title}</h3>
                  {it.priority === 1 && <span className="chip chip-pink"><Icon name="heart" size={13} /> Herzenswunsch</span>}
                  {it.is_group_gift ? <span className="chip"><Icon name="users" size={13} /> Gemeinsam</span> : null}
                  {it.source === "store" && <span className="chip"><Icon name="store" size={13} /> im Laden</span>}
                  {it.source === "ai" && <span className="chip"><Icon name="sparkle" size={13} /> KI-Idee</span>}
                  {it.source === "photo" && <span className="chip"><Icon name="camera" size={13} /> per Foto</span>}
                  {it.source === "memo" && <span className="chip"><Icon name="bulb" size={13} /> vom Merkzettel</span>}
                </div>
                <div className="muted text-sm">
                  {euro(it.price)} {it.quantity > 1 && `· ${it.quantity}× gewünscht`}
                  {it.url && (
                    <>
                      {" · "}
                      <a className="underline" href={`/go/${it.id}`} target="_blank" rel="sponsored nofollow noopener">
                        zum Shop*
                      </a>
                    </>
                  )}
                </div>
                {showStatus && (
                  <div className="text-sm">
                    {it.is_group_gift ? (
                      <span className={taken ? "chip chip-ok" : "chip"}>
                        {euro(it.pledged_sum)} von {euro(it.price) || "?"} zugesagt
                      </span>
                    ) : it.reserved_count > 0 ? (
                      <span className="chip chip-ok">
                        ✓ {it.reserved_count}/{it.quantity} reserviert
                        {` · ${it.reservations.filter((r) => r.purchased).length}/${it.reservations.length} gekauft`}
                      </span>
                    ) : (
                      <span className="muted">noch frei</span>
                    )}
                  </div>
                )}
                {recipient && (
                  <details className="text-sm">
                    <summary className="muted cursor-pointer">Fortsetzung merken</summary>
                    <form action={addMemo} className="mt-2 flex flex-wrap gap-2">
                      <input type="hidden" name="recipient_id" value={recipient.id} />
                      <input type="hidden" name="from_item" value={it.title} />
                      <input type="hidden" name="back" value={`/lists/${list.id}`} />
                      <label className="sr-only" htmlFor={`memo-${it.id}`}>Was soll {recipient.name} nächstes Mal bekommen?</label>
                      <input className="input flex-1" id={`memo-${it.id}`} name="title" defaultValue={nextVolume(it.title)} />
                      <SubmitButton className="btn-ghost">Auf {recipient.name}s Merkzettel</SubmitButton>
                    </form>
                  </details>
                )}
                {showStatus && it.reservations.length > 0 && (
                  <ul className="space-y-1 text-sm">
                    {it.reservations.map((r) => (
                      <li key={r.id} className="flex flex-wrap items-center gap-x-2">
                        <span className="font-semibold">{showNames ? r.guest_name : "Ein Gast"}</span>
                        {r.kind === "pledge" && <span className="muted">{euro(r.amount)}</span>}
                        {r.purchased ? <span className="muted">· gekauft</span> : null}
                        {showNames && r.message && <span className="muted">· „{r.message}“</span>}
                        <details className="inline">
                          <summary className="muted cursor-pointer underline">freigeben</summary>
                          <form action={releaseReservation} className="mt-1 flex items-center gap-2">
                            <input type="hidden" name="reservation_id" value={r.id} />
                            <input type="hidden" name="list_id" value={list.id} />
                            <span className="muted text-xs">Wunsch wird wieder für alle frei.</span>
                            <button type="submit" className="chip chip-pink">Ja, freigeben</button>
                          </form>
                        </details>
                      </li>
                    ))}
                  </ul>
                )}
                <details className="text-sm">
                  <summary className="chip cursor-pointer list-none" style={{ display: "inline-flex" }}>
                    <Icon name="pencil" size={13} /> Bearbeiten
                  </summary>
                  <form action={updateItem} className="mt-3 grid gap-3 sm:grid-cols-6">
                    <input type="hidden" name="id" value={it.id} />
                    <input type="hidden" name="list_id" value={list.id} />
                    {showStatus && it.reservations.length > 0 && (
                      <p className="chip chip-pink sm:col-span-6" style={{ whiteSpace: "normal" }}>
                        Schon {it.is_group_gift ? "unterstützt" : "reserviert"} – größere Änderungen am besten kurz absprechen.
                      </p>
                    )}
                    <div className="sm:col-span-6">
                      <label className="label" htmlFor={`e-title-${it.id}`}>Titel</label>
                      <input className="input" id={`e-title-${it.id}`} name="title" defaultValue={it.title} required />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="label" htmlFor={`e-price-${it.id}`}>Preis €</label>
                      <input className="input" id={`e-price-${it.id}`} name="price" inputMode="decimal" defaultValue={it.price ?? ""} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="label" htmlFor={`e-qty-${it.id}`}>Anzahl</label>
                      <input className="input" id={`e-qty-${it.id}`} name="quantity" type="number" min={1} max={20} defaultValue={it.quantity} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="label" htmlFor={`e-prio-${it.id}`}>Priorität</label>
                      <select className="input" id={`e-prio-${it.id}`} name="priority" defaultValue={it.priority}>
                        {Object.entries(PRIO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </div>
                    <div className="sm:col-span-6">
                      <label className="label" htmlFor={`e-url-${it.id}`}>Link zum Produkt (neuer Link lädt Bild und Preis neu)</label>
                      <input className="input" id={`e-url-${it.id}`} name="url" type="url" defaultValue={it.url ?? ""} placeholder="https://…" />
                    </div>
                    <div className="sm:col-span-6">
                      <label className="label" htmlFor={`e-desc-${it.id}`}>Hinweis für Gäste</label>
                      <textarea className="input" id={`e-desc-${it.id}`} name="description" defaultValue={it.description} rows={2}
                        placeholder="z.B. Farbe, Größe, Band 2" />
                    </div>
                    <label className="flex items-center gap-2 sm:col-span-3">
                      <input type="checkbox" name="is_store" defaultChecked={it.source === "store"} /> Liegt im Laden{list.shop_name && ` (${list.shop_name})`}
                    </label>
                    <label className="flex items-center gap-2 sm:col-span-3">
                      <input type="checkbox" name="is_group_gift" defaultChecked={!!it.is_group_gift} /> Gruppengeschenk
                    </label>
                    <div className="flex flex-wrap items-center gap-3 sm:col-span-6">
                      <SubmitButton className="btn">Speichern</SubmitButton>
                    </div>
                  </form>
                </details>
              </div>
            </article>
          );
        })}
      </section>

      <section className="card space-y-3" aria-label="Wunsch hinzufügen">
        <h2 className="text-lg">Wunsch hinzufügen</h2>
        <form action={smartAdd} className="space-y-3">
          <input type="hidden" name="list_id" value={list.id} />
          <div className="flex gap-2">
            <label htmlFor="q" className="sr-only">Link oder Stichwort</label>
            <input className="input flex-1" id="q" name="q" required autoComplete="off" enterKeyHint="send"
              placeholder="Link einfügen oder Stichwort, z.B. „Lego Pferd“" />
            <SubmitButton pendingText="…" className="btn shrink-0 !px-4"><Icon name="plus" /><span className="sr-only">Hinzufügen</span></SubmitButton>
          </div>
          <details className="text-sm">
            <summary className="muted cursor-pointer">Mehr Optionen (Preis, Laden, Gruppengeschenk …)</summary>
            <div className="mt-3 grid gap-3 sm:grid-cols-4">
              <div>
                <label className="label" htmlFor="price">Preis €</label>
                <input className="input" id="price" name="price" inputMode="decimal" />
              </div>
              <div>
                <label className="label" htmlFor="quantity">Anzahl</label>
                <input className="input" id="quantity" name="quantity" type="number" min={1} max={20} defaultValue={1} />
              </div>
              <div className="sm:col-span-2">
                <label className="label" htmlFor="priority">Priorität</label>
                <select className="input" id="priority" name="priority" defaultValue={2}>
                  {Object.entries(PRIO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <label className="flex items-center gap-2 sm:col-span-2">
                <input type="checkbox" name="source" value="store" /> Liegt im Laden {list.shop_name && `(${list.shop_name})`}
              </label>
              <label className="flex items-center gap-2 sm:col-span-2">
                <input type="checkbox" name="is_group_gift" /> Gruppengeschenk (mehrere legen zusammen)
              </label>
            </div>
          </details>
        </form>
        <div className="flex flex-wrap items-start gap-2">
          <PhotoWish listId={list.id} compact />
          <Link href={`/lists/${list.id}/ideas`} className="btn-ghost"><Icon name="sparkle" /> Mehr Ideen</Link>
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="font-bold">Mit Gästen teilen</h2>
        <ShareBox url={shareUrl} text={shareText} />
        <form action={regenerateShareLink} className="text-xs">
          <input type="hidden" name="id" value={list.id} />
          <button className="muted underline" type="submit">Link zurücksetzen (alter Link wird ungültig)</button>
        </form>
        {!showStatus && (
          <p className="chip"><Icon name="eyeoff" size={14} /> Überraschungsmodus aktiv – Reservierungen siehst du erst nach dem Fest.</p>
        )}
      </section>

      {user.is_guest ? (
        <section className="card space-y-3">
          <h2 className="flex items-center gap-3 text-lg"><IconBubble name="heart" /> Boxx sichern</h2>
          <p className="muted text-sm">Damit du sie auf jedem Gerät wiederfindest und erfährst, wenn Gäste etwas reservieren. Kein Passwort – nur ein Link per E-Mail.</p>
          <LoginLinkForm withName next={`/lists/${list.id}`} cta="Boxx sichern" />
        </section>
      ) : null}

      {over && (
        <section className="card space-y-3">
          <h2 className="flex items-center gap-3 text-xl"><IconBubble name="mail" /> Danke-Liste</h2>
          {allReservations.length === 0 ? (
            <p className="muted text-sm">Keine Reservierungen.</p>
          ) : (
            <ul className="space-y-2">
              {allReservations.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span>
                    <strong>{r.guest_name}</strong> – {r.itemTitle}
                    {r.kind === "pledge" && ` (${euro(r.amount)})`}
                    {r.message && <em className="muted"> „{r.message}“</em>}
                  </span>
                  <form action={toggleThanked}>
                    <input type="hidden" name="reservation_id" value={r.id} />
                    <input type="hidden" name="list_id" value={list.id} />
                    <button className={r.thanked ? "chip chip-ok" : "btn-ghost"} type="submit">
                      {r.thanked ? "✓ bedankt" : "als bedankt markieren"}
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
          {recipient && (
            <form action={markReceivedAsOwned}>
              <input type="hidden" name="id" value={list.id} />
              <SubmitButton className="btn-ghost">Erhaltenes bei {recipient.name} unter „hat schon“ eintragen</SubmitButton>
            </form>
          )}
        </section>
      )}

      {(over || !!list.archived) && (
        <section className="banner space-y-3">
          <p className="display text-xl">Nächstes Jahr wieder?</p>
          <p className="text-sm opacity-95">
            Wir packen die neue Boxx{list.event_date ? ` für ${dateDe(plusOneYear(list.event_date))}` : ""}: offene Wünsche von
            diesmal{recipient ? `, ${recipient.name}s Merkzettel` : ""} und neue Ideen – bevorzugt Fortsetzungen zu dem, was schon
            geschenkt wurde. Diese Boxx wandert ins Archiv.
          </p>
          <form action={packAgain}>
            <input type="hidden" name="id" value={list.id} />
            <SubmitButton pendingText="Wir packen …" className="inline-flex min-h-11 items-center rounded-full bg-white px-5 font-semibold !text-[#2a2140]">
              „{nextYearTitle(list.title)}“ packen
            </SubmitButton>
          </form>
        </section>
      )}

      {otherLists.length > 0 && (
        <section className="card">
          <h2 className="mb-2">Offene Wünsche in andere Liste übernehmen</h2>
          <form action={copyOpenItems} className="flex flex-wrap gap-2">
            <input type="hidden" name="id" value={list.id} />
            <select className="input max-w-xs" name="target_id" aria-label="Zielliste">
              {otherLists.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
            </select>
            <SubmitButton className="btn-ghost">Übernehmen</SubmitButton>
          </form>
        </section>
      )}
    </div>
  );
}
