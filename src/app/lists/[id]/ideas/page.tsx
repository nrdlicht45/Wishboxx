import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { ageFromBirthdate, getList, getRecipient } from "@/lib/repo";
import { IdeaGenerator } from "@/components/IdeaGenerator";

export default async function IdeasPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const list = getList(Number((await params).id), user.id);
  if (!list) notFound();
  const rec = list.recipient_id ? getRecipient(list.recipient_id, user.id) : undefined;
  return (
    <div className="space-y-4">
      <Link href={`/lists/${list.id}`} className="muted text-sm underline">← zurück zu „{list.title}“</Link>
      <h1 className="text-3xl leading-tight sm:text-4xl">Ideen, die <span className="g">{rec?.name ? `${rec.name} wirklich` : "wirklich"}</span> freuen.</h1>
      <p className="muted">
        Die KI berücksichtigt Alter, Interessen, No-Gos, „hat schon“ und was bereits auf der Liste steht. Tipp: Lass im
        Kindermodus dein Kind selbst wischen!
      </p>
      <IdeaGenerator
        listId={list.id}
        defaults={{
          age: ageFromBirthdate(rec?.birthdate ?? null),
          gender: rec?.gender ?? "none",
          interests: rec?.interests ?? "",
          avoid: rec?.avoid ?? "",
          budgetMin: list.budget_min,
          budgetMax: list.budget_max,
          name: rec?.name ?? null,
        }}
      />
    </div>
  );
}
