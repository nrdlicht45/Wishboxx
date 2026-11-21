import { requireUser } from "@/lib/auth";
import { RecipientForm } from "@/components/RecipientForm";

export default async function NewRecipient() {
  await requireUser();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Neues Profil</h1>
      <RecipientForm />
    </div>
  );
}
