import Link from "next/link";
import { QuickStart, type KnownChild } from "@/components/QuickStart";
import { LoginLinkForm } from "@/components/LoginLinkForm";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getMemoCounts, getRecipients, recipientAge } from "@/lib/repo";

export const metadata = { title: "Boxx packen – Wishboxx" };

export default async function StartPage() {
  const user = await getCurrentUser();
  let known: KnownChild[] = [];
  if (user?.is_guest) {
    const first = getDb().prepare("SELECT id, title FROM lists WHERE user_id = ? ORDER BY id LIMIT 1").get(user.id) as
      | { id: number; title: string }
      | undefined;
    if (first) {
      return (
        <div className="card mx-auto max-w-xl space-y-4">
          <h1 className="text-3xl leading-tight">Noch eine Boxx? <span className="g">Kurz sichern.</span></h1>
          <p className="muted">
            „{first.title}“ ist ohne Konto gepackt. Für mehrere Boxen – Geschwister, Weihnachten, Ostern – brauchst du nur deine
            E-Mail. Kein Passwort, nur ein Link. Danach geht es direkt hier weiter.
          </p>
          <LoginLinkForm withName next="/start" cta="Sichern und weiter" />
          <Link href={`/lists/${first.id}`} className="muted block text-center text-sm underline">Zurück zu „{first.title}“</Link>
        </div>
      );
    }
  }
  if (user) {
    const memos = getMemoCounts(user.id);
    known = getRecipients(user.id).map((r) => ({
      id: r.id,
      name: r.name,
      age: recipientAge(r),
      gender: r.gender,
      interests: r.interests,
      avoid: r.avoid,
      memos: memos[r.id] ?? 0,
    }));
  }
  return <QuickStart known={known} />;
}
