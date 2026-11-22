import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getLists } from "@/lib/repo";
import { parseSharedContent } from "@/lib/share";
import { SubmitButton } from "@/components/SubmitButton";
import { addSharedItem } from "@/app/actions";

/** Ziel des Android-„Teilen“-Menüs (Web Share Target aus dem Manifest). */
export default async function SharePage({
  searchParams,
}: {
  searchParams: Promise<{ title?: string; text?: string; url?: string }>;
}) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  if (!user) {
    const qs = new URLSearchParams(Object.entries(sp).filter(([, v]) => typeof v === "string") as [string, string][]);
    redirect(`/login?next=${encodeURIComponent(`/share?${qs}`)}`);
  }
  const { url, title } = parseSharedContent(sp);
  const lists = getLists(user.id).filter((l) => !l.archived);

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="text-3xl">In die <span className="g">Boxx legen</span></h1>
      {lists.length === 0 ? (
        <div className="card space-y-3">
          <p>Du hast noch keine Boxx. Pack zuerst eine – dann kannst du Wünsche direkt aus anderen Apps teilen.</p>
          <Link className="btn" href="/start">Boxx packen</Link>
        </div>
      ) : (
        <form action={addSharedItem} className="card space-y-4">
          <div>
            <label className="label" htmlFor="list_id">In welche Boxx?</label>
            <select className="input" id="list_id" name="list_id" defaultValue={lists[0].id}>
              {lists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title}
                  {l.recipient_name ? ` (${l.recipient_name})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="title">Wunsch</label>
            <input className="input" id="title" name="title" defaultValue={title} placeholder="wird sonst automatisch geladen" />
          </div>
          <div>
            <label className="label" htmlFor="url">Link</label>
            <input className="input" id="url" name="url" type="url" defaultValue={url} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="price">Preis € (optional)</label>
              <input className="input" id="price" name="price" inputMode="decimal" />
            </div>
            <div>
              <label className="label" htmlFor="priority">Priorität</label>
              <select className="input" id="priority" name="priority" defaultValue={2}>
                <option value={1}>Herzenswunsch</option>
                <option value={2}>Normal</option>
                <option value={3}>Wäre nett</option>
              </select>
            </div>
          </div>
          <input type="hidden" name="source" value="link" />
          <SubmitButton pendingText="Lade Produktdaten…">In die Boxx legen</SubmitButton>
        </form>
      )}
    </div>
  );
}
