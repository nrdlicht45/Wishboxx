"use client";
import { Icon } from "./Icon";
import { useActionState, useRef, useState, useTransition } from "react";
import { addItem, recognizePhoto, type PhotoState } from "@/app/actions";
import { SubmitButton } from "./SubmitButton";

/** Verkleinert das Foto im Browser (spart Upload-Zeit und KI-Kosten, entfernt EXIF/GPS-Daten). */
async function shrink(file: File, max = 1280): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Bild konnte nicht verarbeitet werden"))), "image/jpeg", 0.82),
  );
}

export function PhotoWish({ listId, compact = false }: { listId: number; compact?: boolean }) {
  const [state, dispatch] = useActionState<PhotoState | undefined, FormData>(recognizePhoto, undefined);
  const [pending, startTransition] = useTransition();
  const [preview, setPreview] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setDone(false);
    setPreview(URL.createObjectURL(file));
    let blob: Blob = file;
    try {
      blob = await shrink(file);
    } catch {
      /* z.B. HEIC in älteren Browsern – Original hochladen */
    }
    const fd = new FormData();
    fd.set("list_id", String(listId));
    fd.set("photo", blob, "photo.jpg");
    startTransition(() => dispatch(fd));
  };

  const reset = () => {
    setPreview(null);
    setDone(true);
    if (inputRef.current) inputRef.current.value = "";
  };

  const p = state?.product;
  const showForm = !pending && !done && state?.image;

  return (
    <div className={compact ? "space-y-3 has-[form]:basis-full has-[p.font-semibold]:basis-full" : "space-y-3"}>
      <label className={`${compact ? "btn-ghost" : "btn"} cursor-pointer`}>
        <Icon name="camera" /> {compact ? "Foto" : "Foto aufnehmen / auswählen"}
        <input ref={inputRef} type="file" accept="image/*" capture="environment" className="sr-only"
          onChange={(e) => onFile(e.target.files?.[0])} />
      </label>
      <p className={`muted text-xs ${compact ? "hidden" : ""}`}>
        Fotografiere das Spielzeug im Laden, im Prospekt oder auf dem Bildschirm – die KI erkennt das Produkt. Bitte keine
        Personen fotografieren.
      </p>

      {pending && (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {preview && <img src={preview} alt="" className="h-20 w-20 rounded-xl object-cover" />}
          <p className="flex items-center gap-2 font-semibold"><Icon name="search" /> Die KI schaut sich das Foto an…</p>
        </div>
      )}
      {done && <p className="chip chip-ok">✓ Wunsch hinzugefügt</p>}

      {showForm && (
        <form
          action={async (fd) => {
            await addItem(fd);
            reset();
          }}
          className="grid gap-3 rounded-xl border p-3 sm:grid-cols-6"
          style={{ borderColor: "var(--line)" }}
        >
          <input type="hidden" name="list_id" value={listId} />
          <input type="hidden" name="source" value="photo" />
          <input type="hidden" name="image_url" value={state.image} />
          <input type="hidden" name="url" value={p?.url ?? ""} />
          <div className="sm:col-span-6 flex gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={state.image} alt="" className="h-24 w-24 shrink-0 rounded-xl object-cover" />
            <div className="text-sm">
              {p ? (
                <>
                  <p className="chip chip-ok"><Icon name="sparkle" size={13} /> Erkannt{p.brand && `: ${p.brand}`}</p>
                  {p.age_hint && <p className="muted mt-1">Altersangabe: {p.age_hint}</p>}
                  <p className="muted mt-1">Bitte kurz prüfen und ggf. anpassen.</p>
                </>
              ) : (
                <p className="font-bold text-red-600">{state.error}</p>
              )}
            </div>
          </div>
          <div className="sm:col-span-4">
            <label className="label" htmlFor="ph-title">Titel</label>
            <input className="input" id="ph-title" name="title" required defaultValue={p?.title ?? ""} />
          </div>
          <div>
            <label className="label" htmlFor="ph-price">Preis ca. €</label>
            <input className="input" id="ph-price" name="price" inputMode="decimal"
              defaultValue={p?.price_estimate ? String(p.price_estimate) : ""} />
          </div>
          <div>
            <label className="label" htmlFor="ph-prio">Priorität</label>
            <select className="input" id="ph-prio" name="priority" defaultValue={2}>
              <option value={1}>Herzenswunsch</option>
              <option value={2}>Normal</option>
              <option value={3}>Wäre nett</option>
            </select>
          </div>
          <div className="sm:col-span-6">
            <label className="label" htmlFor="ph-desc">Hinweis für Gäste</label>
            <input className="input" id="ph-desc" name="description" defaultValue={p?.description ?? ""} />
          </div>
          <div className="sm:col-span-6 flex flex-wrap items-center gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" name="is_group_gift" /> Gruppengeschenk
            </label>
            <SubmitButton>Auf die Liste</SubmitButton>
            <button type="button" className="btn-ghost" onClick={reset}>Verwerfen</button>
          </div>
        </form>
      )}
      {!pending && !state?.image && state?.error && <p className="font-bold text-red-600">{state.error}</p>}
    </div>
  );
}
