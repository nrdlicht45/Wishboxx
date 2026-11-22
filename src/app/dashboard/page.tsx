import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { recipientAge, eventIsOver, getListStats, getLists, getRecipients, OCCASIONS } from "@/lib/repo";
import { daysUntil } from "@/lib/reminders";
import { InstallPrompt } from "@/components/InstallPrompt";
import { LoginLinkForm } from "@/components/LoginLinkForm";
import { Icon, IconBubble } from "@/components/Icon";

const MONTHS = ["JAN", "FEB", "MÄR", "APR", "MAI", "JUN", "JUL", "AUG", "SEP", "OKT", "NOV", "DEZ"];

function DateTile({ date }: { date: string | null }) {
  if (!date) {
    return <span className="thumb" style={{ width: 56, height: 56 }}><Icon name="gift" size={24} /></span>;
  }
  const d = new Date(date);
  return (
    <span className="thumb flex-col" style={{ width: 56, height: 56 }}>
      <span className="text-[11px] font-semibold muted">{MONTHS[d.getMonth()]}</span>
      <span className="display text-xl" style={{ color: "var(--ink)" }}>{d.getDate()}</span>
    </span>
  );
}

export default async function Dashboard() {
  const user = await requireUser();
  const recipients = getRecipients(user.id);
  const lists = getLists(user.id);
  const active = lists.filter((l) => !l.archived);
  const archived = lists.filter((l) => l.archived);
  const upcoming = active
    .filter((l) => l.event_date && !eventIsOver(l))
    .sort((a, b) => a.event_date!.localeCompare(b.event_date!));
  const next = upcoming[0] ?? active[0];
  const nextStats = next ? getListStats(next.id) : null;
  const others = active.filter((l) => l.id !== next?.id);

  const done: { icon: string; text: string }[] = [];
  if (next && nextStats) {
    if (next.reveal_mode !== "surprise" || eventIsOver(next)) {
      if (nextStats.purchased) done.push({ icon: "check", text: `${nextStats.purchased} von ${nextStats.reservations} reservierten Geschenken sind schon gekauft` });
      for (const g of nextStats.groups.filter((x) => x.pct > 0)) done.push({ icon: "users", text: `Gruppengeschenk „${g.title}“ zu ${g.pct} % finanziert` });
    }
    if (nextStats.reminded) done.push({ icon: "bell", text: `${nextStats.reminded} ${nextStats.reminded === 1 ? "Gast wurde" : "Gäste wurden"} ans Kaufen erinnert` });
    if (!done.length) done.push({ icon: "share", text: "Teile die Boxx – Reservierungen und Erinnerungen laufen dann automatisch" });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-sm font-semibold muted">Meine Boxx</p>
        <h1 className="text-3xl leading-tight sm:text-4xl">
          Hallo{user.is_guest ? "" : ` ${user.name.split(" ")[0]}`},<br />
          <span className="g">{next ? "alles im Griff." : "schön, dass du da bist."}</span>
        </h1>
      </div>

      {user.is_guest ? (
        <div className="card space-y-3">
          <p className="font-semibold">Sichere deine Boxx</p>
          <p className="muted text-sm">Mit deiner E-Mail findest du sie auf jedem Gerät wieder – kein Passwort, nur ein Link.</p>
          <LoginLinkForm withName cta="Boxx sichern" />
        </div>
      ) : null}

      <InstallPrompt />

      {!next ? (
        <div className="card space-y-3">
          <IconBubble name="gift" />
          <h2 className="text-xl">Deine erste Boxx</h2>
          <p className="muted">Geburtstag, Weihnachten oder Einschulung: Drei Fragen – die KI packt passende Ideen ein, du schickst den Link an die Gäste.</p>
          <Link href="/start" className="btn">Boxx packen</Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <Link href={`/lists/${next.id}`} className="card block space-y-3">
            <p className="text-sm font-semibold muted">{upcoming[0] ? "Als Nächstes" : "Deine Boxx"}</p>
            <div className="flex items-center gap-3">
              <DateTile date={next.event_date} />
              <div className="min-w-0">
                <p className="truncate text-lg font-bold">{next.title}</p>
                <p className="text-sm muted">
                  {next.event_date && !eventIsOver(next) ? `in ${daysUntil(next.event_date)} Tagen · ` : ""}
                  {nextStats!.taken} von {nextStats!.items} Wünschen vergeben
                </p>
              </div>
            </div>
            <div className="progress"><div style={{ width: `${nextStats!.items ? (nextStats!.taken / nextStats!.items) * 100 : 0}%` }} /></div>
          </Link>
          <div className="card space-y-3">
            <p className="text-sm font-semibold muted">Für dich erledigt</p>
            {done.slice(0, 3).map((d) => (
              <div key={d.text} className="flex items-center gap-3">
                <IconBubble name={d.icon} />
                <p className="text-sm leading-snug">{d.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {others.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl">Weitere Boxen</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {others.map((l) => (
              <Link key={l.id} href={`/lists/${l.id}`} className="card flex items-center gap-3">
                <DateTile date={l.event_date} />
                <div className="min-w-0">
                  <p className="display truncate">{l.title}</p>
                  <p className="text-sm muted">
                    {OCCASIONS[l.occasion]}
                    {l.recipient_name && ` · ${l.recipient_name}`} · {l.item_count} Wünsche
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl">Familie</h2>
          <Link href="/recipients/new" className="btn-ghost"><Icon name="plus" /> Kind / Person</Link>
        </div>
        {recipients.length === 0 ? (
          <div className="card text-sm muted">
            Leg für jedes Kind ein Profil an – Alter, Interessen, No-Gos. Einmal gemacht, gilt es für alle Anlässe und
            macht die KI-Ideen richtig gut.
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {recipients.map((r) => (
              <Link key={r.id} href={`/recipients/${r.id}`} className="card flex items-center gap-3 !py-3">
                <span className="thumb display" style={{ width: 40, height: 40, borderRadius: 999, color: "var(--ink)" }}>
                  {r.name.slice(0, 1).toUpperCase()}
                </span>
                <span>
                  <span className="block font-semibold">{r.name}</span>
                  <span className="block text-xs muted">
                    {recipientAge(r) != null ? `${recipientAge(r)} Jahre` : "Alter offen"}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {archived.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg muted">Archiv</h2>
          <ul className="space-y-1 text-sm">
            {archived.map((l) => (
              <li key={l.id}><Link className="underline" href={`/lists/${l.id}`}>{l.title}</Link></li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
