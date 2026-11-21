"use client";
import { useActionState, useState } from "react";
import { reserveItem } from "@/app/actions";
import { SubmitButton } from "./SubmitButton";

export function ReserveForm({
  listToken,
  itemId,
  groupGift,
  remaining,
  hasDate,
}: {
  listToken: string;
  itemId: number;
  groupGift: boolean;
  remaining: number | null;
  hasDate: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(reserveItem, undefined);

  if (state && "ok" in state && state.ok) {
    return (
      <div className="space-y-2">
        <p className="chip chip-ok">
          🎉 Danke! {groupGift ? "Deine Zusage ist eingetragen." : "Das Geschenk ist für dich reserviert."}
        </p>
        <p className="flex flex-wrap gap-2 text-sm">
          {hasDate && <a className="btn-ghost" href={`/r/${state.token}/ics`}>📅 Erinnerung in Kalender</a>}
          <a className="btn-ghost" href={`/r/${state.token}`}>Reservierung verwalten</a>
        </p>
      </div>
    );
  }
  if (!open) {
    return (
      <button type="button" className="btn" onClick={() => setOpen(true)}>
        {groupGift ? "🤝 Ich lege mit zusammen" : "🎁 Ich schenke das"}
      </button>
    );
  }
  return (
    <form action={action} className="mt-2 grid gap-2 sm:grid-cols-2">
      <input type="hidden" name="list_token" value={listToken} />
      <input type="hidden" name="item_id" value={itemId} />
      <input className="input" name="guest_name" required placeholder="Euer Name (z.B. Ben & Mama Julia)" aria-label="Name" />
      <input className="input" name="guest_email" type="email" placeholder="E-Mail für Erinnerung (optional)" aria-label="E-Mail" />
      {groupGift && (
        <input className="input" name="amount" inputMode="decimal" required
          placeholder={remaining != null ? `Betrag in € (noch ${remaining.toFixed(2)} € offen)` : "Betrag in €"}
          aria-label="Betrag" />
      )}
      <input className="input sm:col-span-2" name="message" placeholder="Gruß ans Geburtstagskind (optional)" aria-label="Nachricht" />
      {state && "error" in state && state.error && (
        <p className="text-sm font-bold text-red-600 sm:col-span-2">{state.error}</p>
      )}
      <div className="flex gap-2 sm:col-span-2">
        <SubmitButton>{groupGift ? "Zusagen" : "Verbindlich reservieren"}</SubmitButton>
        <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>Abbrechen</button>
      </div>
    </form>
  );
}
