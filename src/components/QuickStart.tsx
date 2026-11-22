"use client";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { quickStart } from "@/app/actions";
import { Icon } from "./Icon";

const OCCASIONS = [
  ["birthday", "Geburtstag"],
  ["christmas", "Weihnachten"],
  ["easter", "Ostern"],
  ["school", "Einschulung"],
  ["communion", "Kommunion / Konfirmation"],
  ["baby", "Baby / Taufe"],
] as const;
const BUDGETS = [["10", "bis 10 €"], ["15", "10–15 €"], ["25", "15–25 €"], ["", "egal"]] as const;
const INTERESTS = ["Dinos", "Pferde", "Basteln", "LEGO", "Fußball", "Lesen", "Musik", "Autos", "Puppen", "Tiere", "Malen", "Einhörner", "Weltraum", "Experimente", "Draußen", "Rollenspiele"];
const NOGOS = ["Süßigkeiten", "Plastikspielzeug", "Bildschirm", "Laute Spielsachen", "Schleim"];

function Chip({ on, children, onClick }: { on: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick}
      className="min-h-11 rounded-full px-4 text-sm font-semibold transition"
      style={on
        ? { background: "var(--grad)", color: "#fff", boxShadow: "0 6px 16px rgba(168,107,255,.3)" }
        : { background: "var(--card)", color: "var(--ink)", boxShadow: "var(--shadow)" }}>
      {children}
    </button>
  );
}

function Finish() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn w-full text-lg" disabled={pending}>
      {pending ? "Wir packen die Boxx …" : <><Icon name="sparkle" /> Boxx packen</>}
    </button>
  );
}

export interface KnownChild {
  id: number;
  name: string;
  age: number | null;
  gender: string;
  interests: string;
  avoid: string;
  memos: number;
}

export function QuickStart({ known = [] }: { known?: KnownChild[] }) {
  const [state, action] = useActionState(quickStart, undefined);
  const [step, setStep] = useState(0);
  const [childId, setChildId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("none");
  const [occasion, setOccasion] = useState("birthday");
  const [date, setDate] = useState("");
  const [budget, setBudget] = useState("15");
  const [interests, setInterests] = useState<string[]>([]);
  const [own, setOwn] = useState("");
  const [nogos, setNogos] = useState<string[]>([]);
  const pickChild = (c: KnownChild | null) => {
    setChildId(c?.id ?? null);
    setName(c?.name ?? "");
    setAge(c?.age != null ? String(occasion === "birthday" ? c.age + 1 : c.age) : "");
    setGender(c?.gender ?? "none");
    const list = (c?.interests ?? "").split(",").map((x) => x.trim()).filter(Boolean);
    setInterests(list.filter((x) => INTERESTS.includes(x)));
    setOwn(list.filter((x) => !INTERESTS.includes(x)).join(", "));
    setNogos((c?.avoid ?? "").split(",").map((x) => x.trim()).filter((x) => NOGOS.includes(x)));
  };
  const toggle = (arr: string[], set: (v: string[]) => void, v: string) => set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const who = name.trim() || "das Kind";
  const canNext = step === 0 ? name.trim().length > 0 : true;

  return (
    <form action={action} className="mx-auto max-w-xl space-y-6">
      <input type="hidden" name="name" value={name} />
      <input type="hidden" name="recipient_id" value={childId ?? ""} />
      <input type="hidden" name="age" value={age} />
      <input type="hidden" name="gender" value={gender} />
      <input type="hidden" name="occasion" value={occasion} />
      <input type="hidden" name="event_date" value={date} />
      <input type="hidden" name="budget" value={budget} />
      <input type="hidden" name="interests" value={[...interests, ...own.split(",").map((s) => s.trim()).filter(Boolean)].join(", ")} />
      <input type="hidden" name="avoid" value={nogos.join(", ")} />

      <div className="flex items-center gap-2" aria-label={`Schritt ${step + 1} von 3`}>
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-1.5 flex-1 rounded-full" style={{ background: i <= step ? "var(--grad)" : "var(--line)" }} />
        ))}
      </div>

      {step === 0 && (
        <section className="space-y-5">
          <h1 className="text-3xl leading-tight sm:text-4xl">Für <span className="g">wen</span> packen wir die Boxx?</h1>
          {known.length > 0 && (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2" role="group" aria-label="Vorhandenes Kind wählen">
                {known.map((c) => (
                  <Chip key={c.id} on={childId === c.id} onClick={() => pickChild(childId === c.id ? null : c)}>
                    {c.name}{c.age != null ? ` (${c.age})` : ""}
                  </Chip>
                ))}
                <Chip on={childId === null} onClick={() => pickChild(null)}>+ Neues Kind</Chip>
              </div>
              {childId !== null && (
                <p className="muted text-sm">
                  Wir nutzen {name}s Profil: Interessen, „hat schon“
                  {(known.find((c) => c.id === childId)?.memos ?? 0) > 0 &&
                    ` und ${known.find((c) => c.id === childId)!.memos} Einträge vom Merkzettel`}.
                </p>
              )}
            </div>
          )}
          <div>
            <label className="label" htmlFor="qs-name">Name des Kindes</label>
            <input id="qs-name" className="input text-lg" autoFocus autoComplete="off" placeholder="z.B. Emma"
              value={name} onChange={(e) => { setName(e.target.value); setChildId(null); }} />
          </div>
          <div>
            <label className="label" htmlFor="qs-age">{occasion === "birthday" ? "Wie alt wird es?" : "Wie alt ist es?"}</label>
            <input id="qs-age" className="input text-lg" inputMode="numeric" placeholder="z.B. 6" value={age}
              onChange={(e) => setAge(e.target.value.replace(/[^\d]/g, "").slice(0, 2))} />
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Geschlecht (optional)">
            <Chip on={gender === "girl"} onClick={() => setGender(gender === "girl" ? "none" : "girl")}>Mädchen</Chip>
            <Chip on={gender === "boy"} onClick={() => setGender(gender === "boy" ? "none" : "boy")}>Junge</Chip>
            <Chip on={gender === "none"} onClick={() => setGender("none")}>egal</Chip>
          </div>
        </section>
      )}

      {step === 1 && (
        <section className="space-y-5">
          <h1 className="text-3xl leading-tight sm:text-4xl">Was wird <span className="g">gefeiert</span>?</h1>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Anlass">
            {OCCASIONS.map(([k, v]) => <Chip key={k} on={occasion === k} onClick={() => setOccasion(k)}>{v}</Chip>)}
          </div>
          <div>
            <label className="label" htmlFor="qs-date">Wann? (optional)</label>
            <input id="qs-date" type="date" className="input text-lg" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <p className="label">Was darf ein Geschenk kosten?</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Budget pro Geschenk">
              {BUDGETS.map(([k, v]) => <Chip key={k} on={budget === k} onClick={() => setBudget(k)}>{v}</Chip>)}
            </div>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="space-y-5">
          <h1 className="text-3xl leading-tight sm:text-4xl">Was mag <span className="g">{who}</span>?</h1>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Interessen">
            {INTERESTS.map((i) => <Chip key={i} on={interests.includes(i)} onClick={() => toggle(interests, setInterests, i)}>{i}</Chip>)}
          </div>
          <div>
            <label className="label" htmlFor="qs-own">Noch etwas? (mit Komma trennen)</label>
            <input id="qs-own" className="input" placeholder="z.B. Feuerwehr, Paw Patrol" value={own} onChange={(e) => setOwn(e.target.value)} />
          </div>
          <div>
            <p className="label">Bitte keine …</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="No-Gos">
              {NOGOS.map((i) => <Chip key={i} on={nogos.includes(i)} onClick={() => toggle(nogos, setNogos, i)}>{i}</Chip>)}
            </div>
          </div>
        </section>
      )}

      {state?.error && <p className="font-semibold" style={{ color: "var(--pink-ink)" }}>{state.error}</p>}

      <div className="flex items-center gap-3">
        {step > 0 && <button type="button" className="btn-ghost" onClick={() => setStep(step - 1)}>Zurück</button>}
        {step < 2 ? (
          <button type="button" className="btn flex-1 text-lg" disabled={!canNext} onClick={() => setStep(step + 1)}>Weiter</button>
        ) : (
          <div className="flex-1"><Finish /></div>
        )}
      </div>
      <p className="muted text-center text-xs">Kein Konto nötig. Die KI packt dir passende Ideen direkt in die Boxx – du wählst nur noch aus.</p>
    </form>
  );
}
