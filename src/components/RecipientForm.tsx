import type { Recipient } from "@/lib/repo";
import { GENDERS } from "@/lib/repo";
import { saveRecipient } from "@/app/actions";
import { SubmitButton } from "./SubmitButton";

export function RecipientForm({ r }: { r?: Recipient }) {
  return (
    <form action={saveRecipient} className="card space-y-4">
      {r && <input type="hidden" name="id" value={r.id} />}
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="name">Name / Spitzname</label>
          <input className="input" id="name" name="name" required defaultValue={r?.name} />
        </div>
        <div>
          <label className="label" htmlFor="birthdate">Geburtsdatum</label>
          <input className="input" id="birthdate" name="birthdate" type="date" defaultValue={r?.birthdate ?? ""} />
        </div>
        <div>
          <label className="label" htmlFor="gender">Geschlecht (optional)</label>
          <select className="input" id="gender" name="gender" defaultValue={r?.gender ?? "none"}>
            {Object.entries(GENDERS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="label" htmlFor="interests">Interessen (mit Komma trennen)</label>
        <input className="input" id="interests" name="interests" placeholder="Dinos, Pferde, Basteln, Fußball, Lesen"
          defaultValue={r?.interests} />
      </div>
      <div>
        <label className="label" htmlFor="avoid">No-Gos – das bitte nicht</label>
        <input className="input" id="avoid" name="avoid" placeholder="Süßigkeiten, Plastikspielzeug, Schleim, Bildschirm"
          defaultValue={r?.avoid} />
      </div>
      <div>
        <label className="label" htmlFor="owned">Hat schon (verhindert doppelte Geschenke)</label>
        <textarea className="input" id="owned" name="owned" rows={2} placeholder="Toniebox, Laufrad, LEGO Feuerwehr"
          defaultValue={r?.owned} />
      </div>
      <div>
        <label className="label" htmlFor="sizes">Größen</label>
        <input className="input" id="sizes" name="sizes" placeholder="Kleidung 116, Schuhe 29"
          defaultValue={r?.sizes} />
      </div>
      <p className="muted text-xs">
        Datenschutz: An die KI werden nur Alter, Geschlecht, Interessen und Listen-Inhalte übermittelt – niemals Name
        oder Geburtsdatum.
      </p>
      <SubmitButton>Speichern</SubmitButton>
    </form>
  );
}
