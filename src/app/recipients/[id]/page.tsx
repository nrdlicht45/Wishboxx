import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getLists, getMemos, getRecipient, recipientAge } from "@/lib/repo";
import { RecipientForm } from "@/components/RecipientForm";
import { SubmitButton } from "@/components/SubmitButton";
import { Icon, IconBubble } from "@/components/Icon";
import { addMemo, deleteMemo, deleteRecipient } from "@/app/actions";

export default async function EditRecipient({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const r = getRecipient(Number((await params).id), user.id);
  if (!r) notFound();
  const memos = getMemos(r.id);
  const boxes = getLists(user.id).filter((l) => l.recipient_id === r.id);
  const age = recipientAge(r);
  const owned = r.owned.split(",").map((s) => s.trim()).filter(Boolean);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-sm font-semibold muted">Familie</p>
        <h1 className="text-3xl"><span className="g">{r.name}</span>{age != null ? `, ${age} Jahre` : ""}</h1>
      </div>

      <section className="card space-y-4" aria-labelledby="memo-h">
        <div className="flex items-center gap-3">
          <IconBubble name="bulb" />
          <div>
            <h2 id="memo-h" className="text-lg">Merkzettel</h2>
            <p className="muted text-sm">Ideen und Fortsetzungen fürs nächste Mal. Sie landen beim nächsten Packen automatisch in der Boxx.</p>
          </div>
        </div>
        <form action={addMemo} className="flex gap-2">
          <input type="hidden" name="recipient_id" value={r.id} />
          <label htmlFor="memo-new" className="sr-only">Neue Idee für {r.name}</label>
          <input id="memo-new" name="title" className="input flex-1" required placeholder="z.B. Schule der magischen Tiere Band 2" />
          <SubmitButton className="btn shrink-0 !px-4"><Icon name="plus" /><span className="sr-only">Merken</span></SubmitButton>
        </form>
        {memos.length === 0 ? (
          <p className="muted text-sm">Noch leer. Tipp: Bei jedem Wunsch einer Boxx gibt es „Fortsetzung merken“.</p>
        ) : (
          <ul className="space-y-2">
            {memos.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 border-t pt-2 first:border-0 first:pt-0" style={{ borderColor: "var(--line)" }}>
                <span className="min-w-0">
                  <span className="block font-semibold">{m.title}</span>
                  {m.from_item && <span className="block text-xs muted">gemerkt nach „{m.from_item}“</span>}
                </span>
                <form action={deleteMemo}>
                  <input type="hidden" name="id" value={m.id} />
                  <input type="hidden" name="recipient_id" value={r.id} />
                  <button type="submit" aria-label={`„${m.title}“ vom Merkzettel löschen`}
                    className="flex h-11 w-11 items-center justify-center rounded-full muted hover:bg-[var(--bubble)]">✕</button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <Link href="/start" className="btn-ghost"><Icon name="sparkle" /> Neue Boxx für {r.name} packen</Link>
      </section>

      {owned.length > 0 && (
        <section className="card space-y-2">
          <h2 className="text-lg">Hat schon</h2>
          <p className="muted text-sm">Wird nie wieder vorgeschlagen. Die KI nutzt es, um Fortsetzungen zu finden.</p>
          <div className="flex flex-wrap gap-1.5">{owned.map((o) => <span key={o} className="chip">{o}</span>)}</div>
        </section>
      )}

      {boxes.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg">Boxen</h2>
          <ul className="space-y-1 text-sm">
            {boxes.map((b) => (
              <li key={b.id}>
                <Link className="underline" href={`/lists/${b.id}`}>{b.title}</Link>
                {b.archived ? <span className="muted"> · Archiv</span> : null}
              </li>
            ))}
          </ul>
        </section>
      )}

      <details className="card">
        <summary className="cursor-pointer font-semibold">Profil bearbeiten</summary>
        <div className="mt-4"><RecipientForm r={r} /></div>
      </details>

      <form action={deleteRecipient}>
        <input type="hidden" name="id" value={r.id} />
        <button className="text-sm underline" style={{ color: "var(--pink-ink)" }} type="submit">Profil löschen</button>
      </form>
    </div>
  );
}
