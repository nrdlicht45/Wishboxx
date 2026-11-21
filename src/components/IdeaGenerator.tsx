"use client";
import { useActionState, useState, useTransition } from "react";
import { addItem, generateIdeas, type IdeaWithLink, type IdeasState } from "@/app/actions";
import { SubmitButton } from "./SubmitButton";

const GENDERS: Record<string, string> = { none: "keine Angabe", girl: "Mädchen", boy: "Junge", diverse: "divers" };

interface Defaults {
  age: number | null;
  gender: string;
  interests: string;
  avoid: string;
  budgetMin: number | null;
  budgetMax: number | null;
  name: string | null;
}

export function IdeaGenerator({ listId, defaults }: { listId: number; defaults: Defaults }) {
  const [state, action] = useActionState<IdeasState | undefined, FormData>(generateIdeas, undefined);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [kidMode, setKidMode] = useState(false);
  const [index, setIndex] = useState(0);
  const [pending, startTransition] = useTransition();

  const take = (idea: IdeaWithLink) => {
    const fd = new FormData();
    fd.set("list_id", String(listId));
    fd.set("title", idea.title);
    fd.set("description", `${idea.description} – ${idea.reason}`);
    fd.set("price", String(idea.price_estimate));
    fd.set("source", "ai");
    if (idea.url) fd.set("url", idea.url);
    startTransition(async () => {
      await addItem(fd);
      setAdded((s) => new Set(s).add(idea.title));
    });
  };

  const ideas = state?.ideas ?? [];
  const current = ideas[index];

  return (
    <div className="space-y-6">
      <form action={(fd) => { setIndex(0); return action(fd); }} className="card grid gap-3 sm:grid-cols-6">
        <input type="hidden" name="list_id" value={listId} />
        <div>
          <label className="label" htmlFor="age">Alter</label>
          <input className="input" id="age" name="age" type="number" min={0} max={99} defaultValue={defaults.age ?? ""} />
        </div>
        <div>
          <label className="label" htmlFor="gender">Geschlecht</label>
          <select className="input" id="gender" name="gender" defaultValue={defaults.gender}>
            {Object.entries(GENDERS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="budget_min">Budget von / bis €</label>
          <div className="flex gap-2">
            <input className="input" id="budget_min" name="budget_min" inputMode="decimal" defaultValue={defaults.budgetMin ?? ""} />
            <input className="input" name="budget_max" inputMode="decimal" defaultValue={defaults.budgetMax ?? ""} aria-label="Budget bis" />
          </div>
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="interests">Interessen</label>
          <input className="input" id="interests" name="interests" defaultValue={defaults.interests} placeholder="Dinos, Basteln" />
        </div>
        <div className="sm:col-span-3">
          <label className="label" htmlFor="avoid">No-Gos</label>
          <input className="input" id="avoid" name="avoid" defaultValue={defaults.avoid} placeholder="kein Plastik, keine Süßigkeiten" />
        </div>
        <div className="sm:col-span-3">
          <label className="label" htmlFor="extra">Sonstiger Wunsch</label>
          <input className="input" id="extra" name="extra" placeholder="z.B. eher was für draußen, nachhaltig" />
        </div>
        <div className="sm:col-span-6">
          <SubmitButton pendingText="Die KI denkt nach…">Ideen generieren</SubmitButton>
        </div>
      </form>

      {state?.note && <p className="chip">{state.note}</p>}
      {state?.error && <p className="font-bold text-red-600">{state.error}</p>}

      {ideas.length > 0 && (
        <div className="flex items-center gap-3">
          <button type="button" className={kidMode ? "btn-ghost" : "btn"} onClick={() => setKidMode(false)}>Liste</button>
          <button type="button" className={kidMode ? "btn" : "btn-ghost"} onClick={() => { setKidMode(true); setIndex(0); }}>
            🧒 Kindermodus {defaults.name ? `für ${defaults.name}` : ""}
          </button>
        </div>
      )}

      {kidMode && ideas.length > 0 && (
        <div className="card mx-auto max-w-md text-center">
          {current ? (
            <>
              <div className="text-6xl" aria-hidden>🎁</div>
              <h3 className="mt-3 text-2xl font-extrabold">{current.title}</h3>
              <p className="muted mt-2">{current.description}</p>
              <p className="mt-1 text-sm">ca. {current.price_estimate} €</p>
              <div className="mt-6 flex justify-center gap-4">
                <button type="button" className="btn-ghost text-2xl" onClick={() => setIndex(index + 1)} aria-label="Nein">👎</button>
                <button type="button" className="btn text-2xl" disabled={pending}
                  onClick={() => { take(current); setIndex(index + 1); }} aria-label="Ja, auf die Liste">👍</button>
              </div>
              <p className="muted mt-3 text-xs">{index + 1} von {ideas.length}</p>
            </>
          ) : (
            <p className="font-bold">Fertig! {added.size} Wünsche ausgesucht. 🎉</p>
          )}
        </div>
      )}

      {!kidMode && (
        <div className="grid gap-3 sm:grid-cols-2">
          {ideas.map((idea) => (
            <div key={idea.title} className="card flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-extrabold">{idea.title}</h3>
                <span className="chip whitespace-nowrap">ca. {idea.price_estimate} €</span>
              </div>
              <p className="text-sm">{idea.description}</p>
              <p className="muted text-sm">💡 {idea.reason}</p>
              <div className="mt-auto flex flex-wrap gap-2 pt-2">
                {added.has(idea.title) ? (
                  <span className="chip chip-ok">✓ auf der Liste</span>
                ) : (
                  <button type="button" className="btn" disabled={pending} onClick={() => take(idea)}>Auf die Liste</button>
                )}
                {idea.url && (
                  <a href={idea.url} target="_blank" rel="noopener" className="btn-ghost">Im Shop suchen</a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
