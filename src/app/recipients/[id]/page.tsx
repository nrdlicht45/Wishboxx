import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getRecipient } from "@/lib/repo";
import { RecipientForm } from "@/components/RecipientForm";
import { deleteRecipient } from "@/app/actions";

export default async function EditRecipient({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const r = getRecipient(Number((await params).id), user.id);
  if (!r) notFound();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl">Profil: {r.name}</h1>
      <RecipientForm r={r} />
      <form action={deleteRecipient}>
        <input type="hidden" name="id" value={r.id} />
        <button className="text-sm text-red-600 underline" type="submit">Profil löschen</button>
      </form>
    </div>
  );
}
