"use client";
import { useActionState, useState, useTransition } from "react";
import { addItem, ideasForQuery, smartAdd, type QueryIdeasState } from "@/app/actions";
import { SubmitButton } from "./SubmitButton";
import { Icon } from "./Icon";

const PRIO: Record<number, string> = { 1: "Herzenswunsch", 2: "Normal", 3: "Wäre nett" };

/** Ein Feld für alles: Link/Stichwort direkt hinzufügen – oder die KI nach passenden Vorschlägen fragen. */
export function SmartAdd({ listId, shopName }: { listId: number; shopName: string }) {
  const [ideas, askAi, asking] = useActionState<QueryIdeasState | undefined, FormData>(ideasForQuery, undefined);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  const take = (i: NonNullable<QueryIdeasState["ideas"]>[number]) => {
    const fd = new FormData();
    fd.set("list_id", String(listId));
    fd.set("title", i.title);
    fd.set("description", `${i.description} – ${i.reason}`);
    if (i.price_estimate) fd.set("price", String(i.price_estimate));
    fd.set("source", "ai");
    if (i.url) fd.set("url", i.url);
    startTransition(async () => {
      await addItem(fd);
      setAdded((s) => new Set(s).add(i.title));
    });
  };

  return (
    <div className="space-y-3">
      <form action={smartAdd} className="space-y-3">
        <input type="hidden" name="list_id" value={listId} />
        <div className="flex gap-2">
          <label htmlFor="q" className="sr-only">Link, Stichwort oder Frage</label>
          <input className="input min-w-0 flex-1" id="q" name="q" required autoComplete="off" enterKeyHint="send"
            placeholder="Link, Stichwort oder Frage, z.B. „etwas mit Pferden“" />
          <SubmitButton pendingText="…" className="btn shrink-0 !px-4"><Icon name="plus" /><span className="sr-only">So hinzufügen</span></SubmitButton>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="submit" formAction={askAi} className="btn-ghost" disabled={asking} formNoValidate={false}>
            <Icon name="sparkle" /> {asking ? "Die KI sucht …" : "KI-Vorschläge dazu"}
          </button>
        </div>
        <details className="text-sm">
          <summary className="muted cursor-pointer">Mehr Optionen (Preis, Laden, Gruppengeschenk …)</summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-4">
            <div>
              <label className="label" htmlFor="price">Preis €</label>
              <input className="input" id="price" name="price" inputMode="decimal" />
            </div>
            <div>
              <label className="label" htmlFor="quantity">Anzahl</label>
              <input className="input" id="quantity" name="quantity" type="number" min={1} max={20} defaultValue={1} />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="priority">Priorität</label>
              <select className="input" id="priority" name="priority" defaultValue={2}>
                {Object.entries(PRIO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <label className="flex items-center gap-2 sm:col-span-2">
              <input type="checkbox" name="source" value="store" /> Liegt im Laden {shopName && `(${shopName})`}
            </label>
            <label className="flex items-center gap-2 sm:col-span-2">
              <input type="checkbox" name="is_group_gift" /> Gruppengeschenk (mehrere legen zusammen)
            </label>
          </div>
        </details>
      </form>

      {ideas?.error && <p className="chip chip-pink">{ideas.error}</p>}
      {ideas?.ideas && (
        <div className="space-y-2 rounded-2xl p-3" style={{ background: "var(--field)" }} aria-live="polite">
          <p className="text-sm font-semibold">Vorschläge zu „{ideas.q}“</p>
          {ideas.note && <p className="muted text-xs">{ideas.note}</p>}
          {ideas.ideas.length === 0 && <p className="muted text-sm">Dazu fiel uns nichts Passendes ein – probier ein anderes Stichwort.</p>}
          {ideas.ideas.map((i) => (
            <div key={i.title} className="card flex items-center gap-3 !p-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold leading-snug">{i.title}</p>
                <p className="muted text-xs">{i.reason}{i.price_estimate ? ` · ca. ${i.price_estimate} €` : ""}</p>
              </div>
              {added.has(i.title) ? (
                <span className="chip chip-ok"><Icon name="check" size={13} /> drin</span>
              ) : (
                <button type="button" className="btn shrink-0 !px-4" disabled={pending} onClick={() => take(i)}>Übernehmen</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
