import { requireUser } from "@/lib/auth";
import { getRecipients } from "@/lib/repo";
import { ListForm } from "@/components/ListForm";
import { createList } from "@/app/actions";

export default async function NewList() {
  const user = await requireUser();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl">Neue Boxx anlegen</h1>
      <ListForm recipients={getRecipients(user.id)} action={createList} />
    </div>
  );
}
