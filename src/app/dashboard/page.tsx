import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { ageFromBirthdate, getLists, getRecipients, OCCASIONS } from "@/lib/repo";
import { dateDe } from "@/lib/format";

const OCC_ICON: Record<string, string> = {
  birthday: "🎂", christmas: "🎄", easter: "🐣", school: "🎒", communion: "🕊️", baby: "🍼", other: "🎁",
};

export default async function Dashboard() {
  const user = await requireUser();
  const recipients = getRecipients(user.id);
  const lists = getLists(user.id);
  const active = lists.filter((l) => !l.archived);
  const archived = lists.filter((l) => l.archived);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold">Hallo {user.name.split(" ")[0]} 👋</h1>
        <Link href="/lists/new" className="btn">+ Neue Kiste / Liste</Link>
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-extrabold">Für wen wünschen wir?</h2>
          <Link href="/recipients/new" className="btn-ghost">+ Kind / Person</Link>
        </div>
        {recipients.length === 0 ? (
          <div className="card muted text-sm">
            Lege zuerst ein Profil an (Alter, Interessen, No-Gos). Damit werden die KI-Vorschläge richtig gut –
            und du musst es nur einmal machen, egal wie viele Anlässe kommen.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            {recipients.map((r) => (
              <Link key={r.id} href={`/recipients/${r.id}`} className="card hover:border-orange-300">
                <div className="font-extrabold">{r.name}</div>
                <div className="muted text-sm">
                  {ageFromBirthdate(r.birthdate) != null ? `${ageFromBirthdate(r.birthdate)} Jahre` : "Alter unbekannt"}
                  {r.interests && ` · ${r.interests.split(",").slice(0, 3).join(", ")}`}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-xl font-extrabold">Aktive Kisten</h2>
        {active.length === 0 ? (
          <div className="card muted text-sm">Noch keine Liste. Leg los mit deiner ersten Geburtstagskiste!</div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {active.map((l) => (
              <Link key={l.id} href={`/lists/${l.id}`} className="card flex gap-3 hover:border-orange-300">
                <div className="text-4xl" aria-hidden>{OCC_ICON[l.occasion] ?? "🎁"}</div>
                <div className="min-w-0">
                  <div className="truncate font-extrabold">{l.title}</div>
                  <div className="muted text-sm">
                    {OCCASIONS[l.occasion]}
                    {l.recipient_name && ` · für ${l.recipient_name}`}
                    {l.event_date && ` · ${dateDe(l.event_date)}`}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <span className="chip">{l.item_count} Wünsche</span>
                    {l.reveal_mode !== "surprise" && (
                      <span className="chip chip-ok">{l.reservation_count} Reservierungen</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {archived.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-extrabold muted">Archiv</h2>
          <ul className="space-y-1 text-sm">
            {archived.map((l) => (
              <li key={l.id}>
                <Link className="underline" href={`/lists/${l.id}`}>{l.title}</Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
