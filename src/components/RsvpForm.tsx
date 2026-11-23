"use client";
import { useActionState, useState } from "react";
import { submitRsvp, type RsvpState } from "@/app/actions";
import { SubmitButton } from "./SubmitButton";
import { Icon } from "./Icon";

export interface ExistingRsvp {
  guest_name: string;
  status: "yes" | "no";
  kids: number | null;
  other_gift: number;
  message: string;
}

/** Gäste melden sich zur Feier an oder ab – optional „wir schenken etwas anderes“, ohne zu sagen was. */
export function RsvpForm({
  listToken,
  existing,
  defaultName,
  childName,
}: {
  listToken: string;
  existing: ExistingRsvp | null;
  defaultName: string;
  childName: string;
}) {
  const [state, action] = useActionState<RsvpState | undefined, FormData>(submitRsvp, undefined);
  const [editing, setEditing] = useState(!existing);
  const [status, setStatus] = useState<"yes" | "no">(existing?.status ?? "yes");

  const done = (state?.ok || existing) && !editing;
  if (done) {
    const yes = state?.ok ? state.status === "yes" : existing?.status === "yes";
    return (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-3">
          <span className="ic-bubble" style={{ width: 40, height: 40 }}><Icon name={yes ? "check" : "heart"} /></span>
          <span>
            <strong>{yes ? "Ihr seid dabei!" : "Schade – danke für die Rückmeldung."}</strong>
            <span className="muted block text-sm">Die Familie weiß Bescheid.</span>
          </span>
        </p>
        <button type="button" className="btn-ghost" onClick={() => setEditing(true)}>Ändern</button>
      </div>
    );
  }

  return (
    <form action={(fd) => { setEditing(false); return action(fd); }} className="space-y-4">
      <input type="hidden" name="list_token" value={listToken} />
      <input type="hidden" name="status" value={status} />
      <div className="flex flex-wrap gap-2" role="group" aria-label="Kommt ihr?">
        {([["yes", "Wir kommen"], ["no", "Wir können leider nicht"]] as const).map(([k, v]) => (
          <button key={k} type="button" aria-pressed={status === k} onClick={() => setStatus(k)}
            className="min-h-11 rounded-full px-4 text-sm font-semibold"
            style={status === k ? { background: "var(--grad)", color: "#fff" } : { background: "var(--field)", color: "var(--ink)" }}>
            {v}
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="rs-name">Wer antwortet?</label>
          <input className="input" id="rs-name" name="guest_name" required defaultValue={existing?.guest_name ?? defaultName}
            autoComplete="name" placeholder="z.B. Ben & Mama Julia" />
        </div>
        {status === "yes" && (
          <div>
            <label className="label" htmlFor="rs-kids">Wie viele Kinder?</label>
            <input className="input" id="rs-kids" name="kids" type="number" min={0} max={20} inputMode="numeric"
              defaultValue={existing?.kids ?? 1} />
          </div>
        )}
      </div>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="other_gift" defaultChecked={!!existing?.other_gift} className="mt-1 h-5 w-5" />
        <span>
          <strong>Wir schenken etwas anderes</strong>
          <span className="muted block">Nicht von der Liste – ihr müsst nicht sagen, was. Hilft der Familie beim Überblick.</span>
        </span>
      </label>
      <div>
        <label className="label" htmlFor="rs-msg">Nachricht (optional)</label>
        <input className="input" id="rs-msg" name="message" defaultValue={existing?.message ?? ""}
          placeholder={`z.B. Wir bringen ${childName} um 15 Uhr`} />
      </div>
      {state?.error && <p className="text-sm font-semibold" style={{ color: "var(--pink-ink)" }}>{state.error}</p>}
      <SubmitButton className="btn">Rückmeldung senden</SubmitButton>
    </form>
  );
}
