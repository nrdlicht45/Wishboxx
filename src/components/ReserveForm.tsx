"use client";
import { Icon } from "./Icon";
import { useActionState, useState } from "react";
import { reserveItem } from "@/app/actions";
import { SubmitButton } from "./SubmitButton";

export function ReserveForm({
  listToken,
  itemId,
  groupGift,
  remaining,
  hasDate,
  defaultName = "",
  privacyHint,
}: {
  listToken: string;
  itemId: number;
  groupGift: boolean;
  remaining: number | null;
  hasDate: boolean;
  defaultName?: string;
  privacyHint: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(reserveItem, undefined);

  if (state && "ok" in state && state.ok) {
    return (
      <div className="space-y-2">
        <p className="chip chip-ok">
          Danke! {groupGift ? "Deine Zusage ist eingetragen." : "Das Geschenk ist für dich reserviert."}
        </p>
        <p className="flex flex-wrap gap-2 text-sm">
          {hasDate && <a className="btn-ghost" href={`/r/${state.token}/ics`}><Icon name="calendar" /> Erinnerung in Kalender</a>}
          <a className="btn-ghost" href={`/r/${state.token}`}>Reservierung verwalten</a>
        </p>
      </div>
    );
  }
  if (!open) {
    return (
      <button type="button" className={groupGift ? "btn-ghost" : "btn"} onClick={() => setOpen(true)}>
        <Icon name={groupGift ? "users" : "gift"} /> {groupGift ? "Ich mache mit" : "Ich schenke das"}
      </button>
    );
  }
  return (
    <form action={action} className="mt-2 grid w-full gap-3">
      <input type="hidden" name="list_token" value={listToken} />
      <input type="hidden" name="item_id" value={itemId} />
      <div>
        <label className="label" htmlFor={`rn-${itemId}`}>Von wem?</label>
        <input className="input" id={`rn-${itemId}`} name="guest_name" required defaultValue={defaultName}
          autoComplete="name" placeholder="z.B. Ben & Mama Julia" aria-describedby={`rh-${itemId}`} />
        <p id={`rh-${itemId}`} className="muted mt-1 text-xs">{privacyHint}</p>
      </div>
      {groupGift && (
        <div>
          <label className="label" htmlFor={`ra-${itemId}`}>Betrag in €{remaining != null ? ` (noch ${remaining.toFixed(2).replace(".", ",")} € offen)` : ""}</label>
          <input className="input" id={`ra-${itemId}`} name="amount" inputMode="decimal" required />
        </div>
      )}
      <details>
        <summary className="muted cursor-pointer text-sm">Erinnerung & Notiz (optional)</summary>
        <div className="mt-2 grid gap-3">
          <div>
            <label className="label" htmlFor={`re-${itemId}`}>E-Mail für Erinnerung</label>
            <input className="input" id={`re-${itemId}`} name="guest_email" type="email" autoComplete="email" />
          </div>
          <div>
            <label className="label" htmlFor={`rm-${itemId}`}>Notiz für die Familie</label>
            <input className="input" id={`rm-${itemId}`} name="message" placeholder="z.B. Wir bringen es zur Feier mit" />
          </div>
        </div>
      </details>
      {state && "error" in state && state.error && (
        <p className="text-sm font-bold" style={{ color: "var(--pink-ink)" }}>{state.error}</p>
      )}
      <div className="flex gap-2">
        <SubmitButton>{groupGift ? "Zusagen" : "Verbindlich reservieren"}</SubmitButton>
        <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>Abbrechen</button>
      </div>
    </form>
  );
}
