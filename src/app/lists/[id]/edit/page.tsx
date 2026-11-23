import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getList, getRecipients } from "@/lib/repo";
import { ListForm } from "@/components/ListForm";
import { deleteList, updateList } from "@/app/actions";

export default async function EditList({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const list = getList(Number((await params).id), user.id);
  if (!list) notFound();
  return (
    <div className="space-y-4">
      <Link href={`/lists/${list.id}`} className="muted inline-flex min-h-11 items-center gap-1 text-sm font-semibold">
        <span aria-hidden>←</span> Zurück zur Boxx
      </Link>
      <h1 className="text-2xl">Boxx bearbeiten</h1>
      <ListForm list={list} recipients={getRecipients(user.id)} action={updateList} />
      <form action={deleteList}>
        <input type="hidden" name="id" value={list.id} />
        <button className="text-sm text-red-600 underline" type="submit">Liste endgültig löschen</button>
      </form>
    </div>
  );
}
