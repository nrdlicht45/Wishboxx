"use client";
import { useState } from "react";

export function ShareBox({ url, text }: { url: string; text: string }) {
  const [copied, setCopied] = useState(false);
  const full = `${text}\n${url}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(full);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* Clipboard nicht verfügbar */
    }
  };
  return (
    <div className="space-y-2">
      <textarea readOnly className="input text-sm" rows={4} value={full} />
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={copy} className="btn-ghost">
          {copied ? "✓ Kopiert" : "Einladungstext kopieren"}
        </button>
        <a className="btn" href={`https://wa.me/?text=${encodeURIComponent(full)}`} target="_blank" rel="noopener">
          Per WhatsApp teilen
        </a>
        <a className="btn-ghost" href={url} target="_blank" rel="noopener">
          Gäste-Ansicht öffnen
        </a>
      </div>
    </div>
  );
}
