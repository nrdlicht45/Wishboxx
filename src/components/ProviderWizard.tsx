"use client";
import { useActionState } from "react";
import { suggestProvider, type ProviderSuggestion } from "@/app/actions";
import { ProviderForm } from "./ProviderForm";
import { SubmitButton } from "./SubmitButton";
import { Icon } from "./Icon";

/** Neuer Partner: Beispiel-Link einfügen → Einstellungen werden erkannt (oder von der KI vorgeschlagen). */
export function ProviderWizard({ initialDomain = "" }: { initialDomain?: string }) {
  const [state, action] = useActionState<ProviderSuggestion | undefined, FormData>(suggestProvider, undefined);
  return (
    <div className="space-y-4">
      <form action={action} className="space-y-3">
        <p className="muted text-sm">
          Füge einen <strong>Beispiel-Affiliate-Link</strong> aus deinem Partnerprogramm ein (z.B. einen AWIN-Deeplink oder einen
          Amazon-Link mit deiner ID). Wishboxx erkennt Shop, Domain und Partner-ID – unbekannte Formate wertet die KI aus.
        </p>
        <div>
          <label className="label" htmlFor="pw-example">Beispiel-Link oder Anleitung aus dem Partnerprogramm</label>
          <textarea className="input" id="pw-example" name="example" rows={3} required
            placeholder="https://www.awin1.com/cread.php?awinmid=…&awinaffid=…&ued=https%3A%2F%2Fwww.shop.de%2F…" />
        </div>
        <div>
          <label className="label" htmlFor="pw-domain">Shop-Domain (optional)</label>
          <input className="input" id="pw-domain" name="domain" defaultValue={initialDomain} placeholder="z.B. jako-o.de" />
        </div>
        <SubmitButton pendingText="Erkenne …" className="btn"><Icon name="sparkle" /> Erkennen</SubmitButton>
      </form>
      {state?.error && <p className="chip chip-pink">{state.error}</p>}
      {state?.draft && (
        <div className="space-y-3 rounded-2xl p-4" style={{ background: "var(--field)" }}>
          <p className="text-sm">
            <span className={state.source === "ki" ? "chip" : "chip chip-ok"}>
              <Icon name={state.source === "ki" ? "sparkle" : "check"} size={13} /> {state.source === "ki" ? "KI-Vorschlag" : "Automatisch erkannt"}
            </span>{" "}
            <span className="muted">{state.note}</span>
          </p>
          <ProviderForm key={JSON.stringify(state.draft)} p={state.draft} />
        </div>
      )}
      {!state?.draft && (
        <details>
          <summary className="muted cursor-pointer text-sm">Lieber von Hand eintragen</summary>
          <div className="mt-3"><ProviderForm p={initialDomain ? { domains: initialDomain, name: initialDomain } : undefined} /></div>
        </details>
      )}
    </div>
  );
}
