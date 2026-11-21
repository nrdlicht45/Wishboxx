import type { List, Recipient } from "@/lib/repo";
import { OCCASIONS, REVEAL_MODES } from "@/lib/repo";
import { SubmitButton } from "./SubmitButton";

export function ListForm({
  list,
  recipients,
  action,
}: {
  list?: List;
  recipients: Recipient[];
  action: (fd: FormData) => Promise<void>;
}) {
  return (
    <form action={action} className="card space-y-4">
      {list && <input type="hidden" name="id" value={list.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="title">Titel</label>
          <input className="input" id="title" name="title" required placeholder="Emmas 6. Geburtstag"
            defaultValue={list?.title} />
        </div>
        <div>
          <label className="label" htmlFor="recipient_id">Für wen?</label>
          <select className="input" id="recipient_id" name="recipient_id" defaultValue={list?.recipient_id ?? ""}>
            <option value="">– ohne Profil –</option>
            {recipients.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="occasion">Anlass</label>
          <select className="input" id="occasion" name="occasion" defaultValue={list?.occasion ?? "birthday"}>
            {Object.entries(OCCASIONS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="event_date">Datum der Feier</label>
          <input className="input" id="event_date" name="event_date" type="date" defaultValue={list?.event_date ?? ""} />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="description">Nachricht an die Gäste</label>
        <textarea className="input" id="description" name="description" rows={3}
          placeholder="Wir feiern am Samstag ab 15 Uhr im Garten. Emma freut sich über eine Kleinigkeit aus ihrer Kiste!"
          defaultValue={list?.description} />
      </div>
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="label">Budget-Rahmen pro Geschenk (wird Gästen angezeigt)</legend>
        <input className="input" name="budget_min" inputMode="decimal" placeholder="von, z.B. 10"
          defaultValue={list?.budget_min ?? ""} aria-label="Budget von" />
        <input className="input" name="budget_max" inputMode="decimal" placeholder="bis, z.B. 15"
          defaultValue={list?.budget_max ?? ""} aria-label="Budget bis" />
      </fieldset>
      <div>
        <label className="label" htmlFor="reveal_mode">Was möchtest du über Reservierungen sehen?</label>
        <select className="input" id="reveal_mode" name="reveal_mode" defaultValue={list?.reveal_mode ?? "status"}>
          {Object.entries(REVEAL_MODES).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <p className="muted mt-1 text-xs">Nach dem Fest-Datum wird alles für die Danke-Liste sichtbar.</p>
      </div>
      <details className="rounded-xl border p-3" style={{ borderColor: "var(--line)" }}>
        <summary className="cursor-pointer font-bold">Kiste liegt (auch) im Laden? / Gruppengeschenke</summary>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="shop_name">Geschäft</label>
            <input className="input" id="shop_name" name="shop_name" placeholder="Spielwaren Müller"
              defaultValue={list?.shop_name} />
          </div>
          <div>
            <label className="label" htmlFor="shop_address">Adresse / Öffnungszeiten</label>
            <input className="input" id="shop_address" name="shop_address" placeholder="Hauptstr. 5, Mo–Sa 9–18 Uhr"
              defaultValue={list?.shop_address} />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="payment_hint">Hinweis zum Zusammenlegen (Gruppengeschenke)</label>
            <input className="input" id="payment_hint" name="payment_hint"
              placeholder="Bitte Betrag bar zur Feier mitbringen oder per PayPal an sarah@…"
              defaultValue={list?.payment_hint} />
          </div>
        </div>
      </details>
      <SubmitButton>{list ? "Speichern" : "Kiste anlegen"}</SubmitButton>
    </form>
  );
}
