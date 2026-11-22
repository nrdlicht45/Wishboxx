import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getLists, getMemoCounts, getRecipients, recipientAge } from "@/lib/repo";
import { Icon } from "@/components/Icon";

export const metadata = { title: "Familie – Wishboxx" };

export default async function FamiliePage() {
  const user = await requireUser();
  const kids = getRecipients(user.id);
  const memos = getMemoCounts(user.id);
  const lists = getLists(user.id);
  return (
    <div className="space-y-6">
      <h1 className="text-3xl">Deine <span className="g">Familie</span></h1>
      {kids.length === 0 && <p className="card muted">Noch niemand angelegt. Beim ersten „Boxx packen“ entsteht das Profil automatisch.</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        {kids.map((k) => {
          const age = recipientAge(k);
          const boxes = lists.filter((l) => l.recipient_id === k.id);
          return (
            <Link key={k.id} href={`/recipients/${k.id}`} className="card flex items-center gap-4">
              <span className="thumb display text-xl" style={{ width: 56, height: 56, borderRadius: 999, color: "var(--ink)" }}>
                {k.name.slice(0, 1).toUpperCase()}
              </span>
              <span className="min-w-0">
                <span className="display block text-lg">{k.name}</span>
                <span className="block text-sm muted">
                  {age != null ? `${age} Jahre · ` : ""}{boxes.length} {boxes.length === 1 ? "Boxx" : "Boxen"}
                  {memos[k.id] ? ` · ${memos[k.id]} gemerkt` : ""}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
      <Link href="/recipients/new" className="btn-ghost"><Icon name="plus" /> Kind / Person hinzufügen</Link>
    </div>
  );
}
